import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { showToast, StatusEnum } from '../../utils/global/global-utils';
import { AuthService } from '../../services/auth-services/auth.service';
import { AppCrudGenericComponent } from '../../components/app-crud-generic/app-crud-generic.component';
import { NgPrimeModule } from '../../../prime-ng.module';
import { TypeStructure } from '../../enums/enums';
import { AppRoleService, RoleService } from '../role/role-service/role.service';
import { ApiResponse } from '../../models/response.model';
import { AppRole } from '../../models/role.model';
import { DropdownSelector, FormGroupColumn, MultiSelectSelector, TableColumn } from '../../models/generique.model';
import { Breadcrumb } from 'primeng/breadcrumb';
import { RouterModule, Router } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { StructureService } from '../parametrages/structure/structure.service';
import { HeaderPage } from '../../shared/header-page/header-page';
import { AlertService } from '../../shared/alert-message/alert-message.service';

@Component({
    selector: 'app-kc-user',
    standalone:true,
    templateUrl: './kc-user.component.html',
    imports: [
        AppCrudGenericComponent, 
        NgPrimeModule, 
        HeaderPage, 
        RouterModule
    ],
    styleUrls: ['./kc-user.component.scss']
})
export class KcUserComponent implements OnInit, OnDestroy {
    @Input() notDelete: boolean = true;

    home: MenuItem | undefined;
    items: MenuItem[] | undefined;

    loading: boolean = true;
    destroy$: Subject<boolean> = new Subject<boolean>();

    dataList: any[] = [];
    totalElements: number = 0;
    currentPage: number = 0;
    pageSize: number = 10;
    totalPages: number = 0;

    breadcrumbs = [
        { label: 'Tableau de bord', routerLink: '/' },
        { label: 'Rôle', routerLink: '/roles' },
        { label: 'Utilisateurs', routerLink: '/utilisateurs' }
    ];

    closeDialog = false;
    tableCols: TableColumn[];
    
    // Variables gardées pour l'interface mais non utilisées pour la création
    formGroup!: UntypedFormGroup;
    formCols: FormGroupColumn[] = [];
    strcutureDropdown: any = {};
    rolesDropdown: any = {};

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
        private router: Router,
        private alertService: AlertService
    ) {
        this.formGroup = this.fb.group({});
        
        this.tableCols = [
            { field: 'email', header: 'Email', type: 'string', filter: true },
            { field: 'firstName', header: 'Prénom', type: 'string', filter: true },
            { field: 'lastName', header: 'Nom', type: 'string', filter: true },
            { field: 'fonction', header: 'Fonction', type: 'string', filter: true },
            { field: 'enabled', header: 'Activé', type: 'boolean', filter: false, labelTrue: 'Oui', labelFalse: 'Non' }
        ];
    }

    ngOnInit(): void {
        this.fetchUsers();
    }

    onAjoutDemande() {
        this.router.navigate(['/utilisateurs/create']);
    }

    onEditDemande(rowData: any) {
        this.router.navigate(['/utilisateurs/edit', rowData.id], { state: { userData: rowData } });
    }


    fetchUsers() {
        this.loading = true;
        this.authService
            .getAllUsers(this.currentPage, this.pageSize)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res: any) => {
                    // Délai artificiel de 2 secondes pour bien voir le skeleton
                    setTimeout(() => {
                        this.dataList = res.data?.content || [];
                        this.totalElements = res.data?.totalElements || 0;
                        this.totalPages = res.data?.totalPages || 0;
                        this.loading = false;
                    }, 500);
                },
                error: (error: any) => {
                    this.alertService.showError(error.message || "Une erreur est survenue lors de la récupération des utilisateurs");
                    this.loading = false;
                }
            });
    }

    onPageChange(event: { page: number, size: number }) {
        this.currentPage = event.page;  
        this.pageSize = event.size;     

        this.fetchUsers();             
    }

    onSuccess(res: any) {
        this.closeDialog = true;
        this.fetchUsers();
        this.alertService.showSuccess(res.message || "Opération effectuée avec succès!!!");
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
                    this.alertService.showError(error.message || "Une erreur est survenue lors de la réinitialisation du mot de passe");
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
                        this.alertService.showError(error.message || "Une erreur est survenue lors de la modification du statut de l'utilisateur");
                    }
                });
        } else {
            this.alertService.showError("Utilisateur introuvable");
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