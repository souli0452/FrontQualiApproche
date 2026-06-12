import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Location } from '@angular/common';
import { convertFilesToBase64, getCurrentUserStructure, onFileUpload, PieceJointe, showToast, StatusEnum, StatusEnumShow } from '../../../utils';
import { MessageService } from 'primeng/api';
import { HttpErrorResponse } from '@angular/common/http';
import { FeaturesService } from '../../../services/feature-service';
import {
    ActionNonConformite,
    ApiItemResponse,
    NiveauNonConformite,
    NonConformite,
    PaginatedData,
    Reclamation,
    TypeNonConformite,
    TypeProcessus
} from '../../../models';
// import { TypeProcessusService } from '../../../services/non-conformite/type-processus.service';
// import { ReclamationService } from '../../../services/reclamation.service';
// import { ActionNonConformiteService } from '../../../services/non-conformite/action-non-conformite.service';
import { ActivatedRoute, Router } from '@angular/router';
import { NonConformStatus, EtapeTraitement } from '../../../enums';
import { NonConformiteService } from '../../../services/non-conformite/non-conformite.service';
import { TypeNonConformiteService } from '../../../services/non-conformite/type-non-conformite.service';
import { NiveauNonConformiteService } from '../../../services/non-conformite/niveau-non-conformite.service';
import { Structure } from '../../parametrages/structure/structure-config/structure';
import { StructureService } from '../../parametrages/structure/structure-service/structure-service';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { FileUploadComponent } from '../../../components/non-conformite/file-upload/file-upload.component';

@Component({
    selector: 'app-nc-compose',
    templateUrl: './nc-compose.component.html',
    styleUrl: './nc-compose.component.scss',
    standalone: true,
    imports: [CommonModule, FormsModule, NgPrimeModule, FileUploadComponent]
})
export class NcComposeComponent {
    @Input() editId: any;
    @Output() closeDialog = new EventEmitter<void>();

    userStructure: Structure = {};
    nc: any = { pieceJointes: [] };
    hasImage: any;
    pieceJointe: PieceJointe = {};
    pieceJointes: PieceJointe[] = [];

    structures: Structure[] = [];
    typesNcs: TypeNonConformite[] = [];
    niveauNcs: NiveauNonConformite[] = [];
    typeProcessus: TypeProcessus[] = [];
    reclamationsClients: Reclamation[] = [];
    formSubmitted: boolean = false;
    uploadedFiles: any[] = [];
    nonConformite: NonConformite = {};
    typesActions: ActionNonConformite[] = [];
    constructor(
        private location: Location,
        private messageService: MessageService,
        protected nonConformiteService: NonConformiteService,
        private featureService: FeaturesService,
        private structureService: StructureService,
        // private typeProcessusService: TypeProcessusService,
        private typeNonConformiteService: TypeNonConformiteService,
        // private reclamationService: ReclamationService,
        private niveauService: NiveauNonConformiteService,
        // protected actionNonConformiteService: ActionNonConformiteService,
        private activatedRoute: ActivatedRoute,
        private router: Router
    ) {
        this.loadStuctures();
        this.loadNiveau();
        // this.loadReclamations();
        this.loadTypeNonConformite();
        // this.loadProcessus();
        // this.fetchActions();
    }

    goBack() {
        if (this.editId) {
            this.closeDialog.emit();
        } else {
            this.location.back();
        }
    }
    removeExistingFile(index: number) {
        if (this.nonConformite.fichiers) {
            this.nonConformite.fichiers.splice(index, 1);
        }
    }


    ngOnInit(): void {
        this.userStructure = getCurrentUserStructure();
        const id = this.editId || this.activatedRoute.snapshot.paramMap.get('id');

        if (id && id !== '' && id !== 'create') {
            this.nonConformiteService
                .findNCById(id)
                .pipe()
                .subscribe({
                    next: (data) => {
                        if (data.data) {
                            this.nonConformite = data.data;
                        }
                        this.nc.origineService = this.structures.find((value) => value.id === this.nonConformite.origineId);
                        // this.nc.typeProcedure = this.typeProcessus.find((value) => value.id === this.nonConformite.typeProcessusId);
                        this.nc.typeNonformite = this.typesNcs.find((value) => value.id === this.nonConformite.typeNonConformiteId);
                        this.nc.niveauNonConformite = this.niveauNcs.find((value) => value.id === this.nonConformite.niveauNonConformiteId);
                        // this.nc.typeAction = this.typesActions.find((value) => value.id === this.nonConformite.actionId);
                        // this.nc.reclamationClient = this.reclamationsClients.find((value) => value.id === this.nonConformite.originNonConformiteId);
                    }
                });
        }
    }

