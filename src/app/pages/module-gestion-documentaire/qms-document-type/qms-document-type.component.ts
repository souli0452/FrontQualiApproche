import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { AppCrudGenericComponent } from '../../../components/app-crud-generic/app-crud-generic.component';
import { QmsDocumentService } from '../../../services/module-gestion-documentaire/qms-document.service';
import { showToast, StatusEnum } from '../../../utils/global/global-utils';
import { DropdownSelector, FormGroupColumn, TableColumn } from '../../../models/generique.model';
import { QmsDocumentType } from '../../../models/gestion-documentaire.model';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { NgxPermissionsModule, NgxPermissionsService } from 'ngx-permissions';
import { WorkflowService } from '../../../services/workflow.service';

@Component({
    selector: 'app-qms-document-type',
    standalone: true,
    imports: [CommonModule, AppCrudGenericComponent, NgPrimeModule, NgxPermissionsModule],
    providers: [MessageService],
    template: `
        <p-toast></p-toast>
        <div class="page-layout">
            <app-crud-generic
                [addButtonLabel]="'Nouveau type de document'"
                [dialogWidth]="'40rem'"
                [loading]="loading"
                [pageLabel]="pageLabel"
                [tableCols]="tableCols"
                [listeObject]="dataList"
                [formGroup]="formGroup"
                [formCols]="formCols"
                [dropdownList]="dropdownList"
                [isAffich]="true"
                [closeDialog]="closeDialog"
                [formHeader]="formHeader"
                (newItemEvent)="onSave($event)"
                (removeEvent)="onDelete($event)"
                [totalElements]="totalElements"
                [isPagination]="false"
                [currentPage]="currentPage"
                [pageSize]="pageSize"
                (pageChangeEvent)="onPageChange($event)"
                [consultation]="!hasWritePermission()"
                [notModif]="!hasWritePermission()"
                [notDelete]="!hasDeletePermission()"
                >
            </app-crud-generic>
        </div>
    `
})
export class QmsDocumentTypeComponent {
    loading: boolean = true;
    destroy$: Subject<boolean> = new Subject<boolean>();
    dataList: QmsDocumentType[] = [];
    totalElements: number = 0;
    currentPage: number = 0;
    pageSize: number = 5;
    totalPages: number = 0;

    closeDialog = false;
    formGroup: UntypedFormGroup;
    /** Circuits proposés : ceux des documents, seuls applicables à un type de document. */
    dropdownList: DropdownSelector[] = [];
    private circuitDropdown: DropdownSelector = { field: 'workflowId', dropdownEntries: [] };
    private nomParCircuit = new Map<string, string>();
    tableCols: TableColumn[];
    formCols: FormGroupColumn[];
    pageLabel = 'Configuration des Types de Document QMS';
    formHeader = 'Création et mise à jour d\'un type de document';

    constructor(protected fb: UntypedFormBuilder,
        protected messageService: MessageService,
        protected qmsService: QmsDocumentService,
        private workflowService: WorkflowService,
        private ngxPermissionsService: NgxPermissionsService) {
        this.formCols = [
            { field: 'id', label: "", header: 'Id', type: 'string', visible: false, required: false },
            { field: 'code', label: "Code du type (ex: PRO, INS, ENR)", header: 'Code', type: 'string', visible: true, required: true },
            { field: 'libelle', label: "Libellé (ex: Procédure, Instruction)", header: 'Libellé', type: 'string', visible: true, required: true },
            { field: 'folderName', label: "Nom du dossier dans Alfresco", header: 'Dossier Alfresco', type: 'string', visible: true, required: true },
            // Sans ce champ, aucun type ne pouvait désigner son circuit : la création de document
            // retombait systématiquement sur le circuit actif, quel que soit le type.
            { field: 'workflowId', label: "Circuit de validation appliqué aux documents de ce type", header: 'Circuit', type: 'dropdown', visible: true, required: false }
        ];

        this.tableCols = [
            { field: 'code', header: 'Code', type: 'string', filter: true },
            { field: 'libelle', header: 'Libellé', type: 'string', filter: true },
            { field: 'folderName', header: 'Dossier sur minio', type: 'string', filter: true },
            { field: 'workflowNom', header: 'Circuit de validation', type: 'string', filter: true },
            { field: 'createdAt', header: 'Date de création', type: 'string', filter: true }
        ];

        this.formGroup = this.fb.group({
            id: [null],
            code: [null, Validators.required],
            libelle: [null, Validators.required],
            folderName: [null, Validators.required],
            workflowId: [null]
        });
    }

