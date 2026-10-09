/* DPRO Health — price comparison renderer.
   Data: /compare/data.json (built by compare/data/build.py).
   Each card: pick a vial size, see every vendor's price for that size.
   Every Buy link is /go/<vendor>/<slug>; _redirects adds the affiliate ref. */
(function () {
  'use strict';
  var root = document.getElementById('cmp');
  if (!root) return;

  var ORDER = ['glp1','heal','gh','fat','immune','sex','cog','sleep','long','skin'];
  var LABELS = {glp1:'GLP-1',heal:'Healing',gh:'Growth hormone',fat:'Fat loss',immune:'Immune',
                sex:'Sexual health',cog:'Cognitive',sleep:'Sleep',long:'Longevity',skin:'Skin & hair'};
  var VORDER = ['modern','glacier','peptira'];
  var D, items = [], goal = 'all', term = '', mode = 'single', sort = 'popular', popRank = {};
  var picked = {};   // compound name -> chosen mg

  try {
    if (localStorage.getItem('dpro-cmp-mode') === 'kit') mode = 'kit';
    var s = localStorage.getItem('dpro-cmp-sort'); if (s === 'name' || s === 'cat') sort = s;
  } catch (e) {}

  fetch(root.getAttribute('data-src'))
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) { D = d; items = d.items; init(); })
    .catch(function () {
      root.innerHTML = '<p class="cat-empty">Prices are temporarily unavailable. <a href="/catalogs">Browse the catalogs →</a></p>';
    });

  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function usd(c){ return '$' + (Math.round(c) / 100).toFixed(2); }
  function vial(o) { return (mode === 'kit' && o.k) ? o.k / 10 : o.p; }
  function perMg(o) { return o.mg ? vial(o) / o.mg : null; }

  // sizes on offer, and the default: the size the most vendors sell (ties -> smaller)
  function sizes(i) {
    var by = {};
    i.o.forEach(function (o) { if (o.mg) (by[o.mg] = by[o.mg] || {})[o.v] = 1; });
    return Object.keys(by).map(Number).sort(function (a, b) { return a - b; })
      .map(function (mg) { return { mg: mg, n: Object.keys(by[mg]).length }; });
  }
  function defaultSize(sz) {
    var best = sz[0];
    sz.forEach(function (s) { if (s.n > best.n) best = s; });
    return best ? best.mg : null;
  }

  function init() {
    (D.popular || []).forEach(function (n, k) { popRank[n] = k; });
    items.forEach(function (i) { i._sz = sizes(i); picked[i.n] = defaultSize(i._sz); });

    var vd = document.querySelector('[data-verified]');
    if (vd) vd.textContent = new Date(D.verified + 'T00:00:00')
      .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    document.querySelectorAll('[data-count]').forEach(function (el) { el.textContent = items.length; });

    var counts = {};
    items.forEach(function (i) { counts[i.g] = (counts[i.g] || 0) + 1; });
    var chips = '<button class="fchip on" data-g="all" type="button">All<span class="n">' + items.length + '</span></button>' +
                '<button class="fchip pop" data-g="popular" type="button">★ Popular<span class="n">' + (D.popular || []).length + '</span></button>';
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

    seg('mode', mode, function (v) { mode = v; try { localStorage.setItem('dpro-cmp-mode', v); } catch (e) {} });
    var so = document.getElementById('sort');
    so.value = sort;
    so.addEventListener('change', function () {
      sort = so.value; try { localStorage.setItem('dpro-cmp-sort', sort); } catch (e) {} render();
    });

    // size picks inside cards
    root.addEventListener('click', function (e) {
      var b = e.target.closest('.sz'); if (!b) return;
      var card = b.closest('.cmp'); var name = card.getAttribute('data-n');
      picked[name] = Number(b.getAttribute('data-mg'));
      var i = items.filter(function (x) { return x.n === name; })[0];
      card.outerHTML = cardHtml(i);
    });
    render();
  }

  function seg(id, val, set) {
    var tg = document.getElementById(id);
    tg.querySelectorAll('button').forEach(function (b) {
      var on = b.getAttribute('data-m') === val; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
    });
    tg.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      set(b.getAttribute('data-m'));
      tg.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
      render();
    });
  }

  function vendorRow(v, o, others, best, mg, unsized) {
    var name = esc(D.vendors[v]);
    if (!o) {
      var txt = unsized ? 'Size not listed &middot; ' + usd(unsized.p)
              : others.length ? 'No ' + mg + 'mg &middot; has ' + others.map(function (x) { return x.mg + 'mg'; }).join(', ')
              : 'Not carried';
      var go = unsized && unsized.s ? '<a class="vr-go" href="' + unsized.u + '" target="_blank" rel="sponsored noopener">View <span class="arrow">→</span></a>' : '';
      return '<div class="vr none"><span class="vr-n">' + name + '</span><span class="vr-x">' + txt + '</span>' + go + '</div>';
    }
    var st = !o.s ? 'Sold out' : mode !== 'kit' ? 'In stock' : (o.k ? '10 for ' + usd(o.k) : 'No kit &middot; single');
    return '<div class="vr' + (best ? ' best' : '') + (o.s ? '' : ' oos') + '">' +
      '<span class="vr-n">' + name + '<span class="vr-st ' + (o.s ? 'in' : 'out') + '">' + st + '</span></span>' +
      '<span class="vr-p"><b>' + usd(vial(o)) + '</b><i>' + usd(perMg(o)) + '/mg</i></span>' +
      (o.s ? '<a class="vr-go" href="' + o.u + '" target="_blank" rel="sponsored noopener" aria-label="Buy at ' + name + '">Buy <span class="arrow">→</span></a>'
           : '<span class="vr-go off">—</span>') +
    '</div>';
  }

  function cardHtml(i) {
    var mg = picked[i.n];
    var at = i.o.filter(function (o) { return o.mg === mg; });
    var instock = at.filter(function (o) { return o.s; }).sort(function (a, b) { return vial(a) - vial(b); });
    var best = instock.length > 1 ? instock[0] : null;
    // vendor rows: cheapest first, vendors without this size last
    var rows = VORDER.map(function (v) {
      var o = at.filter(function (x) { return x.v === v; })[0];
      return { v: v, o: o, others: i.o.filter(function (x) { return x.v === v && x.mg && x.mg !== mg; }),
               unsized: i.o.filter(function (x) { return x.v === v && !x.mg; })[0] };
    }).sort(function (a, b) {
      var ka = a.o ? (a.o.s ? 0 : 1) : 2, kb = b.o ? (b.o.s ? 0 : 1) : 2;
      return ka - kb || (a.o && b.o ? vial(a.o) - vial(b.o) : 0);
    });
    // best value at any size
    var any = i.o.filter(function (o) { return o.s && o.mg; }).sort(function (a, b) { return perMg(a) - perMg(b); })[0];
    var sub = i.c ? i.note : (i.note || '');
    return '<article class="cmp" data-n="' + esc(i.n) + '">' +
      '<header class="cmp-h">' +
        '<h3 class="cmp-n">' + (popRank[i.n] !== undefined ? '<span class="cmp-star" title="Popular">★</span>' : '') + esc(i.n) + '</h3>' +
        '<span class="cmp-tag t-' + i.g + '">' + LABELS[i.g] + '</span>' +
      '</header>' +
      '<p class="cmp-sub"' + (i.c ? ' title="Vendors code their GLP-1s. Matched by likely compound, not confirmed by the vendors."' : '') + '>' +
        (sub ? (i.c ? 'Coded: ' : '') + esc(sub) : '&nbsp;') + '</p>' +
      '<div class="szs" role="group" aria-label="Vial size">' +
        i._sz.map(function (s) {
          return '<button type="button" class="sz' + (s.mg === mg ? ' on' : '') + '" data-mg="' + s.mg + '" aria-pressed="' + (s.mg === mg) + '">' + s.mg + 'mg</button>';
        }).join('') +
      '</div>' +
      '<div class="vrs">' + rows.map(function (r) { return vendorRow(r.v, r.o, r.others, r.o && r.o === best, mg, r.unsized); }).join('') + '</div>' +
      '<footer class="cmp-f">' + (any
        ? 'Best value, any size: <b>' + esc(D.vendors[any.v]) + '</b> ' + any.mg + 'mg &middot; <b>' + usd(perMg(any)) + '/mg</b>'
        : '&nbsp;') + '</footer>' +
    '</article>';
  }

  function grid(list) { return '<div class="cmp-grid">' + list.map(cardHtml).join('') + '</div>'; }
  function byName(a, b) { return a.n.localeCompare(b.n); }
  function isPop(i) { return popRank[i.n] !== undefined; }
  function byPop(a, b) { return popRank[a.n] - popRank[b.n]; }

  function render() {
    var list = items.filter(function (i) {
      if (goal === 'popular' && !isPop(i)) return false;
      if (goal !== 'all' && goal !== 'popular' && i.g !== goal) return false;
      return !term || (i.n + ' ' + (i.note || '')).toLowerCase().indexOf(term) !== -1;
    });
    var html = '';
    if (sort === 'cat') {
      ORDER.forEach(function (g) {
        var grp = list.filter(function (i) { return i.g === g; }).sort(byName);
        if (grp.length) html += '<h2 class="cmp-g">' + LABELS[g] + '</h2>' + grid(grp);
      });
    } else if (sort === 'name') {
      html = grid(list.slice().sort(byName));
    } else {
      var pop = list.filter(isPop).sort(byPop), rest = list.filter(function (i) { return !isPop(i); }).sort(byName);
      if (pop.length) html += (rest.length ? '<h2 class="cmp-g">★ Most popular</h2>' : '') + grid(pop);
      if (rest.length) html += (pop.length ? '<h2 class="cmp-g">Everything else</h2>' : '') + grid(rest);
    }
    root.innerHTML = html || '<p class="cat-empty">Nothing matches. Try another name or clear the filter.</p>';
    var c = document.getElementById('count');
    if (c) c.textContent = list.length + ' compound' + (list.length === 1 ? '' : 's') +
                           (mode === 'kit' ? ' · 10-vial kit prices' : ' · single-vial prices');
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
