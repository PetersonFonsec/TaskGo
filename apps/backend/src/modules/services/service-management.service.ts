import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ServiceStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

export function validateAvailability(value: unknown): void {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new BadRequestException('Informe a disponibilidade semanal');
  const availability = value as Record<string, unknown>;
  if (availability.timezone !== 'America/Sao_Paulo')
    throw new BadRequestException('Use o fuso America/Sao_Paulo');
  const weekdays = availability.weekdays as Record<string, unknown>;
  if (!weekdays || typeof weekdays !== 'object' || Array.isArray(weekdays))
    throw new BadRequestException('Disponibilidade inválida');
  let count = 0;
  const names = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];
  for (const [day, windows] of Object.entries(weekdays)) {
    if (!names.includes(day) || !Array.isArray(windows) || windows.length > 4)
      throw new BadRequestException('Janelas de atendimento inválidas');
    let previousEnd = -1;
    for (const window of [...windows].sort((a, b) =>
      String(a?.start).localeCompare(String(b?.start)),
    )) {
      const minutes = (time: unknown) =>
        typeof time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(time)
          ? Number(time.slice(0, 2)) * 60 + Number(time.slice(3))
          : -1;
      const start = minutes(window?.start),
        end = minutes(window?.end);
      const duration = window?.slotMinutes;
      if (
        start < 0 ||
        end <= start ||
        start < previousEnd ||
        !Number.isInteger(duration) ||
        duration < 15 ||
        duration > 480 ||
        end - start < duration
      )
        throw new BadRequestException(
          'Horários sobrepostos ou duração inválida (15 a 480 minutos)',
        );
      previousEnd = end;
      count++;
    }
  }
  if (!count)
    throw new BadRequestException(
      'Informe pelo menos um horário de atendimento',
    );
}

@Injectable()
export class ServiceManagementService {
  constructor(private readonly prisma: PrismaService) {}

  listMine(providerId: bigint) {
    return this.prisma.service.findMany({
      where: { providerId },
      orderBy: { id: 'asc' },
      take: 100,
    });
  }

  async create(providerId: bigint, payload: CreateServiceDto) {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
      select: { status: true },
    });
    if (!provider || provider.status === 'BLOCKED')
      throw new BadRequestException('Perfil profissional indisponível');
    await this.validate(payload);
    return this.prisma.service.create({
      data: {
        ...payload,
        providerId,
        availability: payload.availability as Prisma.InputJsonValue,
      },
    });
  }

  async update(id: bigint, providerId: bigint, payload: UpdateServiceDto) {
    const service = await this.prisma.service.findFirst({
      where: { id, providerId, provider: { status: { not: 'BLOCKED' } } },
    });
    if (!service) throw new NotFoundException('Serviço não encontrado');
    await this.validate({
      ...service,
      description: service.description ?? undefined,
      basePrice: Number(service.basePrice),
      availability: service.availability as Record<string, unknown>,
      ...payload,
    });
    return this.prisma.service.update({
      where: { id, providerId },
      data: {
        ...payload,
        availability: payload.availability as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async remove(id: bigint, providerId: bigint) {
    const result = await this.prisma.service.updateMany({
      where: { id, providerId },
      data: { status: ServiceStatus.INATIVO },
    });
    if (!result.count) throw new NotFoundException('Serviço não encontrado');
    return { id: id.toString(), status: ServiceStatus.INATIVO };
  }

  findPublic(id: bigint) {
    return this.prisma.service.findFirstOrThrow({
      where: { id, status: 'ATIVO', provider: { status: 'APPROVED' } },
      select: {
        id: true,
        providerId: true,
        title: true,
        description: true,
        category: true,
        basePrice: true,
        availability: true,
      },
    });
  }

  private async validate(payload: CreateServiceDto) {
    const category = await this.prisma.category.findFirst({
      where: { slug: payload.category, isActive: true },
      select: { id: true },
    });
    if (!category)
      throw new BadRequestException('Categoria inválida ou inativa');
    if (payload.status === 'ATIVO') validateAvailability(payload.availability);
  }
}
