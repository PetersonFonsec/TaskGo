import { Paginable } from "@shared/interfaces/paginable.interface";

export interface IAddressEntity {
  label: string,
  street: string,
  number: string,
  complement: string,
  neighborhood: string,
  city: string,
  state: string,
  country: string,
  cep: string,
  lat: number,
  lng: number,
}

export interface IFullAddress extends IAddressEntity{
  id: string,
  userId: string,
  placeId: number,
  isDefault: boolean,
  active: boolean,
  createdAt: any,
  updatedAt: any
}

export interface ResponseAddressList extends Paginable<IFullAddress> {}
