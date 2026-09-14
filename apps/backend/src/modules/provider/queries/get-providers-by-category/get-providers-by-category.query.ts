import { CoverageQuery } from '../../coverage';
export class GetProvidersByCategoryQuery {
  constructor(
    public readonly slug: string,
    public readonly coverage: CoverageQuery = {},
  ) {}
}
