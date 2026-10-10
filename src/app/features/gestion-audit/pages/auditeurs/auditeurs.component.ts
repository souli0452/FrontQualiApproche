import { Component, OnInit, OnDestroy, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgPrimeModule } from '@prime-ng';
import { Subject, debounceTime, distinctUntilChanged, forkJoin, map, switchMap, takeUntil } from 'rxjs';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { SelectInputComponent } from '@shared/ui/select-input/select-input.component';
import { MultiselectInputComponent } from '@shared/ui/multiselect-input/multiselect-input.component';
import { TableauAffichageComponent } from '@shared/tableau-affichage/tableau-affichage';
import { TableColumn } from '../../../../models/generique.model';
import { Structure } from '@features/organigramme/models/structure.model';
import { AuditLibelleComponent } from '../../components/libelle-aide.component';
import { AuditGestionService, contenu, messageErreur } from '../../services/audit.service';
import { AuditReferentielService, UtilisateurAnnuaire } from '../../services/audit-referentiel.service';
import { AuditeurFiche, NiveauEvaluationAuditeur } from '../../models/audit.model';

/**
 * Portefeuille des auditeurs (écran A4 de la maquette) : une ligne par auditeur dans le tableau
 * commun, qui s'ouvre en fenêtre sur son activité et son évaluation ; la fiche s'inscrit et se
 * modifie dans une carte au-dessus du tableau.
 *
 * <p>Un auditeur désigne un utilisateur de l'annuaire. Structure d'appartenance et processus
 * gérés désignent des structures : le serveur s'en sert pour signaler un conflit d'intérêts.</p>
 *
 * <p>La liste se lit page par page. Le serveur ne connaît pas les noms : la recherche se résout
 * d'abord dans l'annuaire, puis borne la page aux personnes trouvées.</p>
 */
@Component({
    selector: 'app-audit-auditeurs',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, NgPrimeModule, SelectInputComponent, MultiselectInputComponent, AuditLibelleComponent, TableauAffichageComponent],
    providers: [MessageService, ConfirmationService],
    templateUrl: './auditeurs.component.html'
})
export class AuditAuditeursComponent implements OnInit, OnDestroy {

    /** La page affichée. */
    auditeurs: AuditeurFiche[] = [];
    totalElements = 0;
    currentPage = 0;
    pageSize = 10;
    /** Le vivier entier, pour ne proposer à l'inscription que ceux qui n'y sont pas. */
    private vivier: AuditeurFiche[] = [];
    utilisateurs: UtilisateurAnnuaire[] = [];
    structures: Structure[] = [];
    niveaux: NiveauEvaluationAuditeur[] = [];
    loading = true;
    saving = false;
    recherche = '';
    /** Une page a déjà été demandée : le tableau, en mode différé, redemande la première à l'ouverture. */
    private pageDemandee = false;
    /** L'auditeur ouvert en fenêtre. */
    detail: AuditeurFiche | null = null;
    detailOuvert = false;

    @ViewChild('nomTpl', { static: true }) nomTpl!: TemplateRef<any>;
    @ViewChild('domainesTpl', { static: true }) domainesTpl!: TemplateRef<any>;
    @ViewChild('certificationsTpl', { static: true }) certificationsTpl!: TemplateRef<any>;
    @ViewChild('disponibiliteTpl', { static: true }) disponibiliteTpl!: TemplateRef<any>;
    @ViewChild('statutTpl', { static: true }) statutTpl!: TemplateRef<any>;
    @ViewChild('evaluationTpl', { static: true }) evaluationTpl!: TemplateRef<any>;
    cellTemplates: { [field: string]: TemplateRef<any> } = {};

    readonly tableCols: TableColumn[] = [
        { field: 'nomComplet', header: 'Auditeur', type: 'custom', width: '24%', sort: false },
        { field: 'domainesHabilites', header: 'Domaines habilités', type: 'custom', width: '22%', sort: false },
        { field: 'certifications', header: 'Certification', type: 'custom', width: '18%', sort: false },
        { field: 'disponibilite', header: 'Disponibilité', type: 'custom', width: '12%', sort: false },
        { field: 'statut', header: 'Statut', type: 'custom', width: '10%', sort: false },
        { field: 'scoreEvaluationMoyen', header: 'Évaluation', type: 'custom', width: '14%', sort: false }
    ];
    /** La fiche en cours de saisie : vide à l'inscription, l'auditeur à la modification. */
    enEdition: AuditeurFiche | null = null;

