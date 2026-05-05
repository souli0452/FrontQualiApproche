import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';

import { RoleService } from './role-service';
import { AppRole, Permission, TableColumn, FormGroupColumn, MultiSelectSelector } from '../../models';
import { NgPrimeModule } from '../../../prime-ng.module';
import { AppCrudGenericComponent } from '../../components/app-crud-generic/app-crud-generic.component';

@Component({
  selector: 'app-role',
  templateUrl: './role.component.html',
  styleUrl: './role.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    NgPrimeModule,
    FormsModule,
    ReactiveFormsModule,
    AppCrudGenericComponent
  ]
})
export class RoleComponent implements OnInit, OnDestroy {
    roles: AppRole[] = [];
    permissions: Permission[] = [];
    loading: boolean = false;
    destroy$: Subject<boolean> = new Subject<boolean>();

    roleForm: UntypedFormGroup;
    customButtons = [
        { label: 'Modifier', icon: 'pi pi-pencil', action: 'edit' }
    ];

    tableCols: TableColumn[] = [
        { field: 'name', header: 'Nom du Rôle', type: 'string', filter: true },
        { field: 'description', header: 'Description', type: 'string', filter: true }
    ];

    formCols: FormGroupColumn[] = [];
    multiSelectList: MultiSelectSelector[] = [];

    constructor(
        private roleService: RoleService,
        private fb: UntypedFormBuilder,
        private messageService: MessageService,
        private router: Router
    ) {
        this.roleForm = this.fb.group({
            id: [null],
            name: [null, Validators.required],
            description: [null],
            permissions: [[]]
        });
    }

    ngOnInit(): void {
        this.loadRoles();
    }

    ngOnDestroy(): void {
        this.destroy$.next(true);
        this.destroy$.complete();
    }

    goToDetail(id: string = 'new') {
        this.router.navigate(['/page/roles', id]);
    }

    loadRoles() {
        this.loading = true;
        this.roleService.getAllRoles()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (data) => {
                    this.roles = data;
                    this.loading = false;
                },
                error: () => {
                    this.loading = false;
                    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les rôles' });
                }
            });
    }

    handleCustomAction(event: any) {
        if (event.action === 'edit') {
            this.goToDetail(event.user.id);
        }
    }

    onDelete(role: AppRole) {
        this.roleService.deleteRole(role.id!).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Rôle supprimé' });
                this.loadRoles();
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Échec de la suppression' });
            }
        });
    }
}
