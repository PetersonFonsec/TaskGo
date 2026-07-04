import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { CustomException } from '../exceptions/custom.exception';
import { ExceptionInterface } from '../interfaces/exception.interface';
import { Request, Response } from 'express';
import { CorrelatedRequest } from '../http/request-correlation.middleware';

@Catch(BadRequestException, HttpException, CustomException)
export class CustomExceptionFilter implements ExceptionFilter {
  catch(exception: ExceptionInterface, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<CorrelatedRequest & Request>();

    let statusCode = exception.status ?? HttpStatus.BAD_REQUEST;
    let message = [exception.message];

    if (exception instanceof HttpException) {
      message = (exception as any).getResponse().message;
    }

    response.status(statusCode).json({
      statusCode,
      message,
      errorCode: exception.errorCode,
      errorTitle: exception.errorTitle,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId: request.requestId,
    });
  }
}
