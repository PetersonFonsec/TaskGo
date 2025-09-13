import { IsString, IsOptional } from "class-validator";

export class CreateCategoryDto {
  @IsString() name: string
  @IsString() slug: string
  @IsOptional() description: string
  @IsOptional() icon: string
  @IsOptional() sortOrder: number
  @IsOptional() isActive: boolean
}
