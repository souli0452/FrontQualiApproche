import { Component, OnInit, OnDestroy, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NgPrimeModule } from '@prime-ng';
import { Subject, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';
import { SelectInputComponent } from '@shared/ui/select-input/select-input.component';
import { TableauAffichageComponent } from '@shared/tableau-affichage/tableau-affichage';
import { TableColumn } from '../../../../models/generique.model';
import { AuditLibelleComponent } from '../../components/libelle-aide.component';
import { AuditGestionService, contenu, messageErreur } from '../../services/audit.service';
import { AuditReferentielService, LIBELLES_VIDES, LibellesAudit as Libelles } from '../../services/audit-referentiel.service';
import { Audit, ComparaisonPeriodes, NotationCritere, TableauDeBord } from '../../models/audit.model';
import {
    NiveauNotationRQAPBF,
    NIVEAU_NOTATION_RQAPBF_LABELS,
    NIVEAU_NOTATION_RQAPBF_SEVERITY,
    StatutAudit,
    STATUT_AUDIT_LABELS,
    STATUT_AUDIT_SEVERITY
} from '../../models/audit-enums';

type Onglet = 'programme' | 'comparaison' | 'ecarts';

/** Une période de comparaison : une année, ou l'un de ses semestres. */
interface Periode {
    label: string;
    value: string;
    debut: string;
    fin: string;
}

/**
 * Le suivi du programme, en trois onglets d'après la maquette : réalisation du programme (D16),
 * historique et comparaison des évaluations (D17), écarts RQAP-BF transmis au module
 * Non-conformités (D18).
 *
 * <p>Les périodes de D17 se choisissent dans une liste (années et semestres) plutôt que de se
 * saisir. L'adresse peut désigner l'onglet (`onglet`) et l'audit des écarts (`auditId`).</p>
 */
@Component({
    selector: 'app-suivi-programme',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, NgPrimeModule, SelectInputComponent, AuditLibelleComponent, TableauAffichageComponent],
    providers: [MessageService],
    templateUrl: './suivi-programme.component.html'
})
export class SuiviProgrammeComponent implements OnInit, OnDestroy {

    readonly onglets = [
        { label: 'Suivi du programme', value: 'programme', icone: 'pi pi-chart-bar' },
        { label: 'Comparaison', value: 'comparaison', icone: 'pi pi-arrow-right-arrow-left' },
        { label: 'Écarts RQAP-BF', value: 'ecarts', icone: 'pi pi-exclamation-triangle' }
    ];
    onglet: Onglet = 'programme';

    libelles: Libelles = LIBELLES_VIDES;

