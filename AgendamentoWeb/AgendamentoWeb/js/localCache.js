/* ============================================================
   CACHE LOCAL (localStorage)
   A AmigoAPI não devolve gender/born/endereço nas consultas de
   paciente — só aceita no envio. Guardamos esses campos aqui,
   por paciente, pra continuarem aparecendo no app mesmo depois
   de fechar e reabrir (mesmo navegador/dispositivo).
   ============================================================ */

function localProfileKey(patientId) {
  return `agendamento_perfil_extra_${patientId}`;
}

function saveExtraProfile(patientId, data) {
  if (!patientId) return;
  try {
    const current = loadExtraProfile(patientId) || {};
    const merged = { ...current, ...data };
    localStorage.setItem(localProfileKey(patientId), JSON.stringify(merged));
  } catch (err) {
    // localStorage pode estar indisponível (modo privado, etc.) — sem problema,
    // o app continua funcionando, só sem esse cache extra.
  }
}

function loadExtraProfile(patientId) {
  if (!patientId) return null;
  try {
    const raw = localStorage.getItem(localProfileKey(patientId));
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

/* ---------- Marcação de atendimentos reagendados ----------
   A AmigoAPI não distingue "reagendado" de "agendado" nos dados —
   ela só troca o start_date mantendo o mesmo id/status. Marcamos
   aqui, localmente, quais IDs foram reagendados pelo próprio app. */

const RESCHEDULED_IDS_KEY = "agendamento_reagendados_ids";

function markAttendanceRescheduled(attendanceId) {
  try {
    const ids = new Set(JSON.parse(localStorage.getItem(RESCHEDULED_IDS_KEY) || "[]"));
    ids.add(attendanceId);
    localStorage.setItem(RESCHEDULED_IDS_KEY, JSON.stringify([...ids]));
  } catch (err) {
    // sem problema, só não vai aparecer separado no grupo "Reagendados"
  }
}

function isAttendanceRescheduled(attendanceId) {
  try {
    const ids = JSON.parse(localStorage.getItem(RESCHEDULED_IDS_KEY) || "[]");
    return ids.includes(attendanceId);
  } catch (err) {
    return false;
  }
}
