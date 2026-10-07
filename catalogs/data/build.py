#!/usr/bin/env python3
"""Build catalog JSON from vendor slug/TSV sources.
Re-run after refreshing modern.slugs or glacier.tsv:  python3 catalogs/data/build.py
"""
import json, re, datetime, os

HERE = os.path.dirname(os.path.abspath(__file__))

# Display-name overrides where the slug doesn't prettify well.
OVER = {
 "ma-1s":"MA-1S (Semaglutide)", "ma-2tz":"MA-2TZ (Tirzepatide)", "ma-3rt":"MA-3RT (Retatrutide)",
 "ma-3rt-cagrilintide-8mg-2mg":"MA-3RT / Cagrilintide 8mg/2mg",
 "petrelintide-zp8396":"Petrelintide (ZP8396)",
 "maritide-maridebart-cagraflutide":"MariTide (Maridebart Cagraflutide)",
 "kw-6353-sipagladenant":"KW-6353 (Sipagladenant)",
 "bpc-157tb-500-blend":"BPC-157 / TB-500 Blend",
 "bpc-157-arginate":"BPC-157 Arginate (PDA)",
 "pentadecapeptide":"Pentadecapeptide (BPC-157)",
 "transdermal-pentadecapeptide":"Transdermal Pentadecapeptide",
 "glow-ghk-cu-tb-500-bpc-157":"GLOW (GHK-Cu, TB-500, BPC-157)",
 "klow-ghk-cu-tb-500-bpc-157-kpv":"KLOW (GHK-Cu, TB-500, BPC-157, KPV)",
 "ghk-cu-kpv-blend":"GHK-Cu / KPV Blend",
 "cartalax-blend-research-matrix":"Cartalax Blend Research Matrix",
 "buy-ghk-cu-methylene-blue-tallow-matrix-blend":"GHK-Cu / Methylene Blue Tallow Matrix",
 "ghk-cu-2mg-dry-fill":"GHK-Cu 2mg (Dry Fill)",
 "tb-500-thymosin-beta-4":"TB-500 (Thymosin Beta-4)",
 "hgh-frag-176-191-5mg":"HGH Frag 176-191",
 "igf-lr3-1mg":"IGF-1 LR3",
 "gc-1-sobetirome-100mcg":"GC-1 (Sobetirome)",
 "mk-2866-ostarine":"MK-2866 (Ostarine)", "gw-501516":"GW-501516 (Cardarine)",
 "s4-andarine":"S4 (Andarine)", "mk-777-acetamoren-10mg":"MK-777 (Acetamoren)",
 "atx-304-o-304":"ATX-304 (O-304)", "fladrafinil-crl-40941":"Fladrafinil (CRL-40,941)",
 "ipam-indolepropionamide":"IPAM (Indolepropionamide)",
 "pea-palmitoylethanolamide-400mg":"PEA (Palmitoylethanolamide)",
 "cdp-choline-citicoline-500mg":"CDP-Choline (Citicoline)",
 "9-me-bc-9-methyl-%ce%b2-carboline-15mg":"9-Me-BC (9-Methyl-β-Carboline)",
 "vip-vasoactive-intestinal-peptide":"VIP (Vasoactive Intestinal Peptide)",
 "sr-9009-oil-50mg-ml-10ml":"SR-9009 Oil 50mg/ml",
 "l-thp":"L-THP (Levo-tetrahydropalmatine)",
 "dada":"DADA (Diisopropylamine Dichloroacetate)",
 "itpp":"ITPP (Myo-inositol trispyrophosphate)",
 "bpap":"BPAP (Benzofuranylpropylaminopentane)",
 "5-ru-58841":"5% RU-58841 (Topical)",
 "lipo-c-b12":"Lipo-C + B12",
 "pure-potion":"Pure Potion (GHK-Cu / NAD+)",
 "cjc-1295-no-dac-ipamorelin":"CJC-1295 No DAC / Ipamorelin",
 "cjc-1295-no-dac-2mg":"CJC-1295 (No DAC)", "cjc-1295-dac-5mg":"CJC-1295 (with DAC)",
 "hexarelin-cjc-1295-no-dac":"Hexarelin / CJC-1295 No DAC",
 "tesamorelin-ipamorelin-blend-8mg-2mg":"Tesamorelin / Ipamorelin Blend",
 "semax-selank":"Semax / Selank", "melts-pro-selank-semax":"Melts Pro - Selank + Semax",
 "acetic-acid-0-6-solution-10ml":"Acetic Acid 0.6% Solution",
 "phosphate-buffered-saline":"Phosphate Buffered Saline",
 "slu-pp-332":"SLU-PP-332", "slu-pp-915":"SLU-PP-915 (Pan-ERR Agonist)",
 "p-21":"P-21", "pe-22-28-10mg":"PE-22-28", "ace-167":"ACE-167", "gb-115":"GB-115",
 "j-147":"J-147", "cms-121":"CMS-121", "tak-653":"TAK-653", "prl-8-53":"PRL-8-53",
 "bam15":"BAM15", "ac-262":"AC-262", "yk-11":"YK-11", "rad-140":"RAD-140",
 "rad-150":"RAD-150", "lgd-4033":"LGD-4033", "lgd-3033-10mg":"LGD-3033",
 "mk-677":"MK-677 (Ibutamoren)", "gw-0742-20mg-ml":"GW-0742",
 "nsi-189-phosphate-20mg":"NSI-189 Phosphate",
 "phenylpiracetam-hydrazide-150mg":"Phenylpiracetam Hydrazide",
 "s-acetyl-glutathione-200mg":"S-Acetyl Glutathione",
 "magnesium-l-threonate":"Magnesium L-Threonate",
 "alpha-gpc-400mg":"Alpha-GPC", "nad-20ml":"NAD+ (20ml)",
 "thymogen-thymagen":"Thymogen (Thymagen)",
 "aod-9604-5mg":"AOD-9604", "ara-290-10mg":"ARA-290", "ll-37-5mg":"LL-37",
 "pt-141-10mg":"PT-141", "kisspeptin-10-10mg":"Kisspeptin-10",
 "melanotan-2-10mg":"Melanotan 2", "dsip-5mg":"DSIP", "kpv":"KPV", "mots-c":"MOTS-c",
 "ghk-cu":"GHK-Cu", "glutathione":"Glutathione", "tesamorelin":"Tesamorelin",
 "epithalon":"Epithalon", "mazdutide":"Mazdutide", "enclomiphene":"Enclomiphene",
 "bromantane":"Bromantane", "sunifiram":"Sunifiram (DM-235)", "seltorexant":"Seltorexant",
 "reconstitution-solution":"Reconstitution Solution",
 "thymosin-alpha-1":"Thymosin Alpha-1", "5-amino-1mq":"5-Amino-1MQ",
 "methylene-blue":"Methylene Blue", "tesofensine-powder":"Tesofensine Powder",
 "aminotadalafil":"Aminotadalafil", "nortadalafil":"Nortadalafil",
 "emoxypine-succinate":"Emoxypine Succinate", "nooglutyl":"Nooglutyl",
 "arimistane-25mg":"Arimistane", "aicar-50mg":"AICAR", "compound-7p":"Compound 7P",
 "carnitinearginine-based-amino-blend-20ml":"Carnitine / Arginine Amino Blend",
 "carnosinecarnitine-based-amino-blend-20ml":"Carnosine / Carnitine Amino Blend",
 "carnitine-choline-based-amino-blend-20ml":"Carnitine / Choline Amino Blend",
 "nad-carnitine-based-amino-blend-20ml":"NAD+ / Carnitine Amino Blend",
 "atp-amp-nalt-based-amino-blend-20ml":"ATP / AMP / NALT Amino Blend",
 "l-arginine-based-amino-blend-20ml":"L-Arginine Amino Blend",
 "l-citrulline-based-amino-blend-20ml":"L-Citrulline Amino Blend",
 "bcaa-based-amino-blend-20ml":"BCAA Amino Blend",
 "msm-based-amino-blend-20ml":"MSM Amino Blend",
 "melatonin-based-amino-blend-20ml":"Melatonin Amino Blend",
 "dmaa-50mg-ml":"DMAA 50mg/ml", "coq10-20ml":"CoQ10", "l-carnitine-20ml":"L-Carnitine",
 "vitamin-b12-20ml":"Vitamin B12", "oxytocin-5mg":"Oxytocin",
 "cagrisema-sodium-10mg":"CagriSema Sodium", "cagrilintide-10mg":"Cagrilintide",
}