    // D16
    annee = new Date().getFullYear();
    anneeOptions = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() + 1 - i).map(a => ({ label: String(a), value: a }));
    tableau: TableauDeBord = {};
    auditsAnnee: Audit[] = [];
    totalProgramme = 0;
    pageProgramme = 0;
    tailleProgramme = 10;
    chargementProgramme = false;
    private programmeDemande = false;
    readonly colonnesProgramme: TableColumn[] = [
        { field: 'reference', header: 'Audit', type: 'custom', width: '40%', sort: false },
        { field: 'responsableEquipeId', header: 'Responsable', type: 'custom', width: '24%', sort: false },
        { field: 'statut', header: 'Statut', type: 'custom', width: '18%', sort: false },
        { field: 'enRetard', header: 'Retard', type: 'custom', width: '18%', sort: false }
    ];
    cellulesProgramme: { [field: string]: TemplateRef<any> } = {};
    @ViewChild('auditAnneeTpl', { static: true }) auditAnneeTpl!: TemplateRef<any>;
    @ViewChild('responsableTpl', { static: true }) responsableTpl!: TemplateRef<any>;
    @ViewChild('statutAuditTpl', { static: true }) statutAuditTpl!: TemplateRef<any>;
    @ViewChild('retardTpl', { static: true }) retardTpl!: TemplateRef<any>;

    // D17
    readonly periodes: Periode[] = this.construirePeriodes();
    periode1 = String(new Date().getFullYear() - 1);
    periode2 = String(new Date().getFullYear());
    comparaison: ComparaisonPeriodes | null = null;
    comparant = false;
    radar: any;
    optionsRadar: any;

    // D18
    audits: Audit[] = [];
    auditFiltre: string | null = null;
    ecarts: NotationCritere[] = [];
    totalEcarts = 0;
    pageEcarts = 0;
    tailleEcarts = 10;
    chargementEcarts = false;
    private ecartsDemandes = false;
    readonly colonnesEcarts: TableColumn[] = [
        { field: 'auditReference', header: 'Audit', type: 'custom', width: '14%', sort: false },
        { field: 'noeudCode', header: 'Critère', type: 'custom', width: '46%', sort: false },
        { field: 'niveau', header: 'Constat retenu', type: 'custom', width: '20%', sort: false },
        { field: 'nonConformiteId', header: 'Non-conformité', type: 'custom', width: '20%', sort: false }
    ];
    cellulesEcarts: { [field: string]: TemplateRef<any> } = {};
    @ViewChild('ecartAuditTpl', { static: true }) ecartAuditTpl!: TemplateRef<any>;
    @ViewChild('critereTpl', { static: true }) critereTpl!: TemplateRef<any>;
    @ViewChild('niveauTpl', { static: true }) niveauTpl!: TemplateRef<any>;
    @ViewChild('transmissionTpl', { static: true }) transmissionTpl!: TemplateRef<any>;

    private destroy$ = new Subject<void>();

    constructor(
        private auditService: AuditGestionService,
        private referentiel: AuditReferentielService,
        private messageService: MessageService,
        private route: ActivatedRoute,
        private router: Router
    ) {}

    ngOnInit(): void {
        this.cellulesProgramme = {
            reference: this.auditAnneeTpl,
            responsableEquipeId: this.responsableTpl,
            statut: this.statutAuditTpl,
            enRetard: this.retardTpl
        };
        this.cellulesEcarts = {
            auditReference: this.ecartAuditTpl,
            noeudCode: this.critereTpl,
            niveau: this.niveauTpl,
            nonConformiteId: this.transmissionTpl
        };
        const q = this.route.snapshot.queryParamMap;
        this.auditFiltre = q.get('auditId');
        const demande = q.get('onglet') as Onglet | null;
        this.onglet = demande && this.onglets.some(o => o.value === demande) ? demande : this.auditFiltre ? 'ecarts' : 'programme';

        this.referentiel.libelles().pipe(takeUntil(this.destroy$)).subscribe({
            next: l => (this.libelles = l),
            error: () => undefined // les tirets suffisent ; la page reste lisible
        });
        this.auditService.findAll(0, 500).pipe(takeUntil(this.destroy$)).subscribe({
            next: res => (this.audits = contenu<Audit>(res)),
            error: err => this.erreur(err, 'Les audits n\'ont pas pu être chargés.')
        });
        this.chargerProgramme();
        this.comparer();
        this.chargerEcarts();
    }

    /** Une autre année : les indicateurs, et la première page de ses audits. */
    chargerProgramme(): void {
        this.auditService.getTableauDeBord(this.annee).pipe(takeUntil(this.destroy$)).subscribe({
            next: res => (this.tableau = res?.data ?? {}),
            error: err => this.erreur(err, 'Les indicateurs n\'ont pas pu être chargés.')
        });
        this.pageProgramme = 0;
        this.chargerAuditsAnnee();
    }

    onPageProgramme(event: { page: number; size: number }): void {
        const page = event.page ?? 0;
        const taille = event.size ?? this.tailleProgramme;
        // Le tableau, en mode différé, redemande la page courante à l'ouverture : déjà en route.
        if (this.programmeDemande && page === this.pageProgramme && taille === this.tailleProgramme) {
            return;
        }
        this.pageProgramme = page;
        this.tailleProgramme = taille;
        this.chargerAuditsAnnee();
    }

    ouvrirAudit(a: Audit): void {
        if (a.id) {
            this.router.navigate(['/gestion-audit/programme', a.id]);
        }
    }

    private chargerAuditsAnnee(): void {
        this.programmeDemande = true;
        this.chargementProgramme = true;
        this.auditService.findAll(this.pageProgramme, this.tailleProgramme, { annee: this.annee }).pipe(takeUntil(this.destroy$)).subscribe({
            next: res => {
                this.auditsAnnee = contenu<Audit>(res);
                this.totalProgramme = res?.data?.totalElements ?? this.auditsAnnee.length;
                this.chargementProgramme = false;
            },
            error: err => {
                this.auditsAnnee = [];
                this.chargementProgramme = false;
                this.erreur(err, 'Les audits de l\'année n\'ont pas pu être chargés.');
            }
        });
    }

    comparer(): void {
        const p1 = this.periodes.find(p => p.value === this.periode1);
        const p2 = this.periodes.find(p => p.value === this.periode2);
        if (!p1 || !p2) return;
        this.comparant = true;
        this.auditService.comparer(p1.debut, p1.fin, p2.debut, p2.fin).pipe(takeUntil(this.destroy$)).subscribe({
            next: res => {
                this.comparaison = (res as any)?.data ?? res;
                this.construireRadar();
                this.comparant = false;
            },
            error: err => {
                this.comparant = false;
                this.erreur(err, 'La comparaison a échoué.');
            }
        });
    }

    /** Un autre audit filtré : on repart de la première page. */
    chargerEcarts(): void {
        this.pageEcarts = 0;
        this.chargerPageEcarts();
    }

    onPageEcarts(event: { page: number; size: number }): void {
        const page = event.page ?? 0;
        const taille = event.size ?? this.tailleEcarts;
        if (this.ecartsDemandes && page === this.pageEcarts && taille === this.tailleEcarts) {
            return;
        }
        this.pageEcarts = page;
        this.tailleEcarts = taille;
        this.chargerPageEcarts();
    }

    private chargerPageEcarts(): void {
        this.ecartsDemandes = true;
        this.chargementEcarts = true;
        this.auditService.getEcartsRqapbf(this.auditFiltre ? { auditId: this.auditFiltre } : {}, this.pageEcarts, this.tailleEcarts)
            .pipe(takeUntil(this.destroy$)).subscribe({
            next: res => {
                this.ecarts = contenu<NotationCritere>(res);
                this.totalEcarts = res?.data?.totalElements ?? this.ecarts.length;
                this.chargementEcarts = false;
            },
            error: err => {
                this.ecarts = [];
                this.chargementEcarts = false;
                this.erreur(err, 'Les écarts n\'ont pas pu être chargés.');
            }
        });
    }

    domaines(): { domaine: string; p1?: number; p2?: number }[] {
        const d1 = this.comparaison?.periode1?.parDomaine ?? {};
        const d2 = this.comparaison?.periode2?.parDomaine ?? {};
        return [...new Set([...Object.keys(d1), ...Object.keys(d2)])].map(domaine => ({ domaine, p1: d1[domaine], p2: d2[domaine] }));
    }

    libellePeriode(valeur: string): string {
        return this.periodes.find(p => p.value === valeur)?.label ?? valeur;
    }

    /** La référence de l'audit filtré en D18, pour nommer le lien vers ses résultats. */
    get referenceFiltre(): string {
        return this.audits.find(a => a.id === this.auditFiltre)?.reference ?? 'cet audit';
    }

    statutLabel(s?: string): string {
        return STATUT_AUDIT_LABELS[s as StatutAudit] ?? s ?? '';
    }

    statutSeverite(s?: string): any {
        return STATUT_AUDIT_SEVERITY[s as StatutAudit] ?? 'secondary';
    }

    evolutionLabel(e?: string): string {
        return ({ EN_AMELIORATION: 'En amélioration', EN_DEGRADATION: 'En dégradation', STABLE: 'Stable' } as Record<string, string>)[e ?? ''] ?? e ?? '—';
    }

    evolutionSeverite(e?: string): any {
        return ({ EN_AMELIORATION: 'success', EN_DEGRADATION: 'danger' } as Record<string, string>)[e ?? ''] ?? 'secondary';
    }

    niveauLabel(n?: string): string {
        return NIVEAU_NOTATION_RQAPBF_LABELS[n as NiveauNotationRQAPBF] ?? n ?? '—';
    }

    niveauSeverite(n?: string): any {
        return NIVEAU_NOTATION_RQAPBF_SEVERITY[n as NiveauNotationRQAPBF] ?? 'secondary';
    }

    private construireRadar(): void {
        const d = this.domaines();
        const style = getComputedStyle(document.documentElement);
        const primaire = style.getPropertyValue('--p-primary-500').trim() || '#3b82f6';
        const neutre = style.getPropertyValue('--p-surface-400').trim() || '#94a3b8';
        const texte = style.getPropertyValue('--p-text-muted-color').trim() || '#64748b';
        const grille = style.getPropertyValue('--p-content-border-color').trim() || '#e2e8f0';
        this.radar = {
            labels: d.map(x => x.domaine),
            datasets: [
                { label: this.libellePeriode(this.periode1), data: d.map(x => x.p1 ?? 0), borderColor: neutre, backgroundColor: neutre + '33', pointBackgroundColor: neutre },
                { label: this.libellePeriode(this.periode2), data: d.map(x => x.p2 ?? 0), borderColor: primaire, backgroundColor: primaire + '33', pointBackgroundColor: primaire }
            ]
        };
        this.optionsRadar = {
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { color: texte } } },
            scales: { r: { min: 0, max: 100, ticks: { display: false }, grid: { color: grille }, pointLabels: { color: texte } } }
        };
    }

    private construirePeriodes(): Periode[] {
        const courante = new Date().getFullYear();
        const liste: Periode[] = [];
        for (let a = courante; a > courante - 6; a--) {
            liste.push({ label: `Année ${a}`, value: String(a), debut: `${a}-01-01`, fin: `${a}-12-31` });
            liste.push({ label: `1er semestre ${a}`, value: `${a}-S1`, debut: `${a}-01-01`, fin: `${a}-06-30` });
            liste.push({ label: `2e semestre ${a}`, value: `${a}-S2`, debut: `${a}-07-01`, fin: `${a}-12-31` });
        }
        return liste;
    }

    private erreur(err: unknown, defaut: string): void {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: messageErreur(err, defaut), life: 8000 });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
