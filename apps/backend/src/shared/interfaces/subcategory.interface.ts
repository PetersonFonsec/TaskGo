export interface SubCategory {
  id: bigint;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  categoryId: bigint;
}
