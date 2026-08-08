import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Table } from 'primeng/table';

import { Location } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { NonConformStatus } from '../../../enums/enums';
import { FeaturesService } from '../../../services/feature-service';
import { showToast, StatusEnum } from '../../../utils/global/global-utils';


import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { FileUploadComponent } from '../file-upload/file-upload.component';
import { WorkflowActionsComponent } from '../../../shared/workflow/workflow-actions.component';
import { WorkflowGuidanceComponent } from '../../../shared/workflow/workflow-guidance.component';
import { WorkflowSaisiesComponent } from '../../../shared/workflow/workflow-saisies.component';
import { WorkflowHistoriqueComponent } from '../../../shared/workflow/workflow-historique.component';
import { NonConformiteService } from '../../../services/non-conformite/non-conformite.service';
import { GlobalSearchService } from '../../../services/non-conformite/global-search.service';
import { forkJoin } from 'rxjs';
import { PlanActionService } from '../../../services/non-conformite/planAction.service';
import { ChoixDeChampService } from '../../../shared/workflow/choix-de-champ.service';
import { PieceJointeFichierService } from '../../../services/non-conformite/piece-jointe-fichier.service';
import { LicenceOuverteDirective } from '../../../shared/licence/licence-ouverte.directive';

@Component({
    selector: 'app-traitement-action',
    templateUrl: './traitement-action-table.html',
    styleUrl: './traitement-action-table.scss',
    standalone: true,
    imports: [CommonModule, FormsModule, NgPrimeModule, FileUploadComponent, WorkflowActionsComponent, WorkflowGuidanceComponent, WorkflowSaisiesComponent,
        WorkflowHistoriqueComponent, LicenceOuverteDirective]
})
export class TraitementActionTable implements OnInit {

    @Input() nonTraiterData!: any[];
    @Input() loading: boolean = false;
    @Input() status!: NonConformStatus;
    @Input() cols!: any[];
    @Input() colDetails!: any[];
    @Output() delete = new EventEmitter<any>();
    @Output() archive = new EventEmitter<any>();
    @Input() paginator: boolean = true;
    @Input() showGridlines: boolean = true;

    @Input() totalElements: number = 0;
    @Input() pageSize: number = 10;
    @Input() currentPage: number = 0;
    @Output() pageChangeEvent = new EventEmitter<{ page: number, size: number }>();


    uploadedFiles: any[] = [];
    confirmKey = 'confirmKey';
    planAction:any={};
    displayDialog:boolean=false;
    enregistrement:boolean=false;
    depotEnCours:boolean=false;
    /** Personne à qui le pilote confie l'action au moment d'en constater la réalisation. */
    nouveauResponsable:string|null=null;
    utilisateursDeMaStructure:any[]=[];

    @ViewChild('dt') table!: Table;
    private destroy$: Subject<boolean> = new Subject<boolean>();

   constructor(
    private router: Router, 
    private messageService: MessageService,
    private nonConformiteService: NonConformiteService,
    private featureService: FeaturesService,
    private confirmationService: ConfirmationService,
    private location: Location,
    private globalSearchService: GlobalSearchService,
    private planActionService: PlanActionService,
    private choixService: ChoixDeChampService,
    private pieceJointeService: PieceJointeFichierService
    ) {}

    ngOnInit(): void {
        // Écouter la barre de recherche globale
        this.globalSearchService.searchQuery$
            .pipe(takeUntil(this.destroy$))
            .subscribe(query => {
                if (this.table) {
                    this.table.filterGlobal(query, 'contains');
                }
            });

    }

    goBack() {
        this.location.back();
    }

    onPageChange(event: any) {
        // PrimeNG renvoie : 
        // event.page : l'index de la page (0, 1, 2...)
        // event.rows : le nombre de lignes par page
        this.pageChangeEvent.emit({ 
            page: event.page, 
            size: event.rows 
        });
    }




    onArchive(event: Event, rowdata: any) {
        event.stopPropagation();
        this.confirmationService.confirm({
            message: `Voulez-vous archiver la non conformité N° ${rowdata.numeroReference} ? `,
            key: this.confirmKey,
            accept: () => {
                this.archive.emit(rowdata);
                event.stopPropagation();
            },
            reject:()=>{
                this.goBack();

            }
        });
    }

    onDelete(event: Event, rowdata: any) {
        event.stopPropagation();
        this.confirmationService.confirm({
            message: `Voulez-vous supprimer la non conformité N° ${rowdata.numeroReference} ? `,
            key: this.confirmKey,
            accept: () => {
                this.delete.emit(rowdata);
                event.stopPropagation();
            },
            reject:()=>{
                this.goBack();
            }
        });
    }

