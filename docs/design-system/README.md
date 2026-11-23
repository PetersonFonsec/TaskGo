# Design System TaskGo

Fundamentos aprovados em novembro de 2026 e como usá-los no web (Angular) e no
app (Ionic). Os tokens vivem em `libs/design-tokens`; as páginas visuais estão no
Storybook do web, em **Fundamentos**.

## Estado atual

Os tokens existem e são carregados pelos dois apps. As primeiras telas
migradas são os inícios do cliente e do prestador no web (Etapa 9, telas
piloto), os detalhes e o pagamento do pedido e a busca de profissionais (Etapa 10). Nas demais, os tokens
antigos (`--color-*`, `--proxi-*`, `--space-*` e `--font-size-*`) continuam
valendo até a migração tela a tela. No app (Ionic), as seis telas já usam os
tokens (veja "Migração do app").

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
| 7 | Componentes base: campo de texto (web) | Concluído (PR #13) |
| 7 | Componentes base: card (web) | Concluído (PR #14) |
| 7 | Componentes base: badge de status (web) | Concluído (PR #15) |
| 7 | Componentes base: navegação (web) | Concluído (PR #16) |
| 7 | Componentes base: abas (web) | Concluído (PR #17) |
| 7 | Componentes base: diálogo e painel (web) | Concluído (PR #18) |
| 7 | Componentes base: toast e alerta (web) | Concluído (PR #19) |
| 7 | Componentes base: skeleton (web) | Concluído (PR #20) |
| 7 | Componentes base: estado vazio (web) | Concluído (PR #21) |
| 8 | Domínio: card de prestador, linha de pedido, card de agendamento (web) | Concluído (PRs #22, #23 e #24) |
| 9 | Piloto: início do cliente (web) | Concluído (PR #25) |
| 9 | Piloto: início do prestador (web) | Concluído (PR #27) |
| 10 | Migração tela a tela (web e app) | Em andamento |
| 10 | Detalhes do pedido (web) | Concluído (PR #33) |
| 10 | Pagamento do pedido (web) | Concluído (PR #35) |
| 10 | Busca de profissionais (web) | Concluído (PR #35) |
| 10 | Entrar, recuperar acesso e Criar conta (web) | Concluído (PR #37) |
| 10 | Passos do cadastro e conta criada (web) | Concluído (PR #38) |
| 10 | Shell logado: topo, abas, conta e rodapé (web) | Concluído (PR #41) |
| 10 | Pedidos (web) | Concluído (PRs #41 e #89) |
| 10 | Favoritos (web) | Concluído (PR #52) |
| 10 | Meus serviços (web) | Concluído (PR #52) |
| 10 | Ganhos (web) | Concluído (PR #54) |
| 10 | Responder solicitação (web) | Concluído (PR #77) |
| 10 | Dados pessoais (web) | Concluído (PRs #78 e #91) |
| 10 | Conta (web) | Concluído (PR #80) |
| 10 | Endereços (web) | Concluído (PR #79) |
| 10 | Finalizar serviço (web) | Concluído (PR #81) |
| 10 | Confirmar conclusão (web) | Concluído (PR #82) |
| 10 | Avaliar atendimento (web) | Concluído (PR #83) |
| 10 | Reportar problema (web) | Concluído (PR #84) |
| 10 | Perfil do profissional (web) | Concluído (PR #85) |
| 10 | Institucionais (web) | Concluído (PR #86) |
| 10 | Página não encontrada (web) | Concluído (PR #87) |
| 10 | App (Ionic): base, abas e as seis telas | Este PR |

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

A ponte **está aplicada** no app (`apps/mobile/src/styles.scss`), junto com a
escala de tipo do app. O app é só do cliente: vale o tema claro, e a paleta
escura do Ionic saiu (o modo escuro do aparelho brigaria com os tokens). As
cores de sucesso, aviso e perigo do Ionic não são usadas pelas telas: alertas
e badges usam as classes do app abaixo.

#### Migração do app (Etapa 10)

- Componentes do Ionic com a aparência dos tokens no `styles.scss` global
  (`ion-toolbar` na superfície, `ion-button` de 44 px sem caixa alta,
  `ion-input` com rótulo acima, `ion-card`, `ion-item`, `ion-searchbar`,
  `ion-segment`, `ion-skeleton-text`, `ion-tab-bar`).
- Classes compartilhadas, equivalentes aos componentes do web: `.tg-alert`
  (`--danger`, `--info`, `--success`, `--warning`), `.tg-empty`,
  `ion-badge.tg-status--<tom>` (mesmo mapa de status, por
  `orderStatusTone()`), `.tg-avatar` (foto ou iniciais), `.tg-list`,
  `.tg-section`, `.tg-overline`, `.tg-title-1/2/3`, `.tg-lead`,
  `.tg-signature` e `.tg-num`.
- Ícones Phosphor com o mesmo `tg-icon` do web
  (`apps/mobile/src/app/shared/ui`); o Ionicons saiu das telas.
- Navegação: `ion-tabs` com Início (`/inicio`, e `/` leva até lá) e Pedidos
  (`/pedidos`, com login). Buscar, Favoritos e Conta entram quando essas
  telas existirem no app; nenhuma aba leva a lugar nenhum. Categoria,
  profissional, pedido e login ficam fora das abas, com voltar.
- As fontes (Manrope e Instrument Serif) ainda não são empacotadas no app:
  como no web, valem as fontes de sistema da pilha de `--tg-font-sans`.

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
- `aria-describedby` e `aria-invalid` são divididos com a tela, que pode
  usar atributo estático, binding (`[attr.aria-describedby]`) ou o DOM:
  - `aria-describedby`: os ids da tela vêm primeiro, depois o da dica ou do
    erro, sem repetição. Ao trocar entre dica e erro, só o id do campo muda.
  - `aria-invalid`: com erro visível no campo, vale `"true"`. Sem erro, vale
    o valor mais recente da tela, ou nenhum. O campo não mexe na validação
    do FormControl.
  - Para isso, a diretiva observa só esses dois atributos do próprio input
    e para de observar quando é destruída.
- A área da mensagem tem `aria-live="polite"`, então o erro é anunciado
  quando aparece.
- `tg-password-toggle` é um botão `type="button"` com nome fixo "Mostrar
  senha", `aria-pressed` (que segue o tipo real do input) e
  `aria-controls`; ele troca o `type` do input entre password e text. Fica
  indisponível sem input, com input que não é de senha e com o input
  desabilitado. Desabilitar o input oculta a senha de novo.
- Use `autocomplete` e `inputmode` certos (`email`, `tel`,
  `current-password`, `new-password`, `postal-code`).

No app, o campo continua sendo `ion-input`, com
`labelPlacement="stacked"`, `fill="outline"`, `helperText` e `errorText`,
estilizado pelos tokens na migração das telas. O `app-input-text` do web
convive com o `tg-field` até a migração tela a tela.

### Card

Uma superfície com três aparências, base dos cards de domínio da Etapa 8
(prestador, serviço, agendamento). O conteúdo é da tela; o componente não
leva role nem fixa o nível do título. No web, o mesmo componente vale para
três elementos, conforme o que o card faz:

```html
<!-- Só conteúdo -->
<tg-card>…</tg-card>

<!-- O card inteiro é um link (sem ações dentro) -->
<a tgCard routerLink="/categorias/limpeza">…</a>

<!-- Com ações dentro: o título é o link e se estica sobre o card -->
<tg-card appearance="elevated">
  <h3><a tgCardLink [routerLink]="['/prestador', p.id]">{{ p.nome }}</a></h3>
  <button tgButton appearance="ghost" iconStart="star" iconOnly
          [attr.aria-label]="'Favoritar ' + p.nome"></button>
</tg-card>

<!-- Escolha: o card é o label de um rádio ou checkbox nativo -->
<label tgCard>
  <input type="radio" name="categoria" value="limpeza" [(ngModel)]="categoria" />
  …
</label>
```

| Entrada | Valores | Padrão |
| --- | --- | --- |
| `appearance` | `outlined`, `elevated` (só destaque), `subtle` (dentro de outra superfície) | `outlined` |
| `dense` | padding de 16 px em vez de 20, para grades densas | `false` |
| `indicator` | só em `label tgCard`: `check` (input oculto e ✓ no canto) ou `control` (input visível) | `check` |

Regras:

- Raio de 16 px (`radius-lg`), padding de 20 px, fundo `bg-surface`.
- Contorno é o padrão. O elevado usa `elevation-1`; no prestador, onde a
  elevação 1 é vazia, ele ganha a borda `border-default`.
- Clicável (link, escolha ou card com link esticado): o hover troca a borda
  por `border-strong` e soma a sombra, sem mudar de tamanho. O foco usa o
  mesmo anel do botão, no card inteiro.
- Selecionado: borda de 2 px na cor de ação (o padding compensa, sem
  deslocar o conteúdo) e o ✓ no canto, ou o rádio visível com
  `indicator="control"`. Nunca só a cor.
- Desabilitado (input `disabled`): fundo suave e texto apagado, sem
  opacidade.
- Um card, um destino. Com ações dentro (favoritar, remarcar), o link vai no
  título (`tgCardLink`) e o seu `::after` cobre o card. Botões, links e
  campos do card ficam por cima e continuam funcionando, inclusive dentro
  de componentes da tela com o encapsulamento padrão do Angular. Uma ação
  que o CSS do card não alcança (componente com shadow DOM, web component,
  elemento clicável com `role`) leva o atributo `tgCardAction` no host:
  `<app-compartilhar tgCardAction />`. O link precisa ter o `tg-card` como
  ancestral posicionado mais próximo (não envolva o título em elemento com
  `position`).
- Imagem do card é decorativa (`alt=""`) quando o título já diz o que ela
  mostra.

Acessibilidade:

- Card inteiro clicável é um `a` nativo, nunca um div com click. Ele não
  pode conter botões, links ou campos.
- Com ações dentro, só o título é o link: o leitor de tela ouve um nome
  curto ("Marina Souza") em vez do card inteiro.
- Escolha é um rádio ou checkbox nativo dentro do `label`, em qualquer
  nível: o nome vem do conteúdo do label, e teclado (Tab, setas, Espaço) e
  o estado "selecionado" vêm do navegador. Agrupe com `role="radiogroup"` e
  `aria-label`, ou com `fieldset` e `legend`.
- Foco da escolha: um anel só, no card (`focus-ring`, 2 px), nas variantes
  `check` e `control`; o anel do input sai para não duplicar. Segue
  `:focus-visible`, então aparece no teclado e não no clique.
- Listas de cards ficam em `ul`/`li`.
- Em desenvolvimento, o componente avisa no console quando um `a tgCard`
  contém elementos interativos, quando um `label tgCard` não tem input
  radio ou checkbox e quando `tgCardLink` está fora de um `tg-card`.
  - Os dois primeiros são conferidos depois da primeira renderização e a
    cada mudança no conteúdo do card (um `@if` que insere um botão, um
    input que muda de tipo), por um MutationObserver só no próprio card,
    desligado quando ele é destruído. O aviso sai uma vez a cada vez que a
    marcação entra no estado inválido.
  - O lugar do `tgCardLink` vem da injeção de dependência e não muda, então
    é conferido uma vez.
  - Nada disso existe no build de produção, e o componente não corrige a
    marcação.

No app, o card é `ion-card`, estilizado pelos tokens na migração das telas
(raio, borda, sem a margem e a sombra padrão do Ionic). Os cards atuais do
web (`app-card`, `card-menu`, `card-detail`, `card-thumb` e os de
agendamento e histórico) convivem com o `tg-card` até a migração tela a
tela; os de domínio viram componentes sobre ele na Etapa 8.

### Badge de status

Etiqueta que só mostra: o status de um pedido ou pagamento, ou uma marca
como "Principal". Nunca é clicável nem recebe foco; o que se escolhe é
rádio, card de escolha ou chip.

```html
<tg-badge tone="done">Concluído</tg-badge>
<tg-badge tone="progress" icon="map-pin">Profissional a caminho</tg-badge>
<tg-badge>Principal</tg-badge>
<tg-badge tone="accent">Novo no TaskGo</tg-badge>
```

| Entrada | Valores | Padrão |
| --- | --- | --- |
| `tone` | `waiting`, `confirmed`, `progress`, `done`, `cancelled` (status); `neutral`, `accent` (etiquetas) | `neutral` |
| `icon` | nome de ícone, opcional e decorativo, antes do texto | — |

Regras:

- Status sempre com texto; a cor reforça, nunca é a única informação.
- Os tons de status são só os cinco da Etapa 2 (`--tg-status-*`). Status
  novo entra no mapa abaixo, não ganha cor nova. Etiquetas usam `neutral`
  (`bg-subtle` com `text-secondary`) ou `accent`, nunca as cores de status.
- Um status por item. Status desconhecido mostra "Em atualização" no
  neutro, nunca o código cru.
- Pílula de 24 px, texto de 13 px (`overline`, o menor da interface) em
  negrito e sem caixa alta, ícone de 14 px. Não quebra, não encolhe e não
  corta o texto: o layout abre espaço.
- O mesmo status usa o mesmo ícone em todo lugar.

Mapa dos status do pedido (aprovado; os textos do cliente são os do app):

| Status | Cliente | Prestador | Tom |
| --- | --- | --- | --- |
| `AGUARDANDO_APROVACAO` | Aguardando o profissional | Aguardando sua resposta | `waiting` |
| `AGUARDANDO_PAGAMENTO` | Aguardando pagamento | Aguardando pagamento | `waiting` |
| `AGENDADO` | Agendado | Agendado | `confirmed` |
| `EM_DESLOCAMENTO` | Profissional a caminho | A caminho | `progress` |
| `EM_ANDAMENTO` | Em andamento | Em andamento | `progress` |
| `AGUARDANDO_CONFIRMACAO_CLIENTE` | Aguardando sua confirmação | Aguardando o cliente | `waiting` |
| `CONCLUIDO` | Concluído | Concluído | `done` |
| `DISPUTA` | Em análise | Em análise | `waiting` |
| `REJEITADO` | Recusado | Recusado | `cancelled` |
| `CANCELADO` | Cancelado | Cancelado | `cancelled` |
| desconhecido | Em atualização | Em atualização | `neutral` |

Outros status: no repasse, "Pronto para receber" é `done`; "Em análise",
"Sincronizando" e "Pendente" são `waiting`; "Recusada" e "Erro no
cadastro" são `cancelled`. Serviço ativo é `done` e inativo, `neutral`. O
mapa vira código com os componentes de domínio (Etapa 8).

Acessibilidade:

- É texto comum: sem role, sem `aria-label` e fora do Tab. O leitor lê o
  status junto do item ("Instalação de chuveiro, Agendado").
- O contraste é o dos pares de tokens, testado na lib (4,7 a 7,9:1 no
  cliente, 7,4 a 14,2:1 no prestador); o badge não usa opacidade.
- Quando o status muda com a tela aberta, o anúncio é da tela (toast ou
  região de status), não do badge.
- Se o contexto não deixar claro que é um status, a tela põe um rótulo
  antes, visível ou só para leitor de tela: "Situação: Agendado".

No app, o badge continua sendo `ion-badge`, com a aparência dos tokens e o
mesmo mapa, na migração das telas de pedidos. O `app-badge` do web convive
com o `tg-badge` até a migração; os usos clicáveis dele (Cliente ou
Profissional no cadastro, escolha do serviço no perfil) viram rádio
segmentado e card de escolha nessas migrações.

### Navegação

Os mesmos destinos no web e no app, na mesma ordem. A partir de 1024 px, uma
barra de topo de 72 px; abaixo, um topo de 56 px e uma barra de abas fixa
embaixo, com a Conta como última aba.

```html
<tg-app-bar homeLink="/customer">
  <tg-nav [items]="destinos" [account]="{ label: 'Conta', icon: 'user-circle', link: perfil }" />
  <tg-account-menu [name]="usuario.nome" detail="Cliente" [links]="linksDaConta" (signOut)="sair()" />
</tg-app-bar>
<main id="conteudo" class="tg-nav-offset">…</main>
```

```ts
const destinos: TgNavItem[] = [
  { label: 'Início', icon: 'house', link: '/customer', exact: true },
  { label: 'Buscar', icon: 'magnifying-glass', link: '/customer/search' },
  { label: 'Pedidos', icon: 'receipt', link: ['/general', id, 'history'] },
  { label: 'Favoritos', icon: 'heart', link: '/customer/favorites' },
];
```

| Componente | Entradas |
| --- | --- |
| `tg-app-bar` | `homeLink` (destino da marca), `mainId` (id do `main`, padrão `conteudo`) |
| `tg-nav` | `items` (até quatro destinos), `account` (aba da Conta, só abaixo de 1024 px), `label` (padrão `Principal`) |
| `tg-account-menu` | `name` (obrigatório), `detail`, `photo`, `links`, `signOutLabel`; saída `signOut` |

Destinos aprovados:

| Modo | Destinos | Conta |
| --- | --- | --- |
| Cliente | Início, Buscar, Pedidos, Favoritos | Dados pessoais, Endereços, Sair da conta |
| Prestador | Agenda, Pedidos, Serviços, Ganhos | Dados pessoais, Endereços, Sair da conta |

"Ganhos" é o nome da tela Recebimentos na navegação: cinco abas com texto de
13 px precisam caber em 360 px. A tela continua com o título "Recebimentos".

Regras:

- Atual: pílula `action-subtle`, ícone preenchido e texto em negrito. Os
  demais: ícone em contorno e `text-secondary`.
- Rótulo sempre visível, sem cortar; nada só de ícone na barra de abas.
- "Sair da conta" fica no menu da conta, separado dos destinos.
- Telas internas (pedido, perfil do prestador, pagamento) não mostram a
  barra de abas: a tela não renderiza o `tg-nav` e usa um topo com voltar e
  título (com a migração do shell).
- Abaixo de 1024 px, o conteúdo usa a classe `tg-nav-offset`, que abre
  espaço para a barra de abas e para a área segura do iOS.

Acessibilidade:

- Destinos são links dentro de `nav aria-label="Principal"`, com
  `aria-current="page"` no atual (o `routerLinkActive` cuida disso). A barra
  de abas é o mesmo `nav` de links, não um `role="tablist"`.
- "Pular para o conteúdo" é o primeiro item do Tab. Ele fica fora da tela
  até receber foco e foca o `main` (que ganha `tabindex="-1"`) sem trocar a
  rota.
- O menu da conta é um botão com `aria-expanded` e `aria-controls` que
  mostra uma lista comum de links (não `role="menu"`). O nome do botão é
  "Conta de" mais o primeiro nome visível. Esc fecha e devolve o foco ao
  botão; clique fora, escolher um link ou o foco sair do menu também
  fecham.
- Alvos de pelo menos 44 px e o mesmo anel de foco do botão.
- Sem botão de notificações por enquanto: a funcionalidade não existe, e o
  topo não oferece ação que não funciona. Quando existir, o botão entra ao
  lado do menu da conta (`app-notification`), com a contagem no nome, como
  "Notificações, 2 novas".

No app, a navegação é `ion-tabs` com `ion-tab-bar slot="bottom"`, os mesmos
destinos e os ícones Phosphor, estilizada pelos tokens na migração da home.
#### Shell logado (web)

O `app-authenticated-shell` envolve as telas de cliente, prestador e conta
(`/customer`, `/provider`, `/general`). O `app-header` monta o `tg-app-bar`
com os destinos do modo (`resolveShellNavigation`, em
`shared/components/ui/header/navigation.constant.ts`) e o `tg-account-menu`
com o nome, a foto (ou as iniciais) e o modo ("Cliente" ou "Profissional")
de quem está na sessão. O `main` tem
`id="conteudo"` (alvo do "Pular para o conteúdo"), e o shell inteiro usa
`tg-nav-offset`, para o rodapé também ficar acima da barra de abas.

- Rodapé: a marca, os links institucionais que existem e o copyright. Sem
  razão social nem CNPJ até haver uma fonte confirmada.
- Fundo `bg-canvas` e texto `text-primary`: no modo prestador, o shell é
  escuro, como as telas migradas esperam.
- A aba "Conta" (abaixo de 1024 px) leva a `/general/:id/home`, com
  "Dados pessoais", "Endereços" e "Sair da conta" (no celular não há o
  menu da conta).
- Rodapé `app-footer`: marca, links institucionais que existem
  (`/institutional/about`, `faq`, `support`) e a linha legal.
- Ponte temporária: no modo prestador, o shell aponta os tokens antigos
  `--proxi-surface`, `--proxi-background`, `--proxi-text`,
  `--proxi-text-muted`, `--proxi-border` e `--proxi-primary-soft` para os
  do Design System, para as telas ainda não migradas ficarem legíveis no
  fundo escuro. Sai quando nenhuma tela usar `--proxi-*`.
- O `body` usa `overflow-x: clip` (não `hidden`), para o `position: sticky`
  da barra do topo funcionar.
- "Pedidos" leva a `/general/:id/history`, a tela de pedidos (abaixo).

#### Ganhos (web)

Os ganhos do profissional, em `/provider/recebimentos` (título "Ganhos",
como no menu), dentro do shell logado com o tema do prestador. Story:
**Telas/Ganhos**. Endpoints sem mudança: `GET` e `PUT
/payments/payout-destination`, `GET /payments/payout-destination/settlements`
(até 50 repasses) e, para o gráfico, `GET /auth/provider-home` (o mesmo da
home).

Decisões aprovadas: (1) resumo com "Recebido" e "A receber", somados em
centavos sobre os repasses listados (ver a classificação abaixo); (2) o mesmo gráfico da home, "Ganhos nos últimos 6 meses"
(`app-provider-revenue-chart`); (3) a chave PIX num `tg-card` com tipo,
chave e "Alterar chave", e a edição num `tg-sheet`; (4) repasses em linhas
com o pedido (link para o detalhe), a data de pagamento, o valor e um
`tg-badge` (Pago, Em processamento, Enviando, Aguardando envio, Em análise,
Falhou); (5) profissional que ainda não ganhou nada vê um estado vazio.

Regras:

- Sem ganhos: sem histórico no painel (mesma regra da home) e sem
  repasses. O resumo, o gráfico e os repasses dão lugar ao `tg-empty-state`
  "Seus ganhos aparecem aqui", com "Ver meus serviços"; a chave PIX fica,
  para cadastrar antes do primeiro repasse. Falha do painel não conta como
  "sem ganhos": o gráfico mostra o erro.
- Sem chave PIX: `tg-alert` de atenção "Cadastre sua chave PIX para
  receber", com o botão que abre o cadastro.
- A chave é normalizada como a API faz (`normalizePixDestination`: CPF,
  CNPJ e celular sem espaços, parênteses, pontos, traços e "+"; e-mail e
  chave aleatória sem espaços nas pontas; a barra do CNPJ também sai) e
  validada com as mesmas expressões e o limite de 254 caracteres do DTO,
  com o erro abaixo do campo. A tela envia a chave já normalizada. Salvando: um envio por vez; falha mostra o motivo
  da API no painel; sucesso fecha o painel e mostra a chave como a API
  devolveu (normalizada).
- Classificação dos status (`PaymentSettlement.status`, como o
  `settlement.service.ts` os usa): SUCCEEDED entra só em "Recebido";
  READY, SUBMITTING e PENDING (fila e gateway) entram só em "A receber";
  FAILED não entra em nenhum. REVIEW (aguardando conciliação) e BLOCKED
  (barrado por pagamento, confirmação ou disputa) não têm previsão de
  pagamento: ficam fora dos dois totais e aparecem numa nota abaixo de "A
  receber" ("Fora R$ X em análise ou bloqueados"). Status desconhecido é
  tratado do mesmo jeito, com o selo neutro "Em análise".
- Falha ou carregamento dos repasses nunca vira R$ 0,00: os indicadores
  mostram skeleton enquanto carregam e "Indisponível" na falha. R$ 0,00 só
  com a lista carregada e valores zero.
- Repasses com falha: `tg-alert` de perigo, "Um repasse falhou" ou "N
  repasses falharam", pedindo para conferir a chave e falar com o suporte.
- Carregando: skeletons. Cada parte (chave, gráfico, repasses) tem o seu
  alerta de falha com "Tentar de novo", que recarrega só aquela parte; uma
  resposta antiga da mesma parte é descartada.
- Valores em reais e datas no horário de São Paulo, com `Intl` (o app não
  registra o locale pt-BR do Angular).

#### Pedidos (web)

Todos os pedidos de quem está logado, em `/general/:id/history`, numa tela
própria do shell (sem o cabeçalho de perfil da conta). Título "Pedidos", uma
linha de apoio e as abas do mapa de "Abas"; cada aba é uma lista
`ul[tgOrderList]` com `tg-order-row`.

| Modo | Abas | O que entra |
| --- | --- | --- |
| Cliente | Ativos (com contagem), Concluídos, Cancelados | Ativos: tudo que não encerrou, inclusive em análise e status desconhecido. Cancelados: cancelados e recusados. |
| Prestador | Solicitações (com contagem), Agendados, Histórico | Solicitações: `AGUARDANDO_APROVACAO`, com "Responder". Agendados: os demais em curso, inclusive em análise e desconhecido. Histórico: concluídos, cancelados e recusados. |

Regras:

- A aba fica na URL (`?aba=concluidos`), trocada sem nova entrada no
  histórico; sem ela, ou com uma que não existe, vale a primeira.
- Em curso: primeiro o que pede ação de quem vê (Pagar, Confirmar
  conclusão, Responder, Estou a caminho…), depois a data mais próxima; sem
  data no fim. Encerrados: o encerramento mais recente primeiro (as mesmas
  datas do histórico do início). Nenhum pedido fica de fora.
- Aba sem pedidos: `tg-empty-state` com o texto da aba; em Ativos do
  cliente, a ação é "Buscar serviço". O cliente vê "Buscar serviço" também
  no topo, mas só quando tem algum pedido (sem nenhum, a busca fica só no
  estado vazio).
- Carregando: skeleton das abas e das linhas. Falha: alerta com "Tentar de
  novo". Cada carga cancela a anterior.
- "Estou a caminho" e "Iniciar serviço" trocam o status na própria linha.
  Pedidos diferentes podem trocar ao mesmo tempo, cada um com o seu
  carregando; o mesmo pedido não repete a chamada. O botão só solta pela
  própria falha (alerta com a mensagem da API) ou quando uma lista pedida
  depois da própria confirmação mostra o pedido fora do status de antes da
  troca (o esperado ou um posterior); a lista de outro pedido nunca o solta.
  Lista com o status antigo, ou recarga que falha, gasta uma tentativa e
  consulta de novo em silêncio (depois de 1 s e de 2 s). Após 3 tentativas,
  o botão solta e um alerta de atenção ("A lista ainda não mostra o status
  novo") oferece "Recarregar lista"; a lista que estava à vista fica.
- A lista acompanha a sessão: outra conta, troca entre cliente e prestador
  ou logout cancelam a consulta e as trocas em curso, limpam os pedidos na
  hora e (com sessão) buscam os novos. Sessão sem id: alerta de erro, sem
  consultar.
- Rota com `unauthorizedGuard` (sem login vai para o login, com a volta) e
  `sessionUserGuard`: o id da URL nunca é fonte de identidade; diferente do
  da sessão, a URL é corrigida para o da sessão, mantendo a aba. A
  autorização real é do backend.
- No desktop, a tela tem até 880 px, centralizada.

#### Favoritos (web)

Os profissionais que o cliente salvou, em `/customer/favorites`, com o
`tg-provider-card` da busca (`toTgProvider`, sem distância, que a lista não
traz). Título "Favoritos" e, abaixo, a contagem ("4 profissionais salvos").
Story: **Telas/Favoritos**.

Decisões aprovadas: (1) tirar o coração tira dos favoritos, mas o card fica
na tela com o coração vazio até a pessoa sair, e outro toque devolve; (2) a
API devolve só os 20 mais recentes: com mais, a contagem diz "mostrando os
20 mais recentes" (paginação na #51).

Regras:

- Uma coluna no celular, duas a partir de 720 px e três a partir de 1040 px
  de largura da tela (container query), até 1120 px. O favorito mais recente
  primeiro, na ordem da API; o card leva ao perfil (`/customer/:id`).
- O telefone saiu: a API pública do profissional não o traz.
- Coração: um pedido por profissional por vez; cada um solta só o próprio
  estado. Falha: alerta de perigo com o motivo da API, e o coração volta ao
  que era. A resposta só vale para a conta que pediu.
- A contagem é o `total` da API menos os tirados na visita (nunca negativa),
  não o número de cards carregados.
- Carregando: skeleton dos cards. Sem favoritos: `tg-empty-state` "Nenhum
  favorito ainda", com "Buscar profissionais". Falha: alerta com "Tentar de
  novo". Flag de favoritos desligada: estado vazio "Favoritos ainda não está
  disponível".
- A lista acompanha a sessão: outra conta ou logout cancelam a consulta e
  as trocas em curso e limpam a lista na hora.

#### Meus serviços (web)

Os serviços do profissional, em `/provider/services`, dentro do shell logado
com o tema do prestador. Título "Meus serviços" e o botão "Novo serviço".
Story: **Telas/Meus serviços**. Endpoints e payload sem mudança:
`GET /services/mine`, `POST /services`, `PATCH /services/:id` e
`DELETE /services/:id` (desativar).

Decisões aprovadas: (1) cada serviço é um `tg-card` com nome, selo Ativo ou
Inativo, categoria, descrição em até 2 linhas, dias e horário ("Seg a Sex ·
09:00 às 17:00 · 60 min"), preço fixo e as ações Desativar e Editar;
(2) Novo serviço e Editar abrem o formulário num `tg-sheet` (painel lateral
no desktop, folha de baixo no celular); (3) Desativar pede confirmação num
`tg-dialog` de perigo; (4) o aviso de aprovação do perfil está só no estado
vazio; (5) o preço aceita vírgula ("120,00" ou "1.250,50"), com "R$" na frente.

Regras:

- Uma coluna no celular e duas a partir de 720 px de largura da tela, até
  1120 px. Desativar aparece só em serviços ativos; para reativar, Editar e
  ligar "Disponível para pedidos".
- Dias de atendimento são botões com `aria-pressed`; um horário e uma
  duração valem para todos os dias marcados (fuso de São Paulo).
- Editar só manda a disponibilidade se dias ou horário mudarem; senão a API
  mantém a salva, inclusive horários diferentes por dia ou várias janelas.
  Nesse caso, a ajuda do campo avisa que mudar os dias ou o horário passa o
  horário único para todos os dias escolhidos.
- Os erros aparecem ao tentar salvar, abaixo de cada campo, com o ícone de
  alerta: nome com 3 a 120 letras, categoria, preço entre R$ 0,01 e
  R$ 100.000, pelo menos um dia, horário no formato 09:00, fim depois do
  início, duração de 15 a 480 minutos e que caiba no intervalo (como o
  `validateAvailability` da API).
- Salvando: o painel não fecha e o botão mostra carregando; um envio por vez.
  Falha: alerta no painel com o motivo da API, e o formulário fica como
  estava. Sucesso: o painel fecha, a mensagem aparece numa região de status
  e a lista recarrega.
- Carregando: skeleton dos cards. Falha: alerta com "Tentar de novo".

### Abas

Trocam seções de conteúdo da mesma tela, como pedidos ativos e concluídos.
Escolher um valor (dia da agenda, período do gráfico, Cliente ou
Profissional no cadastro) não é aba: é rádio ou chip.

```html
<tg-tabs label="Pedidos" [(value)]="aba">
  <tg-tab value="ativos" label="Ativos" [count]="ativos.length">…</tg-tab>
  <tg-tab value="concluidos" label="Concluídos">…</tg-tab>
  <tg-tab value="cancelados" label="Cancelados">…</tg-tab>
</tg-tabs>
```

| Componente | Entradas |
| --- | --- |
| `tg-tabs` | `label` (nome do conjunto, obrigatório), `value` (aba selecionada, com `[(value)]`) |
| `tg-tab` | `value` e `label` (obrigatórios), `count` (opcional; zero ou vazio não aparece) |

Onde entram:

| Tela | Abas |
| --- | --- |
| Pedidos do cliente | Ativos, Concluídos, Cancelados |
| Pedidos do prestador | Solicitações, Agendados, Histórico |
| Perfil do prestador | Serviços, Avaliações, Sobre |

Regras:

- De 2 a 4 abas, com rótulo curto e sempre visível; sem ícone e sem aba
  desabilitada (sem conteúdo, o painel mostra o estado vazio).
- Selecionada: texto `action-subtle-text`, negrito e barra de 3 px em
  `action-primary`. As demais: `text-secondary`. Trilho de 1 px em
  `border-default`. A aba reserva a largura do negrito e não muda de tamanho
  ao ser selecionada.
- Contagem numa pílula pequena, só quando ajuda a decidir (Solicitações 3).
- Cada aba tem a largura do rótulo, alinhadas à esquerda (12 px de respiro
  abaixo de 600 px, 16 px acima). Se não couberem, a barra rola na
  horizontal, com esmaecido na borda onde há mais abas, e a aba selecionada
  fica inteira à vista (só a barra rola, nunca a página).
- Sem `value`, ou com um que nenhuma aba tem (inclusive quando a aba dele
  sai da lista), a primeira aba aparece selecionada, mas o `value` da tela
  não é reescrito: ele só muda quando a pessoa troca de aba. Se a aba volta,
  a seleção volta com ela. Quem guarda o filtro (na URL, como
  `?aba=concluidos`, ou num estado) normaliza o valor do seu lado.
- Valores são únicos. Uma aba sem `value`, ou que repete o de uma anterior,
  é configuração inválida: aparece, mas fica inativa (`aria-disabled`,
  texto `text-disabled`), fora do Tab e das setas, e o clique não faz nada.
  Vale a primeira aba com aquele valor.
- Se a aba focada sai da lista (ou é movida) e o foco cai na página, ele vai
  para a nova aba selecionada. Com o foco fora das abas, mudanças na lista ou
  no `value` nunca puxam o foco.

Acessibilidade (padrão de abas da WAI-ARIA, ativação automática):

- `role="tablist"` com o nome de `label`; cada aba é um `button role="tab"`
  com `aria-selected` e `aria-controls`. O `tg-tab` é o painel
  (`role="tabpanel"`, `aria-labelledby`, `tabindex="0"`) e fica `hidden`
  quando não está selecionado.
- Só a aba selecionada entra no Tab. Setas esquerda e direita trocam de aba
  (com volta no fim) e já mostram o painel; Home e End vão às pontas.
- A contagem entra no nome: "Solicitações, 3".
- Alvo de 48 px de altura e o mesmo anel de foco do botão. A seleção não
  depende só de cor (negrito e barra, que é borda e aparece em alto
  contraste).
- Em desenvolvimento, `tg-tab` sem `value` ou `label` e valores repetidos
  geram aviso no console.

No app, as abas são `ion-segment`, com a aparência de sublinhado dos tokens,
na migração da tela de pedidos. O `app-tabs` antigo do web, que não tinha
uso, teclado nem testes ativos, foi removido.

### Diálogo e painel

O diálogo pede uma decisão curta. O painel abriga uma tarefa, como filtros
ou um endereço. Aviso que não pede decisão não é diálogo: é toast ou alerta.

```html
<tg-dialog #recusar title="Recusar este pedido?" icon="warning-circle" tone="danger" [busy]="enviando()">
  <p>Ana Souza recebe o aviso e pode pedir a outro profissional.</p>
  <button tgButton tgDialogAction appearance="outline" (click)="recusar.close()">Voltar</button>
  <button tgButton tgDialogAction tone="danger" [loading]="enviando()" (click)="confirmar()">Recusar pedido</button>
</tg-dialog>

<tg-sheet #filtros title="Filtros">
  … campos …
  <button tgButton tgSheetAction appearance="outline" (click)="limpar()">Limpar</button>
  <button tgButton tgSheetAction (click)="aplicar(); filtros.close()">Aplicar filtros</button>
</tg-sheet>

<button tgButton appearance="outline" (click)="filtros.open()">Filtros</button>
```

| Componente | Entradas e saídas |
| --- | --- |
| `tg-dialog` | `title` (obrigatório), `icon`, `tone` (`brand` ou `danger`), `busy`; `open()`, `close()`, `isOpen`; saídas `opened` e `closed` |
| `tg-sheet` | `title` (obrigatório), `busy`; `open()`, `close()`, `isOpen`; saídas `opened` e `closed` |

Regras:

- Diálogo: centralizado em todos os tamanhos, até 440 px, raio de 28 px.
  Título que diz a decisão, texto curto e no máximo duas ações. A ação
  principal diz o que faz ("Recusar pedido"), nunca só "OK" ou "Sim".
- Ações do diálogo: a segura primeiro e a principal por último, no código.
  Abaixo de 600 px empilham com a largura toda, e a principal fica em cima;
  acima, ficam lado a lado, com a principal à direita.
- Painel: abaixo de 600 px sobe de baixo (bottom sheet), com a largura toda,
  até 88% da altura e cantos de cima arredondados, sem alça de arrastar. A
  partir de 600 px fica à direita, com 440 px e a altura toda. Título e
  fechar fixos no topo, ações fixas embaixo (dividindo a largura no
  celular), e só o meio rola.
- Fundo com `scrim` e `elevation-3`; animação de 200 ms, sem animação com
  movimento reduzido.
- Ações condicionais: um `@if` para cada ação. Um bloco com dois elementos
  não casa com o slot `[tgDialogAction]` e vai para o texto.
- Durante um envio: `[busy]` no componente e `[loading]` na ação principal.
  Esc, o fundo e o X deixam de fechar; a tela fecha por `close()` quando o
  envio termina. Um diálogo por vez.

Acessibilidade:

- Os dois usam o `dialog` nativo com `showModal()`: o foco fica preso
  dentro, o fundo fica inerte, e o leitor de tela anuncia um diálogo modal.
- Nome pelo título (`aria-labelledby`); no diálogo, a descrição é o texto
  (`aria-describedby`). Durante o envio, `aria-busy`.
- Ao abrir, o foco vai para a ação segura (a primeira declarada) no
  diálogo e para o "Fechar" no painel, mesmo que o texto tenha links ou
  campos antes. Sem ações, ou com a ação segura indisponível, o foco vai
  para o próprio diálogo, que é anunciado com título e descrição; nunca para
  a ação de perigo.
- Ao fechar, o foco volta para quem abriu, se ele ainda puder receber foco.
  Com um diálogo aberto sobre um painel, fechar o diálogo devolve o foco
  para dentro do painel. Se o painel de baixo fechar (ou sair da tela)
  antes, o diálogo de cima continua modal e, ao fechar, devolve o foco para
  quem abriu o painel.
- Fecham por Esc (tratado no `keydown`, para o Chrome não fechar no segundo
  Esc durante o envio), pelo toque no fundo e, no painel, pelo botão
  "Fechar" de 44 px. Durante o envio, o "Fechar" fica com `aria-disabled` e
  não perde o foco.
- A rolagem da página trava enquanto está aberto e volta ao valor anterior
  ao fechar (inclusive se o componente sair da tela aberto).

O `app-drawer`, a confirmação montada em `div` da tela "Confirmar conclusão"
e o `app-full-modal` convivem com estes componentes até as migrações dessas
telas. No app, os equivalentes são `ion-alert` e `ion-modal` com os tokens,
quando o app ganhar confirmações e filtros.

### Toast e alerta

O toast confirma uma ação que deu certo ou dá uma informação passageira. O
alerta explica um problema ou um estado e fica na tela até deixar de valer.
Erro nunca é toast: é alerta, perto de onde aconteceu.

```html
<tg-alert tone="danger" title="Não foi possível carregar seus pedidos">
  Verifique sua conexão e tente de novo.
  <button tgButton tgAlertAction appearance="outline" size="sm" (click)="recarregar()">Tentar de novo</button>
</tg-alert>

<tg-alert tone="info" title="Seu perfil está em análise" dismissible>
  Você pode receber pedidos assim que a análise terminar.
</tg-alert>
```

```ts
private readonly toast = inject(TgToast);

salvar() {
  this.toast.show('Endereço salvo.');
}
cancelar() {
  this.toast.show('Pedido cancelado.', { action: 'Desfazer', onAction: () => this.desfazer() });
}
```

A `<tg-toast-region />` fica uma vez no shell do app. Ela entra no shell na
primeira tela que usar toast; este PR não muda telas.

| Componente | Entradas e saídas |
| --- | --- |
| `tg-alert` | `tone` (`info`, `success`, `warning` ou `danger`), `title`, `dismissible`, `closeLabel`; slot `[tgAlertAction]`; saída `closed` |
| `TgToast` | `show(mensagem, { tone, action, onAction, duration })` devolve `{ dismiss() }`; `dismiss()`; `current` |
| `tg-toast-region` | sem entradas |

Regras:

- Toast claro (superfície com borda e `elevation-2`), embaixo e no centro,
  até 480 px. No celular e no tablet, com a barra de abas, fica acima dela.
- Um toast por vez: o novo substitui o anterior. Tons `success` (padrão) e
  `info`; não há toast de erro.
- Fica 6 s, ou 10 s com ação, e nunca menos de 6 s. Pausa com o mouse ou o
  foco em cima e volta a contar quando saem. Esc e o "Fechar" de 44 px
  fecham.
- No máximo uma ação, curta ("Desfazer"). Ação que a pessoa não pode perder
  não vai em toast.
- Alerta com as cores de feedback dos tokens, raio de 16 px, ícone por tom,
  título opcional e ações abaixo do texto. Só os informativos têm
  `dismissible`.

Acessibilidade:

- O toast é anunciado por uma região `role="status"` (`aria-live="polite"`)
  que existe desde o carregamento, então o primeiro toast também é lido.
  Ele não rouba o foco; ao fechar com o foco dentro, o foco volta para onde
  estava antes.
- Alerta `danger` é `role="alert"`; os demais, `role="status"`. Presente
  desde o carregamento, é conteúdo e não é anunciado. Ao fechar com o foco
  dentro, o foco vai para o próximo controle da página.
- O `LiveAnnouncer` do CDK estava escondido com `display: none` no
  `styles.scss` global, o que calava os anúncios. Agora usa o padrão
  visualmente oculto, e os anúncios voltam a ser lidos.

As mensagens de sucesso feitas na própria tela (pagamento, envio e
confirmação da conclusão) continuam até as migrações dessas telas. No app,
o equivalente é `ion-toast` com os tokens.

### Skeleton

Enquanto os dados chegam, a tela mostra a forma do conteúdo, no lugar de
um spinner com "Carregando…". O spinner fica só dentro do botão
(`[loading]` do `tgButton`).

```html
<tg-loading label="Carregando pedidos" [loading]="carregando()">
  <ng-template tgLoadingSkeleton>
    @for (i of [1, 2, 3]; track i) {
      <div class="pedido">
        <tg-skeleton shape="rect" width="48" height="48" radius="md" />
        <div>
          <tg-skeleton width="62%" height="12" />
          <tg-skeleton width="44%" height="12" />
        </div>
      </div>
    }
  </ng-template>
  … lista de pedidos …
</tg-loading>
```

| Componente | Entradas |
| --- | --- |
| `tg-skeleton` | `shape` (`text`, `circle` ou `rect`), `width`, `height`, `size` (círculo), `lines`, `radius` (`sm` a `xl`, ou `full`) |
| `tg-loading` | `label` (obrigatório), `loading`, `delay` (padrão 300 ms); skeleton em `<ng-template tgLoadingSkeleton>` |

Regras:

- O skeleton repete as medidas do conteúdo real (alturas, raios e
  espaços), para a tela não pular quando os dados chegam.
- Uma cor só, `border-default`, sobre a superfície ou o fundo. Pulso de
  opacidade (100% a 60%) a cada 1,6 s; parado com movimento reduzido.
- Texto: linhas de 12 a 14 px, raio `sm`; com `lines`, a última fica com
  64%. Bloco: raio `lg` por padrão; chip, `full`.
- Mostre só o que cabe na primeira tela (3 ou 4 itens de lista, 3 cards).
- O `tg-loading` espera 300 ms antes de mostrar o skeleton: se os dados
  chegam antes, a pessoa vai direto ao conteúdo, sem piscar. O `delay` é
  lido no começo de cada carga; mudar no meio vale para a próxima.
- O conteúdo só entra na página quando `loading` é falso. Como todo
  `ng-content`, ele é criado junto com a tela: um componente dentro dele
  inicia (`ngOnInit`) mesmo durante a carga, não é recriado ao alternar e
  sai junto com a tela. Enquanto carrega, ele não está no DOM, então não
  recebe foco nem é lido. Para iniciar algo só com os dados, use `@if` na
  tela.
- Limites: `lines` vai de 1 a 20. Medida negativa, `NaN` ou infinita volta
  ao padrão (100% de largura; 14 px no texto, 80 px no bloco e 48 px no
  círculo).
- Erro e vazio continuam com a tela: alerta com "Tentar de novo" e estado
  vazio.

Acessibilidade:

- O skeleton é decorativo (`aria-hidden`) e não recebe foco.
- Enquanto carrega, o corpo do `tg-loading` fica com `aria-busy`. Quando o
  skeleton aparece, o `label` é anunciado uma vez por uma região
  `role="status"` que fica fora do `aria-busy`; quando os dados chegam, o
  anúncio é limpo e o conteúdo é lido normalmente.
- No servidor, nada é agendado: a página pré-renderizada sai sem skeleton
  e o navegador aplica o atraso depois da hidratação.

O `.spinner` e o "Carregando…" das telas de pedido e de perfil, e o
`.tag-skeleton` da avaliação, continuam até as migrações dessas telas. A
classe global `.skeleton`, sem uso, foi removida. No app, o equivalente é
`ion-skeleton-text` com a cor e o pulso dos tokens, nas migrações do app.

### Estado vazio

Quando não há nada para mostrar, a tela diz o que falta e qual é o
próximo passo. Carregando é skeleton; falha ao carregar é alerta.

```html
<tg-empty-state icon="receipt" title="Você ainda não fez nenhum pedido">
  Encontre um profissional e agende em poucos passos.
  <a tgButton tgEmptyAction routerLink="/buscar">Buscar profissionais</a>
</tg-empty-state>

<tg-empty-state compact icon="calendar-blank" title="Sua agenda está livre" level="3">
  Quando você contratar um serviço, ele aparece aqui.
</tg-empty-state>
```

| Componente | Entradas |
| --- | --- |
| `tg-empty-state` | `title` (obrigatório), `icon` ou `illustrationSrc`/`illustrationAlt`, `compact`, `level` (inteiro de 1 a 6, padrão 2; outro valor vira `h2`); texto no conteúdo, ação principal `[tgEmptyAction]` e secundária `[tgEmptySecondaryAction]` |

Regras:

- Grande (padrão) quando a lista é o assunto da tela ou numa busca sem
  resultado: centralizado, ícone de 32 px num círculo de 72 px com
  `action-subtle`, texto até 360 px e 40 px de respiro em cima e embaixo.
- Compacto (`compact`) para uma seção dentro de uma tela maior: em linha,
  ícone de 22 px em 44 px, borda tracejada `border-default` e ação à
  direita. Ele segue a largura do contêiner, não a da tela: com menos de
  480 px (num card estreito, por exemplo), a ação desce, alinhada ao texto.
  Ocupa a largura do contêiner; numa linha flex, dê largura a ele.
- Textos longos quebram, e a ação quebra linha se não couber.
- Até duas ações: principal (`[tgEmptyAction]`) e secundária
  (`[tgEmptySecondaryAction]`). Em desenvolvimento, mais de duas geram um
  aviso no console (nenhuma é escondida).
- Título diz o que falta ("Você ainda não fez nenhum pedido"); o texto,
  em uma ou duas linhas, diz o que acontece ou o que fazer.
- Até duas ações: principal para começar e secundária, em contorno, para
  voltar ou escolher outro caminho; sem ação quando não há o que fazer.
- Use um ícone decorativo ou uma ilustração com texto alternativo adequado.

Acessibilidade:

- É conteúdo comum: o título é um heading (`h2` por padrão; use `level`
  para encaixar na estrutura da tela), o ícone é decorativo e não há role
  de alerta, porque estar vazio não é erro.
- Quando o vazio aparece depois de uma busca ou filtro, a tela anuncia o
  resultado pela própria região de status.
- O foco não vai sozinho para o estado vazio; a ação entra no Tab normal.

Os vazios atuais das telas (`.empty-state` e variações, inclusive os que
mostram "Carregando…" e erro, e os caracteres usados como ícone) ficam até
as migrações dessas telas. No app, o equivalente é o mesmo desenho com os
tokens, nas migrações do app.

## Componentes de domínio (Etapa 8)

Componentes do TaskGo montados sobre os da Etapa 7. Ficam em
`shared/design-system` e entram nas telas só na migração de cada uma.

### Card de prestador

O cliente compara profissionais numa lista: quem é, se é verificado, a
nota, a distância, o serviço e o preço inicial. Só mostra dados reais: o
que não vier some do card, sem texto fixo no lugar.

```html
<ul>
  @for (p of prestadores(); track p.id) {
    <li>
      <tg-provider-card
        [provider]="p"
        [link]="['/customer', p.id]"
        [favorite]="favoritos()[p.id]"
        (favoriteChange)="alternarFavorito(p.id, $event)" />
    </li>
  }
</ul>
```

| Entrada | Valores | Padrão |
| --- | --- | --- |
| `provider` | `TgProvider`: `id`, `name`, `photoUrl`, `verified`, `rating`, `ratingCount`, `service`, `priceFrom`, `distanceKm` | obrigatório |
| `link` | destino do perfil, como no `routerLink`. O perfil público do prestador é `['/customer', p.id]` (tela "Perfil do profissional", que busca `GET /provider/:id` pelo id do Provider) | obrigatório |
| `favorite` | `true` ou `false`; sem valor, o coração não aparece (flag de favoritos desligada) | — |
| `headingLevel` | inteiro de 2 a 6; outro valor vira `h3` | `3` |
| `(favoriteChange)` | pede a troca com o novo valor; o estado fica com a tela | — |

`toTgProvider(dadoDaApi, { category })` converte o prestador como vem de
`GET /provider` e `GET /provider/by-category/:slug` (`publicProviderSelect`
no backend):

- O id é sempre o do Provider (`id` ou `providerId`; num registro de
  usuário com `provider` aninhado, o id desse `provider`). O `user.id`
  nunca entra, porque o perfil busca pelo Provider. Sem id válido (inteiro
  positivo), devolve `null`, porque sem id não há link.
- A API não garante a ordem dos serviços. O card mostra o serviço ativo de
  menor preço válido, com o título e o preço desse mesmo serviço (empate:
  título, depois id). Com `category`, só os serviços dessa categoria contam.
  Preço nulo, zero, negativo ou não finito não conta; sem preço válido, o
  card diz "Preço sob consulta".
- Nota e contagem aceitam número, texto ou Decimal; o card valida a faixa.

Regras:

- Em linha: foto de 72 px à esquerda, nome com o selo "Verificado"
  (`tg-badge` neutro com o ícone `check`), nota e distância, serviço, e à
  direita o coração e o preço "a partir de".
- O layout segue a largura do container: abaixo de 480 px a foto passa a
  56 px e o preço desce, separado por uma linha.
- A nota só aparece de 1 a 5 com contagem inteira positiva (cada avaliação
  é um inteiro de 1 a 5). Sem avaliações, ou com nota ou contagem fora
  disso: badge "Novo no TaskGo", nunca 0,0 nem uma nota truncada para 5,0.
  Sem distância: some. Sem preço: "Preço sob consulta". Sem foto, ou se ela
  falhar: as iniciais do primeiro e do último nome.
- Nada de dado fixo igual para todos (como "Aceita pix" ou "Disponível 24
  horas"); um dado novo entra quando a API tiver.
- Valores em pt-BR: nota com uma casa (até 5,0), distância em km com uma
  casa, preço em reais sem centavos quando é inteiro.

Acessibilidade:

- É um `tg-card` com o nome como `tgCardLink`: o card inteiro abre o
  perfil, e o Tab passa só pelo nome e pelo coração. Sem botão "Ver
  perfil".
- O nome do link é só o nome do prestador. A foto é decorativa (alt
  vazio), porque o nome está ao lado.
- A nota é lida por extenso ("Nota 4,9 de 5, 128 avaliações"); a estrela e
  o texto curto ficam fora do leitor.
- O coração é um botão de 44 px com `aria-pressed` e nome "Favoritar Ana
  Souza". Um erro ao favoritar é da tela (toast), e o card não muda sozinho.
- A lista é `ul`/`li`, e a tela anuncia quantos encontrou.

O `app-card-provider` (com o `card-detail` e o pipe
`formatedProviderParam`) continua na busca até a migração dela. No app, a
lista da categoria (`ion-item`) segue a mesma ordem e os mesmos textos,
estilizada com os tokens nas migrações do app.

### Linha de pedido

Uma linha por pedido: o serviço, o status, a outra pessoa, a data e o
bairro e, quando é a vez de quem vê, o próximo passo. As linhas ficam numa
lista única com divisória (`ul tgOrderList`).

```html
<ul tgOrderList>
  @for (o of pedidos(); track o.id) {
    <li>
      <tg-order-row
        perspective="provider"
        [order]="o"
        [busy]="atualizando().has(o.id)"
        (statusAction)="avancar(o.id, $event)" />
    </li>
  }
</ul>
```

| Entrada | Valores | Padrão |
| --- | --- | --- |
| `order` | `TgOrderRowData`: `id`, `status`, `service`, `person`, `scheduledFor`, `neighborhood`, `distanceKm`, `amount`, `reviewed`, `paymentStatus` | obrigatório |
| `perspective` | `customer` ou `provider`: muda o texto do status, a linha de apoio e o próximo passo | obrigatório |
| `busy` | a tela está trocando o status deste pedido; o botão fica em carregando | `false` |
| `(statusAction)` | pede a troca (`EM_DESLOCAMENTO` ou `EM_ANDAMENTO`); a tela chama a API | — |

O mapa de status aprovado na Etapa 7 agora está em código:
`tgOrderStatus(status, perspective)` devolve o texto e o tom (desconhecido:
"Em atualização", neutro), e `tgOrderNextStep(order, perspective)` devolve o
próximo passo.

| Status | Próximo passo do cliente | Próximo passo do prestador |
| --- | --- | --- |
| `AGUARDANDO_APROVACAO` | — | Responder (`/provider/:id/aprovacao`, a tela de aceite) |
| `AGUARDANDO_PAGAMENTO` | Pagar, com o pagamento em `CREATED` ou sem valor; Ver QR Code, com `PENDENTE` (os dois em `/orders/:id/payment`); nenhum nos demais | — |
| `AGENDADO` | — | Estou a caminho (pede `EM_DESLOCAMENTO`) |
| `EM_DESLOCAMENTO` | — | Iniciar serviço (pede `EM_ANDAMENTO`) |
| `EM_ANDAMENTO` | — | Finalizar serviço (`/orders/:id/finish`) |
| `AGUARDANDO_CONFIRMACAO_CLIENTE` | Confirmar conclusão (`/orders/:id/confirm`) | — |
| `CONCLUIDO` | Avaliar, se ainda não avaliou (`/orders/:id/review`) | — |
| `DISPUTA`, `REJEITADO`, `CANCELADO` | — | — |

Pagamento, conforme o backend: o pedido nasce com o pagamento em `CREATED`;
"Pagar" cria a cobrança e o PIX fica `PENDENTE`. O pedido só passa para
`AGENDADO` com o pagamento pago (`PAGO`, `CAPTURED` ou `RELEASED`) e volta
para `AGUARDANDO_PAGAMENTO` se o pagamento deixar de valer, então `AGENDADO`
não pede pagamento. Com o pagamento autorizado, pago, falho, cancelado,
estornado ou desconhecido, a API não aceita outra cobrança: a linha não
oferece pagamento e leva ao pedido.

Da API para a linha, use `toTgOrderRow(pedido, perspective)`. Ele recebe o
pedido das listagens (`OrderModel`) e devolve `TgOrderRowData`:

- `review` presente vira `reviewed: true`, e o "Avaliar" some;
- `payment.status` vira `paymentStatus`;
- a outra pessoa é o profissional para o cliente e o cliente para o
  prestador;
- o valor é o final, ou o do pagamento.

A distância não vem nas listagens.

Regras:

- O serviço é o link para o pedido (`/orders/:id`) e cobre a linha inteira;
  o botão do próximo passo fica por cima.
- Badge só com texto na linha, sem ícone de status. O ícone fica no card de
  agendamento em destaque (`tgOrderStatusIcon`).
- Linha de apoio: pessoa · data · bairro. A data é "Hoje, 14:00", "Amanhã",
  "Ontem" ou "Ter, 18 nov, 09:00" (com o ano quando não é o atual); sem
  data, "Data a combinar". Só o bairro: o endereço completo fica na tela do
  pedido. Hoje, amanhã e ontem são dias civis, então o horário de verão não
  muda a conta. `when(data, agora, fuso)` aceita um fuso IANA, usado nos
  testes; sem ele, vale o do navegador.
- Para o prestador, a distância entra junto do bairro e o valor estimado
  aparece embaixo. O cliente não vê esses dois.
- No máximo um próximo passo, só quando é a vez de quem vê. Botão pequeno
  (36 px) com área de toque de 44 px.
- O layout segue a largura do container: abaixo de 480 px, o botão desce.

Acessibilidade:

- `ul`/`li`, um item por pedido. O link tem o nome do serviço e o status
  como descrição ("Instalação de chuveiro", "Profissional a caminho").
- O botão tem o serviço como descrição ("Pagar", "Limpeza residencial").
- Tab: o serviço e o próximo passo, nada mais. O foco não vai sozinho para
  a lista.
- Troca de status: o botão fica em carregando (`busy`) e não repete o
  pedido. A linha não muda sozinha, e o resultado é anunciado pela tela
  (toast).
- Hover: fundo `bg-subtle` e serviço sublinhado. Foco: o anel padrão na
  linha.
- Os ids das referências (`aria-describedby`) vêm do `TgIdGenerator`, um
  contador por aplicação. No SSR, cada requisição e o cliente começam do
  zero, então os ids batem na hidratação. Não usam o id do pedido, porque o
  mesmo pedido pode aparecer duas vezes na tela.

Os mapas de status de cada tela (`card-appointment`, início do prestador)
continuam até a migração delas, quando passam a usar `tgOrderStatus`. No
app, "Meus pedidos" (`ion-item`) segue a mesma ordem e o mesmo mapa, nas
migrações do app.

### Card de agendamento

O próximo serviço em destaque, sobre o `tg-card`. Mostra quando é, o status,
o serviço, a outra pessoa, o endereço completo e, quando é a vez de quem
vê, o próximo passo. A tela escolhe qual pedido destacar: o ativo com a
data mais próxima. Os demais pedidos ficam na lista, com a linha de pedido.

```html
<tg-appointment-card
  perspective="provider"
  [order]="proximo()"
  [busy]="atualizando()"
  (statusAction)="avancar($event)" />
```

| Entrada | Valores | Padrão |
| --- | --- | --- |
| `order` | `TgAppointmentData`: `id`, `status`, `service`, `person`, `personPhotoUrl`, `scheduledFor`, `address`, `neighborhood`, `distanceKm`, `amount`, `amountKind`, `reviewed`, `paymentStatus` | obrigatório |
| `perspective` | `customer` ou `provider`: muda o texto do status, a distância, o valor e o próximo passo | obrigatório |
| `busy` | a tela está trocando o status; o botão fica em carregando | `false` |
| `headingLevel` | nível do título, inteiro de 2 a 6 (outro valor vira `h3`) | `3` |
| `now` | hora de referência para "Hoje", "Amanhã" e "Ontem"; sem ela, o `TgClock` | — |
| `(statusAction)` | pede a troca (`EM_DESLOCAMENTO` ou `EM_ANDAMENTO`); a tela chama a API | — |

O status e o próximo passo são os da linha de pedido (`tgOrderStatus` e
`tgOrderNextStep`, com "Pagar" ou "Ver QR Code" pelo `paymentStatus`). Da
API para o card, use `toTgAppointment(pedido, perspective)`: faz o mesmo que
`toTgOrderRow` e acrescenta a foto da outra pessoa e o endereço "rua,
número, complemento". Os ids vêm do `TgIdGenerator`, como na linha.

Dados da API:

- **Valores (`Decimal`).** O interceptor do backend não reconhece o Decimal
  do Prisma, porque a classe é minificada. Por isso os valores chegam como
  `{ s, e, d }`. Os mappers convertem número, texto numérico e esse formato
  com o mesmo `toNumber` do card de prestador. Valor ausente, inválido, não
  finito ou menor ou igual a zero fica sem valor. Isso vale também para a
  linha de pedido.
- **Valor e rótulo.** O valor é o bruto do serviço, o que o cliente paga. Não
  é o ganho do prestador, que desconta a taxa e só aparece no detalhe do
  pedido. No backend, `finalPrice` nasce igual ao preço base e só passa a
  ser final quando o prestador finaliza o serviço (`providerFinishedAt`).
  Então `tgOrderAmount` devolve `kind: 'final'` depois disso, e o card
  mostra "Valor final"; antes, `estimated` e "Valor estimado".
- **Distância.** Só aparece se a entrada trouxer `distanceKm` (número finito
  e maior ou igual a zero). Hoje só o detalhe do pedido tem esse dado, e as
  listagens não. O card nunca calcula nem inventa a distância.
- **Datas relativas.** "Hoje", "Amanhã" e "Ontem" usam a entrada `now`, ou o
  `TgClock`. O `TgClock` é um relógio único para a aplicação, que só no
  navegador agenda a próxima meia-noite e atualiza todos os cards, sem
  timer por card e sem recriá-los. No servidor ele não agenda nada. É o único lugar em que o badge de status leva ícone,
dado por `tgOrderStatusIcon(status)`:

| Status | Ícone |
| --- | --- |
| `AGUARDANDO_APROVACAO`, `AGUARDANDO_CONFIRMACAO_CLIENTE` | `hourglass` |
| `AGUARDANDO_PAGAMENTO` | `wallet` |
| `AGENDADO` | `calendar-blank` |
| `EM_DESLOCAMENTO` | `map-pin` |
| `EM_ANDAMENTO` | `wrench` |
| `CONCLUIDO` | `check` |
| `DISPUTA` | `warning-circle` |
| `REJEITADO`, `CANCELADO` | `x` |
| desconhecido | sem ícone ("Em atualização") |

Regras:

- Quando vem primeiro: o dia ("Hoje", "Amanhã", "Ter, 18 nov") em
  `overline` e a hora em `title-1`. Sem data, "Data a combinar" e sem hora.
- O serviço é o link para o pedido (`tgCardLink`) e cobre o card; o botão
  fica por cima.
- A pessoa aparece com foto ou iniciais (a foto é decorativa, `alt` vazio;
  se falhar, voltam as iniciais).
- Endereço completo: rua, número e complemento · bairro, porque é a próxima
  visita. Na linha de pedido continua só o bairro.
- Para o prestador, a distância entra junto do endereço e aparece "Valor
  estimado R$ 120". O cliente não vê esses dois.
- No máximo um próximo passo, botão médio (44 px). Sem passo, sem rodapé.
- O layout segue a largura do container: abaixo de 480 px, o status desce
  para baixo da data e o botão ocupa a largura.

Acessibilidade:

- O link tem o nome do serviço e, como descrição, o status e a data
  ("Instalação de chuveiro", "Profissional a caminho", "Hoje 14:00").
- O ícone do badge é decorativo; o texto do status diz tudo.
- O botão tem o serviço como descrição. Em carregamento, `aria-busy`, e o
  clique não repete o pedido.
- Tab: o serviço e o próximo passo. Hover e foco são os do `tg-card` com
  link esticado.

O `app-card-appointment` saiu do início do cliente na Etapa 9 (veja
"Telas migradas") e continua só para quem ainda o usa. No app, o mesmo
conteúdo vai num `ion-card` com os tokens, nas migrações do app.

## Telas migradas (Etapa 9)

A tela piloto prova o caminho que a Etapa 10 repete: só componentes e
tokens do DS, dados reais pelos mappers, e carregamento, erro e vazio
tratados pela tela.

### Início do cliente (web)

`modules/customer/home`. Story: **Telas/Início do cliente** (com agenda,
sem endereço, agenda vazia, erro e carregando).

Ordem (decisão 2): alerta de endereço (se faltar), saudação com a busca,
agenda, categorias e histórico.

| Parte | Componente | Regra |
| --- | --- | --- |
| Endereço | `tg-alert` informativo + "Cadastrar endereço" | Só quando a consulta diz que não há endereço; falha na consulta não mostra. |
| Saudação | `h1` com o primeiro nome, `a[tgButton]` "Buscar serviço" | Sem nome, só "Olá". Sem ilustração: a antiga saiu e uma nova, no estilo I1, pode voltar depois. |
| Destaque | `tg-appointment-card` | Só um atendimento em curso (aguardando aprovação ou pagamento, agendado, a caminho, em andamento, aguardando sua confirmação): o que pede ação do cliente (Pagar, Ver QR Code, Confirmar conclusão); senão, o de data mais próxima (decisão 1). |
| Também na agenda | `ul[tgOrderList]` com `tg-order-row` | Primeiro os pedidos em análise (`DISPUTA`) e de status desconhecido, que nunca vão para o destaque mas não podem sumir; depois os demais em curso, data mais próxima primeiro. Até 3. Só em análise: a lista aparece sem destaque, não "agenda livre". |
| Histórico | `ul[tgOrderList]` com `tg-order-row` | Concluídos, cancelados e recusados, encerramento mais recente primeiro, até 3, com "Avaliar" quando falta. Sem nenhum, a seção some. |
| Categorias | `a[tgCard]` com imagem em cima e nome embaixo | O card inteiro é o link para a busca filtrada. Imagem decorativa (o nome é o texto do link), inteira, sem corte (`object-fit: contain` sobre `bg-canvas`, o fundo das artes); sem imagem, só o fundo. Duas colunas abaixo de 600 px. |
| Carregando | `tg-loading` com skeleton do card e da lista | |
| Erro | `tg-alert` de perigo com "Tentar de novo" | Nunca vira "agenda livre". |
| Vazio | `tg-empty-state` compacto + "Buscar serviço" | |

A seleção fica em `customer-home.agenda.ts` (`customerHomeAgenda`), função
pura com testes próprios. O encerramento usa só datas reais da listagem:
`clientConfirmedAt` ou `providerFinishedAt` no concluído; `payment.canceledAt`
ou `payment.refundedAt` no cancelado ou recusado. O pedido não guarda a data
do cancelamento (só a linha do tempo, que a listagem não traz), então um
cancelado sem pagamento usa a data do pedido. Categorias e pedidos carregam
em separado: a falha de um não esconde o outro. Cada carga de pedidos cancela
a anterior (`switchMap`). Sessão sem id não consulta nada e mostra o erro
com "Tentar de novo".

"Agendar serviço" e "Buscar serviço" levam à busca; não há "Ver todos"
porque a página de histórico ainda não existe.

### Início do prestador (web)

`modules/providers/home`, no tema escuro do prestador. Story:
**Telas/Início do prestador** (com agenda, vazio, erro e carregando).

Ordem (decisão 1): saudação, agenda, ganhos, e últimos serviços ao lado
dos insights. Duas fontes, carregadas em separado (a falha de uma não
esconde a outra): a agenda vem da lista de pedidos do prestador,
`GET /order/provider/:id` (decisão 3); ganhos, últimos serviços e insights
vêm do painel `/auth/provider-home`, como antes.

| Parte | Componente | Regra |
| --- | --- | --- |
| Saudação | `h1` com o primeiro nome, "Hoje você tem X atendimentos e Y solicitações.", `a[tgButton]` outline "Recebimentos" e "Meus serviços" | X: atendimentos em curso marcados para hoje; Y: solicitações aguardando. A frase só aparece com a agenda carregada. "Atualizar painel" saiu: a tela carrega ao abrir e a agenda recarrega depois de cada troca de status. |
| Próximo atendimento | `tg-appointment-card` (título h4) | Só um atendimento aceito e em curso: o que pede ação do prestador (Estou a caminho, Iniciar serviço, Finalizar serviço); senão, o de data mais próxima. |
| Solicitações aguardando você (n) | `ul[tgOrderList]` com `tg-order-row` | Data mais próxima primeiro, com "Responder", que abre a tela de aceite (`/provider/:id/aprovacao`, decisão 2): lá ficam os detalhes, Aceitar e Recusar com motivo. O título conta todas. |
| Também na agenda | `ul[tgOrderList]` com `tg-order-row` | Em análise (`DISPUTA`) e status desconhecido primeiro (nunca no destaque); depois os demais em curso, por data. Sem destaque, o título é "Na agenda". |
| Listas | `button[tgButton]` ghost "Ver todas as solicitações (n)" / "Ver todos os atendimentos (n)" | 10 linhas à vista; o botão (com `aria-expanded` e `aria-controls`) abre o resto na mesma ordem e leva o foco à primeira linha nova. O prestador não tem outra lista de pedidos no web, então nenhum pedido pode ficar fora de alcance. |
| Troca de status | `statusAction` do card e da linha | Um pedido por vez; o botão fica em carregando até a agenda recarregar (em silêncio, sem skeleton) e trazer aquele pedido fora do status em que a troca foi pedida, para não repetir a troca no status antigo. Cada pedido é confirmado à parte: a recarga de um não solta outro, e uma resposta pedida depois da troca que traga o pedido no status antigo, ou não o traga, mantém o bloqueio e mostra o aviso com "Tentar de novo". Erro: `tg-alert` de perigo com a mensagem da API. Se a troca deu certo mas a recarga falhou, a agenda anterior fica à vista com um `tg-alert` de atenção ("Sua agenda pode estar desatualizada") e "Tentar de novo"; os atendimentos trocados continuam bloqueados até a agenda atualizar. |
| Ganhos | 4 `tg-card` (Ganhos hoje, Ganhos do mês, Serviços concluídos, Avaliação) + a nota sobre o repasse | Os mesmos números do painel. Crescimento positivo na cor de sucesso. Sem avaliações: "Sem notas", nunca 0,0. "Ganhos do mês" usa o ícone `receipt`: não há ícone de tendência no conjunto aprovado. |
| Gráfico | `app-provider-revenue-chart` em um `tg-card` | Só tokens; valores em "R$ 1.540"; cabe em qualquer largura, sem rolagem lateral. |
| Últimos serviços | `ul[tgOrderList]` com linha própria | O desenho da `tg-order-row` com "Sua parte no serviço: R$ X" (`payment.providerAmount`; o painel não diz se o pagamento foi confirmado nem se houve repasse, então a tela não diz "recebeu"; a linha do DS mostra o valor bruto) e a nota ("Nota 5" para leitor de tela) ou "sem avaliação". |
| Insights | `dl` com 4 blocos | "Sem dados" quando o painel não tem. |
| Carregando | `tg-loading` com skeleton do card, da lista e dos indicadores | |
| Erro | `tg-alert` de perigo com "Tentar de novo", um por fonte | Nunca vira "agenda livre" nem ganhos zerados. |
| Vazio | `tg-empty-state` compacto + "Ver meus serviços" | |
| Conta nova | `tg-empty-state` compacto "Seus ganhos aparecem aqui" + "Ver meus serviços" | Sem nenhum serviço concluído nem ganho, o estado vazio fica no lugar dos indicadores, do gráfico, dos últimos serviços e dos insights, em vez de tudo zerado. Os números aparecem a partir do primeiro serviço. |

A seleção fica em `provider-home.agenda.ts` (`providerHomeAgenda`) e a
formatação do painel em `provider-home.earnings.ts`
(`providerHomeEarnings`), funções puras com testes próprios.

## Telas migradas (Etapa 10)

As demais telas, uma por vez, no caminho das telas piloto.

### Detalhes do pedido (web)

`modules/orders/order-details`, rota `orders/:id`, a mesma para cliente e
prestador (o tema segue quem está logado). Story: **Telas/Detalhes do
pedido** (pagamento pendente, confirmar conclusão, prestador agendado,
concluído e avaliado, recusado, carregando e erro).

Decisões aprovadas: (1) o próximo passo fica no resumo, no topo, e a barra
fixa no rodapé saiu; (2) cada um vê só a outra pessoa; (3) a tela mostra o
que a API já manda e antes ficava escondido (a parte do prestador, a taxa,
a distância, as observações da finalização, o ajuste de preço e a
avaliação). As fotos do pedido ainda não aparecem.

| Parte | Componente | Regra |
| --- | --- | --- |
| Voltar e título | link "Voltar ao início", `h1` com o serviço | Acima do título, "Pedido #id · categoria"; abaixo, a data do pedido. "Falar com o suporte" (`a[tgButton]` ghost) abre o mesmo e-mail de antes. |
| Resumo | `tg-card` | Quando (Hoje/Amanhã/data e hora, ou "Data a combinar"), `tg-badge` com o mapa de status e o ícone do DS, endereço completo (cidade, CEP e, para o prestador, a distância), a outra pessoa (foto ou iniciais; para o cliente, verificado e nota) e o próximo passo. |
| Próximo passo | `a/button[tgButton]` | O mesmo de `tgOrderNextStep` (Pagar, Ver QR Code, Confirmar conclusão, Avaliar, Responder, Estou a caminho, Iniciar serviço, Finalizar serviço). Ao lado de "Confirmar conclusão", "Reportar problema" em outline. Agendado e já pago não pede pagamento. |
| Troca de status | `button[tgButton]` com `loading` | Um clique por vez; o botão só solta quando o pedido recarregado (em silêncio) sai do status em que a troca foi pedida. Recarga com o status antigo ou falha na recarga: o pedido fica à vista e bloqueado, com `tg-alert` de atenção ("O pedido pode estar desatualizado") e "Tentar de novo". Erro da troca: `tg-alert` de perigo com a mensagem da API. |
| Avisos | `tg-alert` | Prazo de expiração (atenção, pela perspectiva: "Pague até 15:40", "O cliente tem até 15:40 para pagar", "Responda até…"); cancelamento ou recusa (perigo, com motivo e observação). |
| Pagamento | `tg-card` com `dl` | Valor estimado ou final, forma (Pix, Cartão) e situação em português ("Em atualização" se desconhecida). Para o prestador, "Sua parte" (estimada até o valor final) e a taxa da plataforma. |
| Conclusão | `tg-card` com `dl` | Só quando há observações do prestador, motivo de ajuste de preço ou avaliação. |
| Linha do tempo | `app-order-timeline` em um `tg-card` | Só tokens e o ícone `check` do DS. |
| Carregando e erro | `tg-loading` com skeleton; `tg-alert` de perigo | 404: "Este pedido não foi encontrado", sem "Tentar de novo"; outras falhas, com "Tentar de novo". |

A formatação fica em `order-details.view.ts` (`orderDetailsView` e
`orderExpiryNotice`), funções puras com testes próprios.

### Pagamento do pedido (web)

`modules/orders/order-payment`, rota `orders/:id/payment`, só para o
cliente. Story: **Telas/Pagamento do pedido** (Pix aguardando pagamento,
antes de gerar, pago, expirado, pagamento não concluído, carregando e erro).

Decisões aprovadas: (1) o resumo mostra só "Total a pagar", o valor que a
API cobra; a taxa da plataforma já está dentro e sai da parte do prestador;
(2) a tela é só Pix, sem aviso de cartão; (3) "Já paguei" substitui
"Atualizar pagamento", aparece só com o Pix pendente e a conferência
automática a cada 15 s continua; depois de pago, "Ver pedido".

| Parte | Componente | Regra |
| --- | --- | --- |
| Voltar e título | link "Voltar ao pedido", `h1` "Pague com Pix" | Acima, "Pedido #id · Pagamento". |
| Resumo | `tg-card` | Foto ou iniciais do prestador, serviço, prestador e quando, e "Total a pagar" (`payment.amount`; antes da cobrança, o valor final ou estimado). |
| Sem cobrança | `button[tgButton]` "Gerar Pix" com `loading` | Um clique por vez; o backend devolve a cobrança que já existe. Erro: `tg-alert` de perigo com a mensagem da API. |
| Pix pendente | `tg-badge` "Aguardando pagamento", QR Code, passos e código | O QR fica sobre `--tg-ink-0` para ser lido nos dois temas. "Copiar código" vira "Código copiado" (com `role=status`); se a área de transferência falhar, a tela pede para copiar à mão. "Já paguei" (outline) confere na hora e avisa se ainda não recebeu. Validade: "15:40" (hoje) ou "14/11, 15:40". |
| Pago | `tg-badge` "Pago" | "Pagamento confirmado" e "Ver pedido". |
| Expirado e falha | `tg-alert` de atenção ou de perigo | "O código Pix expirou" ou "O pagamento não foi concluído", com "Falar com o suporte" (o mesmo e-mail de antes). |
| Carregando e erro | `tg-loading` com skeleton; `tg-alert` de perigo | 404: "Este pedido não foi encontrado", sem "Tentar de novo"; outras falhas, com "Tentar de novo". |

A conferência automática só roda no navegador (não no SSR) e só enquanto o
Pix está pendente. A formatação fica em `order-payment.view.ts`
(`orderPaymentView`), função pura com testes próprios.

### Busca de profissionais (web)

`modules/customer/search`, rota `customer/search`, só para o cliente. Os
filtros continuam na URL (`categoria`, `minimumRating`, `maximumDistance`,
`minimumPrice`, `maximumPrice`, `onlyFavorites`, `lat`/`lng`). Story:
**Telas/Busca de profissionais** (com resultados, com filtros ativos, sem
resultados, sem localização, carregando e falha na busca).

Decisões aprovadas: (1) os filtros do painel só valem ao tocar "Ver N
profissionais", e fechar o painel descarta o rascunho; a categoria fica
fora, em chips, e busca na hora; (2) nota e distância são chips, e preço são
dois campos (mínimo e máximo), sem slider nem switch novo no DS; (3) no
celular, abas "Lista" e "Mapa"; na tela grande (a partir de 960 px), lado a
lado; (4) a lista vem dos mais próximos para os mais distantes.

| Parte | Componente | Regra |
| --- | --- | --- |
| Título | `h1` "Encontre um profissional" | Acima, "Perto de" e o endereço usado (ou "a região do link"). |
| Barra | `button[tgButton]` outline e chips | "Filtros" mostra quantos filtros do painel estão em uso ("Filtros · 2"). Chips de categoria (`button` com `aria-pressed`) rolam na horizontal; "Todas" tira a categoria. |
| Filtros | `tg-sheet` | Endereço (select nativo com tokens) e "Usar minha localização atual" mudam a origem na hora, como antes. Nota (Qualquer, 3+, 4+, 4,5+) e distância (Sem limite, 5, 10, 25 km) em chips; preço em dois `tg-field`, com erro se o máximo for menor que o mínimo; "Mostrar só meus favoritos" (checkbox nativo com `role="switch"`). Ações: "Limpar" (zera o rascunho) e "Ver N profissionais". |
| Lista | `tg-provider-card` | Os dados do `toTgProvider` (só serviços da categoria), com a distância da busca e o coração no estado real do favorito. Prestador sem id válido fica só no mapa. |
| Mapa | `app-proxi-map` | O mesmo componente (Leaflet), com moldura de tokens. No celular, só é criado ao abrir a aba "Mapa". |
| Estados | `tg-loading` com skeleton; `tg-empty-state`; `tg-alert` | Sem resultado: "Ninguém com esses filtros", com "Limpar filtros" quando há filtro. Sem localização: atenção, com "Usar minha localização". Falha na busca: perigo, com "Tentar de novo". Falha ao favoritar: perigo, acima da lista. |

A filtragem por nota, distância e preço continua no navegador, sobre o que a
API devolve.

### Entrar e recuperar acesso (web)

`modules/auth`: a casca `AuthPage` (rota `authenticate`), Entrar
(`authenticate/login`), Recuperar acesso (`authenticate/forgot-password`) e
Criar nova senha (`authenticate/reset-password#token=...`). Os endpoints e
o `returnUrl` dos e-mails de pedido não mudaram. Story: **Telas/Entrar e
recuperar acesso** (entrada, entrar, entrar com falha da API, recuperar
acesso, criar nova senha e link inválido).

Decisões aprovadas: (1) a migração da autenticação vem em duas entregas;
esta é a primeira e o cadastro vem depois, com proposta própria; (2) o
carrossel de perfis saiu: a entrada mostra "Entrar" e "Criar conta", a
escolha entre cliente e profissional fica no cadastro e estas telas usam o
tema do cliente; (3) o painel da marca não tem ilustração por enquanto; (4)
os erros aparecem ao enviar, e não com o botão desabilitado.

| Parte | Componente | Regra |
| --- | --- | --- |
| Casca | painel da marca e `router-outlet` | A partir de 960 px, lado a lado: "TaskGo", "Serviços de casa, perto de você." e três destaques com `check`. No celular, uma faixa ("TaskGo · Serviços perto de você"). O tema segue a rota ativa a cada navegação: entrada, entrar, recuperar e nova senha usam sempre o do cliente; as rotas do cadastro (`data.accountTheme`) usam o tipo de conta escolhido, que só muda pela escolha no cadastro. |
| Entrada | `h1` "Boas-vindas ao TaskGo", `a[tgButton]` | "Entrar" (solid) e "Criar conta" (outline, volta ao tema do cliente). |
| Entrar | `tg-field` com `tgInput` e `tg-password-toggle` | "Esqueci minha senha" na linha do rótulo da senha. "Entrar" sempre ativo: ao enviar, cada campo mostra o erro, o foco vai ao primeiro inválido e o erro some ao corrigir. Durante o pedido, `loading` e um envio por vez. Erro da API: `tg-alert` de perigo. Rodapé: "Ainda não tem conta? Criar conta". |
| Recuperar acesso | `tg-field` e "Enviar link" | "Voltar para entrar" no topo. Enviado, o formulário dá lugar a "Confira seu e-mail" (`tg-alert` de sucesso, com o e-mail) e "Voltar para entrar". |
| Criar nova senha | `tg-field` com `tg-password-toggle` | Dica "Pelo menos 10 caracteres." (de 10 a 72, a regra do backend). Salva: "Senha atualizada" e "Entrar". Sem token: "Link inválido ou vencido", com "Pedir novo link". |
| Criar conta | `label[tgCard]` com rádio; `a[tgCard]` com `tg-badge` | Tipo de conta em dois cards de escolha (Cliente e Profissional, com ícone e uma frase), que trocam o tema na hora. Cada passo é um card-link com número (ou `check` quando feito), o selo "Feito" ou "Pendente" e "x de y" no título. "Criar sua conta" fica desabilitado até todos os passos, com o motivo abaixo; durante o pedido, `loading`. Erro da API: `tg-alert` de perigo. |

O título da aba acompanha o `h1` de cada tela.

### Passos do cadastro e conta criada

Rotas `authenticate/profile`, `contact`, `address`, `category` e
`category/:id/service`. O pedido `POST /auth/register` não mudou. Story:
**Telas/Cadastro** (um passo por história, com erros, CEP não encontrado e
conta criada de cliente e de profissional).

Decisões aprovadas: (1) um passo por tela, com "Voltar para Criar conta" no
topo e "Salvar e voltar" no fim; (2) senha de 10 a 72 caracteres e CPF com os
dígitos verificadores conferidos; (3) CEP não encontrado mostra um aviso com
"Usar minha localização", porque a API exige latitude e longitude; (4) a
conta criada aparece na própria casca, sem modal. Como em Entrar, os erros
aparecem ao enviar, o foco vai ao primeiro inválido e os botões nunca ficam
desabilitados por validação.

| Passo | Componente | Regra |
| --- | --- | --- |
| Cabeçalho | `a.auth__back`, sobretítulo e `h1` | "Passo 1" a "Passo 4 · profissional" acima do título. O rascunho fica guardado: voltar a um passo traz o que já foi preenchido. |
| Perfil | `tg-field` com `tgInput`, máscara e `tg-password-toggle` | Nome, e-mail, celular com DDD, CPF e senha com confirmação, um campo por linha. CPF inválido: "Confira o CPF: os dígitos não batem." |
| Contato | `tg-field` opcional, prefixo `@` | WhatsApp, Instagram, Facebook e LinkedIn, todos opcionais. WhatsApp, se preenchido, precisa estar completo. O `@` digitado ou colado no Instagram não duplica. |
| Localização | `tg-field`, `tg-alert` e "Usar minha localização" | O CEP completo busca o endereço e mostra "Cidade · UF". Sem coordenadas, `tg-alert` de aviso ("Não achamos esse CEP", "Precisamos da sua localização" ou "Não foi possível buscar o CEP") com o botão; cidade e UF viram campos quando o CEP não as trouxe. Salvar sem localização torna o aviso de perigo e leva o foco ao botão. |
| Categoria | `label[tgCard]` com rádio, `tg-loading` | Grade de cards (2 colunas). Carregando: esqueletos. Falha: `tg-alert` de perigo com "Tentar de novo". Sem escolha: "Escolha uma categoria". |
| Serviços | `label[tgCard]` com checkbox | Lista da categoria, com "N selecionados". Sem escolha: "Escolha pelo menos um serviço". "Adicionar serviços" volta para Criar conta. |
| Conta criada | ícone `check`, `h1` com foco, `a[tgButton]` | Substitui os passos. Profissional: "Configurar meus serviços" e "Ir para o início". Cliente: "Buscar profissionais" e "Ir para o início". |

### Responder solicitação (web)

`modules/providers/pending-approval`, rota `provider/:orderId/aprovacao`
(título "Responder solicitação"), só para o prestador, dentro do shell
logado com o tema do prestador. Story: **Telas/Responder solicitação**
(pendente, carregando, confirmar recusa, enviando resposta, enviando
recusa, já aceita, já recusada, expirada, erro ao carregar e erro ao
responder). Endpoints sem mudança: `GET /orders/:id`, `POST
/order/:id/provider/:providerId/confirm` e `POST .../cancel` com `{ reason,
note? }` (`CancelOrderByProviderDto`: motivo do enum
`OrderCancellationReason`, observação opcional de até 500 caracteres).

Decisões: (1) a recusa não se desfaz (o pedido vai para CANCELADO), então
"Recusar" abre um `tg-dialog` de perigo com o motivo e a confirmação num
passo só, no lugar do bloco de motivos na própria tela; (2) depois de
aceitar ou recusar, a tela fica no lugar e um `tg-alert` substitui as
ações, com "Ver detalhes do pedido", no lugar do `app-full-modal` que
levava ao início; (3) solicitação que já não aguarda resposta diz como
terminou (aceita, recusada com o motivo, expirada ou cancelada).

| Parte | Componente | Regra |
| --- | --- | --- |
| Voltar e título | link "Voltar ao início", `h1` com o serviço | Acima, "Nova solicitação · recebida há 2 h" ("Solicitação" depois de respondida); abaixo, categoria e nome do cliente. Sem contato do cliente. |
| Prazo | `tg-alert` de atenção | `orderExpiryNotice` (o mesmo de Detalhes do pedido): "Responda até 15:40", só enquanto aguarda resposta. Quando o prazo passa, vira "O prazo terminou" sem recarregar (um timer só, sem polling); só a API diz que expirou. |
| Quando e onde | `tg-card` com `dl` | Data e horário no horário de São Paulo ("A combinar" sem data), endereço, bairro/cidade/CEP e a distância até a área de atendimento. |
| Valores | `tg-card` com `dl` | Valor do serviço, taxa da plataforma e "Você recebe (estimado)" em destaque. |
| Ações | `button[tgButton]` | "Recusar" (outline) e "Aceitar serviço" (com `loading`). Um envio por vez. No celular, empilhadas com "Aceitar serviço" em cima. |
| Recusa | `tg-dialog` de perigo com `label[tgCard]` (rádio) e `tg-field` | "Recusar esta solicitação?", motivo obrigatório ("Escolha o motivo da recusa." abaixo das opções), "Conte mais" opcional só em "Outro motivo", enviado sem espaços nas pontas. Enviando: `busy` no diálogo e `loading` em "Recusar solicitação". O link com `?recusar` abre o diálogo assim que a solicitação carrega, se ainda aguarda resposta. |
| Resultado | `tg-alert` | Aceita (sucesso), recusada (informativo, com motivo e observação), expirada (atenção; o backend cancela e registra EXPIRED na linha do tempo), cancelada (informativo). Anunciado pelo `LiveAnnouncer`. |
| Erro ao responder | `tg-alert` de perigo | Na tela (aceite) ou dentro do diálogo (recusa). 400/409: "Esta solicitação não pode mais ser respondida", com "Atualizar"; outras falhas: "Não foi possível enviar sua resposta". |
| Carregando e erro | `tg-loading` com skeleton; `tg-alert` de perigo | 404: "Esta solicitação não foi encontrada", sem "Tentar de novo"; outras falhas, com "Tentar de novo". |

O desfecho fica em `pendingApprovalOutcome`, função pura com testes
próprios.

### Dados pessoais (web)

`modules/general/profile/view` e `edit`, rotas `/general/:userId/profile/view`
e `/general/:userId/profile/edit` (sem sufixo, vai para `view`). Agora é uma tela
própria do shell, como Pedidos: sem o cabeçalho de perfil da conta, com
`unauthorizedGuard` e `sessionUserGuard`. O id vem sempre da sessão. Endpoints
sem mudança: `GET` e `PATCH /user/:id`. Story: **Telas/Dados pessoais**
(cliente, prestador, carregando, erro ao carregar, edição, edição com erros,
salvando, erro ao salvar e sucesso).

Decisões aprovadas: (1) as seções de antes ficam (progresso do cadastro,
acessos rápidos, endereço principal e, para o prestador, o perfil público),
agora em `tg-card`; (2) os atalhos seguem os nomes do menu ("Pedidos" e
"Ganhos"); (3) salvar volta para os dados com o alerta "Dados salvos.", que só aparece com
os dados carregados e só para a conta que salvou; (4) os
erros da API aparecem com texto da tela, porque as mensagens da API vêm em
inglês.

| Parte | Componente | Regra |
| --- | --- | --- |
| Título | `h1` "Dados pessoais", `a[tgButton]` "Editar dados" | O botão só aparece com os dados carregados. |
| Identidade | `tg-card`, avatar (foto ou iniciais), `tg-badge` | Nome, "Cliente" ou "Profissional", e-mail e telefone formatado ("(11) 91234-5678"). Cada contato tem o selo "Verificado" ou "Não verificado" quando a API manda o dado. |
| Cadastro | `tg-card`, `progress` com tokens, `tg-badge` "Feito" | Contato, foto e endereço; o que falta leva à edição ou aos endereços. |
| Atalhos | `tg-card` com lista de links | Pedidos e Meus endereços; cliente: Profissionais favoritos; prestador: Ganhos e Meus serviços. |
| Endereço | `tg-card`; `tg-empty-state` compacto | O principal (ou o primeiro). Sem endereço: "Nenhum endereço cadastrado" com "Adicionar endereço". |
| Edição | `tg-field` com `tgInput` | Link da foto (opcional, com prévia), nome completo, e-mail e telefone. Os erros aparecem ao salvar, o foco vai ao primeiro inválido e o botão nunca fica desabilitado por validação. |
| Salvando e erro | `button[tgButton]` com `loading`; `tg-alert` | Um envio por vez. Falha: "Não deu para salvar", com o que foi digitado mantido. Nada mudou: aviso informativo, sem chamar a API. |
| Carregando e erro | `tg-loading` com skeleton; `tg-alert` de perigo | Falha: "Tentar de novo". 401 ou sessão sem id: "Entrar de novo". |

Regras:

- Validação alinhada ao `UpdateUserDto` e às entidades `Email` e `Phone` da
  API: nome obrigatório e até 150 caracteres; e-mail com as regras do `@IsEmail()` do DTO e do `Email.isValid`
  (`isApiEmail`);
  telefone com 10 a 13 dígitos, com ou sem máscara; foto opcional, só HTTPS
  e até 2048 caracteres.
- O `PATCH` leva só o que mudou, normalizado (nome e e-mail sem espaços nas
  pontas, telefone só com dígitos, foto vazia vira `null`). A API desfaz a
  verificação do e-mail e do telefone que recebe, então reenviar o mesmo
  valor apagaria a verificação.
- Ao salvar, o nome, o e-mail, o telefone e a foto da sessão são atualizados
  com o que a API devolveu, para o menu da conta já mostrar os dados novos.
- No desktop, os dados têm até 880 px e a edição até 640 px, centralizados.
  A partir de 640 px de largura, os cards ficam em duas colunas.

### Conta (web)

O hub da conta de quem está logado, em `/general/:id/home` (título "Conta"),
o destino da aba "Conta" abaixo de 1024 px. É uma tela própria do shell,
como Pedidos: sem o cabeçalho de perfil antigo. Story: **Telas/Conta**.
Endpoint sem mudança: `GET /user/:id` (só o dono; `user.controller.ts`,
`assertOwner`), sempre com o id da sessão.

| Parte | Componente | Regra |
| --- | --- | --- |
| Identidade | `tg-card` com avatar (foto ou iniciais), nome, e-mail e `tg-badge` neutro com o modo ("Cliente" ou "Profissional") | Vem da API. Carregando: skeleton do card. |
| Links | `a[tgCard]` numa `nav aria-label="Sua conta"` | Cliente: Dados pessoais, Endereços, Pedidos. Prestador: os mesmos e "Perfil público" (`/provider/profile/:id`, a prévia). Não dependem da API: ficam à vista também no carregando e na falha. |
| Sair | `button[tgButton]` outline, tom `danger`, ícone `sign-out` | Separado dos links; chama o logout da sessão. |

Regras:

- Rota com `unauthorizedGuard` e `sessionUserGuard`: o id da URL nunca é
  fonte de identidade; diferente do da sessão, a URL é corrigida.
  `/general/:id` leva a `/general/:id/home`.
- Falha: `tg-alert` de perigo "Não foi possível carregar seus dados" com
  "Tentar de novo", que repete só a consulta do perfil (a anterior é
  descartada).
- 401 ou sessão sem id: `tg-alert` "Sua sessão expirou" com "Entrar
  novamente" (limpa o token e vai para `/authenticate/login`), sem consultar
  a API e sem os links.
- A ajuda institucional (Quem somos, Perguntas frequentes, Ajuda) fica no
  rodapé do shell, não na lista.
- No desktop, a tela tem até 640 px, centralizada.

### Endereços (web)

Os endereços de quem está logado, em `/general/:id/addresses`, dentro do
perfil da conta (abaixo do cabeçalho do perfil, que já tem o `h1`; o título
"Endereços" é `h2`). Story: **Telas/Endereços** (com endereços, sem
endereços, carregando, falha da API, novo endereço com erros, busca do CEP,
CEP não encontrado, editar, falha ao salvar e remover). Endpoints sem
mudança: `GET /user/me/addresses?limit=100`, `POST`, `PATCH /:id` e `DELETE
/:id`; o CEP continua na BrasilAPI (`Geolocalization.getAddressByCep`).

| Parte | Componente | Regra |
| --- | --- | --- |
| Título | `h2` e linha de apoio | "N endereços salvos." com a lista carregada; senão, "Os locais onde você recebe os serviços." "Adicionar endereço" (`button[tgButton]` sm, ícone `plus`) no topo só quando há algum endereço ou a lista falhou. |
| Lista | `ul` de `tg-card` | Duas colunas a partir de 600 px de contêiner. Nome (`h3`), `tg-badge` "Principal" no padrão, rua e número, complemento, "Bairro · Cidade, UF" e "CEP 00000-000". "Editar" (outline) e "Remover" (ghost, perigo, ícone `trash`) com `aria-describedby` no nome do endereço. Ordem da API. |
| Vazio | `tg-empty-state` num `tg-card` | "Nenhum endereço cadastrado", com "Adicionar endereço" (a única ação da tela). |
| Carregando e erro | `tg-loading` com skeleton; `tg-alert` de perigo | "Não foi possível carregar seus endereços", com "Tentar de novo". Cada carga cancela a anterior. |
| Formulário | `tg-sheet` com `tg-field` + `tgInput` | Nome, CEP (máscara), rua, número, complemento (opcional), cidade e estado, e "Usar como endereço principal". Ações "Cancelar" e "Salvar endereço" (`loading` e `busy` durante o envio). |
| Remover | `tg-dialog` de perigo | "Remover este endereço?", com o nome e a rua; "Voltar" (foco inicial) e "Remover endereço". Falha fica no diálogo. |

Regras:

- Validação alinhada ao `CreateAddressDto` (apps/backend/src/modules/address/dto):
  nome, rua, número, cidade e estado obrigatórios (só espaços não vale), complemento
  opcional; CEP com 8 dígitos. Os erros aparecem abaixo de cada campo depois da
  primeira tentativa de salvar, e o foco vai para o primeiro campo com erro. O texto
  vai sem espaços nas pontas e o CEP só com dígitos.
- O campo Bairro saiu: o DTO não o aceita e a API nunca o guardou. O bairro que a
  API devolver ainda aparece no card.
- CEP completo busca o endereço; "Buscando o endereço pelo CEP…" fica na dica do
  campo. O que a pessoa mudou durante a busca fica, e número e complemento nunca
  mudam. CEP não encontrado ou falha da busca: `tg-alert` de atenção, e o
  endereço pode ser preenchido à mão. Resposta de um CEP anterior é descartada.
- Salvar: um envio por vez. Sucesso fecha o painel, mostra "Endereço adicionado."
  ou "Endereço atualizado." (`tg-alert` de sucesso, com fechar) e recarrega a
  lista em silêncio (a lista fica à vista). Falha mantém o painel e o que foi
  digitado, com "Não deu para salvar". Cada abertura do painel começa do zero.
- Remover pede confirmação; sucesso fecha o diálogo, mostra "Endereço removido."
  e recarrega a lista em silêncio.

### Finalizar serviço (web)

O prestador informa que terminou o atendimento, em `/orders/:id/finish`
(fora do shell, como os detalhes do pedido). Story: **Telas/Finalizar
serviço**. Endpoints sem mudança: `GET /orders/:id` e `PATCH
/orders/:id/finish`.

Decisões (a validar): (1) cabeçalho como os detalhes do pedido: "Pedido
#N · Categoria", h1 "Finalizar serviço" e o `tg-badge` do status do mapa do
DS; (2) um `tg-card` de resumo com o serviço, o cliente, quando, o endereço
e o "Valor combinado" só para leitura ("O valor combinado na contratação é
fixo."); o campo de valor somente leitura e o quadro "Confirme os dados"
(valor estimado, final e diferença, sempre iguais) saíram; (3) um `tg-card`
"Como foi o atendimento" com "Observações do serviço" (`tg-field`,
opcional, contador "N de 1.000 caracteres") e as ações "Voltar ao pedido" e
"Enviar conclusão".

Regras:

- Só `EM_ANDAMENTO` pode ser finalizado (`finish-order.handler.ts`). Em
  qualquer outro status, `tg-empty-state` "Este serviço não pode ser
  finalizado", com o status atual e "Ver detalhes do pedido"; sem formulário.
- Valor enviado (`finalPrice`): `payment.finalAmount` (o `order.finalPrice`
  que o backend compara), depois `payment.estimatedAmount`, depois
  `service.estimatedPrice`. Sem valor válido: `tg-alert` de atenção e envio
  bloqueado. Fotos: sempre `[]` (o DTO ainda recusa fotos).
- Observações: sem espaços nas pontas; vazias não vão no corpo. Limite de
  1.000 caracteres do DTO, com erro no campo.
- Enviando: um envio por vez, botão com `loading`. Sucesso: `tg-alert` de
  sucesso "Conclusão enviada" com a mensagem da API, o selo passa ao status
  devolvido ("Aguardando o cliente") e, depois de 900 ms, a tela abre os
  detalhes do pedido (como antes). Falha: `tg-alert` de perigo "Não foi
  possível enviar a conclusão" com o motivo da API (a mensagem em inglês de
  valor divergente é traduzida), formulário preservado.
- Carregando: skeleton. Falha ao carregar: `tg-alert` com "Tentar de novo";
  404: "Este pedido não foi encontrado", sem repetir.
- Data e hora no horário de São Paulo, valores com `Intl`.

### Confirmar conclusão (web)

`modules/orders/confirm-service`, rota `orders/:id/confirm`, só para o
cliente. Story: **Telas/Confirmar conclusão** (aguardando confirmação, sem
ajuste e sem fotos, enviando, confirmado, status que não permite confirmar,
carregando, erro ao carregar e erro ao confirmar). Endpoints sem mudança:
`GET /orders/:id` e `PATCH /orders/:id/confirm` (sem `clientNotes`, como antes).

Decisões aprovadas: (1) depois de confirmar, a tela mostra "Serviço
confirmado" com "Avaliar atendimento" e "Ver detalhes do pedido", em vez do
toast e do redirecionamento automático para a avaliação; (2) o badge do topo
mostra o status real do pedido (antes era sempre "Aguardando sua
confirmação"); (3) o pedido concluído e sem avaliação oferece "Avaliar
atendimento".

| Parte | Componente | Regra |
| --- | --- | --- |
| Voltar e título | link "Voltar ao pedido", `h1` "Confirmar conclusão" | Acima do título, "Pedido #id · categoria"; ao lado, `tg-badge` com o mapa de status do DS. |
| Resumo do serviço | `tg-card` com `dl` | O prestador (foto ou iniciais, verificado, nota), o serviço, o agendamento, o endereço, quando o prestador finalizou e as observações dele (ou "O prestador não deixou observações."). Datas no horário de Brasília. |
| Fotos | `tg-card`; `tg-empty-state` compacto | Fotos da finalização com o tipo (Antes, Depois, Comprovante, Avaria), abrem em nova aba. Sem fotos: "Nenhuma foto enviada". |
| Valores | `tg-card` com `dl`; `tg-alert` de atenção | "Valor final" em destaque, valor estimado, diferença (só quando muda, em centavos), forma e situação do pagamento em português. Valor ajustado: "O valor final foi ajustado" com o motivo. |
| Decisão | `tg-card`; `button[tgButton]` e `a[tgButton]` outline | "Confirmar conclusão" abre o `tg-dialog`; "Reportar problema" leva a `/orders/:id/report-problem`. |
| Confirmação | `tg-dialog` com `busy` e `loading` | "Confirmar a conclusão do serviço?", com o valor e o prestador. Um envio por vez; enquanto envia, nada fecha o diálogo. |
| Confirmado | `tg-card` | "Serviço confirmado" com a mensagem da API; o foco vai para o título. Badge "Concluído". |
| Indisponível | `tg-alert` de atenção | Quem não é o cliente do pedido, pedido concluído ("Este serviço já foi confirmado"), em disputa ("Aguarde a análise do problema reportado") ou em outro status: sem o botão de confirmar, com "Ver detalhes do pedido". |
| Erros | `tg-alert` de perigo | Ao carregar: 404 "Este pedido não foi encontrado" e 403 sem "Tentar de novo"; outras falhas com "Tentar de novo". Ao confirmar: o diálogo fecha e o alerta mostra a mensagem da API (por exemplo, "Pagamento ainda não confirmado"). |

As regras seguem `ConfirmOrderCompletionHandler` (apps/backend): só o
cliente, só em `AGUARDANDO_CONFIRMACAO_CLIENTE`, Pix pago e sem problema
reportado em aberto; a tela não antecipa as regras de pagamento e mostra a
recusa da API. A formatação fica em `confirm-service.view.ts`
(`confirmServiceView`), função pura com testes próprios.

### Avaliar atendimento (web)

`modules/orders/review-order`, rota `orders/:id/review`, só para o cliente.
Story: **Telas/Avaliar** (formulário, preenchido, erros de validação,
enviando, enviado com sucesso, erro ao enviar, já avaliado, pedido não
concluído, pedido cancelado, carregando e erro ao carregar). Endpoints sem
mudança: `GET /orders/:id`, `GET /review-tags` e `POST /orders/:id/review`.

Decisões aprovadas: (1) pedido de outra conta, ainda em curso, cancelado ou
já avaliado mostra o motivo na própria tela, com "Ver pedido", em vez de
redirecionar sem explicação; (2) depois de enviar, a tela mostra "Obrigado
pela avaliação!" com a nota, o comentário e "Ver pedido", sem o redirecionamento
automático de 1,2 s; (3) o botão "Enviar avaliação" fica sempre ativo e a
falta de nota vira erro de validação.

| Parte | Componente | Regra |
| --- | --- | --- |
| Voltar e título | link "Voltar ao pedido", `h1` "Avaliar atendimento" | Acima, "Pedido #id · Avaliação"; abaixo, "Conte como foi sua experiência com {prestador}". |
| Resumo | `tg-card` com `dl` | Foto ou iniciais do prestador, nome e serviço; "Realizado em" (finalização, senão o agendado, em São Paulo) e "Valor pago" (final, senão estimado do pagamento, senão o do serviço). |
| Nota | `fieldset role="radiogroup"` com rádios nativos e `tg-icon` `star` | Cinco rádios visualmente ocultos: Tab entra no grupo e as setas trocam a nota. Cada estrela tem nome ("4 estrelas, Bom atendimento"); a prévia ao passar o mouse não muda a nota. Estrela cheia em `--tg-feedback-warning-text`, vazia em `--tg-border-strong`. |
| Destaques | chips `button` com `aria-pressed` | As tags ativas de `GET /review-tags`, opcionais. Carregando: skeleton; falha ou lista vazia: a seção some (como antes) e volta no "Tentar de novo". |
| Comentário | `tg-field` com `textarea[tgInput]` | Opcional, até 500 caracteres (`@MaxLength(500)` do `CreateOrderReviewDto`), contados sem os espaços das pontas, que a tela tira antes de enviar. Contador `N/500`. |
| Validação | erro abaixo das estrelas e do campo | Sem nota: "Escolha uma nota de 1 a 5 estrelas." e o foco vai para a primeira estrela; comentário longo: o foco vai para o campo. |
| Envio | `button[tgButton]` com `loading` | Um envio por vez; os campos ficam travados. Erro: `tg-alert` de perigo com a mensagem da API (texto) ou "Verifique sua conexão e tente de novo."; o que foi preenchido fica. 409: vira "Você já avaliou este atendimento". |
| Enviado e já avaliado | `tg-card` com `tg-badge` `done` | "Avaliação enviada" / "Já avaliado", a nota (estrelas com `role="img"`, "Nota N de 5") e o comentário; o foco vai para o título depois do envio. |
| Sem permissão | `tg-alert` de atenção com "Ver pedido" | Outra conta: "Só quem contratou pode avaliar"; em curso: "O atendimento ainda não foi concluído"; cancelado, recusado ou em disputa: "Este pedido não pode ser avaliado". As regras são as do `create-order-review.handler.ts`. |
| Carregando e erro | `tg-loading` com skeleton; `tg-alert` de perigo | 404: "Este pedido não foi encontrado", sem "Tentar de novo"; outras falhas, com "Tentar de novo". |

As regras e a formatação ficam em `review-order.view.ts`
(`reviewAvailability`, `reviewErrors`, `reviewSummary`), funções puras com
testes. Os componentes `app-rating` e `app-review-tag-chip`, usados só por
esta tela e com cores fixas, saíram.

### Reportar problema (web)

O cliente ou o prestador abre um caso (disputa) sobre o pedido, em
`/orders/:id/report-problem` (título "Reportar problema"), fora do shell
logado, na mesma moldura de Detalhes do pedido (link "Voltar ao pedido",
fundo `--tg-bg-canvas`, coluna de até 720px). Story: **Telas/Reportar
problema**. Endpoints: `GET` e `POST /orders/:id/disputes` (os de antes) e
`GET /orders/:id` (via `Order.getOrderDetails`), para saber se o pedido
aceita um caso novo.

Decisões: (1) cabeçalho com "Pedido #id · serviço", o `h1` e o texto de
antes (a confirmação fica bloqueada enquanto o caso estiver aberto; abrir um
caso não pede reembolso); (2) formulário num `tg-card` com `tg-field`
"Motivo" e "O que aconteceu?" (textarea com contador), "Enviar para
análise" e "Cancelar"; (3) casos do pedido em "Problemas reportados", um
`tg-card` por caso com motivo, "Caso #id · aberto por você / pelo cliente /
pelo prestador em data", `tg-badge` (Aberto, Em análise, Resolvido,
Encerrado), descrição e "Resposta da equipe".

Regras (de `apps/backend/src/modules/order/order-disputes.controller.ts`):

- Quem: o cliente ou o prestador do pedido; de outra pessoa ou inexistente,
  a API responde 404 e a tela mostra "Este pedido não foi encontrado".
- Quando: só em `EM_ANDAMENTO` e `AGUARDANDO_CONFIRMACAO_CLIENTE`. Nos
  outros status, sem formulário: `tg-empty-state` com o motivo (ainda não
  começou, já concluído, já em disputa, cancelado/recusado) e "Falar com o
  suporte".
- Um caso aberto por vez: com um caso `OPEN` ou `UNDER_REVIEW`, a tela
  troca o formulário por um `tg-alert` informativo "Já existe um problema em
  análise neste pedido", com "Falar com o suporte". A API também devolve o
  caso aberto em vez de criar outro.
- Limites do `OpenDisputeDto`: motivo de 3 a 120 caracteres, descrição de
  10 a 2.000 (`maxlength` nos campos). A validação roda ao enviar, sobre o
  texto sem espaços nas pontas, que é o que a tela envia; o erro aparece
  abaixo do campo.
- Enviando: um envio por vez, botão com `loading` e campos desabilitados.
  Deu certo: `tg-alert` de sucesso "Problema enviado" na página (a
  `tg-toast-region` não está montada no app), o caso entra na lista e os
  casos são recarregados sem skeleton. Falhou: `tg-alert` de erro "Não foi
  possível enviar o problema" com a mensagem da API (a lista `message` do
  filtro de exceções) ou "Verifique sua conexão e tente de novo.", e o
  formulário fica preenchido.
- Carregando: skeleton do cabeçalho e do formulário. Falha do pedido ou
  dos casos: `tg-alert` de erro com "Tentar de novo" (sem formulário, já que
  não dá para saber se há caso aberto).
- Datas com `Intl.DateTimeFormat` no fuso `America/Sao_Paulo`.

Fica para depois: o link "Reportar problema" em Detalhes do pedido só
aparece para o cliente em `AGUARDANDO_CONFIRMACAO_CLIENTE`; a API também
aceita o prestador e o status `EM_ANDAMENTO`.

### Perfil do profissional (web)

`modules/customer/provider-profile`, rotas `customer/profile/:userId` (o
cliente, aberto por "Ver Perfil Completo" na tela de agendamento) e
`provider/profile/:userId` (`data.preview`: o prestador vê a prévia do
próprio perfil a partir de "Minha conta"). Busca `GET /provider/:id`; o id do
Provider é o mesmo do usuário (1:1, mesma chave). Story: **Telas/Perfil do
profissional** (perfil completo, sem avaliações, sem serviços ativos, visto
pelo próprio prestador, prévia ainda não pública, não encontrado, carregando
e com falha da API).

Decisões: (1) uma coluna, com o resumo no topo e "Agendar serviço" dentro
dele (ao lado do nome a partir de 600 px; largura total no celular), que leva
à tela de agendamento (`/customer/:id`) como antes; (2) só dados reais: sem
apresentação, nota ou contato, a parte some; (3) a tela mostra o preço base
de cada serviço, que a API já manda.

| Parte | Componente | Regra |
| --- | --- | --- |
| Voltar | link com `arrow-left` | Cliente: "Voltar para profissionais" (`/customer`). Prévia: "Voltar para minha conta". |
| Prévia | `tg-alert` informativo | "Prévia do seu perfil público"; sem "Agendar serviço". |
| Resumo | `tg-card` | Foto ou iniciais (72 px; 96 px a partir de 600 px), sobretítulo, `h1` com o nome, `tg-badge` "Verificado" com `check`, nota com estrela ("Nota 4,8 de 5, 37 avaliações" para leitor de tela) ou `tg-badge` accent "Novo no TaskGo" (mesma regra do card de prestador), "No TaskGo desde novembro de 2025" e a apresentação. Telefone, e-mail e região só se a API mandar (hoje não manda). |
| Serviços oferecidos | `tg-card` com lista | Ativos, em ordem alfabética, com descrição e "a partir de R$ 120" (sem centavos quando inteiro) ou "Preço sob consulta". Vazio: `tg-empty-state` compacto "Nenhum serviço ativo". |
| Avaliações | `tg-card` com lista | Cinco estrelas (`role="img"`, "Nota 4 de 5"), data no horário de São Paulo e comentário ou "Sem comentário.". A API não manda o autor, então ele não aparece. A API traz as 20 mais recentes: com mais avaliações que isso, "Mostrando as N avaliações mais recentes.". Vazio: `tg-empty-state` compacto "Ainda sem avaliações". |
| Carregando | `tg-loading` com skeleton do resumo e de uma seção | |
| Não encontrado | `tg-alert` | A API devolve vazio para prestador inexistente, não aprovado ou sem serviço ativo; 404 e 400 (id inválido) também. Cliente: perigo, "Este profissional não foi encontrado", com "Buscar profissionais". Prévia: atenção, "Seu perfil ainda não aparece para os clientes", com "Ver meus serviços". Sem "Tentar de novo". |
| Erro | `tg-alert` de perigo com "Tentar de novo" | Outras falhas; recarrega só o perfil. |

A formatação fica em `provider-profile.view.ts` (`providerProfileView`),
função pura com testes próprios, que reaproveita o `toTgProvider` do card de
prestador para id, nome, foto, verificado, nota e contagem.

### Institucionais (web)

Os documentos públicos, em `/institutional/terms` (Termos de uso),
`/institutional/privacy` (Privacidade), `/institutional/security`
(Segurança) e `/institutional/code-of-conduct` (Código de conduta);
`/institutional` abre os termos. Ficam fora do shell logado, em
`app-institutional-page`. Story: **Telas/Institucionais**. Sem API.

Decisões: (1) a mesma barra do topo (`tg-app-bar`) e o mesmo rodapé
(`app-footer`) do app, sem destinos nem menu da conta; (2) visitante vê
"Entrar" (`/authenticate`); logado vê "Voltar ao app", para a home do modo,
e o tema do seu modo (profissional escuro); (3) navegação entre os quatro
documentos: lista ao lado do texto a partir de 1024 px, duas colunas de
pílulas abaixo, com o atual em `action-subtle` e `aria-current="page"`.

Regras:

- O texto de cada documento é uma lista de seções (`InstitutionalSection`:
  `id`, `title`, parágrafos e listas) na própria página, como o jurídico
  aprovar, sem edição. Cada seção é um `h2` com âncora; um único `h1` por
  página.
- Leitura longa: coluna de até 68ch, corpo em `body-lg`, títulos em
  `title-2`, linha de apoio em `text-secondary`.
- A partir de três seções, sumário "Nesta página" com um link por seção.
  O clique rola até a seção e leva o foco ao título, sem trocar a rota (o
  router do app não liga o `anchorScrolling`); `scroll-margin-top` livra a
  barra fixa.
- Sem texto publicado: `tg-empty-state` "Texto ainda não publicado". Hoje
  os quatro documentos estão assim (não há texto jurídico no repositório).
- As rotas antigas `about`, `faq` e `support` (rodapé e 404) seguem como
  estavam.
- 360 px sem rolagem horizontal.

### Página não encontrada (web)

A página 404 da rota curinga (`**`, título "Página não encontrada"), dentro
de `app-page` (topo e rodapé do app). Vale para visitante, cliente e
prestador; o tema segue o modo de quem está na sessão (visitante e cliente,
claro; prestador, escuro). O `tg-empty-state` aceita `level="1"`, uma
`illustrationSrc` opcional com `illustrationAlt` e até duas ações: marque a
principal com `tgEmptyAction` e a secundária com `tgEmptySecondaryAction`.
Story: **Componentes/Estado vazio — Tela com ilustração e duas ações**. Sem
chamadas de API.

Decisões aprovadas: (1) o `tg-empty-state` grande centralizado, com título,
texto curto e duas ações; (2) a ilustração existente
(`/ilustrations/not-found-ilustration.webp`, decorativa, `alt=""`) acima do
título, até 420 px; (3) "Erro 404" como linha de apoio
acima do `h1` "Página não encontrada"; (4) ação principal "Ir para o início"
e, de contorno, "Voltar"; (5) uma linha "Precisa de ajuda? Fale com o
suporte". Os atalhos antigos (buscar, agendamentos, favoritos, para
prestadores) saíram: eram só do cliente e mandavam visitante e prestador para
telas que eles não abrem.

| Estado | Como aparece | Regras |
| --- | --- | --- |
| Visitante | Topo sem navegação | "Ir para o início" leva a `/authenticate` (a entrada). |
| Cliente logado | Topo com a navegação do cliente, tema claro | "Ir para o início" leva a `/customer`. |
| Prestador logado | Topo com a navegação do prestador, tema escuro | "Ir para o início" leva a `/provider`. |

Regras:

- O início segue a regra do `userLoggedGuard`: com token e tipo de usuário
  (`CLIENTE`/`PRESTADOR` ou `CUSTOMER`/`PROVIDER`), `Utils.getRouteByRoleBack`;
  sem token, a sessão conta como visitante.
- "Voltar" volta para a tela anterior do app (`Location.back()`) quando houve
  navegação antes; aberta direto pelo endereço, vai ao início, para não sair
  do app.
- Abaixo de 480 px, as ações ocupam a largura, a principal em cima; sem
  rolagem horizontal em 360 px.
- Acessibilidade: um único `h1`, ilustração decorativa, ações com texto
  visível, foco visível no link de suporte.

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

## Orçamento de estilos do frontend

O build de produção avisa quando o SCSS de um componente passa de 9 kB e falha
acima de 12 kB. O aviso fica acima dos arquivos maiores já usados pelo Design
System, enquanto o limite de erro evita que uma folha de componente cresça sem
controle.
