import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, forkJoin, map, of, tap } from 'rxjs';

import { DemandeDocumentDto, DocumentQms } from '../models';
import { DemandeDocumentService } from './demande.service';
import { QmsDocumentService } from './document.service';
import { AppNotificationService } from '@core';

/** Ce que l'utilisateur a à traiter dans le module documentaire, à l'instant où il regarde. */
export interface DocumentaireATraiter {
    /** Documents dont le circuit lui ouvre une décision. */
    documents: DocumentQms[];
    /** Demandes de modification ou de suppression qu'il a à instruire. */
    demandes: DemandeDocumentDto[];
    /** Un chargement est en cours : distinguer « rien à faire » de « pas encore su ». */
    chargement: boolean;
    /** Vrai dès qu'un premier chargement a abouti — ou échoué. */
    charge: boolean;
}

const VIDE: DocumentaireATraiter = { documents: [], demandes: [], chargement: false, charge: false };

/**
 * Source unique de ce que l'utilisateur a à traiter côté documentaire.
 *
 * <p>Deux écrans posent la même question : la vue d'ensemble, qui affiche les dossiers et permet de
 * les prendre en charge, et la cloche de notifications, qui en annonce le nombre. Les laisser
 * interroger le serveur chacun de leur côté les aurait fait diverger — la cloche annonçant trois
 * dossiers quand la liste en montre deux, parce qu'une décision a été prise entre-temps.</p>
 *
 * <p>Le rafraîchissement est donc demandé, jamais périodique : par la vue d'ensemble à son
 * ouverture et après chaque décision, par la cloche au démarrage. Les deux lisent le même état, et
 * une décision prise dans la liste corrige la cloche du même coup.</p>
 *
 * <p>L'échec d'un des deux appels ne vide pas l'autre : un service momentanément indisponible ne
 * doit pas faire disparaître les dossiers qu'on sait par ailleurs.</p>
 */
@Injectable({ providedIn: 'root' })
export class DocumentaireATraiterService {

    private readonly documentService = inject(QmsDocumentService);
    private readonly demandeService = inject(DemandeDocumentService);
    private readonly appNotificationService = inject(AppNotificationService); 

    private readonly etat$ = new BehaviorSubject<DocumentaireATraiter>(VIDE);

    /** État courant, tel que le dernier rafraîchissement l'a établi. */
    get aTraiter$(): Observable<DocumentaireATraiter> {
        return this.etat$.asObservable();
    }

    get instantane(): DocumentaireATraiter {
        return this.etat$.value;
    }

    /** Nombre total de dossiers en attente d'un geste — ce que la cloche affiche. */
    get total(): number {
        const etat = this.etat$.value;
        return etat.documents.length + etat.demandes.length;
    }

    /**
     * Relit les deux listes auprès du serveur et publie le résultat.
     *
     * <p>Rend l'observable du chargement pour que l'appelant puisse enchaîner — la vue d'ensemble
     * s'en sert pour lever son voile de chargement au bon moment.</p>
     */
    rafraichir(): Observable<DocumentaireATraiter> {
        this.etat$.next({ ...this.etat$.value, chargement: true });

        return forkJoin({
            // Chaque appel se rabat sur sa dernière valeur connue : un service indisponible ne fait
            // pas disparaître ce qu'on savait de l'autre.
            documents: this.documentService.documentsATraiter().pipe(
                catchError(() => of(this.etat$.value.documents))),
            demandes: this.demandeService.aTraiter().pipe(
                catchError(() => of(this.etat$.value.demandes)))
        }).pipe(
            tap(({ documents, demandes }) => {
                const totalDoc = (documents?.length || 0) + (demandes?.length || 0);
                // 🚀 On envoie le badge documentaire directement au Hub central !
                this.appNotificationService.setModuleBadge('DOC', totalDoc);
                this.etat$.next({
                    documents: documents ?? [],
                    demandes: demandes ?? [],
                    chargement: false,
                    charge: true
                });
            }),
            catchError(() => {
                this.etat$.next({ ...this.etat$.value, chargement: false, charge: true });
                return of(null);
            }),
            // L'appelant reçoit l'état publié, et non les deux réponses brutes : c'est cet état que
            // lisent les écrans, et lui seul qui fait foi.
            map(() => this.etat$.value)
        );
    }
}
