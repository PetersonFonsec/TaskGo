export interface hireProviderRequest {
  clientId: string;
  serviceId: string;
  scheduledFor?: string;
  finalPrice: number;
  paymentMethod: 'PIX';
  address: {
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
    cep: string;
    lat: number;
    lng: number;
  };
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
