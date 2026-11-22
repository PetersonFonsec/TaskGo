import type { PublicUserProfile } from '@taskgo/shared';

export interface ProviderServiceResponse {
  id: string;
  providerId: string;
  title: string;
  description: string | null;
  category: string;
  /** Prisma Decimal values are serialized as strings in JSON responses. */
  basePrice: number | string | null;
  price?: number | string | null;
  status: string;
}

export interface ProviderReviewResponse {
  id: string;
  rating: number;
  comment: string | null;
  reviewedAt: string;
}

/** GET /provider/:id, matching `publicProviderSelect` and its mapper. */
export interface ProviderProfileResponse {
  id: string;
  bio: string | null;
  ratingAvg: number | { s: number; e: number; d: number[] } | null;
  ratingCount: number;
  verified: boolean;
  acceptPix: boolean;
  acceptsCard: boolean;
  emergencyCare: boolean;
  isAvailable24h: boolean;
  serviceAreas?: Array<{ mode: 'RADIUS' | 'POLYGON'; radiusKm: number | string | null }>;
  user: Pick<PublicUserProfile, 'id' | 'name' | 'photoUrl'>;
  services: ProviderServiceResponse[];
  locations: Array<{ lat: number; lng: number }>;
  /** Legacy view fields are optional because the public endpoint does not return them. */
  name?: string;
  photoUrl?: string | null;
  priceFrom?: number | null;
  reviews?: ProviderReviewResponse[];
  orders?: Array<{ id: string; status: string }>;
  provider?: { verified?: boolean };
}
