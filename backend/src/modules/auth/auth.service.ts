import { Injectable } from "@nestjs/common";

import Mediator from "@shared/events/mediator";
import { Events } from "@shared/events/events";

import { AuthRegisterConsumerDTO } from "./dto/auth-register-consumer.dto";
import { AuthRegisterProviderDTO } from "./dto/auth-register-provider.dto";
import { UserValidateService } from "../user/user-validate.service";
import { AuthTokenService } from "./auth-token.service";
import { AuthForgetDTO } from "./dto/authForget.dto";
import { UserService } from "../user/user.service";
import { AuthLoginDTO } from "./dto/authLogin.dto";
import { AddressService } from "../address/address.service";
import { ProviderService } from "../provider/provider.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly userValidateService: UserValidateService,
    private readonly authTokenService: AuthTokenService,
    private readonly providerService: ProviderService,
    private readonly userService: UserService,
    private readonly mediator: Mediator
  ) { }

  async login({ password, email }: AuthLoginDTO) {
    const user = await this.userValidateService.validPassword(password, email);
    const { access_token } = await this.authTokenService.createToken(user.id);
    const all = await this.userService.findOne(user.id);
    return { user, ...all, access_token };
  }

  async registerConsumer(payload: AuthRegisterConsumerDTO) {
    const user = await this.userService.create(payload.user);

    const { access_token } = await this.authTokenService.createToken(user.id);
    return { user, access_token };
  }

  async registerProvider(payload: AuthRegisterProviderDTO) {
    const provider = await this.providerService.create(payload);

    const { access_token } = await this.authTokenService.createToken(provider.id);
    return { user: provider, access_token };
  }

  async forgetPassword({ email }: AuthForgetDTO): Promise<any> {
    const user = await this.userService.findOneByField({ email });
    if (!user) throw new Error('User not found');

    const token = this.authTokenService.createToken(user.id);

    return this.mediator.publish(Events.forgetPassword, token);
  }
}
