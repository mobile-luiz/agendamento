/* ============================================================
   SELEÇÃO DE MÉDICO — GET /doctors
   Vem antes do tipo de atendimento agora: /doctors lista todos os
   médicos com sua especialidade, sem exigir event_id (diferente de
   /doctors/available). Filtramos a especialidade aqui no app, de
   forma tolerante (maiúsculas, acentos, hífen), porque os dados de
   especialidade da clínica têm inconsistências de grafia.
   ============================================================ */

function normalizeText(str) {
  return (str || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")     // hífen, pontuação etc viram espaço
    .trim();
}

async function renderDoctorSelectionScreen() {
  renderScreen(`
    <div class="screen">
      <button class="btn-back" id="back-btn">‹ Voltar</button>
      ${progressTrack(1, 5)}
      ${screenHeader("Etapa 2 de 5", "Escolha o médico", AppState.specialty)}
      <div id="doctor-list">${loadingBlock("Buscando médicos disponíveis...")}</div>
    </div>
  `);

  const listEl = document.getElementById("doctor-list");
  const result = await AmigoAPI.getDoctors();

  if (!result.ok) {
    listEl.innerHTML = errorBlock(result.error);
    return;
  }

  const allDoctors = result.data || [];

  const wantedSpecialty = normalizeText(AppState.specialty);
  let doctors = allDoctors;
  if (wantedSpecialty) {
    doctors = allDoctors.filter(d => normalizeText(d.specialty) === wantedSpecialty);
    // Se ninguém bater exatamente (grafia muito diferente), melhor mostrar
    // todos do que uma lista vazia.
    if (doctors.length === 0) doctors = allDoctors;
  }

  if (doctors.length === 0) {
    listEl.innerHTML = emptyBlock("Nenhum médico disponível no momento.");
    return;
  }

  listEl.innerHTML = `
    <div class="list">
      ${doctors.map(d => `
        <button class="option-card" data-id="${d.id}">
          <span>
            <span class="title">${d.title ? d.title + " " : ""}${d.name}</span>
            ${d.specialty ? `<span class="subtitle">${d.specialty}</span>` : ""}
            ${d.council_number ? `<span class="subtitle">${d.council_name || "CRM"}: ${d.council_number}</span>` : ""}
          </span>
          <span class="chevron">›</span>
        </button>
      `).join("")}
    </div>
  `;

  listEl.querySelectorAll(".option-card").forEach(card => {
    card.addEventListener("click", () => {
      const id = Number(card.dataset.id);
      const doctor = doctors.find(d => d.id === id);
      AppState.doctor = doctor;
      navigateTo(Screens.EVENT_SELECTION);
    });
  });
}