    async onSave(publish: boolean = false) {
        this.formSubmitted = true;

        // Vérification de base pour éviter les erreurs d'accès à undefined
        if (!this.nc.niveauNonConformite || !this.nc.typeNonformite) {
            this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Veuillez remplir tous les champs obligatoires.' });
            return;
        }

        // Remplir les champs requis
        this.nonConformite.niveauNonConformiteId = this.nc.niveauNonConformite.id;
        this.nonConformite.typeNonConformiteId = this.nc.typeNonformite.id;
        this.nonConformite.structureSoumissionLibelle = this.userStructure?.libelleCourt;
        this.nonConformite.structureSoumissionId = this.userStructure?.id;
        // On récupère directement la structure de l'utilisateur pour le processus
        this.nonConformite.typeProcessusId = this.userStructure?.id;
        this.nonConformite.typeProcessusLibelle = this.userStructure?.libelleCourt || this.userStructure?.libelleCourt;

        if (this.nc.typeAction) {
            this.nonConformite.actionLibelle = this.nc.typeAction.libelle;
            this.nonConformite.actionId = this.nc.typeAction.id;
        }

        this.nonConformite.fonctionEmetteur = '';
        this.nonConformite.niveauNonConformiteLibelle = this.nc.niveauNonConformite.libelle;
        this.nonConformite.typeNonConformiteLibelle = this.nc.typeNonformite.libelle;

        // Gestion des pièces jointes de manière asynchrone
        if (this.uploadedFiles && this.uploadedFiles.length > 0) {
            try {
                const base64Files = await convertFilesToBase64(this.uploadedFiles);
                this.nonConformite.fichiers = base64Files.map(fileData => ({
                    fichier: fileData.fichierBase64,
                    nom: fileData.nomFichier,
                    type: fileData.typeFichier
                }));
            } catch (error) {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Erreur lors de la conversion des fichiers.' });
                return;
            }
        }

        if (publish) {
            this.nonConformite.status = NonConformStatus.PUBLISHED;
            this.nonConformite.etatTraitement = EtapeTraitement.RECEPTION;
            console.log("NON CONFORMITE " , this.nonConformite);
            
        } else if (!this.nonConformite.id) {
            this.nonConformite.status = NonConformStatus.DRAFT;
        }

        if (this.nonConformite.id != null) {
            this.nonConformiteService.update(this.nonConformite).subscribe(this.onResponse(publish));
        } else {
            this.nonConformiteService.create(this.nonConformite).subscribe(this.onResponse(publish));
        }
    }

    onResponse(publish: boolean) {
        return {
            next: (res: ApiItemResponse<NonConformite>) => { // ✅ correction ici
                this.messageService.add({
                    severity: 'success',
                    summary: 'Succès',
                    detail: res.message || 'La non-conformité a été enregistrée avec succès.'
                });

                if (!this.editId) {
                    if (publish) {
                        this.router.navigate(['/non-conformite/publiees']);
                    } else {
                        this.location.back();
                    }
                }

                this.featureService.onReloadRequested(true);
            },

            error: (error: HttpErrorResponse) => {
                console.log("ERREUR :", error);

                this.messageService.add({
                    severity: 'error',
                    summary: 'Erreur',
                    detail: error.error?.message || 'Une erreur est survenue'
                });
            }
        };
    }

    // loadStuctures() {
    //     this.structureService
    //         .getAllStructures()
    //         .pipe()
    //         .subscribe({
    //             next: (resp: HttpResponse<Structure[]>) => {
    //                 this.structures = resp.data.content || [];
    //             },
    //             error: (error: HttpErrorResponse) => {}
    //         });
    // }

    loadStuctures() {
    this.structureService
        .getAllStructure() // Assurez-vous que le nom de la méthode est correct
        .subscribe({
            next: (data: PaginatedData<Structure>) => {
                this.structures = data.content || [];
            },
            error: (error: HttpErrorResponse) => {
                console.error("Erreur lors du chargement des structures", error);
            }
        });
    }


    // loadNiveau() {
    //     this.niveauService
    //         .findAll()
    //         .pipe()
    //         .subscribe({
    //             next: (data: PaginatedData<NiveauNonConformite>) => {
    //                 this.niveauNcs = data.content || [];
    //             },
    //             error: (error: HttpErrorResponse) => {}
    //         });
    // }



    loadNiveau() {
        this.niveauService.findAll().subscribe({
            next: (resp) => {
                this.niveauNcs = resp.data.content || [];
            },
            error: (error: HttpErrorResponse) => {
                console.error(error);
            }
        });
    }



    
    // loadReclamations() {
    //     this.reclamationService
    //         .findAll()
    //         .subscribe({
    //             next: (resp) => {
    //                 this.reclamationsClients = resp.data.content || [];
    //             },
    //             error: (error: HttpErrorResponse) => {}
    //         });
    // }
    loadTypeNonConformite() {
        this.typeNonConformiteService
            .findAll()
            .subscribe({
                next: (resp) => {
                    this.typesNcs = resp.data.content || [];
                },
                error: (error: HttpErrorResponse) => {}
            });
    }
    // loadProcessus() {
    //     this.typeProcessusService
    //         .findAll()
    //         .subscribe({
    //             next: (resp) => {
    //                 this.typeProcessus = resp.data.content || [];
    //             },
    //             error: (error: HttpErrorResponse) => {}
    //         });
    // }
    handleFileUpload(files: any[]) {
        this.uploadedFiles = files;
    }
    // fetchActions() {
    //     this.actionNonConformiteService
    //         .findAll()
    //         .subscribe({
    //             next: (res) => {
    //                 this.typesActions = res.data.content || [];
    //             },
    //             error: (error: HttpErrorResponse) => {}
    //         });
    // }
}
