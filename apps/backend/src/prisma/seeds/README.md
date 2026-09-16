# Seeds para busca de profissionais

Execute a partir de `apps/backend`, com `DATABASE_URL` apontando para o banco de desenvolvimento:

```sh
ALLOW_DEMO_SEED=true npm run prisma:seed
```

A execução substitui usuários `@teste.com` e seus pedidos, como na seed anterior.
Não executar em banco com dados de teste que precisem ser preservados. Produção é bloqueada.

## Dados determinísticos

- 20 clientes (`cliente1@teste.com` até `cliente20@teste.com`), com Casa padrão e Trabalho na localização seguinte da lista (circular).
- 30 prestadores (`prestador1@teste.com` até `prestador30@teste.com`), dois serviços cada.
- Senha de todas essas contas: `123456`. Os dois pedidos do fluxo do prestador1 continuam disponíveis.
- Dez categorias do catálogo, preços de R$ 60 a R$ 425, combinações diferentes de Pix, cartão, emergência, 24h e verificação.
- Prestadores 2–5 têm avaliações e agregados correspondentes; os demais não têm avaliações.
- Localizações e perfis estão exportados em `search-fixtures.ts` para reutilização futura. IDs do banco mudam ao executar novamente: localizar fixtures por email, e serviços por prestador + título.
- Endereços são sintéticos e coordenadas aproximadas. Especialidades ficam no título/descrição; o modelo Service guarda somente o slug da categoria, sem relação com subcategoria.

## Matriz para os próximos e2e

| Contas                     | Localização / propósito                                                                      |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| Clientes/prestadores 1–10  | Dez bairros de São Bernardo do Campo; categorias na ordem de SPECIALTIES                     |
| Clientes/prestadores 11–19 | Sé, Pinheiros, Santo André, São Caetano, Guarulhos, Campinas, Rio, Belo Horizonte e Curitiba |
| Cliente 20                 | Manaus, sem prestador com cobertura (resultado vazio)                                        |
| Prestador 20               | Sé, tecnologia e consultoria                                                                 |
| Prestadores 21, 22, 23     | Centro de SBC, respectivamente PENDING, REJECTED e BLOCKED; não devem aparecer               |
| Prestador 24               | Aprovado, mas só serviços INATIVO; não deve aparecer                                         |
| Prestador 25               | Aprovado com serviços ativos, área inativa; não deve aparecer                                |
| Prestador 26               | Aprovado com serviços ativos, sem área; não deve aparecer                                    |
| Prestador 27               | Reparo com duas áreas ativas: Centro de SBC e Campinas, raio de 5 km cada                    |
| Prestador 28               | Reparo com um serviço ativo e outro inativo; só o ativo deve ser exposto                     |
| Prestadores 29–30          | Reparo no Centro de SBC, 5 km, com diferenças nos atributos do perfil                        |

Prestadores 1–20 são aprovados e têm raios de 3, 8, 15 e 30 km (ciclo nessa ordem).
No Centro de SBC, prestador1 (3 km) deve aparecer; em Campinas não deve aparecer.
Prestador27 deve aparecer nos dois pontos, uma única vez por resultado.
Cliente1 pode alternar Casa (Centro) / Trabalho (Rudge Ramos) para testar atualização da busca.
Para fronteiras, derivar pontos a 4,9 e 5,1 km do Centro de SBC e conferir inclusão/exclusão de prestador29 (raio 5 km), evitando igualdade sujeita a arredondamento.

Combinar coordenadas com `reparo`, uma categoria diferente e uma inexistente. Sem coordenadas, a busca considera existência de área válida, sem restringir cidade. A restrição do banco mantém verificação e aprovação sincronizadas: aprovados são verificados; pendentes, rejeitados e bloqueados não são verificados.
Esses dados preparam os cenários; a execução dos e2e ainda é necessária para comprovar o comportamento da busca.
