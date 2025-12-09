// ======================
// BAR CHART SETUP
// ======================

const barSVG = d3.select("#bar-chart");
const barWidth = 380;
const barHeight = 220;
barSVG.attr("viewBox", `0 0 ${barWidth} ${barHeight}`);

const barMargin = { top: 15, right: 15, bottom: 30, left: 140 };
const barInnerWidth = barWidth - barMargin.left - barMargin.right;
const barInnerHeight = barHeight - barMargin.top - barMargin.bottom;

const barG = barSVG.append("g")
    .attr("transform", `translate(${barMargin.left},${barMargin.top})`);

const barXAxisG = barG.append("g")
    .attr("transform", `translate(0,${barInnerHeight})`);
const barYAxisG = barG.append("g");

const barXScale = d3.scaleLinear().range([0, barInnerWidth]);
const barYScale = d3.scaleBand().range([0, barInnerHeight]).padding(0.15);

// local copy of groups for group-level bar
const barNutrientGroups = window.nutrientGroups || {};

// color for group-level bars
const barGroupNames = window.groupNames || [];
const barColorScale = (window.colorScaleGroups
    ? window.colorScaleGroups
    : d3.scaleOrdinal().domain(barGroupNames).range(d3.schemeTableau10));

// ======================
// 1. PER-COUNTRY, PER-NUTRIENT BAR
// ======================

window.updateBarChart = function (area, indicator) {
    if (!window.nutritionData || !window.nutritionData.raw) return;

    const rows = window.nutritionData.raw.filter(d =>
        d.Area === area &&
        d.Indicator === indicator &&
        d["Food Group"] !== "All food groups"
    );

    rows.forEach(d => d.value2022 = +d.Y2022);
    rows.sort((a, b) => d3.descending(a.value2022, b.value2022));

    barXScale.domain([0, d3.max(rows, d => d.value2022) || 1]);
    barYScale.domain(rows.map(d => d["Food Group"]));

    const xAxis = d3.axisBottom(barXScale).ticks(4);
    const yAxis = d3.axisLeft(barYScale);

    barXAxisG.call(xAxis);
    barYAxisG.call(yAxis);

    const bars = barG.selectAll("rect").data(rows, d => d["Food Group"]);

    bars.enter()
        .append("rect")
        .merge(bars)
        .attr("x", 0)
        .attr("y", d => barYScale(d["Food Group"]))
        .attr("height", barYScale.bandwidth())
        .attr("width", d => barXScale(d.value2022))
        .attr("fill", "#4e79a7");

    bars.exit().remove();

    d3.select("#bar-title").text("2022 Supply by Food Group");
    d3.select("#bar-subtitle").text(`${indicator} — ${area}`);
};

// ======================
// 2. GROUP-LEVEL, ALL-COUNTRIES BAR
// ======================

window.updateBarChartGroup = function (group) {
    if (!window.nutritionData || !window.nutritionData.raw) return;

    const indicators = barNutrientGroups[group];
    if (!indicators) return;

    const rows = window.nutritionData.raw.filter(d =>
        d["Food Group"] === "All food groups" &&
        indicators.includes(d.Indicator)
    );

    // average 2022 across all countries for each indicator
    const aggregated = d3.rollups(
        rows,
        v => d3.mean(v, x => +x.Y2022),
        d => d.Indicator
    ).map(([indicator, value]) => ({ indicator, value }));

    aggregated.sort((a, b) => d3.descending(a.value, b.value));

    barXScale.domain([0, d3.max(aggregated, d => d.value) || 1]);
    barYScale.domain(aggregated.map(d => d.indicator));

    const xAxis = d3.axisBottom(barXScale).ticks(4);
    const yAxis = d3.axisLeft(barYScale);

    barXAxisG.call(xAxis);
    barYAxisG.call(yAxis);

    const bars = barG.selectAll("rect").data(aggregated, d => d.indicator);

    bars.enter()
        .append("rect")
        .merge(bars)
        .attr("x", 0)
        .attr("y", d => barYScale(d.indicator))
        .attr("height", barYScale.bandwidth())
        .attr("width", d => barXScale(d.value))
        .attr("fill", barColorScale(group));

    bars.exit().remove();

    d3.select("#bar-title").text("Average 2022 Supply by Nutrient (All Countries)");
    d3.select("#bar-subtitle").text(group);
};
