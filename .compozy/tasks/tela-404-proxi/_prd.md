# PRD: Tela 404 Proxi

## Overview

A aplicação precisa de uma tela 404 mais acolhedora e útil, alinhada ao exemplo visual fornecido. A página deve explicar que o endereço não foi encontrado, oferecer retorno para a página inicial e sugerir caminhos comuns para o usuário continuar navegando.

## Goals

- Comunicar o erro 404 com clareza.
- Manter identidade visual do Proxi com destaque em roxo e ilustração existente.
- Oferecer ações rápidas para home, busca de serviços, favoritos, agenda e prestadores.
- Funcionar bem em desktop e mobile.

## User Stories

- Como usuário, quero entender rapidamente que a página não existe para não ficar perdido.
- Como usuário, quero voltar para um caminho seguro com um clique.
- Como usuário, quero encontrar atalhos úteis relacionados ao que eu provavelmente procurava.

## Requirements

- A tela deve reutilizar o shell `app-page`.
- A tela deve reutilizar a ilustração `not-found-ilustration.webp`.
- A ação principal deve levar para `/customer`.
- Deve existir um link secundário para `/customer/search`.
- Deve existir uma seção com atalhos de navegação inspirada no mock.
- Deve existir um bloco de ajuda/suporte visual no final da página.
- O layout deve ser responsivo, com hero em duas colunas no desktop e empilhado no mobile.

## Non-Goals

- Criar novo header global.
- Alterar rotas protegidas, guards ou autenticação.
- Criar nova ilustração ou asset.

## Success Criteria

- A página 404 fica visualmente próxima ao exemplo.
- Os textos principais aparecem na tela.
- Os atalhos renderizam com ícones e links.
- O componente continua instanciando nos testes.
