import { ErrorTypesEnum } from "@shared/enums/errors-types.enum";
import { ExceptionInterface } from "@shared/interfaces/exception.interface";

export class CustomException extends Error implements ExceptionInterface {
  name = 'CustomException';
  errorTitle = 'User Error';
  errorCode = 'USER_ERROR';
  errorType = ErrorTypesEnum.INTERNAL_SERVER;

  constructor(message: string, name = 'CustomException', errorTitle = 'User Error', errorCode = 'USER_ERROR', errorType = ErrorTypesEnum.INTERNAL_SERVER) {
    super(message);
    this.name = name;
    this.errorTitle = errorTitle;
    this.errorCode = errorCode;
    this.errorType = errorType;
  }
}
