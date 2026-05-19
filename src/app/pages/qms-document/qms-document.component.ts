import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { NgPrimeModule } from '../../../prime-ng.module';
import { QmsDocumentService, DocumentQms, QmsDocumentType, QmsDocumentVersion, QmsAuditLog } from '../../services/qms-document.service';
import { StructureService } from '../structure/structure-service/structure-service';
import { Structure } from '../structure/structure-config/structure';
import { showToast, StatusEnum } from '../../utils';

@Component({
  selector: 'app-qms-document',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgPrimeModule],
  templateUrl: './qms-document.component.html',
  styleUrls: ['./qms-document.component.scss'],
  providers: [MessageService, DatePipe]
})
export class QmsDocumentComponent implements OnInit, OnDestroy {
  documents: DocumentQms[] = [];
  documentTypes: QmsDocumentType[] = [];
  structures: Structure[] = [];
  loading = false;
  destroy$ = new Subject<void>();

  // Filter properties
  searchQuery = '';
  selectedType = '';
  selectedService = '';
  selectedStatuses: string[] = [];
  dateFrom: string = '';
  dateTo: string = '';

  statusOptions = [
    { label: 'Brouillon', value: 'brouillon' },
    { label: 'En Approbation', value: 'en_approbation' },
    { label: 'Valide', value: 'valide' },
    { label: 'Obsolète', value: 'obsolete' },
    { label: 'En Retard Révision', value: 'en_retard_revision' }
  ];

  // Modals visibility
  showCreateModal = false;
  showTransitionModal = false;
  showDetailsDrawer = false;
  showHistoryDrawer = false;
  showAuditDrawer = false;

  // Selected object contexts
  selectedDocument?: DocumentQms;
  versionHistory: QmsDocumentVersion[] = [];
  auditLogs: QmsAuditLog[] = [];

  // Form Groups
  documentForm: FormGroup;
  transitionForm: FormGroup;
  selectedFile?: File;

  constructor(
    private fb: FormBuilder,
    private qmsService: QmsDocumentService,
    private structureService: StructureService,
    private messageService: MessageService,
    private datePipe: DatePipe
  ) {
    this.documentForm = this.fb.group({
      documentType: [null, Validators.required],
      service: [null, Validators.required],
      redacteur: [null, Validators.required],
      periodiciteMois: [12, [Validators.required, Validators.min(1)]],
      confidentiel: [false],
      documentExterne: [false],
      organismeEmetteur: [null],
      referenceOfficielle: [null],
      domaine: [null],
      statutLegal: [null]
    });

    this.transitionForm = this.fb.group({
      nextStatus: [null, Validators.required],
      reason: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadInitialData(): void {
    this.loading = true;

    // Load dynamic Document Types from DB
    this.qmsService.getAllTypes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (types) => this.documentTypes = types,
        error: (err) => console.error('Failed to load document types', err)
      });

    // Load Structures/Services from DB
    this.structureService.getAllStructures()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => this.structures = res.body || [],
        error: (err) => console.error('Failed to load structures', err)
      });

