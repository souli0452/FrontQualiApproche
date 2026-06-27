import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import {AuthService} from "../../services/auth-services/auth.service";
import { catchError, map, Observable, of } from 'rxjs';


@Injectable({
    providedIn: 'root'
})
export class AuthGuard implements CanActivate {
    constructor(
        private authService: AuthService, 
        private router: Router
    ) {}

    canActivate(): Observable<boolean> {
        return this.authService.getMe().pipe(
            map(() => true),
            catchError(() => {
                this.router.navigate(['/login']);
                return of(false);
            })
        );
    }

}
