import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface AppNotificationItem {
    id?: string;
    title: string;
    detail: string;
    time: string;
    icon: string;
    colorClass: string;
    read: boolean;
    route?: string;
    moduleKey: 'NC' | 'DOC' | 'ACTION' | 'AUTRE';
}

@Injectable({
    providedIn: 'root'
})
export class AppNotificationService {

    // 1. Dictionnaire des compteurs par module (ex: { NC: 2, DOC: 1 })
    private moduleBadgesSubject = new BehaviorSubject<{ [moduleKey: string]: number }>({});
    public moduleBadges$ = this.moduleBadgesSubject.asObservable();

    // 2. Liste consolidée des notifications pour la cloche
    private notificationsSubject = new BehaviorSubject<AppNotificationItem[]>([]);
    public notifications$ = this.notificationsSubject.asObservable();

    // 3. Compteur total pour la pastille de la cloche
    public totalCount$: Observable<number> = this.notifications$.pipe(
        map(items => items.length)
    );

    /**
     * Met à jour le compteur d'un module pour son badge dans le menu latéral.
     */
    setModuleBadge(moduleKey: string, count: number): void {
        const current = this.moduleBadgesSubject.value;
        this.moduleBadgesSubject.next({
            ...current,
            [moduleKey]: Math.max(0, count)
        });
    }

    /**
     * Renvoie un Observable du nombre pour un module donné.
     */
    getBadgeCount(moduleKey: string): Observable<number> {
        return this.moduleBadges$.pipe(
            map(badges => badges[moduleKey] || 0)
        );
    }

    /**
     * Met à jour les notifications provenant d'un module spécifique dans la cloche.
     */
    updateModuleNotifications(moduleKey: 'NC' | 'DOC' | 'ACTION' | 'AUTRE', items: AppNotificationItem[]): void {
        const others = this.notificationsSubject.value.filter(n => n.moduleKey !== moduleKey);
        this.notificationsSubject.next([...others, ...items]);
    }

    /**
     * Marque localement une notification comme lue.
     */
    markAsRead(notificationId?: string): void {
        if (!notificationId) return;
        const updated = this.notificationsSubject.value.map(n => 
            n.id === notificationId ? { ...n, read: true } : n
        );
        this.notificationsSubject.next(updated);
    }
}
