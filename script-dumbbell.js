// ======================
// DUMBBELL CHART SETUP
// ======================

const dumbbellSVG = d3.select("#dumbbell-chart");
const dumbbellWidth = 400;
const dumbbellHeight = 220;
dumbbellSVG.attr("viewBox", `0 0 ${dumbbellWidth} ${dumbbellHeight}`);

const dumbbellMargin = { top: 10, right: 25, bottom: 30, left: 160 };
const dumbbellInnerWidth = dumbbellWidth - dumbbellMargin.left - dumbbellMargin.right;
const dumbbellInnerHeight = dumbbellHeight - dumbbellMargin.top - dumbbellMargin.bottom;

const dumbbellG = dumbbellSVG.append("g")
    .attr("transform", `translate(${dumbbellMargin.left},${dumbbellMargin.top})`);

const dumbbellXAxisG = dumbbellG.append("g")
    .attr("transform", `translate(0,${dumbbellInnerHeight})`);
const dumbbellYAxisG = dumbbellG.append("g");

const dumbbellXScale = d3.scaleLinear().range([0, dumbbellInnerWidth]);
const dumbbellYScale = d3.scaleBand().range([0, dumbbellInnerHeight]).padding(0.25);

// Colors for increase/decrease
const increaseColor = "#2e7d32"; // green
const decreaseColor = "#c62828"; // red
const neutralColor = "#757575";  // gray
const dot2010Color = "#888";

// Track current state
let currentDumbbellGroup = null;
let currentDumbbellCountry = null;

// ======================
// UPDATE DUMBBELL CHART
// ======================

window.updateDumbbellChart = function(group, country) {
    if (!window.nutritionData || !window.nutritionData.raw) return;
    if (!window.nutrientGroups) return;
    
    currentDumbbellGroup = group;
    if (country) {
        currentDumbbellCountry = country;
    }
    
    const indicators = window.nutrientGroups[group];
    if (!indicators) return;
    
    // Filter data for this country and these indicators
    const rows = window.nutritionData.raw.filter(d =>
        d.Area === currentDumbbellCountry &&
        d["Food Group"] === "All food groups" &&
        indicators.includes(d.Indicator)
    );
    
    if (rows.length === 0) {
        dumbbellG.selectAll(".dumbbell-row").remove();
        d3.select("#dumbbell-title").text(`${group} — No data`);
        d3.select("#dumbbell-country").text(currentDumbbellCountry);
        return;
    }
    
    // Prepare data
    const data = rows.map(d => ({
        indicator: d.Indicator,
        shortName: shortenIndicatorName(d.Indicator),
        value2010: +d.Y2010,
        value2022: +d.Y2022,
        unit: d.Unit,
        change: +d.Y2022 - +d.Y2010,
        percentChange: ((+d.Y2022 - +d.Y2010) / +d.Y2010 * 100) || 0,
        area: d.Area
    }));
    
    // Sort by 2022 value descending
    data.sort((a, b) => d3.descending(a.value2022, b.value2022));
    
    // Update scales
    const maxVal = d3.max(data, d => Math.max(d.value2010, d.value2022)) || 1;
    dumbbellXScale.domain([0, maxVal * 1.1]);
    dumbbellYScale.domain(data.map(d => d.shortName));
    
    // Update axes
    const xAxis = d3.axisBottom(dumbbellXScale).ticks(5);
    const yAxis = d3.axisLeft(dumbbellYScale);
    
    dumbbellXAxisG.call(xAxis);
    dumbbellYAxisG.call(yAxis);
    
    // ======================
    // DRAW DUMBBELL ELEMENTS
    // ======================
    
    // Bind data to row groups
    const rowsSelection = dumbbellG.selectAll(".dumbbell-row")
        .data(data, d => d.indicator);
    
    // Remove old
    rowsSelection.exit().remove();
    
    // Enter new rows
    const rowsEnter = rowsSelection.enter()
        .append("g")
        .attr("class", "dumbbell-row");
    
    // Add connecting line
    rowsEnter.append("line")
        .attr("class", "dumbbell-line");
    
    // Add 2010 dot
    rowsEnter.append("circle")
        .attr("class", "dumbbell-dot-2010");
    
    // Add 2022 dot
    rowsEnter.append("circle")
        .attr("class", "dumbbell-dot-2022");
    
    // Merge and update all elements
    const allRows = rowsEnter.merge(rowsSelection);
    
    // Update lines
    allRows.select(".dumbbell-line")
        .transition()
        .duration(300)
        .attr("x1", d => dumbbellXScale(d.value2010))
        .attr("x2", d => dumbbellXScale(d.value2022))
        .attr("y1", d => dumbbellYScale(d.shortName) + dumbbellYScale.bandwidth() / 2)
        .attr("y2", d => dumbbellYScale(d.shortName) + dumbbellYScale.bandwidth() / 2)
        .attr("stroke", d => getChangeColor(d.change))
        .attr("stroke-width", 3)
        .attr("opacity", 0.7);
    
    // Update 2010 dots
    allRows.select(".dumbbell-dot-2010")
        .transition()
        .duration(300)
        .attr("cx", d => dumbbellXScale(d.value2010))
        .attr("cy", d => dumbbellYScale(d.shortName) + dumbbellYScale.bandwidth() / 2)
        .attr("r", 6)
        .attr("fill", dot2010Color)
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5);
    
    // Update 2022 dots
    allRows.select(".dumbbell-dot-2022")
        .transition()
        .duration(300)
        .attr("cx", d => dumbbellXScale(d.value2022))
        .attr("cy", d => dumbbellYScale(d.shortName) + dumbbellYScale.bandwidth() / 2)
        .attr("r", 6)
        .attr("fill", d => getChangeColor(d.change))
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5);
    
    // Add click handlers
    allRows
        .style("cursor", "pointer")
        .on("click", (event, d) => {
            event.stopPropagation();
            handleDumbbellClick(d);
        });
    
    // Add tooltips
    allRows.selectAll("title").remove();
    allRows.append("title")
        .text(d => {
            const changeText = d.change >= 0 ? `+${d.change.toFixed(1)}` : d.change.toFixed(1);
            const pctText = d.percentChange >= 0 ? `+${d.percentChange.toFixed(1)}%` : `${d.percentChange.toFixed(1)}%`;
            return `${d.indicator}\n2010: ${d.value2010.toFixed(1)} ${d.unit}\n2022: ${d.value2022.toFixed(1)} ${d.unit}\nChange: ${changeText} (${pctText})`;
        });
    
    // Update titles
    d3.select("#dumbbell-title").text(`${group} Breakdown`);
    d3.select("#dumbbell-country").text(currentDumbbellCountry);
};

