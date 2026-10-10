import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { NgPrimeModule } from '@prime-ng';
import { Observable, Subject, forkJoin, takeUntil, tap } from 'rxjs';
import { MessageService } from 'primeng/api';
import { currentUserState } from '@core/auth/auth.state';
import { AuditGestionService, contenu, messageErreur } from '../../services/audit.service';
import { AuditReferentielService, UtilisateurAnnuaire } from '../../services/audit-referentiel.service';
import { Audit, SignatureAudit } from '../../models/audit.model';
import { AuditLibelleComponent } from '../../components/libelle-aide.component';

/**
 * Le circuit de signature du rapport (D15) : un tableau Signataire / Fonction / Statut / Action,
 * où l'utilisateur signe ou refuse sur sa propre ligne. Le circuit se pose dans une carte de la
 * page et le refus se motive sous la ligne, sans dialogue.
 *
 * <p>Les signataires se choisissent dans l'annuaire ; ils signent sans ordre imposé. Un refus
 * arrête le circuit : il faut le reposer. Le circuit se pose sur un audit en cours, et pas pour
 * un type d'audit dont le rapport se signe hors de l'application.</p>
 */
@Component({
    selector: 'app-audit-signatures',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, NgPrimeModule, AuditLibelleComponent],
    providers: [MessageService],
    templateUrl: './signatures.component.html'
})
export class AuditSignaturesComponent implements OnInit, OnDestroy {

    audit: Audit | null = null;
    signatures: SignatureAudit[] = [];
    utilisateurs: UtilisateurAnnuaire[] = [];
    loading = true;
    actionEnCours = false;
    auditId: string | null = null;
    moi: string | null = null;

    /** La ligne dépliée pour motiver un refus, au format attendu par `expandedRowKeys`. */
    refusOuvert: Record<string, boolean> = {};
    motifRefus = '';

    circuitOuvert = false;
    signatairesChoisis: string[] = [];
    fonctions: Record<string, string> = {};

    private noms = new Map<string, string>();
    private destroy$ = new Subject<void>();

    constructor(
        private auditService: AuditGestionService,
        private referentiel: AuditReferentielService,
        private route: ActivatedRoute,
        private messageService: MessageService
    ) {}

    ngOnInit(): void {
        const courant: any = currentUserState.value;
        this.moi = courant?.user?.userId ?? courant?.userId ?? null;
        this.auditId = this.route.snapshot.paramMap.get('id');
        if (this.auditId) this.charger(this.auditId);
    }

    charger(auditId: string): void {
        this.loading = true;
        forkJoin({
            audit: this.auditService.findById(auditId),
            signatures: this.auditService.getSignatures(auditId),
            utilisateurs: this.referentiel.utilisateurs()
        })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: ({ audit, signatures, utilisateurs }) => {
                    this.audit = (audit as any)?.data ?? null;
                    this.signatures = contenu<SignatureAudit>(signatures).sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
                    this.utilisateurs = utilisateurs;
                    this.noms = new Map(utilisateurs.map(u => [u.id, u.nomComplet]));
                    this.loading = false;
                },
                error: err => {
                    this.loading = false;
                    this.erreur(err, 'Le circuit de signature n\'a pas pu être chargé.');
                }
            });
    }

    nom(signataireId?: string): string {
        return (signataireId && this.noms.get(signataireId)) || 'Utilisateur inconnu';
    }

    /** La ligne de l'utilisateur connecté, encore à signer, tant que personne n'a refusé. */
    aMoi(s: SignatureAudit): boolean {
        return !!this.moi && s.signataireId === this.moi && s.statut === 'EN_ATTENTE' && !this.circuitRefuse;
    }

    get circuitRefuse(): boolean {
        return this.signatures.some(s => s.statut === 'REFUSEE');
    }

    get signees(): number {
        return this.signatures.filter(s => s.statut === 'SIGNEE').length;
    }

    /** Le circuit se (re)pose tant que l'audit est en cours et que personne n'a encore signé — ou après un refus. */
    get peutPoserCircuit(): boolean {
        return this.audit?.statut === 'EN_COURS' && !this.audit?.circuitExterne && (this.signees === 0 || this.circuitRefuse);
    }

    ouvrirCircuit(): void {
        this.signatairesChoisis = this.signatures.map(s => s.signataireId!).filter(Boolean);
        this.fonctions = Object.fromEntries(this.signatures.map(s => [s.signataireId!, s.fonctionSignataire ?? '']));
        this.circuitOuvert = true;
    }

    /** La fonction se reprend de la fiche de l'utilisateur, et reste modifiable. */
    onSignatairesChange(): void {
        for (const id of this.signatairesChoisis) {
            if (this.fonctions[id] === undefined) {
                this.fonctions[id] = this.utilisateurs.find(u => u.id === id)?.fonction ?? '';
            }
        }
    }

    poserCircuit(): void {
        if (!this.auditId || !this.signatairesChoisis.length) return;
        const circuit = this.signatairesChoisis.map(id => ({ signataireId: id, fonctionSignataire: this.fonctions[id] || undefined }));
        this.circuitOuvert = false;
        this.geste(this.auditService.poserCircuitSignature(this.auditId, circuit), 'Circuit de signature posé.');
    }

    signer(): void {
        if (!this.auditId) return;
        this.geste(this.auditService.signerAudit(this.auditId), 'Votre signature est enregistrée.');
    }

    ouvrirRefus(s: SignatureAudit): void {
        this.motifRefus = '';
        this.refusOuvert = s.id ? { [s.id]: true } : {};
    }

    confirmerRefus(): void {
        if (!this.auditId || !this.motifRefus.trim()) return;
        this.refusOuvert = {};
        this.geste(this.auditService.refuserSignature(this.auditId, this.motifRefus), 'Votre refus est enregistré : le circuit est arrêté.');
    }

    private geste(appel$: Observable<unknown>, succes: string): void {
        // Les compteurs des onglets et du menu suivent le geste.
        appel$ = appel$.pipe(tap(() => this.auditService.rafraichirNotifications()));
        this.actionEnCours = true;
        appel$.pipe(takeUntil(this.destroy$)).subscribe({
            next: () => {
                this.actionEnCours = false;
                this.messageService.add({ severity: 'success', summary: 'Succès', detail: succes });
                this.charger(this.auditId!);
            },
            error: err => {
                this.actionEnCours = false;
                this.erreur(err, 'L\'opération a échoué.');
            }
        });
    }

    libelleStatut(statut?: string): string {
        return ({ EN_ATTENTE: 'En attente', SIGNEE: 'Signé', REFUSEE: 'Refusé' } as Record<string, string>)[statut ?? ''] ?? '—';
    }

    severiteStatut(statut?: string): any {
        return ({ EN_ATTENTE: 'warn', SIGNEE: 'success', REFUSEE: 'danger' } as Record<string, string>)[statut ?? ''] ?? 'secondary';
    }

    private erreur(err: unknown, defaut: string): void {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: messageErreur(err, defaut), life: 8000 });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
