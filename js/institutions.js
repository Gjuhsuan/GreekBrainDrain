/* ═══════════════════════════════════════════
   institutions.js — Section 9: Institution Brain Drain (Lollipop Chart)
   Greek Brain Drain · Data Visualization Project
   ═══════════════════════════════════════════ */

(function () {
  "use strict";

  var MARGIN = { top: 30, right: 120, bottom: 20, left: 60 };
  var ROW_HEIGHT = 28;
  var SVG_W = 900;

  function initInstitutions() {
    loadData("new/institution_ranking.json").then(function (data) {
      renderInstitutions(data);
    }).catch(function (err) {
      console.warn("institutions.js: data load failed —", err.message);
    });
  }
  observeSection("institution-ranking", initInstitutions);

  function renderInstitutions(data) {
    // Deduplicate by drain_rate + total_authors (some institutions may appear twice)
    var seen = {};
    var unique = [];
    data.forEach(function (d) {
      var key = d.drain_rate + "|" + d.total_authors;
      if (!seen[key]) {
        seen[key] = true;
        unique.push(d);
      }
    });
    var sorted = unique.slice(0, 20).sort(function (a, b) { return b.drain_rate - a.drain_rate; });

    var svg = d3.select("#institution-svg");
    svg.selectAll("*").remove();

    var totalH = MARGIN.top + sorted.length * ROW_HEIGHT + MARGIN.bottom;
    svg.attr("viewBox", "0 0 " + SVG_W + " " + totalH);
    svg.attr("preserveAspectRatio", "xMidYMin meet");

    var innerW = SVG_W - MARGIN.left - MARGIN.right;
    var maxRate = d3.max(sorted, function (d) { return d.drain_rate; });

    var xScale = d3.scaleLinear()
      .domain([0, Math.max(maxRate + 5, 100)])
      .range([0, innerW]);

    var g = svg.append("g")
      .attr("transform", "translate(" + MARGIN.left + "," + MARGIN.top + ")");

    // ── Grid ──
    g.selectAll(".grid-line")
      .data(xScale.ticks(5))
      .join("line")
      .attr("x1", function (d) { return xScale(d); })
      .attr("x2", function (d) { return xScale(d); })
      .attr("y1", -5)
      .attr("y2", sorted.length * ROW_HEIGHT + 5)
      .attr("stroke", COLORS.grid)
      .attr("stroke-width", 0.5)
      .attr("stroke-dasharray", "3,3");

    // ── Rows ──
    var rows = g.selectAll(".inst-lolli")
      .data(sorted)
      .join("g")
      .attr("class", "inst-lolli")
      .attr("transform", function (d, i) { return "translate(0," + i * ROW_HEIGHT + ")"; });

    // Background stripe
    rows.append("rect")
      .attr("x", 0)
      .attr("y", 2)
      .attr("width", innerW)
      .attr("height", ROW_HEIGHT - 4)
      .attr("fill", function (d, i) { return i % 2 === 0 ? "transparent" : COLORS.bgAlt; })
      .attr("rx", 2);

    // Lollipop line
    rows.append("line")
      .attr("class", "inst-line")
      .attr("x1", 0)
      .attr("x2", function (d) { return xScale(d.drain_rate) - 10; })
      .attr("y1", ROW_HEIGHT / 2)
      .attr("y2", ROW_HEIGHT / 2)
      .attr("stroke", COLORS.abroadLight)
      .attr("stroke-width", 2)
      .attr("opacity", 0.5);

    // Lollipop circle
    rows.append("circle")
      .attr("class", "inst-circle")
      .attr("cx", function (d) { return xScale(d.drain_rate); })
      .attr("cy", ROW_HEIGHT / 2)
      .attr("r", 9)
      .attr("fill", COLORS.abroad)
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .on("mouseenter", function (event, d) {
        d3.select(this).attr("r", 12).attr("opacity", 0.8);
        showTooltip(
          "<strong>流失率: " + d.drain_rate + "%</strong><br>" +
          "总科学家: " + fmtNum(d.total_authors) + "<br>" +
          "留下: " + fmtNum(d.stayed_authors) + " / 离开: " + fmtNum(d.left_authors)
        );
      })
      .on("mousemove", moveTooltip)
      .on("mouseleave", function () {
        d3.select(this).attr("r", 9).attr("opacity", 1);
        hideTooltip();
      });

    // Drain rate label
    rows.append("text")
      .attr("class", "inst-pct")
      .attr("x", function (d) { return xScale(d.drain_rate) + 14; })
      .attr("y", ROW_HEIGHT / 2)
      .attr("dominant-baseline", "central")
      .attr("fill", COLORS.abroad)
      .attr("font-size", "13px")
      .attr("font-family", "Inter, sans-serif")
      .attr("font-weight", "700")
      .text(function (d) { return d.drain_rate + "%"; });

    // Count detail
    rows.append("text")
      .attr("class", "inst-detail")
      .attr("x", function (d) { return xScale(d.drain_rate) + 14; })
      .attr("y", ROW_HEIGHT / 2 + 13)
      .attr("fill", COLORS.textSecondary)
      .attr("font-size", "9px")
      .attr("font-family", "Inter, sans-serif")
      .text(function (d) { return d.left_authors + "/" + d.total_authors + " 人"; });

    // Index number (left)
    rows.append("text")
      .attr("x", -10)
      .attr("y", ROW_HEIGHT / 2)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "central")
      .attr("fill", COLORS.textLight)
      .attr("font-size", "11px")
      .attr("font-family", "Inter, sans-serif")
      .attr("font-weight", "600")
      .text(function (d, i) { return "#" + (i + 1); });

    // X axis
    var xAxis = d3.axisTop(xScale).ticks(5).tickFormat(function (d) { return d + "%"; });
    g.append("g").call(xAxis)
      .attr("font-family", "Inter, sans-serif")
      .attr("font-size", "10px")
      .attr("color", COLORS.textLight);

    // Note
    svg.append("text")
      .attr("x", MARGIN.left)
      .attr("y", MARGIN.top + sorted.length * ROW_HEIGHT + MARGIN.bottom - 4)
      .attr("fill", COLORS.textLight)
      .attr("font-size", "10px")
      .attr("font-family", "Inter, sans-serif")
      .text("流失率 = 从该机构起步后曾在海外发表的科学家占比。机构名称因数据匹配限制暂用编号代替。");
  }
})();
