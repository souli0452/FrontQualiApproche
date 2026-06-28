export interface PaginatedData<T> {
    content: T[];
    last: boolean;
    pageNumber: number;
    pageSize: number;
    totalElements: number;
    totalPages: number;
}

export interface ApiResponse<T> {
    message: string;
    statusCode: number;
    data: PaginatedData<T>;
}

export interface ApiItemResponse<T> {
    data: T;
    message: string;
    statusCode: number;
}
