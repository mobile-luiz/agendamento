# Agendamento — App Web (HTML + CSS + JavaScript)

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



