import { Component, OnInit, OnDestroy, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgPrimeModule } from '@prime-ng';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { MenuItem, MessageService } from 'primeng/api';
import { SelectInputComponent } from '@shared/ui/select-input/select-input.component';
import { MultiselectInputComponent } from '@shared/ui/multiselect-input/multiselect-input.component';
import { TableauAffichageComponent } from '@shared/tableau-affichage/tableau-affichage';
import { TableColumn } from '../../../../models/generique.model';
import { AuditGestionService, contenu, messageErreur } from '../../services/audit.service';
import { Audit, AuditeurFiche, AuditFiltres, NoeudReferentiel, TypeAuditRef } from '../../models/audit.model';
import {
    NiveauEfficacite,
    NIVEAU_EFFICACITE_LABELS,
    NIVEAU_EFFICACITE_SEVERITY,
    NiveauRisqueAudit,
    NIVEAU_RISQUE_LABELS,
    NIVEAU_RISQUE_SEVERITY,
    StatutAudit,
    STATUT_AUDIT_LABELS,
    STATUT_AUDIT_SEVERITY
} from '../../models/audit-enums';
import { AuditReferentielService, LIBELLES_VIDES, LibellesAudit as Libelles } from '../../services/audit-referentiel.service';

interface JourCalendrier {
    date: Date;
    cle: string;
    jour: number;
    horsMois: boolean;
    aujourdhui: boolean;
    audits: Audit[];
}

interface MoisCalendrier {
    moisIndex: number;
    nom: string;
    courant: boolean;
    audits: Audit[];
}

/**
 * Le programme annuel d'audit (écran A2 de la maquette) : une ligne par audit dans le tableau
 * commun, qui s'ouvre en fenêtre sur ses sites, objectif, critères, équipe, risque et actions de
 * maîtrise. Tous les filtres se choisissent dans des listes chargées du paramétrage.
 *
 * <p>Les filtres « année », « mes audits » et « en retard » se reprennent de l'adresse, pour que le
 * tableau de bord puisse y mener.</p>
 */
@Component({
    selector: 'app-programme-audit',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, NgPrimeModule, SelectInputComponent, MultiselectInputComponent, TableauAffichageComponent],
    providers: [MessageService],
    templateUrl: './programme-audit.component.html'
})
export class ProgrammeAuditComponent implements OnInit, OnDestroy {

    audits: Audit[] = [];
    loading = true;
    erreurChargement: string | null = null;
    libelles: Libelles = LIBELLES_VIDES;
    /** L'audit ouvert en fenêtre. */
    resume: Audit | null = null;
    resumeOuvert = false;

    totalElements = 0;
    currentPage = 0;
    pageSize = 10;
    /** Une page a déjà été demandée : le tableau, en mode différé, redemande la première à l'ouverture. */
    private pageDemandee = false;

    /** Bascule Tableau / Calendrier (Obs. 32). */
    modeAffichage: 'tableau' | 'calendrier' = 'tableau';
    echelleCalendrier: 'annee' | 'mois' = 'annee';
    calendrierAnnee = new Date().getFullYear();
    calendrierMois = new Date().getMonth();
    auditsCalendrier: Audit[] = [];
    totalCalendrier = 0;
    nbAuditsAnneeCalendrier = 0;
    loadingCalendrier = false;
    moisAnnee: MoisCalendrier[] = [];
    joursMois: JourCalendrier[] = [];
    auditsDuMois: Audit[] = [];
    auditsSansDate: Audit[] = [];

    readonly joursSemaine = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    readonly nomsMois = [
        'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    readonly legendeCalendrier = [
        { label: 'Planifié', point: 'bg-[#0ea5e9]' },
        { label: 'En préparation', point: 'bg-amber-500' },
        { label: 'En cours', point: 'bg-indigo-500' },
        { label: 'En retard', point: 'bg-rose-500' },
        { label: 'Clôturé', point: 'bg-emerald-500' },
        { label: 'Annulé', point: 'bg-surface-400' }
    ];

