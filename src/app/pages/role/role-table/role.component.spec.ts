import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';

import { RoleComponent } from './role.component';

/**
 * Écran des rôles.
 *
 * <p>Il lit les rôles et le dictionnaire des permissions au démarrage : le test fournit un client
 * HTTP simulé et absorbe ces appels, faute de quoi l'injection échoue et l'échec ne dit rien du
 * composant.</p>
 */
describe('RoleComponent', () => {
    let component: RoleComponent;
    let fixture: ComponentFixture<RoleComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [RoleComponent],
            providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
                MessageService, ConfirmationService]
        }).compileComponents();

        fixture = TestBed.createComponent(RoleComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('se crée', () => {
        expect(component).toBeTruthy();
    });

    it('part d\'un formulaire vide dont le nom est obligatoire', () => {
        // Un rôle sans nom n'est désignable par rien : le serveur le refuse, l'écran doit le dire
        // avant l'aller-retour.
        expect(component.roleForm.get('name')?.valid).toBeFalse();
        expect(component.roleForm.valid).toBeFalse();
    });
});
