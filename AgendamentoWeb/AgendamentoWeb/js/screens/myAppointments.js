/* ============================================================
   MEUS AGENDAMENTOS
   GET /attendances/{patient_id}  +  PUT /attendances/cancel/{id}
   Cada atendimento traz start_date (ISO) e, quando vem de uma
   criação recente, startDateFormatted (texto já pronto).

   Agrupamos em 4 categorias: Agendados, Remarcados, Faltas e
   Cancelados. A API não tem um status próprio de "remarcado" —
   isso é marcado localmente (ver localCache.js) quando o próprio
   app reagenda um atendimento.
   ============================================================ */

let _lastLoadedAttendances = [];
let _activeFilter = "all";

const APPOINTMENT_FILTERS = [
  { key: "all", label: "Todos" },
  { key: "scheduled", label: "Agendado" },
  { key: "done", label: "Finalizado" },
  { key: "missed", label: "Faltou" },
  { key: "canceled", label: "Cancelado" }
];

async function renderMyAppointmentsScreen() {
  const patient = AppState.patient || {};
  _activeFilter = "all";

  renderScreen(`
    <div class="screen" style="padding-bottom: 100px;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
        ${screenHeader(`Olá, <span style="color:var(--color-error);">${(patient.name || "").split(" ")[0]}</span>`, "Meus agendamentos", null)}
      </div>

      <div style="display:flex; gap:8px; margin-bottom:20px; flex-wrap:wrap;">
        <button class="btn btn-outline btn-sm" id="edit-profile-btn">${icon("user", 16)} Atualizar perfil</button>
        <button class="btn btn-outline btn-sm" id="download-pdf-btn">${icon("download", 16)} Baixar PDF</button>
        <button class="btn btn-outline btn-sm" id="reports-btn">${icon("bar-chart", 16)} Relatórios</button>
      </div>

      <div id="appointments-alert"></div>
      <div id="appointments-filter" class="chip-row" style="margin-bottom:16px;"></div>
      <div id="appointments-list">${skeletonCards(3)}</div>
    </div>

    <div class="screen-footer">
      <button class="btn btn-primary" id="new-appointment-btn">${icon("calendar-plus", 18)} Novo agendamento</button>
    </div>
  `);

  document.getElementById("new-appointment-btn").addEventListener("click", () => {
    navigateTo(Screens.PLACE_SELECTION);
  });

  document.getElementById("edit-profile-btn").addEventListener("click", () => {
    navigateTo(Screens.PROFILE_EDIT);
  });

  document.getElementById("reports-btn").addEventListener("click", () => {
    navigateTo(Screens.REPORTS);
  });

  document.getElementById("download-pdf-btn").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    const originalLabel = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = "Gerando PDF...";
    await downloadAppointmentsPdf(patient, _lastLoadedAttendances);
    btn.disabled = false;
    btn.innerHTML = originalLabel;
  });

  await loadAppointments();
}

function classifyAttendance(a) {
  if (a.canceled) return "canceled";
  if (a.missed) return "missed";
  if (isAttendanceRescheduled(a.id)) return "rescheduled";
  return "scheduled";
}

/* Categoria usada pelo filtro (chips): diferente de classifyAttendance,
   separa "Finalizado" num balde próprio (na visão "Todos" agrupada,
   finalizados continuam dentro de "Agendados"). */
function filterCategory(a) {
  if (a.canceled) return "canceled";
  if (a.missed) return "missed";
  if (a.done) return "done";
  return "scheduled";
}

/* Status detalhado, do jeito que a recepção vê na AMIGO (Confirmar,
   Compareceu, Iniciar Atendimento...), pra mostrar pro paciente além
   dos 4 grupos (Agendado/Remarcado/Falta/Cancelado). */
function attendanceStatusDetail(a) {
  if (a.canceled) return { label: "Cancelado", cls: "status-badge--error", icon: "x-circle" };
  if (a.missed) return { label: "Faltou", cls: "status-badge--error", icon: "x-circle" };
  if (isAttendanceRescheduled(a.id)) return { label: "Remarcado", cls: "status-badge--navy", icon: "repeat" };
  if (a.done) return { label: "Finalizado", cls: "status-badge--navy", icon: "check-circle" };
  if (a.in_attendance) return { label: "Em atendimento", cls: "status-badge--warning", icon: "activity" };
  if (a.arrived) return { label: "Compareceu", cls: "status-badge--navy", icon: "check-circle" };
  if (a.confirmed_at) return { label: "Confirmado", cls: "", icon: "check-circle" };
  return { label: "Agendado", cls: "", icon: "clock" };
}

