import { Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { Router, RouterModule, NavigationEnd, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LayoutService } from '../service/layout.service';
import { MenuItem, MessageService } from 'primeng/api';
import { Title } from '@angular/platform-browser';
import { filter, takeUntil } from 'rxjs/operators';
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder} from '@angular/forms';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { Subject } from 'rxjs';
import { NonConformiteService } from '@features/non-conformite/services/non-conformite.service';
import { AuditGestionService } from '@features/gestion-audit/services/audit.service';
import { DocumentaireATraiterService } from '@features/gestion-documentaire/services/documentaire-a-traiter.service';
import { AuthData } from '../../../models/auth.model';
import { accesAutorise, hasAnyPermission } from '@core/auth/auth-utils';
import { LicenceService } from '@core/licence/services/licence.service';
import { AuthService } from '@core/auth/auth.service';
import { currentUserState } from '@core/auth/auth.state';
import { ModuleAbonnement } from '@core/enums/module-abonnement.enum';
import { QualiAiChatComponent } from '@shared/ia/quali-ai-chat.component';
import { AideFaqComponent } from '@features/faq/aide-faq.component';
import { GlobalSearchService } from '@shared/recherche-globale/global-search.service';

@Component({
    selector: 'app-topbar',
    standalone: true,
    imports: [RouterModule, NgPrimeModule, CommonModule, FormsModule, ReactiveFormsModule, QualiAiChatComponent, AideFaqComponent],
    template: ` 
    <div class="pre-layout-topbar">
        <div class="layout-topbar" [ngClass]="{'topbar-scrolled': isScrolled}">
            <div class="layout-topbar-logo-container cacher">
                <button class="layout-menu-button p-button-secondary  layout-topbar-action" (click)="layoutService.onMenuToggle()">
                    <i class="pi pi-bars"></i>
                </button>
                <div class="layout-topbar-title text-surface-900 dark:text-surface-0">
                    {{ pageTitle }}
                </div>
            </div>
            <div class="layout-topbar-search md:flex items-center flex-1 justify-center max-w-[350px] ml-12">
                <p-iconField iconPosition="left" class="w-full">
                    <p-inputIcon styleClass="pi pi-search"></p-inputIcon>
                    <input type="text" 
                        pInputText 
                        placeholder="Que recherchez-vous ?" 
                        [(ngModel)]="searchQuery" 
                        (input)="onSearchInput()"
                        (keyup.enter)="onSearch()"
                        class="w-full py-2 border-surface-border dark:border-surface-700 bg-surface-100 dark:bg-surface-800 focus:ring-1 focus:ring-primary-500 rounded-xl" />
                </p-iconField>
            </div>

            <div class="layout-topbar-actions">

                <!-- Essai gratuit en cours : dit en permanence sous quel régime l'installation
                     tourne. Sans ce repère, on découvre l'essai le jour où il s'arrête, et
                     l'arrêt passe pour une panne. -->
                @if (essai(); as jours) {
                    <span class="flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 text-orange-900 text-xs font-semibold whitespace-nowrap"
                          pTooltip="Essai gratuit de QualiSira. À son terme, les données restent consultables et les actions sont suspendues, jusqu'à l'installation d'une licence."
                          tooltipPosition="bottom">
                        <i class="pi pi-clock"></i>
                        Essai gratuit — {{ jours.restants }} j
                    </span>
                }

                <!-- L'aide : offerte à tous, sans permission ni module. C'est le socle — une
                     organisation sans assistant IA, ou dont le forfait est épuisé, doit pouvoir
                     lire les réponses qu'elle a elle-même écrites. -->
                <button type="button" pTooltip="Aide — foire aux questions" tooltipPosition="bottom" (click)="aideVisible = true" class="px-3 py-2 p-button-secondary rounded-full transition-colors hover:bg-surface-100 dark:hover:bg-surface-800">
                    <i class="pi pi-question-circle" style="font-size: 1.2rem"></i>
                </button>

                <!-- Assistant IA : caché à qui ne peut pas s'en servir — permission et module. -->
                <button *ngIf="assistantIaDisponible"
                        type="button"
                        pTooltip="Assistant qualité IA"
                        tooltipPosition="bottom"
                        (click)="assistantIaVisible = true; notificationVisible = false"
                        class="qa-ai-trigger relative w-10 h-10 flex items-center justify-center rounded-full cursor-pointer transition-all duration-200"
                        [class.is-open]="assistantIaVisible">
                    <i class="pi pi-sparkles !text-[1.1rem]"></i>
                </button>

                <!-- Bouton de Notifications -->
                <button type="button"
                        pTooltip="Notifications"
                        tooltipPosition="bottom"
                        (click)="toggleNotifications($event)"
                        class="relative w-10 h-10 flex items-center justify-center p-button-secondary rounded-full transition-colors hover:bg-surface-100 dark:hover:bg-surface-800 cursor-pointer"
                        [ngClass]="{
                            'bg-[#0084ca]/12 text-[#0084ca] dark:text-sky-400': notificationVisible,
                            'mr-3': notificationCount >= 100,
                            'mr-1': notificationCount > 0 && notificationCount < 100
                        }">
                    <i class="pi pi-bell !text-[1.15rem]"></i>

                    <!-- Badge pilule auto-extensible : ancré en haut à droite pour s'étendre vers l'extérieur sans couvrir la cloche -->
                    <span *ngIf="notificationCount > 0"
                          class="absolute -top-1 left-[22px] inline-flex items-center justify-center pointer-events-none">
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-70"></span>
                        <span class="relative inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-red-500 font-bold text-white text-[10px] leading-none whitespace-nowrap border-2 border-white dark:border-surface-900 shadow-sm tabular-nums">
                            {{ notificationCount > 999 ? '999+' : notificationCount }}
                        </span>
                    </span>
                </button>

                <!-- Bouton pour changer de thème (Dark/Light) -->
                <button type="button" size="small" class="px-3 py-1 rounded-full" (click)="toggleDarkMode()">
                    <i class="pi transition-transform duration-200" style="font-size: 1.2rem"
                    [ngClass]="{ 'pi-moon': !layoutService.isDarkTheme(), 'pi-sun': layoutService.isDarkTheme() }"></i>
                </button>

                <button type="button" class="layout-topbar-action flex items-center gap-2 p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors" (click)="menu.toggle($event)">
                    <p-overlayBadge severity="success" styleClass="status-badge">
                        <p-avatar *ngIf="user" 
                                [style]="{ 'background-color': 'var(--secondary-color)', 'color': '#ffffff', 'width': '30px', 'height': '30px', 'font-weight': 'bold' }"
                                shape="circle">{{ user.firstName.charAt(0).toLocaleUpperCase() }}
                        </p-avatar>
                    </p-overlayBadge>
                    <i class="icon-fleche pi transition-transform duration-200" 
                    [ngClass]="{ 'pi-chevron-down': !menuOpen, 'pi-chevron-up': menuOpen }"></i>
                </button>
            </div>
        </div>

        <p-menu #menu [popup]="true" [model]="items" (onHide)="menuOpen = false" (onShow)="menuOpen = true" styleClass="user-menu" appendTo="body">
            <ng-template pTemplate="item" let-item>
                <ng-container [ngSwitch]="item.id">
                    <!-- Bloc Profil Riche -->
                    <div *ngSwitchCase="'profile-header'" class="flex items-center gap-3 p-1 border-b border-surface-100 dark:border-surface-800">
                        <p-overlayBadge severity="success" styleClass="status-badge-small">
                            <p-avatar *ngIf="user" 
                                    [style]="{ 'background-color': 'var(--secondary-color)', 'color': '#ffffff', 'width': '30px', 'height': '30px', 'font-weight': 'bold' }"
                                    shape="circle">{{ user?.firstName.charAt(0).toLocaleUpperCase() }}
                            </p-avatar>
                        </p-overlayBadge>
                        <div class="flex flex-col flex-1">
                            <span class="font-medium text-sm text-surface-900 dark:text-surface-0 leading-tight">{{ user?.firstName }} {{ user?.lastName }}</span>
                            <span class="text-xs text-slate-500 font-normal">En ligne</span>
                        </div>
                        <p-button severity="info" [rounded]="true" size="small" (click)="goToProfile()">Profil</p-button>
                    </div>

                    <!-- Item Réglages -->
                    <a *ngSwitchCase="'settings'" (click)="item.command()" class="flex text-[14px] mt-2 items-center p-2 gap-2 text-surface-900 dark:text-surface-0 hover:bg-surface-100 dark:hover:bg-surface-900 transition-colors cursor-pointer rounded-md mx-2">
                        <i [class]="item.icon + ' text-slate-500'"></i>
                        <span class="font-normal">{{ item.label }}</span>
                    </a>

                    <!-- Item de déconnexion standard -->
                    <a *ngSwitchCase="'logout'" (click)="item.command()" class="flex text-[14px] mt-1 items-center p-2 gap-2 text-surface-900 dark:text-surface-0 hover:bg-surface-100 dark:hover:bg-surface-900 transition-colors cursor-pointer rounded-md mx-2 mb-2">
                        <i [class]="item.icon"></i>
                        <span class="font-normal">{{ item.label }}</span>
                    </a>
                </ng-container>
            </ng-template>
        </p-menu>
        <!-- Panneau de notifications fixe avec effet glassmorphism (reste fixe au scroll jusqu'à fermeture) -->
        <div *ngIf="notificationVisible"
             class="notif-glass-panel"
             (click)="$event.stopPropagation()">
            <!-- En-tête fixe compact -->
            <div class="notif-glass-bar px-4 py-3 border-b border-white/35 dark:border-white/10 flex items-center justify-between gap-2 shrink-0">
                <div class="flex items-center gap-2.5 min-w-0">
                    <div class="w-8 h-8 rounded-[8px] bg-[#0084ca]/15 text-[#0084ca] dark:text-sky-400 flex items-center justify-center shrink-0">
                        <i class="pi pi-bell !text-sm"></i>
                    </div>
                    <div class="min-w-0">
                        <div class="flex items-center gap-2">
                            <span class="text-sm font-bold text-surface-900 dark:text-surface-0">Notifications</span>
                            <span *ngIf="notificationCount > 0"
                                  class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#0084ca] text-white tabular-nums">
                                {{ notificationCount }}
                            </span>
                        </div>
                        <span class="block text-[11px] text-surface-600 dark:text-surface-300 truncate">
                            {{ notifications.length ? notifications.length + ' alerte(s) en attente' : 'Aucune action en attente' }}
                        </span>
                    </div>
                </div>

                <div class="flex items-center gap-1 shrink-0">
                    <button type="button"
                            pTooltip="Rafraîchir"
                            tooltipPosition="bottom"
                            (click)="rafraichirToutesNotifications()"
                            class="w-7 h-7 rounded-[6px] flex items-center justify-center bg-transparent border-0 text-surface-600 dark:text-surface-300 hover:bg-white/50 dark:hover:bg-white/10 transition-colors cursor-pointer">
                        <i class="pi pi-refresh !text-xs" [ngClass]="{ 'pi-spin': rafraichissementNotifs }"></i>
                    </button>
                    <button type="button"
                            pTooltip="Fermer"
                            tooltipPosition="bottom"
                            (click)="fermerNotifications()"
                            class="w-7 h-7 rounded-[6px] flex items-center justify-center bg-transparent border-0 text-surface-600 dark:text-surface-300 hover:bg-white/50 dark:hover:bg-white/10 transition-colors cursor-pointer">
                        <i class="pi pi-times !text-xs"></i>
                    </button>
                </div>
            </div>

            <!-- Liste scrollable interne -->
            <div class="notif-scroll flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                <button *ngFor="let notif of notifications"
                        type="button"
                        (click)="ouvrirNotification(notif)"
                        class="notif-glass-card group w-full text-left rounded-[10px] p-3 flex items-start gap-3 cursor-pointer">
                    <div class="w-9 h-9 rounded-[8px] flex items-center justify-center shrink-0 mt-0.5" [ngClass]="notif.colorClass">
                        <i [class]="notif.icon + ' !text-[15px]'"></i>
                    </div>

                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between gap-2">
                            <span class="font-bold text-[13px] text-surface-900 dark:text-surface-0 truncate">{{ notif.title }}</span>
                            <span *ngIf="notif.count"
                                  class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 tabular-nums"
                                  [ngClass]="notif.urgent
                                      ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                                      : (notif.tone === 'sky'
                                          ? 'bg-[#0ea5e9]/15 text-[#0369a1] dark:text-sky-300'
                                          : 'bg-amber-500/15 text-amber-800 dark:text-amber-300')">
                                {{ notif.count }}
                            </span>
                        </div>
                        <p class="text-xs text-surface-600 dark:text-surface-300 m-0 mt-0.5 leading-snug">
                            {{ notif.detail }}
                        </p>
                        <div class="flex items-center justify-between gap-2 mt-2">
                            <div class="flex items-center gap-1.5">
                                <span *ngIf="notif.module"
                                      class="px-1.5 py-0.5 rounded-[4px] text-[10px] font-semibold bg-surface-900/5 dark:bg-white/10 text-surface-600 dark:text-surface-300">
                                    {{ notif.module }}
                                </span>
                                <span class="px-1.5 py-0.5 rounded-[4px] text-[10px] font-semibold"
                                      [ngClass]="notif.urgent
                                          ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                                          : 'bg-[#0ea5e9]/15 text-[#0369a1] dark:text-sky-300'">
                                    {{ notif.time }}
                                </span>
                            </div>
                            <span class="text-[11px] font-semibold text-[#0084ca] dark:text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-0.5">
                                <span>Ouvrir</span>
                                <i class="pi pi-arrow-up-right !text-[9px]"></i>
                            </span>
                        </div>
                    </div>
                </button>

                <!-- État vide soigné -->
                <div *ngIf="!notifications.length"
                     class="notif-glass-card rounded-[10px] py-8 px-4 flex flex-col items-center text-center gap-2">
                    <div class="w-10 h-10 rounded-[8px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <i class="pi pi-check-circle !text-xl"></i>
                    </div>
                    <span class="text-sm font-semibold text-surface-900 dark:text-surface-0">Tout est à jour</span>
                    <span class="text-xs text-surface-600 dark:text-surface-300">Rien n'attend votre intervention pour le moment.</span>
                </div>
            </div>

            <!-- Pied discret -->
            <div class="notif-glass-bar px-4 py-2 border-t border-white/35 dark:border-white/10 flex items-center justify-between text-[11px] text-surface-600 dark:text-surface-300 shrink-0">
                <span>Cliquez sur une alerte pour l'ouvrir</span>
                <button type="button"
                        (click)="fermerNotifications()"
                        class="font-semibold text-[#0084ca] dark:text-sky-400 hover:underline bg-transparent border-0 p-0 cursor-pointer">
                    Fermer
                </button>
            </div>
        </div>
        <!-- Tiroir de l'aide. Monté à l'ouverture seulement : les réponses se relisent auprès
             du serveur au ngOnInit, et les charger au démarrage de l'application le ferait pour
             rien — la plupart des sessions ne l'ouvrent jamais. -->
        <p-drawer [modal]="true" [(visible)]="aideVisible" position="right" [style]="{width: '480px'}" styleClass="quali-ai-drawer">
            <ng-template pTemplate="header">
                <div class="inline-flex items-center gap-2">
                    <i class="pi pi-question-circle text-primary"></i>
                    <span class="layout-topbar-title"><span>Aide</span></span>
                </div>
            </ng-template>
            <app-aide-faq *ngIf="aideVisible" class="block h-full"></app-aide-faq>
        </p-drawer>

        <!-- Drawer de l'assistant qualité IA -->
        <p-drawer [modal]="true" [(visible)]="assistantIaVisible" position="right" [style]="{ width: '490px', maxWidth: '100vw' }" styleClass="quali-ai-drawer quali-ai-assistant-drawer">
            <ng-template pTemplate="header">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="qa-drawer-emblem w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white shadow-sm">
                        <i class="pi pi-sparkles !text-base"></i>
                    </div>
                    <div class="min-w-0">
                        <div class="flex items-center gap-2">
                            <span class="text-[14px] font-bold text-surface-900 dark:text-surface-0 leading-tight truncate">Assistant qualité</span>
                            <span class="px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-sky-500/12 text-[#0084ca] dark:text-sky-300 border border-sky-500/20">
                                IA
                            </span>
                        </div>
                        <p class="text-[11px] text-surface-500 dark:text-surface-400 m-0 mt-0.5 truncate">
                            Aide QMS &amp; consultation de vos dossiers
                        </p>
                    </div>
                </div>
            </ng-template>
            <!-- Monté à l'ouverture seulement : le fil se relit auprès du serveur au ngOnInit,
                 et le charger au démarrage de l'application le ferait pour rien. -->
            <app-quali-ai-chat *ngIf="assistantIaVisible" class="block h-full"
                               (navigue)="assistantIaVisible = false"></app-quali-ai-chat>
        </p-drawer>


    </div>
    `,
    styles: [`
        /* Déclencheur Assistant IA dans la barre supérieure */
        .qa-ai-trigger {
            background: linear-gradient(135deg, rgba(0, 132, 202, 0.10) 0%, rgba(79, 70, 229, 0.10) 100%);
            border: 1px solid rgba(0, 132, 202, 0.25);
            color: #0369a1;
        }
        .qa-ai-trigger:hover {
            background: linear-gradient(135deg, rgba(0, 132, 202, 0.17) 0%, rgba(79, 70, 229, 0.17) 100%);
            border-color: rgba(0, 132, 202, 0.50);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px -2px rgba(0, 132, 202, 0.22);
        }
        .qa-ai-trigger.is-open {
            background: linear-gradient(135deg, #0084ca 0%, #2563eb 100%);
            border-color: transparent;
            color: #ffffff;
            box-shadow: 0 6px 16px -4px rgba(0, 132, 202, 0.45);
        }
        :host-context(.app-dark) .qa-ai-trigger,
        :host-context(.dark) .qa-ai-trigger {
            background: linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%);
            border-color: rgba(56, 189, 248, 0.30);
            color: #38bdf8;
        }
        :host-context(.app-dark) .qa-ai-trigger.is-open,
        :host-context(.dark) .qa-ai-trigger.is-open {
            color: #ffffff;
        }

        .qa-drawer-emblem {
            background: linear-gradient(135deg, #0084ca 0%, #2563eb 100%);
            box-shadow: 0 4px 12px -2px rgba(0, 132, 202, 0.40);
        }

        /* Le tiroir de l'assistant : sa zone de contenu porte la hauteur sur laquelle le fil
           s'appuie pour défiler. Sans elle, PrimeNG la laisse libre et le fil s'allonge
           indéfiniment — la zone de saisie finit sous le bord de l'écran. */
        ::ng-deep .quali-ai-drawer .p-drawer-content {
            height: 100%;
            min-height: 0;
            display: flex;
            flex-direction: column;
        }

        ::ng-deep .quali-ai-assistant-drawer {
            border-left: 1px solid #e2e8f0 !important;
            box-shadow: -14px 0 42px -12px rgba(15, 23, 42, 0.16) !important;
        }
        ::ng-deep .quali-ai-assistant-drawer .p-drawer-header {
            padding: 0.875rem 1.15rem !important;
            background: linear-gradient(135deg, #f8fbff 0%, #f0f7ff 58%, #f5f3ff 100%) !important;
            border-bottom: 1px solid #e2e8f0 !important;
        }
        ::ng-deep .quali-ai-assistant-drawer .p-drawer-content {
            padding: 0 !important;
        }
        :host-context(.app-dark) ::ng-deep .quali-ai-assistant-drawer,
        :host-context(.dark) ::ng-deep .quali-ai-assistant-drawer {
            border-left-color: #2a3954 !important;
            box-shadow: -16px 0 46px rgba(0, 0, 0, 0.50) !important;
        }
        :host-context(.app-dark) ::ng-deep .quali-ai-assistant-drawer .p-drawer-header,
        :host-context(.dark) ::ng-deep .quali-ai-assistant-drawer .p-drawer-header {
            background: linear-gradient(135deg, #132038 0%, #162441 60%, #1d1f42 100%) !important;
            border-bottom-color: #2a3954 !important;
        }
        @media (min-width: 540px) {
            ::ng-deep .quali-ai-assistant-drawer {
                border-top-left-radius: 16px !important;
                border-bottom-left-radius: 16px !important;
                overflow: hidden !important;
            }
        }

        ::ng-deep .custom-bottom-drawer {
            height: auto !important;
            max-width: 50rem !important;
            width: 100% !important;
            left: 0 !important;
            right: 0 !important;
            margin: 0 auto !important;
            border-radius: 10px 10px 0 0 !important;
            border: none !important;
            overflow: hidden !important;
        }

        /* Panneau de notifications fixe — effet glassmorphism (css.glass) */
        .notif-glass-panel {
            position: fixed;
            top: 4.5rem;
            right: 1.5rem;
            z-index: 1000;
            width: 400px;
            max-width: calc(100vw - 1.5rem);
            max-height: calc(100vh - 5.5rem);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 16px;
            box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
            border: 1px solid rgba(255, 255, 255, 0.3);
            animation: notifDropIn 0.16s ease-out;
        }

        .notif-glass-bar {
            background: rgba(255, 255, 255, 0.52);
        }

        .notif-glass-card {
            background: rgba(255, 255, 255, 0.82);
            border: 1px solid rgba(255, 255, 255, 0.78);
            box-shadow: 0 2px 10px rgba(15, 23, 42, 0.05);
            transition: background-color 0.18s ease, border-color 0.18s ease;
        }

        .notif-glass-card:hover {
            background: rgba(255, 255, 255, 0.96);
            border-color: rgba(0, 132, 202, 0.45);
        }

        :host-context(.app-dark) .notif-glass-panel,
        :host-context(.dark) .notif-glass-panel {
            background: rgba(15, 23, 42, 0.42);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.14);
        }

        :host-context(.app-dark) .notif-glass-bar,
        :host-context(.dark) .notif-glass-bar {
            background: rgba(15, 23, 42, 0.58);
        }

        :host-context(.app-dark) .notif-glass-card,
        :host-context(.dark) .notif-glass-card {
            background: rgba(30, 41, 59, 0.78);
            border: 1px solid rgba(148, 163, 184, 0.18);
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
        }

        :host-context(.app-dark) .notif-glass-card:hover,
        :host-context(.dark) .notif-glass-card:hover {
            background: rgba(30, 41, 59, 0.94);
            border-color: rgba(14, 165, 233, 0.55);
        }

        .notif-scroll::-webkit-scrollbar {
            width: 5px;
        }
        .notif-scroll::-webkit-scrollbar-track {
            background: transparent;
        }
        .notif-scroll::-webkit-scrollbar-thumb {
            background: rgba(100, 116, 139, 0.35);
            border-radius: 9999px;
        }

        @keyframes notifDropIn {
            from { opacity: 0; transform: translateY(-6px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @media screen and (max-width: 600px) {
            .notif-glass-panel {
                right: 0.75rem;
                left: 0.75rem;
                width: auto;
                max-width: none;
            }
            ::ng-deep .custom-bottom-drawer {
                max-width: 100% !important;
                border-radius: 0 !important;
            }
        }
        :host ::ng-deep .status-badge .p-badge {
            width: 12px;
            height: 12px;
            min-width: 12px;
            top: auto;
            bottom: -2px;
            right: -2px;
            border: 2px solid white;
        }

        :host ::ng-deep .status-badge-small .p-badge {
            width: 10px;
            height: 10px;
            min-width: 10px;
            top: auto;
            bottom: 0px;
            right: 0px;
            border: 2px solid white;
        }

        :host ::ng-deep .user-menu.p-menu {
            min-width: 250px;
            padding: 5px;
            border: 1px solid rgba(0,0,0,0.2);
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
    `]
})
export class AppTopbar implements OnInit, OnDestroy {
    items!: MenuItem[];
    user: any;
    menuOpen: boolean = false;
    pageTitle: string = '';
    searchQuery: string = '';
    rafraichissementNotifs = false;

