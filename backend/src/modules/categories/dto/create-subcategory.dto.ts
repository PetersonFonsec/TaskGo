import { IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator"

export class CreateSubCategoryDto {
  @IsOptional() @IsString() description: String;
  @IsNotEmpty() @IsUUID() categoryId: BigInt;
  @IsNotEmpty() @IsString() name: String;
  @IsNotEmpty() @IsString() slug: String;
  @IsOptional() @IsString() icon: String;
}
