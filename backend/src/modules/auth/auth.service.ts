import { Injectable } from "@nestjs/common";

import Mediator from "src/shared/events/mediator";
import { Events } from "src/shared/events/events";

import { UserValidateService } from "../user/user-validate.service";
import { AuthRegisterDTO } from "./dto/authRegister.dto";
import { AuthTokenService } from "./auth-token.service";
import { AuthForgetDTO } from "./dto/authForget.dto";
import { UserService } from "../user/user.service";
import { AuthLoginDTO } from "./dto/authLogin.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly userValidateService: UserValidateService,
    private readonly userService: UserService,
    private readonly authTokenService: AuthTokenService,
    private readonly mediator: Mediator
  ) { }

  async login({ password, email }: AuthLoginDTO) {
    const user = await this.userValidateService.validPassword(password, email);
    const { access_token } = await this.authTokenService.createToken(user);
    const all = await this.userService.findOne(user.id);
    return { user, ...all, access_token };
  }

  async register(payload: AuthRegisterDTO) {
    const user = await this.userService.create(payload.user);
    const { access_token } = await this.authTokenService.createToken(user);
    const all = await this.userService.findOne(user.id);
    return { user, ...all, access_token }
  }

  async forgetPassword({ email }: AuthForgetDTO): Promise<any> {
    const user = await this.userService.findOneByField({ email });
    const token = this.authTokenService.createToken(user);

    return this.mediator.publish(Events.forgetPassword, token);
  }
}
