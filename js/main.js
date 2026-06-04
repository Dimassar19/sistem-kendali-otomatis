/**
 * main.js — Tab navigation + app initialization
 * Separation of concerns: NAVIGATION & BOOTSTRAP ONLY
 */

(function () {
  'use strict';

  // ── Tab switching ──
  const tabBtns   = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  function switchTab(target) {
    tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === target));
    tabPanels.forEach(p => p.classList.toggle('active', p.id === 'tab-' + target));
  }

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // ── Initialize renderers ──
  function initAll() {
    // Routh-Hurwitz
    const routhContainer = document.getElementById('routh-app');
    if (routhContainer && typeof RenderRouth !== 'undefined') {
      RenderRouth.init(routhContainer);
    }

    // PID
    const pidContainer = document.getElementById('pid-app');
    if (pidContainer && typeof RenderPID !== 'undefined') {
      RenderPID.init(pidContainer);
    }

    // ZN1
    const zn1Container = document.getElementById('zn1-app');
    if (zn1Container && typeof RenderZN1 !== 'undefined') {
      RenderZN1.init(zn1Container);
    }

    // ZN2
    const zn2Container = document.getElementById('zn2-app');
    if (zn2Container && typeof RenderZN2 !== 'undefined') {
      RenderZN2.init(zn2Container);
    }
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  // Resize charts when tab becomes visible (canvas needs repaint)
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Trigger resize event after tab switch for canvas redraw
      setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
    });
  });

})();