// Minimal, pedagogical canvas chart for quick testing (simple, not production)
// Uses the same quarterly DEFAULT_SALES data as the main implementation.
;(function(){
  // Keep the same quarterly constants for easy comparison
  const DEFAULT_SALES = [
    { quarter: 'Jan–Mar', amount: 1995.00 },
    { quarter: 'Apr–Jun', amount: 1471.31 },
    { quarter: 'Jul–Sep', amount: 892.86 },
    { quarter: 'Oct–Dec', amount: 531.60 }
  ];

  // Simple DOM hookup: replace `#chart-area` placeholder with a fixed-size canvas
  const CANVAS_ID = 'chart-simple';
  function getCanvas(){
    let c = document.getElementById(CANVAS_ID);
    if (c) return c;
    const svgPlaceholder = document.getElementById('chart-area');
    c = document.createElement('canvas');
    c.id = CANVAS_ID;
    // Simple fixed size (matches sample) for learning/clarity
    c.width = 600; c.height = 350;
    c.style.border = '1px solid rgba(0,0,0,0.12)';
    c.style.display = 'block';
    if (svgPlaceholder && svgPlaceholder.parentNode) svgPlaceholder.parentNode.replaceChild(c, svgPlaceholder);
    else document.body.prepend(c);
    return c;
  }

  const canvas = getCanvas();
  const ctx = canvas.getContext('2d');

  // Simple layout constants (easy to read)
  const originX = 60;
  const originY = 300;
  const chartHeight = 250;
  const barWidth = 70;
  const gap = 30;

  // Prepare data for drawing: scale amounts to chartHeight using max value
  const values = DEFAULT_SALES.map(s => Number(s.amount || 0));
  const labels = DEFAULT_SALES.map(s => s.quarter);
  const colors = ['#e15759','#4e79a7','#f28e2b','#76b7b2'];
  let barAreas = [];

  // Animation state (simple incremental approach)
  let animationProgress = 1; // start full by default
  let animating = false;

  // ------------------- Drawing helpers -------------------
  function clear(){ ctx.clearRect(0,0,canvas.width,canvas.height); }

  function drawGridLines(){
    ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1; ctx.fillStyle = '#111'; ctx.font = '12px Arial';
    const numLines = 5;
    for (let i=0;i<=numLines;i++){
      const y = originY - (chartHeight / numLines) * i;
      ctx.beginPath(); ctx.moveTo(originX, y); ctx.lineTo(originX + 500, y); ctx.stroke();
      const value = Math.round((Math.max(...values) / numLines) * i);
      ctx.fillText(value, originX - 40, y + 4);
    }
  }

  function drawAxes(){ ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(originX, originY); ctx.lineTo(originX + 500, originY); ctx.stroke(); ctx.beginPath(); ctx.moveTo(originX, originY); ctx.lineTo(originX, originY - chartHeight); ctx.stroke(); }

  function drawBars(highlightIndex = -1){
    barAreas = [];
    const max = Math.max(...values, 1);
    const scale = chartHeight / max;
    values.forEach((v,i)=>{
      const barHeight = Math.round(v * scale * animationProgress);
      const x = originX + i * (barWidth + gap);
      const y = originY - barHeight;
      ctx.fillStyle = (i === highlightIndex) ? 'gold' : colors[i % colors.length];
      ctx.fillRect(x, y, barWidth, barHeight);
      // numeric label centered above bar
      const displayedValue = Math.round(v * animationProgress);
      ctx.fillStyle = '#111'; ctx.font = '14px Arial';
      const textW = ctx.measureText(displayedValue).width;
      ctx.fillText(displayedValue, x + (barWidth - textW)/2, y - 6);
      barAreas.push({ x, y, width: barWidth, height: barHeight });
    });
  }

  function drawLabels(){ ctx.fillStyle = '#111'; ctx.font = '14px Arial'; labels.forEach((lab,i)=>{ const x = originX + i * (barWidth + gap) + barWidth/2; ctx.fillText(lab, x - 20, originY + 22); }); }

  function drawChart(highlight=-1){ clear(); drawGridLines(); drawAxes(); drawBars(highlight); drawLabels(); }

  // ------------------- Animation -------------------
  function resetGraph(){ animating = false; animationProgress = 0; drawChart(); }
  function playAnimation(){ animationProgress = 0; animating = true; requestAnimationFrame(stepAnim); }
  function stepAnim(){ animationProgress += 0.04; if (animationProgress > 1) animationProgress = 1; drawChart(); if (animating && animationProgress < 1) requestAnimationFrame(stepAnim); else animating = false; }

  // ------------------- Hover -------------------
  canvas.addEventListener('mousemove', (e)=>{
    const rect = canvas.getBoundingClientRect(); const mx = e.clientX - rect.left; const my = e.clientY - rect.top; let idx = -1; barAreas.forEach((b,i)=>{ if (mx > b.x && mx < b.x + b.width && my > b.y && my < b.y + b.height) idx = i; }); drawChart(idx); });
  canvas.addEventListener('mouseleave', ()=> drawChart(-1));

  // Expose simple helpers for quick testing in console
  window.resetGraphSimple = resetGraph;
  window.playAnimationSimple = playAnimation;

  // Initialize: draw with full bars if admin, otherwise do nothing (page-level auth controls apply)
  try{ if (localStorage.getItem('adminLoggedIn') === 'true'){ animationProgress = 1; drawChart(); } }catch(e){ animationProgress = 1; drawChart(); }

})();
// sales-graph-simple.js — compact SVG bar chart (teaching/demo)
const DEFAULT_SALES = [
  { quarter: 'Jan–Mar', amount: 1995 },
  { quarter: 'Apr–Jun', amount: 1471.31 },
  { quarter: 'Jul–Sep', amount: 892.86 },
  { quarter: 'Oct–Dec', amount: 531.6 }
];

