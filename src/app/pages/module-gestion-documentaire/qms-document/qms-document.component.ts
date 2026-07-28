import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MessageService, MenuItem } from 'primeng/api';
import { NgPrimeModule } from '../../../../prime-ng.module';
import {
  QmsDocumentService,
  // DocumentQms, QmsDocumentType, QmsDocumentVersion, QmsAuditLog
} from '../../../services/module-gestion-documentaire/qms-document.service';
import { showToast, StatusEnum } from '../../../utils/global/global-utils';
import { Structure } from '../../parametrages/structure/structure-config/structure';
import { StructureService } from '../../parametrages/structure/structure-service/structure-service';
import { WorkflowService } from '../../../services/module-gestion-documentaire/workflow.service';
import { AuthService } from '../../../services/auth-services/auth.service';
import { DocumentQms, DocumentUserAccess, QmsAuditLog, QmsDocumentType, QmsDocumentVersion, DocumentWorkflow, WorkflowStep } from '../../../models/gestion-documentaire.model';
import { NgxPermissionsModule, NgxPermissionsService } from 'ngx-permissions';

@Component({
  selector: 'app-qms-document',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgPrimeModule, NgxPermissionsModule],
  templateUrl: './qms-document.component.html',
  styleUrls: ['./qms-document.component.scss'],
  providers: [MessageService, DatePipe]
})
export class QmsDocumentComponent implements OnInit, OnDestroy {
  documents: DocumentQms[] = [];
  documentTypes: QmsDocumentType[] = [];
  structures: Structure[] = [];
  systemUsers: any[] = [];
  filteredUsers: any[] = [];
  selectedStructureFilter?: string;
  selectedUser?: any;
  loading = false;
  destroy$ = new Subject<void>();

  // Filter properties
  searchQuery = '';
  selectedType = '';
  selectedService = '';
  selectedStatuses: string[] = [];
  dateFrom: string = '';
  dateTo: string = '';



  // Modals / View visibility
  showTransitionModal = false;
  showShareModal = false;
  showAssignWorkflowModal = false;

  activeTab = 'access';
  accessList: DocumentUserAccess[] = [];
  loadingAccess = false;

  roleOptions = [
    { label: 'Lecture Seule', value: 'READ_ONLY' },
    { label: 'Modification', value: 'WRITE' }
  ];

  currentView: 'list' | 'detail' | 'history' | 'audit' = 'list';
  actionMenuItems: MenuItem[] = [];

  // Selected object contexts
  selectedDocument?: DocumentQms;
  versionHistory: QmsDocumentVersion[] = [];
  auditLogs: QmsAuditLog[] = [];
  availableWorkflows: DocumentWorkflow[] = [];
  selectedWorkflowPreview?: DocumentWorkflow;

