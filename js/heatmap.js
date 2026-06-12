/* ═══════════════════════════════════════════
   heatmap.js — Percentile stacked bar chart
   Multi-metric: c_ns | cpp_ns | h19_ns
   First load: animate from 0. Switches: smooth transition.
   Greek Brain Drain · Data Visualization Project
   ═══════════════════════════════════════════ */

(function () {
  "use strict";

  var currentMetric = "c_ns";
  var allPercentileData = null;
  var initialized = false;

  /* ── Shared layout constants ── */
  var vbW = 960, vbH = 370;
  var margin = { top: 24, right: 60, bottom: 38, left: 90 };
  var innerW = vbW - margin.left - margin.right;
  var innerH = vbH - margin.top - margin.bottom;
  var x = d3.scaleLinear().domain([0, 100]).range([0, innerW]);

  function renderBars(metricKey) {
    var svg = d3.select("#percentile-bar-svg");
    if (svg.empty() || !allPercentileData) return;

    var data = allPercentileData[metricKey];
    if (!data) return;

    var tiers = data.map(function (d) { return d.tier; });
    var y = d3.scaleBand().domain(tiers).range([0, innerH]).padding(0.18);

    if (!initialized) {
      /* ── FIRST RENDER: build everything, animate from 0 ── */
      svg.attr("viewBox", "0 0 " + vbW + " " + vbH);

      var g = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      /* 50% dashed line */
      g.append("line").attr("class", "pct-line")
        .attr("x1", x(50)).attr("x2", x(50)).attr("y1", 0).attr("y2", innerH)
        .attr("stroke", "#bbb").attr("stroke-width", 1).attr("stroke-dasharray", "4 3");

      /* Tier groups */
      var bars = g.selectAll(".pbar").data(data).enter().append("g")
        .attr("class", "pbar");

      /* Tier label */
      bars.append("text").attr("class", "pbar-label")
        .attr("x", -8).attr("y", function (d) { return y(d.tier) + y.bandwidth() / 2; })
        .attr("text-anchor", "end").attr("dominant-baseline", "central")
        .attr("fill", COLORS.text).attr("font-size", "13px")
        .attr("font-family", "Inter, sans-serif").attr("font-weight", "600")
        .text(function (d) { return d.tier; });

      /* Greece rect */
      bars.append("rect").attr("class", "greece-rect")
        .attr("x", 0).attr("y", function (d) { return y(d.tier); })
        .attr("width", 0).attr("height", y.bandwidth())
        .attr("fill", COLORS.greece).attr("rx", 2)
        .transition().duration(800).delay(function (d, i) { return i * 80; })
        .attr("width", function (d) { return x(d.greece / d.total * 100); });

      /* Abroad rect */
      bars.append("rect").attr("class", "abroad-rect")
        .attr("x", 0).attr("y", function (d) { return y(d.tier); })
        .attr("width", 0).attr("height", y.bandwidth())
        .attr("fill", COLORS.abroad).attr("rx", 2)
        .transition().duration(800).delay(function (d, i) { return i * 80; })
        .attr("x", function (d) { return x(d.greece / d.total * 100); })
        .attr("width", function (d) { return x(d.abroad / d.total * 100); });

      /* Greece % label */
      bars.append("text").attr("class", "greece-pct")
        .attr("y", function (d) { return y(d.tier) + y.bandwidth() / 2; })
        .attr("dominant-baseline", "central")
        .attr("font-size", "12px").attr("font-family", "Inter, sans-serif").attr("font-weight", "700")
        .attr("opacity", 0)
        .transition().duration(800).delay(function (d, i) { return i * 80; })
        .attr("opacity", 1)
        .attr("x", function (d) { var w = x(d.greece / d.total * 100); return w > 30 ? w / 2 : w + 4; })
        .attr("text-anchor", function (d) { return x(d.greece / d.total * 100) > 30 ? "middle" : "start"; })
        .attr("fill", function (d) { return x(d.greece / d.total * 100) > 30 ? "#fff" : COLORS.greece; })
        .text(function (d) { var p = d.greece / d.total * 100; return p >= 6 ? fmtPct(p, 0) : ""; });

      /* Abroad % label */
      bars.append("text").attr("class", "abroad-pct")
        .attr("y", function (d) { return y(d.tier) + y.bandwidth() / 2; })
        .attr("dominant-baseline", "central")
        .attr("font-size", "12px").attr("font-family", "Inter, sans-serif").attr("font-weight", "700")
        .attr("opacity", 0)
        .transition().duration(800).delay(function (d, i) { return i * 80; })
        .attr("opacity", 1)
        .attr("x", function (d) { var left = x(d.greece / d.total * 100); var w = x(d.abroad / d.total * 100); return w > 30 ? left + w / 2 : left + w + 4; })
        .attr("text-anchor", function (d) { return x(d.abroad / d.total * 100) > 30 ? "middle" : "start"; })
        .attr("fill", function (d) { return x(d.abroad / d.total * 100) > 30 ? "#fff" : COLORS.abroad; })
        .text(function (d) { var p = d.abroad / d.total * 100; return p >= 6 ? fmtPct(p, 0) : ""; });

      /* Hover zones */
      bars.append("rect").attr("class", "pbar-hover")
        .attr("x", 0).attr("y", function (d) { return y(d.tier); })
        .attr("width", innerW).attr("height", y.bandwidth())
        .attr("fill", "transparent")
        .on("mouseenter", function (event, d) {
          var gp = d.greece / d.total * 100, ap = d.abroad / d.total * 100;
          showTooltip(
            "<div style='font-weight:700;margin-bottom:4px;'>" + d.tier + "</div>" +
            "<div style='color:" + COLORS.greece + ";'>希腊本土：" + fmtNum(d.greece) + " 人（" + fmtPct(gp, 1) + "）</div>" +
            "<div style='color:" + COLORS.abroad + ";'>海外：" + fmtNum(d.abroad) + " 人（" + fmtPct(ap, 1) + "）</div>" +
            "<div style='color:#999;margin-top:2px;'>合计：" + fmtNum(d.total) + " 人</div>"
          );
          moveTooltip(event);
        })
        .on("mousemove", function (event) { moveTooltip(event); })
        .on("mouseleave", function () { hideTooltip(); });

      /* X axis ticks */
      var tickG = g.append("g").attr("class", "x-ticks");
      [0, 25, 50, 75, 100].forEach(function (t) {
        tickG.append("text")
          .attr("x", x(t)).attr("y", innerH + 16)
          .attr("text-anchor", "middle")
          .attr("fill", COLORS.textLight).attr("font-size", "11px")
          .attr("font-family", "Inter, sans-serif").text(t + "%");
      });

      /* Legend */
      var ly = innerH + 28;
      var legendG = g.append("g").attr("class", "legend-g");
      legendG.append("rect").attr("x", 0).attr("y", ly).attr("width", 10).attr("height", 10).attr("fill", COLORS.greece).attr("rx", 2);
      legendG.append("text").attr("x", 14).attr("y", ly + 9).attr("fill", COLORS.textSecondary).attr("font-size", "13px").attr("font-family", "Inter, sans-serif").text("希腊");
      legendG.append("rect").attr("x", 72).attr("y", ly).attr("width", 12).attr("height", 12).attr("fill", COLORS.abroad).attr("rx", 2);
      legendG.append("text").attr("x", 88).attr("y", ly + 9).attr("fill", COLORS.textSecondary).attr("font-size", "13px").attr("font-family", "Inter, sans-serif").text("海外");
      // Center the legend
      var legendW = 120;
      legendG.attr("transform", "translate(" + ((innerW - legendW) / 2) + ",0)");

      initialized = true;

    } else {
      /* ── SUBSEQUENT SWITCHES: smooth transition from current state ── */

      // Rebind data and transition bars
      var bars = d3.select("#percentile-bar-svg g")
        .selectAll(".pbar")
        .data(data);

      // Greece rect: transition width
      bars.select(".greece-rect")
        .transition().duration(600).delay(function (d, i) { return i * 30; })
        .attr("width", function (d) { return x(d.greece / d.total * 100); });

      // Abroad rect: transition x + width
      bars.select(".abroad-rect")
        .transition().duration(600).delay(function (d, i) { return i * 30; })
        .attr("x", function (d) { return x(d.greece / d.total * 100); })
        .attr("width", function (d) { return x(d.abroad / d.total * 100); });

      // Greece % label
      bars.select(".greece-pct")
        .transition().duration(600).delay(function (d, i) { return i * 30; })
        .attr("x", function (d) { var w = x(d.greece / d.total * 100); return w > 30 ? w / 2 : w + 4; })
        .attr("text-anchor", function (d) { return x(d.greece / d.total * 100) > 30 ? "middle" : "start"; })
        .attr("fill", function (d) { return x(d.greece / d.total * 100) > 30 ? "#fff" : COLORS.greece; })
        .text(function (d) { var p = d.greece / d.total * 100; return p >= 6 ? fmtPct(p, 0) : ""; });

      // Abroad % label
      bars.select(".abroad-pct")
        .transition().duration(600).delay(function (d, i) { return i * 30; })
        .attr("x", function (d) { var left = x(d.greece / d.total * 100); var w = x(d.abroad / d.total * 100); return w > 30 ? left + w / 2 : left + w + 4; })
        .attr("text-anchor", function (d) { return x(d.abroad / d.total * 100) > 30 ? "middle" : "start"; })
        .attr("fill", function (d) { return x(d.abroad / d.total * 100) > 30 ? "#fff" : COLORS.abroad; })
        .text(function (d) { var p = d.abroad / d.total * 100; return p >= 6 ? fmtPct(p, 0) : ""; });
    }

    /* Update button states */
    d3.selectAll("#percentile-metric-btns .metric-btn")
      .classed("active", function () { return d3.select(this).attr("data-metric") === metricKey; });
  }

  function setupMetricButtons() {
    d3.selectAll("#percentile-metric-btns .metric-btn").on("click", function () {
      currentMetric = d3.select(this).attr("data-metric");
      renderBars(currentMetric);
    });
  }

  function initPercentileBars() {
    var svg = d3.select("#percentile-bar-svg");
    if (svg.empty()) return;

    loadData("percentiles.json").then(function (data) {
      allPercentileData = data;
      setupMetricButtons();
      renderBars(currentMetric);
    });
  }

  setTimeout(initPercentileBars, 300);
})();
