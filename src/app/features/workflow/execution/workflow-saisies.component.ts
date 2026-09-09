import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { SaisieDto, WorkflowStateDto } from '../models';
import { ChoixDeChampService } from '../services/choix-de-champ.service';
import { PieceJointeFichierService, ProcNonConformiteService } from '@features/non-conformite';

/**
 * Ce que le dossier a recueilli au fil de son circuit, rassemblé au même endroit.
 */
@Component({
    selector: 'app-workflow-saisies',
    standalone: true,
    imports: [CommonModule],
    template: `
        @if (saisies.length) {
            <div class="wf-saisies" [class.wf-saisies--rejet]="isRejet">
                @if (titre) {
                    <div class="wf-saisies-titre flex items-center gap-2 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                        <i class="pi pi-info-circle text-primary-500 text-lg"></i>
                        <span>{{ titre }}</span>
                    </div>
                }
                <div class="wf-saisies-grid flex flex-col gap-3">
                    @for (saisie of saisies; track saisie.fieldName) {
                        <div class="wf-saisies-card flex items-center justify-between p-3 rounded-lg transition-all shadow-sm">
                            <div class="wf-saisies-left flex items-center gap-3">
                                <div class="wf-saisies-icon flex items-center justify-center rounded-full">
                                    <i [class]="getIconForField(saisie)"></i>
                                </div>
                                <div class="flex flex-col">
                                    <span class="wf-saisies-label text-sm font-semibold">{{ saisie.fieldLabel || saisie.fieldName }}</span>
                                </div>
                            </div>
                            
                            <div class="wf-saisies-right flex flex-col items-end gap-1.5 text-right max-w-lg">
                                <div class="wf-saisies-value-wrapper">
                                    @if (getFileObject(saisie)) {
                                        <div class="wf-saisie-file-card flex items-center gap-3 bg-white px-3 py-1.5 rounded-md border border-red-200 shadow-sm">
                                            <img [src]="getFileIcon(getFileObject(saisie).nom || getFileObject(saisie).nomFichier)" 
                                                 alt="File icon" 
                                                 width="24" 
                                                 height="24" 
                                                 class="border-round" />
                                            <span class="wf-saisie-file-name font-semibold text-red-700 text-sm max-w-[200px] truncate" [title]="getFileObject(saisie).nom">{{ getFileObject(saisie).nom }}</span>
                                            <div class="wf-saisie-file-actions flex gap-1">
                                                <button type="button" 
                                                        class="p-button-xs flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors border-none"
                                                        (click)="visualiserFichier(getFileObject(saisie))" 
                                                        title="Visualiser">
                                                    <i class="pi pi-search text-xs"></i>
                                                </button>
                                                <button type="button" 
                                                        class="p-button-xs flex items-center justify-center w-6 h-6 rounded-full bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors border-none"
                                                        (click)="telechargerFichier(getFileObject(saisie))" 
                                                        title="Télécharger">
                                                    <i class="pi pi-cloud-download text-xs"></i>
                                                </button>
                                            </div>
                                        </div>
                                    } @else {
                                        <span class="wf-saisies-valeur text-sm font-bold block">{{ valeurDe(saisie) }}</span>
                                    }
                                </div>
                                <div class="wf-saisies-metadata flex items-center gap-1.5 text-xs font-medium">
                                    <span class="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-[11px] font-semibold">{{ getOrigineStep(saisie) }}</span>
                                    <span class="text-slate-300 dark:text-slate-600">•</span>
                                    <span class="text-slate-800 dark:text-slate-200 font-bold">{{ getOrigineUser(saisie) }}</span>
                                    @if (getOrigineDate(saisie)) {
                                        <span class="text-slate-300 dark:text-slate-600">•</span>
                                        <span class="text-slate-500 dark:text-slate-400">{{ getOrigineDate(saisie) }}</span>
                                    }
                                </div>
                            </div>
                        </div>
                    }
                </div>
            </div>
        } @else if (messageSiVide) {
            <div class="wf-saisies wf-saisies--vide flex items-center gap-2 p-3 text-slate-500 italic bg-slate-50 rounded-lg border border-slate-150">
                <i class="pi pi-info-circle text-slate-400"></i>
                <span>{{ messageSiVide }}</span>
            </div>
        }
    `,
    styles: [`
        .wf-saisies {
            border: 1px solid var(--surface-200, #e2e8f0);
            border-radius: 0.75rem;
            padding: 1rem 1.25rem;
            font-size: 0.875rem;
            background: var(--surface-0, #fff);
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
        }
        .wf-saisies-titre {
            font-size: 1rem;
            font-weight: 700;
            color: var(--text-color, #0f172a);
        }
        .wf-saisies-card {
            border: 1px solid #f1f5f9;
            background-color: #f8fafc;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.75rem 1rem;
            border-radius: 0.5rem;
            transition: all 0.2s ease-in-out;
        }
        .wf-saisies-card:hover {
            border-color: var(--primary-color-200, #cbd5e1);
            background-color: #ffffff;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
            transform: translateY(-1px);
        }
        .wf-saisies-icon {
            background-color: #eff6ff;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 2.25rem;
            height: 2.25rem;
            border-radius: 9999px;
        }
        .wf-saisies-label {
            color: var(--text-color, #334155);
            font-weight: 600;
            font-size: 0.875rem;
        }
        .wf-saisies-valeur {
            color: var(--text-color, #0f172a);
            background-color: #ffffff;
            border: 1px solid var(--surface-200, #e2e8f0);
            border-radius: 0.375rem;
            padding: 0.25rem 0.75rem;
            font-weight: 600;
            font-size: 0.875rem;
            box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }
        .wf-saisies-metadata {
            display: flex;
            align-items: center;
            gap: 0.375rem;
            font-size: 0.75rem;
            color: var(--text-color-secondary, #64748b);
        }
        
        /* Fichier joint card */
        .wf-saisie-file-card {
            display: inline-flex;
            align-items: center;
            background: #ffffff;
            border: 1px solid #fecaca;
            border-radius: 0.375rem;
            padding: 0.25rem 0.5rem;
            box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }
        .wf-saisie-file-name {
            font-weight: 600;
            color: #b91c1c;
            font-size: 0.8125rem;
            margin-right: 0.5rem;
        }
        .wf-saisie-file-actions button {
            background: transparent;
            border: none;
            color: #ef4444;
            cursor: pointer;
            padding: 0.25rem;
            border-radius: 0.25rem;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.15s;
        }
        .wf-saisie-file-actions button:hover {
            background-color: #fee2e2;
            color: #991b1b;
        }

        /* État Rejet */
        .wf-saisies--rejet {
            border-color: #fca5a5 !important;
            background-color: #fff5f5 !important;
        }
        .wf-saisies--rejet .wf-saisies-titre {
            color: #b91c1c !important;
        }

        /* Dark mode (.app-dark & .dark) */
        :host-context(.app-dark) .wf-saisies,
        :host-context(.dark) .wf-saisies {
            background-color: #1e293b;
            border-color: #334155;
        }
        :host-context(.app-dark) .wf-saisies-card,
        :host-context(.dark) .wf-saisies-card {
            background-color: #0f172a;
            border-color: #1e293b;
        }
        :host-context(.app-dark) .wf-saisies-card:hover,
        :host-context(.dark) .wf-saisies-card:hover {
            background-color: #1e293b;
            border-color: #3b82f6;
        }
        :host-context(.app-dark) .wf-saisies-icon,
        :host-context(.dark) .wf-saisies-icon {
            background-color: rgba(59, 130, 246, 0.15);
            color: #60a5fa;
        }
        :host-context(.app-dark) .wf-saisies-label,
        :host-context(.dark) .wf-saisies-label {
            color: #e2e8f0;
        }
        :host-context(.app-dark) .wf-saisies-valeur,
        :host-context(.dark) .wf-saisies-valeur {
            background-color: #1e293b;
            border-color: #334155;
            color: #f8fafc;
        }
        :host-context(.app-dark) .wf-saisie-file-card,
        :host-context(.dark) .wf-saisie-file-card {
            background: #1e1e1e;
            border-color: #7f1d1d;
        }
        :host-context(.app-dark) .wf-saisie-file-name,
        :host-context(.dark) .wf-saisie-file-name {
            color: #fca5a5;
        }
        :host-context(.app-dark) .wf-saisie-file-actions button,
        :host-context(.dark) .wf-saisie-file-actions button {
            color: #f87171;
        }
        :host-context(.app-dark) .wf-saisie-file-actions button:hover,
        :host-context(.dark) .wf-saisie-file-actions button:hover {
            background-color: #450a0a;
            color: #fecaca;
        }
        :host-context(.app-dark) .wf-saisies--rejet,
        :host-context(.dark) .wf-saisies--rejet {
            border-color: #7f1d1d !important;
            background-color: #450a0a !important;
        }
        :host-context(.app-dark) .wf-saisies--rejet .wf-saisies-titre,
        :host-context(.dark) .wf-saisies--rejet .wf-saisies-titre {
            color: #fca5a5 !important;
        }

        @media (max-width: 640px) {
            .wf-saisies-card { flex-direction: column; align-items: flex-start; gap: 0.75rem; }
            .wf-saisies-right { align-items: flex-start; text-align: left; }
        }
    `]
})
export class WorkflowSaisiesComponent implements OnChanges {

