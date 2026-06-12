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
    label: 'En attente',
    valueKey: 'published',
    color: 'red',
    icon: 'pi pi-exclamation-triangle',
    badge: 'En attente',
    description: "Non-conformités en attente d'approbation de votre Pilote"
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
    icon: 'pi pi-arrow-right',
    badge: 'Non-Conformités totales déclarées',
    description: "Toutes les anomalies relevées par l'ensemble des utilisateurs de votre service"
  },
  {
    label: 'En cours de traitement',
    valueKey: 'enCours',
    color: 'blue',
    icon: 'pi pi-arrow-right',
    badge: 'Non-Conformités en cours de traitement',
    description: "Centralisation de tous les dossiers actifs dans votre service"
  },
  {
    label: 'En Retard',
    valueKey: 'retard',
    color: 'red',
    icon: 'pi pi-arrow-right',
    badge: "Délais d'exécution dépassés",
    description: "Actions correctives hors délais dans votre service"
  },
  {
    label: 'Clôturées',
    valueKey: 'cloturees',
    color: 'green',
    icon: 'pi pi-arrow-right',
    badge: "Anomalies résolues",
    description: "Anomalies entièrement résolues",
    isCustomValue: true 
  }
];

export const DASHBOARD_CARDS_RQ: StatsCardConfig[] = [
        {
            label: 'Total Déclarées',
            valueKey: 'total',
            color: 'orange',
            icon: 'pi pi-arrow-right',
            badge: 'Non-Conformités totales déclarées',
            description: "Toutes les anomalies relevées dans le système"
        },
        {
            label: 'En cours de traitement',
            valueKey: 'enCours',
            color: 'blue',
            icon: 'pi pi-arrow-right',
            badge: 'Non-Conformités en cours de traitement',
            description: "Dossiers actifs",
            hasExtra: true
        },
        {
            label: 'En Retard',
            valueKey: 'retard',
            color: 'red',
            icon: 'pi pi-arrow-right',
            badge: "Délais dépassés",
            description: "Actions hors délais"
        },
        {
            label: 'Clôturées',
            valueKey: 'cloturees',
            color: 'green',
            icon: 'pi pi-arrow-right',
            badge: "Résolues",
            description: "Anomalies clôturées",
            isCustomValue: true
        }
    ];