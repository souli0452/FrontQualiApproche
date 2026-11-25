import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgPrimeModule } from '@prime-ng';
import { Observable, Subject, takeUntil } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AuditGestionService, contenu, messageErreur } from '../../services/audit.service';
import { NoeudReferentiel } from '../../models/audit.model';
import { AuditLibelleComponent } from '../../components/libelle-aide.component';

interface Ligne {
    noeud: NoeudReferentiel;
    profondeur: number;
}

/** Les niveaux du référentiel RQAP-BF, du domaine au critère noté ; paragraphe et sous-exigence sont facultatifs. */
const TYPES_NOEUD = [
    { label: 'Domaine', value: 'DOMAINE' },
    { label: 'Section', value: 'SECTION' },
    { label: 'Paragraphe', value: 'PARAGRAPHE' },
    { label: 'Exigence', value: 'EXIGENCE' },
    { label: 'Sous-exigence', value: 'SOUS_EXIGENCE' },
    { label: 'Critère', value: 'CRITERE' }
];

/** Le type proposé sous un parent ; les niveaux facultatifs se choisissent à la main. */
const TYPE_ENFANT: Record<string, string> = {
    DOMAINE: 'SECTION', SECTION: 'EXIGENCE', PARAGRAPHE: 'EXIGENCE', EXIGENCE: 'CRITERE', SOUS_EXIGENCE: 'CRITERE', CRITERE: 'CRITERE'
};

/** Un ancien type, encore porté par des nœuds existants : affiché, plus proposé. */
const ANCIENS_TYPES: Record<string, string> = { SOUS_DOMAINE: 'Sous-domaine' };

/**
 * Le référentiel RQAP-BF : un arbre domaine › section › (paragraphe) › exigence › (sous-exigence)
 * › critère, comme dans la grille officielle. Seules les feuilles se notent ; un nœud qui a des descendants, ou un critère déjà noté, ne se supprime pas.
 *
 * <p>L'ajout et la modification se font dans un panneau à droite de l'arbre, sans dialogue.</p>
 */
@Component({
    selector: 'app-referentiel-rqapbf',
    standalone: true,
    imports: [CommonModule, FormsModule, NgPrimeModule, AuditLibelleComponent],
    providers: [ConfirmationService],
    templateUrl: './referentiel-rqapbf.component.html'
})
export class ReferentielRQAPBFComponent implements OnInit, OnDestroy {

    racines: NoeudReferentiel[] = [];
    lignes: Ligne[] = [];
    replies = new Set<string>();
    recherche = '';
    loading = true;
    saving = false;
    nbDomaines = 0;
    nbCriteres = 0;

    /** Le nœud du panneau ; null quand le panneau est fermé. */
    enEdition: NoeudReferentiel | null = null;
    parentsPossibles: { id: string; libelle: string }[] = [];
    readonly typesNoeud = TYPES_NOEUD;
    readonly skeletonRows = [
        { prof: 0, code: '2.5rem', label: '38%', badge: '4.5rem' },
        { prof: 1, code: '3.5rem', label: '48%', badge: '4rem' },
        { prof: 2, code: '2.5rem', label: '62%', badge: '4.5rem' },
        { prof: 3, code: '4rem', label: '54%', badge: '3.75rem' },
        { prof: 3, code: '4rem', label: '44%', badge: '3.75rem' },
        { prof: 1, code: '3.5rem', label: '42%', badge: '4rem' },
        { prof: 0, code: '2.5rem', label: '34%', badge: '4.5rem' }
    ];

    private destroy$ = new Subject<void>();

