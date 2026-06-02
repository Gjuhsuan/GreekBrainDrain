/* ═══════════════════════════════════════════
   butterfly.js — Section 4: Discipline Asymmetry (Diverging Bar Chart)
   Greek Brain Drain · Data Visualization Project
   ═══════════════════════════════════════════ */

(function () {
  "use strict";

  // ── Configuration ──
  var MARGIN = { top: 40, right: 100, bottom: 20, left: 100 };
  var ROW_HEIGHT = 24;          // 20px bar + 4px gap
  var SVG_W = 960;
  var ANIM_DURATION = 800;

  // ── State ──
  var allData = [];
  var showAll = false;
  var currentField = "all";
  var searchTerm = "";
  var rendered = false;
  var selectedKey = null;

  // ── Initialize (with retry on fetch failure) ──
  function initButterfly() {
    loadData("subfields.json").then(function (data) {
      allData = data;
      populateFieldSelect(data);
      renderButterfly();
      renderDisciplinePack(getFilteredData());
      setupControls();
      rendered = true;
    }).catch(function (err) {
      console.warn("butterfly.js: data load failed, retrying in 1s —", err.message);
      setTimeout(initButterfly, 1000);
    });
  }
  observeSection("disciplines", initButterfly);

  // ── Populate field dropdown ──
  function populateFieldSelect(data) {
    var select = d3.select("#bf-field-select");
    var fields = [];
    data.forEach(function (d) {
      if (fields.indexOf(d.field) === -1) {
        fields.push(d.field);
      }
    });
    fields.sort();

    select.selectAll("option.field-opt")
      .data(fields)
      .join("option")
      .attr("class", "field-opt")
      .attr("value", function (d) { return d; })
      .text(function (d) { return d; });
  }

  // ── Get filtered + sorted data ──
  function getFilteredData() {
    var filtered = allData;

    // Exclude pairs where both groups are tiny.
    filtered = filtered.filter(function (d) {
      return Math.max(d.greece || 0, d.abroad || 0) >= 5;
    });

    // Field filter
    if (currentField !== "all") {
      filtered = filtered.filter(function (d) { return d.field === currentField; });
    }

    // Sort by absolute log_ratio descending (most imbalanced first)
    filtered = filtered.slice().sort(function (a, b) {
      return Math.abs(b.log_ratio) - Math.abs(a.log_ratio);
    });

    // Top N cutoff
    if (!showAll) {
      filtered = filtered.slice(0, 30);
    }

    return filtered;
  }

  // ── Main render ──
  function renderButterfly() {
    var data = getFilteredData();
    var svg = d3.select("#butterfly-svg");
    svg.selectAll("*").remove();

    // Dynamic SVG height
    var totalH = MARGIN.top + data.length * ROW_HEIGHT + MARGIN.bottom;
    svg.attr("viewBox", "0 0 " + SVG_W + " " + totalH);
    svg.attr("preserveAspectRatio", "xMidYMin meet");

    var innerW = SVG_W - MARGIN.left - MARGIN.right;
    var centerX = SVG_W / 2;
    var halfW = innerW / 2;

    // Scales
    var maxVal = d3.max(data, function (d) {
      return Math.max(d.greece, d.abroad);
    });

    var xScale = d3.scaleLinear()
      .domain([0, maxVal || 1])
      .range([0, halfW])
      .nice();

    // ── Chart group ──
    var chart = svg.append("g").attr("class", "butterfly-chart");

    // ── Center axis line ──
    chart.append("line")
      .attr("class", "center-line")
      .attr("x1", centerX)
      .attr("y1", MARGIN.top - 10)
      .attr("x2", centerX)
      .attr("y2", MARGIN.top + data.length * ROW_HEIGHT + 10)
      .attr("stroke", "#CCCCCC")
      .attr("stroke-width", 1.5);

    // ── Row groups ──
    var rows = chart.selectAll(".bf-row")
      .data(data, function (d) { return d.subfield + "|" + d.field; })
      .join("g")
      .attr("class", "bf-row")
      .attr("data-key", function (d) { return rowKey(d); })
      .attr("transform", function (d, i) {
        return "translate(0," + (MARGIN.top + i * ROW_HEIGHT) + ")";
      })
      .on("click", function (event, d) {
        selectDiscipline(rowKey(d));
      });

    // ── Greece bars (left) ──
    rows.append("rect")
      .attr("class", "bf-bar-greece")
      .attr("x", function (d) { return centerX - xScale(d.greece); })
      .attr("y", 2)
      .attr("height", 20)
      .attr("fill", COLORS.greece)
      .attr("width", 0)
      .attr("opacity", 0.85)
      .attr("rx", 3)
      .on("mouseenter", function (event, d) {
        d3.select(this).attr("opacity", 1);
        showTooltip(
          "<strong>" + truncate(d.subfield, 40) + "</strong><br>" +
          "大类: " + d.field + "<br>" +
          "希腊: " + fmtNum(d.greece) + "<br>" +
          "海外: " + fmtNum(d.abroad) + "<br>" +
          formatRatioText(d)
        );
      })
      .on("mousemove", moveTooltip)
      .on("mouseleave", function () {
        d3.select(this).attr("opacity", 0.85);
        hideTooltip();
      })
      .transition()
      .delay(function (_, i) { return i * 10; })
      .duration(ANIM_DURATION)
      .ease(d3.easeCubicOut)
      .attr("width", function (d) { return xScale(d.greece); });

    // ── Abroad bars (right) ──
    rows.append("rect")
      .attr("class", "bf-bar-abroad")
      .attr("x", centerX)
      .attr("y", 2)
      .attr("height", 20)
      .attr("fill", COLORS.abroad)
      .attr("width", 0)
      .attr("opacity", 0.85)
      .attr("rx", 3)
      .on("mouseenter", function (event, d) {
        d3.select(this).attr("opacity", 1);
        showTooltip(
          "<strong>" + truncate(d.subfield, 40) + "</strong><br>" +
          "大类: " + d.field + "<br>" +
          "希腊: " + fmtNum(d.greece) + "<br>" +
          "海外: " + fmtNum(d.abroad) + "<br>" +
          formatRatioText(d)
        );
      })
      .on("mousemove", moveTooltip)
      .on("mouseleave", function () {
        d3.select(this).attr("opacity", 0.85);
        hideTooltip();
      })
      .transition()
      .delay(function (_, i) { return i * 10; })
      .duration(ANIM_DURATION)
      .ease(d3.easeCubicOut)
      .attr("width", function (d) { return xScale(d.abroad); });

    // ── Subfield name labels (center) ──
    rows.append("text")
      .attr("class", "bf-label-center")
      .attr("x", centerX)
      .attr("y", 13)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("fill", COLORS.text)
      .attr("font-size", "12px")
      .attr("font-family", "Inter, sans-serif")
      .text(function (d) { return truncate(d.subfield, 35); });

    // ── Greece number labels (left side, right-aligned) ──
    rows.append("text")
      .attr("class", "bf-label-greece")
      .attr("x", function (d) { return greeceLabelX(d, xScale, centerX); })
      .attr("y", 13)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "central")
      .attr("fill", COLORS.greece)
      .attr("font-size", "11px")
      .attr("font-family", "Inter, sans-serif")
      .attr("font-weight", "500")
      .attr("opacity", 0)
      .transition()
      .delay(function (_, i) { return i * 10 + ANIM_DURATION; })
      .duration(300)
      .attr("opacity", 1)
      .text(function (d) { return fmtNum(d.greece); });

    // ── Abroad number labels (right side, left-aligned) ──
    rows.append("text")
      .attr("class", "bf-label-abroad")
      .attr("x", function (d) { return abroadLabelX(d, xScale, centerX); })
      .attr("y", 13)
      .attr("text-anchor", "start")
      .attr("dominant-baseline", "central")
      .attr("fill", COLORS.abroad)
      .attr("font-size", "11px")
      .attr("font-family", "Inter, sans-serif")
      .attr("font-weight", "500")
      .attr("opacity", 0)
      .transition()
      .delay(function (_, i) { return i * 10 + ANIM_DURATION; })
      .duration(300)
      .attr("opacity", 1)
      .text(function (d) { return fmtNum(d.abroad); });

    // ── Group headers ──
    svg.append("text")
      .attr("x", centerX - halfW / 2)
      .attr("y", 20)
      .text("希腊本土更多")
      .attr("text-anchor", "middle")
      .attr("fill", COLORS.greece)
      .attr("font-size", "12px")
      .attr("font-family", "Inter, sans-serif")
      .attr("font-weight", "600");

    svg.append("text")
      .attr("x", centerX + halfW / 2)
      .attr("y", 20)
      .text("海外更多")
      .attr("text-anchor", "middle")
      .attr("fill", COLORS.abroad)
      .attr("font-size", "12px")
      .attr("font-family", "Inter, sans-serif")
      .attr("font-weight", "600");

    // ── Apply search filter if active ──
    if (searchTerm) {
      applySearchFilter();
    }
    applySelection();
  }

  // ── Re-render with transitions (for field filter / toggle) ──
  function updateButterfly() {
    var data = getFilteredData();
    var svg = d3.select("#butterfly-svg");
    renderDisciplinePack(data);

    // Update viewBox
    var totalH = MARGIN.top + data.length * ROW_HEIGHT + MARGIN.bottom;
    svg.transition().duration(600).attr("viewBox", "0 0 " + SVG_W + " " + totalH);

    var innerW = SVG_W - MARGIN.left - MARGIN.right;
    var centerX = SVG_W / 2;
    var halfW = innerW / 2;

    var maxVal = d3.max(data, function (d) {
      return Math.max(d.greece, d.abroad);
    });

    var xScale = d3.scaleLinear()
      .domain([0, maxVal || 1])
      .range([0, halfW])
      .nice();

    var chart = svg.select(".butterfly-chart");
    if (chart.empty()) { renderButterfly(); return; }

    // Update center line
    chart.select(".center-line")
      .transition().duration(600)
      .attr("y2", MARGIN.top + data.length * ROW_HEIGHT + 10);

    // Data join
    var rows = chart.selectAll(".bf-row")
      .data(data, function (d) { return d.subfield + "|" + d.field; });

    // Exit
    rows.exit()
      .transition().duration(600)
      .attr("opacity", 0)
      .remove();

    // Enter
    var rowsEnter = rows.enter().append("g")
      .attr("class", "bf-row")
      .attr("data-key", function (d) { return rowKey(d); })
      .attr("opacity", 0);

    // Greece bars (enter)
    rowsEnter.append("rect")
      .attr("class", "bf-bar-greece")
      .attr("x", function (d) { return centerX - xScale(d.greece); })
      .attr("y", 2)
      .attr("height", 20)
      .attr("fill", COLORS.greece)
      .attr("width", 0)
      .attr("opacity", 0.85)
      .attr("rx", 3)
      .on("mouseenter", onBarMouseEnter)
      .on("mousemove", moveTooltip)
      .on("mouseleave", onBarMouseLeave);

    // Abroad bars (enter)
    rowsEnter.append("rect")
      .attr("class", "bf-bar-abroad")
      .attr("x", centerX)
      .attr("y", 2)
      .attr("height", 20)
      .attr("fill", COLORS.abroad)
      .attr("width", 0)
      .attr("opacity", 0.85)
      .attr("rx", 3)
      .on("mouseenter", onBarMouseEnter)
      .on("mousemove", moveTooltip)
      .on("mouseleave", onBarMouseLeave);

    // Center labels (enter)
    rowsEnter.append("text")
      .attr("class", "bf-label-center")
      .attr("x", centerX)
      .attr("y", 13)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("fill", COLORS.text)
      .attr("font-size", "12px")
      .attr("font-family", "Inter, sans-serif")
      .text(function (d) { return truncate(d.subfield, 35); });

    // Greece number labels (enter)
    rowsEnter.append("text")
      .attr("class", "bf-label-greece")
      .attr("x", function (d) { return greeceLabelX(d, xScale, centerX); })
      .attr("y", 13)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "central")
      .attr("fill", COLORS.greece)
      .attr("font-size", "11px")
      .attr("font-family", "Inter, sans-serif")
      .attr("font-weight", "500")
      .text(function (d) { return fmtNum(d.greece); });

    // Abroad number labels (enter)
    rowsEnter.append("text")
      .attr("class", "bf-label-abroad")
      .attr("x", function (d) { return abroadLabelX(d, xScale, centerX); })
      .attr("y", 13)
      .attr("text-anchor", "start")
      .attr("dominant-baseline", "central")
      .attr("fill", COLORS.abroad)
      .attr("font-size", "11px")
      .attr("font-family", "Inter, sans-serif")
      .attr("font-weight", "500")
      .text(function (d) { return fmtNum(d.abroad); });

    // Merge + update positions
    var rowsAll = rowsEnter.merge(rows);

    rowsAll.transition().duration(600)
      .attr("opacity", 1)
      .attr("transform", function (d, i) {
        return "translate(0," + (MARGIN.top + i * ROW_HEIGHT) + ")";
      });

    rowsAll
      .attr("data-key", function (d) { return rowKey(d); })
      .on("click", function (event, d) {
        selectDiscipline(rowKey(d));
      });

    // Update Greece bars
    rowsAll.select(".bf-bar-greece")
      .transition().duration(600)
      .attr("x", function (d) { return centerX - xScale(d.greece); })
      .attr("width", function (d) { return xScale(d.greece); });

    // Update Abroad bars
    rowsAll.select(".bf-bar-abroad")
      .transition().duration(600)
      .attr("width", function (d) { return xScale(d.abroad); });

    // Update Greece labels
    rowsAll.select(".bf-label-greece")
      .transition().duration(600)
      .attr("x", function (d) { return greeceLabelX(d, xScale, centerX); })
      .text(function (d) { return fmtNum(d.greece); });

    // Update Abroad labels
    rowsAll.select(".bf-label-abroad")
      .transition().duration(600)
      .attr("x", function (d) { return abroadLabelX(d, xScale, centerX); })
      .text(function (d) { return fmtNum(d.abroad); });

    // Apply search filter
    if (searchTerm) {
      applySearchFilter();
    }
    applySelection();
  }

  function renderDisciplinePack(data) {
    var svg = d3.select("#discipline-pack-svg");
    if (svg.empty()) return;

    var w = 420;
    var h = Math.max(420, Math.min(760, 150 + data.length * 5));
    var legendSpace = 72;
    svg.attr("viewBox", "0 0 " + w + " " + h);
    svg.selectAll("*").remove();

    var nodes = data.map(function (d) {
      var total = d.greece + d.abroad;
      return {
        key: rowKey(d),
        subfield: d.subfield,
        field: d.field,
        greece: d.greece,
        abroad: d.abroad,
        value: total,
        abroadPct: total > 0 ? d.abroad / total * 100 : 0
      };
    }).filter(function (d) { return d.value > 0; });

    var color = d3.scaleLinear()
      .domain([0, 20, 40, 50, 60, 80, 100])
      .range([COLORS.greece, "#4E86AA", "#8FA0BC", "#B9A7C8", "#C99CB1", "#DE7A6D", COLORS.abroad])
      .interpolate(d3.interpolateRgb.gamma(2.2));

    var root = d3.hierarchy({ children: nodes })
      .sum(function (d) { return d.value; });

    d3.pack()
      .size([w - 20, h - 54 - legendSpace])
      .padding(3)(root);

    var g = svg.append("g").attr("transform", "translate(10,42)");

    var circles = g.selectAll(".discipline-circle")
      .data(root.leaves(), function (d) { return d.data.key; })
      .join("circle")
        .attr("class", "discipline-circle")
        .attr("data-key", function (d) { return d.data.key; })
        .attr("cx", function (d) { return d.x; })
        .attr("cy", function (d) { return d.y; })
        .attr("r", 0)
        .attr("fill", function (d) { return color(d.data.abroadPct); })
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.2)
        .attr("opacity", 0.9)
        .on("mouseenter", function (event, d) {
          showTooltip(
            "<strong>" + truncate(d.data.subfield, 40) + "</strong><br>" +
            "大类: " + d.data.field + "<br>" +
            "科学家: " + fmtNum(d.data.value) + "<br>" +
            "希腊: " + fmtNum(d.data.greece) + "<br>" +
            "海外: " + fmtNum(d.data.abroad) + "<br>" +
            "海外占比: " + fmtPct(d.data.abroadPct, 1)
          );
          moveTooltip(event);
        })
        .on("mousemove", moveTooltip)
        .on("mouseleave", hideTooltip)
        .on("click", function (event, d) {
          selectDiscipline(d.data.key);
        });

    circles.transition()
      .duration(600)
      .ease(d3.easeCubicOut)
      .attr("r", function (d) { return d.r; });

    g.selectAll(".discipline-circle-label")
      .data(root.leaves(), function (d) { return d.data.key; })
      .join("text")
        .attr("class", "discipline-circle-label")
        .attr("x", function (d) { return d.x; })
        .attr("y", function (d) {
          var lines = circleLabelLines(d);
          var fontSize = circleLabelFontSize(d);
          return d.y - (lines.length - 1) * fontSize * 0.48;
        })
        .attr("text-anchor", "middle")
        .attr("fill", "#fff")
        .attr("font-family", "Inter, sans-serif")
        .attr("font-size", function (d) { return circleLabelFontSize(d); })
        .attr("font-weight", "600")
        .attr("pointer-events", "none")
        .each(function (d) {
          var text = d3.select(this);
          var lines = circleLabelLines(d);
          var fontSize = circleLabelFontSize(d);
          text.selectAll("tspan")
            .data(lines)
            .join("tspan")
              .attr("x", d.x)
              .attr("dy", function (_, i) { return i === 0 ? 0 : fontSize * 1.05; })
              .text(function (line) { return line; });
        });

    var legendW = 240;
    var legendH = 10;
    var legendX = (w - legendW) / 2;
    var legendY = h - 44;
    var defs = svg.append("defs");
    var gradient = defs.append("linearGradient")
      .attr("id", "discipline-pack-gradient")
      .attr("x1", "0%")
      .attr("x2", "100%")
      .attr("y1", "0%")
      .attr("y2", "0%");
    [
      [0, 0],
      [20, 20],
      [40, 40],
      [50, 50],
      [60, 60],
      [80, 80],
      [100, 100]
    ].forEach(function (stop) {
      gradient.append("stop")
        .attr("offset", stop[0] + "%")
        .attr("stop-color", color(stop[1]));
    });

    var legend = svg.append("g").attr("transform", "translate(" + legendX + "," + legendY + ")");
    legend.append("rect")
      .attr("width", legendW)
      .attr("height", legendH)
      .attr("fill", "url(#discipline-pack-gradient)")
      .attr("rx", 2);
    legend.append("text")
      .attr("x", 0)
      .attr("y", 24)
      .attr("fill", COLORS.greece)
      .attr("font-family", "Inter, sans-serif")
      .attr("font-size", "10px")
      .text("本土更多");
    legend.append("text")
      .attr("x", legendW / 2)
      .attr("y", 24)
      .attr("text-anchor", "middle")
      .attr("fill", COLORS.textSecondary)
      .attr("font-family", "Inter, sans-serif")
      .attr("font-size", "10px")
      .text("接近均衡");
    legend.append("text")
      .attr("x", legendW)
      .attr("y", 24)
      .attr("text-anchor", "end")
      .attr("fill", COLORS.abroad)
      .attr("font-family", "Inter, sans-serif")
      .attr("font-size", "10px")
      .text("海外更多");

    applySelection();
  }

  function selectDiscipline(key) {
    selectedKey = selectedKey === key ? null : key;
    applySelection();
  }

  function applySelection() {
    if (!selectedKey) {
      d3.selectAll(".bf-row").classed("is-selected", false);
      d3.selectAll(".bf-row rect")
        .attr("opacity", 0.86)
        .attr("height", 20)
        .attr("y", 2);
      d3.selectAll(".bf-row text")
        .attr("font-weight", "500");
      d3.selectAll(".discipline-circle")
        .attr("opacity", 0.9)
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.2)
        .attr("r", function (d) { return d.r; });
      return;
    }

    d3.selectAll(".bf-row").classed("is-selected", function (d) {
      return selectedKey && rowKey(d) === selectedKey;
    });

    d3.selectAll(".bf-row rect")
      .transition()
      .duration(180)
      .attr("opacity", function () {
        var row = d3.select(this.parentNode).datum();
        return selectedKey && rowKey(row) !== selectedKey ? 0.28 : 0.9;
      })
      .attr("height", function () {
        var row = d3.select(this.parentNode).datum();
        return selectedKey && rowKey(row) === selectedKey ? 24 : 20;
      })
      .attr("y", function () {
        var row = d3.select(this.parentNode).datum();
        return selectedKey && rowKey(row) === selectedKey ? 0 : 2;
      });

    d3.selectAll(".bf-row text")
      .transition()
      .duration(180)
      .attr("font-weight", function () {
        var row = d3.select(this.parentNode).datum();
        return selectedKey && rowKey(row) === selectedKey ? "700" : "500";
      });

    d3.selectAll(".discipline-circle")
      .transition()
      .duration(180)
      .attr("opacity", function (d) {
        return selectedKey && d.data.key !== selectedKey ? 0.25 : 0.92;
      })
      .attr("stroke", function (d) {
        return selectedKey && d.data.key === selectedKey ? COLORS.highlight : "#fff";
      })
      .attr("stroke-width", function (d) {
        return selectedKey && d.data.key === selectedKey ? 3 : 1.2;
      })
      .attr("r", function (d) {
        return selectedKey && d.data.key === selectedKey ? d.r * 1.22 : d.r;
      });
  }

  // ── Tooltip handlers ──
  function onBarMouseEnter(event, d) {
    d3.select(this).attr("opacity", 1);
    showTooltip(
      "<strong>" + truncate(d.subfield, 40) + "</strong><br>" +
      "大类: " + d.field + "<br>" +
      "希腊: " + fmtNum(d.greece) + "<br>" +
      "海外: " + fmtNum(d.abroad) + "<br>" +
      formatRatioText(d)
    );
  }

  function onBarMouseLeave() {
    d3.select(this).attr("opacity", 0.85);
    hideTooltip();
  }

  // ── Search filter (opacity-based) ──
  function applySearchFilter() {
    var term = searchTerm.toLowerCase().trim();
    d3.selectAll(".bf-row").each(function (d) {
      var match = !term || d.subfield.toLowerCase().indexOf(term) !== -1;
      d3.select(this)
        .transition().duration(300)
        .attr("opacity", match ? 1 : 0.15);
    });
  }

  // ── Helper: format ratio text for tooltips ──
  // data.ratio is greece/abroad; we display abroad/greece
  function formatRatioText(d) {
    if (d.greece === 0 && d.abroad === 0) return "无数据";
    if (d.greece === 0) return "海外 " + fmtNum(d.abroad) + " 人，本土无";
    if (d.abroad === 0) return "本土 " + fmtNum(d.greece) + " 人，海外无";
    var abrGrc = d.abroad / d.greece;
    if (abrGrc >= 1) return "海外是本土的 " + abrGrc.toFixed(1) + " 倍";
    return "本土是海外的 " + (d.greece / d.abroad).toFixed(1) + " 倍";
  }

  // ── Helper: truncate string ──
  function truncate(str, maxLen) {
    if (!str) return "";
    if (str.length <= maxLen) return str;
    return str.substring(0, maxLen - 1) + "…";
  }

  function rowKey(d) {
    return d.subfield + "|" + d.field;
  }

  function circleLabelFontSize(d) {
    return Math.max(3.2, Math.min(10, d.r / 3.1));
  }

  function circleLabelLines(d) {
    var fontSize = circleLabelFontSize(d);
    var maxChars = Math.max(1, Math.floor((d.r * 1.45) / fontSize));
    var maxLines = Math.max(1, Math.min(3, Math.floor((d.r * 1.45) / (fontSize * 1.05))));
    var source = d.data.subfield || "";
    var normalized = source.replace(/&/g, " & ").replace(/\s+/g, " ").trim();
    var words = normalized.split(" ");
    var lines = [];
    var current = "";

    words.forEach(function (word) {
      if (!word) return;
      if (word.length > maxChars) {
        if (current) {
          lines.push(current);
          current = "";
        }
        for (var i = 0; i < word.length && lines.length < maxLines; i += maxChars) {
          lines.push(word.slice(i, i + maxChars));
        }
        return;
      }
      var candidate = current ? current + " " + word : word;
      if (candidate.length <= maxChars) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    });
    if (current && lines.length < maxLines) lines.push(current);
    if (!lines.length) lines.push(source.slice(0, maxChars));
    if (lines.length > maxLines) lines = lines.slice(0, maxLines);

    var used = lines.join(" ").length;
    if (used < source.length && lines.length) {
      var last = lines.length - 1;
      if (lines[last].length >= maxChars) {
        lines[last] = lines[last].slice(0, Math.max(1, maxChars - 1)) + ".";
      } else {
        lines[last] += ".";
      }
    }
    return lines;
  }

  function labelHalfWidth(d) {
    return truncate(d.subfield, 35).length * 3.6 + 8;
  }

  function greeceLabelX(d, xScale, centerX) {
    var barOuterX = centerX - xScale(d.greece) - 8;
    var textOuterX = centerX - labelHalfWidth(d) - 8;
    return Math.min(barOuterX, textOuterX);
  }

  function abroadLabelX(d, xScale, centerX) {
    var barOuterX = centerX + xScale(d.abroad) + 8;
    var textOuterX = centerX + labelHalfWidth(d) + 8;
    return Math.max(barOuterX, textOuterX);
  }

  // ── Set up control event listeners ──
  function setupControls() {
    // Set initial button text
    d3.select("#bf-toggle").text("显示全部 " + allData.length + " 项");

    // Field select
    d3.select("#bf-field-select").on("change", function () {
      currentField = this.value;
      updateButterfly();
    });

    // Search input
    d3.select("#bf-search").on("keyup", function () {
      searchTerm = this.value;
      applySearchFilter();
    });

    // Toggle button
    d3.select("#bf-toggle").on("click", function () {
      showAll = !showAll;
      d3.select(this).text(showAll ? "显示前 30 项" : "显示全部 " + allData.length + " 项");
      updateButterfly();
    });
  }

})();
