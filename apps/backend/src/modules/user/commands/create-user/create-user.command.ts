import { UserType } from '../../../../shared/enums/user-type.enum';
import { CreateAddressDto } from '../../../address/dto/create-address.dto';
import type { UserRegistrationSocialRequest } from '@taskgo/shared';

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
  social?: UserRegistrationSocialRequest;
  id?: string;
}
