import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { map } from 'rxjs/operators';
import { QualiUrlConfig } from '../quali-url-configs';
import { currentUserState } from './auth.state';
import { BaseCrudService } from '../base-crud.service';
import { AuthData, LoginRequest, UserResponse } from '../../models/auth.model';
import { ApiItemResponse, ApiResponse } from '../../models/response.model';
import { NgxPermissionsService } from 'ngx-permissions';

@Injectable({
    providedIn: 'root'
})
export class AuthService extends BaseCrudService<AuthData, number> {

    private isLoggedIn = new BehaviorSubject<boolean>(false);
    private refreshTokenInProgress = false;
    user: any;

    constructor(
        public override http: HttpClient,
        private router: Router,
        private ngxPermissionsService: NgxPermissionsService
    ) {
        super(http, QualiUrlConfig.FORMATION_ROOT_URL);
        this.currentUser$.subscribe(user => {
            if (user && user.permissions) {
                this.ngxPermissionsService.loadPermissions(user.permissions);
            } else {
                this.ngxPermissionsService.flushPermissions();
            }
        });
    }

    override findAll(): Observable<ApiResponse<AuthData>> {
        return this.http.get<ApiResponse<AuthData>>(QualiUrlConfig.USERS_URL);
    }

    login(credentials: LoginRequest): Observable<ApiItemResponse<AuthData>> {
        return this.http.post<ApiItemResponse<AuthData>>(QualiUrlConfig.LOGIN_URL, credentials, {
            withCredentials: true
        }).pipe(
            map((response: ApiItemResponse<AuthData>) => {
                currentUserState.next(response.data);
                this.isLoggedIn.next(true);
                // sessionStorage.setItem('userId', response.data.user.userId);
                return response;
            })
        );
    }

    get currentUser$(): Observable<AuthData | null> {
        return currentUserState.asObservable();
    }

    getAllRoles(): Observable<HttpResponse<Array<any>>> {
        return this.http.get<Array<any>>(QualiUrlConfig.ROLE_URL, { observe: 'response' });
    }

    getMe(): Observable<ApiItemResponse<AuthData> | null> {
        return this.http.get<ApiItemResponse<AuthData>>(QualiUrlConfig.USER, {
            withCredentials: true
        }).pipe(
            map((response: ApiItemResponse<AuthData>) => {
                currentUserState.next(response.data);
                this.isLoggedIn.next(true);
                return response;
            }),
            catchError(() => {
                currentUserState.next(null);
                this.isLoggedIn.next(false);
                return of(null);
            })
        );
    }

    /**
     * Libre-service : l'utilisateur met à jour son nom, son prénom et son téléphone.
     *
     * Distinct de `updateUser`, réservé à l'administration des comptes : celui-ci porte aussi
     * l'activation et les rôles, absents d'un formulaire de profil — l'employer ici désactiverait
     * le compte de l'intéressé et effacerait ses rôles applicatifs.
     *
     * L'état courant est relu ensuite, faute de quoi la barre supérieure continuerait d'afficher
     * l'ancien nom jusqu'à la prochaine ouverture de session.
     */
    updateMyProfile(profil: { firstName: string; lastName: string; phoneNumber?: string | null }): Observable<ApiItemResponse<UserResponse>> {
        return this.http.put<ApiItemResponse<UserResponse>>(QualiUrlConfig.USER, profil, {
            withCredentials: true
        }).pipe(
            map((response: ApiItemResponse<UserResponse>) => {
                // `/me` rend la fiche à plat ; `currentUserState` la porte typée `AuthData` depuis
                // l'origine, et `getMe()` fait de même. On s'y conforme ici plutôt que de retyper
                // toute la chaîne d'authentification pour un seul appel.
                currentUserState.next(response.data as unknown as AuthData);
                return response;
            })
        );
    }

    logout(): void {
        this.http.post(QualiUrlConfig.LOGOUT_URL, {}, { withCredentials: true })
            .subscribe({
                next: () => this.clearSession(),
                error: () => this.clearSession() // on nettoie quand même, même si le backend échoue
            });
    }
    private clearSession(): void {
        sessionStorage.removeItem('userId');
        this.isLoggedIn.next(false);
        currentUserState.next(null);
        this.router.navigate(['/login']);
    }


