# Skills de produto

Skills do Claude Code para apoiar decisões de produto do TaskGo (Proxi). O Claude carrega a skill certa sozinho quando o assunto aparece, ou você chama direto com `/nome-da-skill`.

Todas foram copiadas sem alteração dos repositórios de origem e revisadas antes de entrar (sem scripts, sem instruções escondidas, só texto de referência e links para as fontes).

## Descoberta e priorização

| Skill | Quando usar |
|---|---|
| `opportunity-solution-tree` | Ligar um resultado (ex.: pedidos concluídos) a problemas reais, soluções e experimentos |
| `identify-assumptions-existing` | Estressar uma ideia de feature antes de construir (ex.: reels, favoritos) |
| `prioritize-features` | Ranquear o backlog (`todo.txt`) por impacto, esforço e risco |
| `prioritization-frameworks` | Referência de RICE, ICE, Opportunity Score, Kano |
| `interview-script` | Roteiro de entrevista com prestadores e clientes (The Mom Test) |
| `summarize-interview` | Resumir a transcrição de uma entrevista |
| `customer-journey-map` | Mapear a jornada busca → agendamento → pagamento → avaliação |

## Métricas

| Skill | Quando usar |
|---|---|
| `north-star-metric` | Definir a métrica norte e as métricas de entrada |
| `metrics-dashboard` | Desenhar o painel de métricas (ex.: no PostHog) |
| `measuring-pmf` | Avaliar se há product-market fit (retenção, Sean Ellis) |
| `user-onboarding-activation` | Definir o momento de ativação e melhorar o primeiro uso |

## Marketplace

| Skill | Quando usar |
|---|---|
| `marketplace-fundamentals` | Cold start, confiança, densidade, vazamento para fora da plataforma |
| `supply-demand-balance` | Descobrir se o gargalo é prestador ou cliente |
| `marketplace-liquidity-take-rates` | Fill rate, tempo até o match e definição da taxa da plataforma |

## Especificação e lançamento

| Skill | Quando usar |
|---|---|
| `create-prd` | Escrever o PRD de uma feature antes de codar |
| `pre-mortem` | Levantar riscos antes de um lançamento (ex.: soft launch) |

## Origem

| Repositório | Commit | Licença |
|---|---|---|
| [phuryn/pm-skills](https://github.com/phuryn/pm-skills) | `8607e3b` | MIT, ver `_licenses/pm-skills-LICENSE` |
| [RefoundAI/lenny-skills](https://github.com/RefoundAI/lenny-skills) | `13598cc` | MIT, ver `_licenses/lenny-skills-LICENSE` |

As skills do Lenny trazem uma pasta `references/` com citações e frameworks do podcast e da newsletter. O Claude só lê esses arquivos quando precisa aprofundar.

O [Superpowers](https://github.com/obra/superpowers) ficou de fora deste diretório. As skills dele dependem umas das outras e de scripts, e são feitas para serem instaladas como plugin: `/plugin install superpowers@claude-plugins-official`.
