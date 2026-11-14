# design-tokens

Tokens do Design System TaskGo em SCSS, emitidos como custom properties `--tg-*`.
Documentação completa em [`docs/design-system`](../../docs/design-system/README.md).

| Arquivo | Conteúdo |
| --- | --- |
| `_taskgo-tokens.scss` | Ponto de entrada (`@use 'taskgo-tokens'`) |
| `_primitives.scss` | Paleta crua |
| `_semantic.scss` | Tokens de uso, modo cliente e `[data-theme='PROVIDER']` |
| `_typography.scss` | Famílias, pesos, escala e o mixin `tg-type-scale-app` |
| `_layout.scss` | Espaço, raios, controles, elevação, movimento e `tg-from()` |
| `_tg-ionic.scss` | Mixin `tg-ionic-theme`, ainda não aplicado |

Uma fase posterior pode gerar estes arquivos a partir de JSON no formato DTCG,
para sincronizar com o Figma.