    /**
     * Un identifiant brut, tel que les champs alimentés par le référentiel en enregistrent —
     * « Processus destinataire » porte l'UUID d'une structure, pas son nom.
     */
    private static readonly UUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    /**
     * Les sources dont les valeurs sont des identifiants. La saisie ne dit pas de quelle source
     * elle vient — le moteur ne transporte que des chaînes — mais un UUID est unique parmi
     * toutes : chercher dans leur réunion suffit.
     */
    private static readonly SOURCES_D_IDENTIFIANTS = ['@STRUCTURES', '@UTILISATEURS'];

    /** État du circuit du dossier, tel que le serveur le joint à la ressource. */
    @Input() state?: WorkflowStateDto | null;

    /** Le dossier de non-conformité parent, utile pour récupérer les fichiers réels. */
    @Input() parentDemande: any = null;

    /** Événement émis lors de la demande de prévisualisation d'un fichier. */
    @Output() onOpenFile = new EventEmitter<any>();

    /** Titre du bloc. Vide, aucun titre n'est affiché — utile dans un onglet qui en porte déjà un. */
    @Input() titre = 'Informations recueillies';

    /**
     * Ce qu'il faut dire quand le dossier n'a encore rien recueilli. Vide, le bloc s'efface :
     * mieux vaut ne rien montrer qu'un cadre vide sur une fiche à peine ouverte.
     */
    @Input() messageSiVide = '';

