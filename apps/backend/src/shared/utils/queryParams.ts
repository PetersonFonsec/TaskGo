export class QueryParams {
  static extractSearchParams = (searchQuery: any) => {
    return searchQuery
      .split('&')
      .map(term => term.replace(/\'/g, ''))
      .map(term => term.split('='))
      .map(([key, value]) => ({ key, value }))
  }
}
