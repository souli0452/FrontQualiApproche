import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Avatar } from 'primeng/avatar';
import { NgPrimeModule } from '../../../prime-ng.module';
import { AuthService } from '../../services/auth-services/auth.service';
import { getCurrentUserStructure } from '../../utils/global/global-utils';
import { Router } from '@angular/router';
import { Structure } from '../parametrages/structure/structure-config/structure';
import { Subject, takeUntil } from 'rxjs';
import { currentUserState } from '../../services/auth-services/auth.state';
import { UserResponse } from '../../models/auth.model';

@Component({
    selector: 'app-profil',
    imports: [CommonModule, Avatar, NgPrimeModule],
    templateUrl: './profil.component.html',
    styleUrl: './profil.component.scss'
})
export class ProfilComponent implements OnInit, OnDestroy {
    // On met le type UserResponse au lieu de AuthData
    user: UserResponse | null = null; 
    userStructure: Structure | null = null;
    private destroy$ = new Subject<boolean>();

    constructor(
        private router: Router
    ) {}

    ngOnInit() {
        this.user = currentUserState.value as UserResponse | any;
        console.log("UTILISATEUR ", this.user);
        

        // (La structure lue depuis le localStorage est correcte et ne pose pas de problème de sécurité)
        this.userStructure = getCurrentUserStructure();
    }

    ngOnDestroy() {
        this.destroy$.next(true);
        this.destroy$.complete();
    }

    editProfile() {
        console.log('Modification du profil...');
    }

    changePassword() {
        this.router.navigate(['reset-password']);
    }
}
