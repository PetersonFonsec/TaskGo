export interface ICategory {
  id: number,
  name: string,
  slug: string,
  description: string,
  icon: string,
  sortOrder: number,
  isActive: boolean,
  createdAt: {},
  updatedAt: {},
  platformFeePct: null
}

export interface ISubCategory {
  id: number,
  categoryId: number,
  name: string,
  slug: string,
  description: string,
  icon: string,
  sortOrder: number,
  isActive: boolean,
  createdAt: {},
  updatedAt: {}
}

export interface ICategoryWithSubCategories extends ICategory {
  subcategories: ISubCategory[]
}