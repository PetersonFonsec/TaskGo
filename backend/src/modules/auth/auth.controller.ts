import { Body, Controller, Post } from "@nestjs/common";

import { AuthRegisterDTO } from "./dto/authRegister.dto";
import { AuthForgetDTO } from "./dto/authForget.dto";
import { AuthLoginDTO } from "./dto/authLogin.dto";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post("login")
  async login(@Body() body: AuthLoginDTO) {
    return this.authService.login(body)
  }

  @Post("register-consumer")
  async registerConsumer(@Body() body: AuthRegisterDTO) {
    return this.authService.register(body);
  }

  @Post("register-provider")
  async registerProvider(@Body() body: AuthRegisterDTO) {
    return this.authService.register(body);
  }

  @Post("forget")
  async forget(@Body() body: AuthForgetDTO) {
    return this.authService.forgetPassword(body);
  }
}
