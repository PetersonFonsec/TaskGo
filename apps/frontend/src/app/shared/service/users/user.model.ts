export interface UserAddress {
  id: string;
  label: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isPrimary: boolean;
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: string;
  photoUrl: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  pendingEmail?: string | null;
  pendingPhone?: string | null;
  createdAt: {};
  updatedAt: {};
  cpf: string;
  addresses: UserAddress[];
  orders: any[];
  reviews: any[];
  provider: {
    id: string;
    bio: string;
    ratingAvg: {
      s: number;
      e: number;
      d: any[];
    };
    ratingCount: any;
    verified: boolean;
    createdAt: {};
    updatedAt: {};
    pagarmeRecipientId: null;
  };
}
