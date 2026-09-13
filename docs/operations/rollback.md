# Recuperação de uma publicação

Este procedimento complementa [publicação](deploy.md). O provedor e o mecanismo de backup não estão definidos no repositório; os comandos específicos e um ensaio em homologação ainda precisam ser registrados. Nenhuma restauração foi executada nesta implementação.

## Quando iniciar

Inicie a recuperação se a nova versão impedir login, quebrar um fluxo essencial, apresentar falhas persistentes de API ou não iniciar. Registre o incidente, o commit atual, a última versão saudável e o horário. Interrompa novas publicações até estabilizar o serviço.

## Aplicação sem mudança incompatível no banco

1. Confirme que a versão anterior funciona com o schema atual.
2. Reative o artefato anterior usando o mecanismo do provedor; preserve as configurações compatíveis e reinicie os serviços afetados.
3. Repita as verificações HTTP e o fluxo autenticado descritos no procedimento de publicação.
4. Confira logs e registre a versão restaurada e o resultado. Abra uma tarefa com o problema antes de tentar publicar novamente.

## Publicação que alterou o banco

Reverter código não reverte migrations. O `prisma migrate deploy` aplica migrations pendentes; não é uma ferramenta automática de downgrade.

- Se a migration for compatível com a versão anterior, mantenha o schema e retorne apenas o artefato da aplicação.
- Se não for compatível, avalie uma correção progressiva revisada em homologação. Não remova migrations já aplicadas para simular a reversão.
- Se a restauração de backup for necessária, interrompa escritas, preserve uma cópia do estado atual e identifique os dados criados após o backup. Combine explicitamente a perda de dados aceitável com o responsável antes de restaurar.
- Restaure primeiro em ambiente isolado, valide integridade e compatibilidade e somente então execute o procedimento aprovado no destino. Reabra escritas após validar a aplicação.

## Ensaio e evidências

Em homologação, publique uma versão conhecida, promova uma segunda versão e retorne à primeira. Registre os comandos do provedor, duração, verificações e eventuais perdas de dados. Teste também a restauração de backup em banco isolado.

A task só pode ser considerada operacionalmente validada quando houver artefato anterior recuperável, backup restaurado em ensaio e evidência dos testes acima.
