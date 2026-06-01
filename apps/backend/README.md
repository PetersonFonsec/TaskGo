# Lembretes importantes
lembrar de rodar as migras e o generate 

# Observações importantes

## Geolocalização
- Para conseguir converter o CEP em latitude e longitude em contrei uma api gratuita
https://brasilapi.com.br/docs#tag/CEP-V2 porem nos meus testes vi que alguns ceps não vem com a latitude e longitude
uma opção que tem algumas reqs gratuitas porem pode cobrar depois de algumas tentativas é a https://docs.awesomeapi.com.br/
fora essa tem a do google maps que cobra por demanda https://developers.google.com/maps/documentation/geocoding/get-api-key?hl=pt-br&setupProd=prerequisites
o que eu estou pensando em fazer é criar uma lib apenas para lidar com isso, a regra da lib vai ser 

Nesse primeiro momento, o plano é:
1° tenta na api https://brasilapi.com.br/docs#tag/CEP-V2 não encontrou a latitude e longitude 
2° tenta na https://docs.awesomeapi.com.br/ não encontrou a latitude e longitude
3° retorna um 404 para o front e solicita a permissao do usuario para pegar a localização atual dele se ele negar podemos ou chamar a api do google ou impedir que ele use o app
## Favorites API (planned MVP behavior)
The project will expose a simple favorites API for authenticated clients with the following routes:

- `POST /clients/{clientId}/favorites`
  - Body: `{ "providerId": <providerId> }`
  - Creates a saved favorite for the current client.
  - Should be idempotent for repeated calls with the same `providerId`.
  - Expected responses: `201 Created` for new favorites, `200` or `409` for existing favorites.

- `DELETE /clients/{clientId}/favorites/{providerId}`
  - Removes the saved favorite for the authenticated client.
  - Expected response: `204 No Content` when successful.

- `GET /clients/{clientId}/favorites`
  - Returns the current client's saved providers with pagination.
  - Query: `?limit=&offset=&sort=`.
  - Response shape should include provider identifiers and summary fields needed by the UI.

- Existing provider search/listing endpoints should support:
  - `onlyFavorites=true`
  - When present, search results are restricted to providers favorited by the authenticated client.

### Feature gating
The backend should respect a `favorites_mvp` feature flag during rollout. UI and API behavior for favorite controls, Favorites view, and `onlyFavorites` filtering must only be enabled when the flag is active.

### Notes
This documentation reflects the current MVP plan for the favorites feature and is intended for internal API and product tracking. It should be updated once the implementation is available in source code.