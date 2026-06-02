/* ═══════════════════════════════════════════
   role.js — Section 8: Author Role Comparison (Dumbbell Chart)
   Greek Brain Drain · Data Visualization Project
   ═══════════════════════════════════════════ */

(function () {
  "use strict";

  var MARGIN = { top: 62, right: 80, bottom: 30, left: 130 };
  var SVG_W = 720;
  var SVG_H = 360;
  var ROW_H = 55;

  function initRole() {
    loadData("new/role_data.json").then(function (data) {
      renderRole(data);
    }).catch(function (err) {
      console.warn("role.js: data load failed —", err.message);
    });
  }
  observeSection("author-roles", initRole);

  function renderRole(data) {
    var svg = d3.select("#role-svg");
    svg.selectAll("*").remove();

    var innerW = SVG_W - MARGIN.left - MARGIN.right;
    var innerH = SVG_H - MARGIN.top - MARGIN.bottom;

    var categories = [
      { key: "first_pct", label: "第一作者" },
      { key: "last_pct", label: "末位作者（PI）" },
      { key: "corresponding_pct", label: "通讯作者" },
      { key: "middle_pct", label: "中间作者" },
    ];

    var yScale = d3.scalePoint()
      .domain(categories.map(function (d) { return d.label; }))
      .range([0, innerH])
      .padding(0.6);

    var maxPct = Math.max(
      d3.max(categories, function (d) { return Math.max(data.greece[d.key], data.abroad[d.key]); }),
      30
    );
    var xScale = d3.scaleLinear()
      .domain([0, maxPct * 1.1])
      .range([0, innerW])
      .nice();

    function valuesAreClose(d) {
      return Math.abs(xScale(data.greece[d.key]) - xScale(data.abroad[d.key])) < 105;
    }

    var g = svg.append("g")
      .attr("transform", "translate(" + MARGIN.left + "," + MARGIN.top + ")");

    // ── Grid lines ──
    g.append("g").attr("class", "grid")
      .selectAll("line")
      .data(xScale.ticks(5))
      .join("line")
      .attr("x1", function (d) { return xScale(d); })
      .attr("x2", function (d) { return xScale(d); })
      .attr("y1", -10)
      .attr("y2", innerH + 10)
      .attr("stroke", "#C8D0DA")
      .attr("stroke-width", 0.8)
      .attr("stroke-dasharray", "3,3");

    // ── Row for each category ──
    var rows = g.selectAll(".role-dumbbell-row")
      .data(categories)
      .join("g")
      .attr("class", "role-dumbbell-row")
      .attr("transform", function (d) { return "translate(0," + yScale(d.label) + ")"; });

    // Connecting line (dumbbell bar)
    rows.append("line")
      .attr("class", "role-connector")
      .attr("x1", function (d) { return xScale(data.greece[d.key]); })
      .attr("x2", function (d) { return xScale(data.abroad[d.key]); })
      .attr("y1", 0)
      .attr("y2", 0)
      .attr("stroke", "#7F8791")
      .attr("stroke-width", 2.5)
      .attr("stroke-dasharray", "4,2")
      .attr("opacity", 0.78);

    // Greece dot
    rows.append("circle")
      .attr("class", "role-dot-gr")
      .attr("cx", function (d) { return xScale(data.greece[d.key]); })
      .attr("cy", 0)
      .attr("r", 11)
      .attr("fill", COLORS.greece)
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .attr("filter", "drop-shadow(0 2px 3px rgba(0,0,0,0.2))")
      .on("mouseenter", function (event, d) {
        d3.select(this).attr("r", 14);
        showTooltip("希腊本土<br><strong>" + d.label + ":</strong> " + data.greece[d.key] + "%");
      })
      .on("mousemove", moveTooltip)
      .on("mouseleave", function () {
        d3.select(this).attr("r", 11);
        hideTooltip();
      });

    // Abroad dot
    rows.append("circle")
      .attr("class", "role-dot-ab")
      .attr("cx", function (d) { return xScale(data.abroad[d.key]); })
      .attr("cy", 0)
      .attr("r", 11)
      .attr("fill", COLORS.abroad)
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .attr("filter", "drop-shadow(0 2px 3px rgba(0,0,0,0.2))")
      .on("mouseenter", function (event, d) {
        d3.select(this).attr("r", 14);
        showTooltip("海外<br><strong>" + d.label + ":</strong> " + data.abroad[d.key] + "%");
      })
      .on("mousemove", moveTooltip)
      .on("mouseleave", function () {
        d3.select(this).attr("r", 11);
        hideTooltip();
      });

    // Value labels next to dots
    // Greece values (left)
    rows.append("text")
      .attr("x", function (d) { return xScale(data.greece[d.key]) - 16; })
      .attr("y", function (d) { return valuesAreClose(d) ? -22 : -18; })
      .attr("text-anchor", "end")
      .attr("fill", COLORS.greece)
      .attr("font-size", "11px")
      .attr("font-family", "Inter, sans-serif")
      .attr("font-weight", "700")
      .text(function (d) { return data.greece[d.key] + "%"; });

    // Abroad values (right)
    rows.append("text")
      .attr("x", function (d) { return xScale(data.abroad[d.key]) + 16; })
      .attr("y", function (d) { return valuesAreClose(d) ? 25 : -18; })
      .attr("text-anchor", "start")
      .attr("fill", COLORS.abroad)
      .attr("font-size", "11px")
      .attr("font-family", "Inter, sans-serif")
      .attr("font-weight", "700")
      .text(function (d) { return data.abroad[d.key] + "%"; });

    // Category labels (left side)
    rows.append("text")
      .attr("x", -12)
      .attr("y", 4)
      .attr("text-anchor", "end")
      .attr("fill", COLORS.text)
      .attr("font-size", "12px")
      .attr("font-family", "Inter, sans-serif")
      .attr("font-weight", "500")
      .text(function (d) { return d.label; });

    // ── X axis ──
    var xAxis = d3.axisTop(xScale).ticks(5).tickFormat(function (d) { return d + "%"; });
    g.append("g").call(xAxis)
      .attr("font-family", "Inter, sans-serif")
      .attr("font-size", "10px")
      .attr("color", COLORS.textSecondary);

    // ── Legend ──
    var legend = svg.append("g")
      .attr("transform", "translate(" + MARGIN.left + ", 16)");
    legend.append("circle").attr("cx", 5).attr("cy", 5).attr("r", 5).attr("fill", COLORS.greece);
    legend.append("text").attr("x", 16).attr("y", 9)
      .text("希腊本土").attr("font-family", "Inter, sans-serif").attr("font-size", "11px").attr("fill", COLORS.text);
    legend.append("circle").attr("cx", 110).attr("cy", 5).attr("r", 5).attr("fill", COLORS.abroad);
    legend.append("text").attr("x", 121).attr("y", 9)
      .text("海外").attr("font-family", "Inter, sans-serif").attr("font-size", "11px").attr("fill", COLORS.text);

    // ── Subtitle ──
    svg.append("text")
      .attr("x", SVG_W / 2)
      .attr("y", SVG_H - 6)
      .attr("text-anchor", "middle")
      .attr("fill", COLORS.textLight)
      .attr("font-size", "9px")
      .attr("font-family", "Inter, sans-serif")
      .text("希腊本土 " + fmtNum(data.greece.total) + " 次参与 · 海外 " + fmtNum(data.abroad.total) + " 次参与（含非希腊籍合作者）");
  }
})();
