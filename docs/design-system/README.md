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
| 5 | Ícones: Phosphor nas duas plataformas | Aprovada |
| 6 | Tokens no código e Storybook | Concluída |
| 7 | Componentes base: botão e ícones (web) | Concluído (PR #12) |
| 7 | Componentes base: campo de texto (web) | Este PR |
| 7 a 10 | Demais componentes base, componentes de domínio, piloto, migração | A fazer |

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

Para os mixins (breakpoints, escala do app, ponte do Ionic), todos expostos
pelo ponto de entrada:

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
| `accent` | #C9F56D (texto tinta) | #9A80F6 (texto tinta) |
| `focus-ring` | #5B34F1 | #C9F56D |

#### Contraste (WCAG 2.2)

Só os pares abaixo são garantidos, e cada um é verificado nos dois temas por
`libs/design-tokens/test/tokens.spec.ts`. Combinações fora da lista não têm
garantia e precisam ser validadas antes do uso.

**Texto (1.4.3, mínimo 4,5:1).** Exigimos 4,5:1 também em texto grande, que
pela norma pediria só 3:1, para não depender do tamanho de quem usa o token.

| Texto | Fundo | Cliente | Prestador |
| --- | --- | --- | --- |
| `text-primary` | `bg-canvas`, `bg-surface`, `bg-subtle` | 15,3 a 17,8 | 14,6 a 17,5 |
| `text-secondary` | `bg-canvas`, `bg-surface`, `bg-subtle` | 4,9 a 5,7 | 6,2 a 7,4 |
| `text-on-action` | `action-primary` / `action-primary-hover` | 6,6 / 9,3 | 14,2 / 15,4 |
| `action-subtle-text` | `action-subtle` | 7,9 | 11,7 |
| `action-subtle-text` | `action-subtle-hover`, `bg-canvas`, `bg-surface` | 6,6 a 9,3 | 9,3 a 15,5 |
| `text-on-danger` | `action-danger` / `action-danger-hover` | 5,9 / 8,0 | 7,8 / 10,2 |
| `feedback-danger-text` | `bg-canvas`, `bg-surface` | 5,4 a 5,9 | 7,8 a 8,5 |
| `text-on-accent` | `accent` | 14,2 | 5,8 |
| `feedback-*-text` | `feedback-*-bg` | 4,7 a 5,4 | 7,4 a 9,1 |
| `status-*-text` | `status-*-bg` | 4,7 a 7,9 | 7,4 a 14,2 |

**Elementos não textuais (1.4.11, nível AA, mínimo 3:1)** contra `bg-canvas`
e `bg-surface`. Para o anel de foco, seguimos também a 2.4.13 (nível AAA): 3:1
entre o estado focado e o não focado, com espessura de pelo menos 2 px.

| Token | Uso | Cliente | Prestador |
| --- | --- | --- | --- |
| `border-strong` | Borda que identifica um controle (campo, checkbox) | 3,3 a 3,6 | 4,0 a 4,3 |
| `focus-ring` | Anel de foco | 6,1 a 6,6 | 14,3 a 15,5 |

**Sem exigência de contraste**, conforme as exceções da norma:

- `border-default`: divisória decorativa. Não pode ser a única borda de um
  controle; nesse caso use `border-strong`.
- `text-disabled`: só para controles inativos.
- `accent` como preenchimento decorativo. Se carregar informação (um
  indicador, por exemplo), precisa de 3:1 contra o fundo e deve ser validado.

Correção feita na revisão: no prestador, `text-on-accent` era branco sobre
violeta 400 (3,09:1). Agora é tinta nos dois temas; a cor do `accent` não
mudou.

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
- Ícones: Phosphor nas duas plataformas, substituindo FontAwesome (web) e
  Ionicons (app) na migração. Contorno no estado normal, preenchido no item
  ativo da navegação. 20 px em texto, 24 px em navegação; ícone sozinho sempre com nome acessível (`aria-label` ou `aria-labelledby`).

### Ponte do Ionic

`@include tg.tg-ionic-theme` liga as variáveis do Ionic (`--ion-color-primary`
e suas variantes `-rgb`, `-contrast`, `-contrast-rgb`, `-shade` e `-tint`,
além de fundo, texto e borda) aos tokens semânticos. Por isso, ela acompanha
o modo cliente e o prestador sem regra extra. Os canais RGB vêm de tokens
próprios (`--tg-action-primary-rgb`, `--tg-text-on-action-rgb`,
`--tg-bg-canvas-rgb`, `--tg-text-primary-rgb`), porque o Ionic usa
`rgba(var(--ion-color-primary-rgb), alfa)`. Os testes conferem se cada
token RGB bate com a cor correspondente.

A ponte **não está aplicada** no app: ela troca o azul atual pelo violeta e
entra só na migração das telas. As cores de sucesso, aviso e perigo do Ionic
ficam de fora até lá.

## Componentes

Especificação compartilhada, implementação por plataforma: o web tem
componentes Angular próprios em `apps/frontend/src/app/shared/design-system`;
o app estiliza os componentes do Ionic com os mesmos tokens.

### Ícone (web)

`<tg-icon name="arrow-right" />`, com `weight` (`regular` ou `fill`), `size`
(20 por padrão) e `label`. Sem `label` é decorativo (`aria-hidden`); com
`label` vira `role="img"`. Os ícones vêm de `libs/icons`, gerados a partir do
Phosphor: só os listados entram no bundle.

### Botão

No web é uma diretiva de atributo sobre o elemento nativo, para manter teclado,
formulário e link funcionando sem reimplementar nada:

```html
<button tgButton type="button">Solicitar</button>
<button tgButton appearance="outline" iconStart="calendar-blank">Agendar</button>
<button tgButton tone="danger" [loading]="salvando()">Cancelar pedido</button>
<a tgButton appearance="ghost" routerLink="/pedidos">Ver pedidos</a>
<button tgButton appearance="ghost" iconStart="x" iconOnly aria-label="Fechar"></button>
```

| Entrada | Valores | Padrão |
| --- | --- | --- |
| `appearance` | `solid`, `subtle`, `outline`, `ghost` | `solid` |
| `tone` | `brand`, `danger` | `brand` |
| `size` | `sm` (36 px), `md` (44 px), `lg` (52 px) | `md` |
| `iconStart`, `iconEnd` | nome de ícone | — |
| `iconOnly` | exige `aria-label` ou `aria-labelledby` com texto (aviso em desenvolvimento) | `false` |
| `loading` | mostra o indicador, mantém o nome e bloqueia o clique | `false` |
| `fullWidth` | ocupa a largura toda | `false` |

`loading`, `fullWidth` e `iconOnly` aceitam a sintaxe de atributo HTML
(`<button tgButton loading>`) e binding (`[loading]="salvando()"`).
`iconOnly="false"` vale como falso.

Regras:

- Uma ação sólida por área. As demais usam `subtle`, `outline` ou `ghost`.
- Indisponível tem três formas:
  - `disabled` nativo (só em `button`): fica com o navegador, que tira o
    botão do Tab e não dispara clique.
  - `aria-disabled="true"` posto pela tela (em `button` ou `a`): continua
    focável e no Tab, mas a ativação é bloqueada. Clique, Enter e Espaço não
    executam handlers, o link não navega e o formulário não envia. O
    atributo é da tela; o componente não o altera.
  - `loading`: não usa `disabled`, para o foco continuar no botão. Ele fica
    com `aria-busy` e `aria-disabled`, e a ativação é bloqueada do mesmo
    jeito.
- Contrato dos atributos durante o carregamento: `aria-disabled` e
  `aria-describedby` são da tela. O botão sobrepõe `aria-disabled="true"` e
  soma o id da descrição "Carregando" ao fim do `aria-describedby`. Se a tela
  mudar um deles no meio do carregamento (por binding ou direto no DOM), o
  botão guarda o novo valor e mantém a sobreposição. Ao terminar, cada
  atributo fica com o último valor da tela, nunca com um valor antigo, e
  sem ids repetidos. Para isso, enquanto carrega, o botão observa só esses
  dois atributos do próprio elemento e para de observar ao terminar.
- Carregando não troca o nome do botão. O conteúdo fica transparente
  (`opacity: 0`, que mantém o texto na árvore de acessibilidade), então
  "Solicitar serviço" continua "Solicitar serviço". O estado vai à parte:
  `aria-busy="true"`, `aria-disabled="true"` (lido como "indisponível") e
  a descrição "Carregando", somada por `aria-describedby` à descrição que a
  tela já tenha. Ao focar, o leitor diz algo como "Solicitar serviço, botão,
  indisponível, Carregando". Limites: o suporte a `aria-busy` varia entre
  leitores, e a mudança de descrição de um botão que já está em foco nem
  sempre é anunciada. Se o resultado da ação precisa ser anunciado, a tela
  usa a sua própria região de status (um toast, por exemplo).
- Movimento reduzido: com `prefers-reduced-motion: reduce`, o indicador para
  de girar e fica como um anel aberto parado, junto com o cursor de
  progresso.
- Botão só de ícone (`iconOnly`) precisa de nome acessível. Use
  `aria-label="Fechar"` ou `aria-labelledby` apontando para um texto. Em
  desenvolvimento, o componente calcula o nome como o navegador
  (`accessible-name.ts`, recorte do algoritmo accname 1.2 conferido contra a
  árvore de acessibilidade do Chrome) e avisa no console quando ele sai
  vazio. Isso cobre:
  - `aria-labelledby` com vários ids e precedência sobre `aria-label`;
  - ids inexistentes e textos vazios ou só com espaços;
  - alvo escondido citado direto (conta) e texto escondido dentro de um
    alvo visível (não conta);
  - `aria-label` e `alt` dentro do alvo;
  - `<label for>` e `title`, que também dão nome.

  O aviso sai uma vez a cada vez que o botão entra no estado inválido. Ele
  reavalia quando `iconOnly` muda, quando `aria-label`, `aria-labelledby`
  ou `title` mudam no próprio botão e quando muda o conteúdo dos alvos do
  `aria-labelledby` (só esses elementos são observados, e só com `iconOnly`
  ativo). Não disparam nova verificação: mudança no texto de um `<label>`
  associado e um id citado que só passa a existir depois. Texto vindo de
  CSS (`::before`) fica fora do cálculo. O componente nunca cria um nome
  sozinho, e a verificação não existe no build de produção.
- O bloqueio atua só no `click` (a ativação), na fase de captura, antes dos
  handlers e do `routerLink`. Teclas como Tab e as setas não são canceladas.
- Perigo sólido no prestador é coral com texto escuro, porque o vermelho do
  cliente não tem contraste suficiente no fundo escuro.
- No app, o botão continua sendo `ion-button`, estilizado pelos tokens na
  migração das telas.

### Campo de texto

No web, `tg-field` envolve um `input` ou `textarea` nativo marcado com
`tgInput`. O input continua recebendo ngModel, formControl, máscara
(ngx-mask), autocomplete e validação nativa diretamente, sem
ControlValueAccessor. O campo cuida do rótulo, da dica e da mensagem de erro:

```html
<tg-field label="E-mail" hint="Usamos para enviar o recibo."
          [error]="email.touched && email.invalid ? 'Informe um e-mail válido.' : ''">
  <input tgInput type="email" name="email" autocomplete="email"
         required [(ngModel)]="payload.email" #email="ngModel" />
</tg-field>

<tg-field label="Senha">
  <input tgInput type="password" autocomplete="current-password" formControlName="password" />
  <tg-password-toggle tgSuffix />
</tg-field>

<tg-field label="Valor da hora">
  <span tgPrefix>R$</span>
  <input tgInput inputmode="decimal" formControlName="price" />
</tg-field>
```

| Entrada | Valores | Padrão |
| --- | --- | --- |
| `label` | texto do rótulo, sempre obrigatório | — |
| `hint` | texto de apoio abaixo do campo | `''` |
| `error` | mensagem dizendo como corrigir; vazia é sem erro | `''` |
| `optional` | marca "(opcional)" no rótulo | `false` |
| `variant` | `default` ou `search` (pílula, lupa, rótulo só para leitor de tela) | `default` |

Regras:

- Rótulo sempre visível e acima do campo (também no app). O placeholder é
  só exemplo e nunca substitui o rótulo.
- Erro com borda de perigo e mensagem escrita com ícone, nunca só pela cor.
  A tela decide quando mostrar; o padrão é depois que a pessoa sai do campo
  (`touched`) ou tenta enviar.
- Desabilitado sem opacidade (fundo suave, texto apagado). Somente leitura
  tem fundo suave e texto normal.
- Sem estado verde de "válido". Obrigatório não leva asterisco; opcional
  leva "(opcional)".
- Altura de 44 px (`control-md`), raio de 12 px, borda de 1,5 px
  `border-strong` e texto de 16 px, que evita o zoom do iOS ao focar. Foco
  com o mesmo anel do botão.

Acessibilidade:

- O rótulo dá nome ao input por `label for`; o id é gerado, ou o `id` da
  tela é mantido.
- Dica ou erro entram no `aria-describedby`, somados a um
  `aria-describedby` estático da tela. `aria-invalid="true"` só com erro.
- A área da mensagem tem `aria-live="polite"`, então o erro é anunciado
  quando aparece.
- `tg-password-toggle` é um botão `type="button"` com nome fixo "Mostrar
  senha", `aria-pressed` e `aria-controls`; ele troca o `type` do input.
- Use `autocomplete` e `inputmode` certos (`email`, `tel`,
  `current-password`, `new-password`, `postal-code`).

No app, o campo continua sendo `ion-input`, com
`labelPlacement="stacked"`, `fill="outline"`, `helperText` e `errorText`,
estilizado pelos tokens na migração das telas. O `app-input-text` do web
convive com o `tg-field` até a migração tela a tela.

## Testes

```bash
npx nx run design-tokens:test       # contratos, contraste, API Sass e integração
npx nx run design-tokens:typecheck
```

Os testes cobrem:

- os tokens obrigatórios nos dois temas, sem referência a variável
  inexistente;
- os pares de contraste acima;
- `tg-from()` (inclusive com breakpoint inválido), `tg-type-scale-app` e
  `tg-ionic-theme`;
- a ligação com o web e o app: `includePaths`, escala do celular, ponte
  desligada e tokens antigos preservados;
- os tokens citados nas histórias de fundamentos.

Todos rodam no CI, junto com o build do Storybook.

## Storybook

```bash
npm run storybook -w apps/frontend        # desenvolvimento, porta 6006
npm run build-storybook -w apps/frontend  # gera apps/frontend/storybook-static
```

A barra **Modo** alterna entre cliente e prestador. Cada componente novo entra
com histórias para seus estados (padrão, foco, desabilitado, erro, carregando)
nos dois modos.
