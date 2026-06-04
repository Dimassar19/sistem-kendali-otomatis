/**
 * render-zn1.js — UI Renderer for Ziegler-Nichols Method 1 (Open Loop / PRC)
 * Grafik: kurva S open-loop + garis tangen (mirip Octave/MATLAB)
 * PERUBAHAN: Grafik Respons Step Closed-Loop dihapus
 */

const RenderZN1 = (() => {

  function init(container) {
    Utils.clear(container);
    container.innerHTML = `
      <div class="calc-container">

        <!-- ── INPUT PANEL ── -->
        <div class="panel-card">
          <div class="panel-title">∿ Input — ZN Method 1 (Open Loop)</div>
          <div class="info-strip">
            Pilih metode input parameter proses.
            <strong>L dan T langsung</strong>, atau dari titik grafik
            <strong>T0, T1, T2</strong>.
          </div>

          <div class="field-group">
            <label class="field-label">Mode Input</label>
            <select class="field-select" id="zn1-input-mode">
              <option value="LT">Input L dan T Langsung</option>
              <option value="T012">Input T0, T1, T2 (dari grafik)</option>
            </select>
          </div>

          <!-- MODE A: L dan T langsung -->
          <div id="zn1-fields-LT">
            <div class="field-row">
              <div class="field-group">
                <label class="field-label">K — Process Gain</label>
                <input class="field-input" id="zn1-K" type="number" step="any" placeholder="cth: 1.0" />
                <span class="field-hint">ΔOutput / ΔInput (steady-state)</span>
              </div>
              <div class="field-group">
                <label class="field-label">L — Dead Time (s)</label>
                <input class="field-input" id="zn1-L" type="number" step="any" placeholder="cth: 0.5" />
                <span class="field-hint">Waktu mati / delay</span>
              </div>
            </div>
            <div class="field-group">
              <label class="field-label">T — Time Constant (s)</label>
              <input class="field-input" id="zn1-T" type="number" step="any" placeholder="cth: 2.0" />
              <span class="field-hint">Konstanta waktu proses</span>
            </div>
          </div>

          <!-- MODE B: T0, T1, T2 -->
          <div id="zn1-fields-T012" style="display:none;">
            <div class="info-strip" style="margin-bottom:.8rem;">
              <strong>T0</strong> = waktu awal &nbsp;|&nbsp;
              <strong>T1</strong> = titik infleksi bawah (akhir dead time) &nbsp;|&nbsp;
              <strong>T2</strong> = titik infleksi atas (akhir time constant)
              <br/>→ L = T1 − T0 &nbsp;&nbsp;|&nbsp;&nbsp; T = T2 − T1
            </div>
            <div class="field-row">
              <div class="field-group">
                <label class="field-label">K — Process Gain (nilai maks output)</label>
                <input class="field-input" id="zn1-K2" type="number" step="any" placeholder="cth: 9.0" />
              </div>
              <div class="field-group">
                <label class="field-label">T0 — Waktu Awal (s)</label>
                <input class="field-input" id="zn1-T0" type="number" step="any" placeholder="cth: 10" />
              </div>
            </div>
            <div class="field-row">
              <div class="field-group">
                <label class="field-label">T1 — Infleksi Bawah / L (s)</label>
                <input class="field-input" id="zn1-T1" type="number" step="any" placeholder="cth: 15" />
              </div>
              <div class="field-group">
                <label class="field-label">T2 — Infleksi Atas (s)</label>
                <input class="field-input" id="zn1-T2" type="number" step="any" placeholder="cth: 40" />
              </div>
            </div>
            <div id="zn1-derived" style="display:none;" class="formula-box"></div>
          </div>

          <!-- CONTROLLER TYPE -->
          <div class="field-group" style="margin-top:.8rem;">
            <label class="field-label">Tipe Kontroler yang Ditampilkan</label>
            <select class="field-select" id="zn1-type">
              <option value="PID">PID (Proporsional-Integral-Derivatif)</option>
              <option value="PI">PI (Proporsional-Integral)</option>
              <option value="PD">PD (Proporsional-Derivatif)</option>
              <option value="P">P (Proporsional saja)</option>
            </select>
          </div>

          <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
            <button class="btn-calc" id="zn1-calc-btn">▶ HITUNG TUNING</button>
            <button class="btn-reset" id="zn1-reset-btn">↺ Reset</button>
          </div>

          <div id="zn1-examples-wrap" style="margin-top:1.2rem;">
            <div class="field-label">Contoh Cepat:</div>
            <div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.4rem;" id="zn1-examples">
              <button class="btn-example" data-k="1"   data-l="0.5" data-t="2">Tipikal (K=1,L=0.5,T=2)</button>
              <button class="btn-example" data-k="2"   data-l="0.2" data-t="1">Cepat (K=2,L=0.2,T=1)</button>
              <button class="btn-example" data-k="0.8" data-l="1.0" data-t="3">Dead Time Besar</button>
              <button class="btn-example" data-k="9"   data-l="5"   data-t="25">Oktaf (K=9,L=5,T=25)</button>
            </div>
          </div>
        </div>

        <!-- ── RESULT PANEL ── -->
        <div class="panel-card">
          <div class="panel-title">◈ Hasil Tuning ZN1</div>
          <div class="result-box" id="zn1-result-box">
            <div class="result-empty">— Masukkan parameter lalu tekan HITUNG TUNING —</div>
          </div>
        </div>

        <!-- ── OPEN-LOOP S-CURVE CHART ── -->
        <div class="panel-card full-width" id="zn1-chart-card" style="display:none;">
          <div class="panel-title">📈 Analisis Kurva Tangen Respons Undak (Open Loop)</div>
          <div id="zn1-chart-wrap" style="width:100%;position:relative;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
            <canvas id="zn1-chart"></canvas>
          </div>
        </div>

        <!-- ── DETAIL PANEL ── -->
        <div class="panel-card full-width">
          <div class="panel-title">∫ Parameter Proses & Analisis Kontrolabilitas</div>
          <div class="result-box" id="zn1-detail-box" style="min-height:80px;">
            <div class="result-empty">— Belum ada data —</div>
          </div>
        </div>

        <!-- ── COMPARISON TABLE ── -->
        <div class="panel-card full-width">
          <div class="panel-title">⊞ Perbandingan Semua Tipe Kontroler (ZN1)</div>
          <div class="result-box" id="zn1-compare-box" style="min-height:80px; overflow-x:auto;">
            <div class="result-empty">— Belum ada data —</div>
          </div>
        </div>

      </div>
    `;

    document.getElementById('zn1-input-mode').addEventListener('change', function () {
      const isT012 = this.value === 'T012';
      document.getElementById('zn1-fields-LT').style.display     = isT012 ? 'none' : '';
      document.getElementById('zn1-fields-T012').style.display   = isT012 ? ''     : 'none';
      document.getElementById('zn1-examples-wrap').style.display  = isT012 ? 'none' : '';
      const derived = document.getElementById('zn1-derived');
      derived.style.display = 'none'; derived.innerHTML = '';
    });

    ['zn1-T0','zn1-T1','zn1-T2'].forEach(id => {
      document.getElementById(id).addEventListener('input', _updateDerived);
    });

    container.querySelectorAll('#zn1-examples .btn-example').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('zn1-input-mode').value = 'LT';
        document.getElementById('zn1-fields-LT').style.display    = '';
        document.getElementById('zn1-fields-T012').style.display  = 'none';
        document.getElementById('zn1-examples-wrap').style.display = '';
        document.getElementById('zn1-K').value = btn.dataset.k;
        document.getElementById('zn1-L').value = btn.dataset.l;
        document.getElementById('zn1-T').value = btn.dataset.t;
      });
    });

    document.getElementById('zn1-calc-btn').addEventListener('click', runCalc);
    document.getElementById('zn1-reset-btn').addEventListener('click', resetAll);
  }

  // ─────────────────────────────────────────────
  // LIVE PREVIEW
  // ─────────────────────────────────────────────
  function _updateDerived() {
    const t0  = parseFloat(document.getElementById('zn1-T0').value);
    const t1  = parseFloat(document.getElementById('zn1-T1').value);
    const t2  = parseFloat(document.getElementById('zn1-T2').value);
    const box = document.getElementById('zn1-derived');
    if (isNaN(t0)||isNaN(t1)||isNaN(t2)) { box.style.display='none'; return; }
    const res = CalcZN1.computeFromT0T1T2(t0, t1, t2);
    if (res.error) { box.style.display='none'; return; }
    box.style.display = '';
    box.innerHTML = `L = T1 − T0 = <strong>${res.L} s</strong>&nbsp;&nbsp;|&nbsp;&nbsp;T = T2 − T1 = <strong>${res.T} s</strong>`;
  }

  // ─────────────────────────────────────────────
  // RUN CALC
  // ─────────────────────────────────────────────
  function runCalc() {
    const mode = document.getElementById('zn1-input-mode').value;
    const type = document.getElementById('zn1-type').value;
    let K, L, T;

    if (mode === 'T012') {
      K        = parseFloat(document.getElementById('zn1-K2').value);
      const t0 = parseFloat(document.getElementById('zn1-T0').value);
      const t1 = parseFloat(document.getElementById('zn1-T1').value);
      const t2 = parseFloat(document.getElementById('zn1-T2').value);
      if (isNaN(K))                         { showError('K tidak valid.'); return; }
      if (isNaN(t0)||isNaN(t1)||isNaN(t2))  { showError('Masukkan nilai T0, T1, T2 yang valid.'); return; }
      const derived = CalcZN1.computeFromT0T1T2(t0, t1, t2);
      if (derived.error) { showError(derived.error); return; }
      L = derived.L; T = derived.T;
    } else {
      K = parseFloat(document.getElementById('zn1-K').value);
      L = parseFloat(document.getElementById('zn1-L').value);
      T = parseFloat(document.getElementById('zn1-T').value);
      if (isNaN(K)||isNaN(L)||isNaN(T)) { showError('Masukkan nilai K, L, dan T yang valid.'); return; }
    }

    if (K === 0) { showError('K tidak boleh 0.'); return; }
    if (L <= 0)  { showError('L (dead time) harus > 0.'); return; }
    if (T <= 0)  { showError('T (time constant) harus > 0.'); return; }

    const res = CalcZN1.compute(K, L, T);
    if (res.error) { showError(res.error); return; }

    const params = res[type] || res.PID;

    renderResult(type, params);
    renderDetail(res, K, L, T);
    renderComparison(res);
    doOpenLoopChart(K, L, T);
  }

  // ─────────────────────────────────────────────
  // CHART: S-curve open-loop (mirip Octave)
  // ─────────────────────────────────────────────
  function doOpenLoopChart(K, L, T) {
    document.getElementById('zn1-chart-card').style.display = '';
    ChartZN1.renderOpenLoop('zn1-chart', K, L, T);
  }

  // ─────────────────────────────────────────────
  // RENDER HELPERS
  // ─────────────────────────────────────────────
  function renderResult(type, params) {
    const box = document.getElementById('zn1-result-box');
    const rows = [
      ['Tipe Kontroler', type, ''],
      ['Kp', Utils.fmt(params.Kp), ''],
      ['Ki', params.Ki!=null?Utils.fmt(params.Ki):'—', ''],
      ['Kd', params.Kd!=null?Utils.fmt(params.Kd):'—', ''],
      ['Ti', params.Ti!=null?Utils.fmt(params.Ti):'—', 's'],
      ['Td', params.Td!=null?Utils.fmt(params.Td):'—', 's'],
    ];
    box.innerHTML = rows.map(([k,v,u])=>`<div class="result-row">
      <span class="result-key">${k}</span>
      <span class="result-val">${v}${u?` <span style="color:var(--text-dim);font-size:.75rem;">${u}</span>`:''}</span>
    </div>`).join('');
  }

  function renderDetail(res, K, L, T) {
    document.getElementById('zn1-detail-box').innerHTML = `
      <div class="result-row"><span class="result-key">Process Gain (K)</span><span class="result-val">${Utils.fmt(K)}</span></div>
      <div class="result-row"><span class="result-key">Dead Time (L)</span><span class="result-val">${Utils.fmt(L)} <span style="color:var(--text-dim);font-size:.75rem;">s</span></span></div>
      <div class="result-row"><span class="result-key">Time Constant (T)</span><span class="result-val">${Utils.fmt(T)} <span style="color:var(--text-dim);font-size:.75rem;">s</span></span></div>
      <div class="result-row"><span class="result-key">Reaction Rate (R = K/T)</span><span class="result-val">${Utils.fmt(res.reactionRate)}</span></div>
      <div class="result-row"><span class="result-key">Normalized Dead Time (a = L/T)</span><span class="result-val">${Utils.fmt(res.normalizedDT)}</span></div>
      <div class="result-row"><span class="result-key">Kontrolabilitas</span><span class="result-val" style="font-size:.8rem;">${res.controllability}</span></div>
      <div class="result-row"><span class="result-key">Rekomendasi</span><span class="result-val" style="font-size:.8rem;">${res.recommendation}</span></div>
      <div class="result-row"><span class="result-key">Estimasi Overshoot ZN1</span><span class="result-val warn">~${res.overshoot_est}% (ZN klasik — agresif)</span></div>`;
  }

  function renderComparison(res) {
    const types = [{key:'P',label:'P'},{key:'PI',label:'PI'},{key:'PD',label:'PD'},{key:'PID',label:'PID'}];
    document.getElementById('zn1-compare-box').innerHTML = `
      <table class="routh-table" style="font-size:.82rem;">
        <thead><tr><th style="text-align:left;">Tipe</th><th>Kp</th><th>Ki</th><th>Kd</th><th>Ti (s)</th><th>Td (s)</th></tr></thead>
        <tbody>${types.map(({key,label})=>{
          const p=res[key]; if(!p) return '';
          return `<tr><td class="row-label">${label}</td>
            <td>${p.Kp!=null?Utils.fmt(p.Kp):'—'}</td>
            <td>${p.Ki!=null?Utils.fmt(p.Ki):'—'}</td>
            <td>${p.Kd!=null?Utils.fmt(p.Kd):'—'}</td>
            <td>${p.Ti!=null?Utils.fmt(p.Ti):'—'}</td>
            <td>${p.Td!=null?Utils.fmt(p.Td):'—'}</td></tr>`;
        }).join('')}</tbody>
      </table>`;
  }

  // ─────────────────────────────────────────────
  // ERROR & RESET
  // ─────────────────────────────────────────────
  function showError(msg) {
    document.getElementById('zn1-result-box').innerHTML  = `<div class="result-val error">✖ ${msg}</div>`;
    document.getElementById('zn1-detail-box').innerHTML  = `<div class="result-empty">—</div>`;
    document.getElementById('zn1-compare-box').innerHTML = `<div class="result-empty">—</div>`;
    document.getElementById('zn1-chart-card').style.display = 'none';
  }

  function resetAll() {
    ['zn1-K','zn1-L','zn1-T','zn1-K2','zn1-T0','zn1-T1','zn1-T2'].forEach(id=>{
      const el=document.getElementById(id); if(el) el.value='';
    });
    const derived=document.getElementById('zn1-derived');
    if(derived){derived.style.display='none';derived.innerHTML='';}
    document.getElementById('zn1-input-mode').value='LT';
    document.getElementById('zn1-fields-LT').style.display    ='';
    document.getElementById('zn1-fields-T012').style.display  ='none';
    document.getElementById('zn1-examples-wrap').style.display='';
    document.getElementById('zn1-result-box').innerHTML  =`<div class="result-empty">— Masukkan parameter lalu tekan HITUNG TUNING —</div>`;
    document.getElementById('zn1-detail-box').innerHTML  =`<div class="result-empty">— Belum ada data —</div>`;
    document.getElementById('zn1-compare-box').innerHTML =`<div class="result-empty">— Belum ada data —</div>`;
    document.getElementById('zn1-chart-card').style.display='none';
  }

  return { init };

})();