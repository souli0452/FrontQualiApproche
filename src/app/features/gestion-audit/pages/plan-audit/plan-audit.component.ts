import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { NgPrimeModule } from '@prime-ng';
import { Structure } from '@features/organigramme/models/structure.model';
import { Observable, Subject, forkJoin, takeUntil, tap } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { SelectInputComponent } from '@shared/ui/select-input/select-input.component';
import { MultiselectInputComponent } from '@shared/ui/multiselect-input/multiselect-input.component';
import { AuditLibelleComponent } from '../../components/libelle-aide.component';
import { AuditGestionService, messageErreur } from '../../services/audit.service';
import { AuditReferentielService, LIBELLES_VIDES, LibellesAudit, UtilisateurAnnuaire } from '../../services/audit-referentiel.service';
import { ActivitePlan, Audit, PlanAudit, SiteAudit } from '../../models/audit.model';
import { StatutAudit } from '../../models/audit-enums';
import { LightboxComponent } from '@features/non-conformite/components/lightbox/lightbox';

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
/** Les méthodes proposées d'office à un plan neuf : les plus courantes, que l'on décoche au besoin. */
const METHODES_PAR_DEFAUT = ['Entretiens avec les agents du processus', 'Observation sur site', 'Revue documentaire'];

@Component({
    selector: 'app-plan-audit',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, NgPrimeModule, SelectInputComponent, MultiselectInputComponent, AuditLibelleComponent, LightboxComponent],    
    providers: [ConfirmationService],
    templateUrl: './plan-audit.component.html'
})
export class PlanAuditComponent implements OnInit, OnDestroy {

    @ViewChild('lightbox') lightbox?: LightboxComponent;
    apercuEnCours = false;

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

    /** Le processus audité de la fiche, proposé pour chaque nouvelle activité. */
    private processusDeLAudit?: Structure;

        confirmationMeta: {
        ton: 'info' | 'warn' | 'danger';
        bloquant?: boolean;
        encart?: { titre: string; icone: string; lignes: string[]; ton: 'info' | 'warn' | 'danger' };
    } = { ton: 'info' };

    get confirmationBadgeClasses(): string {
        switch (this.confirmationMeta.ton) {
            case 'warn':   return 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 ring-amber-50/50 dark:ring-amber-950/20';
            case 'danger': return 'bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400 ring-rose-50/50 dark:ring-rose-950/20';
            default:       return 'bg-[#0084ca]/10 dark:bg-[#0084ca]/20 text-[#0084ca] dark:text-sky-400 ring-[#0084ca]/10';
        }
    }

    get confirmationEncartClasses(): string {
        switch (this.confirmationMeta.encart?.ton) {
            case 'warn':   return 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200';
            case 'danger': return 'border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200';
            default:       return 'border-[#0084ca]/30 dark:border-sky-700/60 bg-[#0084ca]/5 dark:bg-sky-950/30 text-[var(--heading-color)]';
        }
    }

    get confirmationAcceptClasses(): string {
        switch (this.confirmationMeta.ton) {
            case 'warn':   return 'p-button-warn p-button-sm flex-1 justify-center rounded-[6px]';
            case 'danger': return 'p-button-danger p-button-sm flex-1 justify-center rounded-[6px]';
            default:       return 'p-button-info p-button-sm flex-1 justify-center rounded-[6px]';
        }
    }

