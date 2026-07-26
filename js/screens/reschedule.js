/* ============================================================
   REAGENDAR CONSULTA
   Reaproveita a lógica de GET /doctors/{id}/available-dates e
   confirma com PUT /attendances/{id}/reschedule.
   Espera AppState.reschedulingAttendance já preenchido.
   ============================================================ */

async function renderRescheduleScreen() {
  const attendance = AppState.reschedulingAttendance;

  if (!attendance) {
    navigateTo(Screens.MY_APPOINTMENTS);
    return;
  }

  const doctorId = attendance.user ? attendance.user.id : attendance.user_id;
  const doctorName = attendance.user ? attendance.user.name : "";

  renderScreen(`
    <div class="screen">
      <button class="btn-back" id="back-btn">‹ Voltar</button>
      ${screenHeader("Reagendar", "Nova data e horário", doctorName)}

      <h3 style="margin-bottom:12px;">Datas disponíveis</h3>
      <div id="reschedule-dates-block">${loadingBlock("Carregando datas...")}</div>

      <div id="reschedule-slots-section" style="margin-top:24px;"></div>
      <div id="reschedule-alert" style="margin-top:16px;"></div>
    </div>
  `);

  const datesBlock = document.getElementById("reschedule-dates-block");
  const slotsSection = document.getElementById("reschedule-slots-section");
  const alertBox = document.getElementById("reschedule-alert");

  const baseParams = {
    eventId: attendance.event_id,
    insuranceId: attendance.insurance_id,
    placeId: attendance.place_id || (attendance.place ? attendance.place.id : null),
    patientId: attendance.patient_id
  };

  const datesResult = await AmigoAPI.getAvailableDates(doctorId, baseParams);
  if (!datesResult.ok) {
    datesBlock.innerHTML = errorBlock(datesResult.error);
    return;
  }

  const dates = datesResult.data || [];
  if (dates.length === 0) {
    datesBlock.innerHTML = emptyBlock("Nenhuma data disponível para reagendar com esse médico.");
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
      const queryDate = toIsoDate(displayDate);

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
        slotBtn.addEventListener("click", async () => {
          slotsSection.querySelectorAll(".slot").forEach(s => s.classList.remove("selected"));
          slotBtn.classList.add("selected");

          const newDate = `${queryDate} ${slotBtn.dataset.time}`;
          alertBox.innerHTML = "";
          slotBtn.disabled = true;

          const result = await AmigoAPI.rescheduleAttendance(attendance.id, newDate);

          if (!result.ok) {
            slotBtn.disabled = false;
            alertBox.innerHTML = errorBlock(result.error);
            return;
          }

          AppState.reschedulingAttendance = null;
          markAttendanceRescheduled(attendance.id);
          navigateTo(Screens.MY_APPOINTMENTS);
        });
      });
    });
  });
}
