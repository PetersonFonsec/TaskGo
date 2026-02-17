import { ErrorTypesEnum } from "../../shared/enums/errors-types.enum";
import { CustomException } from "./custom.exception";

export class CPFException extends CustomException {
  constructor() {
    super(
      'CPF invalido, por favor verifique o número informado.',
      'CPFException',
      'CPF invalido!',
      'CPF_ERROR',
      ErrorTypesEnum.VALIDATION
    );
  }
}
