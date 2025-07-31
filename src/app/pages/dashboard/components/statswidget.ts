import { ChangeDetectorRef, Component, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../../services/auth-services/auth.service';
import { StructureService } from '../../structure/structure-service';
import { ProcNonConformiteService } from '../../proc-non-conformite/proc-non-conformite.service';
import { isUserInRoles } from '../../../utils';

@Component({
    standalone: true,
    selector: 'app-stats-widget',
    imports: [CommonModule],
    template: `
        <div class="col-span-12 lg:col-span-6 xl:col-span-3" *ngIf="isUserInRoles(['SUPER_ADMIN'])">
            <div class="card mb-0">
                <div class="flex justify-between mb-4">
                    <div>
                        <span class="block text-muted-color font-medium mb-4">Nombre total d'utilisateurs</span>
                        <div class="text-surface-900 dark:text-surface-0 font-medium text-xl"
                             style="font-size: 25px">{{ users.length }}
                        </div>
                    </div>
                    <div class="flex items-center justify-center bg-blue-100 dark:bg-blue-400/10 rounded-border"
                         style="width: 2.5rem; height: 2.5rem">
                        <i class="pi pi-users text-blue-500 !text-xl"></i>
                    </div>
                </div>
                <!--     <span class="text-primary font-medium">24 new </span>
                     <span class="text-muted-color">since last visit</span>-->
            </div>
        </div>
        <div class="col-span-12 lg:col-span-6 xl:col-span-3" *ngIf="isUserInRoles(['SUPER_ADMIN'])">
            <div class="card mb-0">
                <div class="flex justify-between mb-4">
                    <div>
                        <span class="block text-muted-color font-medium mb-4">Nombre total de processus</span>
                        <div class="text-surface-900 dark:text-surface-0 font-medium text-xl"
                             style="font-size: 25px">{{ structures.length }}
                        </div>
                    </div>
                    <div class="flex items-center justify-center bg-orange-100 dark:bg-orange-400/10 rounded-border"
                         style="width: 2.5rem; height: 2.5rem">
                        <i class="pi pi-home text-orange-500 !text-xl"></i>
                    </div>
                </div>

            </div>
        </div>
        <div class="col-span-12 lg:col-span-6 xl:col-span-3" *ngIf="isUserInRoles(['SUPER_ADMIN'])">
            <div class="card mb-0">
                <div class="flex justify-between mb-4">
                    <div>
                        <span class="block text-muted-color font-medium mb-4">Nombre total de non-conformité</span>
                        <div
                            class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ nonConformites?.length }}
                        </div>
                    </div>
                    <div class="flex items-center justify-center bg-cyan-100 dark:bg-cyan-400/10 rounded-border"
                         style="width: 2.5rem; height: 2.5rem">
                        <i class="pi pi-send text-cyan-500 !text-xl"></i>
                    </div>
                </div>

            </div>
        </div>
        <div class="col-span-12 lg:col-span-6 xl:col-span-3" *ngIf="isUserInRoles(['SUPER_ADMIN'])">
            <div class="card mb-0">
                <div class="flex justify-between mb-4">
                    <div>
                        <span
                            class="block text-muted-color font-medium mb-4 ">Nombre total de non-conformité traitées</span>
                        <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{nonConformiteTraites.length}}</div>
                    </div>
                    <div class="flex items-center justify-center bg-purple-100 dark:bg-purple-400/10 rounded-border"
                         style="width: 2.5rem; height: 2.5rem">
                        <i class="pi pi-send text-purple-500 !text-xl"></i>
                    </div>
                </div>

            </div>
        </div>`
})
export class StatsWidget {
    users:any[]=[];
    structures:any[]=[];
    data: any;
    options: any;
    nonConformites:Array<any> | null=[];
    nonConformiteTraites:any[]=[];
    nonConformiteRejetes:any[]=[];
    platformId = inject(PLATFORM_ID);
    constructor(private cd: ChangeDetectorRef,public authService:AuthService,
                public stuctureService:StructureService,
                public service:ProcNonConformiteService) {
        this.fetchUsers();
        this.fetchStructures();
        this.fecthNonConformite();

    }


    fetchUsers() {
        this.authService
            .getAllUsers()
            .pipe()
            .subscribe({
                next: (res) => {
                    this.users = res.body || [];



                },
            });
    }
    fetchStructures() {
        this.stuctureService
            .getAllStructures()
            .pipe()
            .subscribe({
                next: (res) => {
                    this.structures = res.body || [];



                },
            });
    }
    fecthNonConformite() {
        this.service.getNonConformiteAll().subscribe({
            next: (data) => {
                this.nonConformites = data.body;
                // @ts-ignore
                this.nonConformiteTraites = this.nonConformites.filter(nc => nc.status === 'APPROVED');
            },
            error: (error) => {
                //showToastDm(handleHttpErrors(error, 'error', 'Récupération', 'demandeKey'), this.messageService)
            }
        });
    }


    protected readonly isUserInRoles = isUserInRoles;
}
