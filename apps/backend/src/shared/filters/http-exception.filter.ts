import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

import { CustomException } from '../exceptions/custom.exception';
import { CorrelatedRequest } from '../http/request-correlation.middleware';

type ErrorEnvelope = {
  statusCode: number;
  message: string[];
  errorCode?: string;
  errorTitle?: string;
  timestamp: string;
  path: string;
  requestId?: string;
};

@Catch()
export class CustomExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<CorrelatedRequest & Request>();
    const error = this.normalize(exception);

    const envelope: ErrorEnvelope = {
      ...error,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId: request.requestId,
    };

    response.status(error.statusCode).json(envelope);
  }

  private normalize(exception: unknown) {
    if (exception instanceof CustomException) {
      return {
        statusCode: exception.status,
        message: [exception.message],
        errorCode: exception.errorCode,
        errorTitle: exception.errorTitle,
      };
    }

    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      return {
        statusCode: exception.getStatus(),
        message: this.extractMessages(response, exception.message),
        errorCode: this.readString(response, 'errorCode'),
        errorTitle: this.readString(response, 'errorTitle'),
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: ['Internal server error'],
      errorCode: 'INTERNAL_SERVER_ERROR',
      errorTitle: 'Internal Server Error',
    };
  }

  private extractMessages(response: string | object, fallback: string) {
    if (typeof response === 'string') return [response];
    if (!response || typeof response !== 'object') return [fallback];

    const message = Reflect.get(response, 'message');
    if (Array.isArray(message)) {
      return message.filter((item): item is string => typeof item === 'string');
    }
    return typeof message === 'string' ? [message] : [fallback];
  }

  private readString(response: string | object, key: string) {
    if (!response || typeof response !== 'object') return undefined;
    const value = Reflect.get(response, key);
    return typeof value === 'string' ? value : undefined;
  }
}
