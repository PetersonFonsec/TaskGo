import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  publicOrigins: process.env.PUBLIC_FRONTEND_ORIGINS,
  backofficeOrigins: process.env.BACKOFFICE_FRONTEND_ORIGINS,
  favoritesMvpEnabled:
    (process.env.FAVORITES_MVP ?? process.env.favorites_mvp) !== 'false',
}));
