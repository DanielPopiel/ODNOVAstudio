/* W5 „Noc”: kliknięcie/stuknięcie zabiera kawałek pizzy wyciętej ze zdjęcia lokalu. Po ósmym zostaje żar i dym — „no i poszło z dymem”. */
(function(){
  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var stol = document.getElementById('stol'), cv = document.getElementById('cv'), cx = cv.getContext('2d');
  var btn = document.getElementById('pbtn'), po = document.getElementById('po'), hint = document.getElementById('hint');
  var ile = document.getElementById('ile');
  var G = window.PZD_GEO || { IW:1200, IH:1200, PX:600, PY:600, PR:545 };
  var IW = G.IW, IH = G.IH, PX = G.PX, PY = G.PY, PR = G.PR, N = 8, OFF = -Math.PI/2 + Math.PI/8;
  var GROUND = getComputedStyle(document.documentElement).getPropertyValue('--hero-bg').trim() || '#0B0A0A';
  var top = new Image(), ok = 0;
  top.src = 'assets/pizza-noc.webp';
  top.onload = function(){ ok = 2; btn.hidden = false; size(); };
  var slices = []; for (var i = 0; i < N; i++) slices.push({ on:1, t:0, dir:1, bmp:null, h:0, h0:0, hover:false });
  var dpr = Math.min(devicePixelRatio || 1, 2), W, H, s, ox, oy, cX, cY, R, puff = [], anim = 0;

  function size(){
    W = stol.clientWidth; H = stol.clientHeight; cv.width = W * dpr; cv.height = H * dpr;
    var narrow = innerWidth <= 900;
    s = narrow ? (W * .9) / (2 * PR) : (Math.min(W, H) * .86) / (2 * PR);
    ox = W * .5 - PX * s; oy = H * .5 - PY * s; cX = ox + PX*s; cY = oy + PY*s; R = PR * s;
    btn.style.cssText = 'left:' + (cX - R) + 'px;top:' + (cY - R) + 'px;width:' + 2*R + 'px;height:' + 2*R + 'px';
    // każdy kawałek jako osobna bitmapa — w locie może wyjść poza kadr zdjęcia
    slices.forEach(function(q, i){
      var b = q.bmp || document.createElement('canvas'), pad = Math.ceil(R * 1.16);
      b.width = b.height = Math.ceil(pad * 2 * dpr); var c = b.getContext('2d');
      c.setTransform(dpr,0,0,dpr,0,0); c.clearRect(0,0,pad*2,pad*2);
      var a0 = OFF + i * 2*Math.PI/N, a1 = a0 + 2*Math.PI/N;
      var gap = .45 / R; c.beginPath(); c.moveTo(pad, pad); c.arc(pad, pad, R*1.11, a0 + gap, a1 - gap); c.closePath(); c.save(); c.clip();
      c.drawImage(top, pad - cX + ox, pad - cY + oy, IW*s, IH*s); c.restore();
      q.bmp = b; q.pad = pad;
    });
    draw();
  }
  addEventListener('resize', size);

  function sliceDraw(i, lift, extra){
    var q = slices[i], am = OFF + (i + .5) * 2*Math.PI/N, d = q.pad;
    cx.save();
    cx.translate(cX + Math.cos(am) * lift, cY + Math.sin(am) * lift);
    if (extra) extra();
    cx.drawImage(q.bmp, -d, -d, d*2, d*2);
    cx.restore();
  }
  function draw(){
    if (ok < 2) return;
    cx.setTransform(dpr,0,0,dpr,0,0);
    cx.fillStyle = GROUND; cx.fillRect(0, 0, W, H);
    var gl = cx.createRadialGradient(cX, cY + R*.5, R*.15, cX, cY + R*.5, Math.min(W * .5, H - cY - R*.5, R*1.35));          // żar pod pizzą zamiast deski
    gl.addColorStop(0, 'rgba(232,96,28,.5)'); gl.addColorStop(.45, 'rgba(232,96,28,.14)'); gl.addColorStop(1, 'rgba(232,96,28,0)');
    cx.fillStyle = gl; cx.fillRect(0, 0, W, H);
    var up = [];
    for (var i = 0; i < N; i++){
      var q = slices[i]; if (!q.on || q.t > 0) continue;
      if (q.h > .002) up.push(i); else sliceDraw(i, 0, function(){ cx.shadowColor = 'rgba(232,96,28,.35)'; cx.shadowBlur = R*.12; cx.shadowOffsetY = R*.05; });
    }
    up.forEach(function(i){                                                 // uniesiony kawałek: skórka idzie ku kamerze, czubek zostaje
      var hh = slices[i].h, am = OFF + (i + .5) * 2*Math.PI/N;
      sliceDraw(i, R*.01*hh, function(){ cx.rotate(am); cx.scale(1 + .035*hh, 1 + .012*hh); cx.rotate(-am);
        cx.shadowColor = 'rgba(0,0,0,' + (.26*hh) + ')'; cx.shadowBlur = 4 + 16*hh; cx.shadowOffsetX = 2*hh; cx.shadowOffsetY = 3 + 7*hh; });
    });
    for (var k = 0; k < N; k++){                                           // kawałki w drodze
      var w = slices[k]; if (!w.t) continue;
      var t = w.t, uq = Math.min(1, t / .35), fly = Math.max(0, (t - .25) / .75);
      var e1 = 1 - Math.pow(1 - uq, 3), e2 = fly * fly * fly;              // podniesienie ease-out, zabranie ease-in
      var lift = R * (.01*w.h0*(1 - e1) + .05*e1), sc = 1 + .035*w.h0*(1 - e1) + .07*e1 + .5*e2;
      var al = 1 - Math.max(0, (t - .86) / .14);
      cx.globalAlpha = al;
      (function(k, e1, e2, sc, al){ sliceDraw(k, lift, function(){
        cx.translate((W*.5 - cX)*.3*e2, (H*1.2 - cY)*e2);                   // do widza: w dół i z kadru
        cx.rotate(e2 * .22 * (k % 2 ? 1 : -1)); cx.scale(sc, sc);
        cx.shadowColor = 'rgba(0,0,0,' + (.26*al) + ')'; cx.shadowBlur = 4 + 16*w.h0 + 24*e1; cx.shadowOffsetY = 3 + 7*w.h0 + 14*e1; }); })(k, e1, e2, sc, al);
      cx.globalAlpha = 1;
    }
    for (var m = 0; m < puff.length; m++){                                 // dym nad pustą deską
      var f = puff[m], life = f.l / f.L; if (life >= 1) continue;
      var al2 = Math.sin(Math.PI * life) * .3, rr = f.r * (1 + life * 1.6);
      var g = cx.createRadialGradient(f.x, f.y, 0, f.x, f.y, rr);
      g.addColorStop(0, 'rgba(170,160,150,' + al2 + ')'); g.addColorStop(.7, 'rgba(170,160,150,' + al2*.35 + ')'); g.addColorStop(1, 'rgba(170,160,150,0)');
      cx.fillStyle = g; cx.beginPath(); cx.arc(f.x, f.y, rr, 0, 6.283); cx.fill();
    }
  }
  var last = 0;
  function tick(now){
    var dt = last ? Math.min(48, now - last) / 16.667 : 1; last = now;
    var go = false;
    slices.forEach(function(q){
      if (!q.t) return;
      q.t += q.dir * (RM ? 1 : dt * 16.667 / 1150);                       // lot 1,15 s niezależnie od odświeżania ekranu
      if (q.dir > 0 && q.t >= 1) { q.t = 0; q.on = 0; } else if (q.dir < 0 && q.t <= 0) { q.t = 0; q.on = 1; } else go = true;
    });
    slices.forEach(function(q){                                             // łagodne unoszenie pod kursorem
      var tg = q.hover && q.on && !q.t ? 1 : 0;
      if (RM) { q.h = tg; q.v = 0; return; }
      q.v = (q.v || 0) + ((tg - q.h) * .035 - (q.v || 0) * .37) * dt; q.h += q.v * dt;   // sprężyna: miękki start i dojście
      if (Math.abs(tg - q.h) > .002 || Math.abs(q.v) > .001) go = true; else { q.h = tg; q.v = 0; }
    });
    puff.forEach(function(f){ if (f.l < f.L) { f.l += dt; f.x += f.vx*dt; f.y += f.vy*dt; f.vy *= Math.pow(.99, dt); go = true; } });
    draw(); anim = go ? requestAnimationFrame(tick) : 0; if (!go) last = 0;
    if (!go) { puff = []; stan(); } else if (!slices.some(function(q){ return q.t; })) stan();
  }
  function run(){ if (!anim) { last = 0; anim = requestAnimationFrame(tick); } }
  function zostalo(){ return slices.filter(function(q){ return q.on && !q.t; }).length; }
  var bylo = N;
  function stan(){
    var n = zostalo(), w_locie = slices.some(function(q){ return q.t; });
    if (n < N) ile.textContent = n ? 'Zostało ' + n + ' z ' + N : ''; ile.classList.toggle('live', n < N);
    var koniec = n === 0 && !w_locie;
    if (koniec && bylo !== 0 && !RM && !puff.length) {                    // ostatni kawałek zniknął: dym
      for (var i = 0; i < 22; i++) puff.push({ x: cX + (Math.random()-.5)*R*1.2, y: cY + (Math.random()-.3)*R*.8, vx:(Math.random()-.5)*.5, vy: -(.7 + Math.random()*1.1), r: R*(.12 + Math.random()*.14), l: 0, L: 70 + Math.random()*40 });
      run();
    }
    bylo = n;
    po.classList.toggle('on', koniec); po.inert = !koniec; btn.hidden = koniec || ok < 2;
    if (koniec && document.activeElement === btn || koniec && stol.contains(document.activeElement)) {
      var h = po.querySelector('h2'); h.tabIndex = -1; setTimeout(function(){ h.focus({ preventScroll:true }); }, 950);
    }
    btn.setAttribute('aria-label', 'Weź kawałek pizzy, zostało ' + n);
  }
  function kat(e){
    var r = cv.getBoundingClientRect(), x = e.clientX - r.left - cX, y = e.clientY - r.top - cY;
    if (Math.hypot(x, y) > R*1.05) return -1;
    var a = Math.atan2(y, x) - OFF; a = (a % (2*Math.PI) + 2*Math.PI) % (2*Math.PI);
    return Math.floor(a / (2*Math.PI/N));
  }
  function wez(i){
    hint.classList.add('off');
    if (i < 0 || !slices[i].on || slices[i].t) {
      for (var j = 0; j < N; j++){ var c = (Math.max(i,0) + j) % N; if (slices[c].on && !slices[c].t) { i = c; break; } }
      if (i < 0 || !slices[i].on || slices[i].t) return;
    }
    if (navigator.vibrate) try { navigator.vibrate(8); } catch(e){}
    slices[i].h0 = slices[i].h; slices[i].hover = false; slices[i].h = 0; slices[i].t = .001; slices[i].dir = 1; run(); stan();
  }
  var lastPT = 'mouse';
  btn.addEventListener('pointerdown', function(e){ lastPT = e.pointerType; });
  btn.addEventListener('click', function(e){
    var i = e.detail ? kat(e) : -1;
    if (i > -1 && lastPT === 'mouse' && (!slices[i].on || slices[i].t)) return;   // klik w puste miejsce nic nie zabiera
    wez(i);
  });
  var cand = -2, hovT;                                                     // unosimy dopiero po chwili na tym samym kawałku
  btn.addEventListener('pointermove', function(e){
    if (e.pointerType !== 'mouse') return;
    var i = kat(e); if (i === cand) return; cand = i; clearTimeout(hovT);
    slices.forEach(function(q){ q.hover = false; }); run();
    hovT = setTimeout(function(){ if (cand > -1 && slices[cand].on && !slices[cand].t) { slices[cand].hover = true; run(); } }, 110);
  });
  btn.addEventListener('pointerleave', function(){ cand = -2; clearTimeout(hovT); slices.forEach(function(q){ q.hover = false; }); run(); });
  document.getElementById('reset').addEventListener('click', function(){
    po.classList.remove('on'); po.inert = true; btn.hidden = false; bylo = 0;
    slices.forEach(function(q, i){ setTimeout(function(){ q.on = 1; q.t = .999; q.dir = -1; run(); }, i * 70); });
    setTimeout(function(){ bylo = N; }, N * 70 + 700);
    btn.focus();
  });
  if (!RM) setTimeout(function(){                                          // podpowiedź po 1,2 s
    if (zostalo() < N) return;
    var q = slices[2], n = 0;                                              // jedno spokojne uniesienie i opadnięcie
    q.hover = true; run(); setTimeout(function(){ q.hover = false; run(); }, 900);
  }, 1200);
})();
