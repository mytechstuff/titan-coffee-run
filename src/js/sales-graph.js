// sales-graph.js — Canvas-based compact bar chart (replaces SVG)
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

function getContext(canvas){
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(300, Math.floor(rect.width * dpr));
  canvas.height = Math.floor(300 * dpr);
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr); return ctx;
}

let bars = []; // hit-test rectangles

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
    const v = values[i]; const h = Math.max(0, Math.min(chartH, v*scale));
    const y = marginTop + (chartH - h);
    // draw bar
    ctx.fillStyle = 'teal'; ctx.fillRect(x, y, barW, h);
    // label
    ctx.fillStyle = '#111'; ctx.font='12px sans-serif'; ctx.textAlign='center';
    ctx.fillText(labels[i]||'', x + barW/2, marginTop + chartH + 18);
    // save rect for hit testing
    bars.push({x, y, w: barW, h, idx:i, value:v});
    x += barW + pad;
  }

  // y ticks
  ctx.fillStyle='#333'; ctx.textAlign='right';
  const ticks = 4; for(let i=0;i<=ticks;i++){ const val = (max/ticks)*i; const yy = marginTop + (chartH - val*scale);
    ctx.fillText('$'+Math.round(val), marginLeft-8, yy+4);
    ctx.strokeStyle='#eee'; ctx.beginPath(); ctx.moveTo(marginLeft-6, yy); ctx.lineTo(cw-16, yy); ctx.stroke();
  }
}

function findBarAt(canvas, clientX, clientY){
  const rect = canvas.getBoundingClientRect(); const x = clientX - rect.left; const y = clientY - rect.top;
  for(const b of bars){ if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.idx; }
  return -1;
}

function attachInteraction(){
  const canvas = document.getElementById(canvasId); if (!canvas) return;
  let hovered = -1;
  function redrawHighlight(i){ const ctx = getContext(canvas); drawChart(sales); if (i>=0){ const b = bars[i]; ctx.fillStyle='darkorange'; ctx.fillRect(b.x, b.y, b.w, b.h); ctx.fillStyle='#111'; ctx.font='12px sans-serif'; ctx.textAlign='center'; ctx.fillText('$'+b.value, b.x + b.w/2, b.y - 6);} }
  canvas.addEventListener('mousemove', e=>{ const idx = findBarAt(canvas, e.clientX, e.clientY); if (idx!==hovered){ hovered=idx; redrawHighlight(hovered); } });
  canvas.addEventListener('mouseleave', ()=>{ hovered=-1; drawChart(sales); });
}

window.updateSalesData = function(newData){ if (!Array.isArray(newData)) return; const parsed = newData.map(it=>({quarter:String((it&&it.quarter)||''), amount:Number((it&&it.amount)||0)})).filter(d=>Number.isFinite(d.amount)); if (!parsed.length) return; sales = parsed.slice(); drawChart(sales); };

document.addEventListener('DOMContentLoaded', ()=>{ drawChart(sales); attachInteraction(); window.addEventListener('resize', ()=>{ drawChart(sales); }); });

export {};
