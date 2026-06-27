import { Module, forwardRef } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { JwtModule } from "@nestjs/jwt";

import { PrismaModule } from "../../prisma/prisma.module";

import { AuthTokenService } from "./auth-token.service";
import { AuthController } from "./auth.controller";
import { UserModule } from "../user/user.module";
import { AuthCommands } from "./commands";
import { AuthQueries } from "./queries";
import { ProviderHomeService } from './provider-home.service';

@Module({
  controllers: [
    AuthController
  ],
  providers: [
    AuthTokenService,
    ProviderHomeService,
    ...AuthCommands,
    ...AuthQueries
  ],
  imports: [
    forwardRef(() => UserModule),
    PrismaModule,
    CqrsModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
  ],
  exports: [
    AuthTokenService
  ]
})
export class AuthModule { }
