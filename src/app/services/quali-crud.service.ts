import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { createRequestOption } from '../utils';
import { ApiResponse } from '../models';

export interface CrudOperations<T, ID> {

    save(t: T): Observable<HttpResponse<T>>;

    update(t: T): Observable<HttpResponse<T>>;

    findAll(): Observable<HttpResponse<Array<T>>>;

    GetAllObjects(page: number, size: number): Observable<ApiResponse<T>>;

    delete(id: ID): Observable<HttpResponse<void>>;
}

export abstract class QualiCrudService<T, ID> implements CrudOperations<T, ID> {

    protected constructor(
        protected http: HttpClient,
        protected uri: string
    ) {
    }

    save(t: T): Observable<HttpResponse<T>> {
        return this.http.post<T>(this.uri + "/create", t, {observe: 'response'});
    }

    update(t: T): Observable<HttpResponse<T>> {
        return this.http.put<T>(this.uri + "/update", t, {observe: 'response'});
    }
    updateG(t: T,id:string): Observable<HttpResponse<T>> {
        return this.http.put<T>(this.uri + `/update/${id}`, t, {observe: 'response'});
    }
    findAll(): Observable<HttpResponse<Array<T>>> {
        return this.http.get<T[]>(this.uri + "/all", {observe: 'response'});
    }

    GetAllObjects(page: number, size: number): Observable<ApiResponse<T>> {
        return this.http.get<ApiResponse<T>>(`${this.uri}/all?page=${page}&size=${size}`);
    }

    findAllNc(status?: string,id?:any): Observable<HttpResponse<Array<T>>> {
        const params = createRequestOption({status,id});
        return this.http.get<T[]>(this.uri, {params, observe: 'response'});
    }
    findById(id:string): Observable<HttpResponse<T>> {
        return this.http.get<T>(this.uri+`/get/${id}`, {observe: 'response'});
    }
    findByNumero(id:string): Observable<HttpResponse<T>> {
        return this.http.get<T>(this.uri+`/get/numero/${id}`, {observe: 'response'});
    }

    delete(id: ID): Observable<HttpResponse<void>> {
        return this.http.delete<void>(this.uri + `/delete/${id}` , {observe: 'response'});
    }
    deleteMany(actualities: T[]): Observable<HttpResponse<void>> {
        return this.http.put<void>(this.uri + '/delete-multiple' ,actualities , {observe: 'response'});
    }
    updateStatus(id: ID, status: string): Observable<HttpResponse<void>> {
        const params = createRequestOption({id, status});
        return this.http.patch<void>(this.uri+'/change-status', null, {params, observe: 'response'});
    }
    updateManyStatus(actualities:T[], status: string): Observable<HttpResponse<void>> {
        return this.http.patch<void>(this.uri+'/change-many-status?status='+status, actualities,{observe: 'response'});
    }
}
