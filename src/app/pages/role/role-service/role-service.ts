import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppRole, Permission } from '../../../models';
import { QualiUrlConfig } from '../../../services/quali-url-configs';

@Injectable({
    providedIn: 'root'
})
export class RoleService {
    constructor(private http: HttpClient) {}

    getPermissionsDictionary(): Observable<Permission[]> {
        return this.http.get<Permission[]>(`${QualiUrlConfig.APP_ROLE_URL}/permissions-dictionary`);
    }

    getAllRoles(): Observable<AppRole[]> {
        return this.http.get<AppRole[]>(QualiUrlConfig.APP_ROLE_URL);
    }

    createRole(role: AppRole): Observable<AppRole> {
        return this.http.post<AppRole>(QualiUrlConfig.APP_ROLE_URL, role);
    }

    updateRole(role: AppRole): Observable<AppRole> {
        return this.http.post<AppRole>(QualiUrlConfig.APP_ROLE_URL, role); // Utilise Post pour Save (Create or Update)
    }

    deleteRole(id: string): Observable<void> {
        return this.http.delete<void>(`${QualiUrlConfig.ROLE_URL}/role/${id}`);
    }

    assignRoleToUser(userId: string, roleId: string): Observable<any> {
        return this.http.post<any>(`${QualiUrlConfig.APP_ROLE_URL}/assign`, {}, {
            params: { userId, roleId }
        });
    }
}
