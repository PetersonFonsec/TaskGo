import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  jwtSecret: process.env.JWT_SECRET as string,
  expiresIn: process.env.EXPIRES_IN ?? '1d',
  invitationTtlHours: Number(process.env.ADMIN_INVITATION_TTL_HOURS ?? 24),
  invitationUrl:
    process.env.ADMIN_INVITATION_URL ??
    process.env.BACKOFFICE_INVITATION_URL ??
    'http://localhost:4200/admin/activate',
}));
