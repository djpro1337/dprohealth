/* DPRO Health — Peptide Calculator
   Six tabs feed one shared result panel: syringe visual, sanity checks,
   cycle planner with live vendor pricing (/compare/data.json), share link and dose card.
   Internal units: mass in mcg, or IU. 1 mL = 100 units on a U-100 syringe. */
(function () {
  'use strict';
  var D = window.DPRO_CALC_DATA;
  var root = document.getElementById('calc');
  if (!root || !D) return;

  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var PRICES = null;
  var VNAME = { modern: 'Modern Aminos', glacier: 'Glacier Aminos', peptira: 'Peptira' };

  var SYR = {
    30:  { ml: 0.3, res: 1,  major: 5,  label: '0.3 mL' },
    50:  { ml: 0.5, res: 1,  major: 5,  label: '0.5 mL' },
    100: { ml: 1,   res: 2,  major: 10, label: '1 mL' },
    300: { ml: 3,   res: 10, major: 50, label: '3 mL' }
  };
  var FREQ = [
    { k: '1d',  t: 'Once daily',        w: 7 },
    { k: '2d',  t: 'Twice daily',       w: 14 },
    { k: '52',  t: '5 on / 2 off',      w: 5 },
    { k: 'eod', t: 'Every other day',   w: 3.5 },
    { k: '3w',  t: '3× per week',       w: 3 },
    { k: '2w',  t: '2× per week',       w: 2 },
    { k: '1w',  t: 'Once weekly',       w: 1 }
  ];

  /* ---------- helpers ---------- */
  function num(v) { if (v === '' || v == null) return NaN; var n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : NaN; }
  function ok(n) { return isFinite(n) && n > 0; }
  function toBase(v, u) { return u === 'mg' ? v * 1000 : v; }
  function nice(x) {
    var a = Math.abs(x), d = a >= 100 ? 1 : a >= 10 ? 2 : a >= 1 ? 2 : 3;
    return Number(x.toFixed(d)).toLocaleString('en-US', { maximumFractionDigits: d });
  }
  function fmt(b, dim) {
    if (!isFinite(b)) return '—';
    if (dim === 'iu') return nice(b) + ' IU';
    return Math.abs(b) >= 1000 ? nice(b / 1000) + ' mg' : nice(b) + ' mcg';
  }
  function fmtConc(b, dim) { return fmt(b, dim) + '/mL'; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function usd(c) { return '$' + (c / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function findCompound(name) {
    if (!name) return null;
    var q = name.trim().toLowerCase();
    for (var i = 0; i < D.compounds.length; i++) if (D.compounds[i].n.toLowerCase() === q) return D.compounds[i];
    return null;
  }
  function blendById(id) { for (var i = 0; i < D.blends.length; i++) if (D.blends[i].id === id) return D.blends[i]; return null; }

  /* ---------- panel field access ---------- */
  function field(p, k) { return $('[data-k="' + k + '"]', p); }
  function val(p, k) { var el = field(p, k); if (!el) return ''; return el.classList.contains('seg') ? (($('.on', el) || {}).getAttribute ? $('.on', el).getAttribute('data-v') : '') : el.value; }
  function setVal(p, k, v) {
    var el = field(p, k); if (!el) return;
    if (el.classList.contains('seg')) $$('button', el).forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-v') === String(v)); });
    else el.value = v;
  }
  function n(p, k) { return num(val(p, k)); }

  /* ---------- core math ---------- */
  // o: {label, cmp, page, kind, dim, total, vol, dose|units|waterUnits, syr, parts:[{n, amt}], primary, device}
  function build(o) {
    var R = Object.assign({ device: 'syringe', parts: [], primary: 'units' }, o);
    if (R.primary === 'water') R.vol = (R.units / 100) * R.total / R.dose;
    R.conc = R.total / R.vol;
    if (R.primary === 'dose') R.dose = (R.units / 100) * R.conc;
    R.drawMl = R.dose / R.conc;
    R.units = R.drawMl * 100;
    R.perVial = R.total / R.dose;
    R.parts = (R.parts || []).map(function (q) { return { n: q.n, amt: q.amt, per: q.amt / R.vol * R.drawMl, dim: q.dim || R.dim }; });
    return R;
  }

  /* best water amount for this vial + dose on this syringe */
  function suggestWater(total, dose, cap, cur) {
    var s = SYR[cap], best = null;
    var maxW = Math.max(3, cur || 0);
    for (var w = 0.5; w <= maxW + 0.001; w += 0.5) {
      var u = dose * w / total * 100;
      if (u < 5 || u > cap * 0.9) continue;
      var st = s.res >= 2 ? s.res / 2 : s.res, tick = Math.round(u / st) * st;
      var off = Math.abs(u - tick) / u + (Math.abs(tick % s.res) < 0.001 ? 0 : 0.002);
      var score = off * 100 + Math.abs(w - (cur || 2)) * 0.15 + (w % 1 ? 0.1 : 0) + (u < 10 ? 0.4 : 0);
      if (!best || score < best.score) best = { w: Math.round(w * 100) / 100, u: u, score: score, exact: off < 0.005 };
    }
    return best;
  }
  function biggerSyringe(units) { var caps = [30, 50, 100, 300]; for (var i = 0; i < caps.length; i++) if (units <= caps[i]) return caps[i]; return null; }

  function checks(R) {
    var out = [], s = SYR[R.syr];
    if (R.device === 'dropper') {
      out.push({ l: 'ok', h: 'About <b>' + nice(R.drawMl * 20) + ' drops</b> (droppers run ~20 drops per mL — they vary, so a marked dropper is more accurate).' });
      return out;
    }
    if (R.dose > R.total * 1.0001) {
      out.push({ l: 'err', h: 'That dose is more than the whole ' + (R.kind === 'liquid' ? 'bottle' : 'vial') + ' (' + fmt(R.total, R.dim) + ').' });
      if (R.dim === 'mass' && R.doseUnit === 'mg' && R.dose / 1000 <= R.total) out.push({ l: 'warn', h: 'Did you mean <b>' + nice(R.dose / 1000) + ' mcg</b>?', fix: { t: 'Switch to mcg', a: 'doseUnit', v: 'mcg' } });
      return out;
    }
    if (R.units > R.syr) {
      var big = biggerSyringe(R.units);
      out.push({ l: 'err', h: 'That\'s <b>' + nice(R.units) + ' units</b> — more than a full ' + s.label + ' syringe.' + (big ? '' : ' Split it into ' + Math.ceil(R.units / R.syr) + ' draws.'), fix: big ? { t: 'Use ' + SYR[big].label + ' syringe', a: 'syr', v: big } : null });
    }
    if (R.units < 1 && R.dim === 'mass' && R.doseUnit === 'mcg' && R.units * 1000 <= 300) {
      out.push({ l: 'warn', h: 'Tiny draw. Did you mean <b>' + nice(R.dose) + ' mg</b> instead of mcg?', fix: { t: 'Switch to mg', a: 'doseUnit', v: 'mg' } });
    }
    if (R.units <= R.syr) {
      var step = s.res >= 2 ? s.res / 2 : s.res;           // halfway between marks is readable on 2-unit+ scales
      var tick = Math.round(R.units / step) * step;
      var onMark = Math.abs(tick % s.res) < 0.001;
      if (tick <= 0) out.push({ l: 'err', h: 'Too small to measure — it\'s below the first mark on a ' + s.label + ' syringe.' });
      else if (Math.abs(R.units - tick) < 0.02) out.push({ l: 'ok', h: onMark ? 'Lands right on the <b>' + nice(tick) + '</b> mark.' : 'Lands halfway between the <b>' + nice(tick - step) + '</b> and <b>' + nice(tick + step) + '</b> marks.' });
      else {
        var act = tick / 100 * R.conc, off = (act - R.dose) / R.dose * 100;
        out.push({ l: Math.abs(off) > 5 ? 'warn' : 'ok', h: 'Between marks. The closest you can read is <b>' + nice(tick) + '</b> units, which gives ' + fmt(act, R.dim) + ' (' + (off > 0 ? '+' : '') + nice(off) + '%).' });
      }
      if (R.units > 0 && R.units < 3 && tick > 0) out.push({ l: 'warn', h: 'Under 3 units is hard to draw accurately.' });
    }
    // water suggestion for powders when something's off
    var bad = out.some(function (c) { return c.l !== 'ok'; });
    if (R.kind !== 'liquid' && R.primary === 'units' && bad && R.dose <= R.total) {
      var sg = suggestWater(R.total, R.dose, R.syr, R.vol) || (biggerSyringe(R.units) ? suggestWater(R.total, R.dose, biggerSyringe(R.units), R.vol) : null);
      if (sg && Math.abs(sg.w - R.vol) > 0.01) out.push({ l: 'tip', h: 'Easier: mix with <b>' + nice(sg.w) + ' mL</b> water instead and draw <b>' + nice(sg.u) + ' units</b>.', fix: R.canWater ? { t: 'Use ' + nice(sg.w) + ' mL', a: 'water', v: sg.w } : null });
    }
    if (R.kind !== 'liquid' && R.vol > 3.01) out.push({ l: 'tip', h: 'Make sure your vial holds ' + nice(R.vol) + ' mL — many peptide vials are 3 mL.' });
    if (R.perVial < 1 && R.dose <= R.total) out.push({ l: 'warn', h: 'Less than one dose per vial.' });
    return out;
  }

  /* ---------- syringe SVG ---------- */
  function syringeSVG(R) {
    var cap = R.syr, s = SYR[cap], x0 = 66, x1 = 450, W = x1 - x0, yT = 50, yB = 86;
    var frac = Math.max(0, Math.min(1, R.units / cap)), over = R.units > cap * 1.0001;
    var fx = x0 + W * frac, ticks = '';
    for (var u = 0; u <= cap + 0.001; u += s.res) {
      var x = x0 + W * (u / cap), maj = Math.abs(u % s.major) < 0.001;
      ticks += '<line x1="' + x.toFixed(1) + '" y1="' + yT + '" x2="' + x.toFixed(1) + '" y2="' + (yT + (maj ? 20 : 10)) + '" stroke="rgba(240,244,246,' + (maj ? .8 : .38) + ')" stroke-width="' + (maj ? 1.6 : 1) + '"/>';
      if (maj && (cap !== 100 || u % 20 === 0 || W > 500)) ticks += '<text x="' + x.toFixed(1) + '" y="' + (yT - 9) + '" text-anchor="middle" class="sx-t">' + (cap === 300 ? (u / 100).toFixed(1) : u) + '</text>';
    }
    var lbl = over ? 'Over capacity' : 'Draw to ' + nice(R.units);
    var lx = Math.max(x0 + 50, Math.min(x1 - 50, fx));
    return '<svg class="syringe" viewBox="0 0 520 150" role="img" aria-label="Syringe filled to ' + nice(R.units) + ' units">' +
      '<defs><linearGradient id="sxfill" x1="0" x2="1"><stop offset="0" stop-color="rgba(34,211,238,.28)"/><stop offset="1" stop-color="rgba(34,211,238,.6)"/></linearGradient></defs>' +
      '<line x1="6" y1="68" x2="50" y2="68" stroke="#8aa1b1" stroke-width="2.5"/>' +
      '<rect x="50" y="60" width="16" height="16" rx="2" fill="#24384d"/>' +
      '<rect x="' + x0 + '" y="' + yT + '" width="' + W + '" height="' + (yB - yT) + '" rx="3" fill="rgba(255,255,255,.03)" stroke="rgba(240,244,246,.4)" stroke-width="1.3"/>' +
      '<rect x="' + x0 + '" y="' + (yT + 1) + '" width="' + (fx - x0).toFixed(1) + '" height="' + (yB - yT - 2) + '" fill="' + (over ? 'rgba(239,68,68,.38)' : 'url(#sxfill)') + '"/>' +
      '<rect x="' + (fx - 3.5).toFixed(1) + '" y="' + (yT + 1) + '" width="7" height="' + (yB - yT - 2) + '" fill="#0b1220" stroke="#5b7385"/>' +
      '<rect x="' + (fx + 3.5).toFixed(1) + '" y="64" width="' + Math.max(0, 502 - fx).toFixed(1) + '" height="8" fill="#2a3e54"/>' +
      '<rect x="' + x1 + '" y="44" width="8" height="48" rx="2" fill="#1e3046"/>' +
      '<rect x="502" y="48" width="12" height="40" rx="2" fill="#2a3e54"/>' +
      ticks +
      '<line x1="' + fx.toFixed(1) + '" y1="' + (yB + 3) + '" x2="' + fx.toFixed(1) + '" y2="' + (yB + 20) + '" stroke="' + (over ? '#ef4444' : '#F5B544') + '" stroke-width="2.5"/>' +
      '<text x="' + lx.toFixed(1) + '" y="' + (yB + 40) + '" text-anchor="middle" class="sx-l" fill="' + (over ? '#fca5a5' : '#F5B544') + '">' + lbl + '</text>' +
      '<text x="' + x0 + '" y="146" class="sx-u">' + (cap === 300 ? 'mL' : 'units') + ' · ' + s.label + ' syringe</text>' +
      '</svg>';
  }

  /* ---------- tabs ---------- */
  var TABS = {};
  var current = 'guided';
  var lastR = null;

  function syrOf(p) { return parseInt(val(p, 'syr'), 10) || 100; }

  /* Guided */
  TABS.guided = function (p) {
    var type = val(p, 'gtype'), unit = val(p, 'vunit'), total = toBase(n(p, 'total'), unit);
    var name = val(p, 'name'), parts = [], cmp = null, page = null, label = name || 'Your peptide';
    if (type === 'blend') {
      var b = blendById(val(p, 'blend'));
      if (b) { total = b.parts.reduce(function (a, q) { return a + q[1] * 1000; }, 0); cmp = b.cmp; page = b.p; label = b.n; parts = b.parts.map(function (q) { return { n: q[0], amt: q[1] * 1000 }; }); unit = 'mg'; }
      else total = NaN;
    } else { var c = findCompound(name); if (c) { cmp = c.n; page = c.p; } }
    var dim = unit === 'IU' ? 'iu' : 'mass';
    var dunit = dim === 'iu' ? 'IU' : val(p, 'dunit');
    var dose = toBase(n(p, 'dose'), dunit), water = n(p, 'water');
    p.classList.toggle('is-blend', type === 'blend');
    var steps = [ok(total), ok(dose), true, ok(water)];
    var reach = 1; while (reach < 4 && steps[reach - 1]) reach++;
    $$('.gstep', p).forEach(function (el, i) { el.classList.toggle('shown', i < reach); el.classList.toggle('done', steps[i] && i < reach - 1 || (i === 3 && steps[3])); });
    var du = field(p, 'dunit'); if (du) du.style.display = dim === 'iu' ? 'none' : '';
    var iul = $('.iu-only', p); if (iul) iul.style.display = dim === 'iu' ? '' : 'none';
    // help-me-pick hint
    var hp = $('[data-help]', p);
    if (hp) {
      var sg = ok(total) && ok(dose) ? suggestWater(total, dose, syrOf(p), 2) : null;
      hp.innerHTML = sg ? 'Not mixed yet? <button type="button" class="linkbtn" data-fix="water" data-v="' + sg.w + '">Use ' + nice(sg.w) + ' mL</button> — your dose lands at ' + nice(sg.u) + ' units' + (sg.exact ? ', right on a mark' : '') + '.' : '';
    }
    if (!(ok(total) && ok(dose) && ok(water))) return null;
    return build({ label: label, cmp: cmp, page: page, kind: type === 'blend' ? 'blend' : 'powder', dim: dim, total: total, vol: water, dose: dose, doseUnit: dunit, syr: syrOf(p), parts: parts, canWater: true });
  };

  /* Single */
  TABS.single = function (p) {
    var name = val(p, 'name'), c = findCompound(name), vtype = val(p, 'vtype');
    $$('[data-show]', p).forEach(function (el) { el.style.display = el.getAttribute('data-show') === vtype ? '' : 'none'; });
    var unit = val(p, 'vunit'), dim = unit === 'IU' ? 'iu' : 'mass';
    var dunit = dim === 'iu' ? 'IU' : val(p, 'dunit');
    field(p, 'dunit').style.display = dim === 'iu' ? 'none' : '';
    $('.iu-only', p).style.display = dim === 'iu' ? '' : 'none';
    var dose = toBase(n(p, 'dose'), dunit), total, vol;
    if (vtype === 'liquid') {
      var conc = toBase(n(p, 'conc'), unit); vol = n(p, 'bottle'); if (!ok(vol)) vol = 1;
      total = conc * vol;
    } else { total = toBase(n(p, 'total'), unit); vol = n(p, 'water'); }
    if (!(ok(total) && ok(vol) && ok(dose))) return null;
    return build({ label: name || 'Single peptide', cmp: c && c.n, page: c && c.p, kind: vtype === 'liquid' ? 'liquid' : 'powder', dim: dim, total: total, vol: vol, dose: dose, doseUnit: dunit, syr: syrOf(p), canWater: vtype !== 'liquid' });
  };

  /* Blend */
  function blendRows(p) {
    return $$('.brow', p).map(function (r) {
      return { n: $('[data-r="n"]', r).value.trim(), v: num($('[data-r="v"]', r).value), u: $('[data-r="u"]', r).value };
    });
  }
  function refreshDoseBy(p, rows) {
    var sel = field(p, 'by'), cur = sel.value, h = '<option value="total">Total blend</option>';
    rows.forEach(function (r, i) { if (r.n) h += '<option value="' + i + '">' + esc(r.n) + '</option>'; });
    if (sel.getAttribute('data-h') !== h) { sel.innerHTML = h; sel.setAttribute('data-h', h); sel.value = cur; if (sel.value !== cur) sel.value = 'total'; }
  }
  TABS.blend = function (p) {
    var rows = blendRows(p); refreshDoseBy(p, rows);
    var parts = rows.filter(function (r) { return ok(r.v); }).map(function (r) { return { n: r.n || 'Peptide', amt: toBase(r.v, r.u) }; });
    var total = parts.reduce(function (a, q) { return a + q.amt; }, 0);
    var water = n(p, 'water'), dunit = val(p, 'dunit'), d = toBase(n(p, 'dose'), dunit), by = val(p, 'by');
    var b = blendById(val(p, 'preset'));
    if (!(parts.length && ok(total) && ok(water) && ok(d))) return null;
    var dose = d, label = b ? b.n : parts.map(function (q) { return q.n; }).join(' / ');
    if (by !== 'total') {
      var r = rows[+by]; if (!r || !ok(r.v)) return null;
      dose = d * total / toBase(r.v, r.u); // scale whole-blend draw so this component hits d
    }
    var R = build({ label: label, cmp: b && b.cmp, page: b && b.p, kind: 'blend', dim: 'mass', total: total, vol: water, dose: dose, doseUnit: dunit, syr: syrOf(p), parts: parts, canWater: true });
    R.byNote = by !== 'total' ? rows[+by].n : null;
    return R;
  };

  /* Quick Solve */
  TABS.quick = function (p) {
    var mode = p.getAttribute('data-mode');
    $('.qs-fields', p).style.display = mode ? '' : 'none';
    if (!mode) return null;
    var vtype = mode === 'water' ? 'powder' : val(p, 'vtype');
    $$('[data-q]', p).forEach(function (el) {
      var need = el.getAttribute('data-q').split(' ');
      el.style.display = (need.indexOf(mode) > -1 && (!el.hasAttribute('data-show') || el.getAttribute('data-show') === vtype)) ? '' : 'none';
    });
    var unit = val(p, 'vunit'), dunit = val(p, 'dunit');
    var total, vol;
    if (vtype === 'liquid') { var conc = toBase(n(p, 'conc'), unit); vol = 1; total = conc; }
    else { total = toBase(n(p, 'total'), unit); vol = n(p, 'water'); }
    var dose = toBase(n(p, 'dose'), dunit), units = n(p, 'units'), o = { label: 'Quick Solve', kind: vtype === 'liquid' ? 'liquid' : 'powder', dim: 'mass', total: total, syr: syrOf(p), doseUnit: dunit, canWater: mode !== 'water' && vtype !== 'liquid' };
    if (mode === 'units') { if (!(ok(total) && ok(vol) && ok(dose))) return null; o.vol = vol; o.dose = dose; }
    if (mode === 'dose')  { if (!(ok(total) && ok(vol) && ok(units))) return null; o.vol = vol; o.units = units; o.primary = 'dose'; }
    if (mode === 'water') { if (!(ok(total) && ok(dose) && ok(units))) return null; o.dose = dose; o.units = units; o.primary = 'water'; }
    var R = build(o);
    if (vtype === 'liquid') R.perVial = NaN;
    return R;
  };

  /* Liquids (aminos, premixed, dropper) */
  function liqRows(p) {
    return $$('.lrow', p).map(function (r) { return { n: $('[data-r="n"]', r).value.trim(), v: num($('[data-r="v"]', r).value), u: $('[data-r="u"]', r).value }; });
  }
  function refreshLiqBy(p, rows) {
    var sel = field(p, 'lby'), cur = sel.value, h = '';
    rows.forEach(function (r, i) { h += '<option value="' + i + '">' + esc(r.n || ('Component ' + (i + 1))) + '</option>'; });
    if (sel.getAttribute('data-h') !== h) { sel.innerHTML = h; sel.setAttribute('data-h', h); sel.value = cur; if (!sel.value) sel.value = '0'; }
  }
  TABS.liquid = function (p) {
    var type = val(p, 'ltype'), how = val(p, 'how'), dev = val(p, 'syr');
    p.classList.toggle('is-blend', type === 'blend');
    var rows = liqRows(p); if (type !== 'blend') rows = rows.slice(0, 1);
    refreshLiqBy(p, rows);
    $$('[data-how]', p).forEach(function (el) { el.style.display = el.getAttribute('data-how') === how ? '' : 'none'; });
    $('.lby-wrap', p).style.display = type === 'blend' && how === 'amount' ? '' : 'none';
    var bottle = n(p, 'bottle'); if (!ok(bottle)) bottle = NaN;
    var parts = rows.filter(function (r) { return ok(r.v); }).map(function (r) { return { n: r.n || 'Compound', amt: toBase(r.v, r.u) }; }); // amt = per mL
    if (!parts.length) return null;
    var key = type === 'blend' && how === 'amount' ? parts[Math.min(+val(p, 'lby') || 0, parts.length - 1)] : parts[0];
    var conc = key.amt, drawMl;
    if (how === 'amount') { var d = toBase(n(p, 'ldose'), val(p, 'ldunit')); if (!ok(d)) return null; drawMl = d / conc; }
    else { var v = n(p, 'vol'), vu = val(p, 'volu'); if (!ok(v)) return null; drawMl = vu === 'units' ? v / 100 : vu === 'drops' ? v / 20 : v; }
    var vol = ok(bottle) ? bottle : 1;
    var R = build({ label: rows[0].n ? (type === 'blend' ? 'Premixed blend' : rows[0].n) : 'Premixed liquid', kind: 'liquid', dim: 'mass', total: conc * vol, vol: vol, dose: conc * drawMl, doseUnit: 'mg', syr: dev === 'dropper' ? 100 : parseInt(dev, 10), device: dev === 'dropper' ? 'dropper' : 'syringe',
      parts: type === 'blend' ? parts.map(function (q) { return { n: q.n, amt: q.amt * vol }; }) : [] });
    if (!ok(bottle)) R.perVial = NaN;
    R.keyName = key.n;
    return R;
  };

  /* BAC water picker */
  TABS.bac = function (p) {
    var unit = val(p, 'vunit'), dim = unit === 'IU' ? 'iu' : 'mass', dunit = dim === 'iu' ? 'IU' : val(p, 'dunit');
    field(p, 'dunit').style.display = dim === 'iu' ? 'none' : '';
    $('.iu-only', p).style.display = dim === 'iu' ? '' : 'none';
    var total = toBase(n(p, 'total'), unit), dose = toBase(n(p, 'dose'), dunit), cap = syrOf(p), tb = $('.bac-table', p);
    if (!(ok(total) && ok(dose))) { tb.innerHTML = ''; return null; }
    var s = SYR[cap], pick = num(p.getAttribute('data-pick')), sg = suggestWater(total, dose, cap, 2), rows = '';
    if (!ok(pick)) pick = sg ? sg.w : 2;
    [0.5, 1, 1.5, 2, 2.5, 3, 4, 5].forEach(function (w) {
      var u = dose * w / total * 100, tick = Math.round(u / s.res) * s.res, half = s.res >= 2 ? Math.round(u / (s.res / 2)) * (s.res / 2) : tick, tag, cls;
      if (u > cap) { tag = 'Over syringe'; cls = 'bad'; }
      else if (u < 3) { tag = 'Too small'; cls = 'bad'; }
      else if (Math.abs(u - tick) < 0.02) { tag = 'On a mark'; cls = 'good'; }
      else if (Math.abs(u - half) < 0.02) { tag = 'Halfway mark'; cls = 'good'; }
      else { tag = 'Between marks'; cls = 'mid'; }
      rows += '<button type="button" class="bac-row' + (Math.abs(w - pick) < 0.01 ? ' on' : '') + '" data-w="' + w + '">' +
        '<span class="bw">' + w + ' mL</span><span class="bc">' + fmtConc(total / w, dim) + '</span><span class="bu">' + nice(u) + ' u</span>' +
        '<span class="bt ' + cls + '">' + tag + (sg && Math.abs(sg.w - w) < 0.01 ? ' · Best' : '') + '</span></button>';
    });
    tb.innerHTML = '<div class="bac-head"><span>Water</span><span>Strength</span><span>Your dose</span><span></span></div>' + rows;
    return build({ label: 'Your vial', kind: 'powder', dim: dim, total: total, vol: pick, dose: dose, doseUnit: dunit, syr: cap, canWater: true });
  };

  /* ---------- result panel ---------- */
  var RES = $('#calc-result');
  function renderResult(R) {
    lastR = R;
    var main = $('#r-main'), cyc = $('#r-cycle'), act = $('#r-actions');
    if (!R) {
      main.innerHTML = '<div class="r-empty"><div class="r-empty-ico">' + syringeIcon() + '</div><p>Fill in the fields and your result shows up here — with the exact spot on the syringe.</p></div>';
      cyc.style.display = 'none'; act.style.display = 'none'; RES.classList.remove('has'); return;
    }
    RES.classList.add('has');
    var big, sub;
    if (R.primary === 'dose') { big = fmt(R.dose, R.dim).replace(/ (mcg|mg|IU)$/, ' <small>$1</small>'); sub = 'In ' + nice(R.units) + ' units (' + nice(R.drawMl) + ' mL)'; }
    else if (R.primary === 'water') { big = nice(R.vol) + ' <small>mL water</small>'; sub = 'Then ' + nice(R.units) + ' units = ' + fmt(R.dose, R.dim); }
    else if (R.device === 'dropper') { big = nice(R.drawMl) + ' <small>mL</small>'; sub = 'With a dropper · ' + fmt(R.dose, R.dim) + (R.keyName ? ' ' + esc(R.keyName) : ''); }
    else { big = nice(R.units) + ' <small>units</small>'; sub = nice(R.drawMl) + ' mL · ' + fmt(R.dose, R.dim) + (R.byNote ? ' of blend' : '') + ' on a ' + SYR[R.syr].label + ' syringe'; }
    var cks = checks(R), h = '';
    h += '<div class="r-label">' + esc(R.label) + '</div>';
    h += '<div class="r-big">' + big + '</div><div class="r-sub">' + sub + '</div>';
    if (R.device !== 'dropper') h += '<div class="r-syr">' + syringeSVG(R) + '</div>';
    h += '<ul class="r-checks">' + cks.map(function (c) {
      return '<li class="ck ' + c.l + '"><span class="ck-i">' + ({ ok: '✓', warn: '!', err: '✕', tip: '→' })[c.l] + '</span><span>' + c.h +
        (c.fix ? ' <button type="button" class="linkbtn" data-fix="' + c.fix.a + '" data-v="' + c.fix.v + '">' + c.fix.t + '</button>' : '') + '</span></li>';
    }).join('') + '</ul>';
    h += '<div class="r-rows">';
    h += row('Strength', fmtConc(R.conc, R.dim));
    if (R.kind !== 'liquid' || ok(R.perVial)) h += row(R.kind === 'liquid' ? 'Bottle holds' : 'Vial holds', fmt(R.total, R.dim) + (R.kind !== 'liquid' ? ' in ' + nice(R.vol) + ' mL' : (R.parts.length > 1 && R.keyName ? ' ' + esc(R.keyName) : '')));
    if (ok(R.perVial)) h += row('Doses per ' + (R.kind === 'liquid' ? 'bottle' : 'vial'), nice(Math.floor(R.perVial * 100) / 100));
    h += '</div>';
    if (R.parts.length > 1 || R.byNote) {
      h += '<div class="r-parts"><div class="rp-h">In each draw</div>' + R.parts.map(function (q) { return row(esc(q.n), fmt(q.per, q.dim)); }).join('') + '</div>';
    }
    if (R.page) h += '<a class="r-sheet" href="/peptides/' + R.page + '">Read the ' + esc(R.cmp || R.label) + ' cheat sheet →</a>';
    main.innerHTML = h;
    var showCycle = ok(R.perVial) && R.dose <= R.total;
    cyc.style.display = showCycle ? '' : 'none';
    act.style.display = '';
    if (showCycle) renderCycle(R);
  }
  function row(k, v) { return '<div class="rr"><span class="k">' + k + '</span><span class="v">' + v + '</span></div>'; }
  function syringeIcon() { return '<svg viewBox="0 0 64 64" width="44" height="44" fill="none" stroke="#22D3EE" stroke-width="2.5" stroke-linecap="round"><path d="M44 8l12 12M50 14l-6 6M40 12l12 12M18 34l12 12M12 52l8-8M38 18L18 38l8 8 20-20"/><path d="M28 28l4 4M32 24l4 4"/></svg>'; }

  /* ---------- cycle planner + pricing ---------- */
  function offersFor(R) {
    if (!PRICES || !R.cmp || R.dim !== 'mass') return null;
    var it = null; PRICES.items.forEach(function (i) { if (i.n === R.cmp) it = i; });
    if (!it) return null;
    var mg = Math.round(R.total / 10) / 100, list = it.o.filter(function (o) { return o.mg && Math.abs(o.mg - mg) < 0.01; });
    var exact = list.length > 0;
    if (!exact) list = it.o.filter(function (o) { return o.mg; });
    // one row per vendor: cheapest option
    var by = {};
    list.forEach(function (o) {
      var cost = exact ? o.p : o.p / o.mg * mg; // per-vial cost at this size
      if (!by[o.v] || cost < by[o.v].cost) by[o.v] = { v: o.v, u: o.u, cost: cost, mg: o.mg, stock: o.s };
    });
    return { exact: exact, mg: mg, rows: Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return a.cost - b.cost; }), name: it.n };
  }
  function renderCycle(R) {
    var f = $('#cy-freq').value, w = num($('#cy-weeks').value), fr = FREQ.filter(function (x) { return x.k === f; })[0] || FREQ[0];
    var out = $('#cy-out');
    if (!ok(w)) { out.innerHTML = ''; return; }
    var doses = Math.ceil(fr.w * w), need = R.dose * doses, vials = Math.ceil(need / R.total - 1e-9);
    var days = Math.floor(R.perVial) / fr.w * 7, unit = R.kind === 'liquid' ? 'bottle' : 'vial';
    var h = '<div class="cy-grid">' +
      stat(nice(days < 1 ? days : Math.floor(days)), 'days per ' + unit) +
      stat(doses, 'doses total') +
      stat(vials, unit + (vials === 1 ? '' : 's') + ' needed') + '</div>';
    h += '<div class="cy-note">' + fmt(need, R.dim) + ' over ' + nice(w) + ' week' + (w === 1 ? '' : 's') + '.' +
      (R.kind !== 'liquid' && days > 30 ? ' One mixed vial lasts over a month at this pace. Many people aim to finish a mixed vial within about 4 weeks, so check the storage guidance for your compound.' : '') + '</div>';
    var of = offersFor(R);
    if (of && of.rows.length) {
      h += '<div class="cy-cost"><div class="rp-h">Cycle cost · ' + (of.exact ? fmt(R.total, 'mass') + ' vials' : 'priced per mg') + '</div>';
      h += of.rows.map(function (o, i) {
        var tot = o.cost * vials;
        return '<a class="cy-v' + (i === 0 ? ' best' : '') + '" href="' + o.u + '" target="_blank" rel="noopener sponsored">' +
          '<span class="cv-n">' + VNAME[o.v] + (i === 0 ? ' <em>Lowest</em>' : '') + (o.stock === false ? ' <i>out of stock</i>' : '') + '</span>' +
          '<span class="cv-p">' + vials + ' × ' + usd(o.cost) + '</span><span class="cv-t">' + usd(tot) + '</span><span class="cv-a">→</span></a>';
      }).join('');
      h += '<div class="cy-fine">' + (of.exact ? '' : 'No vendor sells a ' + fmt(R.total, 'mass') + ' vial, so this uses each vendor\'s price per mg. ') +
        'Prices before code <b>DPRO</b>, verified ' + new Date(PRICES.verified + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
        '. <a href="/compare?q=' + encodeURIComponent(of.name.split(' ')[0]) + '">Compare every size →</a></div></div>';
    } else if (R.cmp && !PRICES) {
      h += '<div class="cy-fine">Loading prices…</div>';
    }
    out.innerHTML = h;
  }
  function stat(v, k) { return '<div class="cy-s"><div class="cy-n">' + v + '</div><div class="cy-k">' + k + '</div></div>'; }

  /* ---------- update loop ---------- */
  function update() {
    var p = $('.tabp[data-tab="' + current + '"]');
    var R = null;
    try { R = TABS[current](p); } catch (e) { R = null; if (window.console) console.error(e); }
    if (R && !(isFinite(R.units) && isFinite(R.conc))) R = null;
    renderResult(R);
    saveLocal();
  }

  /* ---------- fixes from checks ---------- */
  root.addEventListener('click', function (e) {
    var b = e.target.closest('[data-fix]'); if (!b) return;
    var p = $('.tabp[data-tab="' + current + '"]'), a = b.getAttribute('data-fix'), v = b.getAttribute('data-v');
    if (a === 'syr') setVal(p, 'syr', v);
    if (a === 'doseUnit') setVal(p, current === 'liquid' ? 'ldunit' : 'dunit', v);
    if (a === 'water') { if (current === 'bac') p.setAttribute('data-pick', v); else setVal(p, 'water', v); }
    update();
  });

  /* ---------- tabs + segs + inputs ---------- */
  function showTab(t) {
    if (!TABS[t]) t = 'guided';
    current = t;
    $$('.ctab', root).forEach(function (b) { var on = b.getAttribute('data-tab') === t; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    $$('.tabp', root).forEach(function (p) { p.hidden = p.getAttribute('data-tab') !== t; });
    update();
  }
  $$('.ctab', root).forEach(function (b) { b.addEventListener('click', function () { showTab(b.getAttribute('data-tab')); }); });

  root.addEventListener('click', function (e) {
    var b = e.target.closest('.seg button'); if (!b) return;
    $$('button', b.parentNode).forEach(function (x) { x.classList.toggle('on', x === b); });
    update();
  });
  root.addEventListener('input', function (e) {
    if (e.target.closest('.csearch')) return; // handled below
    if (e.target.closest('[data-tab="bac"]') && e.target.matches('[data-k="total"],[data-k="dose"]')) $('.tabp[data-tab="bac"]').removeAttribute('data-pick');
    update();
  });
  root.addEventListener('change', function (e) { if (e.target.matches('select')) update(); });
  $('#cy-freq').addEventListener('change', function () { if (lastR) renderCycle(lastR); saveLocal(); });
  $('#cy-weeks').addEventListener('input', function () { if (lastR) renderCycle(lastR); saveLocal(); });

  // quick solve mode cards
  $$('.qs-card', root).forEach(function (c) {
    c.addEventListener('click', function () {
      var p = c.closest('.tabp'); p.setAttribute('data-mode', c.getAttribute('data-mode'));
      $$('.qs-card', p).forEach(function (x) { x.classList.toggle('on', x === c); });
      update();
    });
  });
  // BAC rows
  $('.tabp[data-tab="bac"]').addEventListener('click', function (e) {
    var r = e.target.closest('.bac-row'); if (!r) return;
    this.setAttribute('data-pick', r.getAttribute('data-w')); update();
  });
  // water chips
  root.addEventListener('click', function (e) {
    var c = e.target.closest('[data-set]'); if (!c) return;
    var p = c.closest('.tabp'), kv = c.getAttribute('data-set').split('=');
    setVal(p, kv[0], kv[1]);
    if (c.hasAttribute('data-unit')) setVal(p, 'vunit', c.getAttribute('data-unit'));
    update();
  });

  /* ---------- compound search ---------- */
  function sizeChips(p, c) {
    var box = $('.sizes', p); if (!box) return;
    if (!c) { box.innerHTML = ''; return; }
    box.innerHTML = '<span class="sz-l">Sizes our vendors sell:</span>' + c.s.map(function (mg) { return '<button type="button" class="chip" data-set="total=' + mg + '" data-unit="mg">' + mg + ' mg</button>'; }).join('');
  }
  $$('.csearch', root).forEach(function (cs) {
    var inp = $('input', cs), list = $('.cs-list', cs), p = cs.closest('.tabp'), hi = -1;
    function close() { list.hidden = true; hi = -1; }
    function choose(name) { inp.value = name; close(); sizeChips(p, findCompound(name)); update(); }
    function draw() {
      var q = inp.value.trim().toLowerCase();
      var m = D.compounds.filter(function (c) { return !q || c.n.toLowerCase().indexOf(q) > -1; }).slice(0, 8);
      if (!m.length || (m.length === 1 && m[0].n.toLowerCase() === q)) { close(); return; }
      list.innerHTML = m.map(function (c, i) { return '<button type="button" data-n="' + esc(c.n) + '"' + (i === hi ? ' class="hi"' : '') + '>' + esc(c.n) + '<span>' + c.s.map(function (x) { return x + 'mg'; }).join(' · ') + '</span></button>'; }).join('');
      list.hidden = false;
    }
    inp.addEventListener('input', function () { hi = -1; draw(); sizeChips(p, findCompound(inp.value)); update(); });
    inp.addEventListener('focus', draw);
    inp.addEventListener('keydown', function (e) {
      var items = $$('button', list);
      if (e.key === 'ArrowDown') { hi = Math.min(items.length - 1, hi + 1); draw(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { hi = Math.max(0, hi - 1); draw(); e.preventDefault(); }
      else if (e.key === 'Enter' && hi > -1 && items[hi]) { choose(items[hi].getAttribute('data-n')); e.preventDefault(); }
      else if (e.key === 'Escape') close();
    });
    list.addEventListener('mousedown', function (e) { var b = e.target.closest('button'); if (b) { e.preventDefault(); choose(b.getAttribute('data-n')); } });
    inp.addEventListener('blur', function () { setTimeout(close, 120); });
  });

  /* ---------- blend rows ---------- */
  function addRow(p, cls, name, v, u) {
    var box = $('.' + cls + 's', p), i = $$('.' + cls, p).length + 1, d = document.createElement('div');
    d.className = cls;
    var unitOpts = cls === 'lrow' ? '<option value="mg">mg/mL</option><option value="mcg">mcg/mL</option>' : '<option value="mg">mg</option><option value="mcg">mcg</option>';
    d.innerHTML = '<input data-r="n" placeholder="' + (cls === 'lrow' ? 'e.g. L-Carnitine' : 'e.g. BPC-157') + '" value="' + esc(name || '') + '" aria-label="Name">' +
      '<input data-r="v" inputmode="decimal" placeholder="' + (cls === 'lrow' ? 'Conc.' : 'Amount') + '" value="' + (v == null ? '' : v) + '" aria-label="Amount">' +
      '<select data-r="u" aria-label="Unit">' + unitOpts + '</select>' +
      '<button type="button" class="rm" aria-label="Remove">×</button>';
    $('select', d).value = u || 'mg';
    box.appendChild(d);
  }
  function setRows(p, cls, parts) { $('.' + cls + 's', p).innerHTML = ''; parts.forEach(function (q) { addRow(p, cls, q[0], q[1], q[2] || 'mg'); }); }
  root.addEventListener('click', function (e) {
    var a = e.target.closest('[data-add]'); if (a) { addRow(a.closest('.tabp'), a.getAttribute('data-add')); update(); return; }
    var rm = e.target.closest('.rm'); if (rm) { var r = rm.parentNode, p = r.closest('.tabp'), cls = r.className; if ($$('.' + cls, p).length > 1) r.remove(); else $$('input', r).forEach(function (i) { i.value = ''; }); update(); }
  });
  var bp = $('.tabp[data-tab="blend"]');
  var pre = field(bp, 'preset');
  pre.innerHTML = '<option value="">Pick a known blend…</option>' + D.blends.map(function (b) { return '<option value="' + b.id + '">' + esc(b.n) + '</option>'; }).join('') + '<option value="">Custom (enter below)</option>';
  pre.addEventListener('change', function () { var b = blendById(pre.value); if (b) setRows(bp, 'brow', b.parts); });
  setRows(bp, 'brow', [['', ''], ['', '']]);
  var gp = $('.tabp[data-tab="guided"]'), gsel = field(gp, 'blend');
  gsel.innerHTML = '<option value="">Pick your blend…</option>' + D.blends.map(function (b) { return '<option value="' + b.id + '">' + esc(b.n) + '</option>'; }).join('');
  gsel.addEventListener('change', function () {
    var b = blendById(gsel.value), box = $('.gblend-parts', gp);
    box.innerHTML = b ? b.parts.map(function (q) { return '<span class="chip static">' + esc(q[0]) + ' ' + q[1] + ' mg</span>'; }).join('') : '';
  });

  var lp = $('.tabp[data-tab="liquid"]');
  setRows(lp, 'lrow', [['', '']]);
  $('.liq-presets', lp).innerHTML = D.liquids.map(function (l) { return '<button type="button" class="chip" data-liq="' + l.id + '">' + esc(l.n) + '</button>'; }).join('');
  lp.addEventListener('click', function (e) {
    var c = e.target.closest('[data-liq]'); if (!c) return;
    var l = D.liquids.filter(function (x) { return x.id === c.getAttribute('data-liq'); })[0];
    setVal(lp, 'ltype', l.parts.length > 1 ? 'blend' : 'single');
    setRows(lp, 'lrow', l.parts);
    if (!field(lp, 'bottle').value) field(lp, 'bottle').value = 10;
    update();
  });

  /* ---------- state: share link + local ---------- */
  function snapshot() {
    var p = $('.tabp[data-tab="' + current + '"]'), v = {};
    $$('[data-k]', p).forEach(function (el) { var k = el.getAttribute('data-k'); v[k] = val(p, k); });
    var s = { t: current, v: v, cy: [$('#cy-freq').value, $('#cy-weeks').value] };
    if (current === 'blend') s.rows = blendRows(p).map(function (r) { return [r.n, isFinite(r.v) ? r.v : '', r.u]; });
    if (current === 'liquid') s.rows = liqRows(p).map(function (r) { return [r.n, isFinite(r.v) ? r.v : '', r.u]; });
    if (current === 'quick') s.m = p.getAttribute('data-mode');
    if (current === 'bac') s.pk = p.getAttribute('data-pick');
    return s;
  }
  function restore(s) {
    if (!s || !TABS[s.t]) return false;
    var p = $('.tabp[data-tab="' + s.t + '"]');
    if (s.rows) setRows(p, s.t === 'blend' ? 'brow' : 'lrow', s.rows);
    Object.keys(s.v || {}).forEach(function (k) { setVal(p, k, s.v[k]); });
    if (s.t === 'blend') field(p, 'by').value = s.v.by || 'total';
    if (s.t === 'guided' && s.v.blend) gsel.dispatchEvent(new Event('change'));
    if (s.m) { p.setAttribute('data-mode', s.m); $$('.qs-card', p).forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-mode') === s.m); }); }
    if (s.pk) p.setAttribute('data-pick', s.pk);
    if (s.cy) { $('#cy-freq').value = s.cy[0] || '1d'; $('#cy-weeks').value = s.cy[1] || ''; }
    var nm = field(p, 'name'); if (nm) sizeChips(p, findCompound(nm.value));
    showTab(s.t);
    // blend "by" options appear after first update
    if (s.t === 'blend' && s.v.by) { field(p, 'by').value = s.v.by; update(); }
    return true;
  }
  function enc(s) { return btoa(unescape(encodeURIComponent(JSON.stringify(s)))).replace(/=+$/, ''); }
  function dec(t) { try { return JSON.parse(decodeURIComponent(escape(atob(t)))); } catch (e) { return null; } }
  function saveLocal() { try { localStorage.setItem('dpro-calc', JSON.stringify(snapshot())); } catch (e) {} }

  $('#r-share').addEventListener('click', function () {
    var url = location.origin + location.pathname + '#c=' + enc(snapshot()), btn = this;
    history.replaceState(null, '', '#c=' + enc(snapshot()));
    var done = function () { btn.classList.add('ok'); btn.querySelector('span').textContent = 'Link copied'; setTimeout(function () { btn.classList.remove('ok'); btn.querySelector('span').textContent = 'Copy share link'; }, 1800); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () { prompt('Copy this link:', url); });
    else { prompt('Copy this link:', url); }
    if (window.gtag) gtag('event', 'calc_share', { tab: current });
  });

  /* ---------- dose card (PNG) ---------- */
  $('#r-card').addEventListener('click', function () {
    if (!lastR) return;
    var R = lastR, btn = this;
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () {
      var c = document.createElement('canvas'), W = 1080, H = 1350; c.width = W; c.height = H;
      var g = c.getContext('2d');
      var grd = g.createLinearGradient(0, 0, W, H); grd.addColorStop(0, '#152131'); grd.addColorStop(1, '#0B121C');
      g.fillStyle = grd; g.fillRect(0, 0, W, H);
      g.strokeStyle = 'rgba(34,211,238,.25)'; g.lineWidth = 3; g.strokeRect(40, 40, W - 80, H - 80);
      // wordmark
      g.textBaseline = 'alphabetic';
      g.font = '900 64px Archivo, sans-serif'; g.fillStyle = '#F0F4F6'; g.fillText('D', 90, 150);
      var dw = g.measureText('D').width; g.fillStyle = '#22D3EE'; g.fillText('PRO', 90 + dw, 150);
      var pw = g.measureText('PRO').width; g.font = '400 26px Outfit, sans-serif'; g.fillStyle = '#A9BCC8';
      g.fillText('H E A L T H', 90 + dw + pw + 18, 148);
      g.font = '700 22px "Space Mono", monospace'; g.fillStyle = '#22D3EE'; g.fillText('DOSE CARD', 90, 230);
      g.font = '800 58px Archivo, sans-serif'; g.fillStyle = '#F0F4F6'; wrapText(g, R.label, 90, 300, W - 180, 64);
      // big
      var bigTxt, bigUnit;
      if (R.primary === 'dose') { var f = fmt(R.dose, R.dim).split(' '); bigTxt = f[0]; bigUnit = f[1]; }
      else if (R.primary === 'water') { bigTxt = nice(R.vol); bigUnit = 'mL water'; }
      else if (R.device === 'dropper') { bigTxt = nice(R.drawMl); bigUnit = 'mL'; }
      else { bigTxt = nice(R.units); bigUnit = 'units'; }
      g.font = '900 210px Archivo, sans-serif'; g.fillStyle = '#F5B544'; g.fillText(bigTxt, 84, 560);
      var bw = g.measureText(bigTxt).width; g.font = '500 48px Outfit, sans-serif'; g.fillStyle = '#C8D4DA'; g.fillText(bigUnit, 84 + bw + 22, 560);
      // syringe
      if (R.device !== 'dropper') drawSyringe(g, R, 90, 640, W - 180);
      // rows
      var rows = [['Vial', fmt(R.total, R.dim) + (R.kind !== 'liquid' ? ' + ' + nice(R.vol) + ' mL water' : '')], ['Strength', fmtConc(R.conc, R.dim)], ['Dose', fmt(R.dose, R.dim)], ['Draw', nice(R.drawMl) + ' mL' + (R.device === 'dropper' ? '' : ' · ' + SYR[R.syr].label + ' syringe')]];
      if (ok(R.perVial)) rows.push(['Doses per vial', nice(Math.floor(R.perVial * 100) / 100)]);
      R.parts.length > 1 && R.parts.slice(0, 4).forEach(function (q) { rows.push(['· ' + q.n, fmt(q.per, q.dim)]); });
      var y = 850;
      rows.slice(0, 8).forEach(function (r) {
        g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 2; g.beginPath(); g.moveTo(90, y - 44); g.lineTo(W - 90, y - 44); g.stroke();
        g.font = '700 22px "Space Mono", monospace'; g.fillStyle = '#5B7385'; g.fillText(r[0].toUpperCase(), 90, y);
        g.font = '700 32px Archivo, sans-serif'; g.fillStyle = '#F0F4F6'; g.textAlign = 'right'; g.fillText(r[1], W - 90, y); g.textAlign = 'left';
        y += 58;
      });
      g.font = '600 26px Outfit, sans-serif'; g.fillStyle = '#22D3EE'; g.fillText('dprohealth.com/peptide-calculator', 90, H - 110);
      g.font = '300 20px Outfit, sans-serif'; g.fillStyle = '#5B7385'; g.fillText('Educational tool only. Not medical advice. Double-check your vial label.', 90, H - 74);
      c.toBlob(function (blob) {
        var fname = 'dpro-dose-card-' + (R.label || 'peptide').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.png';
        var file = window.File ? new File([blob], fname, { type: 'image/png' }) : null;
        if (file && navigator.canShare && navigator.canShare({ files: [file] }) && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
          navigator.share({ files: [file], title: 'My dose card', text: 'dprohealth.com/peptide-calculator' }).catch(function () {});
        } else {
          var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fname; document.body.appendChild(a); a.click();
          setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
        }
        if (window.gtag) gtag('event', 'calc_dose_card', { tab: current });
      }, 'image/png');
    });
  });
  function wrapText(g, t, x, y, maxW, lh) {
    var words = String(t).split(' '), line = '', lines = 0;
    for (var i = 0; i < words.length; i++) {
      var test = line + words[i] + ' ';
      if (g.measureText(test).width > maxW && line) { g.fillText(line.trim(), x, y); line = words[i] + ' '; y += lh; if (++lines > 1) break; }
      else line = test;
    }
    g.fillText(line.trim(), x, y);
  }
  function drawSyringe(g, R, x, y, w) {
    var cap = R.syr, s = SYR[cap], bx = x + 70, bw = w - 130, frac = Math.max(0, Math.min(1, R.units / cap)), fx = bx + bw * frac;
    g.strokeStyle = '#8aa1b1'; g.lineWidth = 4; g.beginPath(); g.moveTo(x, y + 40); g.lineTo(bx - 16, y + 40); g.stroke();
    g.fillStyle = '#24384d'; g.fillRect(bx - 16, y + 28, 16, 24);
    g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(bx, y + 18, bw, 44);
    var gr = g.createLinearGradient(bx, 0, fx, 0); gr.addColorStop(0, 'rgba(34,211,238,.25)'); gr.addColorStop(1, 'rgba(34,211,238,.6)');
    g.fillStyle = R.units > cap ? 'rgba(239,68,68,.4)' : gr; g.fillRect(bx, y + 18, fx - bx, 44);
    g.strokeStyle = 'rgba(240,244,246,.4)'; g.lineWidth = 2; g.strokeRect(bx, y + 18, bw, 44);
    g.fillStyle = '#2a3e54'; g.fillRect(fx + 4, y + 34, x + w - fx - 20, 12); g.fillRect(x + w - 16, y + 14, 16, 52);
    g.fillStyle = '#0b1220'; g.fillRect(fx - 4, y + 18, 8, 44);
    for (var u = 0; u <= cap + 0.001; u += s.res) {
      var tx = bx + bw * (u / cap), maj = Math.abs(u % s.major) < 0.001;
      if (!maj && cap === 100 && u % 4) continue;
      g.strokeStyle = maj ? 'rgba(240,244,246,.8)' : 'rgba(240,244,246,.35)'; g.lineWidth = maj ? 2.5 : 1.5;
      g.beginPath(); g.moveTo(tx, y + 18); g.lineTo(tx, y + (maj ? 46 : 34)); g.stroke();
      if (maj && (cap !== 100 || u % 20 === 0)) { g.font = '400 18px "Space Mono", monospace'; g.fillStyle = '#A9BCC8'; g.textAlign = 'center'; g.fillText(cap === 300 ? (u / 100).toFixed(1) : u, tx, y + 6); g.textAlign = 'left'; }
    }
    g.strokeStyle = '#F5B544'; g.lineWidth = 4; g.beginPath(); g.moveTo(fx, y + 66); g.lineTo(fx, y + 96); g.stroke();
    g.font = '700 26px Archivo, sans-serif'; g.fillStyle = '#F5B544'; g.textAlign = 'center'; g.fillText(R.units > cap ? 'Over syringe capacity' : 'Draw to ' + nice(R.units), Math.max(bx + 80, Math.min(bx + bw - 80, fx)), y + 130); g.textAlign = 'left';
  }

  /* ---------- prices ---------- */
  fetch('/compare/data.json').then(function (r) { if (!r.ok) throw 0; return r.json(); })
    .then(function (d) { PRICES = d; if (lastR) renderCycle(lastR); }).catch(function () {});

  /* ---------- init ---------- */
  var cy = $('#cy-freq'); cy.innerHTML = FREQ.map(function (f) { return '<option value="' + f.k + '">' + f.t + '</option>'; }).join('');
  var started = false;
  var m = location.hash.match(/#c=([A-Za-z0-9+/]+)/);
  if (m) started = restore(dec(m[1]));
  if (!started) { try { started = restore(JSON.parse(localStorage.getItem('dpro-calc'))); } catch (e) {} }
  if (!started) showTab('guided');
  root.classList.add('ready');
})();
