#!/usr/bin/env python3
"""DPRO Health — price comparison builder.

Reads the three raw price captures in compare/data/ and writes compare/data.json.
Refresh = replace the raw files, then:   python3 compare/data/build.py

Raw files (one per vendor):
  modern.tsv    slug <TAB> variant <TAB> price_cents <TAB> in_stock          (Modern sells single vials only)
  glacier.tsv   slug <TAB> name <TAB> category <TAB> attr <TAB> price_cents <TAB> regular_cents <TAB> in_stock
                (10-packs are their own listings: "<slug>-10-pack")
  peptira.json  {"products":[{"slug":..,"v":[[sku, amount, unit, stock, [[qty, cents],...]],...]}]}

The MAP below says which listing is which compound and how many mg is in the vial.
Every link goes through /go/<vendor>/<slug>, so the affiliate ref is applied by _redirects.
"""
import json, os, datetime, sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "data.json")

# ---------- load raw ----------
def load_modern():
    d = {}
    for line in open(os.path.join(HERE, "modern.tsv"), encoding="utf-8"):
        if line.startswith("#") or not line.strip(): continue
        slug, var, cents, stock = line.rstrip("\n").split("\t")
        d[(slug, var)] = (int(cents), stock == "1")
    return d

def load_glacier():
    d = {}
    for line in open(os.path.join(HERE, "glacier.tsv"), encoding="utf-8"):
        if line.startswith("#") or not line.strip(): continue
        p = line.rstrip("\n").split("\t")
        d[(p[0], p[3])] = (int(p[4]), p[6] == "1")
    return d

def load_peptira():
    d = {}
    for prod in json.load(open(os.path.join(HERE, "peptira.json"), encoding="utf-8"))["products"]:
        for sku, amt, unit, stock, packs in prod["v"]:
            pk = dict((q, c) for q, c in packs)
            d[(prod["slug"], sku)] = (pk.get(1), pk.get(10), stock != "out")
    return d

MOD, GLA, PEP = load_modern(), load_glacier(), load_peptira()

# ---------- compound map ----------
# M(slug, variant, mg)   G(slug, attr, mg, kit_slug)   P(slug, sku, mg)
def M(s, v, mg): return ("modern", s, v, mg, None)
def G(s, a, mg, kit=None): return ("glacier", s, a, mg, kit)
def P(s, k, mg): return ("peptira", s, k, mg, None)

