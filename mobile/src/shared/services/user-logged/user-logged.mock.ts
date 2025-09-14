import { IUser, IUserLogged } from "./user-logged.model";

export const mockUser: IUser = {
  id: 1,
  name: 'John Doe',
  email: 'john.doe@example.com',
  photo: 'john.doe@example.com',
  role: 'admin'
};

export const mockUserLogged: IUserLogged = {
  access_token: 'abc123',
  user: mockUser,
  colleges: [],
  calendar: [],
};
