import { ErrorTypesEnum } from "@shared/enums/errors-types.enum";
import { CustomException } from "./custom.exception";

export class UserExistException extends CustomException {
  constructor() {
    super(
      'Usuário já existe, por favor verifique os dados informados.',
      'UserExistException',
      'Usuário já existe!',
      'USER_ERROR',
      ErrorTypesEnum.VALIDATION
    );
  }
}
