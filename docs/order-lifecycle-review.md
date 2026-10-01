# Revisão do ciclo do pedido

Revisão em 18/09/2026, baseada no código atual e em consulta somente de leitura ao pedido local 12. Não houve cobrança, estorno, transferência ou confirmação de serviço real.

## Diagnóstico do pedido 12

Estado observado: pedido `EM_DESLOCAMENTO`, prestador `APPROVED`, pagamento `PIX / AUTHORIZED`, valor R$ 60,00, sem eventos na timeline.

`PATCH /order/12/start` só aceita pagamento PIX `PAGO` ou `CAPTURED`. A autorização não satisfaz essa condição. O frontend usa corretamente PATCH; abrir a URL diretamente no navegador não executa essa ação autenticada.

O seed de `src/prisma/seeds/seeds.ts` criava tanto o exemplo em deslocamento quanto o exemplo em andamento com PIX `AUTHORIZED`. Isso reproduz a inconsistência encontrada. O seed foi alterado para criar esses exemplos com `PAGO`, `paidAt` e `capturedAt`. Alterar o arquivo não altera registros existentes. Não execute reset do banco para reparar um único pedido.

O controller agora diferencia pagamento não confirmado (409), etapa incorreta (409), prestador não aprovado (403) e falta de acesso ao pedido (403). A atualização continua condicionada atomicamente ao estado, pagamento e titularidade. Informações financeiras só são consultadas para o prestador responsável.

## Fluxo implementado

| Etapa | Ação | Estado resultante / condição |
| --- | --- | --- |
| Cliente solicita | `POST /order` | `AGUARDANDO_APROVACAO`; valida prestador, endereço, cobertura e disponibilidade; registra preço acordado |
| Prestador aceita | `POST /order/:id/provider/:providerId/confirm` | `AGUARDANDO_PAGAMENTO`; exige responsável aprovado |
| Cliente gera PIX | `POST /orders/:id/payment` | Cria cobrança com divisão plataforma/prestador; exige cadastro de recebimento `READY` e conta `CONFIRMED` |
| PIX é pago | Webhook/conciliação | Pagamento `PAGO`, pedido `AGENDADO` |
| Prestador sai | `PATCH /order/:id/on-the-way` | `AGENDADO` → `EM_DESLOCAMENTO`; exige PIX pago |
| Prestador inicia | `PATCH /order/:id/start` | `EM_DESLOCAMENTO` → `EM_ANDAMENTO`; exige PIX pago |
| Prestador finaliza | `PATCH /orders/:id/finish` | `AGUARDANDO_CONFIRMACAO_CLIENTE`; preço final igual ao acordado e pago; fotos indisponíveis |
| Cliente confirma | `PATCH /orders/:id/confirm` | Concilia pagamento, bloqueia disputa aberta, registra conclusão e muda para `CONCLUIDO` |
| Cliente avalia | `POST /orders/:id/review` | Registra avaliação e atualiza reputação |
| Prestador recebe no banco | Não há confirmação dessa etapa no ciclo revisado | Divisão da cobrança não é comprovante de depósito na conta bancária |

## Pendências encontradas

### Alta — conclusão não controla nem comprova o repasse bancário

`PagarmeService.createOrder` envia o split na criação da cobrança. `ConfirmOrderCompletionHandler` concilia a cobrança e atualiza o pedido, mas não dispara uma transferência condicionada à confirmação do cliente. Não foi encontrado produtor de `PAYMENT_RELEASED` no fluxo de execução revisado.

Assim, o código não sustenta a promessa de que o dinheiro será liberado somente depois da conclusão. O comportamento efetivo de transferência depende da configuração do recebedor no gateway e não foi verificado externamente nesta revisão. É necessário definir a regra de recebimento do produto e implementar conciliação de repasse antes de mostrar depósito bancário como confirmado.

### Média — a interface promete processamento de pagamento após a confirmação

`confirm-service.page.html` informa que o pagamento será processado após confirmar. No fluxo PIX, ele já precisa estar pago antes do início. A confirmação registra conclusão; não executa uma nova cobrança. O texto deve explicar isso sem prometer liberação bancária que o sistema não verifica.

### Média — testes E2E do ciclo estão desatualizados

`test/e2e/order-lifecycle.e2e-spec.ts` cria cartão, espera captura na conclusão e espera fotos aceitas. O código atual bloqueia cartão e fotos. O cenário de prestador também não define explicitamente aprovação e pagamento PIX pago para os casos de sucesso. Essa suíte precisa ser alinhada ao contrato atual e incluir a sequência real de pagamento, deslocamento, início, finalização e confirmação.

Os testes unitários executados não substituem essa validação ponta a ponta nem homologação do recebimento no gateway.

### Média — exemplos financeiros não demonstram ganhos do prestador

Os pagamentos criados diretamente pelo seed não preenchem `providerAmount` e `platformAmount`. O painel soma `providerAmount` e usa zero quando ausente. Portanto, mesmo concluindo os exemplos, eles não comprovam o fluxo de ganhos exibido ao prestador. A divisão de valores ocorre no handler de criação da cobrança real.

### Baixa — evento financeiro duplicado na confirmação

`ConfirmOrderCompletionHandler` adiciona `PAYMENT_CAPTURED` ao confirmar um PIX já pago. A conciliação/webhook pode já ter registrado esse evento antes. Isso mistura confirmação da execução com confirmação financeira e pode duplicar a timeline.

## Validação realizada

- Testes de pedidos, pagamentos e painel do prestador: 14 suítes passaram, 98 testes passaram; 1 suíte e 8 testes ignorados pelas condições existentes de integração/sandbox.
- Novos testes verificam erro para PIX autorizado/pendente/criado/reembolsado, etapa incorreta, outro prestador, aprovação revogada e conflito concorrente.
- Compilação do backend: `npm run build`, código de saída 0.
- Nenhum E2E com gateway real ou transferência bancária foi executado.
- Alterações preexistentes no workspace foram preservadas.
