// sales-graph.js
// Renders a simple bar chart into an SVG with id 'chart-area'.
// Uses the user's provided code with a DOMContentLoaded wrapper.

// Prefer a global `salesDate` array if provided by the page; otherwise fall back to demo data.
const DEFAULT_DATA = [40, 80, 150, 160, 230, 420];
const data = (window.salesDate && Array.isArray(window.salesDate) && window.salesDate.length)
  ? window.salesDate.slice() // copy to avoid accidental mutation
  : DEFAULT_DATA.slice();

const svgHeight = 300;
const chartHeight = svgHeight; // Assuming no margins for simplicity
const maxValue = data.length ? Math.max(...data) : 0;

// A simple scaling function to map a data value to a pixel height
function scaleHeight(value, maxDataValue, maxPixelHeight) {
  if (maxDataValue <= 0) return 0;
  return (value / maxDataValue) * maxPixelHeight;
}

// Function to create and position SVG bars
function createBarChart(data, svgHeight, chartHeight, maxValue) {
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

  data.forEach((value, index) => {
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
  });
}

document.addEventListener('DOMContentLoaded', () => {
  createBarChart(data, svgHeight, chartHeight, maxValue);
});

export {};
