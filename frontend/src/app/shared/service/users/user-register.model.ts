export interface UserRegisterRequest {
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