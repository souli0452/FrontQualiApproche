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
import { AuthService } from '../auth/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  private isRefreshing = false;
  /**
   * L'issue du rafraîchissement en cours. Les requêtes arrivées pendant qu'il tourne attendaient
   * un succès : s'il échouait, elles restaient suspendues et la page semblait figée, chaque geste
   * échouant sans un mot (recette du module Audit du 17 oct. 2026, §9). Elles reçoivent désormais
   * l'échec.
   */
  private refreshTokenSubject = new BehaviorSubject<'attente' | 'ok' | 'echec'>('attente');

  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    const request = req.clone({
      withCredentials: true
    });

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {

        const isLoginRequest = request.url.includes('/login');
        const isRefreshRequest = request.url.includes('/refresh');

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
      this.refreshTokenSubject.next('attente');

      return this.authService.refreshToken().pipe(

        switchMap(() => {

          this.isRefreshing = false;
          this.refreshTokenSubject.next('ok');

          return next.handle(
            request.clone({
              withCredentials: true
            })
          );

        }),

        catchError(error => {

          this.isRefreshing = false;
          this.refreshTokenSubject.next('echec');
          // La session a expiré : on le dit, et on ramènera l'utilisateur où il était.
          this.authService.logout(true);

          return throwError(() => error);

        })

      );
    }

    return this.refreshTokenSubject.pipe(

      filter(issue => issue !== 'attente'),

      take(1),

      switchMap(issue =>
        issue === 'ok'
          ? next.handle(request.clone({ withCredentials: true }))
          : throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Session expirée', url: request.url }))
      )

    );
  }
}
