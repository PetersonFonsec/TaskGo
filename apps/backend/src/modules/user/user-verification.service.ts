import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class UserVerificationService {
  private readonly logger = new Logger(UserVerificationService.name);
  private readonly pendingCodes = new Map<string, string>();

  private buildKey(id: bigint, type: 'email' | 'phone') {
    return `${type}:${id.toString()}`;
  }

  async requestEmailVerification(userId: bigint, email: string): Promise<void> {
    const code = this.generateVerificationCode();
    this.pendingCodes.set(this.buildKey(userId, 'email'), code);
    this.logger.debug(`Email verification requested for user ${userId} and email ${email}`);
  }

  async requestPhoneVerification(userId: bigint, phone: string): Promise<void> {
    const code = this.generateVerificationCode();
    this.pendingCodes.set(this.buildKey(userId, 'phone'), code);
    this.logger.debug(`Phone verification requested for user ${userId} and phone ${phone}`);
  }

  async verifyEmailCode(userId: bigint, code: string): Promise<boolean> {
    return this.verifyCode(userId, 'email', code);
  }

  async verifyPhoneCode(userId: bigint, code: string): Promise<boolean> {
    return this.verifyCode(userId, 'phone', code);
  }

  private generateVerificationCode(): string {
    return Math.random().toString(36).replace(/[^A-Z0-9]/gi, '').slice(0, 6).toUpperCase();
  }

  private verifyCode(userId: bigint, type: 'email' | 'phone', code: string): boolean {
    const key = this.buildKey(userId, type);
    const expected = this.pendingCodes.get(key);
    if (!expected || expected !== code) {
      return false;
    }
    this.pendingCodes.delete(key);
    return true;
  }
}