async function loadAppointments() {
  const listEl = document.getElementById("appointments-list");
  const patientId = AppState.patient.id;

  const result = await AmigoAPI.getAttendancesByPatient(patientId);

  if (!result.ok) {
    listEl.innerHTML = errorBlock(result.error);
    return;
  }

  const attendances = result.data || [];
  _lastLoadedAttendances = attendances;

  renderFilterChips(attendances);
  renderAppointmentsList(attendances);
}

function renderFilterChips(attendances) {
  const filterEl = document.getElementById("appointments-filter");
  if (!filterEl) return;

  filterEl.innerHTML = APPOINTMENT_FILTERS.map(f => {
    const count = f.key === "all" ? attendances.length : attendances.filter(a => filterCategory(a) === f.key).length;
    return `<button type="button" class="chip ${_activeFilter === f.key ? "selected" : ""}" data-filter="${f.key}">${f.label}${count ? ` (${count})` : ""}</button>`;
  }).join("");

  filterEl.querySelectorAll("[data-filter]").forEach(chip => {
    chip.addEventListener("click", () => {
      _activeFilter = chip.dataset.filter;
      renderFilterChips(attendances);
      renderAppointmentsList(attendances);
    });
  });
}

function renderAppointmentsList(attendances) {
  const listEl = document.getElementById("appointments-list");

  if (attendances.length === 0) {
    listEl.innerHTML = emptyBlock("Você ainda não tem agendamentos. Toque em \"Novo agendamento\" para marcar sua primeira consulta.");
    return;
  }

  const byDateDesc = (a, b) => String(b.start_date || "").localeCompare(String(a.start_date || ""));

  if (_activeFilter !== "all") {
    const filtered = attendances.filter(a => filterCategory(a) === _activeFilter).sort(byDateDesc);
    listEl.innerHTML = filtered.length === 0
      ? emptyBlock("Nenhum agendamento nesse filtro.")
      : `<div class="list">${filtered.map(a => renderAttendanceCard(a)).join("")}</div>`;
    bindAppointmentActions(listEl, attendances);
    return;
  }

  const groups = {
    scheduled: [],
    rescheduled: [],
    missed: [],
    canceled: []
  };
  attendances.forEach(a => groups[classifyAttendance(a)].push(a));

  // Mais novo primeiro: ordena pela própria data/horário do agendamento
  // (não pela data de criação, que a API não devolve). O start_date já
  // vem como "YYYY-MM-DD HH:mm...", então comparar como texto funciona.
  Object.values(groups).forEach(list => list.sort(byDateDesc));

  const sections = [
    { key: "scheduled", title: "Agendados" },
    { key: "rescheduled", title: "Remarcados" },
    { key: "missed", title: "Faltas" },
    { key: "canceled", title: "Cancelados" }
  ];

  listEl.innerHTML = sections
    .filter(section => groups[section.key].length > 0)
    .map(section => `
      <h3 style="margin: 20px 0 12px;">${section.title} (${groups[section.key].length})</h3>
      <div class="list">
        ${groups[section.key].map(a => renderAttendanceCard(a)).join("")}
      </div>
    `).join("");

  bindAppointmentActions(listEl, attendances);
}

function bindAppointmentActions(listEl, attendances) {
  listEl.querySelectorAll("[data-reschedule-id]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.rescheduleId);
      const attendance = attendances.find(a => a.id === id);
      AppState.reschedulingAttendance = attendance;
      navigateTo(Screens.RESCHEDULE);
    });
  });

  listEl.querySelectorAll("[data-cancel-id]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.cancelId);
      showConfirmModal("Deseja cancelar esse agendamento?", async () => {
        btn.disabled = true;
        btn.textContent = "Cancelando...";

        const alertBox = document.getElementById("appointments-alert");
        const result = await AmigoAPI.cancelAttendance(id);
        if (result.ok) {
          if (alertBox) alertBox.innerHTML = "";
          await loadAppointments();
        } else {
          btn.disabled = false;
          btn.textContent = "Cancelar";
          if (alertBox) alertBox.innerHTML = errorBlock(result.error);
        }
      });
    });
  });
}

