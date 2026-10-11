/* DPRO Health — Half-Life Visualizer
   Single-compartment model, instant absorption: amount(t) = Σ dose · e^(−k(t − tᵢ)), k = ln2 / half-life.
   Up to 3 series overlaid for comparison. Educational model only. */
(function () {
  'use strict';
  var DATA = window.DPRO_HL, root = document.getElementById('hl');
  if (!root || !DATA) return;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

  var COLORS = ['#0AA2BD', '#C2841F', '#9277EC']; // validated on the dark card surface
  var LETTERS = ['A', 'B', 'C'];
  var FREQ = [
    { k: '12',  t: 'Twice daily',              iv: 12 },
    { k: '24',  t: 'Once daily',               iv: 24 },
    { k: '48',  t: 'Every other day',          iv: 48 },
    { k: '72',  t: 'Every 3 days',             iv: 72 },
    { k: 'mwf', t: '3× per week (Mon/Wed/Fri)', pat: [0, 48, 96], per: 168 },
    { k: '84',  t: '2× per week',              iv: 84 },
    { k: '168', t: 'Once weekly',              iv: 168 },
    { k: '240', t: 'Every 10 days',            iv: 240 },
    { k: '336', t: 'Every 2 weeks',            iv: 336 },
    { k: '672', t: 'Every 4 weeks',            iv: 672 },
    { k: '1680', t: 'Every 10 weeks',          iv: 1680 }
  ];
  var EV = { human: ['Human data', 'ev-h'], animal: ['Animal data only', 'ev-a'], est: ['Estimate', 'ev-e'] };

  // flat compound list
  var LIST = [];
  DATA.forEach(function (g) { g.items.forEach(function (c) { c.group = g.g; LIST.push(c); }); });
  function byName(n) { for (var i = 0; i < LIST.length; i++) if (LIST[i].n === n) return LIST[i]; return null; }

  /* ---------- formatting ---------- */
  function num(v) { var n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : NaN; }
  function ok(n) { return isFinite(n) && n > 0; }
  function nice(x, d) { if (d == null) d = Math.abs(x) >= 100 ? 0 : Math.abs(x) >= 10 ? 1 : 2; return Number(x.toFixed(d)).toLocaleString('en-US', { maximumFractionDigits: d }); }
  function dur(h) {
    if (h < 1) return nice(h * 60, 0) + ' min';
    if (h < 48) return nice(h, h < 10 ? 1 : 0) + ' h';
    var d = h / 24; return nice(d, d < 10 ? 1 : 0) + ' days';
  }
  function amt(mcg) { if (mcg > 0 && mcg < 0.01) return '≈0'; return Math.abs(mcg) >= 1000 ? nice(mcg / 1000) + ' mg' : nice(mcg) + ' mcg'; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- state ---------- */
  var S = { series: [], active: 0, washout: true, ymode: 'abs' };
  function newSeries(name) {
    var c = byName(name || 'BPC-157');
    return { name: c ? c.n : 'Custom', custom: !c, ov: false, hov: '', dose: '', unit: 'mcg', freq: '24', n: '7' };
  }

  /* ---------- model ---------- */
  function hlOf(s) { var c = byName(s.name); if (s.custom || s.ov) return num(s.hov); return c ? c.h : NaN; }
  function freqOf(s) { return FREQ.filter(function (f) { return f.k === s.freq; })[0] || FREQ[1]; }
  function doseTimes(s) {
    var f = freqOf(s), n = Math.min(400, Math.max(1, Math.round(num(s.n) || 1))), out = [];
    for (var i = 0; i < n; i++) out.push(f.pat ? Math.floor(i / f.pat.length) * f.per + f.pat[i % f.pat.length] : i * f.iv);
    return out;
  }
  function avgInterval(s) { var f = freqOf(s); return f.pat ? f.per / f.pat.length : f.iv; }
  function model(s, i) {
    var h = hlOf(s), D = num(s.dose) * (s.unit === 'mg' ? 1000 : 1);
    if (!ok(h) || !ok(D)) return null;
    var k = Math.LN2 / h, T = doseTimes(s), tau = avgInterval(s), r = Math.exp(-k * tau), R = 1 / (1 - r);
    var last = T[T.length - 1];
    var m = { s: s, i: i, h: h, k: k, D: D, T: T, tau: tau, r: r, R: R, last: last, color: COLORS[i], c: byName(s.name) };
    m.at = function (t) { var a = 0; for (var j = 0; j < T.length && T[j] <= t; j++) a += D * Math.exp(-k * (t - T[j])); return a; };
    m.ssPct = 1 - Math.pow(r, T.length);          // fraction of steady state reached at the last dose
    m.peak = 0; for (var j = 0; j < T.length; j++) { var p = m.at(T[j]); if (p > m.peak) m.peak = p; }
    return m;
  }
  function samples(m, tEnd) {
    var pts = [], T = m.T, M = 36;
    for (var i = 0; i < T.length; i++) {
      var a = T[i], b = i + 1 < T.length ? T[i + 1] : tEnd;
      if (a > tEnd) break;
      b = Math.min(b, tEnd);
      var mm = i + 1 < T.length ? M : 120;
      for (var j = 0; j <= mm; j++) {
        var t = a + (b - a) * Math.pow(j / mm, 1.7);
        if (j === mm && i + 1 < T.length) t = b - 1e-6;
        pts.push([t, m.at(t)]);
      }
    }
    return pts;
  }

  /* ---------- chart ---------- */
  var CH = $('#hl-chart'), TIP = $('#hl-tip'), models = [], view = null;
  function niceStep(span, target) {
    var raw = span / target, p = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / p;
    return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * p;
  }
  function drawChart() {
    models = S.series.map(model).filter(Boolean);
    var empty = $('#hl-empty');
    if (!models.length) { CH.innerHTML = ''; empty.hidden = false; view = null; return; }
    empty.hidden = true;
    var tEnd = 0;
    models.forEach(function (m) { tEnd = Math.max(tEnd, m.last + (S.washout ? 5 * m.h : Math.max(m.tau, m.h))); });
    var maxLast = Math.max.apply(null, models.map(function (m) { return m.last; }));
    var rel = S.ymode === 'rel';
    var series = models.map(function (m) { return { m: m, pts: samples(m, tEnd) }; });
    var yMax = 0; series.forEach(function (x) { x.pts.forEach(function (p) { var v = rel ? p[1] / x.m.D : p[1]; if (v > yMax) yMax = v; }); });
    yMax *= 1.08;
    var W = Math.max(320, CH.clientWidth || 700), H = W < 520 ? 260 : 340, L = W < 520 ? 52 : 64, Rp = 16, Tp = 18, B = 40;
    var pw = W - L - Rp, ph = H - Tp - B;
    var useDays = tEnd > 72, xu = useDays ? 24 : 1;
    var xs = function (t) { return L + pw * t / tEnd; }, ys = function (v) { return Tp + ph * (1 - v / yMax); };
    var g = '';
    // washout band
    if (S.washout && maxLast < tEnd) g += '<rect x="' + xs(maxLast).toFixed(1) + '" y="' + Tp + '" width="' + (xs(tEnd) - xs(maxLast)).toFixed(1) + '" height="' + ph + '" fill="rgba(255,255,255,.025)"/>' +
      '<text x="' + (xs(maxLast) + 8).toFixed(1) + '" y="' + (Tp + 14) + '" class="hl-ax">AFTER LAST DOSE</text>';
    // y grid
    var ys_ = niceStep(yMax, 4);
    for (var v = 0; v <= yMax + 1e-9; v += ys_) {
      g += '<line x1="' + L + '" x2="' + (W - Rp) + '" y1="' + ys(v).toFixed(1) + '" y2="' + ys(v).toFixed(1) + '" stroke="rgba(255,255,255,' + (v === 0 ? .18 : .06) + ')"/>';
      g += '<text x="' + (L - 8) + '" y="' + (ys(v) + 4).toFixed(1) + '" text-anchor="end" class="hl-ax">' + (v === 0 ? '0' : rel ? nice(v, 1) + '×' : amt(v).replace(' ', ' ')) + '</text>';
    }
    // x ticks
    var xstep = niceStep(tEnd / xu, W < 520 ? 4 : 7) * xu;
    for (var t = 0; t <= tEnd + 1e-9; t += xstep) {
      g += '<line x1="' + xs(t).toFixed(1) + '" x2="' + xs(t).toFixed(1) + '" y1="' + (Tp + ph) + '" y2="' + (Tp + ph + 5) + '" stroke="rgba(255,255,255,.25)"/>';
      g += '<text x="' + xs(t).toFixed(1) + '" y="' + (Tp + ph + 20) + '" text-anchor="middle" class="hl-ax">' + nice(t / xu, 1) + '</text>';
    }
    g += '<text x="' + (L + pw / 2) + '" y="' + (H - 4) + '" text-anchor="middle" class="hl-ax hl-axt">' + (useDays ? 'DAYS' : 'HOURS') + '</text>';
    // dose markers
    series.forEach(function (x, si) {
      x.m.T.forEach(function (t) { g += '<line x1="' + xs(t).toFixed(1) + '" x2="' + xs(t).toFixed(1) + '" y1="' + (Tp + ph - 6 - si * 0) + '" y2="' + (Tp + ph) + '" stroke="' + x.m.color + '" stroke-width="1.5" opacity=".7"/>'; });
    });
    // lines
    series.forEach(function (x) {
      var d = x.pts.map(function (p, i) { return (i ? 'L' : 'M') + xs(p[0]).toFixed(1) + ' ' + ys(rel ? p[1] / x.m.D : p[1]).toFixed(1); }).join('');
      g += '<path d="' + d + 'L' + xs(x.pts[x.pts.length - 1][0]).toFixed(1) + ' ' + ys(0) + 'L' + L + ' ' + ys(0) + 'Z" fill="' + x.m.color + '" opacity="' + (series.length > 1 ? .06 : .12) + '"/>';
      g += '<path d="' + d + '" fill="none" stroke="' + x.m.color + '" stroke-width="2" stroke-linejoin="round"/>';
    });
    g += '<line id="hl-x" x1="0" x2="0" y1="' + Tp + '" y2="' + (Tp + ph) + '" stroke="rgba(240,244,246,.4)" stroke-dasharray="3 3" style="display:none"/>';
    series.forEach(function (x, si) { g += '<circle class="hl-dot" data-i="' + si + '" r="4.5" fill="' + x.m.color + '" stroke="#152131" stroke-width="2" style="display:none"/>'; });
    CH.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="' + H + '" role="img" aria-label="Amount in the body over time">' + g + '<rect id="hl-hit" x="' + L + '" y="' + Tp + '" width="' + pw + '" height="' + ph + '" fill="transparent"/></svg>';
    view = { xs: xs, ys: ys, L: L, pw: pw, tEnd: tEnd, rel: rel, xu: xu, useDays: useDays, W: W };
    var hit = $('#hl-hit', CH);
    hit.addEventListener('mousemove', hover); hit.addEventListener('touchmove', hover, { passive: true }); hit.addEventListener('touchstart', hover, { passive: true });
    hit.addEventListener('mouseleave', unhover);
  }
  function hover(e) {
    if (!view) return;
    var svg = CH.querySelector('svg'), rc = svg.getBoundingClientRect(), pt = e.touches ? e.touches[0] : e;
    var x = (pt.clientX - rc.left) * (view.W / rc.width), t = Math.max(0, Math.min(view.tEnd, (x - view.L) / view.pw * view.tEnd));
    var xl = $('#hl-x', svg); xl.setAttribute('x1', view.xs(t)); xl.setAttribute('x2', view.xs(t)); xl.style.display = '';
    var rows = models.map(function (m, i) {
      var a = m.at(t), dot = svg.querySelector('.hl-dot[data-i="' + i + '"]');
      dot.setAttribute('cx', view.xs(t)); dot.setAttribute('cy', view.ys(view.rel ? a / m.D : a)); dot.style.display = '';
      return '<div class="tr"><i style="background:' + m.color + '"></i><span>' + LETTERS[m.i] + ' · ' + esc(label(m.s)) + '</span><b>' + (view.rel ? nice(a / m.D, 2) + '× a dose' : amt(a)) + '</b></div>';
    }).join('');
    var when = view.useDays ? 'Day ' + nice(t / 24, 1) : nice(t, 1) + ' h';
    TIP.innerHTML = '<div class="tt">' + when + '</div>' + rows;
    TIP.hidden = false;
    var px = view.xs(t) / view.W * rc.width, tw = TIP.offsetWidth;
    TIP.style.left = Math.max(0, Math.min(rc.width - tw, px + (px > rc.width / 2 ? -tw - 14 : 14))) + 'px';
  }
  function unhover() { if (!CH.querySelector('svg')) return; TIP.hidden = true; $('#hl-x', CH).style.display = 'none'; $$('.hl-dot', CH).forEach(function (d) { d.style.display = 'none'; }); }
  function short(n) { return n.replace(/ \(.*\)$/, ''); }
  function label(sr) { var nm = short(sr.custom ? (sr.cname || 'Custom') : sr.name); return S.series.length > 1 ? nm + ' · ' + freqOf(sr).t.replace(/ \(.*\)$/, '').toLowerCase() : nm; }

  /* ---------- readouts ---------- */
  function stats() {
    var box = $('#hl-stats'), h = '';
    models.forEach(function (m) {
      var name = esc(label(m.s)), lead;
      var gone = (1 - m.r) * 100, ssT = 5 * m.h;
      if (m.R < 1.05) lead = 'Each dose is <b>' + nice(Math.min(gone, 99.9), 1) + '% gone</b> before the next one, so levels <b>don\'t build up</b>. Every dose starts from about zero.';
      else {
        lead = 'Levels <b>build to ' + nice(m.R, 2) + '×</b> a single dose and settle into a steady pattern after about <b>' + dur(ssT) + '</b> (5 half-lives).';
        if (m.ssPct < 0.95) lead += ' Your ' + m.T.length + ' doses stop at about <b>' + nice(m.ssPct * 100, 0) + '%</b> of that level.';
      }
      lead += ' After the last dose it takes about <b>' + dur(ssT) + '</b> to clear ~97%.';
      h += '<div class="hs" style="--c:' + m.color + '"><div class="hs-h"><span class="hs-k">' + LETTERS[m.i] + '</span>' + name + '</div><p>' + lead + '</p>' +
        '<div class="hs-grid">' +
        cell(dur(m.h), 'Half-life') +
        cell(m.R < 1.05 ? 'None' : nice(m.R, 2) + '×', 'Build-up') +
        cell(m.R < 1.05 ? '—' : dur(ssT), 'Steady state') +
        cell(nice(Math.min(gone, 99.9), gone > 99 ? 1 : 0) + '%', 'Drop between doses') +
        cell(amt(m.D * m.R), 'Steady peak') +
        cell(amt(m.D * m.R * m.r), 'Steady low') +
        '</div></div>';
    });
    box.innerHTML = h;
    // related links
    var rel = '', seen = {};
    models.forEach(function (m) {
      if (!m.c || seen[m.c.n]) return; seen[m.c.n] = 1;
      if (m.c.cmp) rel += '<a class="rl" href="/compare?q=' + encodeURIComponent(m.c.cmp.split(' ')[0]) + '"><b>Compare ' + esc(short(m.c.n)) + ' prices</b><span>Modern, Glacier &amp; Peptira, lowest first</span></a>';
      if (m.c.p) rel += '<a class="rl" href="/peptides/' + m.c.p + '"><b>' + esc(short(m.c.n)) + ' cheat sheet</b><span>What it is, research, how it\'s used</span></a>';
    });
    rel += '<a class="rl" href="/peptide-calculator"><b>Peptide Calculator</b><span>Turn a dose into units on your syringe</span></a>';
    $('#hl-related').innerHTML = rel;
  }
  function cell(v, k) { return '<div class="hc"><div class="hv">' + v + '</div><div class="hk">' + k + '</div></div>'; }

  /* ---------- settings panel ---------- */
  var P = $('#hl-set');
  var sel = $('#hl-comp');
  sel.innerHTML = DATA.map(function (g) {
    return '<optgroup label="' + esc(g.g) + '">' + g.items.map(function (c) { return '<option value="' + esc(c.n) + '">' + esc(c.n) + ' (' + dur(c.h) + ')</option>'; }).join('') + '</optgroup>';
  }).join('') + '<optgroup label="Other"><option value="__custom">Custom (enter a half-life)</option></optgroup>';
  $('#hl-freq').innerHTML = FREQ.map(function (f) { return '<option value="' + f.k + '">' + f.t + '</option>'; }).join('');

  function fillPanel() {
    var s = S.series[S.active], c = byName(s.name);
    sel.value = s.custom ? '__custom' : s.name;
    $('#hl-ov').checked = s.ov || s.custom; $('#hl-ov').disabled = s.custom;
    $('#hl-h').value = (s.ov || s.custom) ? s.hov : (c ? nice(c.h, c.h < 1 ? 2 : 1).replace(/,/g, '') : '');
    $('#hl-h').readOnly = !(s.ov || s.custom);
    $('#hl-dose').value = s.dose; $('#hl-n').value = s.n; $('#hl-freq').value = s.freq;
    $$('#hl-unit button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-v') === s.unit); });
    var src = $('#hl-src');
    if (s.custom) src.innerHTML = '<span class="ev ev-e">Your number</span> Enter the half-life in hours.';
    else if (c) src.innerHTML = '<span class="ev ' + EV[c.ev][1] + '">' + EV[c.ev][0] + '</span> ' + esc(c.src) + (s.ov ? ' <em>(overridden)</em>' : '');
    $('#hl-cname').hidden = !s.custom; if (s.custom) $('#hl-cname input').value = s.cname || '';
    updateSpan();
  }
  function updateSpan() {
    var s = S.series[S.active], T = doseTimes(s), last = T[T.length - 1];
    $('#hl-span').textContent = T.length + ' doses over ' + dur(last + avgInterval(s)).replace(' h', ' hours');
  }
  function chips() {
    var h = S.series.map(function (s, i) {
      return '<button type="button" class="sc' + (i === S.active ? ' on' : '') + '" data-i="' + i + '" style="--c:' + COLORS[i] + '"><i></i>' + LETTERS[i] + ' · ' + esc(short(s.custom ? (s.cname || 'Custom') : s.name)) +
        (S.series.length > 1 ? '<span class="x" data-x="' + i + '" aria-label="Remove">×</span>' : '') + '</button>';
    }).join('');
    if (S.series.length < 3) h += '<button type="button" class="sc add" id="hl-add">+ Compare</button>';
    $('#hl-chips').innerHTML = h;
    $('#hl-legend').innerHTML = S.series.length > 1 ? models.map(function (m) { return '<span><i style="background:' + m.color + '"></i>' + LETTERS[m.i] + ' · ' + esc(label(m.s)) + '</span>'; }).join('') : '';
  }
  function title() {
    var s = models[0];
    $('#hl-sub').textContent = !models.length ? 'Pick a compound and enter a dose to see the curve' :
      models.length === 1 ? short(s.s.custom ? (s.s.cname || 'Custom compound') : s.s.name) + ' · amount in the body over time' : 'Comparing ' + models.length + ' schedules';
  }
  function render() { drawChart(); chips(); title(); stats(); $('#hl-ymode').style.visibility = models.length ? '' : 'hidden'; $('.hl-actions').style.display = models.length ? '' : 'none'; save(); }

  root.addEventListener('click', function (e) {
    var x = e.target.closest('[data-x]');
    if (x) { var i = +x.getAttribute('data-x'); S.series.splice(i, 1); S.active = Math.min(S.active, S.series.length - 1); fillPanel(); render(); e.stopPropagation(); return; }
    var c = e.target.closest('.sc[data-i]'); if (c) { S.active = +c.getAttribute('data-i'); fillPanel(); chips(); return; }
    if (e.target.closest('#hl-add')) {
      var cur = S.series[S.active], ns = JSON.parse(JSON.stringify(cur));
      S.series.push(ns); S.active = S.series.length - 1; fillPanel(); render();
      $('#hl-freq').focus(); return;
    }
    var u = e.target.closest('#hl-unit button'); if (u) { S.series[S.active].unit = u.getAttribute('data-v'); fillPanel(); render(); return; }
    var y = e.target.closest('#hl-ymode button'); if (y) { S.ymode = y.getAttribute('data-v'); $$('#hl-ymode button').forEach(function (b) { b.classList.toggle('on', b === y); }); render(); return; }
  });
  sel.addEventListener('change', function () {
    var s = S.series[S.active];
    if (sel.value === '__custom') { s.custom = true; s.ov = true; s.name = 'Custom'; }
    else { s.custom = false; s.ov = false; s.hov = ''; s.name = sel.value; }
    fillPanel(); render();
  });
  $('#hl-ov').addEventListener('change', function () { var s = S.series[S.active]; s.ov = this.checked; if (s.ov && !s.hov) { var c = byName(s.name); s.hov = c ? String(c.h) : ''; } fillPanel(); render(); });
  $('#hl-h').addEventListener('input', function () { var s = S.series[S.active]; if (s.ov || s.custom) { s.hov = this.value; render(); } });
  $('#hl-dose').addEventListener('input', function () { S.series[S.active].dose = this.value; render(); });
  $('#hl-n').addEventListener('input', function () { S.series[S.active].n = this.value; updateSpan(); render(); });
  $('#hl-freq').addEventListener('change', function () { S.series[S.active].freq = this.value; updateSpan(); render(); });
  $('#hl-cname input').addEventListener('input', function () { S.series[S.active].cname = this.value; chips(); title(); stats(); save(); });
  $('#hl-wash').addEventListener('change', function () { S.washout = this.checked; render(); });
  var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(drawChart, 120); });

  /* ---------- share + save ---------- */
  function enc(o) { return btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/=+$/, ''); }
  function dec(t) { try { return JSON.parse(decodeURIComponent(escape(atob(t)))); } catch (e) { return null; } }
  function save() { try { localStorage.setItem('dpro-hl', JSON.stringify(S)); } catch (e) {} }
  $('#hl-share').addEventListener('click', function () {
    var url = location.origin + location.pathname + '#s=' + enc(S), b = this, sp = b.querySelector('span');
    history.replaceState(null, '', '#s=' + enc(S));
    var done = function () { b.classList.add('ok'); sp.textContent = 'Link copied'; setTimeout(function () { b.classList.remove('ok'); sp.textContent = 'Copy share link'; }, 1800); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () { prompt('Copy this link:', url); }); else prompt('Copy this link:', url);
    if (window.gtag) gtag('event', 'halflife_share');
  });
  function valid(o) { return o && Array.isArray(o.series) && o.series.length && o.series.length <= 3; }
  var m = location.hash.match(/#s=([A-Za-z0-9+/]+)/), init = m ? dec(m[1]) : null;
  if (!valid(init)) { try { init = JSON.parse(localStorage.getItem('dpro-hl')); } catch (e) { init = null; } }
  if (valid(init)) { S = init; S.active = Math.min(S.active || 0, S.series.length - 1); }
  else S.series = [newSeries('BPC-157')];
  $('#hl-wash').checked = S.washout !== false;
  $$('#hl-ymode button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-v') === (S.ymode || 'abs')); });
  fillPanel(); render();
  root.classList.add('ready');
})();
