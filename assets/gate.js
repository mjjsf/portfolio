// Password gate for a case study. Load synchronously in <head>:
//   <script src="../../assets/gate.js?v=1"></script>
// Optional: data-password="…" (default below), data-home="…" (default: site root).
// A deterrent only; the page source is still readable.
(function () {
  var script = document.currentScript;
  var password = script.getAttribute('data-password') || 'hello2027';
  var assets = new URL('./', script.src);
  var home = script.getAttribute('data-home') || new URL('../', assets).href;
  var key = 'gate:' + password;
  var root = document.documentElement;

  try {
    if (sessionStorage.getItem(key) === '1') return;
  } catch (e) {}
  root.classList.add('is-locked');

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

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (input.value === password) {
        try { sessionStorage.setItem(key, '1'); } catch (err) {}
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
        after(input, 'animationend', 500, function () {
          root.classList.add('is-leaving');
          after(gate, 'transitionend', 700, function () {
            window.location.href = home;
          });
        });
      }
    });
  });
})();
