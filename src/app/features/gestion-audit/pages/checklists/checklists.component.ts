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

type ConfirmationTone = 'info' | 'success' | 'warn' | 'danger';

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
    private nomsAuditeurs = new Map<string, string>();
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
    confirmationTone: ConfirmationTone = 'info';

    readonly filtres: { label: string; value: string | null }[] = [
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
            next: a => {
                this.nomsAuditeurs = new Map(a.filter(x => x.id).map(x => [x.id!, x.nomComplet ?? '—']));
                this.auditeurs = a.filter(x => x.statut !== 'INACTIF');
            },
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
    choisirFiltre(valeur: string | null): void {
        if (this.filtreStatut === valeur) return;
        this.filtreStatut = valeur;
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

    get confirmationBadgeClasses(): string {
        switch (this.confirmationTone) {
            case 'danger':
                return 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 ring-rose-50/70 dark:ring-rose-950/30';
            case 'warn':
                return 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 ring-amber-50/70 dark:ring-amber-950/30';
            case 'success':
                return 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 ring-emerald-50/70 dark:ring-emerald-950/30';
            default:
                return 'bg-[#0ea5e9]/10 text-[#0084ca] dark:text-sky-400 ring-[#0ea5e9]/10';
        }
    }

    get confirmationAcceptClasses(): string {
        const base = 'p-button-sm flex-1 justify-center rounded-[5px]';
        switch (this.confirmationTone) {
            case 'danger':
                return `p-button-danger ${base}`;
            case 'warn':
                return `p-button-warn ${base}`;
            case 'success':
                return `p-button-success ${base}`;
            default:
                return `p-button-info ${base}`;
        }
    }

    nomAuditeur(id?: string): string | null {
        if (!id) return null;
        return this.nomsAuditeurs.get(id) ?? null;
    }

    initialesAuditeur(id?: string): string {
        const nom = this.nomAuditeur(id);
        if (!nom) return '?';
        return nom
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(part => part[0]?.toUpperCase() ?? '')
            .join('');
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

    importEnCours = false;

    /** Ajoute à la checklist les points lus dans une grille Excel ou CSV ; ils se relisent et se retirent ici. */
    importer(event: Event): void {
        const input = event.target as HTMLInputElement;
        const fichier = input.files?.[0];
        input.value = '';
        if (!fichier || !this.active) return;
        this.importEnCours = true;
        this.auditService.importerPoints(fichier).pipe(takeUntil(this.destroy$)).subscribe({
            next: res => {
                this.importEnCours = false;
                const lus = contenu<PointControle>(res);
                const points = [...(this.active?.points ?? []), ...lus];
                this.enregistrer({ points }, `${lus.length} point(s) importé(s) : relisez-les avant de publier.`);
            },
            error: err => {
                this.importEnCours = false;
                this.messageService.add({ severity: 'error', summary: 'Import impossible', detail: messageErreur(err, 'Le fichier n\'a pas pu être lu.'), life: 8000 });
            }
        });
    }

    telechargerModele(): void {
        this.auditService.telechargerModeleImport().pipe(takeUntil(this.destroy$)).subscribe(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'Modele_points_de_controle.xlsx';
            a.click();
            URL.revokeObjectURL(url);
        });
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

    retirerPoint(i: number): void {
        const point = this.active?.points?.[i];
        this.confirmationTone = 'danger';
        this.confirmationService.confirm({
            key: 'checklist-action',
            header: 'Retirer ce point de contrôle',
            message: `Voulez-vous retirer « ${point?.libelle || 'ce point'} » de la checklist ?`,
            icon: 'pi-trash',
            acceptLabel: 'Retirer',
            acceptIcon: 'pi pi-trash',
            rejectLabel: 'Annuler',
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

    publier(cl: ChecklistAudit): void {
        this.confirmationTone = 'success';
        this.confirmationService.confirm({
            key: 'checklist-action',
            header: 'Publier la checklist',
            message: `Publier « ${cl.nom} » ? Elle deviendra utilisable dans les audits et ne pourra plus être modifiée directement.`,
            icon: 'pi-send',
            acceptLabel: 'Publier',
            acceptIcon: 'pi pi-send',
            rejectLabel: 'Retour',
            accept: () => this.geste(this.auditService.publierChecklist(cl.id!), 'Checklist publiée.')
        });
    }

    archiver(cl: ChecklistAudit): void {
        this.confirmationTone = 'warn';
        this.confirmationService.confirm({
            key: 'checklist-action',
            header: 'Archiver la checklist',
            message: `Archiver « ${cl.nom} » ? Elle ne sera plus proposée pour les nouveaux audits (les audits existants la conservent).`,
            icon: 'pi-inbox',
            acceptLabel: 'Archiver',
            acceptIcon: 'pi pi-inbox',
            rejectLabel: 'Retour',
            accept: () => this.geste(this.auditService.archiverChecklist(cl.id!), 'Checklist archivée.')
        });
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

    supprimer(cl: ChecklistAudit): void {
        this.confirmationTone = 'danger';
        this.confirmationService.confirm({
            key: 'checklist-action',
            header: 'Supprimer le brouillon',
            message: `Supprimer définitivement la checklist « ${cl.nom} » et tous ses points de contrôle ?`,
            icon: 'pi-trash',
            acceptLabel: 'Supprimer',
            acceptIcon: 'pi pi-trash',
            rejectLabel: 'Annuler',
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

    trackById(_i: number, cl: ChecklistAudit): string {
        return cl.id ?? String(_i);
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
