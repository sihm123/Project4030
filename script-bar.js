// script-bar.js 
console.log("script-bar.js loaded");

// ----------------------
// 1. SVG + layout
// ----------------------
const barSvg = d3.select("#barchart");
const barWidth = +barSvg.attr("width");
const barHeight = +barSvg.attr("height");

const barMargin = { top: 40, right: 40, bottom: 80, left: 80 };
const barInnerWidth = barWidth - barMargin.left - barMargin.right;
const barInnerHeight = barHeight - barMargin.top - barMargin.bottom;

const barG = barSvg.append("g")
    .attr("transform", `translate(${barMargin.left},${barMargin.top})`);

const barCountrySelect = document.getElementById("barCountry");

const xBar = d3.scaleBand().range([0, barInnerWidth]).padding(0.2);
const yBar = d3.scaleLinear().range([barInnerHeight, 0]);

const xBarAxisG = barG.append("g")
    .attr("transform", `translate(0,${barInnerHeight})`);
const yBarAxisG = barG.append("g");

barG.append("text")
    .attr("class", "x-label")
    .attr("x", barInnerWidth / 2)
    .attr("y", barInnerHeight + 50)
    .attr("text-anchor", "middle")
    .text("Food Group");

barG.append("text")
    .attr("class", "y-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -barInnerHeight / 2)
    .attr("y", -60)
    .attr("text-anchor", "middle")
    .text("Protein Supply (2022)");

let barDataAll = [];

// ----------------------
// 2. Load FoodSupply.csv
// ----------------------
d3.csv("./FoodSupply.csv").then(data => {
    data.forEach(d => {
        d.country    = d["Area"];
        d.food_group = d["Food Group"];
        d.indicator  = d["Indicator"];
        d.value2022  = d["Y2022"] === "" ? null : +d["Y2022"];
    });

    barDataAll = data;

    // Log unique indicators so we can see the exact strings
    const indicators = Array.from(new Set(barDataAll.map(d => d.indicator))).sort();
    console.log("Unique Indicator values:", indicators);

    // For now, just grab rows where indicator CONTAINS "protein" (case-insensitive)
    const proteinRows = barDataAll.filter(d =>
        d.indicator &&
        d.indicator.toLowerCase().includes("protein") &&
        d.value2022 !== null
    );

    console.log("Protein rows count:", proteinRows.length);

    // Populate country dropdown from these protein rows
    const countries = Array.from(new Set(proteinRows.map(d => d.country))).sort();
    countries.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c;
        opt.textContent = c;
        barCountrySelect.appendChild(opt);
    });

    if (countries.length > 0) {
        barCountrySelect.value = countries[0];
    }

    barCountrySelect.addEventListener("change", () => updateBar(proteinRows));
    updateBar(proteinRows);
}).catch(err => {
    console.error("Error loading CSV for bar chart:", err);
});

// ----------------------
// 3. Update bar chart
// ----------------------
function updateBar(proteinRows) {
    const country = barCountrySelect.value;
    if (!country) return;

    // subset: this country, any food group, just protein-type indicators
    const subset = proteinRows.filter(d =>
        d.country === country &&
        d.value2022 !== null
    );

    console.log("Subset for country", country, "size:", subset.length);

    if (subset.length === 0) {
        xBar.domain([]);
        yBar.domain([0, 1]);
        xBarAxisG.call(d3.axisBottom(xBar));
        yBarAxisG.call(d3.axisLeft(yBar));
        barG.selectAll("rect.bar").remove();
        return;
    }

    // x domain: food groups
    xBar.domain(subset.map(d => d.food_group));

    // y domain
    const maxVal = d3.max(subset, d => d.value2022);
    yBar.domain([0, maxVal * 1.1]);

    xBarAxisG.call(d3.axisBottom(xBar))
        .selectAll("text")
        .attr("transform", "rotate(-40)")
        .style("text-anchor", "end");

    yBarAxisG.call(d3.axisLeft(yBar));

    const bars = barG.selectAll("rect.bar")
        .data(subset, d => d.food_group + d.indicator);

    bars.exit().remove();

    const barsEnter = bars.enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => xBar(d.food_group))
        .attr("width", xBar.bandwidth())
        .attr("y", barInnerHeight)
        .attr("height", 0)
        .attr("fill", "#2ca02c");

    barsEnter.merge(bars)
        .transition()
        .duration(600)
        .attr("x", d => xBar(d.food_group))
        .attr("width", xBar.bandwidth())
        .attr("y", d => yBar(d.value2022))
        .attr("height", d => barInnerHeight - yBar(d.value2022));

    const allBars = barG.selectAll("rect.bar");
    allBars.select("title").remove();
    allBars.append("title")
        .text(d => `${country}\n${d.food_group}\n${d.indicator}\n2022: ${d.value2022}`);
}
