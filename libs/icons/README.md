# icons

Ícones Phosphor (MIT) usados pelo TaskGo, nos pesos `regular` (padrão) e `fill`
(item ativo da navegação). Só os ícones listados em `scripts/generate.mjs`
entram no build; o pacote `@phosphor-icons/core` é dependência de
desenvolvimento e não vai para o bundle.

Para adicionar um ícone, inclua o nome do Phosphor na lista e rode
`npx nx run icons:generate`. No web, use `<tg-icon name="arrow-right" />`.
