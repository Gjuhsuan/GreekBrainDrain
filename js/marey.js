/* ═══════════════════════════════════════════
   marey.js — Fixed-height yearly comparison timeline
   Greek Brain Drain · Data Visualization Project
   ═══════════════════════════════════════════ */

(function () {
  "use strict";

  var SVG_W = 560;
  var SVG_H = 560;
  var MARGIN = { top: 54, right: 58, bottom: 72, left: 58 };
  var ANIM_DURATION = 550;

  var trendData = [];
  var rendered = false;
  var currentStart = 1960;
  var currentEnd = 2019;

  var PRESET_RANGES = {
    1960: [1960, 1979],
    1980: [1980, 1999],
    2000: [2000, 2008],
    2009: [2009, 2015],
    2016: [2016, 2019]
  };

  function initMarey() {
    if (rendered) return;
    loadData("firstyr_trends.json").then(function (data) {
      trendData = data.filter(function (d) { return d.total > 0; });
      buildControls();
      drawTimeline(currentStart, currentEnd);
      updateIndicator();
      setupTimelineLinks();
      rendered = true;
    }).catch(function (err) {
      console.error("marey.js: data load failed", err);
    });
  }

  function buildControls() {
    var container = d3.select("#viz-timeline");
    if (container.select(".marey-controls").node()) return;

    var years = trendData.map(function (d) { return d.year; });
    var controls = container.insert("div", ":first-child")
      .attr("class", "marey-controls");

    controls.append("label")
      .text("起始年份")
      .append("select")
        .attr("id", "marey-start")
        .selectAll("option")
        .data(years)
        .join("option")
          .attr("value", function (d) { return d; })
          .property("selected", function (d) { return d === currentStart; })
          .text(function (d) { return d; });

    controls.append("label")
      .text("结束年份")
      .append("select")
        .attr("id", "marey-end")
        .selectAll("option")
        .data(years)
        .join("option")
          .attr("value", function (d) { return d; })
          .property("selected", function (d) { return d === currentEnd; })
          .text(function (d) { return d; });

    d3.select("#marey-start").on("change", function () {
      var start = +this.value;
      var end = +d3.select("#marey-end").property("value");
      setRange(start, end);
    });

    d3.select("#marey-end").on("change", function () {
      var start = +d3.select("#marey-start").property("value");
      var end = +this.value;
      setRange(start, end);
    });
  }

  function setRange(start, end) {
    if (start > end) {
      var tmp = start;
      start = end;
      end = tmp;
    }
    currentStart = start;
    currentEnd = end;

    d3.select("#marey-start").property("value", currentStart);
    d3.select("#marey-end").property("value", currentEnd);
    drawTimeline(currentStart, currentEnd);
    updateIndicator();
  }

  function drawTimeline(startYear, endYear) {
    var svg = d3.select("#marey-svg");
    svg.attr("viewBox", "0 0 " + SVG_W + " " + SVG_H);
    svg.attr("preserveAspectRatio", "xMidYMid meet");
    svg.selectAll("*").remove();

    var data = trendData.filter(function (d) {
      return d.year >= startYear && d.year <= endYear;
    });
    if (!data.length) return;

    var innerW = SVG_W - MARGIN.left - MARGIN.right;
    var innerH = SVG_H - MARGIN.top - MARGIN.bottom;
    var g = svg.append("g")
      .attr("transform", "translate(" + MARGIN.left + "," + MARGIN.top + ")");

    var x = d3.scaleBand()
      .domain(data.map(function (d) { return d.year; }))
      .range([0, innerW])
      .paddingInner(data.length > 25 ? 0.16 : 0.24)
      .paddingOuter(0.08);

    var groupX = d3.scaleBand()
      .domain(["greece", "abroad"])
      .range([0, x.bandwidth()])
      .padding(0.08);

    var maxCount = d3.max(data, function (d) {
      return Math.max(d.greece, d.abroad);
    });
    var yCount = d3.scaleLinear()
      .domain([0, maxCount || 1])
      .nice()
      .range([innerH, 0]);

    var pctExtent = d3.extent(data, function (d) { return d.abroad_pct; });
    var pctMin = Math.max(0, Math.floor((pctExtent[0] - 3) / 5) * 5);
    var pctMax = Math.min(100, Math.ceil((pctExtent[1] + 3) / 5) * 5);
    if (pctMin === pctMax) pctMax = pctMin + 10;
    var yPct = d3.scaleLinear()
      .domain([pctMin, pctMax])
      .range([innerH, 0])
      .nice();

    drawGrid(g, yCount, innerW);
    drawAxes(g, x, yCount, yPct, innerW, innerH, data);
    drawBars(g, data, x, groupX, yCount, innerH);
    drawLine(g, data, x, yPct);
    drawLegend(svg);
    drawTitle(svg, startYear, endYear);
  }

  function drawGrid(g, yCount, innerW) {
    g.append("g")
      .attr("class", "grid")
      .selectAll("line")
      .data(yCount.ticks(5))
      .join("line")
        .attr("x1", 0)
        .attr("x2", innerW)
        .attr("y1", function (d) { return yCount(d); })
        .attr("y2", function (d) { return yCount(d); })
        .attr("stroke", COLORS.grid)
        .attr("stroke-width", 0.5);
  }

  function drawAxes(g, x, yCount, yPct, innerW, innerH, data) {
    var tickStep = data.length <= 12 ? 1 : data.length <= 25 ? 2 : 5;
    var xTicks = data
      .map(function (d) { return d.year; })
      .filter(function (year, i) {
        return i === 0 || i === data.length - 1 || year % tickStep === 0;
      });

    g.append("g")
      .attr("class", "axis")
      .attr("transform", "translate(0," + innerH + ")")
      .call(d3.axisBottom(x).tickValues(xTicks).tickFormat(d3.format("d")))
      .selectAll("text")
        .attr("font-size", "10px")
        .attr("transform", data.length > 18 ? "rotate(-45)" : null)
        .attr("text-anchor", data.length > 18 ? "end" : "middle");

    g.append("g")
      .attr("class", "axis")
      .call(d3.axisLeft(yCount).ticks(5).tickFormat(function (d) { return fmtNum(d); }));

    g.append("g")
      .attr("class", "axis")
      .attr("transform", "translate(" + innerW + ",0)")
      .call(d3.axisRight(yPct).ticks(5).tickFormat(function (d) { return d + "%"; }));

    g.append("text")
      .attr("class", "axis-label")
      .attr("x", innerW / 2)
      .attr("y", innerH + 54)
      .attr("text-anchor", "middle")
      .text("首次发表年份");

    g.append("text")
      .attr("class", "axis-label")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerH / 2)
      .attr("y", -42)
      .attr("text-anchor", "middle")
      .text("科学家人数");

    g.append("text")
      .attr("class", "axis-label")
      .attr("transform", "rotate(90)")
      .attr("x", innerH / 2)
      .attr("y", -innerW - 44)
      .attr("text-anchor", "middle")
      .text("海外比例");
  }

  function drawBars(g, data, x, groupX, yCount, innerH) {
    var rows = g.selectAll(".marey-year")
      .data(data, function (d) { return d.year; })
      .join("g")
        .attr("class", "marey-year")
        .attr("transform", function (d) { return "translate(" + x(d.year) + ",0)"; });

    rows.selectAll("rect")
      .data(function (d) {
        return [
          { year: d.year, key: "greece", label: "希腊", value: d.greece, original: d },
          { year: d.year, key: "abroad", label: "海外", value: d.abroad, original: d }
        ];
      })
      .join("rect")
        .attr("x", function (d) { return groupX(d.key); })
        .attr("y", innerH)
        .attr("width", groupX.bandwidth())
        .attr("height", 0)
        .attr("fill", function (d) {
          return d.key === "greece" ? COLORS.greece : COLORS.abroad;
        })
        .attr("opacity", 0.86)
        .on("mouseenter", function (event, d) {
          d3.select(this).attr("opacity", 1);
          showTooltip(
            "<strong>" + d.year + " 年</strong><br>" +
            d.label + ": " + fmtNum(d.value) + "<br>" +
            "海外比例: " + fmtPct(d.original.abroad_pct, 1)
          );
          moveTooltip(event);
        })
        .on("mousemove", moveTooltip)
        .on("mouseleave", function () {
          d3.select(this).attr("opacity", 0.86);
          hideTooltip();
        })
        .transition()
        .duration(ANIM_DURATION)
        .ease(d3.easeCubicOut)
        .attr("y", function (d) { return yCount(d.value); })
        .attr("height", function (d) { return innerH - yCount(d.value); });
  }

  function drawLine(g, data, x, yPct) {
    var line = d3.line()
      .x(function (d) { return x(d.year) + x.bandwidth() / 2; })
      .y(function (d) { return yPct(d.abroad_pct); })
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(data)
      .attr("class", "marey-pct-line")
      .attr("d", line)
      .attr("fill", "none")
      .attr("stroke", COLORS.highlight)
      .attr("stroke-width", 2.5)
      .attr("opacity", 0)
      .transition()
      .duration(ANIM_DURATION)
      .attr("opacity", 1);

    g.selectAll(".marey-pct-dot")
      .data(data)
      .join("circle")
        .attr("class", "marey-pct-dot")
        .attr("cx", function (d) { return x(d.year) + x.bandwidth() / 2; })
        .attr("cy", function (d) { return yPct(d.abroad_pct); })
        .attr("r", data.length > 30 ? 2.2 : 3.2)
        .attr("fill", COLORS.highlight)
        .attr("stroke", "#fff")
        .attr("stroke-width", 1)
        .attr("opacity", 0.92)
        .on("mouseenter", function (event, d) {
          d3.select(this).attr("r", 5);
          showTooltip(
            "<strong>" + d.year + " 年</strong><br>" +
            "海外比例: " + fmtPct(d.abroad_pct, 1) + "<br>" +
            "希腊: " + fmtNum(d.greece) + "<br>" +
            "海外: " + fmtNum(d.abroad)
          );
          moveTooltip(event);
        })
        .on("mousemove", moveTooltip)
        .on("mouseleave", function () {
          d3.select(this).attr("r", data.length > 30 ? 2.2 : 3.2);
          hideTooltip();
        });
  }

  function drawLegend(svg) {
    var legend = svg.append("g")
      .attr("class", "marey-legend")
      .attr("transform", "translate(" + MARGIN.left + ",22)");

    var items = [
      { label: "希腊", color: COLORS.greece, type: "bar" },
      { label: "海外", color: COLORS.abroad, type: "bar" },
      { label: "海外比例", color: COLORS.highlight, type: "line" }
    ];

    var item = legend.selectAll("g")
      .data(items)
      .join("g")
        .attr("transform", function (_, i) { return "translate(" + (i * 92) + ",0)"; });

    item.each(function (d) {
      var g = d3.select(this);
      if (d.type === "line") {
        g.append("line")
          .attr("x1", 0)
          .attr("x2", 16)
          .attr("y1", 5)
          .attr("y2", 5)
          .attr("stroke", d.color)
          .attr("stroke-width", 2.5);
      } else {
        g.append("rect")
          .attr("width", 14)
          .attr("height", 10)
          .attr("y", 0)
          .attr("fill", d.color)
          .attr("rx", 2);
      }
      g.append("text")
        .attr("x", 22)
        .attr("y", 9)
        .attr("fill", COLORS.textSecondary)
        .attr("font-size", "11px")
        .attr("font-family", "Inter, sans-serif")
        .text(d.label);
    });
  }

  function drawTitle(svg, startYear, endYear) {
    svg.append("text")
      .attr("x", SVG_W - MARGIN.right)
      .attr("y", 30)
      .attr("text-anchor", "end")
      .attr("fill", COLORS.textLight)
      .attr("font-size", "11px")
      .attr("font-family", "Inter, sans-serif")
      .text(startYear + " 到 " + endYear);
  }

  function setupTimelineLinks() {
    var links = document.querySelectorAll(".tl-link");
    links.forEach(function (link) {
      link.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopImmediatePropagation();

        var targetYear = parseInt(this.getAttribute("data-tl-year"), 10);
        var range = PRESET_RANGES[targetYear] || [targetYear, targetYear];

        links.forEach(function (l) { l.classList.remove("active"); });
        this.classList.add("active");
        setRange(range[0], range[1]);
      });
    });
  }

  function updateIndicator() {
    var data = trendData.filter(function (d) {
      return d.year >= currentStart && d.year <= currentEnd;
    });
    var indicator = document.getElementById("year-indicator");
    if (!indicator || !data.length) return;

    var totalGreece = d3.sum(data, function (d) { return d.greece; });
    var totalAbroad = d3.sum(data, function (d) { return d.abroad; });
    var pct = totalAbroad / (totalGreece + totalAbroad) * 100;
    indicator.textContent = currentStart + " 到 " + currentEnd + " · 海外比例 " + fmtPct(pct, 1);
  }

  window.__mareySetRange = function (start, end) {
    setRange(start, end);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMarey);
  } else {
    initMarey();
  }
})();
