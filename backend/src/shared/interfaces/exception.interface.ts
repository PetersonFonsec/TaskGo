import { ErrorTypesEnum } from "@shared/enums/errors-types.enum";

export interface ExceptionInterface {
  name: string;
  message: string;
  errorTitle: string;
  errorCode: string;
  errorType: ErrorTypesEnum;
}
