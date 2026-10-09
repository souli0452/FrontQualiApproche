import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { NgPrimeModule } from '@prime-ng';
import { Subject } from 'rxjs';
import { takeUntil, catchError, of } from 'rxjs';
import { MessageService, ConfirmationService } from 'primeng/api';
import { AuditGestionService } from '../../services/audit.service';
import { Audit, ConstatAudit } from '../../models/audit.model';
import {
    StatutAudit,
    TypeAudit,
    NiveauRisqueAudit,
    StatutConstat,
    STATUT_AUDIT_LABELS,
    STATUT_AUDIT_SEVERITY,
    TYPE_AUDIT_LABELS,
    NIVEAU_RISQUE_LABELS,
    NIVEAU_RISQUE_SEVERITY
} from '../../models/audit-enums';

@Component({
    selector: 'app-audit-detail',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, NgPrimeModule],
    providers: [MessageService, ConfirmationService],
    templateUrl: './audit-detail.component.html'
})
export class AuditDetailComponent implements OnInit, OnDestroy {

    audit: Audit | null = null;
    constats: ConstatAudit[] = [];
    loading = true;
    loadingConstats = true;
    actionEnCours = false;
    auditId: string | null = null;

    // Dialogue annulation
    afficherDialogueAnnulation = false;
    motifAnnulation = '';

    readonly StatutAudit = StatutAudit;
    readonly TypeAudit = TypeAudit;
    readonly NiveauRisqueAudit = NiveauRisqueAudit;
    readonly StatutConstat = StatutConstat;
    readonly STATUT_AUDIT_LABELS = STATUT_AUDIT_LABELS;
    readonly STATUT_AUDIT_SEVERITY = STATUT_AUDIT_SEVERITY;
    readonly TYPE_AUDIT_LABELS = TYPE_AUDIT_LABELS;
    readonly NIVEAU_RISQUE_LABELS = NIVEAU_RISQUE_LABELS;
    readonly NIVEAU_RISQUE_SEVERITY = NIVEAU_RISQUE_SEVERITY;

    private destroy$ = new Subject<void>();