    onPublish(event: Event, rowdata: any) {
        event.stopPropagation();
        this.planAction=rowdata;
        this.nouveauResponsable=null;
        if (this.peutChangerLeResponsable && !this.utilisateursDeMaStructure.length) {
            this.chargerLesCollegues();
        }
        console.log( this.planAction);
        this.displayDialog=true;

    }

    toggleOptions(event: Event, opt: HTMLElement, date: HTMLElement) {
        if (event.type === 'mouseenter') {
            opt.style.display = 'flex';
            date.style.display = 'none';
        } else {
            opt.style.display = 'none';
            date.style.display = 'flex';
        }

    }

    onRowSelect(id: number) {
        this.router.navigate(['/traitement-action/detail/', id]);
    }


    onGlobalFilter(table: Table, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }


    protected readonly NonConformStatus = NonConformStatus;

    /**
     * L'utilisateur peut-il rendre compte du traitement de cette action ?
     *
     * <p>Seulement celui qui la mène, et seulement pendant qu'il la mène. « Peut agir » vient du
     * circuit — c'est lui qui sait que l'étape est réservée au responsable de l'action — et l'étape
     * vient du statut que les décisions propagent. Une fois l'action déclarée réalisée, ce qui a été
     * écrit est ce sur quoi le pilote puis le responsable qualité se prononcent : le laisser
     * réécrire après coup viderait leur avis de son sens.</p>
     */
    get peutRendreCompte(): boolean {
        return this.planAction?.status === 'NON_TRAITER' && this.actionsOuvertes;
    }

    /**
     * L'utilisateur peut-il confier cette action à quelqu'un d'autre ?
     *
     * <p>Au moment où le pilote constate la réalisation, et là seulement : c'est le point où il peut
     * juger qu'elle relève de quelqu'un d'autre. Le reste du temps, l'action est en cours ou déjà
     * jugée.</p>
     */
    get peutChangerLeResponsable(): boolean {
        return this.planAction?.status === 'EN_VERIFICATION' && this.actionsOuvertes;
    }

    /**
     * Collègues à qui l'action peut être confiée.
     *
     * <p>La même source que celle des champs de circuit : les agents de la structure de l'appelant.
     * L'annuaire entier laisserait désigner quelqu'un qui ne relève pas de lui.</p>
     */
    private chargerLesCollegues() {
        this.choixService.choix('@UTILISATEURS_MA_STRUCTURE').subscribe({
            next: (options: any[]) => this.utilisateursDeMaStructure = options ?? [],
            error: () => this.utilisateursDeMaStructure = []
        });
    }

    /** Le circuit ouvre-t-il une décision à l'appelant sur cette action ? */
    private get actionsOuvertes(): boolean {
        return (this.planAction?.workflowState?.allowedActions?.length ?? 0) > 0;
    }

    /**
     * Enregistre la saisie du plan sans le faire avancer.
     *
     * <p>La correction et la décision étaient jusqu'ici le même geste : « Soumettre » écrivait le
     * statut <i>Traité</i> depuis l'écran. Le plan changeait d'état sans que son circuit en sache
     * rien, si bien que l'étape affichée et l'étape réelle divergeaient dès la première
     * soumission.</p>
     */
    enregistrer() {
        // Seul l'identifiant part : le serveur lit le nom et l'adresse à leur source, un libellé
        // recopié se périmant au premier changement d'état civil.
        if (this.peutChangerLeResponsable && this.nouveauResponsable) {
            this.planAction.responsableId = this.nouveauResponsable;
        }
        this.enregistrement = true;
        this.nonConformiteService.nonConformiteUpdatePlanAction(this.planAction).subscribe({
            next: (data) => {
                this.enregistrement = false;
                showToast(StatusEnum.success, data.status, 'Saisie enregistrée', this.messageService);
            },
            error: (error) => {
                this.enregistrement = false;
                showToast(StatusEnum.error, error.status, 'Une erreur est survenue', this.messageService, error);
            }
        });
    }

