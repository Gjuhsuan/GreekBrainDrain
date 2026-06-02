/* ═══════════════════════════════════════════
   spider.js — Section 10: Radar Chart (Greece vs Abroad)
   Greek Brain Drain · Data Visualization Project
   ═══════════════════════════════════════════ */

(function () {
  "use strict";

  var SVG_W = 600, SVG_H = 520;
  var CX = SVG_W / 2, CY = SVG_H / 2 + 15;
  var R = 160;
  var LEVELS = 5;

  function initSpider() {
    loadData("summary.json").then(function (data) {
      renderSpider(data);
    }).catch(function (err) {
      console.warn("spider.js: data load failed —", err.message);
    });
  }
  observeSection("radar-chart", initSpider);

  function renderSpider(data) {
    var svg = d3.select("#spider-svg");
    svg.selectAll("*").remove();

    // ── Define axes ──
    var axes = [
      { key: "np", label: "论文数", accessor: function (d) { return d.mean; } },
      { key: "nc_ns", label: "总被引", accessor: function (d) { return d.mean; } },
      { key: "h19_ns", label: "h指数", accessor: function (d) { return d.mean; } },
      { key: "c_ns", label: "复合引用分", accessor: function (d) { return d.mean; } },
      { key: "self_pct", label: "自引率", accessor: function (d) { return d.mean * 100; } },
    ];
    var numAxes = axes.length;
    var angleSlice = (2 * Math.PI) / numAxes;

    // ── Scales ──
    var greeceMax = d3.max(axes, function (a) { return a.accessor(data.greece); });
    var abroadMax = d3.max(axes, function (a) { return a.accessor(data.abroad); });
    var globalMax = Math.max(greeceMax, abroadMax) * 1.1;

    var rScale = d3.scaleLinear()
      .domain([0, globalMax])
      .range([0, R]);

    var g = svg.append("g").attr("transform", "translate(" + CX + "," + CY + ")");

    // ── Background grid ──
    for (var level = 1; level <= LEVELS; level++) {
      var levelR = R * level / LEVELS;
      var gridPts = [];
      for (var a = 0; a <= numAxes; a++) {
        var angle = a * angleSlice - Math.PI / 2;
        gridPts.push([levelR * Math.cos(angle), levelR * Math.sin(angle)]);
      }
      g.append("polygon")
        .attr("points", gridPts.map(function (p) { return p.join(","); }).join(" "))
        .attr("fill", "none")
        .attr("stroke", COLORS.grid)
        .attr("stroke-width", 0.5);
    }

    // ── Axis lines ──
    for (var k = 0; k < numAxes; k++) {
      var ang = k * angleSlice - Math.PI / 2;
      var x = R * Math.cos(ang), y = R * Math.sin(ang);
      g.append("line")
        .attr("x1", 0).attr("y1", 0)
        .attr("x2", x).attr("y2", y)
        .attr("stroke", COLORS.grid)
        .attr("stroke-width", 0.8);
    }

    // ── Axis labels ──
    for (var j = 0; j < numAxes; j++) {
      var ang2 = j * angleSlice - Math.PI / 2;
      var lx = (R + 35) * Math.cos(ang2);
      var ly = (R + 35) * Math.sin(ang2);
      var anchor = "middle";
      if (Math.abs(lx) < 5) anchor = "middle";
      else if (lx > 0) anchor = "start";
      else anchor = "end";

      g.append("text")
        .attr("x", lx).attr("y", ly)
        .attr("text-anchor", anchor)
        .attr("dominant-baseline", "central")
        .attr("fill", COLORS.text)
        .attr("font-size", "11px")
        .attr("font-family", "Inter, sans-serif")
        .attr("font-weight", "500")
        .text(axes[j].label);

      // Value labels
      var gVal = axes[j].accessor(data.greece);
      var aVal = axes[j].accessor(data.abroad);
      g.append("text")
        .attr("x", (R + 50) * Math.cos(ang2))
        .attr("y", (R + 50) * Math.sin(ang2) + 14)
        .attr("text-anchor", anchor)
        .attr("fill", COLORS.textLight)
        .attr("font-size", "9px")
        .attr("font-family", "Inter, sans-serif")
        .text(function () {
          if (j === 4) return "希:" + gVal.toFixed(1) + "% 海:" + aVal.toFixed(1) + "%";
          return "希:" + Math.round(gVal) + " 海:" + Math.round(aVal);
        }());
    }

    // ── Compute polygon points ──
    function getPolygon(group) {
      return axes.map(function (ax, i) {
        var val = ax.accessor(group);
        var ang = i * angleSlice - Math.PI / 2;
        var r = rScale(Math.min(val, globalMax));
        return [r * Math.cos(ang), r * Math.sin(ang)];
      });
    }

    // ── Greece polygon ──
    var grPts = getPolygon(data.greece);
    g.append("polygon")
      .attr("points", grPts.map(function (p) { return p.join(","); }).join(" "))
      .attr("fill", COLORS.greece)
      .attr("fill-opacity", 0.25)
      .attr("stroke", COLORS.greece)
      .attr("stroke-width", 2);

    g.selectAll(".spider-dot-gr")
      .data(grPts)
      .join("circle")
      .attr("cx", function (d) { return d[0]; })
      .attr("cy", function (d) { return d[1]; })
      .attr("r", 5)
      .attr("fill", COLORS.greece)
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5);

    // ── Abroad polygon ──
    var abPts = getPolygon(data.abroad);
    g.append("polygon")
      .attr("points", abPts.map(function (p) { return p.join(","); }).join(" "))
      .attr("fill", COLORS.abroad)
      .attr("fill-opacity", 0.25)
      .attr("stroke", COLORS.abroad)
      .attr("stroke-width", 2);

    g.selectAll(".spider-dot-ab")
      .data(abPts)
      .join("circle")
      .attr("cx", function (d) { return d[0]; })
      .attr("cy", function (d) { return d[1]; })
      .attr("r", 5)
      .attr("fill", COLORS.abroad)
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5);

    // ── Legend ──
    var legend = svg.append("g").attr("transform", "translate(20, 16)");
    legend.append("circle").attr("cx", 5).attr("cy", -2).attr("r", 5).attr("fill", COLORS.greece);
    legend.append("text").attr("x", 16).attr("y", 1)
      .text("希腊本土").attr("font-size", "11px").attr("font-family", "Inter, sans-serif").attr("fill", COLORS.text);
    legend.append("circle").attr("cx", 110).attr("cy", -2).attr("r", 5).attr("fill", COLORS.abroad);
    legend.append("text").attr("x", 121).attr("y", 1)
      .text("海外").attr("font-size", "11px").attr("font-family", "Inter, sans-serif").attr("fill", COLORS.text);
  }
})();
