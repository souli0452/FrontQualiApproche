import { Component, EventEmitter, Output } from '@angular/core';
import { FileUpload } from 'primeng/fileupload';
import { MessageService } from 'primeng/api';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  standalone: true,
  imports: [CommonModule],
  styleUrls: ['./file-upload.component.scss']
})
export class FileUploadComponent {
  @Output() fileUploaded = new EventEmitter<any>();
  uploadedFiles: {
    file: File;
    extension: string;
    name: string;
    size: string;
    loading: boolean;
    icon: string;
  }[] = [];
  
  allowedExts = ['doc', 'docx', 'xlsx', 'pdf', 'jpeg', 'jpg', 'txt', 'png'];

  constructor(private messageService: MessageService) {}

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    const newFiles = Array.from(input.files);

    for (const file of newFiles) {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (this.allowedExts.includes(ext) && this.uploadedFiles.length < 5) {
        const fileObj = {
          file,
          extension: ext,
          name: file.name,
          size: this.formatBytes(file.size),
          loading: true,
          icon: this.getFileIcon(ext)
        };

        this.uploadedFiles.push(fileObj);

        // Simuler le chargement
        setTimeout(() => {
          fileObj.loading = false;
          this.fileUploaded.emit(this.uploadedFiles); // Émettre les fichiers téléchargés
        }, 1500);
      } else {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Fichier non autorisé ou nombre maximal atteint.', life: 10000 });
      }
    }

    input.value = ''; // Reset input
  }

  getFileIcon(extension: string): string {
    const icons: { [key: string]: string } = {
      doc: 'assets/images/doc-file.png',
      docx: 'assets/images/doc-file.png',
      xlsx: 'assets/images/xls-file.png',
      pdf: 'assets/images/pdf-file.png',
      jpeg: 'assets/images/jpeg-file.png',
      jpg: 'assets/images/jpeg-file.png',
      png: 'assets/images/jpeg-file.png',
      txt: 'assets/images/txt-file.png'
    };
    return icons[extension] || 'assets/images/unknown-file.png'; // Icône par défaut pour les fichiers inconnus
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
  }

  removeFile(index: number) {
    this.uploadedFiles.splice(index, 1);
    this.fileUploaded.emit(this.uploadedFiles); // Mettre à jour la liste des fichiers dans le parent
  }
}
