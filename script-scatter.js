// ======================
// GROUPS & COLOR SCALE
// ======================

const nutrientGroups = {
    Macronutrients: [
        "Energy supply",
        "Protein supply",
        "Fat supply",
        "Carbohydrate (available) supply",
        "Dietary fibre supply"
    ],
    Vitamins: [
        "Vitamin A supply (retinol activity equivalents)",
        "Vitamin A supply (retinol equivalents)",
        "Vitamin B6 supply",
        "Vitamin B12 supply",
        "Vitamin C supply",
        "Riboflavin supply",
        "Thiamin supply"
    ],
    Minerals: [
        "Calcium supply",
        "Copper supply",
        "Iron supply",
        "Magnesium supply",
        "Phosphorus supply",
        "Potassium supply",
        "Selenium supply",
        "Zinc supply"
    ],
    "Fatty acids": [
        "Total saturated fatty acids supply",
        "Total monounsaturated fatty acids supply",
        "Total polyunsaturated fatty acids supply"
    ],
    "Omega-3s": [
        "Eicosapentaenoic acid (EPA) supply",
        "Docosahexaenoic acid (DHA) supply"
    ]
};

function getGroup(indicator) {
    const clean = indicator.replace(/\s+/g, " ").trim();
    for (const [group, list] of Object.entries(nutrientGroups)) {
        if (list.includes(clean)) return group;
    }
    return "Other";
}

const groupNames = Object.keys(nutrientGroups);
const colorScaleGroups = d3.scaleOrdinal()
    .domain(groupNames)
    .range(d3.schemeTableau10.slice(0, groupNames.length));

// expose for other scripts
window.nutrientGroups = nutrientGroups;
window.groupNames = groupNames;
window.colorScaleGroups = colorScaleGroups;

// ======================
// SCATTER SETUP
// ======================

const scatterSVG = d3.select("#scatterplot");
const scatterWidth = 600;
const scatterHeight = 500;
scatterSVG.attr("viewBox", `0 0 ${scatterWidth} ${scatterHeight}`);

const scatterMargin = { top: 20, right: 20, bottom: 60, left: 70 };
const scatterInnerWidth =
    scatterWidth - scatterMargin.left - scatterMargin.right;
const scatterInnerHeight =
    scatterHeight - scatterMargin.top - scatterMargin.bottom;

const scatterG = scatterSVG.append("g")
    .attr("transform", `translate(${scatterMargin.left},${scatterMargin.top})`);

let currentGroupFilter = null;
let lastPointSelection = null; // { area, indicator }

// background rect so clicking empty space clears filter
const bgRect = scatterG.append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", scatterInnerWidth)
    .attr("height", scatterInnerHeight)
    .attr("fill", "transparent")
    .on("click", () => {
        // clear group filter and go back to last point selection
        currentGroupFilter = null;
        resetScatterFilter();
        updateLegendStyles();
        if (lastPointSelection &&
            typeof updateBarChart === "function" &&
            typeof updateLineChart === "function") {
            updateBarChart(lastPointSelection.area, lastPointSelection.indicator);
            updateLineChart(lastPointSelection.area, lastPointSelection.indicator);
        }
    });

const xAxisG = scatterG.append("g")
    .attr("transform", `translate(0,${scatterInnerHeight})`);
const yAxisG = scatterG.append("g");

scatterG.append("text")
    .attr("class", "axis-label")
    .attr("x", scatterInnerWidth / 2)
    .attr("y", scatterInnerHeight + 45)
    .attr("text-anchor", "middle")
    .text("2010 Supply Value (All Food Groups)");

scatterG.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -scatterInnerHeight / 2)
    .attr("y", -50)
    .attr("text-anchor", "middle")
    .text("2022 Supply Value (All Food Groups)");

// make sure bg stays behind axes/dots
bgRect.lower();

// ======================
// LEGEND (CLICKABLE)
// ======================

const legendDiv = d3.select("#legend");

