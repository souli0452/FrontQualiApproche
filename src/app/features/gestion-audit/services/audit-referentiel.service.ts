import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, shareReplay, switchMap } from 'rxjs';
import { UrlConfig } from '@core/services/url-config';
import { AuditGestionService, contenu } from './audit.service';
import {
    AuditeurFiche,
    CritereEvaluationAuditeur,
    NiveauEvaluationAuditeur,
    SiteAudit,
    TypeAuditRef,
    TypeConstatRef
} from '../models/audit.model';
import { ApiResponse } from '../../../models/response.model';
import { StructureService } from '@features/organigramme/services/structure.service';
import { Structure } from '@features/organigramme/models/structure.model';

/** Un utilisateur de l'annuaire, tel que `/users` le sert. */
export interface UtilisateurAnnuaire {
    id: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    email?: string;
    fonction?: string;
    structure?: string;
    nomComplet: string;
}

/** Les libellés d'un audit, que le serveur sert en identifiants. */
export interface LibellesAudit {
    processus(id?: string): string;
    sites(ids?: string[]): string;
    auditeur(id?: string): string;
    utilisateur(id?: string): string;
}

export const LIBELLES_VIDES: LibellesAudit = {
    processus: () => '—',
    sites: () => '—',
    auditeur: () => '—',
    utilisateur: () => '—'
};

/**
 * Les listes du paramétrage, chargées une fois par session : toute donnée paramétrée se choisit
 * dans une liste, jamais ne se saisit. Les entrées retirées (`actif` à faux) sont servies aussi,
 * pour rester lisibles sur les dossiers qui les portent ; aux écrans de ne pas les proposer.
 */
@Injectable({ providedIn: 'root' })
export class AuditReferentielService {

    private typesAudit$?: Observable<ApiResponse<TypeAuditRef>>;
    private typesConstat$?: Observable<ApiResponse<TypeConstatRef>>;
    private sites$?: Observable<ApiResponse<SiteAudit>>;
    private processus$?: Observable<Structure[]>;
    private utilisateurs$?: Observable<UtilisateurAnnuaire[]>;
    private auditeurs$?: Observable<AuditeurFiche[]>;
    private criteres$?: Observable<CritereEvaluationAuditeur[]>;
    private niveaux$?: Observable<NiveauEvaluationAuditeur[]>;

    constructor(
        private http: HttpClient,
        private auditService: AuditGestionService,
        private structureService: StructureService
    ) {}

    getTypesAudit(): Observable<ApiResponse<TypeAuditRef>> {
        this.typesAudit$ ??= this.auditService.getTypesAudit().pipe(shareReplay(1));
        return this.typesAudit$;
    }

    getTypesConstat(): Observable<ApiResponse<TypeConstatRef>> {
        this.typesConstat$ ??= this.auditService.getTypesConstat().pipe(shareReplay(1));
        return this.typesConstat$;
    }

    getSitesAudit(): Observable<ApiResponse<SiteAudit>> {
        this.sites$ ??= this.auditService.getSitesAudit().pipe(shareReplay(1));
        return this.sites$;
    }

    typesAudit(): Observable<TypeAuditRef[]> {
        return this.getTypesAudit().pipe(map(res => contenu<TypeAuditRef>(res)));
    }

    typesConstat(): Observable<TypeConstatRef[]> {
        return this.getTypesConstat().pipe(map(res => contenu<TypeConstatRef>(res)));
    }

    sites(): Observable<SiteAudit[]> {
        return this.getSitesAudit().pipe(map(res => contenu<SiteAudit>(res)));
    }

    /** Les structures qu'un audit peut viser comme processus audité. */
    processus(): Observable<Structure[]> {
        return (this.processus$ ??= this.structureService
            .getAllStructure(undefined, undefined, 0, 1000)
            .pipe(map(page => page?.content ?? []), shareReplay(1)));
    }

    utilisateurs(): Observable<UtilisateurAnnuaire[]> {
        return (this.utilisateurs$ ??= this.http
            .get(UrlConfig.USERS_URL, { params: { page: 0, size: 1000 } })
            .pipe(
                map(res => contenu<any>(res).map(u => ({
                    ...u,
                    nomComplet: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || u.email || '—'
                }) as UtilisateurAnnuaire)),
                shareReplay(1)
            ));
    }

    /** Le vivier d'auditeurs entier, nommé d'après l'annuaire, pour les listes de choix. */
    auditeurs(): Observable<AuditeurFiche[]> {
        return (this.auditeurs$ ??= this.auditService.getAuditeurs().pipe(
            switchMap(vivier => this.nommer(contenu<AuditeurFiche>(vivier))),
            shareReplay(1)
        ));
    }

    /** Des auditeurs nommés d'après l'annuaire : le serveur ne sert que `utilisateurId`. */
    nommer(auditeurs: AuditeurFiche[]): Observable<AuditeurFiche[]> {
        return this.utilisateurs().pipe(map(utilisateurs => {
            const parId = new Map(utilisateurs.map(u => [u.id, u]));
            return auditeurs.map(a => {
                const u = parId.get(a.utilisateurId ?? '');
                return { ...a, nom: u?.lastName, prenom: u?.firstName, email: u?.email, nomComplet: u?.nomComplet ?? 'Utilisateur inconnu' };
            });
        }));
    }

    criteresEvaluation(): Observable<CritereEvaluationAuditeur[]> {
        return (this.criteres$ ??= this.http
            .get(`${UrlConfig.AUDIT_CRITERES_EVAL_AUDITEUR_URL}/all`, { params: { inactifs: true } })
            .pipe(map(res => contenu<CritereEvaluationAuditeur>(res)), shareReplay(1)));
    }

    niveauxEvaluation(): Observable<NiveauEvaluationAuditeur[]> {
        return (this.niveaux$ ??= this.http
            .get(`${UrlConfig.AUDIT_NIVEAUX_EVAL_AUDITEUR_URL}/all`, { params: { inactifs: true } })
            .pipe(
                map(res => contenu<NiveauEvaluationAuditeur>(res).sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))),
                shareReplay(1)
            ));
    }

    /** Processus, sites, auditeurs et utilisateurs par leur nom. Des tirets, jamais d'identifiant brut. */
    libelles(): Observable<LibellesAudit> {
        return forkJoin({
            processus: this.processus(),
            sites: this.sites(),
            auditeurs: this.auditeurs(),
            utilisateurs: this.utilisateurs()
        }).pipe(
            map(({ processus, sites, auditeurs, utilisateurs }) => {
                const p = new Map(processus.map(s => [s.id, s.libelleLong || s.libelleCourt || '—']));
                const s = new Map(sites.map(x => [x.id, x.nom ?? '—']));
                const a = new Map(auditeurs.map(x => [x.id, x.nomComplet ?? '—']));
                const u = new Map(utilisateurs.map(x => [x.id, x.nomComplet]));
                return {
                    processus: id => (id ? p.get(id) ?? '—' : '—'),
                    sites: ids => (ids?.length ? ids.map(i => s.get(i) ?? '—').join(', ') : '—'),
                    auditeur: id => (id ? a.get(id) ?? '—' : '—'),
                    utilisateur: id => (id ? u.get(id) ?? '—' : '—')
                };
            })
        );
    }

    /** Oublie les listes chargées, après une modification du paramétrage. */
    invalidate(): void {
        this.typesAudit$ = this.typesConstat$ = this.sites$ = undefined;
        this.processus$ = this.utilisateurs$ = this.auditeurs$ = undefined;
        this.criteres$ = this.niveaux$ = undefined;
    }
}
