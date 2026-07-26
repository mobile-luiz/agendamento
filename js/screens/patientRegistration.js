/* ============================================================
   CADASTRO COMPLETO DO PACIENTE — POST /patients
   Campos enviados: name, cpf, born, email, contact_cellphone.

   OBS: o campo de data de nascimento ("born") NÃO aparece no
   schema documentado do Patient, mas o servidor exige e valida
   de verdade — sem ele o cadastro é rejeitado com "Born é
   inválido.". Formato confirmado: "YYYY-MM-DD" (mesmo formato
   do <input type="date">). O campo "gender" foi retirado do
   formulário (não é mais coletado nem enviado).
   ============================================================ */

function renderPatientRegistrationScreen(params) {
  const cpfInicial = (params && params.cpf) || "";
  const telefoneInicial = (params && params.telefone) || "";

  renderScreen(`
    <div class="screen">
      ${screenHeader("Cadastro", "Seus dados", "Preencha seu cadastro para continuarmos com o agendamento.")}

      <div id="registration-alert"></div>

      <form id="registration-form">
        <div class="form-section-title">Identificação</div>
        <div class="field">
          <label for="nome">Nome completo*</label>
          <input id="nome" required />
        </div>
        <div class="field">
          <label for="cpf">CPF*</label>
          <input id="cpf" required inputmode="numeric" placeholder="000.000.000-00" value="${cpfInicial}" />
        </div>
        <div class="field">
          <label for="data_nascimento">Data de nascimento*</label>
          <input id="data_nascimento" type="date" required />
        </div>

        <div class="form-section-title">Contato</div>
        <div class="field">
          <label for="email">E-mail</label>
          <input id="email" type="email" placeholder="voce@email.com" />
        </div>
        <div class="field">
          <label for="telefone">Telefone*</label>
          <input id="telefone" type="tel" value="${telefoneInicial}" required />
        </div>

        <button type="submit" class="btn btn-primary" id="submit-btn">Salvar e continuar</button>
      </form>
    </div>
  `);

  const form = document.getElementById("registration-form");
  const alertBox = document.getElementById("registration-alert");
  const submitBtn = document.getElementById("submit-btn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nome = document.getElementById("nome").value.trim();
    const telefone = document.getElementById("telefone").value.trim();
    const cpf = document.getElementById("cpf").value.replace(/\D/g, "");
    const bornInput = document.getElementById("data_nascimento").value; // yyyy-mm-dd

    if (!nome || !telefone || !cpf) {
      alertBox.innerHTML = errorBlock("Nome, CPF e telefone são obrigatórios.");
      return;
    }
    if (!isValidCPF(cpf)) {
      alertBox.innerHTML = errorBlock("Esse CPF não é válido. Verifique os números digitados.");
      return;
    }
    if (!bornInput) {
      alertBox.innerHTML = errorBlock("Informe a data de nascimento.");
      return;
    }

    const telefoneDigits = telefone.replace(/\D/g, "");

    const patient = {
      name: nome,
      cpf: cpf,
      born: bornInput,
      email: document.getElementById("email").value.trim() || null,
      contact_cellphone: telefoneDigits
      // "born" não aparece no schema documentado do Patient, mas o
      // servidor exige e rejeita o cadastro sem ele ("Born é inválido.").
      // Formato confirmado: "YYYY-MM-DD" (mesmo formato do <input type="date">).
    };

    alertBox.innerHTML = "";
    submitBtn.disabled = true;
    submitBtn.textContent = "Salvando...";

    const result = await AmigoAPI.createPatient(patient);

    submitBtn.disabled = false;
    submitBtn.textContent = "Salvar e continuar";

    if (!result.ok) {
      alertBox.innerHTML = errorBlock(result.error);
      return;
    }

    AppState.patient = result.data;
    // A API não devolve born nas consultas — guardamos aqui
    // localmente pra continuar aparecendo pro paciente nesse navegador.
    if (result.data && result.data.id) {
      saveExtraProfile(result.data.id, {
        born: bornInput
      });
      AppState.patient = { ...result.data, ...loadExtraProfile(result.data.id) };
    }
    navigateTo(Screens.PLACE_SELECTION);
  });
}
