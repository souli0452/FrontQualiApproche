import { Injectable } from '@angular/core';
import { NonConformiteService } from '@features/non-conformite/services/non-conformite.service';
import { map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NcVueEnsembleFacade {

  constructor(
    private nonConformiteService: NonConformiteService,
  ) {}

  loadEvolutionStats(annee: number, mois?: number, structureId?: string) {
    return this.nonConformiteService.nonConformiteEvolutionGet(annee, mois, structureId).pipe(
      map((response: any) => {
        const stats = response?.body?.data || response?.data || response;
        return {
          totalEvolution: stats?.totalEvolution ?? 0,
          pourcentageEvolution: stats?.pourcentageEvolution ?? '',
          gravites: stats?.gravites || [],
          chartData: stats?.chartData || { labels: [], datasets: [] }
        };
      })
    );
  }
}
