// "Previously worked with" logo marquee. Logos are sized optically (wide
// wordmarks shorter, compact marks taller) and the set is repeated until it
// covers the column, then the track drifts left one set-width at a time.
// Hovering eases it to a stop, dragging scrubs it, and on release it glides
// back into its leftward drift. Speed changes run through a critically damped spring
// so nothing starts or stops abruptly.
(function () {
  var root = document.querySelector('.marquee');
  if (!root) return;
  var set = root.querySelector('.marquee-set');
  var imgs = Array.prototype.slice.call(set.querySelectorAll('img'));
  var track = document.createElement('div');
  track.className = 'marquee-track';
  root.insertBefore(track, set);
  track.appendChild(set);

  var REF_RATIO = 3;     // aspect ratio that renders at exactly --logo-h
  var SPEED = 25;        // px per second, independent of how many logos there are
  var STIFFNESS = 60;    // spring pulling velocity toward its target
  var DAMPING = 2 * Math.sqrt(STIFFNESS); // critical: settles without overshoot
  var MAX_FLING = 2500;  // px per second, caps a hard flick
  var still = window.matchMedia('(prefers-reduced-motion: reduce)');
  var lastKey = '';

  var setW = 0;
  var active = false;    // enough copies exist to loop
  var visible = true;
  var hovering = false;
  var x = 0, v = 0, a = 0;
  var raf = 0, lastT = 0;
  var drag = null;

  // Equalise visual area: height scales with 1 / sqrt(aspect ratio).
  function size() {
    var base = parseFloat(getComputedStyle(root).getPropertyValue('--logo-h')) || 28;
    imgs.forEach(function (img) {
      if (!img.naturalWidth || !img.naturalHeight) return;
      var aspect = img.naturalWidth / img.naturalHeight;
      var scale = parseFloat(img.dataset.scale) || 1;
      img.style.height = (base * Math.sqrt(REF_RATIO / aspect) * scale).toFixed(2) + 'px';
    });
  }

  function build() {
    size();
    setW = set.getBoundingClientRect().width;
    // With reduced motion the marquee only loops (for dragging) when the
    // logos don't all fit; otherwise it sits still.
    var overflows = setW > root.clientWidth;
    var copies = !setW || (still.matches && !overflows) ? 0 : Math.ceil(root.clientWidth / setW);
    var key = setW + ':' + copies;
    if (key === lastKey) return kick();
    lastKey = key;

    track.querySelectorAll('.marquee-set[aria-hidden]').forEach(function (c) { c.remove(); });
    for (var i = 0; i < copies; i++) {
      var clone = set.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.querySelectorAll('img').forEach(function (img) { img.alt = ''; });
      track.appendChild(clone);
    }
    active = copies > 0;
    track.classList.toggle('is-moving', active);
    root.classList.toggle('is-draggable', active);
    if (!active) { x = v = a = 0; }
    render();
    kick();
  }

  // Keep the offset within one set-width so the seam never shows.
  function wrap(n) {
    if (!setW) return 0;
    n %= setW;
    return n > 0 ? n - setW : n;
  }

  function render() {
    x = wrap(x);
    track.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
  }

  function target() {
    return still.matches || hovering ? 0 : -SPEED;
  }

  function frame(t) {
    raf = 0;
    var dt = Math.min((t - lastT) / 1000, 0.1); // no leap after a hidden tab
    lastT = t;
    if (!drag) {
      // Small fixed steps keep the spring stable on slow or uneven frames.
      for (var steps = Math.ceil(dt * 240), h = dt / steps, i = 0; i < steps; i++) {
        a += (STIFFNESS * (target() - v) - DAMPING * a) * h;
        v += a * h;
        x += v * h;
      }
      render();
      if (!target() && Math.abs(v) < 0.5 && Math.abs(a) < 0.5) {
        v = a = 0;
        return; // at rest; the next input restarts the loop
      }
    }
    if (visible && active) raf = requestAnimationFrame(frame);
  }

  function kick() {
    if (raf || !visible || !active) return;
    lastT = performance.now();
    raf = requestAnimationFrame(frame);
  }

  // ---- Hover: ease to a stop (mouse and pen; touch has no hover) ----

  root.addEventListener('pointerenter', function (e) {
    if (e.pointerType === 'touch') return;
    hovering = true;
    kick();
  });
  root.addEventListener('pointerleave', function () {
    hovering = false;
    kick();
  });

  // ---- Drag: follow the pointer 1:1, then fling back into the drift ----

  root.addEventListener('pointerdown', function (e) {
    if (!active || e.button !== 0) return;
    if (e.pointerType === 'mouse') e.preventDefault();
    root.setPointerCapture(e.pointerId);
    root.classList.add('is-dragging');
    drag = { id: e.pointerId, fromX: e.clientX, fromOffset: x, lastX: e.clientX, lastT: e.timeStamp, vel: 0 };
    v = a = 0;
  });

  root.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dt = e.timeStamp - drag.lastT;
    if (dt > 0) {
      // Smooth the release velocity so one jittery sample can't dominate.
      var inst = (e.clientX - drag.lastX) / dt * 1000;
      drag.vel += (inst - drag.vel) * Math.min(1, dt / 50);
    }
    drag.lastX = e.clientX;
    drag.lastT = e.timeStamp;
    x = drag.fromOffset + (e.clientX - drag.fromX);
    render();
  });

  function release(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var moved = Math.abs(e.clientX - drag.fromX) > 4;
    var held = e.timeStamp - drag.lastT > 100; // stopped before letting go
    var fling = moved && !held && !still.matches ? drag.vel : 0;
    // Only a leftward flick carries momentum: letting go always continues
    // right to left, never gliding backwards first.
    v = Math.max(-MAX_FLING, Math.min(0, fling));
    a = 0;
    drag = null;
    hovering = false; // resume on release; hover pauses again on next entry
    root.classList.remove('is-dragging');
    kick();
  }
  root.addEventListener('pointerup', release);
  root.addEventListener('pointercancel', release);

  // ---- Lifecycle ----

  var pending = imgs.length;
  function loaded() { if (--pending <= 0) build(); }
  imgs.forEach(function (img) {
    if (img.complete) loaded();
    else {
      img.addEventListener('load', loaded);
      img.addEventListener('error', loaded);
    }
  });
  if (!imgs.length) build();

  var timer;
  function rebuild() {
    clearTimeout(timer);
    timer = setTimeout(build, 150);
  }
  if (window.ResizeObserver) new ResizeObserver(rebuild).observe(root);
  else window.addEventListener('resize', rebuild);
  if (still.addEventListener) still.addEventListener('change', build);

  // Don't animate while scrolled out of view.
  if (window.IntersectionObserver) {
    new IntersectionObserver(function (entries) {
      visible = entries[entries.length - 1].isIntersecting;
      kick();
    }).observe(root);
  }
})();
