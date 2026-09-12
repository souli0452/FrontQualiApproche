import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { Location, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { HttpErrorResponse } from '@angular/common/http';
import { NgPrimeModule } from '@prime-ng';

import { LicenceOuverteDirective } from '../../../../shared/licence/licence-ouverte.directive';
import { ApiItemResponse, PaginatedData } from '../../../../models/response.model';
import { convertFilesToBase64 } from '../../../../utils/fichier/fichier-utils';
import { FeaturesService } from '@core/services/feature-service';
import { getCurrentUserStructure } from '@core/auth/auth-utils';
import { currentUserState } from '@core/auth/auth.state';
import { FileUploadComponent } from '@features/non-conformite/components/file-upload/file-upload.component';
import { NiveauNonConformite, OrigineNonConformite } from '@features/non-conformite/models/referentiel.model';
import { NonConformite } from '@features/non-conformite/models/non-conformite.model';
import { EtapeTraitement, NonConformStatus } from '@features/non-conformite/models/nc-status.model';
import { NonConformiteService } from '@features/non-conformite/services/non-conformite.service';
import { OrigineNonConformiteService } from '@features/non-conformite/services/type-non-conformite.service';
import { NiveauNonConformiteService } from '@features/non-conformite/services/niveau-non-conformite.service';
import { StructureService } from '@features/organigramme/services/structure.service';
import { Structure } from '@features/organigramme/models/structure.model';


@Component({
    selector: 'app-nc-compose',
    templateUrl: './declaration.component.html',
    styleUrl: './declaration.component.scss',
    standalone: true,
    imports: [CommonModule, FormsModule, NgPrimeModule, FileUploadComponent, LicenceOuverteDirective]
})
export class NcComposeComponent implements OnInit {
    @Input() editId: any;
    @Output() closeDialog = new EventEmitter<void>();

    userStructure: Structure = {};
    structures: Structure[] = [];
    typesNcs: OrigineNonConformite[] = [];
    niveauNcs: NiveauNonConformite[] = [];
    uploadedFiles: any[] = [];
    nonConformite: NonConformite = {};
    formSubmitted: boolean = false;

    // Sélection des listes déroulantes
    nc: {
        niveauNonConformite?: NiveauNonConformite;
        typeNonformite?: OrigineNonConformite;
    } = {};

    constructor(
        private location: Location,
        private messageService: MessageService,
        protected nonConformiteService: NonConformiteService,
        private featureService: FeaturesService,
        private structureService: StructureService,
        private origineNonConformiteService: OrigineNonConformiteService,
        private niveauService: NiveauNonConformiteService,
        private activatedRoute: ActivatedRoute,
        private router: Router
    ) {
        this.loadStructures();
        this.loadNiveaux();
        this.loadTypesNonConformite();
    }

    ngOnInit(): void {
        const stored = getCurrentUserStructure();
        this.userStructure = stored?.data ?? stored ?? {};

        const user = (currentUserState.value as any)?.user;
        const structId = this.userStructure?.id || (typeof user?.structure === 'string' ? user.structure : user?.structure?.id);

        if (structId && !this.userStructure?.libelleCourt) {
            this.structureService.getByStructureId(structId).subscribe({
                next: (res: any) => {
                    this.userStructure = res?.data ?? res ?? {};
                }
            });
        }

        const id = this.editId || this.activatedRoute.snapshot.paramMap.get('id');
        if (id && id !== '' && id !== 'create') {
            this.nonConformiteService.findNCById(id).subscribe({
                next: (data) => {
                    if (data.data) {
                        this.nonConformite = data.data;
                    }
                    this.nc.typeNonformite = this.typesNcs.find(t => t.id === this.nonConformite.typeNonConformiteId);
                    this.nc.niveauNonConformite = this.niveauNcs.find(n => n.id === this.nonConformite.niveauNonConformiteId);
                }
            });
        }
    }

    async onSave(publish: boolean = false) {
        this.formSubmitted = true;

        if (!this.nc.niveauNonConformite || !this.nc.typeNonformite) {
            this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Veuillez remplir tous les champs obligatoires.' });
            return;
        }

        // 1. Résolution dynamique de la structure émettrice et de son sigle
        const user = (currentUserState.value as any)?.user;
        const structId = this.userStructure?.id || (typeof user?.structure === 'string' ? user.structure : user?.structure?.id);
        const structTrouvee = this.structures.find(s => s.id === structId);
        const struct = structTrouvee || this.userStructure || {};
        const structSigle = struct?.libelleCourt || struct?.libelleLong;

        // 2. Traitement des pièces jointes
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

                // 3. Payload officiel aligné sur le projet d'origine et le Backend Java
        const payload: NonConformite = {
            id: this.nonConformite.id,

            // Constat et correction immédiate (termes exacts de l'entité Java)
            justification: this.nonConformite.justification,
            actionDsc: this.nonConformite.actionDsc,

            // Qualification du constat
            niveauNonConformiteId: this.nc.niveauNonConformite.id,
            niveauNonConformiteLibelle: this.nc.niveauNonConformite.libelle,
            typeNonConformiteId: this.nc.typeNonformite.id,
            typeNonConformiteLibelle: this.nc.typeNonformite.libelle,

            // Structure et Processus émetteur (dynamiques)
            structureSoumissionId: structId,
            structureSoumissionLibelle: structSigle,
            typeProcessusId: struct?.typeProcessusId,
            typeProcessusLibelle: struct?.typeProcessusLibelle,

            fichiers: [...fichiersExistants, ...nouveauxFichiers]
        };

        // Gestion stricte de la publication vs brouillon (comme dans PROJET-SOURCE)
        if (publish) {
            payload.status = NonConformStatus.PUBLISHED;
            payload.etatTraitement = EtapeTraitement.RECEPTION;
        } else if (!payload.id) {
            payload.status = NonConformStatus.DRAFT;
            payload.etatTraitement = EtapeTraitement.SOUMISSION;
        }

        console.log("📤 [NC COMPOSE] Données officielles envoyées :", payload);

        if (payload.id != null && publish) {
            const dejaEnregistre = payload.id;
            this.nonConformiteService.update(payload).subscribe({
                next: () => this.nonConformiteService.soumettre(dejaEnregistre).subscribe(this.onResponse(true)),
                error: this.onResponse(true).error
            });
        } else if (payload.id != null) {
            this.nonConformiteService.update(payload).subscribe(this.onResponse(false));
        } else if (publish) {
            // Création avec soumission directe vers l'étape RECEPTION (pilote)
            this.nonConformiteService.creerEtSoumettre(payload).subscribe(this.onResponse(true));
        } else {
            // Enregistrement simple en brouillon
            this.nonConformiteService.create(payload).subscribe(this.onResponse(false));
        }

    }

    onResponse(publish: boolean) {
        return {
            next: (res: ApiItemResponse<NonConformite>) => {
                this.messageService.add({
                    severity: 'success',
                    summary: publish ? 'Non-conformité soumise' : 'Brouillon enregistré',
                    detail: res.message || (publish
                        ? "Elle est transmise au pilote du processus, qui en sera prévenu."
                        : "Vous pourrez la compléter puis la soumettre depuis vos brouillons.")
                });

                if (!this.editId) {
                    if (publish) {
                        this.router.navigate(['/non-conformite/suivi']);
                    } else {
                        this.location.back();
                    }
                }
                this.featureService.onReloadRequested(true);
            },
            error: (error: HttpErrorResponse) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Erreur',
                    detail: error.error?.message || 'Une erreur est survenue'
                });
            }
        };
    }

    loadStructures() {
        this.structureService.getAllStructure().subscribe({
            next: (data: PaginatedData<Structure>) => {
                this.structures = data.content || [];
            },
            error: (error: HttpErrorResponse) => console.error("Erreur structures", error)
        });
    }

    loadNiveaux() {
        this.niveauService.findAll().subscribe({
            next: (resp) => {
                this.niveauNcs = resp.data.content || [];
            },
            error: (error: HttpErrorResponse) => console.error(error)
        });
    }

    loadTypesNonConformite() {
        this.origineNonConformiteService.findAll().subscribe({
            next: (resp) => {
                this.typesNcs = resp.data.content || [];
            },
            error: (error: HttpErrorResponse) => console.error(error)
        });
    }

    handleFileUpload(files: any[]) {
        this.uploadedFiles = files;
    }

    removeExistingFile(index: number) {
        if (this.nonConformite.fichiers) {
            this.nonConformite.fichiers.splice(index, 1);
        }
    }

    goBack() {
        if (this.editId) {
            this.closeDialog.emit();
        } else {
            this.location.back();
        }
    }
}
