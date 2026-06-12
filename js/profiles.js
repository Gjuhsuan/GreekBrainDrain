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
    var barSvg    = d3.select("#profiles-map-svg");

    /* ════════════════ LOAD DATA ════════════════ */
    loadData("top15.json").then(function (scientists) {

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
      ["姓名", "子领域", "子领域排名", "国家", "机构", "c(ns)得分", "h-index", "论文数", "出生于希腊", "希腊本科"]
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

      /* Name cell (with dot) */
      rows.append("td")
        .html(function (d) {
          var dotClass = d.location === "greece" ? "grc" : "abr";
          return '<span class="dot ' + dotClass + '"></span> ' + d.name;
        });

      /* Subfield */
      rows.append("td").text(function (d) { return d.subfield; });

      /* Rank cell */
      rows.append("td")
        .attr("class", "num")
        .text(function (d) { return d.rank_ns; });

      /* Country (Chinese name) */
      rows.append("td").text(function (d) { return d.country; });

      /* Institution */
      rows.append("td").text(function (d) { return d.institution; });

      /* c(ns) score */
      rows.append("td")
        .attr("class", "num")
        .text(function (d) { return d.c_ns.toFixed(2); });

      /* h-index */
      rows.append("td")
        .attr("class", "num")
        .text(function (d) { return d.h19_ns; });

      /* np (paper count) */
      rows.append("td")
        .attr("class", "num")
        .text(function (d) { return fmtNum(d.np); });

      /* born in Greece */
      rows.append("td")
        .attr("class", "num")
        .text(function (d) {
          if (d.born_greece === true) return "是";
          if (d.born_greece === false) return "否";
          return "—";
        });

      /* UG in Greece */
      rows.append("td")
        .attr("class", "num")
        .text(function (d) {
          if (d.ug_greece === true) return "是";
          if (d.ug_greece === false) return "否";
          return "—";
        });

      /* ── Entry animation: stagger fade-in ── */
      rows.transition()
        .delay(function (d, i) { return i * 40; })
        .duration(400)
        .style("opacity", 1);

      /* ══════════════════════════════════════
         2.  BUILD COUNTRY BAR CHART
         ══════════════════════════════════════ */
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
        .sort(function (a, b) { return d3.descending(a.count, b.count); });

      var n = countries.length;
      var vbW = 360;
      var labelW = 80;
      var rowH = 36;
      var pad = 0.25;
      var vbH = Math.round(n * rowH / (1 - pad));
      barSvg.attr("viewBox", "0 0 " + vbW + " " + vbH)
        .attr("preserveAspectRatio", "xMidYMid meet");
      barSvg.selectAll("*").remove();

      var maxCount = d3.max(countries, function (d) { return d.count; }) || 1;
      var barW = vbW - labelW - 48;

      var xScale = d3.scaleLinear().domain([0, maxCount]).range([0, barW]);
      var yScale = d3.scaleBand()
        .domain(d3.range(n))
        .range([0, vbH])
        .padding(pad);

      var barG = barSvg.append("g");

      var bars = barG.selectAll("g.country-bar")
        .data(countries)
        .enter()
        .append("g")
          .attr("class", "country-bar")
          .attr("data-code", function (d) { return d.country_code; })
          .style("cursor", "pointer");

      /* Label */
      bars.append("text")
        .attr("class", "country-label")
        .attr("x", 4)
        .attr("y", function (d, i) { return yScale(i) + yScale.bandwidth() / 2; })
        .attr("dominant-baseline", "central")
        .attr("fill", COLORS.text)
        .attr("font-family", "Inter, sans-serif")
        .attr("font-size", "13px")
        .attr("font-weight", "600")
        .text(function (d) { return d.country; });

      /* Bar (animated) */
      bars.append("rect")
        .attr("class", "country-bar-rect")
        .attr("x", labelW)
        .attr("y", function (d, i) { return yScale(i); })
        .attr("width", 0)
        .attr("height", yScale.bandwidth())
        .attr("rx", 3)
        .attr("fill", function (d) {
          return d.location === "greece" ? COLORS.greece : COLORS.abroad;
        })
        .attr("fill-opacity", 0.82)
        .transition()
        .delay(function (d, i) { return i * 60 + 100; })
        .duration(600)
        .ease(d3.easeCubicOut)
        .attr("width", function (d) { return xScale(d.count); });

      /* Count label */
      bars.append("text")
        .attr("class", "country-count")
        .attr("x", function (d) { return labelW + xScale(d.count) + 6; })
        .attr("y", function (d, i) { return yScale(i) + yScale.bandwidth() / 2; })
        .attr("dominant-baseline", "central")
        .attr("fill", COLORS.textSecondary)
        .attr("font-family", "Inter, sans-serif")
        .attr("font-size", "13px")
        .attr("font-weight", "600")
        .attr("opacity", 0)
        .text(function (d) { return d.count + "人"; })
        .transition()
        .delay(function (d, i) { return i * 60 + 500; })
        .duration(300)
        .attr("opacity", 1);

      /* ══════════════════════════════════════
         3.  CROSS-HIGHLIGHT INTERACTION
         ══════════════════════════════════════ */

      function setCountryHighlight(code) {
        bars.selectAll(".country-bar-rect")
          .transition().duration(180)
          .attr("fill-opacity", function (d) { return d.country_code === code ? 1 : 0.2; });
        bars.selectAll(".country-label")
          .transition().duration(180)
          .attr("fill", function (d) { return d.country_code === code ? COLORS.highlight : COLORS.text; })
          .attr("font-weight", function (d) { return d.country_code === code ? "800" : "600"; });
        bars.selectAll(".country-count")
          .transition().duration(180)
          .attr("fill", function (d) { return d.country_code === code ? COLORS.highlight : COLORS.textSecondary; })
          .attr("font-weight", function (d) { return d.country_code === code ? "800" : "600"; });
      }

      function clearCountryHighlight() {
        bars.selectAll(".country-bar-rect")
          .transition().duration(180)
          .attr("fill-opacity", 0.82);
        bars.selectAll(".country-label")
          .transition().duration(180)
          .attr("fill", COLORS.text)
          .attr("font-weight", "600");
        bars.selectAll(".country-count")
          .transition().duration(180)
          .attr("fill", COLORS.textSecondary)
          .attr("font-weight", "600");
      }

      /* ── Hover TABLE ROW   highlight country bar ── */
      rows.on("mouseenter", function (event, d) {
          setCountryHighlight(d.country_code);
        })
        .on("mouseleave", function () {
          clearCountryHighlight();
        });

      /* ── Hover BAR   highlight table rows ── */
      bars.on("mouseenter", function (event, d) {
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

    }); /* end loadData */

  }, 200); /* end setTimeout */
}

/* ---- Boot ---- */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initProfiles);
} else {
  initProfiles();
}
