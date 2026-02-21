// ─── SCROLL TO TOP ON LOAD ───
window.addEventListener('load', function() {
  setTimeout(() => window.scrollTo(0, 0), 0);
  setTimeout(() => document.documentElement.classList.add('loaded'), 100);
});

document.addEventListener('DOMContentLoaded', function() {
  window.scrollTo(0, 0);
});
