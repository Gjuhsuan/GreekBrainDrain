/* ═══════════════════════════════════════════
   scatter.js — Section 6: Productivity vs Impact Scatter
   Greek Brain Drain · Data Visualization Project
   ═══════════════════════════════════════════ */

/**
 * Log-log scatter plot with hand-written OLS regression lines.
 * Three cohort toggle buttons: all / pre2000 / post2000.
 * Hover enlarges point + shows tooltip.
 */
function initScatter() {
  observeSection("productivity", function () {

    /* ── Constants ── */
    var margin  = { top: 20, right: 30, bottom: 50, left: 60 };
    var width   = 560 - margin.left - margin.right;
    var height  = 560 - margin.top - margin.bottom;

    /* ── SVG setup ── */
    var svg = d3.select("#scatter-svg")
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    /* ── Clip path to keep points inside chart ── */
    svg.append("defs").append("clipPath")
        .attr("id", "scatter-clip")
      .append("rect")
        .attr("width", width)
        .attr("height", height);

    /* ── Grid + axis group ── */
    var gridG   = svg.append("g").attr("class", "grid");
    var axisG   = svg.append("g");
    var lineG   = svg.append("g");
    var pointG  = svg.append("g").attr("clip-path", "url(#scatter-clip)");

    /* ── Scales ── */
    var x = d3.scaleLog()
      .domain([5, 3000])
      .range([0, width]);

    var y = d3.scaleLog()
      .domain([1, 100000])
      .range([height, 0]);

    /* ── Grid lines ── */
    var xTicks = [5, 10, 20, 50, 100, 200, 500, 1000, 2000];
    var yTicks = [1, 10, 100, 1000, 10000, 100000];

    gridG.selectAll("line.xgrid")
      .data(xTicks).enter()
      .append("line")
        .attr("class", "grid-line")
        .attr("x1", function (d) { return x(d); })
        .attr("x2", function (d) { return x(d); })
        .attr("y1", 0)
        .attr("y2", height);

    gridG.selectAll("line.ygrid")
      .data(yTicks).enter()
      .append("line")
        .attr("class", "grid-line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", function (d) { return y(d); })
        .attr("y2", function (d) { return y(d); });

    /* ── Axes ── */
    var xAxis = d3.axisBottom(x)
      .tickValues(xTicks)
      .tickFormat(d3.format("d"));

    var yAxis = d3.axisLeft(y)
      .tickValues(yTicks)
      .tickFormat(d3.format("d"));

    axisG.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis)
      .selectAll("text")
        .style("font-size","11px");

    axisG.append("g")
        .attr("class", "axis")
        .call(yAxis)
      .selectAll("text")
        .style("font-size","11px");

    /* ── Axis labels ── */
    svg.append("text")
      .attr("class", "axis-label")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", height + 40)
      .text("论文数量（对数尺度）");

    svg.append("text")
      .attr("class", "axis-label")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -45)
      .text("排除自引后的总被引次数（对数尺度）");

    /* ── Legend ── */
    var legend = svg.append("g")
      .attr("transform", "translate(" + (width - 120) + ",10)")
      .attr("font-size", "12px")
      .attr("font-family", "'Inter',sans-serif");

    legend.append("circle").attr("cx",0).attr("cy",0).attr("r",4).attr("fill",COLORS.greece);
    legend.append("text").attr("x",10).attr("y",4).text("留在希腊").attr("fill",COLORS.textSecondary);
    legend.append("circle").attr("cx",0).attr("cy",18).attr("r",4).attr("fill",COLORS.abroad);
    legend.append("text").attr("x",10).attr("y",22).text("在海外").attr("fill",COLORS.textSecondary);

    /* ── State ── */
    var currentCohort = "all";
    var allData = [];

    /* ════════════════ OLS REGRESSION ════════════════ */
    function computeOLS(data) {
      if (data.length < 3) return null;
      var n = data.length;
      var sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
      data.forEach(function (d) {
        var lx = Math.log(d.n);
        var ly = Math.log(d.c);
        sumX  += lx;
        sumY  += ly;
        sumXY += lx * ly;
        sumX2 += lx * lx;
      });
      var meanX = sumX / n;
      var meanY = sumY / n;
      var slope = (sumXY - n * meanX * meanY) / (sumX2 - n * meanX * meanX);
      var intercept = meanY - slope * meanX;

      /* R-squared */
      var ssRes = 0, ssTot = 0;
      data.forEach(function (d) {
        var lx = Math.log(d.n);
        var ly = Math.log(d.c);
        var pred = intercept + slope * lx;
        ssRes += (ly - pred) * (ly - pred);
        ssTot += (ly - meanY) * (ly - meanY);
      });
      var r2 = 1 - ssRes / ssTot;
      var r = Math.sqrt(Math.max(0, r2));

      return {
        slope: slope,
        intercept: intercept,
        r: r,
        r2: r2,
        xDomain: [Math.min.apply(null, data.map(function(d){return d.n;})), Math.max.apply(null, data.map(function(d){return d.n;}))]
      };
    }

    function drawRegressionLine(g, ols, color, dasharray) {
      /* Draw line from actual data min x to max x, on log scale */
      /* But for visual consistency, draw across the chart domain */
      var xMin = 5, xMax = 3000;
      var pts = [];
      for (var i = 0; i <= 100; i++) {
        var t = i / 100;
        var xv = xMin + t * (xMax - xMin);
        var yv = Math.exp(ols.intercept + ols.slope * Math.log(xv));
        pts.push([xv, yv]);
      }

      var line = d3.line()
        .x(function (d) { return x(d[0]); })
        .y(function (d) { return y(d[1]); });

      g.append("path")
        .datum(pts)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 1.8)
        .attr("stroke-dasharray", dasharray || "none")
        .attr("opacity", 0.8)
        .attr("d", line);
    }

    /* ════════════════ DRAW ════════════════ */
    function draw(cohort) {
      /* Filter data */
      var filtered = allData;
      if (cohort === "pre2000") {
        filtered = allData.filter(function (d) { return d.ch === "pre2000"; });
      } else if (cohort === "post2000") {
        filtered = allData.filter(function (d) { return d.ch === "post2000"; });
      }

      /* Clear previous */
      lineG.selectAll("*").remove();

      /* Split by group */
      var greeceData = filtered.filter(function (d) { return d.g === "greece"; });
      var abroadData = filtered.filter(function (d) { return d.g === "abroad"; });

      /* Compute OLS for each group */
      var olsG = computeOLS(greeceData);
      var olsA = computeOLS(abroadData);

      /* Draw regression lines */
      var t = svg.transition().duration(500).ease(d3.easeCubicInOut);

      if (olsG) drawRegressionLine(lineG, olsG, COLORS.greece, "5,3");
      if (olsA) drawRegressionLine(lineG, olsA, COLORS.abroad, "none");

      /* ── Update points ── */
      var greeceSel = pointG.selectAll("circle.greece")
        .data(greeceData, function (d, i) { return "g_" + i; });

      var abroadSel = pointG.selectAll("circle.abroad")
        .data(abroadData, function (d, i) { return "a_" + i; });

      /* Enter + update Greece */
      greeceSel.enter()
        .append("circle")
          .attr("class", "greece")
          .attr("r", 0.1)
          .attr("fill", "rgba(27,107,147,0.3)")
          .attr("stroke", "none")
          .attr("cx", function (d) { return x(d.n); })
          .attr("cy", function (d) { return y(d.c); })
        .merge(greeceSel)
          .transition(t)
          .attr("r", 2.5)
          .attr("opacity", 1)
          .attr("cx", function (d) { return x(d.n); })
          .attr("cy", function (d) { return y(d.c); });

      /* Enter + update Abroad */
      abroadSel.enter()
        .append("circle")
          .attr("class", "abroad")
          .attr("r", 0.1)
          .attr("fill", "rgba(232,93,42,0.3)")
          .attr("stroke", "none")
          .attr("cx", function (d) { return x(d.n); })
          .attr("cy", function (d) { return y(d.c); })
        .merge(abroadSel)
          .transition(t)
          .attr("r", 2.5)
          .attr("opacity", 1)
          .attr("cx", function (d) { return x(d.n); })
          .attr("cy", function (d) { return y(d.c); });

      /* Exit — fade out */
      greeceSel.exit()
        .transition(t)
        .attr("opacity", 0)
        .attr("r", 0.1)
        .remove();

      abroadSel.exit()
        .transition(t)
        .attr("opacity", 0)
        .attr("r", 0.1)
        .remove();

      /* ── Update stats panel ── */
      if (olsG && olsA) {
        d3.select("#scatter-stats").html(
          '<p>篇均引用（中位数）：<span class="n-greece">本土 '
          + (median(greeceData.map(function(d){return d.c/d.n;})).toFixed(1))
          + '</span>，<span class="n-abroad">海外 '
          + (median(abroadData.map(function(d){return d.c/d.n;})).toFixed(1))
          + '</span></p>'
          + '<p>相关系数（本土）：r = ' + olsG.r.toFixed(3) + '</p>'
          + '<p>相关系数（海外）：r = ' + olsA.r.toFixed(3) + '</p>'
        );
      }
    }

    function median(arr) {
      var sorted = arr.slice().sort(d3.ascending);
      var mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }

    /* ════════════════ HOVER ════════════════ */
    pointG.on("mouseover", function (event) {
        var target = event.target;
        if (target.tagName !== "circle") return;
        var d = d3.select(target).datum();
        if (!d) return;

        d3.select(target)
          .transition().duration(150)
          .attr("r", 6)
          .attr("fill", function () {
            return d.g === "greece" ? COLORS.greece : COLORS.abroad;
          })
          .attr("stroke", "#fff")
          .attr("stroke-width", 1.5);

        showTooltip(
          '<div style="font-weight:700;margin-bottom:4px">'
          + (d.s || "未知领域") + '</div>'
          + '论文数：<strong>' + fmtNum(d.n) + '</strong><br>'
          + '被引次数：<strong>' + fmtNum(d.c) + '</strong><br>'
          + '世代：<strong>' + (d.ch === "pre2000" ? "2000年前" : "2000年后") + '</strong>'
        );
      })
      .on("mousemove", function (event) {
        moveTooltip(event);
      })
      .on("mouseout", function (event) {
        var target = event.target;
        if (target.tagName !== "circle") return;
        var d = d3.select(target).datum();

        d3.select(target)
          .transition().duration(300)
          .attr("r", 2.5)
          .attr("fill", d.g === "greece" ? "rgba(27,107,147,0.3)" : "rgba(232,93,42,0.3)")
          .attr("stroke", "none");

        hideTooltip();
      });

    /* ════════════════ TOGGLE BUTTONS ════════════════ */
    function setCohort(cohort) {
      currentCohort = cohort;
      d3.selectAll("#productivity .btn-toggle")
        .classed("active", function () {
          return d3.select(this).attr("data-cohort") === cohort;
        });
      draw(cohort);
    }

    d3.selectAll("#productivity .btn-toggle")
      .on("click", function () {
        setCohort(d3.select(this).attr("data-cohort"));
      });

    /* ── Inline text links trigger cohort switch ── */
    d3.selectAll("#productivity a[data-cohort]")
      .on("click", function () {
        d3.event.preventDefault();
        setCohort(d3.select(this).attr("data-cohort"));
      });

    /* ════════════════ LOAD & INIT ════════════════ */
    loadData("scatter_sample.json").then(function (data) {
      allData = data.filter(function (d) {
        return d.n >= 5 && d.n <= 3000 && d.c >= 1 && d.c <= 100000;
      });
      draw("all");
    });

  }); /* end observeSection */
}

/* ---- Boot ---- */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initScatter);
} else {
  initScatter();
}
