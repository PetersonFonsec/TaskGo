import { IsOptional, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { CreateSubCategoryDto } from "./create-subcategory.dto";
import { CreateCategoryDto } from "./create-category.dto";

export class CreateFullCategoryDto {
  @ValidateNested()
  @Type(() => CreateCategoryDto)
  category: CreateCategoryDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateSubCategoryDto)
  subcategories?: CreateSubCategoryDto[];
}
