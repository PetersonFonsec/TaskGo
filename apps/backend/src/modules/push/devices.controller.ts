import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';

import type { AuthenticatedIdentity } from '../../shared/auth/authenticated-identity';
import { User } from '../../shared/decorators/user.decorator';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { PushService } from './push.service';

/** Aparelhos que recebem push do usuário autenticado (app e web push). */
@Controller('devices')
export class DevicesController {
  constructor(private readonly push: PushService) {}

  @Post()
  @HttpCode(204)
  async register(
    @Body() body: RegisterDeviceDto,
    @User() user: AuthenticatedIdentity,
  ): Promise<void> {
    await this.push.registerDevice(
      BigInt(user.id),
      body.token,
      body.platform,
      user.sessionId ?? null,
    );
  }

  @Delete(':token')
  @HttpCode(204)
  async unregister(
    @Param('token') token: string,
    @User() user: AuthenticatedIdentity,
  ): Promise<void> {
    await this.push.unregisterDevice(
      BigInt(user.id),
      token,
      user.sessionId ?? null,
    );
  }
}
