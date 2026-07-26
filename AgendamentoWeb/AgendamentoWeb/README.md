# Agendamento — App Web (HTML + CSS + JavaScript)

App web para clientes fazerem agendamento de consultas, integrado à **AmigoAPI**.
Não precisa de Android Studio, Gradle, nem instalação — roda direto no navegador.

## Como rodar

**Mais simples (testar rápido):**
Abra o arquivo `index.html` direto no navegador (duplo clique). Funciona para
testar a interface, mas chamadas à API podem ser bloqueadas pelo navegador
por causa de CORS quando aberto como `file://`.

**Recomendado (evita problemas de CORS):**
Suba um servidor local simples na pasta do projeto:

```bash
# Python já vem instalado na maioria dos sistemas
cd AgendamentoWeb
python3 -m http.server 8080
```

Depois acesse `http://localhost:8080` no navegador do computador ou do celular
(se estiverem na mesma rede Wi-Fi, use o IP do computador, ex:
`http://192.168.0.10:8080`).

**Para publicar de verdade**, é só subir essa pasta em qualquer hospedagem
estática: Vercel, Netlify, GitHub Pages, ou um servidor próprio (Nginx/Apache).

## Configuração obrigatória antes de usar

Abra `js/config.js` e ajuste:

```js
const AMIGO_CONFIG = {
  baseUrl: "https://amigobot-api.amigoapp.com.br/",
  token: "COLOQUE_SEU_TOKEN_AQUI",
  authScheme: "Bearer"
};
```

- **baseUrl**: escolha o server certo (veja o dropdown "Servers" do Swagger).
- **token**: seu token de autenticação.
- **authScheme**: assumi `Authorization: Bearer <token>`. Se a AmigoAPI usar
  outro esquema (ex: header `x-api-key`), ajuste a função `authHeaders()` em
  `js/api.js`.

> **Importante**: como é um app 100% front-end, o token fica visível no
> código-fonte que roda no navegador de qualquer pessoa. Para uso em produção
> com clientes reais, o ideal é ter um backend simples fazendo *proxy* das
> chamadas (o backend guarda o token; o app web só fala com o seu backend).
> Posso montar esse backend também, se você quiser.

## Logo

O app espera um arquivo `pad.png` **na raiz do projeto** (mesmo nível do
`index.html`) — é a logo usada na barra superior e na tela de splash. Como
eu não tenho o arquivo original, toda vez que eu gerar um novo zip você
precisa copiar o `pad.png` pra dentro da pasta de novo (ele não é apagado
se você só substituir os outros arquivos por cima da pasta antiga).

## Estrutura do projeto

```
AgendamentoWeb/
├── index.html              → shell do app (SPA)
├── css/
│   └── styles.css          → todo o visual (cores, tipografia, componentes)
├── js/
│   ├── config.js            → URL base + token da AmigoAPI
│   ├── api.js                → todas as chamadas fetch para a AmigoAPI
│   ├── state.js              → estado do fluxo (paciente, médico, data...)
│   ├── ui.js                  → helpers de renderização (header, loading, erro)
│   ├── app.js                 → roteador principal
│   └── screens/
│       ├── splash.js
│       ├── patientVerification.js
│       ├── patientRegistration.js
│       ├── specialtySelection.js
│       ├── doctorSelection.js
│       ├── dateTimeSelection.js
│       ├── confirmation.js
│       └── myAppointments.js
└── README.md
```

## Fluxo implementado

1. **Splash** → tela de abertura
2. **Verificação** (`GET /patients/exists`) → se existe, pula pro agendamento;
   se não, vai pro cadastro
3. **Cadastro completo** (`POST /patients`)
4. **Especialidade** (`GET /doctors/specialties`)
5. **Médico** (`GET /doctors/available`)
6. **Data** (`GET /doctors/{id}/available-dates`) **→ Horário** (`GET /calendar`)
7. **Confirmação** (`POST /attendances`)
8. **Meus agendamentos** (`GET /attendances/{patient_id}`, cancelar via
   `PUT /attendances/cancel/{id}`)

## ⚠️ Observações importantes

- **Nomes de campos**: os campos usados em `js/api.js` e nos formulários
  (`nome`, `telefone`, `cpf`, `data_nascimento` etc.) são inferidos a partir
  da lista de endpoints do Swagger — eu não tive acesso ao schema expandido
  (`Patient` / `Attendance`). Antes de usar de verdade, abra esses dois
  schemas no Swagger (**Expand all**) e me envie, ou ajuste os nomes de campo
  em `js/api.js` e nos formulários das telas.
- **CORS**: como é um app front-end puro, a AmigoAPI precisa permitir
  requisições vindas do domínio onde esse app for hospedado (header
  `Access-Control-Allow-Origin`). Se der erro de CORS no console do navegador,
  isso precisa ser liberado no backend da AmigoAPI, ou usar um proxy.
- **Segurança do token**: veja o aviso acima sobre expor o token no
  front-end — recomendo um backend-proxy antes de ir pra produção.
- **Forma de pagamento**: não incluída, como combinado — a AmigoAPI não tem
  endpoint de pagamento.
- **Convênio/unidade/tipo de atendimento**: os métodos `getInsurances()`,
  `getPlaces()` e `getEvents()` já estão prontos em `js/api.js`, mas ainda
  não têm tela própria — o fluxo atual assume esses campos como opcionais
  (`null`). É simples adicionar uma tela extra reaproveitando o padrão das
  telas de especialidade/médico.
- Sem testes automatizados — o foco foi montar a base funcional do fluxo
  principal com um visual já pronto para produção.

## Próximos passos sugeridos

1. Confirmar os schemas reais (`Patient`, `Attendance`) e ajustar os campos.
2. Confirmar o esquema de autenticação real.
3. Resolver CORS com o time que mantém a AmigoAPI (ou montar backend-proxy).
4. Adicionar tela de seleção de convênio (opcional, antes da confirmação).
5. Testar contra o server `dev-amigobot-api.amigo.dev.br` antes de produção.
