import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { NcFilterBarComponent } from '../nc-filter-bar/nc-filter-bar';
import { RoleService } from '../../../services/non-conformite/role.service'; // 👈 Bon chemin
import { ProcNonConformiteService } from '../../proc-non-conformite/proc-non-conformite.service';
import { getCurrentUserStructure } from '../../../utils';
import { EtapeTraitement } from '../../../enums';
import { Subject, takeUntil, forkJoin } from 'rxjs';

// 👇 N'oubliez pas d'importer les composants de vos deux tableaux
import { ValidationRQComponent } from '../nc-vue-ensemble/nc-validation-rq/nc-validation-rq';
import { ReceptionComponent } from '../nc-vue-ensemble/nc-reception/nc-reception';
import { ValidationPiloteComponent } from '../nc-vue-ensemble/nc-validation-pilote/nc-validation-pilote';
import { NcClotureComponent } from '../nc-vue-ensemble/nc-cloture-rq/nc-cloture';

@Component({
  selector: 'app-nc-analyse-validation',
  standalone: true,
  imports: [
      CommonModule, 
      NgPrimeModule, 
      NcFilterBarComponent,
      ValidationPiloteComponent, // 👈 Import du tableau Pilote
      ValidationRQComponent,   // 👈 Import du tableau RQ
      NcClotureComponent       // 👈 Import du tableau Cloture
  ],
  templateUrl: './nc-analyse-validation.html',
  styleUrl: './nc-analyse-validation.scss'
})
export class AnalyseValidationComponent implements OnInit, OnDestroy {
  
  validationPiloteData: any[] = [];
  validationRqData: any[] = [];
  clotureData: any[] = [];
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
        this.procService.getNonConformiteByEtapeAndSumit(EtapeTraitement.VALIDATION, this.userStructure.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res) => {
                  console.log(" validation pilote ", res);
                  
                    this.validationPiloteData = res.body || [];
                    this.loading = false;
                },
                error: () => this.loading = false
            });
    }

    // 2. Si c'est le RQ, on charge UNIQUEMENT les validations RQ
    if (this.roleService.isRQ) {
        forkJoin({
            validation: this.procService.getNonConformiteByEtape(EtapeTraitement.VALIDATION_RS),
            cloture: this.procService.getNonConformiteByEtape(EtapeTraitement.SUIVI_RQ)
        })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
            next: (res: any) => {
                this.validationRqData = res.validation.body || [];
                this.clotureData = res.cloture.body || [];
                this.loading = false;
            },
            error: () => this.loading = false
        });
    }
  }

  handleFilter(event: any) {
    console.log(event);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
