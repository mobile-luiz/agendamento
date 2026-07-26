/* ============================================================
   SELEÇÃO DE DATA E HORÁRIO
   GET /doctors/{id}/available-dates
   - sem 'date' → array de datas no formato "DD/MM/YYYY"
   - com 'date' (formato "YYYY-MM-DD") → array de horários (slots)
   ============================================================ */

async function renderDateTimeSelectionScreen() {
  renderScreen(`
    <div class="screen">
      <button class="btn-back" id="back-btn">‹ Voltar</button>
      ${progressTrack(3, 5)}
      ${screenHeader("Etapa 4 de 5", "Escolha data e horário", (AppState.doctor ? AppState.doctor.name : "") + (AppState.doctor && AppState.doctor.council_number ? ` — ${AppState.doctor.council_name || "CRM"}: ${AppState.doctor.council_number}` : ""))}

      <h3 style="margin-bottom:12px;">Datas disponíveis</h3>
      <div id="dates-block">${loadingBlock("Carregando datas...")}</div>

      <div id="slots-section" style="margin-top:24px;"></div>
    </div>
  `);

  const doctorId = AppState.doctor.id;
  const datesBlock = document.getElementById("dates-block");
  const slotsSection = document.getElementById("slots-section");

  const baseParams = {
    eventId: AppState.event ? AppState.event.id : null,
    insuranceId: AppState.insuranceId,
    placeId: AppState.placeId,
    patientId: AppState.patient ? AppState.patient.id : null
  };

  const datesResult = await AmigoAPI.getAvailableDates(doctorId, baseParams);
  if (!datesResult.ok) {
    datesBlock.innerHTML = errorBlock(datesResult.error);
    return;
  }

  const dates = datesResult.data || []; // array de strings "DD/MM/YYYY"
  if (dates.length === 0) {
    datesBlock.innerHTML = emptyBlock("Nenhuma data disponível para esse médico.");
    return;
  }

  datesBlock.innerHTML = `
    <div class="chip-row">
      ${dates.map(d => `<button class="chip" data-date="${d}">${d}</button>`).join("")}
    </div>
  `;
  enhanceChipRows(datesBlock);

  datesBlock.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", async () => {
      datesBlock.querySelectorAll(".chip").forEach(c => c.classList.remove("selected"));
      chip.classList.add("selected");

      const displayDate = chip.dataset.date; // "DD/MM/YYYY"
      AppState.date = displayDate;
      const queryDate = toIsoDate(displayDate); // "YYYY-MM-DD" pra consultar horários

      slotsSection.innerHTML = `
        <h3 style="margin-bottom:12px;">Horários</h3>
        ${loadingBlock("Carregando horários...")}
      `;

      const slotsResult = await AmigoAPI.getAvailableDates(doctorId, { ...baseParams, date: queryDate });
      if (!slotsResult.ok) {
        slotsSection.innerHTML = errorBlock(slotsResult.error);
        return;
      }

      const rawSlots = slotsResult.data || [];
      const slots = rawSlots.map(extractSlotTime).filter(Boolean);

      if (slots.length === 0) {
        slotsSection.innerHTML = `
          <h3 style="margin-bottom:12px;">Horários</h3>
          ${emptyBlock("Nenhum horário disponível nessa data.")}
        `;
        return;
      }

      slotsSection.innerHTML = `
        <h3 style="margin-bottom:12px;">Horários</h3>
        <div class="slot-grid">
          ${slots.map(s => `<button class="slot" data-time="${s}">${s}</button>`).join("")}
        </div>
      `;

      slotsSection.querySelectorAll(".slot").forEach(slotBtn => {
        slotBtn.addEventListener("click", () => {
          AppState.time = slotBtn.dataset.time;
          navigateTo(Screens.CONFIRMATION);
        });
      });
    });
  });
}

// "DD/MM/YYYY" → "YYYY-MM-DD"
function toIsoDate(displayDate) {
  const [day, month, year] = displayDate.split("/");
  return `${year}-${month}-${day}`;
}

// A API pode devolver os horários como strings simples ("09:00") ou
// como objetos (ex: { horario, is_arrival_order, shift }). Tentamos
// extrair um horário exibível de qualquer um dos dois formatos.
function extractSlotTime(slot) {
  if (typeof slot === "string") return slot;
  if (slot && typeof slot === "object") {
    return slot.horario || slot.hora || slot.time || slot.hour || null;
  }
  return null;
}