# goal tag  ->  ordered keyword matchers (first hit wins)
RULES = [
 ("glp1",  r"ma-1s|ma-2tz|ma-3rt|gla-?1|gla-?2|gla-?3|semaglutid|tirzepatid|retatrutid|mazdutid|survodutid|cagrisema|cagrilintide|petrelintide|maritide|orforg"),
 ("fat",   r"peel'?d|lipo-c|tesofensin|5-amino-1mq|aod-?9604|hgh-frag|slu-pp|bam15|gc-1|sobetirome|dmaa|atx-304|aicar|lipo|dada|mots-?c"),
 ("gh",    r"ace-167|cjc-?1295|ipamorelin|sermorelin|tesamorelin|hexarelin|mk-?677|mk-?777|igf|follistatin|peg-?mgf|ghrp"),
 ("heal",  r"phoenix|compound 7p|compound-7p|bpc|tb-?500|wolverine|klow|glow|pentadecapept|arginate|cartalax|ara-?290|pea\b|palmitoyleth"),
 ("immune",r"\bvip\b|vasoactive|kpv|ll-?37|thymosin|thymogen|thymalin|glutathion|vilon"),
 ("sex",   r"pt-?141|kisspeptin|oxytocin|melanotan|tadalafil|enclomiphene|testagen|prostamax|ovagen"),
 ("cog",   r"semax|selank|noopept|piracetam|racetam|dihexa|p-21|pe-22|nsi-189|bromantane|fladrafinil|sunifiram|alpha-gpc|cdp-choline|magnesium-l-thre|phenibut|9-me-bc|prl-8|j-147|cms-121|tak-653|gb-115|nooglutyl|bpap|l-thp|ipam|adamax|adalank|neuro|emoxypine|methylene-?\s?blue|methylenebl|dmae"),
 ("sleep", r"noctira|dsip|melatonin|sleep|seltorexant"),
 ("long",  r"epithalon|epitalon|nad|foxo4|ss-?31|s-31|mots|pinealon|cardiogen|chonluten|livagen|bronchogen|vesugen|bioregul|mito|coq10|itpp"),
 ("skin",  r"ghk|ahk|snap-8|acetyl-hexapept|ru-?58841|brightening|serum|tallow"),
 ("sarm",  r"rad-?1[45]0|lgd|ostarine|mk-?2866|yk-?11|s4|andarine|ac-?262|gw-?50|gw-?07|cardarine|sr-?9009|arimistane"),
 ("supply",r"\bpbs\b|sprayer|atomizing|reconstitution|acetic-acid|phosphate-buffered|bacteriostatic|vial|case|water|syringe"),
 ("amino", r"^b-12$|pumptira|charg|hsn blend|amino blend|l-carnitine|carnitine|carnosine|citrulline|arginine|\bmsm\b|\bbcaa\b|atp-amp|vitamin b12|\bb12\b|super blend|coq10"),
]
LABELS = {"glp1":"GLP-1s","fat":"Fat loss","gh":"Growth hormone","heal":"Healing & recovery",
 "immune":"Immune","sex":"Sexual & hormonal","cog":"Cognitive","sleep":"Sleep","long":"Longevity",
 "skin":"Skin & hair","sarm":"SARMs & research chems","supply":"Supplies","amino":"Amino blends & support","other":"Other"}

