import { Component, OnInit, ViewChild } from '@angular/core';
import { Router, RouterModule, NavigationEnd, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LayoutService } from '../service/layout.service';
import { AuthService } from '../../services/auth-services/auth.service';
import { MenuItem, MessageService } from 'primeng/api';
import { Title } from '@angular/platform-browser';
import { filter, map, takeUntil } from 'rxjs/operators';
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';

import { GlobalSearchService } from '../../services/global-search.service';
import { NgPrimeModule } from '../../../prime-ng.module';
import { Popover } from 'primeng/popover';
import { NiveauNonConformiteService } from '../../services/niveau-non-conformite.service';
import { ConfigGlobalService } from '../../services/config-global.service';
import { FormGroupColumn, NiveauNonConformite, TableColumn } from '../../models';
import { Subject } from 'rxjs';
import { HttpResponse } from '@angular/common/http';
import { AppCrudGenericComponent } from '../../components/app-crud-generic/app-crud-generic.component';
import { FormInputTemplateComponent } from '../../components/form-input-template/form-input-template.component';
import { showToast, StatusEnum, hasAnyPermission, isLicenseActive } from '../../utils';

// import { isUserInRoles, hasAnyPermission, isLicenseActive, isModuleSubscribed } from '../../utils';

@Component({
    selector: 'app-topbar',
    standalone: true,
    imports: [RouterModule, AppCrudGenericComponent, FormInputTemplateComponent, NgPrimeModule, CommonModule, FormsModule, ReactiveFormsModule],
    template: ` 
    <div class="pre-layout-topbar">
        <div class="layout-topbar">
            <div class="layout-topbar-logo-container">
                <button class="layout-menu-button p-button-secondary  layout-topbar-action" (click)="layoutService.onMenuToggle()">
                    <i class="pi pi-bars"></i>
                </button>
                <div class="layout-topbar-title text-surface-900 dark:text-surface-0">
                    {{ pageTitle }}
                </div>
            </div>

            <div class="layout-topbar-search md:flex items-center flex-1 justify-center max-w-[500px]">
                <p-iconField iconPosition="left" class="w-full mx-4">
                    <p-inputIcon styleClass="pi pi-search"></p-inputIcon>
                    <input type="text" 
                        pInputText 
                        placeholder="Que recherchez-vous ?" 
                        [(ngModel)]="searchQuery" 
                        (input)="onSearchInput()"
                        (keyup.enter)="onSearch()"
                        class="w-full py-2 border-surface-border dark:border-surface-700 bg-surface-100 dark:bg-surface-800 focus:ring-1 focus:ring-primary-500 rounded-xl" />
                </p-iconField>
            </div>

            <div class="layout-topbar-actions">

                <!-- Bouton Configuration globale -->
                <button *ngIf="isLicenseActive() && hasAnyPermission(['NC_LEVEL_MANAGE'])" type="button" pTooltip="Configuration globale" 
                        tooltipPosition="bottom" 
                        (click)="toggleConfig($event)" 
                        class="px-3 py-2 p-button-secondary rounded-full transition-colors hover:bg-surface-100 dark:hover:bg-surface-800">
                    <i class="pi pi-cog" style="font-size: 1.2rem"></i>
                </button>

                <!-- Bouton Centre d'Aide -->
                <button type="button" pTooltip="Centre d'aide" tooltipPosition="bottom" (click)="helpVisible = true" class="px-3 py-2 p-button-secondary rounded-full transition-colors hover:bg-surface-100 dark:hover:bg-surface-800">
                    <i class="pi pi-question-circle" style="font-size: 1.2rem"></i>
                </button>

                <!-- Bouton de Notifications -->
                <button type="button" pTooltip="Notifications" tooltipPosition="bottom" (click)="notificationPopover.toggle($event)" class="relative px-3 py-2 p-button-secondary rounded-full transition-colors hover:bg-surface-100 dark:hover:bg-surface-800">
                    <i class="pi pi-bell" style="font-size: 1.2rem"></i>
                    
                    <!-- Le badge rouge qui s'affiche uniquement si notificationCount > 0 -->
                    <span *ngIf="notificationCount > 0" 
                          class="absolute top-0 right-0 bg-red-500 text-white rounded-full text-[10px] w-4 h-4 flex items-center justify-center border border-white dark:border-surface-900">
                        {{ notificationCount }}
                    </span>
                </button>

                <!-- Bouton pour changer de thème (Dark/Light) -->
                <button type="button" size="small" class="px-3 py-1 rounded-full" (click)="toggleDarkMode()">
                    <i class="pi transition-transform duration-200" style="font-size: 1.2rem"
                    [ngClass]="{ 'pi-moon': !layoutService.isDarkTheme(), 'pi-sun': layoutService.isDarkTheme() }"></i>
                </button>

                <button type="button" class="layout-topbar-action flex items-center gap-2 p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors" (click)="menu.toggle($event)">
                    <p-overlayBadge severity="success" styleClass="status-badge">
                        <p-avatar *ngIf="user" 
                                [style]="{ 'background-color': 'var(--secondary-color)', 'color': '#ffffff', 'width': '30px', 'height': '30px', 'font-weight': 'bold' }"
                                shape="circle">{{ user.firstName.charAt(0).toLocaleUpperCase() }}
                        </p-avatar>
                    </p-overlayBadge>
                    <i class="icon-fleche pi transition-transform duration-200" 
                    [ngClass]="{ 'pi-chevron-down': !menuOpen, 'pi-chevron-up': menuOpen }"></i>
                </button>
            </div>
        </div>
        <p-popover #configPopover>
            <div class="flex flex-col gap-4 w-[20rem]">
                <div>
                    <span class="font-medium text-surface-900 dark:text-surface-0 block mb-2">Configuration globale du système</span>
                    <ul class="list-none p-0 mt-4 flex flex-col gap-4">
                        <p-divider />
                        <li class="flex items-center gap-2 cursor-pointer p-2 rounded-lg transition-colors hover:bg-surface-100 dark:hover:bg-surface-800"  (click)="openConfigNiveau()">
                            <div>
                                <span class="font-medium">Niveaux de non-conformité</span>
                                <div class="text-sm text-muted-color">Configuration des niveaux de non-conformité</div>
                            </div>
                            <div class="flex items-center gap-2 text-muted-color ml-auto text-sm">
                                <i class="pi pi-angle-right"></i>
                            </div>
                        </li>
                        <p-divider />
                        <li class="flex items-center gap-2 cursor-pointer p-2 rounded-lg transition-colors hover:bg-surface-100 dark:hover:bg-surface-800" (click)="openConfigGlobale()">
                            <div>
                                <span class="font-medium">Configuration globale</span>
                                <div class="text-sm text-muted-color">RQ & Fréquence de rappels</div>
                            </div>
                            <div class="flex items-center gap-2 text-muted-color ml-auto text-sm">
                                <i class="pi pi-angle-right"></i>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>
        </p-popover>
        <p-menu #menu [popup]="true" [model]="items" (onHide)="menuOpen = false" (onShow)="menuOpen = true" styleClass="user-menu" appendTo="body">
            <ng-template pTemplate="item" let-item>
                <ng-container [ngSwitch]="item.id">
                    <!-- Bloc Profil Riche -->
                    <div *ngSwitchCase="'profile-header'" class="flex items-center gap-3 p-1 border-b border-surface-100 dark:border-surface-800">
                        <p-overlayBadge severity="success" styleClass="status-badge-small">
                            <p-avatar *ngIf="user" 
                                    [style]="{ 'background-color': 'var(--secondary-color)', 'color': '#ffffff', 'width': '30px', 'height': '30px', 'font-weight': 'bold' }"
                                    shape="circle">{{ user?.firstName.charAt(0).toLocaleUpperCase() }}
                            </p-avatar>
                        </p-overlayBadge>
                        <div class="flex flex-col flex-1">
                            <span class="font-medium text-sm text-surface-900 dark:text-surface-0 leading-tight">{{ user?.firstName }} {{ user?.lastName }}</span>
                            <span class="text-xs text-slate-500 font-normal">En ligne</span>
                        </div>
                        <button type="button" class="p-button p-button-link p-0 text-sm font-normal text-slate-500 bg-profil rounded-md" (click)="goToProfile()">Profil</button>
                    </div>

                    <!-- Item de déconnexion standard -->
                    <a *ngSwitchCase="'logout'" (click)="item.command()" class="flex text-[14px] mt-2 items-center p-2 gap-2 text-surface-900 dark:text-surface-0 hover:bg-surface-100 dark:hover:bg-surface-900 transition-colors cursor-pointer rounded-md mx-2 mb-2">
                        <i [class]="item.icon"></i>
                        <span class="font-normal">{{ item.label }}</span>
                    </a>
                </ng-container>
            </ng-template>
        </p-menu>
        <p-popover #notificationPopover>
            <ng-template pTemplate="header">
                    <div class="inline-flex align-items-center justify-content-center gap-2">
                        <span class="layout-topbar-title">
                            <span>Notifications</span>
                        </span>                      
                    </div>
                </ng-template>    
                <div class="flex flex-col gap-3 mt-4">
                    
                    <div *ngFor="let notif of notifications" 
                        class="flex items-start gap-3 p-3 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors cursor-pointer border border-transparent"
                        [ngClass]="{'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30': !notif.read}">
                        
                        <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0" [ngClass]="notif.colorClass">
                            <i [class]="notif.icon"></i>
                        </div>
                        
                        <!-- Contenu -->
                        <div class="flex flex-col flex-1">
                            <span class="font-medium text-sm text-surface-900 dark:text-surface-0">{{ notif.title }}</span>
                            <span class="text-xs text-surface-600 dark:text-surface-400 mt-1 leading-normal">{{ notif.detail }}</span>
                            <span class="text-[10px] text-surface-500 mt-2 font-medium">{{ notif.time }}</span>
                        </div>
                        
                        <!-- Point indicateur Non-lu -->
                        <div *ngIf="!notif.read" class="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                    </div>
                    
                </div>
        </p-popover>
        <!-- Drawer du Centre d'Aide -->
        <p-drawer [modal]="true" [(visible)]="helpVisible" position="right" [style]="{width: '500px'}">
            <ng-template pTemplate="header">
                <div class="inline-flex align-items-center justify-content-center gap-2">
                    <span class="layout-topbar-title">
                        <span>Centre d'aide</span>
                    </span>                      
                </div>
            </ng-template>    
            
            <div class="flex flex-col gap-3 mt-4">
                <div class="p-4 border-2 border-dashed border-surface-200 dark:border-surface-700 rounded-xl flex items-center justify-center text-surface-500">
                    Le contenu du centre d'aide (FAQ, guides, support) sera ajouté ici plus tard...
                </div>
            </div>
        </p-drawer>

        <p-drawer [(visible)]="configNiveauVisible" 
                  position="right" 
                  [modal]="true" 
                  [style]="{ width: '50rem' }"
                  styleClass="drawer-nc">
    
            <ng-template pTemplate="header">
                <div class="flex items-center gap-2">
                    <span class="layout-topbar-title">
                        <span>Configuration des niveaux de non-conformité</span>
                    </span>                      
                </div>
            </ng-template>

            <div class="p-4 overflow-auto" style="max-height: 70vh;">
                <!-- On utilise le CRUD générique ici -->
                <app-crud-generic
                    [minWidth]="'100%'" 
                    [loadingRows]="3" 
                    [isPagination]="false"
                    [addButtonLabel]="'Ajouter un niveau de NC'"
                    [dialogWidth]="'40rem'"
                    [loading]="loading"
                    [pageLabel]="'Niveau de non-conformité'"
                    [tableCols]="tableCols"
                    [listeObject]="dataList"
                    [formGroup]="formGroup"
                    [formCols]="formCols"
                    [isAffich]="false"
                    [closeDialog]="closeDialog"
                    [formHeader]="'Détails du niveau'"
                    (newItemEvent)="onSave($event)"
                    (removeEvent)="onDelete($event)">
                </app-crud-generic>
            </div>
        </p-drawer>

        <!-- Drawer Configuration Globale -->
        <p-drawer [(visible)]="configGlobaleVisible" 
                  position="right" 
                  [modal]="true" 
                  [style]="{ width: '40rem' }"
                  styleClass="drawer-nc">
            
            <ng-template pTemplate="header">
                <div class="flex items-center gap-2">
                    <span class="layout-topbar-title">
                        <span>Configuration Globale du Système</span>
                    </span>
                </div>
            </ng-template>

            <div class="p-4" [formGroup]="configFormGlobal">
                <div class="grid p-fluid mt-2">
                    <ng-container *ngFor="let col of formColsGlobalConfig">
                        <!-- col-12 pour que chaque champ prenne toute la largeur -->
                        <div class="col-12"> 
                            <app-form-input-template
                                [col]="col"
                                [form]="configFormGlobal">
                            </app-form-input-template>
                        </div>
                    </ng-container>
                </div>

                <div class="flex justify-end gap-2 mt-8">
                    <p-button label="Annuler" severity="secondary" [text]="true" (click)="configGlobaleVisible = false"></p-button>
                    <p-button label="Enregistrer les modifications" icon="pi pi-save" severity="info" [disabled]="!configFormGlobal.valid" (click)="saveConfigGlobale()"></p-button>
                </div>
            </div>
        </p-drawer>


    </div>
    `,
    styles: [`
        ::ng-deep .custom-bottom-drawer {
            height: auto !important;
            max-width: 50rem !important;
            width: 100% !important;
            left: 0 !important;
            right: 0 !important;
            margin: 0 auto !important;
            border-radius: 10px 10px 0 0 !important;
            border: none !important;
            overflow: hidden !important;
        }

        @media screen and (max-width: 600px) {
            ::ng-deep .custom-bottom-drawer {
                max-width: 100% !important;
                border-radius: 0 !important;
            }
        }
        :host ::ng-deep .status-badge .p-badge {
            width: 12px;
            height: 12px;
            min-width: 12px;
            top: auto;
            bottom: -2px;
            right: -2px;
            border: 2px solid white;
        }

        :host ::ng-deep .status-badge-small .p-badge {
            width: 10px;
            height: 10px;
            min-width: 10px;
            top: auto;
            bottom: 0px;
            right: 0px;
            border: 2px solid white;
        }

        :host ::ng-deep .user-menu.p-menu {
            min-width: 250px;
            padding: 5px;
            border: 1px solid rgba(0,0,0,0.2);
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
    `]
})
export class AppTopbar implements OnInit {
    items!: MenuItem[];
    user: any;
    menuOpen: boolean = false;
    pageTitle: string = '';
    searchQuery: string = '';

