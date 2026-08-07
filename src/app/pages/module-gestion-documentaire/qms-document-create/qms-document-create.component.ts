import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { QmsDocumentService } from '../../../services/module-gestion-documentaire/qms-document.service';
import { showToast, StatusEnum } from '../../../utils/global/global-utils';
import { Structure } from '../../parametrages/structure/structure-config/structure';
import { StructureService } from '../../parametrages/structure/structure-service/structure-service';
import { AuthService } from '../../../services/auth-services/auth.service';
import {
  DomaineApplicationService,
  NiveauConfidentialiteService,
  PrioriteDocumentService
} from '../../../services/module-gestion-documentaire/referentiel-document.service';
import { DomaineApplication, NiveauConfidentialite, PrioriteDocument } from '../../../models/referentiel-document.model';

import { Subject, takeUntil } from 'rxjs';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { SelectInputComponent } from '../../../shared';
import { FileUploadComponent } from '../../../components/non-conformite/file-upload/file-upload.component';

@Component({
  selector: 'app-qms-document-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgPrimeModule, FileUploadComponent, SelectInputComponent],
  templateUrl: './qms-document-create.component.html',
  styleUrls: ['./qms-document-create.component.scss'],
  providers: [MessageService]
})
export class QmsDocumentCreateComponent implements OnInit, OnDestroy {
  documentForm: FormGroup;
  checked: boolean = false;
  structures: Structure[] = [];

  /*
   * Options retenues dans les trois référentiels paginés.
   *
   * Le libellé accompagne l'identifiant jusqu'en base, pour que les listes s'affichent sans
   * réinterroger le référentiel. Il était retrouvé dans un tableau chargé d'avance ; ces
   * référentiels arrivant maintenant page par page, l'option est conservée telle qu'elle a été
   * choisie — sans quoi le libellé partait vide.
   */
  prioriteChoisie?: { id?: string; libelle?: string } | null;
  niveauChoisi?: { id?: string; libelle?: string } | null;
  domaineChoisi?: { id?: string; libelle?: string } | null;
  priorites: PrioriteDocument[] = [];
  niveauxConfidentialite: NiveauConfidentialite[] = [];
  domaines: DomaineApplication[] = [];

  loading = false;
  selectedFile?: File;
  showGuideModal = false;
  currentUserStructureId?: string;
  private destroy$ = new Subject<void>();

  organismesList = [
    { label: 'ISO (Organisation internationale de normalisation)', value: 'ISO' },
    { label: 'AFNOR (Association française de normalisation)', value: 'AFNOR' },
    { label: 'CEN (Comité européen de normalisation)', value: 'CEN' },
    { label: 'ANSI (American National Standards Institute)', value: 'ANSI' },
    { label: 'Interne (Notre Organisme)', value: 'Interne' }
  ];

  referencesList = [
    { label: 'ISO 9001:2015 (Management de la Qualité)', value: 'ISO 9001:2015' },
    { label: 'ISO 9000:2015 (Principes et Vocabulaire)', value: 'ISO 9000:2015' },
    { label: 'ISO 9004:2018 (Qualité d\'un organisme)', value: 'ISO 9004:2018' },
    { label: 'ISO 14001:2015 (Management Environnemental)', value: 'ISO 14001:2015' },
    { label: 'ISO 45001:2018 (Santé & Sécurité au travail)', value: 'ISO 45001:2018' },
    { label: 'ISO 27001:2022 (Sécurité de l\'information)', value: 'ISO 27001:2022' },
    { label: 'ISO 19011:2018 (Audit des Systèmes de management)', value: 'ISO 19011:2018' },
    { label: 'Norme Interne / Procédure de l\'entreprise', value: 'Norme Interne' }
  ];

  // La liste des domaines n'est plus codée ici : elle se paramètre, et le serveur en sème
  // huit au premier démarrage.

  statutsList = [
    { label: 'Obligatoire (Réglementaire)', value: 'Obligatoire' },
    { label: 'Recommandé (Normatif)', value: 'Recommandé' },
    { label: 'Volontaire', value: 'Volontaire' },
    { label: 'Interne', value: 'Interne' }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    protected qmsService: QmsDocumentService,
    protected structureService: StructureService,
    protected prioriteService: PrioriteDocumentService,
    protected niveauConfidentialiteService: NiveauConfidentialiteService,
    protected domaineService: DomaineApplicationService,
    private authService: AuthService,
    private messageService: MessageService
  ) {
    this.documentForm = this.fb.group({
      titre: [null, Validators.required],
      documentType: [null, Validators.required],
      service: [null, Validators.required],
      redacteur: [null, Validators.required],
      periodiciteMois: [12, [Validators.required, Validators.min(1)]],
      // Code propre à l'organisation, distinct du numéro attribué par le système. Le champ
      // existait en base et dans le contrat du serveur, sans qu'aucun écran ne l'offre.
      reference: [null],
      prioriteId: [null],
      niveauConfidentialiteId: [null],
      referenceOfficielle: [null],
      domaineId: [null],
      statutLegal: [null]
    });
  }