    formulaire: FormGroup;

    readonly statutOptions = [
        { label: 'Actif', value: 'ACTIF' },
        { label: 'Inactif (garde son historique, ne s\'affecte plus)', value: 'INACTIF' }
    ];

    private libelleStructure = new Map<string, string>();
    private recherche$ = new Subject<string>();
    private destroy$ = new Subject<void>();

    constructor(
        private fb: FormBuilder,
        private auditService: AuditGestionService,
        private referentiel: AuditReferentielService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {
        this.formulaire = this.fb.group({
            utilisateurId: [null, Validators.required],
            structureAppartenance: [null],
            processusGeres: [[]],
            niveauHabilitation: [null],
            domainesHabilites: [[]],
            certifications: [[]],
            disponibilite: [null],
            statut: ['ACTIF']
        });
    }

    ngOnInit(): void {
        this.cellTemplates = {
            nomComplet: this.nomTpl,
            domainesHabilites: this.domainesTpl,
            certifications: this.certificationsTpl,
            disponibilite: this.disponibiliteTpl,
            statut: this.statutTpl,
            scoreEvaluationMoyen: this.evaluationTpl
        };
        forkJoin({
            utilisateurs: this.referentiel.utilisateurs(),
            structures: this.referentiel.processus(),
            niveaux: this.referentiel.niveauxEvaluation()
        }).pipe(takeUntil(this.destroy$)).subscribe({
            next: ({ utilisateurs, structures, niveaux }) => {
                this.utilisateurs = utilisateurs;
                this.structures = structures;
                this.niveaux = niveaux;
                this.libelleStructure = new Map(structures.map(s => [s.id!, s.libelleLong || s.libelleCourt || '—']));
            },
            error: err => this.erreur(err, 'L\'annuaire, les structures ou les niveaux d\'évaluation n\'ont pas pu être chargés.')
        });
        this.recherche$.pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$)).subscribe(() => {
            this.currentPage = 0;
            this.charger();
        });
        this.charger();
    }

    /** Recharge la page affichée et le vivier entier (les listes de choix du module avec lui). */
    charger(): void {
        this.pageDemandee = true;
        this.loading = true;
        this.referentiel.invalidate();
        this.referentiel.auditeurs().pipe(takeUntil(this.destroy$)).subscribe({
            next: v => (this.vivier = v),
            error: () => (this.vivier = [])
        });
        const cibles = this.utilisateursCherches();
        if (cibles && !cibles.length) {
            this.auditeurs = [];
            this.totalElements = 0;
            this.loading = false;
            return;
        }
        this.auditService.pageAuditeurs(this.currentPage, this.pageSize, cibles)
            .pipe(
                switchMap(res => this.referentiel.nommer(contenu<AuditeurFiche>(res))
                    .pipe(map(page => ({ page, total: res?.data?.totalElements ?? 0 })))),
                takeUntil(this.destroy$)
            )
            .subscribe({
                next: ({ page, total }) => {
                    this.auditeurs = page;
                    this.totalElements = total;
                    this.loading = false;
                },
                error: err => {
                    this.auditeurs = [];
                    this.totalElements = 0;
                    this.loading = false;
                    this.erreur(err, 'Le vivier d\'auditeurs n\'a pas pu être chargé.');
                }
            });
    }

    rechercher(texte: string): void {
        this.recherche = (texte ?? '').trim();
        this.recherche$.next(this.recherche);
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

    ouvrirDetail(a: AuditeurFiche): void {
        this.detail = a;
        this.detailOuvert = true;
    }

    getActionMenuItems = (a: AuditeurFiche): MenuItem[] => [
        { label: 'Voir le détail', icon: 'pi pi-eye', command: () => this.ouvrirDetail(a) },
        { label: 'Modifier la fiche', icon: 'pi pi-pencil', command: () => this.ouvrirEdition(a) },
        { label: 'Retirer du vivier', icon: 'pi pi-trash', command: () => this.supprimer(a) }
    ];

    /** Les utilisateurs que la recherche désigne ; aucune borne sans recherche. */
    private utilisateursCherches(): string[] | undefined {
        const r = this.recherche.trim().toLowerCase();
        if (!r) return undefined;
        return this.utilisateurs
            .filter(u => (u.nomComplet ?? '').toLowerCase().includes(r) || (u.email ?? '').toLowerCase().includes(r))
            .map(u => u.id);
    }

    /** À l'inscription, seuls les utilisateurs qui ne sont pas déjà au vivier. */
    get utilisateursProposes(): UtilisateurAnnuaire[] {
        if (this.enEdition?.id) {
            return this.utilisateurs;
        }
        const inscrits = new Set(this.vivier.map(a => a.utilisateurId));
        return this.utilisateurs.filter(u => !inscrits.has(u.id));
    }

    /**
     * Le niveau le plus proche de la moyenne reçue : le serveur fait la moyenne des ordres des
     * niveaux attribués, on la ramène au libellé du niveau paramétré.
     */
    niveauMoyen(a: AuditeurFiche): string | null {
        if (a.scoreEvaluationMoyen == null || !this.niveaux.length) {
            return null;
        }
        const proche = this.niveaux.reduce((m, n) =>
            Math.abs((n.ordre ?? 0) - a.scoreEvaluationMoyen!) < Math.abs((m.ordre ?? 0) - a.scoreEvaluationMoyen!) ? n : m);
        return proche.libelle ?? null;
    }

    structure(id?: string): string {
        return id ? this.libelleStructure.get(id) ?? '—' : '—';
    }

    basculerAjout(): void {
        if (this.enEdition && !this.enEdition.id) {
            this.enEdition = null;
            return;
        }
        this.enEdition = {};
        this.formulaire.reset({ statut: 'ACTIF', processusGeres: [], domainesHabilites: [], certifications: [] });
        this.formulaire.get('utilisateurId')?.enable();
    }

    ouvrirEdition(a: AuditeurFiche): void {
        this.detailOuvert = false;
        this.enEdition = a;
        this.formulaire.reset({
            ...a,
            processusGeres: a.processusGeres ?? [],
            domainesHabilites: a.domainesHabilites ?? [],
            certifications: a.certifications ?? []
        });
        // On ne change pas la personne d'une fiche : on en inscrit une autre.
        this.formulaire.get('utilisateurId')?.disable();
    }

    sauvegarder(): void {
        if (this.formulaire.invalid) {
            this.formulaire.markAllAsTouched();
            return;
        }
        this.saving = true;
        const payload = this.formulaire.getRawValue();
        const id = this.enEdition?.id;
        const req$ = id ? this.auditService.mettreAJourAuditeur(id, payload) : this.auditService.creerAuditeur(payload);
        req$.pipe(takeUntil(this.destroy$)).subscribe({
            next: () => {
                this.saving = false;
                this.enEdition = null;
                this.messageService.add({ severity: 'success', summary: 'Succès', detail: id ? 'Fiche mise à jour.' : 'Auditeur inscrit au vivier.' });
                this.charger();
            },
            error: err => {
                this.saving = false;
                this.erreur(err, 'L\'enregistrement a échoué.');
            }
        });
    }

    supprimer(a: AuditeurFiche): void {
        this.detailOuvert = false;
        this.confirmationService.confirm({
            header: 'Retirer du vivier',
            message: `Retirer « ${a.nomComplet} » du vivier ? Un auditeur déjà affecté se passe plutôt en inactif, pour garder son historique.`,
            icon: 'pi pi-trash',
            acceptLabel: 'Retirer',
            rejectLabel: 'Retour',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.auditService.supprimerAuditeur(a.id!).pipe(takeUntil(this.destroy$)).subscribe({
                    next: () => {
                        this.messageService.add({ severity: 'success', summary: 'Retiré', detail: 'Auditeur retiré du vivier.' });
                        this.charger();
                    },
                    error: err => this.erreur(err, 'Le retrait a échoué.')
                });
            }
        });
    }

    initiales(a: AuditeurFiche): string {
        return ((a.prenom?.[0] ?? '') + (a.nom?.[0] ?? '')).toUpperCase() || '?';
    }

    private erreur(err: unknown, defaut: string): void {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: messageErreur(err, defaut), life: 8000 });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
