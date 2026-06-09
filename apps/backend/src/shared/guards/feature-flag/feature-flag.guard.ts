import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';

import { FeatureFlagService } from '../../services/feature-flag.service';
import { Reflector } from '@nestjs/core/services/reflector.service';
import { IS_FEATURE_FLAG } from '../../decorators/feature-flag.decorator';

@Injectable()
export class FeatureFlagGuard implements CanActivate {

  constructor(
    private readonly featureFlagService: FeatureFlagService,
    private reflector: Reflector,
  ) { }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
      const isPublic = this.reflector.getAllAndOverride<boolean>(IS_FEATURE_FLAG, [
        context.getHandler(),
        context.getClass(),
      ]);
      
      if (isPublic) return true;
    return true;
  }
}
