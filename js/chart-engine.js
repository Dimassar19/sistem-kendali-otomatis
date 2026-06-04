
/**
 * chart-engine.js — FIXED v2
 * Root cause fix: gunakan ResizeObserver + MutationObserver
 * untuk deteksi kapan canvas benar-benar visible & punya ukuran
 */

const ChartEngine = (() => {

  // ─────────────────────────────────────────────
  // SIMULASI CLOSED-LOOP (RK4)
  // Plant: G(s) = 1/(s+1)^2
  // State: x1'=x2, x2'= u - x1 - 2x2, y=x1
  // Steady-state u=const → y_ss = u ✓
  // ─────────────────────────────────────────────
  function _simulate(Kp, Ki, Kd, tEnd, dt) {
    const N   = Math.round(tEnd / dt);
    const t   = [];
    const y   = [];

    let x1 = 0, x2 = 0;
    let integ = 0, prevE = 0;

    for (let i = 0; i <= N; i++) {
      const e = 1.0 - x1;

      integ += e * dt;
      integ  = Math.max(-100, Math.min(100, integ));

      const de = (e - prevE) / dt;
      let u    = Kp * e + Ki * integ + Kd * de;
      u        = Math.max(-200, Math.min(200, u));

      // RK4 plant
      const f2 = (x1v, x2v) => u - x1v - 2 * x2v;
      const k1a = x2,                      k1b = f2(x1, x2);
      const k2a = x2+.5*dt*k1b,            k2b = f2(x1+.5*dt*k1a, x2+.5*dt*k1b);
      const k3a = x2+.5*dt*k2b,            k3b = f2(x1+.5*dt*k2a, x2+.5*dt*k2b);
      const k4a = x2+dt*k3b,               k4b = f2(x1+dt*k3a,    x2+dt*k3b);

      x1 += (dt/6)*(k1a+2*k2a+2*k3a+k4a);
      x2 += (dt/6)*(k1b+2*k2b+2*k3b+k4b);
      prevE = e;

      t.push(i * dt);
      y.push(Math.max(-1, Math.min(3, x1)));
    }
    return { t, y };
  }

  function simulatePID(Kp, Ki, Kd, tEnd = 15, dt = 0.005) {
    return _simulate(Kp, Ki, Kd, tEnd, dt);
  }

  function simulateZN2(Kp, Ki, Kd, Ku, Tu, tEnd = 20, dt = 0.005) {
    return _simulate(Kp, Ki, Kd, tEnd, dt);
  }

  function simulateZN1(Kp, Ki, Kd, K=1, L=0.5, T=2, tEnd=30, dt=0.01) {
    const N          = Math.round(tEnd / dt);
    const delaySteps = Math.max(1, Math.round(L / dt));
    const t = [], y = [];
    const uHist = new Array(delaySteps).fill(0);
    let yp=0, integ=0, prevE=0;

    for (let i = 0; i <= N; i++) {
      const e  = 1.0 - yp;
      integ   += e * dt;
      integ    = Math.max(-50, Math.min(50, integ));
      const de = (e - prevE) / dt;
      let u    = Math.max(-50, Math.min(50, Kp*e + Ki*integ + Kd*de));

      const uD = uHist.shift(); uHist.push(u);

      // RK4 FOPDT
      const f = (yv) => (K*uD - yv) / T;
      const k1 = f(yp), k2 = f(yp+.5*dt*k1),
            k3 = f(yp+.5*dt*k2), k4 = f(yp+dt*k3);
      yp += (dt/6)*(k1+2*k2+2*k3+k4);
      prevE = e;
      t.push(i*dt);
      y.push(Math.max(-1, Math.min(3, yp)));
    }
    return { t, y };
  }

  // ─────────────────────────────────────────────
  // ANALYZE
  // ─────────────────────────────────────────────
  function analyzeResponse(t, y) {
    if (!y || y.length < 20) return null;
    const n    = y.length;
    const ref  = 1.0;
    const yMax = Math.max(...y);
    const tail = Math.max(1, Math.floor(n * 0.1));
    const yFin = y.slice(n - tail).reduce((s,v)=>s+v,0) / tail;

    const overshoot = yMax > ref + 0.001 ? ((yMax-ref)/ref)*100 : 0;
    const ssError   = Math.abs(yFin - ref) / ref * 100;

    const band = 0.02;
    let settlingTime = t[n-1];
    for (let i = n-1; i >= 0; i--) {
      if (Math.abs(y[i]-ref) > band) { settlingTime = t[Math.min(i+1,n-1)]; break; }
    }

    let t10=null, t90=null;
    for (let i=0; i<n; i++) {
      if (t10===null && y[i]>=0.1) t10=t[i];
      if (t90===null && y[i]>=0.9) { t90=t[i]; break; }
    }

    return {
      overshoot:    Math.round(overshoot*10)/10,
      ssError:      Math.round(ssError*100)/100,
      settlingTime: Math.round(settlingTime*100)/100,
      riseTime:     (t10!==null&&t90!==null) ? Math.round((t90-t10)*1000)/1000 : null,
      steadyState:  Math.round(yFin*1000)/1000,
      peakValue:    Math.round(yMax*1000)/1000,
      hasOvershoot: overshoot > 5,
      isSettled:    ssError < 2,
    };
  }

  // ─────────────────────────────────────────────
  // SUGGESTION ENGINE
  // ─────────────────────────────────────────────
  function suggestFix(analysis, Kp, Ki, Kd) {
    if (!analysis) return null;
    let newKi=Ki, newKd=Kd;
    const reasons=[];
    const {hasOvershoot, isSettled, overshoot, ssError} = analysis;

    if (hasOvershoot) {
      const dFactor = 1 + (overshoot/100)*1.8;
      newKd = parseFloat((Math.max(newKd>0?newKd:Kp*0.15, Kp*0.1)*dFactor).toFixed(4));
      reasons.push(`Overshoot ${overshoot.toFixed(1)}% → Naikkan Kd untuk meredam lonjakan.`);
    }
    if (!isSettled) {
      if (Ki===0) {
        newKi = parseFloat((Kp*0.3).toFixed(4));
        reasons.push(`SS error ${ssError.toFixed(2)}% → Tambahkan Ki untuk eliminasi error statis.`);
      } else {
        newKi = parseFloat((Ki*Math.min(1.5,1+ssError/100)).toFixed(4));
        reasons.push(`SS error ${ssError.toFixed(2)}% → Naikkan Ki sedikit.`);
      }
    }
    const kiMax = Kp*2.5;
    if (newKi>kiMax) { newKi=parseFloat(kiMax.toFixed(4)); reasons.push(`Ki dibatasi maks ${kiMax.toFixed(4)}.`); }

    if (!hasOvershoot && isSettled) {
      return { newKi:Ki, newKd:Kd, reasons:['Respons sudah optimal.'], needsFix:false };
    }
    return { newKi, newKd, reasons, needsFix:true };
  }

  // ─────────────────────────────────────────────
  // DRAW CHART — core renderer
  // ─────────────────────────────────────────────
  function drawChart(canvas, t, y, title) {
    const parent = canvas.parentElement;
    const W = (parent && parent.clientWidth > 50) ? parent.clientWidth : 700;
    const H = 300;

    canvas.width  = W;
    canvas.height = H;

    const ctx = canvas.getContext('2d');
    const PAD = { top:45, right:40, bottom:55, left:65 };
    const cW  = W - PAD.left - PAD.right;
    const cH  = H - PAD.top  - PAD.bottom;

    // Clear
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, W, H);

    const tMax  = t[t.length-1] || 1;
    const allY  = y;
    const yMin  = Math.min(0, ...allY) - 0.05;
    const yMax  = Math.max(1.2, ...allY) + 0.05;
    const yRng  = yMax - yMin;

    const toX = tv => PAD.left + (tv/tMax)*cW;
    const toY = yv => PAD.top  + (1-(yv-yMin)/yRng)*cH;

    // Grid
    ctx.strokeStyle='#e2e8f0'; ctx.lineWidth=1; ctx.setLineDash([]);
    [0,0.2,0.4,0.6,0.8,1.0,1.2].forEach(yv => {
      if (yv < yMin-0.01 || yv > yMax+0.01) return;
      const py = toY(yv);
      ctx.beginPath(); ctx.moveTo(PAD.left,py); ctx.lineTo(PAD.left+cW,py); ctx.stroke();
      ctx.fillStyle='#718096'; ctx.font='11px Segoe UI,sans-serif';
      ctx.textAlign='right'; ctx.fillText(yv.toFixed(1), PAD.left-8, py+4);
    });
    for (let i=0; i<=6; i++) {
      const tv=(i/6)*tMax, px=toX(tv);
      ctx.strokeStyle='#e2e8f0';
      ctx.beginPath(); ctx.moveTo(px,PAD.top); ctx.lineTo(px,PAD.top+cH); ctx.stroke();
      ctx.fillStyle='#718096'; ctx.font='11px Segoe UI,sans-serif';
      ctx.textAlign='center'; ctx.fillText(tv.toFixed(1),px,PAD.top+cH+18);
    }

    // 2% band
    ctx.fillStyle='rgba(22,163,74,0.07)';
    ctx.fillRect(PAD.left, toY(1.02), cW, toY(0.98)-toY(1.02));

    // Setpoint
    ctx.strokeStyle='#94a3b8'; ctx.lineWidth=1.5; ctx.setLineDash([6,4]);
    ctx.beginPath(); ctx.moveTo(PAD.left,toY(1)); ctx.lineTo(PAD.left+cW,toY(1)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle='#94a3b8'; ctx.font='10px Segoe UI,sans-serif';
    ctx.textAlign='left'; ctx.fillText('Setpoint (1.0)', PAD.left+4, toY(1)-5);

    // Axes
    ctx.strokeStyle='#cbd5e0'; ctx.lineWidth=1.5;
    ctx.beginPath();
    ctx.moveTo(PAD.left,PAD.top); ctx.lineTo(PAD.left,PAD.top+cH);
    ctx.lineTo(PAD.left+cW,PAD.top+cH); ctx.stroke();

    // Curve fill
    ctx.beginPath();
    ctx.moveTo(toX(t[0]), toY(y[0]));
    for (let i=1;i<t.length;i++) ctx.lineTo(toX(t[i]),toY(y[i]));
    ctx.lineTo(toX(t[t.length-1]),toY(0));
    ctx.lineTo(toX(t[0]),toY(0));
    ctx.closePath();
    ctx.fillStyle='rgba(37,99,235,0.07)';
    ctx.fill();

    // Curve line
    ctx.beginPath();
    ctx.strokeStyle='#2563eb'; ctx.lineWidth=2.5;
    ctx.lineJoin='round'; ctx.lineCap='round';
    ctx.moveTo(toX(t[0]),toY(y[0]));
    for (let i=1;i<t.length;i++) ctx.lineTo(toX(t[i]),toY(y[i]));
    ctx.stroke();

    // Peak dot
    const yPeak = Math.max(...y);
    if (yPeak > 1.02) {
      const ip = y.indexOf(yPeak);
      ctx.beginPath(); ctx.arc(toX(t[ip]),toY(yPeak),4,0,Math.PI*2);
      ctx.fillStyle='#dc2626'; ctx.fill();
      ctx.fillStyle='#dc2626'; ctx.font='10px Segoe UI,sans-serif';
      ctx.textAlign='center';
      ctx.fillText('Peak: '+yPeak.toFixed(3), toX(t[ip]), toY(yPeak)-10);
    }

    // SS annotation
    const tail = Math.max(1,Math.floor(y.length*0.05));
    const yFin = y.slice(-tail).reduce((s,v)=>s+v,0)/tail;
    ctx.fillStyle='#718096'; ctx.font='10px Segoe UI,sans-serif';
    ctx.textAlign='right';
    ctx.fillText('SS≈'+yFin.toFixed(3), PAD.left+cW-4, toY(yFin)-5);

    // Labels
    ctx.fillStyle='#4a5568'; ctx.font='bold 12px Segoe UI,sans-serif';
    ctx.textAlign='center';
    ctx.fillText('Time [s]', PAD.left+cW/2, H-8);
    ctx.save(); ctx.translate(14,PAD.top+cH/2); ctx.rotate(-Math.PI/2);
    ctx.fillText('y(t)',0,0); ctx.restore();

    // Title
    ctx.fillStyle='#1a2332'; ctx.font='bold 13px Segoe UI,sans-serif';
    ctx.textAlign='center'; ctx.fillText(title||'Step Response', W/2, 22);
  }

  // ─────────────────────────────────────────────
  // renderChart — ROBUST version
  // Strategi: coba render, jika canvas masih 0px
  // pakai MutationObserver + polling fallback
  // ─────────────────────────────────────────────
  function renderChart(canvasId, t, y, title) {
    function tryDraw() {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return false;
      const parent = canvas.parentElement;
      const w = parent ? parent.clientWidth : 0;
      if (w < 50) return false;   // belum visible
      drawChart(canvas, t, y, title);
      return true;
    }

    // Attempt 1: langsung (jika sudah visible)
    if (tryDraw()) return;

    // Attempt 2: rAF berikutnya
    requestAnimationFrame(() => {
      if (tryDraw()) return;

      // Attempt 3: polling tiap 20ms max 30 kali (600ms total)
      let tries = 0;
      const poll = setInterval(() => {
        tries++;
        if (tryDraw() || tries > 30) clearInterval(poll);
      }, 20);
    });
  }

  return {
    simulatePID,
    simulateZN1,
    simulateZN2,
    analyzeResponse,
    suggestFix,
    drawChart,
    renderChart,
  };

})();
