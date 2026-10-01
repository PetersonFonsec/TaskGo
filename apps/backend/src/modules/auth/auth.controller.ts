import { PrismaService } from '../../prisma/prisma.service';
import { Response } from 'express';
import {
  writeSessionCookie,
  clearSessionCookie,
} from '../../shared/security/session-cookie';
import { RecoveryRateLimitGuard } from './recovery-rate-limit.guard';
import { ProviderOnly } from '../../shared/decorators/roles.decorator';
import { User } from '../../shared/decorators/user.decorator';
import { CommandBus } from '@nestjs/cqrs/dist/command-bus';
import {
  Body,
  Controller,
  Get,
  Post,
  Res,
  Optional,
  UseGuards,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs/dist/query-bus';
import { plainToClass } from 'class-transformer';
import type { CustomerAuthSession } from '@taskgo/shared';

import { ForgotPasswordCommand } from './commands/forgot-password/forgot-password.command';
import { CreateUserCommand } from '../user/commands/create-user/create-user.command';
import { LoginQuery } from './queries/login/login.query';
import { AuthTokenService } from './auth-token.service';
import { AuthLoginDTO } from './queries/login/login.dto';
import { AuthForgetDTO } from './commands/forgot-password/forgot-password.dto';
import { AuthRegisterDTO } from './dto/auth-register.dto';
import { GetUserQuery } from '../user/queries/get-user/get-user.query';
import { Public } from '../../shared/decorators/public.decorator';
import { ProviderHomeService } from './provider-home.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly tokenService: AuthTokenService,
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly providerHomeService: ProviderHomeService,
    @Optional() private readonly prisma?: PrismaService,
  ) {}

  @ProviderOnly()
  @Get('provider-home')
  providerHome(@User('id') providerId: string) {
    return this.providerHomeService.getForProvider(BigInt(providerId));
  }

  @Public()
  @Post('login')
  async login(
    @Body() body: AuthLoginDTO,
    @Res({ passthrough: true }) response?: Response,
  ) {
    const query = plainToClass(LoginQuery, body);
    const result = await this.queryBus.execute(query);

    const { access_token } = await this.tokenService.createToken(
      result.id.toString(),
    );
    const providerHome =
      result.type === 'PRESTADOR'
        ? await this.providerHomeService.getForProvider(BigInt(result.id))
        : undefined;

    if (response) writeSessionCookie(response, access_token);
    const session: CustomerAuthSession = {
      user: result,
      access_token: response ? '' : access_token,
    };

    return {
      ...session,
      ...(providerHome ? { providerHome } : {}),
    };
  }

  @Public()
  @Post('register')
  async register(
    @Body() body: AuthRegisterDTO,
    @Res({ passthrough: true }) response?: Response,
  ) {
    const command = plainToClass(CreateUserCommand, body);
    const userId = await this.commandBus.execute(command);

    const query = plainToClass(GetUserQuery, { id: BigInt(userId) });
    const user = await this.queryBus.execute(query);

    const { access_token } = await this.tokenService.createToken(userId);
    if (response) writeSessionCookie(response, access_token);
    const session: CustomerAuthSession = {
      user,
      access_token: response ? '' : access_token,
    };

    return session;
  }

  @Post('logout')
  async logout(
    @Res({ passthrough: true }) response: Response,
    @User('id') id: string,
  ) {
    await this.prisma?.user.update({
      where: { id: BigInt(id) },
      data: { passwordChangedAt: new Date() },
    });
    clearSessionCookie(response);
    return { success: true };
  }

  @Get('me')
  async me(@User('id') id: string) {
    return this.queryBus.execute(
      plainToClass(GetUserQuery, { id: BigInt(id) }),
    );
  }

  @Public()
  @UseGuards(RecoveryRateLimitGuard)
  @Post('forget')
  async forget(@Body() body: AuthForgetDTO) {
    const command = plainToClass(ForgotPasswordCommand, body);
    return await this.commandBus.execute(command);
  }
}
