import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { showToast, StatusEnum } from '../../utils';
import { DropdownSelector, FormGroupColumn, MultiSelectSelector, TableColumn } from '../../models';
import { AuthService } from '../../services/auth-services/auth.service';
import { AppCrudGenericComponent } from '../../components/app-crud-generic/app-crud-generic.component';
import { NgPrimeModule } from '../../../prime-ng.module';
import { TypeStructure } from '../../enums';
import { RoleService } from '../role/role-service/role-service';
import { StructureService } from '../structure/structure-service/structure-service';

@Component({
    selector: 'app-kc-user',
    templateUrl: './kc-user.component.html',
    imports: [AppCrudGenericComponent, NgPrimeModule],
    styleUrls: ['./kc-user.component.scss']
})
export class KcUserComponent implements OnInit, OnDestroy {
    @Input() notDelete: boolean = true;

    loading: boolean = true;
    destroy$: Subject<boolean> = new Subject<boolean>();
    dataList: any[] = [];
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
    pageLabel = 'utilisateurs';
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
        private structureService: StructureService
    ) {
        this.formCols = [
            { field: 'id', header: 'Id', type: 'string', visible: false, required: false },
            { field: 'structure', header: 'Structure de rattachement', type: 'dropdown', visible: true, required: true, topLabel: 'Organisation', class: 'col-12 mb-2' },
            { field: 'roles', header: 'Rôles', type: 'multiselect', visible: true, required: true, topLabel: 'Rôle de l\'utilisateur', class: 'col-12 mb-2' },
            { field: 'lastName', header: 'Nom', type: 'string', visible: true, required: true, topLabel: 'Nom de l\'utilisateur', class: 'col-12 sm:col-6 mb-2' },
            { field: 'firstName', header: 'Prénom', type: 'string', visible: true, required: true, topLabel: 'Prénom de l\'utilisateur', class: 'col-12 sm:col-6 mb-2' },
            { field: 'fonction', header: 'Fonction', type: 'string', visible: true, required: true, topLabel: 'Profil Professionnel', class: 'col-12 sm:col-6 mb-2' },
            { field: 'email', header: 'Email', type: 'string', visible: true, required: true, topLabel: 'Adresse e-mail', helpText:'mail@mail.com', class: 'col-12 sm:col-6 mb-2' },
            { field: 'username', header: "Nom d'utilisateur", type: 'string', visible: true, required: true, topLabel: 'Utilisé pour la connexion', helpText:'mail@mail.com', class: 'col-12 sm:col-6 mb-2' },
            { field: 'enabled', header: 'Compte activé', type: 'boolean', visible: true, required: false, topLabel: 'Activer le compte de l\'utilisateur', class: 'col-12 sm:col-6 mb-2' }
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
        this.roleService
            .getAllRoles()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (resp: any) => {
                    // RoleService.getAllRoles() renvoie directement le tableau, pas un HttpResponse
                    const fetchedRoles = (resp || []).map((r: any) => ({ value: r.name, label: r.name }));
                    this.rolesEntries.length = 0; // Nettoyer avant de remplir
                    this.rolesEntries.push(...fetchedRoles);

                    // Forcer la mise à jour dans l'objet de multiSelectList si nécessaire
                    if (this.rolesDropdown) {
                        this.rolesDropdown.multiselectEntries = [...this.rolesEntries];
                        this.multiSelectList = [...this.multiSelectList];
                    }
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
                    this.structures = (resp.body || []).map((value: any) => ({
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
        this.authService
            .getAllUsers()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res: any) => {
                    this.dataList = res.body || [];
                    this.loading = false;
                },
                error: (error: any) => {
                    showToast(StatusEnum.error, error.status, null, this.messageService, error);
                    this.loading = false;
                }
            });
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
        showToast(StatusEnum.success, res.status, null, this.messageService);
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
