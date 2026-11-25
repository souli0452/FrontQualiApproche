import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MessageService } from 'primeng/api';
import { AlertService, StatusEnum, showToast } from '@shared/alert-message/alert-message.service';
import { QualiToastComponent } from './quali-toast.component';

describe('QualiToastComponent & système unifié AlertService / MessageService', () => {
    let fixture: ComponentFixture<QualiToastComponent>;
    let messageService: MessageService;
    let alertService: AlertService;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [QualiToastComponent],
            providers: [MessageService, AlertService, provideNoopAnimations()]
        }).compileComponents();

        fixture = TestBed.createComponent(QualiToastComponent);
        messageService = TestBed.inject(MessageService);
        alertService = TestBed.inject(AlertService);
        fixture.detectChanges();
    });

    it('affiche la capsule Verre Pur en bas à droite lors d’un appel MessageService standard', () => {
        messageService.add({
            severity: 'warn',
            summary: 'Avertissement',
            detail: 'Impossible de charger la structure. Vérifiez votre configuration.',
            life: 6000
        });
        fixture.detectChanges();

        const host = fixture.nativeElement.querySelector('.qs-glass-toast-host.p-toast-bottom-right');
        const card = fixture.nativeElement.querySelector('.qs-glass-toast-card--warn');
        const summary = fixture.nativeElement.querySelector('.qs-glass-toast-summary');
        const detail = fixture.nativeElement.querySelector('.qs-glass-toast-detail');

        expect(host).not.toBeNull();
        expect(card).not.toBeNull();
        expect(summary.textContent.trim()).toBe('Avertissement');
        expect(detail.textContent.trim()).toBe('Impossible de charger la structure. Vérifiez votre configuration.');
    });

    it('affiche correctement les notifications émises via AlertService et showToast', () => {
        alertService.showSuccess('Rapport enregistré.');
        showToast(StatusEnum.error, 500, 'Erreur serveur', messageService);
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('.qs-glass-toast-card--success')).not.toBeNull();
        expect(fixture.nativeElement.querySelector('.qs-glass-toast-card--error')).not.toBeNull();
    });

    it('ferme proprement la capsule au clic sur le bouton de fermeture', async () => {
        alertService.showInfo('Synchronisation terminée.');
        fixture.detectChanges();

        const closeBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.qs-glass-toast-close');
        expect(closeBtn).not.toBeNull();

        closeBtn.click();
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('.qs-glass-toast-card')).toBeNull();
    });

    it('masque la barre de progression lorsque sticky = true', () => {
        messageService.add({
            severity: 'error',
            summary: 'Blocage critique',
            detail: 'Action suspendue.',
            sticky: true
        });
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('.qs-glass-toast-card--error')).not.toBeNull();
        expect(fixture.nativeElement.querySelector('.qs-glass-toast-progress')).toBeNull();
    });
});
