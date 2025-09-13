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

    let statusCode = exception.status ?? HttpStatus.BAD_REQUEST;
    let message = [exception.message];

    if(exception instanceof HttpException){
      message = (exception as any).getResponse().message;
      status = (exception as any).getStatus();
    }

    response.status(statusCode).json({
      statusCode,
      message,
      errorCode: exception.errorCode,
      errorTitle: exception.errorTitle,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
