import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class PagarmeWebhookDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  type: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}
