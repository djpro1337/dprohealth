/* DPRO Health — affiliate click tracking
   Every vendor link on the site points at /go/<slug>, which Netlify 302s to the
   affiliate URL. Those links are same-origin, so GA4's automatic "click" event
   never fires on them, and the 302 means there is no page_view either.
   This script is the only source of the affiliate_click event: one delegated
   listener, every page, derives the vendor from the /go/ slug.
   Gumroad and Skool links are NOT affiliate links and are deliberately not
   counted here — they are tracked separately in GA4 off the automatic
   outbound "click" event. */
(function () {
  'use strict';

  var VENDORS = {
    glacier:   'Glacier Aminos',
    modern:    'Modern Aminos',
    aminowell: 'Amino Well',
    lumora:    'Lumora Peptides',
    atomik:    'Atomik Labz',
    solution:  'Solution Peptide',
    peptira:   'Peptira',
    peptire:   'Peptira',          // typo alias kept live in _redirects
    morph:     'Morphogen Nutrition',
    algorx:    'AlgoRx',
    prices:    'PeptiPrices'
  };

  // Pull the /go/<slug> path out of an href, whether it is relative or absolute.
  function goPath(href) {
    if (!href) return null;
    var path;
    try {
      path = new URL(href, location.href);
      if (path.host !== location.host) return null;
      path = path.pathname;
    } catch (e) {
      return null;
    }
    return /^\/go\/[^\/]+\/?$/.test(path) ? path.replace(/\/$/, '') : null;
  }

  var lastEl = null, lastAt = 0;

  function handle(ev) {
    if (ev.type === 'auxclick' && ev.button !== 1) return; // middle-click only
    var a = ev.target && ev.target.closest && ev.target.closest('a[href]');
    if (!a) return;

    var path = goPath(a.getAttribute('href'));
    if (!path) return;

    // One event per click, even if click and auxclick both land.
    var now = Date.now();
    if (a === lastEl && now - lastAt < 400) return;
    lastEl = a; lastAt = now;

    if (typeof gtag !== 'function') return;

    var slug = path.split('/')[2].toLowerCase();

    gtag('event', 'affiliate_click', {
      vendor:      VENDORS[slug] || slug,
      vendor_slug: slug,
      link_url:    path,
      page_path:   location.pathname,
      link_text:   (a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 100)
    });
  }

  document.addEventListener('click', handle, true);
  document.addEventListener('auxclick', handle, true);
})();
