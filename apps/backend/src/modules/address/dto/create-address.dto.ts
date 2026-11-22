import {
  IsBoolean,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Address } from '../../../shared/interfaces/address.interface';

export class CreateAddressDto implements Address {
  @IsString() label: string;
  @IsString() street: string;
  @IsString() number: string;
  @IsOptional() @IsString() @MaxLength(120) neighborhood?: string;
  @IsString() city: string;
  @IsString() state: string;
  @IsString() cep: string;
  @IsLatitude() lat: number;
  @IsLongitude() lng: number;
  @IsOptional() @IsString() complement?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}
