/* ═══════════════════════════════════════════
   sankey.js — Section 5: Migration Flows (Sankey Diagram)
   Uses d3-sankey plugin for proper layout
   Greek Brain Drain · Data Visualization Project
   ═══════════════════════════════════════════ */

(function () {
  "use strict";

  var SVG_W = 960;
  var SVG_H = 640;
  var MARGIN = { top: 20, right: 100, bottom: 20, left: 120 };

  function initSankey() {
    loadData("new/sankey_data.json").then(function (data) {
      renderSankey(data);
    }).catch(function (err) {
      console.warn("sankey.js: data load failed —", err.message);
    });
  }
  observeSection("migration-flows", initSankey);

  function renderSankey(data) {
    var svg = d3.select("#sankey-svg");
    svg.selectAll("*").remove();

    // ── Prepare nodes & links ──
    var topN = 12; // top 12 destinations
    var flows = data.flows.slice(0, topN);
    var nodeNames = ["希腊本土"];
    flows.forEach(function (f) {
      if (nodeNames.indexOf(f.target) === -1) nodeNames.push(f.target);
    });

    var nodes = nodeNames.map(function (name) {
      return { name: name };
    });

    var links = flows.map(function (f) {
      return {
        source: nodeNames.indexOf("希腊本土"),
        target: nodeNames.indexOf(f.target),
        value: f.value,
      };
    });

    // ── Sankey layout ──
    var sankey = d3.sankey()
      .nodeWidth(22)
      .nodePadding(6)
      .extent([[MARGIN.left, MARGIN.top], [SVG_W - MARGIN.right, SVG_H - MARGIN.bottom]])
      .nodeAlign(d3.sankeyJustify);

    var layout = sankey({ nodes: nodes, links: links });

    // ── Color scale for destination nodes ──
    var destColors = d3.scaleOrdinal()
      .domain(nodeNames.slice(1))
      .range([
        "#E85D2A", "#6A8FBF", "#D99A2B", "#8B6FB6", "#4FA3A5",
        "#C75D87", "#7AA35A", "#C47A3A", "#5F8DD3", "#B56AA0",
        "#9A9B4F", "#D16B5B",
      ]);

    // ── Draw links ──
    svg.append("g")
      .attr("class", "sankey-links")
      .attr("fill", "none")
      .selectAll("path")
      .data(layout.links)
      .join("path")
      .attr("d", d3.sankeyLinkHorizontal())
      .attr("stroke", function (d) {
        return d.source.name === "希腊本土"
          ? destColors(d.target.name)
          : COLORS.greece;
      })
      .attr("stroke-opacity", 0.35)
      .attr("stroke-width", function (d) { return Math.max(2, d.width); })
      .on("mouseenter", function (event, d) {
        d3.select(this).attr("stroke-opacity", 0.7);
        showTooltip(
          "<strong>" + d.source.name + "</strong><br>" +
          "<strong>" + d.target.name + "</strong><br>" +
          "流出人数: " + fmtNum(d.value)
        );
      })
      .on("mousemove", moveTooltip)
      .on("mouseleave", function () {
        d3.select(this).attr("stroke-opacity", 0.35);
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
      .attr("fill", function (d) {
        return d.name === "希腊本土"
          ? COLORS.greece
          : destColors(d.name);
      })
      .attr("rx", 3)
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .on("mouseenter", function (event, d) {
        d3.select(this).attr("opacity", 0.85);
        showTooltip(
          "<strong>" + d.name + "</strong><br>" +
          "经流量: " + fmtNum(d.value)
        );
      })
      .on("mousemove", moveTooltip)
      .on("mouseleave", function () {
        d3.select(this).attr("opacity", 1);
        hideTooltip();
      });

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
      .attr("font-size", function (d) {
        return d.name === "希腊本土" ? "13px" : "12px";
      })
      .attr("font-family", "Inter, sans-serif")
      .attr("font-weight", function (d) {
        return d.name === "希腊本土" ? "700" : "400";
      })
      .text(function (d) { return d.name + " " + fmtNum(d.value) + " 人"; });

    // ── Title ──
    svg.append("text")
      .attr("x", SVG_W / 2)
      .attr("y", 14)
      .attr("text-anchor", "middle")
      .attr("fill", COLORS.textSecondary)
      .attr("font-size", "11px")
      .attr("font-family", "Inter, sans-serif")
      .text(data.total_migrants.toLocaleString("zh-CN") + " 名希腊科学家首次海外机构流向");
  }
})();
