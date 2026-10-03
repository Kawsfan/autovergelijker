
(function(){
  if(!window._vgl)window._vgl=[];
  if(!window._favs)window._favs=new Set(JSON.parse(localStorage.getItem('_av_favs')||'[]'));

  function toast(msg){
    var t=document.getElementById('_avToast');
    if(!t)return;
    t.textContent=msg;t.style.opacity='1';
    clearTimeout(window._tt);
    window._tt=setTimeout(function(){t.style.opacity='0';},2200);
  }

  // ── FAVORIETEN ──
  window.toggleFav=function(event,id){
    event.stopPropagation();
    var had=_favs.has(id);
    had?_favs.delete(id):_favs.add(id);
    localStorage.setItem('_av_favs',JSON.stringify([..._favs]));
    document.querySelectorAll('[data-fav="'+id+'"]').forEach(function(b){
      b.classList.toggle('fav-actief',!had);
      b.textContent=!had?'♥':'♡';
    });
    toast(had?'🗑️ Verwijderd uit favorieten':'❤️ Opgeslagen als favoriet');
    var c=document.getElementById('navFavCount');
    if(c){c.textContent=_favs.size||'';c.style.display=_favs.size?'inline':'none';}
  };

  window.openFavPanel=function(){
    var panel=document.getElementById('favPanel');
    var overlay=document.getElementById('favOverlay');
    var lijst=document.getElementById('favLijst');
    var teller=document.getElementById('favTeller');
    if(!panel)return;
    var ids=[..._favs];
    if(teller)teller.textContent=ids.length?ids.length+' auto'+(ids.length!==1?"'s":''):'';
    if(!ids.length){
      lijst.innerHTML='<div style="text-align:center;padding:48px 20px;color:#9ca3af"><div style="font-size:48px;margin-bottom:16px">💔</div><p style="font-size:15px;line-height:1.6">Nog geen favorieten opgeslagen.<br>Klik het ♡ icoontje op een auto-kaart.</p></div>';
    } else {
      var autos=window._alleAutos||[];
      lijst.innerHTML=ids.map(function(id){
        var a=autos.find(function(x){return x.id===id;});
        if(!a)return '';
        var p=(a.prijs||0).toLocaleString('nl-NL');
        var s=[a.jaar,a.km!=null?a.km.toLocaleString('nl-NL')+' km':null,a.brandstof].filter(Boolean).join(' · ');
        return '<div onclick="sluitFavPanel();setTimeout(function(){openDetail(\''+id+'\')},200)" style="display:flex;gap:12px;padding:12px;border:1px solid #e8e8e3;border-radius:10px;margin-bottom:10px;cursor:pointer;transition:border-color .15s;align-items:center">'
          +'<img src="'+escHtml(a.imgSrc)+'" alt="'+escHtml(a.titel||'')+'" style="width:80px;height:60px;object-fit:cover;border-radius:6px;flex-shrink:0;background:#f5f5f0" onerror="this.style.display=\'none\'">'
          +'<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:700;color:#1a1a2e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+escHtml(a.titel)+'</div>'
          +'<div style="font-size:16px;font-weight:800;color:#e84c15;margin:2px 0">€ '+p+'</div>'
          +'<div style="font-size:11px;color:#9ca3af">'+s+'</div></div>'
          +'<button data-fav="'+id+'" onclick="event.stopPropagation();toggleFav(event,\''+id+'\');setTimeout(openFavPanel,80)" style="background:none;border:none;font-size:20px;cursor:pointer;color:#ef4444;flex-shrink:0;padding:4px" class="fav-actief">♥</button>'
          +'</div>';
      }).filter(Boolean).join('')||'<p style="color:#9ca3af;text-align:center;padding:32px">Herlaad de pagina om favorieten te laden.</p>';
    }
    panel.style.display='block';overlay.style.display='block';
    document.body.style.overflow='hidden';
    requestAnimationFrame(function(){panel.style.transform='translateX(0)';});
  };

  window.sluitFavPanel=function(){
    var p=document.getElementById('favPanel');var o=document.getElementById('favOverlay');
    if(!p)return;
    p.style.transform='translateX(100%)';o.style.display='none';
    setTimeout(function(){p.style.display='none';},300);
    document.body.style.overflow='';
  };

  // ── VERGELIJKEN ──
  window.toggleVergelijk=function(event,id){
    event.stopPropagation();
    var i=_vgl.indexOf(id);
    if(i>=0){
      _vgl.splice(i,1);
    } else {
      if(_vgl.length>=3){toast('Max. 3 auto’s vergelijken');return;}
      _vgl.push(id);
      toast('✓ Geselecteerd — '+(_vgl.length<2?'selecteer nog 1 auto om te vergelijken':'klik Vergelijk →'));
    }
    updateVglBar();
    document.querySelectorAll('[data-vgl="'+id+'"]').forEach(function(b){b.classList.toggle('vgl-actief',_vgl.indexOf(id)>=0);});
  };

  window.updateVglBar=function(){
    var bar=document.getElementById('vglBar2');
    var slots=document.getElementById('vglSlots2');
    if(!bar||!slots)return;
    if(!_vgl.length){bar.style.display='none';return;}
    bar.style.display='flex';
    var autos=window._alleAutos||[];
    slots.innerHTML=_vgl.map(function(id){
      var a=autos.find(function(x){return x.id===id;});
      var naam=a?escHtml(a.titel.substring(0,22)+(a.titel.length>22?'…':'')):escHtml(id);
      var prijs=a?'€ '+((a.prijs||0).toLocaleString('nl-NL')):'';
      return '<div style="display:flex;align-items:center;gap:6px;background:#f5f5f0;border-radius:8px;padding:6px 10px;min-width:0">'
        +'<div style="min-width:0"><div style="font-weight:700;color:#1a1a2e;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:130px">'+naam+'</div>'
        +'<div style="color:#e84c15;font-weight:700;font-size:12px">'+prijs+'</div></div>'
        +'<button onclick="toggleVergelijk(event,\''+id+'\')" style="background:none;border:none;cursor:pointer;color:#9ca3af;font-size:18px;padding:0;line-height:1;flex-shrink:0">×</button>'
        +'</div>';
    }).join('');
    var gb=document.getElementById('vglGaBtn');
    if(gb)gb.style.opacity=_vgl.length<2?'0.5':'1';
  };

  window.resetVgl2=function(){
    _vgl.length=0;
    document.querySelectorAll('.vgl-actief').forEach(function(el){el.classList.remove('vgl-actief');});
    updateVglBar();
  };

  window.openVglModal=function(){
    if(_vgl.length<2){toast('Selecteer minimaal 2 auto’s');return;}
    var autos=window._alleAutos||[];
    var sel=_vgl.map(function(id){return autos.find(function(x){return x.id===id;});}).filter(Boolean);
    var tabel=document.getElementById('vglTabel2');
    var cw=Math.floor(72/sel.length);
    var rows=[
      {l:'Foto',r:function(a){return '<img src="'+escHtml(a.imgSrc)+'" alt="'+escHtml(a.titel||'')+'" style="width:100%;max-width:150px;height:95px;object-fit:cover;border-radius:8px" onerror="this.style.display=\'none\'">';}},
      {l:'Prijs',r:function(a){return '<span style="font-size:20px;font-weight:800;color:#1a1a2e">€ '+((a.prijs||0).toLocaleString('nl-NL'))+'</span>';}},
      {l:'Bouwjaar',r:function(a){return '<b>'+(a.jaar||'—')+'</b>';}},
      {l:'Km-stand',r:function(a){return '<b>'+(a.km!=null?a.km.toLocaleString('nl-NL')+' km':'—')+'</b>';}},
      {l:'Brandstof',r:function(a){return a.brandstof||'—';}},
      {l:'Transmissie',r:function(a){return a.transmissie||'—';}},
      {l:'Bron',r:function(a){var m={'Marktplaats':'#0063D3','Gaspedaal':'#E87722','AutoScout24':'#FF6600','ViaBovag':'#003082'};var c=m[a.bron]||'#9ca3af';return '<span style="font-weight:700;color:'+c+'">'+(a.bron||'—')+'</span>';}},
      {l:'Dealscore',r:function(a){var s=a.dealScore;if(s==null)return '—';var col=s>60?'#15803d':s<35?'#b91c1c':'#854d0e';var bg=s>60?'#dcfce7':s<35?'#fee2e2':'#fef9c3';var basis=a.dealBasis==='regressie'?' <span style="font-weight:400;color:#9ca3af;font-size:11px">(obv bouwjaar+km)</span>':'';return '<span style="background:'+bg+';color:'+col+';padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700">'+Math.round(s)+' score</span>'+basis;}},
    ];
    tabel.innerHTML='<table style="width:100%;border-collapse:collapse;font-size:14px">'
      +'<thead><tr><th style="width:28%;padding:10px 8px;text-align:left;border-bottom:2px solid #e8e8e3;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.4px">Kenmerk</th>'
      +sel.map(function(a){return '<th style="width:'+cw+'%;padding:10px 8px;text-align:left;border-bottom:2px solid #e84c15;font-size:13px;font-weight:700;color:#1a1a2e">'+escHtml(a.titel.substring(0,35)+(a.titel.length>35?'…':''))+'</th>';}).join('')
      +'</tr></thead><tbody>'
      +rows.map(function(row,ri){
        return '<tr style="'+(ri%2?'background:#fafafa':'')+'">'
          +'<td style="padding:12px 8px;border-bottom:1px solid #f1f2f4;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.3px">'+row.l+'</td>'
          +sel.map(function(a){return '<td style="padding:12px 8px;border-bottom:1px solid #f1f2f4">'+row.r(a)+'</td>';}).join('')
          +'</tr>';
      }).join('')
      +'</tbody></table>'
      +'<div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap">'
      +sel.map(function(a){return '<a href="'+escHtml(a.url?outUrl(a.url,a.bron):'#')+'" target="_blank" data-out data-bron="'+escHtml(a.bron||'')+'" data-merk="'+escHtml(a.merk||'')+'" data-prijs="'+(a.prijs||'')+'" style="flex:1;min-width:140px;padding:12px 16px;background:#e84c15;color:white;border-radius:8px;text-align:center;text-decoration:none;font-weight:700;font-size:14px">Bekijk op '+(a.bron||'bron')+' →</a>';}).join('')
      +'</div>';
    document.getElementById('vglModal2').style.display='block';
    document.body.style.overflow='hidden';
  };

  window.sluitVglModal2=function(){
    document.getElementById('vglModal2').style.display='none';
    document.body.style.overflow='';
  };

  // ── FAV BUTTON IN NAV ──
  function addFavBtn(){
    var acties=document.querySelector('.nav-acties');
    if(!acties||document.getElementById('navFavBtn'))return;
    var btn=document.createElement('button');
    btn.id='navFavBtn';
    btn.className='info-btn';
    btn.onclick=openFavPanel;
    btn.style.cssText='display:flex;align-items:center;gap:5px;';
    btn.innerHTML='❤️<span class="nav-txt"> Favorieten</span> <span id="navFavCount" style="background:#e84c15;color:white;border-radius:10px;padding:1px 6px;font-size:11px;font-weight:700;display:none"></span>';
    // Vóór het accountknopje invoegen (Zoekagent, Favorieten, Account, Tools,
    // Meer) i.p.v. achteraan aanplakken -- anders belandt 'ie ná de nieuwe
    // Tools/Meer-dropdowns, buiten de bedoelde volgorde uit de mockup.
    var accountBtn=document.getElementById('accountNavBtn');
    if(accountBtn)acties.insertBefore(btn,accountBtn);else acties.appendChild(btn);
    var c=document.getElementById('navFavCount');
    if(c&&_favs.size){c.textContent=_favs.size;c.style.display='inline';}
  }
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',addFavBtn);}
  else{setTimeout(addFavBtn,200);}
})();

function setMerkFilter(merk) {
  var _m = document.getElementById('merkFilter');
  if (_m) { _m.value = merk; if (typeof updateModelDropdown === 'function') updateModelDropdown(); zoekNu(); window.scrollTo({top: document.getElementById('resultatenHeader')?.offsetTop || 400, behavior: 'smooth'}); }
}
