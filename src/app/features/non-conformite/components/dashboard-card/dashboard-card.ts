export type StatsCardColor = 'blue' | 'orange' | 'red' | 'green' | 'purple';

export interface StatsCardConfig {
  label: string;
  valueKey: string;
  color: StatsCardColor;
  icon: string;
  badge: string;
  description: string;
  isCustomValue?: boolean;
  hasExtra?: boolean;
}

export const DASHBOARD_CARDS_AGENT: StatsCardConfig[] = [
  {
    label: 'Mes Non-Conformités',
    valueKey: 'total',
    color: 'orange',
    icon: 'pi pi-chart-line',
    badge: 'Totale',
    description: "Les Non-Conformités déclarées par vous ou qui vous sont imputées"
  },
  {
    label: 'En cours',
    valueKey: 'enCours',
    color: 'blue',
    icon: 'pi pi-sync',
    badge: 'En cours de traitement',
    description: "Vos Non-Conformités en cours de traitement"
  },
  {
    label: 'Mes Actions en Retard',
    valueKey: 'retard',
    color: 'red',
    icon: 'pi pi-clock',
    badge: 'En retard',
    description: "Plans d'action dont l'échéance est dépassée"
  },
  {
    label: 'Cloturées',
    valueKey: 'cloturees',
    color: 'green',
    icon: 'pi pi-user-edit',
    badge: 'Non-Conformités clôturées',
    description: "Vos Non-Conformités clôturées"
  }
];


export const DASHBOARD_CARDS_CHEF: StatsCardConfig[] = [
  {
    label: 'Total Déclarées',
    valueKey: 'total',
    color: 'orange',
    icon: 'pi pi-chart-line',
    badge: 'Non-Conformités totales déclarées',
    description: "Toutes les anomalies relevées par l'ensemble des utilisateurs de votre service"
  },
  {
    label: 'En cours de traitement',
    valueKey: 'enCours',
    color: 'blue',
    icon: 'pi pi-sync',
    badge: 'Non-Conformités en cours de traitement',
    description: "Centralisation de tous les dossiers actifs dans votre service"
  },
  {
    label: 'En Retard',
    valueKey: 'retard',
    color: 'red',
    icon: 'pi pi-clock',
    badge: "Délais d'exécution dépassés",
    description: "NC & actions hors délais dans votre service",
    hasExtra: true
  },
  {
    label: 'Clôturées',
    valueKey: 'cloturees',
    color: 'green',
    icon: 'pi pi-check-circle',
    badge: "Anomalies résolues",
    description: "Anomalies entièrement résolues",
    hasExtra: true
  }
];

export const DASHBOARD_CARDS_RQ: StatsCardConfig[] = [
  {
    label: 'Total Déclarées',
    valueKey: 'total',
    color: 'orange',
    icon: 'pi pi-chart-line',
    badge: 'Non-Conformités totales déclarées',
    description: "Toutes les anomalies"
  },
  {
    label: 'En cours de traitement',
    valueKey: 'enCours',
    color: 'blue',
    icon: 'pi pi-sync',
    badge: 'Non-Conformités en cours de traitement',
    description: "Dossiers actifs",
    hasExtra: true
  },
  {
    label: 'En Retard',
    valueKey: 'retard',
    color: 'red',
    icon: 'pi pi-clock',
    badge: "Délais dépassés",
    description: "NC & actions hors délais",
    hasExtra: true
  },
  {
    label: 'Clôturées',
    valueKey: 'cloturees',
    color: 'green',
    icon: 'pi pi-check-circle',
    badge: "Résolues",
    description: "Anomalies clôturées",
    hasExtra: true
  }
];