    loading: boolean = true;
    dataList: any[] = [];
    closeDialog: boolean = false;

    configNiveauVisible: boolean = false;
    configGlobaleVisible: boolean = false;

    isLicenseActive = isLicenseActive;
    hasAnyPermission = hasAnyPermission;

    formGroup!: UntypedFormGroup;
    configFormGlobal!: UntypedFormGroup;
    configGlobalData: any = {};
    tableCols!: TableColumn[];
    formCols!: FormGroupColumn[];
    formColsGlobalConfig: FormGroupColumn[] = [];
    grades: NiveauNonConformite[] = [];
    destroy$: Subject<boolean> = new Subject<boolean>();

    @ViewChild('configPopover') configPopover!: Popover;
    @ViewChild('notificationPopover') notificationPopover!: Popover; 

    helpVisible: boolean = false;
    notificationCount: number = 3;
    notificationVisible: boolean = false;

    // FAUSSES DONNÉES DE TEST POUR LES NOTIFICATIONS
    notifications = [
        {
            id: 1,
            title: "Nouveau formulaire d'audit",
            detail: "Un nouveau formulaire d'audit a été assigné à votre structure.",
            time: "2 min ago",
            icon: "pi pi-file-edit",
            colorClass: "bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
            read: false
        },
        {
            id: 2,
            title: "Validation requise",
            detail: "La direction a besoin de votre validation pour le rapport trimestriel.",
            time: "1h ago",
            icon: "pi pi-check-circle",
            colorClass: "bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400",
            read: false
        },
        {
            id: 3,
            title: "Mise à jour du système",
            detail: "La maintenance du système est prévue pour ce weekend.",
            time: "3 days ago",
            icon: "pi pi-cog",
            colorClass: "bg-gray-100 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400",
            read: true
        }
    ];

