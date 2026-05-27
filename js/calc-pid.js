/**
 * calc-pid.js — PID Controller Parameter Calculator
 * Separation of concerns: PURE MATH ONLY
 *
 * Supports:
 *   - Analisis parameter PID (Kp, Ki, Kd, Ti, Td)
 *   - Transfer function PID
 *   - Respons time domain parameter estimation
 *   - Konversi antar bentuk PID (Parallel, Ideal, Series)
 */

const CalcPID = (() => {

  /**
   * Compute full PID parameters from Kp, Ti (integral time), Td (derivative time)
   * Returns all derived parameters
   */
  function computeFromKpTiTd(Kp, Ti, Td) {
    if (!isFinite(Kp)) return { error: 'Kp tidak valid.' };

    const Ki = Ti !== 0 ? Kp / Ti : 0;
    const Kd = Kp * Td;

    return _buildResult(Kp, Ki, Kd, Ti, Td);
  }

  /**
   * Compute PID from Kp, Ki, Kd (parallel form)
   */
  function computeFromKpKiKd(Kp, Ki, Kd) {
    if (!isFinite(Kp)) return { error: 'Kp tidak valid.' };

    const Ti = Ki !== 0 ? Kp / Ki : Infinity;
    const Td = Kp !== 0 ? Kd / Kp : 0;

    return _buildResult(Kp, Ki, Kd, Ti, Td);
  }

  function _buildResult(Kp, Ki, Kd, Ti, Td) {
    // Dominant poles characteristic
    const bandwidth_est = Td !== 0 ? 1 / Td : null;

    // Stability conditions (simplified — no plant info)
    // Transfer function: C(s) = Kp + Ki/s + Kd*s = (Kd*s^2 + Kp*s + Ki) / s
    const tfNum = [Kd, Kp, Ki];      // numerator coefficients [s^2, s^1, s^0]
    const tfDen = [1, 0];             // denominator: s

    // Series (cascade) form equivalents
    const series_K  = Kd !== 0 ? Kp * Kp / Kd : null;
    const series_Ti = Kp !== 0 && Ki !== 0 ? Kp / Ki : null;
    const series_Td = Kp !== 0 ? Kd / Kp : null;

    // Phase margin contribution estimate (simplified)
    const phaseContrib = Td > 0 ? `+${Utils.fmt(Math.atan(Td) * 180 / Math.PI, 2)}° (dari aksi D)` : 'N/A';

    return {
      // Core parameters
      Kp: Utils.round(Kp, 6),
      Ki: Utils.round(Ki, 6),
      Kd: Utils.round(Kd, 6),
      Ti: isFinite(Ti) ? Utils.round(Ti, 6) : '∞ (Pure P/PD)',
      Td: Utils.round(Td, 6),

      // Transfer function
      tfNumerator:   tfNum,
      tfDenominator: tfDen,
      tfString: _buildTFString(Kp, Ki, Kd),

      // Converted forms
      parallelForm: `Kp=${Utils.fmt(Kp)} | Ki=${Utils.fmt(Ki)} | Kd=${Utils.fmt(Kd)}`,
      idealForm:    `Kp=${Utils.fmt(Kp)} × (1 + 1/${Utils.fmt(isFinite(Ti) ? Ti : '∞')}s + ${Utils.fmt(Td)}s)`,
      seriesForm:   series_K
        ? `K=${Utils.fmt(series_K)} × (1 + 1/${Utils.fmt(series_Ti)}s) × (1 + ${Utils.fmt(series_Td)}s)`
        : 'N/A (Kd=0)',

      // Control action characteristics
      proportionalAction: `Output = ${Utils.fmt(Kp)} × e(t)`,
      integralAction:     `Output = ${Utils.fmt(Ki)} × ∫e(t)dt`,
      derivativeAction:   `Output = ${Utils.fmt(Kd)} × de(t)/dt`,

      // Performance indicators
      steadyStateError: Ki > 0 ? '0 (dieliminasi oleh aksi I)' : 'Ada (tergantung plant)',
      phaseContrib,
      windupRisk: Ki > 0 ? 'Ada — pertimbangkan anti-windup' : 'Tidak ada',

      // Type determination
      controllerType: _getType(Kp, Ki, Kd),
    };
  }

  function _getType(Kp, Ki, Kd) {
    if (Kp !== 0 && Ki === 0 && Kd === 0) return 'P (Proportional)';
    if (Kp !== 0 && Ki !== 0 && Kd === 0) return 'PI (Proportional-Integral)';
    if (Kp !== 0 && Ki === 0 && Kd !== 0) return 'PD (Proportional-Derivative)';
    if (Kp !== 0 && Ki !== 0 && Kd !== 0) return 'PID (Full)';
    return 'Tidak diketahui';
  }

  function _buildTFString(Kp, Ki, Kd) {
    let parts = [];
    if (Kd !== 0) parts.push(`${Utils.fmt(Kd)}s²`);
    if (Kp !== 0) parts.push(`${Utils.fmt(Kp)}s`);
    if (Ki !== 0) parts.push(`${Utils.fmt(Ki)}`);
    if (parts.length === 0) return '0';
    return `C(s) = [${parts.join(' + ')}] / s`;
  }

  return { computeFromKpTiTd, computeFromKpKiKd };
})();