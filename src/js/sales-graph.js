// sales-graph.js — compact Canvas chart with animation and reset
const DEFAULT_SALES = [
  { quarter: 'Jan–Mar', amount: 1995.00 },
  { quarter: 'Apr–Jun', amount: 1471.31 },
  { quarter: 'Jul–Sep', amount: 892.86 },
  { quarter: 'Oct–Dec', amount: 531.60 }
];

const containerId = 'chart-container';
const canvasId = 'chart';
let sales = (Array.isArray(window.salesData) && window.salesData.length)
  ? window.salesData.map(it => ({ quarter: String(it.quarter||''), amount: Number(it.amount||0) }))
  : DEFAULT_SALES.slice();

let bars = []; // hit-test rects
let progress = 0; // 0..1 animation progress
let raf = null;

function makeCanvas(){
  const existing = document.getElementById(canvasId);
  if (existing) return existing;
  const svgPlaceholder = document.getElementById('chart-area');
  if (svgPlaceholder) svgPlaceholder.remove();
  const c = document.createElement('canvas'); c.id = canvasId; c.style.width = '100%'; c.height = 300;
  const container = document.getElementById(containerId) || document.body;
  container.prepend(c);
  return c;
}

function getContext(canvas){
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(300, Math.floor(rect.width * dpr));
  canvas.height = Math.floor(300 * dpr);
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr); return ctx;
}

// Draw bars using current progress (0..1). Bars heights = value * scale * progress
function drawChart(data, prog = progress){
  const canvas = makeCanvas(); if (!canvas) return;
  const ctx = getContext(canvas);
  const cw = canvas.getBoundingClientRect().width;
  const H = 300, mTop = 18, mBottom = 44, mLeft = 48;
  const chartH = H - mTop - mBottom;
  ctx.clearRect(0,0,cw,H);

  const values = data.map(d=>Number(d.amount||0));
  const labels = data.map(d=>String(d.quarter||''));
  const max = Math.max(...values, 0);
  const scale = max>0 ? chartH / max : 0;

  const barW = 56, pad = 18;
  let x = mLeft; bars = [];
  for(let i=0;i<data.length;i++){
    const v = values[i]; const h = Math.max(0, Math.min(chartH, v*scale*prog));
    const y = mTop + (chartH - h);
    ctx.fillStyle = 'teal'; ctx.fillRect(x, y, barW, h);
    ctx.fillStyle = '#111'; ctx.font='12px sans-serif'; ctx.textAlign='center';
    ctx.fillText(labels[i]||'', x + barW/2, mTop + chartH + 18);
    bars.push({x, y, w: barW, h, idx:i, value:v});
    x += barW + pad;
  }

  // y ticks (draw using prog so ticks match animated heights)
  ctx.fillStyle='#333'; ctx.textAlign='right';
  const ticks = 4; for(let i=0;i<=ticks;i++){ const val=(max/ticks)*i; const yy = mTop + (chartH - val*scale*prog);
    ctx.fillText('$'+Math.round(val), mLeft-8, yy+4);
    ctx.strokeStyle='#eee'; ctx.beginPath(); ctx.moveTo(mLeft-6, yy); ctx.lineTo(cw-16, yy); ctx.stroke(); }
}

function findBarAt(canvas, clientX, clientY){
  const rect = canvas.getBoundingClientRect(); const x = clientX - rect.left; const y = clientY - rect.top;
  for(const b of bars){ if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.idx; }
  return -1;
}

function attachInteraction(){
  const canvas = document.getElementById(canvasId); if (!canvas) return;
  let hovered = -1;
  function redrawHighlight(i){ const ctx = getContext(canvas); drawChart(sales, progress); if (i>=0){ const b = bars[i]; ctx.fillStyle='darkorange'; ctx.fillRect(b.x, b.y, b.w, b.h); ctx.fillStyle='#111'; ctx.font='12px sans-serif'; ctx.textAlign='center'; ctx.fillText('$'+b.value, b.x + b.w/2, b.y - 6);} }
  canvas.addEventListener('mousemove', e=>{ const idx = findBarAt(canvas, e.clientX, e.clientY); if (idx!==hovered){ hovered=idx; redrawHighlight(hovered); } });
  canvas.addEventListener('mouseleave', ()=>{ hovered=-1; drawChart(sales, progress); });
}

