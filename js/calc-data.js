/* DPRO Health — peptide calculator presets.
   Presets fill in what's IN the vial or bottle only. They never suggest a dose.
   Compound names match /compare/data.json so the cycle planner can price them.
   "p" = cheat sheet slug under /peptides/, "s" = vial sizes (mg) our vendors sell. */
window.DPRO_CALC_DATA = {
  compounds: [{"n":"BPC-157","p":"bpc157","s":[5,10,20]},{"n":"TB-500","p":"tb500","s":[5,10]},{"n":"ARA-290","p":"ara290","s":[10,30]},{"n":"Cartalax","p":"bioregulators","s":[20]},{"n":"KPV","p":"kpv","s":[10]},{"n":"Thymosin Alpha-1","p":"thymosin-alpha1","s":[10]},{"n":"VIP","p":"vip","s":[10]},{"n":"LL-37","p":"ll37","s":[5]},{"n":"Glutathione","p":null,"s":[600,1500]},{"n":"Thymagen","p":"bioregulators","s":[20]},{"n":"Vilon","p":"bioregulators","s":[20]},{"n":"Tesamorelin","p":"tesamorelin","s":[10,20,30]},{"n":"Ipamorelin","p":"ipamorelin","s":[10]},{"n":"CJC-1295 (no DAC)","p":"cjc1295","s":[2,10]},{"n":"CJC-1295 (with DAC)","p":"cjc1295","s":[5]},{"n":"Sermorelin","p":null,"s":[5,10]},{"n":"IGF-1 LR3","p":"igf1-lr3","s":[1]},{"n":"AOD-9604","p":"aod9604","s":[5,10]},{"n":"5-Amino-1MQ (vial)","p":"5-amino-1mq","s":[10,50]},{"n":"MOTS-c","p":"mots-c","s":[10,20,40]},{"n":"AICAR","p":null,"s":[50]},{"n":"PT-141","p":"pt141","s":[10]},{"n":"Kisspeptin","p":"kisspeptin","s":[10]},{"n":"Oxytocin","p":"oxytocin","s":[2,5,10]},{"n":"Melanotan 2","p":null,"s":[10]},{"n":"Melanotan 1","p":"melanotan1","s":[10]},{"n":"Testagen","p":"bioregulators","s":[20]},{"n":"Semax","p":"semax","s":[10]},{"n":"Selank","p":"selank","s":[10]},{"n":"PE-22-28","p":null,"s":[10]},{"n":"DSIP","p":"dsip","s":[5,10]},{"n":"Epithalon","p":"epitalon","s":[10,50]},{"n":"NAD+","p":"nad","s":[500,1000]},{"n":"SS-31","p":"ss31","s":[10,50]},{"n":"FOXO4-DRI","p":"foxo4-dri","s":[10]},{"n":"Pinealon","p":"bioregulators","s":[10,20]},{"n":"GHK-Cu","p":"ghk-cu","s":[50,100]},{"n":"Survodutide","p":null,"s":[10]},{"n":"Retatrutide","p":"retatrutide","s":[5,10,12,20,30,60]},{"n":"Tirzepatide","p":"tirzepatide","s":[5,10,20,30,40,60]},{"n":"Semaglutide","p":"semaglutide","s":[5,10,15,20]},{"n":"Cagrilintide","p":"cagrilintide","s":[5,10]},{"n":"Follistatin 344","p":"follistatin344","s":[1]},{"n":"Thymalin","p":"thymalin","s":[10]}],

  /* Known blends. "cmp" = name in /compare/data.json, parts in mg per vial. */
  blends: [
    {id:'bpctb5',  n:'BPC-157 / TB-500 · 5/5 (10 mg)',   cmp:'BPC-157 / TB-500 blend', p:'blend-bpc-tb500', parts:[['BPC-157',5],['TB-500',5]]},
    {id:'bpctb10', n:'BPC-157 / TB-500 · 10/10 (20 mg)', cmp:'BPC-157 / TB-500 blend', p:'blend-bpc-tb500', parts:[['BPC-157',10],['TB-500',10]]},
    {id:'glow',    n:'GLOW · 70 mg',  cmp:'GLOW', p:'blend-glow', parts:[['GHK-Cu',50],['BPC-157',10],['TB-500',10]]},
    {id:'klow',    n:'KLOW · 80 mg',  cmp:'KLOW', p:'blend-klow', parts:[['GHK-Cu',50],['BPC-157',10],['TB-500',10],['KPV',10]]},
    {id:'cjcipa5', n:'CJC-1295 / Ipamorelin · 5/5 (10 mg)',   cmp:'CJC-1295 / Ipamorelin blend', p:'blend-ipa-cjc', parts:[['CJC-1295 (no DAC)',5],['Ipamorelin',5]]},
    {id:'cjcipa10',n:'CJC-1295 / Ipamorelin · 10/10 (20 mg)', cmp:'CJC-1295 / Ipamorelin blend', p:'blend-ipa-cjc', parts:[['CJC-1295 (no DAC)',10],['Ipamorelin',10]]},
    {id:'tesaipa8',n:'Tesamorelin / Ipamorelin · 8/2 (10 mg)',  cmp:'Tesamorelin / Ipamorelin blend', p:'blend-tesa-ipa', parts:[['Tesamorelin',8],['Ipamorelin',2]]},
    {id:'tesaipa13',n:'Tesamorelin / Ipamorelin · 13/3 (16 mg)', cmp:'Tesamorelin / Ipamorelin blend', p:'blend-tesa-ipa', parts:[['Tesamorelin',13],['Ipamorelin',3]]},
    {id:'semsel',  n:'Semax / Selank · 10/10 (20 mg)', cmp:'Semax / Selank blend', p:null, parts:[['Semax',10],['Selank',10]]}
  ],

  /* Premixed liquids, concentration in mg/mL. Labels vary — always check yours. */
  liquids: [
    {id:'lcar',  n:'L-Carnitine 500 mg/mL', parts:[['L-Carnitine',500]]},
    {id:'mb12',  n:'Methylcobalamin B12 1 mg/mL', parts:[['Methylcobalamin',1]]},
    {id:'cb12',  n:'Cyanocobalamin B12 1 mg/mL', parts:[['Cyanocobalamin',1]]},
    {id:'nad',   n:'NAD+ 100 mg/mL', parts:[['NAD+',100]]},
    {id:'glut',  n:'Glutathione 200 mg/mL', parts:[['Glutathione',200]]},
    {id:'lipoc', n:'Lipo-C (example blend)', parts:[['Methionine',25],['Inositol',50],['Choline',50],['L-Carnitine',50],['Cyanocobalamin',1]]}
  ]
};
