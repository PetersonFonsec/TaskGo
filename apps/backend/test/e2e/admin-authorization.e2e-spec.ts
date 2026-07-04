import {
  Controller,
  Get,
  HttpCode,
  INestApplication,
  Post,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AdminRole } from '@prisma/client';
import * as request from 'supertest';

import { AppModule } from '../../src/app.module';
import { AdminAuthModule } from '../../src/modules/admin/auth/admin-auth.module';
import { AdminAuthGuard } from '../../src/modules/admin/auth/admin-auth.guard';
import { AdminCapability } from '../../src/modules/admin/authorization/admin-permissions';
import { AdminPermissions } from '../../src/modules/admin/authorization/admin-roles.decorator';
import { AdminRolesGuard } from '../../src/modules/admin/authorization/admin-roles.guard';
import { PrismaService } from '../../src/prisma/prisma.service';
import { Public } from '../../src/shared/decorators/public.decorator';

@Public()
@UseGuards(AdminAuthGuard, AdminRolesGuard)
@Controller('admin')
class AdminAuthorizationBoundaryController {
  @AdminPermissions(AdminCapability.ManageAdministrativeUsers)
  @Get('users')
  users() {
    return { ok: true };
  }

  @AdminPermissions(AdminCapability.ReadProviders)
  @Get('providers')
  providers() {
    return { ok: true };
  }

  @AdminPermissions(AdminCapability.ExecuteProviderDecisions)
  @HttpCode(200)
  @Post('providers/:id/approve')
  approveProvider() {
    return { ok: true };
  }

  @AdminPermissions(AdminCapability.ReadProviderDashboard)
  @Get('dashboard/providers')
  providerDashboard() {
    return { ok: true };
  }

  @AdminPermissions(AdminCapability.ReadAuditLog)
  @Get('audit-logs')
  auditLogs() {
    return { ok: true };
  }

  @Get('missing-metadata')
  missingMetadata() {
    return { ok: true };
  }
}

describe('Admin authorization boundary E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const testEmails = Object.values(AdminRole).map(
    (role) => `task03.${role.toLowerCase()}@example.com`,
  );

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule, AdminAuthModule],
      controllers: [AdminAuthorizationBoundaryController],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);

    await prisma.adminUser.deleteMany({
      where: { email: { in: testEmails } },
    });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.adminUser.deleteMany({
        where: { email: { in: testEmails } },
      });
    }
    if (app) await app.close();
  });

  async function createOperator(role: AdminRole, overrides = {}) {
    return prisma.adminUser.create({
      data: {
        name: `Task 03 ${role}`,
        email: `task03.${role.toLowerCase()}@example.com`,
        passwordHash: 'HASH',
        role,
        active: true,
        tokenVersion: 1,
        activatedAt: new Date('2026-07-02T00:00:00.000Z'),
        ...overrides,
      },
    });
  }

  function adminToken(operator: {
    id: bigint;
    role: AdminRole;
    tokenVersion: number;
  }) {
    return jwtService.sign({
      sub: operator.id.toString(),
      tokenKind: 'admin',
      role: operator.role,
      ver: operator.tokenVersion,
    });
  }

  function call(method: string, path: string) {
    const server = app.getHttpServer();

    if (method === 'GET') return request(server).get(path);
    if (method === 'POST') return request(server).post(path);

    throw new Error(`Unsupported test method: ${method}`);
  }

  it.each([
    ['GET', '/admin/users'],
    ['GET', '/admin/providers'],
    ['POST', '/admin/providers/1/approve'],
    ['GET', '/admin/dashboard/providers'],
    ['GET', '/admin/audit-logs'],
  ])('rejects ordinary user JWTs on %s %s', async (method, path) => {
    const ordinaryToken = jwtService.sign({ id: '123' });

    await call(method, path)
      .set('Authorization', `Bearer ${ordinaryToken}`)
      .expect(401);
  });

  it('rejects inactive administrative users using a previously valid token', async () => {
    const operator = await createOperator(AdminRole.ADMINISTRATOR, {
      email: 'task03.administrator@example.com',
    });
    const token = adminToken(operator);

    await prisma.adminUser.update({
      where: { id: operator.id },
      data: { active: false },
    });

    await request(app.getHttpServer())
      .get('/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('rejects stale token versions and stored-role mismatches', async () => {
    const support = await createOperator(AdminRole.SUPPORT, {
      email: 'task03.support@example.com',
    });
    const staleVersionToken = adminToken(support);

    await prisma.adminUser.update({
      where: { id: support.id },
      data: { tokenVersion: 2 },
    });

    await request(app.getHttpServer())
      .get('/admin/providers')
      .set('Authorization', `Bearer ${staleVersionToken}`)
      .expect(401);

    const finance = await createOperator(AdminRole.FINANCE, {
      email: 'task03.finance@example.com',
    });
    const staleRoleToken = adminToken({
      ...finance,
      role: AdminRole.ADMINISTRATOR,
    });

    await request(app.getHttpServer())
      .get('/admin/users')
      .set('Authorization', `Bearer ${staleRoleToken}`)
      .expect(401);
  });

  it('does not grant access when role metadata is missing', async () => {
    const moderator = await createOperator(AdminRole.MODERATOR, {
      email: 'task03.moderator@example.com',
    });

    await request(app.getHttpServer())
      .get('/admin/missing-metadata')
      .set('Authorization', `Bearer ${adminToken(moderator)}`)
      .expect(403);
  });

  it.each([
    [
      AdminRole.ADMINISTRATOR,
      [
        ['GET', '/admin/users', 200],
        ['GET', '/admin/providers', 200],
        ['POST', '/admin/providers/1/approve', 200],
        ['GET', '/admin/dashboard/providers', 200],
        ['GET', '/admin/audit-logs', 200],
      ],
    ],
    [
      AdminRole.SUPPORT,
      [
        ['GET', '/admin/users', 403],
        ['GET', '/admin/providers', 200],
        ['POST', '/admin/providers/1/approve', 403],
        ['GET', '/admin/dashboard/providers', 200],
        ['GET', '/admin/audit-logs', 403],
      ],
    ],
    [
      AdminRole.FINANCE,
      [
        ['GET', '/admin/users', 403],
        ['GET', '/admin/providers', 403],
        ['POST', '/admin/providers/1/approve', 403],
        ['GET', '/admin/dashboard/providers', 403],
        ['GET', '/admin/audit-logs', 403],
      ],
    ],
    [
      AdminRole.MODERATOR,
      [
        ['GET', '/admin/users', 403],
        ['GET', '/admin/providers', 403],
        ['POST', '/admin/providers/1/approve', 403],
        ['GET', '/admin/dashboard/providers', 403],
        ['GET', '/admin/audit-logs', 403],
      ],
    ],
  ])('enforces the fixed role matrix for %s', async (role, cases) => {
    await prisma.adminUser.deleteMany({
      where: { email: `task03.${role.toLowerCase()}@example.com` },
    });
    const operator = await createOperator(role);
    const token = adminToken(operator);

    for (const [method, path, status] of cases as [string, string, number][]) {
      await call(method, path)
        .set('Authorization', `Bearer ${token}`)
        .expect(status);
    }
  });
});
