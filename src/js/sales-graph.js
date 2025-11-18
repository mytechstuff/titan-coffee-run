// sales-graph.js
// Renders a simple bar chart into an SVG with id 'chart-area'.
// Uses the user's provided code with a DOMContentLoaded wrapper.

// Prefer a global `salesData` array of objects if provided by the page; otherwise fall back to default data.
// Each item should be { quarter: 'Jan-Mar', amount: 2005.00 }
const DEFAULT_SALES = [
  { quarter: 'Jan–Mar', amount: 1995.00 },
  { quarter: 'Apr–Jun', amount: 1471.31 },
  { quarter: 'Jul–Sep', amount: 892.86 },
  { quarter: 'Oct–Dec', amount: 531.60 }
];

let chartData = (window.salesData && Array.isArray(window.salesData) && window.salesData.length && typeof window.salesData[0] === 'object')
  ? window.salesData.map(it => ({ quarter: String(it.quarter || ''), amount: Number(it.amount || 0) }))
  : DEFAULT_SALES.slice();

// Layout: reserve margins for axis labels
/*
  sales-graph.js

  Overview for new JS students:
  - This module renders a simple SVG bar chart into the page element with id `chart-area`.
  - The chart reads `window.salesData` if provided (array of objects { quarter, amount }).
  - If no data is provided, it falls back to `DEFAULT_SALES` defined below.

  Key variables you may change:
  - DEFAULT_SALES: change default quarter names and amounts.
  - svgHeight: total SVG height in pixels.
  - marginTop/marginBottom/marginLeft/marginRight: space reserved for labels.
  - barWidth: width of each bar. Increasing this makes the chart wider.
  - barPadding: space between bars.

  Where to place data:
  - Put `window.salesData = [{ quarter: 'Jan–Mar', amount: 2005.00 }, ...];` in the page *before* the
    module is loaded (i.e. before the `<script type="module" src="./src/js/sales-graph.js"></script>` tag).


  This file intentionally keeps logic simple and vanilla.
*/

const svgHeight = 360;
const marginTop = 20;
const marginBottom = 48; // space for x-axis labels
const marginLeft = 56; // space for y-axis labels
const marginRight = 20;
const chartHeight = svgHeight - marginTop - marginBottom;

function getMaxValue(arr){
  return arr && arr.length ? Math.max(...arr) : 0;
}

// Simpler linear scaling: compute a single scale factor once per render
/**
 * computeScaleFactor — return pixels-per-unit for the dataset
 *
 * Simpler approach (what it does):
 * - Compute `scaleFactor = maxPixelHeight / maxDataValue` once per render.
 * - For each value, compute pixel height as `value * scaleFactor`.
 *
 * Why it's simpler:
 * - Avoids dividing for every bar: one division up-front, then fast multiplications.
 * - Keeps the math identical to the previous approach because
 *   `value * (maxPixelHeight / maxDataValue) === (value / maxDataValue) * maxPixelHeight`.
 *
 * Edge cases: if `maxDataValue <= 0` or `maxPixelHeight <= 0` we return `0`.
 * Use the returned factor to multiply each data value and clamp the result
 * to the available `maxPixelHeight` as needed.
 *
 * @param {number} maxDataValue - the maximum numeric value in the dataset
 * @param {number} maxPixelHeight - the maximum pixel height available (chartHeight)
 * @returns {number} pixels per unit (scaleFactor)
 */
function computeScaleFactor(maxDataValue, maxPixelHeight) {
  if (!(maxDataValue > 0) || !(maxPixelHeight > 0)) return 0;
  return maxPixelHeight / maxDataValue;
}

