/* ============================================================
   ESTADO GLOBAL DO FLUXO DE AGENDAMENTO
   Guardado em memória enquanto o usuário navega entre telas.
   ============================================================ */

const AppState = {
  patient: null,        // { id, name, contact_cellphone, gender, ... }
  specialty: null,        // string (ex: "Neurologista")
  event: null,             // { id, name } — tipo de atendimento
  doctor: null,             // { id, name, specialty, gender, ... }
  date: null,                // "DD/MM/YYYY" (como a API retorna)
  time: null,                // "HH:mm"
  insuranceId: null,
  placeId: null,
  place: null, // objeto completo da unidade (nome, endereço) pra exibir
  reschedulingAttendance: null, // atendimento em edição na tela de reagendar

  resetScheduling() {
    this.specialty = null;
    this.event = null;
    this.doctor = null;
    this.date = null;
    this.time = null;
    this.insuranceId = null;
    this.placeId = null;
    this.place = null;
  }
};

const Screens = {
  SPLASH: "splash",
  PATIENT_VERIFICATION: "patient_verification",
  PATIENT_REGISTRATION: "patient_registration",
  PLACE_SELECTION: "place_selection",
  SPECIALTY_SELECTION: "specialty_selection",
  EVENT_SELECTION: "event_selection",
  DOCTOR_SELECTION: "doctor_selection",
  DATE_TIME_SELECTION: "date_time_selection",
  CONFIRMATION: "confirmation",
  MY_APPOINTMENTS: "my_appointments",
  PROFILE_EDIT: "profile_edit",
  RESCHEDULE: "reschedule",
  REPORTS: "reports"
};
