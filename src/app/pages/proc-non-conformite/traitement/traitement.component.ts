import { Component, ViewChild } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { ProcNonConformiteService } from '../proc-non-conformite.service';
import { EtapeTraitement } from '../../../enums';
import { showToast, StatusEnum } from '../../../utils';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { DmdTraitementTableTemplateComponent } from '../../../components/dmd.traitement-table-template/dmd.traitement-table-template.component';
import { AuthService } from '../../../services/auth-services/auth.service';

@Component({
    selector: 'app-traitement',
    templateUrl: './traitement.component.html',
    styleUrl: './traitement.component.scss',
    standalone: true,
    providers: [MessageService],
    imports: [CommonModule, NgPrimeModule, DmdTraitementTableTemplateComponent]
})
export class TraitementComponent {
    demandeList: any = [];
    title = 'Traitements des non-conformités';
    user!: any;
    protected readonly BtnActions = EtapeTraitement;
    @ViewChild(DmdTraitementTableTemplateComponent) dmdTraitement!: DmdTraitementTableTemplateComponent;

    constructor(
        private authService: AuthService,
        protected messageService: MessageService,
        private service: ProcNonConformiteService
    ) {}
    ngOnInit() {
        this.user = this.authService.getUser()!;
        this.getDemandeList(this.user.userId);
    }
    getDemandeList(userId: string) {
        this.service.getNonConformiteImputed(userId, EtapeTraitement.TRAITEMENT).subscribe({
            next: (data) => {
                this.demandeList = data.body;
            },
            error: (error) => {
                this.messageService.add({ severity: 'error', summary: 'ERREUR', detail: "L'oppération à échouée ! Veuillez réessayer", life: 3000 });
                // showToastDm(handleHttpErrors(error, 'error', 'Récupération', 'demandeKey'), this.messageService)
            }
        });
    }
    onSuccess(res: HttpResponse<any>) {
        showToast(StatusEnum.success, res.status, null, this.messageService);
    }
    saveEntity(demande: any) {
        this.service.updateNomConformites(demande).subscribe({
            next: () => {
                this.getDemandeList(this.user.userId);
                this.dmdTraitement.closeDetailsDialog();
                this.messageService.add({ severity: 'success', summary: 'ERREUR', detail: "L'oppération à réussie !", life: 3000 });
            },
            error: (error) => {
                this.messageService.add({ severity: 'error', summary: 'ERREUR', detail: "L'oppération à échouée ! Veuillez réessayer", life: 3000 });
            }
        });
    }

    submission(demande: any) {
        this.service.updateNomConformites(demande).subscribe({
            next: (data) => {
                this.getDemandeList(this.user.userId);
                this.dmdTraitement.closeDetailsDialog();
                this.messageService.add({ severity: 'success', summary: 'ERREUR', detail: "L'oppération à réussie !", life: 3000 });
            },
            error: (error) => {
                this.messageService.add({ severity: 'error', summary: 'ERREUR', detail: "L'oppération à échouée ! Veuillez réessayer", life: 3000 });
            }
        });
    }
}
