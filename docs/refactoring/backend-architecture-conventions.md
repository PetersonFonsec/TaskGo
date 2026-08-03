# Backend architecture conventions

Convenções que orientam as próximas entregas de refatoração. Elas preservam as regras locais em `.agents/rules/backend.md` e evitam uma reestruturação incompatível com o projeto.

## Estratégia

- Refatorar incrementalmente, um caso de uso por vez.
- Preservar contratos HTTP durante mudanças internas.
- Separar alterações estruturais de alterações de comportamento.
- Criar ou fortalecer testes de caracterização antes de mover lógica crítica.
- Não criar camadas ou interfaces sem uma necessidade concreta no módulo.

## Estrutura dos módulos

O padrão canônico é o já utilizado por `modules/auth`:

```text
modules/<module>/
├── <module>.module.ts
├── <module>.controller.ts
├── <module>.service.ts
├── commands/
│   ├── index.ts
│   └── <write-use-case>/
│       ├── <use-case>.command.ts
│       ├── <use-case>.dto.ts
│       └── <use-case>.handler.ts
├── queries/
│   ├── index.ts
│   └── <read-use-case>/
│       ├── <use-case>.query.ts
│       ├── <use-case>.dto.ts
│       └── <use-case>.handler.ts
├── dto/
├── events/
└── exceptions/
```

- Escritas novas ou extraídas devem ficar em `commands`.
- Leituras novas ou extraídas devem ficar em `queries`.
- Services coordenam persistência e integrações quando a extração ainda não se justifica.
- Prisma continua sendo acessado exclusivamente por `PrismaService`.

## Controllers

Controllers podem somente:

- declarar rotas e metadados de autenticação;
- receber entradas já validadas;
- obter a identidade estabelecida pelo guard;
- delegar para service, command ou query;
- devolver o resultado do caso de uso.

Parsing de token, autorização de negócio, composição de filtros Prisma e transições de estado não pertencem ao controller.

## Commands e queries

- Um handler representa um caso de uso e um motivo principal para mudar.
- Commands não devem ser usados para leitura.
- Queries não devem produzir efeitos colaterais de negócio.
- Autorização que depende do recurso deve ser validada no caso de uso.
- Transações devem abranger todas as escritas do caso de uso; chamadas internas não podem escapar pelo `PrismaService` global.

## Contratos e tipagem

- DTOs validam entradas HTTP; não são modelos de persistência.
- Respostas públicas devem ter contrato explícito e não expor modelos Prisma completos por conveniência.
- Evitar novos `any`; entradas e retornos públicos são a primeira prioridade de tipagem.
- Identificadores Prisma são `bigint` internamente e strings JSON-safe nas respostas públicas.
- Contratos neutros compartilhados por frontend e backend pertencem a `libs/shared`.

## Testes e conclusão

- Refatoração sem mudança funcional deve manter os testes de caracterização.
- Mudança de regra exige teste demonstrando o comportamento pretendido.
- Preferir teste unitário de handler para regras e E2E para HTTP, guards e transações reais.
- Nenhuma entrega pode ser declarada concluída sem evidência fresca de verificação ou registro explícito do bloqueio ambiental.
