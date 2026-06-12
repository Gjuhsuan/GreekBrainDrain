/* ═══════════════════════════════════════════
   sankeyMulti.js — Multi-stage Sankey (1→2→3→4 institutions)
   Rendered in #sankey-svg-copy
   Greek Brain Drain · Data Visualization Project
   ═══════════════════════════════════════════ */

(function () {
  "use strict";

  var SVG_W = 960;
  var SVG_H = 900;
  var STAGE_LABELS = ["第1机构", "第2机构", "第3机构", "第4机构"];

  function initMultiSankey() {
    loadData("new/sankey_multi.json").then(function (data) {
      renderMultiSankey(data);
    }).catch(function (err) {
      console.warn("sankeyMulti.js: data load failed —", err.message);
    });
  }
  observeSection("migration-flows-copy", initMultiSankey);

  function renderMultiSankey(data) {
    var svg = d3.select("#sankey-svg-copy");
    if (svg.empty()) return;
    svg.selectAll("*").remove();

    var nodes = data.nodes.map(function (n) {
      return {
        name: n.name,
        column: n.column,
        // d3-sankey needs mutable objects
        x0: 0, x1: 0, y0: 0, y1: 0,
      };
    });

    var links = data.links.map(function (l) {
      return {
        source: l.source,
        target: l.target,
        value: l.value,
      };
    });

    // ── Column layout ──
    var nCols = 4;
    var nodeW = 20;
    var margin = { top: 50, right: 100, bottom: 20, left: 100 };
    var colSpacing = (SVG_W - margin.left - margin.right - nodeW) / (nCols - 1);

    // ── Sankey layout ──
    var sankey = d3.sankey()
      .nodeWidth(nodeW)
      .nodePadding(8)
      .nodeId(function (d) { return d.name + "|" + d.column; })
      .extent([[margin.left, margin.top], [SVG_W - margin.right, SVG_H - margin.bottom]])
      .nodeAlign(d3.sankeyJustify);

    // Assign unique ids (need for d3-sankey link resolution)
    var nodeById = {};
    nodes.forEach(function (n, i) {
      n._id = n.name + "|" + n.column;
      nodeById[n._id] = n;
    });
    links.forEach(function (l) {
      l.source = nodes[l.source]._id;
      l.target = nodes[l.target]._id;
    });

    var layout = sankey({ nodes: nodes, links: links });

    // ── Country color scale ──
    var allNames = d3.map(layout.nodes, function (d) { return d.name; });
    var uniqueNames = allNames.filter(function (v, i, a) { return a.indexOf(v) === i; });
    var countryColor = d3.scaleOrdinal()
      .domain(uniqueNames)
      .range([
        COLORS.greece,                // 希腊
        "#E85D2A", "#6A8FBF", "#D99A2B", "#8B6FB6", "#4FA3A5",
        "#C75D87", "#7AA35A", "#C47A3A", "#5F8DD3", "#B56AA0",
        "#9A9B4F", "#D16B5B", "#6FB3B8", "#AE5A41",
      ]);
    // Fix Greece to always be blue
    countryColor.domain().forEach(function (name) {
      if (name === "希腊") countryColor = countryColor.copy(); // nope, just override
    });
    // Override: set specific colors
    var COLOR_MAP = {};
    COLOR_MAP["希腊"] = COLORS.greece;
    COLOR_MAP["其他"] = "#AAAAAA";
    COLOR_MAP["不再流动"] = "#D4C5B0";
    var colorPalette = [
      "#E85D2A", "#6A8FBF", "#D99A2B", "#8B6FB6", "#4FA3A5",
      "#C75D87", "#7AA35A", "#C47A3A", "#5F8DD3", "#B56AA0",
      "#9A9B4F", "#D16B5B", "#6FB3B8",
    ];
    var pi = 0;
    uniqueNames.forEach(function (name) {
      if (!COLOR_MAP[name]) {
        COLOR_MAP[name] = colorPalette[pi % colorPalette.length];
        pi++;
      }
    });
    function nodeColor(d) { return COLOR_MAP[d.name] || COLORS.abroad; }

    // ── Draw links ──
    var linkG = svg.append("g")
      .attr("class", "sankey-links")
      .attr("fill", "none");

    linkG.selectAll("path")
      .data(layout.links)
      .join("path")
      .attr("d", d3.sankeyLinkHorizontal())
      .attr("stroke", function (d) {
        return nodeColor(d.source);
      })
      .attr("stroke-opacity", 0.2)
      .attr("stroke-width", function (d) { return Math.max(1.5, d.width); })
      .on("mouseenter", function (event, d) {
        d3.select(this).attr("stroke-opacity", 0.55);
        showTooltip(
          "<strong>" + d.source.name + "</strong> → <strong>" + d.target.name + "</strong><br>" +
          "人数: " + fmtNum(d.value)
        );
        moveTooltip(event);
      })
      .on("mousemove", moveTooltip)
      .on("mouseleave", function () {
        d3.select(this).attr("stroke-opacity", 0.2);
        hideTooltip();
      });

    // ── Draw nodes ──
    var nodeG = svg.append("g")
      .attr("class", "sankey-nodes")
      .selectAll("g")
      .data(layout.nodes)
      .join("g");

    nodeG.append("rect")
      .attr("x", function (d) { return d.x0; })
      .attr("y", function (d) { return d.y0; })
      .attr("height", function (d) { return Math.max(2, d.y1 - d.y0); })
      .attr("width", function (d) { return d.x1 - d.x0; })
      .attr("fill", nodeColor)
      .attr("fill-opacity", 0.85)
      .attr("rx", 3)
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .on("mouseenter", function (event, d) {
        showTooltip(
          "<strong>" + d.name + "</strong><br>" +
          "经流量: " + fmtNum(d.value) + " 人"
        );
        moveTooltip(event);
      })
      .on("mousemove", moveTooltip)
      .on("mouseleave", hideTooltip);

    // ── Node labels ──
    nodeG.append("text")
      .attr("x", function (d) {
        return d.x0 < SVG_W / 2 ? d.x1 + 8 : d.x0 - 8;
      })
      .attr("y", function (d) { return (d.y0 + d.y1) / 2; })
      .attr("dy", "0.35em")
      .attr("text-anchor", function (d) {
        return d.x0 < SVG_W / 2 ? "start" : "end";
      })
      .attr("fill", COLORS.text)
      .attr("font-size", "11px")
      .attr("font-family", "Inter, sans-serif")
      .attr("font-weight", function (d) { return d.name === "希腊" ? "700" : "400"; })
      .text(function (d) { return d.name; });

    // ── Stage column labels at top (use d3-sankey's column positions) ──
    var stageColXs = d3.rollup(layout.nodes, function (ns) { return d3.mean(ns, function (n) { return n.x0; }); }, function (n) { return n.column; });
    var sortedCols = Array.from(stageColXs.keys()).sort(d3.ascending);
    var topY = margin.top - 16;
    sortedCols.forEach(function (col) {
      var label = STAGE_LABELS[col] || "";
      var cx = stageColXs.get(col) + nodeW / 2;
      svg.append("text")
        .attr("x", cx)
        .attr("y", topY)
        .attr("text-anchor", "middle")
        .attr("fill", COLORS.textLight)
        .attr("font-size", "11px")
        .attr("font-family", "Inter, sans-serif")
        .attr("font-weight", "600")
        .text(label);
    });
  }
})();
