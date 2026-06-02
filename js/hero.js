/* ═══════════════════════════════════════════
   hero.js — Section 1: Animated Counter + Split + Comparison
   Greek Brain Drain · Data Visualization Project
   ═══════════════════════════════════════════ */

/**
 * Animate a counter element from one number to another using requestAnimationFrame.
 * @param {HTMLElement} el - DOM element whose textContent will be animated
 * @param {number} from - Start value
 * @param {number} to - Target value
 * @param {number} duration - Animation duration in milliseconds
 * @param {function} [callback] - Optional callback invoked when animation completes
 */
function animateCounter(el, from, to, duration, callback) {
  var startTime = null;
  function step(timestamp) {
    if (startTime === null) startTime = timestamp;
    var elapsed = timestamp - startTime;
    var t = Math.min(elapsed / duration, 1);
    /* easeCubicOut: 1 - (1 - t)^3 */
    var eased = 1 - Math.pow(1 - t, 3);
    var current = Math.round(from + (to - from) * eased);
    el.textContent = current.toLocaleString("en-US");
    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      el.textContent = to.toLocaleString("en-US");
      if (typeof callback === "function") callback();
    }
  }
  requestAnimationFrame(step);
}

/**
 * Animate a counter to a decimal value (e.g., 1.04, 0.15).
 * Holds briefly at 0.00, then uses 3 decimals while moving for smoother small values.
 */
function animateCounterDecimal(el, from, to, duration, callback) {
  var holdDuration = 900;
  var startTime = null;
  function step(timestamp) {
    if (startTime === null) startTime = timestamp;
    var elapsed = timestamp - startTime;

    if (elapsed < holdDuration) {
      el.textContent = from.toFixed(2);
      requestAnimationFrame(step);
      return;
    }

    var t = Math.min((elapsed - holdDuration) / duration, 1);
    var current = from + (to - from) * t;
    el.textContent = t < 1 ? current.toFixed(3) : to.toFixed(2);

    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      el.textContent = to.toFixed(2);
      if (typeof callback === "function") callback();
    }
  }
  requestAnimationFrame(step);
}

/**
 * Initialize the opening section animation.
 *
 * Story flow:
 *   1. Comparison block fades in   numbers animate (占比高)
 *   2. Hero counter 0   63,951
 *   3. Split reveal: Greece vs Abroad (将近一半不在希腊本土工作)
 */
function initHero() {
  var heroTotal = document.getElementById("hero-total");
  var heroSplit = document.getElementById("hero-split");
  var heroCountGrc = document.querySelector("#hero-greece .hero-count");
  var heroCountAbr = document.querySelector("#hero-abroad .hero-count");
  var barGrc = document.querySelector(".hero-bar-grc");
  var barAbr = document.querySelector(".hero-bar-abr");
  var compBlock = document.getElementById("comparison-block");
  var compAcademic = document.getElementById("comp-academic");
  var compPopulation = document.getElementById("comp-population");
  var compTimes = document.getElementById("comp-times");

  /* ---- Initial state ---- */
  barGrc.style.width = "0%";
  barAbr.style.width = "0%";
  barGrc.style.transition = "width 1s ease";
  barAbr.style.transition = "width 1s ease";
  heroSplit.style.opacity = "0";
  heroSplit.style.transition = "opacity 0.5s ease";

  var animated = false;

  observeSection("opening", function () {
    if (animated) return;
    animated = true;

    if (compAcademic) compAcademic.textContent = "0.00";
    if (compPopulation) compPopulation.textContent = "0.00";
    if (compTimes) compTimes.textContent = "";

    /* ══════════════════════════════════════
       Step 1: 占比高 — reveal comparison block
       ══════════════════════════════════════ */
    if (compBlock) {
      compBlock.style.display = "block";
      compBlock.style.opacity = "0";
      compBlock.classList.remove("is-visible");
      compBlock.classList.remove("numbers-complete");
      compBlock.classList.remove("show-multiplier");
      compBlock.style.transition = "opacity 0.9s ease";
      void compBlock.offsetHeight;
      compBlock.style.opacity = "1";
      compBlock.classList.add("is-visible");
    }

    setTimeout(function () {
      var completedCounters = 0;
      function onComparisonCounterDone() {
        completedCounters += 1;
        if (completedCounters === 2 && compBlock) {
          compBlock.classList.add("numbers-complete");
          setTimeout(function () {
            if (compTimes) compTimes.textContent = "约 7 倍";
            compBlock.classList.add("show-multiplier");
          }, 180);
        }
      }

      if (compAcademic) animateCounterDecimal(compAcademic, 0, 1.04, 2600, onComparisonCounterDone);
      if (compPopulation) animateCounterDecimal(compPopulation, 0, 0.15, 2600, onComparisonCounterDone);
    }, 250);

    /* ══════════════════════════════════════
       Step 2: 63,951 — big counter
       ══════════════════════════════════════ */
    setTimeout(function () {
      animateCounter(heroTotal, 0, 63951, 2000, function () {

        /* ══════════════════════════════════
           Step 3: 将近一半不在希腊 — split reveal
           ══════════════════════════════════ */
        setTimeout(function () {

          heroSplit.style.display = "flex";
          void heroSplit.offsetHeight;
          heroSplit.style.opacity = "1";

          heroTotal.style.transition = "opacity 0.5s ease";
          heroTotal.style.opacity = "0.15";

          animateCounter(heroCountGrc, 0, 35116, 1200);
          animateCounter(heroCountAbr, 0, 28835, 1200);

          barGrc.style.width = "55%";
          barAbr.style.width = "45%";

        }, 200);
      });
    }, 1800);

  });
}

/* ---- Boot ---- */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initHero);
} else {
  initHero();
}
