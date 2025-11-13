export interface CustomerRegisterRequest {
  user: {
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
    }
  }
}

export class CustomerRegister implements CustomerRegisterRequest {
  user = {
    name: '',
    email: '',
    password: '',
    phone: '',
    cpf: '',
    type: '',
    address: {
      label: '',
      street: '',
      number: '',
      city: '',
      state: '',
      cep: '',
      lat: 0,
      lng: 0,
    }
  }
}

export interface ProviderRegisterRequest {
  provider: {
    name: string,
    email: string,
    password: string,
    phone: string,
    bio: string,
    pagarmeRecipientId: null,
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
    }
  },
  services: string[]
}

export class ProviderRegister implements ProviderRegisterRequest {
  provider = {
    name: '',
    email: '',
    password: '',
    phone: '',
    bio: '',
    pagarmeRecipientId: null,
    cpf: '',
    type: '',
    address: {
      label: '',
      street: '',
      number: '',
      city: '',
      state: '',
      cep: '',
      lat: 0,
      lng: 0
    }
  }
  services = []
}
