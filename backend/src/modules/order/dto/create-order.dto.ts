import { IsNotEmpty, IsOptional, IsString, IsISO8601, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class AddressSnapDto {
	@IsOptional()
	@IsString()
	street?: string;

	@IsOptional()
	@IsString()
	number?: string;

	@IsOptional()
	@IsString()
	complement?: string;

	@IsOptional()
	@IsString()
	neighborhood?: string;

	@IsOptional()
	@IsString()
	city?: string;

	@IsOptional()
	@IsString()
	state?: string;

	@IsOptional()
	@IsString()
	cep?: string;

	@IsOptional()
	@IsNumber()
	lat?: number;

	@IsOptional()
	@IsNumber()
	lng?: number;
}

export class CreateOrderDto {
	@IsNotEmpty()
	@IsString()
	clientId!: string;

	@IsNotEmpty()
	@IsString()
	serviceId!: string;

	@IsOptional()
	@IsISO8601()
	scheduledFor?: string;

	@IsOptional()
	@IsNumber()
	finalPrice?: number;

	@IsOptional()
	@IsString()
	paymentMethod?: string;

	@IsOptional()
	@ValidateNested()
	@Type(() => AddressSnapDto)
	address?: AddressSnapDto;
}
