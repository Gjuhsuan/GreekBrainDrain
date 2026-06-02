/* ═══════════════════════════════════════════
   departure.js — Section 6: Departure Timeline (Stacked Area)
   Greek Brain Drain · Data Visualization Project
   ═══════════════════════════════════════════ */

(function () {
  "use strict";

  var MARGIN = { top: 40, right: 40, bottom: 40, left: 55 };
  var SVG_W = 960;
  var SVG_H = 420;
  var fullData = null;
  var currentStart = null;
  var currentEnd = null;

  function initDeparture() {
    loadData("new/departure_timeline.json").then(function (data) {
      fullData = data.slice().sort(function (a, b) { return d3.ascending(a.year, b.year); });
      currentStart = d3.min(fullData, function (d) { return d.year; });
      currentEnd = d3.max(fullData, function (d) { return d.year; });
      createControls(fullData);
      renderDeparture();
    }).catch(function (err) {
      console.warn("departure.js: data load failed —", err.message);
    });
  }
  observeSection("departure-timeline", initDeparture);

  function createControls(data) {
    var container = d3.select("#viz-departure");
    if (container.select(".departure-controls").node()) return;

    var years = data.map(function (d) { return d.year; });
    var controls = container.insert("div", "svg")
      .attr("class", "marey-controls departure-controls");

    var startLabel = controls.append("label").text("起始年份");
    startLabel.append("select")
      .attr("id", "departure-start")
      .selectAll("option")
      .data(years)
      .enter()
      .append("option")
      .attr("value", function (d) { return d; })
      .property("selected", function (d) { return d === currentStart; })
      .text(function (d) { return d; });

    var endLabel = controls.append("label").text("结束年份");
    endLabel.append("select")
      .attr("id", "departure-end")
      .selectAll("option")
      .data(years)
      .enter()
      .append("option")
      .attr("value", function (d) { return d; })
      .property("selected", function (d) { return d === currentEnd; })
      .text(function (d) { return d; });

    d3.select("#departure-start").on("change", function () {
      var start = +this.value;
      var end = +d3.select("#departure-end").property("value");
      if (start > end) end = start;
      currentStart = start;
      currentEnd = end;
      syncControls();
      renderDeparture();
    });

    d3.select("#departure-end").on("change", function () {
      var end = +this.value;
      var start = +d3.select("#departure-start").property("value");
      if (end < start) start = end;
      currentStart = start;
      currentEnd = end;
      syncControls();
      renderDeparture();
    });
  }

  function syncControls() {
    d3.select("#departure-start").property("value", currentStart);
    d3.select("#departure-end").property("value", currentEnd);
  }

  function renderDeparture() {
    if (!fullData) return;

    var data = fullData.filter(function (d) {
      return d.year >= currentStart && d.year <= currentEnd;
    });
    if (!data.length) return;

    var svg = d3.select("#departure-svg");
    svg.selectAll("*").remove();

    var innerW = SVG_W - MARGIN.left - MARGIN.right;
    var innerH = SVG_H - MARGIN.top - MARGIN.bottom;

    // ── Scales ──
    var xScale = d3.scaleLinear()
      .domain(data.length > 1
        ? d3.extent(data, function (d) { return d.year; })
        : [data[0].year - 1, data[0].year + 1])
      .range([0, innerW]);

    var maxY = d3.max(data, function (d) {
      return d.active_greece + d.active_abroad;
    });

    var yScale = d3.scaleLinear()
      .domain([0, (maxY || 1) * 1.08])
      .range([innerH, 0])
      .nice();

    // ── Chart group ──
    var g = svg.append("g")
      .attr("transform", "translate(" + MARGIN.left + "," + MARGIN.top + ")");

    // ── Grid lines ──
    g.append("g")
      .attr("class", "grid")
      .selectAll("line")
      .data(yScale.ticks(6))
      .join("line")
      .attr("x1", 0)
      .attr("x2", innerW)
      .attr("y1", function (d) { return yScale(d); })
      .attr("y2", function (d) { return yScale(d); })
      .attr("stroke", COLORS.grid)
      .attr("stroke-width", 0.5);

    // ── Stacked area ──
    var stack = d3.stack()
      .keys(["active_greece", "active_abroad"])
      .order(d3.stackOrderNone)
      .offset(d3.stackOffsetNone);

    var stackedData = stack(data);

    var area = d3.area()
      .x(function (d) { return xScale(d.data.year); })
      .y0(function (d) { return yScale(d[0]); })
      .y1(function (d) { return yScale(d[1]); })
      .curve(d3.curveMonotoneX);

    // Greece area (bottom)
    g.append("path")
      .datum(stackedData[0])
      .attr("fill", COLORS.greece)
      .attr("opacity", 0.8)
      .attr("d", area)
      .attr("stroke", COLORS.greece)
      .attr("stroke-width", 0.5);

    // Abroad area (top)
    g.append("path")
      .datum(stackedData[1])
      .attr("fill", COLORS.abroad)
      .attr("opacity", 0.8)
      .attr("d", area)
      .attr("stroke", COLORS.abroad)
      .attr("stroke-width", 0.5);

    // ── Axes ──
    var yearSpan = currentEnd - currentStart;
    var tickStep = yearSpan <= 10 ? 1 : (yearSpan <= 25 ? 2 : 5);
    var tickValues = data
      .map(function (d) { return d.year; })
      .filter(function (year, i) {
        return i === 0 || i === data.length - 1 || year % tickStep === 0;
      });

    var xAxis = d3.axisBottom(xScale)
      .tickFormat(d3.format("d"))
      .tickValues(tickValues);

    g.append("g")
      .attr("transform", "translate(0," + innerH + ")")
      .call(xAxis)
      .attr("font-family", "Inter, sans-serif")
      .attr("font-size", "11px")
      .attr("color", COLORS.textSecondary);

    var yAxis = d3.axisLeft(yScale).ticks(5);
    g.append("g")
      .call(yAxis)
      .attr("font-family", "Inter, sans-serif")
      .attr("font-size", "11px")
      .attr("color", COLORS.textSecondary);

    // ── Legend ──
    var legend = svg.append("g")
      .attr("transform", "translate(" + (MARGIN.left) + ", 18)");

    // Greece
    legend.append("rect")
      .attr("width", 14).attr("height", 14)
      .attr("fill", COLORS.greece).attr("rx", 2);
    legend.append("text")
      .attr("x", 20).attr("y", 11)
      .text("希腊本土活跃").attr("fill", COLORS.text)
      .attr("font-family", "Inter, sans-serif").attr("font-size", "11px");

    // Abroad
    legend.append("rect")
      .attr("x", 140).attr("width", 14).attr("height", 14)
      .attr("fill", COLORS.abroad).attr("rx", 2);
    legend.append("text")
      .attr("x", 160).attr("y", 11)
      .text("海外活跃").attr("fill", COLORS.text)
      .attr("font-family", "Inter, sans-serif").attr("font-size", "11px");

    // ── Hover interaction ──
    var hoverLayer = g.append("g")
      .attr("class", "departure-hover")
      .style("pointer-events", "none")
      .attr("opacity", 0);

    hoverLayer.append("line")
      .attr("class", "departure-hover-line")
      .attr("y1", 0)
      .attr("y2", innerH)
      .attr("stroke", COLORS.text)
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4 4")
      .attr("opacity", 0.55);

    hoverLayer.append("circle")
      .attr("class", "departure-hover-greece")
      .attr("r", 4)
      .attr("fill", COLORS.greece)
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5);

    hoverLayer.append("circle")
      .attr("class", "departure-hover-abroad")
      .attr("r", 4)
      .attr("fill", COLORS.abroad)
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5);

    var bisectYear = d3.bisector(function (d) { return d.year; }).left;
    g.append("rect")
      .attr("class", "departure-hover-zone")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", innerW)
      .attr("height", innerH)
      .attr("fill", "transparent")
      .on("mouseenter", function () {
        hoverLayer.attr("opacity", 1);
      })
      .on("mousemove", function (event) {
        var pointerX = d3.pointer(event, this)[0];
        var year = xScale.invert(pointerX);
        var idx = bisectYear(data, year);
        if (idx >= data.length) idx = data.length - 1;
        if (idx > 0 && Math.abs(data[idx - 1].year - year) < Math.abs(data[idx].year - year)) idx -= 1;
        var d = data[idx];
        var x = xScale(d.year);
        var yGreece = yScale(d.active_greece);
        var yTotal = yScale(d.active_greece + d.active_abroad);

        hoverLayer.select(".departure-hover-line")
          .attr("x1", x)
          .attr("x2", x);
        hoverLayer.select(".departure-hover-greece")
          .attr("cx", x)
          .attr("cy", yGreece);
        hoverLayer.select(".departure-hover-abroad")
          .attr("cx", x)
          .attr("cy", yTotal);

        showTooltip(
          "<strong>" + d.year + " 年</strong><br>" +
          "本土活跃: " + fmtNum(d.active_greece) + "<br>" +
          "海外活跃: " + fmtNum(d.active_abroad) + "<br>" +
          "新流出人数: <strong>" + fmtNum(d.new_departures) + "</strong>"
        );
        moveTooltip(event);
      })
      .on("mouseleave", function () {
        hoverLayer.attr("opacity", 0);
        hideTooltip();
      });

    // ── Y axis label ──
    svg.append("text")
      .attr("x", 12)
      .attr("y", MARGIN.top + innerH / 2)
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90,12," + (MARGIN.top + innerH / 2) + ")")
      .attr("fill", COLORS.textSecondary)
      .attr("font-size", "10px")
      .attr("font-family", "Inter, sans-serif")
      .text("活跃科学家数");
  }
})();
