import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgPrimeModule } from '@prime-ng';
import { Subject, map, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';
import { SelectInputComponent } from '@shared/ui/select-input/select-input.component';
import { AuditGestionService, contenu, messageErreur } from '../../services/audit.service';
import { Audit, TableauDeBord as TableauDeBordAudit } from '../../models/audit.model';
import { StatutAudit, STATUT_AUDIT_LABELS, STATUT_AUDIT_SEVERITY } from '../../models/audit-enums';
import { AuditReferentielService, LIBELLES_VIDES, LibellesAudit as Libelles } from '../../services/audit-referentiel.service';

interface Indicateur {
    label: string;
    valeur: string;
    icone: string;
    lien: string;
    parametres?: Record<string, any>;
}

/**
 * Le tableau de bord du module (écran A1 de la maquette), pour une année : quatre indicateurs
 * qui mènent chacun à leur détail, le radar de maturité RQAP-BF, les rappels envoyés et les
 * audits dont l'utilisateur fait partie de l'équipe.
 */
@Component({
    selector: 'app-audit-vue-ensemble',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, NgPrimeModule, SelectInputComponent],
    providers: [MessageService],
    templateUrl: './vue-ensemble.component.html'
})
export class AuditVueEnsembleComponent implements OnInit, OnDestroy {

    loading = true;
    tableau: TableauDeBordAudit = {};
    erreurTableau: string | null = null;
    mesAudits: Audit[] = [];
    loadingAudits = true;
    libelles: Libelles = LIBELLES_VIDES;
    kpis: Indicateur[] = [];
    radar: any;
    optionsRadar: any;

    annee = new Date().getFullYear();
    anneeOptions = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() + 1 - i).map(a => ({ label: String(a), value: a }));

    private destroy$ = new Subject<void>();

    constructor(
        private auditService: AuditGestionService,
        private referentiel: AuditReferentielService,
        private messageService: MessageService
    ) {}

    ngOnInit(): void {
        this.referentiel.libelles().pipe(takeUntil(this.destroy$)).subscribe({
            next: l => (this.libelles = l),
            error: () => undefined // les tirets suffisent ; la page reste lisible
        });
        this.chargerTableau();
        this.chargerMesAudits();
    }

    chargerTableau(): void {
        this.loading = true;
        this.erreurTableau = null;
        this.auditService.getTableauDeBord(this.annee)
            .pipe(map(res => res?.data ?? {}), takeUntil(this.destroy$))
            .subscribe({
                next: t => {
                    this.tableau = t ?? {};
                    this.construire();
                    this.loading = false;
                },
                error: err => {
                    this.tableau = {};
                    this.construire();
                    this.loading = false;
                    this.erreurTableau = messageErreur(err, 'Le tableau de bord n\'a pas pu être chargé.');
                }
            });
    }

    chargerMesAudits(): void {
        this.loadingAudits = true;
        this.auditService.findAll(0, 8, { annee: this.annee, mesAudits: true })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: res => {
                    this.mesAudits = contenu<Audit>(res);
                    this.loadingAudits = false;
                },
                error: err => {
                    this.mesAudits = [];
                    this.loadingAudits = false;
                    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: messageErreur(err, 'Vos audits n\'ont pas pu être chargés.') });
                }
            });
    }

    changerAnnee(): void {
        this.chargerTableau();
        this.chargerMesAudits();
    }

    private construire(): void {
        const t = this.tableau;
        this.kpis = [
            { label: 'Taux réal. programme', valeur: t.tauxRealisation != null ? `${Math.round(t.tauxRealisation)} %` : '—',
              icone: 'pi-chart-bar', lien: '/gestion-audit/suivi' },
            { label: 'Audits réalisés / planifiés', valeur: `${t.auditsRealises ?? 0} / ${t.auditsPlanifies ?? 0}`,
              icone: 'pi-calendar', lien: '/gestion-audit/programme', parametres: { annee: this.annee } },
            // Les écarts comptés ici (constats ISO et critères RQAP-BF publiés en NC) ont chacun
            // leur dossier dans le module Non-conformités : c'est là qu'ils se traitent. Sa liste
            // ne se filtre pas par l'adresse, elle s'ouvre donc entière.
            { label: 'Écarts détectés', valeur: String(t.ecartsDetectes ?? 0),
              icone: 'pi-flag', lien: '/non-conformite/suivi' },
            { label: 'Score maturité moyen', valeur: t.scoreMaturiteMoyen != null ? `${Math.round(t.scoreMaturiteMoyen)} %` : '—',
              icone: 'pi-chart-line', lien: '/gestion-audit/suivi', parametres: { onglet: 'comparaison' } }
        ];

        const style = getComputedStyle(document.documentElement);
        const primaire = style.getPropertyValue('--p-primary-500').trim() || '#3b82f6';
        const texte = style.getPropertyValue('--p-text-muted-color').trim() || '#64748b';
        const grille = style.getPropertyValue('--p-content-border-color').trim() || '#e2e8f0';
        this.radar = {
            labels: this.domaines.map(d => d.domaine),
            datasets: [{
                label: 'Score moyen (%)',
                data: this.domaines.map(d => Math.round(d.score)),
                borderColor: primaire,
                backgroundColor: primaire + '33',
                pointBackgroundColor: primaire
            }]
        };
        this.optionsRadar = {
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { r: { min: 0, max: 100, ticks: { display: false }, grid: { color: grille }, pointLabels: { color: texte } } }
        };
    }

    get domaines(): { domaine: string; score: number }[] {
        return Object.entries(this.tableau.radarParDomaine ?? {}).map(([domaine, score]) => ({ domaine, score }));
    }

    getStatutSeverity(statut?: string): any {
        return STATUT_AUDIT_SEVERITY[statut as StatutAudit] ?? 'secondary';
    }

    getStatutLabel(statut?: string): string {
        return STATUT_AUDIT_LABELS[statut as StatutAudit] ?? statut ?? '';
    }

    trackByAuditId(_index: number, audit: Audit): string {
        return audit.id ?? '';
    }

    trackByKpi(_index: number, k: Indicateur): string {
        return k.label;
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
