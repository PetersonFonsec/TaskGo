import { Module, forwardRef } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { PrismaModule } from "@prisma/prisma.module";
import Mediator from "@shared/events/mediator";

import { AddressModule } from "../address/address.module";
import { AuthTokenService } from "./auth-token.service";
import { AuthController } from "./auth.controller";
import { UserModule } from "../user/user.module";
import { AuthService } from "./auth.service";

@Module({
  controllers: [
    AuthController
  ],
  providers: [
    AuthService,
    AuthTokenService,
    Mediator
  ],
  imports: [
    forwardRef(() => UserModule),
    forwardRef(() => AddressModule),
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET
    }),
  ],
  exports: [
    AuthService,
    AuthTokenService
  ]
})
export class AuthModule { }
