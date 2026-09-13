# Proteção da branch principal

Status: proposta local; nenhuma regra remota foi alterada. Requer acesso administrativo autenticado e disponibilidade no plano do repositório.

O [payload de referência](../../.github/branch-protection.json) descreve a proposta para `main`, com o check `Quality` declarado no workflow. Ele não é aplicado automaticamente: compare com as regras existentes e confirme o nome exibido na execução real antes de utilizá-lo.

## Ativação

1. Publique o workflow de CI e obtenha uma execução real em um PR de validação. Confira os nomes exatos dos checks no GitHub.
2. Consulte as regras atuais de `main` em **Settings → Rules → Rulesets** ou **Branches**. Preserve restrições existentes que sejam mais fortes.
3. Exija pull request para integrar em `main`, resolução das conversas e os checks obrigatórios do CI. Use os nomes observados na execução, sem adivinhar ou selecionar checks inexistentes.
4. Bloqueie force pushes e exclusão da branch. Aplique também a administradores quando a configuração permitir.
5. Enquanto houver apenas um desenvolvedor, mantenha zero aprovações obrigatórias. Com um segundo revisor ativo, exija uma aprovação e invalide aprovações após novas alterações.
6. Valide em um PR que uma falha de CI bloqueia o merge e que uma execução aprovada permite o fluxo esperado. Não provoque uma falha diretamente em `main`.

## Evidência a registrar

- URL do PR com execução real do CI;
- nomes dos checks obrigatórios;
- regra/ruleset ativado, data e responsável;
- confirmação do bloqueio de merge com check reprovado.

A publicação e a ativação estão pendentes; a existência deste documento não protege a branch. O CLI `gh` não estava disponível no ambiente da implementação.

Referência: [proteção de branches e requisitos de acesso](https://docs.github.com/en/rest/branches/branch-protection).
