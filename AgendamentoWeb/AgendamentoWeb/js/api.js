/* ============================================================
   CAMADA DE ACESSO À AMIGOAPI
   Todas as chamadas passam por aqui. Cada função retorna
   { ok: true, data } ou { ok: false, error, status }.

   Confirmado via documentação Swagger interativa (Try it out):
   - Respostas de sucesso vêm embrulhadas em { data, status } — já
     desembrulhamos aqui, então o resto do app usa o payload puro.
   - GET /doctors/available exige event_id; aceita insurance_id,
     place_id, specialty (array de strings).
   - GET /doctors/specialties retorna um array de STRINGS (não
     objetos com id).
   - GET /doctors/{id}/available-dates: sem 'date' → array de datas
     "DD/MM/YYYY"; com 'date' (formato "YYYY-MM-DD") → array de
     horários. Também exige event_id.
   - POST /attendances espera { insurance_id, event_id, user_id
     (= id do médico), place_id, start_date: "YYYY-MM-DD HH:mm",
     patient_id }.
   ============================================================ */

/**
 * Transforma o erro cru da API (que às vezes vem como objeto de
 * validação do tipo yup: {type, params: {label}, errors: [...]})
 * em uma frase legível, pra nunca mostrar JSON cru pro usuário.
 */
function extractErrorMessage(raw) {
  if (typeof raw === "string") return raw;
  if (!raw || typeof raw !== "object") return "Ocorreu um erro inesperado. Tente novamente.";

  if (Array.isArray(raw.errors) && raw.errors.length && typeof raw.errors[0] === "string") {
    return raw.errors.join(" ");
  }

  const label = raw.params && raw.params.label;
  if (raw.type === "invalidFormat" && label) {
    return `${label} inválido. Verifique os dados informados.`;
  }
  if (label) {
    return `Verifique o campo "${label}" e tente novamente.`;
  }

  return "Ocorreu um erro inesperado. Tente novamente.";
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": `${AMIGO_CONFIG.authScheme} ${AMIGO_CONFIG.token}`
  };
}

async function amigoFetch(path, options = {}) {
  const url = `${AMIGO_CONFIG.baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
  try {
    const response = await fetch(url, {
      ...options,
      headers: { ...authHeaders(), ...(options.headers || {}) }
    });

    const contentType = response.headers.get("content-type") || "";
    const body = contentType.includes("application/json")
      ? await response.json().catch(() => null)
      : null;

    if (!response.ok) {
      let message = `Erro ${response.status}: ${response.statusText}`;
      if (body) {
        const raw = body.message || body.error || body;
        message = extractErrorMessage(raw);
      }
      return { ok: false, status: response.status, error: message };
    }

    const unwrapped = body && typeof body === "object" && "data" in body ? body.data : body;
    return { ok: true, status: response.status, data: unwrapped };
  } catch (err) {
    return { ok: false, error: "Falha de conexão. Verifique sua internet e tente novamente." };
  }
}

function buildQuery(params) {
  const usp = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") return;
    if (Array.isArray(value)) {
      value.forEach(v => usp.append(`${key}[]`, v));
    } else {
      usp.append(key, value);
    }
  });
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

const AmigoAPI = {
  // ---------- Pacientes ----------
  patientExists(cpf) {
    const qs = buildQuery({ cpf });
    return amigoFetch(`patients/exists${qs}`);
  },
  findPatient(patientId) {
    return amigoFetch(`patients/${patientId}`);
  },
  createPatient(patient) {
    return amigoFetch("patients", { method: "POST", body: JSON.stringify(patient) });
  },
  updatePatient(patientId, patient) {
    return amigoFetch(`patients/${patientId}`, { method: "PUT", body: JSON.stringify(patient) });
  },

  // ---------- Convênios ----------
  getInsurances() {
    return amigoFetch("insurances");
  },
  getInsurancePlans(insuranceGroupId) {
    return amigoFetch(`insurances/plans/${insuranceGroupId}`);
  },

  // ---------- Médicos ----------
  getSpecialties({ insuranceId, placeId } = {}) {
    const qs = buildQuery({ insurance_id: insuranceId, place_id: placeId });
    return amigoFetch(`doctors/specialties${qs}`);
  },
  getDoctors({ toConfirm } = {}) {
    const qs = buildQuery({ to_confirm: toConfirm });
    return amigoFetch(`doctors${qs}`);
  },
  getAvailableDoctors({ eventId, insuranceId, placeId, specialty } = {}) {
    const qs = buildQuery({
      event_id: eventId,
      insurance_id: insuranceId,
      place_id: placeId,
      specialty: specialty ? [specialty] : null
    });
    return amigoFetch(`doctors/available${qs}`);
  },
  getAvailableDates(doctorId, { eventId, insuranceId, placeId, patientId, date, gender, born } = {}) {
    const qs = buildQuery({
      event_id: eventId,
      insurance_id: insuranceId,
      place_id: placeId,
      patient_id: patientId,
      date,
      gender,
      born
    });
    return amigoFetch(`doctors/${doctorId}/available-dates${qs}`);
  },

  // ---------- Atendimentos ----------
  createAttendance(request) {
    return amigoFetch("attendances", { method: "POST", body: JSON.stringify(request) });
  },
  getAttendancesByPatient(patientId) {
    return amigoFetch(`attendances/${patientId}`);
  },
  cancelAttendance(id) {
    return amigoFetch(`attendances/cancel/${id}`, { method: "PUT" });
  },
  rescheduleAttendance(id, newDate) {
    return amigoFetch(`attendances/${id}/reschedule`, {
      method: "PUT",
      body: JSON.stringify({ date: newDate }) // formato "YYYY-MM-DD HH:mm"
    });
  },

  // ---------- Geral ----------
  getPlaces() {
    return amigoFetch("places");
  },
  getEvents({ insuranceId, placeId, userId } = {}) {
    const qs = buildQuery({ insurance_id: insuranceId, place_id: placeId, user_id: userId });
    return amigoFetch(`events${qs}`);
  }
};