    /** Le circuit a franchi une étape : la liste ne reflète plus l'état réel du plan. */
    apresDecision() {
        this.displayDialog = false;
        this.featureService.onReloadRequested(true);
    }
    /**
     * Dépose les fichiers choisis sur le serveur.
     *
     * <p>Ils étaient convertis en base64 et posés sur l'objet local : rien côté serveur ne les
     * enregistrait, et la pièce disparaissait au rechargement de la liste. Chaque fichier part
     * maintenant vers le stockage, et la liste affichée est celle que le serveur rend.</p>
     */
    handleFileUpload(files: any[]) {
        this.uploadedFiles = files ?? [];
        if (!this.uploadedFiles.length || !this.planAction?.id) {
            return;
        }

        this.depotEnCours = true;
        const depots = this.uploadedFiles.map((fichier: File) =>
            this.planActionService.deposerFichier(this.planAction.id, fichier)
        );
        forkJoin(depots).subscribe({
            next: (pieces: any[]) => {
                this.depotEnCours = false;
                this.uploadedFiles = [];
                this.planAction.fichiers = [...(this.planAction.fichiers ?? []), ...pieces.filter(Boolean)];
                showToast(StatusEnum.success, 200, 'Justificatif(s) déposé(s)', this.messageService);
            },
            error: (error) => {
                this.depotEnCours = false;
                showToast(StatusEnum.error, error.status, "Le dépôt n'a pas abouti", this.messageService, error);
            }
        });
    }

    /**
     * Retire une pièce déjà déposée.
     *
     * <p>La retirer du seul tableau affiché laissait le fichier sur le stockage et le rattachement
     * en base : elle réapparaissait au rechargement.</p>
     */
    removeExistingFile(index: number) {
        const piece = this.planAction?.fichiers?.[index];
        if (!piece) {
            return;
        }
        if (!piece.id) {
            this.planAction.fichiers.splice(index, 1);
            return;
        }
        this.pieceJointeService.supprimer(piece.id).subscribe({
            next: () => this.planAction.fichiers.splice(index, 1),
            error: (error) => showToast(StatusEnum.error, error.status,
                "La pièce n'a pas pu être supprimée", this.messageService, error)
        });
    }

    getSeverity(gravity: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        if (!gravity) return 'secondary';
        
        const val = gravity.toLowerCase().trim();
        if (val.includes('critique') || val.includes('danger')) {
            return 'danger';  // 🔴 Rouge
        }
        if (val.includes('majeur')) { // <-- Sans le 'e'
            return 'warn'; // 🟡 Orange
        }
        if (val.includes('mineur')) { // <-- Sans le 'e'
            return 'info';    // 🔵 Bleu
        }
        
        return 'secondary';
    }

    getFieldValue(row: any, field: string): any {
        if (!row) return null;
        
        // 1. Chercher directement à la racine (ex: niveauNonConformiteLibelle)
        if (row[field] !== undefined && row[field] !== null) return row[field];
        
        // 2. Si l'objet est une NonConformite qui contient un tableau planActions
        if (row.planActions && Array.isArray(row.planActions) && row.planActions.length > 0) {
            if (row.planActions[0][field] !== undefined && row.planActions[0][field] !== null) {
                return row.planActions[0][field];
            }
        }
        
        // 3. Fallbacks et mappings spécifiques
        if (field === 'procEmetteur') {
            return row.origineService || row.origineServiceLibelleCourt;
        }
        if (field === 'numeroNc') {
            return row.numeroReference || row.numeroNc;
        }
        
        return null;
    }

    isEcheanceProcheOuDepassee(dateStr: string): boolean {
        if (!dateStr) return false;
        
        // Supposons que le format soit DD-MM-YYYY ou YYYY-MM-DD
        let echeanceDate: Date;
        
        if (dateStr.includes('-')) {
            const parts = dateStr.split('-');
            if (parts.length === 3) {
                // Si l'année est en dernier (DD-MM-YYYY)
                if (parts[2].length === 4) {
                    echeanceDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
                } 
                // Si l'année est en premier (YYYY-MM-DD)
                else if (parts[0].length === 4) {
                    echeanceDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                } else {
                    echeanceDate = new Date(dateStr);
                }
            } else {
                echeanceDate = new Date(dateStr);
            }
        } else {
            echeanceDate = new Date(dateStr);
        }

        if (isNaN(echeanceDate.getTime())) return false;

        const now = new Date();
        // On remet "now" à 00:00:00 pour comparer des jours entiers si besoin, ou on garde l'heure exacte.
        // Ici, on garde l'heure exacte pour la règle stricte de 24h
        const diffMs = echeanceDate.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        
        return diffHours <= 24;
    }

    getKeys(obj: any): string[] {
        if (!obj) return [];
        return Object.keys(obj);
    }

    ngOnDestroy(): void {
        this.destroy$.next(true);
        this.destroy$.complete();
    }

}