    constructor(
        private auditService: AuditGestionService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {}

    ngOnInit(): void {
        this.charger();
    }

    charger(): void {
        this.loading = true;
        this.auditService.getReferentielRQAPBF()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: res => {
                    this.racines = contenu<NoeudReferentiel>(res);
                    this.compterNoeuds();
                    this.aplatir();
                    if (this.enEdition) {
                        this.majParentsPossibles();
                    }
                    this.loading = false;
                },
                error: err => {
                    this.loading = false;
                    this.erreur(err, 'Le référentiel n\'a pas pu être chargé.');
                }
            });
    }

    private compterNoeuds(): void {
        this.nbDomaines = this.racines.length;
        let criteres = 0;
        const parcourir = (noeuds: NoeudReferentiel[]) => {
            for (const n of noeuds) {
                if (!n.enfants?.length) {
                    criteres++;
                } else {
                    parcourir(n.enfants);
                }
            }
        };
        parcourir(this.racines);
        this.nbCriteres = criteres;
    }

    /** L'arbre à plat, filtré par la recherche (un nœud qui correspond garde ses ancêtres). */
    aplatir(): void {
        const q = this.recherche.trim().toLowerCase();
        const correspond = (n: NoeudReferentiel): boolean =>
            !q || (n.code ?? '').toLowerCase().includes(q) || (n.libelle ?? '').toLowerCase().includes(q) || (n.enfants ?? []).some(correspond);
        const lignes: Ligne[] = [];
        const parcourir = (noeuds: NoeudReferentiel[], profondeur: number) => {
            for (const n of [...noeuds].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))) {
                if (!correspond(n)) continue;
                lignes.push({ noeud: n, profondeur });
                if (!this.replies.has(n.id!) || q) parcourir(n.enfants ?? [], profondeur + 1);
            }
        };
        parcourir(this.racines, 0);
        this.lignes = lignes;
    }

    basculer(n: NoeudReferentiel): void {
        if (!n.id) return;
        this.replies.has(n.id) ? this.replies.delete(n.id) : this.replies.add(n.id);
        this.aplatir();
    }

    toutReplier(): void {
        const marquer = (noeuds: NoeudReferentiel[]) => {
            for (const n of noeuds) {
                if (n.id && n.enfants?.length) {
                    this.replies.add(n.id);
                    marquer(n.enfants);
                }
            }
        };
        marquer(this.racines);
        this.aplatir();
    }

    toutDeplier(): void {
        this.replies.clear();
        this.aplatir();
    }

    /** Les parents possibles : tout nœud sauf celui qu'on édite et ses descendants. */
    private majParentsPossibles(): void {
        const exclus = new Set<string>();
        const marquer = (n: NoeudReferentiel) => { exclus.add(n.id!); (n.enfants ?? []).forEach(marquer); };
        const trouver = (noeuds: NoeudReferentiel[]): NoeudReferentiel | undefined => {
            for (const n of noeuds) { if (n.id === this.enEdition?.id) return n; const t = trouver(n.enfants ?? []); if (t) return t; }
            return undefined;
        };
        const moi = this.enEdition?.id ? trouver(this.racines) : undefined;
        if (moi) marquer(moi);
        const tous: { id: string; libelle: string }[] = [];
        const lister = (noeuds: NoeudReferentiel[], prefixe: string) => {
            for (const n of noeuds) {
                if (exclus.has(n.id!)) continue;
                tous.push({ id: n.id!, libelle: `${prefixe}${n.code} — ${n.libelle}` });
                lister(n.enfants ?? [], prefixe + '   ');
            }
        };
        lister(this.racines, '');
        this.parentsPossibles = tous;
    }

    ouvrirCreation(parent?: NoeudReferentiel): void {
        const type = parent ? TYPE_ENFANT[parent.typeNoeud ?? ''] ?? 'CRITERE' : 'DOMAINE';
        this.enEdition = { parentId: parent?.id, typeNoeud: type, ordre: (parent?.enfants?.length ?? this.racines.length) + 1 };
        this.majParentsPossibles();
    }

    ouvrirEdition(n: NoeudReferentiel): void {
        this.enEdition = { ...n, enfants: undefined };
        this.majParentsPossibles();
    }

    fermer(): void {
        this.enEdition = null;
    }

    sauvegarder(): void {
        if (!this.enEdition) return;
        if (!this.enEdition.code?.trim() || !this.enEdition.libelle?.trim()) {
            this.messageService.add({ severity: 'warn', summary: 'Incomplet', detail: 'Le code et le libellé sont requis.' });
            return;
        }
        this.saving = true;
        const req$ = this.enEdition.id
            ? this.auditService.modifierNoeud(this.enEdition.id, this.enEdition)
            : this.auditService.creerNoeud(this.enEdition);
        this.geste(req$, 'Nœud enregistré.', () => { this.saving = false; this.enEdition = null; }, () => (this.saving = false));
    }

    supprimer(n: NoeudReferentiel): void {
        this.confirmationService.confirm({
            key: 'referentiel-action',
            header: 'Supprimer ce nœud',
            message: `Voulez-vous supprimer « ${n.code} — ${n.libelle} » du référentiel RQAP-BF ?`,
            icon: 'pi-trash',
            acceptLabel: 'Supprimer',
            acceptIcon: 'pi pi-trash',
            rejectLabel: 'Annuler',
            accept: () => this.geste(this.auditService.supprimerNoeud(n.id!), 'Nœud supprimé.')
        });
    }

    private geste(appel$: Observable<unknown>, succes: string, ok?: () => void, ko?: () => void): void {
        appel$.pipe(takeUntil(this.destroy$)).subscribe({
            next: () => { ok?.(); this.messageService.add({ severity: 'success', summary: 'Succès', detail: succes }); this.charger(); },
            error: err => { ko?.(); this.erreur(err, 'L\'opération a échoué.'); }
        });
    }

    libelleType(t?: string): string {
        return TYPES_NOEUD.find(x => x.value === t)?.label ?? ANCIENS_TYPES[t ?? ''] ?? t ?? '';
    }

    badgeTypeClasses(t?: string): string {
        switch (t) {
            case 'DOMAINE':
                return 'bg-[#0084ca]/12 dark:bg-sky-500/20 text-[#0084ca] dark:text-sky-300 border-[#0084ca]/30';
            case 'SECTION':
            case 'PARAGRAPHE':
            case 'SOUS_DOMAINE':
                return 'bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/25';
            case 'EXIGENCE':
            case 'SOUS_EXIGENCE':
                return 'bg-amber-500/10 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/25';
            case 'CRITERE':
                return 'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25';
            default:
                return 'bg-surface-100 dark:bg-surface-800 text-[var(--text-color-secondary)] border-[#dddddd] dark:border-surface-700';
        }
    }

    trackByLigne(_i: number, l: Ligne): string {
        return l.noeud.id ?? String(_i);
    }

    private erreur(err: unknown, defaut: string): void {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: messageErreur(err, defaut), life: 8000 });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
