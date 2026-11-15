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
| 7 | Componentes base: campo de texto (web) | Concluído (PR #13) |
| 7 | Componentes base: card (web) | Concluído (PR #14) |
| 7 | Componentes base: badge de status (web) | Concluído (PR #15) |
| 7 | Componentes base: navegação (web) | Concluído (PR #16) |
| 7 | Componentes base: abas (web) | Concluído (PR #17) |
| 7 | Componentes base: diálogo e painel (web) | Este PR |
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
  <app-notification />
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
- O botão de notificações é da tela; o nome inclui a contagem, como
  "Notificações, 2 novas".

No app, a navegação é `ion-tabs` com `ion-tab-bar slot="bottom"`, os mesmos
destinos e os ícones Phosphor, estilizada pelos tokens na migração da home.
O `app-header` do web (que ainda mostra a marca antiga "Proxi") e o
`app-profile-header` (com nome e foto fixos no código) convivem com estes
componentes até a migração do shell autenticado.

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
