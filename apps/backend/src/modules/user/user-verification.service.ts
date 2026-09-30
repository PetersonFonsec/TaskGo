import { Injectable, Logger } from '@nestjs/common';
import { randomInt } from 'node:crypto';

import { NotificationService } from '../notification/notification.service';

@Injectable()
export class UserVerificationService {
  private readonly logger = new Logger(UserVerificationService.name);
  private readonly pendingCodes = new Map<string, string>();

  constructor(private readonly notifications: NotificationService) {}

  private buildKey(id: bigint, type: 'email' | 'phone') {
    return `${type}:${id.toString()}`;
  }

  async requestEmailVerification(userId: bigint, email: string): Promise<void> {
    const code = this.generateVerificationCode();
    this.pendingCodes.set(this.buildKey(userId, 'email'), code);
    await this.notifications.sendEmailVerificationCode(email, code);
  }

  async requestPhoneVerification(userId: bigint, phone: string): Promise<void> {
    const code = this.generateVerificationCode();
    this.pendingCodes.set(this.buildKey(userId, 'phone'), code);
    this.logger.debug(
      `Phone verification requested for user ${userId} and phone ${phone}`,
    );
  }

  async verifyEmailCode(userId: bigint, code: string): Promise<boolean> {
    return this.verifyCode(userId, 'email', code);
  }

  async verifyPhoneCode(userId: bigint, code: string): Promise<boolean> {
    return this.verifyCode(userId, 'phone', code);
  }

  private generateVerificationCode(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from(
      { length: 6 },
      () => alphabet[randomInt(alphabet.length)],
    ).join('');
  }

  private verifyCode(
    userId: bigint,
    type: 'email' | 'phone',
    code: string,
  ): boolean {
    const key = this.buildKey(userId, type);
    const expected = this.pendingCodes.get(key);
    if (!expected || expected !== code) {
      return false;
    }
    this.pendingCodes.delete(key);
    return true;
  }
}
