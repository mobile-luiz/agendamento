/* ============================================================
   ROTEADOR PRINCIPAL
   Troca de tela simples baseada em estado (sem hash routing,
   já que o fluxo é sempre sequencial).

   Histórico próprio: como é tudo renderizado via innerHTML, o
   botão "voltar" do navegador não navega dentro do fluxo (ele
   sai do app). Por isso mantemos uma pilha própria e um botão
   de voltar (id="back-btn") que as telas podem incluir.
   ============================================================ */

let _navHistory = [];
let _currentScreen = null;
let _currentParams = null;

function navigateTo(screen, params, options = {}) {
  if (!options.skipHistory && _currentScreen && _currentScreen !== screen) {
    _navHistory.push({ screen: _currentScreen, params: _currentParams });
  }
  if (options.resetHistory) {
    _navHistory = [];
  }

  _currentScreen = screen;
  _currentParams = params;

  switch (screen) {
    case Screens.SPLASH:
      renderSplashScreen();
      break;
    case Screens.PATIENT_VERIFICATION:
      renderPatientVerificationScreen();
      break;
    case Screens.PATIENT_REGISTRATION:
      renderPatientRegistrationScreen(params);
      break;
    case Screens.PLACE_SELECTION:
      renderPlaceSelectionScreen();
      break;
    case Screens.SPECIALTY_SELECTION:
      renderSpecialtySelectionScreen();
      break;
    case Screens.EVENT_SELECTION:
      renderEventSelectionScreen();
      break;
    case Screens.DOCTOR_SELECTION:
      renderDoctorSelectionScreen();
      break;
    case Screens.DATE_TIME_SELECTION:
      renderDateTimeSelectionScreen();
      break;
    case Screens.CONFIRMATION:
      renderConfirmationScreen();
      break;
    case Screens.MY_APPOINTMENTS:
      renderMyAppointmentsScreen();
      break;
    case Screens.PROFILE_EDIT:
      renderProfileEditScreen();
      break;
    case Screens.RESCHEDULE:
      renderRescheduleScreen();
      break;
    case Screens.REPORTS:
      renderReportsScreen();
      break;
    default:
      renderSplashScreen();
  }

  window.scrollTo(0, 0);

  // Se a tela renderizada incluir um botão com id="back-btn", conectamos
  // ele automaticamente ao histórico interno — as telas não precisam
  // implementar isso na mão, só incluir o botão no HTML.
  const backBtn = document.getElementById("back-btn");
  if (backBtn) {
    backBtn.addEventListener("click", goBack);
  }
}

function goBack() {
  const previous = _navHistory.pop();
  if (previous) {
    navigateTo(previous.screen, previous.params, { skipHistory: true });
  } else {
    navigateTo(Screens.MY_APPOINTMENTS, null, { skipHistory: true });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  navigateTo(Screens.SPLASH);
});
