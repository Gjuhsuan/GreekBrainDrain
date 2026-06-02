/* ═══════════════════════════════════════════
   heatmap.js — Section 5: Percentile Pyramid
   Greek Brain Drain · Data Visualization Project
   ═══════════════════════════════════════════ */

(function () {
  var initialized = false;

  function initHeatmap() {
    if (initialized) return;
    initialized = true;

    var svg = d3.select("#percentile-svg");
    if (svg.empty()) return;

    var viewBox = svg.attr("viewBox");
    var vbParts = viewBox ? viewBox.split(" ").map(Number) : [0, 0, 960, 400];
    var vbW = vbParts[2] || 960;
    var vbH = vbParts[3] || 400;

    var margin = { top: 30, right: 200, bottom: 50, left: 100 };
    var innerW = vbW - margin.left - margin.right;
    var innerH = vbH - margin.top - margin.bottom;
    var centerX = innerW / 2;   /* central axis — bars extend left/right from here */

    /* ── Chart group ── */
    var g = svg.append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    /* ── Load data ── */
    loadData("percentiles.json").then(function (data) {
      /* data: [{tier, tier_value, greece, abroad, total}, ...] 8 tiers, already sorted */

      /* X scale: each tier uses the same 100% width, so the visual focus is
         the changing share rather than the shrinking sample size. */
      var xScale = d3.scaleLinear()
        .domain([0, 100])
        .range([0, innerW * 0.48]);

      /* Y scale: band by tier, bottom-to-top (前50% bottom, 前0.1% top) */
      var tiers = data.map(function (d) { return d.tier; });
      /* data is already [前50% … 前0.1%] — reverse for Y=bottom to Y=top */
      var yScale = d3.scaleBand()
        .domain(tiers.slice().reverse())
        .range([innerH, 0])
        .padding(0.18);

      /* ── 50/50 reference line ── */
      g.append("line")
        .attr("class", "grid-line")
        .attr("x1", centerX)
        .attr("x2", centerX)
        .attr("y1", 0)
        .attr("y2", innerH)
        .attr("stroke", "#999999")
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "4 4");

      g.append("text")
        .attr("x", centerX)
        .attr("y", -8)
        .attr("text-anchor", "middle")
        .attr("fill", "#999999")
        .attr("font-family", "Inter, Helvetica Neue, PingFang SC, sans-serif")
        .attr("font-size", "12px")
        .text("50/50 线");

      /* ── Y-axis tier labels (left side) ── */
      g.selectAll(".tier-label")
        .data(data)
        .enter()
        .append("text")
        .attr("class", "tier-label")
        .attr("x", -10)
        .attr("y", function (d) { return (yScale(d.tier) || 0) + (yScale.bandwidth() || 0) / 2; })
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .attr("fill", "#666666")
        .attr("font-family", "Inter, Helvetica Neue, PingFang SC, sans-serif")
        .attr("font-size", "14px")
        .text(function (d) { return d.tier; });

      /* ── Bars (with entry animation) ──
         Greece: from centerX to the left
         Abroad: from centerX to the right */

      /* Greece bars (left side, blue) */
      var greeceGroup = g.selectAll(".bar-greece")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "bar-greece")
        .attr("x", centerX)                           /* start at centerX (for animation) */
        .attr("y", function (d) { return yScale(d.tier); })
        .attr("height", yScale.bandwidth())
        .attr("fill", COLORS.greece)
        .attr("opacity", 0.88)
        .attr("rx", 2)
        .attr("width", 0)                              /* start at 0 for animation */
        .transition()
        .duration(800)
        .ease(d3.easeCubicOut)
        .attr("x", function (d) {
          var pct = d.greece / d.total * 100;
          return centerX - xScale(pct);
        })
        .attr("width", function (d) {
          var pct = d.greece / d.total * 100;
          return xScale(pct);
        });

      /* Abroad bars (right side, orange) */
      var abroadGroup = g.selectAll(".bar-abroad")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "bar-abroad")
        .attr("x", centerX)                           /* start at centerX */
        .attr("y", function (d) { return yScale(d.tier); })
        .attr("height", yScale.bandwidth())
        .attr("fill", COLORS.abroad)
        .attr("opacity", 0.88)
        .attr("rx", 2)
        .attr("width", 0)
        .transition()
        .duration(800)
        .ease(d3.easeCubicOut)
        .attr("x", centerX)
        .attr("width", function (d) {
          var pct = d.abroad / d.total * 100;
          return xScale(pct);
        });

      /* ── Percentage labels inside bars ── */
      g.selectAll(".label-greece")
        .data(data)
        .enter()
        .append("text")
        .attr("class", "label-greece")
        .attr("x", centerX)
        .attr("y", function (d) { return yScale(d.tier) + yScale.bandwidth() / 2; })
        .attr("text-anchor", "end")
        .attr("dominant-baseline", "central")
        .attr("fill", "#FFFFFF")
        .attr("font-family", "Inter, Helvetica Neue, PingFang SC, sans-serif")
        .attr("font-size", "12px")
        .attr("font-weight", "bold")
        .attr("opacity", 0)
        .transition()
        .delay(800)
        .duration(300)
        .attr("opacity", 1)
        .attrTween("x", function (d) {
          var pct = d.greece / d.total * 100;
          var targetX = centerX - xScale(pct) / 2;
          return d3.interpolate(centerX, targetX);
        })
        .text(function (d) {
          var pct = d.greece / d.total * 100;
          return (pct >= 5) ? fmtPct(pct, 0) : "";
        });

      g.selectAll(".label-abroad")
        .data(data)
        .enter()
        .append("text")
        .attr("class", "label-abroad")
        .attr("x", centerX)
        .attr("y", function (d) { return yScale(d.tier) + yScale.bandwidth() / 2; })
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .attr("fill", "#FFFFFF")
        .attr("font-family", "Inter, Helvetica Neue, PingFang SC, sans-serif")
        .attr("font-size", "12px")
        .attr("font-weight", "bold")
        .attr("opacity", 0)
        .transition()
        .delay(800)
        .duration(300)
        .attr("opacity", 1)
        .attrTween("x", function (d) {
          var pct = d.abroad / d.total * 100;
          var targetX = centerX + xScale(pct) / 2;
          return d3.interpolate(centerX, targetX);
        })
        .text(function (d) {
          var pct = d.abroad / d.total * 100;
          return (pct >= 5) ? fmtPct(pct, 0) : "";
        });

      /* ── Annotation for top 0.1% ── */
      var topTier = data[data.length - 1];   /* 前0.1% */
      var topY = yScale(topTier.tier) + yScale.bandwidth() / 2;
      var topAbroadPct = topTier.abroad / topTier.total * 100;
      var annotationX = centerX + xScale(topAbroadPct) + 12;

      /* Minimum offset so annotation has breathing room */
      if (annotationX < centerX + 10) annotationX = centerX + 14;

      /* Arrow stem */
      g.append("line")
        .attr("x1", centerX + xScale(topAbroadPct) + 4)
        .attr("y1", topY)
        .attr("x2", annotationX)
        .attr("y2", topY)
        .attr("stroke", COLORS.abroad)
        .attr("stroke-width", 1.5)
        .attr("opacity", 0)
        .transition()
        .delay(1000)
        .duration(400)
        .attr("opacity", 1);

      /* Annotation text background (subtle box) */
      g.append("rect")
        .attr("x", annotationX + 4)
        .attr("y", topY - 18)
        .attr("width", 150)
        .attr("height", 36)
        .attr("rx", 4)
        .attr("fill", "#FFF8F0")
        .attr("stroke", COLORS.abroadLight)
        .attr("stroke-width", 1)
        .attr("opacity", 0)
        .transition()
        .delay(1000)
        .duration(400)
        .attr("opacity", 1);

      /* Annotation text */
      g.append("text")
        .attr("x", annotationX + 10)
        .attr("y", topY - 2)
        .attr("fill", COLORS.abroad)
        .attr("font-family", "Inter, Helvetica Neue, PingFang SC, sans-serif")
        .attr("font-size", "11.5px")
        .attr("font-weight", "600")
        .attr("opacity", 0)
        .transition()
        .delay(1000)
        .duration(400)
        .attr("opacity", 1)
        .text("海外占 86%，仅 15 人留在希腊");

      /* ── Sample-size labels ── */
      g.selectAll(".tier-total")
        .data(data)
        .enter()
        .append("text")
        .attr("class", "tier-total")
        .attr("x", centerX + xScale(100) + 14)
        .attr("y", function (d) { return yScale(d.tier) + yScale.bandwidth() / 2; })
        .attr("dominant-baseline", "central")
        .attr("fill", COLORS.textLight)
        .attr("font-family", "Inter, Helvetica Neue, PingFang SC, sans-serif")
        .attr("font-size", "12px")
        .attr("opacity", 0)
        .transition()
        .delay(800)
        .duration(300)
        .attr("opacity", 1)
        .text(function (d) { return "n=" + fmtNum(d.total); });

      /* ── Hover areas (invisible rects over each tier row) ── */
      g.selectAll(".hover-zone")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "hover-zone")
        .attr("x", 0)
        .attr("y", function (d) { return yScale(d.tier); })
        .attr("width", innerW)
        .attr("height", yScale.bandwidth())
        .attr("fill", "transparent")
        .on("mouseenter", function (event, d) {
          var greecePct = d.greece / d.total * 100;
          var abroadPct = d.abroad / d.total * 100;
          showTooltip(
            "<div style='font-weight:700;margin-bottom:4px;'>" + d.tier + "</div>" +
            "<div style='color:" + COLORS.greece + ";'>希腊本土：" + fmtNum(d.greece) + " 人（" + fmtPct(greecePct, 1) + "）</div>" +
            "<div style='color:" + COLORS.abroad + ";'>海外：" + fmtNum(d.abroad) + " 人（" + fmtPct(abroadPct, 1) + "）</div>" +
            "<div style='color:#999;margin-top:2px;'>合计：" + fmtNum(d.total) + " 人</div>"
          );
          moveTooltip(event);

          /* Highlight this row's bars */
          g.selectAll(".bar-greece")
            .transition().duration(150)
            .attr("opacity", function (bar) { return bar === d ? 1 : 0.35; });
          g.selectAll(".bar-abroad")
            .transition().duration(150)
            .attr("opacity", function (bar) { return bar === d ? 1 : 0.35; });
        })
        .on("mousemove", function (event) {
          moveTooltip(event);
        })
        .on("mouseleave", function () {
          hideTooltip();
          g.selectAll(".bar-greece")
            .transition().duration(150)
            .attr("opacity", 0.88);
          g.selectAll(".bar-abroad")
            .transition().duration(150)
            .attr("opacity", 0.88);
        });

    }); /* end loadData */
  }

  /* ── Trigger on scroll into view ── */
  setTimeout(initHeatmap, 200);

})();
