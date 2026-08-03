export class QueryParams {
  static extractSearchParams = (searchQuery: string) => {
    return searchQuery
      .split('&')
      .map((term) => term.replace(/'/g, ''))
      .map((term) => term.split('=', 2))
      .filter(([key, value]) => Boolean(key && value))
      .map(([key, value]) => ({ key, value }));
  };
}
