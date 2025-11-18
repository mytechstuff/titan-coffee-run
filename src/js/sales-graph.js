// sales-graph.js
// Renders a simple bar chart into an SVG with id 'chart-area'.
// Uses the user's provided code with a DOMContentLoaded wrapper.

// Prefer a global `salesData` array of objects if provided by the page; otherwise fall back to default data.
// Each item should be { quarter: 'Jan-Mar', amount: 2005.00 }
const DEFAULT_SALES = [
  { quarter: 'Jan–Mar', amount: 2005.00 },
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
  - Or call `window.updateSalesData(array)` later to update the chart programmatically.

  This file intentionally keeps logic simple and vanilla so students can read and modify easily.
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

// A simple scaling function to map a data value to a pixel height
function scaleHeight(value, maxDataValue, maxPixelHeight) {
  if (maxDataValue <= 0) return 0;
  return (value / maxDataValue) * maxPixelHeight;
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
  data.forEach((d, index) => {
    const value = Number(d.amount || 0);
    const barHeight = scaleHeight(value, maxValue, chartHeight);
    const barX = marginLeft + index * (barWidth + barPadding);
    const barY = marginTop + (chartHeight - barHeight);

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
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
    const y = marginTop + (chartHeight - (tVal / maxValue) * chartHeight);
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
