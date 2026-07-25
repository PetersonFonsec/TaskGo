import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { TOKEN_KEY } from '../../modules/auth/auth.guard';
import type { AuthenticatedIdentity } from '../auth/authenticated-identity';

export function getAuthenticatedIdentity(request: {
  [TOKEN_KEY]?: AuthenticatedIdentity;
}): AuthenticatedIdentity | null {
  return request[TOKEN_KEY] ?? null;
}

export const User = createParamDecorator(
  (
    field: keyof AuthenticatedIdentity | undefined,
    context: ExecutionContext,
  ) => {
    const request = context.switchToHttp().getRequest();
    const identity = getAuthenticatedIdentity(request);
    if (!identity) return null;
    if (field) return identity[field];
    return identity;
  },
);
