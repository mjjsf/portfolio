(function () {
  var links = document.querySelectorAll('a[data-zoom]');
  if (!links.length) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var MARGIN = 24;
  var active = null;

  function open(link) {
    var thumb = link.querySelector('img');
    var rect = thumb.getBoundingClientRect();
    var natW = thumb.naturalWidth || rect.width;
    var natH = thumb.naturalHeight || rect.height;
    var scale = Math.min(
      (window.innerWidth - MARGIN * 2) / rect.width,
      (window.innerHeight - MARGIN * 2) / rect.height,
      natW / rect.width
    );
    if (scale <= 1.02) return false; // No room to enlarge; let the link open the file.

    var layer = document.createElement('div');
    layer.className = 'zoom-layer';
    layer.setAttribute('role', 'dialog');
    layer.setAttribute('aria-label', 'Enlarged image. Click or press Escape to close.');
    layer.tabIndex = -1;

    var img = thumb.cloneNode();
    img.removeAttribute('loading');
    img.className = 'zoom-img';
    img.style.left = rect.left + 'px';
    img.style.top = rect.top + 'px';
    img.style.width = rect.width + 'px';
    img.style.height = rect.height + 'px';
    // Match corners that are rounded in the image file itself (radius in source pixels),
    // so the shadow doesn't show through the transparent corners.
    var radius = parseFloat(link.getAttribute('data-zoom-radius'));
    if (radius) img.style.borderRadius = (radius * rect.width / natW) + 'px';
    layer.appendChild(img);
    document.body.appendChild(layer);

    var dx = window.innerWidth / 2 - (rect.left + rect.width / 2);
    var dy = window.innerHeight / 2 - (rect.top + rect.height / 2);
    img.getBoundingClientRect(); // Commit the start position before transitioning.
    img.style.transform = 'translate(' + dx + 'px, ' + dy + 'px) scale(' + scale + ')';
    layer.classList.add('is-open');

    active = { layer: layer, link: link };
    layer.addEventListener('click', close);
    layer.focus({ preventScroll: true });
    return true;
  }

  function close() {
    if (!active) return;
    var layer = active.layer;
    var link = active.link;
    active = null;
    layer.classList.remove('is-open');
    layer.classList.add('is-closing');
    var done = function () { layer.remove(); };
    if (reduceMotion.matches) done();
    else setTimeout(done, 350);
    link.focus({ preventScroll: true });
  }

  Array.prototype.forEach.call(links, function (link) {
    link.addEventListener('click', function (e) {
      if (active) {
        e.preventDefault();
        close();
      } else if (open(link)) {
        e.preventDefault();
      }
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && active) close();
  });
  window.addEventListener('resize', close);
  window.addEventListener('scroll', close, { passive: true });
})();
