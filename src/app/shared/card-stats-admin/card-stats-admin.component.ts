import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SkeletonModule } from 'primeng/skeleton';

export interface CardStatsProgressionItem {
    label: string;
    value: number | string;
    icon?: string;
}

export interface CardStatsTrend {
    value: number | string;
    isPositive?: boolean;
    label?: string;
}

@Component({
    selector: 'app-card-stats-admin',
    standalone: true,
    imports: [CommonModule, RouterModule, SkeletonModule],
    templateUrl: './card-stats-admin.component.html',
    styleUrl: './card-stats-admin.component.scss'
})
export class CardStatsAdminComponent {
    /** Petit badge d'en-tête (ex: 'Total Déclarées', 'En cours de traitement') */
    @Input() label: string = '';

    /** Chiffre ou valeur principale (ex: 15, 6, '85%') */
    @Input() value: number | string = 0;

    /** Titre principal en gras sous le chiffre (ex: 'Non-Conformités totales déclarées') */
    @Input() title: string = '';

    /** Alias de compatibilité pour `title` */
    @Input() set badge(val: string) {
        if (val && !this.title) {
            this.title = val;
        }
    }

    /** Description ou texte explicatif secondaire */
    @Input() description: string = '';

    /** Thème colorimétrique de la carte */
    @Input() color: 'orange' | 'blue' | 'red' | 'green' | 'purple' = 'blue';

    /** Icône du bouton d'action circulaire en haut à droite (défaut: flèche droite) */
    @Input() icon: string = 'pi pi-arrow-right';

    /** Lien de redirection optionnel au clic */
    @Input() routerLink?: string | any[];

    /** Indique si la carte est cliquable (ajoute le pointeur et l'effet hover) */
    @Input() clickable: boolean = true;

    /** État de chargement avec affichage du skeleton */
    @Input() loading: boolean = false;

    /** Sous-indicateurs d'avancement / progression (ex: [{ label: 'Validation Pilote', value: 0 }]) */
    @Input() progressionItems: CardStatsProgressionItem[] = [];

    /** Indicateur de tendance optionnel (+12%, -5%) */
    @Input() trend?: CardStatsTrend | null = null;

    /** Pourcentage de progression optionnel (0 à 100) affiché sous forme de jauge fine */
    @Input() progress?: number | null = null;

    /** Événement déclenché lors du clic sur la carte ou le bouton d'action */
    @Output() actionClick = new EventEmitter<void>();

    onCardClick(event: MouseEvent): void {
        if (this.clickable) {
            this.actionClick.emit();
        }
    }

    onActionBtnClick(event: MouseEvent): void {
        event.stopPropagation();
        this.actionClick.emit();
    }
}
