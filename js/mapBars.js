/* ═══════════════════════════════════════════
   mapBars.js — Horizontal bar chart for top
   destination countries, synced with the map.
   Supports metric switching (total / citations / h-index / composite).
   Greek Brain Drain · Data Visualization Project
   ═══════════════════════════════════════════ */

var METRIC_LABELS = {
  scopus_total:      { name: "科学家总数", unit: " 人", fmt: fmtNum, showPct: true },
  median_nc9619_ns:  { name: "被引次数中位数", unit: "", fmt: fmtNum, showPct: false },
  median_h19_ns:     { name: "h 指数中位数", unit: "", fmt: fmtNum, showPct: false },
  median_c_ns:       { name: "综合评分中位数", unit: "", fmt: function(v) { return v != null ? v.toFixed(2) : "—"; }, showPct: false }
};

function initMapBars() {
  var svg = d3.select("#map-bars-svg");
  if (svg.empty()) return;

  var selectedCode = null;
  var barGroups = null;
  var barData = null;       // top-10 for current metric
  var allProfiles = null;   // all non-grc profiles (for re-sort)
  var currentMetric = "scopus_total";

  /* Match map height dynamically */
  function getLayout() {
    var mapSvgEl = document.getElementById("map-svg");
    var barSvgEl = document.getElementById("map-bars-svg");
    var mapHeight = mapSvgEl ? mapSvgEl.getBoundingClientRect().height : 500;
    var barWidth  = barSvgEl ? barSvgEl.getBoundingClientRect().width  : 280;
    if (mapHeight < 20) mapHeight = 500;
    if (barWidth  < 20) barWidth  = 280;
    var vbH = 500;
    var vbW = Math.round(barWidth * vbH / mapHeight);
    return { vbW: vbW, vbH: vbH, barWidth: barWidth, mapHeight: mapHeight };
  }

  function computeMargin(vbW) {
    return { top: 16, right: 50, bottom: 16, left: Math.round(vbW * 0.18) };
  }

  function getBarValue(d) {
    return d[currentMetric];
  }

  function refreshBarData(metric) {
    currentMetric = metric;
    /* Always top-10 by scopus_total, fixed order */
    barData = allProfiles
      .filter(function (d) { return d.scopus_total > 0; })
      .sort(function (a, b) { return b.scopus_total - a.scopus_total; })
      .slice(0, 10);
  }

  loadData("new/country_profiles.json").then(function (profiles) {

    allProfiles = profiles.filter(function (d) { return !d.is_greece; });
    refreshBarData("scopus_total");

    /* ── Defer first draw until map is ready ── */
    window.__mapBars__ = window.__mapBars__ || {};
    window.__mapBars__.initDraw = function () {
      if (barData) syncAndRedraw();
    };

    /* ── Metric change handler (called by globe.js) ── */
    window.__mapBars__.onMetricChange = function (metric) {
      refreshBarData(metric);
      drawBars();  /* redraw content only, don't touch SVG dimensions */
    };

    /* ── Resize handler ── */
    var resizeTimer = null;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { syncAndRedraw(); }, 250);
    });

    /* ── Fallback ── */
    setTimeout(function () {
      if (barData && svg.selectAll("*").empty()) {
        syncAndRedraw();
      }
    }, 2000);

  }).catch(function (err) {
    console.warn("mapBars.js: data load failed —", err.message);
  });

  /* ═══════════════════════════════════════════
     syncAndRedraw
     ═══════════════════════════════════════════ */
  function syncAndRedraw() {
    if (!barData || !barData.length) return;
    var layout = getLayout();
    var barSvgEl = document.getElementById("map-bars-svg");
    if (barSvgEl) {
      barSvgEl.setAttribute("viewBox", "0 0 " + layout.vbW + " " + layout.vbH);
      barSvgEl.style.height = layout.mapHeight + "px";
    }
    drawBars();
  }

  /* ═══════════════════════════════════════════
     drawBars
     ═══════════════════════════════════════════ */
  function drawBars() {
    var layout = getLayout();
    var vbW = layout.vbW;
    var vbH = layout.vbH;
    var margin = computeMargin(vbW);
    var innerW = vbW - margin.left - margin.right;
    var innerH = vbH - margin.top - margin.bottom;

    var meta = METRIC_LABELS[currentMetric] || METRIC_LABELS.scopus_total;
    var maxVal = d3.max(barData, getBarValue);

    var y = d3.scaleBand()
      .domain(barData.map(function (d) { return d.code; }))
      .range([0, innerH])
      .padding(0.14);

    var x = d3.scaleLinear()
      .domain([0, maxVal * 1.02])
      .range([0, innerW]);

    svg.selectAll("*").remove();
    var g = svg.append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    barGroups = g.selectAll("g.bar-group")
      .data(barData)
      .enter()
      .append("g")
        .attr("class", "bar-group")
        .attr("data-code", function (d) { return d.code; })
        .attr("transform", function (d) { return "translate(0," + y(d.code) + ")"; })
        .style("cursor", "pointer");

    var barH = y.bandwidth() * 0.85;
    var barY = y.bandwidth() * 0.075;
    var fsLabel = Math.max(13, Math.round(vbW * 0.028));
    var fsCount = Math.max(13, Math.round(vbW * 0.026));
    var fsPct   = Math.max(11, Math.round(vbW * 0.018));

    /* Country name (left of bar) */
    barGroups.append("text")
      .attr("class", "bar-label")
      .attr("x", -6)
      .attr("y", y.bandwidth() / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "end")
      .attr("fill", COLORS.text)
      .attr("font-family", "Inter, Helvetica Neue, PingFang SC, Microsoft YaHei, sans-serif")
      .attr("font-size", fsLabel + "px")
      .attr("font-weight", "600")
      .text(function (d) { return isoName(d.code); });

    /* Invisible hover bg */
    barGroups.append("rect")
      .attr("class", "bar-bg")
      .attr("x", 0).attr("y", 0)
      .attr("width", innerW)
      .attr("height", y.bandwidth())
      .attr("fill", "transparent");

    /* Bar fill */
    barGroups.append("rect")
      .attr("class", "bar-fill")
      .attr("x", 0)
      .attr("y", barY)
      .attr("width", 0)
      .attr("height", barH)
      .attr("rx", 3)
      .attr("fill", COLORS.greece)
      .attr("opacity", 0.85)
      .transition()
      .delay(function (d, i) { return i * 50; })
      .duration(500)
      .attr("width", function (d) { return x(getBarValue(d)); });

    /* Value text (right of bar) */
    barGroups.append("text")
      .attr("class", "bar-count")
      .attr("x", function (d) { return x(getBarValue(d)) + 10; })
      .attr("y", y.bandwidth() / 2)
      .attr("dy", "0.35em")
      .attr("fill", COLORS.text)
      .attr("font-family", "Inter, Helvetica Neue, PingFang SC, Microsoft YaHei, sans-serif")
      .attr("font-size", fsCount + "px")
      .attr("font-weight", "700")
      .attr("font-variant-numeric", "tabular-nums")
      .text(function (d) { return meta.fmt(getBarValue(d)) + meta.unit; });

    /* Percentage (only for scopus_total) */
    if (meta.showPct) {
      barGroups.append("text")
        .attr("class", "bar-pct")
        .attr("x", function (d) { return x(getBarValue(d)) + 10; })
        .attr("y", y.bandwidth() / 2)
        .attr("dy", "1.5em")
        .attr("fill", COLORS.textLight)
        .attr("font-family", "Inter, Helvetica Neue, PingFang SC, Microsoft YaHei, sans-serif")
        .attr("font-size", fsPct + "px")
        .attr("font-weight", "400")
        .text(function (d) { return fmtPct(d.scopus_pct_overseas); });
    }

    /* ══════════════════════════════════════
       INTERACTION
       ══════════════════════════════════════ */
    barGroups
      .on("mouseover", function (event, d) {
        if (d.code !== selectedCode) {
          d3.select(this).select(".bar-fill").transition().duration(150)
            .attr("fill", "#0d4f75").attr("opacity", 1);
        }
        var tip = "<strong>" + isoName(d.code) + "</strong><br>"
          + meta.name + ": <strong>" + meta.fmt(getBarValue(d)) + meta.unit + "</strong>";
        if (currentMetric === "scopus_total") {
          tip += "<br>占海外比例: " + fmtPct(d.scopus_pct_overseas);
          if (d.flow_count) tip += "<br>从希腊直接流入: " + fmtNum(d.flow_count) + " 人";
        }
        tip += "<br><span style='color:#999;font-size:11px'>点击在地图上查看</span>";
        showTooltip(tip);
        moveTooltip(event);
      })
      .on("mousemove", function (event) { moveTooltip(event); })
      .on("mouseleave", function () {
        var d = d3.select(this).datum();
        if (d.code !== selectedCode) {
          d3.select(this).select(".bar-fill").transition().duration(150)
            .attr("fill", COLORS.greece).attr("opacity", 0.85);
        }
        hideTooltip();
      })
      .on("click", function (event, d) {
        var globe = window.__globe__;
        if (!globe) return;
        if (selectedCode === d.code) {
          applyBarSelection(null);
          globe.clearSelection();
        } else {
          applyBarSelection(d.code);
          globe.selectCountry(d.code);
        }
      });

    /* ── Visual selection ── */
    function applyBarSelection(code) {
      selectedCode = code;
      barGroups.select(".bar-fill")
        .transition().duration(200)
        .attr("fill", function (d) {
          return (code && d.code === code) ? "#08306b" : COLORS.greece;
        })
        .attr("opacity", function (d) {
          return (code && d.code === code) ? 1 : 0.85;
        });
      barGroups.select(".bar-label")
        .transition().duration(200)
        .attr("fill", COLORS.text);
    }

    window.__mapBars__.clearSelection = function () { applyBarSelection(null); };
    window.__mapBars__.selectCountry = function (code) { applyBarSelection(code); };
  }
}

/* ---- Boot ---- */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initMapBars);
} else {
  initMapBars();
}
