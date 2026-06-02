import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { HttpResponse } from '@angular/common/http';
import { AppCrudGenericComponent } from '../../../components/app-crud-generic/app-crud-generic.component';
import { ActionNonConformite, FormGroupColumn, TableColumn } from '../../../models';
import { showToast, StatusEnum } from '../../../utils';
import { ActionNonConformiteService } from '../../../services/non-conformite/action-non-conformite.service';

@Component({
    selector: 'app-action',
    standalone: true,
    imports: [CommonModule, AppCrudGenericComponent],
    template: `
        <div class="page-layout">
            <app-crud-generic
                [addButtonLabel]="addButtonLabel"
                [dialogWidth]="'40rem'"
                [loading]="loading"
                [pageLabel]="pageLabel"
                [tableCols]="tableCols"
                [listeObject]="dataList"
                [formGroup]="formGroup"
                [formCols]="formCols"
                [isAffich]="true"
                [closeDialog]="closeDialog"
                [formHeader]="formHeader"
                (newItemEvent)="onSave($event)"
                (removeEvent)="onDelete($event)">
            </app-crud-generic>
    </div>
    `
})
export class ActionNonConformiteComponent {
    loading: boolean = true;
      destroy$: Subject<boolean> = new Subject<boolean>();
      dataList: ActionNonConformite[] = [];
      closeDialog = false;
      formGroup: UntypedFormGroup;
      tableCols: TableColumn[];
      formCols: FormGroupColumn[];
      pageLabel = 'Types actions entreprises';
      formHeader = 'Création et mise à jour d\'une action';
      addButtonLabel = "Nouveau type d'action";

      constructor(protected fb: UntypedFormBuilder,
                  protected messageService: MessageService,
                  protected actionNonConformiteService: ActionNonConformiteService) {
          this.formCols = [
              {field: 'id', label: "", header: 'Id', type: 'number', visible: false, required: false},
              {field: 'libelle', label: "Libellé de l'action (Action préventive - Action corrective)", header: 'Libellé', type: 'string', visible: true, required: true},
              {field: 'description', label: "Description de l'action", header: 'Description', type: 'text', visible: true, required: false}
          ];

          this.tableCols = [
              {field: 'libelle', header: 'Libellé', type: 'string', filter: true},
              {field: 'description', header: 'Description', type: 'string', filter: true},
              {field: 'createdAt', header: 'Date de création', type: 'string', filter: true},
              {field: 'updatedAt', header: 'Date de modification', type: 'string', filter: true}
          ];

          this.formGroup = this.fb.group({
              id: [null],
              libelle: [null, Validators.required],
              description: [null],
            //  audites: [null, Validators.required]

          });
      }

      ngOnInit(): void {
          this.fetchObject();
      }

      fetchObject() {
        this.loading = true;
          this.actionNonConformiteService.findAll().pipe(takeUntil(this.destroy$))
              .subscribe({
                  next: res => {
                      this.dataList = res.body || [];
                      this.loading = false;
                  },
                  error: error => {
                    this.loading = false;
                      showToast(StatusEnum.error, error.status, null, this.messageService, error);
                  }
              });
      }

      onSuccess(res: HttpResponse<any>) {
          this.closeDialog = true;
          this.fetchObject();
          showToast(StatusEnum.success, res.status, null, this.messageService);
      }

      onSave(object: ActionNonConformite) {
          if (object.id != null || undefined) {
              this.actionNonConformiteService.update(object).pipe(takeUntil(this.destroy$))
                  .subscribe({
                      next: res => {
                          this.onSuccess(res);
                      }, error: error => {
                          showToast(StatusEnum.error, error.status, null, this.messageService, error);
                      }
                  });
          } else {
              this.actionNonConformiteService.save(object).pipe(takeUntil(this.destroy$))
                  .subscribe({
                      next: res => {
                          this.onSuccess(res);
                      }, error: error => {
                          showToast(StatusEnum.error, error.status, null, this.messageService, error);
                      }
                  });
          }
      }

      onDelete(action: ActionNonConformite) {
          this.actionNonConformiteService.delete(action.id).pipe(takeUntil(this.destroy$))
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
