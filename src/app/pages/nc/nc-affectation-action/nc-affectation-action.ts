import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { NcFilterBarComponent } from '../nc-filter-bar/nc-filter-bar';
import { RoleService } from '../../../services/non-conformite/role.service';
import { getCurrentUserStructure } from '../../../utils';
import { EtapeTraitement } from '../../../enums';
import { Subject, takeUntil } from 'rxjs';
import { NcAffectationComponent } from '../nc-vue-ensemble/nc-affectation/nc-affectation';
import { ProcNonConformiteService } from '../../../services/non-conformite/proc-non-conformite.service';

@Component({
  selector: 'app-nc-affectation-action',
  standalone: true,
  imports: [
      CommonModule, 
      NgPrimeModule, 
      NcFilterBarComponent,
      NcAffectationComponent
  ],
  templateUrl: './nc-affectation-action.html',
  styleUrl: './nc-affectation-action.scss'
})
export class NCAffectationActionComponent implements OnInit, OnDestroy {
  
  affectationData: any[] = [];
  rawAffectationData: any[] = []; 
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

    // TODO: Adapter la condition si l'affectation n'est pas réservée qu'au Chef
    if (this.roleService.isChef && this.userStructure?.id) {
        this.procService.getNonConformiteByEtapeAndSumit(EtapeTraitement.IMPUTATION, this.userStructure.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res) => {
                    this.rawAffectationData = res.body || [];
                    const currentNotifs = this.procService.notificationsNC$.value;
                    this.procService.notificationsNC$.next({
                        ...currentNotifs,
                        affectation: this.rawAffectationData.length
                    });
                    this.affectationData = [...this.rawAffectationData];
                    this.loading = false;
                },
                error: () => this.loading = false
            });
    } else {
        this.loading = false;
    }
  }

   handleFilter(filters: any) {
    if (!filters) return;
    
    const { dateDebut, dateFin, process, gravite, origine } = filters;

    this.affectationData = this.rawAffectationData.filter(item => {
        if (!item) return false;
        let isValid = true;

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

        if (process && process.id) {
            if (item.typeProcessusId !== process.id) isValid = false;
        }

        if (gravite && gravite.id) {
            if (item.niveauNonConformiteId !== gravite.id) isValid = false;
        }

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