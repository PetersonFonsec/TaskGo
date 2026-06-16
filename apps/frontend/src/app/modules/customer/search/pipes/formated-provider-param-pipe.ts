import { Pipe, PipeTransform } from '@angular/core';
import { CardProviderParams } from '@shared/components/ui/card-provider/card-provider.interface';

@Pipe({
  name: 'formatedProviderParam',
})
export class FormatedProviderParamPipe implements PipeTransform {

  transform(value: any): CardProviderParams {
    console.log(value);
    const {verified} = value;
    const {photoUrl, name} = value.user;
    const price = value.services[0].basePrice;
    const cardProviderParam: CardProviderParams = {
      favorite: false,
      thumb: photoUrl,
      title: name,
      verified,
      price,
    }

    return cardProviderParam;
  }

}
