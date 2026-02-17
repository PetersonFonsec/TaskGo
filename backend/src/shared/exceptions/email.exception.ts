import { ErrorTypesEnum } from "../../shared/enums/errors-types.enum";
import { CustomException } from "./custom.exception";

export class EmailException extends CustomException {
  constructor() {
    super(
      'Email invalido, por favor verifique o endereço de email informado.',
      'EmailException',
      'Email invalido!',
      'EMAIL_ERROR',
      ErrorTypesEnum.VALIDATION
    );
  }
}
