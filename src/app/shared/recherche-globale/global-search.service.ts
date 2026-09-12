import { Injectable } from '@angular/core';
import { NonConformiteService } from '@features/non-conformite/services/non-conformite.service';
import { StructureService } from '@features/organigramme/services/structure.service';
import { forkJoin, Observable, of, BehaviorSubject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface SearchResult {
    title: string;
    description: string;
    type: 'NC' | 'Structure' | 'Utilisateur' | 'Autre';
    date: string;
    reference: string;
    link: string;
}

@Injectable({
    providedIn: 'root'
})
export class GlobalSearchService {
    private searchSubject = new BehaviorSubject<string>('');
    searchQuery$ = this.searchSubject.asObservable();

    constructor(
        private structureService: StructureService,
        private ncService: NonConformiteService
    ) {}

    updateSearchQuery(query: string) {
        this.searchSubject.next(query);
    }

    search(query: string): Observable<SearchResult[]> {
        if (!query || query.trim().length < 2) {
            return of([]);
        }

        const q = query.toLowerCase().trim();

        return forkJoin({
            structures: this.structureService.getAllStructures().pipe(
                map((resp: any) => resp.data?.content || resp?.content || []),
                catchError(() => of([]))
            ),
            ncs: this.ncService.findAll().pipe(
                map((resp: any) => resp.data?.content || resp?.content || []),
                catchError(() => of([]))
            )
        }).pipe(
            map(({ structures, ncs }) => {
                const results: SearchResult[] = [];

                // Filtrage des structures (Directions / Services)
                structures.forEach((s: any) => {
                    if (
                        (s.libelleLong && s.libelleLong.toLowerCase().includes(q)) ||
                        (s.libelleCourt && s.libelleCourt.toLowerCase().includes(q)) ||
                        (s.ville && s.ville.toLowerCase().includes(q)) ||
                        (s.region && s.region.toLowerCase().includes(q))
                    ) {
                        results.push({
                            title: s.libelleLong || s.libelleCourt,
                            description: `${s.ville ? s.ville + ', ' : ''}${s.region || ''}`,
                            type: 'Structure',
                            date: s.createdAt || '',
                            reference: s.libelleCourt,
                            link: s.typeStructure === 'DIRECTION' ? '/organigramme/structure' : '/organigramme/structure'
                        });
                    }
                });

                // Filtrage des Non-conformités
                ncs.forEach((nc: any) => {
                    if (
                        (nc.numeroDeReference && nc.numeroDeReference.toLowerCase().includes(q)) ||
                        (nc.numeroNc && nc.numeroNc.toLowerCase().includes(q)) ||
                        (nc.description && nc.description.toLowerCase().includes(q)) ||
                        (nc.actionImmediate && nc.actionImmediate.toLowerCase().includes(q))
                    ) {
                        results.push({
                            title: `NC : ${nc.numeroNc || nc.numeroDeReference}`,
                            description: nc.description || nc.actionImmediate || 'Aucune description',
                            type: 'NC',
                            date: nc.createdAt || '',
                            reference: nc.numeroNc || nc.numeroDeReference,
                            link: `/non-conformite/vue-ensemble`
                        });
                    }
                });

                return results;
            })
        );
    }
}
