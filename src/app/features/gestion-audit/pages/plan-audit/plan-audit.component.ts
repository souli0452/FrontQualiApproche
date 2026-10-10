import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { NgPrimeModule } from '@prime-ng';
import { Observable, Subject, forkJoin, takeUntil, tap } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { SelectInputComponent } from '@shared/ui/select-input/select-input.component';
import { MultiselectInputComponent } from '@shared/ui/multiselect-input/multiselect-input.component';
import { AuditLibelleComponent } from '../../components/libelle-aide.component';
import { AuditGestionService, messageErreur } from '../../services/audit.service';
import { AuditReferentielService, LIBELLES_VIDES, LibellesAudit, UtilisateurAnnuaire } from '../../services/audit-referentiel.service';
import { ActivitePlan, Audit, PlanAudit, SiteAudit } from '../../models/audit.model';
import { StatutAudit } from '../../models/audit-enums';

/** Les méthodes d'audit que propose le plan (ISO 19011 §6.3), aux mots de la maquette (B7). */
const METHODES_AUDIT = [
    'Entretiens avec les agents du processus',
    'Observation sur site',
    'Revue documentaire',
    'Échantillonnage statistique'
];

/** Les langues proposées pour l'audit ; une autre se tape dans la liste, le serveur n'en tient pas. */
const LANGUES_AUDIT = ['Français', 'Anglais'];

/**
 * Le plan d'audit : élaboration (B7), aperçu et diffusion (B8), ou chargement pour un audit
 * externe (B7X).
 *
 * <p>Rédigé dans l'application tant qu'il est en brouillon, puis validé et partagé avec l'audité ;
 * il ne se modifie plus ensuite. Le plan d'un audit externe n'est pas rédigé ici : l'organisme
 * auditeur le transmet, et on le charge. Tout ce qui existe déjà se choisit : l'auditeur d'une
 * activité dans l'équipe de l'audit, le processus parmi les structures, les personnes auditées
 * dans l'annuaire, le lieu parmi les sites.</p>
 */
@Component({
    selector: 'app-plan-audit',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, NgPrimeModule, SelectInputComponent, MultiselectInputComponent, AuditLibelleComponent],
    providers: [MessageService, ConfirmationService],
    templateUrl: './plan-audit.component.html'
})
export class PlanAuditComponent implements OnInit, OnDestroy {

    audit: Audit | null = null;
    plan: PlanAudit | null = null;
    /** Vrai tant que le plan n'existe que dans l'écran : le premier enregistrement le crée. */
    nouveau = false;
    loading = true;
    saving = false;
    auditId: string | null = null;

    equipe: { nom: string }[] = [];
    processus: { libelle: string }[] = [];
    personnes: UtilisateurAnnuaire[] = [];
    lieux: SiteAudit[] = [];
    sitesAudit: string[] = [];
    libelles: LibellesAudit = LIBELLES_VIDES;
    readonly methodes = METHODES_AUDIT;
    readonly langues = LANGUES_AUDIT;

    readonly vues = [
        { label: 'Élaboration', value: 'elaboration', icone: 'pi pi-pencil' },
        { label: 'Aperçu', value: 'apercu', icone: 'pi pi-eye' }
    ];
    vue: 'elaboration' | 'apercu' = 'elaboration';

    /** L'activité en cours de saisie ; `index` nul pour une nouvelle. Les personnes auditées s'y tiennent en liste. */
    activiteEnEdition: { index: number | null; activite: ActivitePlan; personnes: string[] } | null = null;

    private destroy$ = new Subject<void>();

