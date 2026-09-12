import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, finalize, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';

import { NgPrimeModule } from '@prime-ng';
import { AppRoleService, RoleService } from '../../services/role.service';
import { ApiResponse } from '../../../../models/response.model';
import { AppRole, Permission } from '../../models/role.model';
import { HeaderPage } from '../../../../shared/header-page/header-page';
import { AlertService } from '../../../../shared/alert-message/alert-message.service';
import { LicenceOuverteDirective } from '@shared/licence/licence-ouverte.directive';

interface GroupedPermission {
    module: string;
    permissions: Permission[];
    allSelected: boolean;
}

@Component({
    selector: 'app-role-detail',
    templateUrl: './role-detail.component.html',
    styleUrl: './role-detail.component.scss',
    standalone: true,
    imports: [
        CommonModule, 
        NgPrimeModule, 
        FormsModule, 
        ReactiveFormsModule, 
        LicenceOuverteDirective,
        HeaderPage
    ]
})
export class RoleDetailComponent implements OnInit, OnDestroy {
    roleForm: UntypedFormGroup;
    groupedPermissions: GroupedPermission[] = [];
    loading: boolean = false;
    isEdit: boolean = false;
    destroy$: Subject<boolean> = new Subject<boolean>();
    breadcrumbs = [
        { label: 'Tableau de bord', routerLink: '/' },
        { label: 'Roles', routerLink: '/roles' },
        { label: 'Utilisateurs', routerLink: '/utilisateurs' }
    ];

    constructor(
        private fb: UntypedFormBuilder,
        private roleService: RoleService,
        private appRoleService: AppRoleService,
        private messageService: MessageService,
        private route: ActivatedRoute,
        private router: Router,
        private alertService: AlertService
    ) {
        this.roleForm = this.fb.group({
            id: [null],
            name: [null, Validators.required],
            description: [null],
            permissions: [[]]
        });
    }

    ngOnInit(): void {
        const roleId = this.route.snapshot.params['id'];
        this.loadPermissionsAndRole(roleId);
        if (this.isEdit) {
            this.breadcrumbs[2] = { label: 'Modifier le rôle', routerLink: '' };
        }
    }
    ngOnDestroy(): void {
        this.destroy$.next(true);
        this.destroy$.complete();
    }

    loadPermissionsAndRole(roleId: string | null) {
        this.loading = true;
        this.appRoleService
            .getPermissionsDictionary()
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => {
                    if (!this.isEdit) this.loading = false;
                })
            )
            .subscribe({
                next: (permissions) => {
                    this.groupPermissions(permissions);

                    if (roleId && roleId !== 'create') {
                        this.isEdit = true;
                        this.loadRole(roleId);
                    } else {
                        this.loading = false;
                    }
                },
                error: () => {
                    this.loading = false;
                    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les permissions' });
                }
            });
    }

    groupPermissions(permissions: Permission[]) {
        const groups = permissions.reduce(
            (acc, p) => {
                if (!acc[p.module]) acc[p.module] = [];
                acc[p.module].push(p);
                return acc;
            },
            {} as Record<string, Permission[]>
        );

        this.groupedPermissions = Object.keys(groups).map((module) => ({
            module,
            permissions: groups[module],
            allSelected: false
        }));
    }

    loadRole(id: string) {
        this.appRoleService
            .getAllRoles()
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => (this.loading = false))
            )
            .subscribe({
                next: (resp: ApiResponse<AppRole>) => {
                    // On extrait le tableau depuis la réponse paginée
                    const rolesArray = resp.data.content || [];
                    
                    const role = rolesArray.find((r) => r.id === id);
                    console.log("le role est : ", role);
                    
                    if (role) {
                        this.roleForm.patchValue(role);
                        this.updateAllSelectedStatus();
                    }
                },
                error: () => {
                    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les données du rôle' });
                }
            });
    }




    toggleModule(group: GroupedPermission, event: any) {
        const isChecked = event.checked;
        let selected = [...this.roleForm.value.permissions];
        const moduleValues = group.permissions.map((p) => p.value);

        if (!isChecked) {
            // Tout désélectionner pour ce module
            selected = selected.filter((v) => !moduleValues.includes(v));
        } else {
            // Tout sélectionner
            moduleValues.forEach((v) => {
                if (!selected.includes(v)) selected.push(v);
            });
        }

        group.allSelected = isChecked;
        this.roleForm.patchValue({ permissions: selected });
    }

    updateAllSelectedStatus() {
        const selected = this.roleForm.value.permissions || [];
        this.groupedPermissions.forEach((group) => {
            if (group.permissions && group.permissions.length > 0) {
                group.allSelected = group.permissions.every((p) => selected.includes(p.value));
            } else {
                group.allSelected = false;
            }
        });
    }


    save() {
        if (this.roleForm.invalid) {
            this.alertService.showWarning('Veuillez renseigner le nom du rôle.');
            return;
        }

        this.loading = true;
        
        // Si isEdit est vrai -> updateRole, sinon createRole
        const request$ = this.isEdit
            ? this.appRoleService.updateRole(this.roleForm.value)
            : this.appRoleService.createRole(this.roleForm.value);

        request$.pipe(takeUntil(this.destroy$)).subscribe({
            next: () => {
                this.alertService.showSuccess(this.isEdit ? 'Rôle modifié avec succès' : 'Rôle créé avec succès');
                this.router.navigate(['/roles']);
            },
            error: (error: any) => { // 👈 Ajouter ': any' ici
                this.loading = false;
                console.error("Erreur lors de l'enregistrement du rôle :", error);
                this.alertService.showError(error?.error?.detail || error?.error?.message || "Échec de l'enregistrement");
            }
        });
    }


    cancel() {
        this.router.navigate(['/roles']);
    }
}
