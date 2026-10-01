import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional() @IsString() @MaxLength(150) name?: string;

  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() @MaxLength(2048) photoUrl?: string;
}
