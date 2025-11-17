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


