/* ============================================================
   SELEÇÃO DE TIPO DE ATENDIMENTO — GET /events?user_id=...
   Agora vem depois do médico, filtrado pelo médico escolhido —
   assim só aparecem tipos de atendimento que aquele profissional
   realmente oferece (evita mostrar "Nutricionista" pra quem
   escolheu um psicólogo, por exemplo).
   ============================================================ */

async function renderEventSelectionScreen() {
  renderScreen(`
    <div class="screen">
      <button class="btn-back" id="back-btn">‹ Voltar</button>
      ${progressTrack(2, 5)}
      ${screenHeader("Etapa 3 de 5", "Tipo de atendimento", AppState.doctor ? AppState.doctor.name : null)}
      <div id="event-list">${loadingBlock("Carregando tipos de atendimento...")}</div>
    </div>
  `);

  const listEl = document.getElementById("event-list");
  const result = await AmigoAPI.getEvents({
    userId: AppState.doctor ? AppState.doctor.id : null,
    insuranceId: AppState.insuranceId,
    placeId: AppState.placeId
  });

  if (!result.ok) {
    listEl.innerHTML = errorBlock(result.error);
    return;
  }

  const events = result.data || [];
  if (events.length === 0) {
    listEl.innerHTML = emptyBlock("Nenhum tipo de atendimento disponível para esse médico no momento.");
    return;
  }

  listEl.innerHTML = `
    <div class="list">
      ${events.map(ev => `
        <button class="option-card" data-id="${ev.id}">
          <span class="title">${ev.name || ev.nome || `Atendimento #${ev.id}`}</span>
          <span class="chevron">›</span>
        </button>
      `).join("")}
    </div>
  `;

  listEl.querySelectorAll(".option-card").forEach(card => {
    card.addEventListener("click", async () => {
      const id = Number(card.dataset.id);
      const event = events.find(ev => ev.id === id);
      AppState.event = event;

      // /doctors (usado na tela anterior) não traz CRM/gênero/título — só
      // /doctors/available traz, mas ela exige event_id. Agora que já temos
      // o event_id, buscamos de novo pra completar os dados do médico.
      if (AppState.doctor) {
        const enrichResult = await AmigoAPI.getAvailableDoctors({ eventId: event.id });
        if (enrichResult.ok) {
          const fullDoctor = (enrichResult.data || []).find(d => d.id === AppState.doctor.id);
          if (fullDoctor) {
            AppState.doctor = { ...AppState.doctor, ...fullDoctor };
          }
        }
      }

      navigateTo(Screens.DATE_TIME_SELECTION);
    });
  });
}
