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
import { QmsDocumentType, DocumentWorkflow } from '../../../models/gestion-documentaire.model';
import { AuthService } from '../../../services/auth-services/auth.service';
import { WorkflowService } from '../../../services/module-gestion-documentaire/workflow.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-qms-document-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgPrimeModule],
  templateUrl: './qms-document-create.component.html',
  styleUrls: ['./qms-document-create.component.scss'],
  providers: [MessageService]
})
export class QmsDocumentCreateComponent implements OnInit, OnDestroy {
  documentForm: FormGroup;
  documentTypes: QmsDocumentType[] = [];
  structures: Structure[] = [];
  loading = false;
  selectedFile?: File;
  showGuideModal = false;
  workflows: DocumentWorkflow[] = [];
  associatedWorkflow?: DocumentWorkflow;
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

  domainesList = [
    { label: 'Qualité (SMQ)', value: 'Qualité' },
    { label: 'Environnement (SME)', value: 'Environnement' },
    { label: 'Santé & Sécurité au Travail (SST)', value: 'Santé & Sécurité' },
    { label: 'Sécurité de l\'Information (SMSI)', value: 'Sécurité de l\'information' },
    { label: 'Sécurité Alimentaire (SMSDA - ISO 22000)', value: 'Sécurité Alimentaire' },
    { label: 'Management Général', value: 'Management Général' },
    { label: 'Ressources Humaines', value: 'Ressources Humaines' },
    { label: 'Production & Opérations', value: 'Production & Opérations' }
  ];

  statutsList = [
    { label: 'Obligatoire (Réglementaire)', value: 'Obligatoire' },
    { label: 'Recommandé (Normatif)', value: 'Recommandé' },
    { label: 'Volontaire', value: 'Volontaire' },
    { label: 'Interne', value: 'Interne' }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private qmsService: QmsDocumentService,
    private workflowService: WorkflowService,
    private structureService: StructureService,
    private authService: AuthService,
    private messageService: MessageService
  ) {
    this.documentForm = this.fb.group({
      titre: [null, Validators.required],
      documentType: [null, Validators.required],
      service: [null, Validators.required],
      redacteur: [null, Validators.required],
      periodiciteMois: [12, [Validators.required, Validators.min(1)]],
      confidentiel: [false],
      documentExterne: [false],
      processusDest: [null],
      referenceOfficielle: [null],
      domaine: [null],
      statutLegal: [null]
    });
  }

  ngOnInit(): void {
    this.loading = true;

    this.qmsService.typeDocumentQmsGetAll().subscribe({
      next: (res: any) => {
        this.documentTypes = res.data?.content || [];
        this.findAssociatedWorkflow(this.documentForm.get('documentType')?.value);
      },
      error: (err: any) => console.error('Erreur chargement types de document', err)
    });

    this.workflowService.getAllWorkflows().subscribe({
      next: (res) => {
        this.workflows = res || [];
        this.findAssociatedWorkflow(this.documentForm.get('documentType')?.value);
      },
      error: (err) => console.error('Erreur chargement des workflows', err)
    });

    this.documentForm.get('documentType')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(typeCode => {
      this.findAssociatedWorkflow(typeCode);
    });

    this.structureService.getAllStructures().pipe(takeUntil(this.destroy$)).subscribe({
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

  findAssociatedWorkflow(typeCode: string): void {
    if (typeCode) {
      this.associatedWorkflow = this.workflows.find(w => w.documentType === typeCode);
    } else {
      this.associatedWorkflow = undefined;
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
      confidentiel: formVal.confidentiel,
      documentExterne: formVal.documentExterne,
      ...(this.associatedWorkflow && { workflowId: this.associatedWorkflow.id }),
      ...(formVal.processusDest && {
        processusDestId: formVal.processusDest.id,
        processusDestLibelle: formVal.processusDest.libelleLong || formVal.processusDest.libelleCourt || ''
      }),
      ...(formVal.referenceOfficielle && { referenceOfficielle: formVal.referenceOfficielle }),
      ...(formVal.domaine && { domaine: formVal.domaine }),
      ...(formVal.statutLegal && { statutLegal: formVal.statutLegal })
    }).subscribe({
      next: (doc) => {
        this.loading = false;
        this.messageService.add({ severity: 'success', summary: 'Document créé', detail: `Le document ${doc.documentNumber} a été enregistré avec succès.` });
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
