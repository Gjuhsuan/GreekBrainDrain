/* ═══════════════════════════════════════════
   marimekko.js — Section 14: Marimekko Chart (Field Scale × Drain)
   Greek Brain Drain · Data Visualization Project
   ═══════════════════════════════════════════ */

(function () {
  "use strict";

  var MARGIN = { top: 30, right: 40, bottom: 50, left: 60 };
  var SVG_W = 960, SVG_H = 480;

  function initMarimekko() {
    loadData("subfields.json").then(function (data) {
      renderMarimekko(data);
    }).catch(function (err) {
      console.warn("marimekko.js: data load failed —", err.message);
    });
  }
  observeSection("marimekko-chart", initMarimekko);

  function renderMarimekko(raw) {
    var svg = d3.select("#marimekko-svg");
    svg.selectAll("*").remove();

    var innerW = SVG_W - MARGIN.left - MARGIN.right;
    var innerH = SVG_H - MARGIN.top - MARGIN.bottom;

    // ── Aggregate by field ──
    var byField = {};
    raw.forEach(function (d) {
      if (!byField[d.field]) {
        byField[d.field] = { field: d.field, greece: 0, abroad: 0, total: 0 };
      }
      byField[d.field].greece += d.greece;
      byField[d.field].abroad += d.abroad;
      byField[d.field].total += d.greece + d.abroad;
    });

    var fields = Object.values(byField)
      .filter(function (d) { return d.total > 0; })
      .sort(function (a, b) { return b.total - a.total; });

    // ── Marimekko scales ──
    var grandTotal = d3.sum(fields, function (d) { return d.total; });

    // Width proportional to total scientists
    var xOff = 0;
    fields.forEach(function (d) {
      d.x0 = xOff;
      d.width = d.total / grandTotal * innerW;
      xOff += d.width;
      d.abroadPct = d.abroad / d.total * 100;
    });

    var maxPct = d3.max(fields, function (d) { return d.abroadPct; });
    var yScale = d3.scaleLinear()
      .domain([0, Math.max(maxPct + 10, 100)])
      .range([innerH, 0]);

    var colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
      .domain([0, 100]);

    var g = svg.append("g")
      .attr("transform", "translate(" + MARGIN.left + "," + MARGIN.top + ")");

    // ── Bars ──
    g.selectAll(".mekko-bar")
      .data(fields)
      .join("rect")
      .attr("class", "mekko-bar")
      .attr("x", function (d) { return d.x0; })
      .attr("y", function (d) { return yScale(d.abroadPct); })
      .attr("width", function (d) { return Math.max(2, d.width - 1); })
      .attr("height", function (d) { return innerH - yScale(d.abroadPct); })
      .attr("fill", function (d) { return colorScale(d.abroadPct); })
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .attr("rx", 2)
      .attr("opacity", 0.85)
      .on("mouseenter", function (event, d) {
        d3.select(this).attr("opacity", 1);
        showTooltip(
          "<strong>" + d.field + "</strong><br>" +
          "总科学家: " + fmtNum(d.total) + "<br>" +
          "希腊: " + fmtNum(d.greece) + " | 海外: " + fmtNum(d.abroad) + "<br>" +
          "海外占比: <strong>" + d.abroadPct.toFixed(1) + "%</strong><br>" +
          "占总人数: " + (d.total / grandTotal * 100).toFixed(1) + "%"
        );
      })
      .on("mousemove", moveTooltip)
      .on("mouseleave", function () {
        d3.select(this).attr("opacity", 0.85);
        hideTooltip();
      });

    // ── Field labels ──
    g.selectAll(".mekko-label")
      .data(fields.filter(function (d) { return d.width > 40; }))
      .join("text")
      .attr("class", "mekko-label")
      .attr("x", function (d) { return d.x0 + d.width / 2; })
      .attr("y", function (d) { return yScale(d.abroadPct) - 8; })
      .attr("text-anchor", "middle")
      .attr("fill", COLORS.text)
      .attr("font-size", "10px")
      .attr("font-family", "Inter, sans-serif")
      .attr("font-weight", "600")
      .text(function (d) { return d.abroadPct.toFixed(0) + "%"; });

    // ── Y axis ──
    g.append("g")
      .call(d3.axisLeft(yScale).ticks(5).tickFormat(function (d) { return d + "%"; }))
      .attr("font-size", "10px").attr("font-family", "Inter, sans-serif")
      .attr("color", COLORS.textSecondary);

    // ── 50% reference ──
    g.append("line")
      .attr("x1", 0).attr("x2", innerW)
      .attr("y1", yScale(50)).attr("y2", yScale(50))
      .attr("stroke", COLORS.text).attr("stroke-width", 1)
      .attr("stroke-dasharray", "5,3").attr("opacity", 0.4);
    g.append("text").attr("x", innerW + 4).attr("y", yScale(50) + 4)
      .attr("fill", COLORS.textLight).attr("font-size", "10px")
      .attr("font-family", "Inter, sans-serif").text("50%线");

    // ── Bottom labels (rotated) ──
    g.selectAll(".mekko-bottom")
      .data(fields)
      .join("text")
      .attr("class", "mekko-bottom")
      .attr("x", function (d) { return d.x0 + d.width / 2; })
      .attr("y", innerH + 14)
      .attr("text-anchor", "end")
      .attr("transform", function (d) {
        return "rotate(-35," + (d.x0 + d.width / 2) + "," + (innerH + 14) + ")";
      })
      .attr("fill", COLORS.textSecondary)
      .attr("font-size", "9px")
      .attr("font-family", "Inter, sans-serif")
      .text(function (d) {
        if (d.width < 30) return "";
        return d.field.length > 18 ? d.field.substring(0, 16) + "…" : d.field;
      });

    // ── Color legend ──
    var legX = MARGIN.left, legY = 14;
    var legW = innerW * 0.4;
    var legG = svg.append("g").attr("transform", "translate(" + legX + "," + legY + ")");

    var grad = legG.append("defs").append("linearGradient")
      .attr("id", "mekko-grad").attr("x1", "0%").attr("y1", "0%").attr("x2", "100%").attr("y2", "0%");
    grad.append("stop").attr("offset", "0%").attr("stop-color", d3.interpolateYlOrRd(0));
    grad.append("stop").attr("offset", "100%").attr("stop-color", d3.interpolateYlOrRd(1));

    legG.append("rect").attr("width", legW).attr("height", 12)
      .attr("fill", "url(#mekko-grad)").attr("rx", 2);
    legG.append("text").attr("x", 0).attr("y", 26)
      .text("低流失").attr("font-size", "9px").attr("font-family", "Inter, sans-serif")
      .attr("fill", COLORS.textSecondary);
    legG.append("text").attr("x", legW).attr("y", 26).attr("text-anchor", "end")
      .text("高流失").attr("font-size", "9px").attr("font-family", "Inter, sans-serif")
      .attr("fill", COLORS.textSecondary);

  }
})();
