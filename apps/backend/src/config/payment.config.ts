import { registerAs } from '@nestjs/config';

export default registerAs('payment', () => ({
  secretKey: process.env.ABACATEPAY_API_KEY ?? '',
  webhookSecret: process.env.ABACATEPAY_WEBHOOK_SECRET ?? '',
  devMode: process.env.ABACATEPAY_DEV_MODE === 'true',
  simulated: process.env.PAYMENTS_SIMULATION === 'true',
  defaultPlatformFeePct: Number(process.env.DEFAULT_PLATFORM_FEE_PCT ?? 0.12),
}));
