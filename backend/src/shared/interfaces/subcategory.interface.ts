export interface SubCategory {
  id: BigInt;
  name: String;
  slug: String;
  description?: String;
  icon?: String;
  categoryId: BigInt;
}
