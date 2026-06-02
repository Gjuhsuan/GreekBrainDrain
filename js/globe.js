/* ═══════════════════════════════════════════
   globe.js — Section 2: World Choropleth Map
   Greek Brain Drain · Data Visualization Project
   ═══════════════════════════════════════════ */

/**
 * Initialize the global choropleth map.
 * Called automatically on DOMContentLoaded.
 */
function initGlobe() {
  var inited = false;
  function doInit() {
    if (inited) return;
    inited = true;

    var svg = d3.select("#map-svg");
    var width = 960;
    var height = 500;

    Promise.all([
      loadData("world-110m.json"),
      loadData("countries.json")
    ]).then(function (results) {

      var world = results[0];     /* TopoJSON Topology */
      var countries = results[1]; /* ISO   count lookup */

      /* Convert TopoJSON   GeoJSON FeatureCollection */
      var worldFeatures = topojson.feature(world, world.objects.countries);

      /* ── Build ISO-code   country-data lookup ── */
      var lookup = {};
      countries.forEach(function (d) {
        lookup[d.code] = d;
      });

      /* ── Enrich every GeoJSON feature with scientist data ── */
      worldFeatures.features.forEach(function (feat) {
        var iso = geoNameToIso(feat.properties.name);
        feat._iso = iso;
        feat._data = lookup[iso] || null;
      });

      /* ── Projection & path generator ── */
      var proj = d3.geoNaturalEarth1().fitSize([width, height], worldFeatures);
      var path = d3.geoPath(proj);

      /* ── Choropleth colour scale: deeper blue means more scientists ── */
      var colorScale = d3.scaleSequentialLog(d3.interpolateBlues)
        .domain([1, 9339]);
      var selectedCode = null;
      var selectedPath = null;

      /* ══════════════════════════════════════
         1.  DRAW COUNTRIES (choropleth)
         ══════════════════════════════════════ */
      var countryPaths = svg.append("g")
        .attr("class", "map-countries")
        .selectAll("path")
        .data(worldFeatures.features)
        .enter()
        .append("path")
          .attr("d", path)
          .attr("data-code", function (d) { return d._iso || ""; })
          .attr("fill", function (d) {
            if (d._iso === "grc") return COLORS.greece;
            if (!d._data) return "#F0F0F0";
            return colorScale(d._data.count);
          })
          .attr("stroke", "#FFFFFF")
          .attr("stroke-width", 0.5)
          .attr("opacity", 0)
          .on("mouseover", function (event, d) {
            if (d._iso !== selectedCode) {
              d3.select(this)
                .attr("stroke", COLORS.highlight)
                .attr("stroke-width", 2);
            }
            showCountryTooltip(event, d);
          })
          .on("mousemove", function (event) {
            moveTooltip(event);
          })
          .on("mouseleave", function () {
            var d = d3.select(this).datum();
            if (d._iso !== selectedCode) {
              d3.select(this)
                .attr("stroke", "#FFFFFF")
                .attr("stroke-width", 0.5);
            }
            hideTooltip();
          });

      /* Staggered fade-in for countries */
      countryPaths
        .transition()
        .delay(function (d, i) { return i * 3; })
        .duration(800)
        .attr("opacity", 1);

      /* ══════════════════════════════════════
         2.  TOP DESTINATION LABELS
         ══════════════════════════════════════ */
      var topCodes = ["usa", "gbr", "deu", "cyp", "aus", "fra", "can", "che"];
      var labelOffsets = {
        usa: [0, 6],
        gbr: [-18, -12],
        deu: [26, -7],
        cyp: [36, 18],
        aus: [0, 18],
        fra: [-30, 16],
        can: [0, -10],
        che: [46, 10]
      };
      var labelData = [];

      topCodes.forEach(function (code) {
        var feat = null;
        for (var i = 0; i < worldFeatures.features.length; i++) {
          if (worldFeatures.features[i]._iso === code) {
            feat = worldFeatures.features[i];
            break;
          }
        }
        if (feat && lookup[code]) {
          var centroid = path.centroid(feat);
          var offset = labelOffsets[code] || [0, 0];
          labelData.push({
            code: code,
            data: lookup[code],
            x: centroid[0] + offset[0],
            y: centroid[1] + offset[1]
          });
        }
      });

      var labelsG = svg.append("g").attr("class", "map-labels");
      var labelText = labelsG.selectAll("text")
        .data(labelData)
        .enter()
        .append("text")
          .attr("class", "map-label")
          .attr("x", function (d) { return d.x; })
          .attr("y", function (d) { return d.y; })
          .attr("text-anchor", "middle")
          .attr("font-family", "Inter, Helvetica Neue, PingFang SC, sans-serif")
          .attr("fill", COLORS.text)
          .attr("paint-order", "stroke")
          .attr("stroke", "#FFFFFF")
          .attr("stroke-width", 4)
          .attr("stroke-linejoin", "round")
          .attr("opacity", 0);

      labelText.selectAll("tspan")
          .data(function (d) {
            return [
              { text: isoName(d.code), dy: 0, size: "11px", weight: "700" },
              { text: fmtNum(d.data.count) + " 人", dy: 13, size: "10px", weight: "500" }
            ];
          })
          .enter()
          .append("tspan")
            .attr("x", function () { return d3.select(this.parentNode).attr("x"); })
            .attr("dy", function (d) { return d.dy; })
            .attr("font-size", function (d) { return d.size; })
            .attr("font-weight", function (d) { return d.weight; })
            .text(function (d) { return d.text; });

      labelText
          .transition()
          .delay(function (d, i) { return 1500 + i * 120; })
          .duration(600)
          .attr("opacity", 1);

      wireTableInteraction();

      /* ══════════════════════════════════════
         3.  TABLE-TO-MAP HIGHLIGHT
         ══════════════════════════════════════ */
      function wireTableInteraction() {
        var rows = d3.selectAll("#map-table tbody tr");
        rows.on("click", function () {
          var code = this.getAttribute("data-code");
          if (!code) return;
          if (selectedCode === code) {
            clearSelection();
          } else {
            selectCountry(code);
          }
        });
      }

      function clearSelection() {
        selectedCode = null;
        selectedPath = null;
        countryPaths
          .transition()
          .duration(250)
          .attr("transform", null)
          .attr("stroke", "#FFFFFF")
          .attr("stroke-width", 0.5)
          .attr("filter", null);
        d3.selectAll("#map-table tbody tr").classed("row-selected", false);
      }

      function selectCountry(code) {
        clearSelection();
        selectedCode = code;
        selectedPath = countryPaths.filter(function (d) { return d._iso === code; });
        var datum = selectedPath.datum();
        if (!datum) return;
        var c = path.centroid(datum);
        selectedPath
          .raise()
          .transition()
          .duration(280)
          .attr("transform", "translate(" + c[0] + "," + c[1] + ") scale(1.18) translate(" + (-c[0]) + "," + (-c[1]) + ")")
          .attr("stroke", COLORS.highlight)
          .attr("stroke-width", 3)
          .attr("filter", "drop-shadow(0 5px 7px rgba(0,0,0,0.28))");
        labelsG.raise();
        d3.selectAll("#map-table tbody tr")
          .classed("row-selected", function () {
            return this.getAttribute("data-code") === code;
          });
      }

      /* ══════════════════════════════════════
         4.  TOOLTIP HELPERS
         ══════════════════════════════════════ */

      /** Show tooltip when hovering a country path */
      function showCountryTooltip(event, d) {
        var name = isoName(d._iso) || d.properties.name;
        var html = "<strong>" + name + "</strong>";
        if (d._data) {
          html += "<br>" + "科学家: " + fmtNum(d._data.count);
          html += "<br>" + "占比: " + fmtPct(d._data.pct);
        } else {
          html += "<br>" + "科学家: 0";
        }
        showTooltip(html);
        moveTooltip(event);
      }

    }).catch(function (err) {
      console.error("globe.js: Failed to load map data —", err);
    });
  }

  // Simple delayed init — no IntersectionObserver dependency
  setTimeout(doInit, 200);
}

/* ---- Boot ---- */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initGlobe);
} else {
  initGlobe();
}
