import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { PrismaService } from 'prisma/prisma.service';
import { ERROR_MESSAGES } from '../auth/auth.messages';

@Injectable()
export class UserValidateService {
  constructor(private readonly prisma: PrismaService) { }

  async validPassword(password, email) {

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.loginError);
    }

    const matchPassword = await bcrypt.compare(password, user.passwordHash);
    if (!matchPassword) {
      throw new NotFoundException(ERROR_MESSAGES.loginError);
    }

    return user;
  }
}
