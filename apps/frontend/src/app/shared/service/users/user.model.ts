import type { PublicUserProfile } from '@taskgo/shared';

export interface ProviderProfileResponse {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  photoUrl?: string | null;
  bio?: string;
  ratingAvg?: number | { s?: number; value?: number };
  verified?: boolean;
  createdAt?: string;
  user?: PublicUserProfile & {
    reviews?: unknown[];
  };
  services?: unknown[];
  orders: any[];
  reviews: any[];
  provider: {
    id: string;
    bio: string;
    ratingAvg: {
      s: number;
      e: number;
      d: any[];
    };
    ratingCount: any;
    verified: boolean;
    createdAt: string;
    updatedAt: string;
    pagarmeRecipientId: null;
  };
}
