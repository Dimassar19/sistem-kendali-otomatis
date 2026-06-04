/**
 * render-zn2.js — UI Renderer for Ziegler-Nichols Method 2 (Ultimate Gain)
 * FIXED: chart rendering menggunakan ChartEngine.renderChart
 */

const RenderZN2 = (() => {

  function init(container) {
    Utils.clear(container);
    container.innerHTML = `
      <div class="calc-container">

        <div class="panel-card">
          <div class="panel-title">◎ Input — ZN Method 2 (Ultimate Gain)</div>
          <div class="info-strip">
            Ziegler-Nichols 2 menggunakan <strong>Ku</strong> (ultimate gain) dan
            <strong>Tu</strong> (ultimate period). Naikkan Kp pada pure-P hingga osilasi stabil,
            catat Ku dan Tu.
          </div>

          <div class="field-row">
            <div class="field-group">
              <label class="field-label">Ku — Ultimate Gain</label>
              <input class="field-input" id="zn2-Ku" type="number" step="any" placeholder="cth: 5.0" />
              <span class="field-hint">Gain saat osilasi berkelanjutan</span>
            </div>
            <div class="field-group">
              <label class="field-label">Tu — Ultimate Period (s)</label>
              <input class="field-input" id="zn2-Tu" type="number" step="any" placeholder="cth: 2.0" />
              <span class="field-hint">Periode osilasi saat Ku</span>
            </div>
          </div>

          <div class="field-group">
            <label class="field-label">Tipe Kontroler</label>
            <select class="field-select" id="zn2-type">
              <option value="PID">PID</option>
              <option value="PI">PI</option>
              <option value="PD">PD</option>
              <option value="P">P</option>
            </select>
          </div>

          <div class="field-group">
            <label class="field-label">Varian / Metode Tuning</label>
            <select class="field-select" id="zn2-variant">
              <option value="ZN">ZN Klasik (1942) — ~25% overshoot</option>
              <option value="TL">Tyreus-Luyben — ~10-15% overshoot</option>
              <option value="Pessen">Pessen Integral Rule — ~5% overshoot</option>
              <option value="NoOvershoot">No Overshoot — respons lebih lambat</option>
            </select>
          </div>

          <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
            <button class="btn-calc" id="zn2-calc-btn">▶ HITUNG TUNING</button>
            <button class="btn-reset" id="zn2-reset-btn">↺ Reset</button>
          </div>

          <div style="margin-top:1.2rem;">
            <div class="field-label">Contoh Cepat:</div>
            <div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.4rem;" id="zn2-examples">
              <button class="btn-example" data-ku="5"   data-tu="2">Ku=5, Tu=2</button>
              <button class="btn-example" data-ku="10"  data-tu="1.5">Ku=10, Tu=1.5</button>
              <button class="btn-example" data-ku="3.5" data-tu="3">Ku=3.5, Tu=3</button>
            </div>
          </div>
        </div>

        <div class="panel-card">
          <div class="panel-title">◈ Hasil Tuning ZN2</div>
          <div class="result-box" id="zn2-result-box">
            <div class="result-empty">— Masukkan Ku dan Tu, lalu tekan HITUNG TUNING —</div>
          </div>
        </div>

        <div class="panel-card full-width">
          <div class="panel-title">∿ Analisis Frekuensi & Margin</div>
          <div class="result-box" id="zn2-freq-box" style="min-height:80px;">
            <div class="result-empty">— Belum ada data —</div>
          </div>
        </div>

        <div class="panel-card full-width">
          <div class="panel-title">⊞ Perbandingan Semua Varian (PID)</div>
          <div class="result-box" id="zn2-compare-box" style="min-height:80px; overflow-x:auto;">
            <div class="result-empty">— Belum ada data —</div>
          </div>
        </div>

        <div class="panel-card full-width" id="zn2-chart-card" style="display:none;">
          <div class="panel-title">📈 Grafik Respons Step — ZN Method 2</div>
          <div style="width:100%;height:300px;position:relative;">
            <canvas id="zn2-chart" style="width:100%;height:300px;border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc;"></canvas>
          </div>
          <div id="zn2-analysis-summary" style="margin-top:1rem;"></div>
          <div id="zn2-suggestion" style="margin-top:0.5rem;"></div>
        </div>

      </div>
    `;

    container.querySelectorAll('#zn2-examples .btn-example').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('zn2-Ku').value = btn.dataset.ku;
        document.getElementById('zn2-Tu').value = btn.dataset.tu;
      });
    });

    document.getElementById('zn2-calc-btn').addEventListener('click', runCalc);
    document.getElementById('zn2-reset-btn').addEventListener('click', resetAll);
  }

  function runCalc() {
    const Ku      = parseFloat(document.getElementById('zn2-Ku').value);
    const Tu      = parseFloat(document.getElementById('zn2-Tu').value);
    const type    = document.getElementById('zn2-type').value;
    const variant = document.getElementById('zn2-variant').value;

    if (isNaN(Ku) || isNaN(Tu)) { showError('Masukkan nilai Ku dan Tu yang valid.'); return; }
    if (Ku <= 0 || Tu <= 0)     { showError('Ku dan Tu harus lebih dari 0.'); return; }

    const res = CalcZN2.compute(Ku, Tu);
    if (res.error) { showError(res.error); return; }

    const params = _getParams(res, variant, type);
    if (!params) { showError(`Kombinasi ${variant}/${type} tidak tersedia.`); return; }

    renderResult(type, variant, params);
    renderFreqAnalysis(res);
    renderComparison(res);
    renderChart(params, Tu, variant);
  }

  function _getParams(res, variant, type) {
    const variantMap = { ZN: res.ZN, TL: res.TL, Pessen: res.Pessen, NoOvershoot: res.NoOvershoot };
    const group = variantMap[variant];
    if (!group) return null;
    return group[type] || group['PID'] || null;
  }

  function renderChart(params, Tu, variant) {
    // FIX STEP 1: tampilkan card dulu
    const card = document.getElementById('zn2-chart-card');
    card.style.display = '';

    const Kp = params.Kp || 0;
    const Ki = params.Ki || 0;
    const Kd = params.Kd || 0;

    // FIX STEP 2: tEnd lebih panjang
    const tEnd = Math.max(20, Tu * 10);
    const { t, y } = ChartEngine.simulateZN2(Kp, Ki, Kd, null, Tu, tEnd, 0.005);

    // FIX STEP 3: render dengan delay
    const variantLabel = document.getElementById('zn2-variant')
      .options[document.getElementById('zn2-variant').selectedIndex]
      .text.split('—')[0].trim();
    ChartEngine.renderChart('zn2-chart', t, y, `ZN Method 2 (${variantLabel}) — Step Response`);

    const analysis = ChartEngine.analyzeResponse(t, y);
    renderAnalysisSummary('zn2-analysis-summary', analysis);
    renderSuggestion('zn2-suggestion', analysis, Kp, Ki, Kd, 'ZN2');
  }

  function renderAnalysisSummary(boxId, analysis) {
    const box = document.getElementById(boxId);
    if (!analysis) { box.innerHTML = ''; return; }
    const { overshoot, ssError, settlingTime, riseTime } = analysis;
    const osClass = analysis.hasOvershoot ? 'warn' : 'success';
    const ssClass = !analysis.isSettled   ? 'warn' : 'success';
    box.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:.75rem;margin-top:.5rem;">
        ${_metricCard('Overshoot',     overshoot.toFixed(1) + '%',                  osClass)}
        ${_metricCard('SS Error',      ssError.toFixed(2) + '%',                    ssClass)}
        ${_metricCard('Settling Time', settlingTime.toFixed(2) + ' s',              '')}
        ${_metricCard('Rise Time',     riseTime ? riseTime.toFixed(3) + ' s' : '—', '')}
      </div>`;
  }

  function _metricCard(label, value, cls) {
    const colors = { warn:'#d97706', success:'#16a34a', '':'#2563eb' };
    const c = colors[cls] || '#2563eb';
    return `
      <div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:8px;padding:.75rem 1rem;text-align:center;">
        <div style="font-size:.72rem;color:#718096;letter-spacing:.06em;margin-bottom:.3rem;">${label}</div>
        <div style="font-size:1.1rem;font-weight:700;color:${c};font-family:'JetBrains Mono',monospace;">${value}</div>
      </div>`;
  }

  function renderSuggestion(boxId, analysis, Kp, Ki, Kd, label) {
    const box = document.getElementById(boxId);
    if (!analysis) { box.innerHTML = ''; return; }
    const fix = ChartEngine.suggestFix(analysis, Kp, Ki, Kd);
    if (!fix) { box.innerHTML = ''; return; }

    if (!fix.needsFix) {
      box.innerHTML = `
        <div class="suggestion-box">
          <div class="suggestion-title">✅ Respons Sudah Optimal</div>
          <p class="suggestion-note">${fix.reasons[0]}</p>
        </div>`;
      return;
    }

    box.innerHTML = `
      <div class="suggestion-box warning">
        <div class="suggestion-title">⚠ Saran Perbaikan (${label}) — Kp Dikunci</div>
        <div class="suggestion-row">
          <span class="suggestion-label">Kp (Terkunci — tidak diubah)</span>
          <span class="suggestion-value" style="color:#2563eb;">${Utils.fmt(Kp)}</span>
        </div>
        <div class="suggestion-row">
          <span class="suggestion-label">Ki saat ini → Saran baru</span>
          <span class="suggestion-value">${Utils.fmt(Ki)} → <strong style="color:#16a34a;">${Utils.fmt(fix.newKi)}</strong></span>
        </div>
        <div class="suggestion-row">
          <span class="suggestion-label">Kd saat ini → Saran baru</span>
          <span class="suggestion-value">${Utils.fmt(Kd)} → <strong style="color:#16a34a;">${Utils.fmt(fix.newKd)}</strong></span>
        </div>
        <div class="suggestion-note">
          ${fix.reasons.map(r => `• ${r}`).join('<br>')}
          <br><strong>Tips:</strong> Coba varian "No Overshoot" atau "Tyreus-Luyben" untuk respons lebih tenang.
        </div>
      </div>`;
  }

  function renderResult(type, variant, params) {
    const box = document.getElementById('zn2-result-box');
    const variantLabels = { ZN:'ZN Klasik', TL:'Tyreus-Luyben', Pessen:'Pessen Integral', NoOvershoot:'No Overshoot' };
    const rows = [
      ['Tipe Kontroler', type,                                          ''],
      ['Varian',         variantLabels[variant] || variant,             ''],
      ['Kp',             Utils.fmt(params.Kp),                          ''],
      ['Ki',             params.Ki != null ? Utils.fmt(params.Ki) : '—',''],
      ['Kd',             params.Kd != null ? Utils.fmt(params.Kd) : '—',''],
      ['Ti',             params.Ti != null ? Utils.fmt(params.Ti) : '—','s'],
      ['Td',             params.Td != null ? Utils.fmt(params.Td) : '—','s'],
    ];
    box.innerHTML = rows.map(([k, v, u]) => `
      <div class="result-row">
        <span class="result-key">${k}</span>
        <span class="result-val">${v}${u ? ' <span style="color:var(--text-dim);font-size:.75rem;">' + u + '</span>' : ''}</span>
      </div>`).join('');
  }

  function renderFreqAnalysis(res) {
    const box = document.getElementById('zn2-freq-box');
    box.innerHTML = `
      <div class="result-row">
        <span class="result-key">Ultimate Gain (Ku)</span>
        <span class="result-val">${Utils.fmt(res.ultimateGain)}</span>
      </div>
      <div class="result-row">
        <span class="result-key">Ultimate Period (Tu)</span>
        <span class="result-val">${Utils.fmt(res.ultimatePeriod)} <span style="color:var(--text-dim);font-size:.75rem;">s</span></span>
      </div>
      <div class="result-row">
        <span class="result-key">Ultimate Freq (ωu)</span>
        <span class="result-val">${Utils.fmt(res.ultimateFreqRad)} <span style="color:var(--text-dim);font-size:.75rem;">rad/s</span></span>
      </div>
      <div class="result-row">
        <span class="result-key">Gain Margin (ZN PID)</span>
        <span class="result-val">${Utils.fmt(res.gainMargin_dB)} <span style="color:var(--text-dim);font-size:.75rem;">dB</span></span>
      </div>
      <div class="result-row">
        <span class="result-key">Phase Margin Estimasi</span>
        <span class="result-val" style="font-size:.83rem;">${res.phaseMargin_est}</span>
      </div>
      <div class="result-row">
        <span class="result-key">Bandwidth Estimasi</span>
        <span class="result-val">${Utils.fmt(res.bandwidth_est)} <span style="color:var(--text-dim);font-size:.75rem;">rad/s</span></span>
      </div>`;
  }

  function renderComparison(res) {
    const box = document.getElementById('zn2-compare-box');
    const variants = [
      { label:'ZN Klasik',      group: res.ZN          },
      { label:'Tyreus-Luyben',  group: res.TL          },
      { label:'Pessen Integral',group: res.Pessen       },
      { label:'No Overshoot',   group: res.NoOvershoot  },
    ];
    const rows = variants.map(({ label, group }) => {
      const p = group ? (group['PID'] || null) : null;
      if (!p) return null;
      return { label, Kp: p.Kp, Ki: p.Ki, Kd: p.Kd, Ti: p.Ti, Td: p.Td };
    }).filter(Boolean);

    box.innerHTML = `
      <table class="routh-table" style="font-size:.82rem;">
        <thead>
          <tr>
            <th style="text-align:left;">Varian</th>
            <th>Kp</th><th>Ki</th><th>Kd</th><th>Ti (s)</th><th>Td (s)</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr>
              <td class="row-label">${r.label}</td>
              <td>${r.Kp != null ? Utils.fmt(r.Kp) : '—'}</td>
              <td>${r.Ki != null ? Utils.fmt(r.Ki) : '—'}</td>
              <td>${r.Kd != null ? Utils.fmt(r.Kd) : '—'}</td>
              <td>${r.Ti != null ? Utils.fmt(r.Ti) : '—'}</td>
              <td>${r.Td != null ? Utils.fmt(r.Td) : '—'}</td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  }

  function showError(msg) {
    document.getElementById('zn2-result-box').innerHTML  = `<div class="result-val error">✖ ${msg}</div>`;
    document.getElementById('zn2-freq-box').innerHTML    = `<div class="result-empty">—</div>`;
    document.getElementById('zn2-compare-box').innerHTML = `<div class="result-empty">—</div>`;
    document.getElementById('zn2-chart-card').style.display = 'none';
  }

  function resetAll() {
    ['zn2-Ku','zn2-Tu'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    document.getElementById('zn2-result-box').innerHTML  = `<div class="result-empty">— Belum ada data —</div>`;
    document.getElementById('zn2-freq-box').innerHTML    = `<div class="result-empty">— Belum ada data —</div>`;
    document.getElementById('zn2-compare-box').innerHTML = `<div class="result-empty">— Belum ada data —</div>`;
    document.getElementById('zn2-chart-card').style.display = 'none';
  }

  return { init };
})();