import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { NgPrimeModule } from '../../../prime-ng.module';
import { QmsDocumentService, QmsDocumentType } from '../../services/qms-document.service';
import { showToast, StatusEnum } from '../../utils';
import { Structure } from '../parametrages/structure/structure-config/structure';
import { StructureService } from '../parametrages/structure/structure-service/structure-service';

declare const tinymce: any;

const DRAFT_STORAGE_KEY = 'qms_doc_draft_content';

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

  creationMode: 'import' | 'edit' = 'import';

  // Dialog state
  showEditorDialog = false;
  autoSaveStatus = '';
  hasDraft = false;

  private autoSaveInterval: any;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private qmsService: QmsDocumentService,
    private structureService: StructureService,
    private messageService: MessageService
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
      statutLegal: [null],
      content: ['']
    });
  }

  ngOnInit(): void {
    this.loading = true;

    this.qmsService.getAllTypes().subscribe({
      next: (types) => this.documentTypes = types,
      error: (err) => console.error(err)
    });

    this.structureService.getAllStructures().subscribe({
      next: (res) => { this.structures = res.body || []; this.loading = false; },
      error: () => this.loading = false
    });

    // Restore draft from localStorage
    const draft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (draft) {
      this.documentForm.patchValue({ content: draft });
      this.hasDraft = true;
    }
  }

  ngOnDestroy(): void {
    this.destroyTinyMCE();
    clearInterval(this.autoSaveInterval);
  }

  // ─── Dialog Control ───────────────────────────────────────────

  openEditorDialog(): void {
    this.showEditorDialog = true;
    this.initTinyMCE();
  }

  onEditorDialogClose(): void {
    // Called when user clicks X or closes dialog
    this.syncAndSaveDraft();
    this.destroyTinyMCE();
    clearInterval(this.autoSaveInterval);
  }

  cancelEditorDialog(): void {
    this.showEditorDialog = false;
    // onHide will fire and handle cleanup
  }

  saveAndCloseEditorDialog(): void {
    this.syncAndSaveDraft();
    this.showEditorDialog = false;
    this.destroyTinyMCE();
    clearInterval(this.autoSaveInterval);
    this.messageService.add({
      severity: 'success',
      summary: 'Contenu sauvegardé',
      detail: 'Le contenu a été enregistré dans le formulaire.'
    });
  }

  // ─── TinyMCE ─────────────────────────────────────────────────

  private initTinyMCE(): void {
    setTimeout(() => {
      if (typeof tinymce === 'undefined') {
        console.warn('TinyMCE non disponible — vérifiez la connexion internet.');
        return;
      }

      tinymce.remove('#qms-doc-editor');

      tinymce.init({
        selector: '#qms-doc-editor',
        height: '100%',
        menubar: true,
        language: 'fr_FR',

        // ── Plugins gratuits uniquement ──────────────────────
        plugins: [
          'anchor', 'autolink', 'charmap', 'codesample',
          'link', 'lists', 'media', 'searchreplace', 'table',
          'visualblocks', 'wordcount', 'image', 'fullscreen', 'preview',
          'insertdatetime', 'pagebreak', 'nonbreaking', 'directionality',
          'emoticons', 'quickbars', 'advlist', 'autosave'
        ],

        // ── Toolbar style Word ───────────────────────────────
        toolbar:
          'undo redo | ' +
          'blocks fontfamily fontsize | ' +
          'bold italic underline strikethrough | ' +
          'forecolor backcolor | ' +
          'alignleft aligncenter alignright alignjustify | ' +
          'numlist bullist indent outdent | ' +
          'table link image media | ' +
          'pagebreak insertdatetime charmap emoticons | ' +
          'removeformat | fullscreen preview',

        toolbar_sticky: true,

        // ── Style contenu (feuille A4 Word) ─────────────────
        content_style: `
          body {
            font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
            font-size: 12pt;
            line-height: 1.6;
            margin: 20mm 25mm;
            color: #1a1a1a;
            background: #ffffff;
          }
          table { border-collapse: collapse; width: 100%; }
          td, th { border: 1px solid #cccccc; padding: 6px 10px; }
          h1 { font-size: 18pt; font-weight: bold; }
          h2 { font-size: 14pt; font-weight: bold; }
          h3 { font-size: 12pt; font-weight: bold; }
          p { margin: 0 0 10px 0; }
        `,

        image_advtab: true,
        quickbars_selection_toolbar: 'bold italic underline | quicklink h2 h3 blockquote',
        autosave_ask_before_unload: true,
        autosave_interval: '30s',

        setup: (editor: any) => {
          // Restaurer le contenu sauvegardé
          const savedContent = this.documentForm.get('content')?.value;
          if (savedContent) {
            editor.on('init', () => editor.setContent(savedContent));
          }

          // Auto-save toutes les 20 secondes dans localStorage
          this.autoSaveInterval = setInterval(() => {
            if (editor && !editor.destroyed) {
              const content = editor.getContent();
              localStorage.setItem(DRAFT_STORAGE_KEY, content);
              this.documentForm.patchValue({ content });
              this.autoSaveStatus = 'Sauvegardé à ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
              this.hasDraft = true;
              setTimeout(() => this.autoSaveStatus = '', 3000);
            }
          }, 20000);
        }
      });
    }, 300);
  }

  private destroyTinyMCE(): void {
    if (typeof tinymce !== 'undefined') {
      try { tinymce.remove('#qms-doc-editor'); } catch (_) {}
    }
  }

  private syncAndSaveDraft(): void {
    if (typeof tinymce !== 'undefined') {
      const editor = tinymce.get('qms-doc-editor');
      if (editor && !editor.destroyed) {
        const content = editor.getContent();
        this.documentForm.patchValue({ content });
        localStorage.setItem(DRAFT_STORAGE_KEY, content);
        this.hasDraft = !!content;
      }
    }
  }

  // ─── Other Actions ────────────────────────────────────────────

  clearContent(): void {
    this.documentForm.patchValue({ content: '' });
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    this.hasDraft = false;
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) this.selectedFile = file;
  }

  goBack(): void {
    this.router.navigate(['/qms-documents']);
  }

  submitDocument(): void {
    if (this.documentForm.invalid) {
      this.messageService.add({ severity: 'warn', summary: 'Formulaire incomplet', detail: 'Veuillez renseigner tous les champs obligatoires.' });
      return;
    }
    if (this.creationMode === 'import' && !this.selectedFile) {
      this.messageService.add({ severity: 'warn', summary: 'Fichier manquant', detail: 'Veuillez sélectionner un fichier à importer.' });
      return;
    }
    if (this.creationMode === 'edit' && !this.documentForm.value.content) {
      this.messageService.add({ severity: 'warn', summary: 'Contenu vide', detail: 'Veuillez rédiger le contenu du document.' });
      return;
    }

    this.loading = true;
    const formVal = this.documentForm.value;
    const serviceObj: Structure = formVal.service;
    const formData = new FormData();

    if (this.creationMode === 'import') {
      formData.append('file', this.selectedFile!);
    } else {
      const blob = new Blob([formVal.content], { type: 'text/html' });
      formData.append('file', blob, 'document.html');
    }

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

    this.qmsService.createDocument(formData).subscribe({
      next: (doc) => {
        this.loading = false;
        // Clear draft on success
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        this.messageService.add({ severity: 'success', summary: 'Document créé', detail: `Le document ${doc.documentNumber} a été enregistré avec succès.` });
        setTimeout(() => this.router.navigate(['/qms-documents']), 1500);
      },
      error: (err) => {
        this.loading = false;
        showToast(StatusEnum.error, err.status, "Échec de l'enregistrement", this.messageService, err);
      }
    });
  }
}