function renderAttendanceCard(a) {
  const canAct = !a.canceled && !a.missed && !a.done;
  const status = attendanceStatusDetail(a);
  return `
    <div class="appointment-card">
      <div class="when">${formatAttendanceWhen(a)}</div>
      ${a.agenda_event && a.agenda_event.name ? `<span class="status-badge">${a.agenda_event.name}</span>` : ""}
      <span class="status-badge ${status.cls}">${icon(status.icon)}${status.label}</span>
      <div class="card-actions">
        ${canAct ? `<button class="btn btn-outline btn-sm" data-reschedule-id="${a.id}">${icon("calendar-clock", 15)} Reagendar</button>` : ""}
        ${canAct ? `<button class="btn btn-danger-outline btn-sm" data-cancel-id="${a.id}">${icon("x-circle", 15)} Cancelar</button>` : ""}
      </div>
    </div>
  `;
}

function formatAttendanceWhen(attendance) {
  if (attendance.startDateFormatted) return attendance.startDateFormatted;
  if (attendance.start_date) {
    // A AmigoAPI devolve o start_date com sufixo "Z" (UTC), mas os dígitos
    // já são o horário local de verdade (o mesmo que aparece no painel da
    // clínica) — não é uma conversão de fuso de verdade. Se deixarmos o
    // navegador converter (new Date + toLocaleString), ele subtrai 3h
    // (fuso de Brasília) e mostra um horário errado. Por isso lemos os
    // dígitos direto da string, sem nenhuma conversão de fuso.
    const match = String(attendance.start_date).match(
      /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/
    );
    if (match) {
      const [, year, month, day, hour, minute] = match;
      return `${day}/${month}/${year}, ${hour}:${minute}`;
    }
    return attendance.start_date;
  }
  return "Data não informada";
}

// ---------- Exportar lista em PDF (via jsPDF, carregado no index.html) ----------

/* A AmigoAPI só devolve CRM (council_number/council_name) em
   /doctors/available, e esse endpoint exige event_id. Cada atendimento
   já carrega o event_id usado — buscamos os médicos disponíveis pra
   cada event_id distinto da lista e montamos um mapa id → CRM. */
async function fetchDoctorCrmMap(attendances) {
  const eventIds = [...new Set(attendances.map(a => a.event_id).filter(Boolean))];
  const map = {};

  await Promise.all(eventIds.map(async eventId => {
    const result = await AmigoAPI.getAvailableDoctors({ eventId });
    if (!result.ok) return; // melhor esforço: PDF sai sem esses dados pra esse grupo
    (result.data || []).forEach(d => {
      map[d.id] = {
        council_number: d.council_number || null,
        council_name: d.council_name || null,
        specialty: d.specialty || null
      };
    });
  }));

  return map;
}

/* Pega o logo direto da tag <img> que já está na tela (barra superior do
   app) e desenha num <canvas> pra virar data URL. Evitamos fetch("pad.png")
   de propósito: abrindo o app direto do disco (file://), o navegador
   bloqueia esse tipo de leitura, mas a própria tag <img> carrega normal —
   então aproveitamos o que já está carregado em vez de buscar de novo. */
function getLogoFromDom() {
  try {
    const img = document.querySelector(".brand-logo, .splash-logo");
    if (!img || !img.complete || !img.naturalWidth) return null;

    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext("2d").drawImage(img, 0, 0);

    return {
      dataUrl: canvas.toDataURL("image/png"),
      width: img.naturalWidth,
      height: img.naturalHeight
    };
  } catch (err) {
    // canvas "tainted" ou qualquer outro imprevisto: PDF sai sem logo.
    return null;
  }
}

// Paleta em RGB (mesmos tons da marca, usados no CSS) pra desenhar no PDF.
const PDF_COLORS = {
  navy: [11, 21, 80],
  primary: [48, 72, 242],
  primaryDark: [36, 56, 196],
  primarySoft: [232, 234, 252],
  text: [22, 25, 43],
  textMuted: [102, 107, 133],
  border: [225, 228, 238],
  error: [214, 71, 60],
  errorSoft: [252, 234, 232],
  warning: [198, 124, 30],
  warningSoft: [251, 240, 222]
};

