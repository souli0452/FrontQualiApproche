import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgPrimeModule } from '@prime-ng';
import { Subject } from 'rxjs';
import { takeUntil, catchError, of } from 'rxjs';
import { MessageService, ConfirmationService } from 'primeng/api';
import { AuditGestionService } from '../../services/audit.service';
import { AuditeurFiche } from '../../models/audit.model';

@Component({
    selector: 'app-audit-auditeurs',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, NgPrimeModule],
    providers: [MessageService, ConfirmationService],
    templateUrl: './auditeurs.component.html'
})
export class AuditAuditeursComponent implements OnInit, OnDestroy {

    auditeurs: AuditeurFiche[] = [];
    loading = true;
    saving = false;
    totalElements = 0;
    currentPage = 0;
    pageSize = 20;

    afficherDialogue = false;
    auditeurEnEdition: AuditeurFiche | null = null;
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
            utilisateurId: [null, Validators.required],
            nom: [null, [Validators.required, Validators.maxLength(100)]],
            prenom: [null, Validators.maxLength(100)],
            qualification: [null],
            specialites: [null],
            email: [null, Validators.email],
            telephone: [null]
        });
    }

    charger(): void {
        this.loading = true;
        this.auditService.getAuditeurs(this.currentPage, this.pageSize)
            .pipe(
                takeUntil(this.destroy$),
                catchError(() => of({ data: { content: [], totalElements: 0 } }))
            )
            .subscribe((res: any) => {
                this.auditeurs = res?.data?.content ?? [];
                this.totalElements = res?.data?.totalElements ?? this.auditeurs.length;
                this.loading = false;
            });
    }

    ouvrirCreation(): void {
        this.auditeurEnEdition = null;
        this.formulaire.reset();
        this.afficherDialogue = true;
    }

    ouvrirEdition(a: AuditeurFiche): void {
        this.auditeurEnEdition = a;
        this.formulaire.patchValue(a);
        this.afficherDialogue = true;
    }

    sauvegarder(): void {
        if (this.formulaire.invalid) { this.formulaire.markAllAsTouched(); return; }
        this.saving = true;
        const payload = this.formulaire.getRawValue();
        const req$ = this.auditeurEnEdition?.id
            ? this.auditService.mettreAJourAuditeur(this.auditeurEnEdition.id!, payload)
            : this.auditService.creerAuditeur(payload);
        req$.pipe(takeUntil(this.destroy$)).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Auditeur sauvegardé.' });
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

    supprimer(a: AuditeurFiche): void {
        this.confirmationService.confirm({
            message: `Supprimer l'auditeur « ${a.nom} ${a.prenom ?? ''} » ?`,
            header: 'Confirmation',
            icon: 'pi pi-trash',
            accept: () => {
                this.auditService.supprimerAuditeur(a.id!)
                    .pipe(takeUntil(this.destroy$))
                    .subscribe({
                        next: () => { this.messageService.add({ severity: 'success', summary: 'Supprimé', detail: 'Auditeur supprimé.' }); this.charger(); },
                        error: () => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'La suppression a échoué.' })
                    });
            }
        });
    }

    onPageChange(event: any): void {
        this.currentPage = event.page ?? 0;
        this.charger();
    }

    trackById(_index: number, a: AuditeurFiche): string {
        return a.id ?? String(_index);
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