    hasPermission(permission: string): boolean {
        // On récupère la valeur actuelle stockée dans le BehaviorSubject
        const authData = currentUserState.value; 
        
        if (!authData) return false;
        
        return authData.permissions?.includes(permission) || false;
    }
    
    isLicenseActive(): boolean {
        const authData = currentUserState.value;
        return authData?.licenseActive || false;
    }

    getLicenseDaysRemaining(): number {
        const authData = currentUserState.value;
        return authData?.licenseDaysRemaining || 0;
    }

    // Rafraîchissement des tokens
    refreshToken(): Observable<any> {
        // Le Mutex (isRefreshing) est déjà géré par ton AuthInterceptor.
        // On fait simplement un POST vide, le navigateur envoie le cookie 'refresh_token'
        // et le backend répond avec un 'Set-Cookie' contenant le nouveau 'access_token'.
        return this.http.post(QualiUrlConfig.REFRESH_TOKEN_URL, {}, { withCredentials: true });
    }

    getAllUsers(page: number = 0, size: number = 10): Observable<ApiResponse<AuthData>> {
        return this.http.get<ApiResponse<AuthData>>(`${QualiUrlConfig.USERS_URL}?page=${page}&size=${size}`);
    }

    loadAgentPublicByService(structureId: string): Observable<ApiResponse<AuthData>> {
        return this.http.get<ApiResponse<AuthData>>(this.replaceArgs(new Map().set('structureId', structureId), QualiUrlConfig.USERS_BY_STRUCTURE_URL));
    }
    createUser(user: AuthData): Observable<HttpResponse<AuthData>> {
        return this.http.post<AuthData>(`${QualiUrlConfig.USERS_URL}/create`, user, { observe: 'response' });
    }

    updateUser(user: AuthData): Observable<HttpResponse<void>> {
        return this.http.put<void>(`${QualiUrlConfig.USERS_URL}/update`, user, { observe: 'response' });
    }
    resetPassword(userId: string, password: string): Observable<HttpResponse<void>> {
        const params = new HttpParams().set('userId', userId).set('password', password);
        return this.http.patch<void>(QualiUrlConfig.RESET_PASSWORD_URL, null, {
            params,
            observe: 'response'
        });
    }

    changeStatus(userId: string, enabled: boolean): Observable<HttpResponse<void>> {
        const params = new HttpParams().set('userId', userId).set('enabled', enabled.toString());
        return this.http.put<void>(QualiUrlConfig.CHANGE_STATUS_URL, null, {
            params,
            observe: 'response'
        });
    }
    emailVerifcation(userId: string, token: string): Observable<HttpResponse<void>> {
        const params = new HttpParams().set('token', token).set('userId', userId);
        return this.http.put<void>(QualiUrlConfig.VERIFY_EMAIL_URL, null, {
            params,
            observe: 'response'
        });
    }

    isEmailVerified(userId: string): Observable<HttpResponse<boolean>> {
        const params = new HttpParams().set('userId', userId);
        return this.http.get<boolean>(QualiUrlConfig.IS_EMAIL_VERIFIED_URL, {
            params,
            observe: 'response'
        });
    }

    initiatePasswordReset(email: string): Observable<HttpResponse<void>> {
        const params = new HttpParams().set('email', email);
        return this.http.post<void>(QualiUrlConfig.INITIATE_RESET_PASSWORD_URL, null, {
            params,
            observe: 'response'
        });
    }

    reinitializePwd(userId: string, password: string, token: string): Observable<HttpResponse<void>> {
        const params = new HttpParams().set('userId', userId).set('token', token).set('password', password);

        return this.http.put<void>(QualiUrlConfig.REINITIALIZE_PASSWORD_URL, null, {
            params,
            observe: 'response'
        });
    }

    updateTemporaryPassword(username: string, password: string, oldPassword: string): Observable<{ data: any }> {
        const params = new HttpParams().set('username', username).set('password', password).set('oldPassword', oldPassword);

        return this.http.put<{ data: any }>(QualiUrlConfig.UPDATE_PASSWORD_URL, null, { params });
    }

    private replaceArgs(args: Map<string, any>, url: string): string {
        args.forEach((value, key) => {
            url = url.replace(`{${key}}`, value);
        });
        return url;
    }
}