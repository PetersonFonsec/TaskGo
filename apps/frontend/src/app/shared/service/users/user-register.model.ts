import type {
  UserRegistrationAddressRequest,
  UserRegistrationRequest,
  UserRegistrationSocialRequest,
} from '@taskgo/shared';

export type UserRegisterDraft = Omit<
  UserRegistrationRequest,
  'address' | 'social' | 'services' | 'type'
> & {
  type: '' | UserRegistrationRequest['type'];
  address: Required<
    Pick<
      UserRegistrationAddressRequest,
      'label' | 'street' | 'number' | 'city' | 'state' | 'cep' | 'lat' | 'lng'
    >
  > & {
    neighborhood: string;
    complement: string;
  };
  social: Required<
    Pick<
      UserRegistrationSocialRequest,
      'whatsapp' | 'instagram' | 'facebook' | 'linkdin'
    >
  >;
  services: unknown[];
};

export class UserRegister implements UserRegisterDraft {
  password = '';
  email = '';
  phone = '';
  name = '';
  type: UserRegisterDraft['type'] = '';
  cpf = '';
  address = {
    label: '',
    street: '',
    number: '',
    city: '',
    state: '',
    cep: '',
    lat: 0,
    lng: 0,
    neighborhood: '',
    complement: '',
  };
  social = { whatsapp: '', instagram: '', facebook: '', linkdin: '' };
  services: unknown[] = []
}
