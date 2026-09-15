import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';

import { ModuleAbonnement } from '../../core/enums/module-abonnement.enum';
import { currentUserState } from '../../core/auth/auth.state';
import { AiAssistButtonComponent } from './ai-assist-button.component';

/**
 * Bouton « Assister avec l'IA ».
 *
 * <p>Une exigence, et elle tient au clic : le bouton ne paraît que là où il peut aboutir. Le
 * serveur refuse déjà — 403 sans la permission, 402 sans le module — mais un refus découvert
 * après coup donne à un droit manquant l'allure d'un bogue, et à une option non souscrite celle
 * d'une panne plutôt que d'une offre.</p>
 */
describe('AiAssistButtonComponent', () => {
    let fixture: ComponentFixture<AiAssistButtonComponent>;

    function connecter(permissions: string[], modules: string[]): void {
        currentUserState.next({ permissions, modulesSubscribed: modules } as any);
    }

    /** Le composant ne rend rien du tout, ou bien son bouton : c'est ce que voit l'utilisateur. */
    function boutonAffiche(): boolean {
        fixture.detectChanges();
        return fixture.nativeElement.querySelector('button') !== null;
    }

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AiAssistButtonComponent],
            providers: [provideHttpClient(), provideHttpClientTesting(), MessageService]
        }).compileComponents();

        fixture = TestBed.createComponent(AiAssistButtonComponent);
        fixture.componentRef.setInput('typeAssistance', 'DESCRIPTION_NON_CONFORMITE');
    });

    afterEach(() => currentUserState.next(null as any));

    it("s'affiche quand la permission est détenue et le module souscrit", () => {
        connecter(['assistant-ia-write'], [ModuleAbonnement.ASSISTANT_IA]);
        expect(boutonAffiche()).toBeTrue();
    });

    it('reste absent sans la permission, même module souscrit', () => {
        connecter(['non-conformite-write'], [ModuleAbonnement.ASSISTANT_IA]);
        expect(boutonAffiche()).toBeFalse();
    });

    it('reste absent sans le module, même permission détenue', () => {
        connecter(['assistant-ia-write'], [ModuleAbonnement.NON_CONFORMITE]);
        expect(boutonAffiche()).toBeFalse();
    });

    it('reste absent quand ni l\'une ni l\'autre', () => {
        connecter([], []);
        expect(boutonAffiche()).toBeFalse();
    });

    /**
     * La lecture seule ne suffit pas : {@code assistant-ia-read} ouvre l'historique, pas la
     * sollicitation. Un bouton offert à son porteur ne rendrait qu'un 403.
     */
    it("reste absent avec la seule permission de lecture", () => {
        connecter(['assistant-ia-read'], [ModuleAbonnement.ASSISTANT_IA]);
        expect(boutonAffiche()).toBeFalse();
    });
});
