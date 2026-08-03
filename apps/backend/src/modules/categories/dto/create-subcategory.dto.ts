import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateSubCategoryDto {
  @IsOptional() @IsString() description: string;
  @IsNotEmpty() @IsUUID() categoryId: bigint;
  @IsNotEmpty() @IsString() name: string;
  @IsNotEmpty() @IsString() slug: string;
  @IsOptional() @IsString() icon: string;
}
