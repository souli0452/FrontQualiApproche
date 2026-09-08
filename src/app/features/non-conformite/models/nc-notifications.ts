export interface NcNotificationsResumeDto {
    totalAlertes: number;
    brouillons: number;
    aTraiter: number;
    enAttenteValidation: number;
}
export interface NotificationClocheDto {
    source: string;
    code: string;
    titre: string;
    detail: string;
    gravite: string;   // URGENT | ATTENTION | INFO
    nombre: number;
}