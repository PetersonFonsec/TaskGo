import { RecoveryRateLimitGuard } from './recovery-rate-limit.guard';
import { ProviderOnly } from '../../shared/decorators/roles.decorator';
import { User } from '../../shared/decorators/user.decorator';
import { CommandBus } from '@nestjs/cqrs/dist/command-bus';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
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
import { RefreshTokenService } from './refresh-token.service';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly tokenService: AuthTokenService,
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly providerHomeService: ProviderHomeService,
    private readonly refreshTokens: RefreshTokenService,
  ) {}

  @ProviderOnly()
  @Get('provider-home')
  providerHome(@User('id') providerId: string) {
    return this.providerHomeService.getForProvider(BigInt(providerId));
  }

  @Public()
  @Post('login')
  async login(@Body() body: AuthLoginDTO) {
    const query = plainToClass(LoginQuery, body);
    const result = await this.queryBus.execute(query);

    const { access_token } = await this.tokenService.createToken(
      result.id.toString(),
    );
    const { refresh_token } = await this.refreshTokens.issue(BigInt(result.id));
    const providerHome =
      result.type === 'PRESTADOR'
        ? await this.providerHomeService.getForProvider(BigInt(result.id))
        : undefined;

    const session: CustomerAuthSession = {
      user: result,
      access_token,
      refresh_token,
    };

    return {
      ...session,
      ...(providerHome ? { providerHome } : {}),
    };
  }

  @Public()
  @Post('register')
  async register(@Body() body: AuthRegisterDTO) {
    const command = plainToClass(CreateUserCommand, body);
    const userId = await this.commandBus.execute(command);

    const query = plainToClass(GetUserQuery, { id: BigInt(userId) });
    const user = await this.queryBus.execute(query);

    const { access_token } = await this.tokenService.createToken(userId);
    const { refresh_token } = await this.refreshTokens.issue(BigInt(userId));
    const session: CustomerAuthSession = { user, access_token, refresh_token };

    return session;
  }

  /** Troca um refresh token válido por um novo par (rotação). */
  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body() body: RefreshTokenDto) {
    const { userId, refresh_token } = await this.refreshTokens.rotate(
      body.refresh_token,
    );
    const { access_token } = await this.tokenService.createToken(userId);
    return { access_token, refresh_token };
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  async logout(@Body() body: RefreshTokenDto): Promise<void> {
    await this.refreshTokens.revoke(body.refresh_token);
  }

  @Public()
  @UseGuards(RecoveryRateLimitGuard)
  @Post('forget')
  async forget(@Body() body: AuthForgetDTO) {
    const command = plainToClass(ForgotPasswordCommand, body);
    return await this.commandBus.execute(command);
  }
}
