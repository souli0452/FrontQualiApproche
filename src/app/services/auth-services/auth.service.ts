import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, finalize, switchMap } from 'rxjs/operators';
import { ApiResponse, KcLoginRequest, KcUser } from '../../models';
import { map } from 'rxjs/operators';
import { QualiCrudService } from '../quali-crud.service';
import { QualiUrlConfig } from '../quali-url-configs';
import { createRequestOption, USER_PROFILE_KEY, USER_STRUCTURE_KEY } from '../../utils';

interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    refreshExpiresIn: number;
    tokenType: string;
    scope: string;
    data: {
        user: any;
        appRoles?: string[];
        permissions?: string[];
        licenseActive?: boolean;
        licenseDaysRemaining?: number;
        modulesSubscribed?:string[];
    };
}

@Injectable({
    providedIn: 'root'
})
export class AuthService extends QualiCrudService<KcUser, number> {
    private isLoggedIn = new BehaviorSubject<boolean>(false);
    private refreshTokenInProgress = false;
    user: any;
    private currentUser = new BehaviorSubject<KcUser | null>(this.getUser());

    constructor(
        public override http: HttpClient,
        private router: Router
    ) {
        super(http, QualiUrlConfig.FORMATION_ROOT_URL);
        this.user = this.getUser()!;
    }

    override findAll(): Observable<HttpResponse<Array<KcUser>>> {
        return this.http.get<KcUser[]>(QualiUrlConfig.USERS_URL, { observe: 'response' });
    }

    // Connexion
    login(credentials: KcLoginRequest): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(QualiUrlConfig.LOGIN_URL, credentials).pipe(
            map((response: AuthResponse) => {
                const user = response.data.user;
                if (user) {
                    user.appRoles = response.data.appRoles;
                    user.permissions = response.data.permissions;
                    user.licenseActive = response.data.licenseActive;
                    user.licenseDaysRemaining = response.data.licenseDaysRemaining;
                    user.modulesSubscribed = response.data.modulesSubscribed;
                    this.setUser(user);
                }
                this.setTokens(response.accessToken, response.refreshToken);
                return response;
            })
        );
    }
    getAllRoles(): Observable<HttpResponse<Array<any>>> {
        return this.http.get<Array<any>>(QualiUrlConfig.ROLE_URL, { observe: 'response' });
    }

    // Connexion
    login3(credentials: KcLoginRequest): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(QualiUrlConfig.LOGIN_URL, credentials);
    }

    get currentUser$(): Observable<KcUser | null> {
        return this.currentUser.asObservable();
    }

    getUser(): KcUser | null {
        const userJson = localStorage.getItem('user');
        return userJson ? JSON.parse(userJson) : null;
    }

    setUser(user: KcUser): void {
        localStorage.setItem('user', JSON.stringify(user));
        this.currentUser.next(user);
    }

    // Déconnexion
    logout(): void {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem(USER_PROFILE_KEY);
        localStorage.removeItem(USER_STRUCTURE_KEY);
        localStorage.removeItem('user');
        this.isLoggedIn.next(false);
        this.currentUser.next(null);
        this.router.navigate(['/login']);
    }
    removeAll(): void {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem(USER_PROFILE_KEY);
        localStorage.removeItem(USER_STRUCTURE_KEY);
        localStorage.removeItem('user');
        this.isLoggedIn.next(false);
        this.currentUser.next(null);
    }
    isAuthenticated(): Observable<boolean> {
        return this.isLoggedIn.asObservable();
    }

    // Stockage des tokens
    public setTokens(accessToken: string, refreshToken: string): void {
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
        this.isLoggedIn.next(true);
    }

    hasPermission(permission: string): boolean {
        const user = this.getUser();
        if (!user) return false;
        return user.permissions?.includes(permission) || false;
    }

    isLicenseActive(): boolean {
        const user = this.getUser();
        return user?.licenseActive || false;
    }

    getLicenseDaysRemaining(): number {
        const user = JSON.parse(localStorage.getItem('user')!) as KcUser;
        return user?.licenseDaysRemaining || 0;
    }

    // Récupère le token d'accès
    getAccessToken(): string | null {
        return localStorage.getItem('access_token');
    }

    // Rafraîchissement des tokens
    refreshToken(): Observable<string | null> {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken || this.refreshTokenInProgress) return of(null);

        this.refreshTokenInProgress = true;

        return this.http.post<AuthResponse>(QualiUrlConfig.REFRESH_TOKEN_URL, { refreshToken }).pipe(
            switchMap((response) => {
                this.setTokens(response.accessToken, response.refreshToken);
                return of(response.accessToken);
            }),
            catchError(() => {
                this.logout();
                return of(null);
            }),
            finalize(() => {
                this.refreshTokenInProgress = false;
            })
        );
    }

    // Gestion du token expiré
    handleExpiredToken(): Observable<string | null> {
        return this.refreshToken().pipe(
            switchMap((newAccessToken) => {
                if (newAccessToken) {
                    return of(newAccessToken);
                } else {
                    this.router.navigate(['/login']);
                    return of(null);
                }
            })
        );
    }
    getAllUsers(page: number = 0, size: number = 10): Observable<ApiResponse<KcUser>> {
        return this.http.get<ApiResponse<KcUser>>(`${QualiUrlConfig.USERS_URL}?page=${page}&size=${size}`);
    }

    getUserById(id: string): Observable<HttpResponse<KcUser>> {
        const params = new HttpParams().set('userId', id);
        return this.http.get<KcUser>(QualiUrlConfig.USERS_BY_ID_URL, { params, observe: 'response' });
    }
    loadAgentPublicByService(structureId: string): Observable<Array<KcUser>> {
        return this.http.get<KcUser[]>(this.replaceArgs(new Map().set('structureId', structureId), QualiUrlConfig.USERS_BY_STRUCTURE_URL));
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
