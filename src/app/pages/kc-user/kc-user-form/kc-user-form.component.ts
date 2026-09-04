import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';

import { AuthService } from '../../../services/auth-services/auth.service';
import { StructureService } from '../../parametrages/structure/structure.service';
import { AppRoleService } from '../../role/role-service/role.service';
import { TypeStructure } from '../../../enums/enums';
import { FormGroupColumn, DropdownSelector, MultiSelectSelector } from '../../../models/generique.model';
import { FormPageComponent, QuickTip } from '../../../shared/form-page/form-page.component';
import { HeaderPage } from '../../../shared/header-page/header-page';
import { AlertMessageComponent } from '../../../shared/alert-message/alert-message.component';
import { showToast, StatusEnum } from '../../../utils/global/global-utils';
import { ApiResponse } from '../../../models/response.model';
import { AppRole } from '../../../models/role.model';
import { AlertService } from '../../../shared/alert-message/alert-message.service';

@Component({
    selector: 'app-kc-user-form',
    standalone: true,
    imports: [CommonModule, FormPageComponent, HeaderPage],
    template: `
        <app-header-page 
            [title]="'Utilisateur'" 
            [subtitle]="isEditMode ? 'Modifier les informations.' : 'Création d\\'un nouvel utilisateur.'"
            [breadcrumbs]="breadcrumbs"
            [buttonText]="'Retour à la liste'" 
            buttonIcon="pi pi-arrow-left"
            (actionClick)="goBack()"
        />
        <div class="page-layout mt-4">
            <app-form-page
                [title]="isEditMode ? 'Modifier l\\'utilisateur' : 'Nouvel utilisateur'"
                [subtitle]="'Veuillez renseigner les informations ci-dessous. Les champs marqués d\\'un astérisque sont obligatoires.'"
                [icon]="isEditMode ? 'pi-user-edit' : 'pi-user-plus'"
                [formGroup]="editForm!"
                [formCols]="formCols"
                [dropDownObject]="dropDownObject"
                [multiselectObject]="multiSelectObject"
                [quickTips]="quickTips"
                [quickTipsTitle]="'Conseils rapides'"
                [submitLabel]="isEditMode ? 'Mettre à jour' : 'Enregistrer'"
                [isSubmitting]="isSubmitting"
                (onCancel)="goBack()"
                (onSubmit)="save()">
            </app-form-page>
        </div>
    `
})
export class KcUserFormComponent implements OnInit, OnDestroy {
    destroy$: Subject<boolean> = new Subject<boolean>();
    editForm?: UntypedFormGroup;
    formCols: FormGroupColumn[] = [];
    dropDownObject: any = {};
    multiSelectObject: any = {};
    
    structures: { value: any; label: any }[] = [];
    rolesEntries: { value: any; label: any }[] = [];
    
    isEditMode: boolean = false;
    isSubmitting: boolean = false;
    userId?: number;
    breadcrumbs: any[] = [];
    userDataFromState: any;
    allUsers: any[] = []; // Used for checking duplicates

    quickTips: QuickTip[] = [
        { text: "L'email renseigné doit être valide, car il servira pour toutes les communications." },
        { text: "Le nom d'utilisateur sert d'identifiant de connexion. Vous pouvez utiliser une adresse e-mail ou un texte simple (les espaces sont interdits, utilisez des tirets si besoin)." },
        { text: "L'utilisateur doit obligatoirement être rattaché à une structure et posséder au moins un rôle pour accéder au système." },
        { text: "N'oubliez pas d'activer le compte pour autoriser la connexion, ou de le désactiver pour bloquer temporairement l'accès." }
    ];

    constructor(
        private fb: UntypedFormBuilder,
        private activatedRoute: ActivatedRoute,
        private router: Router,
        private authService: AuthService,
        private structureService: StructureService,
        private appRoleService: AppRoleService,
        private alertService: AlertService,
    ) {
        const navigation = this.router.getCurrentNavigation();
        if (navigation?.extras?.state) {
            this.userDataFromState = navigation.extras.state['userData'];
        }
        
        this.breadcrumbs = [
            { label: 'Tableau de bord', routerLink: '/' },
            { label: 'Rôle', routerLink: '/roles' },
            { label: 'Utilisateurs', routerLink: '/utilisateurs' }
        ];
    }

