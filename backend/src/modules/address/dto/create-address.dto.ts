import { Address } from "@shared/interfaces/address.interface";
import { IsLatitude, IsLongitude, IsString } from "class-validator";

export class CreateAddressDto implements Address {
  @IsString() label: string;
  @IsString() street: string;
  @IsString() number: string;
  @IsString() city: string;
  @IsString() state: string;
  @IsString() cep: string;
  @IsLatitude() lat: number;
  @IsLongitude() lng: number;
}
