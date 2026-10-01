import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQuery } from '../shared/services/pagination/pagination.interface';
import { CreateFeatureFlagDto } from './dto/create-feature-flag.dto';
import { UpdateFeatureFlagDto } from './dto/update-feature-flag.dto';

@Injectable()
export class FeatureFlagService {
  constructor(private readonly prisma: PrismaService) {}

  create(body: CreateFeatureFlagDto) {
    return this.prisma.featureFlag.create({
      data: {
        name: body.name,
        description: body.description?.trim() || null,
        isActive: body.isActive ?? false,
      },
    });
  }

  async findAll(query: PaginationQuery = {}) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.featureFlag.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.featureFlag.count(),
    ]);
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findOne(id: string) {
    const flag = await this.prisma.featureFlag.findUnique({
      where: { id: this.id(id) },
    });
    if (!flag) throw new NotFoundException('Feature flag não encontrada.');
    return flag;
  }

  async update(id: string, body: UpdateFeatureFlagDto) {
    try {
      return await this.prisma.featureFlag.update({
        where: { id: this.id(id) },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.description !== undefined
            ? { description: body.description.trim() || null }
            : {}),
          ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        },
      });
    } catch (error) {
      this.rethrow(error);
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.featureFlag.delete({
        where: { id: this.id(id) },
      });
    } catch (error) {
      this.rethrow(error);
    }
  }

  private id(value: string): bigint {
    if (!/^[1-9]\d*$/.test(value))
      throw new BadRequestException('Feature flag inválida.');
    return BigInt(value);
  }

  private rethrow(error: unknown): never {
    if ((error as { code?: string }).code === 'P2025')
      throw new NotFoundException('Feature flag não encontrada.');
    throw error;
  }
}