// animate progress (0..1) with easing
function animateTo(target=1, duration=600){
  if (raf) cancelAnimationFrame(raf);
  const start = performance.now(); const from = progress; const diff = target - from;
  if (!duration){ progress = target; drawChart(sales, progress); return; }
  function step(ts){ const t = Math.min(1, (ts - start)/duration); progress = from + diff * (1 - Math.cos(Math.PI*t))/2; drawChart(sales, progress); if (t<1) raf = requestAnimationFrame(step); else { progress = target; raf = null; } }
  raf = requestAnimationFrame(step);
}

// public API
window.updateSalesData = function(newData){ if (!Array.isArray(newData)) return; const parsed = newData.map(it=>({quarter:String((it&&it.quarter)||''), amount:Number((it&&it.amount)||0)})).filter(d=>Number.isFinite(d.amount)); if (!parsed.length) return; sales = parsed.slice(); drawChart(sales, progress); };
window.resetChart = function(){ animateTo(0, 600); };
window.playChart = function(){ animateTo(1, 800); };

document.addEventListener('DOMContentLoaded', ()=>{
  drawChart(sales, 0); // draw empty
  attachInteraction();
  animateTo(1, 900); // animate in
  const btn = document.getElementById('graphResetBtn'); if (btn) btn.addEventListener('click', ()=> animateTo(0, 600));
  window.addEventListener('resize', ()=>{ drawChart(sales, progress); });
});

export {};
// sales-graph.js — compact Canvas chart with simple animations
const DEFAULT_SALES = [
  { quarter: 'Jan–Mar', amount: 1995.00 },
  { quarter: 'Apr–Jun', amount: 1471.31 },
  { quarter: 'Jul–Sep', amount: 892.86 },
  { quarter: 'Oct–Dec', amount: 531.60 }
];

const containerId = 'chart-container';
const canvasId = 'chart';
let sales = (Array.isArray(window.salesData) && window.salesData.length)
  ? window.salesData.map(it => ({ quarter: String(it.quarter||''), amount: Number(it.amount||0) }))
  : DEFAULT_SALES.slice();

let bars = []; // hit-test rects
let progress = 0; // animation progress 0..1 (start at 0 for intro)
let raf = null;

function makeCanvas(){
  const existing = document.getElementById(canvasId);
  if (existing) return existing;
  const svgPlaceholder = document.getElementById('chart-area');
  if (svgPlaceholder) svgPlaceholder.remove();
  const c = document.createElement('canvas'); c.id = canvasId; c.style.width = '100%'; c.height = 300;
  const container = document.getElementById(containerId) || document.body;
  container.prepend(c);
  return c;
}

function getContext(canvas){
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(300, Math.floor(rect.width * dpr));
  canvas.height = Math.floor(300 * dpr);
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr); return ctx;
}

