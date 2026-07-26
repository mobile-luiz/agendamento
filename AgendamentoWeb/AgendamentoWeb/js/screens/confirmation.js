/* ============================================================
   CONFIRMAÇÃO — POST /attendances
   Body real: { insurance_id, event_id, user_id, place_id,
                start_date: "YYYY-MM-DD HH:mm", patient_id }
   ============================================================ */

function renderConfirmationScreen() {
  const { patient, doctor, specialty, event, date, time, place } = AppState;

  renderScreen(`
    <div class="screen" style="padding-bottom: 100px;">
      <button class="btn-back" id="back-btn">‹ Voltar</button>
      ${progressTrack(4, 5)}
      ${screenHeader("Etapa 5 de 5", "Confira e confirme", null)}

      <div class="ticket">
        <div class="ticket-top">
          <span class="eyebrow">Comprovante de agendamento</span>
          <h2>${doctor ? doctor.name : ""}</h2>
        </div>
        <div class="ticket-perforation"></div>
        <div class="ticket-body">
          <div class="summary-row">
            <span class="label">Paciente</span>
            <span class="value">${patient ? patient.name : ""}</span>
          </div>
          ${doctor && doctor.council_number ? `
          <div class="summary-row">
            <span class="label">${doctor.council_name || "CRM"}</span>
            <span class="value">${doctor.council_number}</span>
          </div>` : ""}
          ${place ? `
          <div class="summary-row">
            <span class="label">Local</span>
            <span class="value">${place.name || place.nome || ""}</span>
          </div>` : ""}
          ${place && (place.address || place.address_address) ? `
          <div class="summary-row">
            <span class="label">Endereço</span>
            <span class="value">${place.address || place.address_address}</span>
          </div>` : ""}
          ${specialty ? `
          <div class="summary-row">
            <span class="label">Especialidade</span>
            <span class="value">${specialty}</span>
          </div>` : ""}
          ${event ? `
          <div class="summary-row">
            <span class="label">Tipo de atendimento</span>
            <span class="value">${event.name || event.nome || ""}</span>
          </div>` : ""}
          <div class="summary-row">
            <span class="label">Data</span>
            <span class="value">${date}</span>
          </div>
          <div class="summary-row">
            <span class="label">Horário</span>
            <span class="value">${time}</span>
          </div>
        </div>
      </div>

      <div id="confirmation-alert"></div>
    </div>

    <div class="screen-footer">
      <button class="btn btn-primary" id="confirm-btn">Confirmar agendamento</button>
    </div>
  `);

  const btn = document.getElementById("confirm-btn");
  const alertBox = document.getElementById("confirmation-alert");

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btn.textContent = "Confirmando...";
    alertBox.innerHTML = "";

    // date está em "DD/MM/YYYY" (como a API devolveu) — convertendo pra
    // "YYYY-MM-DD HH:mm", formato esperado pelo start_date.
    const [day, month, year] = date.split("/");
    const startDate = `${year}-${month}-${day} ${time}`;

    const request = {
      insurance_id: AppState.insuranceId,
      event_id: event ? event.id : null,
      user_id: doctor.id,
      place_id: AppState.placeId,
      start_date: startDate,
      patient_id: patient.id
    };

    const result = await AmigoAPI.createAttendance(request);

    btn.disabled = false;
    btn.textContent = "Confirmar agendamento";

    if (!result.ok) {
      alertBox.innerHTML = errorBlock(result.error);
      return;
    }

    AppState.resetScheduling();
    navigateTo(Screens.MY_APPOINTMENTS);
  });
}
