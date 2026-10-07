/**
 * The Table / Review switcher: swaps the visible panel with a short slide in the direction of
 * travel, slides the switcher's highlight under the active option, keeps the ARIA state in step,
 * and supports arrow-key movement between options. The open view can be linked with a bare hash,
 * e.g. <base-url>#review.
 */
(function () {
  const buttons = Array.from(document.querySelectorAll('.view-switcher .switch-btn'));
  const thumb = document.querySelector('.view-switcher .switch-thumb');
  const content = document.getElementById('view-content');
  const order = buttons.map((button) => button.dataset.view);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let current = 'table';

  /** Puts the highlight under the active option. Measured, since the options differ in width. */
  function placeThumb() {
    const active = buttons.find((button) => button.dataset.view === current);
    thumb.style.width = `${active.offsetWidth}px`;
    thumb.style.transform = `translateX(${active.offsetLeft - buttons[0].offsetLeft}px)`;
  }

  function show(view, { animate = true, focus = false } = {}) {
    if (view === current || !order.includes(view)) return;
    const forward = order.indexOf(view) > order.indexOf(current);
    current = view;
    buttons.forEach((button) => {
      const active = button.dataset.view === view;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
      if (active && focus) button.focus();
    });
    placeThumb();

    const swap = () => {
      buttons.forEach((button) => {
        document.getElementById(button.getAttribute('aria-controls')).hidden = button.dataset.view !== view;
      });
    };
    if (!animate || reducedMotion) {
      swap();
      return;
    }
    content.className = forward ? 'slide-exit-left' : 'slide-exit-right';
    content.addEventListener('animationend', function onExit() {
      content.removeEventListener('animationend', onExit);
      swap();
      content.className = forward ? 'slide-enter-right' : 'slide-enter-left';
    });
  }

  buttons.forEach((button, index) => {
    button.addEventListener('click', () => show(button.dataset.view));
    button.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      event.preventDefault();
      const next = buttons[(index + (event.key === 'ArrowRight' ? 1 : buttons.length - 1)) % buttons.length];
      show(next.dataset.view, { focus: true });
    });
  });

  // Place the highlight without its slide on first paint, then let later moves animate.
  thumb.style.transition = 'none';
  const fromHash = window.location.hash.slice(1);
  if (order.includes(fromHash)) show(fromHash, { animate: false });
  placeThumb();
  requestAnimationFrame(() => requestAnimationFrame(() => { thumb.style.transition = ''; }));

  // Option widths change with the webfont loading and with the narrow layout.
  window.addEventListener('resize', placeThumb);
  if (document.fonts) document.fonts.ready.then(placeThumb);
})();
