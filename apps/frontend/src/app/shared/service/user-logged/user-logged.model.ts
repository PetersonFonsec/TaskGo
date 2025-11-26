// import { LoginResponse } from "app/pages/auth/services/auth/auth.model";

import { Roles } from "@shared/enums/roles.enum";

// export interface IUserLogged extends LoginResponse { }

export interface IUserLogged {
  user: IUser;
}

export interface IAddress {
  id: string,
  userId: string,
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
  placeId: string,
  isDefault: boolean,
  active: boolean,
  createdAt: {},
  updatedAt: {}
}

export interface IOrder {
  id: string,
  clientId: string,
  serviceId: string,
  status: string,
  finalPrice: any,
  requestedAt: {},
  scheduledFor: {}
}
export interface IUser {
  id: string,
  name: string,
  email: string,
  passwordHash: string,
  phone: string,
  type: Roles,
  photoUrl: string,
  createdAt: {},
  updatedAt: {},
  cpf: string,
  addresses: IAddress[],
  orders: IOrder[],
  reviews: [],
  provider: null
}