SMALL = {"and","or","of","with","no"}
ACRO = re.compile(r"^(bpc|tb|ghk|kpv|nad|dsip|vip|igf|cjc|aod|hgh|pt|ll|ss|mots|glp|dmaa|coq|msm|bcaa|atp|amp|nalt|pea|cdp|rad|lgd|yk|ac|gw|sr|mk|slu|itpp|bpap|ipam|prl|cms|tak|gb|nsi|ma|gla|pbs)$", re.I)

def pretty(slug):
    if slug in OVER: return OVER[slug]
    s = re.sub(r"-(\d+mg|\d+mcg|\d+ml|\d+(\.\d+)?mg-ml)$", "", slug)
    s = s.replace("-based-amino-blend", " Based Amino Blend").replace("-", " ")
    words = []
    for w in s.split():
        if ACRO.match(w): words.append(w.upper())
        elif w.lower() in SMALL and words: words.append(w.lower())
        else: words.append(w[:1].upper()+w[1:])
    return " ".join(words)

def tag(name, slug, fmt=""):
    hay = (slug + " " + name + " " + fmt).lower()
    for t, pat in RULES:
        if re.search(pat, hay): return t
    return "other"

def build(vendor, rows, go):
    items = []
    for name, slug, fmt in rows:
        items.append({"n": name, "s": slug, "g": tag(name, slug, fmt),
                      "u": "/go/%s/%s" % (go, slug), **({"f": fmt} if fmt else {})})
    items.sort(key=lambda x: x["n"].lower())
    return items

modern_rows = []
for line in open(os.path.join(HERE,"modern.slugs")):
    slug = line.strip()
    if slug: modern_rows.append((pretty(slug), slug, ""))

def read_tsv(fn):
    rows = []
    for line in open(os.path.join(HERE, fn)):
        if not line.strip(): continue
        p = line.rstrip("\n").split("\t")
        rows.append((p[1], p[0], p[2] if len(p) > 2 else ""))
    return rows

glacier_rows = read_tsv("glacier.tsv")
peptira_rows = read_tsv("peptira.tsv")

today = datetime.date.today().isoformat()
OUT = os.path.join(HERE, "..")
for vendor, rows, go, label, home in [
    ("modern", modern_rows, "modern", "Modern Aminos", "/go/modern"),
    ("glacier", glacier_rows, "glacier", "Glacier Aminos", "/go/glacier"),
    ("peptira", peptira_rows, "peptira", "Peptira", "/go/peptira"),
]:
    items = build(vendor, rows, go)
    counts = {}
    for i in items: counts[i["g"]] = counts.get(i["g"], 0) + 1
    data = {"vendor": label, "slug": vendor, "home": home, "code": "DPRO",
            "verified": today, "labels": LABELS, "counts": counts, "items": items}
    with open(os.path.join(OUT, "data-%s.json" % vendor), "w") as f:
        json.dump(data, f, separators=(",", ":"))
    print("%-9s %3d items  %s" % (label, len(items),
          " ".join("%s:%d" % (k, v) for k, v in sorted(counts.items(), key=lambda x: -x[1]))))