    /** Libellés connus des référentiels, indexés par identifiant. Rempli à la demande. */
    private libelles = new Map<string, string>();
    private chargementLance = false;

    constructor(
        private readonly choixDeChamp: ChoixDeChampService,
        private readonly fichiers: PieceJointeFichierService,
        private readonly ncService: ProcNonConformiteService,
        private readonly http: HttpClient
    ) {}

    get isRejet(): boolean {
        const parent = this.parentDemande;
        const state = this.state;
        const status = parent?.status || state?.status;
        if (status === 'DRAFT' || status === 'Brouillon') return false;

        const STEP_ORDER: Record<string, number> = {
            'SOUMISSION': 1,
            'RECEPTION': 2,
            'VALIDATION_RQ': 3,
            'IMPUTATION': 4,
            'TRAITEMENT': 5,
            'VALIDATION': 6,
            'VALIDATION_RS': 7,
            'SUIVI_RQ': 8,
            'CLOTURE': 9,

            // Support des codes numériques du moteur de workflow
            '1': 1, // SOUMISSION
            '2': 2, // RECEPTION
            '3': 3, // VALIDATION_RQ
            '4': 4, // IMPUTATION
            '5': 5, // TRAITEMENT
            '6': 6, // VALIDATION
            '7': 7, // VALIDATION_RS
            '8': 8, // SUIVI_RQ
            '9': 9  // CLOTURE
        };

        const currentStep = parent?.etatTraitement || state?.currentStateCode || '';
        const currentOrder = STEP_ORDER[currentStep] || 0;

        const saisies = state?.saisies || [];
        const docRejetId = parent?.docRejet?.id?.toLowerCase();
        const docRejetNom = (parent?.docRejet?.nom || parent?.docRejet?.nomFichier || '').toLowerCase();

        const rejectionSaisie = saisies.find((s: any) => {
            const val = (s.value || '').toLowerCase();
            const fieldName = (s.fieldName || '').toLowerCase();
            const fieldLabel = (s.fieldLabel || '').toLowerCase();

            return fieldName.includes('rejet') || 
                   fieldLabel.includes('rejet') ||
                   fieldName === 'docrejet' ||
                   (docRejetId && val.includes(docRejetId)) ||
                   (docRejetNom && val.includes(docRejetNom));
        });

        if (rejectionSaisie) {
            const rejectOrder = STEP_ORDER[rejectionSaisie.stepCode || ''] || 0;
            if (rejectOrder > currentOrder) {
                return true; // Rejet actif
            }
        }

        // Cas de repli : retour à l'étape initiale SOUMISSION
        if (currentStep === 'SOUMISSION' && status !== 'DRAFT') {
            return true;
        }

        return false;
    }

