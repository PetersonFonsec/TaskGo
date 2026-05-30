import { UserType } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEmail, IsEnum, IsMobilePhone, IsNotEmpty, IsOptional, IsString, ValidateNested } from "class-validator";
import { CreateAddressDto } from "../../../address/dto/create-address.dto";

export class CreateUserDto {
  @IsNotEmpty() @IsMobilePhone() phone: string;
  @IsNotEmpty() @IsString() password: string;
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
  services?: BigInt[];
}
