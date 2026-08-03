import { IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFavoriteDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  providerId: number;
}
