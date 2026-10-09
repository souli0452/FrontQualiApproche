export interface ChartFilterEvent {
    annee: number;
    mois?: number;
    structureId?: string;
}

export interface BreakdownItem {
    label: string;
    count: number;
    colorClass?: string; // Ex: 'bg-red-500/30 text-white border-red-400/50'
    dotClass?: string;   // Ex: 'bg-red-400'
    customColor?: string; // Ex: '#ef4444' (Hex ou RGBA dynamique)
}

