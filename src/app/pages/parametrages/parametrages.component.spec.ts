import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ParametragesComponent } from './parametrages.component';

/**
 * Barre d'onglets des configurations.
 *
 * <p>Elle s'abonne au routeur pour souligner l'onglet courant : le test fournit donc un routeur, sans
 * quoi l'injection d'{@code ActivatedRoute} échoue avant même que le composant existe.</p>
 */
describe('ParametragesComponent', () => {
    let component: ParametragesComponent;
    let fixture: ComponentFixture<ParametragesComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ParametragesComponent],
            providers: [provideRouter([])]
        }).compileComponents();

        fixture = TestBed.createComponent(ParametragesComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('se crée', () => {
        expect(component).toBeTruthy();
    });

    it('propose les quatre écrans de configuration, réglages de l\'organisation compris', () => {
        // Les circuits, le catalogue d'étapes et les modèles d'e-mail n'ont pas d'autre chemin depuis
        // le menu : une entrée perdue ici rend l'écran inatteignable.
        expect(component.items?.map((item) => item.routerLink)).toEqual([
            '/configurations/config-systeme',
            '/configurations/circuits',
            '/configurations/etapes-circuit',
            '/configurations/modeles-email'
        ]);
    });
});
