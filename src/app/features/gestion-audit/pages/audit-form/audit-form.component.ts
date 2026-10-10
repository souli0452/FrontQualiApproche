import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgPrimeModule } from '@prime-ng';
import { Observable, Subject, catchError, debounceTime, forkJoin, map, of, switchMap, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';
import { SelectInputComponent } from '@shared/ui/select-input/select-input.component';
import { MultiselectInputComponent } from '@shared/ui/multiselect-input/multiselect-input.component';
import { AuditPageFormulaireComponent } from '../../components/page-formulaire.component';
import { AuditLibelleComponent } from '../../components/libelle-aide.component';
import { AuditGestionService, contenu, messageErreur } from '../../services/audit.service';
import { AuditReferentielService, UtilisateurAnnuaire } from '../../services/audit-referentiel.service';
import { ActionMaitriseRisque, Audit, AuditeurFiche, ChecklistAudit, NoeudReferentiel, SiteAudit, TypeAuditRef } from '../../models/audit.model';
import { NiveauRisqueAudit, NIVEAU_RISQUE_LABELS, StatutAudit } from '../../models/audit-enums';
import { Structure } from '@features/organigramme/models/structure.model';

/** Un auditeur tel que la liste le propose : « Nom — domaines habilités », comme la maquette. */
type ChoixAuditeur = AuditeurFiche & { libelleChoix: string };

/**
 * Planifier ou corriger un audit du programme.
 *
 * <p>Type d'audit, processus, sites et équipe se choisissent dans le paramétrage : rien de ce
 * qui y figure ne se saisit à la main. Le statut ne se saisit pas non plus — il suit les gestes
 * de la fiche (valider, démarrer, clôturer, annuler).</p>
 *
 * <p>Dès qu'un auditeur est choisi, un conflit d'intérêts ou une indisponibilité se signale sous
 * le champ, sans bloquer la saisie : c'est la validation de l'audit, côté serveur, qui tranche.</p>
 */
@Component({
    selector: 'app-audit-form',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, NgPrimeModule, SelectInputComponent, MultiselectInputComponent, AuditPageFormulaireComponent, AuditLibelleComponent],
    providers: [MessageService],
    templateUrl: './audit-form.component.html'
})
export class AuditFormComponent implements OnInit, OnDestroy {

    formulaire!: FormGroup;
    modeEdition = false;
    auditId: string | null = null;
    reference?: string;
    saving = false;
    loading = true;
    verrouille = false;

    typesAudit: TypeAuditRef[] = [];
    processus: Structure[] = [];
    sites: SiteAudit[] = [];
    private tousLesSites: SiteAudit[] = [];
    private tousLesAuditeurs: AuditeurFiche[] = [];
    private toutesLesChecklists: ChecklistAudit[] = [];
    auditeurs: ChoixAuditeur[] = [];
    checklists: ChecklistAudit[] = [];
    utilisateurs: UtilisateurAnnuaire[] = [];
    /** Les actions de maîtrise des risques : elles voyagent avec l'audit. */
    actions: ActionMaitriseRisque[] = [];
    domaines: NoeudReferentiel[] = [];
    /** Les alertes d'équipe, par auditeur retenu : conflit d'intérêts, indisponibilité. */
    private alertesEquipe = new Map<string, string[]>();
    private controleEquipe$ = new Subject<void>();

    readonly conseils = [
        'Choisissez un responsable disponible sur la période et étranger au processus audité.',
        'Formulez des objectifs vérifiables : ils guident le plan, les constats et le rapport.',
        'Rattachez les checklists publiées utiles : les auditeurs y retrouveront leurs points de contrôle.',
        'Un audit planifié se valide ensuite depuis sa fiche : l\'équipe, les dates et le responsable sont alors contrôlés.',
        'Pour un audit externe, renseignez l\'organisme : le plan et le rapport seront chargés, non rédigés.'
    ];

