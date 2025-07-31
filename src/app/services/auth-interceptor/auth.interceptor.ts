import { Injectable } from '@angular/core';
import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from "../auth-services/auth.service";

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

    constructor(private authService: AuthService) {}

    intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<any>> {
        const token = this.authService.getAccessToken();

        // Ne pas ajouter le token pour les requêtes d'authentification
        if (req.url.includes('/auth/login') || req.url.includes('/auth/refresh')) {
            return next.handle(req);
        }

        // Cloner la requête seulement si on a un token
        const authReq = token ? req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        }) : req;

        return next.handle(authReq).pipe(
            catchError((error: HttpErrorResponse) => {
                if (error.status === 401 && token) {
                    // Tentative de rafraîchissement du token
                    return this.handle401Error(authReq, next);
                }
                return throwError(() => error);
            })
        );
    }

    private handle401Error(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<any>> {
        return this.authService.refreshToken().pipe(
            switchMap(() => {
                const newToken = this.authService.getAccessToken();
                const newRequest = request.clone({
                    setHeaders: {
                        Authorization: `Bearer ${newToken}`
                    }
                });
                return next.handle(newRequest);
            }),
            catchError((refreshError) => {
                // Si le refresh échoue, déconnecter l'utilisateur
                this.authService.logout();
                return throwError(() => refreshError);
            })
        );
    }
}
