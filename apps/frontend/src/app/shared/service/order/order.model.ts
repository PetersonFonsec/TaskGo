// Models for Order API responses
// These interfaces mirror the shape returned by the backend (IDs are strings because BigInt
// is serialized as string; decimals may be returned as Decimal-like objects).

export interface DecimalLike {
	s: number; // sign
	e: number; // exponent
	d: number[]; // digits
}

export interface UserModel {
	id: string;
	name: string;
	email: string;
	passwordHash?: string;
	phone?: string | null;
	type?: string;
	photoUrl?: string | null;
	createdAt?: any;
	updatedAt?: any;
	cpf?: string;
}

export interface ProviderModel {
	id: string;
	bio?: string | null;
	ratingAvg?: DecimalLike | null;
	ratingCount?: number;
	verified?: boolean;
	createdAt?: any;
	updatedAt?: any;
	pagarmeRecipientId?: string | null;
	user?: UserModel;
}

export interface ServiceModel {
	id: string;
	providerId: string;
	title: string;
	description?: string | null;
	category: string;
	basePrice?: DecimalLike | null;
	availability?: any | null;
	status: 'ATIVO' | 'INATIVO' | string;
	createdAt?: any;
	updatedAt?: any;
	platformFeePct?: DecimalLike | null;
	provider?: ProviderModel | null;
}

export interface PaymentModel {
	id: string;
	orderId: string;
	method: string;
	status: string;
	amount?: DecimalLike | null;
	paidAt?: any | null;
	provider?: string;
	providerOrderId?: string | null;
	providerChargeId?: string | null;
	pixQrCode?: string | null;
	pixQrCodeBase64?: string | null;
	pixExpiresAt?: any | null;
	platformAmount?: DecimalLike | null;
	providerAmount?: DecimalLike | null;
	feePct?: DecimalLike | null;
}

export interface AddressSnapModel {
	id: string;
	orderId: string;
	street?: string | null;
	number?: string | null;
	complement?: string | null;
	neighborhood?: string | null;
	city?: string | null;
	state?: string | null;
	country?: string | null;
	cep?: string | null;
	lat?: number | null;
	lng?: number | null;
	createdAt?: any;
}

export interface ReviewModel {
	id: string;
	orderId: string;
	clientId: string;
	providerId: string;
	rating: number;
	comment?: string | null;
	reviewedAt?: any;
}

export interface OrderModel {
	id: string;
	clientId: string;
	serviceId: string;
	status: 'PENDENTE' | 'CONFIRMADO' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO' | string;
	finalPrice?: DecimalLike | null;
	requestedAt?: any;
	scheduledFor?: any | null;
	client?: UserModel | null;
	service?: ServiceModel | null;
	payment?: PaymentModel | null;
	addressSnap?: AddressSnapModel | null;
	review?: ReviewModel | null;
}

export type OrdersResponse = OrderModel[];

export type OrderUserRole = 'CLIENTE' | 'PRESTADOR';

export interface OrderParticipant {
  id: string;
  name: string;
  photoUrl: string | null;
  ratingAvg?: number;
  ratingCount?: number;
  verified?: boolean;
}

export interface OrderAddressSummary {
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  cep: string | null;
}

export interface OrderPaymentSummary {
  method: string;
  status: string;
  estimatedAmount: number;
  finalAmount: number | null;
}

export interface OrderTimelineEvent {
  type?: string;
  title: string;
  description?: string | null;
  date: string;
  completed: boolean;
}

export interface OrderDetails {
  id: string;
  status: string;
  service: { id: string; title: string; category: string; estimatedPrice: number };
  provider: OrderParticipant;
  client: OrderParticipant;
  schedule: { requestedAt: string; scheduledFor: string | null };
  address: OrderAddressSummary | null;
  payment: OrderPaymentSummary | null;
  review: { id: string; rating: number; comment?: string | null; reviewedAt: string } | null;
  timeline: OrderTimelineEvent[];
  completion: { providerFinishedAt: string | null; providerNotes: string | null };
  priceAdjustmentReason: string | null;
  photos: { id: string; url: string; type: 'BEFORE' | 'AFTER' | 'RECEIPT' | 'DAMAGE' }[];
}

export interface FinishOrderPayload {
  finalPrice: number;
  providerNotes?: string;
  priceAdjustmentReason?: string;
  photos: { url: string; type: 'AFTER' | 'RECEIPT' | 'DAMAGE' }[];
}

export interface FinishOrderResponse {
  id: string;
  status: 'AGUARDANDO_CONFIRMACAO_CLIENTE';
  finalPrice: number;
  providerFinishedAt: string;
  message: string;
}

export interface ConfirmOrderResponse {
  id: string;
  status: 'CONCLUIDO';
  clientConfirmedAt: string;
  payment: { status: string; paidAt: string };
  message: string;
}

export interface ReviewTag {
  id: string;
  name: string;
  slug: string;
}

export interface CreateReviewRequest {
  rating: number;
  comment?: string;
  tagIds?: string[];
}

export interface CreateReviewResponse {
  id: string;
  orderId: string;
  rating: number;
  comment: string | null;
  reviewedAt: string;
  tags: ReviewTag[];
  provider: {
    id: string;
    ratingAvg: number;
    ratingCount: number;
  };
}

export interface RatingOption { value: 1 | 2 | 3 | 4 | 5; label: string }