// Function to create and position SVG bars
function createBarChart(data, svgHeight, chartHeight) {
  const svg = document.getElementById('chart-area');
  if (!svg) return;

  // Clear any existing content
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  // Increase barWidth by 50% to make the chart wider as requested.
  // Original values were: barWidth = 40, barPadding = 16
  // 50% wider -> multiply by 1.5
  const barWidth = Math.round(40 * 1.5); // 60
  const barPadding = Math.round(16 * 1.5); // 24
  const totalWidth = marginLeft + data.length * barWidth + (data.length - 1) * barPadding + marginRight;
  svg.setAttribute('viewBox', `0 0 ${totalWidth} ${svgHeight}`);
  svg.setAttribute('height', svgHeight);
  svg.setAttribute('width', '100%');

  // Optional: add title/desc for accessibility
  const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
  title.textContent = 'Sales bar chart (demo)';
  svg.appendChild(title);

  const amounts = data.map(d => Number(d.amount || 0));
  const labels = data.map(d => String(d.quarter || ''));
  const maxValue = getMaxValue(amounts);
  const scaleFactor = computeScaleFactor(maxValue, chartHeight);
  data.forEach((d, index) => {
    // value: numeric amount for this bar (sales, revenue, etc.). We coerce
    // to Number so later math is predictable (Number(undefined) -> NaN,
    // but we guard with `|| 0` to default missing values to 0).
    const value = Number(d.amount || 0);

    // barHeight: how tall the bar should be in pixels. It comes from the
    // pre-computed `scaleFactor` which expresses "pixels per unit value".
    //
    // Math: `scaleFactor = chartHeight / maxValue` so
    // `barHeight = value * scaleFactor` is equivalent to
    // `(value / maxValue) * chartHeight` used elsewhere. Computing the
    // factor once and multiplying is simpler and slightly faster.
    let barHeight = value * scaleFactor;

    // Ensure barHeight is a finite non-negative number and doesn't exceed
    // the available chartHeight. This guards against invalid input and
    // keeps bars within the SVG drawing area.
    if (!isFinite(barHeight) || barHeight <= 0) barHeight = 0;
    if (barHeight > chartHeight) barHeight = chartHeight;

    // barX: horizontal position for this bar's left edge. We start at
    // `marginLeft` (to leave space for y-axis labels) and add the width of
    // previous bars plus padding for each index.
    const barX = marginLeft + index * (barWidth + barPadding);

    // barY: vertical position for the top edge of the bar. SVG's y axis
    // increases downward, so to make a bar that grows upward from the
    // baseline we place its top at `marginTop + (chartHeight - barHeight)`.
    // - `marginTop` moves us below the top margin
    // - `chartHeight - barHeight` moves the rect down so its bottom aligns
    //   with the chart baseline and its top represents the correct height.
    const barY = marginTop + (chartHeight - barHeight);

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    // add a class so CSS can style it and JS can find it
    rect.classList.add('chart-bar');
    // expose value on the element for debugging / possible tooltip use
    rect.setAttribute('data-value', String(value));
    // keyboard accessibility: make bars focusable
    rect.setAttribute('tabindex', '0');
    // mouseover highlight: add/remove a `hover` class on enter/leave
    rect.addEventListener('mouseenter', () => rect.classList.add('hover'));
    rect.addEventListener('mouseleave', () => rect.classList.remove('hover'));
    // keyboard: treat focus as hover and allow escape to clear
    rect.addEventListener('focus', () => rect.classList.add('hover'));
    rect.addEventListener('blur', () => rect.classList.remove('hover'));
    rect.setAttribute('x', barX);
    rect.setAttribute('y', barY);
    rect.setAttribute('width', barWidth);
    rect.setAttribute('height', barHeight);
    rect.setAttribute('fill', 'teal');

    svg.appendChild(rect);
    // x-axis label under each bar
    const lx = barX + barWidth/2;
    const ly = marginTop + chartHeight + 20;
    const ltxt = document.createElementNS('http://www.w3.org/2000/svg','text');
    ltxt.setAttribute('x', lx);
    ltxt.setAttribute('y', ly);
    ltxt.setAttribute('text-anchor','middle');
    ltxt.setAttribute('font-size','12');
    ltxt.setAttribute('fill','#111');
    ltxt.textContent = labels[index] || '';
    svg.appendChild(ltxt);
  });

  // y-axis ticks and labels (left side)
  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const tVal = (maxValue / ticks) * i;
    // Use scaleFactor to compute pixel offset for the tick value safely
    const y = marginTop + (chartHeight - (tVal * scaleFactor));
    // horizontal grid line
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', marginLeft - 6);
    line.setAttribute('x2', totalWidth - marginRight);
    line.setAttribute('y1', y);
    line.setAttribute('y2', y);
    line.setAttribute('stroke', '#eee');
    line.setAttribute('stroke-width', '1');
    svg.appendChild(line);

    // label
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', marginLeft - 10);
    label.setAttribute('y', y + 4);
    label.setAttribute('text-anchor', 'end');
    label.setAttribute('font-size', '12');
    label.setAttribute('fill', '#333');
    label.textContent = '$' + (Math.round(tVal));
    svg.appendChild(label);
  }
}

// Expose an update function so pages can call to re-render with new data.
window.updateSalesData = function(newData){
  if (!Array.isArray(newData)) return;
  // Expect array of {quarter, amount}
  const parsed = newData.map(it => ({ quarter: String(it.quarter || ''), amount: Number(it.amount || 0) }))
    .filter(it => Number.isFinite(it.amount));
  if (!parsed.length) return;
  chartData = parsed.slice();
  createBarChart(chartData, svgHeight, chartHeight);
};

document.addEventListener('DOMContentLoaded', () => {
  createBarChart(chartData, svgHeight, chartHeight);
});

export {};
