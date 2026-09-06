import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgPrimeModule } from '@prime-ng';
import { NiveauNonConformiteService, OrigineNonConformiteService } from '../../services';
import { CategorieProcessus } from '../../../../models/categore-processus.model';
import { NiveauNonConformite, OrigineNonConformite } from '../../models';
import { CategorieProcessusService } from '@features/organigramme';
import { TypeStructure } from '@core/enums';
import { MultiselectInputComponent } from '@shared';
import { Structure, StructureService } from '@features/organigramme';
import { NcFilter } from '../../models';
export type { NcFilter };

@Component({
    selector: 'app-nc-filter-bar',
    standalone: true,
    imports: [CommonModule, FormsModule, NgPrimeModule, MultiselectInputComponent],
    templateUrl: './nc-filter-bar.html',
    styleUrl: './nc-filter-bar.scss'
})
export class NcFilterBarComponent implements OnInit {
    
    @Output() onFilterChange = new EventEmitter<NcFilter>();

    @Input() showProcessus: boolean = true; 
    @Input() showGravite: boolean = true; 
    @Input() showOrigine: boolean = true; 
    
    processusList: Structure[] = [];
    graviteList: NiveauNonConformite[] = [];
    origineList: OrigineNonConformite[] = [];

    dateDebut: Date | undefined;
    dateFin: Date | undefined;
    activePreset: string = '';

    // Nouvelle variable pour le range
    rangeDates: Date[] | undefined;

    // Initialisez vos variables de sélection en tant que tableaux vides
    selectedProcess: any[] = [];
    selectedGravite: any[] = [];
    selectedOrigine: any[] = [];

    // États d'expansion des sections de filtre
    expandedProcessus: boolean = false;
    expandedGravite: boolean = false;
    expandedOrigine: boolean = false;


    constructor(
        protected typeProcessusService: CategorieProcessusService,
        private structureService: StructureService,
        protected niveauNonConformiteService: NiveauNonConformiteService,
        protected typeNonConformiteService: OrigineNonConformiteService
    ) {}

    ngOnInit() {
        this.loadRealData();
        this.setDefaultDates();
        setTimeout(() => this.applyFilters(), 200);
    }

    private loadRealData() {
        // this.typeProcessusService.findAll().subscribe({
        //     next: (res) => this.processusList = res.data.content || [],
        //     error: (err) => console.error('Erreur chargement processus', err)
        // });

        this.structureService.getAllStructure(TypeStructure.SERVICE).subscribe({
            next: (res) => {
                console.log("Les structures : ", res.content);
                this.processusList = res.content;
            },
            error: (err) => console.error('Erreur chargement processus', err)
        });

        this.niveauNonConformiteService.findAll().subscribe({
            next: (res) => this.graviteList = res.data.content || [],
            error: (err) => console.error('Erreur chargement gravités', err)
        });

        this.typeNonConformiteService.findAll().subscribe({
            next: (res) => this.origineList = res.data.content || [],
            error: (err) => console.error('Erreur chargement origines', err)
        });
    }

    // Raccourcis de dates prédéfinis
    datePresets = [
        { label: "Aujourd'hui", value: 'today' },
        { label: 'Hier', value: 'yesterday' },
        { label: '7 derniers jours', value: 'last7' },
        { label: '30 derniers jours', value: 'last30' },
        { label: 'Ce mois', value: 'thisMonth' },
        { label: 'Mois dernier', value: 'lastMonth' },
    ];

    getFormattedRangeLabel(): string {
    if (this.dateDebut && this.dateFin) {
        const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: '2-digit' };
        return `${this.dateDebut.toLocaleDateString('fr-FR', options)} - ${this.dateFin.toLocaleDateString('fr-FR', options)}`;
    }
    return 'Sélectionner une période';
}
getFormattedRangeSubLabel(): string {
    if (this.rangeDates && this.rangeDates[0]) {
        const startStr = this.rangeDates[0].toLocaleDateString('fr-FR');
        const endStr = this.rangeDates[1] ? this.rangeDates[1].toLocaleDateString('fr-FR') : '...';
        return `${startStr} - ${endStr}`;
    }
    return 'Aucune date sélectionnée';
}
applyPreset(preset: string) {
    this.activePreset = preset;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let start: Date;
    let end: Date = new Date(today);
    switch (preset) {
        case 'today':
            start = new Date(today);
            break;
        case 'yesterday':
            start = new Date(today);
            start.setDate(start.getDate() - 1);
            end = new Date(start);
            break;
        case 'last7':
            start = new Date(today);
            start.setDate(start.getDate() - 6);
            break;
        case 'last30':
            start = new Date(today);
            start.setDate(start.getDate() - 29);
            break;
        case 'thisMonth':
            start = new Date(today.getFullYear(), today.getMonth(), 1);
            break;
        case 'lastMonth':
            start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            end = new Date(today.getFullYear(), today.getMonth(), 0);
            break;
        default:
            return;
    }
    this.rangeDates = [start, end];
}
cancelDateSelection(panel: any) {
    // Réinitialiser avec les anciennes valeurs appliquées
    if (this.dateDebut && this.dateFin) {
        this.rangeDates = [new Date(this.dateDebut), new Date(this.dateFin)];
    } else {
        this.rangeDates = undefined;
    }
    panel.hide();
}
applyDateSelection(panel: any) {
    if (this.rangeDates && this.rangeDates[0] && this.rangeDates[1]) {
        this.dateDebut = this.rangeDates[0];
        this.dateFin = this.rangeDates[1];
        this.applyFilters();
    }
    panel.hide();
}

    private setDefaultDates() {
        const today = new Date();
        const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
        this.dateDebut = firstDayOfYear;
        this.dateFin = today;
    }

    applyFilters() {
        const filters: NcFilter = {
            dateDebut: this.dateDebut,
            dateFin: this.dateFin,
            process: this.selectedProcess,
            gravite: this.selectedGravite,
            origine: this.selectedOrigine
        };
        this.onFilterChange.emit(filters);
    }

    resetFilters() {
        this.selectedProcess = [];
        this.selectedGravite = [];
        this.selectedOrigine = [];
        this.setDefaultDates();
        this.applyFilters();
    }

    getActiveFiltersCount(): number {
        let count = 0;
        if (this.selectedProcess && this.selectedProcess.length > 0) count++;
        if (this.selectedGravite && this.selectedGravite.length > 0) count++;
        if (this.selectedOrigine && this.selectedOrigine.length > 0) count++;
        return count;
    }
}
