// import { Injectable } from '@angular/core';
// import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
// import { Observable, throwError } from 'rxjs';
// import { catchError, switchMap } from 'rxjs/operators';
// import { AuthService } from "../auth-services/auth.service";

// @Injectable()
// export class AuthInterceptor implements HttpInterceptor {

//     constructor(private authService: AuthService) {}

//     intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<any>> {
//         const token = this.authService.getAccessToken();

//         // Ne pas ajouter le token pour les requêtes d'authentification
//         if (req.url.includes('/auth/login') || req.url.includes('/auth/refresh')) {
//             return next.handle(req);
//         }

//         // Cloner la requête seulement si on a un token
//         const authReq = token ? req.clone({
//             setHeaders: {
//                 Authorization: `Bearer ${token}`
//             }
//         }) : req;

//         return next.handle(authReq).pipe(
//             catchError((error: HttpErrorResponse) => {
//                 if (error.status === 401 && token) {
//                     // Tentative de rafraîchissement du token
//                     return this.handle401Error(authReq, next);
//                 }
//                 return throwError(() => error);
//             })
//         );
//     }

//     private handle401Error(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<any>> {
//         return this.authService.refreshToken().pipe(
//             switchMap(() => {
//                 const newToken = this.authService.getAccessToken();
//                 const newRequest = request.clone({
//                     setHeaders: {
//                         Authorization: `Bearer ${newToken}`
//                     }
//                 });
//                 return next.handle(newRequest);
//             }),
//             catchError((refreshError) => {
//                 // Si le refresh échoue, déconnecter l'utilisateur
//                 this.authService.logout();
//                 return throwError(() => refreshError);
//             })
//         );
//     }
// }


import { Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { AuthService } from '../auth-services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<boolean>(false);

  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    const request = req.clone({
      withCredentials: true
    });

    console.log("Request URL :", request.url);

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {

        const isLoginRequest = request.url.includes('/login');
        const isRefreshRequest = request.url.includes('/refresh');

        console.log("Request URL :", request.url);

        if (
          error.status !== 401 ||
          isLoginRequest ||
          isRefreshRequest
        ) {
          return throwError(() => error);
        }

        return this.handle401Error(request, next);
      })
    );
  }

  private handle401Error(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {

    if (!this.isRefreshing) {

      this.isRefreshing = true;
      this.refreshTokenSubject.next(false);

      return this.authService.refreshToken().pipe(

        switchMap(() => {

          this.isRefreshing = false;
          this.refreshTokenSubject.next(true);

          return next.handle(
            request.clone({
              withCredentials: true
            })
          );

        }),

        catchError(error => {

          this.isRefreshing = false;
          this.authService.logout();

          return throwError(() => error);

        })

      );
    }

    return this.refreshTokenSubject.pipe(

      filter(success => success),

      take(1),

      switchMap(() =>
        next.handle(
          request.clone({
            withCredentials: true
          })
        )
      )

    );
  }
}