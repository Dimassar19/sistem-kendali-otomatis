/**
 * render-zn2.js — UI renderer for Ziegler-Nichols Method 2 (Closed Loop / Ultimate Gain)
 */

const RenderZN2 = (() => {

  function init(container) {
    Utils.clear(container);

    container.innerHTML = `
      <div class="calc-container">

        <!-- INPUT PANEL -->
        <div class="panel-card">
          <div class="panel-title">◎ Input Parameter Kritis</div>
          <div class="info-strip">
            <strong>Metode ZN-2 (Closed Loop)</strong> — Berdasarkan penguatan kritis & periode osilasi.<br>
            Langkah: Set kontroler ke <strong>Pure-P</strong> → naikkan Kp sampai sistem berosilasi stabil
            → catat <strong>Ku</strong> dan <strong>Tu</strong>.
          </div>

          <div class="field-row">
            <div class="field-group">
              <label class="field-label">Ku — Ultimate Gain (Penguatan Kritis)</label>
              <input class="field-input" id="zn2-Ku" type="number" step="any" placeholder="cth: 10.0" />
              <div class="field-hint">Nilai Kp saat sistem mulai berosilasi stabil</div>
            </div>
            <div class="field-group">
              <label class="field-label">Tu — Ultimate Period (s)</label>
              <input class="field-input" id="zn2-Tu" type="number" step="any" placeholder="cth: 4.0" />
              <div class="field-hint">Periode osilasi pada kondisi kritis (detik)</div>
            </div>
          </div>

          <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
            <button class="btn-calc" id="zn2-calc-btn">▶ HITUNG TUNING</button>
            <button class="btn-reset" id="zn2-reset-btn">↺ Reset</button>
          </div>

          <!-- Quick examples -->
          <div style="margin-top:1.2rem;">
            <div class="field-label">Contoh Cepat:</div>
            <div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.4rem;" id="zn2-examples">
              <button class="btn-example" data-ku="10"  data-tu="4">Ku=10, Tu=4</button>
              <button class="btn-example" data-ku="5"   data-tu="2">Ku=5,  Tu=2</button>
              <button class="btn-example" data-ku="20"  data-tu="8">Ku=20, Tu=8</button>
              <button class="btn-example" data-ku="3.5" data-tu="1.5">Ku=3.5, Tu=1.5</button>
            </div>
          </div>
        </div>

        <!-- RESULT: FREQUENCY INFO -->
        <div class="panel-card">
          <div class="panel-title">◈ Informasi Frekuensi Kritis</div>
          <div class="result-box" id="zn2-freq-box">
            <div class="result-empty">— Masukkan Ku dan Tu lalu tekan HITUNG —</div>
          </div>
        </div>

        <!-- RESULT: ZN CLASSIC TABLE -->
        <div class="panel-card full-width">
          <div class="panel-title">◫ Tuning ZN Classic (Agresif ~25% Overshoot)</div>
          <div class="result-box" id="zn2-zn-box" style="min-height:80px;overflow-x:auto;">
            <div class="result-empty">— Belum ada data —</div>
          </div>
        </div>

        <!-- RESULT: TYREUS-LUYBEN TABLE -->
        <div class="panel-card full-width">
          <div class="panel-title">◫ Tuning Tyreus-Luyben (Moderat ~10-15% Overshoot)</div>
          <div class="result-box" id="zn2-tl-box" style="min-height:80px;overflow-x:auto;">
            <div class="result-empty">— Belum ada data —</div>
          </div>
        </div>

        <!-- RESULT: VARIANTS -->
        <div class="panel-card full-width">
          <div class="panel-title">◫ Variant Tuning Lainnya</div>
          <div class="result-box" id="zn2-variant-box" style="min-height:80px;overflow-x:auto;">
            <div class="result-empty">— Belum ada data —</div>
          </div>
        </div>

        <!-- RESULT: ANALYSIS -->
        <div class="panel-card full-width">
          <div class="panel-title">◉ Analisis & Panduan Pemilihan Metode</div>
          <div class="result-box" id="zn2-analysis-box" style="min-height:80px;">
            <div class="result-empty">— Belum ada data —</div>
          </div>
        </div>

      </div>
    `;

    // Example buttons
    container.querySelectorAll('#zn2-examples .btn-example').forEach(btn => {
      styleExampleBtn(btn);
      btn.addEventListener('click', () => {
        document.getElementById('zn2-Ku').value = btn.dataset.ku;
        document.getElementById('zn2-Tu').value = btn.dataset.tu;
      });
    });

    document.getElementById('zn2-calc-btn').addEventListener('click', runCalc);
    document.getElementById('zn2-reset-btn').addEventListener('click', resetAll);
  }

  function runCalc() {
    const Ku = parseFloat(document.getElementById('zn2-Ku').value);
    const Tu = parseFloat(document.getElementById('zn2-Tu').value);

    if (isNaN(Ku) || isNaN(Tu)) {
      showError('Isi nilai Ku dan Tu dengan angka yang valid.');
      return;
    }

    const res = CalcZN2.compute(Ku, Tu);
    if (res.error) { showError(res.error); return; }

    renderFreq(res);
    renderZNTable(res);
    renderTLTable(res);
    renderVariants(res);
    renderAnalysis(res);
  }

  function renderFreq(res) {
    const box = document.getElementById('zn2-freq-box');
    box.innerHTML = `
      <div class="result-row">
        <span class="result-key">Ultimate Gain (Ku)</span>
        <span class="result-val">${Utils.fmt(res.ultimateGain)}</span>
      </div>
      <div class="result-row">
        <span class="result-key">Ultimate Period (Tu)</span>
        <span class="result-val">${Utils.fmt(res.ultimatePeriod)} s</span>
      </div>
      <div class="result-row">
        <span class="result-key">Ultimate Frequency (ωu)</span>
        <span class="result-val">${Utils.fmt(res.ultimateFreqRad)} rad/s</span>
      </div>
      <div class="result-row">
        <span class="result-key">Ultimate Frequency (fu)</span>
        <span class="result-val">${Utils.fmt(res.ultimateFreqHz)} Hz</span>
      </div>
      <div class="result-row">
        <span class="result-key">Gain Margin (ZN PID)</span>
        <span class="result-val">${Utils.fmt(res.gainMargin_dB)} dB</span>
      </div>
      <div class="result-row">
        <span class="result-key">Phase Margin (est.)</span>
        <span class="result-val warn">${res.phaseMargin_est}</span>
      </div>
      <div class="result-row">
        <span class="result-key">Bandwidth Estimate</span>
        <span class="result-val">${Utils.fmt(res.bandwidth_est)} rad/s</span>
      </div>
    `;
  }

  function renderZNTable(res) {
    const box = document.getElementById('zn2-zn-box');
    const zn  = res.ZN;
    box.innerHTML = `
      <table class="routh-table">
        <thead>
          <tr>
            <th>Tipe</th>
            <th>Kp</th><th>Ti (s)</th><th>Td (s)</th><th>Ki</th><th>Kd</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="row-label">P</td>
            <td>${Utils.fmt(zn.P.Kp)}</td>
            <td>—</td><td>—</td><td>—</td><td>—</td>
          </tr>
          <tr>
            <td class="row-label">PI</td>
            <td>${Utils.fmt(zn.PI.Kp)}</td>
            <td>${Utils.fmt(zn.PI.Ti)}</td>
            <td>—</td>
            <td>${Utils.fmt(zn.PI.Ki)}</td>
            <td>—</td>
          </tr>
          <tr>
            <td class="row-label">PD</td>
            <td>${Utils.fmt(zn.PD.Kp)}</td>
            <td>—</td>
            <td>${Utils.fmt(zn.PD.Td)}</td>
            <td>—</td>
            <td>${Utils.fmt(zn.PD.Kd)}</td>
          </tr>
          <tr style="background:rgba(0,255,231,.05);">
            <td class="row-label" style="color:var(--accent1);">PID ★</td>
            <td>${Utils.fmt(zn.PID.Kp)}</td>
            <td>${Utils.fmt(zn.PID.Ti)}</td>
            <td>${Utils.fmt(zn.PID.Td)}</td>
            <td>${Utils.fmt(zn.PID.Ki)}</td>
            <td>${Utils.fmt(zn.PID.Kd)}</td>
          </tr>
        </tbody>
      </table>
      <div class="formula-box" style="margin-top:.8rem;">
        <strong>Formula ZN Classic:</strong><br>
        P: Kp = 0.5·Ku &nbsp;|&nbsp;
        PI: Kp = 0.45·Ku, Ti = Tu/1.2<br>
        PID: Kp = 0.6·Ku, Ti = Tu/2, Td = Tu/8
      </div>
    `;
  }

  function renderTLTable(res) {
    const box = document.getElementById('zn2-tl-box');
    const tl  = res.TL;
    box.innerHTML = `
      <table class="routh-table">
        <thead>
          <tr>
            <th>Tipe</th>
            <th>Kp</th><th>Ti (s)</th><th>Td (s)</th><th>Ki</th><th>Kd</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="row-label">PI</td>
            <td>${Utils.fmt(tl.PI.Kp)}</td>
            <td>${Utils.fmt(tl.PI.Ti)}</td>
            <td>—</td>
            <td>${Utils.fmt(tl.PI.Ki)}</td>
            <td>—</td>
          </tr>
          <tr style="background:rgba(123,97,255,.05);">
            <td class="row-label" style="color:var(--accent3);">PID ★</td>
            <td>${Utils.fmt(tl.PID.Kp)}</td>
            <td>${Utils.fmt(tl.PID.Ti)}</td>
            <td>${Utils.fmt(tl.PID.Td)}</td>
            <td>${Utils.fmt(tl.PID.Ki)}</td>
            <td>${Utils.fmt(tl.PID.Kd)}</td>
          </tr>
        </tbody>
      </table>
      <div class="formula-box" style="margin-top:.8rem;border-color:rgba(123,97,255,.25);color:var(--accent3);">
        <strong>Formula Tyreus-Luyben:</strong><br>
        PI: Kp = Ku/3.2, Ti = 2.2·Tu<br>
        PID: Kp = Ku/2.2, Ti = 2.2·Tu, Td = Tu/6.3
      </div>
    `;
  }

  function renderVariants(res) {
    const box  = document.getElementById('zn2-variant-box');
    const pess = res.Pessen.PID;
    const no   = res.NoOvershoot.PID;
    box.innerHTML = `
      <table class="routh-table">
        <thead>
          <tr>
            <th>Metode</th>
            <th>Kp</th><th>Ti (s)</th><th>Td (s)</th><th>Ki</th><th>Kd</th>
            <th>Est. Overshoot</th>
          </tr>
        </thead>
        <tbody>
          <tr style="background:rgba(255,107,53,.04);">
            <td class="row-label" style="color:var(--accent2);">Pessen (PID)</td>
            <td>${Utils.fmt(pess.Kp)}</td>
            <td>${Utils.fmt(pess.Ti)}</td>
            <td>${Utils.fmt(pess.Td)}</td>
            <td>${Utils.fmt(pess.Ki)}</td>
            <td>${Utils.fmt(pess.Kd)}</td>
            <td style="color:var(--accent2);">~5%</td>
          </tr>
          <tr style="background:rgba(57,255,20,.04);">
            <td class="row-label" style="color:var(--green);">No Overshoot (PID)</td>
            <td>${Utils.fmt(no.Kp)}</td>
            <td>${Utils.fmt(no.Ti)}</td>
            <td>${Utils.fmt(no.Td)}</td>
            <td>${Utils.fmt(no.Ki)}</td>
            <td>${Utils.fmt(no.Kd)}</td>
            <td style="color:var(--green);">~0%</td>
          </tr>
        </tbody>
      </table>
      <div class="formula-box" style="margin-top:.8rem;border-color:rgba(255,107,53,.25);color:var(--accent2);">
        <strong>Pessen Integral Rule:</strong> Kp = 0.7·Ku, Ti = 0.4·Tu, Td = 0.15·Tu<br>
        <strong>No Overshoot:</strong> Kp = 0.2·Ku, Ti = Tu/2, Td = Tu/3
      </div>
    `;
  }

  function renderAnalysis(res) {
    const box = document.getElementById('zn2-analysis-box');
    const guide = res.overshootGuide;
    box.innerHTML = `
      <div style="margin-bottom:.8rem;">
        <div class="field-label" style="margin-bottom:.5rem;">Panduan Pemilihan Metode Tuning:</div>
        ${[
          { label: 'ZN Classic',      val: guide.ZN,          color: 'var(--yellow)',  badge: 'AGRESIF'   },
          { label: 'Tyreus-Luyben',   val: guide.TyreusLuyben,color: 'var(--accent3)', badge: 'MODERAT'   },
          { label: 'Pessen',          val: guide.Pessen,       color: 'var(--accent2)', badge: 'RINGAN'    },
          { label: 'No Overshoot',    val: guide.NoOvershoot,  color: 'var(--green)',   badge: 'KONSERVATIF'},
        ].map(m => `
          <div style="display:flex;align-items:flex-start;gap:.7rem;padding:.45rem 0;border-bottom:1px solid rgba(255,255,255,.04);">
            <span style="font-family:var(--font-mono);font-size:.68rem;padding:.2rem .55rem;
              border:1px solid ${m.color};color:${m.color};border-radius:2px;white-space:nowrap;
              min-width:90px;text-align:center;">${m.badge}</span>
            <div>
              <span style="font-family:var(--font-mono);font-size:.75rem;color:var(--text-main);">${m.label}</span>
              <div style="font-family:var(--font-mono);font-size:.72rem;color:var(--text-dim);margin-top:.15rem;">${m.val}</div>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="formula-box" style="margin-top:.5rem;">
        <strong>Cara Mendapatkan Ku & Tu:</strong><br>
        1. Set kontroler ke Pure-P (Ti = ∞, Td = 0)<br>
        2. Jalankan sistem closed-loop dengan setpoint step<br>
        3. Naikkan Kp perlahan hingga output berosilasi <em>stabil & berkelanjutan</em><br>
        4. Catat nilai Kp saat itu → <strong>Ku</strong><br>
        5. Ukur periode osilasi → <strong>Tu</strong>
      </div>
    `;
  }

  function showError(msg) {
    ['zn2-freq-box','zn2-zn-box','zn2-tl-box','zn2-variant-box','zn2-analysis-box'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = `<div class="result-val error">✖ ${msg}</div>`;
    });
  }

  function resetAll() {
    ['zn2-Ku','zn2-Tu'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    ['zn2-freq-box','zn2-zn-box','zn2-tl-box','zn2-variant-box','zn2-analysis-box'].forEach(id => {
      document.getElementById(id).innerHTML = `<div class="result-empty">— Belum ada data —</div>`;
    });
  }

  function styleExampleBtn(btn) {
    btn.style.cssText = `
      font-family:var(--font-mono);font-size:.7rem;padding:.35rem .8rem;
      background:rgba(0,255,231,.07);border:1px solid var(--border);
      color:var(--text-dim);cursor:pointer;border-radius:var(--radius);
      transition:all .2s;letter-spacing:.06em;
    `;
    btn.addEventListener('mouseenter', () => { btn.style.borderColor='var(--accent1)'; btn.style.color='var(--accent1)'; });
    btn.addEventListener('mouseleave', () => { btn.style.borderColor='var(--border)';  btn.style.color='var(--text-dim)'; });
  }

  return { init };
})();