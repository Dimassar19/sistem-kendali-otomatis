/**
 * calc-zn1.js — Ziegler-Nichols Method 1: Process Reaction Curve (Open Loop)
 * Separation of concerns: PURE MATH ONLY
 *
 * Metode ini menggunakan respons tangga (step response) open-loop
 * untuk mengidentifikasi parameter:
 *   - K  : process gain (static gain)
 *   - L  : dead time / waktu mati (delay)
 *   - T  : time constant / konstanta waktu
 *   - R  : reaction rate = K / T
 *   - a  = L/T (normalized dead time ratio)
 */

const CalcZN1 = (() => {

  /**
   * Main computation from step response parameters
   * @param {number} K  - Process gain (ΔOutput / ΔInput)
   * @param {number} L  - Dead time in seconds
   * @param {number} T  - Time constant in seconds
   * @param {number} stepAmplitude - Amplitude of step input (default 1)
   */
  function compute(K, L, T, stepAmplitude = 1) {
    if (L <= 0)  return { error: 'Dead time (L) harus > 0.' };
    if (T <= 0)  return { error: 'Time constant (T) harus > 0.' };
    if (K === 0) return { error: 'Process gain (K) tidak boleh 0.' };

    const R = K / T;             // reaction rate (slope at inflection / step)
    const a = L / T;             // normalized dead time ratio
    const S = R * stepAmplitude; // slope of reaction curve

    // ---- ZN1 Tuning Formulas (Cohen-Coon basis) ----

    // P Controller
    const P_Kp = T / (K * L);

    // PI Controller
    const PI_Kp = 0.9 * T / (K * L);
    const PI_Ti = L / 0.3;
    const PI_Ki = PI_Kp / PI_Ti;

    // PD Controller
    const PD_Kp = 1.25 * T / (K * L);
    const PD_Td = 0.5 * L;
    const PD_Kd = PD_Kp * PD_Td;

    // PID Controller
    const PID_Kp = 1.2 * T / (K * L);
    const PID_Ti = 2.0 * L;
    const PID_Td = 0.5 * L;
    const PID_Ki = PID_Kp / PID_Ti;
    const PID_Kd = PID_Kp * PID_Td;

    // ---- Additional Analysis ----
    // Controllability ratio (dimensionless): a = L/T
    // a < 0.1 → very controllable, a > 1 → difficult
    let controllability;
    if (a < 0.1)      controllability = 'SANGAT MUDAH dikendalikan (a < 0.1)';
    else if (a < 0.3) controllability = 'MUDAH dikendalikan (0.1 ≤ a < 0.3)';
    else if (a < 0.6) controllability = 'SEDANG (0.3 ≤ a < 0.6)';
    else if (a < 1.0) controllability = 'SULIT dikendalikan (0.6 ≤ a < 1.0)';
    else              controllability = 'SANGAT SULIT dikendalikan (a ≥ 1.0)';

    // Recommended controller type
    let recommendation;
    if (a < 0.2)      recommendation = 'P atau PI sudah memadai';
    else if (a < 0.5) recommendation = 'PI atau PID disarankan';
    else              recommendation = 'PID dengan anti-windup sangat disarankan';

    // Settling time estimate for ZN-tuned PID (rough)
    const settlingTime_est = PID_Ti + L;

    // Overshoot estimate for ZN1-tuned system (~25% typical)
    const overshoot_est = 25; // percent, ZN classic

    return {
      // Input parameters echoed
      processGain:  Utils.round(K, 6),
      deadTime:     Utils.round(L, 6),
      timeConst:    Utils.round(T, 6),
      reactionRate: Utils.round(R, 6),
      normalizedDT: Utils.round(a, 4),
      slope_S:      Utils.round(S, 6),

      // P
      P: {
        Kp: Utils.round(P_Kp, 4),
      },

      // PI
      PI: {
        Kp: Utils.round(PI_Kp, 4),
        Ti: Utils.round(PI_Ti, 4),
        Ki: Utils.round(PI_Ki, 6),
      },

      // PD
      PD: {
        Kp: Utils.round(PD_Kp, 4),
        Td: Utils.round(PD_Td, 4),
        Kd: Utils.round(PD_Kd, 6),
      },

      // PID
      PID: {
        Kp: Utils.round(PID_Kp, 4),
        Ti: Utils.round(PID_Ti, 4),
        Td: Utils.round(PID_Td, 4),
        Ki: Utils.round(PID_Ki, 6),
        Kd: Utils.round(PID_Kd, 6),
      },

      // Analysis
      controllability,
      recommendation,
      settlingTime_est: Utils.round(settlingTime_est, 3),
      overshoot_est,
    };
  }

  /**
   * Estimate K, L, T from two points on the reaction curve (tangent line method)
   * Point 1: (t1, y1) — tangent line start
   * Point 2: (t2, y2) — tangent line end
   * stepInput  : amplitude of the step
   * finalValue : steady-state output change
   */
  function computeFromCurve(t1, y1, t2, y2, stepInput, finalValue) {
    if (t2 <= t1)     return { error: 't2 harus > t1' };
    if (stepInput === 0) return { error: 'Step input tidak boleh 0' };

    const slope = (y2 - y1) / (t2 - t1); // tangent slope (output units / time)
    const K     = finalValue / stepInput; // static gain
    const T     = finalValue / slope;     // time constant from tangent
    // Tangent line: y = slope*(t - t1) + y1
    // Crosses y=0 at: t = t1 - y1/slope  → dead time
    const L_raw = t1 - y1 / slope;
    const L     = Math.max(0, L_raw);

    return {
      K: Utils.round(K, 4),
      L: Utils.round(L, 4),
      T: Utils.round(T, 4),
    };
  }

  /**
   * Hitung L dan T dari tiga titik waktu pada grafik respons tangga
   * @param {number} t0 - Waktu awal (detik)
   * @param {number} t1 - Titik infleksi bawah / akhir dead time (detik)
   * @param {number} t2 - Titik infleksi atas / akhir time constant (detik)
   *
   * Rumus:
   *   L = T1 − T0  (dead time)
   *   T = T2 − T1  (time constant)
   */
  function computeFromT0T1T2(t0, t1, t2) {
    if (t1 <= t0) return { error: 'T1 harus > T0' };
    if (t2 <= t1) return { error: 'T2 harus > T1' };

    const L = t1 - t0;
    const T = t2 - t1;

    return {
      L: Utils.round(L, 4),
      T: Utils.round(T, 4),
    };
  }

  // ── Public API ──
  return { compute, computeFromCurve, computeFromT0T1T2 };

})();