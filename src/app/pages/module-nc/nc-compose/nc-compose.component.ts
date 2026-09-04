import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Location } from '@angular/common';
import { getCurrentUserStructure } from '../../../utils/global/global-utils';
import { MessageService } from 'primeng/api';
import { HttpErrorResponse } from '@angular/common/http';
import { FeaturesService } from '../../../services/feature-service';
// import { TypeProcessusService } from '../../../services/non-conformite/type-processus.service';
// import { ReclamationService } from '../../../services/reclamation.service';
// import { ActionNonConformiteService } from '../../../services/non-conformite/action-non-conformite.service';
import { ActivatedRoute, Router } from '@angular/router';
import { NonConformStatus, EtapeTraitement } from '../../../enums/enums';
import { NonConformiteService } from '../../../services/non-conformite/non-conformite.service';
import { NiveauNonConformiteService } from '../../../services/non-conformite/niveau-non-conformite.service';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { FileUploadComponent } from '../../../components/non-conformite/file-upload/file-upload.component';
import { ApiItemResponse, PaginatedData } from '../../../models/response.model';
import { ActionNonConformite, NiveauNonConformite, NonConformite, OrigineNonConformite } from '../../../models/non-conformite.model';
import { CategorieProcessus } from '../../../models/categore-processus.model';
import { Reclamation } from '../../../models/reclamation.model';
import { OrigineNonConformiteService } from '../../../services/non-conformite/type-non-conformite.service';
import { convertFilesToBase64, PieceJointe } from '../../../utils/fichier/fichier-utils';
import { LicenceOuverteDirective } from '../../../shared/licence/licence-ouverte.directive';
import { StructureService } from '../../parametrages/structure/structure.service';
import { Structure } from '../../parametrages/structure/structure.model';

@Component({
    selector: 'app-nc-compose',
    templateUrl: './nc-compose.component.html',
    styleUrl: './nc-compose.component.scss',
    standalone: true,
    imports: [CommonModule, FormsModule, NgPrimeModule, FileUploadComponent, LicenceOuverteDirective]
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
    typesNcs: OrigineNonConformite[] = [];
    niveauNcs: NiveauNonConformite[] = [];
    categorieProcessus: CategorieProcessus[] = [];
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
        private origineNonConformiteService: OrigineNonConformiteService,
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
                        // this.nc.typeProcedure = this.typeProcessus.find((value) => value.id === this.nonConformite.categorieProcessusId);
                        this.nc.typeNonformite = this.typesNcs.find((value) => value.id === this.nonConformite.sourceDeNonConformiteId);
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
        this.nonConformite.sourceDeNonConformiteId = this.nc.typeNonformite.id;
        this.nonConformite.sourceDeNonConformiteLibelle = this.nc.typeNonformite.libelle;
        this.nonConformite.structureDeSoumissionLibelle = this.userStructure?.libelleCourt;
        this.nonConformite.structureDeSoumissionId = this.userStructure?.id;
        this.nonConformite.categorieProcessusId = this.userStructure?.typeProcessusId;
        this.nonConformite.categorieProcessusLibelle = this.userStructure?.typeProcessusLibelle;
        this.nonConformite.description = this.nonConformite.description;
        this.nonConformite.actionImmediate = this.nonConformite.actionImmediate;
        this.nonConformite.sourceDeNonConformiteId = this.nc.typeNonformite.id;
        this.nonConformite.structureDeSoumissionLibelle = this.userStructure?.libelleCourt;
        this.nonConformite.structureDeSoumissionId = this.userStructure?.id;
        // On récupère le type de processus lié à la structure de l'utilisateur
        this.nonConformite.categorieProcessusId = this.userStructure?.typeProcessusId;
        this.nonConformite.categorieProcessusLibelle = this.userStructure?.typeProcessusLibelle;

        if (this.nc.typeAction) {
            this.nonConformite.actionLibelle = this.nc.typeAction.libelle;
            this.nonConformite.actionId = this.nc.typeAction.id;
        }

        this.nonConformite.fonctionEmetteur = '';
        this.nonConformite.niveauNonConformiteLibelle = this.nc.niveauNonConformite.libelle;
        this.nonConformite.sourceDeNonConformiteLibelle = this.nc.typeNonformite.libelle;

        // Préparer la liste des pièces jointes sans muter l'état local en cas d'échec
        const fichiersExistants = (this.nonConformite.fichiers || []).filter(f => !!f.url);
        let nouveauxFichiers: any[] = [];

        if (this.uploadedFiles && this.uploadedFiles.length > 0) {
            try {
                const base64Files = await convertFilesToBase64(this.uploadedFiles);
                nouveauxFichiers = base64Files.map(fileData => ({
                    fichier: fileData.fichierBase64,
                    nom: fileData.nomFichier,
                    type: fileData.typeFichier
                }));
            } catch (error) {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Erreur lors de la conversion des fichiers.' });
                return;
            }
        }

        const payload: any = {
            ...this.nonConformite,
            fichiers: [...fichiersExistants, ...nouveauxFichiers]
        };

        if (!payload.id) {
            payload.status = NonConformStatus.DRAFT;
        }

        console.log("DONNÉES ENVOYÉES AU SERVEUR (Payload) :", payload);

        if (payload.id != null && publish) {
            const dejaEnregistre = payload.id;
            this.nonConformiteService.update(payload).subscribe({
                next: () => this.nonConformiteService.soumettre(dejaEnregistre)
                    .subscribe(this.onResponse(true)),
                error: this.onResponse(true).error
            });
        } else if (payload.id != null) {
            this.nonConformiteService.update(payload).subscribe(this.onResponse(publish));
        } else if (publish) {
            this.nonConformiteService.creerEtSoumettre(payload).subscribe(this.onResponse(true));
        } else {
            this.nonConformiteService.create(payload).subscribe(this.onResponse(false));
        }
    }

    onResponse(publish: boolean) {
        return {
            next: (res: ApiItemResponse<NonConformite>) => { // ✅ correction ici
                console.log("RÉPONSE DU SERVEUR (Succès) :", res);
                this.messageService.add({
                    severity: 'success',
                    summary: publish ? 'Non-conformité soumise' : 'Brouillon enregistré',
                    detail: res.message || (publish
                        ? "Elle est transmise au pilote du processus, qui en sera prévenu."
                        : "Vous pourrez la compléter puis la soumettre depuis vos brouillons.")
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
        this.origineNonConformiteService
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
