/* ============================================================
   CONFIGURAÇÃO DA AMIGOAPI
   Ajuste aqui a URL base e o token antes de usar em produção.
   ============================================================ */

const AMIGO_CONFIG = {
  // Troque pelo server desejado (veja o dropdown "Servers" no Swagger):
  // - http://localhost:3000
  // - https://dev-amigobot-api.amigo.dev.br/
  // - https://amigobot-api.amigoapp.com.br/
  // - https://grn-amigobot-api.amigo.dev.br/
  baseUrl: "https://amigobot-api.amigoapp.com.br/",

  // Token de autenticação da AmigoAPI.
  token: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJjb21wYW55X2lkIjoxMjMzMDQsInVzZXJfaWQiOjExMzIyfQ.1worb6ha5IzdNL327WRtZrl_BVkN_2c6aLKOi1PPlPU",

  // Esquema de autenticação: assumimos "Bearer" (header Authorization).
  // Se a API usar outro esquema (ex: x-api-key), ajuste em js/api.js,
  // na função authHeaders().
  authScheme: "Bearer"
};
