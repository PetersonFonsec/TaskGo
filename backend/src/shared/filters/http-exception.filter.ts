import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { CustomException } from '@shared/exceptions/custom.exception';
import { ExceptionInterface } from '@shared/interfaces/exception.interface';
import { Request, Response } from 'express';

@Catch(BadRequestException, HttpException, CustomException)
export class CustomExceptionFilter implements ExceptionFilter {
  catch(exception:  ExceptionInterface, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let message = [];
    if(exception instanceof HttpException){
      message = (exception.getResponse() as any).message;
    }

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    response.status(status).json({
      statusCode: 420,
      message,
      errorCode: exception.errorCode,
      errorTitle: exception.errorTitle,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
