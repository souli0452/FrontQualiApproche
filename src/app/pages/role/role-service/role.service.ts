import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { ApiResponse, AppRole, PaginatedData, Permission } from '../../../models';
import { QualiUrlConfig } from '../../../services/quali-url-configs';
import { BaseCrudService } from '../../../services/base-crud.service';

@Injectable({ providedIn: 'root' })
export class RoleService extends BaseCrudService<AppRole> {
    constructor(public override http: HttpClient) {
        super(http, QualiUrlConfig.ROLE_URL);
    }

    deleteRole(id: string): Observable<void> {
        return this.http.delete<void>(`${QualiUrlConfig.ROLE_URL}/role/${id}`);
    }
}

@Injectable({ providedIn: 'root' }) // ✅ IMPORTANT
export class AppRoleService extends BaseCrudService<AppRole> {
    constructor(public override http: HttpClient) {
        super(http, QualiUrlConfig.APP_ROLE_URL);
    }

    createRole(role: AppRole): Observable<AppRole> {
        return this.http.post<AppRole>(QualiUrlConfig.APP_ROLE_URL, role);
    }

    updateRole(role: AppRole): Observable<AppRole> {
        return this.http.post<AppRole>(QualiUrlConfig.APP_ROLE_URL, role); // Utilise Post pour Save (Create or Update)
    }

    assignRoleToUser(userId: string, roleId: string): Observable<any> {
        return this.http.post<any>(`${QualiUrlConfig.APP_ROLE_URL}/assign`, {}, {
            params: { userId, roleId }
        });
    }

    getPermissionsDictionary(): Observable<Permission[]> {
        return this.http
            .get<ApiResponse<Permission>>(
                `${QualiUrlConfig.APP_ROLE_URL}/permissions-dictionary`,
                {
                    params: {
                        page: '0',
                        size: '10000'
                    }
                }
            )
            .pipe(
                map(res => res.data?.content ?? [])
            );
    }

    getAllRoles(page: number = 0, size: number = 10): Observable<ApiResponse<AppRole>> {
        return this.http.get<ApiResponse<AppRole>>(`${QualiUrlConfig.APP_ROLE_URL}?page=${page}&size=${size}`);
    }

}
