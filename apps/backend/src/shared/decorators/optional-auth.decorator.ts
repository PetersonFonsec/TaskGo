import { applyDecorators, SetMetadata } from '@nestjs/common';

import { IS_PUBLIC_KEY } from './public.decorator';

export const IS_OPTIONAL_AUTH_KEY = 'isOptionalAuth';

export function OptionalAuth() {
  return applyDecorators(
    SetMetadata(IS_PUBLIC_KEY, true),
    SetMetadata(IS_OPTIONAL_AUTH_KEY, true),
  );
}
