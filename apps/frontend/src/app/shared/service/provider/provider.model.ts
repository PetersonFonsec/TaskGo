export interface hireProviderRequest {
  clientId: string;
  serviceId: string;
  finalPrice: number;
  paymentMethod: "PIX";
  address: {
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
    cep: string;
    lat: number,
    lng: number,
  }
}

export interface FavoriteRequest {
  providerId: string;
}

export interface FavoriteItem {
  providerId: string;
  id?: string;
  [key: string]: any;
}
