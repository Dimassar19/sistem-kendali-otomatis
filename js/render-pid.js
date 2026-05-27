/**
 * render-pid.js — UI renderer for PID Controller tab
 */

const RenderPID = (() => {

  function init(container) {
    Utils.clear(container);

    container.innerHTML = `
      <div class="calc-container">

        <!-- INPUT PANEL -->
        <div class="panel-card">
          <div class="panel-title">⟳ Input Parameter PID</div>
          <div class="info-strip">
            Masukkan parameter PID dalam salah satu bentuk.
            <strong>Kp, Ti, Td</strong> (Ideal) atau <strong>Kp, Ki, Kd</strong> (Paralel).
          </div>

          <div class="field-group">
            <label class="field-label">Mode Input</label>
            <select class="field-select" id="pid-mode">
              <option value="KpTiTd">Kp, Ti, Td — Bentuk Ideal / Standar</option>
              <option value="KpKiKd">Kp, Ki, Kd — Bentuk Paralel</option>
            </select>
          </div>

          <div id="pid-fields-KpTiTd">
            <div class="field-row">
              <div class="field-group">
                <label class="field-label">Kp — Proportional Gain</label>
                <input class="field-input" id="pid-Kp-a" type="number" step="any" placeholder="cth: 2.5" />
              </div>
              <div class="field-group">
                <label class="field-label">Ti — Integral Time (s)</label>
                <input class="field-input" id="pid-Ti" type="number" step="any" placeholder="cth: 1.2  (0 = nonaktif)" />
              </div>
            </div>
            <div class="field-group">
              <label class="field-label">Td — Derivative Time (s)</label>
              <input class="field-input" id="pid-Td" type="number" step="any" placeholder="cth: 0.3  (0 = nonaktif)" />
            </div>
          </div>

          <div id="pid-fields-KpKiKd" style="display:none;">
            <div class="field-row">
              <div class="field-group">
                <label class="field-label">Kp — Proportional Gain</label>
                <input class="field-input" id="pid-Kp-b" type="number" step="any" placeholder="cth: 2.5" />
              </div>
              <div class="field-group">
                <label class="field-label">Ki — Integral Gain</label>
                <input class="field-input" id="pid-Ki" type="number" step="any" placeholder="cth: 0.5" />
              </div>
            </div>
            <div class="field-group">
              <label class="field-label">Kd — Derivative Gain</label>
              <input class="field-input" id="pid-Kd" type="number" step="any" placeholder="cth: 0.1" />
            </div>
          </div>

          <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
            <button class="btn-calc" id="pid-calc-btn">▶ ANALISIS</button>
            <button class="btn-reset" id="pid-reset-btn">↺ Reset</button>
          </div>

          <!-- Quick examples -->
          <div style="margin-top:1.2rem;">
            <div class="field-label">Contoh Cepat:</div>
            <div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.4rem;" id="pid-examples">
              <button class="btn-example" data-kp="2" data-ti="0" data-td="0">P saja</button>
              <button class="btn-example" data-kp="1.5" data-ti="2" data-td="0">PI</button>
              <button class="btn-example" data-kp="2" data-ti="0" data-td="0.5">PD</button>
              <button class="btn-example" data-kp="3" data-ti="1.5" data-td="0.4">PID Penuh</button>
            </div>
          </div>
        </div>

        <!-- RESULT: PARAMETER -->
        <div class="panel-card">
          <div class="panel-title">◈ Parameter Hasil</div>
          <div class="result-box" id="pid-param-box">
            <div class="result-empty">— Masukkan parameter dan tekan ANALISIS —</div>
          </div>
        </div>

        <!-- RESULT: TRANSFER FUNCTION -->
        <div class="panel-card full-width">
          <div class="panel-title">∫ Fungsi Transfer & Bentuk Kontroler</div>
          <div class="result-box" id="pid-tf-box" style="min-height:80px;">
            <div class="result-empty">— Belum ada data —</div>
          </div>
        </div>

        <!-- RESULT: ANALYSIS -->
        <div class="panel-card full-width">
          <div class="panel-title">◉ Analisis Aksi Kontrol</div>
          <div class="result-box" id="pid-analysis-box" style="min-height:80px;">
            <div class="result-empty">— Belum ada data —</div>
          </div>
        </div>

      </div>
    `;

    // Mode toggle
    document.getElementById('pid-mode').addEventListener('change', function () {
      const isIdeal = this.value === 'KpTiTd';
      document.getElementById('pid-fields-KpTiTd').style.display = isIdeal ? '' : 'none';
      document.getElementById('pid-fields-KpKiKd').style.display = isIdeal ? 'none' : '';
    });

    // Example buttons
    container.querySelectorAll('#pid-examples .btn-example').forEach(btn => {
      styleExampleBtn(btn);
      btn.addEventListener('click', () => {
        document.getElementById('pid-mode').value = 'KpTiTd';
        document.getElementById('pid-fields-KpTiTd').style.display = '';
        document.getElementById('pid-fields-KpKiKd').style.display = 'none';
        document.getElementById('pid-Kp-a').value = btn.dataset.kp;
        document.getElementById('pid-Ti').value   = btn.dataset.ti;
        document.getElementById('pid-Td').value   = btn.dataset.td;
      });
    });

    document.getElementById('pid-calc-btn').addEventListener('click', runCalc);
    document.getElementById('pid-reset-btn').addEventListener('click', resetAll);
  }

  function runCalc() {
    const mode = document.getElementById('pid-mode').value;
    let res;

    if (mode === 'KpTiTd') {
      const Kp = parseFloat(document.getElementById('pid-Kp-a').value);
      const Ti = parseFloat(document.getElementById('pid-Ti').value) || 0;
      const Td = parseFloat(document.getElementById('pid-Td').value) || 0;
      if (isNaN(Kp)) { showError('Kp tidak valid.'); return; }
      res = CalcPID.computeFromKpTiTd(Kp, Ti, Td);
    } else {
      const Kp = parseFloat(document.getElementById('pid-Kp-b').value);
      const Ki = parseFloat(document.getElementById('pid-Ki').value) || 0;
      const Kd = parseFloat(document.getElementById('pid-Kd').value) || 0;
      if (isNaN(Kp)) { showError('Kp tidak valid.'); return; }
      res = CalcPID.computeFromKpKiKd(Kp, Ki, Kd);
    }

    if (res.error) { showError(res.error); return; }

    renderParams(res);
    renderTF(res);
    renderAnalysis(res);
  }

  function renderParams(res) {
    const box = document.getElementById('pid-param-box');
    const rows = [
      ['Tipe Kontroler', res.controllerType, ''],
      ['Kp (Proportional Gain)', Utils.fmt(res.Kp), ''],
      ['Ki (Integral Gain)',     Utils.fmt(res.Ki), ''],
      ['Kd (Derivative Gain)',   Utils.fmt(res.Kd), ''],
      ['Ti (Integral Time)',     res.Ti,             's'],
      ['Td (Derivative Time)',   Utils.fmt(res.Td),  's'],
    ];
    box.innerHTML = rows.map(([k, v, u]) => `
      <div class="result-row">
        <span class="result-key">${k}</span>
        <span class="result-val">${v}${u ? ' <span style="color:var(--text-dim);font-size:.75rem;">' + u + '</span>' : ''}</span>
      </div>
    `).join('');
  }

  function renderTF(res) {
    const box = document.getElementById('pid-tf-box');
    box.innerHTML = `
      <div class="formula-box" style="margin-top:0;">
        <strong>Fungsi Transfer:</strong><br>
        ${res.tfString}
      </div>
      <div style="margin-top:.8rem;">
        <div class="result-row">
          <span class="result-key">Bentuk Paralel</span>
          <span class="result-val" style="font-size:.8rem;">${res.parallelForm}</span>
        </div>
        <div class="result-row">
          <span class="result-key">Bentuk Ideal</span>
          <span class="result-val" style="font-size:.8rem;">${res.idealForm}</span>
        </div>
        <div class="result-row">
          <span class="result-key">Bentuk Seri</span>
          <span class="result-val" style="font-size:.8rem;">${res.seriesForm}</span>
        </div>
      </div>
    `;
  }

  function renderAnalysis(res) {
    const box = document.getElementById('pid-analysis-box');
    box.innerHTML = `
      <div class="result-row">
        <span class="result-key">Aksi Proporsional</span>
        <span class="result-val" style="font-size:.82rem;">${res.proportionalAction}</span>
      </div>
      <div class="result-row">
        <span class="result-key">Aksi Integral</span>
        <span class="result-val" style="font-size:.82rem;">${res.integralAction}</span>
      </div>
      <div class="result-row">
        <span class="result-key">Aksi Derivatif</span>
        <span class="result-val" style="font-size:.82rem;">${res.derivativeAction}</span>
      </div>
      <div class="result-row">
        <span class="result-key">Steady-State Error</span>
        <span class="result-val">${res.steadyStateError}</span>
      </div>
      <div class="result-row">
        <span class="result-key">Risiko Windup</span>
        <span class="result-val warn">${res.windupRisk}</span>
      </div>
      <div class="result-row">
        <span class="result-key">Kontribusi Phase (D)</span>
        <span class="result-val">${res.phaseContrib}</span>
      </div>
    `;
  }

  function showError(msg) {
    document.getElementById('pid-param-box').innerHTML    = `<div class="result-val error">✖ ${msg}</div>`;
    document.getElementById('pid-tf-box').innerHTML       = `<div class="result-empty">—</div>`;
    document.getElementById('pid-analysis-box').innerHTML = `<div class="result-empty">—</div>`;
  }

  function resetAll() {
    ['pid-Kp-a','pid-Ti','pid-Td','pid-Kp-b','pid-Ki','pid-Kd'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    ['pid-param-box','pid-tf-box','pid-analysis-box'].forEach(id => {
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