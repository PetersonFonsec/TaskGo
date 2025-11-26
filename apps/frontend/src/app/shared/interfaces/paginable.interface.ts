export interface Paginable<T> {
  data: T[],
  meta: {
    total: number,
    page: number,
    limit: number,
    totalPages: number,
    hasPrevPage: boolean,
    hasNextPage: boolean
  }
}