// draw chart using `prog` multiplier for animation
function drawChart(data, prog = progress){
  const canvas = makeCanvas(); if (!canvas) return;
  const ctx = getContext(canvas);
  const cw = canvas.getBoundingClientRect().width;
  const H = 300, mTop = 18, mBottom = 44, mLeft = 48;
  const chartH = H - mTop - mBottom;
  ctx.clearRect(0,0,cw,H);

  const values = data.map(d=>Number(d.amount||0));
  const labels = data.map(d=>String(d.quarter||''));
  const max = Math.max(...values, 0);
  const scale = max>0 ? chartH / max : 0;

  const barW = 56, pad = 18;
  let x = mLeft; bars = [];
  for(let i=0;i<data.length;i++){
    const v = values[i]; const h = Math.max(0, Math.min(chartH, v*scale*prog));
    const y = mTop + (chartH - h);
    ctx.fillStyle = 'teal'; ctx.fillRect(x, y, barW, h);
    ctx.fillStyle = '#111'; ctx.font='12px sans-serif'; ctx.textAlign='center';
    ctx.fillText(labels[i]||'', x + barW/2, mTop + chartH + 18);
    bars.push({x, y, w: barW, h, idx:i, value:v});
    x += barW + pad;
  }

  // y ticks
  ctx.fillStyle='#333'; ctx.textAlign='right';
  const ticks = 4; for(let i=0;i<=ticks;i++){ const val=(max/ticks)*i; const yy = mTop + (chartH - val*scale*prog);
    ctx.fillText('$'+Math.round(val), mLeft-8, yy+4);
    ctx.strokeStyle='#eee'; ctx.beginPath(); ctx.moveTo(mLeft-6, yy); ctx.lineTo(cw-16, yy); ctx.stroke(); }
}

function findBarAt(canvas, clientX, clientY){
  const rect = canvas.getBoundingClientRect(); const x = clientX - rect.left; const y = clientY - rect.top;
  for(const b of bars){ if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.idx; }
  return -1;
}

function attachInteraction(){
  const canvas = document.getElementById(canvasId); if (!canvas) return;
  let hovered = -1;
  function redrawHighlight(i){ const ctx = getContext(canvas); drawChart(sales, progress); if (i>=0){ const b = bars[i]; ctx.fillStyle='darkorange'; ctx.fillRect(b.x, b.y, b.w, b.h); ctx.fillStyle='#111'; ctx.font='12px sans-serif'; ctx.textAlign='center'; ctx.fillText('$'+b.value, b.x + b.w/2, b.y - 6);} }
  canvas.addEventListener('mousemove', e=>{ const idx = findBarAt(canvas, e.clientX, e.clientY); if (idx!==hovered){ hovered=idx; redrawHighlight(hovered); } });
  canvas.addEventListener('mouseleave', ()=>{ hovered=-1; drawChart(sales, progress); });
}

function animateTo(target=1, duration=600){
  if (raf) cancelAnimationFrame(raf);
  const start = performance.now(); const from = progress; const diff = target - from;
  if (!duration){ progress = target; drawChart(sales, progress); return; }
  function step(ts){ const t = Math.min(1, (ts - start)/duration); // easeInOut (cos)
    progress = from + diff * (1 - Math.cos(Math.PI*t))/2; drawChart(sales, progress); if (t<1) raf = requestAnimationFrame(step); else { progress = target; raf = null; } }
  raf = requestAnimationFrame(step);
}

window.updateSalesData = function(newData){ if (!Array.isArray(newData)) return; const parsed = newData.map(it=>({quarter:String((it&&it.quarter)||''), amount:Number((it&&it.amount)||0)})).filter(d=>Number.isFinite(d.amount)); if (!parsed.length) return; sales = parsed.slice(); drawChart(sales, progress); };
window.resetChart = function(){ animateTo(0, 600); };
window.playChart = function(){ animateTo(1, 800); };

document.addEventListener('DOMContentLoaded', ()=>{ drawChart(sales, 0); attachInteraction(); animateTo(1, 900); const btn = document.getElementById('graphResetBtn'); if (btn) btn.addEventListener('click', ()=> animateTo(0, 600)); window.addEventListener('resize', ()=>{ drawChart(sales, progress); }); });