    getFileObject(saisie: SaisieDto): any {
        const val = (saisie.value ?? '').trim();
        if (!val || (!val.startsWith('NON_CONFORMITE/') && !val.includes('/'))) return null;
        if (!this.parentDemande) return null;

        const normVal = val.toLowerCase().trim();

        // Vérification de docRejet
        if (this.parentDemande.docRejet) {
            const docUrl = (this.parentDemande.docRejet.url || '').toLowerCase().trim();
            const docNom = (this.parentDemande.docRejet.nom || '').toLowerCase().trim();
            if (docUrl === normVal || docNom === normVal || (this.parentDemande.docRejet.id && normVal.includes(this.parentDemande.docRejet.id.toLowerCase()))) {
                return this.parentDemande.docRejet;
            }
        }

        // Vérification de fichiers array
        if (Array.isArray(this.parentDemande.fichiers)) {
            const found = this.parentDemande.fichiers.find((f: any) => {
                const fUrl = (f.url || '').toLowerCase().trim();
                const fNom = (f.nom || '').toLowerCase().trim();
                return fUrl === normVal || fNom === normVal || (f.id && normVal.includes(f.id.toLowerCase()));
            });
            if (found) return found;
        }

        // Si le fichier n'est pas dans le tableau principal mais a un chemin valide, on crée un objet fichier virtuel
        const fileName = val.split('/').pop() || 'fichier';
        return {
            isVirtual: true,
            nom: fileName,
            nomFichier: fileName,
            url: val,
            reference: val
        };
    }

    private blobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64data = reader.result as string;
                const base64 = base64data.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    visualiserFichier(file: any) {
        if (file.isVirtual) {
            const url = this.ncService.urlFichier(this.parentDemande.id, file.reference);
            this.http.get(url, { responseType: 'blob' }).subscribe({
                next: (blob) => {
                    this.blobToBase64(blob).then((base64) => {
                        const fileWithContent = {
                            nom: file.nom,
                            nomFichier: file.nom,
                            type: blob.type,
                            fichier: base64
                        };
                        if (this.onOpenFile.observed) {
                            this.onOpenFile.emit(fileWithContent);
                        } else {
                            this.fichiers.visualiser(fileWithContent);
                        }
                    });
                },
                error: (erreur) => console.error('Aperçu impossible', erreur)
            });
        } else if (this.onOpenFile.observed) {
            this.onOpenFile.emit(file);
        } else {
            this.fichiers.visualiser(file);
        }
    }

