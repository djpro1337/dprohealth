DPRO HEALTH — WEBSITE FILES
============================

WHAT'S IN HERE
--------------
index.html              Home page (one long scroll: hero, mission, about, peptide coaching, free handbook, community, follow)
peptide-calculator.html Reconstitution calculator + trusted vendors section
brand.css               Shared styles for both pages (edit once, both update)
hero-headshot.jpg       Hero image (home page)
meetdavid.jpg           "Meet David" image (home page)

Keep all five files TOGETHER in the same folder. They reference each other by filename.

HOW TO PUT IT ONLINE
--------------------
Easiest: go to https://app.netlify.com/drop and drag this whole folder onto the page.
You'll get a live URL in seconds. To use dprohealth.com, add it as a custom domain in
Netlify's site settings (free). Cloudflare Pages and Vercel work the same way.

To update later: change the files, then re-drag the folder (or connect a GitHub repo).

LINKS THAT ARE LIVE
-------------------
- Free Retatrutide Handbook -> Gumroad (opens new tab)
- Community -> Skool (Optimized Living)
- Calculator -> peptide-calculator.html
- Social section + footer -> YouTube, Instagram, TikTok, X
- Trusted vendors (on calculator page) -> all 7 vendor links with codes

PLACEHOLDERS / COMING SOON (by design, for now)
-----------------------------------------------
- "Work With Me" (nav) and "See coaching details" (home) -> non-linking, marked (Coming Soon).
  When the coaching/consultation pages are built, re-link these and remove the (Coming Soon) labels.
- Coaching & Consultation were removed from the menu/footer until those pages are ready.

THINGS YOU MAY WANT TO DOUBLE-CHECK
-----------------------------------
- Calculator presets use default doses/water amounts. Confirm they match your real protocols
  (edit the data-d = dose and data-w = water values in peptide-calculator.html).
- Stats on the home page: 10K+ newsletter, 3,700+ community. Update anytime in index.html.

© 2026 DPRO Health


--- UPDATE 2026-06-24 ---
Added tdee-calculator.html (TDEE & Macro calculator with GLP-1 Mode + Google Analytics).
Nav "Calculator" link replaced site-wide with a "Tools" dropdown containing:
  - Peptide Calculator (peptide-calculator.html)
  - TDEE / Macro Calculator (tdee-calculator.html)
Applied to index.html, peptide-calculator.html, tdee-calculator.html, and all 39 peptides/*.html pages.
Footers on the three root pages now link both calculators.

--- UPDATE 2026-06-24 ---
Added glp1-titration.html (GLP-1 Titration Schedule tool).
  - Compounds: retatrutide, tirzepatide, semaglutide, cagrilintide
  - Standard trial-based ramp per compound + Custom mode (set own start/step/target/hold)
  - Outputs: week-by-week visual timeline + schedule table + summary strip
  - Google Analytics included; Retatrutide Handbook CTA
Tools dropdown now lists all three tools (Peptide Calculator, TDEE/Macro, GLP-1 Titration)
across index.html, all three tool pages, and all 39 peptides/*.html. Footers updated on root pages.

--- UPDATE 2026-06-27 ---
glp1-titration.html: added retatrutide-specific callout (shows only when retatrutide selected):
  - 1 mg gentle-start option to minimize early side effects
  - diminishing returns past 8 mg/week per trial data
  - clinical-trial / investigational reminder