/* Cor do badge de status no PDF — mesma lógica de cor usada na tela. */
function pdfStatusColors(label) {
  if (label === "Cancelado" || label === "Faltou") return { bg: PDF_COLORS.errorSoft, text: PDF_COLORS.error };
  if (label === "Em atendimento") return { bg: PDF_COLORS.warningSoft, text: PDF_COLORS.warning };
  if (label === "Finalizado" || label === "Remarcado" || label === "Compareceu") return { bg: PDF_COLORS.primarySoft, text: PDF_COLORS.navy };
  return { bg: PDF_COLORS.primarySoft, text: PDF_COLORS.text };
}

/* Desenha uma "pill" colorida (tipo de atendimento ou status) e devolve
   a posição x logo depois dela, pra encadear várias na mesma linha. */
function drawPdfPill(doc, text, x, y, bg, textColor) {
  doc.setFontSize(8.5);
  doc.setFont(undefined, "bold");
  const textWidth = doc.getTextWidth(text);
  const paddingX = 3;
  const pillWidth = textWidth + paddingX * 2;
  const pillHeight = 5.5;

  doc.setFillColor(...bg);
  doc.roundedRect(x, y, pillWidth, pillHeight, 1.5, 1.5, "F");
  doc.setTextColor(...textColor);
  doc.text(text, x + paddingX, y + pillHeight - 1.6);
  doc.setFont(undefined, "normal");

  return x + pillWidth + 3;
}

/* Cabeçalho com fundo navy, logo (se carregou) e título — usado na
   primeira página e, numa versão mais fina, no topo das seguintes. */
