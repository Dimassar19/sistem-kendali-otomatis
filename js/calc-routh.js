/**
 * calc-routh.js — Routh-Hurwitz Stability Criterion Calculator
 * Separation of concerns: PURE MATH ONLY — no DOM access
 *
 * PERBAIKAN v2:
 *  - Catatan (notes) kini muncul untuk semua kasus tidak stabil
 *  - Penjelasan perubahan tanda dan akar RHP ditambahkan
 *  - Catatan syarat perlu juga muncul saat koefisien tidak setanda
 */

const CalcRouth = (() => {

  /**
   * Build the full Routh Array from polynomial coefficients.
   * Coefficients: [a_n, a_{n-1}, ..., a_1, a_0]
   * Returns: { table, labels, signChanges, status, rhpRoots, notes }
   */
  function compute(coeffs) {
    const n = coeffs.length;
    if (n < 2) return { error: 'Minimal 2 koefisien diperlukan.' };

    const order = n - 1; // polynomial order
    const cols  = Math.ceil(n / 2);

    // Build first two rows
    let table = [];
    let row0 = [], row1 = [];

    for (let j = 0; j < cols; j++) {
      row0.push(coeffs[2 * j]       ?? 0);
      row1.push(coeffs[2 * j + 1]   ?? 0);
    }

    table.push(row0);
    table.push(row1);

    const notes = [];

    // Build remaining rows
    for (let i = 2; i <= order; i++) {
      const prev1 = table[i - 1];
      const prev2 = table[i - 2];
      const pivot = prev1[0];

      let newRow = [];

      // Special case: pivot is zero
      if (Utils.isZero(pivot)) {
        // Check if entire row is zero (auxiliary polynomial case)
        const allZero = prev1.every(v => Utils.isZero(v));

        if (allZero) {
          // Auxiliary polynomial from row i-2
          const auxRow = _auxiliaryDerivative(prev2, order - i + 2);
          notes.push(`Baris ${i - 1} seluruhnya nol — gunakan polinomial bantu (auxiliary polynomial) berorde ${order - i + 2}.`);
          table[i - 1] = auxRow.slice(0, cols);
          newRow = _computeRow(table[i - 1], prev2);
        } else {
          // Replace pivot with ε (small positive number)
          notes.push(`Elemen pertama baris ke-${i - 1} (s^${order - i + 1}) = 0 → diganti dengan ε (epsilon kecil positif) untuk melanjutkan perhitungan.`);
          const epsilon = 1e-7;
          const modPrev1 = [epsilon, ...prev1.slice(1)];
          newRow = _computeRow(modPrev1, prev2);
        }
      } else {
        newRow = _computeRow(prev1, prev2);
      }

      table.push(newRow);
    }

    // Extract first column
    const firstCol = table.map(row => row[0]);

    // Count sign changes in first column
    const signChanges = Utils.countSignChanges(firstCol);

    // Check if all coefficients are positive/negative (necessary condition)
    const allPositive = coeffs.every(c => c > 0);
    const allNegative = coeffs.every(c => c < 0);
    const necessaryMet = allPositive || allNegative;

    // ── Tentukan Status & Tambahkan Catatan ──
    let status;

    if (signChanges === 0 && necessaryMet) {
      // ── STABIL ──
      status = 'STABIL';
      // Tidak perlu catatan khusus jika benar-benar stabil

    } else if (signChanges === 0 && !necessaryMet) {
      // ── MARGINAL / TAK STABIL — syarat perlu gagal, tapi kolom 1 tidak berubah tanda ──
      status = 'MARGINAL / TAK STABIL';
      notes.push(
        'Syarat perlu tidak terpenuhi: tidak semua koefisien polinomial bertanda sama. ' +
        'Sistem dipastikan tidak stabil atau marginal tanpa perlu melanjutkan analisis tabel.'
      );

    } else {
      // ── TIDAK STABIL — ada perubahan tanda pada kolom pertama ──
      status = 'TIDAK STABIL';

      notes.push(
        `Terdapat ${signChanges} perubahan tanda pada kolom pertama tabel Routh → ` +
        `sistem memiliki ${signChanges} akar di Right Half Plane (RHP). ` +
        `Sistem closed-loop TIDAK STABIL.`
      );

      if (!necessaryMet) {
        // Cari koefisien mana yang bermasalah
        const negCoeffs = coeffs
          .map((c, i) => ({ exp: order - i, val: c }))
          .filter(({ val }) => val < 0 || val === 0);

        const detailList = negCoeffs
          .map(({ exp, val }) => `a${exp}=${Utils.fmt(val, 4)} (s^${exp})`)
          .join(', ');

        notes.push(
          `Syarat perlu tidak terpenuhi: koefisien berikut bertanda negatif atau nol → [${detailList}]. ` +
          `Semua koefisien harus bertanda sama (semua positif atau semua negatif) agar sistem berpeluang stabil.`
        );
      }

      // Identifikasi baris mana saja yang menyebabkan perubahan tanda
      const signChangeRows = [];
      const nonzeroCol = firstCol.filter(v => !Utils.isZero(v));
      const labels_temp = [];
      for (let i = order; i >= 0; i--) labels_temp.push(`s^${i}`);

      for (let i = 1; i < firstCol.length; i++) {
        const prev = firstCol[i - 1];
        const curr = firstCol[i];
        if (!Utils.isZero(prev) && !Utils.isZero(curr) && prev * curr < 0) {
          signChangeRows.push(
            `Perubahan tanda: ${labels_temp[i - 1]} (${Utils.fmt(prev, 4)}) → ${labels_temp[i]} (${Utils.fmt(curr, 4)})`
          );
        }
      }

      if (signChangeRows.length > 0) {
        notes.push('Detail perubahan tanda pada kolom 1: ' + signChangeRows.join(' | '));
      }
    }

    // Labels: s^n, s^{n-1}, ..., s^0
    const labels = [];
    for (let i = order; i >= 0; i--) {
      labels.push(`s^${i}`);
    }

    return {
      table,
      labels,
      firstCol,
      signChanges,
      rhpRoots: signChanges,
      status,
      order,
      necessaryCondition: necessaryMet,
      notes,
    };
  }

  /** Compute one row of the Routh table given two previous rows */
  function _computeRow(prev1, prev2) {
    const pivot = prev1[0];
    const cols  = prev2.length;
    const newRow = [];

    for (let j = 0; j < cols - 1; j++) {
      const val = (pivot * (prev2[j + 1] ?? 0) - prev2[0] * (prev1[j + 1] ?? 0)) / pivot;
      newRow.push(val);
    }

    // Pad with zeros to keep consistent column count
    while (newRow.length < cols) newRow.push(0);
    return newRow;
  }

  /** Derive auxiliary polynomial coefficients (derivative w.r.t. s^2) */
  function _auxiliaryDerivative(row, degree) {
    const result = [];
    for (let i = 0; i < row.length; i++) {
      const exp = degree - 2 * i;
      result.push(exp * row[i]);
    }
    return result;
  }

  return { compute };
})();