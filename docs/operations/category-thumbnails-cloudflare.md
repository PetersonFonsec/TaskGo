# Thumbnails de categorias no Cloudflare Images

Configure no backend e reinicie o serviço:

```dotenv
CLOUDFLARE_IMAGES_ACCOUNT_ID=020e6063e3ac9ce4a76b09dbaa7705ec
CLOUDFLARE_IMAGES_ACCOUNT_HASH=Bpbv9d8J9NqFhm--zUdxEA
CLOUDFLARE_IMAGES_VARIANT=public
CLOUDFLARE_IMAGES_API_TOKEN=<token privado>
```

O token precisa de permissão de escrita no Cloudflare Images da conta indicada. A variante `public` deve existir e permitir entrega pública. Conta, hash e variante acima são os padrões da integração. `CDN_API_TOKEN` é aceito como alternativa. Nunca configure o token no frontend nem o versione.

Como administrador, abra Categorias, crie ou edite uma categoria e selecione um arquivo em **Enviar thumbnail**. Formatos: JPEG, PNG, WebP ou GIF, até 10 MB. Após o envio e a prévia, clique em **Salvar** para associar a URL à categoria.

`POST /admin/categories/images` recebe multipart no campo `file`, exige sessão administrativa com `catalog:manage`, envia ao Cloudflare e retorna `imageId` e `thumb`. O backend verifica a URL da variante retornada. O token nunca vai ao navegador.

URLs já cadastradas continuam funcionando; não há migração em lote de imagens antigas. Arquivos enviados permanecem no Cloudflare se a edição for cancelada ou a thumbnail for substituída. Não há exclusão automática de imagens, que podem estar sendo reutilizadas.

Validação real após configurar o token: enviar uma imagem, salvar a categoria, recarregar a lista e verificar a exibição no aplicativo. Os testes automatizados simulam as respostas do Cloudflare.

Referência: https://developers.cloudflare.com/api/resources/images/subresources/v1/methods/create/
