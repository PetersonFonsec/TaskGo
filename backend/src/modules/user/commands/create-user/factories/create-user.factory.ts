import { BadRequestException, Injectable } from "@nestjs/common";
import { UserType } from "../../../../../shared/enums/user-type.enum";

import { CreateProviderStrategy } from "../strategies/create-provider.strategy";
import { CreateUserStrategy } from "../strategies/strategy.interface";
import { CreateUserCommand } from "../create-user.command";
import { CreateClientStrategy } from "../strategies/create-client.strategy";

@Injectable()
export class CreateUserFactory {

  constructor(
    private readonly createProviderStrategy: CreateProviderStrategy,
    private readonly createClientStrategy: CreateClientStrategy,
  ) { }

  getStrategy(command: CreateUserCommand): CreateUserStrategy {
    const { type } = command;
    const userTypes = {
      [UserType.CUSTOMER]: this.createClientStrategy,
      [UserType.PROVIDER]: this.createProviderStrategy
    }

    const StrategyClass = userTypes[type];
    if (!StrategyClass) throw new BadRequestException(`No strategy found for user type: ${type}`);

    return StrategyClass;
  }
}
