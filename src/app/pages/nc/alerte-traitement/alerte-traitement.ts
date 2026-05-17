import { Component, OnInit, OnDestroy, OnChanges, SimpleChanges, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonModule } from 'primeng/skeleton';
import { Subject } from 'rxjs';
import { MessageModule } from 'primeng/message';
import { AuthService } from '../../../services/auth-services/auth.service';
import { isUserInRoles } from '../../../utils';

@Component({
    standalone: true,
    selector: 'app-alerte-traitement',
    imports: [CommonModule, SkeletonModule, MessageModule],
    templateUrl: './alerte-traitement.html',
    styleUrl: './alerte-traitement.scss',
})
export class AlerteTraitement implements OnInit, OnDestroy, OnChanges {

    @Input() dashboardData: any;
    @Input() loading: boolean = false;

    isAdmin: boolean = false;
    isChef: boolean = false;
    isAgent: boolean = false;

    // Compteurs pour l'affichage
    countBrouillon: number = 0;
    countPubliees: number = 0;
    countImputees: number = 0;
    countEnAttenteValidation: number = 0;

    private destroy$ = new Subject<void>(); 

    constructor(public authService: AuthService) {}

    ngOnInit() {
        this.updateRoles();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['dashboardData'] && this.dashboardData) {
            this.updateCounts();
        }
    }

    private updateRoles() {
        const user = this.authService.getUser();
        this.isAdmin = isUserInRoles(['ADMIN', 'RESPONSABLE_QUALITE']);
        this.isChef = isUserInRoles(['VALIDATION_CHEF']);
        this.isAgent = user?.appRoles?.includes('AGENT') || false;
    }

    private updateCounts() {
        const stats = this.dashboardData?.statsByStatus;

        this.countBrouillon = stats?.DRAFT || 0;
        this.countPubliees = stats?.PUBLISHED || 0;
        
        // Pour les imputations et validations, on utilise les codes correspondants dans statsByStatus
        this.countEnAttenteValidation = stats?.VALIDATION_RS || 0;
        this.countImputees = stats?.IN_PROGRESS || 0; // Ajustez selon le code exact (ex: IMPUTED)
    }
    
    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}