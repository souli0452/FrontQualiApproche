import { Component } from '@angular/core';
import { Location } from '@angular/common';
import { convertFilesToBase64, getCurrentUserStructure, onFileUpload, PieceJointe, showToast, StatusEnum, StatusEnumShow } from '../../../utils';
import { MessageService } from 'primeng/api';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { FeaturesService } from '../../../services/feature-service';
import { NonConformiteService } from '../../../services/non-conformite.service';
import { takeUntil } from 'rxjs';
import { StructureService } from '../../structure/structure-service/structure-service';
import { Structure } from '../../structure/structure-config/structure';
import {
    ActionNonConformite,
    NiveauNonConformite,
    NonConformite,
    Reclamation,
    TypeNonConformite,
    TypeProcessus
} from '../../../models';
import { TypeProcessusService } from '../../../services/type-processus.service';
import { TypeNonConformiteService } from '../../../services/type-non-conformite.service';
import { ReclamationService } from '../../../services/reclamation.service';
import { NiveauNonConformiteService } from '../../../services/niveau-non-conformite.service';
import { ActionNonConformiteService } from '../../../services/action-non-conformite.service';
import { ActivatedRoute } from '@angular/router';

@Component({
    selector: 'app-nc-compose',
    templateUrl: './nc-compose.component.html',
    standalone: false
})
export class NcComposeComponent {
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
        private typeProcessusService: TypeProcessusService,
        private typeNonConformiteService: TypeNonConformiteService,
        private reclamationService: ReclamationService,
        private niveauService: NiveauNonConformiteService,
        protected actionNonConformiteService: ActionNonConformiteService,
        private activatedRoute: ActivatedRoute
    ) {
        this.loadStuctures();
        this.loadNiveau();
        this.loadReclamations();
        this.loadTypeNonConformite();
        this.loadProcessus();
        this.fetchActions();
    }

    goBack() {
        this.location.back();
    }
    ngOnInit(): void {
        this.userStructure = getCurrentUserStructure();
        const id = this.activatedRoute.snapshot.paramMap.get('id');

        if (id && id !== '' && id !== 'create') {
            this.nonConformiteService
                .findById(id)
                .pipe()
                .subscribe({
                    next: (data) => {
                        if (data.body) {
                            this.nonConformite = data.body;
                        }
                        this.nc.origineService = this.structures.find((value) => value.id === this.nonConformite.origineId);
                        this.nc.typeProcedure = this.typeProcessus.find((value) => value.id === this.nonConformite.typeProcessusId);
                        this.nc.typeNonformite = this.typesNcs.find((value) => value.id === this.nonConformite.typeNonConformiteId);
                        this.nc.niveauNonConformite = this.niveauNcs.find((value) => value.id === this.nonConformite.niveauNonConformiteId);
                        this.nc.typeAction = this.typesActions.find((value) => value.id === this.nonConformite.actionId);
                        this.nc.reclamationClient = this.reclamationsClients.find((value) => value.id === this.nonConformite.originNonConformiteId);
                    }
                });
        }
    }

    async onSave() {
        this.formSubmitted = true;

        // Vérification de base pour éviter les erreurs d'accès à undefined
        if (!this.nc.niveauNonConformite || !this.nc.typeNonformite || !this.nc.origineService || !this.nc.typeProcedure) {
            this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Veuillez remplir tous les champs obligatoires.' });
            return;
        }

        // Remplir les champs requis
        this.nonConformite.niveauNonConformiteId = this.nc.niveauNonConformite.id;
        this.nonConformite.typeNonConformiteId = this.nc.typeNonformite.id;
        this.nonConformite.structureSoumissionLibelle = this.userStructure?.libelleCourt;
        this.nonConformite.structureSoumissionId = this.userStructure?.id;
        this.nonConformite.typeProcessusId = this.nc.typeProcedure.id;
        this.nonConformite.typeProcessusLibelle = this.nc.typeProcedure.libelle;

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

        console.log(this.nonConformite);
        if (this.nonConformite.id != null) {
            this.nonConformiteService.update(this.nonConformite).subscribe(this.onResponse());
        } else {
            this.nonConformiteService.save(this.nonConformite).subscribe(this.onResponse());
        }
    }

    onResponse() {
        return {
            next: (res: HttpResponse<any>) => {
                showToast(StatusEnum.success, res.status, null, this.messageService);
                this.featureService.onReloadRequested(true);
                this.goBack();
            },
            error: (error: HttpErrorResponse) => {
                showToast(StatusEnum.error, error.status, null, this.messageService, error);
            }
        };
    }

    loadStuctures() {
        this.structureService
            .getAllStructures()
            .pipe()
            .subscribe({
                next: (resp: HttpResponse<Structure[]>) => {
                    this.structures = resp.body || [];
                },
                error: (error: HttpErrorResponse) => {}
            });
    }

    loadNiveau() {
        this.niveauService
            .findAll()
            .pipe()
            .subscribe({
                next: (resp: HttpResponse<NiveauNonConformite[]>) => {
                    this.niveauNcs = resp.body || [];
                },
                error: (error: HttpErrorResponse) => {}
            });
    }
    loadReclamations() {
        this.reclamationService
            .findAll()
            .pipe()
            .subscribe({
                next: (resp: HttpResponse<Reclamation[]>) => {
                    this.reclamationsClients = resp.body || [];
                },
                error: (error: HttpErrorResponse) => {}
            });
    }
    loadTypeNonConformite() {
        this.typeNonConformiteService
            .findAll()
            .pipe()
            .subscribe({
                next: (resp: HttpResponse<TypeNonConformite[]>) => {
                    this.typesNcs = resp.body || [];
                },
                error: (error: HttpErrorResponse) => {}
            });
    }
    loadProcessus() {
        this.typeProcessusService
            .findAll()
            .pipe()
            .subscribe({
                next: (resp: HttpResponse<TypeProcessus[]>) => {
                    this.typeProcessus = resp.body || [];
                },
                error: (error: HttpErrorResponse) => {}
            });
    }
    handleFileUpload(files: any[]) {
        this.uploadedFiles = files;
    }
    fetchActions() {
        this.actionNonConformiteService
            .findAll()
            .pipe()
            .subscribe({
                next: (res: HttpResponse<ActionNonConformite[]>) => {
                    this.typesActions = res.body || [];
                },
                error: (error: HttpErrorResponse) => {}
            });
    }
}
