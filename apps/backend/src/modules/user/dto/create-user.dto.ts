import { UserType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CreateAddressDto } from '../../../modules/address/dto/create-address.dto';

export class UserRegistrationSocialDto {
  @IsOptional() @IsString() whatsapp?: string;
  @IsOptional() @IsString() instagram?: string;
  @IsOptional() @IsString() facebook?: string;
  @IsOptional() @IsString() linkedin?: string;
  @IsOptional() @IsString() linkdin?: string;
}

export class CreateUserDto {
  @IsNotEmpty() @IsString() password: string;
  @IsNotEmpty() @IsString() phone: string;
  @IsNotEmpty() @IsString() name: string;
  @IsNotEmpty() @IsEmail() email: string;
  @IsNotEmpty() @IsString() cpf: string;
  @IsNotEmpty() @IsEnum(UserType, { always: true }) type: UserType;
  @IsOptional() @IsString() bio?: string;
  @IsOptional() @IsString() photoUrl?: string;

  @ValidateNested()
  @Type(() => CreateAddressDto)
  address: CreateAddressDto;

  @IsOptional()
  @IsArray()
  @Type(() => BigInt)
  services: bigint[];

  @IsOptional()
  @ValidateNested()
  @Type(() => UserRegistrationSocialDto)
  social?: UserRegistrationSocialDto;
}