function drawPdfHeader(doc, logo, pageWidth, { tall }) {
  const height = tall ? 28 : 16;
  doc.setFillColor(...PDF_COLORS.navy);
  doc.rect(0, 0, pageWidth, height, "F");

  const marginX = 14;
  let textX = marginX;

  if (logo) {
    const logoH = tall ? 14 : 9;
    const logoW = (logo.width / logo.height) * logoH;
    doc.addImage(logo.dataUrl, "PNG", marginX, (height - logoH) / 2, logoW, logoH);
    textX = marginX + logoW + 5;
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, "bold");
  doc.setFontSize(tall ? 14 : 10.5);
  doc.text("PAD Saúde", textX, tall ? height / 2 - 1 : height / 2 + 1.5);

  if (tall) {
    doc.setFont(undefined, "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(220, 230, 245);
    doc.text("Comprovante de agendamentos", textX, height / 2 + 6);
  }

  doc.setTextColor(...PDF_COLORS.text);
  return height;
}

function drawPdfFooter(doc, pageWidth, pageHeight) {
  doc.setFontSize(8);
  doc.setTextColor(...PDF_COLORS.textMuted);
  const generatedAt = new Date().toLocaleDateString("pt-BR");
  doc.text(`Gerado em ${generatedAt} — PAD Saúde`, 14, pageHeight - 8);
  const pageInfo = `Página ${doc.internal.getCurrentPageInfo().pageNumber} de ${doc.internal.getNumberOfPages()}`;
  doc.text(pageInfo, pageWidth - 14, pageHeight - 8, { align: "right" });
}

/* Conta quantos atendimentos (de todos os status) cada especialidade
   teve, usando o mapa de médico → especialidade já buscado pro CRM. */
function buildSpecialtySummary(attendances, doctorInfoMap) {
  const counts = {};
  attendances.forEach(a => {
    const doctorId = a.user ? a.user.id : a.user_id;
    const specialty = (doctorInfoMap[doctorId] && doctorInfoMap[doctorId].specialty) || "Não informado";
    counts[specialty] = (counts[specialty] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

/* Desenha o quadro "Resumo por especialidade" e devolve o novo y. */
function drawSpecialtySummary(doc, summary, marginX, cardWidth, y) {
  const rowHeight = 7;
  const boxHeight = 10 + summary.length * rowHeight;

  doc.setFillColor(...PDF_COLORS.primarySoft);
  doc.roundedRect(marginX, y, cardWidth, boxHeight, 2, 2, "F");

  doc.setFont(undefined, "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...PDF_COLORS.primaryDark);
  doc.text("Resumo por especialidade", marginX + 5, y + 7);

  let rowY = y + 7 + rowHeight;
  summary.forEach(([specialty, count]) => {
    doc.setFont(undefined, "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...PDF_COLORS.text);
    doc.text(specialty, marginX + 5, rowY);
    doc.setFont(undefined, "bold");
    doc.setTextColor(...PDF_COLORS.primaryDark);
    const countLabel = `${count} atendimento${count === 1 ? "" : "s"}`;
    doc.text(countLabel, marginX + cardWidth - 5, rowY, { align: "right" });
    rowY += rowHeight;
  });

  return y + boxHeight;
}

async function downloadAppointmentsPdf(patient, attendances) {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert("Não foi possível carregar o gerador de PDF. Verifique sua conexão com a internet e tente de novo.");
    return;
  }
  if (!attendances || attendances.length === 0) {
    alert("Você ainda não tem agendamentos para exportar.");
    return;
  }

  const logo = getLogoFromDom();
  const crmMap = await fetchDoctorCrmMap(attendances);

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const marginX = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const cardWidth = pageWidth - marginX * 2;
  const bottomLimit = pageHeight - 16;

  const sortedAttendances = [...attendances].sort((a, b) =>
    String(b.start_date || "").localeCompare(String(a.start_date || ""))
  );

  let y = drawPdfHeader(doc, logo, pageWidth, { tall: true }) + 12;

  // Cartão com os dados do paciente, no mesmo estilo dos cards de baixo.
  doc.setFillColor(...PDF_COLORS.primarySoft);
  doc.roundedRect(marginX, y, cardWidth, 16, 2, 2, "F");
  doc.setFont(undefined, "bold");
  doc.setFontSize(11);
  doc.setTextColor(...PDF_COLORS.primaryDark);
  doc.text(patient.name || "", marginX + 4, y + 6.5);
  doc.setFont(undefined, "normal");
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.textMuted);
  doc.text(`Telefone: ${patient.contact_cellphone || "—"}`, marginX + 4, y + 12);
  y += 16 + 10;

  const specialtySummary = buildSpecialtySummary(attendances, crmMap);
  if (specialtySummary.length > 0) {
    y = drawSpecialtySummary(doc, specialtySummary, marginX, cardWidth, y) + 10;
  }

  sortedAttendances.forEach((a, index) => {
    const when = formatAttendanceWhen(a);
    const tipo = (a.agenda_event && a.agenda_event.name) || "";
    const status = attendanceStatusDetail(a).label;
    const doctorId = a.user ? a.user.id : a.user_id;
    const doctorName = (a.user && a.user.name) || "";
    const crm = crmMap[doctorId];

    // Altura do card depende de quantas linhas de texto ele vai ter.
    const infoLines = (doctorName ? 1 : 0) + (crm && crm.council_number ? 1 : 0);
    const cardHeight = 12 + 7 + infoLines * 5.5 + 6;

    if (y + cardHeight > bottomLimit) {
      doc.addPage();
      y = drawPdfHeader(doc, logo, pageWidth, { tall: false }) + 10;
    }

    doc.setDrawColor(...PDF_COLORS.border);
    doc.setLineWidth(0.3);
    doc.roundedRect(marginX, y, cardWidth, cardHeight, 2, 2, "S");

    let innerY = y + 8;
    doc.setFont(undefined, "bold");
    doc.setFontSize(11.5);
    doc.setTextColor(...PDF_COLORS.text);
    doc.text(when, marginX + 5, innerY);

    innerY += 6;
    let pillX = marginX + 5;
    if (tipo) {
      pillX = drawPdfPill(doc, tipo.toUpperCase(), pillX, innerY - 4, PDF_COLORS.primarySoft, PDF_COLORS.text);
    }
    const statusColors = pdfStatusColors(status);
    drawPdfPill(doc, status, pillX, innerY - 4, statusColors.bg, statusColors.text);

    innerY += 7.5;
    doc.setFont(undefined, "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...PDF_COLORS.text);
    if (doctorName) {
      doc.text(`Médico: ${doctorName}`, marginX + 5, innerY);
      innerY += 5.5;
    }
    if (crm && crm.council_number) {
      doc.setTextColor(...PDF_COLORS.textMuted);
      doc.text(`${crm.council_name || "CRM"}: ${crm.council_number}`, marginX + 5, innerY);
      innerY += 5.5;
    }

    y += cardHeight + 6;
  });

  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawPdfFooter(doc, pageWidth, pageHeight);
  }

  const fileName = `agendamentos-${(patient.name || "paciente").replace(/\s+/g, "-").toLowerCase()}.pdf`;
  doc.save(fileName);
}
