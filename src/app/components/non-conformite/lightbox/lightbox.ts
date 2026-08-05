import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { PieceJointeFichierService } from '../../../services/non-conformite/piece-jointe-fichier.service';

@Component({
    selector: 'app-lightbox',
    standalone: true,
    imports: [CommonModule, NgPrimeModule],
    template: `
        <p-dialog 
            [(visible)]="visible" 
            [modal]="true" 
            appendTo="body"
            [draggable]="true"
            [resizable]="true"
            [maximizable]="true" 
            [dismissableMask]="true"
            [style]="{width: '80vw', height: '90vh'}">
            <ng-template pTemplate="header">
                <div class="flex items-center gap-3">
                    <div class="flex items-center justify-center bg-blue-50 text-blue-500 rounded-full" style="width: 3.5rem; height: 3.5rem">
                        <i class="pi pi-eye text-2xl"></i>
                    </div>
                    <div class="flex flex-col">
                        <span class="font-bold text-xl text-900 mb-1">Visualisation du document</span>
                        <span class="text-500 text-sm">Visualisation de la pièce jointe</span>
                    </div>
                </div>
            </ng-template>
            
            <div class="flex justify-center items-center w-full h-full" style="min-height: 75vh;">
                <!-- Si c'est une image -->
                <img *ngIf="isImage" [src]="url" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 8px;" />
                
                <!-- Si c'est un PDF -->
                <object *ngIf="isPdf" [data]="url" type="application/pdf" width="100%" height="100%" style="min-height: 75vh; border-radius: 8px;">
                    <p>Votre navigateur ne supporte pas l'affichage PDF direct. <a [href]="url" target="_blank">Cliquez ici pour l'ouvrir</a>.</p>
                </object>
            </div>
        </p-dialog>
    `
})
export class LightboxComponent {
    visible: boolean = false;
    url: SafeResourceUrl | null = null;
    isImage: boolean = false;
    isPdf: boolean = false;

    constructor(
        private sanitizer: DomSanitizer,
        private fichiers: PieceJointeFichierService
    ) {}

    /**
     * Ouvre l'aperçu d'une pièce jointe.
     *
     * <p>Le contenu est demandé au serveur : les listes de dossiers ne le portent plus. Une pièce
     * que l'utilisateur vient de choisir à l'écran, elle, l'a encore en mémoire — le service
     * distingue les deux cas.</p>
     */
    public open(pj: any) {
        if (!pj) return;

        const nomBrut = pj.nom || pj.nomFichier;
        const nom = nomBrut ? nomBrut.toLowerCase() : '';
        this.isImage = nom.endsWith('.png') || nom.endsWith('.jpg') || nom.endsWith('.jpeg');
        this.isPdf = nom.endsWith('.pdf');

        this.fichiers.contenu(pj).subscribe({
            next: (blob) => {
                const objectUrl = window.URL.createObjectURL(blob);

                if (!this.isImage && !this.isPdf) {
                    window.open(objectUrl, '_blank');
                    return;
                }

                this.url = this.sanitizer.bypassSecurityTrustResourceUrl(objectUrl);
                this.visible = true;
            },
            error: (erreur) => console.error('Aperçu impossible', erreur)
        });
    }
}