// ======================
// HELPER FUNCTIONS
// ======================

function getChangeColor(change) {
    if (change > 0.01) return increaseColor;
    if (change < -0.01) return decreaseColor;
    return neutralColor;
}

function shortenIndicatorName(name) {
    return name
        .replace(" supply", "")
        .replace(" (retinol activity equivalents)", " (RAE)")
        .replace(" (retinol equivalents)", " (RE)")
        .replace("Total ", "")
        .replace(" fatty acids", "")
        .replace("Eicosapentaenoic acid", "EPA")
        .replace("Docosahexaenoic acid", "DHA")
        .replace("Carbohydrate (available)", "Carbohydrates");
}

function handleDumbbellClick(d) {
    // Update bar and line charts with this specific nutrient
    if (typeof updateBarChart === "function") {
        updateBarChart(d.area, d.indicator);
    }
    if (typeof updateLineChart === "function") {
        updateLineChart(d.area, d.indicator);
    }
    
    // Highlight clicked row
    dumbbellG.selectAll(".dumbbell-row")
        .classed("selected", item => item.indicator === d.indicator);
    
    // Update scatter plot selection
    window.lastPointSelection = { area: d.area, indicator: d.indicator };
    
    // Highlight corresponding dot in scatter
    if (typeof highlightScatterPoint === "function") {
        highlightScatterPoint(d.area, d.indicator);
    }
}

// ======================
// HIDE DUMBBELL
// ======================

window.hideDumbbellChart = function() {
    d3.select("#dumbbell-container").style("display", "none");
    currentDumbbellGroup = null;
    dumbbellG.selectAll(".dumbbell-row").classed("selected", false);
};

// ======================
// SET INITIAL COUNTRY
// ======================

window.setDumbbellCountry = function(country) {
    currentDumbbellCountry = country;
};
