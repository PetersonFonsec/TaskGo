import { ErrorTypesEnum } from "@shared/enums/errors-types.enum";
import { CustomException } from "./custom.exception";

export class PhoneException extends CustomException {
  constructor() {
    super(
      'Número de telefone inválido, por favor verifique o número informado.',
      'PhoneException',
      'Número de telefone inválido!',
      'PHONE_ERROR',
      ErrorTypesEnum.VALIDATION
    );
  }
}
