import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { showToast, StatusEnum } from '../../utils';
import { AuthService } from '../../services/auth-services/auth.service';
import { AppCrudGenericComponent } from '../../components/app-crud-generic/app-crud-generic.component';
import { NgPrimeModule } from '../../../prime-ng.module';
import { TypeStructure } from '../../enums';
import { AppRoleService, RoleService } from '../role/role-service/role.service';
import { StructureService } from '../parametrages/structure/structure-service/structure-service';
import { ApiResponse } from '../../models/response.model';
import { AppRole } from '../../models/role.model';
import { DropdownSelector, FormGroupColumn, MultiSelectSelector, TableColumn } from '../../models/generique.model';

@Component({
    selector: 'app-kc-user',
    standalone:true,
    templateUrl: './kc-user.component.html',
    imports: [AppCrudGenericComponent, NgPrimeModule],
    styleUrls: ['./kc-user.component.scss']
})
export class KcUserComponent implements OnInit, OnDestroy {
    @Input() notDelete: boolean = true;

    loading: boolean = true;
    destroy$: Subject<boolean> = new Subject<boolean>();

    dataList: any[] = [];
    totalElements: number = 0;
    currentPage: number = 0;
    pageSize: number = 5;
    totalPages: number = 0;


    closeDialog = false;
    formGroup: UntypedFormGroup;
    dropdownEntries: any[] = [];
    tableCols: TableColumn[];
    formCols: FormGroupColumn[];
    dropdownList: DropdownSelector[] = [];
    strcutureDropdown!: DropdownSelector;
    structures: { value: any; label: any }[] = [];
    multiSelectList: MultiSelectSelector[] = [];
    rolesEntries: any[] = [];
    rolesDropdown!: MultiSelectSelector;
    pageLabel = 'utilisateur';
    formHeader = "Création et mise à jour d'un utilisateur";
    customButtons = [
        { label: 'Réinitialiser mot de passe', icon: 'pi pi-refresh', action: 'resetPassword', color: 'blue', tooltip: 'Réinitialiser le mot de passe', tooltipPosition: 'top' },
        { label: 'Activer / Désactiver', icon: 'pi pi-check', action: 'activateUser', color: 'green', tooltip: "Activer/Désactiver l'utilisateur", tooltipPosition: 'top' }
    ];

    constructor(
        private fb: UntypedFormBuilder,
        private messageService: MessageService,
        private authService: AuthService,
        private roleService: RoleService,
        private appRoleService: AppRoleService,
        private structureService: StructureService
    ) {
        this.formCols = [
            { field: 'id', header: 'Id', type: 'string', visible: false, required: false },
            { field: 'structure', header: 'Structure de rattachement', type: 'dropdown', visible: true, required: true, class: 'col-12 mb-2' },
            { field: 'roles', header: 'Rôles', type: 'multiselect', visible: true, required: true, class: 'col-12 mb-2' },
            { field: 'fonction', header: 'Fonction', type: 'string', visible: true, required: true, class: 'col-12 sm:col-6 mb-2' },
            { field: 'lastName', header: 'Nom', type: 'string', visible: true, required: true, class: 'col-12 sm:col-6 mb-2' },
            { field: 'firstName', header: 'Prénom', type: 'string', visible: true, required: true, class: 'col-12 sm:col-6 mb-2' },
            { field: 'email', header: 'Email', type: 'string', visible: true, required: true, helpText:'Ex: jean.dupont@entreprise.com', class: 'col-12 sm:col-6 mb-2' },
            { field: 'username', header: "Nom d'utilisateur", type: 'string', visible: true, required: true, helpText:'Utilisé pour la connexion', class: 'col-12 sm:col-6 mb-2' },
            { field: 'enabled', header: 'Activer le compte', type: 'boolean', visible: true, required: false, class: 'col-12 sm:col-6 mb-2' }
        ];

        this.tableCols = [
            { field: 'email', header: 'Email', type: 'string', filter: true },
            { field: 'firstName', header: 'Prénom', type: 'string', filter: true },
            { field: 'lastName', header: 'Nom', type: 'string', filter: true },
            { field: 'fonction', header: 'Fonction', type: 'string', filter: true },
            { field: 'enabled', header: 'Activé', type: 'boolean', filter: false, labelTrue: 'Oui', labelFalse: 'Non' }
        ];

        this.formGroup = this.fb.group({
            id: [null],
            //createdTimestamp: [null],
            username: [null, Validators.required],
            enabled: [false],
            firstName: [null, Validators.required],
            structure: [null, Validators.required],
            roles: [[], Validators.required],
            fonction: [null, Validators.required],
            lastName: [null, Validators.required],
            email: [null, [Validators.required, Validators.email]]
            //password: [null, Validators.required]
        });
    }

    ngOnInit(): void {
        this.fetchUsers();
        this.loadStuctures();
        this.loadRoles();
        this.strcutureDropdown = { field: 'structure', dropdownEntries: this.dropdownEntries };
        this.rolesDropdown = { field: 'roles', multiselectEntries: this.rolesEntries };
        this.dropdownList.push(this.strcutureDropdown);
        this.multiSelectList.push(this.rolesDropdown);
    }