    ngOnInit() {
        this.initForm();
        this.buildFormCols();
        this.loadStuctures();
        this.loadRoles();
        this.fetchUsers(); // Just to get the list for duplicate checking

        this.activatedRoute.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
            if (params['id']) {
                this.isEditMode = true;
                this.userId = +params['id'];
                this.buildFormCols();
                
                if (this.userDataFromState) {
                    this.patchUserData(this.userDataFromState);
                } else {
                    this.loadUserFallback(this.userId);
                }
            }
        });
    }

    patchUserData(user: any) {
        if (user) {
            this.editForm?.patchValue(user);
        }
    }

    loadUserFallback(id: number) {
        this.authService.getAllUsers(0, 1000).pipe(takeUntil(this.destroy$)).subscribe({
            next: (res: any) => {
                const users = res.data?.content || [];
                const user = users.find((u: any) => u.id === id || u.id === id.toString());
                if (user) {
                    this.patchUserData(user);
                } else {
                    this.alertService.showError("Utilisateur introuvable.");
                    this.goBack();
                }
            },
            error: (error: any) => {
                this.alertService.showError("Impossible de charger les informations.");
                this.goBack();
            }
        });
    }
    
    fetchUsers() {
        this.authService.getAllUsers(0, 1000).pipe(takeUntil(this.destroy$)).subscribe({
            next: (res: any) => {
                this.allUsers = res.data?.content || [];
            }
        });
    }

    initForm() {
        this.editForm = this.fb.group({
            id: [null],
            username: [null, Validators.required],
            enabled: [false],
            firstName: [null, Validators.required],
            structure: [null, Validators.required],
            roles: [[], Validators.required],
            fonction: [null, Validators.required],
            lastName: [null, Validators.required],
            email: [null, [Validators.required, Validators.email]]
        });
    }

    buildFormCols() {
        this.formCols = [
            { field: 'id', header: 'Id', type: 'string', visible: false, required: false },

            { type: 'section', header: 'Informations Professionnelles', class: 'col-12', visible: true },
            { field: 'structure', header: 'Structure de rattachement', placeholder: 'Sélectionnez une structure', helpText: 'Processus ou unité administrative', type: 'dropdown', visible: true, required: true, class: 'col-12' },
            { field: 'roles', header: 'Rôles', placeholder: 'Sélectionnez les rôles', helpText: "Le rôle est associé aux permissions de l'utilisateur", type: 'multiselect', visible: true, required: true, class: 'col-12 md:col-6' },
            { field: 'fonction', header: 'Fonction', placeholder: 'Entrez la fonction', helpText: 'Poste occupé au sein de la structure', type: 'string', visible: true, required: true, class: 'col-12 md:col-6' },
            
            { type: 'section', header: 'Informations Personnelles', class: 'col-12', visible: true },
            { field: 'firstName', header: 'Prénom', placeholder: 'Entrez le prénom', type: 'string', visible: true, required: true, class: 'col-12 md:col-6' },
            { field: 'lastName', header: 'Nom', placeholder: 'Entrez le nom', type: 'string', visible: true, required: true, class: 'col-12 md:col-6' },
            { field: 'email', header: 'Email', type: 'string', visible: true, required: true, helpText:'Ex: [EMAIL_ADDRESS]', class: 'col-12 md:col-6' },
            { field: 'username', header: "Nom d'utilisateur", type: 'string', visible: true, required: true, helpText:'Utilisé pour la connexion', class: 'col-12 md:col-6' },
            
            { type: 'section', header: "Activation de l'utilisateur", class: 'col-12', visible: true },
            { field: 'enabled', header: 'Activer le compte', type: 'boolean', visible: true, required: false, class: 'col-12 md:col-6' }
        ];
    }

    loadRoles() {
        this.appRoleService.getAllRoles(0, 1000).pipe(takeUntil(this.destroy$)).subscribe({
            next: (resp: ApiResponse<AppRole>) => {
                const rolesArray = resp.data.content || [];
                this.rolesEntries = rolesArray.map((r: AppRole) => ({ value: r.name, label: r.name }));
                this.multiSelectObject['roles'] = this.rolesEntries;
            },
            error: (error: any) => {
                console.error('Erreur lors du chargement des rôles', error);
            }
        });
    }

    loadStuctures() {
        this.structureService.getAllStructure(TypeStructure.SERVICE).pipe(takeUntil(this.destroy$)).subscribe({
            next: (resp: any) => {
                this.structures = (resp.content || []).map((value: any) => ({
                    value: value.id,
                    label: value.libelleLong
                }));
                this.dropDownObject['structure'] = this.structures;
            },
            error: (error: any) => {}
        });
    }

    goBack() {
        this.router.navigate(['/utilisateurs']);
    }

    getDuplicateField(object: any): string | null {
        const duplicateUser = this.allUsers.find((user) => 
            (user.username === object.username && user.id !== object.id) || 
            (user.email === object.email && user.id !== object.id)
        );

        if (duplicateUser) {
            if (duplicateUser.username === object.username) return 'username';
            if (duplicateUser.email === object.email) return 'email';
        }
        return null;
    }

    save() {
        if (this.editForm?.invalid) {
            this.editForm.markAllAsTouched();
            return;
        }

        const user = { ...this.editForm?.value };
        const duplicateField = this.getDuplicateField(user);
        
        if (duplicateField) {
            const conflictMessage = duplicateField === 'username' ? "Le nom d'utilisateur existe déjà !" : "L'email existe déjà !";
            this.alertService.showError(conflictMessage);
            return;
        }

        this.isSubmitting = true;

        const request: any = user.id 
            ? this.authService.updateUser(user)
            : this.authService.createUser(user);
            
        request.pipe(takeUntil(this.destroy$)).subscribe({
            next: (res: any) => {
                this.isSubmitting = false;
                this.alertService.showSuccess(res?.message || 'Opération effectuée avec succès !');
                this.goBack();
            },
            error: (error: any) => {
                this.isSubmitting = false;
                this.alertService.showError(error.error?.message || 'Une erreur est survenue');
            }
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
    }
}
