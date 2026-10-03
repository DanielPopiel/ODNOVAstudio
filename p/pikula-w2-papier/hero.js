/* Hero W2 „Papier" — przelot 3D z nieruchomych kadrow, w calosci sterowany przewijaniem.
   Kazdy piksel przewiniecia przesuwa kamere, teksty i korekte — nic nie przeskakuje progami.
   Konfiguracja: window.HERO_W2 = { kadry: [{img, depth, od, do}], dokument:[u,v], paper:'#...' }
   Korekta w akcie 3: window.korektaUstaw(n, f) — n = wariant 0..2, f = 0..1 postep poprawki.
*/
(function () {
  'use strict';
  var CFG = window.HERO_W2;
  if (!CFG) return;

  var stage = document.getElementById('hero-stage');
  var pin = document.getElementById('hero-pin');
  var cvs = document.getElementById('hero-cvs');
  if (!stage || !pin || !cvs) return;
  var html = document.documentElement;

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) {
    html.classList.add('hero-statyczne');
    if (window.korektaUstaw) window.korektaUstaw(0, 1);
    return;
  }

  /* ---------- os czasu (postep 0..1) ---------- */
  // okna aktow: [wejscie od, pelne od, pelne do, wyjscie do]
  var OKNA = [[-1, 0, 0.17, 0.27], [0.19, 0.29, 0.44, 0.53], [0.47, 0.56, 0.9, 0.97]];
  var KOR_OD = 0.55, KOR_DO = 0.89, WARIANTY = 3;
  var BIEL_OD = 0.86, BIEL_DO = 1.0;

  function c01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function wygladz(x) { x = c01(x); return x * x * (3 - 2 * x); }
  function okno(p, o) {
    var wej = o[1] <= o[0] ? 1 : (p - o[0]) / (o[1] - o[0]);
    var wyj = (o[3] - p) / (o[3] - o[2]);
    return c01(Math.min(wej, wyj));
  }

  var akty = [stage.querySelector('.akt-1'), stage.querySelector('.akt-2'), stage.querySelector('.akt-3')];

  function zakres() { return Math.max(1, (stage.offsetHeight - pin.offsetHeight) * 0.9); }
  function licz_postep() {
    var sr = stage.getBoundingClientRect(), pr = pin.getBoundingClientRect();
    return c01((pr.top - sr.top) / zakres());
  }

  /* ---------- scena WebGL (opcjonalna — bez niej i tak dziala tekst i korekta) ---------- */
  var rysujScene = przygotujScene();
  if (rysujScene) html.classList.add('hero3d');
  else html.classList.add('hero-fallback');
  html.classList.add('hero-anim');

  function rysuj(p) {
    if (rysujScene) rysujScene(p);

    // akty: przenikanie i lekki ruch pionowy wprost z postepu
    for (var i = 0; i < 3; i++) {
      var el = akty[i]; if (!el) continue;
      var o = wygladz(okno(p, OKNA[i]));
      var srodek = (OKNA[i][1] + OKNA[i][2]) / 2;
      el.style.opacity = o.toFixed(3);
      el.style.transform = 'translateY(' + ((srodek - p) * 90).toFixed(1) + 'px)';
      el.style.visibility = o < 0.01 ? 'hidden' : 'visible';
      el.style.pointerEvents = o > 0.5 ? 'auto' : 'none';
    }
    var scrim = Math.max(okno(p, OKNA[0]) * 0.55, okno(p, [0.19, 0.29, 0.9, 0.98]));
    stage.style.setProperty('--scrim', scrim.toFixed(3));

    // korekta: trzy warianty rozlozone na odcinku przewijania
    if (window.korektaUstaw) {
      var q = c01((p - KOR_OD) / (KOR_DO - KOR_OD)) * WARIANTY;
      var n = Math.min(WARIANTY - 1, Math.floor(q));
      window.korektaUstaw(n, p < KOR_OD ? 0 : Math.min(1, q - n));
    }

    stage.style.setProperty('--papier', wygladz((p - BIEL_OD) / (BIEL_DO - BIEL_OD)).toFixed(3));
    stage.style.setProperty('--pp', p.toFixed(3));
    var akt = p < 0.23 ? 1 : p < 0.5 ? 2 : p < 0.97 ? 3 : 4;
    if (akt !== stage.__akt) { stage.__akt = akt; stage.setAttribute('data-akt', akt); }
  }

  // kropki korekty przewijaja do srodka swojego wariantu
  var dots = document.querySelectorAll('#kdots button');
  Array.prototype.forEach.call(dots, function (b, n) {
    b.addEventListener('click', function () {
      var cel = KOR_OD + (n + 0.82) * (KOR_DO - KOR_OD) / WARIANTY;
      var y = stage.getBoundingClientRect().top + pageYOffset + cel * zakres();
      scrollTo({ top: y, behavior: 'smooth' });
    });
  });

  var czeka = false;
  function tick() { czeka = false; rysuj(licz_postep()); }
  function plan() { if (!czeka) { czeka = true; requestAnimationFrame(tick); } }
  addEventListener('scroll', plan, { passive: true });
  addEventListener('resize', plan);
  tick();

  /* ================= WebGL ================= */
  function przygotujScene() {
    var gl = null;
    try { gl = cvs.getContext('webgl', { antialias: true, alpha: false, premultipliedAlpha: false }); }
    catch (e) { gl = null; }
    if (!gl) return null;

    var VS = [
      'attribute vec2 uv;',
      'uniform sampler2D depthMap;',
      'uniform vec3 cam;',
      'uniform float aspect, fov, zoomNear, zoomFar;',
      'varying vec2 vUv;',
      'vec3 promien(vec2 p){ return normalize(vec3((p.x-0.5)*aspect*fov, (0.5-p.y)*fov, 1.0)); }',
      'void main(){',
      '  vUv = uv;',
      '  float d = min(texture2D(depthMap, uv).r, 0.7);',
      '  float Z = 1.0 / (zoomNear + zoomFar * d);',
      '  vec3 p = promien(uv) * Z - cam;',
      '  float zc = max(p.z, 0.001);',
      '  gl_Position = vec4(p.x / (zc * fov * aspect * 0.5), p.y / (zc * fov * 0.5), 0.0, 1.0);',
      '}'
    ].join('\n');
    var FS = [
      'precision mediump float;',
      'uniform sampler2D tex;',
      'uniform float alpha;',
      'varying vec2 vUv;',
      'void main(){ vec4 c = texture2D(tex, vUv); gl_FragColor = vec4(c.rgb, c.a * alpha); }'
    ].join('\n');

    function shader(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    }
    var vs = shader(gl.VERTEX_SHADER, VS), fs = shader(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return null;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);

    var NX = 150, NY = 84, uvs = [], idx = [];
    for (var y = 0; y <= NY; y++) for (var x = 0; x <= NX; x++) uvs.push(x / NX, y / NY);
    for (var y2 = 0; y2 < NY; y2++) for (var x2 = 0; x2 < NX; x2++) {
      var a = y2 * (NX + 1) + x2, b = a + 1, c = a + NX + 1, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
    var aUv = gl.getAttribLocation(prog, 'uv');
    gl.enableVertexAttribArray(aUv);
    gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0);

    var U = {};
    ['depthMap', 'tex', 'cam', 'aspect', 'fov', 'alpha', 'zoomNear', 'zoomFar'].forEach(function (n) {
      U[n] = gl.getUniformLocation(prog, n);
    });

    var zepsute = false;
    function tekstura(img) {
      var t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      return t;
    }
    var kadry = CFG.kadry.map(function (k) { return { od: k.od, do: k.do, src: k }; });
    kadry.forEach(function (k) {
      var a = new Image(), b = new Image();
      function gotowe() {
        if (!a.complete || !b.complete || !a.naturalWidth || !b.naturalWidth || k.gotowy) return;
        try { k.tex = tekstura(a); k.depth = tekstura(b); k.gotowy = true; }
        catch (e) {
          zepsute = true;
          html.classList.remove('hero3d'); html.classList.add('hero-fallback');
        }
        plan();
      }
      a.onload = gotowe; b.onload = gotowe;
      a.src = k.src.img; b.src = k.src.depth;
    });

    var FOV = 1.0, DOK = CFG.dokument || [0.5, 0.56], DDOK = CFG.glebiaDokumentu || 0.58;
    var ZN = 0.26, ZF = 0.74;
    var pap = CFG.paper || '#F4F3EE';
    var pr = parseInt(pap.slice(1, 3), 16) / 255, pg = parseInt(pap.slice(3, 5), 16) / 255, pb = parseInt(pap.slice(5, 7), 16) / 255;

    return function (p) {
      if (zepsute) return;
      var dpr = Math.min(devicePixelRatio || 1, 2);
      var w = cvs.clientWidth, h = cvs.clientHeight;
      if (!w || !h) return;
      if (cvs.width !== Math.round(w * dpr) || cvs.height !== Math.round(h * dpr)) {
        cvs.width = Math.round(w * dpr); cvs.height = Math.round(h * dpr);
      }
      var aspect = w / h;
      gl.viewport(0, 0, cvs.width, cvs.height);
      gl.clearColor(pr, pg, pb, 1); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.disable(gl.DEPTH_TEST);

      var rx = (DOK[0] - 0.5) * aspect * FOV, ry = (0.5 - DOK[1]) * FOV, l = Math.sqrt(rx * rx + ry * ry + 1);
      var Zdok = 1.0 / (ZN + ZF * DDOK);
      // ruch od pierwszego piksela: najszybszy na starcie, lagodnie hamuje
      var e = 1 - Math.pow(1 - p, 1.7);
      var t = e * (aspect > 1.75 ? 0.52 : 0.62) * Zdok;
      gl.uniform3f(U.cam, rx / l * t, ry / l * t, 1 / l * t);
      gl.uniform1f(U.aspect, aspect); gl.uniform1f(U.fov, FOV);
      gl.uniform1f(U.zoomNear, ZN); gl.uniform1f(U.zoomFar, ZF);

      kadry.forEach(function (k) {
        if (!k.gotowy || p < k.od || p > k.do) return;
        var wej = k.od <= 0 ? 1 : Math.min(1, (p - k.od) / 0.1);
        // starszy kadr zostaje pelny, nowszy nachodzi na niego — bez przeswitu papieru w polowie
        var al = wej;
        if (al <= 0.002) return;
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, k.tex); gl.uniform1i(U.tex, 0);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, k.depth); gl.uniform1i(U.depthMap, 1);
        gl.uniform1f(U.alpha, al);
        gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
      });
    };
  }
})();
