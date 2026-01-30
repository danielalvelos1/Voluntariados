// Minimal Bootstrap initializer: tooltips and popovers
document.addEventListener('DOMContentLoaded', function () {
  try {
    if (window.bootstrap) {
      var t = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
      t.forEach(function (el) { new bootstrap.Tooltip(el); });
      var p = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
      p.forEach(function (el) { new bootstrap.Popover(el); });
    }
  } catch (e) { console.warn('bootstrap-init error', e); }
});
