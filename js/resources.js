/* DPRO Health — resources page: section filter + search, copy-code pills. */
(function () {
  'use strict';
  var secs = [].slice.call(document.querySelectorAll('.rs-sec'));
  var chips = document.getElementById('rchips'), q = document.getElementById('rq'), empty = document.getElementById('rempty');
  var sec = 'all', term = '';
  function apply() {
    var shown = 0;
    secs.forEach(function (s) {
      var inSec = sec === 'all' || s.getAttribute('data-s') === sec, any = false;
      s.querySelectorAll('.rs-card,.rs-vend,.rs-feature').forEach(function (c) {
        var hit = inSec && (!term || c.textContent.toLowerCase().indexOf(term) !== -1);
        c.hidden = !hit; if (hit) any = true;
      });
      s.hidden = !any; if (any) shown++;
    });
    empty.hidden = shown > 0;
  }
  chips.addEventListener('click', function (e) {
    var b = e.target.closest('.fchip'); if (!b) return;
    sec = b.getAttribute('data-s');
    chips.querySelectorAll('.fchip').forEach(function (x) { x.classList.toggle('on', x === b); });
    apply();
  });
  q.addEventListener('input', function () { term = q.value.trim().toLowerCase(); apply(); });
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.copycode'); if (!b) return;
    var t = b.querySelector('.cc-t'), was = t ? t.textContent : '';
    var done = function () { if (!t) return; t.textContent = 'Copied'; b.classList.add('ok');
      setTimeout(function () { t.textContent = was; b.classList.remove('ok'); }, 1600); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(b.getAttribute('data-code')).then(done, done);
    else done();
  });
})();
