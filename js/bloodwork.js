/* DPRO Health — Bloodwork Analyzer
   Everything runs in the browser. No upload, no server, no storage.
   Deterministic rules against BW_MARKERS. Educational only — never a diagnosis. */
(function(){
  'use strict';
  var M=window.BW_MARKERS, CATS=window.BW_CATS;
  var byId={}; M.forEach(function(m){byId[m.id]=m;});
  var state={sex:'m', values:{}, source:null, labRanges:{}, units:{}};

  /* ---------- helpers ---------- */
  function $(s,r){return (r||document).querySelector(s);}
  function $$(s,r){return [].slice.call((r||document).querySelectorAll(s));}
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function fmt(n){ if(n==null||isNaN(n)) return '—'; var a=Math.abs(n); return a>=100?String(Math.round(n)):a>=10?n.toFixed(1).replace(/\.0$/,''):n.toFixed(2).replace(/\.?0+$/,''); }
  function rangeFor(m,key){ var r=m[key]; if(!r) return null; var v=(r[state.sex]!==undefined)?r[state.sex]:r.all; return v||null; }
  function normUnit(u){ return String(u||'').replace(/[µμ]/g,'u').replace(/\s+/g,'').toLowerCase(); }

  /* ---------- alias index ---------- */
  var ALIASES=[];
  M.forEach(function(m){ m.aliases.forEach(function(a){
    var pat=a.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s*').replace(/,/g,'\\s*,?\\s*');
    ALIASES.push({m:m,alias:a,re:new RegExp('(^|[^A-Za-z0-9])('+pat+')(?![A-Za-z])','i')});
  });});
  ALIASES.sort(function(a,b){return b.alias.length-a.alias.length;});

  var FLAGS=/^(H|L|HH|LL|A|HIGH|LOW|ABNORMAL|CRITICAL|\*|\(?H\)?|\(?L\)?)$/i;
  var NUM=/^([<>]?)(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?$/;
  var RANGE=/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/;
  var OPENRANGE=/^([<>]=?)\s*(\d+(?:\.\d+)?)$/;

  function parseLine(line){
    var hit=null;
    for(var i=0;i<ALIASES.length;i++){ var x=ALIASES[i].re.exec(line); if(x){ hit={a:ALIASES[i],idx:x.index+x[1].length+x[2].length}; break; } }
    if(!hit) return null;
    var rest=line.slice(hit.idx).replace(/^[\s:=]+/,'');
    if(rest.length>160) return null;                       // prose / footnotes
    var toks=rest.split(/\s+/).filter(Boolean);
    var value=null, qual='', unit=null, lab=null, seen=0;
    for(var t=0;t<toks.length && seen<8;t++){
      var tok=toks[t].replace(/[,;]$/,'');
      if(!tok) continue;
      seen++;
      if(/^0\d$/.test(tok)) continue;                      // LabCorp footnote "01"
      if(FLAGS.test(tok)) continue;
      var nxt=toks[t+1]||'';
      var joined=tok+(nxt?' '+nxt:'');
      if(RANGE.test(tok) || (/^\d+(\.\d+)?$/.test(tok) && /^[-–]$/.test(nxt))) { var r=RANGE.exec(joined); if(r) lab=[+r[1],+r[2]]; if(!/^[-–]$/.test(nxt)) continue; t+=2; continue; }
      var mm=NUM.exec(tok);
      if(mm && value===null){ value=parseFloat((mm[2]+(mm[3]||'')).replace(/,/g,'')); qual=mm[1]||''; continue; }
      if(value!==null){
        var or=OPENRANGE.exec(tok); if(or && !lab){ lab=or[1].indexOf('<')===0?[null,+or[2]]:[+or[2],null]; continue; }
        var r2=RANGE.exec(tok); if(r2 && !lab){ lab=[+r2[1],+r2[2]]; continue; }
        if(!unit && /[a-zA-Zµμ%]/.test(tok) && tok.length<=12) unit=tok;
      }
    }
    if(value===null) return null;
    var m=hit.a.m;
    if(unit && normUnit(unit)==='%' && m.unit!=='%' && !(m.alt&&m.alt['%'])) return null;   // e.g. differential % line vs absolute count
    if(unit && m.unit==='%' && normUnit(unit)!=='%' && /[a-z]/i.test(unit) && !/^%/.test(unit)) return null;
    // unit conversion
    if(unit && m.alt){ var nu=normUnit(unit); Object.keys(m.alt).forEach(function(k){ if(normUnit(k)===nu){ value=value*m.alt[k]; if(lab) lab=lab.map(function(v){return v==null?null:v*m.alt[k];}); unit=m.unit; } }); }
    return {id:m.id,value:value,qual:qual,unit:unit,lab:lab,line:line.trim()};
  }

  function parseText(text){
    var found={}, labs={}, order=[];
    text.split(/\r?\n/).forEach(function(line){
      if(!line.trim()) return;
      var r=parseLine(line);
      if(r && found[r.id]===undefined){ found[r.id]=r.value; if(r.lab) labs[r.id]=r.lab; order.push(r.id); }
    });
    var sx=/\b(?:sex|gender)\s*[:\-]?\s*(male|female|m|f)\b/i.exec(text);
    return {values:found,labs:labs,sex:sx?(sx[1][0].toLowerCase()==='f'?'f':'m'):null,count:order.length};
  }

  /* ---------- computed markers ---------- */
  function addComputed(v){
    if(v.homa_ir==null && v.glucose!=null && v.insulin!=null) v.homa_ir=+(v.glucose*v.insulin/405).toFixed(2);
    if(v.tg_hdl==null && v.tg!=null && v.hdl!=null && v.hdl>0) v.tg_hdl=+(v.tg/v.hdl).toFixed(2);
    if(v.chol_hdl==null && v.chol!=null && v.hdl!=null && v.hdl>0) v.chol_hdl=+(v.chol/v.hdl).toFixed(2);
    if(v.nonhdl==null && v.chol!=null && v.hdl!=null) v.nonhdl=+(v.chol-v.hdl).toFixed(0);
    if(v.bun_cr==null && v.bun!=null && v.creatinine!=null && v.creatinine>0) v.bun_cr=+(v.bun/v.creatinine).toFixed(1);
  }

  /* ---------- scoring ---------- */
  function score(m,v){
    var std=rangeFor(m,'std'), opt=rangeFor(m,'opt');
    if(!std) return {status:'na',label:'No range for this sex'};
    var lo=std[0],hi=std[1];
    if(lo!=null && v<lo) return {status:'low',label:'Below range'};
    if(hi!=null && hi<9999 && v>hi) return {status:'high',label:'Above range'};
    if(!opt) return {status:'ok',label:'In range'};
    var olo=opt[0],ohi=opt[1];
    var inOpt=(olo==null||v>=olo)&&(ohi==null||ohi>=9999||v<=ohi);
    if(inOpt) return {status:'opt',label:'Optimal'};
    if(olo!=null && v<olo) return {status:'ok',label:'In range · below optimal',dir:'low'};
    return {status:'ok',label:'In range · above optimal',dir:'high'};
  }

  /* ---------- bar ---------- */
  function bar(m,v){
    var std=rangeFor(m,'std')||[null,null], opt=rangeFor(m,'opt')||[null,null];
    var vals=[v,std[0],std[1],opt[0],opt[1]].filter(function(x){return x!=null && x<9999;});
    var mn=Math.min.apply(null,vals), mx=Math.max.apply(null,vals);
    if(m.kind!=='range'){ mn=0; }
    var span=(mx-mn)||1; var pad=span*0.25; var a=Math.max(0,mn-pad), b=mx+pad; if(a===b){a=0;b=v*2||1;}
    function pct(x){ return Math.max(0,Math.min(100,(x-a)/(b-a)*100)); }
    var sl=std[0]==null?0:pct(std[0]), sr=(std[1]==null||std[1]>=9999)?100:pct(std[1]);
    var ol=opt[0]==null?sl:pct(opt[0]), orr=(opt[1]==null||opt[1]>=9999)?sr:pct(opt[1]);
    return '<div class="bw-bar"><div class="bw-std" style="left:'+sl+'%;width:'+(sr-sl)+'%"></div><div class="bw-opt" style="left:'+ol+'%;width:'+Math.max(0,orr-ol)+'%"></div><div class="bw-dot" style="left:'+pct(v)+'%"></div></div>';
  }
  function rangeText(r){ if(!r) return '—'; var lo=r[0],hi=r[1]; if(lo==null&&hi==null) return '—'; if(lo==null) return '< '+fmt(hi); if(hi==null||hi>=9999) return '> '+fmt(lo); return fmt(lo)+' – '+fmt(hi); }

  /* ---------- render results ---------- */
  function render(){
    var v=state.values; addComputed(v);
    var ids=Object.keys(v).filter(function(k){return v[k]!=null && byId[k];});
    var out=$('#results'); if(!ids.length){ out.hidden=true; return; }
    var counts={opt:0,ok:0,low:0,high:0};
    var rows={};
    ids.forEach(function(id){ var m=byId[id]; var s=score(m,v[id]); if(counts[s.status]!==undefined) counts[s.status]++; (rows[m.cat]=rows[m.cat]||[]).push({m:m,v:v[id],s:s}); });
    var missing=M.filter(function(m){return v[m.id]==null && !m.computed;});
    var html='<div class="bw-sum">'+
      tile('opt','Optimal',counts.opt)+tile('ok','In range',counts.ok)+tile('low','Low',counts.low)+tile('high','High',counts.high)+
      '<div class="bw-tile na"><div class="n">'+ids.length+'</div><div class="l">markers read</div></div></div>';
    html+='<div class="bw-legend"><span><i class="k std"></i>Standard lab range</span><span><i class="k opt"></i>DPRO optimal</span><span><i class="k dot"></i>Your value</span><span class="sexnote">Ranges shown for: <b>'+(state.sex==='f'?'female':'male')+'</b></span></div>';
    CATS.forEach(function(c){ var list=rows[c[0]]; if(!list) return;
      html+='<section class="bw-cat"><h3>'+esc(c[1])+'</h3>';
      list.forEach(function(r){ var m=r.m,s=r.s;
        var meaning = s.status==='high'||s.dir==='high' ? m.high : (s.status==='low'||s.dir==='low' ? m.low : (m.kind==='lower'?m.low:(m.kind==='higher'?m.high:'')));
        var lab=state.labRanges[m.id];
        html+='<div class="bw-row st-'+s.status+'">'+
          '<div class="bw-head"><div class="bw-name">'+esc(m.name)+(m.computed?'<span class="calc">calculated</span>':'')+'</div>'+
          '<div class="bw-val">'+fmt(r.v)+'<small>'+esc(m.unit)+'</small></div><div class="bw-pill">'+esc(s.label)+'</div></div>'+
          bar(m,r.v)+
          '<div class="bw-ranges"><span>Standard: <b>'+rangeText(rangeFor(m,'std'))+'</b></span><span>Optimal: <b>'+rangeText(rangeFor(m,'opt'))+'</b></span>'+(lab?'<span class="labr">Your lab\'s range: '+rangeText(lab)+'</span>':'')+'</div>'+
          (s.status==='opt'?'':'<div class="bw-mean">'+esc(meaning||'')+'</div>')+
          '<details class="bw-lev"><summary>What moves it</summary><div>'+esc(m.levers)+'</div></details>'+
        '</div>';
      });
      html+='</section>';
    });
    html+='<div class="bw-missing"><h3>Not found on this report <span>'+missing.length+'</span></h3><p>If your report has any of these under a different name, add the value manually below and re-run.</p><div class="bw-miss-list">'+missing.map(function(m){return '<span>'+esc(m.name)+'</span>';}).join('')+'</div></div>';
    out.innerHTML=html; out.hidden=false;
    out.scrollIntoView({behavior:'smooth',block:'start'});
    if(typeof gtag==='function') gtag('event','bloodwork_analyzed',{markers:ids.length,source:state.source||'manual'});
  }
  function tile(k,l,n){ return '<div class="bw-tile '+k+'"><div class="n">'+n+'</div><div class="l">'+l+'</div></div>'; }

  /* ---------- manual form ---------- */
  function buildManual(){
    var host=$('#manual'); var html='';
    CATS.forEach(function(c){ var list=M.filter(function(m){return m.cat===c[0] && !m.computed;}); if(!list.length) return;
      html+='<details class="bw-mcat"><summary>'+esc(c[1])+' <span>'+list.length+'</span></summary><div class="bw-mgrid">'+
        list.map(function(m){ return '<label class="bw-field"><span>'+esc(m.name)+'</span><input type="number" step="any" inputmode="decimal" data-id="'+m.id+'" placeholder="'+esc(m.unit)+'"></label>'; }).join('')+
        '</div></details>';
    });
    host.innerHTML=html;
  }
  function readManual(){ var v={}; $$('#manual input').forEach(function(i){ if(i.value!=='') v[i.dataset.id]=parseFloat(i.value); }); return v; }
  function fillManual(v){ $$('#manual input').forEach(function(i){ i.value = v[i.dataset.id]!=null ? fmt(v[i.dataset.id]) : ''; }); }

  /* ---------- reference library ---------- */
  function buildLibrary(){
    var host=$('#library'); var q=($('#libq').value||'').toLowerCase(); var html='';
    CATS.forEach(function(c){ var list=M.filter(function(m){return m.cat===c[0] && (!q || (m.name+' '+m.aliases.join(' ')).toLowerCase().indexOf(q)>-1);}); if(!list.length) return;
      html+='<section class="bw-cat"><h3>'+esc(c[1])+'</h3><div class="lib-grid">'+list.map(function(m){
        return '<details class="lib-item"><summary><span class="lib-name">'+esc(m.name)+'</span><span class="lib-r"><em>Std</em> '+rangeText(rangeFor(m,'std'))+'</span><span class="lib-r opt"><em>Optimal</em> '+rangeText(rangeFor(m,'opt'))+'</span><span class="lib-u">'+esc(m.unit)+'</span></summary>'+
          '<div class="lib-body"><p><b>High:</b> '+esc(m.high)+'</p><p><b>Low:</b> '+esc(m.low)+'</p><p><b>Levers:</b> '+esc(m.levers)+'</p></div></details>';
      }).join('')+'</div></section>';
    });
    host.innerHTML=html||'<p class="bw-empty">No marker matches that.</p>';
  }

  /* ---------- PDF ---------- */
  function setStatus(msg,kind){ var s=$('#pdfstatus'); s.textContent=msg; s.className='bw-status '+(kind||''); }
  async function extractPdf(file){
    if(!window.pdfjsLib){ setStatus('PDF reader failed to load — paste the text instead.','err'); return null; }
    setStatus('Reading '+file.name+'…');
    var buf=await file.arrayBuffer();
    var doc=await window.pdfjsLib.getDocument({data:buf}).promise;
    var lines=[];
    for(var p=1;p<=doc.numPages;p++){
      var page=await doc.getPage(p); var tc=await page.getTextContent();
      var rows={};
      tc.items.forEach(function(it){ if(!it.str||!it.str.trim()) return; var y=Math.round(it.transform[5]/3)*3; var x=it.transform[4]; (rows[y]=rows[y]||[]).push({x:x,s:it.str}); });
      Object.keys(rows).map(Number).sort(function(a,b){return b-a;}).forEach(function(y){ lines.push(rows[y].sort(function(a,b){return a.x-b.x;}).map(function(i){return i.s;}).join(' ')); });
      lines.push('');
    }
    var text=lines.join('\n');
    if(text.replace(/\s/g,'').length<200){ setStatus('This PDF has no readable text (it\'s probably a scan or photo). Type your values in the manual tab instead.','err'); return null; }
    return text;
  }

  function runText(text,source){
    var r=parseText(text);
    if(!r.count){ setStatus('Couldn\'t find any recognizable markers. Try the manual tab.','err'); return; }
    state.values=r.values; state.labRanges=r.labs; state.source=source;
    if(r.sex){ state.sex=r.sex; syncSex(); }
    fillManual(state.values);
    setStatus('Read '+r.count+' marker'+(r.count===1?'':'s')+'. Check the values in the manual tab if anything looks off.','ok');
    render();
  }

  /* ---------- wiring ---------- */
  function syncSex(){ $$('[data-sex]').forEach(function(b){ b.classList.toggle('active',b.dataset.sex===state.sex); }); }
  function init(){
    buildManual(); buildLibrary(); syncSex();
    $$('[data-sex]').forEach(function(b){ b.addEventListener('click',function(){ state.sex=b.dataset.sex; syncSex(); if(!$('#results').hidden) render(); buildLibrary(); }); });
    $$('.bw-tab').forEach(function(t){ t.addEventListener('click',function(){ $$('.bw-tab').forEach(function(x){x.classList.remove('active')}); t.classList.add('active'); $$('.bw-pane').forEach(function(p){ p.hidden=(p.id!==t.dataset.pane); }); }); });
    var drop=$('#drop'), fi=$('#file');
    ['dragenter','dragover'].forEach(function(e){ drop.addEventListener(e,function(ev){ev.preventDefault();drop.classList.add('over');}); });
    ['dragleave','drop'].forEach(function(e){ drop.addEventListener(e,function(ev){ev.preventDefault();drop.classList.remove('over');}); });
    drop.addEventListener('drop',function(ev){ var f=ev.dataTransfer.files[0]; if(f) handleFile(f); });
    drop.addEventListener('click',function(){ fi.click(); });
    fi.addEventListener('change',function(){ if(fi.files[0]) handleFile(fi.files[0]); fi.value=''; });
    async function handleFile(f){
      if(!/pdf$/i.test(f.name) && f.type!=='application/pdf'){ setStatus('That isn\'t a PDF. Export your results as PDF from the lab portal, or paste the text.','err'); return; }
      try{ var text=await extractPdf(f); if(text) runText(text,'pdf'); }catch(e){ setStatus('Couldn\'t read that PDF ('+(e.message||e)+'). Try pasting the text instead.','err'); }
    }
    $('#pasteRun').addEventListener('click',function(){ var t=$('#paste').value; if(!t.trim()){ setStatus('Paste your results first.','err'); return; } runText(t,'paste'); });
    $('#manualRun').addEventListener('click',function(){ var v=readManual(); if(!Object.keys(v).length){ setStatus('Enter at least one value.','err'); return; } state.values=v; state.labRanges={}; state.source='manual'; setStatus('',''); render(); });
    $('#reset').addEventListener('click',function(){ state.values={}; state.labRanges={}; fillManual({}); $('#paste').value=''; $('#results').hidden=true; setStatus('',''); window.scrollTo({top:0,behavior:'smooth'}); });
    $('#printBtn').addEventListener('click',function(){ window.print(); });
    $('#libq').addEventListener('input',buildLibrary);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
  window.BW={parseText:parseText,score:score,state:state};
})();
