// Password gate for a case study. Load synchronously in <head>:
//   <script src="../../assets/gate.js?v=5"></script>
// Optional: data-password="…" (default below), data-home="…" (default: site root).
// The password is asked for on every visit; nothing is remembered.
// A deterrent only; the page source is still readable.
(function () {
  var script = document.currentScript;
  var password = script.getAttribute('data-password') || 'hello2027';
  var assets = new URL('./', script.src);
  var home = script.getAttribute('data-home') || new URL('../', assets).href;
  var root = document.documentElement;

  root.classList.add('is-locked');

  // Leaving for home cross-fades the two pages where the browser supports
  // cross-document view transitions (home opts in too); arriving does not.
  var crossFade = 'CSSViewTransitionRule' in window &&
    !matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (crossFade) {
    var opt = document.createElement('style');
    opt.textContent = '@view-transition { navigation: auto; }';
    document.head.appendChild(opt);
  }
  addEventListener('pagereveal', function (e) {
    if (e.viewTransition) e.viewTransition.skipTransition();
  });

  // Back/forward cache would restore an unlocked (or half-faded) page; start over.
  addEventListener('pageshow', function (e) {
    if (e.persisted) location.reload();
  });

  document.addEventListener('DOMContentLoaded', function () {
    var gate = document.createElement('div');
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

    var form = gate.querySelector('form');
    var input = gate.querySelector('input');
    var status = gate.querySelector('[role="status"]');
    var failures = 0;
    input.focus();

    var flow = document.createElement('script');
    flow.src = new URL('flow.js?v=8', assets).href;
    document.body.appendChild(flow);

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

    // Go home in one cross-fade; otherwise fade the gate out and let home
    // fade in (see index.html).
    function leave() {
      input.disabled = true;
      try { sessionStorage.setItem('gate-fade', '1'); } catch (e) {}
      if (crossFade) {
        window.location.href = home;
        return;
      }
      root.classList.add('is-leaving');
      after(gate, 'transitionend', 700, function () {
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
        root.classList.add('is-unlocking');
        after(gate, 'transitionend', 700, function () {
          gate.remove();
          root.classList.remove('is-locked', 'is-unlocking');
          window.scrollTo(0, 0);
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
  });
})();
