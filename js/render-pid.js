
/**
 * render-pid.js — FIXED v2
 */
const RenderPID = (() => {

  function init(container) {
    Utils.clear(container);
    container.innerHTML = `
      <div class="calc-container">

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
                <input class="field-input" id="pid-Ti" type="number" step="any" placeholder="cth: 1.2" />
              </div>
            </div>
            <div class="field-group">
              <label class="field-label">Td — Derivative Time (s)</label>
              <input class="field-input" id="pid-Td" type="number" step="any" placeholder="cth: 0.3" />
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

          <div style="margin-top:1.2rem;">
            <div class="field-label">Contoh Cepat:</div>
            <div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.4rem;" id="pid-examples">
              <button class="btn-example" data-kp="2"   data-ti="0"   data-td="0">P saja</button>
              <button class="btn-example" data-kp="1.5" data-ti="2"   data-td="0">PI</button>
              <button class="btn-example" data-kp="2"   data-ti="0"   data-td="0.5">PD</button>
              <button class="btn-example" data-kp="3"   data-ti="1.5" data-td="0.4">PID Penuh</button>
            </div>
          </div>
        </div>

        <div class="panel-card">
          <div class="panel-title">◈ Parameter Hasil</div>
          <div class="result-box" id="pid-param-box">
            <div class="result-empty">— Masukkan parameter dan tekan ANALISIS —</div>
          </div>
        </div>

        <div class="panel-card full-width">
          <div class="panel-title">∫ Fungsi Transfer & Bentuk Kontroler</div>
          <div class="result-box" id="pid-tf-box" style="min-height:80px;">
            <div class="result-empty">— Belum ada data —</div>
          </div>
        </div>

        <div class="panel-card full-width" id="pid-chart-card" style="display:none;">
          <div class="panel-title">📈 Grafik Respons Step (Closed-Loop)</div>
          <div id="pid-chart-wrap" style="width:100%;min-height:300px;position:relative;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;">
            <canvas id="pid-chart"></canvas>
          </div>
          <div id="pid-analysis-summary" style="margin-top:1rem;"></div>
          <div id="pid-suggestion"       style="margin-top:0.5rem;"></div>
        </div>

        <div class="panel-card full-width">
          <div class="panel-title">◉ Analisis Aksi Kontrol</div>
          <div class="result-box" id="pid-analysis-box" style="min-height:80px;">
            <div class="result-empty">— Belum ada data —</div>
          </div>
        </div>

      </div>`;

    document.getElementById('pid-mode').addEventListener('change', function() {
      const ideal = this.value === 'KpTiTd';
      document.getElementById('pid-fields-KpTiTd').style.display = ideal ? '' : 'none';
      document.getElementById('pid-fields-KpKiKd').style.display = ideal ? 'none' : '';
    });

    container.querySelectorAll('#pid-examples .btn-example').forEach(btn => {
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
    let res, Kp, Ki, Kd;

    if (mode === 'KpTiTd') {
      Kp = parseFloat(document.getElementById('pid-Kp-a').value);
      const Ti = parseFloat(document.getElementById('pid-Ti').value) || 0;
      const Td = parseFloat(document.getElementById('pid-Td').value) || 0;
      if (isNaN(Kp)) { showError('Kp tidak valid.'); return; }
      res = CalcPID.computeFromKpTiTd(Kp, Ti, Td);
      Ki = res.Ki; Kd = res.Kd;
    } else {
      Kp = parseFloat(document.getElementById('pid-Kp-b').value);
      Ki = parseFloat(document.getElementById('pid-Ki').value) || 0;
      Kd = parseFloat(document.getElementById('pid-Kd').value) || 0;
      if (isNaN(Kp)) { showError('Kp tidak valid.'); return; }
      res = CalcPID.computeFromKpKiKd(Kp, Ki, Kd);
    }

    if (res.error) { showError(res.error); return; }

    renderParams(res);
    renderTF(res);
    renderAnalysis(res);
    doChart(Kp, res.Ki, res.Kd);
  }

  function doChart(Kp, Ki, Kd) {
    // 1. Tampilkan card
    const card = document.getElementById('pid-chart-card');
    card.style.display = '';

    // 2. Simulasi
    const { t, y } = ChartEngine.simulatePID(Kp, Ki, Kd, 15, 0.005);

    // 3. Render robust
    ChartEngine.renderChart('pid-chart', t, y, 'PID Controller — Step Response');

    // 4. Analisis
    const analysis = ChartEngine.analyzeResponse(t, y);
    renderAnalysisSummary('pid-analysis-summary', analysis);
    renderSuggestion('pid-suggestion', analysis, Kp, Ki, Kd);
  }

  function renderAnalysisSummary(id, a) {
    const box = document.getElementById(id);
    if (!a) { box.innerHTML=''; return; }
    box.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:.75rem;margin-top:.5rem;">
        ${mc('Overshoot',     a.overshoot.toFixed(1)+'%',                   a.hasOvershoot?'warn':'success')}
        ${mc('SS Error',      a.ssError.toFixed(2)+'%',                     !a.isSettled?'warn':'success')}
        ${mc('Settling Time', a.settlingTime.toFixed(2)+' s',               '')}
        ${mc('Rise Time',     a.riseTime?a.riseTime.toFixed(3)+' s':'—',    '')}
      </div>`;
  }

  function mc(label, value, cls) {
    const c = {warn:'#d97706',success:'#16a34a','':'#2563eb'}[cls]||'#2563eb';
    return `<div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:8px;padding:.75rem 1rem;text-align:center;">
      <div style="font-size:.72rem;color:#718096;letter-spacing:.06em;margin-bottom:.3rem;">${label}</div>
      <div style="font-size:1.1rem;font-weight:700;color:${c};font-family:'JetBrains Mono',monospace;">${value}</div>
    </div>`;
  }

  function renderSuggestion(id, a, Kp, Ki, Kd) {
    const box = document.getElementById(id);
    if (!a) { box.innerHTML=''; return; }
    const fix = ChartEngine.suggestFix(a, Kp, Ki, Kd);
    if (!fix) { box.innerHTML=''; return; }
    if (!fix.needsFix) {
      box.innerHTML=`<div class="suggestion-box"><div class="suggestion-title">✅ Respons Sudah Optimal</div>
        <p class="suggestion-note">${fix.reasons[0]}</p></div>`; return;
    }
    box.innerHTML=`<div class="suggestion-box warning">
      <div class="suggestion-title">⚠ Saran Perbaikan — Kp Dikunci</div>
      <div class="suggestion-row"><span class="suggestion-label">Kp (Terkunci)</span><span class="suggestion-value" style="color:#2563eb;">${Utils.fmt(Kp)}</span></div>
      <div class="suggestion-row"><span class="suggestion-label">Ki saat ini → Saran</span><span class="suggestion-value">${Utils.fmt(Ki)} → <strong style="color:#16a34a;">${Utils.fmt(fix.newKi)}</strong></span></div>
      <div class="suggestion-row"><span class="suggestion-label">Kd saat ini → Saran</span><span class="suggestion-value">${Utils.fmt(Kd)} → <strong style="color:#16a34a;">${Utils.fmt(fix.newKd)}</strong></span></div>
      <div class="suggestion-note">${fix.reasons.map(r=>`• ${r}`).join('<br>')}</div>
    </div>`;
  }

  function renderParams(res) {
    document.getElementById('pid-param-box').innerHTML = [
      ['Tipe Kontroler',         res.controllerType,''],
      ['Kp (Proportional Gain)', Utils.fmt(res.Kp), ''],
      ['Ki (Integral Gain)',     Utils.fmt(res.Ki), ''],
      ['Kd (Derivative Gain)',   Utils.fmt(res.Kd), ''],
      ['Ti (Integral Time)',     res.Ti,             's'],
      ['Td (Derivative Time)',   Utils.fmt(res.Td), 's'],
    ].map(([k,v,u])=>`<div class="result-row">
      <span class="result-key">${k}</span>
      <span class="result-val">${v}${u?` <span style="color:var(--text-dim);font-size:.75rem;">${u}</span>`:''}</span>
    </div>`).join('');
  }

  function renderTF(res) {
    document.getElementById('pid-tf-box').innerHTML=`
      <div class="formula-box" style="margin-top:0;"><strong>Fungsi Transfer:</strong><br>${res.tfString}</div>
      <div style="margin-top:.8rem;">
        <div class="result-row"><span class="result-key">Bentuk Paralel</span><span class="result-val" style="font-size:.8rem;">${res.parallelForm}</span></div>
        <div class="result-row"><span class="result-key">Bentuk Ideal</span><span class="result-val" style="font-size:.8rem;">${res.idealForm}</span></div>
        <div class="result-row"><span class="result-key">Bentuk Seri</span><span class="result-val" style="font-size:.8rem;">${res.seriesForm}</span></div>
      </div>`;
  }

  function renderAnalysis(res) {
    document.getElementById('pid-analysis-box').innerHTML=`
      <div class="result-row"><span class="result-key">Aksi Proporsional</span><span class="result-val" style="font-size:.82rem;">${res.proportionalAction}</span></div>
      <div class="result-row"><span class="result-key">Aksi Integral</span><span class="result-val" style="font-size:.82rem;">${res.integralAction}</span></div>
      <div class="result-row"><span class="result-key">Aksi Derivatif</span><span class="result-val" style="font-size:.82rem;">${res.derivativeAction}</span></div>
      <div class="result-row"><span class="result-key">Steady-State Error</span><span class="result-val">${res.steadyStateError}</span></div>
      <div class="result-row"><span class="result-key">Risiko Windup</span><span class="result-val warn">${res.windupRisk}</span></div>
      <div class="result-row"><span class="result-key">Kontribusi Phase (D)</span><span class="result-val">${res.phaseContrib}</span></div>`;
  }

  function showError(msg) {
    document.getElementById('pid-param-box').innerHTML=`<div class="result-val error">✖ ${msg}</div>`;
    document.getElementById('pid-tf-box').innerHTML=`<div class="result-empty">—</div>`;
    document.getElementById('pid-analysis-box').innerHTML=`<div class="result-empty">—</div>`;
    document.getElementById('pid-chart-card').style.display='none';
  }

  function resetAll() {
    ['pid-Kp-a','pid-Ti','pid-Td','pid-Kp-b','pid-Ki','pid-Kd'].forEach(id=>{
      const el=document.getElementById(id); if(el) el.value='';
    });
    ['pid-param-box','pid-tf-box','pid-analysis-box'].forEach(id=>{
      document.getElementById(id).innerHTML=`<div class="result-empty">— Belum ada data —</div>`;
    });
    document.getElementById('pid-chart-card').style.display='none';
  }

  return { init };
})();
