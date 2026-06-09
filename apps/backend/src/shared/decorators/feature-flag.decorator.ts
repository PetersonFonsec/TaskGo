import { SetMetadata } from '@nestjs/common';

export const FeatureFlag = (...args: string[]) => SetMetadata('feature-flag', args);

export const IS_FEATURE_FLAG = 'isFeatureFlag';
export const Public = () => SetMetadata(IS_FEATURE_FLAG, true);
