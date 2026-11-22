export interface Address {
  label: string;
  street: string;
  number: string;
  neighborhood?: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  cep: string;
}