    hasAnyPermission = hasAnyPermission;
    destroy$: Subject<boolean> = new Subject<boolean>();

    private readonly licence = inject(LicenceService);
    isScrolled = false;

    @HostListener('window:scroll', [])
    onWindowScroll() {
        this.isScrolled = window.scrollY > 10;
    }

    @HostListener('document:click')
    onDocumentClick() {
        if (this.notificationVisible) {
            this.notificationVisible = false;
        }
    }

    @HostListener('document:keydown.escape')
    onEscape() {
        if (this.notificationVisible) {
            this.notificationVisible = false;
        }
    }

    /**
     * Jours restants d'essai, ou `null` hors essai en cours.
     *
     * <p>L'état vient de {@link LicenceService}, alimenté par la fenêtre d'activation montée dans
     * le layout : la barre n'émet donc pas d'appel supplémentaire pour l'afficher.</p>
     */
    essai(): { restants: number } | null {
        const etat = this.licence.etat;
        if (!etat || etat.type !== 'ESSAI' || !etat.actionsOuvertes) return null;
        return { restants: Math.max(0, etat.joursRestants) };
    }

    toggleNotifications(event: Event): void {
        event.stopPropagation();
        this.notificationVisible = !this.notificationVisible;
    }

    fermerNotifications(): void {
        this.notificationVisible = false;
    }

