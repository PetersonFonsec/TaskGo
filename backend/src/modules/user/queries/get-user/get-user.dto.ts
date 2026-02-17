import { Exclude, Expose, Type } from "class-transformer";

import { CreateAddressDto } from "../../../address/dto/create-address.dto";
import { Order } from "../../../../modules/order/entities/order.entity";
import { UserType } from "../../../../shared/enums/user-type.enum";

@Exclude()
export class UserDto {
  @Expose()
  id: string;

  @Expose()
  password: string;

  @Expose()
  phone: string;

  @Expose()
  name: string;

  @Expose()
  email: string;

  @Expose()
  cpf: string;

  @Expose()
  type: UserType;

  @Expose()
  bio?: string;

  @Expose()
  photoUrl?: string;

  @Type(() => CreateAddressDto)
  @Expose()
  address: CreateAddressDto[];

  @Type(() => Order)
  @Expose()
  orders: Order[];
}
