import type {
  CustomerAuthSession,
  ProviderBankAccountUpdateRequest,
  ProviderPayoutStatusResponse,
  ProviderProfileCompletionItem,
  ProviderProfileCompletionResponse,
  ProviderSocialLinksUpdateRequest,
  PublicUserProfile,
} from '../index';

const bankAccountInput: ProviderBankAccountUpdateRequest = {
  holderName: 'Provider',
  holderType: 'INDIVIDUAL',
  holderDocument: '12345678901',
  bankCode: '001',
  branchNumber: '1234',
  branchCheckDigit: null,
  accountNumber: '123456',
  accountCheckDigit: '7',
  accountType: 'CHECKING',
};

const completion: ProviderProfileCompletionResponse = {
  payoutReady: false,
  allComplete: false,
  required: { completed: 0, total: 1 },
  recommended: { completed: 0, total: 3 },
  items: [
    { id: 'BANK_ACCOUNT', status: 'PENDING', requiredForPayout: true },
    { id: 'PHOTO', status: 'PROCESSING', requiredForPayout: false },
    { id: 'SOCIAL_LINKS', status: 'COMPLETE', requiredForPayout: false },
    { id: 'ADDRESS', status: 'ERROR', requiredForPayout: false },
  ],
};

const socialLinks: ProviderSocialLinksUpdateRequest = {
  whatsapp: null,
  instagram: '@provider',
  facebook: null,
  linkedin: 'provider',
};

const rejectsLegacySocialField: ProviderSocialLinksUpdateRequest = {
  // @ts-expect-error The canonical contract uses linkedin.
  linkdin: 'provider',
};

const rejectsFrontendDestination: ProviderProfileCompletionItem = {
  id: 'PHOTO',
  status: 'PENDING',
  requiredForPayout: false,
  // @ts-expect-error Frontend destinations are not part of API items.
  destination: '/provider/profile/photo',
};

const rejectsRawAccountNumber: ProviderPayoutStatusResponse = {
  syncStatus: 'READY',
  payoutReady: true,
  bankAccount: null,
  updatedAt: null,
  // @ts-expect-error Payout responses must not expose raw account numbers.
  accountNumber: '123456',
};

const rejectsRawBranchNumber: ProviderPayoutStatusResponse = {
  syncStatus: 'READY',
  payoutReady: true,
  bankAccount: null,
  updatedAt: null,
  // @ts-expect-error Payout responses must not expose raw branch numbers.
  branchNumber: '1234',
};

const publicProfile: PublicUserProfile = {
  id: '42',
  name: 'Provider',
  email: 'provider@example.com',
  phone: '+5511999999999',
  cpf: '12345678901',
  type: 'PROVIDER',
  // @ts-expect-error Completion is fetched as an independent resource.
  profileCompletion: completion,
};

const customerSession: CustomerAuthSession = {
  access_token: 'token',
  user: {
    id: '42',
    name: 'Customer',
    email: 'customer@example.com',
    phone: '+5511999999999',
    cpf: '12345678901',
    type: 'CUSTOMER',
  },
  // @ts-expect-error Completion must not be cached in the login aggregate.
  profileCompletion: completion,
};

void bankAccountInput;
void completion;
void socialLinks;
void rejectsLegacySocialField;
void rejectsFrontendDestination;
void rejectsRawAccountNumber;
void rejectsRawBranchNumber;
void publicProfile;
void customerSession;