    hasWritePermission(): boolean {
        return true;
    }

    hasDeletePermission(): boolean {
        return true;
    }

    ngOnInit(): void {
        this.dropdownList.push(this.circuitDropdown);
        this.chargerCircuits();
        this.fetchObject();
    }

    /**
     * Circuits applicables à un type de document.
     *
     * <p>Restreint aux circuits de type DOCUMENT : les circuits de non-conformité ou de plan
     * d'action ne peuvent pas piloter un document, et les proposer inviterait à reproduire
     * l'incohérence qui rendait les notifications impossibles.</p>
     *
     * <p>Un circuit désigné ici doit être <b>actif</b> pour servir : le moteur refuse d'ouvrir un
     * circuit désactivé, quand bien même un type le nommerait. Plusieurs circuits documentaires
     * actifs à la fois sont donc normaux — c'est ce que produit un circuit par type. Le plus ancien
     * fait office de repli pour les types qui n'en désignent aucun.</p>
     *
     * <p>Un circuit désactivé reste proposé — on peut l'attribuer puis l'activer — mais l'étiquette
     * le dit : le laisser tel quel ferait échouer le dépôt des documents de ce type.</p>
     */
    private chargerCircuits(): void {
        this.workflowService.getWorkflowsByType('DOCUMENT')
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (circuits) => {
                    this.nomParCircuit = new Map(circuits.map((c) => [c.id!, c.nom]));
                    this.circuitDropdown.dropdownEntries = circuits.map((c) => ({
                        value: c.id,
                        label: c.actif ? c.nom : `${c.nom} — désactivé, à réactiver pour servir`
                    }));
                    this.dropdownList = [...this.dropdownList];
                    this.decorerListe();
                },
                error: () => console.warn('Circuits de validation indisponibles.')
            });
    }

    /** Nom du circuit affiché en clair dans le tableau, l'identifiant ne disant rien. */
    private decorerListe(): void {
        this.dataList = this.dataList.map((type) => ({
            ...type,
            workflowNom: type.workflowId ? (this.nomParCircuit.get(type.workflowId) ?? '—') : '—'
        })) as QmsDocumentType[];
    }

    fetchObject() {
        this.loading = true;
        this.qmsService.typeDocumentQmsGetAll(this.currentPage, this.pageSize).pipe(takeUntil(this.destroy$))
            .subscribe({
                next: res => {
                    this.dataList = res.data.content || [];
                    this.decorerListe();
                    // On garde la trace du total pour la pagination
                    this.totalElements = res.data.totalElements;
                    this.currentPage = res.data.pageNumber;
                    this.pageSize = res.data.pageSize;
                    this.loading = false;
                },
                error: error => {
                    this.loading = false;
                    showToast(StatusEnum.error, error.status, null, this.messageService, error);
                }
            });
    }

    onPageChange(event: { page: number, size: number }) {
        this.currentPage = event.page;
        this.pageSize = event.size;

        this.fetchObject();
    }

    onSuccess(res: any) {
        this.closeDialog = true;
        this.fetchObject();
        this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Opération réussie' });
    }

    onSave(object: QmsDocumentType) {
        if (object.id != null) {
            this.qmsService.typeDocumentQmsUpdate(object.id, object).pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: res => {
                        this.onSuccess(res);
                    }, error: error => {
                        showToast(StatusEnum.error, error.status, null, this.messageService, error);
                    }
                });
        } else {
            this.qmsService.typeDocumentQmsCreate(object).pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: res => {
                        this.onSuccess(res);
                    }, error: error => {
                        showToast(StatusEnum.error, error.status, null, this.messageService, error);
                    }
                });
        }
    }

    onDelete(type: QmsDocumentType) {
        this.qmsService.typeDocumentQmsDelete(type.id!).pipe(takeUntil(this.destroy$))
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
