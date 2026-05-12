import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { ProcNonConformiteService } from '../../proc-non-conformite/proc-non-conformite.service';

@Component({
  selector: 'app-vue-ensemble',
  standalone: true,
  imports: [CommonModule, NgPrimeModule],
  templateUrl: './vue-ensemble.html',
  styleUrl: './vue-ensemble.scss'
})
export class NcVueEnsembleComponent implements OnInit {

constructor(private procService: ProcNonConformiteService) {} // Injectez le service
  ngOnInit(): void {
    this.loadDashboardData();
  }
  loadDashboardData() {
    this.procService.getDashboardRQ().subscribe({
      next: (response) => {
        console.log('Données du Dashboard RQ:', response.body);
      },
      error: (error) => {
        console.error('Erreur lors de la récupération du dashboard:', error);
      }
    });
  }
}