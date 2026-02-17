import { CreateUserCommand } from "../create-user.command";

export interface UserValidations {
  validate(command: CreateUserCommand, dataSource: any): Promise<void>;
}
