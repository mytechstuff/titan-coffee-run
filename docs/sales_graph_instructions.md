# Sales Graph — Student Guide

This document explains how the sales bar chart works and where to change values if you're learning JavaScript.

Files:
- `src/js/sales-graph.js` — the JavaScript module that renders the SVG chart.
- `sales.html` — the demo page that contains the chart `<svg>` element (`#chart-area`) and loads the module.

Data format
- The module expects an array named `salesData` (attached to `window`) with the shape:
  [{ quarter: 'Jan–Mar', amount: 2005.00 }, ...]
- Example (place before the module script tag in `sales.html`):

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

If you don't provide `window.salesData`, the module will use a default dataset.

Key variables to experiment with (in `src/js/sales-graph.js`):
- `svgHeight` — total height of the SVG. Increasing it gives more vertical space.
- `marginTop`, `marginBottom`, `marginLeft`, `marginRight` — reserve space for axis labels and padding.
- `barWidth` — width of each bar. Increasing this makes bars thicker and makes the chart wider.
- `barPadding` — horizontal space between bars.

Rendering flow (high level):
1. The module determines the data to use (`window.salesData` or default).
2. It computes chart layout: viewBox, bar width, padding, and margins.
3. For each data point it draws an SVG `<rect>` for the bar and an SVG `<text>` for the x-axis label.
4. It draws horizontal grid lines and left-hand y-axis labels (computed from the max amount).

Updating data at runtime
- The module exposes `window.updateSalesData(newArray)` where `newArray` has the same object shape.
- This is useful if you fetch data via XHR/fetch and then call `window.updateSalesData(serverData)`.

Accessibility notes
- The SVG includes a `<title>` element which provides a short description to assistive technologies.
- X and Y axis labels are rendered as text nodes inside the SVG so that screen-readers can access them as well.

Hands-on exercises for students
- Change `barWidth` and `barPadding` and observe how the chart scales horizontally.
- Change `svgHeight` and margins and see how the vertical layout changes.
- Format the y-axis labels to show cents using `toFixed(2)` or `Intl.NumberFormat`.
- Add values above each bar by appending an extra `<text>` element above the rect with the numeric amount.

If you'd like, I can add a small interactive interface that lets you tweak `barWidth` and `barPadding` live on the page and see the effect immediately.