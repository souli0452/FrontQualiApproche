import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgPrimeModule } from '../../../prime-ng.module';
import { LicenceOuverteDirective } from '../licence/licence-ouverte.directive';

@Component({
  selector: 'app-header-page',
  standalone: true,
  imports: [CommonModule, RouterModule, NgPrimeModule, LicenceOuverteDirective],
  templateUrl: './header-page.html',
  styles: ``
})
export class HeaderPage {
  @Input() title: string = '';
  @Input() licenceOuverte: boolean = true;
  @Input() subtitle: string = '';
  @Input() breadcrumbs: { label: string, routerLink?: string }[] = [];
  @Input() buttonText?: string;
  @Input() buttonIcon: string = 'pi pi-plus';
  @Input() buttonLink?: string;
  /** Activer la vérification de licence sur le bouton d'action (ex: Nouveau Rôle) */
  @Input() withLicence: boolean = false;

  @Output() actionClick = new EventEmitter<void>();

  onActionButtonClick() {
    this.actionClick.emit();
  }
}