    rafraichirToutesNotifications(): void {
        this.rafraichissementNotifs = true;
        this.nonConformiteService.rafraichirNotifications();
        this.chargerNotificationsCloche();
        if (hasAnyPermission(['audit-read', 'audit-write', 'audit-conduct', 'audit-validate'])) {
            this.auditService.rafraichirNotifications();
            this.chargerNotificationsAudit();
        }
        if (hasAnyPermission(['document-read', 'document-write', 'DOC_READ'])) {
            this.aTraiterDocumentaire.rafraichir().pipe(takeUntil(this.destroy$)).subscribe();
        }
        setTimeout(() => (this.rafraichissementNotifs = false), 500);
    }

    /**
     * Le tiroir de l'aide est-il ouvert ?
     *
     * <p>Remplace un `helpVisible` déclaré de longue date et branché nulle part : quelqu'un avait
     * prévu un point d'aide sans jamais le relier.</p>
     */
    aideVisible: boolean = false;

    /** Le tiroir de l'assistant est-il ouvert ? */
    assistantIaVisible: boolean = false;

    /**
     * L'assistant est-il offert à cette personne, sur cette installation ?
     *
     * <p>Même règle que partout — permission détenue et module souscrit — et la même fonction que
     * le menu et le garde de routes. Un bouton qui ne rendrait qu'un refus après le clic ferait
     * passer un droit manquant pour un bogue, et une option non souscrite pour une panne.</p>
     */
    assistantIaDisponible: boolean = false;
    notificationVisible: boolean = false;

