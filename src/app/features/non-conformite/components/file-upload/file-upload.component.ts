import { Component, EventEmitter, Output, Input } from '@angular/core';
import { MessageService } from 'primeng/api';
import { CommonModule } from '@angular/common';
import { ProgressBar } from 'primeng/progressbar';
import { NgPrimeModule } from '@prime-ng';

@Component({
    selector: 'app-file-upload',
    templateUrl: './file-upload.component.html',
    standalone: true,
    imports: [CommonModule, ProgressBar, NgPrimeModule],
    styleUrls: ['./file-upload.component.scss']
})
export class FileUploadComponent {
    @Input() styleClass: string = '';
    @Input() existingFiles: any[] = []; // Fichiers déjà enregistrés côté serveur
    @Input() maxFiles: number = 5;
    @Input() maxFileSizeMB: number = 10;
    @Input() allowedExts: string[] = ['doc', 'docx', 'xlsx', 'pdf', 'jpeg', 'jpg', 'txt', 'png'];

    // Nouveaux inputs rétrocompatibles (valeurs par défaut identiques à l'existant)
    @Input() readonly: boolean = false;
    @Input() showDownload: boolean = false;
    @Input() immediate: boolean = false; // true = émet filesAdded sans empiler dans uploadedFiles (envoi direct API)
    @Input() uploading: boolean = false;
    @Input() hint: string = '';
    @Input() emptyMessage: string = 'Glissez-déposez vos fichiers ici';
    @Input() disabledMessage: string = 'Aucune pièce jointe.';
    @Input() pendingHint: string = '';

    @Output() fileUploaded = new EventEmitter<any>();
    @Output() removeExisting = new EventEmitter<number>();
    @Output() filesAdded = new EventEmitter<File[]>();
    @Output() downloadExisting = new EventEmitter<number>();

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

    get acceptString(): string {
        return this.allowedExts.map(e => '.' + e).join(',');
    }

    get totalFilesCount(): number {
        return this.uploadedFiles.length + (this.existingFiles?.length || 0);
    }

    getExistingFileName(file: any): string {
        return file?.nom || file?.name || 'Fichier';
    }

    onDragOver(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        if (this.readonly || this.uploading) {
            this.isDragging = false;
            return;
        }
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
        if (this.readonly || this.uploading) return;
        if (event.dataTransfer && event.dataTransfer.files) {
            this.handleFiles(Array.from(event.dataTransfer.files));
        }
    }

    onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files || this.readonly || this.uploading) return;

        this.handleFiles(Array.from(input.files));
        input.value = ''; // Reset input
    }

    private handleFiles(newFiles: File[]) {
        const existingCount = this.existingFiles?.length || 0;
        const maxAllowedNew = this.maxFiles - existingCount;
        const validFiles: File[] = [];
        let acceptedCount = this.uploadedFiles.length;

        for (const file of newFiles) {
            const dotIndex = file.name.lastIndexOf('.');
            const ext = dotIndex < 0 ? '' : file.name.substring(dotIndex + 1).toLowerCase();
            const fileSizeMB = file.size / (1024 * 1024);

            if (!this.allowedExts.includes(ext)) {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Type non supporté',
                    detail: `L'extension ${ext ? '.' + ext : '(inconnue)'} n'est pas autorisée.`,
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

            if (acceptedCount < maxAllowedNew) {
                validFiles.push(file);
                acceptedCount++;

                if (!this.immediate) {
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
                        if (this.uploadedFiles.includes(fileObj)) {
                            this.fileUploaded.emit(this.uploadedFiles);
                        }
                    }, 1500);
                }
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

        if (validFiles.length > 0) {
            this.filesAdded.emit(validFiles);
        }
    }

    /** Vide la file locale (ex. changement de point de contrôle ou après envoi). */
    clear(emit: boolean = true): void {
        this.uploadedFiles = [];
        if (emit) {
            this.fileUploaded.emit(this.uploadedFiles);
        }
    }

    formatFileName(name: string, extension: string): string {
        const dotIndex = name.lastIndexOf('.');
        const baseName = dotIndex > 0 ? name.substring(0, dotIndex) : name;
        if (baseName.length > 10) {
            return baseName.substring(0, 10) + '....' + extension;
        }
        return name;
    }

    getFileIcon(extension: string): string {
        const icons: Record<string, string> = {
            doc: 'assets/images/doc-file.png',
            docx: 'assets/images/doc-file.png',
            odt: 'assets/images/doc-file.png',
            rtf: 'assets/images/doc-file.png',
            xls: 'assets/images/xls-file.png',
            xlsx: 'assets/images/xls-file.png',
            ods: 'assets/images/xls-file.png',
            csv: 'assets/images/xls-file.png',
            pdf: 'assets/images/pdf-file.png',
            jpeg: 'assets/images/jpeg-file.png',
            jpg: 'assets/images/jpeg-file.png',
            png: 'assets/images/jpeg-file.png',
            gif: 'assets/images/jpeg-file.png',
            bmp: 'assets/images/jpeg-file.png',
            webp: 'assets/images/jpeg-file.png',
            svg: 'assets/images/jpeg-file.png',
            txt: 'assets/images/txt-file.png'
        };
        return icons[extension] || 'assets/images/unknown-file.png';
    }

    formatBytes(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
    }

    removeFile(index: number) {
        this.uploadedFiles.splice(index, 1);
        this.fileUploaded.emit(this.uploadedFiles);
    }

    deleteExisting(index: number) {
        this.removeExisting.emit(index);
    }

    onDownloadExisting(index: number) {
        if (this.showDownload) {
            this.downloadExisting.emit(index);
        }
    }
}