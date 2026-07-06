import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

const DEVELOPMENT_ENVS = new Set(['development', 'dev', 'test']);

export type CorsRuntimeConfig = {
  nodeEnv?: string;
  publicOrigins?: string;
  backofficeOrigins?: string;
};

export function parseCorsOrigins(config: CorsRuntimeConfig = {}) {
  const origins = [
    ...splitOrigins(
      config.publicOrigins ?? process.env.PUBLIC_FRONTEND_ORIGINS,
    ),
    ...splitOrigins(
      config.backofficeOrigins ?? process.env.BACKOFFICE_FRONTEND_ORIGINS,
    ),
  ];

  return Array.from(new Set(origins));
}

export function isCorsOriginAllowed(
  origin: string | undefined,
  config: CorsRuntimeConfig = {},
) {
  const nodeEnv = config.nodeEnv ?? process.env.NODE_ENV ?? 'development';
  if (!origin) return true;
  if (DEVELOPMENT_ENVS.has(nodeEnv)) return true;

  return parseCorsOrigins(config).includes(origin);
}

export function buildCorsOptions(config: CorsRuntimeConfig = {}): CorsOptions {
  const nodeEnv = config.nodeEnv ?? process.env.NODE_ENV ?? 'development';

  if (DEVELOPMENT_ENVS.has(nodeEnv)) {
    return {
      origin: true,
      credentials: true,
    };
  }

  const allowedOrigins = parseCorsOrigins(config);

  return {
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('CORS origin is not allowed'), false);
    },
  };
}

function splitOrigins(value: string | undefined) {
  return (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => origin.replace(/\/$/, ''));
}
