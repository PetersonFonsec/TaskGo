# Publicação do TaskGo

## Estado atual

Este é um procedimento inicial para preparar uma publicação. O repositório não identifica o provedor de produção, o mecanismo de entrega ou o domínio em uso. A publicação real e sua validação continuam pendentes dessas informações.

O `docker-compose.yml` atual habilita banco e observabilidade; os serviços backend e backoffice estão comentados. O Dockerfile do backend inicia o modo de desenvolvimento. Portanto, o Compose atual não constitui um procedimento de produção validado.

## Preparação da versão

1. Registre o commit a publicar, responsável, ambiente, aplicações afetadas e versão anterior.
2. Execute as verificações de qualidade documentadas em [qualidade](../development/quality-baseline.md) e confirme a execução de CI do mesmo commit.
3. Prepare os artefatos em ambiente isolado com as versões de Node/npm do projeto e `npm ci`. Gere o Prisma Client e execute o build das aplicações afetadas. Use os scripts do workspace; não reinstale dependências durante a troca de versão.
4. Revise variáveis, origens CORS, URLs de API, credenciais e acesso ao banco no ambiente de destino. Credenciais ficam no mecanismo de segredos do provedor.
5. Identifique migrations novas, sua compatibilidade com a versão anterior e o procedimento de recuperação. Faça backup verificável antes de alterações de banco.

## Execução no ambiente de destino

O responsável deve primeiro registrar abaixo o comando de entrega específico do provedor. Use artefatos identificados pelo commit, mantenha o artefato anterior disponível e publique inicialmente em homologação.

Para aplicar migrations versionadas, a partir da raiz do artefato com as ferramentas necessárias e `DATABASE_URL` do destino:

```sh
npm run prisma:deploy --workspace=apps/backend
```

Esse comando altera o banco. Execute uma vez por publicação, sob coordenação do responsável, após backup e análise de compatibilidade. `migrate dev` e `migrate reset` são comandos de desenvolvimento e não integram a publicação.

Promova o artefato validado ao destino e execute a verificação abaixo. Se houver falha, siga [recuperação](rollback.md).

## Verificação após publicação

- Backend: `GET /` deve responder `Hello World!`; isso confirma resposta HTTP, mas não valida banco ou integrações.
- Backoffice: `GET /health` deve responder HTTP 200 com `backoffice healthy`; isso verifica o Nginx, mas não a API.
- Execute login e uma consulta autenticada com dados de teste no ambiente permitido. Confirme comunicação entre frontend, backend e banco.
- Confira logs de inicialização, erros HTTP e falhas de conexão. Registre horário, URLs verificadas e resultado.

## Informações necessárias para concluir o procedimento

| Campo                                     | Valor    |
| ----------------------------------------- | -------- |
| Provedor e ambiente                       | Pendente |
| Domínios e URLs de saúde                  | Pendente |
| Comando de entrega/reinício               | Pendente |
| Local dos artefatos por commit            | Pendente |
| Mecanismo de backup e restauração testada | Pendente |
| Responsável pela publicação               | Pendente |

Nenhum deploy foi executado durante a criação deste documento.
