import { Injectable } from '@angular/core';
import { Observable, of, shareReplay } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from '../../services/auth-services/auth.service';
import { getCurrentUserStructure } from '../../utils/global/global-utils';
import { StructureService } from '../../pages/parametrages/structure/structure.service';

/** Une valeur proposée à l'utilisateur : ce qu'il lit, et ce qui part au serveur. */
export interface ChoixDeChamp {
    label: string;
    value: string;
}

/**
 * Valeurs proposées par un champ de type liste.
 *
 * <p>Une liste écrite dans le circuit convient à « Oui, Non ». Elle ne convient pas aux structures
 * ni aux utilisateurs : ceux-là vivent dans leur référentiel et changent sans qu'on remanie le
 * circuit. Une structure créée après coup n'y aurait jamais figuré, et un libellé corrigé au
 * référentiel serait resté faux dans toutes les décisions à venir.</p>
 *
 * <p>Le champ déclare alors une <b>source</b> — {@code @STRUCTURES}, {@code @UTILISATEURS} — que ce
 * service résout. La valeur retenue est l'identifiant : c'est lui que le moteur transporte, et le
 * module métier en tire le libellé auprès de la source, sans le demander à l'utilisateur.</p>
 */
@Injectable({ providedIn: 'root' })
export class ChoixDeChampService {

    /**
     * Une source est interrogée une fois par session d'écran : le dialogue se reconstruit à chaque
     * ouverture et à chaque changement d'action, ce qui multiplierait sinon les appels.
     */
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
     *
     * <p>Une source inconnue ou injoignable rend une liste vide : le champ s'affiche sans choix
     * plutôt que de faire échouer le dialogue de décision tout entier.</p>
     */
    choix(source: string): Observable<ChoixDeChamp[]> {
        const cle = source.trim().toUpperCase();
        const dejaDemande = this.cache.get(cle);
        if (dejaDemande) {
            return dejaDemande;
        }

        const flux = this.interroger(cle).pipe(
            catchError(() => of([] as ChoixDeChamp[])),
            shareReplay({ bufferSize: 1, refCount: false })
        );
        this.cache.set(cle, flux);
        return flux;
    }

    private interroger(cle: string): Observable<ChoixDeChamp[]> {
        switch (cle) {
            case '@STRUCTURES':
                return this.structureService.getAllStructure().pipe(
                    map((page) => (page?.content ?? []).map((structure: any) => ({
                        label: structure.libelleLong || structure.libelleCourt || structure.id,
                        value: structure.id
                    })))
                );
            case '@UTILISATEURS_MA_STRUCTURE': {
                // La structure n'est pas inscrite dans le circuit : c'est celle de l'appelant,
                // résolue ici. Le même circuit sert donc toutes les structures.
                const maStructure = getCurrentUserStructure();
                if (!maStructure?.id) {
                    return of([]);
                }
                return this.authService.loadAgentPublicByService(maStructure.id).pipe(
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
                // Une page large : ces listes servent à désigner quelqu'un, pas à parcourir un
                // annuaire. Une pagination y rendrait le choix impraticable.
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
                // Les deux seuls circuits de traitement d'une non-conformité. Une liste écrite dans
                // le circuit aurait fait retenir le libellé comme valeur, et corriger l'orthographe
                // depuis l'éditeur aurait suffi à rompre le lien avec l'énumération du serveur.
                return of([
                    { label: 'Action corrective', value: 'ACTION_CORRECTIVE' },
                    { label: 'Correction', value: 'CORRECTION' }
                ]);
            default:
                return of([]);
        }
    }
}
