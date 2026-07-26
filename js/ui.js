/* ============================================================
   HELPERS DE UI REUTILIZÁVEIS
   ============================================================ */

function el(html) {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
}

function renderScreen(contentHtml) {
  const app = document.getElementById("app");
  app.innerHTML = contentHtml;
  enhanceChipRows(app);
}

/* Faz as .chip-row (linhas de filtros/chips que estouram a largura,
   ex: Todos/Agendado/Finalizado/Faltou/Cancelado) rolarem de forma óbvia:
   - arrastar com o mouse (não só touch)
   - roda do mouse vertical também rola horizontalmente
   - fade nas bordas indicando que há mais chips fora da tela,
     que some quando chega no início/fim
   Chamada automaticamente por renderScreen, e reaplicada sempre que
   novos elementos .chip-row aparecem no DOM (ex: re-render de filtros). */
function enhanceChipRows(root) {
  const rows = (root || document).querySelectorAll(".chip-row:not([data-scroll-enhanced])");
  rows.forEach(row => {
    row.dataset.scrollEnhanced = "true";

    const updateEdges = () => {
      const atStart = row.scrollLeft <= 1;
      const atEnd = row.scrollLeft >= row.scrollWidth - row.clientWidth - 1;
      row.classList.toggle("at-start", atStart);
      row.classList.toggle("at-end", atEnd);
    };
    updateEdges();
    row.addEventListener("scroll", updateEdges, { passive: true });
    window.addEventListener("resize", updateEdges);

    // Roda do mouse (vertical) também rola a linha horizontalmente
    row.addEventListener("wheel", (e) => {
      if (row.scrollWidth <= row.clientWidth) return;
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        row.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    }, { passive: false });

    // Arrastar com o mouse (drag-to-scroll) para uso em desktop
    let isDown = false;
    let startX = 0;
    let startScroll = 0;
    let moved = false;

    row.addEventListener("mousedown", (e) => {
      isDown = true;
      moved = false;
      startX = e.pageX;
      startScroll = row.scrollLeft;
    });

    const endDrag = () => {
      if (!isDown) return;
      isDown = false;
      row.classList.remove("dragging");
    };
    window.addEventListener("mouseup", endDrag);
    row.addEventListener("mouseleave", endDrag);

    window.addEventListener("mousemove", (e) => {
      if (!isDown) return;
      const dx = e.pageX - startX;
      // Só passa a tratar como arraste (e bloquear clique nos chips)
      // depois de um deslocamento mínimo — um clique simples não deve
      // disparar a classe "dragging".
      if (!moved && Math.abs(dx) > 4) {
        moved = true;
        row.classList.add("dragging");
      }
      if (moved) row.scrollLeft = startScroll - dx;
    });

    // Evita disparar o clique do chip no fim de um arraste
    row.addEventListener("click", (e) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
        moved = false;
      }
    }, true);
  });
}

function screenHeader(eyebrow, title, subtitle) {
  return `
    <div class="screen-header">
      ${eyebrow ? `<span class="eyebrow">${eyebrow}</span>` : ""}
      <h1>${title}</h1>
      ${subtitle ? `<p>${subtitle}</p>` : ""}
    </div>
  `;
}

function progressTrack(currentIndex, total) {
  let steps = "";
  for (let i = 0; i < total; i++) {
    const cls = i < currentIndex ? "done" : i === currentIndex ? "active" : "";
    steps += `<div class="step ${cls}"></div>`;
  }
  return `<div class="progress-track">${steps}</div>`;
}

function loadingBlock(message) {
  return `
    <div class="state-block">
      <div class="spinner"></div>
      <p>${message}</p>
    </div>
  `;
}

function errorBlock(message) {
  return `<div class="alert alert-error">${message}</div>`;
}

/**
 * Valida CPF de verdade (dígitos verificadores), não só a quantidade
 * de números. Recebe o CPF já limpo (só dígitos, 11 caracteres).
 */
