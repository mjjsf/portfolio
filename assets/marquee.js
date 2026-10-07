// "Previously worked with" logo marquee. Logos are sized optically (wide
// wordmarks shorter, compact marks taller) and the set is repeated until it
// covers the column, then the track slides one set-width left on a loop.
(function () {
  var root = document.querySelector('.marquee');
  if (!root) return;
  var set = root.querySelector('.marquee-set');
  var imgs = Array.prototype.slice.call(set.querySelectorAll('img'));
  var track = document.createElement('div');
  track.className = 'marquee-track';
  root.insertBefore(track, set);
  track.appendChild(set);

  var REF_RATIO = 3;   // aspect ratio that renders at exactly --logo-h
  var SPEED = 25;      // px per second, independent of how many logos there are
  var still = window.matchMedia('(prefers-reduced-motion: reduce)');
  var lastKey = '';

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
    var setW = set.getBoundingClientRect().width;
    var copies = still.matches || !setW ? 0 : Math.ceil(root.clientWidth / setW);
    var key = setW + ':' + copies;
    if (key === lastKey) return;
    lastKey = key;

    track.querySelectorAll('.marquee-set[aria-hidden]').forEach(function (c) { c.remove(); });
    for (var i = 0; i < copies; i++) {
      var clone = set.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.querySelectorAll('img').forEach(function (img) { img.alt = ''; });
      track.appendChild(clone);
    }
    track.style.setProperty('--set-w', setW + 'px');
    track.style.setProperty('--marquee-duration', (setW / SPEED).toFixed(2) + 's');
    track.classList.toggle('is-moving', copies > 0);
  }

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
})();
