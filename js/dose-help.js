/* DPRO Health — "Not sure what dose?" helper under every dose box.
   Points people to the compound's cheat sheet (educational content) and teases
   custom protocols (coming soon). It never suggests or fills in a dose. */
(function () {
  var D = window.DPRO_CALC_DATA || {}, comps = D.compounds || [], blends = D.blends || [];
  function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function match(v) {
    var k = norm(v); if (!k) return null;
    var i, c, b;
    for (i = 0; i < blends.length; i++) { b = blends[i]; if (b.p && (b.id === v || norm(b.n) === k || norm(b.cmp) === k)) return { n: b.cmp || b.n, p: b.p }; }
    for (i = 0; i < comps.length; i++) { c = comps[i]; if (norm(c.n) === k) return c.p ? { n: c.n, p: c.p } : { n: c.n, p: null }; }
    for (i = 0; i < comps.length; i++) { c = comps[i]; if (c.p && norm(c.n).length > 2 && k.indexOf(norm(c.n)) === 0) return { n: c.n, p: c.p }; }
    return null;
  }
  function vis(el) { return !!(el && el.offsetParent !== null); }
  function namesIn(scope) {
    var out = [];
    scope.querySelectorAll('select[data-k="blend"], select[data-k="preset"]').forEach(function (el) { if (vis(el) && el.value) { out.push(el.value); if (el.selectedOptions[0]) out.push(el.selectedOptions[0].text); } });
    scope.querySelectorAll('input[data-k="name"], input[data-f="name"], .lrow [data-r="n"], .brow [data-r="n"]').forEach(function (el) { if (vis(el) || el.getAttribute('data-f') === 'name') out.push(el.value); });
    return out;
  }
  function html(m) {
    var link = m && m.p
      ? '<a href="/peptides/' + m.p + '">Read the ' + esc(m.n) + ' cheat sheet →</a>'
      : '<a href="/peptides">Browse the peptide cheat sheets →</a>';
    return '<div class="dh-row"><span class="dh-ico" aria-hidden="true">?</span><span><b>Not sure what dose to use?</b> ' + link + '</span></div>' +
      '<div class="dh-row dh-soon"><span class="dh-ico" aria-hidden="true">★</span><span><b>Want a protocol built for you?</b> Custom protocols from David <span class="dh-pill">Coming soon</span></span></div>';
  }
  function anchors() {
    var a = [];
    document.querySelectorAll('.tabp input[data-k="dose"], .tabp input[data-k="ldose"]').forEach(function (inp) { var r = inp.closest('.irow'); if (r) a.push({ after: r, scope: inp.closest('.tabp') }); });
    document.querySelectorAll('.tabp .bdoses').forEach(function (el) { a.push({ after: el, scope: el.closest('.tabp') }); });
    document.querySelectorAll('.ci .ph-list').forEach(function (el) { a.push({ after: el, scope: el.closest('.ci') }); });
    return a;
  }
  function refresh() {
    anchors().forEach(function (x) {
      var box = x.after.nextElementSibling;
      if (!box || !box.classList.contains('dose-help')) { box = document.createElement('div'); box.className = 'dose-help'; x.after.parentNode.insertBefore(box, x.after.nextSibling); }
      var m = null, ns = namesIn(x.scope);
      for (var i = 0; i < ns.length && !m; i++) m = match(ns[i]);
      var h = html(m);
      if (box.getAttribute('data-h') !== h) { box.innerHTML = h; box.setAttribute('data-h', h); }
    });
  }
  var st = document.createElement('style');
  st.textContent = '.dose-help{margin:10px 0 16px;padding:12px 14px;border:1px solid var(--border,#22324a);border-radius:10px;background:rgba(34,211,238,.04);font-family:Outfit,sans-serif;font-size:13px;line-height:1.45;color:var(--text,#c9d4e0)}' +
    '.dose-help .dh-row{display:flex;gap:10px;align-items:flex-start}.dose-help .dh-row+.dh-row{margin-top:8px;padding-top:8px;border-top:1px dashed var(--border,#22324a)}' +
    '.dose-help .dh-ico{flex:0 0 20px;height:20px;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:700;color:var(--tq-bright,#22d3ee);border:1px solid var(--tq-border,rgba(34,211,238,.35))}' +
    '.dose-help b{font-weight:600;color:var(--white,#fff)}.dose-help a{color:var(--tq-bright,#22d3ee);text-decoration:none;font-weight:500;white-space:nowrap}.dose-help a:hover{color:var(--gold,#f5b301)}' +
    '.dose-help .dh-soon{color:var(--muted,#8a9bb0)}.dose-help .dh-soon .dh-ico{color:var(--gold,#f5b301);border-color:var(--gold-border,rgba(245,179,1,.4))}' +
    '.dose-help .dh-pill{display:inline-block;margin-left:6px;padding:2px 8px;border-radius:999px;font-size:10.5px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--gold,#f5b301);background:rgba(245,179,1,.1);border:1px solid var(--gold-border,rgba(245,179,1,.4));white-space:nowrap}';
  document.head.appendChild(st);
  var t = 0;
  function soon() { if (t) return; t = setTimeout(function () { t = 0; refresh(); }, 60); }
  ['input', 'change', 'click'].forEach(function (e) { document.addEventListener(e, soon, true); });
  new MutationObserver(soon).observe(document.body, { childList: true, subtree: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh); else refresh();
  window.addEventListener('load', soon);
})();
