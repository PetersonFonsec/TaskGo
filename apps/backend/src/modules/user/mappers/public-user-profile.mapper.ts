import type { PublicAddressSummary, PublicUserProfile } from '@taskgo/shared';

type PublicProfileSource = {
  id: bigint | number | string;
  name: string;
  email: string;
  phone?: string | null;
  cpf: string;
  type: string;
  photoUrl?: string | null;
  bio?: string | null;
  emailVerified?: boolean | null;
  phoneVerified?: boolean | null;
  pendingEmail?: string | null;
  pendingPhone?: string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  addresses?: PublicAddressSource[] | null;
  address?: PublicAddressSource[] | null;
};

type PublicAddressSource = {
  id?: bigint | number | string | null;
  label?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  cep?: string | null;
  lat?: number | null;
  lng?: number | null;
  placeId?: string | null;
  isDefault?: boolean | null;
};

export function toPublicUserProfile(user: PublicProfileSource): PublicUserProfile {
  const addresses = user.addresses ?? user.address;

  return {
    id: stringifyId(user.id),
    name: user.name,
    email: user.email,
    phone: user.phone ?? '',
    cpf: user.cpf,
    type: user.type as PublicUserProfile['type'],
    photoUrl: user.photoUrl ?? null,
    bio: user.bio ?? null,
    emailVerified: user.emailVerified ?? undefined,
    phoneVerified: user.phoneVerified ?? undefined,
    pendingEmail: user.pendingEmail ?? null,
    pendingPhone: user.pendingPhone ?? null,
    createdAt: stringifyDate(user.createdAt),
    updatedAt: stringifyDate(user.updatedAt),
    addresses: addresses?.map(toPublicAddressSummary),
  };
}

function toPublicAddressSummary(address: PublicAddressSource): PublicAddressSummary {
  return {
    id: address.id == null ? undefined : stringifyId(address.id),
    label: address.label ?? undefined,
    street: address.street ?? '',
    number: address.number ?? undefined,
    complement: address.complement ?? null,
    neighborhood: address.neighborhood ?? undefined,
    city: address.city ?? '',
    state: address.state ?? '',
    country: address.country ?? undefined,
    cep: address.cep ?? undefined,
    lat: address.lat ?? undefined,
    lng: address.lng ?? undefined,
    placeId: address.placeId ?? null,
    isDefault: address.isDefault ?? undefined,
  };
}

function stringifyId(id: bigint | number | string): string {
  return id.toString();
}

function stringifyDate(value?: Date | string | null): string | undefined {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : value;
}
