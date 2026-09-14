import { Prisma } from '@prisma/client';

export const publicProviderSelect = {
  id: true,
  bio: true,
  ratingAvg: true,
  ratingCount: true,
  verified: true,
  acceptPix: true,
  acceptsCard: true,
  emergencyCare: true,
  isAvailable24h: true,
  user: { select: { id: true, name: true, photoUrl: true } },
  services: {
    where: { status: 'ATIVO' },
    select: {
      id: true,
      providerId: true,
      title: true,
      description: true,
      category: true,
      basePrice: true,
      status: true,
    },
  },
  locations: {
    take: 1,
    orderBy: { capturedAt: 'desc' },
    select: { lat: true, lng: true },
  },
} satisfies Prisma.ProviderSelect;

export function toPublicProvider<
  T extends { locations?: { lat: number; lng: number }[] },
>(provider: T): T {
  return {
    ...provider,
    ...(provider.locations
      ? {
          locations: provider.locations.slice(0, 1).map(({ lat, lng }) => ({
            lat: Math.round(lat * 100) / 100,
            lng: Math.round(lng * 100) / 100,
          })),
        }
      : {}),
  };
}
