import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';


@Component({
    selector: 'app-access',
    standalone: true,
    imports: [ButtonModule, RouterModule, RippleModule],
    template: `
        <div class="bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen min-w-[100vw] overflow-hidden">
            <div class="flex flex-col items-center justify-center">
                <div style="border-radius: 56px; padding: 0.3rem; background: linear-gradient(180deg, color-mix(in srgb, var(--primary-color), transparent 60%) 10%, transparent 30%)">
                    <div class="w-full bg-surface-0 dark:bg-surface-900 py-20 px-8 sm:px-20 flex flex-col items-center" style="border-radius: 53px">
                        <div class="gap-4 flex flex-col items-center">
                            <div class="flex justify-center items-center  rounded-full" style="width: 6rem; height: 6rem">
                                <img src="assets/logo-quali-sira.svg" alt="QualiSira" class="w-30 h-30 shrink-0" />
                            </div>
                            <h1 class="text-surface-900 dark:text-surface-0 font-bold text-4xl lg:text-5xl mb-2 text-center">Accès refusé</h1>
                            <span class="text-muted-color mb-8 text-center">Vous ne disposez pas des autorisations nécessaires. Veuillez contacter les administrateurs.</span>
                            <img src="https://primefaces.org/cdn/templates/sakai/auth/asset-access.svg" alt="Accès refusé" class="mb-2 grayscale" width="80%" />
                            <div class="col-span-12 mt-4 text-center">
                                <p-button label="Retourner au tableau de bord" routerLink="/" icon="pi pi-home" severity="info" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`
})
export class Access {}
