export interface ReportingInput {
    reportFormat: ReportFormat;
    reportType: any;
    entityId?: string;
    structureId?: string;
}
export class PieceJointe {
    id?: number;
    nom?: string;
    ext?: string;
    type?: string;
    url?: string;
    entityId?: number;
    fichier?: string | null;
    createdDate?: Date;
}
export enum ReportFormat {
    PDF = 'PDF', WORD = 'WORD', EXCEL = 'EXCEL', CSV = 'CSV', XPRINT = 'XPRINT'
}
export function printPdfFile(bytes: any) {
    window.open(URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })), '_blank');
}

export function printExcelFile(bytes: any) {
    const contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    window.open(URL.createObjectURL(new Blob([bytes], { type: contentType })), '_blank');
}

export function printWordFile(bytes: any) {
    const contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    window.open(URL.createObjectURL(new Blob([bytes], { type: contentType })), '_blank');
}

export function generateReportFile(bytes: any, reporting?: ReportingInput) {
    if (reporting) {
        const report = { ...reporting };
        switch (report.reportFormat) {
            case ReportFormat.PDF:
                printPdfFile(bytes);
                break;
            case ReportFormat.EXCEL:
                printExcelFile(bytes);
                break;
            case ReportFormat.WORD:
                printWordFile(bytes);
                break;
            case ReportFormat.CSV:
                printExcelFile(bytes);
                break;
            default:
                window.console.log('Aucun format de fichier précisé');
                break;
        }
    }
}

export function downloadFile(nom: string, base64: string) {
    // Extraire le type MIME si la base64 inclut un préfixe de type Data URI
    const matches = base64.match(/^data:(.+);base64,(.+)$/);
    let mimeType = 'application/octet-stream';
    let base64Data = base64;

    if (matches && matches.length === 3) {
        mimeType = matches[1];
        base64Data = matches[2];
    }

    // Convertir la base64 en Blob
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length).fill(0).map((_, i) => byteCharacters.charCodeAt(i));
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });

    // Créer une URL temporaire et déclencher le téléchargement
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nom || 'fichier';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export function convertFilesToBase64(files: { file: File; extension: string; name: string; size: string; loading: boolean; icon: string }[]): Promise<any[]> {
    const filePromises = files.map((fileObj) => {
        return new Promise((resolve, reject) => {
            const file = fileObj.file;
            if (file instanceof File) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64String = reader.result as string;
                    resolve({
                        fichierBase64: base64String.split(',')[1],
                        nomFichier: file.name,
                        typeFichier: file.type
                    });
                };
                reader.onerror = (error) => reject(error);
                reader.readAsDataURL(file);
            } else {
                reject(new Error('L\'élément n\'est pas un fichier valide'));
            }
        });
    });
    return Promise.all(filePromises);
}

export function onFileUpload(file: File, rowdata: PieceJointe) {
    const reader = new FileReader();
    reader.onload = () => {
        const result: any = reader.result;
        rowdata.fichier = result.split(',')[1];
        rowdata.nom = file.name;
        rowdata.type = file.type;
    };
    reader.readAsDataURL(file);
}

export function downloadAttachment(pj: any): void {
    if (!pj.fichier) {
        console.error('Aucun contenu de fichier trouvé');
        return;
    }

    try {
        // 1. Convertir la chaîne Base64 en octets
        const byteCharacters = atob(pj.fichier);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);

        // 2. Créer un Blob avec le type MIME correct
        const blob = new Blob([byteArray], {
            type: pj.type || 'application/octet-stream'
        });

        // 3. Créer un lien temporaire pour le téléchargement
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = pj.nom;

        link.click();
        setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch (e) {
        console.error('Erreur lors du téléchargement du fichier:', e);
    }
}

export function viewAttachment(pj: any): void {
    if (!pj.fichier) {
        console.error('Aucun contenu de fichier trouvé');
        return;
    }

    try {
        const byteCharacters = atob(pj.fichier);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);

        const blob = new Blob([byteArray], {
            type: pj.type || 'application/octet-stream'
        });

        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        
        // setTimeout(() => window.URL.revokeObjectURL(url), 1000); // Wait a bit before revoking for the new tab to load it
    } catch (e) {
        console.error('Erreur lors de la visualisation du fichier:', e);
    }
}