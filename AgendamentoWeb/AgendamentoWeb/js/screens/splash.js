/* ============================================================
   SPLASH
   ============================================================ */

function renderSplashScreen() {
  renderScreen(`
    <div class="splash">
      <img src="pad.png" alt="PAD Saúde" class="splash-logo" />
      <p style="color:rgba(255,255,255,0.7); font-size:0.95rem;">Agendamento online</p>
    </div>
  `);

  setTimeout(() => {
    navigateTo(Screens.PATIENT_VERIFICATION);
  }, 700);
}
