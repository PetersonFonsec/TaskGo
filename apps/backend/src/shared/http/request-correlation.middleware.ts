import { randomUUID } from 'node:crypto';

import { NextFunction, Request, Response } from 'express';

import { getActiveTraceId } from '../../tracing';

export const REQUEST_ID_HEADER = 'x-request-id';

export type CorrelatedRequest = Request & {
  requestId?: string;
};

export function requestCorrelationMiddleware(
  request: CorrelatedRequest,
  response: Response,
  next: NextFunction,
) {
  const headerValue = request.headers[REQUEST_ID_HEADER];
  const requestId =
    (Array.isArray(headerValue) ? headerValue[0] : headerValue) ||
    getActiveTraceId() ||
    randomUUID();

  request.requestId = requestId;
  response.setHeader(REQUEST_ID_HEADER, requestId);
  next();
}

export function buildRequestAuditContext(request: CorrelatedRequest) {
  return {
    requestId: request.requestId || randomUUID(),
    ipAddress: request.ip || null,
    userAgent:
      typeof request.headers['user-agent'] === 'string'
        ? request.headers['user-agent']
        : null,
  };
}