export {};
 * sales-graph.js — Canvas-based compact bar chart (replaces SVG)
 *
 * This module uses the HTML5 Canvas API to draw a simple bar chart.
 * Why Canvas?
 * - Compact drawing code for simple charts: one surface to paint on.
 * - We keep per-bar hit-testing by storing rectangles and testing
 *   mouse coordinates against them (cheap for 4 bars).
 *
 * Important math and layout notes (for students):
 * - chartH is the vertical pixel space available for bars (total height minus margins).
 * - max = maximum data value from the dataset.
 * - scale = chartH / max  => pixels-per-unit. This single factor converts a data
 *   value into a bar height: barHeight = value * scale.
 * - barY (top edge) = marginTop + (chartH - barHeight). SVG/Canvas Y increases
 *   downward, so shorter bars have larger Y (further down the canvas).
 * - Bar X position is computed incrementally: x starts at marginLeft and increments
 *   by (barWidth + padding) for each bar index.
 *
 * Interactions:
 * - We implement mouseover highlighting by storing each bar's rect (x,y,w,h)
 *   in the `bars` array and checking the mouse position on `mousemove`.
 * - When a bar is hovered we redraw the canvas and paint the highlighted bar
 *   in a different color and draw a value label above it.
 *
 * Accessibility note:
 * - Canvas is pixel-based and does not expose DOM elements for each bar. For
 *   full keyboard accessibility one could add an offscreen list or overlay
 *   DOM controls that mirror the chart. This demo focuses on a compact
 *   teaching implementation with mouse interactions.
 */
// Keeps DEFAULT_SALES and exposes `window.updateSalesData(newData)`
const DEFAULT_SALES = [
  { quarter: 'Jan–Mar', amount: 1995.00 },
  { quarter: 'Apr–Jun', amount: 1471.31 },
  { quarter: 'Jul–Sep', amount: 892.86 },
  { quarter: 'Oct–Dec', amount: 531.60 }
];

const containerId = 'chart-container';
const canvasId = 'chart';
let sales = (Array.isArray(window.salesData) && window.salesData.length)
  ? window.salesData.map(it => ({ quarter: String(it.quarter||''), amount: Number(it.amount||0) }))
  : DEFAULT_SALES.slice();

/**
 * Create or return a canvas element used for the chart.
 * - If an existing canvas with `canvasId` exists we reuse it.
 * - If an SVG placeholder (`#chart-area`) exists we remove it and
 *   create a canvas in its place so the page markup stays tidy.
 * @returns {HTMLCanvasElement}
 */
function makeCanvas(){
  const existing = document.getElementById(canvasId);
  if (existing) return existing;
  const svgPlaceholder = document.getElementById('chart-area');
  if (svgPlaceholder) svgPlaceholder.remove();
  const c = document.createElement('canvas'); c.id = canvasId; c.style.width = '100%'; c.height = 300; // logical height
  const container = document.getElementById(containerId) || document.body;
  container.prepend(c);
  return c;
}

/**
 * Prepare and return a 2D drawing context sized for the device pixel ratio.
 * - We read the element's layout width (CSS pixels), multiply by device
 *   pixel ratio and set the canvas `width`/`height` accordingly so the drawing
 *   looks crisp on high-DPI displays.
 * - After setting the internal pixel size we call `ctx.scale(dpr, dpr)` so
 *   subsequent drawing can use CSS pixel coordinates.
 *
 * @param {HTMLCanvasElement} canvas
 * @returns {CanvasRenderingContext2D} the scaled 2D context
 */
function getContext(canvas){
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(300, Math.floor(rect.width * dpr));
  canvas.height = Math.floor(300 * dpr);
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr); return ctx;
}

let bars = []; // hit-test rectangles

/**
 * Draw the bar chart for the given data array.
 * Key steps:
 * - compute layout values (margins, chart height)
 * - compute `max` and `scale = chartH / max` (pixels per data unit)
 * - for each bar: compute height `h = value * scale`, clamp it to [0,chartH]
 *   and compute top `y = marginTop + (chartH - h)` so bars grow upward
 * - draw bars and labels, and store each bar rect in `bars` for hit-testing
 *
 * @param {Array<{quarter:string,amount:number}>} data
 */
