/* DPRO Health — vendor catalog renderer.
   One script drives every /catalogs/<vendor> page. The page supplies
   data-src (the JSON) on #cat; everything else is derived from it.
   Product links point at /go/<vendor>/<slug>, which _redirects turns into the
   affiliate-tagged product URL — so codes live in one file, not 150 hrefs. */
(function () {
  'use strict';
  var root = document.getElementById('cat');
  if (!root) return;

  var ORDER = ['glp1','fat','gh','heal','immune','sex','cog','sleep','long','skin','sarm','amino','supply','other'];
  var D, items = [], goal = 'all', term = '';

  fetch(root.getAttribute('data-src'))
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) { D = d; items = d.items; init(); })
    .catch(function () {
      root.innerHTML = '<p class="cat-empty">Catalog is temporarily unavailable. ' +
        '<a href="' + (root.getAttribute('data-home') || '/vendors') + '">Visit the store directly →</a></p>';
    });

  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }

  function init() {
    var cats = ORDER.filter(function (g) { return D.counts[g]; });

    document.querySelectorAll('[data-count]').forEach(function (el) {
      el.textContent = items.length;
    });
    var vd = document.querySelector('[data-verified]');
    if (vd) {
      var d = new Date(D.verified + 'T00:00:00');
      vd.textContent = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    var chips = '<button class="fchip on" data-g="all" type="button">All<span class="n">' + items.length + '</span></button>';
    cats.forEach(function (g) {
      chips += '<button class="fchip" data-g="' + g + '" type="button">' +
               esc(D.labels[g] || g) + '<span class="n">' + D.counts[g] + '</span></button>';
    });
    document.getElementById('chips').innerHTML = chips;

    document.getElementById('chips').addEventListener('click', function (e) {
      var b = e.target.closest('.fchip'); if (!b) return;
      goal = b.getAttribute('data-g');
      this.querySelectorAll('.fchip').forEach(function (x) { x.classList.toggle('on', x === b); });
      render();
    });
    document.getElementById('q').addEventListener('input', function () {
      term = this.value.trim().toLowerCase(); render();
    });
    render();
  }

  function card(i) {
    return '<a class="crow" href="' + i.u + '" target="_blank" rel="sponsored noopener">' +
             '<span class="crow-main">' +
               '<span class="crow-n">' + esc(i.n) + '</span>' +
               (i.d ? '<span class="crow-d">' + esc(i.d) + '</span>' : '') +
             '</span>' +
             '<span class="crow-go">View <span class="arrow">→</span></span>' +
           '</a>';
  }

  function render() {
    var list = items.filter(function (i) {
      if (goal !== 'all' && i.g !== goal) return false;
      if (!term) return true;
      return i.n.toLowerCase().indexOf(term) > -1 ||
             i.s.indexOf(term) > -1 ||
             (i.d || '').toLowerCase().indexOf(term) > -1;
    });

    document.getElementById('count').textContent =
      list.length + (list.length === 1 ? ' product' : ' products') +
      (goal === 'all' ? '' : ' in ' + (D.labels[goal] || goal)) +
      (term ? ' matching "' + term + '"' : '');

    if (!list.length) {
      root.innerHTML = '<p class="cat-empty">Nothing matches that. <button type="button" class="cat-reset">Clear filters</button></p>';
      root.querySelector('.cat-reset').onclick = function () {
        term = ''; goal = 'all';
        document.getElementById('q').value = '';
        document.querySelectorAll('.fchip').forEach(function (x) {
          x.classList.toggle('on', x.getAttribute('data-g') === 'all'); });
        render();
      };
      return;
    }

    if (goal !== 'all' || term) {
      root.innerHTML = '<div class="clist">' + list.map(card).join('') + '</div>';
      return;
    }
    var html = '';
    ORDER.forEach(function (g) {
      var sub = list.filter(function (i) { return i.g === g; });
      if (!sub.length) return;
      html += '<div class="cgroup"><div class="group-h"><h2>' + esc(D.labels[g] || g) +
              '</h2><span class="gn">' + sub.length + '</span></div>' +
              '<div class="clist">' + sub.map(card).join('') + '</div></div>';
    });
    root.innerHTML = html;
  }

  /* copy-code buttons */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.copycode'); if (!b) return;
    var code = b.getAttribute('data-code');
    var done = function () {
      var t = b.querySelector('.cc-t'); if (!t) return;
      var was = t.textContent; t.textContent = 'Copied'; b.classList.add('ok');
      setTimeout(function () { t.textContent = was; b.classList.remove('ok'); }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(done, done);
    } else {
      var ta = document.createElement('textarea');
      ta.value = code; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (err) {}
      ta.remove(); done();
    }
  });
})();
