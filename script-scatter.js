// script-scatter.js
const scatterSvg = d3.select("#scatter");
const scatterWidth = +scatterSvg.attr("width");
const scatterHeight = +scatterSvg.attr("height");

const scatterMargin = { top: 40, right: 40, bottom: 60, left: 70 };
const scatterInnerWidth = scatterWidth - scatterMargin.left - scatterMargin.right;
const scatterInnerHeight = scatterHeight - scatterMargin.top - scatterMargin.bottom;

const scatterG = scatterSvg.append("g")
  .attr("transform", `translate(${scatterMargin.left},${scatterMargin.top})`);

const scatterIndicatorSelect = document.getElementById("scatterIndicator");

// Scales and axes
const xScale = d3.scaleLinear().range([0, scatterInnerWidth]);
const yScale = d3.scaleLinear().range([scatterInnerHeight, 0]);

const xAxisG = scatterG.append("g")
  .attr("transform", `translate(0,${scatterInnerHeight})`);

const yAxisG = scatterG.append("g");

// Axis labels
scatterG.append("text")
  .attr("class", "x-label")
  .attr("x", scatterInnerWidth / 2)
  .attr("y", scatterInnerHeight + 40)
  .attr("text-anchor", "middle")
  .text("2010 Supply Value");

scatterG.append("text")
  .attr("class", "y-label")
  .attr("transform", "rotate(-90)")
  .attr("x", -scatterInnerHeight / 2)
  .attr("y", -50)
  .attr("text-anchor", "middle")
  .text("2022 Supply Value");

// Diagonal reference line (y = x)
scatterG.append("line")
  .attr("class", "diag-line")
  .attr("stroke", "#999")
  .attr("stroke-dasharray", "4 4");

// We'll store all data here after loading
let scatterDataAll = [];
let scatterPairs = [];

// Load CSV data
d3.csv("FoodSupply.csv").then(data => {
  data.forEach(d => {
    d.country    = d.Area;
    d.year       = +d.Year;
    d.indicator  = d.Element;
    d.food_group = d.Item;
    d.value      = +d.Value;
  });

  scatterDataAll = data;

  console.log("Rows loaded:", scatterDataAll.length);
  console.log("First row:", scatterDataAll[0]);

  // Populate indicator dropdown
  const indicators = Array.from(new Set(data.map(d => d.indicator))).sort();

  indicators.forEach(ind => {
    const opt = document.createElement("option");
    opt.value = ind;
    opt.textContent = ind;
    scatterIndicatorSelect.appendChild(opt);
  });

  // Set default indicator (first in sorted list)
  if (indicators.length > 0) {
    scatterIndicatorSelect.value = indicators[0];
  }

  // Initial draw
  updateScatter();

  // When dropdown changes, update scatter + notify others
  scatterIndicatorSelect.addEventListener("change", () => {
    updateScatter();

    window.dispatchEvent(new CustomEvent("indicatorChange", {
      detail: { indicator: scatterIndicatorSelect.value }
    }));
  });

  window.dispatchEvent(new CustomEvent("indicatorChange", {
    detail: { indicator: scatterIndicatorSelect.value }
  }));
}).catch(err => {
  console.error("Error loading CSV for scatterplot:", err);
});

// Update scatter for selected indicator
function updateScatter() {
  const indicator = scatterIndicatorSelect.value;

  // Filter to this indicator and only years 2010 or 2022
  const filtered = scatterDataAll.filter(d =>
    d.indicator === indicator && (d.year === 2010 || d.year === 2022)
  );

  // Pivot: one row per country with value2010 and value2022
  const byCountry = d3.group(filtered, d => d.country);
  scatterPairs = [];
  byCountry.forEach((rows, country) => {
    const y2010 = rows.find(r => r.year === 2010);
    const y2022 = rows.find(r => r.year === 2022);
    if (y2010 && y2022) {
      scatterPairs.push({
        country,
        value2010: y2010.value,
        value2022: y2022.value
      });
    }
  });

  if (scatterPairs.length === 0) {
    // No data, clear axes and points
    xScale.domain([0, 1]);
    yScale.domain([0, 1]);
    xAxisG.call(d3.axisBottom(xScale));
    yAxisG.call(d3.axisLeft(yScale));
    scatterG.selectAll("circle.data-point").remove();
    return;
  }

  // Set domains based on data
  const maxVal = d3.max([
    d3.max(scatterPairs, d => d.value2010),
    d3.max(scatterPairs, d => d.value2022)
  ]);

  xScale.domain([0, maxVal * 1.05]);
  yScale.domain([0, maxVal * 1.05]);

  // Update axes
  xAxisG.call(d3.axisBottom(xScale));
  yAxisG.call(d3.axisLeft(yScale));

  // Update diagonal line
  scatterG.select(".diag-line")
    .attr("x1", xScale(0))
    .attr("y1", yScale(0))
    .attr("x2", xScale(maxVal))
    .attr("y2", yScale(maxVal));

  // Bind data to circles
  const circles = scatterG.selectAll("circle.data-point")
    .data(scatterPairs, d => d.country);

  // Remove old
  circles.exit().remove();

  // Enter new
  const circlesEnter = circles.enter()
    .append("circle")
    .attr("class", "data-point")
    .attr("r", 4)
    .attr("fill", "#1f77b4")
    .attr("opacity", 0.8);

  // Merge enter + update
  const circlesMerged = circlesEnter.merge(circles);

  circlesMerged
    .attr("cx", d => xScale(d.value2010))
    .attr("cy", d => yScale(d.value2022));

  // Simple tooltip: country + values
  circlesMerged.append("title")
    .text(d => `${d.country}\n2010: ${d.value2010}\n2022: ${d.value2022}`);
}

