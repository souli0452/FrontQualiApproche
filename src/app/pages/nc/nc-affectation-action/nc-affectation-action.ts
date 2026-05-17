import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { NcFilterBarComponent } from '../nc-filter-bar/nc-filter-bar';

@Component({
  selector: 'app-nc-affectation-action',
  standalone: true,
  imports: [CommonModule, NgPrimeModule, NcFilterBarComponent],
  templateUrl: './nc-affectation-action.html',
  styleUrl: './nc-affectation-action.scss'
})
export class NCAffectationActionComponent {
    handleFilter(event: any) {
    console.log(event);
    }
}