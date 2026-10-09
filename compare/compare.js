/* DPRO Health — price comparison renderer.
   Data: /compare/data.json (built by compare/data/build.py).
   Every offer links to /go/<vendor>/<slug>; _redirects adds the affiliate ref. */
(function () {
  'use strict';
  var root = document.getElementById('cmp');
  if (!root) return;

  var ORDER = ['glp1','heal','gh','fat','immune','sex','cog','sleep','long','skin'];
  var LABELS = {glp1:'GLP-1s',heal:'Healing & recovery',gh:'Growth hormone',fat:'Fat loss',immune:'Immune',
                sex:'Sexual & hormonal',cog:'Cognitive',sleep:'Sleep',long:'Longevity',skin:'Skin & hair'};
  var D, items = [], goal = 'all', term = '', mode = 'single';

  try { var m = localStorage.getItem('dpro-cmp-mode'); if (m === 'kit') mode = 'kit'; } catch (e) {}

  fetch(root.getAttribute('data-src'))
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) { D = d; items = d.items; init(); })
    .catch(function () {
      root.innerHTML = '<p class="cat-empty">Prices are temporarily unavailable. <a href="/catalogs">Browse the catalogs →</a></p>';
    });

  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function usd(c){ return '$' + (Math.round(c) / 100).toFixed(2); }

  function init() {
    var vd = document.querySelector('[data-verified]');
    if (vd) vd.textContent = new Date(D.verified + 'T00:00:00')
      .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    document.querySelectorAll('[data-count]').forEach(function (el) { el.textContent = items.length; });

    var counts = {};
    items.forEach(function (i) { counts[i.g] = (counts[i.g] || 0) + 1; });
    var chips = '<button class="fchip on" data-g="all" type="button">All<span class="n">' + items.length + '</span></button>';
    ORDER.forEach(function (g) {
      if (counts[g]) chips += '<button class="fchip" data-g="' + g + '" type="button">' + LABELS[g] +
                              '<span class="n">' + counts[g] + '</span></button>';
    });
    var ch = document.getElementById('chips');
    ch.innerHTML = chips;
    ch.addEventListener('click', function (e) {
      var b = e.target.closest('.fchip'); if (!b) return;
      goal = b.getAttribute('data-g');
      ch.querySelectorAll('.fchip').forEach(function (x) { x.classList.toggle('on', x === b); });
      render();
    });
    document.getElementById('q').addEventListener('input', function () {
      term = this.value.trim().toLowerCase(); render();
    });
    var tg = document.getElementById('mode');
    tg.querySelectorAll('button').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-m') === mode);
      b.setAttribute('aria-pressed', b.getAttribute('data-m') === mode);
    });
    tg.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      mode = b.getAttribute('data-m');
      try { localStorage.setItem('dpro-cmp-mode', mode); } catch (err) {}
      tg.querySelectorAll('button').forEach(function (x) {
        x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b);
      });
      render();
    });
    render();
  }

  // price per vial for the current mode; kit falls back to single where no kit is sold
  function vial(o) { return (mode === 'kit' && o.k) ? o.k / 10 : o.p; }
  function perMg(o) { return o.mg ? vial(o) / o.mg : null; }

  function rank(offers) {
    return offers.slice().sort(function (a, b) {
      var ra = (a.s && a.mg) ? 0 : 1, rb = (b.s && b.mg) ? 0 : 1;
      if (ra !== rb) return ra - rb;
      var pa = perMg(a), pb = perMg(b);
      if (pa === null || pb === null) return (pa === null) - (pb === null);
      return pa - pb || vial(a) - vial(b);
    });
  }

  function row(o, best) {
    var kitNote = '';
    if (mode === 'kit') kitNote = o.k ? '<span class="r-sub">' + usd(o.k) + ' for 10</span>'
                                      : '<span class="r-sub">No kit &middot; single vial</span>';
    var pm = perMg(o);
    return '<tr class="' + (best ? 'best' : '') + (o.s ? '' : ' oos') + '">' +
      '<td class="r-v">' + esc(D.vendors[o.v]) + (best ? '<span class="r-tag">Lowest $/mg</span>' : '') + '</td>' +
      '<td class="r-mg">' + (o.mg ? o.mg + 'mg' : '<span class="r-sub">Size not listed</span>') + '</td>' +
      '<td class="r-p">' + usd(vial(o)) + kitNote + '</td>' +
      '<td class="r-pm">' + (pm === null ? '&mdash;' : usd(pm)) + '</td>' +
      '<td class="r-go">' + (o.s
         ? '<a href="' + o.u + '" target="_blank" rel="sponsored noopener">Buy <span class="arrow">→</span></a>'
         : '<span class="r-oos">Sold out</span>') + '</td></tr>';
  }

  function card(i) {
    var r = rank(i.o);
    var top = (r[0] && r[0].s && r[0].mg) ? r[0] : null;
    return '<article class="cmp">' +
      '<header class="cmp-h">' +
        '<div><h3 class="cmp-n">' + esc(i.n) + '</h3>' +
          (i.c ? '<span class="cmp-coded">' + esc(i.note) + '</span>' : (i.note ? '<span class="cmp-note">' + esc(i.note) + '</span>' : '')) +
        '</div>' +
        (top ? '<div class="cmp-win"><span class="w-l">Cheapest</span><span class="w-v">' + esc(D.vendors[top.v]) +
               '</span><span class="w-p">' + usd(perMg(top)) + '/mg</span></div>' : '') +
      '</header>' +
      (i.c ? '<p class="cmp-warn">Vendors code their GLP-1s. Matched by likely compound, not confirmed by the vendors.</p>' : '') +
      '<div class="cmp-tw"><table class="cmp-t"><thead><tr><th>Vendor</th><th>Vial</th><th>' +
        (mode === 'kit' ? 'Per vial (kit)' : 'Price') + '</th><th>$/mg</th><th></th></tr></thead><tbody>' +
        r.map(function (o) { return row(o, o === top); }).join('') +
      '</tbody></table></div></article>';
  }

  function render() {
    var list = items.filter(function (i) {
      if (goal !== 'all' && i.g !== goal) return false;
      return !term || (i.n + ' ' + (i.note || '')).toLowerCase().indexOf(term) !== -1;
    });
    var html = '';
    ORDER.forEach(function (g) {
      var grp = list.filter(function (i) { return i.g === g; });
      if (!grp.length) return;
      html += '<h2 class="cmp-g">' + LABELS[g] + '</h2><div class="cmp-grid">' + grp.map(card).join('') + '</div>';
    });
    root.innerHTML = html || '<p class="cat-empty">Nothing matches. Try another name or clear the filter.</p>';
    var c = document.getElementById('count');
    if (c) c.textContent = list.length + ' compound' + (list.length === 1 ? '' : 's') +
                           (mode === 'kit' ? ' · ranked by 10-vial kit price' : ' · ranked by single-vial price');
  }
  /* copy-code button */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.copycode'); if (!b) return;
    var code = b.getAttribute('data-code');
    var done = function () {
      var t = b.querySelector('.cc-t'); if (!t) return;
      var was = t.textContent; t.textContent = 'Copied'; b.classList.add('ok');
      setTimeout(function () { t.textContent = was; b.classList.remove('ok'); }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(done, done);
    else done();
  });
})();
