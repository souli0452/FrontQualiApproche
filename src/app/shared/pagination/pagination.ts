export abstract class BasePaginationComponent {
    dataList: any[] = [];
    totalElements: number = 0;
    currentPage: number = 0;
    pageSize: number = 10;
    totalPages: number = 0;
    loading: boolean = true;

    onPageChange(event: { page: number, size: number }) {
        this.currentPage = event.page;
        this.pageSize = event.size;
        this.fetchObject();
    }

    abstract fetchObject(): void;

    /** Met à jour les données et gère la fin du chargement avec un délai anti-clignotement */

// Dans pagination.ts :
  applyPagination(res: any, delayMs: number = 250, customList?: any[]): void {
      setTimeout(() => {
          const d = res?.data ?? res;
          const isArray = Array.isArray(d);

          // ✅ Si on a passé une liste transformée, on la prend, sinon d.content
          this.dataList = customList ?? d?.content ?? (isArray ? d : []);

          this.totalElements = d?.totalElements ?? (isArray ? d.length : 0);
          this.currentPage = d?.pageNumber ?? d?.number ?? 0;
          this.pageSize = d?.pageSize ?? d?.size ?? this.pageSize;
          this.totalPages = d?.totalPages ?? (this.pageSize > 0 ? Math.ceil(this.totalElements / this.pageSize) : 0);
          this.loading = false;
      }, delayMs);
  }

}
