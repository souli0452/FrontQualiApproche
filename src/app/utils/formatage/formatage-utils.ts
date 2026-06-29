import moment from 'moment';

export function toFormatFromDate(date: Date, pattern: string = 'DD/MM/YYYY'): string {
    return moment(date).locale('fr').format(pattern);
}

export function toFormatFromString(dateString: string, dateStringPattern: string, toPattern: string = 'DD/MM/YYYY'): string {
    const dateTmp = moment(dateString, dateStringPattern).toDate();
    return toFormatFromDate(dateTmp, toPattern);
}

export function patternToDate(dateString: string, pattern: string): Date {
    const date = moment(dateString, pattern).toDate();
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function unixToDate(unixStamp: number): Date {
    return moment(Number(unixStamp)).toDate();
}

export function getTimeZone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function formatUrl(url: string, replaceValue?: any): string {
    if (replaceValue) {
        const searchValue = url.substring(url.indexOf('$'), url.lastIndexOf('$') + 1);

        return url.replace(searchValue, replaceValue);
    }

    return url;
}

// Code pour le formatage de la date pour affichage dans le tableau des confirmations
export function formatDateRange(dates: Date[]): string {
    if (!Array.isArray(dates) || dates.length !== 2) return 'Dates invalides';

    const format = (date: Date): string => {
        if (!(date instanceof Date) || isNaN(date.getTime())) return 'Date invalide';
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    };

    const start = format(dates[0]);
    const end = format(dates[1]);

    return `${start} - ${end}`;
}

export function formatDateToDDMMYYYY(dateInput: Date | string | number): string {
    const date = new Date(dateInput);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // mois de 0 à 11
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}
export function formatDateTodd(dateInput: Date | string | number): string {
    const date = new Date(dateInput);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // mois de 0 à 11
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}