# group tags match the catalog filter chips
MAP = [
 # ---- Healing & recovery
 ("BPC-157", "heal", False, "", [
   M("pentadecapeptide","5mg-lyophilized",5), M("pentadecapeptide","10mg-lyophilized",10),
   G("bpc-157","Size=10mg",10,"bpc-157-size-10mg-10-pack"), G("bpc-157","Size=20mg",20,"bpc-157-size-20mg-10-pack"),
   P("bpc-157-2","BPC157-10",10)]),
 ("TB-500", "heal", False, "", [
   M("tb-500-thymosin-beta-4","5MG",5), M("tb-500-thymosin-beta-4","10MG",10),
   G("tb500","",10,"tb-500-10mg-10-pack"), P("tb-500-2","TB500-10",10)]),
 ("BPC-157 / TB-500 blend", "heal", False, "Modern's 5/5 and 10/10. Glacier and Peptira call theirs Wolverine.", [
   M("bpc-157tb-500-blend","5MG/5MG (Lyophilized)",10), M("bpc-157tb-500-blend","10MG/10MG (Lyophilized)",20),
   G("bpc-tb-500-wolverine","SIZE=10MG",10,"bpc-tb-500-wolverine-size-10mg-10-pack"),
   G("bpc-tb-500-wolverine","SIZE=20MG",20,"bpc-tb-500-wolverine-size-20mg-10-pack"),
   P("tb-bp-blend-wolverine","WOLV-10",10)]),
 ("GLOW", "heal", False, "GHK-Cu 50 / BPC-157 10 / TB-500 10.", [
   M("glow-blend","",70), G("glow","",70,"glow-70mg-10-pack"), P("glow","GLOW-70",70)]),
 ("KLOW", "heal", False, "Modern doesn't list the vial size, so it isn't ranked.", [
   M("klow-ghk-cu-tb-500-bpc-157-kpv","",None), G("klow-80","",80,"klow-80mg-10-pack"), P("klow-2","KLOW-80",80)]),
 ("ARA-290", "heal", False, "", [
   M("ara-290-10mg","",10), G("ara-29010","",10,"ara-290-10mg-10-pack"),
   P("ara-290-2","ARA290-5",10), P("ara-290-2","ARA290-30",30)]),
 ("Cartalax", "heal", False, "", [
   M("cartalax-20mg","",20), G("cartalax-20","",20,"cartalax-20mg-10-pack"), P("cartalax","CARTA-20",20)]),
 # ---- Immune
 ("KPV", "immune", False, "", [
   M("kpv","10MG Lyophilized",10), G("kpv","",10,"kpv-10mg-10-pack"), P("kpv-2","KPV-10",10)]),
 ("Thymosin Alpha-1", "immune", False, "", [
   M("thymosin-alpha-1","10MG",10), G("thymosin-alpha-1","",10,"thymosin-alpha-1-10mg-10-pack"), P("ta-1-10mg","TA1-10",10)]),
 ("VIP", "immune", False, "", [
   M("vip-vasoactive-intestinal-peptide","",10), G("vip-10","",10,"vip-10mg-10-pack"), P("vip-2","VIP-10",10)]),
 ("LL-37", "immune", False, "", [
   M("ll-37-5mg","",5), G("ll37","",5,"ll-37-5mg-10-pack"), P("ll37-5","LL37-5",5)]),
 ("Glutathione", "immune", False, "Modern's vial is 600mg; the others are 1500mg.", [
   M("glutathione","600mg-lyophilized",600), G("glutathione-1500mg","",1500,"glutathione-1500mg-10-pack"),
   P("glutathione-2","GLUTA-1500",1500)]),
 ("Thymagen", "immune", False, "", [M("thymogen-thymagen","",20), P("thymagen","TGEN-20",20)]),
 ("Vilon", "immune", False, "", [M("vilon-20mg","",20), P("vilon","VIL-20",20)]),
 # ---- Growth hormone
 ("Tesamorelin", "gh", False, "", [
   M("tesamorelin","",10), G("tesamorelin","SIZE=10MG",10,"tesamorelin-size-10mg-10-pack"),
   G("tesamorelin","SIZE=20MG",20,"tesamorelin-size-20mg-10-pack"),
   P("tesamorelin-2","TESA-10",10), P("tesamorelin-2","TESA-30",30)]),
 ("Ipamorelin", "gh", False, "", [
   M("ipamorelin-10mg","",10), G("ipamorelin-10mg","",10,"ipamorelin-10mg-10-pack"), P("ipamorelin-2","IPA-10",10)]),
 ("CJC-1295 (no DAC)", "gh", False, "", [
   M("cjc-1295-no-dac-2mg","",2), G("cjc-1295-w-o-dac-10mg","",10,"cjc-1295-w-o-dac-10mg-10-pack"),
   P("cjc-1295-nodac","CJCND-10",10)]),
 ("CJC-1295 (with DAC)", "gh", False, "", [
   M("cjc-1295-dac-5mg","",5), G("cjc-1295-w-dac-5mg","",5,"cjc-1295-w-dac-5mg-10-pack"), P("cjc-1295-dac-2","CJCD-5",5)]),
 ("CJC-1295 / Ipamorelin blend", "gh", False, "", [
   M("cjc-1295-no-dac-ipamorelin","5MG/5MG",10), M("cjc-1295-no-dac-ipamorelin","10MG/10MG",20),
   G("cjc-1295-no-dac-ipa-blend","",10,"cjc-1295-no-dac-ipa-blend-10mg-10-pack"), P("ipa-cjc-blend-2","IPACJC-10",10)]),
 ("Tesamorelin / Ipamorelin blend", "gh", False, "Different ratios: Modern 8/2, Glacier 13/3.", [
   M("tesamorelin-ipamorelin-blend-8mg-2mg","",10),
   G("tesa-ipa-peptide-blend-13mg-3mg","",16,"tesa-ipa-peptide-blend-13mg-3mg-10-pack")]),
 ("Sermorelin", "gh", False, "", [
   M("sermorelin-5mg","5MG",5), M("sermorelin-5mg","10MG",10),
   G("sermorelin","",10,"sermorelin-10mg-10-pack"), P("sermorelin-2","SERM-10",10)]),
 ("IGF-1 LR3", "gh", False, "", [
   M("igf-lr3-1mg","",1), G("igf","",1,"igf-1-lr3-1mg-10-pack"), P("igf1-lr3-2","IGF1-1",1)]),
 # ---- Fat loss
 ("AOD-9604", "fat", False, "", [
   M("aod-9604-5mg","",5), G("aod-9604-10","",10,"aod-9604-10mg-10-pack"), P("aod-9604-2","AOD9604-5",5)]),
 ("5-Amino-1MQ (vial)", "fat", False, "Lyophilized vials only. Capsules and tablets aren't compared.", [
   M("5-amino-1mq","10MG (Lyophilized)",10), M("5-amino-1mq","50MG (Lyophilized)",50),
   G("5-amino-1mq","SIZE=10MG",10,"5-amino-1mq-size-10mg-10-pack"), G("5-amino-1mq","SIZE=50MG",50,"5-amino-1mq-size-50mg-10-pack"),
   P("5-amino-1mq-2","5AM1-50",50)]),
 ("MOTS-c", "fat", False, "", [
   M("mots-c","10MG",10), M("mots-c","40MG",40),
   G("mots-c","Size=10mg",10,"mots-c-size-10mg-10-pack"), G("mots-c","Size=20mg",20,"mots-c-size-20mg-10-pack"),
   P("mots-c-2","MOTS-10",10), P("mots-c-2","MOTS-40",40)]),
 ("AICAR", "fat", False, "", [M("aicar-50mg","",50), P("aicar-2","AICAR-50",50)]),
 # ---- Sexual & hormonal
 ("PT-141", "sex", False, "", [
   M("pt-141-10mg","",10), G("pt-141","",10,"pt-141-10mg-10-pack"), P("pt-141-2","PT141-10",10)]),
 ("Kisspeptin", "sex", False, "", [
   M("kisspeptin-10-10mg","",10), G("kisspeptin","",10,"kisspeptin-10mg-10-pack"), P("kisspeptin-2","KISS-10",10)]),
 ("Oxytocin", "sex", False, "", [
   M("oxytocin-5mg","5MG",5), M("oxytocin-5mg","10MG",10),
   G("ox10","",10,"oxytocin-10mg-10-pack"), P("oxytocin-2","OXY-2",2)]),
 ("Melanotan 2", "sex", False, "", [
   M("melanotan-2-10mg","",10), G("mt-2","",10,"melanotan-2-10mg-10-pack"), P("melanotan-2-2","MT2-10",10)]),
 ("Melanotan 1", "sex", False, "", [G("mt1","",10,"melanotan-1-10mg-10-pack"), P("melanotan-1-2","MT1-10",10)]),
 ("Testagen", "sex", False, "", [M("testagen-20mg","",20), G("testagen","",20,"testagen-20mg-10-pack")]),
 # ---- Cognitive / sleep
 ("Semax", "cog", False, "", [
   M("semax-10mg","Semax 10MG",10), G("s3max-10","",10,"semax-10mg-10-pack"), P("semax-2","SMX-10",10)]),
 ("Selank", "cog", False, "", [
   M("selank-10mg","",10), G("selank-10","",10,"selank-10mg-10-pack"), P("selank-2","SLNK-10",10)]),
 ("Semax / Selank blend", "cog", False, "", [
   M("semax-selank","",20), G("semaxselank","",20,"semax-selank-blend-20mg-10-pack")]),
 ("PE-22-28", "cog", False, "", [M("pe-22-28-10mg","",10), P("pe-22-28-2","PE2228-10",10)]),
 ("DSIP", "sleep", False, "", [
   M("dsip-5mg","",5), G("dsip-10","",10,"dsip-10mg-10-pack"), P("dsip-2","DSIP-10",10)]),
 # ---- Longevity
 ("Epithalon", "long", False, "", [
   M("epithalon","Epithalon 10MG",10), M("epithalon","Epithalon 50MG",50),
   G("epi10","",10,"epithalon-10mg-10-pack"), P("epitalon-2","EPIT-10",10)]),
 ("NAD+ (vial)", "long", False, "", [
   M("nad-20ml","500MG (Lyophilized)",500), G("nad-500mg-buffered","",500,"nad-500mg-buffered-10-pack"),
   P("nad-2","NAD-500",500), P("nad-2","NAD-1000",1000)]),
 ("SS-31", "long", False, "Glacier lists it as S-31-S.", [
   G("s-31-s-10","",10,"s-31-s-10mg-10-pack"), P("ss-31-5","SS31-10",10), P("ss-31-5","SS31-50",50)]),
 ("FOXO4-DRI", "long", False, "", [G("foxo4-dri","",10,"foxo4-dri-10mg-10-pack"), P("fox04-dri-2","FOX-10",10)]),
 ("Pinealon", "long", False, "", [M("pinealon-20mg","",20), G("pn10","",10,"pinealon-10mg-10-pack")]),
 # ---- Skin
 ("GHK-Cu", "skin", False, "", [
   M("ghk-cu","50MG",50), M("ghk-cu","100MG",100),
   G("ghk-cu","SIZE=50mg",50,"ghk-cu-size-50mg-10-pack"), G("ghk-cu","SIZE=100mg",100,"ghk-cu-size-100mg-10-pack"),
   P("ghk-cu-2","GHK50-1",50), P("ghk-cu-2","GHK100-1",100)]),
 # ---- GLP-1s (named)
 ("Survodutide", "glp1", False, "", [G("survodutide","",10,"survodutide-10mg-10-pack"), P("survo","SURVO-10",10)]),
 # ---- GLP-1s (coded) — matched by likely compound, not vendor-confirmed
 ("Retatrutide", "glp1", True, "MA-3RT · GLA-3 RT · RETA-3", [
   M("ma-3rt","5MG",5), M("ma-3rt","10MG",10), M("ma-3rt","12MG",12), M("ma-3rt","20MG",20), M("ma-3rt","30MG",30), M("ma-3rt","60MG",60),
   G("gla3-rt","Size=10mg",10,"gla-3-rt-size-10mg-10-pack"), G("gla3-rt","Size=20mg",20,"gla-3-rt-size-20mg-10-pack"),
   G("gla3-rt","Size=30mg",30,"gla-3-rt-size-30mg-10-pack"), G("gla3-rt","Size=60mg",60,"gla-3-rt-size-60mg-10-pack"),
   P("reta3-9","RETA3-10",10), P("reta3-9","RETA3-20",20), P("reta3-9","RETA3-30",30)]),
 ("Tirzepatide", "glp1", True, "MA-2TZ · GLA-2 TRZ · TIRZ-2", [
   M("ma-2tz","5MG",5), M("ma-2tz","10MG",10), M("ma-2tz","20MG",20), M("ma-2tz","40MG",40),
   G("gla2-trz","Size=10mg",10,"gla-2-trz-size-10mg-10-pack"), G("gla2-trz","Size=20mg",20,"gla-2-trz-size-20mg-10-pack"),
   G("gla2-trz","Size=30mg",30,"gla-2-trz-size-30mg-10-pack"), G("gla2-trz","Size=60mg",60,"gla-2-trz-size-60mg-10-pack"),
   P("tirz2-13","TIRZ2-10",10), P("tirz2-13","TIRZ2-20",20), P("tirz2-13","TIRZ2-30",30), P("tirz2-13","TIRZ2-60",60)]),
 ("Semaglutide", "glp1", True, "MA-1S · GLA-1 SM · SEMA-1", [
   M("ma-1s","5MG",5), M("ma-1s","10MG",10), G("gla1-s","",15,"gla-1-sm-15mg-10-pack"),
   P("sma-2","SEMA1-10",10), P("sma-2","SEMA1-20",20)]),
 ("Cagrilintide", "glp1", True, "Peptira's is coded CAG-4", [
   M("cagrilintide-10mg","",10), G("cagrilintide","SIZE=5MG",5,"cagrilintide-size-5mg-10-pack"),
   G("cagrilintide","SIZE=10MG",10,"cagrilintide-size-10mg-10-pack"), P("cag-4","CAG4-10",10)]),
]

