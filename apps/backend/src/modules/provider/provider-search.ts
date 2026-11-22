import { CoverageQuery, coveragePoint } from './coverage';

export class ProviderSearchFilters {
  minimumRating?: number;
  maximumDistance?: number;
  minimumPrice?: number;
  maximumPrice?: number;
}

type ProviderSearchRecord = {
  ratingAvg?: number | { toNumber(): number } | null;
  services?: Array<{
    category?: string;
    basePrice: number | { toNumber(): number };
    status?: string;
  }>;
  locations?: Array<{ lat: number; lng: number }>;
};

export function filterAndOrderProviders<T extends ProviderSearchRecord>(
  providers: T[],
  coverage: CoverageQuery,
  filters: ProviderSearchFilters,
  category?: string,
): Array<T & { distanceKm: number | null }> {
  const origin = coveragePoint(coverage);
  const priceFiltersActive =
    filters.minimumPrice !== undefined || filters.maximumPrice !== undefined;
  const results = providers
    .map((provider, index) => ({
      provider,
      index,
      distanceKm: origin
        ? distanceBetween(origin, provider.locations?.[0])
        : null,
    }))
    .filter(({ provider, distanceKm }) => {
      if (
        filters.minimumRating !== undefined &&
        Number(provider.ratingAvg ?? 0) < filters.minimumRating
      ) {
        return false;
      }
      if (
        filters.maximumDistance !== undefined &&
        (distanceKm === null || distanceKm > filters.maximumDistance)
      ) {
        return false;
      }
      if (priceFiltersActive) {
        const prices = (provider.services ?? [])
          .filter(
            (service) =>
              (!service.status || service.status === 'ATIVO') &&
              (!category || service.category === category),
          )
          .map((service) => Number(service.basePrice))
          .filter((price) => Number.isFinite(price) && price > 0);
        if (!prices.length) return false;
        const lowestPrice = Math.min(...prices);
        if (
          (filters.minimumPrice !== undefined &&
            lowestPrice < filters.minimumPrice) ||
          (filters.maximumPrice !== undefined &&
            lowestPrice > filters.maximumPrice)
        ) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      if (a.distanceKm === null || b.distanceKm === null) {
        return a.distanceKm === null && b.distanceKm === null
          ? a.index - b.index
          : a.distanceKm === null
            ? 1
            : -1;
      }
      return a.distanceKm - b.distanceKm || a.index - b.index;
    });

  return results.map(({ provider, distanceKm }) => ({
    ...provider,
    distanceKm,
  }));
}

function distanceBetween(
  origin: { lat: number; lng: number },
  destination?: { lat: number; lng: number },
) {
  if (
    !destination ||
    !Number.isFinite(destination.lat) ||
    !Number.isFinite(destination.lng) ||
    Math.abs(destination.lat) > 90 ||
    Math.abs(destination.lng) > 180
  ) {
    return null;
  }
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(destination.lat - origin.lat);
  const longitudeDelta = radians(destination.lng - origin.lng);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(origin.lat)) *
      Math.cos(radians(destination.lat)) *
      Math.sin(longitudeDelta / 2) ** 2;
  const clamped = Math.min(1, Math.max(0, a));
  return 6371 * 2 * Math.atan2(Math.sqrt(clamped), Math.sqrt(1 - clamped));
}
