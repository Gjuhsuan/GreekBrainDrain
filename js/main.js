/* ═══════════════════════════════════════════
   main.js — Section observers, inline link wiring,
   keyboard nav, and integration
   Greek Brain Drain · Data Visualization Project
   ═══════════════════════════════════════════ */

(function () {
  "use strict";

  /* ──────────────────────────────────────────
     1. Section Entry Animation Observer
     threshold 0.15 — add .section-visible
     (one-time: never removed, CSS handles fade)
     ────────────────────────────────────────── */
  var sectionObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("section-visible");
        }
      });
    },
    { threshold: 0.15 }
  );

  /* ──────────────────────────────────────────
     2. Active Section Tracking Observer
     threshold 0.5 — set data-active="true"
     Also tracks which section is "current" for
     inline-link context
     ────────────────────────────────────────── */
  var currentActiveSection = null;

  var activeObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.setAttribute("data-active", "true");
          currentActiveSection = entry.target.id;
        } else {
          entry.target.removeAttribute("data-active");
          if (currentActiveSection === entry.target.id) {
            currentActiveSection = null;
          }
        }
      });
    },
    { threshold: 0.5 }
  );

  /* Observe all .story-section elements with both observers */
  var allSections = document.querySelectorAll(".story-section");
  allSections.forEach(function (section) {
    sectionObserver.observe(section);
    activeObserver.observe(section);
  });

  /* ──────────────────────────────────────────
     2b. Site Navigation + Reading Progress
     ────────────────────────────────────────── */
  var navLinks = document.querySelectorAll("#top-nav .nav-links a[data-nav-section]");
  var backToTop = document.getElementById("back-to-top");
  var ticking = false;

  var sectionGroups = {
    opening: "opening",
    "global-map": "scale",
    timeline: "scale",
    "departure-timeline": "scale",
    disciplines: "disciplines",
    "marimekko-chart": "disciplines",
    "elite-drain": "elite",
    distributions: "elite",
    productivity: "elite",
    "bubble-chart": "elite",
    "institution-ranking": "network",
    "migration-flows-copy": "network",
    "author-roles": "network",
    conclusion: "conclusion",
    references: "conclusion"
  };

  function setActiveNav(group) {
    navLinks.forEach(function (link) {
      link.classList.toggle("active", link.getAttribute("data-nav-section") === group);
    });
  }

  function getSectionFromScroll() {
    var current = allSections[0] ? allSections[0].id : null;
    var offset = 72;  /* top nav height + padding */

    allSections.forEach(function (section) {
      var rect = section.getBoundingClientRect();
      if (rect.top <= offset) {
        current = section.id;
      }
    });

    return current;
  }

  function updateBackToTop() {
    if (!backToTop) return;
    backToTop.classList.toggle("visible", window.scrollY > 560);
  }

  function updateNavState() {
    var sectionId = getSectionFromScroll();
    setActiveNav(sectionGroups[sectionId] || "opening");
    updateBackToTop();
    ticking = false;
  }

  function requestNavUpdate() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateNavState);
  }

  navLinks.forEach(function (link) {
    link.addEventListener("click", function () {
      setActiveNav(this.getAttribute("data-nav-section"));
    });
  });

  if (backToTop) {
    backToTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  window.addEventListener("scroll", requestNavUpdate, { passive: true });
  window.addEventListener("resize", requestNavUpdate);
  updateNavState();

  /* ──────────────────────────────────────────
     3. Public API: section visibility
     ────────────────────────────────────────── */
  window.__hermes = window.__hermes || {};
  window.__hermes.getActiveSection = function () {
    return currentActiveSection;
  };
  window.__hermes.getSectionIds = function () {
    var ids = [];
    allSections.forEach(function (s) { ids.push(s.id); });
    return ids;
  };

  /* ──────────────────────────────────────────
     4. Timeline Inline Links
     Click .tl-link[data-tl-year]   scroll to
     timeline section, then scroll SVG to that year
     + update year-indicator
     ────────────────────────────────────────── */

  /** Remove .active from all tl-links */
  function clearTlActive() {
    var links = document.querySelectorAll(".tl-link");
    links.forEach(function (l) { l.classList.remove("active"); });
  }

  /**
   * Scroll to a specific year in the Marey SVG timeline.
   * @param {number} year - Target year (1960–2019)
   */
  function scrollTimelineToYear(year) {
    var svgEl = document.getElementById("marey-svg");
    if (!svgEl) return;

    var rect = svgEl.getBoundingClientRect();
    var svgHeight = rect.height;
    var ratio = (year - 1960) / 60;          /* 1960   0, 2019   ~0.983 */
    var scrollTarget = rect.top + window.scrollY + (svgHeight * ratio) - window.innerHeight / 3;

    window.scrollTo({ top: scrollTarget, behavior: "smooth" });
  }

  /** Update year-indicator text */
  function updateYearIndicator(year) {
    var el = document.getElementById("year-indicator");
    if (el) {
      el.textContent = String(year);
    }
  }

  /* Wire up all .tl-link clicks */
  var tlLinks = document.querySelectorAll(".tl-link");
  tlLinks.forEach(function (link) {
    link.addEventListener("click", function (e) {
      e.preventDefault();

      clearTlActive();
      this.classList.add("active");

      var targetYear = parseInt(this.getAttribute("data-tl-year"), 10);
      updateYearIndicator(targetYear);

      if (window.__mareySetRange) {
        var ranges = {
          1960: [1960, 1979],
          1980: [1980, 1999],
          2000: [2000, 2008],
          2009: [2009, 2015],
          2016: [2016, 2019]
        };
        var range = ranges[targetYear] || [targetYear, targetYear];
        window.__mareySetRange(range[0], range[1]);
        return;
      }

      /* Scroll the #timeline section into view first */
      var timelineSection = document.getElementById("timeline");
      if (timelineSection) {
        timelineSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      /* After a short delay (let scroll land), scroll to the specific year */
      setTimeout(function () {
        scrollTimelineToYear(targetYear);
      }, 500);
    });
  });

  /* ──────────────────────────────────────────
     5. Scatter Cohort Inline Links
     Clicking [data-cohort] triggers the
     corresponding .btn-toggle in .scatter-controls
     ────────────────────────────────────────── */
  var cohortLinks = document.querySelectorAll("[data-cohort]");
  cohortLinks.forEach(function (el) {
    /* Skip if this element is already a .btn-toggle inside .scatter-controls
       (those already have their own click handler from scatter.js) */
    if (el.classList.contains("btn-toggle") && el.closest(".scatter-controls")) {
      return;
    }

    el.addEventListener("click", function (e) {
      e.preventDefault();
      var cohort = this.getAttribute("data-cohort");
      var btn = document.querySelector(
        ".scatter-controls .btn-toggle[data-cohort=\"" + cohort + "\"]"
      );
      if (btn) {
        btn.click();
      }
      /* Scroll scatter section into view */
      var productivitySection = document.getElementById("productivity");
      if (productivitySection) {
        productivitySection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  /* ──────────────────────────────────────────
     6. Butterfly Inline Links
     Clicking [data-bf-field] scrolls to
     #disciplines and sets the field select
     ────────────────────────────────────────── */
  var bfLinks = document.querySelectorAll("[data-bf-field]");
  bfLinks.forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      var field = this.getAttribute("data-bf-field");

      /* Scroll to disciplines section */
      var disciplinesSection = document.getElementById("disciplines");
      if (disciplinesSection) {
        disciplinesSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      /* Set the field-select value and dispatch change */
      var select = document.getElementById("bf-field-select");
      if (select && field) {
        select.value = field;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
  });

  /* ──────────────────────────────────────────
     7. Keyboard Navigation
     Escape: close tooltip + clear active links
     ────────────────────────────────────────── */
  window.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      /* Hide tooltip (from utils.js) */
      hideTooltip();

      /* Clear any active inline link states */
      clearTlActive();

      /* Clear any active scatter cohort links outside controls */
      var cohortEls = document.querySelectorAll("[data-cohort].active");
      cohortEls.forEach(function (el) { el.classList.remove("active"); });
    }
  });

  /* ──────────────────────────────────────────
     8. Initialization
     Log section IDs for verification
     ────────────────────────────────────────── */
  function initAll() {
    var ids = [];
    allSections.forEach(function (s) { ids.push(s.id); });
    console.log(
      "Greek Brain Drain — " + ids.length + " sections ready: " + ids.join(", ")
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }

})();
