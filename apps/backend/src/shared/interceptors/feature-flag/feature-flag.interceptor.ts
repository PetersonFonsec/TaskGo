import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { FeatureFlagService } from '../../services/feature-flag.service';

@Injectable()
export class FeatureFlagInterceptor implements NestInterceptor {
  constructor(private readonly featureFlagService: FeatureFlagService) {}

  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle();
  }
}