    /**
     * Notifications, par source.
     *
     * <p>Elles étaient tenues dans une seule liste, remise à vide à chaque émission des
     * non-conformités : toute autre source y aurait été effacée au premier rafraîchissement. Chaque
     * source garde donc la sienne, et la cloche les présente ensemble.</p>
     */
    notificationsNC: any[] = [];
    notificationsDocumentaire: any[] = [];
    notificationsAudit: any[] = [];

    /** Ce que la cloche déroule : toutes les sources, le documentaire d'abord. */
    get notifications(): any[] {
        return [...this.notificationsDocumentaire, ...this.notificationsNC, ...this.notificationsAudit];
    }

    /** Nombre de dossiers en attente, et non de lignes de notification : c'est ce que le badge disait. */
    private totalNC = 0;
    private totalDocumentaire = 0;
    private totalAudit = 0;

    get notificationCount(): number {
        return this.totalNC + this.totalDocumentaire + this.totalAudit;
    }

    constructor(
        public layoutService: LayoutService,
        private authService: AuthService,
        private router: Router,
        private titleService: Title,
        private activatedRoute: ActivatedRoute,
        private globalSearchService: GlobalSearchService,
        protected fb: UntypedFormBuilder,
        protected messageService: MessageService,
        private nonConformiteService: NonConformiteService,
        private aTraiterDocumentaire: DocumentaireATraiterService,
        private auditService: AuditGestionService,
    ) {
    }


