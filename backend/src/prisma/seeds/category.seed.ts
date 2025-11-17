import { PrismaClient } from "@prisma/client";

type Sub = { name: string; slug: string; description?: string; icon?: string; sortOrder?: number };
type Cat = { name: string; slug: string; description?: string; icon?: string; sortOrder?: number; subs: Sub[] };

const DATA: Cat[] = [
  {
    name: 'Limpeza',
    slug: 'limpeza',
    description: 'Serviços de limpeza e conservação',
    icon: 'mdi-broom',
    sortOrder: 10,
    subs: [
      { name: 'Residencial', slug: 'residencial', description: 'Casas e apartamentos', icon: 'mdi-home', sortOrder: 10 },
      { name: 'Comercial', slug: 'comercial', description: 'Escritórios e lojas', icon: 'mdi-office-building', sortOrder: 20 },
      { name: 'Pós-obra', slug: 'pos-obra', description: 'Após reformas e obras', icon: 'mdi-hammer', sortOrder: 30 },
      { name: 'Jardinagem', slug: 'jardinagem', description: 'Jardins e podas', icon: 'mdi-flower', sortOrder: 40 },
      { name: 'Faxina expressa', slug: 'faxina-expressa', description: 'Limpezas rápidas', icon: 'mdi-flash', sortOrder: 50 },
    ],
  },
  {
    name: 'Reparo',
    slug: 'reparo',
    description: 'Manutenção residencial e técnica',
    icon: 'mdi-tools',
    sortOrder: 20,
    subs: [
      { name: 'Elétrica', slug: 'eletrica', description: 'Instalação e manutenção elétrica', icon: 'mdi-lightning-bolt', sortOrder: 10 },
      { name: 'Hidráulica', slug: 'hidraulica', description: 'Encanadores e desentupimentos', icon: 'mdi-water', sortOrder: 20 },
      { name: 'Montagem de móveis', slug: 'montagem-moveis', description: 'Montagem/instalação de móveis', icon: 'mdi-sofa', sortOrder: 30 },
      { name: 'Pintura', slug: 'pintura', description: 'Pintura interna e externa', icon: 'mdi-format-color-fill', sortOrder: 40 },
      { name: 'Pequenos consertos', slug: 'pequenos-consertos', description: 'Ajustes e reparos gerais', icon: 'mdi-tools', sortOrder: 50 },
    ],
  },
  {
    name: 'Automotivo',
    slug: 'automotivo',
    description: 'Serviços para veículos',
    icon: 'mdi-car-wrench',
    sortOrder: 30,
    subs: [
      { name: 'Mecânica', slug: 'mecanica', description: 'Manutenção e revisão', icon: 'mdi-car-wrench', sortOrder: 10 },
      { name: 'Elétrica automotiva', slug: 'eletrica-automotiva', description: 'Diagnóstico elétrico', icon: 'mdi-car-electric', sortOrder: 20 },
      { name: 'Funilaria e pintura', slug: 'funilaria-pintura', description: 'Lataria e pintura', icon: 'mdi-spray', sortOrder: 30 },
      { name: 'Chaveiro automotivo', slug: 'chaveiro-automotivo', description: 'Abertura e chaves', icon: 'mdi-key', sortOrder: 40 },
      { name: 'Lava rápido / estética', slug: 'lava-rapido-estetica', description: 'Lavagem e detalhamento', icon: 'mdi-water', sortOrder: 50 },
    ],
  },
  {
    name: 'Beleza e Cuidados',
    slug: 'beleza-e-cuidados',
    description: 'Beleza, estética e bem-estar',
    icon: 'mdi-face-woman',
    sortOrder: 40,
    subs: [
      { name: 'Cabeleireiro', slug: 'cabeleireiro', description: 'Corte, escova e coloração', icon: 'mdi-content-cut', sortOrder: 10 },
      { name: 'Manicure e pedicure', slug: 'manicure-pedicure', description: 'Unhas e cuidados', icon: 'mdi-hand-heart', sortOrder: 20 },
      { name: 'Maquiagem', slug: 'maquiagem', description: 'Make para eventos e dia a dia', icon: 'mdi-brush', sortOrder: 30 },
      { name: 'Estética corporal', slug: 'estetica-corporal', description: 'Tratamentos corporais e faciais', icon: 'mdi-face-woman', sortOrder: 40 },
      { name: 'Massagem / bem-estar', slug: 'massagem-bem-estar', description: 'Relaxamento e terapias', icon: 'mdi-leaf', sortOrder: 50 },
    ],
  },
  {
    name: 'Cuidados Pessoais',
    slug: 'cuidados-pessoais',
    description: 'Apoio familiar, idosos, saúde domiciliar',
    icon: 'mdi-hands-heart',
    sortOrder: 50,
    subs: [
      { name: 'Babá', slug: 'baba', description: 'Cuidados infantis', icon: 'mdi-baby', sortOrder: 10 },
      { name: 'Cuidador de idosos', slug: 'cuidador-idosos', description: 'Acompanhamento e cuidados', icon: 'mdi-account-heart', sortOrder: 20 },
      { name: 'Acompanhante domiciliar', slug: 'acompanhante-domiciliar', description: 'Apoio no dia a dia', icon: 'mdi-home-heart', sortOrder: 30 },
      { name: 'Enfermagem domiciliar', slug: 'enfermagem-domiciliar', description: 'Curativos e medicação', icon: 'mdi-hospital-box', sortOrder: 40 },
      { name: 'Personal trainer', slug: 'personal-trainer', description: 'Treino personalizado', icon: 'mdi-dumbbell', sortOrder: 50 },
    ],
  },
  {
    name: 'Educação e Aulas',
    slug: 'educacao-e-aulas',
    description: 'Aulas particulares, reforço e cursos',
    icon: 'mdi-school',
    sortOrder: 60,
    subs: [
      { name: 'Reforço escolar', slug: 'reforco-escolar', description: 'Fundamental ao médio', icon: 'mdi-book-education', sortOrder: 10 },
      { name: 'Aulas de idiomas', slug: 'aulas-idiomas', description: 'Inglês, espanhol etc.', icon: 'mdi-translate', sortOrder: 20 },
      { name: 'Música e instrumentos', slug: 'musica-instrumentos', description: 'Violão, teclado, canto', icon: 'mdi-music', sortOrder: 30 },
      { name: 'Cursos técnicos', slug: 'cursos-tecnicos', description: 'Tech, design, negócios', icon: 'mdi-school', sortOrder: 40 },
      { name: 'Vestibular/ENEM', slug: 'vestibular-enem', description: 'Preparatórios', icon: 'mdi-book-open-variant', sortOrder: 50 },
    ],
  },
  {
    name: 'Pets',
    slug: 'pets',
    description: 'Serviços para animais de estimação',
    icon: 'mdi-dog',
    sortOrder: 70,
    subs: [
      { name: 'Passeio de cães', slug: 'passeio-caes', description: 'Dog walker', icon: 'mdi-dog', sortOrder: 10 },
      { name: 'Banho e tosa', slug: 'banho-tosa', description: 'Higiene e cuidado', icon: 'mdi-shower', sortOrder: 20 },
      { name: 'Adestramento', slug: 'adestramento', description: 'Comportamento e treino', icon: 'mdi-dog-service', sortOrder: 30 },
      { name: 'Pet sitter', slug: 'pet-sitter', description: 'Cuidado em casa', icon: 'mdi-home-variant', sortOrder: 40 },
      { name: 'Hospedagem', slug: 'hospedagem', description: 'Creche/hotel para pets', icon: 'mdi-home-heart', sortOrder: 50 },
    ],
  },
  {
    name: 'Eventos e Lazer',
    slug: 'eventos-e-lazer',
    description: 'Produção, cobertura e entretenimento',
    icon: 'mdi-party-popper',
    sortOrder: 80,
    subs: [
      { name: 'Fotografia', slug: 'fotografia', description: 'Ensaio, eventos', icon: 'mdi-camera', sortOrder: 10 },
      { name: 'Filmagem', slug: 'filmagem', description: 'Vídeo e edição', icon: 'mdi-video', sortOrder: 20 },
      { name: 'Buffet / catering', slug: 'buffet-catering', description: 'Comidas e bebidas', icon: 'mdi-silverware-fork-knife', sortOrder: 30 },
      { name: 'DJ / músicos', slug: 'dj-musicos', description: 'Shows e trilhas', icon: 'mdi-music-circle', sortOrder: 40 },
      { name: 'Decoração de festas', slug: 'decoracao-festas', description: 'Decoração e cenografia', icon: 'mdi-balloon', sortOrder: 50 },
    ],
  },
  {
    name: 'Transporte e Mudanças',
    slug: 'transporte-e-mudancas',
    description: 'Carreto, frete, motoboy e mudanças',
    icon: 'mdi-truck',
    sortOrder: 90,
    subs: [
      { name: 'Carreto / frete', slug: 'carreto-frete', description: 'Transporte leve/médio', icon: 'mdi-truck-outline', sortOrder: 10 },
      { name: 'Caminhão de mudança', slug: 'caminhao-mudanca', description: 'Mudanças completas', icon: 'mdi-truck-fast', sortOrder: 20 },
      { name: 'Motoboy', slug: 'motoboy', description: 'Entregas rápidas', icon: 'mdi-motorbike', sortOrder: 30 },
      { name: 'Objetos frágeis', slug: 'objetos-frageis', description: 'Transporte especializado', icon: 'mdi-fragile', sortOrder: 40 },
      { name: 'Transporte de animais', slug: 'transporte-animais', description: 'Traslado pet', icon: 'mdi-paw', sortOrder: 50 },
    ],
  },
  {
    name: 'Tecnologia e Consultoria',
    slug: 'tecnologia-e-consultoria',
    description: 'TI, marketing, finanças e consultorias',
    icon: 'mdi-laptop',
    sortOrder: 100,
    subs: [
      { name: 'Suporte técnico', slug: 'suporte-tecnico', description: 'Computadores e celulares', icon: 'mdi-laptop', sortOrder: 10 },
      { name: 'Desenvolvimento', slug: 'desenvolvimento', description: 'Sites, apps, automações', icon: 'mdi-code-tags', sortOrder: 20 },
      { name: 'Marketing digital', slug: 'marketing-digital', description: 'Redes, tráfego, SEO', icon: 'mdi-bullhorn', sortOrder: 30 },
      { name: 'Contabilidade', slug: 'contabilidade', description: 'Fiscal/contábil para PMEs', icon: 'mdi-calculator', sortOrder: 40 },
      { name: 'Consultoria jurídica', slug: 'consultoria-juridica', description: 'Cível, trabalhista, contratos', icon: 'mdi-scale-balance', sortOrder: 50 },
    ],
  },
];

export async function CategorySeeds(prisma: PrismaClient) {
  for (const cat of DATA) {
    // Upsert da categoria por slug
    const category = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        description: cat.description,
        icon: cat.icon,
        sortOrder: cat.sortOrder ?? 0,
        isActive: true,
      },
      create: {
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        icon: cat.icon,
        sortOrder: cat.sortOrder ?? 0,
        isActive: true,
      },
    });

    // Upsert de subcategorias pela unique composta (categoryId + slug)
    for (const s of cat.subs) {
      await prisma.subcategory.upsert({
        where: { categoryId_slug: { categoryId: category.id, slug: s.slug } },
        update: {
          name: s.name,
          description: s.description,
          icon: s.icon,
          sortOrder: s.sortOrder ?? 0,
          isActive: true,
        },
        create: {
          categoryId: category.id,
          name: s.name,
          slug: s.slug,
          description: s.description,
          icon: s.icon,
          sortOrder: s.sortOrder ?? 0,
          isActive: true,
        },
      });
    }
  }

  console.log('✅ Categorias e subcategorias seed: OK');
}
