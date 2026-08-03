import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';

import { CreateUserDto } from '../../user/dto/create-user.dto';

export class CreateProviderDto {
  @ValidateNested()
  @Type(() => CreateUserDto)
  provider: CreateUserDto;

  @IsArray()
  @ArrayMinSize(1)
  @Type(() => BigInt)
  services: bigint[];
}