    telechargerFichier(file: any) {
        if (file.isVirtual) {
            const url = this.ncService.urlFichier(this.parentDemande.id, file.reference);
            this.http.get(url, { responseType: 'blob' }).subscribe({
                next: (blob) => {
                    const downloadUrl = window.URL.createObjectURL(blob);
                    const lien = document.createElement('a');
                    lien.href = downloadUrl;
                    lien.download = file.nom;
                    lien.click();
                    setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 100);
                },
                error: (erreur) => console.error('Téléchargement impossible', erreur)
            });
        } else {
            this.fichiers.telecharger(file);
        }
    }

    /**
     * Charge les dictionnaires de libellés, seulement si une valeur à traduire existe : la
     * plupart des dossiers n'en portent aucune, et interroger les référentiels sur chaque fiche
     * serait payer pour rien. Le service met les réponses en cache pour la session.
     */
    ngOnChanges(): void {
        if (this.chargementLance || !this.contientDesIdentifiants()) {
            return;
        }
        this.chargementLance = true;
        for (const source of WorkflowSaisiesComponent.SOURCES_D_IDENTIFIANTS) {
            this.choixDeChamp.choix(source).subscribe((choix) => {
                for (const c of choix) {
                    this.libelles.set(c.value, c.label);
                }
            });
        }
    }

    get saisies(): SaisieDto[] {
        return (this.state?.saisies ?? []).filter((saisie: SaisieDto) => {
            const valeur = (saisie.value ?? '').trim();
            // Un UUID ne dit rien à personne : quand une réponse en est un, c'est son libellé au
            // référentiel qui s'affiche. Introuvable — structure supprimée, référentiel
            // injoignable — la ligne s'efface plutôt que de montrer l'identifiant.
            return valeur.length > 0
                && (!WorkflowSaisiesComponent.UUID.test(valeur) || this.libelles.has(valeur));
        });
    }

    /** Valeur telle qu'elle se lit : celle saisie, ou son libellé quand c'est un identifiant. */
    valeurDe(saisie: SaisieDto): string {
        const valeur = (saisie.value ?? '').trim();
        return this.libelles.get(valeur) ?? valeur;
    }

    private contientDesIdentifiants(): boolean {
        return (this.state?.saisies ?? []).some((saisie: SaisieDto) =>
            WorkflowSaisiesComponent.UUID.test((saisie.value ?? '').trim())
            || WorkflowSaisiesComponent.UUID.test((saisie.auteur ?? '').trim()));
    }

    /**
     * D'où vient la donnée : l'étape qui l'a demandée, qui l'a saisie et quand.
     *
     * <p>Une valeur sans origine se lit comme une propriété de la fiche ; or c'est une réponse
     * donnée par quelqu'un, à un moment du circuit, et cela change ce qu'on en fait.</p>
     */
    origine(saisie: SaisieDto): string {
        const morceaux: string[] = [];
        if (saisie.stepName) {
            morceaux.push(saisie.stepName);
        }
        // L'auteur est le nom du décideur quand le serveur l'a enregistré, sinon son identifiant
        // brut — cas des décisions antérieures à cet enregistrement. L'identifiant se traduit
        // alors par l'annuaire ; s'il n'y figure plus, l'origine se réduit à l'étape et à la
        // date, comme le fait déjà l'historique.
        const auteur = (saisie.auteur ?? '').trim();
        if (auteur && !WorkflowSaisiesComponent.UUID.test(auteur)) {
            morceaux.push(auteur);
        } else if (this.libelles.has(auteur)) {
            morceaux.push(this.libelles.get(auteur)!);
        }
        if (saisie.decisionDate) {
            const date = new Date(saisie.decisionDate);
            if (!Number.isNaN(date.getTime())) {
                morceaux.push(date.toLocaleDateString('fr-FR'));
            }
        }
        return morceaux.join(' • ');
    }

    getOrigineStep(saisie: SaisieDto): string {
        return saisie.stepName || (saisie.stepCode ? `Étape ${saisie.stepCode}` : '');
    }

    getOrigineUser(saisie: SaisieDto): string {
        const auteur = (saisie.auteur ?? '').trim();
        if (auteur && !WorkflowSaisiesComponent.UUID.test(auteur)) {
            return auteur;
        } else if (this.libelles.has(auteur)) {
            return this.libelles.get(auteur)!;
        }
        return 'Système';
    }

    getOrigineDate(saisie: SaisieDto): string {
        if (saisie.decisionDate) {
            const date = new Date(saisie.decisionDate);
            if (!Number.isNaN(date.getTime())) {
                return date.toLocaleDateString('fr-FR');
            }
        }
        return '';
    }

    getIconForField(saisie: SaisieDto): string {
        const name = (saisie.fieldName || '').toLowerCase();
        const label = (saisie.fieldLabel || '').toLowerCase();
        if (name.includes('rejet') || label.includes('rejet')) return 'pi pi-exclamation-triangle text-red-500';
        if (name.includes('destinataire') || label.includes('destinataire')) return 'pi pi-directions text-blue-500';
        if (name.includes('circuit') || label.includes('circuit')) return 'pi pi-sitemap text-teal-500';
        if (name.includes('responsable') || label.includes('responsable') || name.includes('agent')) return 'pi pi-user text-purple-500';
        if (name.includes('motif') || label.includes('motif')) return 'pi pi-comment text-orange-500';
        return 'pi pi-tag text-slate-500';
    }

    getFileIcon(filename: string): string {
        if (!filename) return 'assets/images/unknown-file.png';
        const extension = filename.split('.').pop()?.toLowerCase() || '';
        const icons: { [key: string]: string } = {
            doc: 'assets/images/doc-file.png',
            docx: 'assets/images/doc-file.png',
            xlsx: 'assets/images/xls-file.png',
            pdf: 'assets/images/pdf-file.png',
            jpeg: 'assets/images/jpeg-file.png',
            jpg: 'assets/images/jpeg-file.png',
            png: 'assets/images/jpeg-file.png',
            txt: 'assets/images/txt-file.png'
        };
        return icons[extension] || 'assets/images/unknown-file.png';
    }
}
