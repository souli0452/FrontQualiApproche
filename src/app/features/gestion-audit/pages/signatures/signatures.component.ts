import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NgPrimeModule } from '@prime-ng';
import { Subject } from 'rxjs';
import { takeUntil, catchError, of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { AuditGestionService } from '../../services/audit.service';
import { SignatureAudit } from '../../models/audit.model';

@Component({
    selector: 'app-audit-signatures',
    standalone: true,
    imports: [CommonModule, FormsModule, NgPrimeModule],
    providers: [MessageService],
    templateUrl: './signatures.component.html'
})
export class AuditSignaturesComponent implements OnInit, OnDestroy {

    signatures: SignatureAudit[] = [];
    loading = true;
    actionEnCours = false;
    auditId: string | null = null;

    // Dialogue refus
    afficherDialogueRefus = false;
    motifRefus = '';

    private destroy$ = new Subject<void>();

    constructor(
        private auditService: AuditGestionService,
        private route: ActivatedRoute,
        private messageService: MessageService
    ) {}

    ngOnInit(): void {
        this.auditId = this.route.snapshot.paramMap.get('id');
        if (this.auditId) this.charger(this.auditId);
    }

    charger(auditId: string): void {
        this.loading = true;
        this.auditService.getSignatures(auditId)
            .pipe(
                takeUntil(this.destroy$),
                catchError(() => of({ data: { content: [] } }))
            )
            .subscribe((res: any) => {
                this.signatures = res?.data?.content ?? res?.data ?? [];
                this.loading = false;
            });
    }

    signer(): void {
        if (!this.auditId) return;
        this.actionEnCours = true;
        this.auditService.signerAudit(this.auditId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.messageService.add({ severity: 'success', summary: 'Signé', detail: 'Votre signature a été enregistrée.' });
                    this.actionEnCours = false;
                    this.charger(this.auditId!);
                },
                error: () => {
                    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'La signature a échoué.' });
                    this.actionEnCours = false;
                }
            });
    }

    ouvrirDialogueRefus(): void {
        this.motifRefus = '';
        this.afficherDialogueRefus = true;
    }

    confirmerRefus(): void {
        if (!this.auditId || !this.motifRefus.trim()) return;
        this.afficherDialogueRefus = false;
        this.actionEnCours = true;
        this.auditService.refuserSignature(this.auditId, this.motifRefus)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.messageService.add({ severity: 'info', summary: 'Refusé', detail: 'Votre refus a été enregistré.' });
                    this.actionEnCours = false;
                    this.charger(this.auditId!);
                },
                error: () => {
                    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: "L'opération a échoué." });
                    this.actionEnCours = false;
                }
            });
    }

    trackById(_index: number, s: SignatureAudit): string {
        return s.id ?? String(_index);
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
