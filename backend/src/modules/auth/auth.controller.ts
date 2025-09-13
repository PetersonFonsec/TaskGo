import { Body, Controller, Post } from "@nestjs/common";

import { AuthRegisterConsumerDTO } from "./dto/auth-register-consumer.dto";
import { AuthForgetDTO } from "./dto/authForget.dto";
import { AuthLoginDTO } from "./dto/authLogin.dto";
import { AuthService } from "./auth.service";
import { AuthRegisterProviderDTO } from "./dto/auth-register-provider.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post("login")
  async login(@Body() body: AuthLoginDTO) {
    return this.authService.login(body)
  }

  @Post("register-consumer")
  async registerConsumer(@Body() body: AuthRegisterConsumerDTO) {
    return this.authService.registerConsumer(body);
  }

  @Post("register-provider")
  async registerProvider(@Body() body: AuthRegisterProviderDTO) {
    return this.authService.registerProvider(body);
  }

  @Post("forget")
  async forget(@Body() body: AuthForgetDTO) {
    return this.authService.forgetPassword(body);
  }
}
