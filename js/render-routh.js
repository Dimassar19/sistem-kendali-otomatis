/**
 * render-routh.js — UI renderer for Routh-Hurwitz tab
 */

const RenderRouth = (() => {

  function init(container) {
    Utils.clear(container);

    container.innerHTML = `
      <div class="calc-container">

        <!-- INPUT PANEL -->
        <div class="panel-card">
          <div class="panel-title">⬡ Input Koefisien Polinomial</div>
          <div class="info-strip">
            Masukkan koefisien karakteristik polinomial <strong>a(s) = aₙsⁿ + ... + a₁s + a₀</strong>
            dari pangkat tertinggi ke terendah, dipisah spasi atau koma.
          </div>

          <div class="field-group">
            <label class="field-label">Koefisien (dari sⁿ → s⁰)</label>
            <input class="field-input" id="routh-coeffs" type="text"
              placeholder="contoh: 1 2 3 4  atau  1, 6, 11, 6, 1" />
            <div class="field-hint">Contoh: s³+6s²+11s+6 → masukkan: 1 6 11 6</div>
          </div>

          <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
            <button class="btn-calc" id="routh-calc-btn">▶ HITUNG</button>
            <button class="btn-reset" id="routh-reset-btn">↺ Reset</button>
          </div>

          <!-- Quick examples -->
          <div style="margin-top:1.2rem;">
            <div class="field-label">Contoh Cepat:</div>
            <div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.4rem;">
              <button class="btn-example" data-val="1 6 11 6">Orde 3 (Stabil)</button>
              <button class="btn-example" data-val="1 1 2 24">Orde 3 (Tidak Stabil)</button>
              <button class="btn-example" data-val="1 2 3 4 5">Orde 4</button>
              <button class="btn-example" data-val="1 0 1">Marginal</button>
            </div>
          </div>
        </div>

        <!-- RESULT: STATUS -->
        <div class="panel-card" id="routh-status-card">
          <div class="panel-title">◈ Status Kestabilan</div>
          <div class="result-box" id="routh-status-box">
            <div class="result-empty">— Masukkan koefisien dan tekan HITUNG —</div>
          </div>
        </div>

        <!-- RESULT: ROUTH TABLE -->
        <div class="panel-card full-width" id="routh-table-card">
          <div class="panel-title">◫ Tabel Routh-Hurwitz</div>
          <div class="result-box" id="routh-table-box" style="min-height:80px;">
            <div class="result-empty">— Belum ada data —</div>
          </div>
        </div>

        <!-- RESULT: ANALYSIS -->
        <div class="panel-card full-width" id="routh-analysis-card">
          <div class="panel-title">◉ Analisis Lengkap</div>
          <div class="result-box" id="routh-analysis-box" style="min-height:80px;">
            <div class="result-empty">— Belum ada data —</div>
          </div>
        </div>

      </div>
    `;

    // Add example button styles inline
    container.querySelectorAll('.btn-example').forEach(btn => {
      btn.style.cssText = `
        font-family:var(--font-mono);font-size:.7rem;padding:.35rem .8rem;
        background:rgba(0,255,231,.07);border:1px solid var(--border);
        color:var(--text-dim);cursor:pointer;border-radius:var(--radius);
        transition:all .2s;letter-spacing:.06em;
      `;
      btn.addEventListener('mouseenter', () => {
        btn.style.borderColor = 'var(--accent1)';
        btn.style.color = 'var(--accent1)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.borderColor = 'var(--border)';
        btn.style.color = 'var(--text-dim)';
      });
      btn.addEventListener('click', () => {
        document.getElementById('routh-coeffs').value = btn.dataset.val;
      });
    });

    document.getElementById('routh-calc-btn').addEventListener('click', runCalc);
    document.getElementById('routh-reset-btn').addEventListener('click', resetAll);

    document.getElementById('routh-coeffs').addEventListener('keydown', e => {
      if (e.key === 'Enter') runCalc();
    });
  }

  function runCalc() {
    const raw    = document.getElementById('routh-coeffs').value;
    const coeffs = Utils.parseCoeffs(raw);

    if (coeffs.length < 2) {
      showError('Masukkan minimal 2 koefisien yang valid.');
      return;
    }

    const res = CalcRouth.compute(coeffs);

    if (res.error) {
      showError(res.error);
      return;
    }

    renderStatus(res);
    renderTable(res);
    renderAnalysis(res, coeffs);
  }

  function renderStatus(res) {
    const box = document.getElementById('routh-status-box');
    let badgeClass = 'marginal';
    let icon = '◈';
    if (res.status === 'STABIL')        { badgeClass = 'stable';   icon = '✔'; }
    if (res.status === 'TIDAK STABIL')  { badgeClass = 'unstable'; icon = '✖'; }

    box.innerHTML = `
      <div class="status-badge ${badgeClass}">${icon} ${res.status}</div>
      <div class="result-row">
        <span class="result-key">Orde Sistem</span>
        <span class="result-val">n = ${res.order}</span>
      </div>
      <div class="result-row">
        <span class="result-key">Akar di RHP (tidak stabil)</span>
        <span class="result-val ${res.rhpRoots > 0 ? 'error' : 'success'}">${res.rhpRoots}</span>
      </div>
      <div class="result-row">
        <span class="result-key">Perubahan tanda (kolom 1)</span>
        <span class="result-val ${res.signChanges > 0 ? 'error' : 'success'}">${res.signChanges}</span>
      </div>
      <div class="result-row">
        <span class="result-key">Syarat Perlu (semua koef. bertanda sama)</span>
        <span class="result-val ${res.necessaryCondition ? 'success' : 'warn'}">
          ${res.necessaryCondition ? '✔ Terpenuhi' : '✖ Tidak Terpenuhi'}
        </span>
      </div>
      ${res.notes.length ? `
        <div style="margin-top:.8rem;padding-top:.8rem;border-top:1px solid var(--border);">
          ${res.notes.map(n => `
            <div style="color:var(--yellow);font-size:.74rem;line-height:1.5;margin-bottom:.4rem;">⚠ ${n}</div>
          `).join('')}
        </div>
      ` : ''}
    `;
  }

  function renderTable(res) {
    const box = document.getElementById('routh-table-box');

    // Determine sign-change rows (compare consecutive first-col signs)
    const fc = res.firstCol;
    const signChangeRows = new Set();
    const nonzero = fc.map((v, i) => ({ v, i })).filter(x => !Utils.isZero(x.v));
    for (let k = 1; k < nonzero.length; k++) {
      if (nonzero[k].v * nonzero[k - 1].v < 0) {
        signChangeRows.add(nonzero[k].i);
      }
    }

    let html = `<div style="overflow-x:auto;">
      <table class="routh-table">
        <thead>
          <tr>
            <th>Baris</th>
            ${res.table[0].map((_, j) => `<th>Kolom ${j + 1}</th>`).join('')}
            <th>Kolom 1 (±)</th>
          </tr>
        </thead>
        <tbody>
    `;

    res.table.forEach((row, i) => {
      const isChange = signChangeRows.has(i);
      html += `<tr ${isChange ? 'class="sign-change"' : ''}>
        <td class="row-label">${res.labels[i]}</td>
        ${row.map(v => `<td>${Utils.fmt(v)}</td>`).join('')}
        <td style="color:${fc[i] > 0 ? 'var(--green)' : fc[i] < 0 ? 'var(--red)' : 'var(--yellow)'}">
          ${fc[i] > 0 ? '+' : fc[i] < 0 ? '−' : '0'}
        </td>
      </tr>`;
    });

    html += `</tbody></table></div>`;
    box.innerHTML = html;
  }

  function renderAnalysis(res, coeffs) {
    const box = document.getElementById('routh-analysis-box');
    box.innerHTML = `
      <div class="result-row">
        <span class="result-key">Koefisien Input</span>
        <span class="result-val">[${coeffs.join(', ')}]</span>
      </div>
      <div class="result-row">
        <span class="result-key">Kolom Pertama Routh</span>
        <span class="result-val">[${res.firstCol.map(v => Utils.fmt(v)).join(', ')}]</span>
      </div>
      <div class="result-row">
        <span class="result-key">Kesimpulan</span>
        <span class="result-val ${res.status === 'STABIL' ? 'success' : 'error'}">
          ${res.status === 'STABIL'
            ? 'Semua akar berada di LHP → Sistem STABIL'
            : res.rhpRoots + ' akar di RHP → Sistem TIDAK STABIL'}
        </span>
      </div>
      <div style="margin-top:1rem;" class="formula-box">
        <strong>Syarat Routh-Hurwitz:</strong><br>
        1. Syarat Perlu: Semua koefisien harus ada dan bertanda sama.<br>
        2. Syarat Cukup: Semua elemen kolom pertama Tabel Routh bertanda sama (tidak ada perubahan tanda).<br>
        3. Jumlah perubahan tanda = jumlah akar di Right Half Plane (RHP).
      </div>
    `;
  }

  function showError(msg) {
    const box = document.getElementById('routh-status-box');
    box.innerHTML = `<div class="result-val error" style="padding:.5rem;">✖ Error: ${msg}</div>`;
    document.getElementById('routh-table-box').innerHTML     = `<div class="result-empty">—</div>`;
    document.getElementById('routh-analysis-box').innerHTML  = `<div class="result-empty">—</div>`;
  }

  function resetAll() {
    document.getElementById('routh-coeffs').value = '';
    ['routh-status-box', 'routh-table-box', 'routh-analysis-box'].forEach(id => {
      document.getElementById(id).innerHTML = `<div class="result-empty">— Belum ada data —</div>`;
    });
  }

  return { init };
})();