/* DPRO Health — Cycle Planner
   The user builds their own stack (we never suggest compounds or doses). The planner lays it out
   on real dates: injections, units on the syringe, vials and when to mix them, cost at our vendors,
   a timeline, a first-week view and a printable calendar, plus a branded PDF (js/cycle-pdf.js). */
(function () {
  'use strict';
  var D = window.DPRO_CALC_DATA, root = document.getElementById('cp');
  if (!root || !D) return;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

  var COLORS = ['#0AA2BD', '#C2841F', '#9277EC', '#3E9F5E', '#4F7FD6', '#D0604A']; // validated, light + dark
  var LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
  var MAX = 6;
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var DOWL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var FREQ = [
    { k: 'daily',   t: 'Once daily' },
    { k: '2xdaily', t: 'Twice daily (AM & PM)' },
    { k: '5on2off', t: '5 on / 2 off (Mon–Fri)' },
    { k: 'eod',     t: 'Every other day' },
    { k: '3x',      t: '3× per week', on: [['1,3,5', 'Mon / Wed / Fri'], ['2,4,6', 'Tue / Thu / Sat'], ['0,2,4', 'Sun / Tue / Thu']] },
    { k: '2x',      t: '2× per week', on: [['1,4', 'Mon / Thu'], ['2,5', 'Tue / Fri'], ['3,6', 'Wed / Sat'], ['0,3', 'Sun / Wed']] },
    { k: 'weekly',  t: 'Once weekly', on: DOWL.map(function (d, i) { return [String(i), d]; }) },
    { k: 'e10',     t: 'Every 10 days' },
    { k: 'e14',     t: 'Every 2 weeks' }
  ];
  var TOD = [['am', 'Morning'], ['pm', 'Evening'], ['bed', 'Bedtime'], ['', 'Any time']];
  var TODS = { am: 'AM', pm: 'PM', bed: 'Bed', '': '' };
  var VNAME = { modern: 'Modern Aminos', glacier: 'Glacier Aminos', peptira: 'Peptira' };
  var VORDER = ['modern', 'glacier', 'peptira'];

  /* ---------- catalog ---------- */
  var CAT = D.compounds.map(function (c) { return { n: c.n, s: c.s, p: c.p, cmp: c.n }; })
    .concat(D.blends.map(function (b) { var t = b.parts.reduce(function (a, q) { return a + q[1]; }, 0); return { n: b.n, s: [t], p: b.p, cmp: b.cmp, blend: b.parts }; }));
  function findCat(n) { if (!n) return null; var q = n.trim().toLowerCase(); for (var i = 0; i < CAT.length; i++) if (CAT[i].n.toLowerCase() === q) return CAT[i]; return null; }

  /* ---------- helpers ---------- */
  function num(v) { if (v === '' || v == null) return NaN; var n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : NaN; }
  function ok(n) { return isFinite(n) && n > 0; }
  function nice(x, d) { if (d == null) d = Math.abs(x) >= 100 ? 0 : Math.abs(x) >= 10 ? 1 : 2; return Number(x.toFixed(d)).toLocaleString('en-US', { maximumFractionDigits: d }); }
  function damt(o, mcg) { return o && o.it && o.it.unit === 'mg' ? nice(mcg / 1000, mcg / 1000 < 1 ? 3 : 2) + ' mg' : amt(mcg); }
  function amt(mcg) { return Math.abs(mcg) >= 1000 ? nice(mcg / 1000) + ' mg' : nice(mcg) + ' mcg'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function usd(c) { return '$' + (c / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function parseD(s) { var p = String(s || '').split('-'); if (p.length !== 3) return null; var d = new Date(+p[0], +p[1] - 1, +p[2]); return isNaN(d) ? null : d; }
  function isoD(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function addD(d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); return x; }
  function fmtD(d, long) { return (long ? DOW[d.getDay()] + ', ' : '') + MON[d.getMonth()] + ' ' + d.getDate(); }
  function nextMonday() { var t = new Date(), d = addD(t, ((8 - t.getDay()) % 7) || 7); return isoD(d); }
  function shortName(n) { return String(n).replace(/ · .*$/, '').replace(/ \(.*\)$/, ''); }

  /* ---------- state ---------- */
  var S;
  function blankItem(name) { return { name: name || '', vial: '', water: '', unit: 'mcg', ph: [{ f: 1, d: '' }], freq: 'daily', on: '', tod: 'am', sw: 1, wk: 8 }; }
  function defaults() { return { title: '', start: nextMonday(), syr: 100, items: [blankItem()] }; }

  /* ---------- engine ---------- */
  function onDays(it) {
    var f = FREQ.filter(function (x) { return x.k === it.freq; })[0];
    if (!f || !f.on) return null;
    var v = it.on || (it.freq === 'weekly' ? String((parseD(S.start) || new Date()).getDay()) : f.on[0][0]);
    if (!f.on.some(function (o) { return o[0] === v; })) v = f.on[0][0];
    return v.split(',').map(Number);
  }
  function compute() {
    var start = parseD(S.start) || parseD(nextMonday()), cap = S.syr, items = [], warns = [];
    S.items.forEach(function (it, i) {
      var cat = findCat(it.name), vial = num(it.vial), water = num(it.water), mult = it.unit === 'mg' ? 1000 : 1;
      var phases = it.ph.map(function (p, j) { return { f: j === 0 ? 1 : Math.max(1, Math.round(num(p.f) || 1)), dose: num(p.d) * mult }; })
        .filter(function (p, j) { return j === 0 || ok(p.dose); }).sort(function (a, b) { return a.f - b.f; });
      var sw = Math.max(1, Math.round(num(it.sw) || 1)), wk = Math.max(1, Math.min(104, Math.round(num(it.wk) || 0)));
      var o = { it: it, i: i, color: COLORS[i], letter: LETTERS[i], cat: cat, name: it.name.trim() || ('Compound ' + LETTERS[i]), valid: false };
      items.push(o);
      if (!(ok(vial) && ok(water) && phases.length && ok(phases[0].dose) && ok(num(it.wk)))) return;
      o.valid = true;
      o.vialMg = vial; o.vialMcg = vial * 1000; o.water = water; o.conc = o.vialMcg / water; o.sw = sw; o.wk = wk;
      o.cs = (sw - 1) * 7; o.ce = o.cs + wk * 7; // [cs, ce)
      phases.forEach(function (p, j) { p.to = j + 1 < phases.length ? phases[j + 1].f - 1 : wk; p.units = p.dose / o.conc * 100; });
      o.phases = phases.filter(function (p) { return p.f <= wk; });
      var days = onDays(it), ev = [];
      for (var d = o.cs; d < o.ce; d++) {
        var rel = d - o.cs, dow = (start.getDay() + d) % 7, hit = false;
        switch (it.freq) {
          case 'daily': case '2xdaily': hit = true; break;
          case '5on2off': hit = dow >= 1 && dow <= 5; break;
          case 'eod': hit = rel % 2 === 0; break;
          case 'e10': hit = rel % 10 === 0; break;
          case 'e14': hit = rel % 14 === 0; break;
          default: hit = days ? days.indexOf(dow) > -1 : false;
        }
        if (!hit) continue;
        var w = Math.floor(rel / 7) + 1, ph = o.phases[0];
        o.phases.forEach(function (p) { if (p.f <= w) ph = p; });
        if (it.freq === '2xdaily') { ev.push({ d: d, tod: 'am', dose: ph.dose, ph: ph }); ev.push({ d: d, tod: 'pm', dose: ph.dose, ph: ph }); }
        else ev.push({ d: d, tod: it.tod, dose: ph.dose, ph: ph });
      }
      o.events = ev;
      // vials: continuous use; a new vial is mixed when the running total passes a whole vial
      var cum = 0, opened = 0, mix = [];
      ev.forEach(function (e) { var need = cum + e.dose; while (need > opened * o.vialMcg + 1e-6) { opened++; mix.push(e.d); } cum = need; e.vial = opened; });
      o.total = cum; o.vials = opened; o.mix = mix;
      // longest a mixed vial stays in use
      o.openMax = 0;
      mix.forEach(function (m, k) { var end = k + 1 < mix.length ? mix[k + 1] : (ev.length ? ev[ev.length - 1].d + 1 : m); o.openMax = Math.max(o.openMax, end - m); });
      o.perVial = o.vialMcg / o.phases[0].dose;
      o.w = [];
      o.phases.forEach(function (p) {
        if (p.units > cap + 1e-6) o.w.push({ l: 'err', t: damt(o, p.dose) + ' is ' + nice(p.units, 1) + ' units, more than your ' + cap + '-unit syringe holds. Use less water or a bigger syringe.' });
        else if (p.units < 2) o.w.push({ l: 'warn', t: damt(o, p.dose) + ' is only ' + nice(p.units, 1) + ' units, which is hard to measure. Try more water.' });
        if (p.dose > o.vialMcg) o.w.push({ l: 'err', t: damt(o, p.dose) + ' is more than a whole ' + nice(vial) + ' mg vial.' });
      });
      if (o.openMax > 30) o.w.push({ l: 'tip', t: 'A mixed vial stays in use for up to ' + o.openMax + ' days. Many people aim to finish a mixed vial within about 4 weeks, so a smaller vial size may fit better. Check storage guidance for your compound.' });
      if (!ev.length) o.w.push({ l: 'warn', t: 'No doses land in this window. Check the schedule and start week.' });
    });
    var valid = items.filter(function (o) { return o.valid; });
    var days = valid.reduce(function (a, o) { return Math.max(a, o.ce); }, 0);
    var plan = { start: start, end: addD(start, Math.max(0, days - 1)), days: days, items: items, valid: valid, cap: cap };
    plan.injections = valid.reduce(function (a, o) { return a + o.events.length; }, 0);
    plan.vials = valid.reduce(function (a, o) { return a + o.vials; }, 0);
    price(plan);
    return plan;
  }

  /* ---------- pricing ---------- */
  var PR = null;
  function price(plan) {
    plan.priced = false;
    if (!PR) return;
    var per = {}; // vendor -> {total, count}
    plan.valid.forEach(function (o) {
      o.offers = null;
      var name = o.cat ? o.cat.cmp : null, item = null;
      if (name) PR.items.forEach(function (x) { if (x.n === name) item = x; });
      if (!item) return;
      var by = {};
      item.o.forEach(function (of) {
        if (!of.mg || Math.abs(of.mg - o.vialMg) > 0.01) return;
        if (!by[of.v] || of.p < by[of.v].p) by[of.v] = { v: of.v, p: of.p, u: of.u, s: of.s };
      });
      var rows = Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return a.p - b.p; });
      o.offers = rows.length ? rows : null;
      o.cmpName = item.n;
    });
    var pricedItems = plan.valid.filter(function (o) { return o.offers; });
    if (!pricedItems.length) return;
    plan.priced = true;
    plan.split = pricedItems.reduce(function (a, o) { return a + o.offers[0].p * o.vials; }, 0);
    plan.unpriced = plan.valid.length - pricedItems.length;
    plan.single = VORDER.map(function (v) {
      var tot = 0, all = true;
      pricedItems.forEach(function (o) { var f = o.offers.filter(function (x) { return x.v === v; })[0]; if (f) tot += f.p * o.vials; else all = false; });
      return { v: v, total: tot, all: all };
    }).filter(function (x) { return x.all; }).sort(function (a, b) { return a.total - b.total; });
    plan.verified = PR.verified;
  }

  /* ---------- builder ---------- */
  var B = $('#cp-items');
  function freqOpts(sel) { return FREQ.map(function (f) { return '<option value="' + f.k + '"' + (f.k === sel ? ' selected' : '') + '>' + f.t + '</option>'; }).join(''); }
  function onOpts(it) {
    var f = FREQ.filter(function (x) { return x.k === it.freq; })[0];
    if (!f || !f.on) return '';
    var v = it.on || (it.freq === 'weekly' ? String((parseD(S.start) || new Date()).getDay()) : f.on[0][0]);
    return f.on.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === v ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('');
  }
  function sizeChips(it) {
    var c = findCat(it.name);
    return c ? '<span class="sz-l">Sizes our vendors sell:</span>' + c.s.map(function (mg) { return '<button type="button" class="chip' + (num(it.vial) === mg ? ' on' : '') + '" data-set="vial" data-v="' + mg + '">' + mg + ' mg</button>'; }).join('') : '';
  }
  function itemHTML(it, i) {
    var ph = it.ph.map(function (p, j) {
      return '<div class="ph" data-p="' + j + '">' +
        (j === 0 ? '<span class="ph-l">Starting dose</span>' : '<span class="ph-l">From week <input class="ph-w" data-pf="f" inputmode="numeric" value="' + esc(p.f) + '" aria-label="From week"></span>') +
        '<div class="irow"><input data-pf="d" inputmode="decimal" placeholder="' + (j === 0 ? 'e.g. 250' : 'New dose') + '" value="' + esc(p.d) + '" aria-label="Dose"><span class="unit-tag">' + it.unit + '</span></div>' +
        (j > 0 ? '<button type="button" class="ph-rm" aria-label="Remove dose change">×</button>' : '<span></span>') + '</div>';
    }).join('');
    var on = onOpts(it);
    return '<div class="ci" data-i="' + i + '" style="--c:' + COLORS[i] + '">' +
      '<div class="ci-h"><span class="ci-k">' + LETTERS[i] + '</span>' +
        '<div class="csearch"><input data-f="name" value="' + esc(it.name) + '" placeholder="Search a peptide or blend… or type your own" autocomplete="off" aria-label="Compound"><div class="cs-list" hidden></div></div>' +
        (S.items.length > 1 ? '<button type="button" class="ci-rm" aria-label="Remove compound">Remove</button>' : '') + '</div>' +
      '<div class="ci-grid">' +
        '<div><label class="lbl">Vial size</label><div class="irow"><input data-f="vial" inputmode="decimal" placeholder="e.g. 10" value="' + esc(it.vial) + '"><span class="unit-tag">mg</span></div><div class="chips sizes">' + sizeChips(it) + '</div></div>' +
        '<div><label class="lbl">BAC water per vial</label><div class="irow"><input data-f="water" inputmode="decimal" placeholder="e.g. 2" value="' + esc(it.water) + '"><span class="unit-tag">mL</span></div><div class="chips">' +
          [1, 2, 3].map(function (w) { return '<button type="button" class="chip' + (num(it.water) === w ? ' on' : '') + '" data-set="water" data-v="' + w + '">' + w + ' mL</button>'; }).join('') + '</div></div>' +
      '</div>' +
      '<div class="ph-head"><label class="lbl">Dose per injection</label><div class="seg useg" data-f="unit"><button type="button" data-v="mcg"' + (it.unit === 'mcg' ? ' class="on"' : '') + '>mcg</button><button type="button" data-v="mg"' + (it.unit === 'mg' ? ' class="on"' : '') + '>mg</button></div></div>' +
      '<div class="ph-list">' + ph + '</div>' +
      '<button type="button" class="addph">+ Add a dose change (ramp up or taper)</button>' +
      '<div class="ci-grid c3">' +
        '<div><label class="lbl">How often</label><select class="sel" data-f="freq">' + freqOpts(it.freq) + '</select></div>' +
        (on ? '<div><label class="lbl">On</label><select class="sel" data-f="on">' + on + '</select></div>' : '') +
        (it.freq === '2xdaily' ? '' : '<div><label class="lbl">Time of day</label><select class="sel" data-f="tod">' + TOD.map(function (t) { return '<option value="' + t[0] + '"' + (t[0] === it.tod ? ' selected' : '') + '>' + t[1] + '</option>'; }).join('') + '</select></div>') +
      '</div>' +
      '<div class="ci-grid">' +
        '<div><label class="lbl">Starts in week</label><input class="inp" data-f="sw" inputmode="numeric" value="' + esc(it.sw) + '"></div>' +
        '<div><label class="lbl">For how many weeks</label><input class="inp" data-f="wk" inputmode="numeric" value="' + esc(it.wk) + '"></div>' +
      '</div>' +
      '</div>';
  }
  function renderBuilder() {
    B.innerHTML = S.items.map(itemHTML).join('');
    $('#cp-add').style.display = S.items.length >= MAX ? 'none' : '';
    $('#cp-add').textContent = S.items.length ? '+ Add another compound' : '+ Add a compound';
    $('#cp-title').value = S.title; $('#cp-start').value = S.start;
    $$('#cp-syr button').forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-v') === S.syr); });
  }
  function itemOf(el) { var c = el.closest('.ci'); return c ? { c: c, i: +c.getAttribute('data-i'), it: S.items[+c.getAttribute('data-i')] } : null; }

  root.addEventListener('input', function (e) {
    var t = e.target;
    if (t.id === 'cp-title') { S.title = t.value; update(); return; }
    if (t.id === 'cp-start') { S.start = t.value; update(); return; }
    var x = itemOf(t); if (!x) return;
    var f = t.getAttribute('data-f'), pf = t.getAttribute('data-pf');
    if (f) { x.it[f] = t.value; if (f === 'name') { refreshSizes(x); drawList(t); } if (f === 'vial' || f === 'water') refreshChips(x); }
    if (pf) { var j = +t.closest('.ph').getAttribute('data-p'); x.it.ph[j][pf] = t.value; }
    update();
  });
  root.addEventListener('change', function (e) {
    var t = e.target, x = itemOf(t); if (!x || t.tagName !== 'SELECT') return;
    var f = t.getAttribute('data-f'); x.it[f] = t.value;
    if (f === 'freq') { x.it.on = ''; renderBuilder(); }
    update();
  });
  root.addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest('#cp-add')) { if (S.items.length < MAX) { var prev = S.items[S.items.length - 1], n = blankItem(); if (prev) { n.sw = prev.sw; n.wk = prev.wk; } S.items.push(n); renderBuilder(); update(); var ins = $$('.ci [data-f="name"]'); ins[ins.length - 1].focus(); } return; }
    var b = t.closest('#cp-syr button'); if (b) { S.syr = +b.getAttribute('data-v'); $$('#cp-syr button').forEach(function (x) { x.classList.toggle('on', x === b); }); update(); return; }
    var x = itemOf(t); if (!x) return;
    if (t.closest('.ci-rm')) { S.items.splice(x.i, 1); renderBuilder(); update(); return; }
    if (t.closest('.addph')) { var last = x.it.ph[x.it.ph.length - 1], fw = (num(last.f) || 1) + 4; if (fw > (num(x.it.wk) || 8)) fw = Math.max(2, Math.ceil((num(x.it.wk) || 8) / 2)); x.it.ph.push({ f: fw, d: '' }); renderBuilder(); update(); var r = $$('.ci')[x.i].querySelectorAll('.ph [data-pf="d"]'); r[r.length - 1].focus(); return; }
    if (t.closest('.ph-rm')) { x.it.ph.splice(+t.closest('.ph').getAttribute('data-p'), 1); renderBuilder(); update(); return; }
    var sb = t.closest('.seg[data-f="unit"] button'); if (sb) { x.it.unit = sb.getAttribute('data-v'); renderBuilder(); update(); return; }
    var ch = t.closest('[data-set]'); if (ch) { x.it[ch.getAttribute('data-set')] = ch.getAttribute('data-v'); x.c.querySelector('[data-f="' + ch.getAttribute('data-set') + '"]').value = ch.getAttribute('data-v'); refreshChips(x); update(); return; }
  });
  function refreshSizes(x) { x.c.querySelector('.sizes').innerHTML = sizeChips(x.it); }
  function refreshChips(x) {
    $$('[data-set]', x.c).forEach(function (b) { b.classList.toggle('on', num(x.it[b.getAttribute('data-set')]) === num(b.getAttribute('data-v'))); });
  }
  // compound search dropdown
  function drawList(inp) {
    var list = inp.parentNode.querySelector('.cs-list'), q = inp.value.trim().toLowerCase();
    var m = CAT.filter(function (c) { return !q || c.n.toLowerCase().indexOf(q) > -1; }).slice(0, 8);
    if (!m.length || (m.length === 1 && m[0].n.toLowerCase() === q)) { list.hidden = true; return; }
    list.innerHTML = m.map(function (c) { return '<button type="button" data-n="' + esc(c.n) + '">' + esc(c.n) + '<span>' + (c.blend ? 'blend' : c.s.map(function (x) { return x + 'mg'; }).join(' · ')) + '</span></button>'; }).join('');
    list.hidden = false;
  }
  root.addEventListener('focusin', function (e) { if (e.target.matches('.ci [data-f="name"]')) drawList(e.target); });
  root.addEventListener('focusout', function (e) { if (e.target.matches('.ci [data-f="name"]')) { var l = e.target.parentNode.querySelector('.cs-list'); setTimeout(function () { l.hidden = true; }, 150); } });
  root.addEventListener('mousedown', function (e) {
    var b = e.target.closest('.cs-list button'); if (!b) return;
    e.preventDefault();
    var x = itemOf(b), c = findCat(b.getAttribute('data-n'));
    x.it.name = c.n;
    if (c.s.length === 1 && !num(x.it.vial)) x.it.vial = String(c.s[0]);
    renderBuilder(); update();
  });

  /* ---------- plan output ---------- */
  var OUT = $('#cp-out'), lastPlan = null;
  function schedText(o) {
    var it = o.it, f = FREQ.filter(function (x) { return x.k === it.freq; })[0], on = onDays(it);
    var s = f.t;
    if (on && it.freq !== 'weekly') s = f.t + ' (' + on.map(function (d) { return DOW[d]; }).join('/') + ')';
    if (it.freq === 'weekly') s = 'Once weekly on ' + DOWL[on[0]] + 's';
    if (it.freq !== '2xdaily' && it.tod) s += ', ' + TOD.filter(function (t) { return t[0] === it.tod; })[0][1].toLowerCase();
    return s;
  }
  function doseText(o) {
    return o.phases.map(function (p, j) { return damt(o, p.dose) + (o.phases.length > 1 ? ' (wk ' + p.f + (p.to > p.f ? '–' + p.to : '') + ')' : ''); }).join(' → ');
  }
  function tile(v, k, sub) { return '<div class="ct"><div class="ct-v">' + v + '</div><div class="ct-k">' + k + '</div>' + (sub ? '<div class="ct-s">' + sub + '</div>' : '') + '</div>'; }

  function renderPlan(P) {
    lastPlan = P;
    if (!P.valid.length) {
      OUT.innerHTML = '<div class="cp-empty"><b>Your plan shows up here</b><p>Add a compound with its vial size, water and dose, and you\'ll get your timeline, first week, calendar, vials, cost and a PDF to download.</p></div>';
      $('#cp-actions').hidden = true; return;
    }
    $('#cp-actions').hidden = false;
    var weeks = Math.ceil(P.days / 7), h = '';
    h += '<div class="cp-range">' + fmtD(P.start, true) + ' → ' + fmtD(P.end, true) + ', ' + P.end.getFullYear() + '</div>';
    h += '<div class="cp-tiles">' + tile(weeks, 'week' + (weeks === 1 ? '' : 's'), P.days + ' days') + tile(P.injections, 'injections', P.valid.length + ' compound' + (P.valid.length > 1 ? 's' : '')) +
      tile(P.vials, 'vials to buy', P.valid.map(function (o) { return o.vials + '× ' + shortName(o.name); }).join(' · ')) +
      tile(P.priced ? usd(P.split) : '—', 'est. cost', P.priced ? 'Before code DPRO' + (P.unpriced ? ' · ' + P.unpriced + ' not priced' : '') : 'Pick a vendor size to price it') + '</div>';
    // warnings
    var ws = [];
    P.items.forEach(function (o) { if (o.valid) o.w.forEach(function (w) { ws.push('<li class="ck ' + w.l + '"><span class="ck-k" style="background:' + o.color + '">' + o.letter + '</span><span>' + w.t + '</span></li>'); }); });
    var incomplete = P.items.filter(function (o) { return !o.valid; });
    if (incomplete.length) ws.push('<li class="ck tip"><span class="ck-k" style="background:var(--muted)">!</span><span>' + incomplete.map(function (o) { return o.letter; }).join(', ') + ' ' + (incomplete.length > 1 ? 'aren\'t' : 'isn\'t') + ' in the plan yet. Add a vial size, water and dose.</span></li>');
    if (ws.length) h += '<ul class="cp-warn">' + ws.join('') + '</ul>';
    h += block('Timeline', 'Each bar is a compound. Notches mark when you mix a new vial.', gantt(P));
    h += block('Your first week', fmtD(P.start, true) + ' to ' + fmtD(addD(P.start, 6), true) + '. Units are for your ' + P.cap + '-unit syringe.', weekGrid(P, 0));
    h += block('Compound breakdown', '', P.valid.map(card).join(''), 'cp-cards');
    h += block('Shopping list', P.priced ? 'Lowest price first at our trusted vendors. Prices verified ' + new Date(P.verified + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', before code DPRO.' : 'Prices load from our vendor comparison.', shopping(P));
    h += block('Calendar', 'Every injection, day by day. The PDF version has boxes to check off.', '<div class="cal-wrap">' + months(P).map(monthHTML).join('') + '</div>');
    OUT.innerHTML = h;
  }
  function block(t, sub, body, cls) { return '<section class="cp-block"><div class="cb-h"><h3>' + t + '</h3>' + (sub ? '<p>' + sub + '</p>' : '') + '</div><div class="' + (cls || '') + '">' + body + '</div></section>'; }

  function gantt(P) {
    var weeks = Math.ceil(P.days / 7), step = weeks <= 16 ? 1 : weeks <= 32 ? 2 : 4, head = '';
    for (var w = 1; w <= weeks; w++) head += '<span style="left:' + ((w - 1) / weeks * 100) + '%;width:' + (100 / weeks) + '%">' + ((w - 1) % step === 0 ? w : '') + '</span>';
    var rows = P.valid.map(function (o) {
      var segs = o.phases.map(function (p, j) {
        var a = o.cs + (p.f - 1) * 7, b = o.cs + Math.min(p.to, o.wk) * 7;
        return '<div class="g-seg" style="left:' + (a / P.days * 100) + '%;width:' + ((b - a) / P.days * 100) + '%;opacity:' + (0.55 + 0.45 * (j + 1) / o.phases.length) + '"><span>' + damt(o, p.dose) + '</span></div>';
      }).join('');
      var marks = o.mix.map(function (d, k) { return '<i class="g-mix" style="left:' + (d / P.days * 100) + '%" title="Mix vial ' + (k + 1) + ': ' + fmtD(addD(P.start, d), true) + '"></i>'; }).join('');
      return '<div class="g-row"><div class="g-l"><span class="g-k" style="background:' + o.color + '">' + o.letter + '</span><span class="g-n">' + esc(shortName(o.name)) + '</span></div><div class="g-t" style="--c:' + o.color + '">' + segs + marks + '</div></div>';
    }).join('');
    return '<div class="gantt"><div class="g-row g-head"><div class="g-l">Week</div><div class="g-t g-wk">' + head + '</div></div>' + rows + '</div>';
  }
  function dayEntries(P, d) {
    var out = [];
    P.valid.forEach(function (o) { o.events.forEach(function (e) { if (e.d === d) out.push({ o: o, e: e }); }); });
    var rank = { am: 0, '': 1, pm: 2, bed: 3 };
    out.sort(function (a, b) { return rank[a.e.tod] - rank[b.e.tod] || a.o.i - b.o.i; });
    return out;
  }
  function weekGrid(P, w0) {
    var hd = '', rows = '';
    for (var d = w0; d < w0 + 7; d++) { var dt = addD(P.start, d); hd += '<div class="wg-h"><b>' + DOW[dt.getDay()] + '</b><span>' + fmtD(dt) + '</span></div>'; }
    P.valid.forEach(function (o) {
      var cells = '';
      for (var d2 = w0; d2 < w0 + 7; d2++) {
        var es = o.events.filter(function (e) { return e.d === d2; });
        cells += '<div class="wg-c">' + (es.length ? es.map(function (e) { return '<div class="wg-e" style="--c:' + o.color + '"><b>' + damt(o, e.dose) + '</b><span>' + nice(e.ph.units, 1) + ' u' + (TODS[e.tod] ? ' · ' + TODS[e.tod] : '') + '</span></div>'; }).join('') : (d2 < o.cs ? '<span class="wg-n">starts wk ' + o.sw + '</span>' : d2 >= o.ce ? '<span class="wg-n">done</span>' : '<span class="wg-n">—</span>')) + '</div>';
      }
      rows += '<div class="wg-r"><div class="wg-l"><span class="g-k" style="background:' + o.color + '">' + o.letter + '</span>' + esc(shortName(o.name)) + '</div>' + cells + '</div>';
    });
    return '<div class="wg-scroll"><div class="wg"><div class="wg-r wg-hr"><div class="wg-l"></div>' + hd + '</div>' + rows + '</div></div>';
  }
  function card(o) {
    var c = o.cat, units = o.phases.map(function (p) { return '<div class="cu"><b>' + nice(p.units, 1) + '</b><span>units for ' + damt(o, p.dose) + (o.phases.length > 1 ? ' (wk ' + p.f + '+)' : '') + '</span></div>'; }).join('');
    var mix = o.mix.map(function (d, k) { return '<span class="mx">#' + (k + 1) + ' · ' + fmtD(addD(lastPlanStart(), d), true) + '</span>'; }).join('');
    return '<div class="cc" style="--c:' + o.color + '"><div class="cc-h"><span class="g-k" style="background:' + o.color + '">' + o.letter + '</span><div><b>' + esc(o.name) + '</b><span>' + esc(schedText(o)) + ' · weeks ' + o.sw + '–' + (o.sw + o.wk - 1) + '</span></div></div>' +
      '<div class="cc-units">' + units + '</div>' +
      '<div class="cc-rows">' +
        rr('Vial', nice(o.vialMg) + ' mg + ' + nice(o.water) + ' mL water') +
        rr('Strength', amt(o.conc) + '/mL') +
        rr('Dose', doseText(o)) +
        rr('Injections', o.events.length) +
        rr('Doses per vial', nice(Math.floor(o.perVial * 10) / 10, 1) + (o.phases.length > 1 ? ' at the starting dose' : '')) +
        rr('Total used', amt(o.total)) +
        rr('Vials needed', '<b class="gold">' + o.vials + '</b>') +
      '</div>' +
      '<div class="cc-mix"><span class="cc-ml">Mix a new vial on</span>' + mix + '</div>' +
      (c && c.p ? '<a class="cc-link" href="/peptides/' + c.p + '">' + esc(shortName(c.n)) + ' cheat sheet →</a>' : '') + '</div>';
  }
  function lastPlanStart() { return lastPlan ? lastPlan.start : parseD(S.start); }
  function rr(k, v) { return '<div class="rr"><span class="k">' + k + '</span><span class="v">' + v + '</span></div>'; }
  function shopping(P) {
    var rows = P.valid.map(function (o) {
      if (!o.offers) return '<div class="sh-r"><div class="sh-n"><span class="g-k" style="background:' + o.color + '">' + o.letter + '</span><div><b>' + esc(shortName(o.name)) + '</b><span>' + o.vials + ' × ' + nice(o.vialMg) + ' mg</span></div></div><div class="sh-np">' + (o.cat ? 'None of our vendors sell a ' + nice(o.vialMg) + ' mg vial. <a href="/compare?q=' + encodeURIComponent(shortName(o.cat.cmp).split(' ')[0]) + '">See sizes →</a>' : 'Not in our price list') + '</div></div>';
      var best = o.offers[0];
      return '<div class="sh-r"><div class="sh-n"><span class="g-k" style="background:' + o.color + '">' + o.letter + '</span><div><b>' + esc(shortName(o.name)) + '</b><span>' + o.vials + ' × ' + nice(o.vialMg) + ' mg vial' + (o.vials > 1 ? 's' : '') + '</span></div></div>' +
        '<div class="sh-o">' + o.offers.map(function (f, k) {
          return '<a class="sh-v' + (k === 0 ? ' best' : '') + '" href="' + f.u + '" target="_blank" rel="noopener sponsored"><span class="sv-n">' + VNAME[f.v] + (k === 0 ? ' <em>Lowest</em>' : '') + (f.s === false ? ' <i>out of stock</i>' : '') + '</span><span class="sv-p">' + o.vials + ' × ' + usd(f.p) + '</span><b>' + usd(f.p * o.vials) + '</b><span class="sv-a">→</span></a>';
        }).join('') + '</div></div>';
    }).join('');
    var sum = '';
    if (P.priced) {
      sum = '<div class="sh-sum"><div class="ss-best"><span>Lowest total (buying each item where it\'s cheapest)</span><b>' + usd(P.split) + '</b></div>';
      if (P.single.length && P.valid.filter(function (o) { return o.offers; }).length > 1) {
        sum += '<div class="ss-one"><span class="ss-l">Or everything from one vendor (one shipment):</span>' + P.single.map(function (s) { return '<span class="ss-v">' + VNAME[s.v] + ' <b>' + usd(s.total) + '</b>' + (s.total > P.split ? ' <em>+' + usd(s.total - P.split) + '</em>' : '') + '</span>'; }).join('') + '</div>';
      }
      sum += '<div class="ss-fine">Code <b>DPRO</b> saves 10% or more at checkout. Prices change, so check the vendor before you buy. <a href="/compare">Compare all sizes →</a></div></div>';
    }
    return '<div class="sh">' + rows + '</div>' + sum;
  }
  function months(P) {
    var out = [], cur = new Date(P.start.getFullYear(), P.start.getMonth(), 1);
    while (cur <= P.end) { out.push(new Date(cur)); cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1); }
    return out.map(function (m) {
      var first = m, daysIn = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate(), cells = [];
      for (var b = 0; b < first.getDay(); b++) cells.push(null);
      for (var dd = 1; dd <= daysIn; dd++) {
        var dt = new Date(m.getFullYear(), m.getMonth(), dd), idx = Math.round((dt - P.start) / 864e5);
        cells.push({ dt: dt, idx: idx, in: idx >= 0 && idx < P.days, list: idx >= 0 && idx < P.days ? dayEntries(P, idx) : [] });
      }
      return { m: m, cells: cells };
    }).filter(function (M) { return M.cells.some(function (c) { return c && c.list.length; }); });
  }
  function monthHTML(M) {
    var h = '<div class="cal"><div class="cal-t">' + MONL[M.m.getMonth()] + ' ' + M.m.getFullYear() + '</div><div class="cal-g">' + DOW.map(function (d) { return '<div class="cal-dh">' + d + '</div>'; }).join('');
    M.cells.forEach(function (c) {
      if (!c) { h += '<div class="cal-d empty"></div>'; return; }
      h += '<div class="cal-d' + (c.in ? '' : ' out') + '"><span class="cal-n">' + c.dt.getDate() + '</span>' + c.list.map(function (x) {
        return '<span class="cal-e" style="--c:' + x.o.color + '" title="' + esc(x.o.name) + ' ' + damt(x.o, x.e.dose) + '"><i>' + x.o.letter + '</i><span>' + damt(x.o, x.e.dose).replace(' ', '') + '</span></span>';
      }).join('') + '</div>';
    });
    return h + '</div></div>';
  }

  /* ---------- update + persistence ---------- */
  var ut;
  function update() { clearTimeout(ut); ut = setTimeout(function () { renderPlan(compute()); save(); }, 60); }
  function enc(o) { return btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/=+$/, ''); }
  function dec(t) { try { return JSON.parse(decodeURIComponent(escape(atob(t)))); } catch (e) { return null; } }
  function save() { try { localStorage.setItem('dpro-cycle', JSON.stringify(S)); } catch (e) {} }
  function validState(o) { return o && Array.isArray(o.items) && o.items.length <= MAX; }

  $('#cp-share').addEventListener('click', function () {
    var url = location.origin + location.pathname + '#p=' + enc(S), b = this, sp = b.querySelector('span');
    history.replaceState(null, '', '#p=' + enc(S));
    var done = function () { b.classList.add('ok'); sp.textContent = 'Link copied'; setTimeout(function () { b.classList.remove('ok'); sp.textContent = 'Copy share link'; }, 1800); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () { prompt('Copy this link:', url); }); else prompt('Copy this link:', url);
    if (window.gtag) gtag('event', 'cycle_share');
  });
  $('#cp-reset').addEventListener('click', function () {
    if (!confirm('Start a new plan? This clears what you\'ve entered.')) return;
    S = defaults(); history.replaceState(null, '', location.pathname); renderBuilder(); update();
  });
  $('#cp-pdf').addEventListener('click', function () {
    if (!lastPlan || !lastPlan.valid.length || !window.DPRO_CYCLE_PDF) return;
    var b = this, sp = b.querySelector('span'), old = sp.textContent;
    b.disabled = true; sp.textContent = 'Building your PDF…';
    window.DPRO_CYCLE_PDF.build(lastPlan, { title: S.title, months: months(lastPlan), helpers: H }).then(function () {
      sp.textContent = 'Downloaded'; setTimeout(function () { sp.textContent = old; b.disabled = false; }, 1600);
      if (window.gtag) gtag('event', 'cycle_pdf', { compounds: lastPlan.valid.length });
    }).catch(function (err) { if (window.console) console.error(err); sp.textContent = old; b.disabled = false; alert('Sorry, the PDF couldn\'t be built on this device. Try another browser.'); });
  });
  var H = { amt: amt, damt: damt, nice: nice, usd: usd, fmtD: fmtD, addD: addD, DOW: DOW, MON: MON, MONL: MONL, schedText: schedText, doseText: doseText, shortName: shortName, TODS: TODS, VNAME: VNAME, dayEntries: dayEntries };

  /* ---------- init ---------- */
  var st = null, m = location.hash.match(/#p=([A-Za-z0-9+/]+)/), add = location.hash.match(/#add=([A-Za-z0-9+/]+)/);
  if (m) st = dec(m[1]);
  if (!validState(st)) { try { st = JSON.parse(localStorage.getItem('dpro-cycle')); } catch (e) { st = null; } }
  S = validState(st) ? st : defaults();
  if (!S.items.length) S.items.push(blankItem());
  if (add) {  // hand-off from the Peptide Calculator
    var a = dec(add[1]);
    if (a && a.name != null) {
      var it = blankItem(a.name);
      it.vial = a.vial || ''; it.water = a.water || ''; it.unit = a.unit === 'mg' ? 'mg' : 'mcg'; it.ph[0].d = a.dose || ''; if (a.freq) it.freq = a.freq; if (a.wk) it.wk = a.wk;
      var blank = S.items.length === 1 && !S.items[0].name && !S.items[0].vial && !S.items[0].ph[0].d;
      if (blank) S.items = [it]; else if (S.items.length < MAX) S.items.push(it);
      history.replaceState(null, '', location.pathname);
    }
  }
  renderBuilder();
  renderPlan(compute());
  fetch('/compare/data.json').then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (d) { PR = d; renderPlan(compute()); }).catch(function () {});
  root.classList.add('ready');
})();
