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

