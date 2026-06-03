import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { Location } from '@angular/common';

@Component({
    selector: 'app-notfound',
    standalone: true,
    imports: [RouterModule, ButtonModule],
    template: `
        <div class="flex items-center justify-center min-h-screen overflow-hidden">
            <div class="flex flex-col items-center justify-center">
                <img src="assets/logo-quali-sira.svg" alt="QualiSira" class="mb-8 w-48 shrink-0" />
                <div style="border-radius: 56px; padding: 0.3rem; background: linear-gradient(180deg, color-mix(in srgb, var(--primary-color), transparent 60%) 10%, var(--surface-ground) 30%)">
                    <div class="w-full bg-surface-0 dark:bg-surface-900 py-20 px-8 sm:px-20 flex flex-col items-center" style="border-radius: 53px">
                        <span class="text-primary font-bold text-3xl">404</span>
                        <h1 class="text-surface-900 dark:text-surface-0 font-bold text-3xl lg:text-5xl mb-2">Page introuvable</h1>
                        <div class="text-surface-600 dark:text-surface-200 mb-8">La page que vous recherchez n'existe pas ou a été déplacée.</div>
                        <p-button label="Retour" (onClick)="goBack()" icon="pi pi-arrow-left" />
                    </div>
                </div>
            </div>
        </div>`
})
export class Notfound {
    constructor(private location: Location) {}

    goBack() {
        this.location.back();
    }
}
