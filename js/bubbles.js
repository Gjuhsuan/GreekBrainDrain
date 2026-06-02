/* ═══════════════════════════════════════════
   bubbles.js — Section 13: Country Impact Bubbles
   Greek Brain Drain · Data Visualization Project
   ═══════════════════════════════════════════ */

(function () {
  "use strict";

  var MARGIN = { top: 34, right: 132, bottom: 74, left: 76 };
  var SVG_W = 900, SVG_H = 500;

  function initBubbles() {
    Promise.all([
      loadData("cpp_by_country.json"),
      loadData("countries.json")
    ]).then(function (results) {
      renderBubbles(results[0], results[1]);
    }).catch(function (err) {
      console.warn("bubbles.js: data load failed —", err.message);
    });
  }
  observeSection("bubble-chart", initBubbles);

  function renderBubbles(cppData, countriesData) {
    var svg = d3.select("#bubble-svg");
    svg.selectAll("*").remove();

    var innerW = SVG_W - MARGIN.left - MARGIN.right;
    var innerH = SVG_H - MARGIN.top - MARGIN.bottom;

    // ── Merge data ──
    var countryMap = {};
    countriesData.forEach(function (d) {
      if (d.group === "abroad") {
        countryMap[d.code.toLowerCase()] = d;
      }
    });
    // Add Greece
    countriesData.forEach(function (d) {
      if (d.code === "grc") countryMap["gr"] = d;
    });

    var merged = cppData.map(function (d) {
      var info = countryMap[d.code.toLowerCase()] || countryMap["gr"] || {};
      return {
        code: d.code,
        name: d.name || info.name || d.code,
        scientists: info.count || d.scientists || 0,
        cpp: d.cpp_ns || 0,
        totalPapers: d.total_papers || 0,
        totalCites: d.total_cites_ns || 0,
      };
    }).filter(function (d) { return d.scientists > 0 && d.cpp > 0; });

    // ── Scales ──
    var maxScientists = d3.max(merged, function (d) { return d.scientists; });
    var xScale = d3.scaleLog()
      .domain([10, Math.max(10000, maxScientists * 1.18)])
      .range([0, innerW]);
    var xTickValues = [10, 100, 1000, 10000]
      .filter(function (d) {
        return d >= xScale.domain()[0] && d <= xScale.domain()[1];
      });

    var yScale = d3.scaleLinear()
      .domain([0, d3.max(merged, function (d) { return d.cpp; }) * 1.15])
      .range([innerH, 0]).nice();

    var rScale = d3.scaleSqrt()
      .domain([0, d3.max(merged, function (d) { return d.totalPapers; })])
      .range([4, 50]);

    var colorScale = d3.scaleOrdinal()
      .domain(merged.map(function (d) { return d.name; }))
      .range(d3.schemeTableau10);

    var g = svg.append("g")
      .attr("transform", "translate(" + MARGIN.left + "," + MARGIN.top + ")");

    // ── Grid ──
    g.append("g").selectAll("line")
      .data(yScale.ticks(5)).join("line")
      .attr("x1", 0).attr("x2", innerW)
      .attr("y1", function (d) { return yScale(d); })
      .attr("y2", function (d) { return yScale(d); })
      .attr("stroke", COLORS.grid).attr("stroke-width", 0.5);

    g.append("g").selectAll("line")
      .data(xTickValues).join("line")
      .attr("x1", function (d) { return xScale(d); })
      .attr("x2", function (d) { return xScale(d); })
      .attr("y1", 0).attr("y2", innerH)
      .attr("stroke", COLORS.grid).attr("stroke-width", 0.5);

    // ── Bubbles ──
    g.selectAll(".bubble")
      .data(merged)
      .join("circle")
      .attr("class", "bubble")
      .attr("cx", function (d) { return xScale(d.scientists); })
      .attr("cy", function (d) { return yScale(d.cpp); })
      .attr("r", 0)
      .attr("fill", function (d) {
        return d.code === "GR" || d.code === "GRC" ? COLORS.greece : colorScale(d.name);
      })
      .attr("opacity", 0.7)
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .on("mouseenter", function (event, d) {
        d3.select(this).attr("opacity", 1).attr("stroke-width", 2.5);
        showTooltip(
          "<strong>" + d.name + "</strong><br>" +
          "科学家: " + fmtNum(d.scientists) + "<br>" +
          "篇均引用: " + d.cpp.toFixed(1) + "<br>" +
          "总论文: " + fmtNum(d.totalPapers) + "<br>" +
          "总被引: " + fmtNum(d.totalCites)
        );
      })
      .on("mousemove", moveTooltip)
      .on("mouseleave", function () {
        d3.select(this).attr("opacity", 0.7).attr("stroke-width", 1.5);
        hideTooltip();
      })
      .transition()
      .duration(1200)
      .ease(d3.easeElasticOut.amplitude(0.5))
      .attr("r", function (d) { return rScale(d.totalPapers); });

    // ── Labels ──
    g.selectAll(".bubble-label")
      .data(merged.filter(function (d) { return d.scientists >= 100; }))
      .join("text")
      .attr("class", "bubble-label")
      .attr("x", function (d) { return xScale(d.scientists); })
      .attr("y", function (d) { return yScale(d.cpp) - rScale(d.totalPapers) - 6; })
      .attr("text-anchor", "middle")
      .attr("fill", COLORS.text)
      .attr("font-size", "10px")
      .attr("font-family", "Inter, sans-serif")
      .attr("font-weight", "500")
      .attr("pointer-events", "none")
      .text(function (d) { return d.name.length > 10 ? d.name.substring(0, 9) + "…" : d.name; });

    // ── Axes ──
    var xAxis = d3.axisBottom(xScale)
      .tickValues(xTickValues)
      .tickFormat(function (d) { return fmtNum(d); });
    g.append("g").attr("transform", "translate(0," + innerH + ")")
      .call(xAxis)
      .attr("font-size", "10px")
      .attr("font-family", "Inter, sans-serif")
      .attr("color", COLORS.textSecondary)
      .call(function (axisG) {
        axisG.selectAll("text")
          .attr("dy", "0.7em")
          .attr("transform", "rotate(-28)")
          .attr("text-anchor", "end");
      });

    var yAxis = d3.axisLeft(yScale).ticks(5);
    g.append("g").call(yAxis)
      .attr("font-size", "10px").attr("font-family", "Inter, sans-serif")
      .attr("color", COLORS.textSecondary);

    // ── Axis labels ──
    svg.append("text")
      .attr("x", MARGIN.left + innerW / 2).attr("y", SVG_H - 6)
      .attr("text-anchor", "middle")
      .attr("fill", COLORS.textSecondary).attr("font-size", "10px")
      .attr("font-family", "Inter, sans-serif")
      .text("希腊科学家数量（对数尺度）");

    svg.append("text")
      .attr("x", 12).attr("y", MARGIN.top + innerH / 2)
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90,12," + (MARGIN.top + innerH / 2) + ")")
      .attr("fill", COLORS.textSecondary).attr("font-size", "10px")
      .attr("font-family", "Inter, sans-serif")
      .text("篇均引用（排除自引）");

    // ── Legend ──
    svg.append("text")
      .attr("x", MARGIN.left).attr("y", 16)
      .attr("fill", COLORS.textSecondary).attr("font-size", "10px")
      .attr("font-family", "Inter, sans-serif")
      .text("气泡大小 = 总论文产出 · 颜色区分国家 · 悬停查看详情");
  }
})();
