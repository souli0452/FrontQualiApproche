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

    @ViewChild('auditTpl', { static: true }) auditTpl!: TemplateRef<any>;
    @ViewChild('datesTpl', { static: true }) datesTpl!: TemplateRef<any>;
    @ViewChild('risqueTpl', { static: true }) risqueTpl!: TemplateRef<any>;
    @ViewChild('statutTpl', { static: true }) statutTpl!: TemplateRef<any>;
    @ViewChild('maturiteTpl', { static: true }) maturiteTpl!: TemplateRef<any>;
    cellTemplates: { [field: string]: TemplateRef<any> } = {};

    readonly tableCols: TableColumn[] = [
        { field: 'reference', header: 'Audit', type: 'custom', width: '34%', sort: false },
        { field: 'dateDebutPrevue', header: 'Dates prévues', type: 'custom', width: '18%', sort: false },
        { field: 'niveauRisque', header: 'Risque', type: 'custom', width: '14%', sort: false },
        { field: 'statut', header: 'Statut', type: 'custom', width: '20%', sort: false },
        { field: 'scoreMaturite', header: 'Maturité', type: 'custom', width: '14%', align: 'center', sort: false }
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
        if (q.get('annee')) this.filtres.annee = Number(q.get('annee'));
        if (q.get('mesAudits') === 'true') this.filtres.mesAudits = true;
        if (q.get('enRetard') === 'true') this.filtres.enRetard = true;

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
        this.charger();
        this.searchSubject.pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$)).subscribe(term => {
            this.filtres.search = term || undefined;
            this.recharger();
        });
    }

    charger(): void {
        this.pageDemandee = true;
        this.loading = true;
        this.erreurChargement = null;
        const f = this.filtres;
        const params: Record<string, any> = {
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
        this.auditService.findAll(this.currentPage, this.pageSize, params)
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

    recharger(): void {
        this.currentPage = 0;
        this.charger();
    }

    onSearch(term: string): void {
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
