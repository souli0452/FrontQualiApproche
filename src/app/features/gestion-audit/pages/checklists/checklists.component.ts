import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgPrimeModule } from '@prime-ng';
import { Observable, Subject, takeUntil, tap } from 'rxjs';
import { MessageService, ConfirmationService } from 'primeng/api';
import { SelectInputComponent } from '@shared/ui/select-input/select-input.component';
import { AuditLibelleComponent } from '../../components/libelle-aide.component';
import { AuditGestionService, contenu, messageErreur } from '../../services/audit.service';
import { AuditReferentielService } from '../../services/audit-referentiel.service';
import { AuditeurFiche, ChecklistAudit, PointControle } from '../../models/audit.model';

/**
 * Paramétrage des checklists d'audit (écran B6 de la maquette) : les checklists à gauche, les
 * points de contrôle de la checklist choisie à droite.
 *
 * <p>Chaque geste s'enregistre aussitôt — ajout, retrait ou assignation d'un point. Le serveur
 * reprend les points par identifiant, si bien qu'un point retouché garde son identité. Seul un
 * brouillon se modifie ; une checklist publiée sert dans les audits et se duplique pour évoluer.</p>
 *
 * <p>La liste se lit page par page, la plus récente en tête, filtrée par statut sur le serveur.</p>
 */
@Component({
    selector: 'app-audit-checklists',
    standalone: true,
    imports: [CommonModule, FormsModule, NgPrimeModule, SelectInputComponent, AuditLibelleComponent],
    providers: [MessageService, ConfirmationService],
    templateUrl: './checklists.component.html'
})
export class AuditChecklistsComponent implements OnInit, OnDestroy {

    /** La page affichée. */
    checklists: ChecklistAudit[] = [];
    totalElements = 0;
    currentPage = 0;
    pageSize = 10;
    auditeurs: AuditeurFiche[] = [];
    active: ChecklistAudit | null = null;
    loading = true;
    saving = false;
    filtreStatut: string | null = null;

    ajoutChecklist = false;
    nomNouvelle = '';
    nouveauPoint: PointControle | null = null;
    renommage = false;
    brouillonNom = '';
    brouillonChapitre = '';

    readonly filtres = [
        { label: 'Toutes', value: null },
        { label: 'Brouillons', value: 'BROUILLON' },
        { label: 'Publiées', value: 'PUBLIEE' },
        { label: 'Archivées', value: 'ARCHIVEE' }
    ];

    private destroy$ = new Subject<void>();

