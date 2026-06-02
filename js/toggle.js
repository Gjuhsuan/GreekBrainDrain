/* ═══════════════════════════════════════════
   toggle.js — Elite drain toggle: pyramid vs cases
   Greek Brain Drain · Data Visualization Project
   ═══════════════════════════════════════════ */

(function () {
  "use strict";

  function initToggle() {
    var tabs = document.querySelectorAll("#elite-toggle .toggle-tab");
    var panels = document.querySelectorAll("#elite-toggle .toggle-panel");

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var view = this.getAttribute("data-view");

        // Update active tab
        tabs.forEach(function (t) { t.classList.remove("active"); });
        this.classList.add("active");

        // Show matching panel, hide others
        panels.forEach(function (p) {
          if (p.id === "panel-" + view) {
            p.classList.add("active");
          } else {
            p.classList.remove("active");
          }
        });
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initToggle);
  } else {
    initToggle();
  }
})();
