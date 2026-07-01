import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class PagarmeWebhookDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}
