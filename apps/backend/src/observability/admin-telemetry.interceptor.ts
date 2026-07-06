import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { catchError, finalize, throwError } from 'rxjs';

import {
  ADMIN_ACTOR_KEY,
  AdminRequest,
} from '../modules/admin/auth/admin-actor';
import { CorrelatedRequest } from '../shared/http/request-correlation.middleware';
import { AdminTelemetryService } from './admin-telemetry.service';

@Injectable()
export class AdminTelemetryInterceptor implements NestInterceptor {
  constructor(private readonly telemetry: AdminTelemetryService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const http = context.switchToHttp();
    const request = http.getRequest<
      AdminRequest & CorrelatedRequest & Request
    >();
    const response = http.getResponse<Response>();
    const startedAt = process.hrtime.bigint();
    let errorStatus: number | undefined;

    return next.handle().pipe(
      catchError((error) => {
        errorStatus = error?.status ?? error?.statusCode ?? 500;
        return throwError(() => error);
      }),
      finalize(() => {
        if (!request.path?.startsWith('/admin')) return;

        const latencyMs =
          Number(process.hrtime.bigint() - startedAt) / Number(1_000_000n);
        const actor = request[ADMIN_ACTOR_KEY];
        const statusCode = errorStatus ?? response.statusCode;
        const outcome =
          statusCode >= 500
            ? 'error'
            : statusCode >= 400
              ? 'denied'
              : 'success';

        this.telemetry.observeRequest({
          requestId: request.requestId,
          method: request.method,
          route: request.route?.path
            ? `${request.baseUrl ?? ''}${request.route.path}`
            : request.path,
          statusCode,
          latencyMs,
          adminId: actor?.id?.toString(),
          role: actor?.role,
          action: actionFromRequest(request),
          entityType: entityTypeFromRequest(request),
          entityId: request.params?.id,
          outcome,
        });
      }),
    );
  }
}

function actionFromRequest(request: Request) {
  if (request.method === 'POST' && /\/approve$/.test(request.path))
    return 'approve';
  if (request.method === 'POST' && /\/reject$/.test(request.path))
    return 'reject';
  if (request.method === 'POST' && /\/block$/.test(request.path))
    return 'block';
  if (request.method === 'POST' && /\/unblock$/.test(request.path))
    return 'unblock';
  if (request.path === '/admin/auth/login') return 'login';
  return undefined;
}

function entityTypeFromRequest(request: Request) {
  if (request.path.startsWith('/admin/providers')) return 'Provider';
  if (request.path.startsWith('/admin/audit-logs')) return 'AuditLog';
  if (request.path.startsWith('/admin/users')) return 'AdminUser';
  return undefined;
}
