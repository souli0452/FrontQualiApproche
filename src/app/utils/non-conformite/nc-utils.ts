import { NcFilter } from "../../components/non-conformite/nc-filter-bar/nc-filter-bar";


export function buildDashboardStats(data: any) {
  const stats = data?.statsByStatus || {};

  return {
    total: data?.totalNC || Object.values(stats).reduce((a: any, b: any) => a + b, 0) || 0,
    enCours: (stats.PENDING_PILOT || 0) + (stats.PENDING_RQ || 0) + (stats.PENDING_ASSIGNMENT || 0) + (stats.IN_PROGRESS || 0) + (stats.PENDING_PILOT_REVIEW || 0) + (stats.PENDING_CLOSURE || 0),
    retard: stats.OVERDUE || data?.retard || 0, 
    imputees: (stats.IMPUTED || 0),
    cloturees: stats.CLOSED || 0,
    draft: stats.DRAFT || 0,
    published: stats.PUBLISHED || 0,
    pendingPilot: stats.PENDING_PILOT || 0,
    rejectedByPilot: stats.REJECTED_BY_PILOT || 0,
    pendingRq: stats.PENDING_RQ || 0,
    rejectedByRq: stats.REJECTED_BY_RQ || 0,
    pendingAssignment: stats.PENDING_ASSIGNMENT || 0,
    inProgress: stats.IN_PROGRESS || 0,
    pendingPilotReview: stats.PENDING_PILOT_REVIEW || 0,
    pendingClosure: stats.PENDING_CLOSURE || 0,
    closed: stats.CLOSED || 0,
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
    if (item.typeProcessusId !== process.id) isValid = false;
  }

  // --- Filtrage par Gravité ---
  if (gravite && gravite.id) {
    if (item.niveauNonConformiteId !== gravite.id) isValid = false;
  }

  // --- Filtrage par Origine ---
  if (origine && origine.id) {
    if (item.typeNonConformiteId !== origine.id) isValid = false;
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