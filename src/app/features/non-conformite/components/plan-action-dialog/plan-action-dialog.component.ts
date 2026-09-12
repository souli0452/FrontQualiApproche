import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '@prime-ng';
import { map } from 'rxjs/operators';

import { LightboxComponent } from '@features/non-conformite/components/lightbox/lightbox';
import { DetailsDialogComponent } from '@features/non-conformite/components/details-dialog/details-dialog';
import { NonConformiteService } from '@features/non-conformite/services/non-conformite.service';
import { PlanActionService } from '@features/non-conformite/services/plan-action.service';
import { PieceJointeFichierService } from '@features/non-conformite/services/piece-jointe-fichier.service';
import { WorkflowActionsComponent } from '@features/workflow/execution/workflow-actions.component';
import { WorkflowGuidanceComponent } from '@features/workflow/execution/workflow-guidance.component';
import { WorkflowHistoriqueComponent } from '@features/workflow/execution/workflow-historique.component';
import { AlertService } from '@shared/alert-message/alert-message.service';

@Component({
    selector: 'app-plan-action-dialog',
    templateUrl: './plan-action-dialog.component.html',
    styleUrl: './plan-action-dialog.component.scss',
    standalone: true,
    imports: [
        CommonModule,
        NgPrimeModule,
        WorkflowActionsComponent,
        WorkflowGuidanceComponent,
        WorkflowHistoriqueComponent,
        LightboxComponent,
        DetailsDialogComponent
    ]
})
export class PlanActionDialogComponent {
    @Input() visible: boolean = false;
    @Output() visibleChange = new EventEmitter<boolean>();

    currentPlan: any = null;

    @Input() 
    set plan(val: any) {
        if (!val) {
            this.currentPlan = null;
            return;
        }
        this.currentPlan = { ...val };
        if (typeof this.currentPlan?.dateEcheance === 'string') {
            this.currentPlan.dateEcheance = this.currentPlan.dateEcheance.replace(/-/g, '/');
        }

        // Chargement automatique du dossier parent NC complet si nécessaire
        const parentId = this.currentPlan.nonConformeId || this.currentPlan.nonConformiteId || this.currentPlan.nonConformite?.id;
        if (parentId && (!this.currentPlan.nonConformite || !this.currentPlan.nonConformite.justification)) {
            this.nonConformiteService.findNCById(parentId).subscribe({
                next: (res: any) => {
                    const nc = res?.data ?? res;
                    if (nc) {
                        this.currentPlan.nonConformite = nc;
                    }
                },
                error: (err) => console.error("Erreur chargement dossier parent NC", err)
            });
        }
    }

    get plan(): any {
        return this.currentPlan;
    }

    @Output() executed = new EventEmitter<any>();

    @ViewChild('maLightbox') maLightbox!: LightboxComponent;

    readonly deposerFichierDEtape = (fichier: File) =>
        this.planActionService.deposerFichier(this.currentPlan?.id, fichier).pipe(
            map((reponse: any) => reponse?.url || reponse?.id || `${reponse}`)
        );

    constructor(
        private nonConformiteService: NonConformiteService,
        private planActionService: PlanActionService,
        private fichiersService: PieceJointeFichierService,
        private alertService: AlertService
    ) {}

    fermer(): void {
        this.visible = false;
        this.visibleChange.emit(false);
    }

    onVisibleChange(val: boolean): void {
        this.visible = val;
        this.visibleChange.emit(val);
    }

    apresDecisionSurLePlan(plan: any): void {
        this.fermer();
        this.alertService.showSuccess("Opération effectuée avec succès");
        this.executed.emit(plan || this.currentPlan);
    }

    couleurEtapeDuPlan(plan: any): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        const code = plan?.workflowState?.currentStateCode || plan?.status;
        if (code === 'REALISE' || code === 'EFFICACE' || code === 'TRAITER') return 'success';
        if (code === 'A_REALISER' || code === 'NON_TRAITER') return 'warn';
        return 'info';
    }

    etapeDuPlan(plan: any): string {
        return plan?.workflowState?.currentStateName || plan?.status || 'À réaliser';
    }

    getResponsableName(plan: any): string {
        if (!plan) return '—';
        return plan.responsable?.nomComplet || plan.responsableNomComplet || plan.responsableEmail || '—';
    }

    downloadFile(fichier: any): void {
        this.fichiersService.telecharger(fichier);
    }

    openLightbox(file: any): void {
        this.maLightbox?.open(file);
    }

    isViewable(fichier: any): boolean {
        const nom = fichier?.nom || fichier?.nomFichier;
        if (!nom) return false;
        const nomStr = nom.toLowerCase();
        return nomStr.endsWith('.pdf') || nomStr.endsWith('.png') || nomStr.endsWith('.jpg') || nomStr.endsWith('.jpeg');
    }

    getFileIcon(filename: string): string {
        if (!filename) return 'assets/images/unknown-file.png';
        const ext = filename.split('.').pop()?.toLowerCase() || '';
        const icons: Record<string, string> = {
            pdf: 'assets/images/pdf-file.png',
            doc: 'assets/images/doc-file.png',
            docx: 'assets/images/doc-file.png',
            xls: 'assets/images/xls-file.png',
            xlsx: 'assets/images/xls-file.png',
            jpg: 'assets/images/jpeg-file.png',
            jpeg: 'assets/images/jpeg-file.png',
            png: 'assets/images/jpeg-file.png'
        };
        return icons[ext] || 'assets/images/unknown-file.png';
    }
}
