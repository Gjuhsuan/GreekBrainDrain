/* ═══════════════════════════════════════════
   profiles.js — Section 7: Top Scientists Table + Map
   Greek Brain Drain · Data Visualization Project
   ═══════════════════════════════════════════ */

/**
 * DOM-generated data table + small D3 world map.
 * Hover row   country bar cross-highlight.
 * Click row expands detail panel.
 */
function initProfiles() {
  setTimeout(function () {

    /* ── Container references ── */
    var tableWrap = d3.select("#profiles-table-wrap");
    var mapSvg    = d3.select("#profiles-map-svg");

    /* ── Map dimensions ── */
    var mapW = 400, mapH = 260;

    /* ════════════════ LOAD DATA ════════════════ */
    Promise.all([
      loadData("top15.json"),
      loadData("world-110m.json")
    ]).then(function (results) {

      var scientists = results[0];
      var world      = results[1];   /* TopoJSON Topology */

      /* Convert TopoJSON   GeoJSON FeatureCollection */
      var worldFeatures = topojson.feature(world, world.objects.countries);

      /* ── Sort by c_ns descending ── */
      scientists.sort(function (a, b) {
        return d3.descending(a.c_ns, b.c_ns);
      });

      /* ══════════════════════════════════════
         1.  BUILD DOM TABLE
         ══════════════════════════════════════ */
      var table = tableWrap.append("table")
        .attr("class", "profiles-table");

      /* ── Header ── */
      var thead = table.append("thead").append("tr");
      ["子领域排名", "姓名", "子领域", "国家", "机构", "c(ns)得分"]
        .forEach(function (col) {
          thead.append("th").text(col);
        });

      /* ── Body ── */
      var tbody = table.append("tbody");

      var rows = tbody.selectAll("tr.scientist-row")
        .data(scientists)
        .enter()
        .append("tr")
          .attr("class", function (d) {
            return "scientist-row" + (d.location === "greece" ? " row-greece" : "");
          })
          .attr("data-index", function (d, i) { return i; })
          .style("opacity", 0);

      /* Rank cell */
      rows.append("td")
        .attr("class", "num")
        .text(function (d) { return d.rank_ns; });

      /* Name cell (with dot) */
      rows.append("td")
        .html(function (d) {
          var dotClass = d.location === "greece" ? "grc" : "abr";
          return '<span class="dot ' + dotClass + '"></span> ' + d.name;
        });

      /* Subfield */
      rows.append("td").text(function (d) { return d.subfield; });

      /* Country (Chinese name) */
      rows.append("td").text(function (d) { return d.country; });

      /* Institution */
      rows.append("td").text(function (d) { return d.institution; });

      /* c(ns) score */
      rows.append("td")
        .attr("class", "num")
        .text(function (d) { return d.c_ns.toFixed(2); });

      /* ── Entry animation: stagger fade-in ── */
      rows.transition()
        .delay(function (d, i) { return i * 40; })
        .duration(400)
        .style("opacity", 1);

      /* ══════════════════════════════════════
         2.  BUILD WORLD MAP
         ══════════════════════════════════════ */
      var mapG = mapSvg.append("g");

      /* Projection */
      var proj = d3.geoNaturalEarth1().fitExtent([[0, 48], [mapW, mapH]], worldFeatures);
      var path = d3.geoPath(proj);

      /* ── Country centroids lookup ── */
      var centroids = {};
      worldFeatures.features.forEach(function (feat) {
        var iso = geoNameToIso(feat.properties.name);
        if (iso) {
          centroids[iso] = path.centroid(feat);
        }
      });

      /* ── Draw land (gray) ── */
      var countryPaths = mapG.append("g")
        .attr("class", "map-land")
        .selectAll("path")
        .data(worldFeatures.features)
        .enter()
        .append("path")
          .attr("d", path)
          .attr("data-code", function (d) {
            return geoNameToIso(d.properties && d.properties.name || "");
          })
          .attr("fill", "#E8E8E8")
          .attr("stroke", "#fff")
          .attr("stroke-width", 0.3);

      /* ── Highlight Greece ── */
      countryPaths
        .filter(function (d) {
          return geoNameToIso(d.properties && d.properties.name || "") === "grc";
        })
        .attr("fill", COLORS.greeceLight)
        .attr("stroke", COLORS.greece)
        .attr("stroke-width", 0.8);

      /* ── Aggregate scientists by current country ── */
      var countryMap = d3.rollup(
        scientists,
        function (items) {
          return {
            country_code: items[0].country_code,
            country: items[0].country,
            location: items[0].location,
            count: items.length,
            scientists: items
          };
        },
        function (d) { return d.country_code; }
      );
      var countries = Array.from(countryMap.values())
        .filter(function (d) { return centroids[d.country_code]; })
        .sort(function (a, b) { return d3.descending(a.count, b.count); });

      var maxCount = d3.max(countries, function (d) { return d.count; });
      var barH = d3.scaleSqrt()
        .domain([1, maxCount])
        .range([14, 58]);

      var labelOffsets = {
        usa: [-18, -4],
        gbr: [-16, -6],
        deu: [10, -7],
        che: [18, 7],
        aut: [33, 13],
        grc: [22, 23],
        cyp: [40, 30],
        aus: [10, 0]
      };

      function countryPoint(d) {
        var c = centroids[d.country_code] || [mapW / 2, mapH / 2];
        var off = labelOffsets[d.country_code] || [0, 0];
        return [c[0] + off[0], c[1] + off[1]];
      }

      /* ── Draw country bars above map regions ── */
      var countryBars = mapG.append("g")
        .attr("class", "map-country-bars")
        .selectAll("g.country-bar")
        .data(countries)
        .enter()
        .append("g")
          .attr("class", "country-bar")
          .attr("data-code", function (d) { return d.country_code; })
          .style("cursor", "pointer");

      countryBars.append("line")
        .attr("class", "country-stem")
        .attr("x1", function (d) { return centroids[d.country_code][0]; })
        .attr("y1", function (d) { return centroids[d.country_code][1]; })
        .attr("x2", function (d) { return countryPoint(d)[0]; })
        .attr("y2", function (d) { return countryPoint(d)[1]; })
        .attr("stroke", COLORS.textLight)
        .attr("stroke-width", 0.7)
        .attr("opacity", 0.35);

      countryBars.append("rect")
        .attr("class", "country-bar-rect")
        .attr("x", function (d) { return countryPoint(d)[0] - 6; })
        .attr("y", function (d) { return countryPoint(d)[1]; })
        .attr("width", 12)
        .attr("height", 0)
        .attr("rx", 2)
        .attr("fill", COLORS.greece)
        .attr("fill-opacity", 0.86)
        .attr("stroke", "#fff")
        .attr("stroke-width", 0.8)
        .transition()
        .delay(function (d, i) { return i * 70 + 100; })
        .duration(650)
        .ease(d3.easeCubicOut)
        .attr("y", function (d) { return countryPoint(d)[1] - barH(d.count); })
        .attr("height", function (d) { return barH(d.count); });

      countryBars.append("text")
        .attr("class", "country-bar-label")
        .attr("x", function (d) { return countryPoint(d)[0]; })
        .attr("y", function (d) { return countryPoint(d)[1] - barH(d.count) - 5; })
        .attr("text-anchor", "middle")
        .attr("fill", COLORS.text)
        .attr("font-family", "Inter, Helvetica Neue, PingFang SC, sans-serif")
        .attr("font-size", "10px")
        .attr("font-weight", "700")
        .attr("paint-order", "stroke")
        .attr("stroke", "#fff")
        .attr("stroke-width", 2.5)
        .attr("opacity", 0)
        .text(function (d) { return d.country + " " + d.count + "人"; })
        .transition()
        .delay(function (d, i) { return i * 70 + 520; })
        .duration(250)
        .attr("opacity", 1);

      /* ══════════════════════════════════════
         3.  CROSS-HIGHLIGHT INTERACTION
         ══════════════════════════════════════ */

      function setCountryHighlight(code) {
        countryBars.selectAll(".country-bar-rect")
          .transition().duration(180)
          .attr("fill-opacity", function (d) { return d.country_code === code ? 1 : 0.22; })
          .attr("stroke", function (d) { return d.country_code === code ? COLORS.highlight : "#fff"; })
          .attr("stroke-width", function (d) { return d.country_code === code ? 2 : 0.8; });

        countryBars.selectAll(".country-bar-label")
          .transition().duration(180)
          .attr("opacity", function (d) { return d.country_code === code ? 1 : 0.35; });

        countryPaths
          .transition().duration(180)
          .attr("fill", function (d) {
            var iso = geoNameToIso(d.properties && d.properties.name || "");
            if (iso === code) return code === "grc" ? COLORS.greeceLight : COLORS.abroadLight;
            if (iso === "grc") return COLORS.greeceLight;
            return "#E8E8E8";
          })
          .attr("stroke", function (d) {
            var iso = geoNameToIso(d.properties && d.properties.name || "");
            return iso === code ? COLORS.highlight : "#fff";
          })
          .attr("stroke-width", function (d) {
            var iso = geoNameToIso(d.properties && d.properties.name || "");
            return iso === code ? 1.2 : 0.3;
          });
      }

      function clearCountryHighlight() {
        countryBars.selectAll(".country-bar-rect")
          .transition().duration(180)
          .attr("fill-opacity", 0.86)
          .attr("stroke", "#fff")
          .attr("stroke-width", 0.8);

        countryBars.selectAll(".country-bar-label")
          .transition().duration(180)
          .attr("opacity", 1);

        countryPaths
          .transition().duration(180)
          .attr("fill", function (d) {
            var iso = geoNameToIso(d.properties && d.properties.name || "");
            return iso === "grc" ? COLORS.greeceLight : "#E8E8E8";
          })
          .attr("stroke", function (d) {
            var iso = geoNameToIso(d.properties && d.properties.name || "");
            return iso === "grc" ? COLORS.greece : "#fff";
          })
          .attr("stroke-width", function (d) {
            var iso = geoNameToIso(d.properties && d.properties.name || "");
            return iso === "grc" ? 0.8 : 0.3;
          });
      }

      /* ── Hover TABLE ROW   highlight country bar ── */
      rows.on("mouseenter", function (event, d) {
          setCountryHighlight(d.country_code);
        })
        .on("mouseleave", function () {
          clearCountryHighlight();
        });

      /* ── Hover MAP BAR   highlight all table rows in that country ── */
      countryBars.on("mouseenter", function (event, d) {
          setCountryHighlight(d.country_code);
          rows.classed("row-highlight", function (rd) {
            return rd.country_code === d.country_code;
          });

          showTooltip(
            '<div style="font-weight:700;margin-bottom:4px">' + d.country + '</div>'
            + '顶尖个案：<strong>' + d.count + '</strong> 人<br>'
            + '代表科学家：' + d.scientists.slice(0, 3).map(function (s) { return s.name; }).join("、")
            + (d.scientists.length > 3 ? " 等" : "")
          );
          moveTooltip(event);
        })
        .on("mousemove", function (event) {
          moveTooltip(event);
        })
        .on("mouseleave", function () {
          rows.classed("row-highlight", false);
          clearCountryHighlight();
          hideTooltip();
        });

      /* ══════════════════════════════════════
         4.  CLICK TO EXPAND DETAIL
         ══════════════════════════════════════ */
      rows.on("click", function (event, d) {
        var row = d3.select(this);
        var wasSelected = row.classed("row-selected");
        var rowIndex = +row.attr("data-index");

        /* Collapse all open details */
        tbody.selectAll("tr.detail-row").remove();
        rows.classed("row-selected", false);

        if (wasSelected) return; /* Toggle off */

        row.classed("row-selected", true);

        /* Insert detail row after the clicked row */
        var detailTr = tbody.insert("tr", "tr.scientist-row:nth-child(" + (rowIndex + 2) + ")")
          .attr("class", "detail-row");

        var detailTd = detailTr.append("td")
          .attr("colspan", 6)
          .attr("class", "profile-detail");

        var bornText = (d.born_greece === true) ? "是" : (d.born_greece === false ? "否" : "未知");
        var ugText   = (d.ug_greece === true) ? "是" : (d.ug_greece === false ? "否" : "未知");

        detailTd.html(
          '<div style="display:flex;flex-wrap:wrap;gap:16px">'
          + '<div><strong>完整机构：</strong>' + d.institution + '</div>'
          + '<div><strong>h-index：</strong>' + d.h19_ns + '</div>'
          + '<div><strong>论文数：</strong>' + fmtNum(d.np) + '</div>'
          + '<div><strong>子领域全球排名：</strong>#' + d.rank_ns + '</div>'
          + '<div><strong>出生于希腊：</strong>' + bornText + '</div>'
          + '<div><strong>希腊本科：</strong>' + ugText + '</div>'
          + '</div>'
        );
      });

    }); /* end loadData */

  }, 200); /* end setTimeout */
}

/* ---- Boot ---- */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initProfiles);
} else {
  initProfiles();
}