    this.refreshList();
  }

  refreshList(): void {
    this.loading = true;
    this.qmsService.searchDocuments({
      query: this.searchQuery,
      documentType: this.selectedType,
      serviceId: this.selectedService,
      status: this.selectedStatuses,
      dateFrom: this.dateFrom ? this.datePipe.transform(this.dateFrom, 'yyyy-MM-dd')! : undefined,
      dateTo: this.dateTo ? this.datePipe.transform(this.dateTo, 'yyyy-MM-dd')! : undefined
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (docs) => {
          this.documents = docs;
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          showToast(StatusEnum.error, err.status, 'Erreur de chargement des documents', this.messageService, err);
        }
      });
  }

  // Handle File Input Selection
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  openUploadModal(): void {
    this.selectedFile = undefined;
    this.documentForm.reset({
      periodiciteMois: 12,
      confidentiel: false,
      documentExterne: false
    });
    this.showCreateModal = true;
  }

  submitDocument(): void {
    if (this.documentForm.invalid || !this.selectedFile) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulaire incomplet',
        detail: 'Veuillez renseigner tous les champs obligatoires et sélectionner un fichier.'
      });
      return;
    }

    this.loading = true;
    const formVal = this.documentForm.value;
    const serviceObj: Structure = formVal.service;

    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('documentType', formVal.documentType);
    formData.append('serviceId', serviceObj.id!);
    formData.append('serviceLibelle', serviceObj.libelleLong || '');
    formData.append('serviceSigle', serviceObj.libelleCourt || '');
    formData.append('redacteur', formVal.redacteur);
    formData.append('periodiciteMois', formVal.periodiciteMois.toString());
    formData.append('confidentiel', formVal.confidentiel.toString());
    formData.append('documentExterne', formVal.documentExterne.toString());
    
    if (formVal.organismeEmetteur) formData.append('organismeEmetteur', formVal.organismeEmetteur);
    if (formVal.referenceOfficielle) formData.append('referenceOfficielle', formVal.referenceOfficielle);
    if (formVal.domaine) formData.append('domaine', formVal.domaine);
    if (formVal.statutLegal) formData.append('statutLegal', formVal.statutLegal);

    this.qmsService.createDocument(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (doc) => {
          this.loading = false;
          this.showCreateModal = false;
          this.refreshList();
          this.messageService.add({
            severity: 'success',
            summary: 'Document créé',
            detail: `Le document ${doc.documentNumber} a été enregistré avec succès.`
          });
        },
        error: (err) => {
          this.loading = false;
          showToast(StatusEnum.error, err.status, "Échec de l'importation", this.messageService, err);
        }
      });
  }

  // --- Document Lifecycle Actions ---
  viewDetails(doc: DocumentQms): void {
    this.selectedDocument = doc;
    this.showDetailsDrawer = true;
  }

  openTransitionDialog(doc: DocumentQms): void {
    this.selectedDocument = doc;
    this.transitionForm.reset();
    this.showTransitionModal = true;
  }

  submitTransition(): void {
    if (this.transitionForm.invalid || !this.selectedDocument) return;

    this.loading = true;
    const formVal = this.transitionForm.value;

    this.qmsService.transitionStatus(this.selectedDocument.id!, formVal.nextStatus, formVal.reason)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedDoc) => {
          this.loading = false;
          this.showTransitionModal = false;
          if (this.showDetailsDrawer && this.selectedDocument?.id === updatedDoc.id) {
            this.selectedDocument = updatedDoc;
          }
          this.refreshList();
          this.messageService.add({
            severity: 'success',
            summary: 'Statut modifié',
            detail: `Le document est maintenant dans l'état: ${updatedDoc.status}`
          });
        },
        error: (err) => {
          this.loading = false;
          showToast(StatusEnum.error, err.status, 'Échec de la transition', this.messageService, err);
        }
      });
  }

  // --- Secured PDF Downloader ---
  downloadSecuredPdf(doc: DocumentQms): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Téléchargement en cours',
      detail: 'Préparation du PDF filigrané et sécurisé...'
    });

    this.qmsService.exportSecuredPdf(doc.id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = window.document.createElement('a');
          link.href = url;
          link.download = `${doc.documentNumber}_Secured.pdf`;
          link.click();
          window.URL.revokeObjectURL(url);
          this.messageService.add({
            severity: 'success',
            summary: 'Téléchargement réussi',
            detail: `Le fichier PDF sécurisé a été généré.`
          });
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Échec du téléchargement',
            detail: 'Le fichier binaire est introuvable ou inaccessible dans Alfresco.'
          });
        }
      });
  }

  // --- Version History Drawer ---
  viewVersionHistory(doc: DocumentQms): void {
    this.selectedDocument = doc;
    this.loading = true;
    this.qmsService.getVersionHistory(doc.id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (history) => {
          this.versionHistory = history;
          this.loading = false;
          this.showHistoryDrawer = true;
        },
        error: (err) => {
          this.loading = false;
          showToast(StatusEnum.error, err.status, 'Erreur historique de versions', this.messageService, err);
        }
      });
  }

  // --- Audit Trail Logs Drawer ---
  viewAuditLogs(doc: DocumentQms): void {
    this.selectedDocument = doc;
    this.loading = true;
    this.qmsService.getAuditLogs(doc.id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (logs) => {
          this.auditLogs = logs;
          this.loading = false;
          this.showAuditDrawer = true;
        },
        error: (err) => {
          this.loading = false;
          showToast(StatusEnum.error, err.status, "Erreur logs d'audit", this.messageService, err);
        }
      });
  }

  // Helper mapping tags classes
  getStatusSeverity(status: string): string {
    switch (status?.toLowerCase()) {
      case 'brouillon': return 'info';
      case 'en_approbation': return 'warn';
      case 'valide': return 'success';
      case 'obsolete': return 'danger';
      case 'en_retard_revision': return 'danger';
      default: return 'secondary';
    }
  }

  getStatusLabel(status: string): string {
    switch (status?.toLowerCase()) {
      case 'brouillon': return 'Brouillon';
      case 'en_approbation': return 'En Approbation';
      case 'valide': return 'Valide';
      case 'obsolete': return 'Obsolète';
      case 'en_retard_revision': return 'En Retard Révision';
      default: return status;
    }
  }

  getTransitionOptions(status: string): { label: string; value: string }[] {
    switch (status?.toLowerCase()) {
      case 'brouillon':
        return [
          { label: 'Soumettre pour approbation', value: 'en_approbation' }
        ];
      case 'en_approbation':
        return [
          { label: 'Valider et Publier (Mise en vigueur)', value: 'valide' },
          { label: 'Rejeter en brouillon', value: 'brouillon' }
        ];
      case 'valide':
        return [
          { label: 'Rendre Obsolète', value: 'obsolete' },
          { label: 'Retourner en modification (Brouillon)', value: 'brouillon' }
        ];
      case 'en_retard_revision':
        return [
          { label: 'Lancer une révision (Brouillon)', value: 'brouillon' },
          { label: 'Rendre Obsolète', value: 'obsolete' }
        ];
      default:
        return [
          { label: 'Remettre en brouillon', value: 'brouillon' }
        ];
    }
  }
}
