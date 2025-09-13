import { ErrorTypesEnum } from "@shared/enums/errors-types.enum";
import { CustomException } from "./custom.exception";

export class UserException extends CustomException {
  constructor() {
    super(
      'Usuário inválido, por favor verifique os dados informados.',
      'UserException',
      'Usuário inválido!',
      'USER_ERROR',
      ErrorTypesEnum.VALIDATION
    );
  }
}
