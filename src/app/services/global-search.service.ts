import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Observable, of, BehaviorSubject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { NonConformiteService } from './non-conformite.service';
import { StructureService } from '../pages/structure/structure-service/structure-service';

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

        // On lance plusieurs recherches en parallèle
        return forkJoin({
            structures: this.structureService.getAllStructures().pipe(
                map(resp => resp.body || []),
                catchError(() => of([]))
            ),
            ncs: this.ncService.findAll().pipe(
                map(resp => resp.body || []),
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
                            link: s.typeStructure === 'DIRECTION' ? '/page/direction' : '/page/service'
                        });
                    }
                });

                // Filtrage des Non-conformités
                ncs.forEach((nc: any) => {
                    if (
                        (nc.numeroNc && nc.numeroNc.toLowerCase().includes(q)) ||
                        (nc.justification && nc.justification.toLowerCase().includes(q)) ||
                        (nc.actionDsc && nc.actionDsc.toLowerCase().includes(q))
                    ) {
                        results.push({
                            title: `NC : ${nc.numeroNc}`,
                            description: nc.justification || nc.actionDsc || 'Aucune description',
                            type: 'NC',
                            date: nc.createdAt || '',
                            reference: nc.numeroNc,
                            link: `/traitement-action/detail/${nc.id}`
                        });
                    }
                });

                return results;
            })
        );
    }
}