  // Form Groups
  transitionForm: FormGroup;
  permissionForm: FormGroup;
  assignWorkflowForm: FormGroup;
  workflowForm: FormGroup;
  showWorkflowModal = false;
  workflowDecision: 'APPROUVE' | 'REJETE' = 'APPROUVE';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private qmsService: QmsDocumentService,
    private workflowService: WorkflowService,
    private structureService: StructureService,
    private authService: AuthService,
    private ngxPermissionsService: NgxPermissionsService,
    private messageService: MessageService,
    private datePipe: DatePipe
  ) {
    this.transitionForm = this.fb.group({
      nextStatus: [null, Validators.required],
      reason: [null, Validators.required]
    });

    this.permissionForm = this.fb.group({
      userId: ['', Validators.required],
      userFullName: [''],
      userEmail: ['', Validators.email],
      role: ['READ_ONLY', Validators.required]
    });

    this.assignWorkflowForm = this.fb.group({
      workflowId: [null, Validators.required]
    });

    this.workflowForm = this.fb.group({
      comments: ['', Validators.required]
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
    this.qmsService.typeDocumentQmsGetAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => this.documentTypes = res.data.content || [],
        error: (err: any) => showToast(StatusEnum.error, err.status, null, this.messageService, err)
      });



    // Load Structures/Services from DB
    this.structureService.getAllStructures()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => this.structures = res.data.content || [],
        error: (err: any) => console.error('Failed to load structures', err)
      });

    this.refreshList();
  }

  refreshList(): void {
    this.loading = true;
    this.qmsService.searchDocuments({
      query: this.searchQuery || undefined,
      documentType: this.selectedType || undefined,
      serviceId: this.selectedService || undefined,
      status: this.selectedStatuses.length ? this.selectedStatuses : undefined,
      createdAtFrom: this.dateFrom ? this.datePipe.transform(this.dateFrom, 'yyyy-MM-dd')! : undefined,
      createdAtTo: this.dateTo ? this.datePipe.transform(this.dateTo, 'yyyy-MM-dd')! : undefined
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (docs: DocumentQms[]) => {
          this.documents = docs;
          this.loading = false;
        },
        error: (err: any) => {
          this.loading = false;
          showToast(StatusEnum.error, err.status, 'Erreur de chargement des documents', this.messageService, err);
        }
      });
  }

  navigateToCreate(): void {
    this.router.navigate(['../nouveau'], { relativeTo: this.route });
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
            summary: 'Statut mis à jour',
            detail: `Le document est maintenant dans l'état: ${this.getStatusLabel(updatedDoc)}`
          });
        },
        error: (err: any) => {
          this.loading = false;
          showToast(StatusEnum.error, err.status, 'Échec de la transition', this.messageService, err);
        }
      });
  }

  // --- Document Opener ---
  openSecuredDocument(doc: DocumentQms): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Ouverture du document',
      detail: 'Chargement en cours...'
    });

    this.qmsService.exportSecuredPdf(doc.id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Échec de l\'ouverture',
            detail: 'Le fichier est introuvable ou inaccessible.'
          });
        }
      });
  }

  // --- Document Downloader ---
  downloadSecuredPdf(doc: DocumentQms): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Téléchargement en cours',
      detail: 'Récupération du fichier...'
    });

    this.qmsService.exportSecuredPdf(doc.id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob: Blob) => {
          const filename = doc.documentNumber ?? 'document';
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
            detail: 'Le fichier est introuvable ou inaccessible.'
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
        error: (err: any) => {
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
        error: (err: any) => {
          this.loading = false;
          showToast(StatusEnum.error, err.status, "Erreur logs d'audit", this.messageService, err);
        }
      });
  }

  // Dynamic Actions Menu Trigger
  setActionMenu(event: any, menu: any, doc: DocumentQms) {
    this.selectedDocument = doc;
    const items: MenuItem[] = [
      {
        label: 'Détails',
        icon: 'pi pi-eye',
        command: () => this.viewDetails(doc)
      },
      {
        label: 'Ouvrir le document',
        icon: 'pi pi-external-link',
        command: () => this.openSecuredDocument(doc)
      },
      {
        label: 'Télécharger le document',
        icon: 'pi pi-download',
        command: () => this.downloadSecuredPdf(doc)
      }
    ];

    const hasValidate = this.hasPermission('DOC_VALIDATE');
    const hasWrite = this.hasPermission('DOC_WRITE');

    // Les boutons et étapes s'adaptent à 100% au workflow actif du document
    if (doc.currentStep && hasValidate) {
      items.push({
        label: this.getWorkflowDecisionLabel(doc.currentStep, 'APPROUVE'),
        icon: 'pi pi-check-circle',
        command: () => this.openWorkflowDialog(doc, 'APPROUVE')
      });
      items.push({
        label: this.getWorkflowDecisionLabel(doc.currentStep, 'REJETE'),
        icon: 'pi pi-times-circle',
        command: () => this.openWorkflowDialog(doc, 'REJETE')
      });
    }

    items.push(
      {
        label: 'Historique Versions',
        icon: 'pi pi-history',
        command: () => this.viewVersionHistory(doc)
      },
      {
        label: 'Piste d\'Audit',
        icon: 'pi pi-list',
        command: () => this.viewAuditLogs(doc)
      }
    );

    if (hasWrite || this.hasPermission('DOC_SHARE')) {
      items.push({
        label: 'Partage & Permissions',
        icon: 'pi pi-share-alt',
        command: () => this.openShareModal(doc)
      });
    }

    this.actionMenuItems = items;
    menu.toggle(event);
  }

  getWorkflowDecisionLabel(step: WorkflowStep | undefined, decision: 'APPROUVE' | 'REJETE'): string {
    if (!step) return decision === 'APPROUVE' ? 'Approuver' : 'Rejeter';
    const transition = step.transitions?.find((t: any) => t.decision === decision);
    if (transition?.label) return transition.label;
    return decision === 'APPROUVE' ? `Approuver (${step.nomEtape})` : `Rejeter (${step.nomEtape})`;
  }

  openWorkflowDialog(doc: DocumentQms, decision: 'APPROUVE' | 'REJETE'): void {
    this.selectedDocument = doc;
    this.workflowDecision = decision;
    this.workflowForm.reset();
    this.showWorkflowModal = true;
  }

  submitWorkflowDecision(): void {
    if (this.workflowForm.invalid || !this.selectedDocument) return;

    this.loading = true;
    const comments = this.workflowForm.value.comments;
    const docId = this.selectedDocument.id!;

    const action$ = this.workflowDecision === 'APPROUVE'
      ? this.workflowService.validateStep(docId, comments)
      : this.workflowService.rejectStep(docId, comments);

    action$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.loading = false;
        this.showWorkflowModal = false;
        this.refreshList();
        this.messageService.add({
          severity: 'success',
          summary: this.workflowDecision === 'APPROUVE' ? 'Étape approuvée' : 'Étape rejetée',
          detail: this.workflowDecision === 'APPROUVE'
            ? 'La validation de l\'étape a été enregistrée avec succès.'
            : 'Le document a été rejeté et renvoyé en brouillon.'
        });
      },
      error: (err: any) => {
        this.loading = false;
        const msg = err.error?.message || "Échec de l'action du workflow";
        showToast(StatusEnum.error, err.status, msg, this.messageService, err);
      }
    });
  }

  openAssignWorkflowModal(doc: DocumentQms): void {
    this.selectedDocument = doc;
    this.assignWorkflowForm.reset();
    this.selectedWorkflowPreview = undefined;

    // Charger les workflows disponibles
    this.loading = true;
    this.workflowService.getAllWorkflows()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (workflows: any) => {
          this.availableWorkflows = workflows;
          this.loading = false;
          this.showAssignWorkflowModal = true;
        },
        error: (err: any) => {
          this.loading = false;
          showToast(StatusEnum.error, err.status, 'Erreur de chargement des workflows', this.messageService, err);
        }
      });
  }

  onWorkflowSelected(workflowId: string): void {
    if (!workflowId) {
      this.selectedWorkflowPreview = undefined;
      return;
    }
    const wf = this.availableWorkflows.find(w => w.id === workflowId);
    if (wf) {
      this.selectedWorkflowPreview = {
        ...wf,
        steps: [...(wf.steps || [])].sort((a, b) => a.stepOrder - b.stepOrder)
      };
    } else {
      this.selectedWorkflowPreview = undefined;
    }
  }

  submitWorkflowAssignment(): void {
    if (this.assignWorkflowForm.invalid || !this.selectedDocument) return;

    this.loading = true;
    const workflowId = this.assignWorkflowForm.value.workflowId;

    this.qmsService.assignWorkflow(this.selectedDocument.id!, workflowId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedDoc) => {
          this.loading = false;
          this.showAssignWorkflowModal = false;
          this.refreshList();
          this.messageService.add({
            severity: 'success',
            summary: 'Workflow assigné',
            detail: 'Le document a été soumis au circuit de validation avec succès.'
          });
        },
        error: (err) => {
          this.loading = false;
          // showToast with err
          showToast(StatusEnum.error, err.status, "Échec de l'assignation du workflow", this.messageService, err);
        }
      });
  }

  editInOffice(_doc: DocumentQms): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Non disponible',
      detail: "L'édition en direct n'est pas encore supportée."
    });
  }

  // --- Partage & Gestion des Accès (ACL) ---
  openShareModal(doc: DocumentQms): void {
    this.selectedDocument = doc;
    this.activeTab = 'access';
    this.permissionForm.reset({ role: 'READ_ONLY' });
    this.selectedStructureFilter = undefined;
    this.selectedUser = undefined;
    this.filteredUsers = [];
    this.systemUsers = [];
    this.loadSystemUsers();
    this.loadDocumentAccess(doc);
    this.showShareModal = true;
  }

  loadDocumentAccess(doc: DocumentQms): void {
    this.loadingAccess = true;
    this.qmsService.getDocumentAccess(doc.id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (list) => {
          this.accessList = list;
          this.loadingAccess = false;
        },
        error: (err: any) => {
          this.loadingAccess = false;
          console.error('Erreur chargement des accès', err);
        }
      });
  }

  extractUserInfos(u: any): { id: string; firstName: string; lastName: string; email: string; fullName: string } {
    const userObj = u.user ? u.user : u;
    const id = userObj.id || userObj.userId || '';
    const firstName = userObj.firstName || '';
    const lastName = userObj.lastName || '';
    const email = userObj.email || '';
    const fullName = `${firstName} ${lastName}`.trim() || userObj.username || id;
    return { id, firstName, lastName, email, fullName };
  }

  loadSystemUsers(): void {
    this.authService.getAllUsers(0, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const users = res.data?.content || res.content || res || [];
          const list = Array.isArray(users) ? users : [];
          this.systemUsers = list.map((u: any) => this.extractUserInfos(u));
          this.filteredUsers = [...this.systemUsers];
        },
        error: (err: any) => {
          console.error('Erreur chargement des utilisateurs du système', err);
        }
      });
  }

  onStructureFilterChange(structureId: string): void {
    this.selectedUser = undefined;
    this.permissionForm.patchValue({
      userId: '',
      userFullName: '',
      userEmail: ''
    });

    if (!structureId) {
      this.filteredUsers = [...this.systemUsers];
      return;
    }

    this.loadingAccess = true;
    this.authService.loadAgentPublicByService(structureId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const users = res.data?.content || res.data || res.content || res || [];
          const list = Array.isArray(users) ? users : [];
          this.filteredUsers = list.map((u: any) => this.extractUserInfos(u));
          this.loadingAccess = false;
        },
        error: (err: any) => {
          this.loadingAccess = false;
          console.error('Erreur chargement des utilisateurs de la structure', err);
          this.filteredUsers = [];
        }
      });
  }

  onUserSelected(user: any): void {
    if (user) {
      this.permissionForm.patchValue({
        userId: user.id,
        userFullName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        userEmail: user.email
      });
    } else {
      this.permissionForm.patchValue({
        userId: '',
        userFullName: '',
        userEmail: ''
      });
    }
  }

  hasPermission(p: string): boolean {
    return true;
  }

  submitPermissions(): void {
    if (this.permissionForm.invalid || !this.selectedDocument) return;
    this.loading = true;
    const formVal = this.permissionForm.value;
    this.qmsService.grantAccess(
      this.selectedDocument.id!,
      formVal.userId,
      formVal.userFullName,
      formVal.userEmail,
      formVal.role
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loading = false;
          this.permissionForm.reset({ role: 'READ_ONLY' });
          this.loadDocumentAccess(this.selectedDocument!);
          this.messageService.add({
            severity: 'success',
            summary: 'Accès accordé',
            detail: `Les droits ${formVal.role} ont été accordés.`
          });
        },
        error: (err: any) => {
          this.loading = false;
          showToast(StatusEnum.error, err.status, "Échec de l'affectation", this.messageService, err);
        }
      });
  }

  revokeAccess(access: DocumentUserAccess): void {
    if (!this.selectedDocument) return;
    this.qmsService.revokeAccess(this.selectedDocument.id!, access.userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadDocumentAccess(this.selectedDocument!);
          this.messageService.add({
            severity: 'success',
            summary: 'Accès révoqué',
            detail: `L'accès de l'utilisateur a été révoqué.`
          });
        },
        error: (err: any) => showToast(StatusEnum.error, err.status, 'Échec de la révocation', this.messageService, err)
      });
  }

  // Helper mapping tags classes
  getStatusSeverity(doc: DocumentQms | undefined): string {
    if (!doc) return 'secondary';
    if (doc.obsolete) return 'danger';
    if (doc.enRetardRevision) return 'danger';
    if (doc.esTraiter) return 'success';
    if (doc.currentStep) return 'warn';
    return 'info'; // Brouillon
  }

  getStatusLabel(doc: DocumentQms | undefined): string {
    if (!doc) return 'Inconnu';
    if (doc.obsolete) return 'Obsolète';
    if (doc.enRetardRevision) return 'En Retard Révision';
    if (doc.esTraiter) return 'Validé / En Vigueur';
    if (doc.currentStep) return `${doc.currentStep.nomEtape} (Étape ${doc.currentStep.stepOrder})`;
    return 'Brouillon';
  }

  getTransitionOptions(doc: DocumentQms | undefined): { label: string; value: string }[] {
    if (!doc) return [];
    if (doc.obsolete) {
      return [
        { label: 'Lancer une révision (Brouillon)', value: 'brouillon' }
      ];
    }
    if (doc.enRetardRevision) {
      return [
        { label: 'Lancer une révision (Brouillon)', value: 'brouillon' },
        { label: 'Rendre Obsolète', value: 'obsolete' }
      ];
    }
    if (doc.esTraiter) {
      return [
        { label: 'Rendre Obsolète', value: 'obsolete' },
        { label: 'Retourner en modification (Brouillon)', value: 'brouillon' }
      ];
    }
    if (doc.currentStep) {
      // En cours de validation par le workflow
      return [
        { label: 'Valider et Publier (Mise en vigueur)', value: 'valide' },
        { label: 'Rejeter au step précédent', value: 'brouillon' }
      ];
    }
    // Brouillon
    return [
      { label: 'Soumettre pour approbation', value: 'en_approbation' }
    ];
  }
}
