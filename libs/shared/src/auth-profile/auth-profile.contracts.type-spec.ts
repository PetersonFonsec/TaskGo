import type {
  AdminAuthSession,
  CustomerAuthSession,
  PublicUserProfile,
  UserProfileUpdateRequest,
  UserRegistrationRequest,
} from './index';

const publicProfile: PublicUserProfile = {
  id: '42',
  name: 'Customer User',
  email: 'customer@example.com',
  phone: '+5511999999999',
  cpf: '12345678901',
  type: 'CUSTOMER',
  createdAt: '2026-07-09T12:00:00.000Z',
  updatedAt: '2026-07-09T12:00:00.000Z',
};

const customerSession: CustomerAuthSession = {
  access_token: 'token',
  user: publicProfile,
};

const adminSession: AdminAuthSession = {
  access_token: 'admin-token',
  operator: {
    id: '1',
    name: 'Admin Operator',
    email: 'admin@example.com',
    role: 'ADMINISTRATOR',
    active: true,
    activatedAt: null,
  },
};

const registration: UserRegistrationRequest = {
  name: 'Provider User',
  email: 'provider@example.com',
  password: 'secret',
  phone: '+5511888888888',
  cpf: '10987654321',
  type: 'PRESTADOR',
  address: {
    label: 'Home',
    street: 'Main Street',
    city: 'Sao Paulo',
    state: 'SP',
    cep: '01001000',
  },
  services: ['7'],
};

const profileUpdate: UserProfileUpdateRequest = {
  name: 'Updated User',
  email: 'updated@example.com',
  phone: '+5511777777777',
};

void customerSession;
void adminSession;
void registration;
void profileUpdate;

const rejectsPassword: PublicUserProfile = {
  ...publicProfile,
  // @ts-expect-error Public profiles must not expose password fields.
  password: 'secret',
};

const rejectsBigInt: PublicUserProfile = {
  ...publicProfile,
  // @ts-expect-error Public ids must be JSON strings.
  id: 42n,
};

const rejectsDate: PublicUserProfile = {
  ...publicProfile,
  // @ts-expect-error Public timestamps must be JSON strings.
  createdAt: new Date(),
};

void rejectsPassword;
void rejectsBigInt;
void rejectsDate;
