/* ═══════════════════════════════════════════
   packing.js — Section 12: Circle Packing (Subfields by Drain Rate)
   Greek Brain Drain · Data Visualization Project
   ═══════════════════════════════════════════ */

(function () {
  "use strict";

  var SVG_W = 960, SVG_H = 800;

  function initPacking() {
    loadData("subfields.json").then(function (data) {
      renderPacking(data);
    }).catch(function (err) {
      console.warn("packing.js: data load failed —", err.message);
    });
  }
  observeSection("packing-chart", initPacking);

  function renderPacking(raw) {
    var svg = d3.select("#packing-svg");
    svg.selectAll("*").remove();

    // ── Aggregate by subfield ──
    // sum across field categories, calculate total greece + abroad per subfield
    var bySubfield = {};
    raw.forEach(function (d) {
      if (!bySubfield[d.subfield]) {
        bySubfield[d.subfield] = { name: d.subfield, greece: 0, abroad: 0, fields: [] };
      }
      bySubfield[d.subfield].greece += d.greece;
      bySubfield[d.subfield].abroad += d.abroad;
      if (bySubfield[d.subfield].fields.indexOf(d.field) === -1) {
        bySubfield[d.subfield].fields.push(d.field);
      }
    });

    // Convert to array, compute abroad%, filter small
    var nodes = Object.values(bySubfield)
      .filter(function (d) { return (d.greece + d.abroad) >= 30; })
      .map(function (d) {
        return {
          name: d.name,
          value: d.greece + d.abroad,
          abroadPct: d.abroad / (d.greece + d.abroad) * 100,
          primaryField: d.fields[0] || "",
        };
      })
      .sort(function (a, b) { return b.value - a.value; });

    // ── Circle packing ──
    var pack = d3.pack()
      .size([SVG_W, SVG_H])
      .padding(3);

    var hierarchy = d3.hierarchy({ children: nodes })
      .sum(function (d) { return d.value; });

    var packed = pack(hierarchy);

    // ── Color scale ──
    var colorScale = d3.scaleSequential(d3.interpolateRdYlBu)
      .domain([100, 0]); // 100% abroad = red, 0% abroad = blue

    // ── Tooltip ──
    var tooltip = d3.select("#tooltip");

    // ── Draw circles ──
    var g = svg.append("g");

    g.selectAll(".pack-circle")
      .data(packed.leaves())
      .join("circle")
      .attr("class", "pack-circle")
      .attr("cx", function (d) { return d.x; })
      .attr("cy", function (d) { return d.y; })
      .attr("r", 0)
      .attr("fill", function (d) { return colorScale(d.data.abroadPct); })
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .attr("opacity", 0.9)
      .on("mouseenter", function (event, d) {
        d3.select(this).attr("opacity", 1).attr("stroke", COLORS.text).attr("stroke-width", 2);
        showTooltip(
          "<strong>" + d.data.name + "</strong><br>" +
          "大类: " + d.data.primaryField + "<br>" +
          "科学家: " + fmtNum(d.data.value) + "<br>" +
          "希腊: " + fmtNum(Math.round(d.data.value * (100 - d.data.abroadPct) / 100)) +
          " | 海外: " + fmtNum(Math.round(d.data.value * d.data.abroadPct / 100)) + "<br>" +
          "海外占比: <strong>" + d.data.abroadPct.toFixed(0) + "%</strong>"
        );
      })
      .on("mousemove", moveTooltip)
      .on("mouseleave", function () {
        d3.select(this).attr("opacity", 0.9).attr("stroke", "#fff").attr("stroke-width", 1.5);
        hideTooltip();
      })
      .transition()
      .duration(1200)
      .ease(d3.easeElasticOut.amplitude(0.6))
      .attr("r", function (d) { return d.r; });

    // ── Labels (only for larger circles) ──
    g.selectAll(".pack-label")
      .data(packed.leaves().filter(function (d) { return d.r > 25; }))
      .join("text")
      .attr("class", "pack-label")
      .attr("x", function (d) { return d.x; })
      .attr("y", function (d) { return d.y - 2; })
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("fill", "#fff")
      .attr("font-size", function (d) { return Math.min(11, d.r / 3); })
      .attr("font-family", "Inter, sans-serif")
      .attr("font-weight", "500")
      .attr("pointer-events", "none")
      .text(function (d) { return d.data.name.length > 10 ? d.data.name.substring(0, 9) + "…" : d.data.name; });

    // ── Legend ──
    var legendW = 180, legendH = 16;
    var legendX = SVG_W - legendW - 20, legendY = 20;
    var legendG = svg.append("g").attr("transform", "translate(" + legendX + "," + legendY + ")");

    var gradient = legendG.append("defs").append("linearGradient")
      .attr("id", "pack-legend-grad")
      .attr("x1", "0%").attr("y1", "0%")
      .attr("x2", "100%").attr("y2", "0%");
    gradient.append("stop").attr("offset", "0%").attr("stop-color", d3.interpolateRdYlBu(0));
    gradient.append("stop").attr("offset", "100%").attr("stop-color", d3.interpolateRdYlBu(1));

    legendG.append("rect")
      .attr("width", legendW).attr("height", legendH)
      .attr("fill", "url(#pack-legend-grad)").attr("rx", 2);

    legendG.append("text").attr("x", 0).attr("y", legendH + 14)
      .text("本土更多").attr("font-size", "10px").attr("font-family", "Inter, sans-serif").attr("fill", COLORS.textSecondary);
    legendG.append("text").attr("x", legendW).attr("y", legendH + 14)
      .attr("text-anchor", "end").text("海外更多").attr("font-size", "10px").attr("font-family", "Inter, sans-serif").attr("fill", COLORS.textSecondary);
  }
})();
