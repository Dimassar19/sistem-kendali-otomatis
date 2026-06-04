/**
 * chart-zn1-openloop.js
 * Grafik kurva S (open-loop FOPDT) untuk ZN Method 1
 * Menampilkan: Respons Plant, Garis Kelandaian Tangen, Nilai Maksimum K
 * Mirip tampilan Octave/MATLAB
 *
 * Sisipkan file ini SETELAH chart-engine.js di index.html:
 *   <script src="js/chart-zn1-openloop.js"></script>
 */

const ChartZN1 = (() => {

  /**
   * Simulasi respons open-loop FOPDT:
   *   y(t) = K * (1 - exp(-(t - L) / T))  untuk t > L
   *   y(t) = 0                              untuk t <= L
   *
   * @param {number} K  - Process gain
   * @param {number} L  - Dead time (s)
   * @param {number} T  - Time constant (s)
   * @param {number} tEnd - Durasi simulasi
   * @param {number} dt   - Langkah waktu
   */
  function simulateFOPDT(K, L, T, tEnd, dt = 0.1) {
    const t = [], y = [];
    for (let ti = 0; ti <= tEnd; ti += dt) {
      t.push(Utils.round(ti, 4));
      y.push(ti <= L ? 0 : K * (1 - Math.exp(-(ti - L) / T)));
    }
    return { t, y };
  }

  /**
   * Hitung garis tangen di titik infleksi kurva S (t = L + T)
   * Slope garis tangen pada titik infleksi = K / T * exp(-1) ≈ K/(eT)
   * Tapi untuk ZN1 kita pakai slope = K/T (slope maks kurva FOPDT)
   *
   * Garis tangen: y = slope * (t - t_infleksi) + y_infleksi
   * Memotong y=0 di t = L  (dead time)
   * Memotong y=K di t = L + T
   */
  function computeTangent(K, L, T, tEnd) {
    const slope      = K / T;                  // slope garis tangen ZN1
    const t_infl     = L;                      // titik awal tangen (t = L)
    const y_infl     = 0;                      // nilai y di t = L

    // Titik akhir tangen: saat y = K  → t = L + T
    const t_tanEnd   = L + T;
    const y_tanEnd   = K;

    // Perpanjang tangen sedikit untuk visual
    const t_tanStart = Math.max(0, t_infl - L * 0.5);
    const y_tanStart = slope * (t_tanStart - t_infl) + y_infl;

    // Titik perpotongan dengan y=K (horizontal)
    const t_cross    = t_infl + (K - y_infl) / slope; // = L + T

    return {
      slope,
      // Dua titik untuk menggambar garis tangen
      line: [
        { t: t_tanStart, y: y_tanStart },
        { t: Math.min(t_tanEnd + T * 0.5, tEnd), y: slope * (Math.min(t_tanEnd + T * 0.5, tEnd) - t_infl) },
      ],
      // Marker khusus
      t0: 0,        y0: 0,          // t0 = titik awal (kuning)
      t1: L,        y1: 0,          // t1 = L (merah)
      t2: L + T,    y2: K,          // t2 = L+T (hijau, puncak tangen)
    };
  }

  /**
   * Render grafik kurva S open-loop ZN1 ke canvas
   *
   * @param {string} canvasId
   * @param {number} K, L, T   - Parameter proses
   * @param {object} [opts]    - { t0, t1, t2 } override dari input user (opsional)
   */
  function renderOpenLoop(canvasId, K, L, T, opts = {}) {
    function tryDraw() {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return false;
      const parent = canvas.parentElement;
      const w = parent ? parent.clientWidth : 0;
      if (w < 50) return false;
      _draw(canvas, K, L, T, opts);
      return true;
    }

    if (tryDraw()) return;
    requestAnimationFrame(() => {
      if (tryDraw()) return;
      let tries = 0;
      const poll = setInterval(() => {
        tries++;
        if (tryDraw() || tries > 30) clearInterval(poll);
      }, 20);
    });
  }

  function _draw(canvas, K, L, T, opts) {
    const parent = canvas.parentElement;
    const W = (parent && parent.clientWidth > 50) ? parent.clientWidth : 700;
    const H = 320;

    canvas.width  = W;
    canvas.height = H;

    const ctx = canvas.getContext('2d');

    // ── Simulasi kurva S ──
    const tEnd = Math.max(L + T * 5, 70);
    const dt   = tEnd / 500;
    const { t, y } = simulateFOPDT(K, L, T, tEnd, dt);
    const tan  = computeTangent(K, L, T, tEnd);

    // ── Layout ──
    const PAD = { top: 50, right: 50, bottom: 60, left: 70 };
    const cW  = W - PAD.left - PAD.right;
    const cH  = H - PAD.top  - PAD.bottom;

    const yMax_data = K * 1.15;
    const yMin_data = -0.05 * K;
    const yRange    = yMax_data - yMin_data;

    const toX = tv => PAD.left + (tv / tEnd) * cW;
    const toY = yv => PAD.top  + (1 - (yv - yMin_data) / yRange) * cH;

    // ── Background ──
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    // ── Grid ──
    ctx.strokeStyle = '#e8edf3';
    ctx.lineWidth   = 1;
    ctx.setLineDash([]);

    // Grid Y
    const yStep = K / 4;
    for (let yi = 0; yi <= K * 1.1; yi += yStep) {
      const py = toY(yi);
      ctx.beginPath();
      ctx.moveTo(PAD.left, py);
      ctx.lineTo(PAD.left + cW, py);
      ctx.stroke();
      ctx.fillStyle  = '#718096';
      ctx.font       = '11px Segoe UI, sans-serif';
      ctx.textAlign  = 'right';
      ctx.fillText(Utils.fmt(yi, 2), PAD.left - 8, py + 4);
    }

    // Grid X
    const xStep = Math.ceil(tEnd / 7);
    for (let xi = 0; xi <= tEnd; xi += xStep) {
      const px = toX(xi);
      ctx.beginPath();
      ctx.moveTo(px, PAD.top);
      ctx.lineTo(px, PAD.top + cH);
      ctx.stroke();
      ctx.fillStyle = '#718096';
      ctx.font      = '11px Segoe UI, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(xi.toFixed(0), px, PAD.top + cH + 18);
    }

    // ── Garis K horizontal (nilai maksimum) ──
    ctx.strokeStyle = '#16a34a';
    ctx.lineWidth   = 1.8;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(PAD.left, toY(K));
    ctx.lineTo(PAD.left + cW, toY(K));
    ctx.stroke();
    ctx.setLineDash([]);

    // Label K
    ctx.fillStyle  = '#16a34a';
    ctx.font       = 'bold 11px Segoe UI, sans-serif';
    ctx.textAlign  = 'left';
    ctx.fillText(`Nilai Maksimum (K = ${Utils.fmt(K, 4)})`, PAD.left + 6, toY(K) - 7);

    // ── Garis tangen (merah putus-putus) ──
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth   = 2;
    ctx.setLineDash([8, 5]);
    ctx.beginPath();
    const tl = tan.line;
    ctx.moveTo(toX(tl[0].t), toY(tl[0].y));
    ctx.lineTo(toX(tl[1].t), toY(tl[1].y));
    ctx.stroke();
    ctx.setLineDash([]);

    // ── Kurva S plant (biru solid) ──
    ctx.beginPath();
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth   = 3;
    ctx.lineJoin    = 'round';
    ctx.lineCap     = 'round';
    ctx.moveTo(toX(t[0]), toY(y[0]));
    for (let i = 1; i < t.length; i++) {
      ctx.lineTo(toX(t[i]), toY(y[i]));
    }
    ctx.stroke();

    // ── Area fill di bawah kurva ──
    ctx.beginPath();
    ctx.moveTo(toX(t[0]), toY(0));
    for (let i = 0; i < t.length; i++) ctx.lineTo(toX(t[i]), toY(y[i]));
    ctx.lineTo(toX(t[t.length - 1]), toY(0));
    ctx.closePath();
    ctx.fillStyle = 'rgba(37,99,235,0.06)';
    ctx.fill();

    // ── Garis vertikal T1 (L) dan T2 (L+T) ──
    // Vertikal T1 = L
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(toX(tan.t1), toY(0));
    ctx.lineTo(toX(tan.t1), toY(tan.y2 * 0.95));
    ctx.stroke();

    // Vertikal T2 = L+T
    ctx.strokeStyle = '#16a34a';
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(toX(tan.t2), toY(0));
    ctx.lineTo(toX(tan.t2), toY(K));
    ctx.stroke();
    ctx.setLineDash([]);

    // ── Marker titik ──
    // T0 (kuning)
    _drawMarker(ctx, toX(tan.t0), toY(tan.y0), '#f59e0b', '#ffffff', 'T₀', 'bottom');

    // T1 = L (merah)
    _drawMarker(ctx, toX(tan.t1), toY(tan.y1), '#dc2626', '#ffffff', `T₁ (L=${Utils.fmt(L,2)})`, 'bottom');

    // T2 = L+T (hijau)
    _drawMarker(ctx, toX(tan.t2), toY(tan.y2), '#16a34a', '#ffffff', `T₂ (L+T=${Utils.fmt(L+T,2)})`, 'top');

    // ── Axes ──
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(PAD.left, PAD.top);
    ctx.lineTo(PAD.left, PAD.top + cH);
    ctx.lineTo(PAD.left + cW, PAD.top + cH);
    ctx.stroke();

    // ── Axis labels ──
    ctx.fillStyle  = '#4a5568';
    ctx.font       = 'bold 12px Segoe UI, sans-serif';
    ctx.textAlign  = 'center';
    ctx.fillText('Waktu / Time (detik)', PAD.left + cW / 2, H - 10);

    ctx.save();
    ctx.translate(16, PAD.top + cH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Amplitudo / Respons Output', 0, 0);
    ctx.restore();

    // ── Title ──
    ctx.fillStyle  = '#1a2332';
    ctx.font       = 'bold 14px Segoe UI, sans-serif';
    ctx.textAlign  = 'center';
    ctx.fillText('Analisis Kurva Tangen Respons Undak (Ziegler-Nichols Metode 1)', W / 2, 28);

    // ── Legend ──
    _drawLegend(ctx, W, PAD);
  }

  function _drawMarker(ctx, px, py, fillColor, strokeColor, label, labelPos) {
    // Lingkaran marker
    ctx.beginPath();
    ctx.arc(px, py, 7, 0, Math.PI * 2);
    ctx.fillStyle   = fillColor;
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth   = 2;
    ctx.stroke();

    // Label marker
    ctx.fillStyle  = fillColor;
    ctx.font       = 'bold 11px Segoe UI, sans-serif';
    ctx.textAlign  = 'center';
    const offsetY  = labelPos === 'top' ? -14 : 20;
    ctx.fillText(label, px, py + offsetY);
  }

  function _drawLegend(ctx, W, PAD) {
    const items = [
      { color: '#2563eb', dash: false, label: 'Respons Plant (Kurva S)' },
      { color: '#dc2626', dash: true,  label: 'Garis Kelandaian Tangen' },
      { color: '#16a34a', dash: true,  label: 'Nilai Maksimum (K)'      },
    ];

    const legendX = W - PAD.right - 230;
    const legendY = PAD.top + 15;
    const lH      = 22;
    const lW      = 225;

    // Background legend
    ctx.fillStyle   = 'rgba(255,255,255,0.92)';
    ctx.strokeStyle = '#cbd5e0';
    ctx.lineWidth   = 1;
    _roundRect(ctx, legendX - 10, legendY - 8, lW, items.length * lH + 16, 6);
    ctx.fill();
    ctx.stroke();

    items.forEach((item, i) => {
      const ly = legendY + i * lH + 6;

      ctx.strokeStyle = item.color;
      ctx.lineWidth   = 2.5;
      if (item.dash) ctx.setLineDash([6, 4]); else ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(legendX, ly);
      ctx.lineTo(legendX + 30, ly);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#2d3748';
      ctx.font      = '11px Segoe UI, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(item.label, legendX + 38, ly + 4);
    });
  }

  function _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  return { renderOpenLoop, simulateFOPDT, computeTangent };

})();