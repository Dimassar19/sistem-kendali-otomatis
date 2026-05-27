/**
 * utils.js — Shared utility functions
 * Separation of concerns: pure helpers, no DOM logic
 */

const Utils = (() => {

  /** Parse a string of space/comma separated numbers into array of floats */
  function parseCoeffs(str) {
    return str
      .trim()
      .split(/[\s,]+/)
      .map(s => parseFloat(s))
      .filter(n => !isNaN(n));
  }

  /** Round to N decimal places */
  function round(val, decimals = 6) {
    const f = Math.pow(10, decimals);
    return Math.round(val * f) / f;
  }

  /** Format number for display — avoid excessive decimals */
  function fmt(val, d = 4) {
    if (val === null || val === undefined) return '—';
    if (!isFinite(val)) return val > 0 ? '+∞' : '−∞';
    return round(val, d).toString();
  }

  /** Check if value is effectively zero (floating point tolerance) */
  function isZero(val, eps = 1e-10) {
    return Math.abs(val) < eps;
  }

  /** Count sign changes in an array (ignoring zeros) */
  function countSignChanges(arr) {
    const nonzero = arr.filter(v => !isZero(v));
    let changes = 0;
    for (let i = 1; i < nonzero.length; i++) {
      if (nonzero[i] * nonzero[i - 1] < 0) changes++;
    }
    return changes;
  }

  /** Create a DOM element with optional classes and attributes */
  function el(tag, cls = '', attrs = {}) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
    return e;
  }

  /** Empty a DOM container */
  function clear(container) {
    while (container.firstChild) container.removeChild(container.firstChild);
  }

  return { parseCoeffs, round, fmt, isZero, countSignChanges, el, clear };
})();