    ngOnInit() {
        this.assistantIaDisponible = accesAutorise(['assistant-ia-write'], ModuleAbonnement.ASSISTANT_IA);
        this.user = currentUserState.value as AuthData
        this.updateTitle();

        // Écouter les changements de route pour mettre à jour le titre et fermer les notifications
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd),
            takeUntil(this.destroy$)
        ).subscribe(() => {
            this.notificationVisible = false;
            this.updateTitle();
        });

        this.items = [
            { id: 'profile-header' },
            { id: 'settings', label: 'Réglages', icon: 'pi pi-cog', command: () => this.goToSettings() },
            { id: 'logout', label: 'Se déconnecter', icon: 'pi pi-sign-out', command: () => this.authService.logout() }
        ];


        this.ecouterLeDocumentaire();
        
                // 1. Initialiser les compteurs des badges du menu
        this.nonConformiteService.rafraichirNotifications();
        // 2. Charger les vraies notifications de la cloche
        this.chargerNotificationsCloche();
        // 3. Le module Audit : compteurs du menu et lignes de la cloche, pour qui y a accès
        if (hasAnyPermission(['audit-read', 'audit-write', 'audit-conduct', 'audit-validate'])) {
            this.auditService.rafraichirNotifications();
            this.chargerNotificationsAudit();
        }
    }


    chargerNotificationsCloche(): void {
        this.nonConformiteService.getNotificationsCloche()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (notifs) => {
                    let totalCount = 0;
                    this.notificationsNC = notifs.map(n => {
                        totalCount += (n.nombre || 1);
                        return this.mapperNotification(n);
                    });
                    this.totalNC = totalCount;
                },
                error: (err) => {
                    console.error('❌ [CLOCHE] Erreur lors de la récupération des notifications :', err);
                    this.notificationsNC = [];
                    this.totalNC = 0;
                }
            });
    }


    /**
     * Associe à chaque code de notification backend une icône, une couleur et sa route de redirection.
     */
    /** Les lignes du module Audit, à côté de celles des non-conformités et du documentaire. */
    chargerNotificationsAudit(): void {
        this.auditService.getNotificationsCloche()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (notifs) => {
                    this.totalAudit = notifs.reduce((t, n) => t + (n.nombre || 1), 0);
                    this.notificationsAudit = notifs.map(n => this.mapperNotification(n));
                },
                error: () => {
                    this.notificationsAudit = [];
                    this.totalAudit = 0;
                }
            });
    }

    private mapperNotification(n: any) {
        let icon = 'pi pi-bell';
        let colorClass = 'bg-blue-100 text-blue-600';
        let route = '/non-conformite/traitement';

        switch (n.code) {
            case 'NC_A_DECIDER':
                icon = 'pi pi-exclamation-circle';
                colorClass = 'bg-orange-100 text-orange-600';
                route = '/non-conformite/traitement';
                break;

            case 'PLAN_ACTION_A_DECIDER':
                icon = 'pi pi-list-check';
                colorClass = 'bg-orange-100 text-orange-600';
                route = '/non-conformite/plan-action';
                break;

            case 'PLAN_ACTION_ECHEANCE_DEPASSEE':
                icon = 'pi pi-exclamation-triangle';
                colorClass = 'bg-red-100 text-red-600';
                route = '/non-conformite/plan-action';
                break;

            case 'PLAN_ACTION_ECHEANCE_PROCHE':
                icon = 'pi pi-clock';
                colorClass = 'bg-amber-100 text-amber-600';
                route = '/non-conformite/plan-action';
                break;

            case 'NC_BROUILLON':
                icon = 'pi pi-pencil';
                colorClass = 'bg-blue-100 text-blue-600';
                route = '/non-conformite/vue-ensemble';
                break;

            case 'AUDIT_EN_RETARD':
                icon = 'pi pi-exclamation-triangle';
                colorClass = 'bg-red-100 text-red-600';
                route = '/gestion-audit/programme';
                break;
            case 'AUDIT_A_VALIDER':
                icon = 'pi pi-check-circle';
                colorClass = 'bg-orange-100 text-orange-600';
                route = '/gestion-audit/programme';
                break;
            case 'AUDIT_DEMARRE_BIENTOT':
                icon = 'pi pi-clock';
                colorClass = 'bg-amber-100 text-amber-600';
                route = '/gestion-audit/programme';
                break;
            case 'CONSTATS_A_SAISIR':
            case 'CONSTATS_BROUILLON':
                icon = 'pi pi-pencil';
                colorClass = 'bg-blue-100 text-blue-600';
                route = '/gestion-audit/constatations';
                break;
            case 'CONSTATS_A_VALIDER':
                icon = 'pi pi-users';
                colorClass = 'bg-orange-100 text-orange-600';
                route = '/gestion-audit/constatations';
                break;
            case 'SIGNATURE_ATTENDUE':
                icon = 'pi pi-pen-to-square';
                colorClass = 'bg-red-100 text-red-600';
                route = '/gestion-audit/programme';
                break;
            case 'ECARTS_A_TRANSMETTRE':
                icon = 'pi pi-send';
                colorClass = 'bg-amber-100 text-amber-600';
                route = '/gestion-audit/suivi';
                break;
            case 'CHECKLIST_BROUILLON':
                icon = 'pi pi-list-check';
                colorClass = 'bg-blue-100 text-blue-600';
                route = '/gestion-audit/checklists';
                break;
            case 'DOCUMENT_A_TRAITER':
            case 'DEMANDE_DOCUMENT_A_INSTRUIRE':
                icon = 'pi pi-file';
                colorClass = 'bg-purple-100 text-purple-600';
                route = '/gestion-documentaire/vue-ensemble';
                break;
        }

        const module = route.startsWith('/gestion-audit')
            ? 'Audit'
            : route.startsWith('/gestion-documentaire')
                ? 'GED'
                : 'NC';
        const urgent = n.gravite === 'URGENT';
        const tone = urgent || colorClass.includes('red')
            ? 'rose'
            : colorClass.includes('blue') || colorClass.includes('purple')
                ? 'sky'
                : 'amber';

        return {
            id: n.id, // 👈 Indispensable pour que notification.id soit défini lors du clic !
            title: n.titre,
            detail: n.detail,
            count: n.nombre || 1,
            module,
            urgent,
            tone,
            time: urgent ? 'Urgent' : 'À traiter',
            icon: icon,
            colorClass: colorClass,
            read: false,
            route: route
        };
    }


    /**
     * Ce que l'utilisateur a à traiter côté documentaire, annoncé par la cloche.
     *
     * <p>Seules les non-conformités s'y annonçaient : un document à approuver ou une demande de
     * suppression à instruire n'apparaissaient nulle part tant qu'on n'ouvrait pas le module. La
     * source est celle de la vue d'ensemble documentaire — le même état partagé — pour que la cloche
     * et la liste ne puissent pas se contredire.</p>
     *
     * <p>Le rafraîchissement n'est demandé que si l'utilisateur a accès au module : l'interroger
     * sans droit n'aurait rendu que des refus.</p>
     */
    private ecouterLeDocumentaire(): void {
        this.aTraiterDocumentaire.aTraiter$
            .pipe(takeUntil(this.destroy$))
            .subscribe((etat) => {
                this.totalDocumentaire = etat.documents.length + etat.demandes.length;
                this.notificationsDocumentaire = [];

                if (etat.documents.length > 0) {
                    this.notificationsDocumentaire.push({
                        title: 'Documents à traiter',
                        detail: `${etat.documents.length} document(s) attendent votre décision.`,
                        count: etat.documents.length,
                        module: 'GED',
                        urgent: false,
                        tone: 'amber',
                        time: 'À traiter',
                        icon: 'pi pi-inbox',
                        colorClass: 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-300',
                        read: false,
                        // La notification mène là où l'on peut agir : la vue d'ensemble porte les
                        // dossiers et leurs boutons. Annoncer sans y conduire obligeait à chercher.
                        route: '/gestion-documentaire/vue-ensemble'
                    });
                }
                if (etat.demandes.length > 0) {
                    this.notificationsDocumentaire.push({
                        title: 'Demandes sur documents',
                        detail: `${etat.demandes.length} demande(s) de modification ou de suppression à instruire.`,
                        count: etat.demandes.length,
                        module: 'GED',
                        urgent: true,
                        tone: 'rose',
                        time: 'Urgent',
                        icon: 'pi pi-file-edit',
                        colorClass: 'bg-red-100 text-red-600 dark:bg-rose-500/20 dark:text-rose-300',
                        read: false,
                        route: '/gestion-documentaire/vue-ensemble'
                    });
                }
            });

        if (hasAnyPermission(['document-read', 'document-write', 'DOC_READ'])) {
            this.aTraiterDocumentaire.rafraichir().pipe(takeUntil(this.destroy$)).subscribe();
        }
    }

    /** Conduit là où la notification se traite, quand elle désigne un écran. */
    ouvrirNotification(notification: any): void {
        // 💡 Passer la notification à "lue" pour éteindre le point bleu
        notification.read = true;

        // 💡 Si un identifiant de notification existe, appeler l'API backend
        if (notification?.id) {
            this.nonConformiteService.marquerNotificationLue(notification.id).subscribe();
        }

        if (notification?.route) {
            this.notificationVisible = false;
            this.router.navigate([notification.route]);
        }
    }


    toggleDarkMode() {
        const config = this.layoutService.layoutConfig();
        // Alterne la propriété darkTheme (true/false) dans le signal de configuration
        this.layoutService.layoutConfig.set({ ...config, darkTheme: !config.darkTheme });
    }



    private updateTitle() {
        let child = this.activatedRoute.root;
        
        while (child.firstChild) {
            child = child.firstChild;
            
            // On récupère le titre à ce niveau s'il existe
            const title = child.snapshot.title || child.snapshot.data['title'];
            
            if (title) {
                // Si on a trouvé un titre, on l'assigne et on s'arrête (c'est la page mère)
                this.pageTitle = title;
                return; 
            }
        }
        
        // Si aucun titre n'a été trouvé dans la boucle, on utilise le titre par défaut du service
        this.pageTitle = this.titleService.getTitle();
    }

    goToProfile() {
        this.router.navigate(['/profil']);
    }

    goToSettings() {
        this.router.navigate(['/configurations']);
    }

    onSearchInput() {
        this.globalSearchService.updateSearchQuery(this.searchQuery);
    }

    onSearch() {
        if (this.searchQuery && this.searchQuery.trim()) {
            // Rediriger vers la page de recherche globale
            this.router.navigate(['/recherche'], { queryParams: { q: this.searchQuery } });
            this.searchQuery = ''; // Optionnel : vider la recherche
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next(true);
        this.destroy$.complete();
    }

}
