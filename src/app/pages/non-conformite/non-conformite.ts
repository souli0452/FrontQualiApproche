import { CommonModule, DatePipe } from '@angular/common';
import { Component, LOCALE_ID } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ActionNonConformite, Fichier, FormGroupColumn, NiveauNonConformite, NonConformite, TableColumn, TypeNonConformite, TypeProcessus } from '../../models';
import { FormArray, FormGroup, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { showToast, StatusEnum } from '../../utils';
import { HttpResponse } from '@angular/common/http';
import { AppCrudGenericComponent } from '../../components/app-crud-generic/app-crud-generic.component';
import { NonConformiteService } from '../../services/non-conformite.service';
import { TypeNonConformiteService } from '../../services/type-non-conformite.service';
import { NiveauNonConformiteService } from '../../services/niveau-non-conformite.service';
import { ActionNonConformiteService } from '../../services/action-non-conformite.service';
import { TypeProcessusService } from '../../services/type-processus.service';
import { NgPrimeModule } from '../../../prime-ng.module';
import { FileUploadComponent } from "../../components/file-upload/file-upload.component";


@Component({
    selector: 'app-non-conformite',
    standalone: true,
    imports: [CommonModule, NgPrimeModule, AppCrudGenericComponent, FileUploadComponent],
    templateUrl: './non-conformite.html',
    styleUrl: './non-conformite.scss',
    providers: [MessageService, DatePipe]
})
export class NonConformiteComponent {

    // Code pour manipuler les fichiers ajoutés
    uploadedFiles: any[] = [];

    formattedDate: string | any;
    
    handleFileUpload(files: any[]) {
        this.uploadedFiles = files;
        // Tu peux envoyer ces fichiers au serveur ou les manipuler ici
    }
    // Code pour manipuler les fichiers ajoutés
      
    // Code pour afficher le DRAWER de validation des informations
    visibilityDetails: boolean = false;
    // Code pour afficher le DRAWER de validation des informations


    // Code pour afficher le formulaire des non-conformité
    visibilityNonConformiyForm: boolean = false;
    showDialogNonConformity() {
        this.visibilityNonConformiyForm = true;
    }
    // Code pour afficher le formulaire des non-conformité

    loading: boolean = true;
    destroy$: Subject<boolean> = new Subject<boolean>();
    // Tableau des non-conformités
    dataList: NonConformite[] = [];
    // Tableau des TYPES de non-conformité
    dataListTypeNonConformite: TypeNonConformite[] = [];
    // Tableau des NIVEAUX de non-conformité
    dataListNiveauNonConformite: NiveauNonConformite[] = [];
    // Tableau des ACTIONS de non-conformité
    dataListActionNonConformite: ActionNonConformite[] = [];
    // Tableau des PROCESSUS de non-conformité
    dataListTypeProcessus: TypeProcessus[] = [];
    closeDialog = false;
    formGroup: UntypedFormGroup;
    tableCols: TableColumn[];
    formCols: FormGroupColumn[];
    pageLabel = 'Non-conformité';
    formHeader = 'Création et mise à jour d\'une non-conformité';

    constructor(protected fb: UntypedFormBuilder,
                protected messageService: MessageService,
                protected nonConformiteService: NonConformiteService,
                protected typeNonConformiteService: TypeNonConformiteService,
                protected niveauNonConformiteService: NiveauNonConformiteService,
                protected actionNonConformiteService: ActionNonConformiteService,
                protected typeProcessusService: TypeProcessusService,
                private datePipe: DatePipe
            ) {
        this.formCols = [
            {field: 'id', label: "", header: 'Id', type: 'string', visible: false, required: false},
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
            {field: 'numeroReference', header: 'Réference', type: 'string', filter: true},
            {field: 'nomProcessus', header: 'Nom du processus', type: 'string', filter: true},
            {field: 'delaisMiseOeuvre', header: 'Délais de mise en oeuvre', type: 'string', filter: true},
            {field: 'origineService', header: 'Origine (Service)', type: 'string', filter: true},
            {field: 'niveauNonConformiteId', header: 'Niveau', type: 'string', filter: true},
            {field: 'status', header: 'Statut', type: 'string', filter: true},

        ];

        this.formGroup = this.fb.group({
            id: [null],
            nomProcessus: [null, Validators.required],
            origineService: [null, Validators.required],
            fonctionEmetteur: [null, Validators.required],
            justification: [null, Validators.required],
            niveauNonConformiteId: [null, Validators.required],
            actionId: [null, Validators.required],
            typeNonConformiteId: [null, Validators.required],
            typeProcessusId: [null, Validators.required],
            planActions: this.fb.array([])
        });
        this.addPlanAction();
    }

   // Getter pour accéder au FormArray
   get planActions(): FormArray {
    return this.formGroup.get('planActions') as FormArray;
  }
  // Fonction pour créer un groupe "Causes - Solutions - Responsables - Échéances"
  createPlanAction(): FormGroup {
    return this.fb.group({
      ordre: [this.planActions.length + 1], // Numéro d'ordre automatique
      causeIdentifiees: [null, Validators.required],
      solutionRetenues: [null, Validators.required],
      responsable: [null, Validators.required],
      email: [null, Validators.required],
      numeroTelephone: [null, Validators.required],
      dateEcheance: [this.formattedDate]
    });
  }

    // Appliquer formatDateRange sur la valeur de dateEcheance
    setDateEcheance(dates: Date[]): void {
        this.planActions.get('dateEcheance')?.setValue(dates);
    }

    getFormattedDateRange(): string {
        const dates = this.planActions.get('dateEcheance')?.value;
        return this.formatDateRange(dates);
      }
  
  // Ajouter un nouveau groupe
  addPlanAction() {
    this.planActions.push(this.createPlanAction());
  }
  // Supprimer un groupe (si plus d'un groupe)
  removePlanAction(index: number) {
    if (this.planActions.length > 1) {
      this.planActions.removeAt(index);
    }
  }


    ngOnInit(): void {
        this.fetchNonConformite();
    }
    // Code pour le formatage de la date pour affichage dans le tableau des confirmations
    formatDateRange(dates: Date[]): string {
        if (!Array.isArray(dates) || dates.length !== 2) return 'Dates invalides';
      
        const format = (date: Date): string => {
          if (!(date instanceof Date) || isNaN(date.getTime())) return 'Date invalide';
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          return `${day}-${month}-${year}`;
        };
      
        const start = format(dates[0]);
        const end = format(dates[1]);
      
        return `${start} - ${end}`;
    }
    // Code pour le formatage de la date pour affichage dans le tableau des confirmations



    // Code pour afficher les libellés au lieu des ID
    getLibelleById(list: { id: string; libelle: string }[], id: string): string {
        const item = list.find(e => e.id === id);
        return item ? item.libelle : id;
    }
    // Code pour afficher les libellés au lieu des ID


    // Code pour récupérer les Non-conformités / les Types, Processus et autres
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
    // Code pour récupérer les Non-conformités / les Types, Processus et autres


    // Code pour afficher le tableau des vérifications après soumission du formulaire des non-conformités
    verification() {
        this.visibilityDetails = true;
    }
    // Code pour afficher le tableau des vérifications après soumission du formulaire des non-conformités


    // Code pour soumettre le formulaire de non-conformité après la vérification
    // Convertir d'abord les fichiers en base64
    convertFilesToBase64(files: { file: File; extension: string; name: string; size: string; loading: boolean; icon: string }[]): Promise<any[]> {
        const filePromises = files.map((fileObj) => {
            return new Promise((resolve, reject) => {
                const file = fileObj.file;
                if (file instanceof File) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const base64String = reader.result as string;
                        resolve({
                            fichierBase64: base64String.split(',')[1],
                            nomFichier: file.name,
                            typeFichier: file.type
                        });
                    };
                    reader.onerror = (error) => reject(error);
                    reader.readAsDataURL(file);
                } else {
                    reject(new Error('L\'élément n\'est pas un fichier valide'));
                }
            });
        });
        return Promise.all(filePromises);
    }
    // Convertir d'abord les fichiers en base64


    // Convertir les date au format voulu
    onDateSelect(event: any) {
        this.formattedDate = this.datePipe.transform(event, 'dd-MM-yyyy');
    }

      
    soumission() {
        const formValue = this.formGroup.value;
        const allDates: Date[] = [];
        const planActionsFormatted = formValue.planActions.map((action: any) => {

            const [start, end] = action.dateEcheance || [];
            if (start) allDates.push(new Date(start));
            if (end) allDates.push(new Date(end));

            return {
              ...action,
              dateEcheance: this.formatDateRange(action.dateEcheance)
            };
        });

        // Trier les dates pour trouver la première et la dernière
        allDates.sort((a, b) => a.getTime() - b.getTime());
        const delaisExecution = allDates.length >= 2
        ? `Du ${this.datePipe.transform(allDates[0], 'dd-MM-yyyy')} au ${this.datePipe.transform(allDates[allDates.length - 1], 'dd-MM-yyyy')}`
        : 'Dates incomplètes';

        const files = this.uploadedFiles;
        this.convertFilesToBase64(files).then((convertedFiles) => {
            const nonConformite: NonConformite = {
                ...this.formGroup.value,
                fichiers: convertedFiles,
                planActions: planActionsFormatted,
                delaisMiseOeuvre: delaisExecution
            };
            this.nonConformiteService.save(nonConformite).pipe(takeUntil(this.destroy$))
            .subscribe({
                next: res => {
                    this.onSuccess(res);
                }, error: error => {
                    showToast(StatusEnum.error, error.status, null, this.messageService, error);
                }
            });
            // console.log('NonConformite:', nonConformite);
        }).catch(error => {
            console.log(error);
        });
    }
    // Code pour soumettre le formulaire de non-conformité après la vérification



    // Contenu plus ou moins facultatif
    onSuccess(res: HttpResponse<any>) {
        this.visibilityDetails = false;
        this.visibilityNonConformiyForm = false;
        this.fetchNonConformite();
        this.messageService.add({ severity: 'success', summary: 'succès', detail: 'Nouvelle non conformité enregistrée.', life: 10000 });
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
    // Contenu plus ou moins facultatif

    ngOnDestroy(): void {
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
    }
    
}
