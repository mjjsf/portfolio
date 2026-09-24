// Dot cursor: a small black circle that follows the pointer, turns blue and
// squishes on press, then springs back with a little wobble on release.
// Mouse/trackpad only.
(function () {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  var dot = document.createElement('div');
  dot.className = 'cursor';
  dot.setAttribute('aria-hidden', 'true');
  document.body.appendChild(dot);
  document.documentElement.classList.add('has-cursor');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Damped spring driving the scale: underdamped so release overshoots and settles.
  var STIFFNESS = 600;
  var DAMPING = 18;
  var PRESSED_SCALE = 0.75;

  var x = 0, y = 0;
  var scale = 1, velocity = 0, target = 1;
  var lastTime = 0, frame = 0;
  var releaseTimer;

  function render() {
    dot.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) scale(' + scale + ')';
  }

  function step(now) {
    // Clamp dt so a backgrounded tab doesn't blow up the integration.
    var dt = Math.min((now - lastTime) / 1000, 1 / 30);
    lastTime = now;
    velocity += (-STIFFNESS * (scale - target) - DAMPING * velocity) * dt;
    scale += velocity * dt;
    if (Math.abs(scale - target) < 0.001 && Math.abs(velocity) < 0.01) {
      scale = target;
      velocity = 0;
      frame = 0;
    } else {
      frame = requestAnimationFrame(step);
    }
    render();
  }

  function setTarget(value) {
    target = value;
    if (reduceMotion.matches) {
      scale = target;
      velocity = 0;
      render();
      return;
    }
    if (!frame) {
      lastTime = performance.now();
      frame = requestAnimationFrame(step);
    }
  }

  document.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    x = e.clientX;
    y = e.clientY;
    render();
    dot.classList.add('is-visible');
  });

  document.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'mouse') return;
    clearTimeout(releaseTimer);
    dot.classList.add('is-pressed');
    setTarget(PRESSED_SCALE);
  });

  document.addEventListener('pointerup', function () {
    // Hold the blue briefly so a quick click still shows it.
    releaseTimer = setTimeout(function () { dot.classList.remove('is-pressed'); }, 150);
    setTarget(1);
  });

  document.documentElement.addEventListener('mouseleave', function () {
    dot.classList.remove('is-visible');
  });
})();
