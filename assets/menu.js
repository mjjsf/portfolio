(function () {
  var header = document.querySelector('.site-header');
  var button = header && header.querySelector('.menu-toggle');
  var nav = header && header.querySelector('#site-nav');
  if (!button || !nav) return;

  function setOpen(open) {
    header.classList.toggle('is-open', open);
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
    button.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }

  header.classList.add('has-menu');
  button.hidden = false;
  button.addEventListener('click', function () {
    setOpen(!header.classList.contains('is-open'));
  });
  nav.addEventListener('click', function (e) {
    if (e.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && header.classList.contains('is-open')) {
      setOpen(false);
      button.focus();
    }
  });
})();
