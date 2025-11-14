import { Pipe, PipeTransform } from '@angular/core';
import { CustomerRegisterRequest, ProviderRegisterRequest } from '@shared/service/users/user-register.model';

@Pipe({
  name: 'completeSteps'
})
export class CompleteStepsPipe implements PipeTransform {

  transform(value: CustomerRegisterRequest | ProviderRegisterRequest, step: any): boolean {
    return false;
  }

}
