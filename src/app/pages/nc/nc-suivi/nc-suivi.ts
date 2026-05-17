import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { NcFilterBarComponent } from '../nc-filter-bar/nc-filter-bar';

@Component({
  selector: 'app-nc-suivi',
  standalone: true,
  imports: [CommonModule, NgPrimeModule, NcFilterBarComponent],
  templateUrl: './nc-suivi.html',
  styleUrl: './nc-suivi.scss'
})
export class NCSuiviComponent {
    handleFilter(event: any) {
    console.log(event);
    }
}
