import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import {AuthService} from "../../services/auth-services/auth.service";


@Injectable({
    providedIn: 'root'
})
export class AuthGuard implements CanActivate {
    constructor(private authService: AuthService, private router: Router) {
    }

    canActivate(): boolean {
        const isAuthenticated = !!this.authService.getAccessToken();
        if (!isAuthenticated) {
            this.router.navigate(['/login']);
            return false;
        }
        this.router.navigate(['/login']);
        return true;
    }

}
