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
  private refreshTokenSubject = new BehaviorSubject<boolean>(false);

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
