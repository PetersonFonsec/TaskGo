import { Pipe, PipeTransform } from '@angular/core';
import { UserRegister } from '@shared/service/users/user-register.model';

@Pipe({
  name: 'completeSteps',
  pure: false
})
export class CompleteStepsPipe implements PipeTransform {

  transform(value: UserRegister, step: string): boolean {

    if(step === 'profile'){
      return !!(
        value.password &&
        value.email &&
        value.name &&
        value.cpf
      );
    }

    return false;
  }

}
