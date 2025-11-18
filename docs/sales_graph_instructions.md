# Sales Graph — Student Guide

This guide explains how the small sales bar chart works and where to change values. It's written for students learning vanilla JavaScript and SVG.

Files involved
- `src/js/sales-graph.js` — the module that draws the chart into the SVG element `#chart-area`.
- `sales.html` — the demo page that holds the SVG and loads the module.

Quick example (how to provide data)
1. In `sales.html`, before the module script tag, add:

```html
<script>
  window.salesData = [
    { quarter: 'Jan–Mar', amount: 2005.00 },
    { quarter: 'Apr–Jun', amount: 1471.31 },
    { quarter: 'Jul–Sep', amount: 892.86 },
    { quarter: 'Oct–Dec', amount: 531.60 }
  ];
</script>
<script type="module" src="./src/js/sales-graph.js"></script>
```

2. The module will read `window.salesData` when it initializes. If no data is provided, a default dataset is used.

Where to change visual variables (in `src/js/sales-graph.js`)
- `svgHeight` — total height (pixels) of the SVG. Increasing this gives more vertical room.
- `marginTop`, `marginBottom`, `marginLeft`, `marginRight` — space reserved for labels and axis ticks.
- `barWidth` — width of each bar (in pixels). Increasing this makes bars thicker and the overall chart wider.
- `barPadding` — horizontal space (in pixels) between bars.

Example snippet (from `sales-graph.js`) — these are the variables students usually change:

```javascript
const svgHeight = 360;
const marginTop = 20;
const marginBottom = 48; // space for x-axis labels
const marginLeft = 56;   // space for y-axis labels
const marginRight = 20;

// Bar sizing (we increased width 50% for the demo)
const barWidth = Math.round(40 * 1.5); // 60
const barPadding = Math.round(16 * 1.5); // 24
```

Rendering flow (high level)
1. The module chooses the data to use: `window.salesData` or the built-in `DEFAULT_SALES`.
2. It computes the `viewBox` and layout using margins, barWidth, and padding.
3. For each data point it draws an SVG `<rect>` for the bar and a `<text>` label for the quarter underneath.
4. It draws horizontal grid lines and Y-axis numeric labels on the left.

Where labels are drawn in the code
- X labels (quarters): created inside the loop that draws each bar. Look for the block that creates an SVG `<text>` after creating the `<rect>`.
- Y labels (ticks): created after bars are drawn in a small loop that computes `tVal` (tick value) and appends a `<text>` element at the left.

Runtime updates
- The module exposes `window.updateSalesData(newArray)` that accepts an array of objects in the same shape.
- Example usage after the page loads:

```html
<script>
  // replace the chart data and redraw
  window.updateSalesData([
    { quarter: 'Jan–Mar', amount: 2100 },
    { quarter: 'Apr–Jun', amount: 1500 },
    { quarter: 'Jul–Sep', amount: 900 },
    { quarter: 'Oct–Dec', amount: 600 }
  ]);
</script>
```

Formatting numbers and currency
- Right now the Y-axis labels use `Math.round(tVal)` and a leading `$`.
- To show cents or locale-aware formatting, update the label creation to use `Intl.NumberFormat` or `toFixed(2)`. For example:

```javascript
const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
label.textContent = fmt.format(tVal);
```

Accessibility notes
- The SVG contains a `<title>` element so screen readers get a short description.
- X and Y labels are normal SVG `<text>` nodes so they expose textual information to assistive tech.

Exercises for students
- Tweak `barWidth`/`barPadding` and reload — notice how `viewBox` is updated.
- Add a numeric label above each bar that shows the exact amount (append a `<text>` positioned at `barY - 6`).
- Change `ticks` count to see more or fewer horizontal grid lines.
- Make Y labels show cents using `Intl.NumberFormat`.
- Make `barWidth` responsive by computing it from `totalWidth / data.length` instead of a fixed pixel value.

If you want I can add a small interactive control panel (on the page) so students can change `barWidth`, `barPadding`, and `ticks` live and see immediate results.
