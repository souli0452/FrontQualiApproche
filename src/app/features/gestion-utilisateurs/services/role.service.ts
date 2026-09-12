import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { ApiResponse } from '../../../models/response.model';
import { AppRole, Permission } from '../models/role.model';
import { BaseCrudService } from '@core/services/base-crud.service';
import { QualiUrlConfig } from '@core/services/url-config';

@Injectable({ providedIn: 'root' })
export class RoleService extends BaseCrudService<AppRole> {
    constructor(public override http: HttpClient) {
        super(http, QualiUrlConfig.ROLE_URL);
    }

    deleteRole(id: string): Observable<void> {
        return this.http.delete<void>(`${QualiUrlConfig.ROLE_URL}/role/${id}`);
    }
}

@Injectable({ providedIn: 'root' })
export class AppRoleService extends BaseCrudService<AppRole> {
    constructor(public override http: HttpClient) {
        super(http, QualiUrlConfig.APP_ROLE_URL);
    }
    createRole(role: AppRole): Observable<AppRole> {
        return this.updateRole(role);
    }
    updateRole(role: AppRole): Observable<AppRole> {
        return this.http.post<AppRole>(QualiUrlConfig.APP_ROLE_URL, role);
    }

    getPermissionsDictionary(): Observable<any> {
        return this.http
            .get<ApiResponse<any>>(
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