VENDORS = {"modern": "Modern Aminos", "glacier": "Glacier Aminos", "peptira": "Peptira"}

missing, out = [], []
for name, group, coded, note, rows in MAP:
    offers = []
    for v, slug, var, mg, kit in rows:
        if v == "modern":
            hit = MOD.get((slug, var)); single, ten, stock = (hit[0], None, hit[1]) if hit else (None, None, None)
        elif v == "glacier":
            hit = GLA.get((slug, var)); single, stock = (hit if hit else (None, None))
            ten = GLA.get((kit, ""), (None,))[0] if kit else None
            if kit and ten is None: missing.append("%s glacier kit %s" % (name, kit))
        else:
            hit = PEP.get((slug, var)); single, ten, stock = hit if hit else (None, None, None)
        if not hit:
            missing.append("%s %s %s %s" % (name, v, slug, var)); continue
        if not single: continue           # listed but no price (e.g. sold out with no price)
        offers.append({"v": v, "u": "/go/%s/%s" % (v, slug), "mg": mg,
                       "p": single, "k": ten, "s": bool(stock)})
    if len({o["v"] for o in offers}) >= 2:
        out.append({"n": name, "g": group, "c": coded, "note": note, "o": offers})

from zoneinfo import ZoneInfo
data = {"verified": datetime.datetime.now(ZoneInfo("America/Chicago")).date().isoformat(), "code": "DPRO",
        "vendors": VENDORS, "items": out}
json.dump(data, open(OUT, "w"), separators=(",", ":"))
print("%d compounds, %d offers -> %s" % (len(out), sum(len(i["o"]) for i in out), os.path.relpath(OUT)))
if missing:
    print("!! not found in raw data (vendor may have renamed or dropped it):")
    for m in missing: print("   " + m)
    sys.exit(1)
