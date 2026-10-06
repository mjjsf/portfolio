// Password gate for a case study. Load synchronously in <head>:
//   <script src="../../assets/gate.js?v=6"></script>
// Optional: data-password="…" (default below), data-home="…" (default: site root).
// The password is asked for on every visit; nothing is remembered.
// A deterrent only; the page source is still readable.
(function () {
  var script = document.currentScript;
  var password = script.getAttribute('data-password') || 'hello2027';
  var assets = new URL('./', script.src);
  var home = script.getAttribute('data-home') || new URL('../', assets).href;
  var root = document.documentElement;
  var gate = null;

  root.classList.add('is-locked');
  // Unlocking always starts at the top; a restored scroll would jump.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  // Leaving for home cross-fades the two pages where the browser supports
  // cross-document view transitions (home opts in for that arrival too).
  // Opt in only on the way out, so arriving and every other exit stay
  // instant and the browser never stops to snapshot this page otherwise.
  var crossFade = 'CSSViewTransitionRule' in window &&
    !matchMedia('(prefers-reduced-motion: reduce)').matches;
  var optIn = document.createElement('style');
  optIn.textContent = '@view-transition { navigation: auto; }';

  // Home is where every exit goes; have it ready so leaving never waits.
  var prefetch = document.createElement('link');
  prefetch.rel = 'prefetch';
  prefetch.href = home;
  document.head.appendChild(prefetch);

  // Back/forward cache would restore an unlocked (or half-faded) page. Lock
  // it again as it is stored, so it comes back exactly like a fresh arrival.
  function relock() {
    root.classList.remove('is-unlocking', 'is-leaving');
    root.classList.add('is-locked');
    root.style.removeProperty('--unlock-bg');
    optIn.remove();
    if (gate) gate.remove();
    gate = null;
    mount();
  }
  addEventListener('pagehide', function (e) {
    if (e.persisted) relock();
  });
  addEventListener('pageshow', function (e) {
    if (e.persisted && !(gate && gate.isConnected && root.classList.contains('is-locked'))) relock();
  });

  // Run fn once on the event, or after ms if it never fires
  // (reduced motion strips transitions and animations).
  function after(el, type, ms, fn) {
    var done = false;
    function go(e) {
      if (done || (e && e.target !== el)) return;
      done = true;
      el.removeEventListener(type, go);
      fn();
    }
    el.addEventListener(type, go);
    setTimeout(go, ms);
  }

  function mount() {
    if (gate) return;
    gate = document.createElement('div');
    gate.className = 'gate';
    gate.setAttribute('role', 'dialog');
    gate.setAttribute('aria-modal', 'true');
    gate.setAttribute('aria-label', 'Password required');
    gate.innerHTML =
      '<div class="ambient" aria-hidden="true"></div>' +
      '<form class="gate-form" novalidate>' +
      '<label class="sr" for="gate-pw">Password</label>' +
      '<input id="gate-pw" class="gate-input" type="password" placeholder="Enter password" autocomplete="current-password" required>' +
      '<div class="gate-actions">' +
      '<a class="btn btn-secondary" href="' + home + '">Return to home</a>' +
      '<button type="submit" class="btn btn-primary">Continue</button>' +
      '</div>' +
      '<p class="sr" role="status" aria-live="polite"></p>' +
      '</form>';
    document.body.prepend(gate);

    var self = gate;
    var form = gate.querySelector('form');
    var input = gate.querySelector('input');
    var status = gate.querySelector('[role="status"]');
    var failures = 0;
    input.focus();

    var flow = document.createElement('script');
    flow.src = new URL('flow.js?v=8', assets).href;
    document.body.appendChild(flow);

    // Go home in one cross-fade; otherwise fade the gate out and let home
    // fade in (see index.html).
    function leave() {
      input.disabled = true;
      try { sessionStorage.setItem('gate-fade', '1'); } catch (e) {}
      if (crossFade) {
        document.head.appendChild(optIn);
        window.location.href = home;
        return;
      }
      root.classList.add('is-leaving');
      after(self, 'transitionend', 700, function () {
        window.location.href = home;
      });
    }

    gate.querySelector('.btn-secondary').addEventListener('click', function (e) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      leave();
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (input.value === password) {
        input.blur();
        // Scroll while the page is still hidden, and fade the ground to the
        // page's own colour with the content so nothing snaps at the end.
        window.scrollTo(0, 0);
        root.style.setProperty('--unlock-bg', getComputedStyle(document.body).getPropertyValue('--bg').trim());
        root.classList.add('is-unlocking');
        after(self, 'transitionend', 700, function () {
          if (gate !== self) return; // relocked meanwhile
          self.remove();
          gate = null;
          root.classList.remove('is-locked', 'is-unlocking');
          root.style.removeProperty('--unlock-bg');
        });
        return;
      }
      failures++;
      input.value = '';
      input.classList.remove('is-shaking');
      void input.offsetWidth;
      input.classList.add('is-shaking');
      status.textContent = failures >= 2 ? 'Incorrect password. Returning home.' : 'Incorrect password';
      if (failures >= 2) {
        input.disabled = true;
        after(input, 'animationend', 500, leave);
      }
    });
  }

  // Show the gate in the very first frame: mount as soon as <body> exists
  // rather than after the whole page has parsed.
  var started = false;
  function start() {
    if (started || !document.body) return;
    started = true;
    mount();
  }
  start();
  if (!started) {
    var watch = new MutationObserver(function () {
      start();
      if (started) watch.disconnect();
    });
    watch.observe(root, { childList: true });
    document.addEventListener('DOMContentLoaded', function () {
      watch.disconnect();
      start();
    });
  }
})();
