import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {UntypedFormBuilder, UntypedFormGroup, Validators} from '@angular/forms';
import {Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import {MessageService} from 'primeng/api';
import {showToast, StatusEnum} from '../../utils';
import {FormGroupColumn, TableColumn} from '../../models';
import {AuthService} from "../../services/auth-services/auth.service";
import { AppCrudGenericComponent } from '../../components/app-crud-generic/app-crud-generic.component';

@Component({
    selector: 'app-kc-user',
    standalone: true,
    templateUrl: './kc-user.component.html',
    styleUrls: ['./kc-user.component.scss'],
    imports: [AppCrudGenericComponent]
})
export class KcUserComponent  implements OnInit, OnDestroy {
    @Input() notDelete: boolean = true;

    loading: boolean = true;
    destroy$: Subject<boolean> = new Subject<boolean>();
    dataList: any[] = [];
    closeDialog = false;
    formGroup: UntypedFormGroup;
    tableCols: TableColumn[];
    formCols: FormGroupColumn[];
    pageLabel = 'utilisateurs';
    formHeader = 'Création et mise à jour d\'un utilisateur';
    customButtons = [
        { label: '', icon: 'pi pi-refresh', action: 'resetPassword', color: 'blue', tooltip: 'Réinitialiser le mot de passe', tooltipPosition: 'top' },
        { label: '', icon: 'pi pi-check', action: 'activateUser', color: 'green',  tooltip: 'Activer/Désactiver l\'utilisateur',
            tooltipPosition: 'top' },
    ];

    constructor(
        private fb: UntypedFormBuilder,
        private messageService: MessageService,
        private authService: AuthService,
    ) {
        this.formCols = [
            {field: 'id', label: "", header: 'Id', type: 'string', visible: false, required: false},
            {field: 'firstName', label: "", header: 'Prénom', type: 'string', visible: true, required: true},
            {field: 'lastName', label: "", header: 'Nom', type: 'string', visible: true, required: true},
            {field: 'email', label: "", header: 'Email', type: 'string', visible: true, required: true},
            // { field: 'createdTimestamp', header: 'Date de création', type: 'date', visible: true, required: false },
            {field: 'username', label: "", header: 'Nom d\'utilisateur', type: 'string', visible: true, required: true},
            {field: 'enabled', label: "", header: 'Activé', type: 'boolean', visible: true, required: false},
            {field: 'emailVerified', label: "", header: 'Email vérifié', type: 'boolean', visible: true, required: false},
            //{ field: 'password', header: 'Mot de passe', type: 'string', visible: true, required: true }
        ];


        this.tableCols = [
            { field: 'username', header: 'Nom d\'utilisateur', type: 'string', filter: true },
            { field: 'email', header: 'Email', type: 'string', filter: true },
            { field: 'firstName', header: 'Prénom', type: 'string', filter: true },
            { field: 'lastName', header: 'Nom', type: 'string', filter: true },
            { field: 'enabled', header: 'Activé', type: 'boolean', filter: false, labelTrue: 'Oui', labelFalse: 'Non' },
            { field: 'emailVerified', header: 'Email vérifié', type: 'boolean', filter: false, labelTrue: 'Oui', labelFalse: 'Non' }
        ];


        this.formGroup = this.fb.group({
            id: [null],
            //createdTimestamp: [null],
            username: [null, Validators.required],
            enabled: [false, ],
            emailVerified: [false, ],
            firstName: [null, Validators.required],
            lastName: [null, Validators.required],
            email: [null, [Validators.required, Validators.email]],
            //password: [null, Validators.required]
        });
    }

    ngOnInit(): void {
        this.fetchUsers();

    }


    fetchUsers() {
        this.authService.getAllUsers().pipe(takeUntil(this.destroy$))
            .subscribe({
                next: res => {
                    this.dataList = res.body || [];
                },
                error: error => {
                    showToast(StatusEnum.error, error.status, null, this.messageService, error);
                }
            });
    }

    getDuplicateField(object: any): string | null {
        const duplicateUser = this.dataList.find(user =>
            (user.username === object.username && user.id !== object.id) ||
            (user.email === object.email && user.id !== object.id)
        );

        if (duplicateUser) {
            console.log(object.username, duplicateUser.username)
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
            const conflictMessage = duplicateField === 'username'
                ? 'Le nom d\'utilisateur existe déjà !'
                : 'L\'email existe déjà !';

            showToast(
                StatusEnum.error,
                409,
                conflictMessage,
                this.messageService
            );
            return;
        }
        /*
        if (!object.password) {
            // object.password = this.generatePassword();
            object.password = "password";
        }*/
        if (object.id != null || undefined) {
            this.authService.updateUser(object).pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: res => {
                        this.onSuccess(res)
                    },
                    error: error => showToast(StatusEnum.error, error.status, null, this.messageService, error)
                });
        } else {
            console.log(object)
            this.authService.createUser(object).pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: res => {
                        this.onSuccess(res)
                    },
                    error: error => showToast(StatusEnum.error, error.status, null, this.messageService, error)
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
        const user = this.dataList.find(user => user.id === userId);

        if (user) {
            const newEnabledStatus = !user.enabled;

            this.authService.changeStatus(userId, newEnabledStatus).pipe(
                takeUntil(this.destroy$)
            ).subscribe({
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
