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
