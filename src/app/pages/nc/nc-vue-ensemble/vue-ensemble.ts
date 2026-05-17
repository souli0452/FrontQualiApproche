import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { ProcNonConformiteService } from '../../proc-non-conformite/proc-non-conformite.service';
import { NcFilter, NcFilterBarComponent } from '../nc-filter-bar/nc-filter-bar';
import { AlerteTraitement } from '../alerte-traitement/alerte-traitement';
import { NcStatsCardComponent } from '../nc-stats-card/nc-stats-card';
import { isUserInRoles } from '../../../utils';
import { AuthService } from '../../../services/auth-services/auth.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-vue-ensemble',
  standalone: true,
  imports: [CommonModule, NgPrimeModule, NcFilterBarComponent, AlerteTraitement, NcStatsCardComponent],
  templateUrl: './vue-ensemble.html',
  styleUrl: './vue-ensemble.scss'
})
export class NcVueEnsembleComponent implements OnInit, OnDestroy {

    isAdmin: boolean = false;
    isChef: boolean = false;
    isAgent: boolean = false;
    loading: boolean = false;
    dashboardData: any;

    stats: any = {
        total: 0,
        enCours: 0,
        retard: 0,
        imputees: 0,
        traitees: 0
    };

    private destroy$ = new Subject<void>();

  constructor(
    private procService: ProcNonConformiteService, 
    private authService: AuthService
  ) {} 

  ngOnInit(): void {
    // Les rôles sont définis au démarrage
    this.isAgent = isUserInRoles(['TRAITEMENT_NC', 'TRAITEMENT_PLAN', 'CONSULTATION_NC', 'SUBMIT_NC']);
    this.isAdmin = isUserInRoles(['ADMIN', 'RESPONSABLE_QUALITE']);
    this.isChef = isUserInRoles(['VALIDATION_CHEF']);
  }

  /**
   * Cette méthode est appelée par la barre de filtres au démarrage 
   * et chaque fois qu'un filtre change.
   */
  handleFilter(filters: NcFilter) {
    console.log('VUE-ENSEMBLE : Application des filtres...', filters);
    this.loadDashboardData(filters);
  }

  loadDashboardData(filters?: NcFilter) {
    this.loading = true;
    const user = this.authService.getUser();
    
    if (!user) {
        console.warn("Utilisateur non connecté, impossible de charger le dashboard.");
        this.loading = false;
        return;
    }

    const currentUserId = user.userId;
    this.isAgent = user.appRoles?.includes('AGENT') || false;

    // On envoie les filtres au service
    if (this.isAgent) {
      this.procService.getUserDashboard(currentUserId!, filters)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            this.dashboardData = response.body;
            console.log(this.dashboardData);
            
            this.updateKpis();
            this.loading = false;
          },
          error: (error: any) => {
            console.error('Erreur dashboard Agent:', error);
            this.loading = false;
          }
        });
    } else {
      this.procService.getDashboardRQ(filters)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            this.dashboardData = response.body;
            this.updateKpis();
            this.loading = false;
          },
          error: (error: any) => {
            console.error('Erreur dashboard RQ:', error);
            this.loading = false;
          }
        });
    }
  }

  private updateKpis() {
    if (!this.dashboardData) return;

    const stats = this.dashboardData.statsByStatus || {};
    
    this.stats = {
        total: this.dashboardData.totalNC || 0,
        enCours: (stats.IN_PROGRESS || 0) + (stats.PUBLISHED || 0),
        retard: stats.OVERDUE || 0,
        imputees: stats.IMPUTED || 0,
        traitees: stats.CLOSED || 0
    };
  }

  ngOnDestroy() {
      this.destroy$.next();
      this.destroy$.complete();
  }

  protected readonly isUserInRoles = isUserInRoles;
}