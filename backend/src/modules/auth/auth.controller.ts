import { CommandBus } from "@nestjs/cqrs/dist/command-bus";
import { Body, Controller, Post } from "@nestjs/common";
import { QueryBus } from "@nestjs/cqrs/dist/query-bus";
import { plainToClass } from "class-transformer";

import { ForgotPasswordCommand } from "./commands/forgot-password/forgot-password.command";
import { CreateUserCommand } from "../user/commands/create-user/create-user.command";
import { LoginQuery } from "./queries/login/login.query";
import { AuthTokenService } from "./auth-token.service";
import { AuthLoginDTO } from "./queries/login/login.dto";
import { AuthForgetDTO } from "./commands/forgot-password/forgot-password.dto";
import { AuthRegisterDTO } from "./dto/auth-register.dto";
import { GetUserQuery } from "../user/queries/get-user/get-user.query";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly tokenService: AuthTokenService,
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) { }

  @Post("login")
  async login(@Body() body: AuthLoginDTO) {
    const query = plainToClass(LoginQuery, body);
    const result = await this.queryBus.execute(query);
    result.id = result.id.toString();

    const { access_token } = await this.tokenService.createToken(result.id.toString());
    return { user: result, access_token };
  }

  @Post("register")
  async register(@Body() body: AuthRegisterDTO) {
    const command = plainToClass(CreateUserCommand, body);
    const userId = await this.commandBus.execute(command);

    const query = plainToClass(GetUserQuery, { id: BigInt(userId) });
    const user = await this.queryBus.execute(query);
    user.id = user.id.toString();

    const { access_token } = await this.tokenService.createToken(userId);
    return { user, access_token };
  }

  @Post("forget")
  async forget(@Body() body: AuthForgetDTO) {
    const command = plainToClass(ForgotPasswordCommand, body);
    return await this.commandBus.execute(command);
  }
}
