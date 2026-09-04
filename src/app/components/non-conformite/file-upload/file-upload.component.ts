import { Component, EventEmitter, Output, Input } from '@angular/core';
import { MessageService } from 'primeng/api';
import { CommonModule } from '@angular/common';
import { ProgressBar } from 'primeng/progressbar';
import { NgPrimeModule } from '../../../../prime-ng.module';

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
    @Input() maxFiles: number = 5;
    @Input() maxFileSizeMB: number = 10;
    @Input() allowedExts: string[] = ['doc', 'docx', 'xlsx', 'pdf', 'jpeg', 'jpg', 'txt', 'png'];

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
        const maxAllowedNew = this.maxFiles - this.existingFiles.length;

        for (const file of newFiles) {
            const ext = file.name.split('.').pop()?.toLowerCase() || '';
            const fileSizeMB = file.size / (1024 * 1024);

            if (!this.allowedExts.includes(ext)) {
                this.messageService.add({ 
                    severity: 'error', 
                    summary: 'Type non supporté', 
                    detail: `L'extension .${ext} n'est pas autorisée.`, 
                    life: 5000 
                });
                continue;
            }

            if (fileSizeMB > this.maxFileSizeMB) {
                this.messageService.add({ 
                    severity: 'error', 
                    summary: 'Fichier trop lourd', 
                    detail: `Le fichier dépasse la taille maximale autorisée de ${this.maxFileSizeMB} Mo.`, 
                    life: 5000 
                });
                continue;
            }

            if (this.uploadedFiles.length < maxAllowedNew) {
                const fileObj = {
                    file,
                    extension: ext,
                    name: this.formatFileName(file.name, ext),
                    size: this.formatBytes(file.size),
                    loading: true,
                    icon: this.getFileIcon(ext)
                };

                this.uploadedFiles.push(fileObj);
                this.fileUploaded.emit(this.uploadedFiles);

                setTimeout(() => {
                    fileObj.loading = false;
                    this.fileUploaded.emit(this.uploadedFiles);
                }, 1500);
            } else {
                this.messageService.add({ 
                    severity: 'error', 
                    summary: 'Limite atteinte', 
                    detail: `Le nombre maximal de ${this.maxFiles} fichier(s) est atteint.`, 
                    life: 5000 
                });
                break;
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
