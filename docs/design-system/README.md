# Design System TaskGo

Fundamentos aprovados em novembro de 2026 e como usá-los no web (Angular) e no
app (Ionic). Os tokens vivem em `libs/design-tokens`; as páginas visuais estão no
Storybook do web, em **Fundamentos**.

## Estado atual

Esta é a Etapa 6: os tokens existem e são carregados pelos dois apps, mas
nenhuma tela foi migrada. Os tokens antigos (`--color-*`, `--proxi-*`,
`--space-*`, `--font-size-*` e o azul do Ionic) continuam valendo até a
migração tela a tela, que vem nas próximas etapas.

| Etapa | Tema | Situação |
| --- | --- | --- |
| 1 | Direção B (web atual com a paleta da landing) | Aprovada |
| 2 | Cor, com modo prestador escuro | Aprovada |
| 3 | Tipografia: Manrope e Instrument Serif | Aprovada |
| 4 | Espaço e forma | Aprovada |
| 5 | Ilustração I1 (3D das categorias recolorido) | Aprovada |
| 5 | Ícones: Phosphor | Proposta, aguardando confirmação |
| 6 | Tokens no código e Storybook | Este PR |
| 7 a 10 | Componentes base, componentes de domínio, piloto, migração | A fazer |

Atributos de marca: próximo, confiável, direto e caloroso sem ser infantil.

## Como usar

Os dois apps já têm `libs/design-tokens/src` nos `includePaths` do Sass e
carregam os tokens no `styles.scss` global. Em um componente, use os
custom properties direto:

```scss
.card {
  background: var(--tg-bg-surface);
  border: 1px solid var(--tg-border-default);
  border-radius: var(--tg-radius-lg);
  padding: var(--tg-space-4);
  box-shadow: var(--tg-elevation-1);
}
```

Para os mixins (breakpoints, escala do app, ponte do Ionic):

```scss
@use 'taskgo-tokens' as tg;

.lista {
  @include tg.tg-from(expanded) {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

### Regras

- Componentes usam tokens semânticos (`--tg-bg-*`, `--tg-text-*`,
  `--tg-action-*`, `--tg-status-*`). Primitivos (`--tg-violet-600`) só dentro
  da lib.
- Nada de cor, tamanho de fonte ou sombra literal em componente novo.
- O tema é o atributo `data-theme` no `<html>`, definido pelo `ThemeService`:
  `CUSTOMER` (claro, padrão) ou `PROVIDER` (escuro).

## Fundamentos

### Cor

Três níveis: primitivos, semânticos e de componente. O tema troca só os
semânticos.

| Token | Cliente | Prestador |
| --- | --- | --- |
| `bg-canvas` | #F7F6FB | #0E0C16 |
| `bg-surface` | #FFFFFF | #181525 |
| `bg-subtle` | #EFEDF4 | #221E31 |
| `text-primary` | #181625 | #F4F2FB |
| `text-secondary` | #686574 | #A29DB3 |
| `border-default` | #E2DEEB | #2A2638 |
| `border-strong` | #8A8597 | #7A748C |
| `action-primary` | #5B34F1 (texto branco) | #C9F56D (texto tinta) |
| `action-primary-hover` | #4020C7 | #DDF99E |
| `action-subtle` | #EEEAFD (texto #4020C7) | #2A2638 (texto lima) |
| `accent` | #C9F56D, só preenchimento | #9A80F6 |
| `focus-ring` | #5B34F1 | #C9F56D |

Todas as combinações de texto passam WCAG 2.2 AA (4,5:1 em texto, 3:1 em
bordas de controle e foco).

Status do pedido:

| Status | Token | Cor |
| --- | --- | --- |
| Aguardando profissional | `status-waiting` | aviso |
| Confirmado | `status-confirmed` | informação |
| Profissional a caminho, Em andamento | `status-progress` | marca suave (lima no escuro) |
| Concluído, Pago | `status-done` | sucesso |
| Cancelado, Recusado | `status-cancelled` | perigo |

### Tipografia

Manrope 400, 500, 700 e 800 em toda a interface, com números tabulares em
preço, hora e data. Instrument Serif itálico é a assinatura: uma palavra, só
em `display` ou `title-1`, no máximo uma vez por tela, a partir de 24 px.
Nenhum texto de interface abaixo de 13 px; botões não usam caixa alta.

| Token | Web | App | Peso |
| --- | --- | --- | --- |
| `display` | 44/48 | 32/36 | 800 |
| `title-1` | 32/38 | 26/32 | 800 |
| `title-2` | 24/30 | 22/28 | 800 |
| `title-3` | 19/26 | 18/24 | 700 |
| `body-lg` | 18/28 | 17/26 | 400 |
| `body` | 16/24 | 16/24 | 400 e 700 |
| `body-sm` | 14/20 | 14/20 | 400 e 700 |
| `label` | 14/20 | 15/20 | 700 |
| `overline` | 13/16 | 13/16 | 700, caixa alta, 0.08em |

Os tokens são `--tg-type-<nome>-size` e `--tg-type-<nome>-line`, em rem. O app
aplica a coluna "App" com `@include tg.tg-type-scale-app`. As fontes ainda não
são carregadas pelos apps; isso entra com a migração (no app, empacotadas no
build).

### Espaço e forma

- Espaço, base 4: `--tg-space-0` a `--tg-space-16` (0, 4, 8, 12, 16, 20, 24,
  32, 40, 48, 64 px).
- Raios: `sm` 8, `md` 12, `lg` 16, `xl` 20, `2xl` 28, `full`.
- Controles: `--tg-control-sm` 36, `md` 44 (padrão e alvo mínimo de toque),
  `lg` 52.
- Elevação: 0 plano com borda, 1 cartões, 2 menus, 3 modais com
  `--tg-scrim`. No modo prestador a profundidade vem do tom da superfície.
- Breakpoints: compact abaixo de 600, medium 600, expanded 1024, large 1440.
  Conteúdo até `--tg-content-max` (1200 px).
- Movimento: `fast` 120 ms, `base` 200 ms, `slow` 320 ms; com
  `prefers-reduced-motion`, as durações vão a zero.

### Ícones e ilustração

- Ilustração: o estilo 3D das categorias, recolorido para violeta, lima e
  neutros quentes. A foto do prestador sempre vence a ilustração; sem foto, o
  avatar mostra iniciais.
- Ícones: proposta de Phosphor nas duas plataformas, aguardando confirmação.
  20 px em texto, 24 px em navegação; ícone sozinho sempre com `aria-label`.

## Storybook

```bash
npm run storybook -w apps/frontend        # desenvolvimento, porta 6006
npm run build-storybook -w apps/frontend  # gera apps/frontend/storybook-static
```

A barra **Modo** alterna entre cliente e prestador. Cada componente novo entra
com histórias para seus estados (padrão, foco, desabilitado, erro, carregando)
nos dois modos.
