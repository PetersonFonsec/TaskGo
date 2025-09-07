import { Roles } from "@shared/enums/role.enum";

export interface UserTokenI {
  id: number;
  email: string;
  name: string;
  photo: string;
  documentNumber: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  role: Roles;
}
