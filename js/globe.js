/* ═══════════════════════════════════════════
   globe.js — World Choropleth Map
   Greek Brain Drain · Data Visualization Project

   Projection: Equirectangular (matching reference)
   Features: click-to-select, country info panel, bar chart sync
   Default selection: Greece
   ═══════════════════════════════════════════ */

function initGlobe() {
  var inited = false;
  function doInit() {
    if (inited) return;
    inited = true;

    var svg = d3.select("#map-svg");
    var width = 960;
    var height = 500;

    /* We pad the map inside the SVG to leave room for the zoom effect */
    var pad = 12;

    Promise.all([
      loadData("world-110m.json"),
      loadData("countries.json"),
      loadData("new/country_profiles.json")
    ]).then(function (results) {

      var world = results[0];
      var countries = results[1];
      var profiles = results[2] || [];

      var worldFeatures = topojson.feature(world, world.objects.countries);

      /* ── Lookups ── */
      var lookup = {};
      countries.forEach(function (d) { lookup[d.code] = d; });

      var profileLookup = {};
      if (profiles.length) {
        profiles.forEach(function (p) { profileLookup[p.code] = p; });
      }

      /* ── Enrich GeoJSON ── */
      worldFeatures.features.forEach(function (feat) {
        var iso = geoNameToIso(feat.properties.name);
        feat._iso = iso;
        feat._data = lookup[iso] || null;
        feat._profile = profileLookup[iso] || null;
      });

      /* ── Projection: Equirectangular ── */
      var sphere = { type: "Sphere" };
      var proj = d3.geoEquirectangular()
        .fitExtent([[pad, pad], [width - pad, height - pad]], sphere);
      var path = d3.geoPath(proj);

      /* ── Ocean background ── */
      svg.append("path")
        .datum(sphere)
        .attr("d", path)
        .attr("fill", "#dce5ef");

      /* ── Colour scale ── */
      function makeColorScale(values, useLog) {
        var sorted = values.slice().sort(d3.ascending);
        var dMin = sorted[0], dMax = sorted[sorted.length - 1];
        if (dMin < 1) dMin = 1;
        if (dMax <= dMin) dMax = dMin + 1;
        var scaler;
        if (useLog) {
          var ls = d3.scaleLog().domain([dMin, dMax]).range([0, 1]).clamp(true);
          scaler = function (v) { return d3.interpolateBlues(0.15 + ls(v) * 0.80); };
        } else {
          var ls = d3.scaleLinear().domain([dMin, dMax]).range([0, 1]).clamp(true);
          scaler = function (v) { return d3.interpolateBlues(0.15 + ls(v) * 0.80); };
        }
        scaler._domain = [dMin, dMax];
        scaler._useLog = useLog;
        return scaler;
      }

      var nonGrcCounts = countries
        .filter(function (d) { return d.code !== "grc" && d.count > 0; })
        .map(function (d) { return d.count; });
      var mapColor = makeColorScale(nonGrcCounts, true);

      function countryFill(d) {
        if (!d._data) return "#e8ecf0";
        if (d._iso === "grc") return COLORS.greece;
        var val = getMetricValue(d);
        if (val == null || val <= 0) return "#e8ecf0";
        return mapColor(val);
      }

      /* ── Metric switching ── */
      var currentMetric = "scopus_total";

      function getMetricValue(d) {
        var pr = d._profile;
        if (!pr) return null;
        if (currentMetric === "scopus_total")     return pr.scopus_total;
        if (currentMetric === "median_nc9619_ns") return pr.median_nc9619_ns;
        if (currentMetric === "median_h19_ns")    return pr.median_h19_ns;
        if (currentMetric === "median_c_ns")      return pr.median_c_ns;
        return pr.scopus_total;
      }

      function onMetricChange(metric) {
        currentMetric = metric;
        var vals = [];
        worldFeatures.features.forEach(function (feat) {
          if (!feat._data || feat._iso === "grc") return;
          var pr = feat._profile;
          if (!pr || pr.scopus_total < 10) return;
          var v = getMetricValue(feat);
          if (v != null && v > 0) vals.push(v);
        });
        if (vals.length === 0) return;
        var useLog = currentMetric !== "median_c_ns";
        mapColor = makeColorScale(vals, useLog);

        /* Debug: dump country values & hex colours */
        function _rgbToHex(rgb) {
          if (!rgb || rgb[0] === "#") return rgb;
          var m = rgb.match(/[\d.]+/g);
          if (!m || m.length < 3) return rgb;
          return "#" + m.slice(0, 3).map(function (x) {
            var h = parseInt(x, 10).toString(16);
            return h.length === 1 ? "0" + h : h;
          }).join("");
        }
        console.log("=== metric:", currentMetric, "useLog:", useLog, "nVals:", vals.length, "===");
        ["usa","chn","gbr","deu","fra","aus","can"].forEach(function (code) {
          var feat = null;
          for (var i = 0; i < worldFeatures.features.length; i++) {
            if (worldFeatures.features[i]._iso === code) { feat = worldFeatures.features[i]; break; }
          }
          if (feat) {
            var v = getMetricValue(feat);
            var c = countryFill(feat);
            console.log(code, "val:", v, "fill:", c, " hex:", _rgbToHex(c));
          }
        });
        console.log("domain:", mapColor._domain, "vals range:", vals[0], "-", vals[vals.length-1]);

        /* Re-select ALL map paths directly from DOM to avoid any selection ref issue */
        svg.selectAll(".map-countries path")
          .interrupt()
          .attr("fill", function (d) { return countryFill(d); })
          .attr("opacity", 1)
          .attr("fill-opacity", 1);

        if (window.__mapBars__ && window.__mapBars__.onMetricChange) {
          window.__mapBars__.onMetricChange(currentMetric);
        }
        updateInfoPanel(selectedCode);
      }

      /* Wire up metric buttons */
      d3.selectAll(".metric-btn").on("click", function () {
        var btn = d3.select(this);
        var metric = btn.attr("data-metric");
        if (metric === currentMetric) return;
        d3.selectAll(".metric-btn").classed("active", false);
        btn.classed("active", true);
        onMetricChange(metric);
      });

      var selectedCode = null;
      var selectedPath = null;

      /* ══════════════════════════════════════
         1.  DRAW COUNTRIES
         ══════════════════════════════════════ */
      var countryPaths = svg.append("g")
        .attr("class", "map-countries")
        .selectAll("path")
        .data(worldFeatures.features)
        .enter()
        .append("path")
          .attr("d", path)
          .attr("data-code", function (d) { return d._iso || ""; })
          .attr("fill", function (d) { return countryFill(d); })
          .attr("stroke", "#FFFFFF")
          .attr("stroke-width", 0.5)
          .attr("opacity", 1)
          .attr("fill-opacity", 1)
          .attr("cursor", "pointer")
          .on("mouseover", function (event, d) {
            if (d._iso !== selectedCode) {
              d3.select(this)
                .attr("stroke", "#10325c")
                .attr("stroke-width", 1.2);
            }
            showCountryTooltip(event, d);
          })
          .on("mousemove", function (event) { moveTooltip(event); })
          .on("mouseleave", function () {
            var d = d3.select(this).datum();
            if (d._iso !== selectedCode) {
              d3.select(this).attr("stroke", "#FFFFFF").attr("stroke-width", 0.5);
            }
            hideTooltip();
          })
          .on("click", function (event, d) {
            event.stopPropagation();
            if (!d._data && d._iso !== "grc") return;
            if (selectedCode === d._iso) {
              /* Don't deselect USA — always keep one selected */
              if (d._iso !== "usa") clearSelection();
            } else {
              selectCountry(d._iso, /* fromBar */ false);
            }
          });

      /* ══════════════════════════════════════
         2.  TOP DESTINATION MAP LABELS
         ══════════════════════════════════════ */
      var topCodes = ["usa", "gbr", "deu", "cyp", "aus", "fra", "can", "che"];
      var labelOffsets = {
        usa: [0, 6], gbr: [-18, -12], deu: [26, -7], cyp: [36, 18],
        aus: [0, 18], fra: [-30, 16], can: [0, -10], che: [46, 10]
      };
      var labelData = [];

      topCodes.forEach(function (code) {
        var feat = null;
        for (var i = 0; i < worldFeatures.features.length; i++) {
          if (worldFeatures.features[i]._iso === code) { feat = worldFeatures.features[i]; break; }
        }
        if (feat && lookup[code]) {
          var centroid = path.centroid(feat);
          var offset = labelOffsets[code] || [0, 0];
          labelData.push({
            code: code, data: lookup[code],
            x: centroid[0] + offset[0], y: centroid[1] + offset[1]
          });
        }
      });

      /* ---- Map labels temporarily commented out ----
      var labelsG = svg.append("g").attr("class", "map-labels");
      var labelText = labelsG.selectAll("text").data(labelData).enter().append("text")
        .attr("class", "map-label")
        .attr("x", function (d) { return d.x; })
        .attr("y", function (d) { return d.y; })
        .attr("text-anchor", "middle")
        .attr("font-family", "Inter, Helvetica Neue, PingFang SC, Microsoft YaHei, sans-serif")
        .attr("fill", COLORS.text)
        .attr("paint-order", "stroke")
        .attr("stroke", "#FFFFFF")
        .attr("stroke-width", 4)
        .attr("stroke-linejoin", "round")
        .attr("opacity", 0);

      labelText.selectAll("tspan")
        .data(function (d) {
          return [
            { text: isoName(d.code), dy: 0, size: "14px", weight: "700" },
            { text: fmtNum(d.data.count) + " 人", dy: 15, size: "12px", weight: "500" }
          ];
        })
        .enter().append("tspan")
          .attr("x", function () { return d3.select(this.parentNode).attr("x"); })
          .attr("dy", function (d) { return d.dy; })
          .attr("font-size", function (d) { return d.size; })
          .attr("font-weight", function (d) { return d.weight; })
          .text(function (d) { return d.text; });

      labelText.transition()
        .delay(function (d, i) { return 1500 + i * 120; })
        .duration(600)
        .attr("opacity", 1);
      ---- End map labels ---- */

      /* ══════════════════════════════════════
         3.  COUNTRY INFO PANEL (always visible)
         ══════════════════════════════════════ */
      var infoName  = document.getElementById("info-country-name");
      var infoSub   = document.getElementById("info-country-sub");
      var infoTotal = document.getElementById("info-stat-total");
      var infoPct   = document.getElementById("info-stat-pct");
      var infoInst  = document.getElementById("info-stat-inst");
      var infoNc    = document.getElementById("info-stat-nc");
      var infoH     = document.getElementById("info-stat-h");
      var infoC     = document.getElementById("info-stat-c");

      function updateInfoPanel(code) {
        var sc = code ? lookup[code] : null;
        var pr = code ? profileLookup[code] : null;
        var name = code ? (isoName(code) || code.toUpperCase()) : "";

        infoName.textContent = name || "点击国家查看";

        if (!code) {
          infoSub.textContent = "";
          infoTotal.textContent = "—";
          infoPct.textContent = "—";
          infoInst.textContent = "—";
          infoNc.textContent = "—";
          infoH.textContent = "—";
          infoC.textContent = "—";
          removeTopInsts();
          return;
        }

        if (code === "grc") {
          infoSub.textContent = "来源国";
          infoTotal.textContent = pr ? fmtNum(pr.scopus_total) : (sc ? fmtNum(sc.count) : "—");
          infoPct.textContent = "—";
          infoInst.textContent = pr ? fmtNum(pr.institution_count) : "—";
        } else {
          infoSub.textContent = "目的国";
          infoTotal.textContent = pr ? fmtNum(pr.scopus_total) : (sc ? fmtNum(sc.count) : "—");
          infoPct.textContent = pr && pr.scopus_pct_overseas != null ? fmtPct(pr.scopus_pct_overseas) : "—";
          infoInst.textContent = pr ? fmtNum(pr.institution_count) : "—";
        }

        /* Median stats (both Greece and overseas) */
        infoNc.textContent = pr && pr.median_nc9619_ns != null ? fmtNum(pr.median_nc9619_ns) : "—";
        infoH.textContent  = pr && pr.median_h19_ns != null ? fmtNum(pr.median_h19_ns) : "—";
        infoC.textContent  = pr && pr.median_c_ns != null ? pr.median_c_ns.toFixed(2) : "—";

        /* Show top institutions from unified profile (xlsx inst_name) */
        renderTopInsts(pr);
      }

      function removeTopInsts() {
        var el = document.getElementById("info-top-insts");
        if (el) el.remove();
      }

      function renderTopInsts(pr) {
        removeTopInsts();
        if (!pr || !pr.top_institutions || !pr.top_institutions.length) return;
        var top3 = pr.top_institutions.slice(0, 3);
        var div = document.createElement("div");
        div.id = "info-top-insts";
        div.className = "info-top-insts";
        var label = document.createElement("span");
        label.className = "info-top-insts-label";
        label.textContent = "主要机构";
        div.appendChild(label);
        top3.forEach(function (inst) {
          var span = document.createElement("span");
          span.className = "info-inst-item";
          span.textContent = inst.name + " (" + inst.count + "人)";
          div.appendChild(span);
        });
        var statsEl = document.querySelector("#country-info-panel .info-stats");
        if (statsEl) statsEl.appendChild(div);
      }

      /* ══════════════════════════════════════
         3.  SELECTION LOGIC
         ══════════════════════════════════════ */
      function clearSelection() {
        selectedCode = null;
        selectedPath = null;
        countryPaths.transition().duration(200)
          .attr("stroke", "#FFFFFF")
          .attr("stroke-width", 0.5);
        updateInfoPanel("usa");  /* fall back to USA */
        if (window.__mapBars__ && window.__mapBars__.clearSelection) {
          window.__mapBars__.clearSelection();
        }
      }

      function selectCountry(code, fromBar) {
        /* Clear previous selection */
        selectedCode = null;
        selectedPath = null;
        countryPaths.transition().duration(200)
          .attr("stroke", "#FFFFFF")
          .attr("stroke-width", 0.5);

        selectedCode = code;
        selectedPath = countryPaths.filter(function (d) { return d._iso === code; });

        /* Dark outline emphasis — matching A组's "black stroke" style */
        selectedPath
          .raise()
          .transition().duration(200)
          .attr("stroke", "#1a1a1a")
          .attr("stroke-width", 1.8);
        /* labelsG.raise(); */

        updateInfoPanel(code);

        /* Sync bars only if not already triggered from bars */
        if (!fromBar && window.__mapBars__ && window.__mapBars__.selectCountry) {
          window.__mapBars__.selectCountry(code);
        }
      }

      /* Expose API */
      window.__globe__ = {
        selectCountry: function (code) { selectCountry(code, true); },
        clearSelection: clearSelection,
        getSelectedCode: function () { return selectedCode; }
      };

      /* Click ocean → back to USA (never fully deselect) */
      svg.on("click", function (event) {
        if (event.target === svg.node() && selectedCode !== "usa") {
          selectCountry("usa", false);
        }
      });

      /* ══════════════════════════════════════
         4.  TOOLTIP
         ══════════════════════════════════════ */
      var METRIC_TOOLTIP = {
        median_nc9619_ns: { label: "被引次数中位数", fmt: function(v) { return fmtNum(v); } },
        median_h19_ns:    { label: "h 指数中位数",   fmt: function(v) { return fmtNum(v); } },
        median_c_ns:      { label: "综合评分中位数", fmt: function(v) { return v != null ? v.toFixed(2) : "—"; } }
      };

      function showCountryTooltip(event, d) {
        var name = isoName(d._iso) || d.properties.name;
        var pr = d._profile;
        var html = "<strong>" + name + "</strong>";
        if (d._iso === "grc") {
          html += "<br>科学家: " + fmtNum(pr ? pr.scopus_total : (d._data ? d._data.count : 0));
          html += "<br>占全部希腊科学家: " + (pr ? fmtPct(pr.scopus_pct_total) : (d._data ? fmtPct(d._data.pct) : "—"));
          if (pr) html += "<br>机构数: " + fmtNum(pr.institution_count);
          html += "<br><span style='color:#999;font-size:11px'>来源国 · 点击国家切换</span>";
        } else if (d._data) {
          html += "<br>科学家: " + fmtNum(pr ? pr.scopus_total : d._data.count);
          html += "<br>占海外比例: " + (pr && pr.scopus_pct_overseas != null ? fmtPct(pr.scopus_pct_overseas) : "—");
          /* If viewing a non-count metric, show its value */
          if (currentMetric !== "scopus_total" && pr) {
            var mt = METRIC_TOOLTIP[currentMetric];
            if (mt) {
              var val = pr[currentMetric];
              if (val != null) html += "<br>" + mt.label + ": <strong>" + mt.fmt(val) + "</strong>";
            }
          }
          html += "<br><span style='color:#999;font-size:11px'>点击查看详情</span>";
        } else {
          html += "<br>无数据";
        }
        showTooltip(html);
        moveTooltip(event);
      }

      /* ── Default: select USA ── */
      setTimeout(function () {
        selectCountry("usa", false);
        if (window.__mapBars__) {
          if (window.__mapBars__.initDraw) {
            window.__mapBars__.initDraw();
          }
        }
      }, 600);

      /* ── Force re-colour after all animations settle, to fix race condition ── */
      setTimeout(function () {
        svg.selectAll(".map-countries path")
          .attr("fill", function (d) { return countryFill(d); })
          .attr("opacity", 1)
          .attr("fill-opacity", 1);
      }, 2200);

    }).catch(function (err) {
      console.error("globe.js: Failed to load map data —", err);
    });
  }

  setTimeout(doInit, 200);
}

function escapeHtml(str) {
  var d = document.createElement("div");
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
}

/* ---- Boot ---- */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initGlobe);
} else {
  initGlobe();
}
