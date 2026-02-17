import { CreateUserCommand } from "../create-user.command";

export interface CreateUserStrategy {
  execute(command: CreateUserCommand): Promise<CreateUserCommand>;
}
