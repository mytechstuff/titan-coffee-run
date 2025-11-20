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
  /**
   * getCanvas
   * Create or return a simple fixed-size canvas. We intentionally keep
   * the size fixed (600x350) to match the pedagogical sample and keep
   * the math straightforward for learners.
   */
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
  /**
   * clear
   * Clear the full canvas area. Kept as a tiny helper for clarity.
   */
  function clear(){ ctx.clearRect(0,0,canvas.width,canvas.height); }

  /**
   * drawGridLines
   * Draw horizontal grid lines and numeric Y labels. We compute evenly
   * spaced ticks (numLines) and convert chart-relative positions to
   * canvas Y coordinates using `originY - (chartHeight / numLines) * i`.
   */
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

  /**
   * drawAxes
   * Draw simple X and Y axes. Coordinates are absolute: X axis runs from
   * `originX` to `originX+500`, Y axis goes up by `chartHeight`.
   */
  function drawAxes(){ ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(originX, originY); ctx.lineTo(originX + 500, originY); ctx.stroke(); ctx.beginPath(); ctx.moveTo(originX, originY); ctx.lineTo(originX, originY - chartHeight); ctx.stroke(); }

  /**
   * drawBars
   * Draw each bar and its numeric label. Math:
   * - `max` is the largest data value.
   * - `scale = chartHeight / max` converts a raw value into pixel height.
   * - `barHeight = v * scale * animationProgress` applies animation progress
   *    (0..1) so bars grow/shrink smoothly.
   */
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

  /**
   * drawLabels
   * Draw the label text beneath each bar. We center each label under the
   * bar by computing the bar's center X position.
   */
  function drawLabels(){ ctx.fillStyle = '#111'; ctx.font = '14px Arial'; labels.forEach((lab,i)=>{ const x = originX + i * (barWidth + gap) + barWidth/2; ctx.fillText(lab, x - 20, originY + 22); }); }

  /**
   * drawChart
   * Compose full chart rendering: clear canvas, draw grid, axes, bars,
   * and labels. `highlight` is an optional index to emphasize a bar.
   */
  function drawChart(highlight=-1){ clear(); drawGridLines(); drawAxes(); drawBars(highlight); drawLabels(); }

  // ------------------- Animation -------------------
  /**
   * resetGraph
   * Stop animation and set progress to 0 so bars render at zero height.
   */
  function resetGraph(){ animating = false; animationProgress = 0; drawChart(); }

  /**
   * playAnimation
   * Start a simple incremental animation that increases
   * `animationProgress` from 0→1. This is intentionally basic for
   * pedagogical clarity; higher-fidelity easing could be added later.
   */
  function playAnimation(){ animationProgress = 0; animating = true; requestAnimationFrame(stepAnim); }

  /**
   * stepAnim
   * Animation frame step: advance progress by a small fixed delta and
   * request another frame until progress reaches 1.
   */
  function stepAnim(){ animationProgress += 0.04; if (animationProgress > 1) animationProgress = 1; drawChart(); if (animating && animationProgress < 1) requestAnimationFrame(stepAnim); else animating = false; }

  // ------------------- Hover -------------------
  /**
   * Pointer hover handlers
   * We compute mouse coordinates relative to the canvas and test against
   * `barAreas` recorded during `drawBars`. If a bar is under the cursor
   * we redraw the chart with that index highlighted.
   */
  canvas.addEventListener('mousemove', (e)=>{
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left; const my = e.clientY - rect.top;
    let idx = -1;
    barAreas.forEach((b,i)=>{ if (mx > b.x && mx < b.x + b.width && my > b.y && my < b.y + b.height) idx = i; });
    drawChart(idx);
  });
  canvas.addEventListener('mouseleave', ()=> drawChart(-1));

  // Expose simple helpers for quick testing in console
  window.resetGraphSimple = resetGraph;
  window.playAnimationSimple = playAnimation;

  // Initialize: draw with full bars if admin, otherwise do nothing (page-level auth controls apply)
  try{ if (localStorage.getItem('adminLoggedIn') === 'true'){ animationProgress = 1; drawChart(); } }catch(e){ animationProgress = 1; drawChart(); }
  // Wire the page-level Reset button (if present) so it resets this simple chart.
  try{
    const resetBtn = document.getElementById('graphResetBtn');
    if (resetBtn) resetBtn.addEventListener('click', resetGraph);
  }catch(e){}

  // Insert a small Play Sales toolbar (mirrors the main implementation)
  try{
    const container = document.getElementById('chart-container') || document.querySelector('.chart-box');
    if (container){
      let toolbar = container.querySelector('.sales-chart-toolbar');
      if(!toolbar){
        toolbar = document.createElement('div');
        toolbar.className = 'sales-chart-toolbar';
        container.insertBefore(toolbar, container.firstChild);
      }
      if(!toolbar.querySelector('.sales-play-btn')){
        const btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'sales-play-btn'; btn.textContent = 'Play Sales';
        btn.addEventListener('click', ()=> playAnimation());
        toolbar.appendChild(btn);
      }
    }
  }catch(e){ /* ignore toolbar insertion errors */ }

})();
