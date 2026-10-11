/* DPRO Health — half-life reference data.
   h  = elimination half-life in hours
   ev = evidence: 'human' (published human PK / drug label), 'animal' (animal PK only), 'est' (no solid data — commonly cited estimate)
   src = where the number comes from. Keep this honest: update when better data appears.
   p  = cheat sheet slug, cmp = name in /compare/data.json */
window.DPRO_HL = [
  { g: 'GLP-1 & metabolic', items: [
    { n: 'Semaglutide',  h: 168,   ev: 'human', src: 'FDA label (Ozempic/Wegovy): ~1 week', p: 'semaglutide', cmp: 'Semaglutide' },
    { n: 'Tirzepatide',  h: 116.7, ev: 'human', src: 'FDA label (Mounjaro/Zepbound): ~5 days', p: 'tirzepatide', cmp: 'Tirzepatide' },
    { n: 'Retatrutide',  h: 144,   ev: 'human', src: 'Phase 1 trial (Urva et al., Lancet 2022): ~6 days', p: 'retatrutide', cmp: 'Retatrutide' },
    { n: 'Cagrilintide', h: 168,   ev: 'human', src: 'Phase 1b trial (Enebo et al., Lancet 2021): 159–195 h', p: 'cagrilintide', cmp: 'Cagrilintide' },
    { n: 'Survodutide',  h: 123,   ev: 'est',   src: 'Derived from a published population-PK model (CL/F, V/F); ~5 days. No stated half-life yet.', p: null, cmp: 'Survodutide' }
  ]},
  { g: 'Growth hormone axis', items: [
    { n: 'Tesamorelin',          h: 0.43, ev: 'human', src: 'FDA label (Egrifta): 26 min in healthy adults, 38 min in HIV patients', p: 'tesamorelin', cmp: 'Tesamorelin' },
    { n: 'Sermorelin',           h: 0.2,  ev: 'human', src: 'Prescribing information (Geref): ~11–12 min', p: null, cmp: 'Sermorelin' },
    { n: 'Ipamorelin',           h: 2,    ev: 'human', src: 'Human PK study (Gobburu et al., Pharm Res 1999): ~2 h', p: 'ipamorelin', cmp: 'Ipamorelin' },
    { n: 'CJC-1295 (with DAC)',  h: 156,  ev: 'human', src: 'Human PK study (Teichman et al., JCEM 2006): 5.8–8.1 days', p: 'cjc1295', cmp: 'CJC-1295 (with DAC)' },
    { n: 'CJC-1295 (no DAC)',    h: 0.5,  ev: 'est',   src: 'No published human PK. ~30 min is the commonly cited figure.', p: 'cjc1295', cmp: 'CJC-1295 (no DAC)' },
    { n: 'IGF-1 LR3',            h: 24,   ev: 'est',   src: 'No published human PK. 20–30 h is the commonly cited range.', p: 'igf1-lr3', cmp: 'IGF-1 LR3' }
  ]},
  { g: 'Healing & immune', items: [
    { n: 'BPC-157',          h: 0.5,  ev: 'animal', src: 'Rat and dog PK (He et al., Front Pharmacol 2022): under 30 min. No human data.', p: 'bpc157', cmp: 'BPC-157' },
    { n: 'TB-500',           h: 2,    ev: 'est',    src: 'No human data on the TB-500 fragment. ~2 h is a rough estimate based on limited thymosin β4 data.', p: 'tb500', cmp: 'TB-500' },
    { n: 'Thymosin Alpha-1', h: 2,    ev: 'human',  src: 'Prescribing information (Zadaxin): ~2 h', p: 'thymosin-alpha1', cmp: 'Thymosin Alpha-1' },
    { n: 'VIP',              h: 0.03, ev: 'human',  src: 'Human IV studies: about 1–2 min in plasma', p: 'vip', cmp: 'VIP' }
  ]},
  { g: 'Sexual health & tanning', items: [
    { n: 'PT-141 (bremelanotide)', h: 2.7,  ev: 'human', src: 'FDA label (Vyleesi): ~2.7 h', p: 'pt141', cmp: 'PT-141' },
    { n: 'Kisspeptin-10',          h: 0.07, ev: 'human', src: 'Human studies (Jayasena et al.): ~4 min', p: 'kisspeptin', cmp: 'Kisspeptin' },
    { n: 'Oxytocin',               h: 0.06, ev: 'human', src: 'FDA label (Pitocin): 1–6 min after IV', p: 'oxytocin', cmp: 'Oxytocin' },
    { n: 'Melanotan 1 (afamelanotide)', h: 0.5, ev: 'human', src: 'Afamelanotide data: ~30 min in plasma (the Scenesse implant releases slowly over days)', p: 'melanotan1', cmp: 'Melanotan 1' }
  ]},
  { g: 'Longevity', items: [
    { n: 'SS-31 (elamipretide)', h: 5, ev: 'human', src: 'Clinical PK summary (ADDF): 4–6 h after SC or IV', p: 'ss31', cmp: 'SS-31' }
  ]},
  { g: 'Testosterone', items: [
    { n: 'Testosterone propionate', h: 19.2, ev: 'human', src: 'Human PK (Behre & Nieschlag, testosterone ester review): ~0.8 days', p: null, cmp: null },
    { n: 'Testosterone enanthate',  h: 108,  ev: 'human', src: 'Human PK (Behre & Nieschlag, testosterone ester review): ~4.5 days', p: null, cmp: null },
    { n: 'Testosterone cypionate',  h: 192,  ev: 'human', src: 'FDA label (Depo-Testosterone): ~8 days', p: null, cmp: null },
    { n: 'Testosterone undecanoate (injectable)', h: 814, ev: 'human', src: 'Human PK (Behre et al. 1999; Nebido/Aveed in castor oil): ~34 days', p: null, cmp: null }
  ]},
  { g: 'Injectable anabolics', items: [
    { n: 'Nandrolone decanoate (Deca)',          h: 216, ev: 'human', src: 'Human PK (Bagchus et al., JCEM 2005): ~6–12 days after IM injection', p: null, cmp: null },
    { n: 'Nandrolone phenylpropionate (NPP)',    h: 65,  ev: 'est',   src: 'No modern human PK. ~2.5–3 days is the commonly cited figure.', p: null, cmp: null },
    { n: 'Trenbolone acetate',                   h: 72,  ev: 'est',   src: 'Veterinary drug with no human PK studies. ~1–3 days commonly cited.', p: null, cmp: null },
    { n: 'Trenbolone enanthate',                 h: 120, ev: 'est',   src: 'No human PK. Assumed similar to other enanthate esters (~5 days).', p: null, cmp: null },
    { n: 'Boldenone undecylenate (Equipoise)',   h: 336, ev: 'est',   src: 'Veterinary drug with no human PK studies. ~14 days commonly cited.', p: null, cmp: null },
    { n: 'Drostanolone propionate (Masteron)',   h: 48,  ev: 'est',   src: 'No modern human PK. ~2 days commonly cited.', p: null, cmp: null },
    { n: 'Drostanolone enanthate',               h: 120, ev: 'est',   src: 'No human PK. Assumed similar to other enanthate esters (~5 days).', p: null, cmp: null },
    { n: 'Methenolone enanthate (Primobolan)',   h: 120, ev: 'est',   src: 'No modern human PK. ~5 days commonly cited.', p: null, cmp: null },
    { n: 'Stanozolol injectable (Winstrol)',     h: 24,  ev: 'human', src: 'Published pharmacology (aqueous suspension, IM): ~24 h', p: null, cmp: null }
  ]},
  { g: 'Oral anabolics', items: [
    { n: 'Oxandrolone (Anavar)',            h: 9.4, ev: 'human', src: 'FDA label (Oxandrin): 9.4 h in adults, ~13 h in older adults', p: null, cmp: null },
    { n: 'Methandrostenolone (Dianabol)',   h: 4.5, ev: 'human', src: 'Published pharmacology: ~3–6 h', p: null, cmp: null },
    { n: 'Stanozolol oral (Winstrol)',      h: 9,   ev: 'human', src: 'Published pharmacology: ~9 h by mouth', p: null, cmp: null },
    { n: 'Oxymetholone (Anadrol)',          h: 8,   ev: 'est',   src: 'No published half-life (Mosby\'s lists it as unknown). ~8–9 h commonly cited.', p: null, cmp: null },
    { n: 'Fluoxymesterone (Halotestin)',    h: 9.2, ev: 'human', src: 'Published pharmacology: ~9.2 h', p: null, cmp: null },
    { n: 'Methyltestosterone',              h: 3,   ev: 'human', src: 'Published pharmacology: ~3 h (2.5–3.5 h)', p: null, cmp: null },
    { n: 'Turinabol',                       h: 16,  ev: 'est',   src: 'No human PK. ~16 h commonly cited.', p: null, cmp: null },
    { n: 'Mesterolone (Proviron)',          h: 12,  ev: 'human', src: 'Prescribing information (Proviron): ~12–13 h', p: null, cmp: null },
    { n: 'Methenolone acetate (oral Primobolan)', h: 5, ev: 'est', src: 'No modern human PK. ~4–6 h commonly cited.', p: null, cmp: null }
  ]},
  { g: 'AIs, SERMs & hCG', items: [
    { n: 'hCG',                   h: 29,  ev: 'human', src: 'FDA label (Ovidrel, recombinant hCG, SC): ~29 h', p: null, cmp: null },
    { n: 'Anastrozole (Arimidex)', h: 50,  ev: 'human', src: 'FDA label (Arimidex): ~50 h', p: null, cmp: null },
    { n: 'Letrozole (Femara)',     h: 48,  ev: 'human', src: 'FDA label (Femara): ~2 days', p: null, cmp: null },
    { n: 'Exemestane (Aromasin)',  h: 24,  ev: 'human', src: 'FDA label (Aromasin): ~24 h', p: null, cmp: null },
    { n: 'Tamoxifen (Nolvadex)',   h: 168, ev: 'human', src: 'FDA label: 5–7 days (its active metabolite lasts ~14 days)', p: null, cmp: null },
    { n: 'Clomiphene (Clomid)',    h: 120, ev: 'human', src: 'FDA label (Clomid): ~5 days', p: null, cmp: null },
    { n: 'Cabergoline',            h: 66,  ev: 'human', src: 'FDA label (Dostinex): 63–69 h', p: null, cmp: null }
  ]}
];