    constructor(
        private auditService: AuditGestionService,
        private referentiel: AuditReferentielService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {}

    ngOnInit(): void {
        this.referentiel.auditeurs().pipe(takeUntil(this.destroy$)).subscribe({
            next: a => (this.auditeurs = a.filter(x => x.statut !== 'INACTIF')),
            error: err => this.erreur(err, 'Le vivier d\'auditeurs n\'a pas pu être chargé.')
        });
        this.charger();
    }

    /** Recharge la liste et garde la checklist choisie (ou celle désignée). */
    charger(choisirId?: string): void {
        this.loading = true;
        this.auditService.pageChecklists(this.currentPage, this.pageSize, { statut: this.filtreStatut, sort: 'createdAt,desc' })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: res => {
                    this.checklists = contenu<ChecklistAudit>(res);
                    this.totalElements = res?.data?.totalElements ?? this.checklists.length;
                    const id = choisirId ?? this.active?.id;
                    this.active = this.checklists.find(c => c.id === id) ?? this.checklists[0] ?? null;
                    this.loading = false;
                },
                error: err => {
                    this.checklists = [];
                    this.loading = false;
                    this.erreur(err, 'Les checklists n\'ont pas pu être chargées.');
                }
            });
    }

    /** Un autre statut : on repart de la première page. */
    filtrer(): void {
        this.currentPage = 0;
        this.charger();
    }

    onPageChange(event: any): void {
        this.currentPage = event.page ?? 0;
        this.pageSize = event.rows ?? this.pageSize;
        this.charger();
    }

    get modifiable(): boolean {
        return this.active?.statut === 'BROUILLON';
    }

    choisir(cl: ChecklistAudit): void {
        this.active = cl;
        this.nouveauPoint = null;
        this.renommage = false;
    }

    creerChecklist(): void {
        const nom = this.nomNouvelle.trim();
        if (!nom) {
            return;
        }
        this.saving = true;
        this.auditService.creerChecklist({ nom, points: [] }).pipe(takeUntil(this.destroy$)).subscribe({
            next: res => {
                const cree: ChecklistAudit = (res as any)?.data ?? res;
                this.saving = false;
                this.ajoutChecklist = false;
                this.filtreStatut = null;
                this.currentPage = 0;
                this.messageService.add({ severity: 'success', summary: 'Succès', detail: `Checklist « ${nom} » créée.` });
                this.charger(cree?.id);
            },
            error: err => {
                this.saving = false;
                this.erreur(err, 'La checklist n\'a pas pu être créée.');
            }
        });
    }

    ouvrirRenommage(): void {
        this.brouillonNom = this.active?.nom ?? '';
        this.brouillonChapitre = this.active?.chapitreISO ?? '';
        this.renommage = true;
    }

    renommer(): void {
        this.enregistrer({ nom: this.brouillonNom.trim(), chapitreISO: this.brouillonChapitre.trim() }, 'Checklist renommée.', () => (this.renommage = false));
    }

    ouvrirNouveauPoint(): void {
        this.nouveauPoint = { chapitreISO: this.active?.chapitreISO, libelle: '' } as PointControle;
    }

    ajouterPoint(): void {
        if (!this.nouveauPoint?.libelle?.trim()) {
            return;
        }
        const points = [...(this.active?.points ?? []), this.nouveauPoint];
        this.enregistrer({ points }, 'Point de contrôle ajouté.', () => (this.nouveauPoint = null));
    }

    assigner(i: number, auditeurId: string | null): void {
        const points = (this.active?.points ?? []).map((p, j) => (j === i ? { ...p, auditeurAssigneId: auditeurId ?? undefined } : p));
        this.enregistrer({ points }, 'Auditeur assigné.');
    }

    retirerPoint(event: Event, i: number): void {
        const point = this.active?.points?.[i];
        this.confirmationService.confirm({
            target: event.currentTarget as EventTarget,
            message: `Retirer « ${point?.libelle} » de la checklist ?`,
            icon: 'pi pi-trash',
            acceptLabel: 'Retirer',
            rejectLabel: 'Retour',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => this.enregistrer({ points: (this.active?.points ?? []).filter((_, j) => j !== i) }, 'Point de contrôle retiré.')
        });
    }

    /** Envoie la checklist active, modifiée, et remplace sa copie locale par la réponse. */
    private enregistrer(modif: Partial<ChecklistAudit>, succes: string, ok?: () => void): void {
        if (!this.active?.id) {
            return;
        }
        this.saving = true;
        this.auditService.mettreAJourChecklist(this.active.id, { ...this.active, ...modif })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: res => {
                    const maj: ChecklistAudit = (res as any)?.data ?? res;
                    this.checklists = this.checklists.map(c => (c.id === maj.id ? maj : c));
                    this.active = maj;
                    this.saving = false;
                    ok?.();
                    this.messageService.add({ severity: 'success', summary: 'Succès', detail: succes });
                },
                error: err => {
                    this.saving = false;
                    this.erreur(err, 'L\'enregistrement a échoué.');
                }
            });
    }

    publier(event: Event, cl: ChecklistAudit): void {
        this.confirmationService.confirm({
            target: event.currentTarget as EventTarget,
            message: `Publier « ${cl.nom} » ? Elle pourra servir dans les audits, et ne se modifiera plus.`,
            icon: 'pi pi-send',
            acceptLabel: 'Publier',
            rejectLabel: 'Retour',
            accept: () => this.geste(this.auditService.publierChecklist(cl.id!), 'Checklist publiée.')
        });
    }

    archiver(cl: ChecklistAudit): void {
        this.geste(this.auditService.archiverChecklist(cl.id!), 'Checklist archivée.');
    }

    dupliquer(cl: ChecklistAudit): void {
        this.auditService.dupliquerChecklist(cl.id!).pipe(takeUntil(this.destroy$)).subscribe({
            next: res => {
                const copie: ChecklistAudit = (res as any)?.data ?? res;
                this.filtreStatut = null;
                this.currentPage = 0;
                this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Copie créée en brouillon.' });
                this.charger(copie?.id);
            },
            error: err => this.erreur(err, 'L\'opération a échoué.')
        });
    }

    supprimer(event: Event, cl: ChecklistAudit): void {
        this.confirmationService.confirm({
            target: event.currentTarget as EventTarget,
            message: `Supprimer « ${cl.nom} » ?`,
            icon: 'pi pi-trash',
            acceptLabel: 'Supprimer',
            rejectLabel: 'Retour',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.active = null;
                this.geste(this.auditService.supprimerChecklist(cl.id!), 'Checklist supprimée.');
            }
        });
    }

    private geste(appel$: Observable<unknown>, succes: string): void {
        // Les compteurs des onglets et du menu suivent le geste.
        appel$ = appel$.pipe(tap(() => this.auditService.rafraichirNotifications()));
        appel$.pipe(takeUntil(this.destroy$)).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Succès', detail: succes });
                this.charger();
            },
            error: err => this.erreur(err, 'L\'opération a échoué.')
        });
    }

    libelleStatut(s?: string): string {
        return ({ BROUILLON: 'Brouillon', PUBLIEE: 'Publiée', ARCHIVEE: 'Archivée' } as Record<string, string>)[s ?? ''] ?? '—';
    }

    severiteStatut(s?: string): any {
        return ({ BROUILLON: 'secondary', PUBLIEE: 'success', ARCHIVEE: 'contrast' } as Record<string, string>)[s ?? ''] ?? 'secondary';
    }

    trackByIndex(i: number): number {
        return i;
    }

    private erreur(err: unknown, defaut: string): void {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: messageErreur(err, defaut), life: 8000 });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
