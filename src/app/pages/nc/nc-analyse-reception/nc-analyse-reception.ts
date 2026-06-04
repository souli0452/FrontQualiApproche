import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { NcFilterBarComponent } from '../nc-filter-bar/nc-filter-bar';
import { RoleService } from '../../../services/non-conformite/role.service'; // 👈 Bon chemin
import { getCurrentUserStructure } from '../../../utils';
import { EtapeTraitement } from '../../../enums';
import { Subject, takeUntil } from 'rxjs';

import { ReceptionComponent } from '../nc-vue-ensemble/nc-reception/nc-reception';
import { ProcNonConformiteService } from '../../../services/non-conformite/proc-non-conformite.service';

@Component({
  selector: 'app-nc-analyse-reception',
  standalone: true,
  imports: [
      CommonModule, 
      NgPrimeModule, 
      NcFilterBarComponent,
      ReceptionComponent, // 👈 Import du tableau Pilote
  ],
  templateUrl: './nc-analyse-reception.html',
  styleUrl: './nc-analyse-reception.scss'
})
export class AnalyseReceptionComponent implements OnInit, OnDestroy {
  
  receptionPiloteData: any[] = [];
  rawReceptionPiloteData: any[] = []; 
  loading: boolean = false;
  userStructure: any = {};
  
  private destroy$ = new Subject<void>();

  constructor(
    public roleService: RoleService,
    private procService: ProcNonConformiteService
  ){}
    
  ngOnInit() {
    this.userStructure = getCurrentUserStructure();
    this.fetchData();
  }

  fetchData() {
    this.loading = true;

    // 1. Si c'est le Pilote (Chef), on charge UNIQUEMENT ses validations
    if (this.roleService.isChef && this.userStructure?.id) {
        this.procService.getNonConformiteByEtapeAndSumit(EtapeTraitement.RECEPTION, this.userStructure.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res) => {
                    // On sauvegarde les données brutes
                    this.rawReceptionPiloteData = res.body || [];
                    const currentNotifs = this.procService.notificationsNC$.value;
                    this.procService.notificationsNC$.next({
                        ...currentNotifs,
                        reception: this.rawReceptionPiloteData.length
                    });
                    // Par défaut, on affiche tout
                    this.receptionPiloteData = [...this.rawReceptionPiloteData];
                    this.loading = false;
                },
                error: () => this.loading = false
            });
    }
  }

   handleFilter(filters: any) {
    if (!filters) return;
    
    const { dateDebut, dateFin, process, gravite, origine } = filters;

    // On part des données brutes
    this.receptionPiloteData = this.rawReceptionPiloteData.filter(item => {
        if (!item) return false;
        let isValid = true;

        // 1. Filtrage par Date (dateCreation ou createdAt ou date)
        if (dateDebut || dateFin) {
            const itemDateStr = item.dateCreation || item.createdAt || item.date;
            if (itemDateStr) {
                const itemDate = new Date(itemDateStr);
                itemDate.setHours(0,0,0,0);
                
                if (dateDebut) {
                    const start = new Date(dateDebut);
                    start.setHours(0,0,0,0);
                    if (itemDate < start) isValid = false;
                }
                if (dateFin) {
                    const end = new Date(dateFin);
                    end.setHours(23,59,59,999);
                    if (itemDate > end) isValid = false;
                }
            }
        }

        // 2. Filtrage par Processus
        if (process && process.id) {
            if (item.typeProcessusId !== process.id) isValid = false;
        }

        // 3. Filtrage par Gravité (Niveau)
        if (gravite && gravite.id) {
            if (item.niveauNonConformiteId !== gravite.id) isValid = false;
        }

        // 4. Filtrage par Origine (Type de NC)
        if (origine && origine.id) {
            if (item.typeNonConformiteId !== origine.id) isValid = false;
        }

        return isValid;
    });
  }



  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
