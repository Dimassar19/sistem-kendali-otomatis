/**
 * calc-routh.js — Routh-Hurwitz Stability Criterion Calculator
 * Separation of concerns: PURE MATH ONLY — no DOM access
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
          // Recalculate newRow with updated prev1
          const updatedPrev1 = table[i - 1];
          const pivot2 = updatedPrev1[0];
          for (let j = 0; j < cols - 1; j++) {
            newRow.push(
              (pivot2 * prev2[j + 1] - prev2[0] * updatedPrev1[j + 1]) / pivot2
            );
          }
          newRow.unshift(0); // first element placeholder
          newRow = _computeRow(table[i - 1], prev2);
        } else {
          // Replace pivot with ε (small positive number)
          notes.push(`Elemen pertama baris ${i - 1} = 0 → diganti dengan ε (epsilon kecil positif).`);
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

    let status;
    if (signChanges === 0 && necessaryMet) {
      status = 'STABIL';
    } else if (signChanges === 0 && !necessaryMet) {
      status = 'MARGINAL / TAK STABIL';
      notes.push('Syarat perlu tidak terpenuhi: tidak semua koefisien bertanda sama.');
    } else {
      status = 'TIDAK STABIL';
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