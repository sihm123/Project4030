// ======================
// LINE CHART SETUP
// ======================

const lineSVG = d3.select("#line-chart");
const lineWidth = 400;
const lineHeight = 260;
lineSVG.attr("viewBox", `0 0 ${lineWidth} ${lineHeight}`);

const lineMargin = { top: 20, right: 20, bottom: 40, left: 60 };
const lineInnerWidth = lineWidth - lineMargin.left - lineMargin.right;
const lineInnerHeight = lineHeight - lineMargin.top - lineMargin.bottom;

const lineG = lineSVG.append("g")
    .attr("transform", `translate(${lineMargin.left},${lineMargin.top})`);

const lineXAxisG = lineG.append("g")
    .attr("transform", `translate(0,${lineInnerHeight})`);
const lineYAxisG = lineG.append("g");

const lineXScale = d3.scalePoint()
    .range([0, lineInnerWidth])
    .padding(0.5);

const lineYScale = d3.scaleLinear()
    .range([lineInnerHeight, 0]);

const yearColumns = [
    "Y2010", "Y2011", "Y2012", "Y2013", "Y2014", "Y2015",
    "Y2016", "Y2017", "Y2018", "Y2019", "Y2020", "Y2021", "Y2022"
];

lineXScale.domain(yearColumns.map(d => d.slice(1))); // "2010", ...

const lineGen = d3.line()
    .x(d => lineXScale(d.year))
    .y(d => lineYScale(d.value));

const lineGroupColor = (window.colorScaleGroups
    ? window.colorScaleGroups
    : d3.scaleOrdinal().range(d3.schemeTableau10));

const lineNutrientGroups = window.nutrientGroups || {};

// ======================
// 1. PER-COUNTRY, PER-NUTRIENT LINE
// ======================

window.updateLineChart = function (area, indicator) {
    if (!window.nutritionData || !window.nutritionData.raw) return;

    const row = window.nutritionData.raw.find(d =>
        d.Area === area &&
        d.Indicator === indicator &&
        d["Food Group"] === "All food groups"
    );
    if (!row) return;

    const series = yearColumns.map(col => ({
        year: col.slice(1),
        value: +row[col]
    }));

    lineYScale.domain([0, d3.max(series, d => d.value) || 1]);

    const xAxis = d3.axisBottom(lineXScale)
        .tickValues(["2010", "2014", "2018", "2022"]);
    const yAxis = d3.axisLeft(lineYScale).ticks(4);

    lineXAxisG.call(xAxis);
    lineYAxisG.call(yAxis);

    const path = lineG.selectAll("path.country-line").data([series]);

    path.enter()
        .append("path")
        .attr("class", "country-line")
        .merge(path)
        .attr("fill", "none")
        .attr("stroke", "#f28e2b")
        .attr("stroke-width", 2)
        .attr("d", lineGen);

    path.exit().remove();

    const dots = lineG.selectAll("circle.country-dot").data(series);
    dots.enter()
        .append("circle")
        .attr("class", "country-dot")
        .merge(dots)
        .attr("r", 3)
        .attr("cx", d => lineXScale(d.year))
        .attr("cy", d => lineYScale(d.value))
        .attr("fill", "#f28e2b");
    dots.exit().remove();

    d3.select("#line-title").text("2010–2022 Trend (All Food Groups)");
    d3.select("#line-subtitle").text(`${indicator} — ${area}`);
};

// ======================
// 2. GROUP-LEVEL, ALL-COUNTRIES LINE
// ======================

window.updateLineChartGroup = function (group) {
    if (!window.nutritionData || !window.nutritionData.raw) return;

    const indicators = lineNutrientGroups[group];
    if (!indicators) return;

    const rows = window.nutritionData.raw.filter(d =>
        d["Food Group"] === "All food groups" &&
        indicators.includes(d.Indicator)
    );
    if (rows.length === 0) return;

    const series = yearColumns.map(col => {
        const vals = rows.map(r => +r[col]);
        const mean = d3.mean(vals);
        return { year: col.slice(1), value: mean };
    });

    lineYScale.domain([0, d3.max(series, d => d.value) || 1]);

    const xAxis = d3.axisBottom(lineXScale)
        .tickValues(["2010", "2014", "2018", "2022"]);
    const yAxis = d3.axisLeft(lineYScale).ticks(4);

    lineXAxisG.call(xAxis);
    lineYAxisG.call(yAxis);

    const path = lineG.selectAll("path.group-line").data([series]);

    path.enter()
        .append("path")
        .attr("class", "group-line")
        .merge(path)
        .attr("fill", "none")
        .attr("stroke", lineGroupColor(group))
        .attr("stroke-width", 2)
        .attr("d", lineGen);

    path.exit().remove();

    const dots = lineG.selectAll("circle.group-dot").data(series);
    dots.enter()
        .append("circle")
        .attr("class", "group-dot")
        .merge(dots)
        .attr("r", 3)
        .attr("cx", d => lineXScale(d.year))
        .attr("cy", d => lineYScale(d.value))
        .attr("fill", lineGroupColor(group));
    dots.exit().remove();

    d3.select("#line-title").text("Average 2010–2022 Trend (All Countries)");
    d3.select("#line-subtitle").text(group);
};