function isValidCPF(cpf) {
  if (!cpf || cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const digits = cpf.split("").map(Number);

  const calcCheckDigit = (base) => {
    let sum = 0;
    for (let i = 0; i < base.length; i++) {
      sum += base[i] * (base.length + 1 - i);
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const d1 = calcCheckDigit(digits.slice(0, 9));
  const d2 = calcCheckDigit(digits.slice(0, 10));

  return d1 === digits[9] && d2 === digits[10];
}

function emptyBlock(message) {
  return `
    <div class="state-block">
      ${icon("calendar-empty", 40)}
      <p>${message}</p>
    </div>
  `;
}

/**
 * Skeleton (placeholder pulsante) no formato de cartão de agendamento,
 * mostrado enquanto a lista real ainda está carregando — dá sensação
 * de resposta mais rápida do que um spinner sozinho.
 */
function skeletonCards(count) {
  let html = '<div class="list">';
  for (let i = 0; i < count; i++) {
    html += `
      <div class="appointment-card skeleton-card">
        <div class="skeleton-line skeleton-line--title"></div>
        <div class="skeleton-line skeleton-line--badge"></div>
      </div>
    `;
  }
  return html + "</div>";
}

/**
 * Pequeno conjunto de ícones em SVG inline (traço único, herdam a cor
 * do texto via currentColor) — evita depender de uma biblioteca externa.
 */
const ICONS = {
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',
  download: '<path d="M12 3v12"/><path d="M7 11l5 5 5-5"/><path d="M4 21h16"/>',
  "bar-chart": '<path d="M4 21V10"/><path d="M12 21V4"/><path d="M20 21v-7"/>',
  "calendar-plus": '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/><path d="M12 14v6"/><path d="M9 17h6"/>',
  "calendar-clock": '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/><circle cx="12" cy="16" r="3.2"/><path d="M12 14.7V16l1 0.7"/>',
  "calendar-empty": '<rect x="4" y="6" width="16" height="14" rx="2"/><path d="M4 11h16"/><path d="M8 4v4"/><path d="M16 4v4"/>',
  "x-circle": '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5l5 5"/><path d="M14.5 9.5l-5 5"/>',
  "check-circle": '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5 5.5-6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  activity: '<path d="M3 12h4l2.5-7 4 14L16 12h5"/>',
  stethoscope: '<path d="M6 4v6a4 4 0 0 0 8 0V4"/><path d="M6 4H4.5"/><path d="M14 4h1.5"/><circle cx="18.5" cy="15.5" r="2"/><path d="M10 10v3a6 6 0 0 0 6.5 6"/>',
  repeat: '<path d="M4 9a8 8 0 0 1 14-4.6"/><path d="M20 15a8 8 0 0 1-14 4.6"/><path d="M18 4v4h-4"/><path d="M6 20v-4h4"/>'
};

function icon(name, size = 18) {
  const paths = ICONS[name];
  if (!paths) return "";
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

/**
 * Mostra um modal de confirmação com botões "Sim"/"Não".
 * onConfirm é chamado apenas se o usuário tocar em "Sim".
 */
function showConfirmModal(message, onConfirm, options = {}) {
  const confirmLabel = options.confirmLabel || "Sim";
  const cancelLabel = options.cancelLabel || "Não";

  const overlay = el(`
    <div class="modal-overlay">
      <div class="modal-card">
        <p>${message}</p>
        <div class="modal-actions">
          <button class="btn btn-outline" id="modal-cancel-btn">${cancelLabel}</button>
          <button class="btn btn-primary" id="modal-confirm-btn">${confirmLabel}</button>
        </div>
      </div>
    </div>
  `);

  document.body.appendChild(overlay);

  const close = () => overlay.remove();

  overlay.querySelector("#modal-cancel-btn").addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  overlay.querySelector("#modal-confirm-btn").addEventListener("click", () => {
    close();
    onConfirm();
  });
}
