import { registerAs } from '@nestjs/config';

export default registerAs('payment', () => ({
  baseUrl: process.env.PAGARME_BASE_URL ?? 'https://api.pagar.me/core/v5',
  secretKey: process.env.PAGARME_SECRET_KEY ?? '',
  platformRecipientId: process.env.PAGARME_PLATFORM_RECIPIENT_ID,
  simulated: process.env.PAYMENTS_SIMULATION === 'true',
  defaultPlatformFeePct: Number(process.env.DEFAULT_PLATFORM_FEE_PCT ?? 0.12),
}));
