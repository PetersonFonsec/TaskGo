import { PrismaClient } from '@prisma/client';
const url = new URL(process.env.DATABASE_URL ?? '');
if (process.env.NODE_ENV !== 'test' || url.pathname !== '/taskgo_test')
  throw new Error(
    'E2E security tests require the dedicated taskgo_test database',
  );
const prisma = new PrismaClient();
// Independent scenarios must not consume one another's IP/account abuse budgets.
beforeEach(async () => {
  await prisma.securityRateLimit.deleteMany();
});
afterAll(async () => {
  await prisma.$disconnect();
});
