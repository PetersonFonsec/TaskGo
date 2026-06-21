import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class ProviderAvailabilityQueryDto {
  @IsNotEmpty()
  @IsString()
  @Matches(DATE_ONLY_PATTERN, { message: 'from must use YYYY-MM-DD format' })
  from!: string;

  @IsNotEmpty()
  @IsString()
  @Matches(DATE_ONLY_PATTERN, { message: 'to must use YYYY-MM-DD format' })
  to!: string;

  @IsOptional()
  @IsString()
  serviceId?: string;
}

export interface ProviderAvailabilitySlotDto {
  startsAt: string;
  endsAt: string;
  serviceId: string;
  label: string;
  available: boolean;
}

export interface ProviderAvailabilityDayDto {
  date: string;
  available: boolean;
  slots: ProviderAvailabilitySlotDto[];
}

export interface ProviderAvailabilityResponseDto {
  providerId: string;
  timezone: string;
  days: ProviderAvailabilityDayDto[];
}

/**
 * MVP interpretation of Service.availability for ADR-001 backend-owned slots:
 * {
 *   timezone?: string,
 *   weekdays: {
 *     monday?: [{ start: '09:00', end: '12:00', slotMinutes?: 60 }],
 *     tuesday?: [{ start: '09:00', end: '12:00', slotMinutes?: 60 }],
 *     wednesday?: [{ start: '09:00', end: '12:00', slotMinutes?: 60 }],
 *     thursday?: [{ start: '09:00', end: '12:00', slotMinutes?: 60 }],
 *     friday?: [{ start: '09:00', end: '12:00', slotMinutes?: 60 }],
 *     saturday?: [{ start: '09:00', end: '12:00', slotMinutes?: 60 }],
 *     sunday?: [{ start: '09:00', end: '12:00', slotMinutes?: 60 }]
 *   }
 * }
 *
 * Backend parsing must produce ISO datetime slot values for Angular and treat
 * missing or malformed availability as no available slots.
 */
export type ServiceAvailabilityMvp = {
  timezone?: string;
  weekdays?: Partial<
    Record<ProviderAvailabilityWeekday, ServiceAvailabilityWindow[]>
  >;
};

export type ProviderAvailabilityWeekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export type ServiceAvailabilityWindow = {
  start: string;
  end: string;
  slotMinutes?: number;
};
