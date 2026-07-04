import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AdminRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as request from 'supertest';

import { AppModule } from '../../src/app.module';
import {
  AdminInvitationDeliveryInput,
  AdminInvitationDeliveryService,
} from '../../src/modules/admin/users/invitations/admin-invitation-delivery.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Admin users lifecycle E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let deliveredInvitations: AdminInvitationDeliveryInput[];
  const suffix = Date.now();
  const adminEmail = `task05.admin.${suffix}@example.com`;
  const operatorEmail = `task05.operator.${suffix}@example.com`;
  const createdAdminIds: bigint[] = [];

  beforeAll(async () => {
    deliveredInvitations = [];
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AdminInvitationDeliveryService)
      .useValue({
        deliver: jest.fn(async (input: AdminInvitationDeliveryInput) => {
          deliveredInvitations.push(input);
        }),
      })
      .compile();

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

    await prisma.auditLog.deleteMany({
      where: {
        OR: [
          {
            entityType: 'AdminUser',
            entityId: { in: createdAdminIds.map(String) },
          },
          { actorAdmin: { email: { in: [adminEmail, operatorEmail] } } },
        ],
      },
    });
    await prisma.adminUser.deleteMany({
      where: { email: { in: [adminEmail, operatorEmail] } },
    });
  });

  afterAll(async () => {
    if (prisma) {
      const ids = await prisma.adminUser.findMany({
        where: { email: { in: [adminEmail, operatorEmail] } },
        select: { id: true },
      });
      await prisma.auditLog.deleteMany({
        where: {
          OR: [
            { actorAdminId: { in: ids.map((item) => item.id) } },
            {
              entityType: 'AdminUser',
              entityId: { in: ids.map((item) => item.id.toString()) },
            },
          ],
        },
      });
      await prisma.adminUser.deleteMany({
        where: { email: { in: [adminEmail, operatorEmail] } },
      });
    }
    if (app) await app.close();
  });

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

  it('activates an invitation, rejects reuse, invalidates stale sessions, and audits lifecycle changes', async () => {
    const admin = await prisma.adminUser.create({
      data: {
        name: 'Task 05 Admin',
        email: adminEmail,
        passwordHash: await bcrypt.hash('admin-password', 10),
        role: AdminRole.ADMINISTRATOR,
        active: true,
        tokenVersion: 1,
        activatedAt: new Date('2026-07-02T00:00:00.000Z'),
      },
    });
    createdAdminIds.push(admin.id);
    const adminAuthorization = `Bearer ${adminToken(admin)}`;

    const inviteResponse = await request(app.getHttpServer())
      .post('/admin/users/invitations')
      .set('Authorization', adminAuthorization)
      .send({
        name: 'Task 05 Operator',
        email: operatorEmail.toUpperCase(),
        role: AdminRole.SUPPORT,
      })
      .expect(201);

    expect(inviteResponse.body.operator.email).toBe(operatorEmail);
    expect(inviteResponse.body.invitation.deliveryStatus).toBe('SENT');
    expect(inviteResponse.body.invitation.token).toBeUndefined();
    expect(deliveredInvitations).toHaveLength(1);

    const invitationToken = deliveredInvitations[0].token;
    const invitedOperator = await prisma.adminUser.findUniqueOrThrow({
      where: { email: operatorEmail },
    });
    createdAdminIds.push(invitedOperator.id);
    expect(invitedOperator.invitationTokenHash).toBeTruthy();
    expect(invitedOperator.invitationTokenHash).not.toBe(invitationToken);

    await request(app.getHttpServer())
      .post('/admin/auth/activate')
      .send({ token: invitationToken, password: 'operator-password' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/admin/auth/activate')
      .send({ token: invitationToken, password: 'operator-password' })
      .expect(400);

    const loginResponse = await request(app.getHttpServer())
      .post('/admin/auth/login')
      .send({ email: operatorEmail, password: 'operator-password' })
      .expect(201);

    const operatorAuthorization = `Bearer ${loginResponse.body.access_token}`;
    await request(app.getHttpServer())
      .get('/admin/auth/me')
      .set('Authorization', operatorAuthorization)
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/admin/users/${invitedOperator.id.toString()}/role`)
      .set('Authorization', adminAuthorization)
      .send({ role: AdminRole.FINANCE })
      .expect(200);

    const financeLoginResponse = await request(app.getHttpServer())
      .post('/admin/auth/login')
      .send({ email: operatorEmail, password: 'operator-password' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/admin/auth/change-password')
      .set('Authorization', `Bearer ${financeLoginResponse.body.access_token}`)
      .send({
        currentPassword: 'operator-password',
        newPassword: 'operator-password-2',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/admin/users/${invitedOperator.id.toString()}/deactivate`)
      .set('Authorization', adminAuthorization)
      .expect(201);

    await request(app.getHttpServer())
      .get('/admin/auth/me')
      .set('Authorization', operatorAuthorization)
      .expect(403);

    const savedOperator = await prisma.adminUser.findUniqueOrThrow({
      where: { email: operatorEmail },
    });
    expect(savedOperator.active).toBe(false);
    expect(savedOperator.invitationTokenHash).toBeNull();
    expect(savedOperator.invitationExpiresAt).toBeNull();
    expect(savedOperator.tokenVersion).toBe(4);

    const auditCounts = await prisma.auditLog.groupBy({
      by: ['action'],
      where: {
        entityType: 'AdminUser',
        entityId: savedOperator.id.toString(),
        action: {
          in: [
            'ADMIN_USER_INVITED',
            'ADMIN_USER_ACTIVATED',
            'ADMIN_USER_ROLE_CHANGED',
            'ADMIN_USER_PASSWORD_CHANGED',
            'ADMIN_USER_DEACTIVATED',
          ],
        },
      },
      _count: { action: true },
    });
    expect(
      Object.fromEntries(
        auditCounts.map((item) => [item.action, item._count.action]),
      ),
    ).toEqual({
      ADMIN_USER_INVITED: 1,
      ADMIN_USER_ACTIVATED: 1,
      ADMIN_USER_ROLE_CHANGED: 1,
      ADMIN_USER_PASSWORD_CHANGED: 1,
      ADMIN_USER_DEACTIVATED: 1,
    });
  });
});
