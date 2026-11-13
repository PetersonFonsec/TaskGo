export interface Category {
  readonly id: number | string;
  readonly name: string;
  readonly slug: string;
  readonly thumb?: string | null;
  readonly description?: string | null;
}

export interface Paginated<T> {
  readonly data: readonly T[];
}

export interface ProviderService {
  readonly id: string | number;
  readonly title: string;
  readonly description?: string | null;
  readonly basePrice: number;
}

export interface PublicProvider {
  readonly id: string | number;
  readonly bio?: string | null;
  readonly ratingAvg?: number | string | null;
  readonly ratingCount?: number | null;
  readonly verified?: boolean;
  readonly user: { readonly name: string; readonly photoUrl?: string | null };
  readonly services: readonly ProviderService[];
}
