# TechSpec: Tela 404 Proxi

## Implementation Summary

Atualizar o componente standalone `NotFound` para renderizar um layout rico de erro 404 usando o shell existente `app-page`, `RouterLink`, ícones FontAwesome já disponíveis e SCSS local.

## Files

- `apps/frontend/src/app/modules/common/not-found/not-found.ts`
- `apps/frontend/src/app/modules/common/not-found/not-found.html`
- `apps/frontend/src/app/modules/common/not-found/not-found.scss`
- `apps/frontend/src/app/modules/common/not-found/not-found.spec.ts`

## Design

- Hero com texto à esquerda e ilustração à direita.
- Título `404` com tratamento visual roxo.
- CTA principal em formato de link/botão para `/customer`.
- Link secundário para `/customer/search`.
- Grade de cards de sugestões, com ícone, título, descrição e seta.
- Faixa final de suporte com ícone e CTA.

## Technical Notes

- Usar `RouterLink` no componente standalone.
- Manter a navegação como links reais para acessibilidade.
- Usar tokens CSS globais quando fizer sentido e valores locais apenas para aproximar o mock.
- Não alterar o componente `ButtonComponent`, pois a CTA principal precisa ser um link navegável.

## Testing

- Atualizar o teste de criação do componente para prover roteamento.
- Adicionar assertions para título, mensagem e quantidade de cards.
- Rodar o teste/build do frontend quando possível.
