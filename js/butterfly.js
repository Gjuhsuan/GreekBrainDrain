/* ═══════════════════════════════════════════
   butterfly.js — Dumbbell chart + circle pack
   Greek Brain Drain · Data Visualization Project
   ═══════════════════════════════════════════ */

(function () {
  "use strict";

  var MARGIN_BASE = { top: 16, right: 80, bottom: 60 };
  var CHART_H = 560;  /* fixed chart area height — rows distributed via band scale */
  var ANIM_DURATION = 700;
  var CHAR_W = 7.2;  /* approximate pixel width per Chinese char at 12px */
  var allData = [], showAll = false, currentField = "all", searchTerm = "", selectedKey = null;
  var level = "field";  /* "field" (default) | "subfield" — which hierarchy to show in dumbbell */

  function initButterfly() {
    loadData("subfields.json").then(function (data) {
      allData = data;
      populateFieldSelect(data);
      renderDumbbell();
      renderDisciplinePack(data);  /* BUBBLE CHART */
      setupControls();
    }).catch(function (err) {
      console.warn("butterfly.js:", err.message);
      setTimeout(initButterfly, 1000);
    });
  }
  observeSection("disciplines", initButterfly);

  /* ── Aggregate subfield data to field level ── */
  function aggregateByField(data) {
    var fieldMap = {};
    data.forEach(function (d) {
      if (!fieldMap[d.field]) {
        fieldMap[d.field] = { subfield: d.field, field: d.field, greece: 0, abroad: 0 };
      }
      fieldMap[d.field].greece += d.greece;
      fieldMap[d.field].abroad += d.abroad;
    });
    var fields = Object.values(fieldMap);
    fields.forEach(function (f) {
      var g = Math.max(1, f.greece);
      var a = Math.max(1, f.abroad);
      f.ratio = f.greece / Math.max(1, f.greece + f.abroad);
      f.log_ratio = Math.log2(g / a);
    });
    fields.sort(function (a, b) { return (b.greece + b.abroad) - (a.greece + a.abroad); });
    return fields;
  }

  /* ── Get field list for dropdown ── */
  function getFieldList(data) {
    var fields = [];
    data.forEach(function (d) { if (fields.indexOf(d.field) === -1) fields.push(d.field); });
    fields.sort();
    return fields;
  }

  function populateFieldSelect(data) {
    var select = d3.select("#bf-field-select");
    var fields = getFieldList(data);
    select.selectAll("option").remove();
    select.append("option")
      .attr("value", "all")
      .text("全部学科大类");
    fields.forEach(function (f) {
      select.append("option")
        .attr("value", f)
        .text(f);
    });
    select.property("value", "all");
  }

  /* ── Get data for the dumbbell chart ── */
  function getFilteredData() {
    if (level === "field") {
      /* ── Field level ── */
      var fields = aggregateByField(allData);
      if (searchTerm) {
        var s = searchTerm.toLowerCase();
        fields = fields.filter(function (d) { return d.field.toLowerCase().indexOf(s) !== -1; });
      }
      return fields;
    }

    /* ── Subfield level ── */
    var filtered = allData.filter(function (d) { return Math.max(d.greece || 0, d.abroad || 0) >= 5; });
    if (currentField !== "all") filtered = filtered.filter(function (d) { return d.field === currentField; });
    if (searchTerm) {
      var q = searchTerm.toLowerCase();
      filtered = filtered.filter(function (d) { return d.subfield.toLowerCase().indexOf(q) !== -1; });
    }
    filtered = filtered.slice().sort(function (a, b) { return (b.greece + b.abroad) - (a.greece + a.abroad); });
    if (!showAll) filtered = filtered.slice(0, 30);
    return filtered;
  }

  function rowKey(d) { return d.subfield + "|" + d.field; }

  /* ═══════════════════════════════════════════
     Dumbbell chart
     ═══════════════════════════════════════════ */
  function renderDumbbell() {
    var data = getFilteredData();
    var svg = d3.select("#butterfly-svg");
    svg.selectAll("*").remove();

    var isFieldLevel = (level === "field");
    var labelKey = isFieldLevel ? "field" : "subfield";
    var n = data.length;

    /* Dynamic left margin: fit the longest label name */
    var maxLabelLen = d3.max(data, function (d) { return d[labelKey].length; }) || 10;
    var margin = Object.assign({}, MARGIN_BASE);
    margin.left = Math.max(100, Math.round(maxLabelLen * CHAR_W) + 48);

    var vbW = 900;
    var totalH = margin.top + CHART_H + margin.bottom;
    svg.attr("viewBox", "0 0 " + vbW + " " + totalH);
    svg.attr("preserveAspectRatio", "xMidYMin meet");

    var innerW = vbW - margin.left - margin.right;
    var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    /* ── Y scale: band scale distributes rows across fixed chart height ── */
    var yScale = d3.scaleBand()
      .domain(d3.range(n))
      .range([0, CHART_H])
      .paddingInner(0.25)
      .paddingOuter(0.1);
    var bandH = yScale.bandwidth();

    /* ── X scale ── */
    var maxVal = d3.max(data, function (d) { return Math.max(d.greece, d.abroad); });
    var x = d3.scaleLinear().domain([0, maxVal || 1]).range([0, innerW]).nice();

    /* ── Vertical grid lines ── */
    var xTicks = x.ticks(6);
    xTicks.forEach(function (t) {
      g.append("line")
        .attr("x1", x(t)).attr("x2", x(t))
        .attr("y1", 0).attr("y2", CHART_H)
        .attr("stroke", "#dde0e4").attr("stroke-width", 1);
    });
    g.append("line")
      .attr("x1", 0).attr("x2", innerW).attr("y1", 0).attr("y2", 0)
      .attr("stroke", "#d0d4d8").attr("stroke-width", 1);

    data.forEach(function (d, i) {
      var y = yScale(i);
      var yCenter = y + bandH / 2;
      var gVal = d.greece, aVal = d.abroad;
      var gx = x(gVal), ax = x(aVal);
      var abroadBigger = aVal >= gVal;

      /* Row background */
      g.append("rect")
        .attr("x", 0).attr("y", y)
        .attr("width", innerW).attr("height", bandH)
        .attr("fill", i % 2 === 0 ? "transparent" : "#fafafa").attr("rx", 2);

      /* Dumbbell line */
      g.append("line")
        .attr("x1", gx).attr("x2", ax)
        .attr("y1", yCenter).attr("y2", yCenter)
        .attr("stroke", abroadBigger ? COLORS.abroadLight : COLORS.greeceLight)
        .attr("stroke-width", 2).attr("stroke-linecap", "round");

      /* Greece dot */
      g.append("circle")
        .attr("cx", 0).attr("cy", yCenter).attr("r", 5.5)
        .attr("fill", COLORS.greece).attr("stroke", "#fff").attr("stroke-width", 2)
        .transition().duration(ANIM_DURATION).delay(i * 20)
        .attr("cx", gx);

      /* Abroad dot */
      g.append("circle")
        .attr("cx", 0).attr("cy", yCenter).attr("r", 5.5)
        .attr("fill", COLORS.abroad).attr("stroke", "#fff").attr("stroke-width", 2)
        .transition().duration(ANIM_DURATION).delay(i * 20)
        .attr("cx", ax);

      /* Label */
      var labelFontWeight = isFieldLevel ? "600" : "400";
      g.append("text")
        .attr("x", -24).attr("y", yCenter)
        .attr("text-anchor", "end").attr("dominant-baseline", "central")
        .attr("fill", selectedKey === rowKey(d) ? COLORS.highlight : COLORS.text)
        .attr("font-size", isFieldLevel ? "13px" : "12px")
        .attr("font-family", "Inter, sans-serif")
        .attr("font-weight", labelFontWeight)
        .text(d[labelKey]);

      /* Number labels: bigger side gets the number on the OUTSIDE */
      var grcBigger = gVal >= aVal;
      g.append("text")
        .attr("x", grcBigger ? gx + 8 : gx - 8).attr("y", yCenter)
        .attr("text-anchor", grcBigger ? "start" : "end").attr("dominant-baseline", "central")
        .attr("fill", COLORS.greece).attr("font-size", "10px").attr("font-weight", "700")
        .attr("font-family", "Inter, sans-serif").text(gVal > 0 ? fmtNum(gVal) : "");

      g.append("text")
        .attr("x", grcBigger ? ax - 8 : ax + 8).attr("y", yCenter)
        .attr("text-anchor", grcBigger ? "end" : "start").attr("dominant-baseline", "central")
        .attr("fill", COLORS.abroad).attr("font-size", "10px").attr("font-weight", "700")
        .attr("font-family", "Inter, sans-serif").text(aVal > 0 ? fmtNum(aVal) : "");
    });

    /* ── Hover zones ── */
    g.selectAll(".hover-zone").data(data).enter().append("rect")
      .attr("x", 0)
      .attr("y", function (d, i) { return yScale(i); })
      .attr("width", innerW)
      .attr("height", function (d, i) { return yScale.bandwidth(); })
      .attr("fill", "transparent")
      .on("mouseenter", function (event, d) {
        var total = d.greece + d.abroad || 1;
        var pct = d.abroad / total * 100;
        var title = isFieldLevel ? d.field : d.subfield;
        var subtitle = isFieldLevel ? "" : (" &nbsp;|&nbsp; 学科: " + d.field);
        showTooltip(
          "<strong>" + title + "</strong><br>" +
          "<span style='color:" + COLORS.greece + ";'>希腊: " + fmtNum(d.greece) + "</span> / " +
          "<span style='color:" + COLORS.abroad + ";'>海外: " + fmtNum(d.abroad) + "</span><br>" +
          "海外占比: " + fmtPct(pct, 1) + subtitle
        );
        moveTooltip(event);
      })
      .on("mousemove", function (event) { moveTooltip(event); })
      .on("mouseleave", function () { hideTooltip(); });

    /* ── Legend (below chart area) ── */
    var legendY = CHART_H + 14;
    g.append("circle").attr("cx", 6).attr("cy", legendY).attr("r", 5).attr("fill", COLORS.greece);
    g.append("text").attr("x", 16).attr("y", legendY + 3).attr("fill", COLORS.textSecondary).attr("font-size", "11px").attr("font-family", "Inter, sans-serif").text("希腊本土");
    g.append("circle").attr("cx", 80).attr("cy", legendY).attr("r", 5).attr("fill", COLORS.abroad);
    g.append("text").attr("x", 90).attr("y", legendY + 3).attr("fill", COLORS.textSecondary).attr("font-size", "11px").attr("font-family", "Inter, sans-serif").text("海外");

    /* ── X axis ── */
    var xAxisY = CHART_H + 30;
    g.append("line").attr("x1", 0).attr("x2", innerW).attr("y1", xAxisY).attr("y2", xAxisY)
      .attr("stroke", COLORS.grid).attr("stroke-width", 1);
    xTicks.forEach(function (t) {
      g.append("text").attr("x", x(t)).attr("y", xAxisY + 14)
        .attr("text-anchor", "middle").attr("fill", COLORS.textLight).attr("font-size", "9px")
        .attr("font-family", "Inter, sans-serif").text(fmtNum(t));
    });

    /* ── Level indicator label below axis ── */
    g.append("text")
      .attr("x", innerW / 2).attr("y", xAxisY + 34)
      .attr("text-anchor", "middle")
      .attr("fill", COLORS.textLight)
      .attr("font-size", "10px")
      .attr("font-family", "Inter, sans-serif")
      .attr("font-style", "italic")
      .text(isFieldLevel ? "— 学科大类 —" : "— " + currentField + " 子领域 —");
  }

  /* ═══════════════════════════════════════════
     BUBBLE CHART — circle pack (disabled, keep for future use)
     Always shows field-level aggregation.
     ═══════════════════════════════════════════ */
  function renderDisciplinePack(allSubfieldData) {
    return; /* BUBBLE CHART disabled — remove this line to re-enable */
    var svg = d3.select("#discipline-pack-svg");
    svg.selectAll("*").remove();

    var vbW = 420, vbH = 600;
    svg.attr("viewBox", "0 0 " + vbW + " " + vbH);
    svg.attr("preserveAspectRatio", "xMidYMid meet");

    /* Aggregate from the FULL dataset, not the filtered one */
    var fieldMap = {};
    allSubfieldData.forEach(function (d) {
      if (!fieldMap[d.field]) fieldMap[d.field] = { field: d.field, total: 0, abroad: 0, count: 0 };
      fieldMap[d.field].total += d.greece + d.abroad;
      fieldMap[d.field].abroad += d.abroad;
      fieldMap[d.field].count += 1;
    });
    var fields = Object.values(fieldMap).map(function (f) {
      f.abroadPct = f.total > 0 ? f.abroad / f.total * 100 : 0;
      return f;
    });

    /* ── Drop-shadow filter ── */
    var defs = svg.append("defs");
    var filter = defs.append("filter")
      .attr("id", "pack-shadow")
      .attr("x", "-20%").attr("y", "-20%")
      .attr("width", "140%").attr("height", "140%");
    filter.append("feDropShadow")
      .attr("dx", 1.5).attr("dy", 2)
      .attr("stdDeviation", 3)
      .attr("flood-color", "#000")
      .attr("flood-opacity", 0.18);

    /* ── Pack layout ── */
    var packData = { children: fields.map(function (f) { return { value: f.total, data: f }; }) };
    var pack = d3.pack().size([vbW - 30, vbH - 30]).padding(6);
    var root = d3.hierarchy(packData).sum(function (d) { return d.value; });
    var nodes = pack(root).leaves();

    /* ── Color scale: abroad %   color gradient ── */
    var minPct = d3.min(fields, function (f) { return f.abroadPct; }) || 0;
    var maxPct = d3.max(fields, function (f) { return f.abroadPct; }) || 100;
    var color = d3.scaleLinear()
      .domain([minPct, 35, 50, 65, maxPct])
      .range([COLORS.greece, COLORS.greeceLight, "#d4b9a0", COLORS.abroadLight, COLORS.abroad])
      .interpolate(d3.interpolateRgb);

    var g = svg.append("g").attr("transform", "translate(15,15)");

    /* ── Draw circles ── */
    var circles = g.selectAll("circle").data(nodes).enter().append("circle")
      .attr("cx", function (d) { return d.x; }).attr("cy", function (d) { return d.y; })
      .attr("r", 0)
      .attr("fill", function (d) { return color(d.data.data.abroadPct); })
      .attr("stroke", "#fff").attr("stroke-width", 2)
      .attr("filter", "url(#pack-shadow)")
      .attr("cursor", "pointer")
      .style("transition", "transform 0.2s ease")
      .on("mouseenter", function (event, d) {
        d3.select(this)
          .attr("stroke-width", 3.5)
          .attr("stroke", COLORS.highlight);
        var f = d.data.data;
        showTooltip(
          "<strong>" + f.field + "</strong><br>" +
          "科学家总数: " + fmtNum(f.total) + "<br>" +
          "<span style='color:" + COLORS.abroad + ";'>海外占比: " + fmtPct(f.abroadPct, 1) + "</span><br>" +
          "子领域数: " + f.count
        );
        moveTooltip(event);
      })
      .on("mousemove", function (event) { moveTooltip(event); })
      .on("mouseleave", function () {
        d3.select(this)
          .attr("stroke-width", 2)
          .attr("stroke", "#fff");
        hideTooltip();
      })
      .on("click", function (event, d) {
        /* Drill down: set subfield level for the clicked field */
        level = "subfield";
        currentField = d.data.data.field;
        showAll = false;
        searchTerm = "";
        d3.select("#bf-field-select").property("value", currentField);
        d3.select("#bf-search").property("value", "");
        updateToggleVisibility();
        updateSearchPlaceholder();
        renderDumbbell();
        /* BUBBLE CHART: re-render pack with highlight */
        renderDisciplinePack(allData);
      })
      .transition().duration(700).delay(function (d, i) { return i * 50; })
      .attr("r", function (d) { return d.r; });

    /* ── Transition end: add labels ── */
    setTimeout(function () {
      /* Field name labels (inside) */
      g.selectAll("text.field-label").data(nodes).enter().append("text")
        .attr("class", "field-label")
        .attr("x", function (d) { return d.x; }).attr("y", function (d) { return d.y - 4; })
        .attr("text-anchor", "middle").attr("dominant-baseline", "central")
        .attr("fill", "#fff").attr("font-size", "11px")
        .attr("font-family", "Inter, sans-serif")
        .attr("font-weight", "700")
        .attr("pointer-events", "none")
        .attr("opacity", function (d) { return d.r > 28 ? 1 : 0; })
        .text(function (d) { return d.data.data.field; });

      /* Abroad % labels (below field name, inside) */
      g.selectAll("text.pct-label").data(nodes).enter().append("text")
        .attr("class", "pct-label")
        .attr("x", function (d) { return d.x; }).attr("y", function (d) { return d.y + 12; })
        .attr("text-anchor", "middle").attr("dominant-baseline", "central")
        .attr("fill", "rgba(255,255,255,0.85)").attr("font-size", "10px")
        .attr("font-family", "Inter, sans-serif")
        .attr("font-weight", "400")
        .attr("pointer-events", "none")
        .attr("opacity", function (d) { return d.r > 32 ? 1 : 0; })
        .text(function (d) { return fmtPct(d.data.data.abroadPct, 1) + " 海外"; });
    }, 750);

    /* ── Color legend ── */
    var legendY = vbH - 18;
    var legendX = 18;
    var legendW = vbW - 36;
    var legendG = svg.append("g").attr("transform", "translate(" + legendX + "," + legendY + ")");

    var defsGrad = svg.append("defs");
    var gradient = defsGrad.append("linearGradient")
      .attr("id", "pack-color-gradient")
      .attr("x1", "0%").attr("y1", "0%")
      .attr("x2", "100%").attr("y2", "0%");
    gradient.append("stop").attr("offset", "0%").attr("stop-color", COLORS.greece);
    gradient.append("stop").attr("offset", "50%").attr("stop-color", COLORS.greeceLight);
    gradient.append("stop").attr("offset", "100%").attr("stop-color", COLORS.abroadLight);

    legendG.append("rect")
      .attr("width", legendW).attr("height", 8)
      .attr("rx", 4)
      .attr("fill", "url(#pack-color-gradient)");

    legendG.append("text")
      .attr("x", 0).attr("y", -6)
      .attr("fill", COLORS.greece).attr("font-size", "9px")
      .attr("font-family", "Inter, sans-serif").attr("font-weight", "600")
      .text("低流失");
    legendG.append("text")
      .attr("x", legendW).attr("y", -6)
      .attr("text-anchor", "end")
      .attr("fill", COLORS.abroadLight).attr("font-size", "9px")
      .attr("font-family", "Inter, sans-serif").attr("font-weight", "600")
      .text("高流失");
    legendG.append("text")
      .attr("x", legendW / 2).attr("y", 20)
      .attr("text-anchor", "middle")
      .attr("fill", COLORS.textLight).attr("font-size", "9px")
      .attr("font-family", "Inter, sans-serif")
      .text("气泡大小 = 科学家总数  颜色 = 海外流失比例  点击可下钻");
  }

  /* ═══════════════════════════════════════════
     Controls
     ═══════════════════════════════════════════ */
  function updateToggleVisibility() {
    var btn = d3.select("#bf-toggle");
    if (level === "field") {
      btn.style("display", "none");
    } else {
      btn.style("display", null);
      btn.text(showAll ? "显示前 30 项" : "显示全部项");
    }
  }

  function updateSearchPlaceholder() {
    d3.select("#bf-search").attr("placeholder",
      level === "field" ? "搜索学科大类..." : "搜索子领域...");
  }

  function setupControls() {
    /* ── Field select dropdown ── */
    d3.select("#bf-field-select").on("change", function () {
      var val = this.value;
      if (val === "all") {
        /* Back to field-level view */
        level = "field";
        currentField = "all";
        showAll = false;
      } else {
        /* Drill into subfield view for the selected field */
        level = "subfield";
        currentField = val;
        showAll = false;
      }
      searchTerm = "";
      d3.select("#bf-search").property("value", "");
      updateToggleVisibility();
      updateSearchPlaceholder();
      renderDumbbell();
      renderDisciplinePack(allData); /* BUBBLE CHART */
    });

    /* ── Search input ── */
    d3.select("#bf-search").on("keyup", function () {
      searchTerm = this.value;
      renderDumbbell();
    });

    /* ── Toggle button (show top 30 / show all, subfield mode only) ── */
    d3.select("#bf-toggle").on("click", function () {
      showAll = !showAll;
      d3.select(this).text(showAll ? "显示前 30 项" : "显示全部项");
      renderDumbbell();
    });

    /* Initial visibility */
    updateToggleVisibility();
    updateSearchPlaceholder();
  }
})();
