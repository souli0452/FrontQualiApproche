import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, finalize, switchMap } from 'rxjs/operators';
import { ApiItemResponse, ApiResponse, AuthData, KcLoginRequest, KcUser, LoginRequest } from '../../models';
import { map } from 'rxjs/operators';
import { QualiCrudService } from '../quali-crud.service';
import { QualiUrlConfig } from '../quali-url-configs';
import { createRequestOption, USER_PROFILE_KEY, USER_STRUCTURE_KEY } from '../../utils';
import { currentUserState } from './auth.state';

@Injectable({
    providedIn: 'root'
})
export class AuthService extends QualiCrudService<KcUser, number> {

    private isLoggedIn = new BehaviorSubject<boolean>(false);
    private refreshTokenInProgress = false;
    user: any;

    constructor(
        public override http: HttpClient,
        private router: Router
    ) {
        super(http, QualiUrlConfig.FORMATION_ROOT_URL);
    }

    override findAll(): Observable<ApiResponse<KcUser>> {
        return this.http.get<ApiResponse<KcUser>>(QualiUrlConfig.USERS_URL);
    }

    login(credentials: LoginRequest): Observable<ApiItemResponse<AuthData>> {
        return this.http.post<ApiItemResponse<AuthData>>(QualiUrlConfig.LOGIN_URL, credentials, {
            withCredentials: true
        }).pipe(
            map((response: ApiItemResponse<AuthData>) => {
                currentUserState.next(response.data);
                this.isLoggedIn.next(true);
                sessionStorage.setItem('userId', response.data.user.userId);
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
        const userId = sessionStorage.getItem('userId');
        if (!userId) {
            // Pas d'userId = pas de session connue
            return of(null);
        }
        const params = new HttpParams().set('userId', userId);
        return this.http.get<ApiItemResponse<AuthData>>(QualiUrlConfig.USERS_BY_ID_URL, {
            params,
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

    // getAuth(): AuthResponse | null {
    //     const authJson = localStorage.getItem('auth');
    //     return authJson ? JSON.parse(authJson) : null;
    // }

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


    public isAuthenticated(): Observable<boolean> {
        return this.isLoggedIn.asObservable();
    }

    // Stockage des tokens
    // public setTokens(accessToken: string, refreshToken: string): void {
    //     localStorage.setItem('access_token', accessToken);
    //     localStorage.setItem('refresh_token', refreshToken);
    //     this.isLoggedIn.next(true);
    // }

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

    // Plus besoin de getAccessToken(), le token est géré automatiquement par les cookies.
    // getAccessToken(): string | null {
    //     return localStorage.getItem('access_token');
    // }

    // Rafraîchissement des tokens
    refreshToken(): Observable<any> {
        // Le Mutex (isRefreshing) est déjà géré par ton AuthInterceptor.
        // On fait simplement un POST vide, le navigateur envoie le cookie 'refresh_token'
        // et le backend répond avec un 'Set-Cookie' contenant le nouveau 'access_token'.
        return this.http.post(QualiUrlConfig.REFRESH_TOKEN_URL, {}, { withCredentials: true });
    }

    // Gestion du token expiré (si utilisée ailleurs)
    handleExpiredToken(): Observable<any> {
        return this.refreshToken();
    }
    getAllUsers(page: number = 0, size: number = 10): Observable<ApiResponse<KcUser>> {
        return this.http.get<ApiResponse<KcUser>>(`${QualiUrlConfig.USERS_URL}?page=${page}&size=${size}`);
    }

    getUserById(id: string): Observable<HttpResponse<KcUser>> {
        const params = new HttpParams().set('userId', id);
        return this.http.get<KcUser>(QualiUrlConfig.USERS_BY_ID_URL, { params, observe: 'response' });
    }
    // getUserById(id: string): Observable<HttpResponse<AuthResponse>> {
    //     const params = new HttpParams().set('userId', id);
    //     return this.http.get<AuthResponse>(QualiUrlConfig.USERS_BY_ID_URL, { params, observe: 'response' });
    // }
    loadAgentPublicByService(structureId: string): Observable<ApiResponse<KcUser>> {
        return this.http.get<ApiResponse<KcUser>>(this.replaceArgs(new Map().set('structureId', structureId), QualiUrlConfig.USERS_BY_STRUCTURE_URL));
    }
    createUser(user: KcUser): Observable<HttpResponse<KcUser>> {
        return this.http.post<KcUser>(`${QualiUrlConfig.USERS_URL}/create`, user, { observe: 'response' });
    }

    updateUser(user: KcUser): Observable<HttpResponse<void>> {
        return this.http.put<void>(`${QualiUrlConfig.USERS_URL}/update`, user, { observe: 'response' });
    }
    getUserRoles(id: string): Observable<HttpResponse<Array<any>>> {
        return this.http.get<Array<any>>(`${QualiUrlConfig.ROLE_URL}/user-roles/${id}`, { observe: 'response' });
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

    isEmailVerifiedd(userId: string, token: string): Observable<HttpResponse<void>> {
        const params = new HttpParams().set('userId', userId).set('token', token);
        return this.http.put<void>(QualiUrlConfig.IS_EMAIL_VERIFIED_URL, null, {
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