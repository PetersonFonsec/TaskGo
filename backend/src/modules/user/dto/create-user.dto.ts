
import { UserType } from "@prisma/client";
import { IsEmail, IsEnum, IsNotEmpty, IsString } from "class-validator";

export class CreateUserDto {
  @IsNotEmpty() @IsString() password: string;
  @IsNotEmpty() @IsString() phone: string;
  @IsNotEmpty() @IsString() name: string;
  @IsNotEmpty() @IsEmail() email: string;
  @IsNotEmpty() @IsString() cpf: string;
  @IsNotEmpty() @IsEnum(UserType) type: UserType;
}
