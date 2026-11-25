import { Component, OnInit, OnDestroy, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgPrimeModule } from '@prime-ng';
import { Subject, map, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';
import { SelectInputComponent } from '@shared/ui/select-input/select-input.component';
import { AuditGestionService, contenu, messageErreur } from '../../services/audit.service';
import { Audit, TableauDeBord as TableauDeBordAudit, NotificationsAuditResume } from '../../models/audit.model';
import { StatutAudit, STATUT_AUDIT_LABELS, STATUT_AUDIT_SEVERITY } from '../../models/audit-enums';
import { AuditReferentielService, LIBELLES_VIDES, LibellesAudit as Libelles } from '../../services/audit-referentiel.service';
import { KpiCardComponent } from '@shared/kpi-card/kpi-card.component';
import { SmartAlertBannerComponent } from '@shared/smart-alert-banner/smart-alert-banner.component';
import { SmartAlertItem } from '@shared/smart-alert-banner/smart-alert-banner.model';
import { TableauAffichageComponent } from '@shared/tableau-affichage/tableau-affichage';
import { TableColumn } from '../../../../models/generique.model';

interface Indicateur {
    label: string;
    valeur: string | number;
    icone: string;
    color: 'blue' | 'orange' | 'red' | 'green' | 'purple' | 'solid-blue';
    lien: string;
    description?: string;
    subText?: string;
    percentage?: number;
    meterData?: { label: string; value: number; color: string }[];
    meterMax?: number;
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
    imports: [CommonModule, SmartAlertBannerComponent, RouterModule, FormsModule, NgPrimeModule, SelectInputComponent, KpiCardComponent, TableauAffichageComponent],
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
    notifs: NotificationsAuditResume = { total: 0, programme: 0, constats: 0, suivi: 0, checklists: 0, signatures: 0 };
    radar: any;
    optionsRadar: any;
    domaines: { domaine: string; score: number }[] = [];

    totalMesAudits = 0;
    pageMesAudits = 0;
    tailleMesAudits = 5;
    private mesAuditsPageDemandee = false;

    annee = new Date().getFullYear();
    anneeOptions = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() + 1 - i).map(a => ({ label: String(a), value: a }));

    private destroy$ = new Subject<void>();

    @ViewChild('refTpl', { static: true }) refTpl!: TemplateRef<any>;
    @ViewChild('processusTpl', { static: true }) processusTpl!: TemplateRef<any>;
    @ViewChild('dateTpl', { static: true }) dateTpl!: TemplateRef<any>;
    @ViewChild('statutTpl', { static: true }) statutTpl!: TemplateRef<any>;
    cellTemplates: { [field: string]: TemplateRef<any> } = {};

    readonly mesAuditsCols: TableColumn[] = [
        { field: 'reference', header: 'Référence', type: 'custom', width: '18%', sort: false },
        { field: 'processusId', header: 'Processus', type: 'custom', width: '44%', sort: false },
        { field: 'dateDebutPrevue', header: 'Date', type: 'custom', width: '18%', sort: false },
        { field: 'statut', header: 'Statut', type: 'custom', width: '20%', sort: false }
    ];

    constructor(
        private auditService: AuditGestionService,
        private referentiel: AuditReferentielService,
        private messageService: MessageService,
        private router: Router
    ) {}

    ngOnInit(): void {

        this.cellTemplates = {
            reference: this.refTpl,
            processusId: this.processusTpl,
            dateDebutPrevue: this.dateTpl,
            statut: this.statutTpl
        };

        this.construire();
        this.referentiel.libelles().pipe(takeUntil(this.destroy$)).subscribe({
            next: l => (this.libelles = l),
            error: () => undefined
        });
        this.auditService.notificationsAudit$
            .pipe(takeUntil(this.destroy$))
            .subscribe(r => (this.notifs = r));
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
        this.mesAuditsPageDemandee = true;
        this.loadingAudits = true;
        this.auditService.findAll(this.pageMesAudits, this.tailleMesAudits, { annee: this.annee, mesAudits: true })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res: any) => {
                    this.mesAudits = contenu<Audit>(res);
                    this.totalMesAudits = res?.data?.totalElements ?? this.mesAudits.length;
                    this.loadingAudits = false;
                },
                error: err => {
                    this.mesAudits = [];
                    this.totalMesAudits = 0;
                    this.loadingAudits = false;
                    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: messageErreur(err, 'Vos audits n\'ont pas pu être chargés.') });
                }
            });
    }

    changerAnnee(): void {
        this.pageMesAudits = 0;
        this.chargerTableau();
        this.chargerMesAudits();
    }

    onPageChangeMesAudits(event: { page: number; size: number }): void {
        const page = event.page ?? 0;
        const taille = event.size ?? this.tailleMesAudits;
        if (this.mesAuditsPageDemandee && page === this.pageMesAudits && taille === this.tailleMesAudits) {
            return;
        }
        this.pageMesAudits = page;
        this.tailleMesAudits = taille;
        this.chargerMesAudits();
    }

    naviguerVers(k: Indicateur): void {
        this.router.navigate([k.lien], { queryParams: k.parametres });
    }

    ouvrirAudit(audit: Audit): void {
        if (audit.id) {
            this.router.navigate(['/gestion-audit/programme', audit.id]);
        }
    }

    private construire(): void {
        const t = this.tableau;
        const realises = t.auditsRealises ?? 0;
        const planifies = t.auditsPlanifies ?? 0;
        const ecarts = t.ecartsDetectes ?? 0;
        const taux = t.tauxRealisation != null ? Math.round(t.tauxRealisation) : undefined;
        const maturite = t.scoreMaturiteMoyen != null ? Math.round(t.scoreMaturiteMoyen) : undefined;

        this.kpis = [
            {
                label: 'Taux réal. programme',
                valeur: taux != null ? `${taux} %` : '—',
                icone: 'pi pi-chart-bar',
                color: 'solid-blue',
                percentage: taux,
                meterData: [{ label: 'Réalisation', value: taux ?? 0, color: '#ffffff' }],
                meterMax: 100,
                subText: `Avancement programme ${this.annee}`,
                lien: '/gestion-audit/suivi'
            },
            {
                label: 'Audits réalisés / planifiés',
                valeur: `${realises} / ${planifies}`,
                icone: 'pi pi-calendar',
                color: 'blue',
                meterData: [
                    { label: 'Réalisés', value: realises, color: '#0284c7' },
                    { label: 'Restants', value: Math.max(planifies - realises, 0), color: '#e2e8f0' }
                ],
                meterMax: planifies || 1,
                subText: `${realises} réalisé(s) sur ${planifies} prévu(s)`,
                lien: '/gestion-audit/programme',
                parametres: { annee: this.annee }
            },
            {
                label: 'Écarts détectés',
                valeur: ecarts,
                icone: 'pi pi-flag',
                color: 'red',
                description: 'Constats et critères en NC',
                meterData: [{ label: 'Écarts', value: ecarts > 0 ? 100 : 0, color: '#e11d48' }],
                meterMax: 100,
                subText: ecarts > 0 ? 'À suivre dans Non-conformités' : 'Aucun écart détecté',
                lien: '/non-conformite/suivi'
            },
            {
                label: 'Score maturité moyen',
                valeur: maturite != null ? `${maturite} %` : '—',
                icone: 'pi pi-verified',
                color: 'green',
                percentage: maturite,
                meterData: [{ label: 'Maturité', value: maturite ?? 0, color: '#10b981' }],
                meterMax: 100,
                subText: 'Moyenne officielle RQAP-BF',
                lien: '/gestion-audit/suivi',
                parametres: { onglet: 'comparaison' }
            }
        ];

        this.domaines = Object.entries(this.tableau.radarParDomaine ?? {})
            .map(([domaine, score]) => ({ domaine, score: Math.round(score) }));

        const style = getComputedStyle(document.documentElement);
        const primaire = style.getPropertyValue('--p-primary-500').trim() || '#0084ca';
        const texte = style.getPropertyValue('--p-text-muted-color').trim() || '#64748b';
        const grille = style.getPropertyValue('--p-content-border-color').trim() || '#e2e8f0';
        this.radar = {
            labels: this.domaines.map(d => d.domaine),
            datasets: [{
                label: 'Score moyen (%)',
                data: this.domaines.map(d => d.score),
                borderColor: primaire,
                backgroundColor: primaire + '33',
                pointBackgroundColor: primaire,
                pointBorderColor: '#ffffff',
                pointHoverRadius: 5
            }]
        };
        this.optionsRadar = {
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx: any) => ` ${ctx.dataset.label} : ${ctx.parsed?.r ?? 0} %`
                    }
                }
            },
            scales: {
                r: {
                    min: 0,
                    max: 100,
                    ticks: {
                        display: true,
                        stepSize: 25,
                        backdropColor: 'transparent',
                        color: texte,
                        font: { size: 10 },
                        callback: (value: any) => `${value} %`
                    },
                    grid: { color: grille },
                    angleLines: { color: grille },
                    pointLabels: { color: texte, font: { size: 11, weight: '500' } }
                }
            }
        };
    }

    get smartAlerts(): SmartAlertItem[] {
        const list: SmartAlertItem[] = [];

        const nbRetard = this.tableau.auditsEnRetard ?? 0;
        if (nbRetard > 0) {
            list.push({
                id: 'audits-en-retard',
                count: nbRetard,
                badgeText: 'Retard programme',
                message: `${nbRetard} audit${nbRetard > 1 ? 's' : ''} en retard sur le programme ${this.annee}`,
                icon: 'pi pi-exclamation-triangle',
                color: 'rose',
                routerLink: '/gestion-audit/programme',
                actionLabel: 'Consulter'
            });
        }

        const nbConstats = this.notifs.constats ?? 0;
        if (nbConstats > 0) {
            list.push({
                id: 'constats-en-attente',
                count: nbConstats,
                badgeText: 'Action requise',
                message: `${nbConstats} constatation${nbConstats > 1 ? 's' : ''} en attente de traitement`,
                icon: 'pi pi-file-check',
                color: 'amber',
                routerLink: '/gestion-audit/constatations',
                actionLabel: 'Traiter'
            });
        }

        const nbSignatures = this.notifs.signatures ?? 0;
        if (nbSignatures > 0) {
            list.push({
                id: 'signatures-en-attente',
                count: nbSignatures,
                badgeText: 'Signature requise',
                message: `${nbSignatures} rapport${nbSignatures > 1 ? 's' : ''} d'audit en attente de signature`,
                icon: 'pi pi-pencil',
                color: 'sky',
                routerLink: '/gestion-audit/programme',
                actionLabel: 'Consulter'
            });
        }

        return list;
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