    constructor(
        public layoutService: LayoutService,
        private authService: AuthService,
        private router: Router,
        private titleService: Title,
        private activatedRoute: ActivatedRoute,
        private globalSearchService: GlobalSearchService,
        protected fb: UntypedFormBuilder,
        protected messageService: MessageService,
        protected niveauNonConformiteService: NiveauNonConformiteService,
        protected configGlobalService: ConfigGlobalService
    ) {
        this.formCols = [
            {field: 'id', label: "", topLabel: "", header: 'Id', type: 'number', visible: false, required: false},
            {
                field: 'libelle', 
                header: 'Niveau', 
                topLabel: 'Nom du niveau', 
                helpText: 'Exemple: Mineure, Majeure ou Critique',
                type: 'string', 
                visible: true, 
                required: true
            },
            {
                field: 'description', 
                header: 'Description détaillée', 
                topLabel: 'Explications du niveau', 
                helpText: 'Utilisez l\'éditeur pour mettre en forme le texte',
                type: 'text', 
                visible: true, 
                required: false
            }
        ];

        this.tableCols = [
            {field: 'libelle', header: 'Libellé', type: 'string', filter: true},
            {field: 'description', header: 'Description', type: 'string', filter: true},
            // {field: 'createdAt', header: 'Date de création', type: 'string', filter: true},
            // {field: 'updatedAt', header: 'Date de modification', type: 'string', filter: true}
        ];

        this.formGroup = this.fb.group({
            id: [null],
            libelle: [null, Validators.required],
            description: [null],
        //  audites: [null, Validators.required]

        });

        this.formColsGlobalConfig = [
            {
                field: 'nomCompletRq', 
                header: 'Nom complet', 
                topLabel: 'Responsable Qualité (RQ)', 
                helpText: 'Prénom et Nom du responsable actuel',
                type: 'string', 
                visible: true, 
                required: true
            },
            {
                field: 'emailRq', 
                header: 'Adresse email', 
                topLabel: 'Email de notification', 
                helpText: 'Email utilisé pour l\'envoi des alertes système',
                type: 'string', 
                visible: true, 
                required: true
            },
            {
                field: 'rappelEcheance', 
                header: 'Fréquence (en jours)', 
                topLabel: 'Délai de rappel', 
                helpText: 'Nombre de jours avant l\'échéance pour le premier rappel',
                type: 'number', 
                visible: true, 
                required: true
            }
        ];

        this.configFormGlobal = this.fb.group({
            nomCompletRq: [null, [Validators.required]],
            emailRq: [null, [Validators.required, Validators.email]],
            rappelEcheance: [2, [Validators.required]]
        });
    }

