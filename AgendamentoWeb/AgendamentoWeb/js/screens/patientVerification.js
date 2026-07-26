/* ============================================================
   VERIFICAÇÃO DE PACIENTE — GET /patients/exists?cpf=...
   Resposta de sucesso já traz o paciente (objeto único, ou array
   se a busca encontrar mais de um cadastro).
   404 = não encontrado (confirmado em produção: "Paciente não
   encontrado.") → segue pro cadastro.
   ============================================================ */

function renderPatientVerificationScreen() {
  renderScreen(`
    <div class="screen">
      ${screenHeader("Bem-vindo", "Vamos começar", "Informe seu CPF para localizarmos seu cadastro.")}

      <div id="verification-alert"></div>

      <div class="field" id="cpf-field">
        <label for="cpf-input">CPF</label>
        <input id="cpf-input" type="text" inputmode="numeric" placeholder="000.000.000-00" autofocus />
      </div>

      <div id="verification-progress" class="progress-bar" style="display:none;">
        <div class="progress-bar-fill"></div>
      </div>

      <button class="btn btn-primary" id="verify-btn">Continuar</button>

      <a href="#promo-card" id="promo-card-link" class="promo-card-teaser">Conheça nosso cartão de desconto ↓</a>

      <div class="promo-card" id="promo-card">
        <img src="https://padsaude.com.br/images/cartao-pad/cartao.webp" alt="Cartão PAD Saúde+" class="promo-card-image" />
        <div class="promo-card-body">
          <span class="promo-card-eyebrow">Cartão PAD Saúde+</span>
          <h2 class="promo-card-title">Mais acesso à saúde. <span class="promo-card-title-accent">Menos complicação.</span></h2>
          <p class="promo-card-text">Benefícios, descontos e soluções de cuidado para você organizar a saúde da família com mais previsibilidade, tecnologia e acolhimento.</p>
          <div class="promo-card-actions">
            <a class="btn-promo btn-promo-primary" href="https://wa.me/5581921434317" target="_blank" rel="noopener">Falar com um consultor</a>
          </div>
          <p class="promo-card-disclaimer">O Cartão PAD Saúde+ é um cartão de benefícios e descontos em saúde. Não é plano de saúde, seguro saúde ou convênio médico.</p>
        </div>
      </div>
    </div>
  `);

  const promoLink = document.getElementById("promo-card-link");
  if (promoLink) {
    promoLink.addEventListener("click", (e) => {
      e.preventDefault();
      document.getElementById("promo-card").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  const input = document.getElementById("cpf-input");
  const btn = document.getElementById("verify-btn");
  const field = document.getElementById("cpf-field");
  const alertBox = document.getElementById("verification-alert");
  const progressBar = document.getElementById("verification-progress");

  btn.addEventListener("click", async () => {
    const cpf = input.value.replace(/\D/g, "");

    if (cpf.length !== 11) {
      field.classList.add("error");
      alertBox.innerHTML = errorBlock("Informe um CPF válido, com 11 dígitos.");
      return;
    }

    if (!isValidCPF(cpf)) {
      field.classList.add("error");
      alertBox.innerHTML = errorBlock("Esse CPF não é válido. Verifique os números digitados.");
      return;
    }
    field.classList.remove("error");
    alertBox.innerHTML = "";
    btn.disabled = true;
    btn.textContent = "Verificando...";
    progressBar.style.display = "block";

    const result = await AmigoAPI.patientExists(cpf);

    btn.disabled = false;
    btn.textContent = "Continuar";
    progressBar.style.display = "none";

    if (!result.ok) {
      // Confirmado em produção: a API devolve 404 com a mensagem
      // "Paciente não encontrado." para CPF não cadastrado.
      if (result.status === 404) {
        navigateTo(Screens.PATIENT_REGISTRATION, { cpf });
        return;
      }
      alertBox.innerHTML = errorBlock(result.error);
      return;
    }

    // Pode vir um objeto único ou uma lista (se a busca bater com mais de um cadastro).
    const found = Array.isArray(result.data) ? result.data[0] : result.data;

    if (found && found.id) {
      const extra = loadExtraProfile(found.id);
      AppState.patient = extra ? { ...found, ...extra } : found;
      navigateTo(Screens.MY_APPOINTMENTS);
    } else {
      navigateTo(Screens.PATIENT_REGISTRATION, { cpf });
    }
  });
}
