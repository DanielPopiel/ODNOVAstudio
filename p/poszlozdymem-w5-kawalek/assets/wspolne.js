/* Poszło z Dymem — wspólne zachowania makiet W4–W6 (ODNOVA Studio).
   Każdy wariant ma własny wygląd; tu tylko logika: godziny, karta, odsłanianie, pasek. */
(function(){
  var I = window.PZD_INFO, M = window.PZD_MENU;
  var $ = function(s, r){ return (r||document).querySelector(s); };
  var $$ = function(s, r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); };
  var DNI = ['Niedziela','Poniedziałek','Wtorek','Środa','Czwartek','Piątek','Sobota'];

  /* ── wysokość nagłówka do zmiennej (zawija się na telefonie) ── */
  var hdr = $('[data-hdr]');
  function mierz(){ if(hdr) document.documentElement.style.setProperty('--hdr-h', hdr.offsetHeight + 'px'); }
  mierz(); addEventListener('resize', mierz); addEventListener('load', mierz);

  /* ── otwarte teraz ── */
  function status(){
    var d = new Date(), g = I.godziny[d.getDay()], h = d.getHours() + d.getMinutes()/60;
    if (g && h >= g[0] && h < g[1]) {
      var zost = g[1] - h;
      return { otw:true, txt: zost <= 1 ? 'Otwarte jeszcze ' + Math.max(1, Math.round(zost*60)) + ' min' : 'Otwarte do ' + g[1] + ':00' };
    }
    for (var i = 0; i < 8; i++) {
      var dd = (d.getDay() + i) % 7, gg = I.godziny[dd];
      if (!gg) continue;
      if (i === 0 && h < gg[0]) return { otw:false, txt:'Otwieramy dziś o ' + gg[0] + ':00' };
      if (i === 1) return { otw:false, txt:'Otwieramy jutro o ' + gg[0] + ':00' };
      if (i > 1) { var dz = DNI[dd].toLowerCase().replace('środa','środę').replace('sobota','sobotę').replace('niedziela','niedzielę'); return { otw:false, txt:'Otwieramy ' + (/^w/.test(dz) ? 'we ' : 'w ') + dz + ' o ' + gg[0] + ':00' }; }
    }
    return { otw:false, txt:'Dziś nieczynne' };
  }
  var st = status();
  $$('[data-status]').forEach(function(el){
    el.textContent = st.txt; el.classList.toggle('is-open', st.otw); el.classList.toggle('is-closed', !st.otw);
  });

  /* ── godziny jako lista ── */
  $$('[data-godziny]').forEach(function(ul){
    var dzis = new Date().getDay(), kol = [1,2,3,4,5,6,0];
    ul.innerHTML = kol.map(function(i){
      var g = I.godziny[i];
      return '<li' + (i === dzis ? ' class="dzis"' : '') + '><span>' + DNI[i] + '</span><span>' +
             (g ? g[0] + ':00 – ' + g[1] + ':00' : 'nieczynne') + '</span></li>';
    }).join('');
  });

  /* ── karta: zakładki + listy ── */
  function zl(p){ return (p % 1 ? p.toFixed(2).replace('.', ',') : p) + ' zł'; }
  window.PZD_zl = zl;
  $$('[data-karta]').forEach(function(box){
    var tabs = $('[data-karta-tabs]', box), list = $('[data-karta-list]', box);
    var tpl = box.getAttribute('data-karta') || 'row';
    function rysuj(id){
      var c = M.filter(function(x){ return x.id === id; })[0];
      list.innerHTML = (c.note ? '<p class="k-note">' + c.note + '</p>' : '') +
        '<ul class="k-items">' + c.items.map(function(it){
          return '<li class="k-item"><div class="k-head"><span class="k-n">' + it.n + '</span>' +
            (it.tag ? '<span class="k-tag k-tag-' + it.tag.toLowerCase() + '">' + it.tag + '</span>' : '') +
            '<span class="k-fill" aria-hidden="true"></span><span class="k-p">' + (it.od ? '<small>od </small>' : '') + zl(it.p) + '</span></div>' +
            (it.d ? '<p class="k-d">' + it.d.replace(/ \/ /g, ', ') + '</p>' : '') + '</li>';
        }).join('') + '</ul>';
      /* na telefonie długa lista (20 pizz) idzie na dwa ekrany — pokaż 8, resztę po stuknięciu */
      if (innerWidth <= 760 && c.items.length > 9) {
        var li = $$('.k-item', list), wiecej = document.createElement('button');
        li.slice(8).forEach(function(e){ e.hidden = true; });
        wiecej.type = 'button'; wiecej.className = 'k-wiecej'; wiecej.textContent = 'Pokaż wszystkie (' + c.items.length + ')';
        wiecej.addEventListener('click', function(){ li.forEach(function(e){ e.hidden = false; }); wiecej.remove(); li[8].querySelector('.k-n').scrollIntoView({ block:'center', behavior:'smooth' }); });
        list.appendChild(wiecej);
      }
      $$('button', tabs).forEach(function(b){ var on = b.getAttribute('data-id') === id; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; });
      list.setAttribute('aria-labelledby', 'tab-' + id);
    }
    var pid = 'karta-panel';
    list.id = pid;
    tabs.innerHTML = M.map(function(c, i){
      return '<button type="button" role="tab" id="tab-' + c.id + '" aria-controls="' + pid + '" data-id="' + c.id + '">' + c.name + '</button>';
    }).join('');
    tabs.setAttribute('role','tablist');
    list.removeAttribute('aria-live');
    tabs.addEventListener('click', function(e){ var b = e.target.closest('button'); if (b) rysuj(b.getAttribute('data-id')); });
    tabs.addEventListener('keydown', function(e){
      var bs = $$('button', tabs), i = bs.indexOf(document.activeElement), n;
      if (e.key === 'ArrowRight') n = bs[(i + 1) % bs.length];
      else if (e.key === 'ArrowLeft') n = bs[(i + bs.length - 1) % bs.length];
      else if (e.key === 'Home') n = bs[0];
      else if (e.key === 'End') n = bs[bs.length - 1];
      else return;
      e.preventDefault(); n.focus(); n.click();
    });
    rysuj(M[0].id);
  });

  /* ── strefy dostawy ── */
  $$('[data-strefy]').forEach(function(tb){
    tb.innerHTML = I.strefy.map(function(s){
      return '<tr><th scope="row">' + s.z + '</th><td>' + s.k + ' zł</td><td>' + s.min + ' zł</td><td>' + (s.free ? 'od ' + s.free + ' zł' : '—') + '</td></tr>';
    }).join('');
  });

  /* ── rok w stopce ── */
  $$('[data-rok]').forEach(function(e){ e.textContent = new Date().getFullYear(); });

  /* ── menu mobilne: zamknij po kliknięciu linku ── */
  $$('details.mnav a').forEach(function(a){ a.addEventListener('click', function(){ a.closest('details').removeAttribute('open'); }); });

  /* ── dolny pasek pokazuj dopiero pod hero ── */
  var hero = $('[data-hero]');
  if (hero) {
    var t = function(){ document.body.classList.toggle('past-hero', hero.getBoundingClientRect().bottom < innerHeight * 0.5); };
    addEventListener('scroll', t, { passive:true }); t();
  }

  /* ── odsłanianie: tylko to, co oznaczone; bez JS wszystko widać ── */
  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var rv = $$('.reveal, .stagger');
  $$('.stagger').forEach(function(s){ Array.prototype.forEach.call(s.children, function(c, i){ c.style.setProperty('--i', i); }); });
  if (RM || !('IntersectionObserver' in window)) { rv.forEach(function(e){ e.classList.add('in'); }); }
  else {
    var fired = false;
    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){ if (e.isIntersecting) { fired = true; e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    rv.forEach(function(e){ io.observe(e); });
    var sweep = function(){ rv.forEach(function(e){ var r = e.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) e.classList.add('in'); }); };
    var tm; addEventListener('scroll', function(){ clearTimeout(tm); tm = setTimeout(sweep, 140); }, { passive:true });
    setTimeout(function(){ if (!fired) rv.forEach(function(e){ e.classList.add('in'); }); }, 4000);
  }
})();
