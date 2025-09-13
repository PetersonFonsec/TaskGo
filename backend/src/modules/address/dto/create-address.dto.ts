import { IsLatitude, IsLongitude, IsString } from "class-validator";
import { Address } from "../entities/address.entity";

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