    constructor(
        private auditService: AuditGestionService,
        private route: ActivatedRoute,
        private router: Router,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {}

    ngOnInit(): void {
        this.auditId = this.route.snapshot.paramMap.get('id');
        if (this.auditId) {
            this.chargerAudit(this.auditId);
            this.chargerConstats(this.auditId);
        }
    }

    chargerAudit(id: string): void {
        this.loading = true;
        this.auditService.findById(id)
            .pipe(
                takeUntil(this.destroy$),
                catchError(() => {
                    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: "Impossible de charger l'audit." });
                    return of(null);
                })
            )
            .subscribe((res: any) => {
                this.audit = res?.data ?? null;
                this.loading = false;
            });
    }

    chargerConstats(auditId: string): void {
        this.loadingConstats = true;
        this.auditService.getConstats(auditId, undefined, 0, 100)
            .pipe(
                takeUntil(this.destroy$),
                catchError(() => of({ data: { content: [] } }))
            )
            .subscribe((res: any) => {
                this.constats = res?.data?.content ?? [];
                this.loadingConstats = false;
            });
    }

    // ---- Cycle de vie ----

    valider(): void {
        if (!this.auditId) return;
        this.confirmationService.confirm({
            message: "Valider cet audit et le passer en préparation ?",
            header: 'Confirmation',
            icon: 'pi pi-check-circle',
            accept: () => this.executerTransition(() =>
                this.auditService.validerAudit(this.auditId!),
                'Audit validé — préparation en cours.'
            )
        });
    }

    demarrer(): void {
        if (!this.auditId) return;
        this.confirmationService.confirm({
            message: "Démarrer l'exécution de cet audit ?",
            header: 'Confirmation',
            icon: 'pi pi-play',
            accept: () => this.executerTransition(() =>
                this.auditService.demarrerAudit(this.auditId!),
                "L'audit est en cours."
            )
        });
    }

    ouvrirDialogueAnnulation(): void {
        this.motifAnnulation = '';
        this.afficherDialogueAnnulation = true;
    }

    confirmerAnnulation(): void {
        if (!this.auditId || !this.motifAnnulation.trim()) return;
        this.afficherDialogueAnnulation = false;
        this.executerTransition(
            () => this.auditService.annulerAudit(this.auditId!, this.motifAnnulation),
            "L'audit a été annulé."
        );
    }

    cloturer(): void {
        if (!this.auditId) return;
        this.confirmationService.confirm({
            message: "Clôturer définitivement cet audit ?",
            header: 'Clôture',
            icon: 'pi pi-lock',
            accept: () => this.executerTransition(() =>
                this.auditService.cloturerAudit(this.auditId!),
                "L'audit est clôturé."
            )
        });
    }

    transmettreEcarts(): void {
        if (!this.auditId) return;
        this.actionEnCours = true;
        this.auditService.transmettreEcarts(this.auditId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.messageService.add({ severity: 'success', summary: 'Écarts transmis', detail: 'Les non-conformités ont été envoyées au module amélioration.' });
                    this.actionEnCours = false;
                },
                error: () => {
                    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'La transmission des écarts a échoué.' });
                    this.actionEnCours = false;
                }
            });
    }

    private executerTransition(fn: () => any, successMsg: string): void {
        this.actionEnCours = true;
        fn().pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res: any) => {
                    this.audit = res?.data ?? this.audit;
                    this.messageService.add({ severity: 'success', summary: 'Succès', detail: successMsg });
                    this.actionEnCours = false;
                },
                error: () => {
                    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: "L'opération a échoué." });
                    this.actionEnCours = false;
                }
            });
    }

    // ---- Rapport ----

    telechargerRapport(): void {
        if (!this.auditId) return;
        this.auditService.telechargerRapportFichier(this.auditId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (blob) => this.sauvegarderBlob(blob, `rapport-audit-${this.audit?.reference ?? this.auditId}.pdf`),
                error: () => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de télécharger le rapport.' })
            });
    }

    exporterPdf(): void {
        if (!this.auditId) return;
        this.auditService.exporterRapport(this.auditId, 'PDF')
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (blob) => this.sauvegarderBlob(blob, `rapport-audit-${this.audit?.reference ?? this.auditId}.pdf`),
                error: () => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: "L'export PDF a échoué." })
            });
    }

    exporterWord(): void {
        if (!this.auditId) return;
        this.auditService.exporterRapport(this.auditId, 'WORD')
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (blob) => this.sauvegarderBlob(blob, `rapport-audit-${this.audit?.reference ?? this.auditId}.docx`),
                error: () => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: "L'export Word a échoué." })
            });
    }

    private sauvegarderBlob(blob: Blob, nom: string): void {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nom;
        a.click();
        URL.revokeObjectURL(url);
    }

    // ---- Navigation ----

    modifierAudit(): void {
        if (this.auditId) {
            this.router.navigate(['/gestion-audit/programme/edit', this.auditId]);
        }
    }

    retourListe(): void {
        this.router.navigate(['/gestion-audit/programme']);
    }

    // ---- Helpers ----

    get peutValider(): boolean {
        return this.audit?.statut === StatutAudit.PLANIFIE;
    }

    get peutDemarrer(): boolean {
        return this.audit?.statut === StatutAudit.EN_PREPARATION;
    }

    get peutCloturer(): boolean {
        return this.audit?.statut === StatutAudit.EN_COURS || this.audit?.statut === StatutAudit.EN_RETARD;
    }

    get peutAnnuler(): boolean {
        return this.audit?.statut !== StatutAudit.CLOTURE && this.audit?.statut !== StatutAudit.ANNULE;
    }

    get peutTransmettreEcarts(): boolean {
        return (this.audit?.statut === StatutAudit.CLOTURE) && this.constatsPublies.length > 0;
    }

    getStatutSeverity(statut: string): string {
        return STATUT_AUDIT_SEVERITY[statut as StatutAudit] ?? 'secondary';
    }

    getStatutLabel(statut: string): string {
        return STATUT_AUDIT_LABELS[statut as StatutAudit] ?? statut;
    }

    getTypeLabel(type: string): string {
        return TYPE_AUDIT_LABELS[type as TypeAudit] ?? type;
    }

    getNiveauRisqueLabel(niveau: string): string {
        return NIVEAU_RISQUE_LABELS[niveau as NiveauRisqueAudit] ?? niveau;
    }

    getNiveauRisqueSeverity(niveau: string): string {
        return NIVEAU_RISQUE_SEVERITY[niveau as NiveauRisqueAudit] ?? 'secondary';
    }

    get constatsPublies(): ConstatAudit[] {
        return this.constats.filter(c => c.statut === StatutConstat.PUBLIE);
    }

    get constatsCompiles(): ConstatAudit[] {
        return this.constats.filter(c => c.statut === StatutConstat.COMPILE);
    }

    get constatsBrouillon(): ConstatAudit[] {
        return this.constats.filter(c => c.statut === StatutConstat.BROUILLON);
    }

    get constatsNc(): ConstatAudit[] {
        return this.constats.filter(c => c.nonConformite && c.statut === StatutConstat.PUBLIE);
    }

    trackByConstatId(_index: number, c: ConstatAudit): string {
        return c.id ?? '';
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
