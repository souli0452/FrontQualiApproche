import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { NcFilterBarComponent } from '../nc-filter-bar/nc-filter-bar';

@Component({
  selector: 'app-nc-analyse-validation',
  standalone: true,
  imports: [CommonModule, NgPrimeModule, NcFilterBarComponent],
  templateUrl: './nc-analyse-validation.html',
  styleUrl: './nc-analyse-validation.scss'
})
export class NCAnalyseValidationComponent {
    handleFilter(event: any) {
    console.log(event);
    }
}
