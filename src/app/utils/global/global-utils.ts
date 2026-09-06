import { HttpParams } from '@angular/common/http';

export const createRequestOption = (req?: any): HttpParams => {
    let options: HttpParams = new HttpParams();
    if (req) {
        Object.keys(req).forEach(key => {
            if (key !== 'sort' && key !== 'type' &&
                req[key] !== null && req[key] !== undefined) {
                options = options.set(key, req[key]);
            }
        });
        if (req.sort) {
            req.sort.forEach((val: any) => {
                options = options.append('sort', val);
            });
        }
    }
    return options;
};

export function sortArray(objectList: Array<any>, field: string, direction: 'asc' | 'desc', isNumber = false): Array<any> {
    let array: Array<any> = objectList.map(item => ({ ...item }));
    switch (direction) {
        case 'desc': {
            array = array.sort((a, b) => String(a[field]).localeCompare(String(b[field]), undefined,
                { numeric: isNumber }) > 0 ? -1 : 1);
            break;
        }
        case 'asc': {
            array = array.sort((a, b) => String(a[field]).localeCompare(String(b[field]), undefined,
                { numeric: isNumber }) < 0 ? -1 : 1);
            break;
        }
    }
    return array;
}

/**
 * Ordonner une liste selon plusieurs critères.
 */
export function sortWithMultipleCriteria(dataList: Array<any>, fields: Array<string>,
    direction: 'asc' | 'desc', isNumber: boolean): Array<any> {
    let sortedData: Array<any> = dataList;
    if (direction === 'desc') {
        fields.forEach((field: string, index: number) => {
            sortedData = sortedData.sort((a: any, b: any) => {
                if (index === 0) {
                    return a[field].localeCompare(b[field], undefined, { numeric: isNumber }) > 0 ? -1 : 1;
                } else {
                    if (a[fields[index - 1]].localeCompare(b[fields[index - 1]], undefined, { numeric: isNumber }) === 0) {
                        return a[field].localeCompare(b[field], undefined, { numeric: isNumber }) > 0 ? -1 : 1;
                    } else {
                        return a[fields[index - 1]].localeCompare(b[fields[index - 1]], undefined, { numeric: isNumber }) > 0 ? -1 : 1;
                    }
                }
            });
        });
    } else if (direction === 'asc') {
        fields.forEach((field, index) => {
            sortedData = sortedData.sort((a: any, b: any) => {
                if (index === 0) {
                    return a[field].localeCompare(b[field], undefined, { numeric: isNumber }) < 0 ? -1 : 1;
                } else {
                    if (a[fields[index - 1]].localeCompare(b[fields[index - 1]], undefined, { numeric: isNumber }) === 0) {
                        return a[field].localeCompare(b[field], undefined, { numeric: isNumber }) < 0 ? -1 : 1;
                    } else {
                        return a[fields[index - 1]].localeCompare(b[fields[index - 1]], undefined, { numeric: isNumber }) < 0 ? -1 : 1;
                    }
                }
            });
        });
    }

    return sortedData;
}

export function generateColor(index: number, total: number): string {
    const hue = Math.round((360 / total) * index);
    return `hsl(${hue}, 70%, 50%)`;
}

// ─── Ré-exports de compatibilité vers les modules dédiés ─────────────────────
export { USER_STRUCTURE_KEY, USER_PROFILE_KEY, getCurrentUserStructure } from '@core/auth';
export { REGION_LIST } from '@features/organigramme';
export { TypeDemande, transformerEnStats, getStatusSeverity } from '@features/non-conformite';
export { StatusEnum, StatusEnumShow, showToast } from '@shared';