const legendItems = legendDiv.selectAll(".legend-item")
    .data(groupNames)
    .enter()
    .append("div")
    .attr("class", "legend-item")
    .on("click", (event, group) => {
        event.stopPropagation();
        if (currentGroupFilter === group) {
            // turn filter off
            currentGroupFilter = null;
            resetScatterFilter();
            updateLegendStyles();
            if (lastPointSelection &&
                typeof updateBarChart === "function" &&
                typeof updateLineChart === "function") {
                updateBarChart(lastPointSelection.area, lastPointSelection.indicator);
                updateLineChart(lastPointSelection.area, lastPointSelection.indicator);
            }
        } else {
            // activate filter for this group
            currentGroupFilter = group;
            clearSelection();
            applyScatterFilter(group);
            updateLegendStyles();
            if (typeof updateBarChartGroup === "function") {
                updateBarChartGroup(group);
            }
            if (typeof updateLineChartGroup === "function") {
                updateLineChartGroup(group);
            }
        }
    });

legendItems.append("div")
    .attr("class", "legend-swatch")
    .style("background-color", d => colorScaleGroups(d));

legendItems.append("span")
    .text(d => d);

function updateLegendStyles() {
    legendDiv.selectAll(".legend-item")
        .style("opacity", d =>
            currentGroupFilter === null || currentGroupFilter === d ? 1 : 0.4
        )
        .style("font-weight", d =>
            currentGroupFilter === d ? "600" : "400"
        );
}

function applyScatterFilter(group) {
    scatterG.selectAll(".dot")
        .style("opacity", d => d.group === group ? 0.9 : 0.05);
}

function resetScatterFilter() {
    scatterG.selectAll(".dot")
        .style("opacity", 0.8);
}

function clearSelection() {
    scatterG.selectAll(".dot").classed("selected", false);
}

// ======================
// LOAD DATA & DRAW
// ======================

d3.csv("FoodSupply.csv").then(data => {
    // keep everything; we only restrict to "All food groups" for scatter
    const allRows = data.filter(d => d["Food Group"] === "All food groups");

    window.nutritionData = { raw: data }; // for other charts

    const scatterData = allRows.map(d => ({
        area: d.Area,
        indicator: d.Indicator,
        group: getGroup(d.Indicator),
        x2010: +d.Y2010,
        y2022: +d.Y2022,
        unit: d.Unit
    }));

    window.nutritionData.scatter = scatterData;

    const xExtent = d3.extent(scatterData, d => d.x2010);
    const yExtent = d3.extent(scatterData, d => d.y2022);
    const xPad = (xExtent[1] - xExtent[0]) * 0.1;
    const yPad = (yExtent[1] - yExtent[0]) * 0.1;

    const xScale = d3.scaleLinear()
        .domain([xExtent[0] - xPad, xExtent[1] + xPad])
        .range([0, scatterInnerWidth]);

    const yScale = d3.scaleLinear()
        .domain([yExtent[0] - yPad, yExtent[1] + yPad])
        .range([scatterInnerHeight, 0]);

    const xAxis = d3.axisBottom(xScale).ticks(6);
    const yAxis = d3.axisLeft(yScale).ticks(6);

    xAxisG.call(xAxis);
    yAxisG.call(yAxis);

    let selected = scatterData[0];
    lastPointSelection = { area: selected.area, indicator: selected.indicator };

    const dots = scatterG.selectAll(".dot")
        .data(scatterData)
        .enter()
        .append("circle")
        .attr("class", "dot")
        .attr("r", 3)
        .attr("cx", d => xScale(d.x2010))
        .attr("cy", d => yScale(d.y2022))
        .attr("fill", d => colorScaleGroups(d.group))
        .on("click", (event, d) => {
            event.stopPropagation();
            currentGroupFilter = null;
            resetScatterFilter();
            updateLegendStyles();
            selected = d;
            lastPointSelection = { area: d.area, indicator: d.indicator };
            highlightSelection();
            if (typeof updateBarChart === "function") {
                updateBarChart(d.area, d.indicator);
            }
            if (typeof updateLineChart === "function") {
                updateLineChart(d.area, d.indicator);
            }
        })
        .append("title")
        .text(d =>
            `${d.indicator}\n${d.area}\n2010: ${d.x2010} ${d.unit}\n2022: ${d.y2022} ${d.unit}`
        );

    function highlightSelection() {
        scatterG.selectAll(".dot")
            .classed("selected", d =>
                lastPointSelection &&
                d.area === lastPointSelection.area &&
                d.indicator === lastPointSelection.indicator
            );
    }

    // initial selection + charts
    highlightSelection();
    if (typeof updateBarChart === "function") {
        updateBarChart(selected.area, selected.indicator);
    }
    if (typeof updateLineChart === "function") {
        updateLineChart(selected.area, selected.indicator);
    }
    updateLegendStyles();
});
