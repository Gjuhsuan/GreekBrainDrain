/* ═══════════════════════════════════════════
   violins.js — Vertical split violin plots (KDE)
   Greek Brain Drain · Data Visualization Project
   ═══════════════════════════════════════════ */

(function () {
  "use strict";

  var METRIC_META = {
    "c_ns":  { title: "综合引用得分",   log: false },
    "nc_ns": { title: "总引用次数",     log: true  },
    "np":    { title: "论文发表数",     log: true  },
    "h19_ns":{ title: "h-index",       log: false }
  };

  var METRIC_ORDER = ["c_ns", "nc_ns", "np", "h19_ns"];
  var COL_G = COLORS.greece;
  var COL_A = COLORS.abroad;
  var V_W = 90;       // max half-width of violin
  var GAP = 20;
  var MARGIN = { top: 30, right: 40, bottom: 30, left: 40 };

  function gaussianKernel(x) {
    return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  }

  function kde(samples, bandwidth, evalPoints, xMin, xMax) {
    var n = samples.length;
    var step = (xMax - xMin) / (evalPoints - 1);
    var result = [];
    for (var i = 0; i < evalPoints; i++) {
      var x = xMin + i * step;
      var density = 0;
      for (var j = 0; j < n; j++) {
        density += gaussianKernel((x - samples[j]) / bandwidth);
      }
      density /= (n * bandwidth);
      result.push({ x: x, y: density });
    }
    return result;
  }

  function binsToSamples(edges, counts) {
    var samples = [];
    for (var i = 0; i < counts.length; i++) {
      var mid = (edges[i] + edges[i + 1]) / 2;
      for (var j = 0; j < counts[i]; j++) samples.push(mid);
    }
    return samples;
  }

  function densityAt(kdePoints, value) {
    if (!kdePoints.length) return 0;
    if (value <= kdePoints[0].x) return kdePoints[0].y;
    if (value >= kdePoints[kdePoints.length - 1].x) return kdePoints[kdePoints.length - 1].y;

    for (var i = 1; i < kdePoints.length; i++) {
      if (kdePoints[i].x >= value) {
        var prev = kdePoints[i - 1];
        var curr = kdePoints[i];
        var t = (value - prev.x) / (curr.x - prev.x || 1);
        return prev.y + (curr.y - prev.y) * t;
      }
    }
    return 0;
  }

  function formatMetricHoverValue(value, isLog) {
    var raw = isLog ? Math.pow(10, value) : value;
    if (!isFinite(raw)) return "";
    if (raw >= 100) return fmtNum(Math.round(raw));
    if (raw >= 10) return raw.toFixed(1);
    return raw.toFixed(2);
  }

  function initViolins() {
    loadData("distributions.json").then(function (data) {

      var svg = d3.select("#violins-svg");
      var totalBands = METRIC_ORDER.length;
      var bandW = V_W * 2 + GAP * 3;
      var chartW = totalBands * bandW;
      var chartH = 380;
      var totalW = chartW + MARGIN.left + MARGIN.right;
      var totalH = chartH + MARGIN.top + MARGIN.bottom;

      svg.attr("viewBox", "0 0 " + totalW + " " + totalH);
      svg.attr("preserveAspectRatio", "xMidYMid meet");
      svg.selectAll("*").remove();

      var chart = svg.append("g")
        .attr("transform", "translate(" + MARGIN.left + "," + MARGIN.top + ")");

      // Compute global max density across all metrics for consistent scaling
      var globalMaxDens = 0;

      METRIC_ORDER.forEach(function (key, mi) {
        var metric = data[key];
        if (!metric) return;

        var grcSamples, abrSamples, yDomain;
        var isLog = METRIC_META[key].log;

        grcSamples = binsToSamples(metric.greece.bin_edges, metric.greece.counts);
        abrSamples = binsToSamples(metric.abroad.bin_edges, metric.abroad.counts);

        if (isLog) {
          yDomain = d3.extent(metric.greece.bin_edges.concat(metric.abroad.bin_edges));
        } else {
          yDomain = d3.extent(
            metric.greece.bin_edges.concat(metric.abroad.bin_edges)
          );
        }

        var bandwidth = (yDomain[1] - yDomain[0]) / 25;
        var evalN = 200;
        var grcKDE = kde(grcSamples, bandwidth, evalN, yDomain[0], yDomain[1]);
        var abrKDE = kde(abrSamples, bandwidth, evalN, yDomain[0], yDomain[1]);

        var maxD = d3.max(grcKDE.concat(abrKDE), function (d) { return d.y; });
        if (maxD > globalMaxDens) globalMaxDens = maxD;
      });

      METRIC_ORDER.forEach(function (key, mi) {
        var metric = data[key];
        if (!metric) return;

        var isLog = METRIC_META[key].log;
        var grcMedian = metric.greece.median;
        var abrMedian = metric.abroad.median;

        var grcSamples = binsToSamples(metric.greece.bin_edges, metric.greece.counts);
        var abrSamples = binsToSamples(metric.abroad.bin_edges, metric.abroad.counts);

        var allEdges = metric.greece.bin_edges.concat(metric.abroad.bin_edges);
        var yDomain = d3.extent(allEdges);

        // Y scale: metric value   vertical position
        var yScale = d3.scaleLinear()
          .domain(yDomain)
          .range([chartH, 0]);

        // Bandwidth and KDE
        var bandwidth = (yDomain[1] - yDomain[0]) / 25;
        var grcKDE = kde(grcSamples, bandwidth, 200, yDomain[0], yDomain[1]);
        var abrKDE = kde(abrSamples, bandwidth, 200, yDomain[0], yDomain[1]);

        // X scale: density   horizontal offset from center
        var bandCenterX = mi * bandW + bandW / 2;
        var dScale = d3.scaleLinear()
          .domain([0, globalMaxDens])
          .range([0, V_W]);

        // Area generators (vertical: y=metric, x=density offset from center)
        var areaGrc = d3.area()
          .y(function (d) { return yScale(d.x); })
          .x0(bandCenterX)
          .x1(function (d) { return bandCenterX - dScale(d.y); })
          .curve(d3.curveCatmullRom.alpha(0.5));

        var areaAbr = d3.area()
          .y(function (d) { return yScale(d.x); })
          .x0(bandCenterX)
          .x1(function (d) { return bandCenterX + dScale(d.y); })
          .curve(d3.curveCatmullRom.alpha(0.5));

        // Draw Greece (left)
        chart.append("path")
          .datum(grcKDE)
          .attr("d", areaGrc)
          .attr("fill", COL_G)
          .attr("opacity", 0.55)
          .attr("stroke", COL_G)
          .attr("stroke-width", 1.0)
          .attr("stroke-linejoin", "round");

        // Draw Abroad (right)
        chart.append("path")
          .datum(abrKDE)
          .attr("d", areaAbr)
          .attr("fill", COL_A)
          .attr("opacity", 0.55)
          .attr("stroke", COL_A)
          .attr("stroke-width", 1.0)
          .attr("stroke-linejoin", "round");

        // Center line
        chart.append("line")
          .attr("x1", bandCenterX).attr("x2", bandCenterX)
          .attr("y1", 0).attr("y2", chartH)
          .attr("stroke", "#fff")
          .attr("stroke-width", 2.5);

        // Median markers
        [ { val: grcMedian, col: COL_G, dir: -1 },
          { val: abrMedian, col: COL_A, dir: 1 } ]
          .forEach(function (m) {
            var my = yScale(isLog ? Math.log10(m.val) : m.val);
            chart.append("line")
              .attr("x1", bandCenterX + m.dir * 4)
              .attr("x2", bandCenterX + m.dir * (V_W + 12))
              .attr("y1", my).attr("y2", my)
              .attr("stroke", m.col)
              .attr("stroke-width", 2)
              .attr("stroke-dasharray", "5 3")
              .attr("opacity", 0.7);
            chart.append("text")
              .attr("x", bandCenterX + m.dir * (V_W + 16))
              .attr("y", my + 4)
              .attr("text-anchor", m.dir > 0 ? "start" : "end")
              .attr("fill", m.col)
              .attr("font-size", "11px")
              .attr("font-family", "Inter, sans-serif")
              .attr("font-weight", "700")
              .text(isLog ? fmtNum(m.val) : m.val.toFixed(2));
          });

        // Title
        chart.append("text")
          .attr("x", bandCenterX).attr("y", -12)
          .attr("text-anchor", "middle")
          .attr("fill", COLORS.text)
          .attr("font-size", "13px")
          .attr("font-family", "Inter, sans-serif")
          .attr("font-weight", "600")
          .text(METRIC_META[key].title);

        // Y-axis ticks (every other metric to avoid clutter)
        var tickVals;
        if (isLog) {
          tickVals = [];
          for (var t = 0.5; t <= 4; t += 0.5) {
            var lv = Math.log10(t * 10);
            if (lv >= yDomain[0] && lv <= yDomain[1]) tickVals.push(lv);
          }
        } else {
          var step = (yDomain[1] - yDomain[0]) / 5;
          tickVals = [];
          for (var ti = 0; ti <= 5; ti++) {
            tickVals.push(yDomain[0] + ti * step);
          }
        }

        chart.selectAll(".ytick-" + mi)
          .data(tickVals)
          .enter()
          .append("line")
          .attr("x1", bandCenterX - V_W - 6).attr("x2", bandCenterX + V_W + 6)
          .attr("y1", function (d) { return yScale(d); })
          .attr("y2", function (d) { return yScale(d); })
          .attr("stroke", "#eee")
          .attr("stroke-width", 0.5);

        // Y labels (first metric only)
        if (mi === 0) {
          tickVals.forEach(function (tv) {
            var label = isLog ? fmtNum(Math.round(Math.pow(10, tv))) : tv.toFixed(1);
            chart.append("text")
              .attr("x", bandCenterX - V_W - 10)
              .attr("y", yScale(tv) + 4)
              .attr("text-anchor", "end")
              .attr("fill", COLORS.textLight)
              .attr("font-size", "10px")
              .attr("font-family", "Inter, sans-serif")
              .text(label);
          });
        }

        // Legend (first metric only)
        if (mi === 0) {
          var ly = chartH + 22;
          chart.append("circle").attr("cx", 20).attr("cy", ly)
            .attr("r", 5).attr("fill", COL_G).attr("opacity", 0.55);
          chart.append("text").attr("x", 32).attr("y", ly + 4)
            .attr("fill", COLORS.textSecondary).attr("font-size", "12px")
            .attr("font-family", "Inter, sans-serif").text("希腊");

          chart.append("circle").attr("cx", 80).attr("cy", ly)
            .attr("r", 5).attr("fill", COL_A).attr("opacity", 0.55);
          chart.append("text").attr("x", 92).attr("y", ly + 4)
            .attr("fill", COLORS.textSecondary).attr("font-size", "12px")
            .attr("font-family", "Inter, sans-serif").text("海外");

          chart.append("line").attr("x1", 150).attr("y1", ly - 3)
            .attr("x2", 190).attr("y2", ly - 3)
            .attr("stroke", COLORS.textSecondary).attr("stroke-width", 2)
            .attr("stroke-dasharray", "5 3").attr("opacity", 0.7);
          chart.append("text").attr("x", 196).attr("y", ly + 4)
            .attr("fill", COLORS.textSecondary).attr("font-size", "12px")
            .attr("font-family", "Inter, sans-serif").text("中位数");
        }

        var hoverX1 = bandCenterX - V_W - 6;
        var hoverX2 = bandCenterX + V_W + 6;
        var hoverLine = chart.append("line")
          .attr("class", "violin-hover-line")
          .attr("x1", hoverX1)
          .attr("x2", hoverX2)
          .attr("y1", 0)
          .attr("y2", 0)
          .attr("stroke", COLORS.highlight)
          .attr("stroke-width", 1.6)
          .attr("stroke-dasharray", "4 3")
          .attr("opacity", 0)
          .style("pointer-events", "none");

        var hoverGreeceSlice = chart.append("line")
          .attr("class", "violin-hover-slice")
          .attr("x1", bandCenterX)
          .attr("x2", bandCenterX)
          .attr("y1", 0)
          .attr("y2", 0)
          .attr("stroke", COL_G)
          .attr("stroke-width", 5)
          .attr("stroke-linecap", "round")
          .attr("opacity", 0)
          .style("pointer-events", "none");

        var hoverAbroadSlice = chart.append("line")
          .attr("class", "violin-hover-slice")
          .attr("x1", bandCenterX)
          .attr("x2", bandCenterX)
          .attr("y1", 0)
          .attr("y2", 0)
          .attr("stroke", COL_A)
          .attr("stroke-width", 5)
          .attr("stroke-linecap", "round")
          .attr("opacity", 0)
          .style("pointer-events", "none");

        var hoverValueBox = chart.append("g")
          .attr("class", "violin-hover-value")
          .attr("opacity", 0)
          .style("pointer-events", "none");

        hoverValueBox.append("rect")
          .attr("x", 0)
          .attr("y", -11)
          .attr("width", 58)
          .attr("height", 22)
          .attr("rx", 4)
          .attr("fill", "#fff")
          .attr("stroke", COLORS.highlight)
          .attr("stroke-width", 1)
          .attr("opacity", 0.96);

        hoverValueBox.append("text")
          .attr("class", "violin-hover-value-text")
          .attr("x", 29)
          .attr("y", 4)
          .attr("text-anchor", "middle")
          .attr("fill", COLORS.text)
          .attr("font-family", "Inter, Helvetica Neue, PingFang SC, sans-serif")
          .attr("font-size", "11px")
          .attr("font-weight", "700");

        chart.append("rect")
          .attr("class", "violin-hover-zone")
          .attr("x", hoverX1)
          .attr("y", 0)
          .attr("width", hoverX2 - hoverX1)
          .attr("height", chartH)
          .attr("fill", "transparent")
          .on("mouseenter", function () {
            hoverLine.attr("opacity", 0.9);
            hoverGreeceSlice.attr("opacity", 0.95);
            hoverAbroadSlice.attr("opacity", 0.95);
            hoverValueBox.attr("opacity", 1);
          })
          .on("mousemove", function (event) {
            var y = Math.max(0, Math.min(chartH, d3.pointer(event, chart.node())[1]));
            var value = yScale.invert(y);
            var gDensity = densityAt(grcKDE, value);
            var aDensity = densityAt(abrKDE, value);
            var leftX = bandCenterX - dScale(gDensity);
            var rightX = bandCenterX + dScale(aDensity);
            var labelX = Math.min(hoverX2 - 58, bandCenterX + V_W + 12);
            var labelY = Math.max(12, Math.min(chartH - 12, y));

            hoverLine
              .attr("y1", y)
              .attr("y2", y);
            hoverGreeceSlice
              .attr("x1", leftX)
              .attr("x2", bandCenterX)
              .attr("y1", y)
              .attr("y2", y);
            hoverAbroadSlice
              .attr("x1", bandCenterX)
              .attr("x2", rightX)
              .attr("y1", y)
              .attr("y2", y);
            hoverValueBox
              .attr("transform", "translate(" + labelX + "," + labelY + ")");
            hoverValueBox.select(".violin-hover-value-text")
              .text(formatMetricHoverValue(value, isLog));
          })
          .on("mouseleave", function () {
            hoverLine.attr("opacity", 0);
            hoverGreeceSlice.attr("opacity", 0);
            hoverAbroadSlice.attr("opacity", 0);
            hoverValueBox.attr("opacity", 0);
          });
      });

    }).catch(function (err) {
      console.error("violins.js:", err);
    });
  }

  setTimeout(initViolins, 200);
})();
