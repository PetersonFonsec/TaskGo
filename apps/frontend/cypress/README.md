# E2E da jornada de busca e solicitação de visita

A suíte executa o front Angular real no navegador com APIs simuladas por `cy.intercept`.
Não precisa de backend, banco ou usuário cadastrado; não valida persistência nem integração com o backend real.

Na raiz do repositório, inicie o front:

```sh
npm run start -w apps/frontend
```

Em outro terminal, execute:

```sh
npm run e2e:customer-journey -w apps/frontend
```

Para usar outra instância/porta:

```sh
npm run start -w apps/frontend -- --port 4205
npm run e2e:customer-journey -w apps/frontend -- --config baseUrl=http://localhost:4205
```

## Cobertura

- Login pela interface, categoria, lista de profissionais, perfil completo e agendamento em desktop e celular.
- Filtros de avaliação, distância e preço, persistência na URL após recarga e limpeza.
- Endereço de referência, localização do aparelho permitida/negada e acesso pelo marcador no mapa.
- Busca vazia e recuperação de falha na busca.
- Serviço, endereço de atendimento, datas e horários; resumo e bloqueio de opções indisponíveis.
- Limpeza do horário selecionado ao trocar data ou serviço.
- Cliente sem endereço, agenda vazia e falha ao carregar horários.
- Conflito de horário e erro do servidor com nova tentativa.
- Botão bloqueado durante envio e uma única solicitação no caminho de sucesso.
- Corpo exato de `POST /order` (`serviceId`, `addressId`, `scheduledFor`) e detalhes do pedido pendente após criação.

Os dados compartilhados estão em `support/customer-journey.ts`. O relógio de datas fica em
17/09/2026, com horários dentro dos 14 dias consultados pelo front; timers continuam reais.
As requisições usam aliases, sem esperas fixas (`cy.wait(ms)`). O atraso simulado em uma
resposta testa o estado de envio. Tiles do mapa e telemetria são interceptados para evitar
essas dependências externas. Exceções da aplicação continuam fazendo os testes falharem.

Cypress salva vídeos em `cypress/videos` e capturas de falha em `cypress/screenshots`
(ambos ignorados pelo Git).
