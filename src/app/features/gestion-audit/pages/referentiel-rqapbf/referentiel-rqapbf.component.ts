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
    providers: [MessageService, ConfirmationService],
    templateUrl: './referentiel-rqapbf.component.html'
})
export class ReferentielRQAPBFComponent implements OnInit, OnDestroy {

    racines: NoeudReferentiel[] = [];
    lignes: Ligne[] = [];
    replies = new Set<string>();
    recherche = '';
    loading = true;
    saving = false;

    /** Le nœud du panneau ; null quand le panneau est fermé. */
    enEdition: NoeudReferentiel | null = null;
    readonly typesNoeud = TYPES_NOEUD;

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
                    this.aplatir();
                    this.loading = false;
                },
                error: err => {
                    this.loading = false;
                    this.erreur(err, 'Le référentiel n\'a pas pu être chargé.');
                }
            });
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
        this.replies.has(n.id!) ? this.replies.delete(n.id!) : this.replies.add(n.id!);
        this.aplatir();
    }

    /** Les parents possibles : tout nœud sauf celui qu'on édite et ses descendants. */
    get parentsPossibles(): { id: string; libelle: string }[] {
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
        return tous;
    }

    ouvrirCreation(parent?: NoeudReferentiel): void {
        const type = parent ? TYPE_ENFANT[parent.typeNoeud ?? ''] ?? 'CRITERE' : 'DOMAINE';
        this.enEdition = { parentId: parent?.id, typeNoeud: type, ordre: (parent?.enfants?.length ?? this.racines.length) + 1 };
    }

    ouvrirEdition(n: NoeudReferentiel): void {
        this.enEdition = { ...n, enfants: undefined };
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

    supprimer(event: Event, n: NoeudReferentiel): void {
        this.confirmationService.confirm({
            target: event.currentTarget as EventTarget,
            message: `Supprimer « ${n.code} — ${n.libelle} » ?`,
            icon: 'pi pi-trash',
            acceptLabel: 'Supprimer',
            rejectLabel: 'Retour',
            acceptButtonStyleClass: 'p-button-danger',
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

    private erreur(err: unknown, defaut: string): void {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: messageErreur(err, defaut), life: 8000 });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
