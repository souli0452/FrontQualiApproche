import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgPrimeModule } from '@prime-ng';
import { Subject } from 'rxjs';
import { takeUntil, catchError, of } from 'rxjs';
import { MessageService, ConfirmationService } from 'primeng/api';
import { AuditGestionService } from '../../services/audit.service';

@Component({
    selector: 'app-audit-checklists',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, NgPrimeModule],
    providers: [MessageService, ConfirmationService],
    templateUrl: './checklists.component.html'
})
export class AuditChecklistsComponent implements OnInit, OnDestroy {

    checklists: any[] = [];
    loading = true;
    saving = false;
    totalElements = 0;
    currentPage = 0;
    pageSize = 20;

    afficherDialogue = false;
    checklistEnEdition: any = null;
    formulaire!: FormGroup;

    private destroy$ = new Subject<void>();

    constructor(
        private auditService: AuditGestionService,
        private fb: FormBuilder,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {
        this.construireFormulaire();
    }

    ngOnInit(): void {
        this.charger();
    }

    construireFormulaire(): void {
        this.formulaire = this.fb.group({
            libelle: [null, [Validators.required, Validators.maxLength(200)]],
            description: [null],
            typeAuditId: [null]
        });
    }

    charger(): void {
        this.loading = true;
        this.auditService.getChecklists(this.currentPage, this.pageSize)
            .pipe(
                takeUntil(this.destroy$),
                catchError(() => of({ data: { content: [], totalElements: 0 } }))
            )
            .subscribe((res: any) => {
                this.checklists = res?.data?.content ?? [];
                this.totalElements = res?.data?.totalElements ?? this.checklists.length;
                this.loading = false;
            });
    }

    ouvrirCreation(): void {
        this.checklistEnEdition = null;
        this.formulaire.reset();
        this.afficherDialogue = true;
    }

    ouvrirEdition(cl: any): void {
        this.checklistEnEdition = cl;
        this.formulaire.patchValue({ libelle: cl.libelle, description: cl.description, typeAuditId: cl.typeAuditId });
        this.afficherDialogue = true;
    }

    sauvegarder(): void {
        if (this.formulaire.invalid) { this.formulaire.markAllAsTouched(); return; }
        this.saving = true;
        const payload = this.formulaire.getRawValue();
        const req$ = this.checklistEnEdition?.id
            ? this.auditService.mettreAJourChecklist(this.checklistEnEdition.id, payload)
            : this.auditService.creerChecklist(payload);
        req$.pipe(takeUntil(this.destroy$)).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Checklist sauvegardée.' });
                this.afficherDialogue = false;
                this.saving = false;
                this.charger();
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'La sauvegarde a échoué.' });
                this.saving = false;
            }
        });
    }

    publier(cl: any): void {
        this.auditService.publierChecklist(cl.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => { this.messageService.add({ severity: 'success', summary: 'Publiée', detail: 'Checklist publiée.' }); this.charger(); },
                error: () => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'La publication a échoué.' })
            });
    }

    archiver(cl: any): void {
        this.auditService.archiverChecklist(cl.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => { this.messageService.add({ severity: 'info', summary: 'Archivée', detail: 'Checklist archivée.' }); this.charger(); },
                error: () => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: "L'archivage a échoué." })
            });
    }

    dupliquer(cl: any): void {
        this.auditService.dupliquerChecklist(cl.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => { this.messageService.add({ severity: 'success', summary: 'Dupliquée', detail: 'Checklist dupliquée.' }); this.charger(); },
                error: () => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'La duplication a échoué.' })
            });
    }

    supprimer(cl: any): void {
        this.confirmationService.confirm({
            message: `Supprimer la checklist « ${cl.libelle} » ?`,
            header: 'Confirmation',
            icon: 'pi pi-trash',
            accept: () => {
                this.auditService.supprimerChecklist(cl.id)
                    .pipe(takeUntil(this.destroy$))
                    .subscribe({
                        next: () => { this.messageService.add({ severity: 'success', summary: 'Supprimée', detail: 'Checklist supprimée.' }); this.charger(); },
                        error: () => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'La suppression a échoué.' })
                    });
            }
        });
    }

    onPageChange(event: any): void {
        this.currentPage = event.page ?? 0;
        this.charger();
    }

    trackById(_index: number, item: any): string {
        return item.id ?? _index;
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
