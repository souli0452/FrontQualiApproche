import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';

import { AppRole, Permission, TableColumn, FormGroupColumn, MultiSelectSelector, ApiResponse } from '../../../models';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { AppCrudGenericComponent } from '../../../components/app-crud-generic/app-crud-generic.component';
import { RoleService } from '../role-service/role-service';

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
    totalElements: number = 0;
    currentPage: number = 0;
    pageSize: number = 0;
    totalPages: number = 0;
    
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
        this.router.navigate(['/configurations/roles', id]);
    }

    loadRoles(page: number = 0, size: number = 10) {
        this.loading = true;
        this.roleService
            .getAllRoles()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (resp: ApiResponse<AppRole>) => {
                    // On extrait le tableau 'content' depuis la réponse
                    this.roles = resp.data.content || [];
                    this.totalElements = resp.data.totalElements;
                    this.currentPage = resp.data.pageNumber || 0;
                    this.pageSize = resp.data.pageSize;
                    this.totalPages = resp.data.totalPages;
                    this.loading = false;
                },
                error: (error: any) => {
                    this.loading = false;
                    console.error('Erreur lors du chargement des rôles', error);
                    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les rôles' });
                }
            });
    }

    onPageChange(event: { page: number, size: number }) {
        this.loadRoles(event.page, event.size);
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
