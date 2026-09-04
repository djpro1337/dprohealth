/* DPRO Health — vendor card behaviour (shared by /vendors and the homepage)
   - copy-to-clipboard on .vc-copy buttons
   - GA4 events: copy_code, vendor_click */
(function(){
  function copyText(t){
    if(navigator.clipboard&&window.isSecureContext){return navigator.clipboard.writeText(t);}
    return new Promise(function(res,rej){
      var ta=document.createElement('textarea');ta.value=t;ta.setAttribute('readonly','');ta.style.position='fixed';ta.style.opacity='0';
      document.body.appendChild(ta);ta.select();
      try{document.execCommand('copy');res();}catch(e){rej(e);}finally{document.body.removeChild(ta);}
    });
  }
  document.querySelectorAll('.vc-copy').forEach(function(btn){
    btn.addEventListener('click',function(){
      var code=btn.getAttribute('data-code');
      copyText(code).then(function(){
        btn.textContent='Copied ✓';btn.classList.add('done');
        setTimeout(function(){btn.textContent='Copy';btn.classList.remove('done');},1800);
      }).catch(function(){btn.textContent=code;});
      if(typeof gtag==='function'){gtag('event','copy_code',{vendor:btn.getAttribute('data-vendor'),code:code,page:location.pathname});}
    });
  });
  document.querySelectorAll('a.vc-go').forEach(function(a){
    a.addEventListener('click',function(){
      if(typeof gtag==='function'){gtag('event','vendor_click',{vendor:a.getAttribute('data-vendor'),href:a.getAttribute('href'),page:location.pathname});}
    });
  });
})();
