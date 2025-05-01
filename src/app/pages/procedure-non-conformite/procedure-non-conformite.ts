import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ActionNonConformite, FormGroupColumn, NiveauNonConformite, NonConformite, TableColumn, TypeNonConformite, TypeProcessus } from '../../models';
import { FormArray, FormGroup, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { showToast, StatusEnum } from '../../utils';
import { HttpResponse } from '@angular/common/http';
import { NonConformiteService } from '../../services/non-conformite.service';
import { TypeNonConformiteService } from '../../services/type-non-conformite.service';
import { NiveauNonConformiteService } from '../../services/niveau-non-conformite.service';
import { ActionNonConformiteService } from '../../services/action-non-conformite.service';
import { TypeProcessusService } from '../../services/type-processus.service';
import { NgPrimeModule } from '../../../prime-ng.module';
import { TypeNonConformiteComponent } from "./types/type-non-conformite";
import { TypeProcessusComponent } from "./types/type-processus";
import { NiveauNonConformiteComponent } from "./niveau/niveau";
import { ActionNonConformiteComponent } from "./action/action";

@Component({
    selector: 'app-procedure-non-conformite',
    standalone: true,
    imports: [CommonModule, NgPrimeModule, TypeNonConformiteComponent, TypeProcessusComponent, NiveauNonConformiteComponent, ActionNonConformiteComponent],
  templateUrl: './procedure-non-conformite.html',
  styleUrl: './procedure-non-conformite.scss'
})
export class ProcedureNonConformiteComponent {
    visible: boolean = false;

    showDialog() {
        this.visible = true;
    }

 loading: boolean = true;
    destroy$: Subject<boolean> = new Subject<boolean>();
    dataList: NonConformite[] = [];
    dataListTypeNonConformite: TypeNonConformite[] = [];
    dataListNiveauNonConformite: NiveauNonConformite[] = [];
    dataListActionNonConformite: ActionNonConformite[] = [];
    dataListTypeProcessus: TypeProcessus[] = [];
    closeDialog = false;
    formGroup: UntypedFormGroup;
    tableCols: TableColumn[];
    formCols: FormGroupColumn[];
    pageLabel = 'Non-conformité';
    formHeader = 'Création et mise à jour d\'un non-conformité';

    constructor(protected fb: UntypedFormBuilder,
                protected messageService: MessageService,
                protected nonConformiteService: NonConformiteService,
                protected typeNonConformiteService: TypeNonConformiteService,
                protected niveauNonConformiteService: NiveauNonConformiteService,
                protected actionNonConformiteService: ActionNonConformiteService,
                protected typeProcessusService: TypeProcessusService,
            
            ) {
        this.formCols = [
            {field: 'id', label: "", header: 'Id', type: 'string', visible: false, required: false},
            {field: 'intitule', label: "", header: 'Intitulé', type: 'string', visible: true, required: true},
            {field: 'typeNonConformite', label: "", header: 'Type', type: 'dropdown', visible: true, required: false, },
            {field: 'numeroReference', label: "", header: 'Reference', type: 'string', visible: true, required: false, },
            {field: 'priorite', label: "", header: 'Propriété', type: 'string', visible: true, required: false, },
            {field: 'detailleSuplementaire', label: "", header: 'Détaille', type: 'string', visible: true, required: false, },
            {field: 'dateEcheance', label: "", header: 'Echeance', type: 'date', visible: true, required: false, },
            {field: 'statut', label: "", header: 'Statut', type: 'dropdown', visible: true, required: false, },
            {field: 'commentaires', label: "", header: 'Commentaires', type: 'text', visible: true, required: false, },
            {field: 'reclamation', label: "", header: 'Reclamation', type: 'dropdown', visible: true, required: false, },
            {field: 'fichiers', label: "", header: 'Fichier', type: 'file', visible: true, required: false, },
            {field: 'audites', label: "", header: 'Source', type: 'string', visible: true, required: false, },

        ];
        this.tableCols = [
            {field: 'intitule', header: 'Intitulé', type: 'string', filter: true},
            {field: 'numeroReference', header: 'Réfrence', type: 'string', filter: true},
            {field: 'dateEcheance', header: 'Echeance', type: 'string', filter: true},
            {field: 'typeNonConformite', header: 'Type', type: 'string', filter: true},
            {field: 'priorite', header: 'Propriété', type: 'string', filter: true},
            {field: 'statut', header: 'Statut', type: 'string', filter: true},

        ];

        this.formGroup = this.fb.group({
            id: [null],
            intitule: [null, Validators.required],
            reclamationClientFournisseur: [null, Validators.required],
            typeProcessus: [null, Validators.required],
            nomProcessus: [null, Validators.required],
            origineProcessus: [null, Validators.required],
            emetteurProcessus: [null, Validators.required],
            dateProcessus: [null, Validators.required],
            gravityProcessus: [null, Validators.required],
            descriptionProcessus: [null, Validators.required],
            detailProcessus: [null, Validators.required],
            // causes: [null, Validators.required],
            // solutions: [null, Validators.required],
            // responsables: [null, Validators.required],
            // echeances: [null, Validators.required],
            processusDetails: this.fb.array([])
        });
        this.addProcessusDetail();
    }

   // Getter pour accéder au FormArray
   get processusDetails(): FormArray {
    return this.formGroup.get('processusDetails') as FormArray;
  }

  // Fonction pour créer un groupe "Causes - Solutions - Responsables - Échéances"
  createProcessusDetail(): FormGroup {
    return this.fb.group({
      ordre: [this.processusDetails.length + 1], // Numéro d'ordre automatique
      causes: [null, Validators.required],
      solutions: [null, Validators.required],
      responsables: [null, Validators.required],
      echeances: [null, Validators.required]
    });
  }

  // Ajouter un nouveau groupe
  addProcessusDetail() {
    this.processusDetails.push(this.createProcessusDetail());
  }

  // Supprimer un groupe (si plus d'un groupe)
  removeProcessusDetail(index: number) {
    if (this.processusDetails.length > 1) {
      this.processusDetails.removeAt(index);
    }
  }

    ngOnInit(): void {
        this.fetchNonConformite();
    }

    fetchNonConformite() {
        this.typeNonConformiteService.findAll().pipe(takeUntil(this.destroy$))
        .subscribe({
            next: res => {
                this.dataListTypeNonConformite = res.body || [];
            },
            error: error => {
                showToast(StatusEnum.error, error.status, null, this.messageService, error);
            }
        });
        this.nonConformiteService.findAll().pipe(takeUntil(this.destroy$))
            .subscribe({
                next: res => {
                    this.dataList = res.body || [];
                },
                error: error => {
                    showToast(StatusEnum.error, error.status, null, this.messageService, error);
                }
            });
        this.typeProcessusService.findAll().pipe(takeUntil(this.destroy$))
        .subscribe({
            next: res => {
                this.dataListTypeProcessus = res.body || [];
            },
            error: error => {
                showToast(StatusEnum.error, error.status, null, this.messageService, error);
            }
        });
        this.niveauNonConformiteService.findAll().pipe(takeUntil(this.destroy$))
        .subscribe({
            next: res => {
                this.dataListNiveauNonConformite = res.body || [];
            },
            error: error => {
                showToast(StatusEnum.error, error.status, null, this.messageService, error);
            }
        });
        this.actionNonConformiteService.findAll().pipe(takeUntil(this.destroy$))
        .subscribe({
            next: res => {
                this.dataListActionNonConformite = res.body || [];
            },
            error: error => {
                showToast(StatusEnum.error, error.status, null, this.messageService, error);
            }
        });
    }

    soumette() {
        console.log(this.formGroup.value);
        
    }

    onSuccess(res: HttpResponse<any>) {
        this.closeDialog = true;
        this.fetchNonConformite();
        showToast(StatusEnum.success, res.status, null, this.messageService);
    }

    onSave(object: NonConformite) {
        if (object.id != null || undefined) {
            this.nonConformiteService.update(object).pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: res => {
                        this.onSuccess(res);
                    }, error: error => {
                        showToast(StatusEnum.error, error.status, null, this.messageService, error);
                    }
                });
        } else {
            this.nonConformiteService.save(object).pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: res => {
                        this.onSuccess(res);
                    }, error: error => {
                        showToast(StatusEnum.error, error.status, null, this.messageService, error);
                    }
                });
        }
    }

    onDelete(nonConformite: NonConformite) {
        this.nonConformiteService.delete(nonConformite.id as string).pipe(takeUntil(this.destroy$))
            .subscribe({
                next: res => {
                    this.onSuccess(res);
                }, error: error => {
                    showToast(StatusEnum.error, error.status, null, this.messageService, error);
                }
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
    }
}
