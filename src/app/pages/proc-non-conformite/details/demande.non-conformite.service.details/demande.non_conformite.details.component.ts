import { Component, Input } from '@angular/core';
import { FeaturesService } from '../../../../services/feature-service';
import { DatePipe, formatDate } from '@angular/common';
import { Tag } from 'primeng/tag';
import { EtapeTraitement, StatusEnum } from '../../../../enums';
import { NgPrimeModule } from '../../../../../prime-ng.module';
import { AuthService } from '../../../../services/auth-services/auth.service';
import { formatDateTodd, formatDateToDDMMYYYY } from '../../../../utils';
import { ProcNonConformiteService } from '../../proc-non-conformite.service';
import { MessageService } from 'primeng/api';

@Component({
    selector: 'demande-non_conformite-details',
    templateUrl: './demande.non_conformite.details.component.html',
    imports: [NgPrimeModule],
    styleUrl: './demande.non_conformite.details.component.scss'
})
export class DemandeNon_conformiteDetailsComponent {
    @Input() demande: any = {};
    constructor(private featureService: FeaturesService,
                private service:ProcNonConformiteService,
                private messageService: MessageService,
                private authService: AuthService,) {}

    ngOnInit() {}
    motifRejetDialog: boolean = false;
    planAction:any={};
    users:any=[];
    user:any={};
    downloadFile(fileId: string) {
        // Implémentez la logique de téléchargement
    }
    hideDialog() {
        this.motifRejetDialog = false;
    }
    edit(action:any){
        this.planAction=action;
          this.planAction.dateEcheance=action.dateEcheance.replace(/-/g, "/");
          console.log(this.planAction.dateEcheance);
        this.fetchUsers();
        this.motifRejetDialog = true;
    }
    fetchUsers() {
        this.authService
            .getAllUsers()
            .pipe()
            .subscribe({
                next: (res) => {
                    this.users = res.body || [];
                    this.users=this.users.map((user:any) => {
                        return {
                            ...user,
                            fullName: user.firstName + ' ' + user.lastName,
                        }


                    });
                    this.user = this.users.find((user: any) =>
                        user.fullName === this.planAction.responsableNomComplet
                    );


                },
            });
    }
    modifier(){
        this.planAction.dateEcheance=this.planAction.dateEcheance.replace(/\//g, "-");
        this.planAction.responsableEmail=this.user.email;
        this.planAction.responsableNomComplet=this.user.nomComplet;
        this.planAction.responsableId===this.user.id;
        console.log(this.planAction);
        this.service.updatePlanAction(this.planAction).subscribe({
            next: (data) => {

                this.motifRejetDialog = false;
                this.messageService.add({ severity: 'success', summary: 'Réussi', detail: "L'oppération à réussie !", life: 3000 });
            },
            error: (error) => {
                this.messageService.add({ severity: 'error', summary: 'ERREUR', detail: "L'oppération à échouée ! Veuillez réessayer", life: 3000 });
            }
        })
    }
    protected readonly EtapeTraitement = EtapeTraitement;
}
