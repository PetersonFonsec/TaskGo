import { CreateUserCommand } from "../commands/create-user/create-user.command";

export class UserCreatedEvent {
  user: CreateUserCommand;
}
