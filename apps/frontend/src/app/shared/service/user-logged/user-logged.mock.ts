import { Roles } from "@shared/enums/roles.enum";
import { IUser, IUserLogged } from "./user-logged.model";

export const mockUser: IUser = {
  "id": "3",
  "name": "Cliente 1",
  "email": "cliente1@teste.com",
  "passwordHash": "$2b$10$.vX.o4pou4U.RHQVEIxkdOhxt/RLn/m2vk/VSsOuxOrO65p6COD0S",
  "phone": "+55 11 951844629",
  "type": Roles.CUSTOMER,
  "photoUrl": "null",
  "createdAt": {},
  "updatedAt": {},
  "cpf": "123.456.7810-90",
  "addresses": [
    {
      "id": "3",
      "userId": "3",
      "label": "Casa",
      "street": "Rua dos Clientes 1",
      "number": "100",
      "complement": "null",
      "neighborhood": "null",
      "city": "São Paulo",
      "state": "SP",
      "country": "BR",
      "cep": "01000-000",
      "lat": -23.54799590904939,
      "lng": -46.6311992164002,
      "placeId": "null",
      "isDefault": true,
      "active": true,
      "createdAt": {},
      "updatedAt": {}
    }
  ],
  "orders": [
    {
      "id": "1",
      "clientId": "3",
      "serviceId": "1",
      "status": "PENDENTE",
      "finalPrice": {
        "s": 1,
        "e": 2,
        "d": [
          100
        ]
      },
      "requestedAt": {},
      "scheduledFor": {}
    }
  ],
  "reviews": [],
  "provider": null
};

export const mockUserLogged: IUserLogged = {
  access_token: 'abc123',
  user: mockUser,
  colleges: [],
  calendar: [],
} as any;
