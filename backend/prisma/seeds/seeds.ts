import { PrismaClient, UserType, ServiceStatus, OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { CategorySeeds } from './category.seed';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // cria 10 clientes
  const clientes = await Promise.all(
    Array.from({ length: 10 }).map(async (_, i) => {
      return prisma.user.create({
        data: {
          name: `Cliente ${i + 1}`,
          email: `cliente${i + 1}@teste.com`,
          passwordHash: await bcrypt.hash('123456', 10),
          type: UserType.CLIENTE,
          cpf: `123.456.78${(10 + i).toString().padStart(2, '0')}-90`,
          phone: `+55 11 9${Math.floor(10000000 + Math.random() * 89999999)}`,
          addresses: {
            create: {
              label: 'Casa',
              street: `Rua dos Clientes ${i + 1}`,
              number: `${100 + i}`,
              city: 'São Paulo',
              state: 'SP',
              cep: '01000-000',
              lat: -23.5505 + Math.random() * 0.01,
              lng: -46.6333 + Math.random() * 0.01,
              isDefault: true,
            },
          },
        },
      });
    })
  );

  // cria 10 prestadores com serviços
  const prestadores = await Promise.all(
    Array.from({ length: 10 }).map(async (_, i) => {
      return prisma.provider.create({
        data: {
          user: {
            create: {
              cpf: `123.456.78${(20 + i).toString().padStart(2, '0')}-90`,
              name: `Prestador ${i + 1}`,
              email: `prestador${i + 1}@teste.com`,
              passwordHash: await bcrypt.hash('123456', 10),
              type: UserType.PRESTADOR,
              phone: `+55 11 9${Math.floor(10000000 + Math.random() * 89999999)}`,
              photoUrl: 'https://dummyimage.com/600x400/000/fff'
            },
          },
          bio: `Sou o prestador ${i + 1}, especializado em serviços gerais.`,
          verified: i % 2 === 0,
          services: {
            create: [
              {
                title: `Serviço ${i + 1}A`,
                description: `Descrição do serviço ${i + 1}A`,
                category: 'reparo',
                basePrice: 100 + i * 10,
                status: ServiceStatus.ATIVO,
              },
              {
                title: `Serviço ${i + 1}B`,
                description: `Descrição do serviço ${i + 1}B`,
                category: 'limpeza',
                basePrice: 80 + i * 5,
                status: ServiceStatus.ATIVO,
              },
            ],
          },
        },
        include: { user: true, services: true },
      });
    })
  );

  // cria pedidos ligando clientes e serviços
  for (let i = 0; i < 10; i++) {
    const cliente = clientes[i];
    const prestador = prestadores[i];
    const servico = prestador.services[0];

    await prisma.order.create({
      data: {
        clientId: cliente.id,
        serviceId: servico.id,
        status: OrderStatus.PENDENTE,
        finalPrice: servico.basePrice,
        scheduledFor: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
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
            lat: -23.55 + Math.random() * 0.01,
            lng: -46.63 + Math.random() * 0.01,
          },
        },
      },
    });
  }

  await CategorySeeds(prisma);
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
