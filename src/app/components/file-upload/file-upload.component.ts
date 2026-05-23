import { Component, EventEmitter, Output, Input } from '@angular/core';
import { MessageService } from 'primeng/api';
import { CommonModule } from '@angular/common';
import { ProgressBar } from 'primeng/progressbar';
import { NgPrimeModule } from '../../../prime-ng.module';

@Component({
    selector: 'app-file-upload',
    templateUrl: './file-upload.component.html',
    standalone: true,
    imports: [CommonModule, ProgressBar, NgPrimeModule],
    styleUrls: ['./file-upload.component.scss']
})
export class FileUploadComponent {
    @Input() styleClass: string = '';
    @Input() existingFiles: any[] = []; // 👈 Les fichiers déjà en base de données
    @Output() fileUploaded = new EventEmitter<any>();
    @Output() removeExisting = new EventEmitter<number>(); // 👈 Événement de suppression d'un fichier existant

    uploadedFiles: {
        file: File;
        extension: string;
        name: string;
        size: string;
        loading: boolean;
        icon: string;
    }[] = [];

    allowedExts = ['doc', 'docx', 'xlsx', 'pdf', 'jpeg', 'jpg', 'txt', 'png'];
    isDragging: boolean = false;

    constructor(private messageService: MessageService) {}


    onDragOver(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging = true;
    }

    onDragLeave(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging = false;
    }

    onDrop(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging = false;
        if (event.dataTransfer && event.dataTransfer.files) {
            this.handleFiles(Array.from(event.dataTransfer.files));
        }
    }

    onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files) return;

        this.handleFiles(Array.from(input.files));
        input.value = ''; // Reset input
    }

    private handleFiles(newFiles: File[]) {
        // Limite max de 5 fichiers au total (existants + nouveaux)
        const maxAllowedNew = 5 - this.existingFiles.length;

        for (const file of newFiles) {
            const ext = file.name.split('.').pop()?.toLowerCase() || '';
            if (this.allowedExts.includes(ext) && this.uploadedFiles.length < maxAllowedNew) {
                const fileObj = {
                    file,
                    extension: ext,
                    name: this.formatFileName(file.name, ext),
                    size: this.formatBytes(file.size),
                    loading: true,
                    icon: this.getFileIcon(ext)
                };

                this.uploadedFiles.push(fileObj);

                setTimeout(() => {
                    fileObj.loading = false;
                    this.fileUploaded.emit(this.uploadedFiles);
                }, 1500);
            } else {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Fichier non autorisé ou nombre maximal de 5 fichiers atteint.', life: 10000 });
            }
        }
    }


    formatFileName(name: string, extension: string): string {
        const baseName = name.substring(0, name.lastIndexOf('.')) || name;
        if (baseName.length > 10) {
            return baseName.substring(0, 10) + '....' + extension;
        }
        return name;
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

    deleteExisting(index: number) {
        this.removeExisting.emit(index);
    }
}
