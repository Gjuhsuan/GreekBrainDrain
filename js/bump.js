/* ═══════════════════════════════════════════
   bump.js — Section 11: Bump Chart (Fields × Percentiles)
   Greek Brain Drain · Data Visualization Project
   ═══════════════════════════════════════════ */

(function () {
  "use strict";

  var MARGIN = { top: 30, right: 160, bottom: 30, left: 60 };
  var SVG_W = 960, SVG_H = 520;

  function initBump() {
    loadData("percentile_by_field.json").then(function (data) {
      renderBump(data);
    }).catch(function (err) {
      console.warn("bump.js: data load failed —", err.message);
    });
  }
  observeSection("bump-chart", initBump);

  function renderBump(raw) {
    var svg = d3.select("#bump-svg");
    svg.selectAll("*").remove();

    var innerW = SVG_W - MARGIN.left - MARGIN.right;
    var innerH = SVG_H - MARGIN.top - MARGIN.bottom;

    // ── Process data ──
    var tiers = ["前 50%", "前 20%", "前 10%", "前 5%", "前 2%", "前 1%", "前 0.5%", "前 0.1%"];

    // Group by field, compute abroad% per tier
    var byField = {};
    raw.forEach(function (d) {
      if (!byField[d.field]) byField[d.field] = {};
      byField[d.field][d.tier] = d.greece + d.abroad > 0
        ? (d.abroad / (d.greece + d.abroad) * 100)
        : null;
    });

    // Select fields with enough data (at least 5 tiers with at least 5 people)
    var fields = Object.keys(byField).filter(function (f) {
      var vals = tiers.filter(function (t) { return byField[f][t] != null && byField[f][t] > 0; });
      return vals.length >= 5;
    }).sort(function (a, b) {
      // Sort by last tier abroad%
      var aVal = byField[a][tiers[tiers.length - 1]] || 0;
      var bVal = byField[b][tiers[tiers.length - 1]] || 0;
      return bVal - aVal;
    });

    // ── Scales ──
    var xScale = d3.scalePoint()
      .domain(tiers).range([0, innerW]).padding(0.3);

    var allVals = [];
    fields.forEach(function (f) {
      tiers.forEach(function (t) {
        if (byField[f][t] != null) allVals.push(byField[f][t]);
      });
    });
    var yExtent = d3.extent(allVals);

    var yScale = d3.scaleLinear()
      .domain([Math.max(0, yExtent[0] - 10), Math.min(100, yExtent[1] + 10)])
      .range([innerH, 0]);

    var colorScale = d3.scaleOrdinal(d3.schemeTableau10).domain(fields);

    var g = svg.append("g")
      .attr("transform", "translate(" + MARGIN.left + "," + MARGIN.top + ")");

    // ── Grid ──
    g.append("g").selectAll("line")
      .data(yScale.ticks(6))
      .join("line")
      .attr("x1", 0).attr("x2", innerW)
      .attr("y1", function (d) { return yScale(d); })
      .attr("y2", function (d) { return yScale(d); })
      .attr("stroke", COLORS.grid).attr("stroke-width", 0.5)
      .attr("stroke-dasharray", "3,3");

    // ── Lines ──
    var line = d3.line()
      .defined(function (d) { return d[1] != null; })
      .x(function (d) { return xScale(d[0]); })
      .y(function (d) { return yScale(d[1]); })
      .curve(d3.curveMonotoneX);

    fields.forEach(function (f) {
      var pts = tiers.map(function (t) { return [t, byField[f][t]]; });
      g.append("path")
        .datum(pts)
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke", colorScale(f))
        .attr("stroke-width", 2.5)
        .attr("opacity", 0.7)
        .on("mouseenter", function () {
          d3.select(this).attr("opacity", 1).attr("stroke-width", 4);
        })
        .on("mouseleave", function () {
          d3.select(this).attr("opacity", 0.7).attr("stroke-width", 2.5);
        });
    });

    // ── 50% reference line ──
    g.append("line")
      .attr("x1", 0).attr("x2", innerW)
      .attr("y1", yScale(50)).attr("y2", yScale(50))
      .attr("stroke", COLORS.textLight).attr("stroke-width", 1)
      .attr("stroke-dasharray", "6,3");
    g.append("text")
      .attr("x", innerW + 6).attr("y", yScale(50) + 4)
      .attr("fill", COLORS.textLight).attr("font-size", "10px")
      .attr("font-family", "Inter, sans-serif")
      .text("50%");

    // ── Y axis ──
    g.append("g")
      .attr("transform", "translate(-8,0)")
      .call(d3.axisLeft(yScale).ticks(5).tickFormat(function (d) { return d + "%"; }))
      .attr("font-size", "10px").attr("font-family", "Inter, sans-serif")
      .attr("color", COLORS.textSecondary);

    // ── Labels at right ──
    fields.forEach(function (f) {
      var lastPt = null;
      for (var i = tiers.length - 1; i >= 0; i--) {
        if (byField[f][tiers[i]] != null) {
          lastPt = [tiers[i], byField[f][tiers[i]]];
          break;
        }
      }
      if (!lastPt) return;
      g.append("text")
        .attr("x", xScale(lastPt[0]) + 10)
        .attr("y", yScale(lastPt[1]) + 4)
        .attr("fill", colorScale(f))
        .attr("font-size", "10px")
        .attr("font-family", "Inter, sans-serif")
        .attr("font-weight", "500")
        .text(f.length > 12 ? f.substring(0, 11) + "…" : f);
    });

    // ── Title ──
    svg.append("text")
      .attr("x", SVG_W / 2).attr("y", 16)
      .attr("text-anchor", "middle")
      .attr("fill", COLORS.textSecondary)
      .attr("font-size", "11px")
      .attr("font-family", "Inter, sans-serif")
      .text("百分位层级越高，海外占比越大——各学科的人才流失走势");
  }
})();