    /** Réviser un plan validé ou partagé : il repasse en brouillon, dans une nouvelle version (observation 18). */
    reviser(_event?: Event): void {
        if (!this.auditId) return;
        const prochaineVersion = (this.plan?.version ?? 1) + 1;
        this.confirmationMeta = {
            ton: 'warn',
            encart: {
                titre: `Passage en version ${prochaineVersion}`,
                icone: 'pi-info-circle',
                lignes: ['Le plan repassera en brouillon et devra être validé puis partagé de nouveau avec l\'audité.'],
                ton: 'warn'
            }
        };
        this.confirmationService.confirm({
            key: 'plan-action',
            header: "Réviser le plan d'audit",
            message: 'Souhaitez-vous rouvrir ce plan pour le corriger ?',
            icon: 'pi-pencil',
            acceptLabel: 'Réviser le plan',
            acceptIcon: 'pi pi-pencil',
            rejectLabel: 'Retour',
            accept: () => this.geste(this.auditService.reviserPlan(this.auditId!), 'Plan rouvert en brouillon.')
        });
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
                    this.processusDeLAudit = structures.find(s => s.id === this.audit?.processusId);
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
                        // Repris de la fiche : le lieu (premier site de l'audit) et les méthodes usuelles,
                        // que l'on décoche au besoin (observation 16).
                        this.plan = {
                            objectifs: this.audit?.objectifsAudit,
                            portee: this.audit?.porteeAudit,
                            criteres: this.audit?.criteresAudit,
                            methodesAudit: [...METHODES_PAR_DEFAUT],
                            lieu: this.sitesAudit[0],
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
        const heures = [a.horaireDebut, a.horaireFin].filter(Boolean).join(' – ');
        const jour = a.jour ? a.jour.slice(0, 10).split('-').reverse().join('/') : '';
        return [jour, heures].filter(Boolean).join(' · ') || '—';
    }

    /** Ce qui empêche d'appliquer l'activité en cours d'édition, dit sous le formulaire. */
    get erreurCreneau(): string | null {
        const a = this.activiteEnEdition?.activite;
        if (!a) return null;
        const debut = this.audit?.dateDebutPrevue?.slice(0, 10);
        const fin = this.audit?.dateFinPrevue?.slice(0, 10);
        if (a.jour && debut && fin && (a.jour < debut || a.jour > fin)) {
            return 'Le jour doit tomber dans la période de l\'audit.';
        }
        if (a.horaireDebut && a.horaireFin && a.horaireFin <= a.horaireDebut) {
            return 'L\'heure de fin doit suivre l\'heure de début.';
        }
        return null;
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

    /** Vérifie que chaque créneau porte libellé, auditeur et personnes auditées (obs. 04). */
    private verifierActivites(): boolean {
        const activites = this.plan?.activites ?? [];
        const sansLibelle = activites.some(a => !a.libelleActivite?.trim());
        if (sansLibelle) {
            this.messageService.add({ severity: 'warn', summary: 'Activité incomplète', detail: 'Chaque activité doit avoir un libellé.' });
            return false;
        }
        const incomplete = activites.find(a => !a.auditeur?.trim() || !a.personnesAuditees?.trim());
        if (incomplete) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Créneau incomplet',
                detail: `L'activité « ${incomplete.libelleActivite} » doit indiquer un auditeur et au moins une personne auditée.`,
                life: 7000
            });
            return false;
        }
        return true;
    }

    sauvegarder(): void {
        if (!this.auditId || !this.plan || !this.verifierActivites()) return;
        this.saving = true;
        this.geste(this.auditService.sauvegarderPlanAudit(this.auditId, this.plan), 'Plan enregistré.', () => (this.saving = false));
    }

    valider(_event?: Event): void {
        if (!this.auditId || !this.verifierActivites()) return;
        this.confirmationMeta = {
            ton: 'info',
            encart: {
                titre: 'Plan prêt à être partagé',
                icone: 'pi-check-circle',
                lignes: ['Une fois validé, le plan ne se modifie plus directement (une révision créera une nouvelle version).'],
                ton: 'info'
            }
        };
        this.confirmationService.confirm({
            key: 'plan-action',
            header: "Valider le plan d'audit",
            message: 'Confirmer la validation de ce plan ?',
            icon: 'pi-check-circle',
            acceptLabel: 'Valider le plan',
            acceptIcon: 'pi pi-check',
            rejectLabel: 'Retour',
            accept: () => this.geste(this.auditService.validerPlan(this.auditId!), 'Plan validé.')
        });
    }

    /** Le partage se bloque s'il n'y a aucun destinataire joignable (obs. 04 & PDF Notifications). */
    partager(_event?: Event): void {
        if (!this.auditId) return;
        this.auditService.destinataires(this.auditId, 'PARTAGE_PLAN').pipe(takeUntil(this.destroy$)).subscribe(destinataires => {
            if (!destinataires.length) {
                this.confirmationMeta = {
                    ton: 'danger',
                    bloquant: true,
                    encart: {
                        titre: 'Aucun destinataire joignable par courriel',
                        icone: 'pi-exclamation-triangle',
                        lignes: [
                            "Le processus audité n'a aucun pilote disposant d'une adresse e-mail connue.",
                            "Désignez un pilote joignable sur ce processus (ou prévenez l'administrateur) avant de partager le plan."
                        ],
                        ton: 'danger'
                    }
                };
                this.confirmationService.confirm({
                    key: 'plan-action',
                    header: 'Partage impossible',
                    message: "Le plan ne peut pas être partagé tant qu'aucun destinataire ne peut être prévenu.",
                    icon: 'pi-ban',
                    rejectLabel: 'Fermer'
                });
                return;
            }

            this.confirmationMeta = {
                ton: 'info',
                bloquant: false,
                encart: {
                    titre: `Un courriel de notification sera envoyé à (${destinataires.length}) :`,
                    icone: 'pi-envelope',
                    lignes: destinataires.map(d => `${d.nom}${d.titre ? ' — ' + d.titre : ''}`),
                    ton: 'info'
                }
            };
            this.confirmationService.confirm({
                key: 'plan-action',
                header: "Partager le plan avec l'audité",
                message: "Confirmer la diffusion de ce plan d'audit ?",
                icon: 'pi-share-alt',
                acceptLabel: 'Partager le plan',
                acceptIcon: 'pi pi-share-alt',
                rejectLabel: 'Retour',
                accept: () => this.geste(this.auditService.partagerPlan(this.auditId!), "Plan partagé avec l'audité.")
            });
        });
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

        get nbMembresEquipe(): number {
        return new Set([this.audit?.responsableEquipeId, ...(this.audit?.membreEquipeIds ?? [])].filter(Boolean)).size;
    }

    voirPdf(): void {
        if (!this.auditId || this.apercuEnCours) return;
        this.apercuEnCours = true;
        const nom = `plan-${this.audit?.reference ?? this.auditId}.pdf`;
        this.auditService.exporterPlan(this.auditId, 'PDF')
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: blob => {
                    this.apercuEnCours = false;
                    this.lightbox?.openBlob(blob, nom, `Plan d'audit ${this.plan?.reference ?? this.audit?.reference ?? ''}`.trim());
                },
                error: err => {
                    this.apercuEnCours = false;
                    this.erreur(err, 'Impossible d\'ouvrir l\'aperçu du PDF.');
                }
            });
    }

    voirFichier(): void {
        if (!this.auditId || this.apercuEnCours) return;
        this.apercuEnCours = true;
        const nom = this.plan?.nomFichierCharge || `plan-${this.audit?.reference ?? this.auditId}.pdf`;
        this.auditService.telechargerPlan(this.auditId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: blob => {
                    this.apercuEnCours = false;
                    this.lightbox?.openBlob(blob, nom, 'Plan d\'audit externe');
                },
                error: err => {
                    this.apercuEnCours = false;
                    this.erreur(err, 'Impossible d\'ouvrir l\'aperçu du fichier.');
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
        // Une nouvelle activité prend le jour de la précédente, ou le premier jour de l'audit.
        const derniere = this.plan?.activites?.[this.plan.activites.length - 1];
        const jourParDefaut = derniere?.jour ?? this.audit?.dateDebutPrevue?.slice(0, 10);
        this.activiteEnEdition = {
            index,
            activite: { ...(existante ?? {
                libelleActivite: '', jour: jourParDefaut,
                // Le processus audité de la fiche, proposé d'office (observation 16).
                processusConcerne: this.processusDeLAudit ? (this.processusDeLAudit.libelleLong || this.processusDeLAudit.libelleCourt) : undefined
            }) },
            personnes: (existante?.personnesAuditees ?? '').split(',').map(p => p.trim()).filter(Boolean)
        };
    }

    get activiteComplete(): boolean {
        const e = this.activiteEnEdition;
        return !!e?.activite.libelleActivite?.trim()
            && !!e.activite.auditeur?.trim()
            && e.personnes.length > 0
            && !this.erreurCreneau;
    }

    /** Range l'activité dans le plan ; elle s'enregistre avec lui (« Enregistrer en brouillon »). */
    appliquerActivite(): void {
        if (!this.plan || !this.activiteEnEdition || !this.activiteComplete) return;
        const { index, activite, personnes } = this.activiteEnEdition;
        const saisie: ActivitePlan = { ...activite, personnesAuditees: personnes.join(', ') || undefined };
        const activites = [...(this.plan.activites ?? [])];
        if (index === null) {
            activites.push(saisie);
        } else {
            activites[index] = saisie;
        }
        // Rangées par jour puis par heure : les activités de J1 et J2 se mêlaient au tri par heure.
        this.plan.activites = activites.sort((x, y) =>
            (x.jour ?? '').localeCompare(y.jour ?? '') || (x.horaireDebut ?? '').localeCompare(y.horaireDebut ?? ''));
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