function drawChart(data){
  const canvas = makeCanvas(); if (!canvas) return;
  const ctx = getContext(canvas);
  const cw = canvas.getBoundingClientRect().width;
  const height = 300; const marginTop = 18, marginBottom = 44, marginLeft = 48;
  const chartH = height - marginTop - marginBottom;
  ctx.clearRect(0,0,cw,height);

  const values = data.map(d=>Number(d.amount||0));
  const labels = data.map(d=>String(d.quarter||''));
  const max = Math.max(...values, 0);
  const scale = max>0 ? chartH / max : 0;

  const barW = 56, pad = 18;
  let x = marginLeft; bars = [];
  for(let i=0;i<data.length;i++){
    const v = values[i];
    // bar height derived by converting data units to pixels using `scale`.
    // This single multiplication is the same as (value / max) * chartH.
    const h = Math.max(0, Math.min(chartH, v*scale));
    // top-edge y coordinate: marginTop + (chartH - h). Y increases downward,
    // so taller bars have smaller y (move up).
    const y = marginTop + (chartH - h);
    /**
     * sales-graph.js — Canvas-based compact bar chart (replaces SVG)
     * Compact, comment-light demo with animation support.
     *
     * Math (short):
     * - chartH = available pixels for bars.
     * - scale = chartH / max  // pixels per unit
     * - barHeight = value * scale * progress  // progress ∈ [0,1]
     * - barY = marginTop + (chartH - barHeight)
     *
     * Example: value=200, max=400, chartH=200 => scale=0.5 → barHeight = 200*0.5=100px
     */
  for(const b of bars){ if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.idx; }
  return -1;
}

/**
 * Attach mouse interaction listeners to the canvas.
 * - `mousemove`: performs hit-testing, and if the hovered bar changes we
 *   redraw and paint the hovered bar in the highlight color.
 * - `mouseleave`: clears any hover state and redraws the base chart.
 *
 * Note: the redraw approach is simple and performant for a tiny chart; for
 * many bars or expensive draws you might prefer a retained-mode approach or
 * partial updates.
 */
function attachInteraction(){
  const canvas = document.getElementById(canvasId); if (!canvas) return;
  let hovered = -1;
  function redrawHighlight(i){ const ctx = getContext(canvas); drawChart(sales); if (i>=0){ const b = bars[i]; // paint highlight on top
      ctx.fillStyle='darkorange'; ctx.fillRect(b.x, b.y, b.w, b.h);
      // draw value label above the bar
      ctx.fillStyle='#111'; ctx.font='12px sans-serif'; ctx.textAlign='center';
      ctx.fillText('$'+b.value, b.x + b.w/2, b.y - 6);
    } }
  // mousemove: test for bar under cursor and update highlight only when index changes
  canvas.addEventListener('mousemove', e=>{ const idx = findBarAt(canvas, e.clientX, e.clientY); if (idx!==hovered){ hovered=idx; redrawHighlight(hovered); } });
  // mouseleave: clear highlight
  canvas.addEventListener('mouseleave', ()=>{ hovered=-1; drawChart(sales); });
}

/**
 * Public API: update the chart with a new array of {quarter, amount} objects.
 * - This parses and sanitizes incoming data, replaces the module's `sales`
 *   array, and triggers a redraw.
 * @param {Array<{quarter:string,amount:number}>} newData
 */
window.updateSalesData = function(newData){ if (!Array.isArray(newData)) return; const parsed = newData.map(it=>({quarter:String((it&&it.quarter)||''), amount:Number((it&&it.amount)||0)})).filter(d=>Number.isFinite(d.amount)); if (!parsed.length) return; sales = parsed.slice(); drawChart(sales); };

document.addEventListener('DOMContentLoaded', ()=>{ drawChart(sales); attachInteraction(); window.addEventListener('resize', ()=>{ drawChart(sales); }); });

export {};