    loadRoles() {
        this.appRoleService
            .getAllRoles(0, 1000)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (resp: ApiResponse<AppRole>) => {
                    // On extrait le tableau 'content' depuis la réponse
                    const rolesArray = resp.data.content || [];
                    
                    const fetchedRoles = rolesArray.map((r: AppRole) => ({ value: r.name, label: r.name }));
                    this.rolesEntries.length = 0;
                    this.rolesEntries.push(...fetchedRoles);

                    // ... (la suite de votre code)
                },
                error: (error: any) => {
                    console.error('Erreur lors du chargement des rôles', error);
                }
            });
    }

    loadStuctures() {
        this.structureService
            .getAllStructure(TypeStructure.SERVICE)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (resp: any) => {
                    this.structures = (resp.content || []).map((value: any) => ({
                        value: value.id,
                        label: value.libelleLong
                    }));
                    this.dropdownEntries.push(...this.structures);

                    // Forcer la mise à jour dans l'objet de dropdownList si nécessaire
                    if (this.strcutureDropdown) {
                        this.strcutureDropdown.dropdownEntries = [...this.dropdownEntries];
                        this.dropdownList = [...this.dropdownList];
                    }
                },
                error: (error: any) => {}
            });
    }

    fetchUsers() {
        this.loading = true;
        this.authService
            .getAllUsers(this.currentPage, this.pageSize)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res: any) => {
                    console.log("LISTE DES USERS ", res);
                    
                    // On affecte la liste pour app-crud-generic
                    this.dataList = res.data.content || [];
                    // On garde la trace du total pour la pagination
                    this.totalElements = res.data.totalElements; 
                    this.currentPage = res.data.pageNumber || 0;
                    this.pageSize = res.data.pageSize || 10;
                    this.loading = false;
                },
                error: (error: any) => {
                    showToast(StatusEnum.error, error.status, null, this.messageService, error);
                    this.loading = false;
                }
            });
    }

    onPageChange(event: { page: number, size: number }) {
        this.currentPage = event.page;  
        this.pageSize = event.size;     

        this.fetchUsers();             
    }

    getDuplicateField(object: any): string | null {
        const duplicateUser = this.dataList.find((user) => (user.username === object.username && user.id !== object.id) || (user.email === object.email && user.id !== object.id));

        if (duplicateUser) {
            console.log(object.username, duplicateUser.username);
            if (duplicateUser.username === object.username) {
                return 'username';
            }
            if (duplicateUser.email === object.email) {
                return 'email';
            }
        }

        return null;
    }

    onSuccess(res: any) {
        this.closeDialog = true;
        this.fetchUsers();
        this.messageService.add({ severity: 'success', summary: 'Succès', detail: res.message || 'Opération effectuée avec succès!!!' });
    }

    // générer un mot de passe aléatoire à 8 chiffres
    generatePassword(): string {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let password = '';
        for (let i = 0; i < 8; i++) {
            const randomIndex = Math.floor(Math.random() * characters.length);
            password += characters[randomIndex];
        }
        return password;
    }

    onSave(object: any) {
        const duplicateField = this.getDuplicateField(object);
        if (duplicateField) {
            const conflictMessage = duplicateField === 'username' ? "Le nom d'utilisateur existe déjà !" : "L'email existe déjà !";

            showToast(StatusEnum.error, 409, conflictMessage, this.messageService);
            return;
        }
        /*
        if (!object.password) {
            // object.password = this.generatePassword();
            object.password = "password";
        }*/
        if (object.id != null || undefined) {
            this.authService
                .updateUser(object)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: (res: any) => {
                        this.onSuccess(res);
                    },
                    error: (error: any) => showToast(StatusEnum.error, error.status, null, this.messageService, error)
                });
        } else {
            this.authService
                .createUser(object)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: (res: any) => {
                        this.onSuccess(res);
                    },
                    error: (error: any) => showToast(StatusEnum.error, error.status, null, this.messageService, error)
                });
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
    }

    resetUserPassword(userId: any): void {
        //const newPassword = this.generatePassword();
        /*        const newPassword = "12345678";
        this.authService.resetPassword(userId, newPassword).pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res) => {
                    this.onSuccess(res)
                },
                error: (error) => {
                    showToast(StatusEnum.error, error.status, null, this.messageService, error);
                }
            });*/
    }

    changeStatus(userId: any): void {
        const user = this.dataList.find((user) => user.id === userId);

        if (user) {
            const newEnabledStatus = !user.enabled;

            this.authService
                .changeStatus(userId, newEnabledStatus)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: (res) => {
                        this.onSuccess(res);
                    },
                    error: (error) => {
                        showToast(StatusEnum.error, error.status, null, this.messageService, error);
                    }
                });
        } else {
            console.error('Utilisateur introuvable');
        }
    }

    handleCustomAction(event: { action: string; user: any }): void {
        const { action, user } = event;
        switch (action) {
            case 'resetPassword':
                this.resetUserPassword(user.id);
                break;
            case 'activateUser':
                this.changeStatus(user.id);
                break;
            default:
                console.warn('Action inconnue : ', action);
        }
    }
}