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

const svgHeight = 300;
const chartHeight = svgHeight; // Assuming no margins for simplicity

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

  const barWidth = 40; // fixed bar width
  const barPadding = 10; // space between bars
  const totalWidth = data.length * barWidth + (data.length - 1) * barPadding;
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
    const barX = index * (barWidth + barPadding);
    const barY = chartHeight - barHeight;

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', barX);
    rect.setAttribute('y', barY);
    rect.setAttribute('width', barWidth);
    rect.setAttribute('height', barHeight);
    rect.setAttribute('fill', 'teal');

    svg.appendChild(rect);
    // label
    const lx = barX + barWidth/2;
    const ly = chartHeight + 18;
    const ltxt = document.createElementNS('http://www.w3.org/2000/svg','text');
    ltxt.setAttribute('x', lx);
    ltxt.setAttribute('y', ly);
    ltxt.setAttribute('text-anchor','middle');
    ltxt.setAttribute('font-size','12');
    ltxt.setAttribute('fill','#111');
    ltxt.textContent = labels[index] || '';
    svg.appendChild(ltxt);
  });
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
