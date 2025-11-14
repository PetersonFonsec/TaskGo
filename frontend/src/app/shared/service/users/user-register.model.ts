export interface UserRegisterRequest {
  name: string,
  email: string,
  password: string,
  phone: string,
  cpf: string,
  type: string,
  address: {
    label: string,
    street: string,
    number: string,
    city: string,
    state: string,
    cep: string,
    lat: number,
    lng: number
  },
  social: {
    whatsapp: string,
    instagram: string,
    facebook: string,
    linkdin: string
  },
  services: any[]
}

export class UserRegister implements UserRegisterRequest {
  password = '';
  email = '';
  phone = '';
  name = '';
  type = '';
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
  };
  social = { whatsapp: '', instagram: '', facebook: '', linkdin: '' };
  services = []
}
