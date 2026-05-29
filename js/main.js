/**
 * main.js — Tab navigation + app initialization
 */

document.addEventListener('DOMContentLoaded', () => {

  // ── Tab switching ──────────────────────────────────────────────
  const tabBtns   = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;

      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(`tab-${target}`).classList.add('active');
    });
  });

  // ── Render all calculator UIs ──────────────────────────────────
  RenderRouth.init(document.getElementById('routh-app'));
  RenderPID.init(document.getElementById('pid-app'));
  RenderZN1.init(document.getElementById('zn1-app'));
  RenderZN2.init(document.getElementById('zn2-app'));  // ← baris ini yang hilang!

});