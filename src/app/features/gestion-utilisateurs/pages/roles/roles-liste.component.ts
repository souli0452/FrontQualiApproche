import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';

import { TableColumn, FormGroupColumn, MultiSelectSelector } from '../../../../models/generique.model';
import { NgPrimeModule } from '@prime-ng';
import { AppCrudGenericComponent } from '@shared';
import { AppRoleService, RoleService } from '../../services/role.service';
import { AppRole, Permission } from '../../models/role.model';
import { HeaderPage } from '../../../../shared/header-page/header-page';
import { BasePaginationComponent } from '../../../../shared/pagination/pagination';
import { AlertService } from '../../../../shared/alert-message/alert-message.service';

@Component({
  selector: 'app-roles-liste',
  templateUrl: './roles-liste.component.html',
  styleUrl: './roles-liste.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    NgPrimeModule,
    FormsModule,
    ReactiveFormsModule,
    AppCrudGenericComponent,
    HeaderPage
  ]
})
export class RolesListeComponent extends BasePaginationComponent implements OnInit, OnDestroy {
    
    permissions: Permission[] = [];
    // loading: boolean = false;
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
        private appRoleService: AppRoleService,
        private fb: UntypedFormBuilder,
        private messageService: MessageService,
        private router: Router,
        private alertService: AlertService
    ) {
        super()

        this.roleForm = this.fb.group({
            id: [null],
            name: [null, Validators.required],
            description: [null],
            permissions: [[]]
        });
    }

    breadcrumbs = [
        { label: 'Tableau de bord', routerLink: '/' },
        { label: 'Roles', routerLink: '/roles' },
        { label: 'Utilisateurs', routerLink: '/utilisateurs' }
    ];

    ngOnInit(): void {
        this.fetchObject();
    }

    ngOnDestroy(): void {
        this.destroy$.next(true);
        this.destroy$.complete();
    }

    goToDetail(id: string = 'create') {
        this.router.navigate(['/roles', id]);
    }

    fetchObject(): void {
        this.loading = true;
        this.appRoleService
            .getAllRoles(this.currentPage, this.pageSize)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (resp) => {
                    this.applyPagination(resp);
                },
                error: (error) => {
                    this.alertService.showError('Impossible de charger les rôles');
                    this.loading = false;
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
                this.alertService.showSuccess('Rôle supprimé');
                this.fetchObject();
            },
            error: (error) => {
                this.alertService.showError('Échec de la suppression');
            }
        });
    }
}

export { RolesListeComponent as RoleComponent };
