# Como contribuir

Comece pelo [ambiente de desenvolvimento](docs/development/setup.md). Consulte as
[convenções](docs/development/conventions.md) e a
[definição de tarefa pronta](docs/development/definition-of-done.md).

## Fluxo de uma mudança

1. Abra uma tarefa com problema, resultado esperado e critérios de aceite. Para
   uma correção pequena, uma descrição curta é suficiente.
2. Atualize a branch principal do remoto e crie uma branch de curta duração:
   `feat/agendamento`, `fix/login` ou `docs/onboarding`. Use como base a branch
   padrão configurada no repositório.
3. Implemente uma mudança coerente por PR. Atualize os testes e a documentação
   quando o comportamento exigir; evite misturar refatorações independentes.
4. Execute as verificações aplicáveis e registre os comandos e resultados no PR.
   Siga os [comandos de verificação](docs/development/setup.md#verificações),
   incluindo o banco isolado exigido pelos testes do backend. Confirme os targets
   de cada aplicação antes de concluir que ela foi coberta.
5. Abra um PR para a branch principal, vincule a tarefa e preencha o template.
   Faça autorrevisão do diff e aguarde os checks obrigatórios.
6. Resolva os comentários e integre o PR. Encerre a tarefa quando seus critérios
   estiverem atendidos e remova a branch de trabalho quando não for mais usada.

Enquanto houver apenas um mantenedor, a autorrevisão é suficiente. Quando houver
outro desenvolvedor ativo, combine a exigência de uma revisão de outra pessoa e
ajuste a proteção da branch. Nunca dependa de uma aprovação que ninguém possa dar.

## Revisão e escopo

Explique o motivo da alteração, como reproduzir o resultado e eventuais impactos
em contratos, configuração ou dados. Para alterações visuais, anexe evidência
visual quando ajudar a revisão. Registre limitações de validação explicitamente.

PRDs e especificações em `.compozy/tasks/` são úteis para mudanças complexas;
não são pré-requisito para toda correção. Não inclua credenciais, dados reais de
usuários ou arquivos locais de ambiente em commits, issues e logs do PR.
