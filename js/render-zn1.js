/**
 * render-zn1.js — UI renderer for Ziegler-Nichols Method 1 (Open Loop)
 */

const RenderZN1 = (() => {

  function init(container) {
    Utils.clear(container);

    container.innerHTML = `
      <div class="calc-container">

        <!-- INPUT -->
        <div class="panel-card">
          <div class="panel-title">∿ Input Parameter Step Response</div>
          <div class="info-strip">
            <strong>Metode ZN-1 (Open Loop)</strong> — Berdasarkan kurva reaksi proses (process reaction curve).
            Berikan input tangga (step) ke sistem open-loop dan catat respons-nya untuk mendapatkan K, L, T.
          </div>

          <div class="field-row">
            <div class="field-group">
              <label class="field-label">K — Process Gain (ΔY/ΔU)</label>
              <input class="field-input" id="zn1-K" type="number" step="any" placeholder="cth: 1.5" />
              <div class="field-hint">Perubahan output / perubahan input</div>
            </div>
            <div class="field-group">
              <label class="field-label">L — Dead Time (s)</label>
              <input class="field-input" id="zn1-L" type="number" step="any" placeholder="cth: 2.0" />
              <div class="field-hint">Waktu tunda sebelum sistem merespons</div>
            </div>
          </div>
          <div class="field-group">
            <label class="field-label">T — Time Constant (s)</label>
            <input class="field-input" id="zn1-T" type="number" step="any" placeholder="cth: 10.0" />
            <div class="field-hint">Konstanta waktu dari tangent kurva reaksi</div>
          </div>

          <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
            <button class="btn-calc" id="zn1-calc-btn">▶ HITUNG TUNING</button>
            <button class="btn-reset" id="zn1-reset-btn">↺ Reset</button>
          </div>

          <div style="margin-top:1.2rem;">
            <div class="field-label">Contoh Cepat:</div>
            <div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.4rem;" id="zn1-examples">
              <button class="btn-example" data-k="1.5" data-l="2" data-t="10">Proses Lambat</button>
              <button class="btn-example" data-k="2"   data-l="0.5" data-t="5">Proses Cepat</button>
              <button class="btn-example" data-k="1"   data-l="5" data-t="8">Dead Time Besar</button>
            </div>
          </div>
        </div>

        <!-- RESULT: ANALYSIS -->
        <div class="panel-card">
          <div class="panel-title">◈ Analisis Proses</div>
          <div class="result-box" id="zn1-analysis-box">
            <div class="result-empty">— Masukkan parameter dan tekan HITUNG —</div>
          </div>
        </div>

        <!-- RESULT: TUNING TABLE -->
        <div class="panel-card full-width">
          <div class="panel-title">◫ Hasil Tuning ZN-1</div>
          <div class="result-box" id="zn1-table-box" style="min-height:80px;overflow-x:auto;">
            <div class="result-empty">— Belum ada data —</div>
          </div>
        </div>

        <!-- HELPER: From Curve Points -->
        <div class="panel-card full-width">
          <div class="panel-title">⊕ Estimasi K, L, T dari Dua Titik Kurva</div>
          <div class="info-strip">
            Jika K, L, T belum diketahui, masukkan dua titik pada garis singgung kurva reaksi,
            amplitudo step input, dan nilai steady-state output.
          </div>
          <div class="field-row">
            <div class="field-group">
              <label class="field-label">t₁ (s)</label>
              <input class="field-input" id="zn1-t1" type="number" step="any" placeholder="cth: 3" />
            </div>
            <div class="field-group">
              <label class="field-label">y₁ (output di t₁)</label>
              <input class="field-input" id="zn1-y1" type="number" step="any" placeholder="cth: 0.2" />
            </div>
          </div>
          <div class="field-row">
            <div class="field-group">
              <label class="field-label">t₂ (s)</label>
              <input class="field-input" id="zn1-t2" type="number" step="any" placeholder="cth: 10" />
            </div>
            <div class="field-group">
              <label class="field-label">y₂ (output di t₂)</label>
              <input class="field-input" id="zn1-y2" type="number" step="any" placeholder="cth: 1.0" />
            </div>
          </div>
          <div class="field-row">
            <div class="field-group">
              <label class="field-label">Amplitudo Step Input (ΔU)</label>
              <input class="field-input" id="zn1-step" type="number" step="any" placeholder="cth: 1" value="1" />
            </div>
            <div class="field-group">
              <label class="field-label">Final Value Output (ΔY∞)</label>
              <input class="field-input" id="zn1-final" type="number" step="any" placeholder="cth: 1.5" />
            </div>
          </div>
          <button class="btn-calc" id="zn1-curve-btn" style="border-color:var(--accent3);color:var(--accent3);">
            ⊕ ESTIMASI K, L, T
          </button>
          <div class="result-box" id="zn1-curve-box" style="margin-top:.8rem;min-height:60px;">
            <div class="result-empty">— Belum ada data —</div>
          </div>
        </div>

      </div>
    `;

    // Example buttons
    container.querySelectorAll('#zn1-examples .btn-example').forEach(btn => {
      styleExampleBtn(btn);
      btn.addEventListener('click', () => {
        document.getElementById('zn1-K').value = btn.dataset.k;
        document.getElementById('zn1-L').value = btn.dataset.l;
        document.getElementById('zn1-T').value = btn.dataset.t;
      });
    });

    document.getElementById('zn1-calc-btn').addEventListener('click', runCalc);
    document.getElementById('zn1-reset-btn').addEventListener('click', resetAll);
    document.getElementById('zn1-curve-btn').addEventListener('click', runCurve);
  }

  function runCalc() {
    const K = parseFloat(document.getElementById('zn1-K').value);
    const L = parseFloat(document.getElementById('zn1-L').value);
    const T = parseFloat(document.getElementById('zn1-T').value);

    if (isNaN(K) || isNaN(L) || isNaN(T)) {
      showError('Isi semua nilai K, L, dan T dengan angka yang valid.');
      return;
    }

    const res = CalcZN1.compute(K, L, T);
    if (res.error) { showError(res.error); return; }

    renderAnalysis(res);
    renderTable(res);
  }

  function renderAnalysis(res) {
    const box = document.getElementById('zn1-analysis-box');
    box.innerHTML = `
      <div class="result-row">
        <span class="result-key">Process Gain (K)</span>
        <span class="result-val">${Utils.fmt(res.processGain)}</span>
      </div>
      <div class="result-row">
        <span class="result-key">Dead Time (L)</span>
        <span class="result-val">${Utils.fmt(res.deadTime)} s</span>
      </div>
      <div class="result-row">
        <span class="result-key">Time Constant (T)</span>
        <span class="result-val">${Utils.fmt(res.timeConst)} s</span>
      </div>
      <div class="result-row">
        <span class="result-key">Reaction Rate (R = K/T)</span>
        <span class="result-val">${Utils.fmt(res.reactionRate)}</span>
      </div>
      <div class="result-row">
        <span class="result-key">Normalized Dead Time (a = L/T)</span>
        <span class="result-val ${res.normalizedDT > 0.6 ? 'error' : res.normalizedDT < 0.3 ? 'success' : 'warn'}">
          ${Utils.fmt(res.normalizedDT)}
        </span>
      </div>
      <div style="margin-top:.8rem;padding:.6rem .9rem;background:rgba(0,255,231,.05);border-radius:var(--radius);border-left:3px solid var(--accent1);">
        <div style="font-size:.75rem;color:var(--text-dim);margin-bottom:.3rem;">Controllability:</div>
        <div style="font-size:.8rem;color:var(--text-main);">${res.controllability}</div>
      </div>
      <div style="margin-top:.5rem;padding:.6rem .9rem;background:rgba(123,97,255,.05);border-radius:var(--radius);border-left:3px solid var(--accent3);">
        <div style="font-size:.75rem;color:var(--text-dim);margin-bottom:.3rem;">Rekomendasi:</div>
        <div style="font-size:.8rem;color:var(--accent3);">${res.recommendation}</div>
      </div>
      <div class="result-row" style="margin-top:.5rem;">
        <span class="result-key">Est. Settling Time (ZN PID)</span>
        <span class="result-val">${Utils.fmt(res.settlingTime_est)} s</span>
      </div>
      <div class="result-row">
        <span class="result-key">Est. Overshoot (ZN Classic)</span>
        <span class="result-val warn">~${res.overshoot_est}%</span>
      </div>
    `;
  }

  function renderTable(res) {
    const box = document.getElementById('zn1-table-box');
    const types = [
      { name: 'P',   data: [['Kp', res.P.Kp]] },
      { name: 'PI',  data: [['Kp', res.PI.Kp], ['Ti', res.PI.Ti], ['Ki', res.PI.Ki]] },
      { name: 'PD',  data: [['Kp', res.PD.Kp], ['Td', res.PD.Td], ['Kd', res.PD.Kd]] },
      { name: 'PID', data: [['Kp', res.PID.Kp], ['Ti', res.PID.Ti], ['Td', res.PID.Td], ['Ki', res.PID.Ki], ['Kd', res.PID.Kd]] },
    ];

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
            <td>${Utils.fmt(res.P.Kp)}</td><td>—</td><td>—</td><td>—</td><td>—</td>
          </tr>
          <tr>
            <td class="row-label">PI</td>
            <td>${Utils.fmt(res.PI.Kp)}</td><td>${Utils.fmt(res.PI.Ti)}</td><td>—</td>
            <td>${Utils.fmt(res.PI.Ki)}</td><td>—</td>
          </tr>
          <tr>
            <td class="row-label">PD</td>
            <td>${Utils.fmt(res.PD.Kp)}</td><td>—</td><td>${Utils.fmt(res.PD.Td)}</td>
            <td>—</td><td>${Utils.fmt(res.PD.Kd)}</td>
          </tr>
          <tr style="background:rgba(0,255,231,.05);">
            <td class="row-label" style="color:var(--accent1);">PID ★</td>
            <td>${Utils.fmt(res.PID.Kp)}</td><td>${Utils.fmt(res.PID.Ti)}</td>
            <td>${Utils.fmt(res.PID.Td)}</td><td>${Utils.fmt(res.PID.Ki)}</td>
            <td>${Utils.fmt(res.PID.Kd)}</td>
          </tr>
        </tbody>
      </table>
      <div class="formula-box" style="margin-top:.8rem;">
        <strong>Formula ZN-1:</strong><br>
        P: Kp = T/(K·L) &nbsp;|&nbsp;
        PI: Kp = 0.9T/(K·L), Ti = L/0.3<br>
        PID: Kp = 1.2T/(K·L), Ti = 2L, Td = 0.5L
      </div>
    `;
  }

  function runCurve() {
    const t1    = parseFloat(document.getElementById('zn1-t1').value);
    const y1    = parseFloat(document.getElementById('zn1-y1').value);
    const t2    = parseFloat(document.getElementById('zn1-t2').value);
    const y2    = parseFloat(document.getElementById('zn1-y2').value);
    const step  = parseFloat(document.getElementById('zn1-step').value) || 1;
    const final = parseFloat(document.getElementById('zn1-final').value);

    if ([t1, y1, t2, y2, final].some(isNaN)) {
      document.getElementById('zn1-curve-box').innerHTML =
        `<div class="result-val error">✖ Isi semua kolom estimasi kurva.</div>`;
      return;
    }

    const est = CalcZN1.computeFromCurve(t1, y1, t2, y2, step, final);
    if (est.error) {
      document.getElementById('zn1-curve-box').innerHTML =
        `<div class="result-val error">✖ ${est.error}</div>`;
      return;
    }

    document.getElementById('zn1-curve-box').innerHTML = `
      <div class="result-row">
        <span class="result-key">K (Process Gain)  →</span>
        <span class="result-val">${Utils.fmt(est.K)}</span>
      </div>
      <div class="result-row">
        <span class="result-key">L (Dead Time)  →</span>
        <span class="result-val">${Utils.fmt(est.L)} s</span>
      </div>
      <div class="result-row">
        <span class="result-key">T (Time Constant)  →</span>
        <span class="result-val">${Utils.fmt(est.T)} s</span>
      </div>
      <button class="btn-calc" id="zn1-apply-btn" style="margin-top:.5rem;padding:.5rem 1.2rem;">
        ↑ Gunakan Nilai Ini
      </button>
    `;

    document.getElementById('zn1-apply-btn').addEventListener('click', () => {
      document.getElementById('zn1-K').value = est.K;
      document.getElementById('zn1-L').value = est.L;
      document.getElementById('zn1-T').value = est.T;
    });
  }

  function showError(msg) {
    document.getElementById('zn1-analysis-box').innerHTML =
      `<div class="result-val error">✖ ${msg}</div>`;
    document.getElementById('zn1-table-box').innerHTML =
      `<div class="result-empty">—</div>`;
  }

  function resetAll() {
    ['zn1-K','zn1-L','zn1-T','zn1-t1','zn1-y1','zn1-t2','zn1-y2','zn1-step','zn1-final'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    ['zn1-analysis-box','zn1-table-box','zn1-curve-box'].forEach(id => {
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