    @ViewChild('auditTpl', { static: true }) auditTpl!: TemplateRef<any>;
    @ViewChild('datesTpl', { static: true }) datesTpl!: TemplateRef<any>;
    @ViewChild('risqueTpl', { static: true }) risqueTpl!: TemplateRef<any>;
    @ViewChild('statutTpl', { static: true }) statutTpl!: TemplateRef<any>;
    @ViewChild('maturiteTpl', { static: true }) maturiteTpl!: TemplateRef<any>;
    cellTemplates: { [field: string]: TemplateRef<any> } = {};

    readonly tableCols: TableColumn[] = [
        { field: 'reference', header: 'Audit', type: 'custom', width: '32%', sort: false },
        { field: 'statut', header: 'Statut', type: 'custom', width: '20%', sort: false },
        { field: 'niveauRisque', header: 'Risque', type: 'custom', width: '14%', sort: false },
        { field: 'scoreMaturite', header: 'Maturité', type: 'custom', width: '14%', align: 'center', sort: false },
        { field: 'dateDebutPrevue', header: 'Dates prévues', type: 'custom', width: '20%', sort: false }
    ];

    filtres: AuditFiltres = {};
    searchText = '';
    private searchSubject = new Subject<string>();

    typesAudit: TypeAuditRef[] = [];
    domaines: NoeudReferentiel[] = [];
    auditeurs: AuditeurFiche[] = [];
    private nomSite = new Map<string, string>();
    statutOptions = Object.values(StatutAudit).map(s => ({ label: STATUT_AUDIT_LABELS[s], value: s }));
    niveauRisqueOptions = Object.values(NiveauRisqueAudit).map(n => ({ label: NIVEAU_RISQUE_LABELS[n], value: n }));
    anneeOptions = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() + 1 - i).map(a => ({ label: String(a), value: a }));

    private destroy$ = new Subject<void>();

    constructor(
        private auditService: AuditGestionService,
        private referentiel: AuditReferentielService,
        private router: Router,
        private route: ActivatedRoute,
        private messageService: MessageService
    ) {}

    ngOnInit(): void {
        this.cellTemplates = {
            reference: this.auditTpl,
            dateDebutPrevue: this.datesTpl,
            niveauRisque: this.risqueTpl,
            statut: this.statutTpl,
            scoreMaturite: this.maturiteTpl
        };
        const q = this.route.snapshot.queryParamMap;
        if (q.get('annee')) {
            this.filtres.annee = Number(q.get('annee'));
            this.calendrierAnnee = this.filtres.annee;
        }
        if (q.get('mesAudits') === 'true') this.filtres.mesAudits = true;
        if (q.get('enRetard') === 'true') this.filtres.enRetard = true;
        if (q.get('vue') === 'calendrier') this.modeAffichage = 'calendrier';

        this.referentiel.typesAudit().pipe(takeUntil(this.destroy$)).subscribe({
            next: t => (this.typesAudit = t),
            error: err => this.erreur(err, 'Les types d\'audit n\'ont pas pu être chargés.')
        });
        this.referentiel.auditeurs().pipe(takeUntil(this.destroy$)).subscribe({
            next: a => (this.auditeurs = a),
            error: err => this.erreur(err, 'Le vivier d\'auditeurs n\'a pas pu être chargé.')
        });
        this.referentiel.sites().pipe(takeUntil(this.destroy$)).subscribe({
            next: s => (this.nomSite = new Map(s.map(x => [x.id!, x.nom ?? '—']))),
            error: () => undefined // les sites s'affichent alors par un tiret
        });
        this.auditService.getReferentielRQAPBF().pipe(takeUntil(this.destroy$)).subscribe({
            next: res => (this.domaines = contenu<NoeudReferentiel>(res)),
            error: () => undefined // le filtre par domaine reste simplement vide
        });
        this.referentiel.libelles().pipe(takeUntil(this.destroy$)).subscribe({
            next: l => (this.libelles = l),
            error: err => this.erreur(err, 'Les processus, sites ou auditeurs n\'ont pas pu être chargés.')
        });
        if (this.modeAffichage === 'calendrier') {
            this.chargerCalendrier();
        } else {
            this.charger();
        }
        this.searchSubject.pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$)).subscribe(term => {
            this.filtres.search = term || undefined;
            this.recharger();
        });
    }

    charger(): void {
        this.pageDemandee = true;
        this.loading = true;
        this.erreurChargement = null;
        this.auditService.findAll(this.currentPage, this.pageSize, this.parametres())
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res: any) => {
                    this.audits = res?.data?.content ?? [];
                    this.totalElements = res?.data?.totalElements ?? 0;
                    this.loading = false;
                },
                error: err => {
                    // L'erreur s'affiche : une liste vide ferait croire qu'il n'y a pas d'audit.
                    this.audits = [];
                    this.totalElements = 0;
                    this.loading = false;
                    this.erreurChargement = messageErreur(err, 'Impossible de charger le programme d\'audit.');
                }
            });
    }

    private parametres(): Record<string, any> {
        const f = this.filtres;
        return {
            search: f.search,
            statuts: f.statuts?.length ? f.statuts : undefined,
            typeAuditId: f.typeAuditId,
            domaineId: f.domaineId,
            niveauRisque: f.niveauRisque,
            responsableId: f.responsableId,
            enRetard: f.enRetard ? true : undefined,
            mesAudits: f.mesAudits ? true : undefined,
            annee: f.annee
        };
    }

    /** Les filtres se replient : empilés, ils occupaient tout l'écran (observation 32). */
    filtresOuverts = false;

    get filtresActifs(): number {
        const f = this.filtres;
        return [f.statuts?.length, f.typeAuditId, f.domaineId, f.niveauRisque, f.responsableId, f.annee, f.mesAudits, f.enRetard]
            .filter(Boolean).length;
    }

    exportEnCours = false;

    /**
     * Le programme filtré, en CSV qu'Excel ouvre directement (point-virgule, encodage UTF-8 avec
     * marque) : il n'y avait pas d'export (observation 32).
     */
    exporter(): void {
        this.exportEnCours = true;
        this.auditService.findAll(0, 1000, this.parametres()).pipe(takeUntil(this.destroy$)).subscribe({
            next: (res: any) => {
                const lignes: Audit[] = res?.data?.content ?? [];
                const cellule = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
                const jour = (d?: string) => (d ? d.slice(0, 10).split('-').reverse().join('/') : '');
                const entete = ['Référence', 'Type', 'Processus', 'Début prévu', 'Fin prévue', 'Responsable', 'Équipe', 'Risque', 'Statut'];
                const corps = lignes.map(a => [
                    a.reference, a.typeAuditLibelle, this.libelles.processus(a.processusId), jour(a.dateDebutPrevue), jour(a.dateFinPrevue),
                    this.libelles.auditeur(a.responsableEquipeId), this.nomsMembres(a), a.niveauRisque, this.getStatutLabel(a.statut)
                ].map(cellule).join(';'));
                const csv = '\uFEFF' + [entete.map(cellule).join(';'), ...corps].join('\r\n');
                const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
                const lien = document.createElement('a');
                lien.href = url;
                lien.download = `Programme_audit${this.filtres.annee ? '_' + this.filtres.annee : ''}.csv`;
                lien.click();
                URL.revokeObjectURL(url);
                this.exportEnCours = false;
            },
            error: err => {
                this.exportEnCours = false;
                this.erreurChargement = messageErreur(err, 'L\'export du programme a échoué.');
            }
        });
    }

    recharger(): void {
        if (this.filtres.annee) {
            this.calendrierAnnee = this.filtres.annee;
        }
        this.currentPage = 0;
        if (this.modeAffichage === 'calendrier') {
            this.chargerCalendrier();
        } else {
            this.charger();
        }
    }

    basculerMode(mode: 'tableau' | 'calendrier'): void {
        if (this.modeAffichage === mode) return;
        this.modeAffichage = mode;
        if (mode === 'calendrier') {
            if (this.filtres.annee) {
                this.calendrierAnnee = this.filtres.annee;
            }
            this.chargerCalendrier();
        } else {
            this.charger();
        }
    }

    chargerCalendrier(): void {
        this.loadingCalendrier = true;
        this.erreurChargement = null;
        this.auditService.findAll(0, 500, this.parametres())
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res: any) => {
                    this.auditsCalendrier = res?.data?.content ?? [];
                    this.totalCalendrier = res?.data?.totalElements ?? this.auditsCalendrier.length;
                    this.construireCalendrier();
                    this.loadingCalendrier = false;
                },
                error: err => {
                    this.auditsCalendrier = [];
                    this.totalCalendrier = 0;
                    this.construireCalendrier();
                    this.loadingCalendrier = false;
                    this.erreurChargement = messageErreur(err, 'Impossible de charger le calendrier du programme d\'audit.');
                }
            });
    }

    changerEchelle(echelle: 'annee' | 'mois'): void {
        if (this.echelleCalendrier === echelle) return;
        this.echelleCalendrier = echelle;
        this.construireCalendrier();
    }

    ouvrirMois(moisIndex: number): void {
        this.calendrierMois = moisIndex;
        this.echelleCalendrier = 'mois';
        this.construireCalendrier();
    }

    naviguerCalendrier(delta: number): void {
        if (this.echelleCalendrier === 'annee') {
            this.calendrierAnnee += delta;
            if (this.filtres.annee != null) {
                this.filtres.annee = this.calendrierAnnee;
                this.chargerCalendrier();
                return;
            }
        } else {
            const cible = new Date(this.calendrierAnnee, this.calendrierMois + delta, 1);
            const anneeChangee = cible.getFullYear() !== this.calendrierAnnee;
            this.calendrierAnnee = cible.getFullYear();
            this.calendrierMois = cible.getMonth();
            if (anneeChangee && this.filtres.annee != null) {
                this.filtres.annee = this.calendrierAnnee;
                this.chargerCalendrier();
                return;
            }
        }
        this.construireCalendrier();
    }

    allerAujourdhui(): void {
        const now = new Date();
        const anneeChangee = now.getFullYear() !== this.calendrierAnnee;
        this.calendrierAnnee = now.getFullYear();
        this.calendrierMois = now.getMonth();
        if (anneeChangee && this.filtres.annee != null) {
            this.filtres.annee = this.calendrierAnnee;
            this.chargerCalendrier();
            return;
        }
        this.construireCalendrier();
    }

    get titrePeriodeCalendrier(): string {
        return this.echelleCalendrier === 'annee'
            ? String(this.calendrierAnnee)
            : `${this.nomsMois[this.calendrierMois]} ${this.calendrierAnnee}`;
    }

    private construireCalendrier(): void {
        const today = new Date();
        const todayKey = this.dateKey(today);
        const nowYear = today.getFullYear();
        const nowMonth = today.getMonth();

        const bornes = this.auditsCalendrier.map(audit => {
            const debut = this.parseDateLocale(audit.dateDebutPrevue);
            let fin = this.parseDateLocale(audit.dateFinPrevue) ?? debut;
            if (debut && fin && fin.getTime() < debut.getTime()) {
                fin = debut;
            }
            return { audit, debut, fin };
        });

        this.auditsSansDate = bornes.filter(b => !b.debut).map(b => b.audit);
        const tries = bornes
            .filter((b): b is { audit: Audit; debut: Date; fin: Date } => !!b.debut && !!b.fin)
            .sort((a, b) => a.debut.getTime() - b.debut.getTime() || (a.audit.reference ?? '').localeCompare(b.audit.reference ?? ''));

        // 1. Vue annuelle (12 mois de calendrierAnnee)
        const debutAnnee = new Date(this.calendrierAnnee, 0, 1).getTime();
        const finAnnee = new Date(this.calendrierAnnee, 11, 31).getTime();
        this.nbAuditsAnneeCalendrier = tries.filter(b => b.debut.getTime() <= finAnnee && b.fin.getTime() >= debutAnnee).length;

        this.moisAnnee = this.nomsMois.map((nom, moisIndex) => {
            const debutMois = new Date(this.calendrierAnnee, moisIndex, 1).getTime();
            const finMois = new Date(this.calendrierAnnee, moisIndex + 1, 0).getTime();
            const audits = tries
                .filter(b => b.debut.getTime() <= finMois && b.fin.getTime() >= debutMois)
                .map(b => b.audit);
            return {
                moisIndex,
                nom,
                courant: this.calendrierAnnee === nowYear && moisIndex === nowMonth,
                audits
            };
        });

        // 2. Vue mensuelle (grille Lun → Dim)
        const premierDuMois = new Date(this.calendrierAnnee, this.calendrierMois, 1);
        const dernierDuMois = new Date(this.calendrierAnnee, this.calendrierMois + 1, 0);
        const decalageLundi = (premierDuMois.getDay() + 6) % 7;
        const nbCases = Math.ceil((decalageLundi + dernierDuMois.getDate()) / 7) * 7;

        this.auditsDuMois = tries
            .filter(b => b.debut.getTime() <= dernierDuMois.getTime() && b.fin.getTime() >= premierDuMois.getTime())
            .map(b => b.audit);

        const jours: JourCalendrier[] = [];
        for (let i = 0; i < nbCases; i++) {
            const d = new Date(this.calendrierAnnee, this.calendrierMois, 1 - decalageLundi + i);
            const t = d.getTime();
            const cle = this.dateKey(d);
            jours.push({
                date: d,
                cle,
                jour: d.getDate(),
                horsMois: d.getMonth() !== this.calendrierMois,
                aujourdhui: cle === todayKey,
                audits: tries.filter(b => t >= b.debut.getTime() && t <= b.fin.getTime()).map(b => b.audit)
            });
        }
        this.joursMois = jours;
    }

    private parseDateLocale(d?: string | null): Date | null {
        if (!d) return null;
        const parts = d.slice(0, 10).split('-').map(Number);
        if (parts.length !== 3 || parts.some(isNaN)) return null;
        return new Date(parts[0], parts[1] - 1, parts[2]);
    }

    private dateKey(d: Date): string {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    styleAuditCalendrier(audit: Audit): string {
        if (audit.statut === StatutAudit.ANNULE) {
            return 'bg-surface-100 dark:bg-surface-800 border-surface-300 dark:border-surface-600 text-surface-500 dark:text-surface-400 line-through';
        }
        if (audit.statut === StatutAudit.CLOTURE) {
            return 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/35 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/20';
        }
        if (audit.statut === StatutAudit.EN_RETARD || audit.enRetard) {
            return 'bg-rose-500/10 dark:bg-rose-500/15 border-rose-500/35 text-rose-800 dark:text-rose-300 hover:bg-rose-500/20';
        }
        if (audit.statut === StatutAudit.EN_COURS) {
            return 'bg-indigo-500/10 dark:bg-indigo-500/15 border-indigo-500/35 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-500/20';
        }
        if (audit.statut === StatutAudit.EN_PREPARATION) {
            return 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/35 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20';
        }
        return 'bg-[#0ea5e9]/10 dark:bg-[#0ea5e9]/15 border-[#0ea5e9]/35 text-[#0369a1] dark:text-sky-300 hover:bg-[#0ea5e9]/20';
    }

    pointStatutCalendrier(audit: Audit): string {
        if (audit.statut === StatutAudit.ANNULE) return 'bg-surface-400';
        if (audit.statut === StatutAudit.CLOTURE) return 'bg-emerald-500';
        if (audit.statut === StatutAudit.EN_RETARD || audit.enRetard) return 'bg-rose-500';
        if (audit.statut === StatutAudit.EN_COURS) return 'bg-indigo-500';
        if (audit.statut === StatutAudit.EN_PREPARATION) return 'bg-amber-500';
        return 'bg-[#0ea5e9]';
    }

    tooltipAudit(audit: Audit): string {
        const format = (d?: string) => (d ? d.slice(0, 10).split('-').reverse().join('/') : '—');
        const periode = audit.dateFinPrevue
            ? `${format(audit.dateDebutPrevue)} → ${format(audit.dateFinPrevue)}`
            : format(audit.dateDebutPrevue);
        return `${audit.reference ?? 'Audit'} — ${this.libelles.processus(audit.processusId)} · ${periode} · ${this.getStatutLabel(audit.statut)}`;
    }

    trackByMois(_i: number, m: MoisCalendrier): number {
        return m.moisIndex;
    }

    trackByJour(_i: number, j: JourCalendrier): string {
        return j.cle;
    }

    trackByAuditId(_i: number, a: Audit): string {
        return a.id ?? String(_i);
    }

    onSearch(term: string): void {
        this.searchText = term;
        this.searchSubject.next(term);
    }

    reinitialiserFiltres(): void {
        this.filtres = {};
        this.searchText = '';
        this.recharger();
    }

    onPageChange(event: { page: number; size: number }): void {
        const page = event.page ?? 0;
        const taille = event.size ?? this.pageSize;
        if (this.pageDemandee && page === this.currentPage && taille === this.pageSize) {
            return;
        }
        this.currentPage = page;
        this.pageSize = taille;
        this.charger();
    }

    ouvrirResume(audit: Audit): void {
        this.resume = audit;
        this.resumeOuvert = true;
    }

    getActionMenuItems = (audit: Audit): MenuItem[] => [
        { label: 'Fiche résumée', icon: 'pi pi-eye', command: () => this.ouvrirResume(audit) },
        { label: 'Ouvrir la fiche complète', icon: 'pi pi-external-link', command: () => this.ouvrirDetail(audit) },
        {
            label: audit.circuitExterne ? 'Charger le plan d\'audit reçu' : 'Élaborer le plan d\'audit',
            icon: audit.circuitExterne ? 'pi pi-upload' : 'pi pi-file-edit',
            command: () => this.allerAuPlan(audit)
        }
    ];

    allerAuPlan(audit: Audit): void {
        if (audit.id) {
            this.resumeOuvert = false;
            this.router.navigate(['/gestion-audit/programme', audit.id, 'plan']);
        }
    }

    nomsSites(audit: Audit): string[] {
        return (audit.siteIds ?? []).map(id => this.nomSite.get(id) ?? '—');
    }

    nomsMembres(audit: Audit): string {
        return (audit.membreEquipeIds ?? []).map(id => this.libelles.auditeur(id)).join(', ') || '—';
    }

    ouvrirDetail(audit: Audit): void {
        if (audit.id) {
            this.resumeOuvert = false;
            this.router.navigate(['/gestion-audit/programme', audit.id]);
        }
    }

    creerAudit(): void {
        this.router.navigate(['/gestion-audit/programme/create']);
    }

    getStatutSeverity(statut?: string): any {
        return STATUT_AUDIT_SEVERITY[statut as StatutAudit] ?? 'secondary';
    }

    getStatutLabel(statut?: string): string {
        return STATUT_AUDIT_LABELS[statut as StatutAudit] ?? statut ?? '';
    }

    risqueLabel(n?: string): string {
        return NIVEAU_RISQUE_LABELS[n as NiveauRisqueAudit] ?? n ?? '';
    }

    risqueSeverite(n?: string): any {
        return NIVEAU_RISQUE_SEVERITY[n as NiveauRisqueAudit] ?? 'secondary';
    }

    efficaciteLabel(e?: string): string {
        return NIVEAU_EFFICACITE_LABELS[(e ?? NiveauEfficacite.NON_EVALUEE) as NiveauEfficacite] ?? e ?? '';
    }

    efficaciteSeverite(e?: string): any {
        return NIVEAU_EFFICACITE_SEVERITY[(e ?? NiveauEfficacite.NON_EVALUEE) as NiveauEfficacite] ?? 'secondary';
    }

    private erreur(err: unknown, defaut: string): void {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: messageErreur(err, defaut), life: 8000 });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
