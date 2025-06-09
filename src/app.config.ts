import { HTTP_INTERCEPTORS, provideHttpClient, withFetch, withInterceptorsFromDi } from '@angular/common/http';
import { ApplicationConfig } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withEnabledBlockingInitialNavigation, withInMemoryScrolling } from '@angular/router';
import Aura from '@primeng/themes/aura';
import { providePrimeNG } from 'primeng/config';
import { appRoutes } from './app.routes';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AuthInterceptor } from './app/services/auth-interceptor/auth.interceptor';
import { DatePipe, LocationStrategy, PathLocationStrategy } from '@angular/common';
import { DialogService } from 'primeng/dynamicdialog';
import { ToastModule } from 'primeng/toast';
import { UntypedFormBuilder } from '@angular/forms';
import { LoaderInterceptor } from './app/interceptors/loader.interceptor';

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
        {provide: UntypedFormBuilder, useClass: UntypedFormBuilder},
        {provide: LocationStrategy, useClass: PathLocationStrategy},
        ConfirmationService, MessageService, DialogService,ToastModule,
        {provide: DatePipe},
        providePrimeNG({ theme: { preset: Aura, options: { darkModeSelector: '.app-dark' } } }),
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
    ]
};
