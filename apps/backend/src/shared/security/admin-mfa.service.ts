import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';

export function totp(secret: string, step: number): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const char of secret.toUpperCase()) {
    const index = alphabet.indexOf(char);
    if (index < 0) throw new Error('Invalid Base32 secret');
    bits += index.toString(2).padStart(5, '0');
  }
  const key = Buffer.from(
    (bits.match(/.{8}/g) ?? []).map((byte) => parseInt(byte, 2)),
  );
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const mac = createHmac('sha1', key).update(counter).digest();
  const offset = mac[mac.length - 1] & 15;
  return String((mac.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(
    6,
    '0',
  );
}
@Injectable()
export class AdminMfaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}
  async verify(id: bigint, code?: string) {
    const secrets: Record<string, string> = JSON.parse(
      this.config.get<string>('ADMIN_MFA_SECRETS') ?? '{}',
    );
    const secret = secrets[id.toString()];
    if (!secret && this.config.get('app.nodeEnv') !== 'production') return;
    if (!secret || !code || !/^\d{6}$/.test(code))
      throw new ForbiddenException('Invalid administrative credentials');
    const current = Math.floor(Date.now() / 30000);
    const step = [current, current - 1, current + 1].find((value) =>
      timingSafeEqual(Buffer.from(totp(secret, value)), Buffer.from(code)),
    );
    if (step === undefined)
      throw new ForbiddenException('Invalid administrative credentials');
    const claimed = await this.prisma.adminUser.updateMany({
      where: { id, lastMfaStep: { lt: step } },
      data: { lastMfaStep: step },
    });
    if (claimed.count !== 1)
      throw new ForbiddenException('Invalid administrative credentials');
  }
}
