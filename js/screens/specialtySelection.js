/* ============================================================
   SELEÇÃO DE ESPECIALIDADE — GET /doctors/specialties
   Retorna um array de STRINGS (ex: ["Neurologista", "OFTALMO"]),
   não objetos com id.
   ============================================================ */

async function renderSpecialtySelectionScreen() {
  renderScreen(`
    <div class="screen">
      <button class="btn-back" id="back-btn">‹ Voltar</button>
      ${progressTrack(0, 5)}
      ${screenHeader("Etapa 1 de 5", "Qual especialidade você procura?", null)}
      <div id="specialty-list">${loadingBlock("Carregando especialidades...")}</div>
    </div>
  `);

  const listEl = document.getElementById("specialty-list");
  const result = await AmigoAPI.getSpecialties();

  if (!result.ok) {
    listEl.innerHTML = errorBlock(result.error);
    return;
  }

  const specialties = (result.data || []).slice().sort((a, b) =>
    a.localeCompare(b, "pt-BR", { sensitivity: "base" })
  );
  if (specialties.length === 0) {
    listEl.innerHTML = emptyBlock("Nenhuma especialidade disponível no momento.");
    return;
  }

  listEl.innerHTML = `
    <div class="list">
      ${specialties.map(name => `
        <button class="option-card" data-name="${name}">
          <span class="title">${name}</span>
          <span class="chevron">›</span>
        </button>
      `).join("")}
    </div>
  `;

  listEl.querySelectorAll(".option-card").forEach(card => {
    card.addEventListener("click", () => {
      AppState.specialty = card.dataset.name;
      navigateTo(Screens.DOCTOR_SELECTION);
    });
  });
}