    constructor(
        private auditService: AuditGestionService,
        private referentiel: AuditReferentielService,
        private route: ActivatedRoute,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {}

    ngOnInit(): void {
        this.auditId = this.route.snapshot.paramMap.get('id');
        if (this.auditId) this.charger(this.auditId);
    }

    charger(auditId: string): void {
        this.loading = true;
        forkJoin({
            audit: this.auditService.findById(auditId),
            auditeurs: this.referentiel.auditeurs(),
            structures: this.referentiel.processus(),
            utilisateurs: this.referentiel.utilisateurs(),
            sites: this.referentiel.sites(),
            libelles: this.referentiel.libelles()
        })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: ({ audit, auditeurs, structures, utilisateurs, sites, libelles }) => {
                    this.audit = (audit as any)?.data ?? null;
                    this.libelles = libelles;
                    const ids = [this.audit?.responsableEquipeId, ...(this.audit?.membreEquipeIds ?? [])];
                    this.equipe = auditeurs.filter(a => ids.includes(a.id)).map(a => ({ nom: a.nomComplet ?? '—' }));
                    this.processus = structures.map(s => ({ libelle: s.libelleLong || s.libelleCourt || '—' }));
                    this.personnes = utilisateurs;
                    const siteIds = this.audit?.siteIds ?? [];
                    this.sitesAudit = sites.filter(s => siteIds.includes(s.id!)).map(s => s.nom ?? '—');
                    // Les sites de l'audit d'abord, puis les autres sites actifs.
                    this.lieux = [
                        ...sites.filter(s => siteIds.includes(s.id!)),
                        ...sites.filter(s => !siteIds.includes(s.id!) && s.actif !== false)
                    ];
                    this.chargerPlan(auditId);
                },
                error: err => {
                    this.loading = false;
                    this.erreur(err, 'L\'audit n\'a pas pu être chargé.');
                }
            });
    }

    private chargerPlan(auditId: string): void {
        this.auditService.getPlanAudit(auditId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: res => {
                    this.plan = (res as any)?.data ?? null;
                    this.nouveau = false;
                    this.garderLieu();
                    this.vue = this.modifiable ? 'elaboration' : 'apercu';
                    this.loading = false;
                },
                error: (err: HttpErrorResponse) => {
                    this.loading = false;
                    if (err?.status === 404) {
                        // Pas encore de plan : un brouillon repris de l'audit, créé au premier enregistrement.
                        this.nouveau = true;
                        this.plan = {
                            objectifs: this.audit?.objectifsAudit,
                            portee: this.audit?.porteeAudit,
                            criteres: this.audit?.criteresAudit,
                            methodesAudit: [],
                            langue: 'Français',
                            activites: []
                        };
                    } else {
                        this.erreur(err, 'Le plan n\'a pas pu être chargé.');
                    }
                }
            });
    }

    /** Un lieu saisi avant que les sites ne se choisissent reste proposé, pour ne pas le perdre. */
    private garderLieu(): void {
        const lieu = this.plan?.lieu;
        if (lieu && !this.lieux.some(s => s.nom === lieu)) {
            this.lieux = [{ nom: lieu }, ...this.lieux];
        }
    }

    get nomsMembres(): string {
        return (this.audit?.membreEquipeIds ?? []).map(id => this.libelles.auditeur(id)).join(', ');
    }

    /** L'équipe se corrige sur la fiche de l'audit tant qu'il n'a pas démarré. */
    get equipeModifiable(): boolean {
        return [StatutAudit.PLANIFIE, StatutAudit.EN_PREPARATION, StatutAudit.EN_RETARD].includes(this.audit?.statut as StatutAudit);
    }

    horaire(a: ActivitePlan): string {
        return [a.horaireDebut, a.horaireFin].filter(Boolean).join(' – ') || '—';
    }

    get externe(): boolean {
        return !!this.audit?.circuitExterne;
    }

    /** Le plan se rédige en brouillon ; validé ou partagé, il ne bouge plus. */
    get modifiable(): boolean {
        return !this.externe && (this.nouveau || this.plan?.statut === 'BROUILLON') && !this.auditTermine;
    }

    get auditTermine(): boolean {
        return this.audit?.statut === 'CLOTURE' || this.audit?.statut === 'ANNULE';
    }

    get libelleStatut(): string {
        if (this.nouveau) return 'Non enregistré';
        return ({ BROUILLON: 'Brouillon', VALIDE: 'Validé', PARTAGE: 'Partagé avec l\'audité' } as Record<string, string>)[this.plan?.statut ?? ''] ?? '—';
    }

    get severiteStatut(): any {
        return ({ BROUILLON: 'secondary', VALIDE: 'info', PARTAGE: 'success' } as Record<string, string>)[this.plan?.statut ?? ''] ?? 'warn';
    }

    sauvegarder(): void {
        if (!this.auditId || !this.plan) return;
        const sansLibelle = (this.plan.activites ?? []).some(a => !a.libelleActivite?.trim());
        if (sansLibelle) {
            this.messageService.add({ severity: 'warn', summary: 'Activité incomplète', detail: 'Chaque activité doit avoir un libellé.' });
            return;
        }
        this.saving = true;
        this.geste(this.auditService.sauvegarderPlanAudit(this.auditId, this.plan), 'Plan enregistré.', () => (this.saving = false));
    }

    valider(event: Event): void {
        if (!this.auditId) return;
        this.confirmationService.confirm({
            target: event.currentTarget as EventTarget,
            message: 'Une fois validé, le plan ne se modifie plus. Continuer ?',
            icon: 'pi pi-check-circle',
            acceptLabel: 'Valider',
            rejectLabel: 'Retour',
            accept: () => this.geste(this.auditService.validerPlan(this.auditId!), 'Plan validé.')
        });
    }

    partager(): void {
        if (!this.auditId) return;
        this.geste(this.auditService.partagerPlan(this.auditId), 'Plan partagé avec l\'audité.');
    }

    chargerFichier(evenement: Event): void {
        const fichier = (evenement.target as HTMLInputElement).files?.[0];
        if (!fichier || !this.auditId) return;
        this.geste(this.auditService.chargerPlan(this.auditId, fichier), `« ${fichier.name} » chargé.`);
        (evenement.target as HTMLInputElement).value = '';
    }

    private geste(appel$: Observable<any>, succes: string, ensuite?: () => void): void {
        // Les compteurs des onglets et du menu suivent le geste.
        appel$ = appel$.pipe(tap(() => this.auditService.rafraichirNotifications()));
        appel$.pipe(takeUntil(this.destroy$)).subscribe({
            next: res => {
                this.plan = res?.data ?? this.plan;
                this.nouveau = false;
                ensuite?.();
                this.messageService.add({ severity: 'success', summary: 'Succès', detail: succes });
            },
            error: err => {
                ensuite?.();
                this.erreur(err, 'L\'opération a échoué.');
            }
        });
    }

    exporter(format: 'PDF' | 'WORD'): void {
        if (!this.auditId) return;
        this.enregistrerBlob(this.auditService.exporterPlan(this.auditId, format),
            `plan-${this.audit?.reference ?? this.auditId}.${format === 'PDF' ? 'pdf' : 'docx'}`);
    }

    telechargerFichier(): void {
        if (!this.auditId) return;
        // Le nom d'origine porte l'extension : sans elle, le poste ne sait pas ouvrir le fichier.
        this.enregistrerBlob(this.auditService.telechargerPlan(this.auditId),
            this.plan?.nomFichierCharge || `plan-${this.audit?.reference ?? this.auditId}`);
    }

    private enregistrerBlob(appel$: Observable<Blob>, nom: string): void {
        appel$.pipe(takeUntil(this.destroy$)).subscribe({
            next: blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = nom;
                a.click();
                URL.revokeObjectURL(url);
            },
            error: async err => {
                let detail = 'Le téléchargement a échoué.';
                try {
                    detail = JSON.parse(await (err?.error as Blob).text())?.message ?? detail;
                } catch {
                    /* corps illisible */
                }
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail, life: 8000 });
            }
        });
    }

    basculerMethode(methode: string): void {
        if (!this.plan || !this.modifiable) return;
        const m = this.plan.methodesAudit ?? [];
        this.plan.methodesAudit = m.includes(methode) ? m.filter(x => x !== methode) : [...m, methode];
    }

    ouvrirActivite(index: number | null = null): void {
        const existante = index === null ? undefined : this.plan?.activites?.[index];
        this.activiteEnEdition = {
            index,
            activite: { ...(existante ?? { libelleActivite: '' }) },
            personnes: (existante?.personnesAuditees ?? '').split(',').map(p => p.trim()).filter(Boolean)
        };
    }

    /** Range l'activité dans le plan ; elle s'enregistre avec lui (« Enregistrer en brouillon »). */
    appliquerActivite(): void {
        if (!this.plan || !this.activiteEnEdition?.activite.libelleActivite?.trim()) return;
        const { index, activite, personnes } = this.activiteEnEdition;
        const saisie: ActivitePlan = { ...activite, personnesAuditees: personnes.join(', ') || undefined };
        const activites = [...(this.plan.activites ?? [])];
        if (index === null) {
            activites.push(saisie);
        } else {
            activites[index] = saisie;
        }
        this.plan.activites = activites;
        this.activiteEnEdition = null;
    }

    retirerActivite(index: number): void {
        if (!this.plan) return;
        this.plan.activites = (this.plan.activites ?? []).filter((_, j) => j !== index);
        this.activiteEnEdition = null;
    }

    trackByIndex(index: number): number {
        return index;
    }

    private erreur(err: unknown, defaut: string): void {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: messageErreur(err, defaut), life: 8000 });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
