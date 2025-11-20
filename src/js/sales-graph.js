// Minimal Canvas bar chart — canonical implementation moved here
;(function(){
/*
 DevTools / Testing notes:
 - Open DevTools Console to view debug snapshot printed during init.
 
 The script creates a small toolbar inside the chart container with a "Play Sales" button
 that triggers the same animation as the navbar 'Sales' button. The navbar behavior remains unchanged.
*/
	const DEFAULT_SALES = [
		{ quarter: 'Jan–Mar', amount: 1995.00 },
		{ quarter: 'Apr–Jun', amount: 1471.31 },
		{ quarter: 'Jul–Sep', amount: 892.86 },
		{ quarter: 'Oct–Dec', amount: 531.60 }
	];

	const CANVAS_ID = 'chart';
	const BAR_COLORS = ['#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f'];
	let barRects = [];
	let sales = DEFAULT_SALES.slice();
	let progress = 0; // animation progress [0..1]
	let raf = null;

	/**
	 * getCanvas
	 * Return existing canvas or create one inside the chart container.
	 * Replaces a `#chart-area` placeholder or prepends to `#chart-container`.
	 */
	function getCanvas(){
		// Return existing canvas or create one inside the chart container
		// Note on `display: block`: by default a `canvas` is inline-level and can
		// sit on the text baseline, which often produces a small gap beneath the
		// element in some layouts. Setting `display: block` makes the canvas act
		// like the SVG placeholder it replaces (full-width, no baseline gap),
		// which simplifies sizing and avoids unexpected vertical spacing. It
		// also makes it behave like a normal block-level chart container so
		// `getBoundingClientRect()` returns the expected layout size.
		let c = document.getElementById(CANVAS_ID);
		if (c) return c;
		const container = document.getElementById('chart-container');
		const svgPlaceholder = document.getElementById('chart-area');
		c = document.createElement('canvas');
		c.id = CANVAS_ID;
		// Make the canvas visually match the SVG placeholder (CSS size)
		c.style.display = 'block';
		c.style.width = svgPlaceholder ? svgPlaceholder.style.width || '100%' : '100%';
		c.style.height = svgPlaceholder ? svgPlaceholder.style.height || '300px' : '300px';
		c.style.borderRadius = '8px';
		c.style.border = '1px solid rgba(0,0,0,0.04)';
		if (svgPlaceholder && svgPlaceholder.parentNode) svgPlaceholder.parentNode.replaceChild(c, svgPlaceholder);
		else if (container) container.prepend(c);
		else document.body.prepend(c);
		return c;
	}

	/**
	 * getContext
	 * Return a 2D drawing context scaled for devicePixelRatio. Only
	 * updates the internal bitmap size when necessary to avoid clearing
	 * the existing drawing.
	 */
	function getContext(canvas){
		// Prepare a HiDPI-aware 2D context (scales for devicePixelRatio)
		const dpr = window.devicePixelRatio || 1;
		const rect = canvas.getBoundingClientRect();
		// Compute the internal pixel size for the backing bitmap. `rect.width`
		// is CSS pixels; multiplying by `dpr` yields the number of device
		// pixels required to make 1:1 mapping and avoid blurriness on HiDPI
		// screens. We round to integers because canvas bitmap sizes must be
		// whole numbers, and enforce minimums so very small containers still
		// get a usable drawing surface.
		const desiredW = Math.max(200, Math.round(rect.width * dpr));
		const desiredH = Math.max(140, Math.round(rect.height * dpr));
		const ctx = canvas.getContext('2d');
		// Only resize internal bitmap when size actually changed — reassigning
		// `canvas.width/height` clears the bitmap, which caused hover redraws to
		// lose the previously-drawn bars when we requested the context again.
		if (canvas.width !== desiredW || canvas.height !== desiredH) {
			canvas.width = desiredW;
			canvas.height = desiredH;
		}
		// `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` maps drawing commands that
		// use CSS-pixel coordinates to the high-resolution backing bitmap.
		// After calling this, drawing 1 unit equals 1 CSS pixel while the
		// browser renders into device pixels. This avoids manual scaling math
		// throughout the draw code and keeps strokes/crisp text on HiDPI.
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		return ctx;
	}

	/**
	 * draw
	 * Render the entire chart (grid, bars, labels) and cache bar rects
	 * for hit-testing.
	 */
	// Draw the chart: grid, bars, labels, and caches hit-rects
	//
	// Layout math notes:
	// - `margin` defines the padded area reserved for axis labels and ticks.
	// - `chartW` and `chartH` are the drawable area inside those margins.
	// - `values` are scaled to fit `chartH` by `scale = chartH / max`.
	// - Each bar's rendered height is `v * scale * progress` where `progress`
	//   is the animation parameter (0 → 1). Multiplying by `progress` makes
	//   bars smoothly 'grow' during the animation and shrink on reset.
	// - `y` is computed as top margin plus (chartH - barH) so taller bars
	//   start higher (smaller y) on the canvas. We use `Math.round` for
	//   pixel-aligned 1px grid lines to avoid blurry hairlines on fractional
	//   device coordinates.
	function draw(){
		const canvas = getCanvas();
		// Debug: log draw calls briefly to help trace blue-fill issues
		// (will appear frequently during resize/interaction)
		// console.debug('sales-graph: draw', new Date().toISOString());
		const ctx = getContext(canvas);
		const width = canvas.getBoundingClientRect().width;
		const height = canvas.getBoundingClientRect().height;
		const margin = { top: 20, bottom: 36, left: 34, right: 12 };
		const chartW = width - margin.left - margin.right;
		const chartH = height - margin.top - margin.bottom;
		ctx.clearRect(0,0,width,height);

		const values = sales.map(s => Number(s.amount || 0));
		const labels = sales.map(s => String(s.quarter || ''));
		const max = Math.max(...values, 0);
		const scale = max > 0 ? chartH / max : 0;
		ctx.font = '11px sans-serif'; ctx.textAlign = 'right'; ctx.fillStyle = '#333';
		const ticks = 4;
		for (let i = 0; i <= ticks; i++){
			const v = (max / ticks) * i;
			const y = margin.top + (chartH - v * scale);
			ctx.fillStyle = '#f3f3f3'; ctx.fillRect(margin.left - 8, Math.round(y), chartW + 16, 1);
			ctx.fillStyle = '#333'; ctx.fillText(Math.round(v), margin.left - 10, Math.round(y) + 4);
		}

		// bars
		barRects = [];
		const gap = 18;
		const count = values.length;
		const barW = Math.max(12, (chartW - gap * (count - 1)) / count);
		let x = margin.left;
		for (let i = 0; i < count; i++){
			const v = values[i] || 0;
			const barH = Math.max(0, Math.min(chartH, v * scale * progress));
			const y = margin.top + (chartH - barH);
			ctx.fillStyle = BAR_COLORS[i % BAR_COLORS.length];
			ctx.fillRect(x, y, barW, barH);
			ctx.fillStyle = '#111'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
			ctx.fillText(v.toString(), x + barW / 2, y - 6);
			ctx.fillText(labels[i] || '', x + barW / 2, margin.top + chartH + 18);
			barRects.push({ x, y, w: barW, h: barH, idx: i });
			x += barW + gap;
		}
	}

	/**
	 * findBarIndexAt
	 * Hit-test a client (mouse) position against the cached bar rectangles.
	 *
	 * Why keep this helper? The chart's hover interaction needs a quick way
	 * to determine which bar (if any) the pointer is over. We cache each
	 * bar's rectangle during `draw()` so this function is a small, fast
	 * geometry test that returns the bar index or -1 when none match.
	 */
	function findBarIndexAt(canvas, clientX, clientY){
		const rect = canvas.getBoundingClientRect();
		// Convert client coordinates (page pixels) to canvas-local CSS pixels
		const x = clientX - rect.left;
		const y = clientY - rect.top;
		for (const b of barRects) {
			if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.idx;
		}
		return -1;
	}

	/**
	 * attachInteraction
	 * Wire mouse event handlers for hover highlighting and value labels.
	 * Uses rAF to batch redraws for smoother interaction.
	 */
	// Attach mousemove/leave handlers to highlight hovered bars
	function attachInteraction(){
		const canvas = getCanvas();
		let hovered = -1;

		// Use rAF to batch redraws for smoother interaction and to avoid
		// redrawing many times during fast pointer moves. `pending` prevents
		// scheduling multiple rAF callbacks when one is already queued.
		let pending = false;

		/**
		 * scheduleHoverRedraw
		 * Batch a redraw via requestAnimationFrame. The redraw flow is:
		 *  1) clear `pending` so future schedules are allowed
		 *  2) call `draw()` to render the base chart
		 *  3) if a bar is hovered, draw a translucent highlight, stroke
		 *     outline, set the pointer cursor, and render the value label
		 *     on top of the bar.
		 */
		function scheduleHoverRedraw(){
			if (pending) return;
			pending = true;
			requestAnimationFrame(()=>{
				pending = false;
				// Redraw base chart first (clears previous overlays)
				draw();

				if (hovered >= 0){
					const ctx = getContext(canvas);
					const b = barRects[hovered];

					// Make the pointer obvious
					canvas.style.cursor = 'pointer';

					// Lighten the bar by painting a translucent white rectangle
					ctx.fillStyle = 'rgba(255,255,255,0.18)';
					ctx.fillRect(b.x, b.y, b.w, b.h);

					// Draw a subtle outline around the bar for emphasis
					ctx.strokeStyle = 'rgba(0,0,0,0.12)';
					ctx.lineWidth = 1;
					ctx.strokeRect(Math.round(b.x) + 0.5, Math.round(b.y) + 0.5, Math.round(b.w) - 1, Math.round(b.h) - 1);

					// Draw the exact value above the bar
					ctx.fillStyle = '#111';
					ctx.font = '12px sans-serif';
					ctx.textAlign = 'center';
					const value = sales[b.idx] && Number(sales[b.idx].amount || 0);
					ctx.fillText(String(value), b.x + b.w / 2, b.y - 6);
				} else {
					// Reset cursor when not hovering
					canvas.style.cursor = '';
				}
			});
		}

		canvas.addEventListener('mousemove', e => {
			const idx = findBarIndexAt(canvas, e.clientX, e.clientY);
			if (idx === hovered) return;
			hovered = idx;
			scheduleHoverRedraw();
		});
		canvas.addEventListener('mouseleave', ()=>{ hovered = -1; scheduleHoverRedraw(); });
	}

	/**
	 * updateSalesData
	 * Public API to replace the dataset. Accepts arrays of numbers or
	 * objects {quarter, amount} and animates the chart into view.
	 */
	// Public API: update the chart data (array of numbers or {quarter,amount})
	window.updateSalesData = function(newData){
		if (!Array.isArray(newData) || newData.length === 0) return;
		if (typeof newData[0] === 'number') sales = newData.map((v,i)=>({ quarter: 'Q'+(i+1), amount: Number(v) }));
		else sales = newData.map(d=>({ quarter: String(d.quarter||''), amount: Number(d.amount||0) }));
		// restart animation when new data arrives
		animateTo(1, 700);
	};

	/**
	 * animateTo
	 * Animate the `progress` value from current to `target` over
	 * `duration` milliseconds using a cosine ease for smooth motion.
	 */
	// Animate progress to `target` in [0..1] over `duration` ms
	function animateTo(target = 1, duration = 600){
		if (raf) cancelAnimationFrame(raf);
		const start = performance.now();
		const from = progress;
		const diff = target - from;
		if (!duration){ progress = target; draw(); return; }
		function step(ts){
			const t = Math.min(1, (ts - start) / duration);
			// easeInOut (cosine)
			const eased = (1 - Math.cos(Math.PI * t)) / 2;
			progress = from + diff * eased;
			draw();
			if (t < 1) raf = requestAnimationFrame(step); else { progress = target; raf = null; }
		}
		raf = requestAnimationFrame(step);
	}

	/**
	 * init
	 * Initialize canvas, attach interactions, start initial animation,
	 * wire Reset helper and create the small Play Sales toolbar button.
	 */
	function init(){
		const c = getCanvas();
		if ('ResizeObserver' in window){ const ro = new ResizeObserver(draw); ro.observe(c); }
		else window.addEventListener('resize', draw);

		// Insert a small toolbar with a 'Play Sales' button inside the chart container
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
					btn.type = 'button';
					btn.className = 'sales-play-btn';
					btn.textContent = 'Play Sales';
					btn.addEventListener('click', ()=> animateTo(1, 900));
					toolbar.appendChild(btn);
				}
			}
		}catch(e){ console.warn('sales-graph: toolbar insert failed', e && e.message); }

		// Attach interactions and ensure initial animation runs
		attachInteraction();
		// start from zero and animate in
		progress = 0;
		animateTo(1, 900);
		// wire Reset Graph button immediately
		try { const btn = document.getElementById('graphResetBtn'); if (btn) btn.addEventListener('click', ()=> animateTo(0, 700)); } catch(e){}
		// Expose simple helpers for console testing
		window.resetChart = () => animateTo(0, 700);
		window.playChart = () => animateTo(1, 700);
		console.log('sales-graph.js initialized');
	}
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

	// Quick runtime debug: list canvas elements and sizes shortly after init.
	// This helps identify if another canvas is being created that fills the screen.
	setTimeout(() => {
		try {
			const canvases = Array.from(document.querySelectorAll('canvas'));
			if (canvases.length > 0) {
				console.info('sales-graph: canvas elements', canvases.map(c => ({ id: c.id || null, rect: c.getBoundingClientRect(), css: getComputedStyle(c).cssText })) );
			} else console.info('sales-graph: no canvas elements found');
		} catch (e) { /* ignore */ }
	}, 1200);

	// Wire Reset Graph button to animate bars to 0
	setTimeout(() => {
		try {
			const btn = document.getElementById('graphResetBtn');
			if (btn) btn.addEventListener('click', ()=> animateTo(0, 700));
		} catch(e){ }
	}, 300);
})();
