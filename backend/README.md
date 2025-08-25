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
