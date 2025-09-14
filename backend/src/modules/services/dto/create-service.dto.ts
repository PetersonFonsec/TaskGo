import { ServiceStatus } from "@prisma/client"
import { IsString, IsEnum, IsNumber, IsOptional, IsUUID } from "class-validator"

export class CreateServiceDto {
  @IsUUID() providerId: BigInt
  @IsString() title: String
  @IsOptional() @IsString() description?: String
  @IsString() category: String
  @IsNumber() basePrice: number
  @IsOptional() availability?: any
  @IsEnum(ServiceStatus) status: ServiceStatus
}
