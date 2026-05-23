import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { TypeProcessusService } from '../../../services/type-processus.service';
import { NiveauNonConformiteService } from '../../../services/niveau-non-conformite.service';
import { TypeNonConformiteService } from '../../../services/type-non-conformite.service';
import { NiveauNonConformite, TypeProcessus, TypeNonConformite } from '../../../models';

export interface NcFilter {
    dateDebut: Date | undefined;
    dateFin: Date | undefined;
    process: any;
    gravite: any;
    origine: any;
}

@Component({
    selector: 'app-nc-filter-bar',
    standalone: true,
    imports: [CommonModule, FormsModule, NgPrimeModule],
    templateUrl: './nc-filter-bar.html',
    styleUrl: './nc-filter-bar.scss'
})
export class NcFilterBarComponent implements OnInit {
    
    @Output() onFilterChange = new EventEmitter<NcFilter>();

    @Input() showProcessus: boolean = true; 
    @Input() showGravite: boolean = true; 
    @Input() showOrigine: boolean = true; 
    
    processusList: TypeProcessus[] = [];
    graviteList: NiveauNonConformite[] = [];
    origineList: TypeNonConformite[] = [];

    dateDebut: Date | undefined;
    dateFin: Date | undefined;
    selectedProcess: any;
    selectedGravite: any;
    selectedOrigine: any;

    constructor(
        protected typeProcessusService: TypeProcessusService,
        protected niveauNonConformiteService: NiveauNonConformiteService,
        protected typeNonConformiteService: TypeNonConformiteService
    ) {}

    ngOnInit() {
        this.loadRealData();
        this.setDefaultDates();
        setTimeout(() => this.applyFilters(), 200);
    }

    private loadRealData() {
        this.typeProcessusService.findAll().subscribe({
            next: (res) => this.processusList = res.body || [],
            error: (err) => console.error('Erreur chargement processus', err)
        });

        this.niveauNonConformiteService.findAll().subscribe({
            next: (res) => this.graviteList = res.body || [],
            error: (err) => console.error('Erreur chargement gravités', err)
        });

        this.typeNonConformiteService.findAll().subscribe({
            next: (res) => this.origineList = res.body || [],
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