const svg = () => document.getElementById('chart-area');
const svgH = 300, marginTop = 18, marginBottom = 44, marginLeft = 48;
const chartH = svgH - marginTop - marginBottom;

function parse(data){
  if (!Array.isArray(data) || !data.length) return DEFAULT_SALES.slice();
  return data.map(it => ({
    quarter: String((it && it.quarter) || ''),
    amount: Number((it && it.amount) || 0)
  })).filter(d => Number.isFinite(d.amount));
}

function render(data){
  const el = svg(); if (!el) return;
  const d = parse(data);
  while (el.firstChild) el.removeChild(el.firstChild);
  const bars = d.length; const bw = 56, pad = 18;
  const totalW = marginLeft + bars*bw + (bars-1)*pad + 16;
  el.setAttribute('viewBox', `0 0 ${totalW} ${svgH}`);

  const max = Math.max(...d.map(x=>x.amount), 0);
  const scale = (max>0) ? chartH / max : 0;

  d.forEach((it,i)=>{
    const v = it.amount; const h = Math.max(0, Math.min(chartH, v*scale));
    const x = marginLeft + i*(bw+pad);
    const y = marginTop + (chartH - h);
    const r = document.createElementNS('http://www.w3.org/2000/svg','rect');
    r.setAttribute('x', x); r.setAttribute('y', y); r.setAttribute('width', bw); r.setAttribute('height', h);
    r.setAttribute('fill','teal'); r.classList.add('chart-bar'); r.setAttribute('data-value', String(v));
    r.setAttribute('tabindex','0');
    r.addEventListener('mouseenter',()=>r.classList.add('hover'));
    r.addEventListener('mouseleave',()=>r.classList.remove('hover'));
    r.addEventListener('focus',()=>r.classList.add('hover'));
    r.addEventListener('blur',()=>r.classList.remove('hover'));
    el.appendChild(r);
    const t = document.createElementNS('http://www.w3.org/2000/svg','text');
    t.setAttribute('x', x + bw/2); t.setAttribute('y', marginTop + chartH + 18);
    t.setAttribute('text-anchor','middle'); t.setAttribute('font-size','12'); t.textContent = it.quarter;
    el.appendChild(t);
  });

  // simple y ticks
  const ticks = 4; for(let i=0;i<=ticks;i++){ const val = (max/ticks)*i; const yy = marginTop + (chartH - val*scale);
    const l = document.createElementNS('http://www.w3.org/2000/svg','text');
    l.setAttribute('x', marginLeft-8); l.setAttribute('y', yy+4); l.setAttribute('text-anchor','end'); l.setAttribute('font-size','12');
    l.textContent = '$'+Math.round(val); el.appendChild(l);
  }
}

window.updateSalesData = function(newData){ render(newData); };
document.addEventListener('DOMContentLoaded', ()=> render(window.salesData));

export {};
