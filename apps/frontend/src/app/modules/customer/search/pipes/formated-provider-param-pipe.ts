import { Pipe, PipeTransform } from '@angular/core';
import { CardProviderParams } from '@shared/components/ui/card-provider/card-provider.interface';

@Pipe({ name: 'formatedProviderParam' })
export class FormatedProviderParamPipe implements PipeTransform {
  transform(value: any): CardProviderParams {
    const price = Number(value?.services?.[0]?.basePrice ?? value?.services?.[0]?.price ?? 0);
    return {
      favorite: false,
      thumb: value?.user?.photoUrl ?? '',
      title: value?.user?.name ?? 'Profissional Proxi',
      verified: value?.verified ?? value?.user?.provider?.verified ?? false,
      price: Number.isFinite(price) ? price : 0,
    };
  }
}
