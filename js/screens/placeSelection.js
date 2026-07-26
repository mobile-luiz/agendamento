/* ============================================================
   SELEÇÃO DE UNIDADE — GET /places
   A API exige place_id na criação do atendimento (mesmo sendo
   documentado como opcional). Se a clínica só tiver uma unidade,
   pulamos essa tela automaticamente.
   ============================================================ */

async function renderPlaceSelectionScreen() {
  renderScreen(`
    <div class="screen">
      <button class="btn-back" id="back-btn">‹ Voltar</button>
      ${screenHeader("Antes de começar", "Qual unidade?", null)}
      <div id="place-list">${loadingBlock("Carregando unidades...")}</div>
    </div>
  `);

  const listEl = document.getElementById("place-list");
  const result = await AmigoAPI.getPlaces();

  if (!result.ok) {
    listEl.innerHTML = errorBlock(result.error);
    return;
  }

  const places = result.data || [];

  if (places.length === 0) {
    // Sem unidades cadastradas — segue sem place_id e deixa a API reclamar se precisar.
    navigateTo(Screens.SPECIALTY_SELECTION, null, { skipHistory: true });
    return;
  }

  if (places.length === 1) {
    AppState.placeId = places[0].id;
    AppState.place = places[0];
    navigateTo(Screens.SPECIALTY_SELECTION, null, { skipHistory: true });
    return;
  }

  listEl.innerHTML = `
    <div class="list">
      ${places.map(p => `
        <button class="option-card" data-id="${p.id}">
          <span>
            <span class="title">${p.name || p.nome || `Unidade #${p.id}`}</span>
            ${p.address || p.address_address ? `<span class="subtitle">${p.address || p.address_address}</span>` : ""}
          </span>
          <span class="chevron">›</span>
        </button>
      `).join("")}
    </div>
  `;

  listEl.querySelectorAll(".option-card").forEach(card => {
    card.addEventListener("click", () => {
      const id = Number(card.dataset.id);
      AppState.placeId = id;
      AppState.place = places.find(p => p.id === id) || null;
      navigateTo(Screens.SPECIALTY_SELECTION);
    });
  });
}
