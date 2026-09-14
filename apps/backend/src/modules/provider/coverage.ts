import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface CoverageQuery {
  lat?: string | number;
  lng?: string | number;
}

export function coveragePoint(query: CoverageQuery) {
  if (query.lat === undefined && query.lng === undefined) return null;
  if (
    query.lat === undefined ||
    query.lng === undefined ||
    String(query.lat).trim() === '' ||
    String(query.lng).trim() === ''
  )
    throw new BadRequestException('Both latitude and longitude are required');
  const lat = Number(query.lat),
    lng = Number(query.lng);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  )
    throw new BadRequestException('Invalid geographic coordinates');
  return { lat, lng };
}

export async function providerCoverageWhere(
  prisma: PrismaService,
  query: CoverageQuery,
): Promise<Prisma.ProviderWhereInput> {
  const point = coveragePoint(query);
  if (!point)
    return {
      serviceAreas: {
        some: {
          active: true,
          mode: 'RADIUS',
          radiusKm: { gt: 0 },
          centerLat: { not: null },
          centerLng: { not: null },
        },
      },
    };
  // Parameterized spherical distance over every active area. No candidate cap that silently drops matches.
  const areas = await prisma.$queryRaw<{ providerId: bigint }[]>`
    SELECT DISTINCT provider_id AS "providerId"
    FROM provider_service_areas
    WHERE active = true AND mode = 'RADIUS'
      AND "centerLat" BETWEEN -90 AND 90 AND "centerLng" BETWEEN -180 AND 180
      AND radius_km > 0
      AND 6371 * 2 * asin(sqrt(least(1.0, greatest(0.0,
        power(sin(radians("centerLat" - ${point.lat}) / 2), 2)
        + cos(radians(${point.lat})) * cos(radians("centerLat"))
        * power(sin(radians("centerLng" - ${point.lng}) / 2), 2)
      )))) <= radius_km
  `;
  return { id: { in: areas.map((area) => area.providerId) } };
}
