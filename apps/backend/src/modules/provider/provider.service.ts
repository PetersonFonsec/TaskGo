import { Injectable, UnauthorizedException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';

import { ServicesService } from '../services/services.service';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { FavoritesService } from './favorites/favorites.service';
import {
  ProviderAvailabilityDayDto,
  ProviderAvailabilityQueryDto,
  ProviderAvailabilityResponseDto,
  ProviderAvailabilitySlotDto,
  ProviderAvailabilityWeekday,
  ServiceAvailabilityMvp,
  ServiceAvailabilityWindow,
} from './dto/provider-availability.dto';

const DEFAULT_TIMEZONE = 'America/Sao_Paulo';
const SAO_PAULO_UTC_OFFSET_HOURS = 3;
const DEFAULT_SLOT_MINUTES = 60;
const WEEKDAYS: ProviderAvailabilityWeekday[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

type ServiceWithAvailability = {
  id: bigint;
  availability: unknown;
};

@Injectable()
export class ProviderService {
  constructor(
    public prisma: PrismaService,
    public userService: UserService,
    public serviceService: ServicesService,
    public favoritesService: FavoritesService,
  ) {}

  async create(payload: any) {
    return await this.prisma.$transaction(async (prisma) => {
      const user = await this.userService.create(payload.provider);
      await prisma.provider.create({
        data: {
          id: user.id,
          bio: payload.provider?.bio,
          services: {
            connect: payload.services.map((id) => ({ id })),
          },
        },
      });

      return user;
    });
  }

  async findAll(options?: { onlyFavorites?: boolean; clientId?: number }) {
    if (options?.onlyFavorites) {
      if (!options.clientId) {
        throw new UnauthorizedException(
          'Authenticated client required for favorites filter',
        );
      }

      const favorites = await this.favoritesService.listFavorites(
        options.clientId,
        {
          skip: 0,
          take: 100,
        },
      );

      return favorites.items.map((favorite) => favorite.provider);
    }

    return this.prisma.provider.findMany({
      include: {
        user: true,
        services: true,
      },
    });
  }

  /**
   * Find providers that offer at least one service belonging to the given category slug.
   * Assumption: Service.category stores the category/subcategory slug (string).
   *
   * Example usage: findProvidersByCategorySlug('hidraulica')
   */
  async findProvidersByCategorySlug(slug: string) {
    if (!slug) return [];

    const providers = await this.prisma.provider.findMany({
      where: {
        services: {
          some: {
            category: slug,
            status: 'ATIVO',
          },
        },
      },
      include: {
        user: true,
        locations: true,
        reviews: true,
        serviceAreas: true,
        // include only the matching services to keep payload small
        services: {
          where: { category: slug, status: 'ATIVO' },
        },
      },
    });

    providers.forEach((provider) => {
      provider.services = provider.services.map((service) => {
        service.basePrice = Number(service.basePrice) as any;
        return service;
      });
    });

    return providers;
  }

  async getAvailability(
    providerId: string,
    query: ProviderAvailabilityQueryDto,
  ): Promise<ProviderAvailabilityResponseDto> {
    const days = this.buildUnavailableDays(query.from, query.to);
    const providerBigIntId = this.parsePositiveBigInt(providerId);

    if (!providerBigIntId || days.length === 0) {
      return {
        providerId,
        timezone: DEFAULT_TIMEZONE,
        days,
      };
    }

    const serviceWhere: any = {
      providerId: providerBigIntId,
      status: 'ATIVO',
    };

    const requestedServiceId = this.parsePositiveBigInt(query.serviceId);
    if (query.serviceId && !requestedServiceId) {
      return {
        providerId,
        timezone: DEFAULT_TIMEZONE,
        days,
      };
    }

    if (requestedServiceId) {
      serviceWhere.id = requestedServiceId;
    }

    const services = await this.prisma.service.findMany({
      where: serviceWhere,
      select: {
        id: true,
        availability: true,
      },
      orderBy: {
        id: 'asc',
      },
    });

    const selectedServices = requestedServiceId
      ? services
      : services.slice(0, 1);

    if (selectedServices.length === 0) {
      return {
        providerId,
        timezone: DEFAULT_TIMEZONE,
        days,
      };
    }

    const candidateDays = this.buildCandidateDays(days, selectedServices);
    const candidateSlots = candidateDays.flatMap((day) => day.slots);

    if (candidateSlots.length === 0) {
      return {
        providerId,
        timezone: DEFAULT_TIMEZONE,
        days: candidateDays,
      };
    }

    const conflicts = await this.prisma.order.findMany({
      where: {
        serviceId: {
          in: selectedServices.map((service) => service.id),
        },
        status: {
          in: [
            OrderStatus.AGUARDANDO_APROVACAO,
            OrderStatus.AGUARDANDO_PAGAMENTO,
            OrderStatus.AGENDADO,
            OrderStatus.EM_DESLOCAMENTO,
            OrderStatus.EM_ANDAMENTO,
            OrderStatus.AGUARDANDO_CONFIRMACAO_CLIENTE,
          ],
        },
        scheduledFor: {
          gte: this.startOfDate(query.from),
          lt: this.dayAfter(query.to),
        },
      },
      select: {
        serviceId: true,
        scheduledFor: true,
      },
    });

    const blockedSlots = new Set(
      conflicts
        .filter((order) => order.scheduledFor)
        .map(
          (order) =>
            `${order.serviceId.toString()}:${order.scheduledFor!.getTime()}`,
        ),
    );

    const availableDays = candidateDays.map((day) => {
      const slots = day.slots.filter((slot) => {
        const startsAt = new Date(slot.startsAt);
        return !blockedSlots.has(`${slot.serviceId}:${startsAt.getTime()}`);
      });

      return {
        date: day.date,
        available: slots.length > 0,
        slots,
      };
    });

    return {
      providerId,
      timezone: DEFAULT_TIMEZONE,
      days: availableDays,
    };
  }

  private buildCandidateDays(
    days: ProviderAvailabilityDayDto[],
    services: ServiceWithAvailability[],
  ): ProviderAvailabilityDayDto[] {
    return days.map((day) => {
      const slots = services.flatMap((service) =>
        this.buildSlotsForService(day.date, service),
      );

      return {
        date: day.date,
        available: slots.length > 0,
        slots,
      };
    });
  }

  private buildSlotsForService(
    date: string,
    service: ServiceWithAvailability,
  ): ProviderAvailabilitySlotDto[] {
    const availability = this.parseAvailability(service.availability);
    if (!availability) return [];

    const weekday = this.weekdayForDate(date);
    const windows = availability.weekdays?.[weekday];
    if (!Array.isArray(windows)) return [];

    return windows.flatMap((window) =>
      this.buildSlotsForWindow(date, service.id, window),
    );
  }

  private buildSlotsForWindow(
    date: string,
    serviceId: bigint,
    window: ServiceAvailabilityWindow,
  ): ProviderAvailabilitySlotDto[] {
    const startMinutes = this.parseTimeToMinutes(window.start);
    const endMinutes = this.parseTimeToMinutes(window.end);
    const slotMinutes =
      typeof window.slotMinutes === 'number'
        ? window.slotMinutes
        : DEFAULT_SLOT_MINUTES;

    if (
      startMinutes === null ||
      endMinutes === null ||
      endMinutes <= startMinutes ||
      !Number.isInteger(slotMinutes) ||
      slotMinutes <= 0 ||
      slotMinutes > 24 * 60
    ) {
      return [];
    }

    const slots: ProviderAvailabilitySlotDto[] = [];
    for (
      let cursor = startMinutes;
      cursor + slotMinutes <= endMinutes;
      cursor += slotMinutes
    ) {
      const startsAt = this.dateWithLocalMinutes(date, cursor);
      const endsAt = this.dateWithLocalMinutes(date, cursor + slotMinutes);

      slots.push({
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        serviceId: serviceId.toString(),
        label: this.formatLabel(cursor),
        available: true,
      });
    }

    return slots;
  }

  private parseAvailability(
    availability: unknown,
  ): ServiceAvailabilityMvp | null {
    if (!availability || typeof availability !== 'object') return null;

    const parsed = availability as ServiceAvailabilityMvp;
    if (!parsed.weekdays || typeof parsed.weekdays !== 'object') return null;

    return parsed;
  }

  private buildUnavailableDays(
    from: string,
    to: string,
  ): ProviderAvailabilityDayDto[] {
    const fromParts = this.parseDateOnly(from);
    const toParts = this.parseDateOnly(to);
    if (!fromParts || !toParts) return [];

    const fromTime = Date.UTC(
      fromParts.year,
      fromParts.month - 1,
      fromParts.day,
    );
    const toTime = Date.UTC(toParts.year, toParts.month - 1, toParts.day);
    if (fromTime > toTime) return [];

    const days: ProviderAvailabilityDayDto[] = [];
    for (
      let current = fromTime;
      current <= toTime;
      current += 24 * 60 * 60 * 1000
    ) {
      days.push({
        date: new Date(current).toISOString().slice(0, 10),
        available: false,
        slots: [],
      });
    }

    return days;
  }

  private weekdayForDate(date: string): ProviderAvailabilityWeekday {
    const localDate = this.dateWithLocalMinutes(date, 0);
    return WEEKDAYS[localDate.getUTCDay()];
  }

  private startOfDate(date: string): Date {
    return this.dateWithLocalMinutes(date, 0);
  }

  private dayAfter(date: string): Date {
    const parts = this.parseDateOnly(date);
    if (!parts) return new Date(NaN);

    return new Date(
      Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day + 1,
        SAO_PAULO_UTC_OFFSET_HOURS,
      ),
    );
  }

  private dateWithLocalMinutes(date: string, minutes: number): Date {
    const parts = this.parseDateOnly(date);
    if (!parts) return new Date(NaN);

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    return new Date(
      Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        hours + SAO_PAULO_UTC_OFFSET_HOURS,
        remainingMinutes,
      ),
    );
  }

  private parseDateOnly(date: string) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const parsed = new Date(Date.UTC(year, month - 1, day));

    if (
      parsed.getUTCFullYear() !== year ||
      parsed.getUTCMonth() !== month - 1 ||
      parsed.getUTCDate() !== day
    ) {
      return null;
    }

    return { year, month, day };
  }

  private parseTimeToMinutes(time: string): number | null {
    const match = TIME_PATTERN.exec(time);
    if (!match) return null;

    return Number(match[1]) * 60 + Number(match[2]);
  }

  private parsePositiveBigInt(value?: string): bigint | null {
    if (!value || !/^\d+$/.test(value)) return null;

    const parsed = BigInt(value);
    return parsed > 0n ? parsed : null;
  }

  private formatLabel(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    return `${hours.toString().padStart(2, '0')}:${remainingMinutes
      .toString()
      .padStart(2, '0')}`;
  }

  findOne(id: number) {
    return this.prisma.provider.findUnique({
      where: {
        id,
      },
      include: {
        user: true,
        locations: true,
        reviews: true,
        serviceAreas: true,
        services: true,
      },
    });
  }

  update(id: number, updateProviderDto: UpdateProviderDto) {
    return `This action updates a #${id} provider`;
  }

  remove(id: number) {
    return `This action removes a #${id} provider`;
  }
}
