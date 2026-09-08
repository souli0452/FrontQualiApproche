import { NcFilter, NcStats } from '../models';


export function buildDashboardStats(data: any) {
  const stats = data?.statsByStatus || {};

 return {
    total: data?.total ?? data?.totalNC ?? 0,
    enCours: data?.enCours ?? 0,
    retard: data?.enRetard ?? data?.retard ?? 0, 
    cloturees: data?.cloturees ?? 0,
    tauxSla: data?.tauxSla ?? null,
    tauxResolution: data?.tauxResolution ?? null,
    imputees: stats.IMPUTED || 0,
    draft: stats.DRAFT || 0,
    published: stats.PUBLISHED || 0,
    inProgress: stats.IN_PROGRESS || 0,
    archived: stats.ARCHIVED || 0
  };
}




export function matchesNcFilter(item: any, filters: NcFilter): boolean {
  if (!item) return false;

  const { dateDebut, dateFin, process, gravite, origine } = filters || {} as any;

  let isValid = true;

  // --- Filtrage par Date ---
  const itemDateStr = item.dateCreation || item.createdAt || item.date;

  // ✅ Si filtre date actif ET pas de date => EXCLU
  if ((dateDebut || dateFin) && !itemDateStr) {
    return false;
  }

  if (itemDateStr) {
    const itemDate = new Date(itemDateStr);
    itemDate.setHours(0, 0, 0, 0);

    if (dateDebut) {
      const start = new Date(dateDebut);
      start.setHours(0, 0, 0, 0);
      if (itemDate < start) isValid = false;
    }

    if (dateFin) {
      const end = new Date(dateFin);
      end.setHours(23, 59, 59, 999);
      if (itemDate > end) isValid = false;
    }
  }

  // --- Filtrage par Processus ---
  if (process && process.id) {
    if (item.categorieProcessusId !== process.id) isValid = false;
  }

  // --- Filtrage par Gravité ---
  if (gravite && gravite.id) {
    if (item.niveauNonConformiteId !== gravite.id) isValid = false;
  }

  // --- Filtrage par Origine ---
  if (origine && origine.id) {
    if (item.sourceDeNonConformiteId !== origine.id) isValid = false;
  }

  return isValid;
}



export function styleEvolutionDatasets(datasets: any[]) {
  return datasets.map(ds => {

    if (ds.label === 'Mineure') {
      return {
        ...ds,
        backgroundColor: '#ffffff2f',
        hoverBackgroundColor: '#00ff99ff',
        borderRadius: 6,
        borderWidth: 0,
        barThickness: 24
      };
    }

    if (ds.label === 'Majeure') {
      return {
        ...ds,
        backgroundColor: '#ffffffab',
        hoverBackgroundColor: '#ffbf00ff',
        borderRadius: 6,
        borderWidth: 0,
        barThickness: 24
      };
    }

    if (ds.label === 'Critique') {
      return {
        ...ds,
        backgroundColor: '#ffffffff',
        hoverBackgroundColor: '#ff0000ff',
        borderRadius: 6,
        borderWidth: 0,
        barThickness: 24
      };
    }

    return ds;
  });
}

export function transformerEnStats(nonConformites: any[]): NcStats[] {
    const statsMap = new Map<any, number>();

    for (const nc of nonConformites) {
        statsMap.set(nc.status, (statsMap.get(nc.status) || 0) + 1);
    }

    return Array.from(statsMap.entries()).map(([status, count]) => ({ status, count }));
}

/**
 * Couleur d'une pastille de statut pour les actions de non-conformité.
 */
export function getStatusSeverity(status: string): string {
    if (!status) return 'info';

    const statusLower = status.toLowerCase();

    switch (statusLower) {
        case 'non_traiter':
        case 'pending':
        case 'pendind':
        case 'draft':
            return 'warn';      // Jaune/orange — l'action reste à mener
        case 'en_verification':
        case 'efficacite_a_mesurer':
        case 'in_progress':
        case 'en attente':
        case 'on hold':
            return 'info';      // Bleu — en cours d'appréciation
        case 'traiter':
        case 'approved':
        case 'validé':
        case 'oui':
            return 'success';   // Vert — réalisée et reconnue efficace
        case 'rejeté':
        case 'rejected':
        case 'annulé':
        case 'non':
        case 'en retard':
        case 'late':
            return 'danger';    // Rouge
        default:
            return 'info';      // Bleu par défaut
    }
}