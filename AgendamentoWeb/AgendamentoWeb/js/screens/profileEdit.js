/* ============================================================
   ATUALIZAR PERFIL — PUT /patients/{patientId}
   Só nome, CPF (travado), e-mail e telefone. Gênero e data de
   nascimento não são editáveis aqui — ficam como foram salvos
   no cadastro (cache local, ver saveExtraProfile).
   ============================================================ */

function renderProfileEditScreen() {
  const patient = AppState.patient || {};
  const telefoneAtual = patient.contact_cellphone || "";

  renderScreen(`
    <div class="screen">
      ${screenHeader("Meu perfil", "Atualizar dados", "Altere o que quiser e salve.")}

      <div id="profile-alert"></div>

      <form id="profile-form">
        <div class="form-section-title">Identificação</div>
        <div class="field">
          <label for="nome">Nome completo*</label>
          <input id="nome" required value="${patient.name || ""}" />
        </div>
        <div class="field">
          <label for="cpf">CPF</label>
          <input id="cpf" value="${patient.cpf || ""}" readonly disabled style="background:var(--color-primary-soft); color:var(--color-text-muted); cursor:not-allowed;" />
        </div>

        <div class="form-section-title">Contato</div>
        <div class="field">
          <label for="email">E-mail</label>
          <input id="email" type="email" value="${patient.email || ""}" />
        </div>
        <div class="field">
          <label for="telefone">Telefone*</label>
          <input id="telefone" type="tel" required value="${telefoneAtual}" />
        </div>

        <button type="submit" class="btn btn-primary" id="save-profile-btn">Salvar alterações</button>
        <button type="button" class="btn btn-outline" id="cancel-profile-btn" style="margin-top:12px;">Cancelar</button>
      </form>
    </div>
  `);

  document.getElementById("cancel-profile-btn").addEventListener("click", () => {
    navigateTo(Screens.MY_APPOINTMENTS);
  });

  const form = document.getElementById("profile-form");
  const alertBox = document.getElementById("profile-alert");
  const saveBtn = document.getElementById("save-profile-btn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nome = document.getElementById("nome").value.trim();
    const telefone = document.getElementById("telefone").value.trim();

    if (!nome || !telefone) {
      alertBox.innerHTML = errorBlock("Nome e telefone são obrigatórios.");
      return;
    }

    const telefoneDigits = telefone.replace(/\D/g, "");

    // A API devolve o CPF mascarado (ex: ***.438.584-**) nas consultas.
    // Só reenviamos o CPF se o usuário tiver digitado um valor novo, sem
    // asteriscos — nunca reenviamos o valor mascarado de volta.
    const cpfInput = document.getElementById("cpf").value.trim();
    const cpfDigits = cpfInput.replace(/\D/g, "");
    const cpfIsMasked = cpfInput.includes("*");

    const update = {
      name: nome,
      email: document.getElementById("email").value.trim() || null,
      contact_cellphone: telefoneDigits
    };
    if (!cpfIsMasked && cpfDigits.length === 11) {
      if (!isValidCPF(cpfDigits)) {
        alertBox.innerHTML = errorBlock("Esse CPF não é válido. Verifique os números digitados.");
        return;
      }
      update.cpf = cpfDigits;
    }

    alertBox.innerHTML = "";
    saveBtn.disabled = true;
    saveBtn.textContent = "Salvando...";

    const result = await AmigoAPI.updatePatient(patient.id, update);

    saveBtn.disabled = false;
    saveBtn.textContent = "Salvar alterações";

    if (!result.ok) {
      alertBox.innerHTML = errorBlock(result.error);
      return;
    }

    AppState.patient = { ...AppState.patient, ...update, ...(result.data || {}) };
    navigateTo(Screens.MY_APPOINTMENTS);
  });
}
