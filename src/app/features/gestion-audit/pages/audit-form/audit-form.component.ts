import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgPrimeModule } from '@prime-ng';
import { Subject } from 'rxjs';
import { takeUntil, catchError, of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { AuditGestionService } from '../../services/audit.service';
import { Audit } from '../../models/audit.model';
import {
    StatutAudit,
    TypeAudit,
    NiveauRisqueAudit,
    STATUT_AUDIT_LABELS,
    TYPE_AUDIT_LABELS,
    NIVEAU_RISQUE_LABELS
} from '../../models/audit-enums';

@Component({
    selector: 'app-audit-form',
    standalone: true,
    imports: [CommonModule, RouterModule, ReactiveFormsModule, NgPrimeModule],
    providers: [MessageService],
    templateUrl: './audit-form.component.html'
})
export class AuditFormComponent implements OnInit, OnDestroy {

    formulaire!: FormGroup;
    modeEdition = false;
    auditId: string | null = null;
    saving = false;
    loading = false;

    typeAuditOptions = Object.values(TypeAudit).map(t => ({
        label: TYPE_AUDIT_LABELS[t],
        value: t
    }));

    niveauRisqueOptions = Object.values(NiveauRisqueAudit).map(n => ({
        label: NIVEAU_RISQUE_LABELS[n],
        value: n
    }));

    statutOptions = Object.values(StatutAudit).map(s => ({
        label: STATUT_AUDIT_LABELS[s],
        value: s
    }));

    private destroy$ = new Subject<void>();

    constructor(
        private fb: FormBuilder,
        private auditService: AuditGestionService,
        private router: Router,
        private route: ActivatedRoute,
        private messageService: MessageService
    ) {
        this.construireFormulaire();
    }

    ngOnInit(): void {
        this.auditId = this.route.snapshot.paramMap.get('id');
        this.modeEdition = !!this.auditId;
        if (this.modeEdition && this.auditId) {
            this.chargerAudit(this.auditId);
        }
    }

    construireFormulaire(): void {
        this.formulaire = this.fb.group({
            reference: [null],
            libelleProcessus: [null, [Validators.required, Validators.maxLength(300)]],
            typeAudit: [TypeAudit.INTERNE, Validators.required],
            sites: [null],
            objectif: [null, Validators.required],
            criteres: [null],
            responsableEquipe: [null, Validators.required],
            auditeurs: [null],
            niveauRisque: [NiveauRisqueAudit.FAIBLE],
            descriptionRisque: [null],
            dateAudit: [null, Validators.required],
            statut: [StatutAudit.PLANIFIE]
        });
    }

    chargerAudit(id: string): void {
        this.loading = true;
        this.auditService.findById(id)
            .pipe(
                takeUntil(this.destroy$),
                catchError(() => {
                    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger l\'audit.' });
                    return of(null);
                })
            )
            .subscribe((res: any) => {
                const audit: Audit = res?.data ?? res;
                if (audit) {
                    this.formulaire.patchValue({
                        reference: audit.reference,
                        libelleProcessus: audit.libelleProcessus,
                        typeAudit: audit.typeAudit,
                        sites: audit.sites?.join(', '),
                        objectif: audit.objectif,
                        criteres: audit.criteres,
                        responsableEquipe: audit.responsableEquipe,
                        auditeurs: audit.auditeurs?.join(', '),
                        niveauRisque: audit.niveauRisque,
                        descriptionRisque: audit.descriptionRisque,
                        dateAudit: audit.dateAudit,
                        statut: audit.statut
                    });
                }
                this.loading = false;
            });
    }

    sauvegarder(): void {
        if (this.formulaire.invalid) {
            this.formulaire.markAllAsTouched();
            return;
        }
        this.saving = true;

        const valeurs = this.formulaire.getRawValue();
        const payload: Partial<Audit> = {
            ...valeurs,
            sites: valeurs.sites
                ? valeurs.sites.split(',').map((s: string) => s.trim()).filter(Boolean)
                : [],
            auditeurs: valeurs.auditeurs
                ? valeurs.auditeurs.split(',').map((s: string) => s.trim()).filter(Boolean)
                : []
        };

        const requete$ = this.modeEdition && this.auditId
            ? this.auditService.updateObject(this.auditId, payload)
            : this.auditService.create(payload);

        requete$
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Succès',
                        detail: this.modeEdition ? 'Audit mis à jour.' : 'Audit planifié avec succès.'
                    });
                    this.saving = false;
                    this.router.navigate(['/gestion-audit/programme']);
                },
                error: () => {
                    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'La sauvegarde a échoué.' });
                    this.saving = false;
                }
            });
    }

    annuler(): void {
        this.router.navigate(['/gestion-audit/programme']);
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
