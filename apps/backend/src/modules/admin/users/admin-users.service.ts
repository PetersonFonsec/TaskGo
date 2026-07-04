import { createHash, randomBytes } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AdminRole, AdminUser, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../../../prisma/prisma.service';
import {
  AdminAuditAction,
  AdminAuditRequestContext,
} from '../audit/admin-audit.contracts';
import { AdminAuditService } from '../audit/admin-audit.service';
import { AdminActor } from '../auth/admin-actor';
import { AdminOperatorResponseDto } from '../auth/dto/admin-operator-response.dto';
import { AdminInvitationDeliveryService } from './invitations/admin-invitation-delivery.service';
import {
  ActivateAdminInvitationDto,
  CreateAdminInvitationDto,
} from './dto/create-admin-invitation.dto';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';

const ADMIN_USER_ENTITY = 'AdminUser';
const INVITATION_TTL_HOURS = 48;

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
    private readonly invitationDelivery: AdminInvitationDeliveryService,
  ) {}

  async list(query: AdminUsersQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 25, 100);
    const where: Prisma.AdminUserWhereInput = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.active !== undefined ? { active: query.active } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, operators] = await this.prisma.$transaction([
      this.prisma.adminUser.count({ where }),
      this.prisma.adminUser.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      data: operators.map((operator) => this.toResponse(operator)),
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasPrevPage: page > 1,
        hasNextPage: page < totalPages,
      },
    };
  }

  async invite(
    dto: CreateAdminInvitationDto,
    actor: AdminActor,
    requestContext: AdminAuditRequestContext,
  ) {
    const email = this.normalizeEmail(dto.email);
    const invitation = this.createInvitation();
    const expiresAt = this.buildInvitationExpiry();

    const operator = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.adminUser.findUnique({ where: { email } });
      if (existing?.active) {
        throw new ConflictException('Administrative operator already active');
      }
      if (existing?.activatedAt) {
        throw new ConflictException(
          'Deactivate and activate existing administrative operators without invitation rotation',
        );
      }

      const saved = existing
        ? await tx.adminUser.update({
            where: { id: existing.id },
            data: {
              name: dto.name,
              role: dto.role,
              invitationTokenHash: invitation.hash,
              invitationExpiresAt: expiresAt,
            },
          })
        : await tx.adminUser.create({
            data: {
              name: dto.name,
              email,
              role: dto.role,
              active: false,
              invitationTokenHash: invitation.hash,
              invitationExpiresAt: expiresAt,
            },
          });

      await this.audit.append(tx, {
        actor,
        action: AdminAuditAction.AdminUserInvited,
        target: { type: ADMIN_USER_ENTITY, id: saved.id },
        before: existing
          ? {
              role: existing.role,
              active: existing.active,
              invitationExpiresAt: existing.invitationExpiresAt,
            }
          : undefined,
        after: {
          role: saved.role,
          active: saved.active,
          invitationExpiresAt: saved.invitationExpiresAt,
        },
        ...requestContext,
      });

      return saved;
    });

    let deliveryStatus: 'SENT' | 'FAILED' = 'SENT';
    try {
      await this.invitationDelivery.deliver({
        email: operator.email,
        name: operator.name,
        token: invitation.token,
        activationUrl: this.buildActivationUrl(invitation.token),
        expiresAt,
      });
    } catch (error) {
      deliveryStatus = 'FAILED';
    }

    return {
      operator: this.toResponse(operator),
      invitation: {
        expiresAt,
        deliveryStatus,
      },
    };
  }

  async activateInvitation(
    dto: ActivateAdminInvitationDto,
    requestContext: AdminAuditRequestContext,
  ) {
    const tokenHash = this.hashToken(dto.token);
    const operator = await this.prisma.adminUser.findFirst({
      where: { invitationTokenHash: tokenHash },
    });

    if (!operator) {
      throw new BadRequestException('Invalid administrative invitation token');
    }
    if (
      !operator.invitationExpiresAt ||
      operator.invitationExpiresAt.getTime() <= Date.now()
    ) {
      throw new BadRequestException('Administrative invitation token expired');
    }
    if (operator.activatedAt || operator.active || operator.passwordHash) {
      throw new BadRequestException(
        'Administrative invitation token already used',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const activatedAt = new Date();
    const activated = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.adminUser.updateMany({
        where: {
          id: operator.id,
          active: false,
          passwordHash: null,
          activatedAt: null,
          invitationTokenHash: tokenHash,
          invitationExpiresAt: { gt: activatedAt },
        },
        data: {
          passwordHash,
          active: true,
          activatedAt,
          invitationTokenHash: null,
          invitationExpiresAt: null,
          tokenVersion: { increment: 1 },
        },
      });

      if (claimed.count !== 1) {
        throw new BadRequestException(
          'Administrative invitation token already used',
        );
      }

      const saved = await tx.adminUser.findUniqueOrThrow({
        where: { id: operator.id },
      });

      await this.audit.append(tx, {
        actor: this.toActor(saved),
        action: AdminAuditAction.AdminUserActivated,
        target: { type: ADMIN_USER_ENTITY, id: saved.id },
        before: {
          active: operator.active,
          activatedAt: operator.activatedAt,
          sessionVersion: operator.tokenVersion,
        },
        after: {
          active: saved.active,
          activatedAt: saved.activatedAt,
          sessionVersion: saved.tokenVersion,
        },
        ...requestContext,
      });

      return saved;
    });

    return { operator: this.toResponse(activated) };
  }

  async changeRole(
    id: bigint,
    role: AdminRole,
    actor: AdminActor,
    requestContext: AdminAuditRequestContext,
  ) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const operator = await this.findOperatorOrThrow(tx, id);
      if (operator.role === role) {
        throw new ConflictException('Administrative operator already has role');
      }
      await this.assertAdministratorWouldRemain(tx, operator, {
        nextRole: role,
      });

      const saved = await tx.adminUser.update({
        where: { id },
        data: { role, tokenVersion: { increment: 1 } },
      });

      await this.audit.append(tx, {
        actor,
        action: AdminAuditAction.AdminUserRoleChanged,
        target: { type: ADMIN_USER_ENTITY, id },
        before: {
          role: operator.role,
          sessionVersion: operator.tokenVersion,
        },
        after: {
          role: saved.role,
          sessionVersion: saved.tokenVersion,
        },
        ...requestContext,
      });

      return saved;
    });

    return { operator: this.toResponse(updated) };
  }

  async reactivate(
    id: bigint,
    actor: AdminActor,
    requestContext: AdminAuditRequestContext,
  ) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const operator = await this.findOperatorOrThrow(tx, id);
      if (operator.active) {
        throw new ConflictException('Administrative operator already active');
      }
      if (!operator.passwordHash || !operator.activatedAt) {
        throw new ConflictException(
          'Administrative operator must activate invitation before reactivation',
        );
      }

      const saved = await tx.adminUser.update({
        where: { id },
        data: { active: true, tokenVersion: { increment: 1 } },
      });

      await this.audit.append(tx, {
        actor,
        action: AdminAuditAction.AdminUserActivated,
        target: { type: ADMIN_USER_ENTITY, id },
        before: {
          active: operator.active,
          sessionVersion: operator.tokenVersion,
        },
        after: {
          active: saved.active,
          sessionVersion: saved.tokenVersion,
        },
        ...requestContext,
      });

      return saved;
    });

    return { operator: this.toResponse(updated) };
  }

  async deactivate(
    id: bigint,
    actor: AdminActor,
    requestContext: AdminAuditRequestContext,
  ) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const operator = await this.findOperatorOrThrow(tx, id);
      if (!operator.active) {
        throw new ConflictException('Administrative operator already inactive');
      }
      await this.assertAdministratorWouldRemain(tx, operator, {
        nextActive: false,
      });

      const saved = await tx.adminUser.update({
        where: { id },
        data: { active: false, tokenVersion: { increment: 1 } },
      });

      await this.audit.append(tx, {
        actor,
        action: AdminAuditAction.AdminUserDeactivated,
        target: { type: ADMIN_USER_ENTITY, id },
        before: {
          active: operator.active,
          sessionVersion: operator.tokenVersion,
        },
        after: {
          active: saved.active,
          sessionVersion: saved.tokenVersion,
        },
        ...requestContext,
      });

      return saved;
    });

    return { operator: this.toResponse(updated) };
  }

  private async findOperatorOrThrow(
    tx: Prisma.TransactionClient,
    id: bigint,
  ) {
    const operator = await tx.adminUser.findUnique({ where: { id } });
    if (!operator) {
      throw new NotFoundException('Administrative operator not found');
    }

    return operator;
  }

  private async assertAdministratorWouldRemain(
    tx: Prisma.TransactionClient,
    operator: AdminUser,
    next: { nextRole?: AdminRole; nextActive?: boolean },
  ) {
    const remainsAdministrator =
      (next.nextActive ?? operator.active) &&
      (next.nextRole ?? operator.role) === AdminRole.ADMINISTRATOR;

    if (remainsAdministrator) return;
    if (!operator.active || operator.role !== AdminRole.ADMINISTRATOR) return;

    const activeAdministrators = await tx.adminUser.count({
      where: { active: true, role: AdminRole.ADMINISTRATOR },
    });
    if (activeAdministrators <= 1) {
      throw new ConflictException(
        'Cannot remove the final active Administrator',
      );
    }
  }

  private toResponse(operator: AdminUser) {
    return new AdminOperatorResponseDto(operator);
  }

  private toActor(operator: AdminUser): AdminActor {
    return {
      id: operator.id,
      name: operator.name,
      email: operator.email,
      role: operator.role,
      active: operator.active,
      tokenVersion: operator.tokenVersion,
      activatedAt: operator.activatedAt,
    };
  }

  private createInvitation() {
    const token = randomBytes(32).toString('base64url');
    return { token, hash: this.hashToken(token) };
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private buildInvitationExpiry() {
    const ttlHours = Number(process.env.ADMIN_INVITATION_TTL_HOURS);
    const safeTtlHours = Number.isFinite(ttlHours)
      ? ttlHours
      : INVITATION_TTL_HOURS;

    return new Date(Date.now() + safeTtlHours * 60 * 60 * 1000);
  }

  private buildActivationUrl(token: string) {
    const baseUrl =
      process.env.ADMIN_INVITATION_URL ||
      process.env.BACKOFFICE_INVITATION_URL ||
      'http://localhost:4200/admin/activate';
    const url = new URL(baseUrl);
    url.searchParams.set('token', token);
    return url.toString();
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }
}
