/* ═══════════════════════════════════════════
   marimekko.js — Field Scale × Drain Scatter
   Greek Brain Drain · Data Visualization Project
   ═══════════════════════════════════════════ */

(function () {
  "use strict";

  var MARGIN = { top: 42, right: 44, bottom: 64, left: 78 };
  var SVG_W = 960, SVG_H = 480;

  function initMarimekko() {
    loadData("subfields.json").then(function (data) {
      renderFieldScatter(data);
    }).catch(function (err) {
      console.warn("marimekko.js: data load failed —", err.message);
    });
  }
  observeSection("marimekko-chart", initMarimekko);

  function renderFieldScatter(raw) {
    var svg = d3.select("#marimekko-svg");
    svg.selectAll("*").remove();

    var innerW = SVG_W - MARGIN.left - MARGIN.right;
    var innerH = SVG_H - MARGIN.top - MARGIN.bottom;

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
      .map(function (d) {
        d.abroadPct = d.abroad / d.total * 100;
        return d;
      })
      .sort(function (a, b) { return b.total - a.total; });

    var maxTotal = d3.max(fields, function (d) { return d.total; });
    var maxAbroad = d3.max(fields, function (d) { return d.abroad; });
    var minTotal = d3.min(fields, function (d) { return d.total; });

    var xScale = d3.scaleLog()
      .domain([Math.max(10, minTotal * 0.75), maxTotal * 1.25])
      .range([0, innerW])
      .nice();

    var yScale = d3.scaleLinear()
      .domain([0, Math.max(80, d3.max(fields, function (d) { return d.abroadPct; }) + 6)])
      .range([innerH, 0])
      .nice();

    var rScale = d3.scaleSqrt()
      .domain([0, maxAbroad])
      .range([5, 24]);

    var g = svg.append("g")
      .attr("transform", "translate(" + MARGIN.left + "," + MARGIN.top + ")");

    var xTicks = [30, 100, 300, 1000, 3000, 10000, 30000]
      .filter(function (d) { return d >= xScale.domain()[0] && d <= xScale.domain()[1]; });

    g.append("g")
      .attr("class", "field-grid")
      .attr("transform", "translate(0," + innerH + ")")
      .call(d3.axisBottom(xScale).tickValues(xTicks).tickSize(-innerH).tickFormat(""))
      .call(function (axis) { axis.select(".domain").remove(); });

    g.append("g")
      .attr("class", "field-grid")
      .call(d3.axisLeft(yScale).ticks(5).tickSize(-innerW).tickFormat(""))
      .call(function (axis) { axis.select(".domain").remove(); });

    g.append("line")
      .attr("x1", 0)
      .attr("x2", innerW)
      .attr("y1", yScale(50))
      .attr("y2", yScale(50))
      .attr("stroke", COLORS.text)
      .attr("stroke-width", 1.2)
      .attr("stroke-dasharray", "6,4")
      .attr("opacity", 0.45);

    g.append("text")
      .attr("x", innerW - 4)
      .attr("y", yScale(50) - 8)
      .attr("text-anchor", "end")
      .attr("fill", COLORS.textLight)
      .attr("font-size", "11px")
      .attr("font-family", "Inter, sans-serif")
      .text("50% 海外占比");

    var xAxis = d3.axisBottom(xScale)
      .tickValues(xTicks)
      .tickFormat(function (d) { return d >= 1000 ? (d / 1000) + "k" : d; });

    var yAxis = d3.axisLeft(yScale)
      .ticks(5)
      .tickFormat(function (d) { return d + "%"; });

    g.append("g")
      .attr("class", "field-axis")
      .attr("transform", "translate(0," + innerH + ")")
      .call(xAxis);

    g.append("g")
      .attr("class", "field-axis")
      .call(yAxis);

    g.append("text")
      .attr("class", "axis-title")
      .attr("x", innerW / 2)
      .attr("y", innerH + 50)
      .attr("text-anchor", "middle")
      .text("学科规模（科学家人数，对数刻度）");

    g.append("text")
      .attr("class", "axis-title")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerH / 2)
      .attr("y", -54)
      .attr("text-anchor", "middle")
      .text("海外科学家占比");

    var pointG = g.append("g").attr("class", "field-scatter-points");

    pointG.selectAll(".field-bubble")
      .data(fields)
      .join("circle")
      .attr("class", "field-bubble")
      .attr("cx", function (d) { return xScale(d.total); })
      .attr("cy", function (d) { return yScale(d.abroadPct); })
      .attr("r", function (d) { return rScale(d.abroad); })
      .attr("fill", function (d) { return d.abroadPct >= 50 ? COLORS.abroad : COLORS.greece; })
      .attr("fill-opacity", 0.72)
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .on("mouseenter", function (event, d) {
        d3.select(this)
          .attr("fill-opacity", 0.95)
          .attr("stroke", COLORS.text)
          .attr("stroke-width", 1.8);
        showTooltip(
          "<strong>" + d.field + "</strong><br>" +
          "总科学家: " + fmtNum(d.total) + "<br>" +
          "海外: " + fmtNum(d.abroad) + " | 希腊: " + fmtNum(d.greece) + "<br>" +
          "海外占比: <strong>" + d.abroadPct.toFixed(1) + "%</strong>"
        );
      })
      .on("mousemove", moveTooltip)
      .on("mouseleave", function () {
        d3.select(this)
          .attr("fill-opacity", 0.72)
          .attr("stroke", "#fff")
          .attr("stroke-width", 1.5);
        hideTooltip();
      });

    var labelFields = [
      "Clinical Medicine",
      "Physics & Astronomy",
      "Biomedical Research",
      "Economics & Business",
      "Psychology & Cognitive Sciences",
      "Philosophy & Theology"
    ];

    var offsets = {
      "Clinical Medicine": [-8, -24, "end"],
      "Physics & Astronomy": [10, -10, "start"],
      "Biomedical Research": [10, 16, "start"],
      "Economics & Business": [10, -10, "start"],
      "Psychology & Cognitive Sciences": [10, -10, "start"],
      "Philosophy & Theology": [10, -10, "start"]
    };

    g.append("g")
      .selectAll(".field-label")
      .data(fields.filter(function (d) { return labelFields.indexOf(d.field) >= 0; }))
      .join("text")
      .attr("class", "field-label")
      .attr("x", function (d) { return xScale(d.total) + offsets[d.field][0]; })
      .attr("y", function (d) { return yScale(d.abroadPct) + offsets[d.field][1]; })
      .attr("text-anchor", function (d) { return offsets[d.field][2]; })
      .text(function (d) { return shortFieldName(d.field); });

    var legend = svg.append("g")
      .attr("class", "field-scatter-legend")
      .attr("transform", "translate(" + (MARGIN.left + 10) + ",18)");

    legend.append("circle")
      .attr("cx", 0).attr("cy", 0).attr("r", 7)
      .attr("fill", COLORS.greece).attr("fill-opacity", 0.72);
    legend.append("text")
      .attr("x", 12).attr("y", 4)
      .text("低于 50%");

    legend.append("circle")
      .attr("cx", 92).attr("cy", 0).attr("r", 7)
      .attr("fill", COLORS.abroad).attr("fill-opacity", 0.72);
    legend.append("text")
      .attr("x", 104).attr("y", 4)
      .text("高于 50%");

    var sizeLegend = svg.append("g")
      .attr("class", "field-scatter-legend")
      .attr("transform", "translate(" + (SVG_W - MARGIN.right - 148) + ",18)");

    sizeLegend.append("circle")
      .attr("cx", 0).attr("cy", 0).attr("r", rScale(500))
      .attr("fill", "none").attr("stroke", COLORS.textLight);
    sizeLegend.append("circle")
      .attr("cx", 42).attr("cy", 0).attr("r", rScale(3000))
      .attr("fill", "none").attr("stroke", COLORS.textLight);
    sizeLegend.append("text")
      .attr("x", 72).attr("y", 4)
      .text("气泡大小 = 海外人数");
  }

  function shortFieldName(name) {
    return {
      "Clinical Medicine": "临床医学",
      "Physics & Astronomy": "物理/天文",
      "Biomedical Research": "生物医学",
      "Economics & Business": "经济/商业",
      "Psychology & Cognitive Sciences": "心理学",
      "Philosophy & Theology": "哲学/神学"
    }[name] || name;
  }
})();
