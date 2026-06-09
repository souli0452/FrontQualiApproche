import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { ApiResponse, AppRole, PaginatedData, Permission } from '../../../models';
import { QualiUrlConfig } from '../../../services/quali-url-configs';

@Injectable({
    providedIn: 'root'
})
export class RoleService {
    constructor(private http: HttpClient) {}

    // getPermissionsDictionary(): Observable<Permission[]> {
    //     return this.http.get<Permission[]>(`${QualiUrlConfig.APP_ROLE_URL}/permissions-dictionary`);
    // }

    // getPermissionsDictionary(): Observable<Permission[]> {
    //     return this.http.get<ApiResponse<Permission>>(`${QualiUrlConfig.APP_ROLE_URL}/permissions-dictionary`)
    //         .pipe(
    //             // Ici, le 'response' est de type ApiResponse<Permission>
    //             // On extrait 'data' (PaginatedData<Permission>) puis 'content' (Permission[])
    //             map((response: ApiResponse<Permission>) => response.data.content)
    //         );
    // }

    getPermissionsDictionary(): Observable<Permission[]> {
        const params = {
            page: '0',
            size: '10000' 
        };

        return this.http.get<ApiResponse<Permission>>(`${QualiUrlConfig.APP_ROLE_URL}/permissions-dictionary`, { params })
        .pipe(
            map(response => response.data.content)
        );
}

    getAllRoles(page: number = 0, size: number = 10): Observable<ApiResponse<AppRole>> {
        return this.http.get<ApiResponse<AppRole>>(`${QualiUrlConfig.APP_ROLE_URL}?page=${page}&size=${size}`);
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
