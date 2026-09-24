// Liquid glass cursor: a small opalescent circle that follows the pointer
// and turns magenta while the mouse button is held. Mouse/trackpad only.
(function () {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  var dot = document.createElement('div');
  dot.className = 'cursor';
  dot.setAttribute('aria-hidden', 'true');
  document.body.appendChild(dot);
  document.documentElement.classList.add('has-cursor');

  var releaseTimer;

  document.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    dot.style.transform = 'translate3d(' + e.clientX + 'px,' + e.clientY + 'px,0)';
    dot.classList.add('is-visible');
  });

  document.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'mouse') return;
    clearTimeout(releaseTimer);
    dot.classList.add('is-pressed');
  });

  document.addEventListener('pointerup', function () {
    // Hold the magenta briefly so a quick click still shows it.
    releaseTimer = setTimeout(function () { dot.classList.remove('is-pressed'); }, 250);
  });

  document.documentElement.addEventListener('mouseleave', function () {
    dot.classList.remove('is-visible');
  });
})();
