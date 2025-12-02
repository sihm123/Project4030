// script-scatter.js

console.log("script-scatter.js loaded");

// ----------------------
// 1. Basic SVG setup
// ----------------------
const scatterSvg = d3.select("#scatter");
const scatterWidth = +scatterSvg.attr("width");
const scatterHeight = +scatterSvg.attr("height");

const scatterMargin = { top: 40, right: 40, bottom: 60, left: 70 };
const scatterInnerWidth = scatterWidth - scatterMargin.left - scatterMargin.right;
const scatterInnerHeight = scatterHeight - scatterMargin.top - scatterMargin.bottom;

const scatterG = scatterSvg.append("g")
    .attr("transform", `translate(${scatterMargin.left},${scatterMargin.top})`);


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

// Diagonal reference line
scatterG.append("line")
    .attr("class", "diag-line")
    .attr("stroke", "#999")
    .attr("stroke-dasharray", "4 4");

// Store data globally
let scatterDataAll = [];

// ----------------------
// 2. Load CSV
// ----------------------
d3.csv("./FoodSupply.csv").then(data => {

    data.forEach(d => {
        d.country    = d["Area"];
        d.value2010  = +d["Y2010"];
        d.value2022  = +d["Y2022"];
    });

    scatterDataAll = data;

    updateScatter();

}).catch(err => {
    console.error("Error loading CSV for scatterplot:", err);
});

// ----------------------
// 3. Draw scatterplot
// ----------------------
function updateScatter() {

    const filtered = scatterDataAll.filter(d =>
        !isNaN(d.value2010) &&
        !isNaN(d.value2022)
    );

    const maxVal = d3.max([
        d3.max(filtered, d => d.value2010),
        d3.max(filtered, d => d.value2022)
    ]);

    xScale.domain([0, maxVal * 1.05]);
    yScale.domain([0, maxVal * 1.05]);

    xAxisG.call(d3.axisBottom(xScale));
    yAxisG.call(d3.axisLeft(yScale));

    scatterG.select(".diag-line")
        .attr("x1", xScale(0))
        .attr("y1", yScale(0))
        .attr("x2", xScale(maxVal))
        .attr("y2", yScale(maxVal));

    const circles = scatterG.selectAll("circle.data-point")
        .data(filtered, d => d.country);

    circles.exit().remove();

    const circlesEnter = circles.enter()
        .append("circle")
        .attr("class", "data-point")
        .attr("r", 4)
        .attr("fill", "none")
        .attr("stroke", "#1f77b4")
        .attr("stroke-width", 2)
        .attr("opacity", 0.8);

    const merged = circlesEnter.merge(circles);

    merged
        .attr("cx", d => xScale(d.value2010))
        .attr("cy", d => yScale(d.value2022));

    merged.select("title").remove();
    merged.append("title")
        .text(d => `${d.country}\n2010: ${d.value2010}\n2022: ${d.value2022}`);
}

