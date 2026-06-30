import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ConfirmOrderCompletionDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  clientNotes?: string;
}
