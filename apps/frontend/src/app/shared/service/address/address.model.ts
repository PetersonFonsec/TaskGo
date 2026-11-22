import { Paginable } from '@shared/interfaces/paginable.interface';

export interface IAddressEntity {
  label: string;
  street: string;
  number: string;
  complement: string;
  neighborhood?: string | null;
  city: string;
  state: string;
  country: string;
  cep: string;
  lat: number;
  lng: number;
  isDefault?: boolean;
  active?: boolean;
}

export interface IFullAddress extends IAddressEntity {
  id: string;
  userId: string;
  placeId: number;
  isDefault: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ResponseAddressList extends Paginable<IFullAddress> {}
