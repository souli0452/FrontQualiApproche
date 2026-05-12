import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../prime-ng.module';
import { ButtonGroup } from 'primeng/buttongroup';

@Component({
  selector: 'app-non-conformite-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, NgPrimeModule, ButtonGroup],
  templateUrl: './non-conformite.html',
  styleUrl: './non-conformite.scss'
})
export class NonConformiteLayoutComponent {
    // visibilityNonConformiyForm: boolean = false;

    // showDialogNonConformity() {
    //     this.visibilityNonConformiyForm = true;
    // }
}