  ngOnInit(): void {
    // Priorités, niveaux de confidentialité et domaines ne sont plus chargés ici : chaque liste
    // déroulante charge le sien, page par page, et cherche auprès du serveur.
    this.loading = true;


    // De même pour les structures : trySetUserStructure y cherche celle de l'utilisateur.
    this.structureService.getAllStructures(0, 1000).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.structures = res.data?.content || res.content || [];
        this.loading = false;
        this.trySetUserStructure();
      },
      error: () => this.loading = false
    });

    this.authService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe(currentUser => {
      if (currentUser) {
        this.applyUserData(currentUser);
      }
    });

    // En complément au cas où currentUserState est nul à l'initialisation
    this.authService.getMe().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res?.data) {
          this.applyUserData(res.data);
        }
      }
    });
  }

  private applyUserData(authData: any): void {
    if (!authData) return;
    const userObj = authData.user ? authData.user : authData;
    if (!userObj) return;

    // Nom du Rédacteur
    const firstName = userObj.firstName || '';
    const lastName = userObj.lastName || '';
    let redacteurNom = `${firstName} ${lastName}`.trim();
    if (!redacteurNom) {
      redacteurNom = `${lastName} ${firstName}`.trim();
    }
    if (!redacteurNom) {
      redacteurNom = userObj.username || userObj.email || '';
    }

    if (redacteurNom) {
      this.documentForm.patchValue({ redacteur: redacteurNom });
    }

    // Service Émetteur (Structure)
    const structVal = userObj.structure;
    if (structVal) {
      this.currentUserStructureId = typeof structVal === 'object' ? (structVal.id || structVal.code) : structVal;
      this.trySetUserStructure();
    }
  }

  /**
   * Structure déjà retenue par un champ, à réinjecter dans sa liste déroulante.
   *
   * <p>Ces champs portent l'objet entier, pas son identifiant. En mode paresseux, la structure
   * pré-remplie — celle de l'utilisateur, ou celle d'un document repris — n'est pas
   * nécessairement en première page : sans cet apport, le champ paraîtrait vide alors qu'il
   * porte une valeur.</p>
   */
  structureRetenue(champ: string): any[] {
    const valeur = this.documentForm?.get(champ)?.value;
    return valeur ? [valeur] : [];
  }

  trySetUserStructure(): void {
    if (this.currentUserStructureId && this.structures.length > 0) {
      const userStructure = this.structures.find(s =>
        s.id === this.currentUserStructureId ||
        s.libelleCourt === this.currentUserStructureId ||
        s.libelleLong === this.currentUserStructureId ||
        (s as any).code === this.currentUserStructureId
      );
      if (userStructure) {
        this.documentForm.patchValue({ service: userStructure });
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  handleFileUpload(files: any[]) {
    if (files && files.length > 0) {
      this.selectedFile = files[0].file;
    } else {
      this.selectedFile = undefined;
    }
  }

  goBack(): void {
    this.router.navigate(['/gestion-documentaire/documents']);
  }

  submitDocument(): void {
    if (this.documentForm.invalid) {
      this.messageService.add({ severity: 'warn', summary: 'Formulaire incomplet', detail: 'Veuillez renseigner tous les champs obligatoires.' });
      return;
    }
    if (!this.selectedFile) {
      this.messageService.add({ severity: 'warn', summary: 'Fichier manquant', detail: 'Veuillez sélectionner un fichier à importer.' });
      return;
    }

    const formVal = this.documentForm.value;


    this.loading = true;
    const serviceObj: Structure = formVal.service;


    this.qmsService.createDocument(this.selectedFile, {
      titre: formVal.titre,
      documentType: formVal.documentType,
      serviceId: serviceObj.id!,
      serviceLibelle: serviceObj.libelleLong || '',
      serviceSigle: serviceObj.libelleCourt || '',
      redacteur: formVal.redacteur,
      periodiciteMois: formVal.periodiciteMois,
      // `confidentiel` n'est plus transmis : le serveur l'établit à partir du niveau choisi.
      // Le circuit non plus : c'est le serveur qui le choisit, du circuit désigné par le type de
      // document à défaut de celui actif pour les documents. Le transmettre depuis ici aurait figé
      // la configuration telle qu'elle était à l'ouverture de l'écran.
      ...(formVal.reference && { reference: formVal.reference }),
      ...(formVal.prioriteId && {
        prioriteId: formVal.prioriteId,
        prioriteLibelle: this.prioriteChoisie?.libelle ?? ''
      }),
      ...(formVal.niveauConfidentialiteId && {
        niveauConfidentialiteId: formVal.niveauConfidentialiteId,
        niveauConfidentialiteLibelle: this.niveauChoisi?.libelle ?? ''
      }),
      ...(formVal.referenceOfficielle && { referenceOfficielle: formVal.referenceOfficielle }),
      ...(formVal.domaineId && {
        domaineId: formVal.domaineId,
        domaine: this.domaineChoisi?.libelle ?? ''
      }),
      ...(formVal.statutLegal && { statutLegal: formVal.statutLegal })
    }).subscribe({
      next: (doc) => {
        this.loading = false;
        this.messageService.add({ severity: 'success', summary: 'Document créé', detail: `Le document ${doc.documentNumber} a été enregistré avec succès.` });

        // Le classement peut fermer le circuit du document : le dépôt aboutit, mais aucun de ses
        // décideurs ne le verra. L'avertissement reste affiché jusqu'à ce qu'on le referme, et
        // retarde la redirection — le passer en même temps que la confirmation le ferait manquer.
        if (doc.avertissementConfidentialite) {
          this.messageService.add({
            severity: 'warn', summary: 'Classement à revoir',
            detail: doc.avertissementConfidentialite, life: 15000, sticky: true
          });
          setTimeout(() => this.router.navigate(['/gestion-documentaire/documents']), 6000);
          return;
        }
        setTimeout(() => this.router.navigate(['/gestion-documentaire/documents']), 1500);
      },
      error: (err: any) => {
        this.loading = false;
        // On récupère le message d'erreur du backend s'il existe
        const backendMessage = err.error?.message || "Échec de l'enregistrement";
        showToast(StatusEnum.error, err.status, backendMessage, this.messageService, err);
      }
    });
  }
}
