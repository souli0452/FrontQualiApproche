import { HTTP_INTERCEPTORS, provideHttpClient, withFetch, withInterceptorsFromDi } from '@angular/common/http';
import { ApplicationConfig } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withEnabledBlockingInitialNavigation, withInMemoryScrolling } from '@angular/router';
import Aura from '@primeng/themes/aura';
import { definePreset } from '@primeng/themes';
import { providePrimeNG } from 'primeng/config';
import { appRoutes } from './app.routes';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AuthInterceptor } from './app/services/auth-interceptor/auth.interceptor';
import { DatePipe, LocationStrategy, PathLocationStrategy } from '@angular/common';
import { DialogService } from 'primeng/dynamicdialog';
import { ToastModule } from 'primeng/toast';
import { UntypedFormBuilder } from '@angular/forms';
import { LoaderInterceptor } from './app/interceptors/loader.interceptor';
// Définition de votre thème bleu QualiSira
const MyPreset = definePreset(Aura, {
    semantic: {
        primary: {
            50: '#ebf1f7',
            100: '#d7e3f0',
            200: '#afc7e1',
            300: '#87abcf',
            400: '#5f8fbe',
            500: '#1e3a5f',
            600: '#1a3353',
            700: '#162a45',
            800: '#122238',
            900: '#0e1a2a'
        }
    }
});
export const appConfig: ApplicationConfig = {
    providers: [
        ConfirmationService,
        MessageService,
        provideRouter(appRoutes, withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }), withEnabledBlockingInitialNavigation()),
        provideHttpClient(withInterceptorsFromDi()),
        provideAnimationsAsync(),
        {
            provide: HTTP_INTERCEPTORS,
            useClass: LoaderInterceptor,
            multi: true
        },
        { provide: UntypedFormBuilder, useClass: UntypedFormBuilder },
        { provide: LocationStrategy, useClass: PathLocationStrategy },
        ConfirmationService, MessageService, DialogService, ToastModule,
        { provide: DatePipe },
        providePrimeNG({ 
            theme: { preset: MyPreset, options: { darkModeSelector: '.app-dark' } },
            translation: {
                firstDayOfWeek: 1,
                dayNames: ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"],
                dayNamesShort: ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"],
                dayNamesMin: ["Di", "Lu", "Ma", "Me", "Je", "Ve", "Sa"],
                monthNames: ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"],
                monthNamesShort: ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"],
                today: "Aujourd'hui",
                clear: "Effacer",
                dateFormat: "dd/mm/yy",
                weekHeader: "Sem"
            }
        }),
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
    ]
};