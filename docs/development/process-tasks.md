# Implantação dos processos de desenvolvimento

As 16 tasks foram distribuídas em branches `codex/process-task-01` a `codex/process-task-16`, cada uma com um worktree Git em `/private/tmp/taskgo-development-process/task-NN`. Até três agentes trabalharam em paralelo, com integração coordenada neste checkout. Worktrees dependentes receberam os arquivos necessários das tasks anteriores.

Os arquivos estão em revisão local, sem commits ou publicação. As branches ainda apontam para a base original; consulte os arquivos modificados de cada worktree. O checkout principal reúne a versão integrada, incluindo ajustes de revisão. Os diretórios temporários devem ser preservados até a revisão ou substituídos por armazenamento durável.

| Task | Entrega                                             | Situação                                                                    |
| ---- | --------------------------------------------------- | --------------------------------------------------------------------------- |
| 01   | README e versão Node                                | Preparada; revisão local                                                    |
| 02   | Exemplos de ambiente e `.gitignore`                 | Preparada; configurações já rastreadas continuam rastreadas                 |
| 03   | [Instalação e execução](setup.md)                   | Preparada; revisão local                                                    |
| 04   | [Validação de onboarding](onboarding-validation.md) | Validação em andamento                                                      |
| 05   | [Fluxo de contribuição](../../CONTRIBUTING.md)      | Preparada; revisão local                                                    |
| 06   | [Convenções](conventions.md)                        | Preparada; revisão local                                                    |
| 07   | Template de tarefa GitHub                           | Preparado; uso remoto pendente                                              |
| 08   | Template de pull request                            | Preparado; uso remoto pendente                                              |
| 09   | [Quadro local](board.md) e instruções de Project    | Quadro remoto pendente de acesso autenticado                                |
| 10   | [Auditoria de qualidade](quality-baseline.md)       | Validação em andamento                                                      |
| 11   | Correções dos bloqueios encontrados                 | Implementação e validação em andamento                                      |
| 12   | CI de pull requests                                 | Workflow preparado e revisado; execução no GitHub pendente                  |
| 13   | [Proteção da branch](branch-protection.md)          | Proposta preparada; ativação depende de CI remoto e administração do GitHub |
| 14   | [Definição de pronto](definition-of-done.md)        | Preparada; revisão local                                                    |
| 15   | [Publicação](../operations/deploy.md)               | Procedimento inicial; comandos do provedor e ensaio pendentes               |
| 16   | [Recuperação](../operations/rollback.md)            | Procedimento inicial; comandos do provedor e ensaio pendentes               |

## Dependências para encerramento

- Tasks 01–03 precedem a validação limpa da task 04.
- Tasks 10–11 precedem a validação do CI na task 12.
- Task 13 exige checks conhecidos de uma execução real da task 12.
- Tasks 09 e 13 precisam de acesso autenticado ao GitHub. Nesta sessão não há `gh`, configuração de login do CLI ou token GitHub no ambiente.
- Tasks 15–16 precisam do provedor, mecanismo de entrega, ambiente de homologação e procedimento de backup. Nenhuma publicação ou restauração foi executada.

A existência de documentos ou de um workflow local não comprova configuração remota nem operação em produção.

Evidências da integração: [relatório de verificação](verification-report.md).
