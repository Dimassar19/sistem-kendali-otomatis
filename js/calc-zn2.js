/**
 * calc-zn2.js — Ziegler-Nichols Method 2: Ultimate Gain / Frequency Response (Closed Loop)
 * Separation of concerns: PURE MATH ONLY
 *
 * Metode ini menggunakan parameter kritis:
 *   - Ku : Ultimate gain / penguatan kritis
 *   - Tu : Ultimate period / periode osilasi kritis (detik)
 *
 * Diperoleh dengan:
 *   1. Set kontroler ke Pure-P
 *   2. Naikkan Kp hingga sistem berosilasi stabil → Ku
 *   3. Catat periode osilasi → Tu
 */

const CalcZN2 = (() => {

  /**
   * Main computation from Ku and Tu
   * Returns tuning parameters for P, PI, PD, PID
   * Also includes Tyreus-Luyben and Modified ZN variants
   */
  function compute(Ku, Tu) {
    if (Ku <= 0) return { error: 'Ultimate gain (Ku) harus > 0.' };
    if (Tu <= 0) return { error: 'Ultimate period (Tu) harus > 0.' };

    // Derived frequency parameters
    const omega_u = (2 * Math.PI) / Tu;   // ultimate frequency (rad/s)
    const f_u     = 1 / Tu;               // ultimate frequency (Hz)

    // ===== ZIEGLER-NICHOLS CLASSIC (ZN) =====
    const ZN = {
      P: {
        Kp: Utils.round(0.5 * Ku, 4),
      },
      PI: {
        Kp: Utils.round(0.45 * Ku, 4),
        Ti: Utils.round(Tu / 1.2, 4),
        get Ki() { return Utils.round(this.Kp / this.Ti, 6); },
      },
      PD: {
        Kp: Utils.round(0.8 * Ku, 4),
        Td: Utils.round(Tu / 8, 4),
        get Kd() { return Utils.round(this.Kp * this.Td, 6); },
      },
      PID: {
        Kp: Utils.round(0.6 * Ku, 4),
        Ti: Utils.round(Tu / 2, 4),
        Td: Utils.round(Tu / 8, 4),
        get Ki() { return Utils.round(this.Kp / this.Ti, 6); },
        get Kd() { return Utils.round(this.Kp * this.Td, 6); },
      },
    };

    // ===== TYREUS-LUYBEN (TL) — less aggressive, less overshoot =====
    const TL = {
      PI: {
        Kp: Utils.round(Ku / 3.2, 4),
        Ti: Utils.round(2.2 * Tu, 4),
        get Ki() { return Utils.round(this.Kp / this.Ti, 6); },
      },
      PID: {
        Kp: Utils.round(Ku / 2.2, 4),
        Ti: Utils.round(2.2 * Tu, 4),
        Td: Utils.round(Tu / 6.3, 4),
        get Ki() { return Utils.round(this.Kp / this.Ti, 6); },
        get Kd() { return Utils.round(this.Kp * this.Td, 6); },
      },
    };

    // ===== SOME OVERSHOOT (PESSEN INTEGRAL RULE) =====
    const Pessen = {
      PID: {
        Kp: Utils.round(0.7 * Ku, 4),
        Ti: Utils.round(0.4 * Tu, 4),
        Td: Utils.round(0.15 * Tu, 4),
        get Ki() { return Utils.round(this.Kp / this.Ti, 6); },
        get Kd() { return Utils.round(this.Kp * this.Td, 6); },
      },
    };

    // ===== NO OVERSHOOT VARIANT =====
    const NoOvershoot = {
      PID: {
        Kp: Utils.round(0.2 * Ku, 4),
        Ti: Utils.round(Tu / 2, 4),
        Td: Utils.round(Tu / 3, 4),
        get Ki() { return Utils.round(this.Kp / this.Ti, 6); },
        get Kd() { return Utils.round(this.Kp * this.Td, 6); },
      },
    };

    // ===== PERFORMANCE ANALYSIS =====
    // ZN classic PID typical characteristics
    const overshoot_ZN   = '~25% (agresif, settling cepat)';
    const overshoot_TL   = '~10-15% (moderat)';
    const overshoot_Pess = '~5% (beberapa overshoot)';
    const overshoot_NO   = '~0% (no overshoot, respon lambat)';

    // Gain margin (ZN PID provides ~GM = 1.66 ≈ 4.4 dB)
    const gainMargin_dB  = Utils.round(20 * Math.log10(Ku / ZN.PID.Kp), 2);

    // Phase margin estimate (ZN ~30-45°)
    const phaseMargin_est = '30° – 45° (ZN Classic)';

    // Bandwidth estimate
    const bandwidth_est = Utils.round(omega_u / 2, 3);

    return {
      // Input echoed
      ultimateGain:   Utils.round(Ku, 4),
      ultimatePeriod: Utils.round(Tu, 4),
      ultimateFreqRad: Utils.round(omega_u, 4),
      ultimateFreqHz:  Utils.round(f_u, 4),

      // Tuning sets
      ZN,
      TL,
      Pessen,
      NoOvershoot,

      // Analysis
      gainMargin_dB,
      phaseMargin_est,
      bandwidth_est,

      // Overshoot guide
      overshootGuide: {
        ZN:         overshoot_ZN,
        TyreusLuyben: overshoot_TL,
        Pessen:     overshoot_Pess,
        NoOvershoot: overshoot_NO,
      },
    };
  }

  return { compute };
})();