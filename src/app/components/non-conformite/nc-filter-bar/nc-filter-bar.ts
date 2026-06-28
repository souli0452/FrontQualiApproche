import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { NiveauNonConformiteService } from '../../../services/non-conformite/niveau-non-conformite.service';
import { CategorieProcessus } from '../../../models/categore-processus.model';
import { NiveauNonConformite, OrigineNonConformite } from '../../../models/non-conformite.model';
import { CategorieProcessusService } from '../../../services/non-conformite/type-processus.service';
import { OrigineNonConformiteService } from '../../../services/non-conformite/type-non-conformite.service';

export interface NcFilter {
    dateDebut: Date | undefined;
    dateFin: Date | undefined;
    process: any;
    gravite: any;
    origine: any;
}

@Component({
    selector: 'app-nc-filter-bar',
    imports: [CommonModule, FormsModule, NgPrimeModule],
    templateUrl: './nc-filter-bar.html',
    styleUrl: './nc-filter-bar.scss'
})
export class NcFilterBarComponent implements OnInit {
    
    @Output() onFilterChange = new EventEmitter<NcFilter>();

    @Input() showProcessus: boolean = true; 
    @Input() showGravite: boolean = true; 
    @Input() showOrigine: boolean = true; 
    
    processusList: CategorieProcessus[] = [];
    graviteList: NiveauNonConformite[] = [];
    origineList: OrigineNonConformite[] = [];

    dateDebut: Date | undefined;
    dateFin: Date | undefined;
    selectedProcess: any;
    selectedGravite: any;
    selectedOrigine: any;

    constructor(
        protected typeProcessusService: CategorieProcessusService,
        protected niveauNonConformiteService: NiveauNonConformiteService,
        protected typeNonConformiteService: OrigineNonConformiteService
    ) {}

    ngOnInit() {
        this.loadRealData();
        this.setDefaultDates();
        setTimeout(() => this.applyFilters(), 200);
    }

    private loadRealData() {
        this.typeProcessusService.findAll().subscribe({
            next: (res) => this.processusList = res.data.content || [],
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
        this.selectedProcess = undefined;
        this.selectedGravite = undefined;
        this.selectedOrigine = undefined;
        this.setDefaultDates();
        this.applyFilters();
    }
}
