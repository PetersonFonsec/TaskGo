import { IsOptional, IsString } from 'class-validator';

export class ProviderDecisionReasonDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
