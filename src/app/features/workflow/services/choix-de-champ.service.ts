import { Injectable } from '@angular/core';
import { Observable, of, shareReplay } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService, getCurrentUserStructure } from '@core/auth';
import { StructureService } from '@features/organigramme/services';

/** Une valeur proposée à l'utilisateur : ce qu'il lit, et ce qui part au serveur. */
export interface ChoixDeChamp {
    label: string;
    value: string;
}

/**
 * Valeurs proposées par un champ de type liste dans les transitions de circuit.
 * Résout les sources dynamiques du référentiel (@STRUCTURES, @UTILISATEURS, etc.).
 */
@Injectable({ providedIn: 'root' })
export class ChoixDeChampService {

    private readonly cache = new Map<string, Observable<ChoixDeChamp[]>>();

    constructor(
        private structureService: StructureService,
        private authService: AuthService
    ) {}

    /** La chaîne d'options désigne-t-elle une source plutôt qu'une liste littérale ? */
    estUneSource(options?: string | null): boolean {
        return (options ?? '').trim().startsWith('@');
    }

    /**
     * Valeurs proposées pour une source.
     * Si une structureId est fournie (ex: structure destinataire du dossier), elle est utilisée en priorité.
     */
    choix(source: string, structureId?: string | null): Observable<ChoixDeChamp[]> {
        const cle = source.trim().toUpperCase();
        const sId = structureId || (cle === '@UTILISATEURS_MA_STRUCTURE' ? getCurrentUserStructure()?.id : null);
        const cacheKey = sId ? `${cle}:${sId}` : cle;

        const dejaDemande = this.cache.get(cacheKey);
        if (dejaDemande) {
            return dejaDemande;
        }

        const flux = this.interroger(cle, sId).pipe(
            catchError(() => of([] as ChoixDeChamp[])),
            shareReplay({ bufferSize: 1, refCount: false })
        );
        this.cache.set(cacheKey, flux);
        return flux;
    }

    /** Vide le cache en mémoire (ex: lors d'une déconnexion ou changement de contexte). */
    nettoyerCache(): void {
        this.cache.clear();
    }

    private interroger(cle: string, structureId?: string | null): Observable<ChoixDeChamp[]> {
        switch (cle) {
            case '@STRUCTURES':
                return this.structureService.getAllStructure().pipe(
                    map((page) => (page?.content ?? []).map((structure: any) => ({
                        label: structure.libelleLong || structure.libelleCourt || structure.id,
                        value: structure.id
                    })))
                );
            case '@UTILISATEURS_MA_STRUCTURE': {
                const sId = structureId || getCurrentUserStructure()?.id;
                if (!sId) {
                    return of([]);
                }
                return this.authService.loadAgentPublicByService(sId).pipe(
                    map((reponse: any) => (reponse?.data?.content ?? []).map((agent: any) => {
                        const userObj = agent.user ? agent.user : agent;
                        return {
                            label: [userObj.firstName, userObj.lastName].filter(Boolean).join(' ')
                                || userObj.email || userObj.userId || userObj.username || agent.id,
                            value: userObj.userId || userObj.id || agent.id
                        };
                    }))
                );
            }
            case '@UTILISATEURS':
                return this.authService.getAllUsers(0, 500).pipe(
                    map((reponse: any) => (reponse?.data?.content ?? []).map((utilisateur: any) => {
                        const userObj = utilisateur.user ? utilisateur.user : utilisateur;
                        return {
                            label: [userObj.firstName, userObj.lastName].filter(Boolean).join(' ')
                                || userObj.email || userObj.userId || userObj.username || utilisateur.id,
                            value: userObj.userId || userObj.id || utilisateur.id
                        };
                    }))
                );
            case '@CIRCUITS_TRAITEMENT':
                return of([
                    { label: 'Action corrective', value: 'ACTION_CORRECTIVE' },
                    { label: 'Correction', value: 'CORRECTION' }
                ]);
            default:
                return of([]);
        }
    }
}
