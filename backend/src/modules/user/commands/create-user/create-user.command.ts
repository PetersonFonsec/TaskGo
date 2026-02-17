import { UserType } from "../../../../shared/enums/user-type.enum";
import { CreateAddressDto } from "../../../address/dto/create-address.dto";

export class CreateUserCommand {
  phone: string;
  address: CreateAddressDto;
  password: string;
  name: string;
  email: string;
  cpf: string;
  type: UserType;
  bio?: string;
  photoUrl?: string;
  services?: BigInt[];
  id?: string;
}
