import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NgPrimeModule } from '@prime-ng';
import { PieceJointeFichierService } from '@features/non-conformite/services/piece-jointe-fichier.service';

/** Extensions que le navigateur sait peindre lui-même, sans aide. */
const IMAGES = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'];

@Component({
    selector: 'app-lightbox',
    standalone: true,
    imports: [CommonModule, NgPrimeModule],
    template: `
        <p-drawer 
            [(visible)]="visible" 
            [modal]="true" 
            position="right"
            [style]="{ width: '70vw' }"
            appendTo="body">
            <ng-template pTemplate="header">
                <div class="flex items-center gap-3 w-full">
                    <div class="flex items-center justify-center bg-blue-50 text-blue-500 rounded-full shrink-0" style="width: 3rem; height: 3rem">
                        <i class="pi pi-eye text-xl"></i>
                    </div>
                    <div class="flex flex-col flex-1 min-w-0">
                        <span class="font-bold text-lg text-900 mb-0.5 truncate" [title]="titre">{{ titre }}</span>
                        <span class="text-500 text-xs truncate" [title]="sousTitre">{{ sousTitre }}</span>
                    </div>
                    <!-- L'enregistrement se fait depuis l'aperçu, jamais avant lui : on regarde
                         d'abord, on garde ensuite si le document est bien celui qu'on cherchait. -->
                    <p-button *ngIf="blob" label="Télécharger" icon="pi pi-download"
                        [outlined]="true" size="small" styleClass="mr-3 shrink-0"
                        (onClick)="telecharger()"></p-button>
                </div>
            </ng-template>
            
            <!-- Conteneur flex pour remplir la hauteur disponible dans le volet -->
            <div class="flex justify-center items-center w-full h-full bg-slate-50 rounded-lg p-2 border border-slate-100 overflow-hidden">
                <!-- Si c'est une image -->
                <img *ngIf="isImage" [src]="url" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 8px;" />
                
                <!-- Si c'est un PDF -->
                <object *ngIf="isPdf" [data]="url" type="application/pdf" width="100%" height="100%" style="border-radius: 8px;">
                    <p>Votre navigateur ne supporte pas l'affichage PDF direct. <a [href]="url" target="_blank">Cliquez ici pour l'ouvrir</a>.</p>
                </object>

                <!-- Ni image ni PDF : un traitement de texte, un tableur. Le volet le dit et
                     propose l'enregistrement, plutôt que d'ouvrir un cadre vide ou de déclencher
                     un téléchargement que personne n'a demandé. -->
                <div *ngIf="apercuImpossible" class="flex flex-col items-center gap-3 text-center px-6">
                    <i class="pi pi-file text-4xl text-slate-400"></i>
                    <p class="text-sm text-slate-600 m-0">
                        Ce format ne s'affiche pas dans le navigateur.<br>
                        Le fichier reste consultable une fois enregistré.
                    </p>
                    <p-button label="Télécharger le fichier" icon="pi pi-download" size="small"
                        (onClick)="telecharger()"></p-button>
                </div>
            </div>
        </p-drawer>
    `
})
export class LightboxComponent implements OnDestroy {
    visible: boolean = false;
    url: SafeResourceUrl | null = null;
    isImage: boolean = false;
    isPdf: boolean = false;
    /** Ni l'un ni l'autre : le navigateur ne sait pas rendre ce format. */
    apercuImpossible: boolean = false;
    titre: string = 'Visualisation du document';
    sousTitre: string = 'Visualisation de la pièce jointe';

    /**
     * Le contenu affiché, gardé le temps du volet.
     *
     * <p>Il sert à l'enregistrer sans le redemander au serveur : un second appel compterait une
     * seconde fois dans la piste d'accès du document, et consulter n'est pas télécharger.</p>
     */
    blob: Blob | null = null;

    private nomFichier: string = 'document';
    private objectUrl: string | null = null;

    constructor(
        private sanitizer: DomSanitizer,
        private fichiers: PieceJointeFichierService
    ) {}

    /**
     * Ouvre l'aperçu direct à partir d'un Blob (PDF ou image).
     */
    public openBlob(blob: Blob, nomFichier: string = 'document.pdf', titreDoc?: string) {
        if (!blob) return;
        this.preparer(blob, nomFichier);
        this.titre = titreDoc || 'Visualisation du document';
        this.sousTitre = nomFichier;
        this.visible = true;
    }

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

        this.fichiers.contenu(pj).subscribe({
            next: (blob) => {
                this.preparer(blob, nomBrut || 'document');
                this.titre = 'Visualisation du document';
                this.sousTitre = nomBrut || '';
                this.visible = true;
            },
            error: (erreur) => console.error('Aperçu impossible', erreur)
        });
    }

    /** Enregistre le fichier affiché, sous le nom qu'il porte. */
    public telecharger(): void {
        if (!this.blob) return;
        const url = window.URL.createObjectURL(this.blob);
        const lien = window.document.createElement('a');
        lien.href = url;
        lien.download = this.nomFichier;
        lien.click();
        setTimeout(() => window.URL.revokeObjectURL(url), 100);
    }

    ngOnDestroy(): void {
        this.libererObjectUrl();
    }

    /**
     * Range le contenu et décide de ce qui peut s'afficher.
     *
     * <p>Un nom sans extension est tenu pour un PDF : c'est le cas du fonds documentaire, dont les
     * fichiers sont désignés par leur numéro. Traiter ces documents comme illisibles priverait
     * d'aperçu ceux-là mêmes pour lesquels il a été fait.</p>
     */
    private preparer(blob: Blob, nomFichier: string): void {
        this.libererObjectUrl();

        const nom = (nomFichier || '').toLowerCase().trim();
        const extension = nom.includes('.') ? nom.slice(nom.lastIndexOf('.')) : '';

        this.isImage = IMAGES.includes(extension);
        this.isPdf = !this.isImage && (extension === '.pdf' || extension === '');
        this.apercuImpossible = !this.isImage && !this.isPdf;

        this.blob = blob;
        this.nomFichier = nomFichier || 'document';

        if (this.apercuImpossible) {
            this.url = null;
            return;
        }

        this.objectUrl = window.URL.createObjectURL(blob);
        this.url = this.sanitizer.bypassSecurityTrustResourceUrl(this.objectUrl);
    }

    /**
     * Rend au navigateur l'URL du contenu précédent.
     *
     * <p>Sans cela, chaque aperçu laissait son fichier en mémoire jusqu'au rechargement de la
     * page : dix documents consultés, dix fichiers retenus.</p>
     */
    private libererObjectUrl(): void {
        if (this.objectUrl) {
            window.URL.revokeObjectURL(this.objectUrl);
            this.objectUrl = null;
        }
    }
}
