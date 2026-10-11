/* DPRO Health — Cycle Planner PDF
   Draws each Letter page on a canvas in the brand fonts, then wraps the pages in a small
   hand-written PDF (JPEG pages + clickable vendor links). No third-party libraries. */
(function () {
  'use strict';
  var W = 816, H = 1056, SC = 2, M = 48, CW = W - M * 2, FOOT = 1012;
  var INK = '#0B1220', BODY = '#43566A', MUTED = '#7A8C9B', LINE = '#DCE3E8', SOFT = '#F3F6F8', NAVY = '#0E1622', TEAL = '#0E7490', TQ = '#22D3EE', GOLD = '#F5B544';
  var F = {
    h1: '800 30px Archivo, sans-serif', h2: '800 17px Archivo, sans-serif', h3: '700 13.5px Archivo, sans-serif', big: '800 26px Archivo, sans-serif',
    b: '400 11.5px Outfit, sans-serif', bs: '400 10px Outfit, sans-serif', bb: '600 11.5px Outfit, sans-serif', bsb: '600 10px Outfit, sans-serif',
    mono: '700 8.5px "Space Mono", monospace', monoS: '400 8px "Space Mono", monospace'
  };

  function txt(g, t, x, y, font, color, align) { g.font = font; g.fillStyle = color; g.textAlign = align || 'left'; g.fillText(t, x, y); g.textAlign = 'left'; }
  function spaced(g, t, x, y, font, color, sp) { g.font = font; g.fillStyle = color; var cx = x; String(t).split('').forEach(function (ch) { g.fillText(ch, cx, y); cx += g.measureText(ch).width + sp; }); return cx - x; }
  function rect(g, x, y, w, h, fill, r) { g.fillStyle = fill; if (r) { g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); } else g.fillRect(x, y, w, h); }
  function stroke(g, x, y, w, h, color, lw, r) { g.strokeStyle = color; g.lineWidth = lw || 1; g.beginPath(); if (r) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); g.stroke(); }
  function hline(g, x1, x2, y, color) { g.strokeStyle = color || LINE; g.lineWidth = 1; g.beginPath(); g.moveTo(x1, y + 0.5); g.lineTo(x2, y + 0.5); g.stroke(); }
  function fit(g, t, font, maxW) { g.font = font; if (g.measureText(t).width <= maxW) return t; while (t.length > 1 && g.measureText(t + '…').width > maxW) t = t.slice(0, -1); return t + '…'; }
  function wrapLines(g, t, font, maxW) {
    g.font = font; var words = String(t).split(' '), lines = [], line = '';
    words.forEach(function (w) { var test = line ? line + ' ' + w : w; if (g.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test; });
    if (line) lines.push(line); return lines;
  }
  function badge(g, x, y, letter, color, size) { size = size || 18; rect(g, x, y, size, size, color, size / 2); txt(g, letter, x + size / 2, y + size * 0.69, '800 ' + (size * 0.58) + 'px Archivo, sans-serif', '#fff', 'center'); }
  function sectionLabel(g, t, y) { spaced(g, t.toUpperCase(), M, y, F.mono, TEAL, 1.6); }

  function build(P, opt) {
    var h = opt.helpers;
    var fonts = ['800 20px Archivo', '700 20px Archivo', '400 12px Outfit', '600 12px Outfit', '700 10px "Space Mono"', '400 10px "Space Mono"'];
    var ready = document.fonts && document.fonts.load ? Promise.all(fonts.map(function (f) { return document.fonts.load(f).catch(function () {}); })) : Promise.resolve();
    return ready.then(function () {
      var meas = document.createElement('canvas').getContext('2d');
      var title = (opt.title || '').trim() || 'My cycle plan';
      var sections = buildSections(P, opt, h, meas);
      // layout: assign sections to pages
      var pages = [[]], y = 176;
      sections.forEach(function (s) {
        var top = pages.length === 1 ? 176 : 92;
        if (y + s.h > FOOT - 16 && y > top) { pages.push([]); y = 92; }
        pages[pages.length - 1].push({ s: s, y: y }); y += s.h + (s.gap == null ? 26 : s.gap);
      });
      var out = pages.map(function (list, pi) {
        var c = document.createElement('canvas'); c.width = W * SC; c.height = H * SC;
        var g = c.getContext('2d'); g.scale(SC, SC); g.textBaseline = 'alphabetic';
        rect(g, 0, 0, W, H, '#FFFFFF');
        var links = [];
        if (pi === 0) header(g, P, title, h); else miniHeader(g, title, h, P);
        list.forEach(function (it) { it.s.draw(g, it.y, links); });
        footer(g, pi + 1, pages.length);
        var data = c.toDataURL('image/jpeg', 0.9);
        return { jpeg: b64(data.split(',')[1]), w: c.width, h: c.height, links: links };
      });
      var bytes = pdf(out, title);
      var name = 'dpro-cycle-plan-' + (title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'plan') + '.pdf';
      var blob = new Blob([bytes], { type: 'application/pdf' }), a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    });
  }

  /* ---------- page chrome ---------- */
  function wordmark(g, x, y, size, light) {
    g.font = '900 ' + size + 'px Archivo, sans-serif'; g.fillStyle = light ? '#F0F4F6' : INK; g.fillText('D', x, y);
    var dw = g.measureText('D').width; g.fillStyle = light ? TQ : TEAL; g.fillText('PRO', x + dw, y);
    var pw = g.measureText('PRO').width; spaced(g, 'HEALTH', x + dw + pw + size * 0.3, y - 1, '500 ' + Math.round(size * 0.38) + 'px Outfit, sans-serif', light ? '#A9BCC8' : MUTED, size * 0.12);
  }
  function header(g, P, title, h) {
    rect(g, 0, 0, W, 150, NAVY);
    rect(g, 0, 150, W, 3, TQ);
    wordmark(g, M, 54, 26, true);
    spaced(g, 'CYCLE PLAN', W - M - 92, 48, F.mono, TQ, 1.8);
    txt(g, 'Made ' + h.fmtD(new Date()) + ', ' + new Date().getFullYear(), W - M, 64, F.bs, '#A9BCC8', 'right');
    txt(g, fit(g, title, F.h1, CW), M, 106, F.h1, '#F0F4F6');
    txt(g, h.fmtD(P.start, true) + ', ' + P.start.getFullYear() + '  →  ' + h.fmtD(P.end, true) + ', ' + P.end.getFullYear(), M, 130, F.b, '#A9BCC8');
  }
  function miniHeader(g, title, h, P) {
    wordmark(g, M, 46, 17, false);
    txt(g, fit(g, title, F.bb, 360), W - M, 45, F.bb, INK, 'right');
    hline(g, M, W - M, 60, LINE);
  }
  function footer(g, n, of) {
    hline(g, M, W - M, FOOT + 8, LINE);
    txt(g, 'dprohealth.com/cycle-planner', M, FOOT + 26, F.bsb, TEAL);
    txt(g, 'Educational planning tool, not medical advice. Your own inputs, not a custom protocol.', W / 2 + 30, FOOT + 26, F.bs, MUTED, 'center');
    txt(g, 'Page ' + n + ' of ' + of, W - M, FOOT + 26, F.bs, MUTED, 'right');
  }

  /* ---------- sections ---------- */
  function buildSections(P, opt, h, meas) {
    var S = [], weeks = Math.ceil(P.days / 7);

    // 1. tiles
    S.push({ h: 82, draw: function (g, y) {
      var tiles = [[weeks + '', 'WEEKS', P.days + ' days'], [P.injections + '', 'INJECTIONS', P.valid.length + ' compound' + (P.valid.length > 1 ? 's' : '')],
        [P.vials + '', 'VIALS TO BUY', P.valid.map(function (o) { return o.vials + ' ' + h.shortName(o.name); }).join(' · ')], [P.priced ? h.usd(P.split) : '—', 'EST. COST', P.priced ? 'Before code DPRO' : 'Not priced']];
      var tw = (CW - 3 * 10) / 4;
      tiles.forEach(function (t, i) {
        var x = M + i * (tw + 10);
        rect(g, x, y, tw, 82, SOFT, 6); rect(g, x, y, 4, 82, i === 3 ? GOLD : TQ);
        txt(g, t[0], x + 18, y + 38, F.big, INK);
        spaced(g, t[1], x + 18, y + 56, F.mono, MUTED, 1.2);
        if (t[2]) txt(g, fit(g, t[2], F.bs, tw - 30), x + 18, y + 71, F.bs, BODY);
      });
    }});

    // 2. timeline
    var rowH = 30, gH = 42 + P.valid.length * rowH + 22;
    S.push({ h: gH, draw: function (g, y) {
      sectionLabel(g, 'Timeline', y + 10);
      var lx = M, tx = M + 150, tw = CW - 150, top = y + 34, step = weeks <= 16 ? 1 : weeks <= 32 ? 2 : 4;
      for (var w = 0; w < weeks; w++) {
        var x = tx + tw * (w * 7 / P.days);
        if (w % 2 === 0) rect(g, x, top, tw * 7 / P.days, P.valid.length * rowH, '#F7F9FA');
        if (w % step === 0) txt(g, String(w + 1), x + tw * 3.5 / P.days, top - 6, F.monoS, MUTED, 'center');
      }
      txt(g, 'WEEK', lx, top - 6, F.monoS, MUTED);
      P.valid.forEach(function (o, i) {
        var ry = top + i * rowH;
        badge(g, lx, ry + 6, o.letter, o.color, 18);
        txt(g, fit(g, h.shortName(o.name), F.bb, 120), lx + 26, ry + 19, F.bb, INK);
        o.phases.forEach(function (p, j) {
          var a = o.cs + (p.f - 1) * 7, b = o.cs + Math.min(p.to, o.wk) * 7, x1 = tx + tw * a / P.days, x2 = tx + tw * b / P.days;
          g.globalAlpha = 0.6 + 0.4 * (j + 1) / o.phases.length; rect(g, x1, ry + 6, Math.max(2, x2 - x1 - 1), 18, o.color, 3); g.globalAlpha = 1;
          var lab = h.damt(o, p.dose); g.font = F.bsb;
          if (g.measureText(lab).width < x2 - x1 - 10) txt(g, lab, x1 + 6, ry + 19, F.bsb, '#fff');
        });
        o.mix.forEach(function (d) { var x = tx + tw * d / P.days; g.fillStyle = INK; g.beginPath(); g.moveTo(x - 3.5, ry + 1); g.lineTo(x + 3.5, ry + 1); g.lineTo(x, ry + 6); g.closePath(); g.fill(); });
      });
      var ly = top + P.valid.length * rowH + 16;
      g.fillStyle = INK; g.beginPath(); g.moveTo(tx, ly - 7); g.lineTo(tx + 7, ly - 7); g.lineTo(tx + 3.5, ly - 2); g.closePath(); g.fill();
      txt(g, 'Mix a new vial', tx + 12, ly - 1, F.bs, BODY);
      txt(g, 'Darker shade = dose change', tx + 110, ly - 1, F.bs, BODY);
    }});

    // 3. what you're taking (one block per compound so they can split across pages)
    S.push({ h: 14, gap: 4, draw: function (g, y) { sectionLabel(g, "What you're taking", y + 10); } });
    P.valid.forEach(function (o, oi) {
      var mixTxt = 'Mix a new vial: ' + o.mix.map(function (d, k) { return h.fmtD(h.addD(P.start, d)); }).join(', ');
      var mixLines = wrapLines(meas, mixTxt, F.bs, CW - 310);
      var unitsTxt = o.phases.map(function (p) { return h.nice(p.units, 1) + ' units' + (o.phases.length > 1 ? ' (wk ' + p.f + '+)' : ''); }).join('  ·  ');
      var bh = Math.max(76, 50 + mixLines.length * 13 + 8);
      S.push({ h: bh, gap: oi === P.valid.length - 1 ? 26 : 8, draw: function (g, y) {
        stroke(g, M, y, CW, bh, LINE, 1, 6); rect(g, M, y, 4, bh, o.color);
        badge(g, M + 16, y + 14, o.letter, o.color, 20);
        txt(g, fit(g, o.name, F.h3, 270), M + 46, y + 28, F.h3, INK);
        txt(g, fit(g, h.schedText(o) + ' · weeks ' + o.sw + '–' + (o.sw + o.wk - 1), F.bs, 290), M + 46, y + 43, F.bs, BODY);
        mixLines.forEach(function (l, k) { txt(g, l, M + 46, y + 60 + k * 13, F.bs, MUTED); });
        // right column
        var rx = M + CW - 250;
        txt(g, 'DOSE', rx, y + 22, F.monoS, MUTED); txt(g, fit(g, h.doseText(o), F.bsb, 178), rx + 56, y + 22, F.bsb, INK);
        txt(g, 'DRAW', rx, y + 37, F.monoS, MUTED); txt(g, fit(g, unitsTxt, F.bsb, 178), rx + 56, y + 37, F.bsb, INK);
        txt(g, 'VIAL', rx, y + 52, F.monoS, MUTED); txt(g, h.nice(o.vialMg) + ' mg + ' + h.nice(o.water) + ' mL water', rx + 56, y + 52, F.bsb, INK);
        txt(g, 'TOTAL', rx, y + 67, F.monoS, MUTED); txt(g, o.events.length + ' injections · ' + o.vials + ' vial' + (o.vials > 1 ? 's' : ''), rx + 56, y + 67, F.bsb, INK);
      }});
    });

    // 4. first week
    var wkRows = P.valid.map(function (o) { var mx = 1; for (var d = 0; d < 7; d++) mx = Math.max(mx, o.events.filter(function (e) { return e.d === d; }).length); return 12 + mx * 24; });
    var wgH = 40 + 30 + wkRows.reduce(function (a, b) { return a + b; }, 0);
    S.push({ h: wgH, draw: function (g, y) {
      sectionLabel(g, 'Your first week', y + 10);
      txt(g, 'Units are for a ' + P.cap + '-unit (U-100) syringe.', W - M, y + 10, F.bs, MUTED, 'right');
      var lw = 112, cw = (CW - lw) / 7, top = y + 24;
      rect(g, M, top, CW, 30, SOFT, 4);
      for (var d = 0; d < 7; d++) {
        var dt = h.addD(P.start, d), x = M + lw + d * cw;
        txt(g, h.DOW[dt.getDay()].toUpperCase(), x + cw / 2, top + 13, F.mono, INK, 'center');
        txt(g, h.fmtD(dt), x + cw / 2, top + 25, F.bs, MUTED, 'center');
      }
      var ry = top + 30;
      P.valid.forEach(function (o, i) {
        var rh = wkRows[i];
        hline(g, M, W - M, ry, LINE);
        badge(g, M + 4, ry + 8, o.letter, o.color, 16);
        txt(g, fit(g, h.shortName(o.name), F.bsb, lw - 30), M + 26, ry + 20, F.bsb, INK);
        for (var d = 0; d < 7; d++) {
          var x = M + lw + d * cw, es = o.events.filter(function (e) { return e.d === d; });
          if (!es.length) { txt(g, d < o.cs ? 'wk ' + o.sw : '–', x + cw / 2, ry + 22, F.bs, '#B5C1CA', 'center'); continue; }
          es.forEach(function (e, k) {
            var cy = ry + 6 + k * 24;
            g.globalAlpha = 0.14; rect(g, x + 3, cy, cw - 6, 21, o.color, 4); g.globalAlpha = 1;
            rect(g, x + 3, cy, 3, 21, o.color);
            txt(g, fit(g, h.damt(o, e.dose), F.bsb, cw - 14), x + 10, cy + 10, F.bsb, INK);
            txt(g, h.nice(e.ph.units, 1) + 'u' + (h.TODS[e.tod] ? ' · ' + h.TODS[e.tod] : ''), x + 10, cy + 19, F.monoS, BODY);
          });
        }
        ry += rh;
      });
      hline(g, M, W - M, ry, LINE);
    }});

    // 5. shopping list
    var priced = P.valid;
    var shH = 30 + priced.length * 38 + (P.priced ? 66 : 20);
    S.push({ h: shH, draw: function (g, y, links) {
      sectionLabel(g, 'Shopping list', y + 10);
      if (P.priced) txt(g, 'Lowest price first. Verified ' + new Date(P.verified + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', before code DPRO.', W - M, y + 10, F.bs, MUTED, 'right');
      var ry = y + 24;
      priced.forEach(function (o) {
        rect(g, M, ry, CW, 32, SOFT, 5);
        badge(g, M + 10, ry + 7, o.letter, o.color, 18);
        txt(g, fit(g, h.shortName(o.name), F.bb, 170), M + 36, ry + 15, F.bb, INK);
        txt(g, o.vials + ' × ' + h.nice(o.vialMg) + ' mg', M + 36, ry + 27, F.bs, BODY);
        if (!o.offers) { txt(g, o.cat ? 'Our vendors don\'t sell a ' + h.nice(o.vialMg) + ' mg vial. See dprohealth.com/compare' : 'Not in our price list', M + 230, ry + 20, F.bs, MUTED); ry += 38; return; }
        var x = M + 230, colW = (CW - 230) / 3;
        o.offers.slice(0, 3).forEach(function (f, k) {
          var cx = x + k * colW;
          txt(g, h.VNAME[f.v] + (k === 0 ? '  LOWEST' : ''), cx, ry + 14, k === 0 ? F.bsb : F.bs, k === 0 ? TEAL : BODY);
          txt(g, h.usd(f.p * o.vials), cx, ry + 27, k === 0 ? '800 12px Archivo, sans-serif' : '700 11px Archivo, sans-serif', INK);
          g.font = F.monoS; var tw = g.measureText(h.usd(f.p * o.vials)).width;
          txt(g, '(' + o.vials + ' × ' + h.usd(f.p) + ')', cx + tw + 18, ry + 27, F.monoS, MUTED);
          links.push({ x: cx - 4, y: ry + 2, w: colW - 6, h: 28, url: 'https://dprohealth.com' + f.u });
        });
        ry += 38;
      });
      if (P.priced) {
        rect(g, M, ry + 4, CW, 50, NAVY, 6);
        txt(g, 'Lowest total, buying each item where it\'s cheapest', M + 16, ry + 25, F.bb, '#F0F4F6');
        var one = P.single && P.single.length && priced.filter(function (o) { return o.offers; }).length > 1 ? 'One vendor: ' + P.single.map(function (s) { return h.VNAME[s.v] + ' ' + h.usd(s.total); }).join(' · ') : 'Use code DPRO at checkout to save 10% or more.';
        txt(g, fit(g, one, F.bs, CW - 160), M + 16, ry + 41, F.bs, '#A9BCC8');
        txt(g, h.usd(P.split), W - M - 16, ry + 37, '800 22px Archivo, sans-serif', GOLD, 'right');
      }
    }});

    // 6. calendars
    opt.months.forEach(function (Mo, mi) {
      var weeksIn = Math.ceil(Mo.cells.length / 7), maxE = 1;
      Mo.cells.forEach(function (c) { if (c) maxE = Math.max(maxE, c.list.length); });
      var shown = Math.min(maxE, 5), cellH = Math.max(46, 18 + shown * 13 + 4), calH = 26 + 20 + weeksIn * cellH;
      S.push({ h: calH, draw: function (g, y) {
        if (mi === 0) sectionLabel(g, 'Calendar · check off each dose', y - 6);
        txt(g, h.MONL[Mo.m.getMonth()] + ' ' + Mo.m.getFullYear(), M, y + 16, F.h2, INK);
        var cw = CW / 7, top = y + 26;
        h.DOW.forEach(function (d, i) { txt(g, d.toUpperCase(), M + i * cw + 6, top + 13, F.mono, MUTED); });
        var gy = top + 20;
        Mo.cells.forEach(function (c, k) {
          var col = k % 7, row = Math.floor(k / 7), x = M + col * cw, cy = gy + row * cellH;
          if (c) {
            if (!c.in) rect(g, x, cy, cw, cellH, '#FAFBFC');
            txt(g, String(c.dt.getDate()), x + 6, cy + 13, '700 10px Archivo, sans-serif', c.in ? INK : '#B5C1CA');
            c.list.slice(0, shown).forEach(function (e, j) {
              var ey = cy + 18 + j * 13;
              stroke(g, x + 6, ey, 8, 8, e.o.color, 1.4, 1.5);
              txt(g, e.o.letter, x + 18, ey + 7.5, '800 8px Archivo, sans-serif', e.o.color);
              txt(g, fit(g, h.damt(e.o, e.e.dose).replace(' ', '') + (h.TODS[e.e.tod] ? ' ' + h.TODS[e.e.tod] : ''), F.bs, cw - 32), x + 27, ey + 8, F.bs, INK);
            });
            if (c.list.length > shown) txt(g, '+' + (c.list.length - shown) + ' more', x + 6, cy + cellH - 5, F.monoS, MUTED);
          }
          g.strokeStyle = LINE; g.lineWidth = 1; g.strokeRect(x + 0.5, cy + 0.5, cw, cellH);
        });
      }});
    });

    // legend for calendar + notes
    S.push({ h: 96, draw: function (g, y) {
      var x = M;
      P.valid.forEach(function (o) { badge(g, x, y, o.letter, o.color, 14); var t = h.shortName(o.name); txt(g, t, x + 19, y + 11, F.bs, INK); g.font = F.bs; x += 30 + g.measureText(t).width; });
      rect(g, M, y + 26, CW, 64, SOFT, 6);
      var lines = wrapLines(g, 'This plan is built entirely from what you entered. It is not a custom protocol and not medical advice. Double-check every number against your vial label, use a fresh needle each time, and talk with a qualified healthcare professional before starting anything. Many people aim to finish a mixed vial within about 4 weeks; check storage guidance for each compound.', F.bs, CW - 32);
      lines.forEach(function (l, k) { txt(g, l, M + 16, y + 44 + k * 13, F.bs, BODY); });
    }});
    return S;
  }

  /* ---------- tiny PDF writer ---------- */
  function b64(s) { var bin = atob(s), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
  function pdf(pages, title) {
    var enc = new TextEncoder(), chunks = [], offsets = [], pos = 0;
    function put(x) { var b = typeof x === 'string' ? enc.encode(x) : x; chunks.push(b); pos += b.length; }
    function pstr(s) { return '(' + String(s).replace(/[\\()]/g, '\\$&').replace(/[^\x20-\x7e]/g, '') + ')'; }
    var PW = 612, PH = 792, k = PW / W, n = 3, objs = [];
    // object numbers: 1 catalog, 2 pages, 3 info, then per page: page, content, image, links...
    var kids = [];
    pages.forEach(function (p) {
      var pageN = n++, contN = n++, imgN = n++, annN = p.links.map(function () { return n++; });
      kids.push(pageN); p.nums = { page: pageN, cont: contN, img: imgN, ann: annN };
    });
    put('%PDF-1.4\n');
    put(new Uint8Array([0x25, 0xE2, 0xE3, 0xCF, 0xD3, 0x0A]));
    function obj(num, body) { offsets[num] = pos; put(num + ' 0 obj\n'); put(body); put('\nendobj\n'); }
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, '<< /Type /Pages /Kids [' + kids.map(function (x) { return x + ' 0 R'; }).join(' ') + '] /Count ' + kids.length + ' >>');
    obj(3, '<< /Title ' + pstr(title + ' · DPRO Health Cycle Plan') + ' /Producer (dprohealth.com) /Creator (DPRO Health Cycle Planner) >>');
    pages.forEach(function (p) {
      var N = p.nums;
      obj(N.page, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + PW + ' ' + PH + '] /Resources << /XObject << /Im0 ' + N.img + ' 0 R >> >> /Contents ' + N.cont + ' 0 R' +
        (N.ann.length ? ' /Annots [' + N.ann.map(function (a) { return a + ' 0 R'; }).join(' ') + ']' : '') + ' >>');
      var cs = 'q ' + PW + ' 0 0 ' + PH + ' 0 0 cm /Im0 Do Q';
      obj(N.cont, '<< /Length ' + cs.length + ' >>\nstream\n' + cs + '\nendstream');
      offsets[N.img] = pos;
      put(N.img + ' 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + p.w + ' /Height ' + p.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + p.jpeg.length + ' >>\nstream\n');
      put(p.jpeg); put('\nendstream\nendobj\n');
      p.links.forEach(function (l, i) {
        var x1 = (l.x * k).toFixed(2), y1 = (PH - (l.y + l.h) * k).toFixed(2), x2 = ((l.x + l.w) * k).toFixed(2), y2 = (PH - l.y * k).toFixed(2);
        obj(N.ann[i], '<< /Type /Annot /Subtype /Link /Rect [' + x1 + ' ' + y1 + ' ' + x2 + ' ' + y2 + '] /Border [0 0 0] /A << /S /URI /URI ' + pstr(l.url) + ' >> >>');
      });
    });
    var xref = pos, total = n;
    var x = 'xref\n0 ' + total + '\n0000000000 65535 f \n';
    for (var i = 1; i < total; i++) x += ('0000000000' + (offsets[i] || 0)).slice(-10) + ' 00000 n \n';
    put(x); put('trailer\n<< /Size ' + total + ' /Root 1 0 R /Info 3 0 R >>\nstartxref\n' + xref + '\n%%EOF\n');
    var out = new Uint8Array(pos), o = 0; chunks.forEach(function (c) { out.set(c, o); o += c.length; });
    return out;
  }

  window.DPRO_CYCLE_PDF = { build: build };
})();
