import { PrismaClient, UserType, ServiceStatus, OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { CategorySeeds } from './category.seed';
import * as bcrypt from 'bcrypt';
import { SBC_LOCATIONS } from './sbc-locations';

const prisma = new PrismaClient();

const SEED_EMAIL_DOMAIN = 'teste.com';
const SEED_PASSWORD = '123456';
const SEED_NOW = new Date('2026-01-05T12:00:00.000Z');

const defaultServiceAvailability = {
  timezone: 'America/Sao_Paulo',
  weekdays: {
    monday: [{ start: '09:00', end: '17:00', slotMinutes: 60 }],
    tuesday: [{ start: '09:00', end: '17:00', slotMinutes: 60 }],
    wednesday: [{ start: '09:00', end: '17:00', slotMinutes: 60 }],
    thursday: [{ start: '09:00', end: '17:00', slotMinutes: 60 }],
    friday: [{ start: '09:00', end: '17:00', slotMinutes: 60 }],
  },
};

async function main() {
  // Keep the development dataset repeatable without touching non-seed users.
  // Orders must be removed first because the client relation is restrictive.
  const seedUsers = await prisma.user.findMany({
    where: { email: { endsWith: `@${SEED_EMAIL_DOMAIN}` } },
    select: { id: true },
  });
  const seedUserIds = seedUsers.map(({ id }) => id);

  if (seedUserIds.length > 0) {
    await prisma.order.deleteMany({
      where: {
        OR: [
          { clientId: { in: seedUserIds } },
          { service: { providerId: { in: seedUserIds } } },
        ],
      },
    });
    await prisma.user.deleteMany({ where: { id: { in: seedUserIds } } });
  }

  await CategorySeeds(prisma);

  // cria 10 clientes
  const clientes = await Promise.all(
    Array.from({ length: 10 }).map(async (_, i) => {
      return prisma.user.create({
        data: {
          name: `Cliente ${i + 1}`,
          email: `cliente${i + 1}@teste.com`,
          passwordHash: await bcrypt.hash(SEED_PASSWORD, 10),
          type: UserType.CLIENTE,
          cpf: `123.456.78${(10 + i).toString().padStart(2, '0')}-90`,
          phone: `+55 11 91${(100000 + i).toString().padStart(6, '0')}`,
          emailVerified: true,
          phoneVerified: true,
          addresses: {
            create: {
              label: `Casa ${i + 1}`,
              street: `Rua dos Clientes ${i + 1}`,
              number: `${100 + i}`,
              city: 'São Paulo',
              state: 'SP',
              cep: '01000-000',
              lat: -23.5505 + i * 0.001,
              lng: -46.6333 + i * 0.001,
              isDefault: true,
            },
          },
        },
      });
    })
  );

  // cria 10 prestadores com serviços
  const prestadores: any[] = await Promise.all(
    Array.from({ length: 10 }).map(async (_, i) => {
      const location = SBC_LOCATIONS[i];

      return prisma.provider.create({
        data: {
          user: {
            create: {
              cpf: `123.456.78${(20 + i).toString().padStart(2, '0')}-90`,
              name: `Prestador ${i + 1}`,
              email: `prestador${i + 1}@teste.com`,
              passwordHash: await bcrypt.hash(SEED_PASSWORD, 10),
              type: UserType.PRESTADOR,
              phone: `+55 11 92${(100000 + i).toString().padStart(6, '0')}`,
              photoUrl: 'https://dummyimage.com/600x400/000/fff',
              addresses: {
                create: {
                  label: 'Atendimento',
                  street: `Rua ${location.bairro}`,
                  number: `${100 + i}`,
                  city: 'São Bernardo do Campo',
                  state: 'SP',
                  cep: '09700-000',
                  lat: location.lat,
                  lng: location.lng,
                  isDefault: true,
                },
              },
            },
          },
          locations:{
            create: {
              lat: location.lat,
              lng: location.lng,
            }
          },
          bio: `Sou o prestador ${i + 1}, especializado em serviços gerais.`,
          verified: i % 2 === 0,
          acceptPix:  i % 2 === 0,
          acceptsCard:  i % 2 === 0,
          emergencyCare:  i % 2 === 0,
          isAvailable24h:  i % 2 === 0,
          services: {
            create: [
              {
                title: `Serviço ${i + 1}A`,
                description: `Descrição do serviço ${i + 1}A`,
                category: 'reparo',
                basePrice: 100 + i * 10,
                availability: defaultServiceAvailability,
                status: ServiceStatus.ATIVO,
              },
              {
                title: `Serviço ${i + 1}B`,
                description: `Descrição do serviço ${i + 1}B`,
                category: 'limpeza',
                basePrice: 80 + i * 5,
                availability: defaultServiceAvailability,
                status: ServiceStatus.ATIVO,
              },
            ],
          },
        },
        include: {
          user: true,
          services: true,
        },
      });
    })
  );

  // cria pedidos ligando clientes e serviços
  for (let i = 0; i < 10; i++) {
    const cliente = clientes[i];
    const prestador = prestadores[i];
    const servico = prestador.services[0];

    const order = await prisma.order.create({
      data: {
        clientId: cliente.id,
        serviceId: servico.id,
        status: OrderStatus.PENDENTE,
        finalPrice: servico.basePrice,
        scheduledFor: new Date(SEED_NOW.getTime() + (i + 1) * 24 * 60 * 60 * 1000),
        payment: {
          create: {
            method: PaymentMethod.PIX,
            status: PaymentStatus.PENDENTE,
            amount: servico.basePrice,
          },
        },
        addressSnap: {
          create: {
            street: 'Rua do Pedido',
            number: '123',
            city: 'São Paulo',
            state: 'SP',
            cep: '02000-000',
            lat: -23.55 + i * 0.001,
            lng: -46.63 + i * 0.001,
          },
        },
      },
    });

    // Create some reviews for a subset of orders (for realism)
    // We'll create reviews for half of the orders (i < 5)
    if (i < 5) {
      const rating = 3 + (i % 3); // 3..5, deterministic
      await prisma.avaliacao.create({
        data: {
          orderId: order.id,
          clientId: cliente.id,
          providerId: prestador.id,
          rating,
          comment: `Avaliação automática: nota ${rating} para o prestador ${prestador.user.name}`,
          // reviewedAt will default to now()
        },
      });
    }
  }

  console.log('✅ Seeds inseridos com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