    /** Le formulaire se remplit en quatre étapes ; chacune ne s'ouvre que si les précédentes sont complètes. */
    readonly etapes = ['Cadre et calendrier', 'Équipe', 'Objectifs et référentiels', 'Risque'];
    private readonly champsParEtape: string[][] = [
        ['typeAuditId', 'processusId', 'siteIds', 'organismeExterne', 'dateDebutPrevue', 'dateFinPrevue', 'dureeEstimeeJours'],
        ['responsableEquipeId', 'membreEquipeIds'],
        ['objectifsAudit', 'porteeAudit', 'criteresAudit', 'checklistIds', 'domaineRqapbfIds', 'referentiels'],
        ['niveauRisque', 'descriptionRisque']
    ];
    etape = 1;

    niveauRisqueOptions = Object.values(NiveauRisqueAudit).map(n => ({ label: NIVEAU_RISQUE_LABELS[n], value: n }));

    private destroy$ = new Subject<void>();

    constructor(
        private fb: FormBuilder,
        private auditService: AuditGestionService,
        private referentiel: AuditReferentielService,
        private router: Router,
        private route: ActivatedRoute,
        private messageService: MessageService
    ) {
        this.formulaire = this.fb.group({
            typeAuditId: [null, Validators.required],
            processusId: [null, Validators.required],
            siteIds: [[]],
            dateDebutPrevue: [null, Validators.required],
            dateFinPrevue: [null, Validators.required],
            dureeEstimeeJours: [null, Validators.min(1)],
            organismeExterne: [null],
            responsableEquipeId: [null, Validators.required],
            membreEquipeIds: [[]],
            niveauRisque: [NiveauRisqueAudit.FAIBLE],
            descriptionRisque: [null],
            objectifsAudit: [null, Validators.required],
            porteeAudit: [null],
            criteresAudit: [null],
            referentiels: [null],
            checklistIds: [[]],
            domaineRqapbfIds: [[]]
        });
    }

    ngOnInit(): void {
        this.auditId = this.route.snapshot.paramMap.get('id');
        this.modeEdition = !!this.auditId;

        // L'équipe se contrôle à chaque choix qui la concerne : un auditeur, mais aussi le
        // processus audité (conflit d'intérêts) et les dates (disponibilité).
        ['processusId', 'dateDebutPrevue', 'dateFinPrevue', 'responsableEquipeId', 'membreEquipeIds'].forEach(c =>
            this.formulaire.get(c)?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.controleEquipe$.next())
        );
        this.controleEquipe$
            .pipe(debounceTime(200), switchMap(() => this.controlerEquipe()), takeUntil(this.destroy$))
            .subscribe(alertes => (this.alertesEquipe = alertes));

