import { Injectable } from '@angular/core';
import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import {AuthService} from "../auth-services/auth.service";

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

    constructor(private authService: AuthService) {}

    intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<any>> {
        const token = this.authService.getAccessToken();
        // ajouter l'en-tête Authorization
        let clonedRequest = req;
        if (token) {
            clonedRequest = req.clone({
                setHeaders: {
                    Authorization: `Bearer ${token}`
                }
            });
        }
        // Refresh
        return next.handle(clonedRequest).pipe(
            catchError((error: HttpErrorResponse) => {
                if (error.status === 401) {
                    return this.authService.handleExpiredToken().pipe(
                        switchMap((newToken: string | null) => {
                            if (newToken) {
                                clonedRequest = req.clone({
                                    setHeaders: {
                                        Authorization: `Bearer ${newToken}`
                                    }
                                });
                                return next.handle(clonedRequest);
                            }

                            this.authService.logout();
                            return throwError(() => new Error('Token refresh failed'));
                        })
                    );
                }
                return throwError(() => error);
            })
        );
    }
}
