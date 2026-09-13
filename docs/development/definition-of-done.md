# Definição de tarefa pronta

Antes de concluir uma tarefa, confira os itens aplicáveis e registre as evidências
no PR. Marque itens sem aplicação como “não se aplica”, com uma explicação curta
quando necessário.

- [ ] Os critérios de aceite foram conferidos com exemplos observáveis.
- [ ] A mudança tem escopo coerente e o diff passou por autorrevisão.
- [ ] As verificações aplicáveis de lint, testes e build passaram; os comandos e
      resultados estão no PR e os checks obrigatórios estão aprovados.
- [ ] Os testes cobrem o comportamento alterado proporcionalmente ao risco.
      Correções de regressão incluem reprodução e teste quando viável; uma
      alteração apenas documental pode ser validada por revisão e links.
- [ ] Documentação, exemplos de ambiente e contratos foram atualizados quando
      afetados. Nenhum segredo ou dado real de usuário foi adicionado.
- [ ] Mudanças de banco incluem migration e um procedimento de aplicação e
      recuperação que considera compatibilidade e preservação dos dados.
- [ ] Impactos de publicação e verificações após o deploy foram descritos quando
      a mudança exigir cuidados operacionais.
- [ ] Comentários de revisão foram resolvidos. Enquanto houver um único
      mantenedor, autorrevisão basta; com outro dev ativo, siga a revisão combinada.
- [ ] O PR foi integrado e a tarefa foi atualizada no quadro.

Uma limitação de validação deve ficar explícita e ser resolvida antes de declarar
cumprido o critério afetado. Se a tarefa inclui publicação, ela também depende da
validação do ambiente publicado; integrar o PR sozinho não encerra esse escopo.
