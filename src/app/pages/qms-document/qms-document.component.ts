import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MessageService, MenuItem } from 'primeng/api';
import { NgPrimeModule } from '../../../prime-ng.module';
import { QmsDocumentService, DocumentQms, QmsDocumentType, QmsDocumentVersion, QmsAuditLog } from '../../services/qms-document.service';
import { showToast, StatusEnum } from '../../utils';
import { Structure } from '../parametrages/structure/structure-config/structure';
import { StructureService } from '../parametrages/structure/structure-service/structure-service';

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

  // Modals / View visibility
  showCreateModal = false;
  showTransitionModal = false;
  showShareModal = false;
  activeTab = 'share';
  shareUrl = '';
  alfrescoUsers: any[] = [];

  roleOptions = [
    { label: 'Lecture Seule ', value: 'READ' },
    { label: 'Modification ', value: 'WRITE' }
  ];

  currentView: 'list' | 'detail' | 'history' | 'audit' = 'list';
  actionMenuItems: MenuItem[] = [];

  // Selected object contexts
  selectedDocument?: DocumentQms;
  versionHistory: QmsDocumentVersion[] = [];
  auditLogs: QmsAuditLog[] = [];

  // Form Groups
  documentForm: FormGroup;
  transitionForm: FormGroup;
  permissionForm: FormGroup;
  alfrescoUserForm: FormGroup;
  selectedFile?: File;

  constructor(
    private fb: FormBuilder,
    private router: Router,
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

    this.permissionForm = this.fb.group({
      username: ['', Validators.required],
      role: ['READ', Validators.required]
    });

    this.alfrescoUserForm = this.fb.group({
      username: ['', Validators.required],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
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

  navigateToCreate(): void {
    this.router.navigate(['/qms-document-create']);
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
    this.currentView = 'detail';
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
          if (this.currentView === 'detail' && this.selectedDocument?.id === updatedDoc.id) {
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

  // --- Document Downloader ---
  downloadSecuredPdf(doc: DocumentQms): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Téléchargement en cours',
      detail: 'Récupération du fichier depuis Alfresco...'
    });

    this.qmsService.exportSecuredPdf(doc.id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const blob = response.body!;

          // Extract filename from Content-Disposition header
          let filename = doc.documentNumber ?? 'document';
          const contentDisposition = response.headers.get('Content-Disposition');
          if (contentDisposition) {
            const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
            if (match && match[1]) {
              filename = match[1].trim();
            }
          }

          const url = window.URL.createObjectURL(blob);
          const link = window.document.createElement('a');
          link.href = url;
          link.download = filename;
          link.click();
          window.URL.revokeObjectURL(url);

          this.messageService.add({
            severity: 'success',
            summary: 'Téléchargement réussi',
            detail: `Le fichier "${filename}" a été téléchargé.`
          });
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Échec du téléchargement',
            detail: 'Le fichier est introuvable ou inaccessible dans Alfresco.'
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
          this.currentView = 'history';
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
          this.currentView = 'audit';
        },
        error: (err) => {
          this.loading = false;
          showToast(StatusEnum.error, err.status, "Erreur logs d'audit", this.messageService, err);
        }
      });
  }

  // Dynamic Actions Menu Trigger
  setActionMenu(event: any, menu: any, doc: DocumentQms) {
    this.selectedDocument = doc;
    this.actionMenuItems = [
      {
        label: 'Détails',
        icon: 'pi pi-eye',
        command: () => this.viewDetails(doc)
      },
      {
        label: 'Télécharger le document',
        icon: 'pi pi-file-pdf',
        command: () => this.downloadSecuredPdf(doc)
      },
      {
        label: 'Éditer le document directement',
        icon: 'pi pi-microsoft',
        command: () => this.editInOffice(doc)
      },
      {
        label: 'Transition Statut',
        icon: 'pi pi-directions',
        command: () => this.openTransitionDialog(doc)
      },
      {
        label: 'Historique Versions',
        icon: 'pi pi-history',
        command: () => this.viewVersionHistory(doc)
      },
      {
        label: 'Piste d\'Audit',
        icon: 'pi pi-list',
        command: () => this.viewAuditLogs(doc)
      },
      {
        label: 'Partage & Permissions',
        icon: 'pi pi-share-alt',
        command: () => this.openShareModal(doc)
      }
    ];
    menu.toggle(event);
  }

  editInOffice(doc: DocumentQms): void {
    this.qmsService.getAosUrl(doc.id!).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.aosUrl) {
          // Decode URL to ensure pipes aren't converted to %7C if possible, though the browser might re-encode it.
          // Using an anchor tag sometimes helps OS handlers catch the exact href.
          const a = document.createElement('a');
          a.href = res.aosUrl;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          setTimeout(() => document.body.removeChild(a), 100);
        }
      },
      error: (err) => {
        showToast(StatusEnum.error, err.status, err.error?.error || "Ce document ne supporte pas l'édition en direct.", this.messageService, err);
      }
    });
  }

  // --- Share & Permissions Dialog Logic ---
  openShareModal(doc: DocumentQms): void {
    this.selectedDocument = doc;
    this.shareUrl = '';
    this.activeTab = 'share';
    this.permissionForm.reset({ role: 'READ' });
    this.alfrescoUserForm.reset();
    this.loadAlfrescoUsers();
    this.showShareModal = true;
  }

  loadAlfrescoUsers(): void {
    this.qmsService.getAlfrescoUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (users) => {
          this.alfrescoUsers = users || [];
        },
        error: (err) => {
          console.error('Failed to load Alfresco users', err);
        }
      });
  }

  generateShareLink(): void {
    if (!this.selectedDocument) return;
    this.loading = true;
    this.qmsService.getShareLink(this.selectedDocument.id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.loading = false;
          this.shareUrl = `${window.location.protocol}//${window.location.hostname}:8999/share/s/${res.sharedId}`;
          this.messageService.add({
            severity: 'success',
            summary: 'Lien généré',
            detail: 'Le lien de partage public a été généré avec succès.'
          });
        },
        error: (err) => {
          this.loading = false;
          showToast(StatusEnum.error, err.status, 'Échec de génération du lien', this.messageService, err);
        }
      });
  }

  copyShareLink(): void {
    if (!this.shareUrl) return;
    navigator.clipboard.writeText(this.shareUrl).then(() => {
      this.messageService.add({
        severity: 'success',
        summary: 'Copié',
        detail: 'Le lien de partage a été copié dans le presse-papiers.'
      });
    }).catch(err => {
      console.error('Failed to copy', err);
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Impossible de copier automatiquement le lien.'
      });
    });
  }

  submitPermissions(): void {
    if (this.permissionForm.invalid || !this.selectedDocument) return;
    this.loading = true;
    const formVal = this.permissionForm.value;
    this.qmsService.assignPermissions(this.selectedDocument.id!, formVal)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loading = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Droits assignés',
            detail: `Les droits ${formVal.role} ont été accordés à l'utilisateur ${formVal.username}.`
          });
        },
        error: (err) => {
          this.loading = false;
          showToast(StatusEnum.error, err.status, 'Échec de l\'affectation', this.messageService, err);
        }
      });
  }

  submitCreateUser(): void {
    if (this.alfrescoUserForm.invalid) return;
    this.loading = true;
    const formVal = this.alfrescoUserForm.value;
    this.qmsService.createAlfrescoUser(formVal)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loading = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Compte créé',
            detail: `L'utilisateur Alfresco ${formVal.username} a été créé avec succès.`
          });
          this.loadAlfrescoUsers();
          this.permissionForm.patchValue({ username: formVal.username });
          this.activeTab = 'permissions';
        },
        error: (err) => {
          this.loading = false;
          showToast(StatusEnum.error, err.status, 'Échec de création de l\'utilisateur', this.messageService, err);
        }
      });
  }

  // Helper mapping tags classes
  getStatusSeverity(status: string | undefined): string {
    switch (status?.toLowerCase()) {
      case 'brouillon': return 'info';
      case 'en_approbation': return 'warn';
      case 'valide': return 'success';
      case 'obsolete': return 'danger';
      case 'en_retard_revision': return 'danger';
      default: return 'secondary';
    }
  }

  getStatusLabel(status: string | undefined): string {
    switch (status?.toLowerCase()) {
      case 'brouillon': return 'Brouillon';
      case 'en_approbation': return 'En Approbation';
      case 'valide': return 'Valide';
      case 'obsolete': return 'Obsolète';
      case 'en_retard_revision': return 'En Retard Révision';
      default: return status || 'Inconnu';
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