        forkJoin({
            typesAudit: this.referentiel.typesAudit(),
            processus: this.referentiel.processus(),
            sites: this.referentiel.sites(),
            auditeurs: this.referentiel.auditeurs(),
            utilisateurs: this.referentiel.utilisateurs(),
            checklists: this.auditService.getChecklists(),
            arbre: this.auditService.getReferentielRQAPBF()
        })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: listes => {
                    this.typesAudit = listes.typesAudit;
                    this.processus = listes.processus;
                    this.tousLesSites = listes.sites;
                    this.sites = listes.sites.filter(s => s.actif !== false);
                    this.tousLesAuditeurs = listes.auditeurs;
                    this.utilisateurs = listes.utilisateurs;
                    this.toutesLesChecklists = contenu<ChecklistAudit>(listes.checklists);
                    // Seule une checklist publiée s'emploie dans un audit.
                    this.checklists = this.toutesLesChecklists.filter(c => c.statut === 'PUBLIEE');
                    this.domaines = contenu<NoeudReferentiel>(listes.arbre);
                    this.auditeurs = this.proposer(listes.auditeurs.filter(a => a.statut !== 'INACTIF'));
                    if (this.modeEdition && this.auditId) {
                        this.chargerAudit(this.auditId);
                    } else {
                        this.loading = false;
                    }
                },
                error: err => {
                    this.loading = false;
                    this.erreur(err, 'Le paramétrage du module (types, processus, sites, auditeurs) n\'a pas pu être chargé.');
                }
            });
    }

    get typeChoisi(): TypeAuditRef | undefined {
        return this.typesAudit.find(t => t.id === this.formulaire.value.typeAuditId);
    }

    chargerAudit(id: string): void {
        this.auditService.findById(id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: res => {
                    const audit = (res as any)?.data ?? res as Audit;
                    this.reference = audit.reference;
                    // Un site retiré du paramétrage depuis reste affiché sur l'audit qui le porte.
                    this.sites = this.tousLesSites.filter(s => s.actif !== false || audit.siteIds?.includes(s.id));
                    const equipe = [audit.responsableEquipeId, ...(audit.membreEquipeIds ?? [])];
                    this.auditeurs = this.proposer(this.tousLesAuditeurs.filter(a => a.statut !== 'INACTIF' || equipe.includes(a.id)));
                    this.checklists = this.toutesLesChecklists.filter(c => c.statut === 'PUBLIEE' || audit.checklistIds?.includes(c.id!));
                    this.actions = (audit.actionsMaitriseRisques ?? []).map((a: ActionMaitriseRisque) => ({ ...a }));
                    this.formulaire.patchValue({
                        ...audit,
                        siteIds: audit.siteIds ?? [],
                        membreEquipeIds: audit.membreEquipeIds ?? [],
                        checklistIds: audit.checklistIds ?? [],
                        domaineRqapbfIds: audit.domaineRqapbfIds ?? [],
                        referentiels: audit.referentiels?.join(', ')
                    });
                    // Les données de planification se corrigent tant que l'audit n'a pas démarré.
                    this.verrouille = ![StatutAudit.PLANIFIE, StatutAudit.EN_PREPARATION, StatutAudit.EN_RETARD].includes(audit.statut as StatutAudit);
                    if (this.verrouille) {
                        this.formulaire.disable();
                    }
                    this.loading = false;
                },
                error: err => {
                    this.loading = false;
                    this.erreur(err, 'Impossible de charger l\'audit.');
                }
            });
    }

    /** « Nom — domaines habilités » : ce qui aide à composer l'équipe, comme sur la maquette. */
    private proposer(liste: AuditeurFiche[]): ChoixAuditeur[] {
        return liste.map(a => ({
            ...a,
            libelleChoix: a.domainesHabilites?.length ? `${a.nomComplet} — ${a.domainesHabilites.join(', ')}` : a.nomComplet ?? '—'
        }));
    }

    // ---- Contrôle de l'équipe ----

    /**
     * Les alertes de chaque auditeur retenu.
     *
     * <p>Le conflit d'intérêts s'apprécie ici, d'après la fiche de l'auditeur et le processus
     * choisi, par la règle même du serveur (il appartient à la structure auditée, ou il la
     * pilote) : le point d'entrée du serveur lit le processus de l'audit enregistré, qui n'existe
     * pas encore à la création et peut différer de la saisie en modification. La disponibilité,
     * elle, se demande au serveur, qui seul connaît les autres audits de la période.</p>
     */
    private controlerEquipe(): Observable<Map<string, string[]>> {
        const v = this.formulaire.getRawValue();
        const ids = [...new Set<string>([v.responsableEquipeId, ...(v.membreEquipeIds ?? [])].filter(Boolean))];
        if (this.verrouille || !ids.length) {
            return of(new Map());
        }
        const controles = ids.map(id => {
            const a = this.tousLesAuditeurs.find(x => x.id === id);
            const nom = a?.nomComplet ?? 'Cet auditeur';
            const alertes: string[] = [];
            if (a && v.processusId) {
                if (a.structureAppartenance === v.processusId) {
                    alertes.push(`${nom} appartient à la structure auditée — conflit d'intérêts détecté.`);
                } else if (a.processusGeres?.includes(v.processusId)) {
                    alertes.push(`${nom} pilote le processus audité — conflit d'intérêts détecté.`);
                }
            }
            const libre$ = v.dateDebutPrevue && v.dateFinPrevue
                ? this.auditService.verifierDisponibilite(id, v.dateDebutPrevue, v.dateFinPrevue, this.auditId ?? undefined).pipe(
                    map(res => (res as any)?.data !== false),
                    catchError(() => of(true)) // le serveur ne répond pas : la validation tranchera
                )
                : of(true);
            return libre$.pipe(map(libre => {
                if (!libre) {
                    alertes.push(`${nom} est inactif ou déjà engagé sur un autre audit sur cette période.`);
                }
                return [id, alertes] as [string, string[]];
            }));
        });
        return forkJoin(controles).pipe(map(entrees => new Map(entrees.filter(([, a]) => a.length))));
    }

    get alertesResponsable(): string[] {
        return this.alertesEquipe.get(this.formulaire.getRawValue().responsableEquipeId) ?? [];
    }

    get alertesMembres(): string[] {
        const ids: string[] = this.formulaire.getRawValue().membreEquipeIds ?? [];
        return ids.flatMap(id => this.alertesEquipe.get(id) ?? []);
    }

    suivant(): void {
        if (this.etapeValide(this.etape)) {
            this.etape++;
        } else {
            this.marquerEtape(this.etape);
        }
    }

    precedent(): void {
        this.etape = Math.max(1, this.etape - 1);
    }

    allerA(n: number | undefined): void {
        if (n && this.etapeAtteignable(n)) {
            this.etape = n;
        }
    }

    /** On revient toujours en arrière ; on n'avance que par-dessus des étapes complètes. */
    etapeAtteignable(n: number): boolean {
        for (let e = 1; e < n; e++) {
            if (!this.etapeValide(e)) {
                return false;
            }
        }
        return true;
    }

    private etapeValide(n: number): boolean {
        // Un formulaire verrouillé (désactivé) se parcourt librement : il ne s'enregistre plus.
        return this.verrouille || this.champsParEtape[n - 1].every(c => !this.formulaire.get(c)?.invalid);
    }

    private marquerEtape(n: number): void {
        this.champsParEtape[n - 1].forEach(c => this.formulaire.get(c)?.markAsTouched());
    }

    sauvegarder(): void {
        if (this.formulaire.invalid) {
            this.formulaire.markAllAsTouched();
            // Ramène à la première étape incomplète, là où l'erreur s'affiche.
            this.etape = this.champsParEtape.findIndex((_, i) => !this.etapeValide(i + 1)) + 1 || this.etape;
            return;
        }
        this.saving = true;
        const v = this.formulaire.getRawValue();
        const payload: Partial<Audit> = {
            ...v,
            organismeExterne: this.typeChoisi?.circuitExterne ? v.organismeExterne : null,
            actionsMaitriseRisques: this.actions.filter(a => a.libelle?.trim()),
            referentiels: v.referentiels
                ? String(v.referentiels).split(',').map((r: string) => r.trim()).filter(Boolean)
                : []
        };

        const requete$ = this.modeEdition && this.auditId
            ? this.auditService.updateObject(this.auditId, payload)
            : this.auditService.create(payload);

        requete$.pipe(takeUntil(this.destroy$)).subscribe({
            next: (res: any) => {
                const audit: Audit = res?.data ?? res;
                this.saving = false;
                this.messageService.add({
                    severity: 'success',
                    summary: 'Succès',
                    detail: this.modeEdition ? 'Audit mis à jour.' : `Audit ${audit?.reference ?? ''} planifié.`
                });
                this.router.navigate(['/gestion-audit/programme', audit?.id ?? this.auditId]);
            },
            error: err => {
                this.saving = false;
                this.erreur(err, 'La sauvegarde a échoué.');
            }
        });
    }

    ajouterAction(): void {
        this.actions = [...this.actions, { libelle: '' }];
    }

    retirerAction(i: number): void {
        this.actions = this.actions.filter((_, j) => j !== i);
    }

    invalide(champ: string): boolean {
        const c = this.formulaire.get(champ);
        return !!c && c.invalid && c.touched;
    }

    annuler(): void {
        if (this.modeEdition && this.auditId) {
            this.router.navigate(['/gestion-audit/programme', this.auditId]);
        } else {
            this.router.navigate(['/gestion-audit/programme']);
        }
    }

    private erreur(err: unknown, defaut: string): void {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: messageErreur(err, defaut), life: 8000 });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
