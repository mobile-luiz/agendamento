/* ============================================================
   RELATÓRIOS
   Usa GET /attendances/{patient_id} (mesmo endpoint de "Meus
   agendamentos") e agrupa por mês pra montar um gráfico de
   barras simples, no estilo dos apps de banco (uma barra por
   mês, valor em cima, mês embaixo, mês atual destacado).
   ============================================================ */

const REPORT_MONTHS_COUNT = 6;
const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

async function renderReportsScreen() {
  renderScreen(`
    <div class="screen" style="padding-bottom: 60px;">
      <button class="btn-back" id="back-btn">‹ Voltar</button>
      ${screenHeader("Relatórios", "Atendimentos por mês", "Resumo dos últimos meses.")}

      <div id="reports-content">${loadingBlock("Carregando relatório...")}</div>
    </div>
  `);

  const patientId = AppState.patient && AppState.patient.id;
  const content = document.getElementById("reports-content");

  if (!patientId) {
    content.innerHTML = emptyBlock("Não foi possível identificar o paciente.");
    return;
  }

  const [attendancesResult, doctorsResult] = await Promise.all([
    AmigoAPI.getAttendancesByPatient(patientId),
    AmigoAPI.getDoctors()
  ]);

  if (!attendancesResult.ok) {
    content.innerHTML = errorBlock(attendancesResult.error);
    return;
  }

  const attendances = attendancesResult.data || [];
  // Se a lista de médicos falhar, o relatório principal continua — só a
  // coluna de especialidade nas tabelas fica sem esse dado.
  const doctorsById = {};
  if (doctorsResult.ok) {
    (doctorsResult.data || []).forEach(d => { doctorsById[d.id] = d; });
  }

  if (attendances.length === 0) {
    content.innerHTML = emptyBlock("Você ainda não tem atendimentos pra gerar um relatório.");
    return;
  }

  const months = buildLastMonths(REPORT_MONTHS_COUNT);
  const counts = months.map(m => ({
    ...m,
    total: 0,
    concluidos: 0,
    cancelados: 0,
    faltas: 0
  }));

  attendances.forEach(a => {
    const ym = attendanceYearMonth(a);
    if (!ym) return;
    const bucket = counts.find(c => c.key === ym);
    if (!bucket) return;
    bucket.total += 1;
    if (a.canceled) bucket.cancelados += 1;
    else if (a.missed) bucket.faltas += 1;
    else if (a.done) bucket.concluidos += 1;
  });

  const maxTotal = Math.max(1, ...counts.map(c => c.total));
  const totalGeral = counts.reduce((sum, c) => sum + c.total, 0);
  const totalConcluidos = counts.reduce((sum, c) => sum + c.concluidos, 0);
  const totalCancelados = counts.reduce((sum, c) => sum + c.cancelados, 0);
  const totalFaltas = counts.reduce((sum, c) => sum + c.faltas, 0);

  const specialtyRanking = buildSpecialtyRanking(attendances, doctorsById);
  const doctorRanking = buildDoctorRanking(attendances, doctorsById);

  content.innerHTML = `
    <div class="report-summary">
      <div class="report-summary-item">
        <span class="report-summary-value">${totalGeral}</span>
        <span class="report-summary-label">Nos últimos ${REPORT_MONTHS_COUNT} meses</span>
      </div>
      <div class="report-summary-item">
        <span class="report-summary-value">${totalConcluidos}</span>
        <span class="report-summary-label">Finalizados</span>
      </div>
      <div class="report-summary-item">
        <span class="report-summary-value">${totalFaltas}</span>
        <span class="report-summary-label">Faltas</span>
      </div>
      <div class="report-summary-item">
        <span class="report-summary-value">${totalCancelados}</span>
        <span class="report-summary-label">Cancelados</span>
      </div>
    </div>

    <div class="report-chart">
      ${counts.map(c => `
        <div class="report-bar-col">
          <span class="report-bar-value">${c.total || ""}</span>
          <div class="report-bar-track">
            <div class="report-bar ${c.isCurrent ? "report-bar--current" : ""}" data-height="${(c.total / maxTotal) * 100}" style="height:0%;"></div>
          </div>
          <span class="report-bar-label">${c.label}</span>
        </div>
      `).join("")}
    </div>

    <h3 style="margin: 24px 0 12px;">Especialidades mais solicitadas</h3>
    ${renderRankingTable(specialtyRanking, ["Especialidade", "Atendimentos"])}

    <h3 style="margin: 24px 0 12px;">Médicos mais solicitados</h3>
    ${renderRankingTable(doctorRanking, ["Médico", "Especialidade", "Atendimentos"])}
  `;

  // Anima as barras crescendo (0% -> altura real) depois do primeiro
  // paint, pra ficar vivo como um gráfico de app de banco.
  requestAnimationFrame(() => {
    content.querySelectorAll(".report-bar").forEach(bar => {
      bar.style.height = `${bar.dataset.height}%`;
    });
  });
}

/* Conta quantas vezes cada especialidade apareceu (via o médico de
   cada atendimento), do maior pro menor. Considera todo o histórico,
   não só os últimos meses do gráfico. */
function buildSpecialtyRanking(attendances, doctorsById) {
  const counts = {};
  attendances.forEach(a => {
    const doctorId = a.user ? a.user.id : a.user_id;
    const doctor = doctorsById[doctorId];
    const specialty = (doctor && doctor.specialty) || "Não informado";
    counts[specialty] = (counts[specialty] || 0) + 1;
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([specialty, total]) => [specialty, total]);
}

/* Mesma ideia, mas por médico — mostra nome + especialidade + quantas
   vezes o paciente foi atendido/solicitou esse médico. */
function buildDoctorRanking(attendances, doctorsById) {
  const counts = {}; // id -> { name, specialty, total }
  attendances.forEach(a => {
    const doctorId = a.user ? a.user.id : a.user_id;
    const name = (a.user && a.user.name) || (doctorsById[doctorId] && doctorsById[doctorId].name) || "Não informado";
    const specialty = (doctorsById[doctorId] && doctorsById[doctorId].specialty) || "—";
    const key = doctorId || name;
    if (!counts[key]) counts[key] = { name, specialty, total: 0 };
    counts[key].total += 1;
  });
  return Object.values(counts)
    .sort((a, b) => b.total - a.total)
    .map(d => [d.name, d.specialty, d.total]);
}

/* Renderiza uma tabela simples de ranking (linhas = arrays de células). */
function renderRankingTable(rows, headers) {
  if (rows.length === 0) return emptyBlock("Sem dados suficientes ainda.");
  return `
    <table class="report-table">
      <thead>
        <tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join("")}</tr>`).join("")}
      </tbody>
    </table>
  `;
}

/* Gera os últimos N meses (mais antigo primeiro), cada um com uma
   chave "YYYY-MM" pra bater com a data dos atendimentos. */
function buildLastMonths(count) {
  const now = new Date();
  const months = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth(); // 0-11
    months.push({
      key: `${year}-${String(month + 1).padStart(2, "0")}`,
      label: MONTH_LABELS[month],
      isCurrent: i === 0
    });
  }
  return months;
}

/* Extrai "YYYY-MM" do start_date do atendimento, sem conversão de
   fuso (mesmo motivo do formatAttendanceWhen em myAppointments.js:
   os dígitos já são o horário/data local de verdade). */
function attendanceYearMonth(attendance) {
  if (!attendance.start_date) return null;
  const match = String(attendance.start_date).match(/^(\d{4})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}` : null;
}