    ngOnInit() {
        this.user = this.authService.getUser();
        this.updateTitle();

        // Écouter les changements de route pour mettre à jour le titre
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe(() => {
            this.updateTitle();
        });

        this.items = [
            { id: 'profile-header' },
            { id: 'logout', label: 'Se déconnecter', icon: 'pi pi-sign-out', command: () => this.authService.logout() }
        ];
    }

    openConfigNiveau() {
        this.configPopover.hide();
        this.fetchObject();
        this.configNiveauVisible = true;
    }

    fetchObject() {
            this.loading = true;
              this.niveauNonConformiteService.findAll().pipe(takeUntil(this.destroy$))
                  .subscribe({
                      next: res => {
                          this.dataList = res.body || [];
                          this.loading = false;
                      },
                      error: error => {
                          showToast(StatusEnum.error, error.status, null, this.messageService, error);
                          this.loading = false;
                        }
                  });
          }

    openConfigGlobale() {
        this.configPopover.hide();
        this.fetchConfigGlobal();
        this.configGlobaleVisible = true;
    }

    fetchConfigGlobal() {
        this.configGlobalService.findAll().pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res: any) => {
                    this.configGlobalData = res.body || {};
                    this.configFormGlobal.patchValue({
                        nomCompletRq: this.configGlobalData.nomCompletRq,
                        emailRq: this.configGlobalData.emailRq,
                        rappelEcheance: this.configGlobalData.rappelEcheance,
                    });
                },
                error: error => {
                    showToast(StatusEnum.error, error.status, null, this.messageService, error);
                }
            });
    }

    saveConfigGlobale() {
        if (this.configFormGlobal.valid) {
            const config = this.configFormGlobal.value;
            if (this.configGlobalData.id) {
                this.configGlobalService.updateG(config, this.configGlobalData.id).subscribe({
                    next: (res) => {
                        this.configGlobaleVisible = false;
                        showToast(StatusEnum.success, res.status, null, this.messageService);
                    },
                    error: error => showToast(StatusEnum.error, error.status, null, this.messageService, error)
                });
            } else {
                this.configGlobalService.save(config).subscribe({
                    next: (res) => {
                        this.configGlobaleVisible = false;
                        showToast(StatusEnum.success, res.status, null, this.messageService);
                    },
                    error: error => showToast(StatusEnum.error, error.status, null, this.messageService, error)
                });
            }
        }
    }

    toggleDarkMode() {
        const config = this.layoutService.layoutConfig();
        // Alterne la propriété darkTheme (true/false) dans le signal de configuration
        this.layoutService.layoutConfig.set({ ...config, darkTheme: !config.darkTheme });
    }

    toggleConfig(event: Event) {
        this.configPopover.toggle(event);
    }


    private updateTitle() {
        let child = this.activatedRoute.root;
        
        while (child.firstChild) {
            child = child.firstChild;
            
            // On récupère le titre à ce niveau s'il existe
            const title = child.snapshot.title || child.snapshot.data['title'];
            
            if (title) {
                // Si on a trouvé un titre, on l'assigne et on s'arrête (c'est la page mère)
                this.pageTitle = title;
                return; 
            }
        }
        
        // Si aucun titre n'a été trouvé dans la boucle, on utilise le titre par défaut du service
        this.pageTitle = this.titleService.getTitle();
    }

    goToProfile() {
        this.router.navigate(['/profil']);
    }

    onSearchInput() {
        this.globalSearchService.updateSearchQuery(this.searchQuery);
    }

    onSearch() {
        if (this.searchQuery && this.searchQuery.trim()) {
            console.log('Searching for:', this.searchQuery);
            // Rediriger vers la page de recherche globale
            this.router.navigate(['/recherche'], { queryParams: { q: this.searchQuery } });
            this.searchQuery = ''; // Optionnel : vider la recherche
        }
    }

    onSave(object: NiveauNonConformite) {
              if (object.id != null || undefined) {
                  this.niveauNonConformiteService.update(object).pipe(takeUntil(this.destroy$))
                      .subscribe({
                          next: res => {
                              this.onSuccess(res);
                          }, error: error => {
                              showToast(StatusEnum.error, error.status, null, this.messageService, error);
                          }
                      });
              } else {
                  this.niveauNonConformiteService.save(object).pipe(takeUntil(this.destroy$))
                      .subscribe({
                          next: res => {
                              this.onSuccess(res);
                          }, error: error => {
                              showToast(StatusEnum.error, error.status, null, this.messageService, error);
                          }
                      });
              }
          }
    
          onDelete(niveau: NiveauNonConformite) {
              this.niveauNonConformiteService.delete(niveau.id).pipe(takeUntil(this.destroy$))
                  .subscribe({
                      next: res => {
                          this.onSuccess(res);
                      }, error: error => {
                          showToast(StatusEnum.error, error.status, null, this.messageService, error);
                      }
                  });
    
          }

            onSuccess(res: HttpResponse<any>) {
                this.closeDialog = true;
                this.fetchObject();
                showToast(StatusEnum.success, res.status, null, this.messageService);
            }
}
