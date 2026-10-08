import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgPrimeModule } from '@prime-ng';
import { Subject } from 'rxjs';
import { takeUntil, catchError, of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { AuditGestionService } from '../../services/audit.service';
import { ConstatAudit, Audit } from '../../models/audit.model';
import {
    StatutConstat,
    TYPES_CONSTAT_DEFAUT,
    TypeConstat
} from '../../models/audit-enums';

@Component({
    selector: 'app-audit-constatations',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, NgPrimeModule],
    providers: [MessageService],
    templateUrl: './constatations.component.html'
})
export class AuditConstatationsComponent implements OnInit, OnDestroy {

    constats: ConstatAudit[] = [];
    loading = true;
    saving = false;

    // Dialogue création / édition
    afficherDialogue = false;
    constatEnEdition: ConstatAudit | null = null;
    formulaire!: FormGroup;

    // Filtre par statut
    filtreStatut: StatutConstat | null = null;
    filtreAuditId: string | null = null;

    // Audits disponibles pour le filtre
    auditsDisponibles: Audit[] = [];
    loadingAudits = false;

    // Types de constats paramétrables
    typesConstat: TypeConstat[] = TYPES_CONSTAT_DEFAUT;

    // Pagination
    totalElements = 0;
    currentPage = 0;
    pageSize = 20;

    readonly StatutConstat = StatutConstat;
    readonly TYPES_CONSTAT_DEFAUT = TYPES_CONSTAT_DEFAUT;

    statutOptions = [
        { label: 'Brouillon', value: StatutConstat.BROUILLON },
        { label: 'Publié', value: StatutConstat.PUBLIE }
    ];

    private destroy$ = new Subject<void>();

    constructor(
        private auditService: AuditGestionService,
        private fb: FormBuilder,
        private messageService: MessageService
    ) {
        this.construireFormulaire();
    }

    ngOnInit(): void {
        this.chargerAudits();
    }

    construireFormulaire(): void {
        this.formulaire = this.fb.group({
            auditId: [null, Validators.required],
            chapitre: [null],
            label: [null, [Validators.required, Validators.maxLength(200)]],
            question: [null],
            critere: [null],
            preuveAttendue: [null],
            auditeur: [null],
            codeTypeConstat: [null, Validators.required],
            observation: [null]
        });
    }

    chargerAudits(): void {
        this.loadingAudits = true;
        this.auditService.findAll(0, 100)
            .pipe(
                takeUntil(this.destroy$),
                catchError(() => of({ data: { content: [] } }))
            )
            .subscribe((res: any) => {
                this.auditsDisponibles = res?.data?.content ?? [];
                this.loadingAudits = false;
                if (this.filtreAuditId) {
                    this.chargerConstats();
                } else if (this.auditsDisponibles.length > 0) {
                    this.filtreAuditId = this.auditsDisponibles[0].id ?? null;
                    this.chargerConstats();
                } else {
                    this.loading = false;
                }
            });
    }

    chargerConstats(): void {
        if (!this.filtreAuditId) return;
        this.loading = true;
        this.auditService.getConstats(this.filtreAuditId, this.currentPage, this.pageSize)
            .pipe(
                takeUntil(this.destroy$),
                catchError(() => {
                    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les constats.' });
                    return of({ data: { content: [], totalElements: 0 } });
                })
            )
            .subscribe((res: any) => {
                const tousConstats: ConstatAudit[] = res?.data?.content ?? [];
                this.totalElements = res?.data?.totalElements ?? tousConstats.length;
                this.constats = this.filtreStatut
                    ? tousConstats.filter(c => c.statut === this.filtreStatut)
                    : tousConstats;
                this.loading = false;
            });
    }

    onChangeAudit(auditId: string | null): void {
        this.filtreAuditId = auditId;
        this.currentPage = 0;
        this.chargerConstats();
    }

    onFiltreStatut(statut: StatutConstat | null): void {
        this.filtreStatut = statut;
        this.chargerConstats();
    }

    ouvrirCreation(): void {
        this.constatEnEdition = null;
        this.formulaire.reset();
        if (this.filtreAuditId) {
            this.formulaire.patchValue({ auditId: this.filtreAuditId });
        }
        this.afficherDialogue = true;
    }

    ouvrirEdition(constat: ConstatAudit): void {
        this.constatEnEdition = constat;
        this.formulaire.patchValue({
            auditId: constat.auditId,
            chapitre: constat.chapitre,
            label: constat.label,
            question: constat.question,
            critere: constat.critere,
            preuveAttendue: constat.preuveAttendue,
            auditeur: constat.auditeur,
            codeTypeConstat: constat.codeTypeConstat,
            observation: constat.observation
        });
        this.afficherDialogue = true;
    }

    sauvegarder(): void {
        if (this.formulaire.invalid) {
            this.formulaire.markAllAsTouched();
            return;
        }
        this.saving = true;
        const payload: Partial<ConstatAudit> = this.formulaire.getRawValue();
        const auditId = payload.auditId!;

        const requete$ = this.constatEnEdition?.id
            ? this.auditService.mettreAJourConstat(auditId, this.constatEnEdition.id, payload)
            : this.auditService.creerConstat(auditId, payload);

        requete$
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Succès',
                        detail: this.constatEnEdition ? 'Constat mis à jour.' : 'Constat créé en brouillon.'
                    });
                    this.afficherDialogue = false;
                    this.saving = false;
                    this.chargerConstats();
                },
                error: () => {
                    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'La sauvegarde a échoué.' });
                    this.saving = false;
                }
            });
    }

    publierConstat(constat: ConstatAudit): void {
        if (!constat.id || !constat.auditId) return;
        this.auditService.changerStatutConstat(constat.auditId, constat.id, StatutConstat.PUBLIE)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.messageService.add({ severity: 'success', summary: 'Publié', detail: 'Le constat a été publié.' });
                    this.chargerConstats();
                },
                error: () => {
                    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'La publication a échoué.' });
                }
            });
    }

    supprimerConstat(constat: ConstatAudit): void {
        if (!constat.id || !constat.auditId) return;
        this.auditService.supprimerConstat(constat.auditId, constat.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.messageService.add({ severity: 'success', summary: 'Supprimé', detail: 'Le constat a été supprimé.' });
                    this.chargerConstats();
                },
                error: () => {
                    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'La suppression a échoué.' });
                }
            });
    }

    getTypeConstatInfo(code: string): TypeConstat | undefined {
        return this.typesConstat.find(t => t.code === code);
    }

    getAuditLabel(auditId: string): string {
        const audit = this.auditsDisponibles.find(a => a.id === auditId);
        return audit ? (audit.reference ?? audit.libelleProcessus ?? auditId) : auditId;
    }

    trackByConstatId(_index: number, constat: ConstatAudit): string {
        return constat.id ?? '';
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
