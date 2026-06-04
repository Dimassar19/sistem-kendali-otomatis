/**
 * render-routh.js — UI Renderer for Routh-Hurwitz tab
 * Separation of concerns: DOM RENDERING ONLY
 * Updated for light theme — no dark color overrides
 */

const RenderRouth = (() => {

  function init(container) {
    Utils.clear(container);
    container.innerHTML = `
      <div class="calc-container">

        <!-- ── INPUT PANEL ── -->
        <div class="panel-card">
          <div class="panel-title">⬡ Input Polinomial Karakteristik</div>
          <div class="info-strip">
            Masukkan koefisien polinomial karakteristik dari <strong>orde tertinggi ke terendah</strong>.
            Contoh: s³ + 6s² + 11s + 6 → <strong>1, 6, 11, 6</strong>
          </div>

          <div class="field-group">
            <label class="field-label">Orde Polinomial</label>
            <select class="field-select" id="routh-order">
              <option value="2">Orde 2</option>
              <option value="3" selected>Orde 3</option>
              <option value="4">Orde 4</option>
              <option value="5">Orde 5</option>
              <option value="6">Orde 6</option>
            </select>
          </div>

          <div id="routh-coeff-fields"></div>

          <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
            <button class="btn-calc" id="routh-calc-btn">▶ HITUNG</button>
            <button class="btn-reset" id="routh-reset-btn">↺ Reset</button>
          </div>

          <div style="margin-top:1.2rem;">
            <div class="field-label">Contoh Cepat:</div>
            <div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.4rem;" id="routh-examples">
              <button class="btn-example" data-coeffs="1,6,11,6">Stabil: 1,6,11,6</button>
              <button class="btn-example" data-coeffs="1,1,-1,1">Tidak Stabil</button>
              <button class="btn-example" data-coeffs="1,2,3,4,5">Orde 4: 1,2,3,4,5</button>
            </div>
          </div>
        </div>

        <!-- ── RESULT: STATUS ── -->
        <div class="panel-card">
          <div class="panel-title">◈ Status Kestabilan</div>
          <div class="result-box" id="routh-status-box">
            <div class="result-empty">— Masukkan koefisien dan tekan HITUNG —</div>
          </div>
        </div>

        <!-- ── ROUTH TABLE ── -->
        <div class="panel-card full-width">
          <div class="panel-title">⊞ Tabel Routh-Hurwitz</div>
          <div class="result-box" id="routh-table-box" style="min-height:100px; overflow-x:auto;">
            <div class="result-empty">— Belum ada data —</div>
          </div>
        </div>

        <!-- ── NOTES ── -->
        <div class="panel-card full-width">
          <div class="panel-title">📝 Catatan & Kasus Khusus</div>
          <div class="result-box" id="routh-notes-box" style="min-height:60px;">
            <div class="result-empty">— Belum ada data —</div>
          </div>
        </div>

      </div>
    `;

    // Build coefficient fields on order change
    function buildFields(order) {
      const container = document.getElementById('routh-coeff-fields');
      container.innerHTML = '';
      const row = document.createElement('div');
      row.className = 'field-row';
      row.style.gridTemplateColumns = `repeat(${Math.min(order + 1, 4)}, 1fr)`;

      for (let i = order; i >= 0; i--) {
        const group = document.createElement('div');
        group.className = 'field-group';
        group.innerHTML = `
          <label class="field-label">a${i} (s^${i})</label>
          <input class="field-input" id="routh-a${i}" type="number" step="any" placeholder="0" />
        `;
        row.appendChild(group);
      }
      container.appendChild(row);
    }

    const orderSel = document.getElementById('routh-order');
    orderSel.addEventListener('change', () => buildFields(parseInt(orderSel.value)));
    buildFields(parseInt(orderSel.value));

    // Example buttons
    container.querySelectorAll('#routh-examples .btn-example').forEach(btn => {
      btn.addEventListener('click', () => {
        const coeffs = btn.dataset.coeffs.split(',').map(Number);
        const order  = coeffs.length - 1;
        orderSel.value = String(order);
        buildFields(order);
        coeffs.forEach((v, idx) => {
          const exp = order - idx;
          const el = document.getElementById(`routh-a${exp}`);
          if (el) el.value = v;
        });
      });
    });

    document.getElementById('routh-calc-btn').addEventListener('click', runCalc);
    document.getElementById('routh-reset-btn').addEventListener('click', () => {
      buildFields(parseInt(orderSel.value));
      ['routh-status-box','routh-table-box','routh-notes-box'].forEach(id => {
        document.getElementById(id).innerHTML = `<div class="result-empty">— Belum ada data —</div>`;
      });
    });
  }

  // ─────────────────────────────────────────────
  function runCalc() {
    const order = parseInt(document.getElementById('routh-order').value);
    const coeffs = [];
    for (let i = order; i >= 0; i--) {
      const v = parseFloat(document.getElementById(`routh-a${i}`).value);
      coeffs.push(isNaN(v) ? 0 : v);
    }

    if (coeffs.every(c => c === 0)) { showError('Semua koefisien nol.'); return; }

    const res = CalcRouth.compute(coeffs);
    if (res.error) { showError(res.error); return; }

    renderStatus(res);
    renderTable(res);
    renderNotes(res);
  }

  function renderStatus(res) {
    const box = document.getElementById('routh-status-box');
    const cls = res.status === 'STABIL' ? 'stable' : res.status.includes('MARGINAL') ? 'marginal' : 'unstable';
    const icon = { stable: '✔', unstable: '✖', marginal: '⚠' }[cls];

    box.innerHTML = `
      <div class="status-badge ${cls}">${icon} ${res.status}</div>
      <div class="result-row">
        <span class="result-key">Orde Polinomial</span>
        <span class="result-val">${res.order}</span>
      </div>
      <div class="result-row">
        <span class="result-key">Perubahan Tanda (Kolom 1)</span>
        <span class="result-val ${res.signChanges > 0 ? 'error' : 'success'}">${res.signChanges}</span>
      </div>
      <div class="result-row">
        <span class="result-key">Akar di RHP</span>
        <span class="result-val ${res.rhpRoots > 0 ? 'error' : 'success'}">${res.rhpRoots}</span>
      </div>
      <div class="result-row">
        <span class="result-key">Syarat Perlu (semua koef. setanda)</span>
        <span class="result-val ${res.necessaryCondition ? 'success' : 'warn'}">${res.necessaryCondition ? 'Terpenuhi ✔' : 'Tidak Terpenuhi ✖'}</span>
      </div>
    `;
  }

  function renderTable(res) {
    const box = document.getElementById('routh-table-box');
    const { table, labels, firstCol } = res;
    const cols = Math.max(...table.map(r => r.length));

    // Detect sign changes
    const signChangeRows = new Set();
    for (let i = 1; i < firstCol.length; i++) {
      if (firstCol[i] * firstCol[i - 1] < 0) signChangeRows.add(i);
    }

    let html = `<table class="routh-table"><thead><tr><th>Baris</th>`;
    for (let j = 0; j < cols; j++) html += `<th>Kolom ${j + 1}</th>`;
    html += `</tr></thead><tbody>`;

    table.forEach((row, i) => {
      const cls = signChangeRows.has(i) ? 'sign-change' : '';
      html += `<tr class="${cls}"><td class="row-label">${labels[i]}</td>`;
      for (let j = 0; j < cols; j++) {
        const v = row[j] ?? 0;
        const formatted = Math.abs(v) < 1e-9 ? '0' : Utils.fmt(v);
        html += `<td>${formatted}</td>`;
      }
      html += `</tr>`;
    });

    html += `</tbody></table>`;
    box.innerHTML = html;
  }

  function renderNotes(res) {
    const box = document.getElementById('routh-notes-box');
    if (!res.notes || res.notes.length === 0) {
      box.innerHTML = `<div class="result-empty">Tidak ada kasus khusus.</div>`;
      return;
    }
    box.innerHTML = res.notes.map(n => `
      <div class="result-row" style="align-items:flex-start;">
        <span style="color:#d97706;margin-right:.5rem;margin-top:.1rem;">⚠</span>
        <span style="color:var(--text-main);font-size:.83rem;line-height:1.5;">${n}</span>
      </div>`).join('');
  }

  function showError(msg) {
    ['routh-status-box','routh-table-box','routh-notes-box'].forEach(id => {
      document.getElementById(id).innerHTML = id === 'routh-status-box'
        ? `<div class="result-val error">✖ ${msg}</div>`
        : `<div class="result-empty">—</div>`;
    });
  }

  return { init };
})();