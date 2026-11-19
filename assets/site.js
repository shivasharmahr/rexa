/* Shared nav behaviour for pages that don't carry the inline script (styles.css pages). */
(function () {
  var nav = document.getElementById('navbar');
  var btn = document.getElementById('mobileMenuBtn');
  var menu = document.getElementById('mobileMenu');
  if (nav) {
    window.addEventListener('scroll', function () {
      var solid = window.scrollY > 20;
      nav.classList.toggle('shadow-sm', solid);
      nav.classList.toggle('bg-white', solid);
      nav.classList.toggle('bg-white/90', !solid);
    }, { passive: true });
  }
  if (btn && menu) {
    var setOpen = function (open) {
      menu.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
      btn.innerHTML = open ? '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
    };
    btn.addEventListener('click', function () { setOpen(!menu.classList.contains('open')); });
    menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });
  }
  var y = document.getElementById('copyYear');
  if (y) y.textContent = new Date().getFullYear();
})();
