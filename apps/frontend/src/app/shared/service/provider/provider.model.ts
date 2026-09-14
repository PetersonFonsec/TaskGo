export interface hireProviderRequest {
  serviceId: string;
  scheduledFor: string;
  addressId: string;
}

export interface FavoriteRequest {
  providerId: string;
}

export interface FavoriteItem {
  providerId: string;
  id?: string;
  [key: string]: any;
}

export interface ProviderAvailabilityResponse {
  providerId: string;
  timezone: string;
  days: ProviderAvailabilityDay[];
}

export interface ProviderAvailabilityDay {
  date: string;
  available: boolean;
  slots: ProviderAvailabilitySlot[];
}

export interface ProviderAvailabilitySlot {
  startsAt: string;
  endsAt: string;
  serviceId: string;
  label: string;
  available: boolean;
}
