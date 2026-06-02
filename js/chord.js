/* ═══════════════════════════════════════════
   chord.js — Section 7: Co-authorship Network (Chord Diagram)
   Greek Brain Drain · Data Visualization Project
   ═══════════════════════════════════════════ */

(function () {
  "use strict";

  var SVG_W = 800;
  var SVG_H = 800;
  var MARGIN = 60;

  function initChord() {
    loadData("new/chord_data.json").then(function (data) {
      renderChord(data);
    }).catch(function (err) {
      console.warn("chord.js: data load failed —", err.message);
    });
  }
  observeSection("coauthorship", initChord);

  function renderChord(data) {
    var svg = d3.select("#chord-svg");
    svg.selectAll("*").remove();

    var innerR = SVG_W / 2 - MARGIN;

    var g = svg.append("g")
      .attr("transform", "translate(" + SVG_W / 2 + "," + SVG_H / 2 + ")");

    // ── Color scale for countries ──
    var countryColors = [
      COLORS.greece, COLORS.abroad, "#2E86AB", "#A23B72", "#F18F01",
      "#C73E1D", "#3B1F2B", "#9BC53D", "#5BC0BE", "#E55934",
      "#7B2D8E", "#2A7F62", "#D4A017", "#4A90D9", "#95A5A6"
    ];

    // Only keep meaningful connections (remove self-loops and filter very small values)
    var matrix = data.matrix;
    var countries = data.countries;
    var names = data.country_names;

    // Create chord layout
    var chord = d3.chord()
      .padAngle(0.05)
      .sortSubgroups(d3.descending)
      .sortChords(d3.descending);

    var chords = chord(matrix);

    // ── Arcs (outer ring) ──
    var arc = d3.arc()
      .innerRadius(innerR)
      .outerRadius(innerR + 20);

    var group = g.selectAll(".chord-group")
      .data(chords.groups)
      .join("g")
      .attr("class", "chord-group");

    group.append("path")
      .attr("d", arc)
      .attr("fill", function (d, i) { return countryColors[i % countryColors.length]; })
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .on("mouseenter", function (event, d) {
        d3.select(this).attr("opacity", 0.8);
        var total = d3.sum(matrix[d.index]);
        showTooltip(
          "<strong>" + names[d.index] + "</strong><br>" +
          "国际合作论文: " + fmtNum(total)
        );
      })
      .on("mousemove", moveTooltip)
      .on("mouseleave", function () {
        d3.select(this).attr("opacity", 1);
        hideTooltip();
      });

    // ── Country labels on outer ring ──
    group.each(function (d) {
      var centroid = arc.centroid(d);
      var angle = (d.startAngle + d.endAngle) / 2 * 180 / Math.PI;
      var x = centroid[0];
      var y = centroid[1];
      var rotate = angle > 180 ? angle + 90 : angle - 90;
      var anchor = angle > 180 ? "end" : "start";

      d3.select(this).append("text")
        .attr("x", x * 1.15)
        .attr("y", y * 1.15)
        .attr("text-anchor", anchor)
        .attr("transform", "rotate(" + rotate + "," + (x * 1.15) + "," + (y * 1.15) + ")")
        .attr("fill", COLORS.text)
        .attr("font-size", "11px")
        .attr("font-family", "Inter, sans-serif")
        .attr("font-weight", "500")
        .text(names[d.index].length > 14 ? names[d.index].substring(0, 13) + "…" : names[d.index]);
    });

    // ── Chords (ribbons) ──
    var ribbon = d3.ribbon()
      .radius(innerR);

    g.selectAll(".chord-ribbon")
      .data(chords)
      .join("path")
      .attr("class", "chord-ribbon")
      .attr("d", ribbon)
      .attr("fill", function (d) { return countryColors[d.source.index % countryColors.length]; })
      .attr("opacity", 0.25)
      .attr("stroke", function (d) { return d3.rgb(countryColors[d.source.index % countryColors.length]).darker(0.5); })
      .attr("stroke-width", 0.3)
      .on("mouseenter", function (event, d) {
        d3.select(this).attr("opacity", 0.6);
        showTooltip(
          names[d.source.index] + "<br>" + names[d.target.index] + "<br>" +
          "合作论文: " + fmtNum(d.source.value)
        );
      })
      .on("mousemove", moveTooltip)
      .on("mouseleave", function () {
        d3.select(this).attr("opacity", 0.25);
        hideTooltip();
      });

    // ── Center text ──
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("fill", COLORS.textSecondary)
      .attr("font-size", "12px")
      .attr("font-family", "Inter, sans-serif")
      .selectAll("tspan")
      .data([
        "国际合著网络",
        data.papers_with_collab.toLocaleString("zh-CN") + " 篇论文"
      ])
      .join("tspan")
      .attr("x", 0)
      .attr("dy", function (d, i) { return i === 0 ? 0 : 18; })
      .attr("font-weight", function (d, i) { return i === 0 ? "600" : "400"; })
      .attr("font-size", function (d, i) { return i === 0 ? "14px" : "11px"; })
      .text(function (d) { return d; });

    // ── Subtitle ──
    svg.append("text")
      .attr("x", SVG_W / 2)
      .attr("y", SVG_H - 10)
      .attr("text-anchor", "middle")
      .attr("fill", COLORS.textLight)
      .attr("font-size", "10px")
      .attr("font-family", "Inter, sans-serif")
      .text("仅统计至少包含两个不同国家机构的论文。弦粗细 = 合作论文数量");
  }
})();
