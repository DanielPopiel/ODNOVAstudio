/* Hero W2 „Papier" — przelot 3D z nieruchomych kadrow.
   Kamera jedzie po promieniu przez punkt dokumentu, wiec dokument stoi w miejscu ekranu,
   a reszta sceny rozjezdza sie na boki. Na koncu kamera wchodzi w biel kartki,
   ktora przechodzi w tlo strony.

   Konfiguracja: window.HERO_W2 = { kadry: [{img, depth, od, do}], dokument:[u,v], paper:'#F4F3EE' }
*/
(function () {
  'use strict';
  var CFG = window.HERO_W2;
  if (!CFG) return;

  var stage = document.getElementById('hero-stage');
  var pin = document.getElementById('hero-pin');
  var cvs = document.getElementById('hero-cvs');
  var fallback = document.getElementById('hero-fallback');
  if (!stage || !pin || !cvs) return;

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gl = null;
  try {
    gl = cvs.getContext('webgl', { antialias: true, alpha: false, premultipliedAlpha: false });
  } catch (e) { gl = null; }

  if (!gl || reduce) { tryb_zapasowy(); return; }

  /* ---------- shadery ---------- */
  var VS = [
    'attribute vec2 uv;',
    'uniform sampler2D depthMap;',
    'uniform vec3 cam;',
    'uniform float aspect, fov, zoomNear, zoomFar;',
    'varying vec2 vUv;',
    'vec3 promien(vec2 p){',
    '  return normalize(vec3((p.x-0.5)*aspect*fov, (0.5-p.y)*fov, 1.0));',
    '}',
    'void main(){',
    '  vUv = uv;',
    '  float d = texture2D(depthMap, vec2(uv.x, uv.y)).r;',
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
    'void main(){',
    '  vec4 c = texture2D(tex, vUv);',
    '  gl_FragColor = vec4(c.rgb, c.a * alpha);',
    '}'
  ].join('\n');

  function shader(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
    return s;
  }
  var vs = shader(gl.VERTEX_SHADER, VS), fs = shader(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) { tryb_zapasowy(); return; }
  var prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { tryb_zapasowy(); return; }
  gl.useProgram(prog);

  /* ---------- siatka ---------- */
  var NX = 150, NY = 84;
  var uvs = [], idx = [];
  for (var y = 0; y <= NY; y++) for (var x = 0; x <= NX; x++) uvs.push(x / NX, y / NY);
  for (var y2 = 0; y2 < NY; y2++) for (var x2 = 0; x2 < NX; x2++) {
    var a = y2 * (NX + 1) + x2, b = a + 1, c = a + NX + 1, d2 = c + 1;
    idx.push(a, b, c, b, d2, c);
  }
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);
  var ibuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibuf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array ? new Uint16Array(idx) : new Uint16Array(idx), gl.STATIC_DRAW);
  var aUv = gl.getAttribLocation(prog, 'uv');
  gl.enableVertexAttribArray(aUv);
  gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0);

  var U = {};
  ['depthMap', 'tex', 'cam', 'aspect', 'fov', 'alpha', 'zoomNear', 'zoomFar'].forEach(function (n) {
    U[n] = gl.getUniformLocation(prog, n);
  });

  /* ---------- tekstury ---------- */
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

  var kadry = CFG.kadry.map(function (k) { return { od: k.od, do: k.do, gotowy: false, src: k }; });
  var wczytane = 0;
  kadry.forEach(function (k) {
    var a = new Image(), b = new Image();
    var licz = function () {
      if (!a.complete || !b.complete || !a.naturalWidth || !b.naturalWidth) return;
      k.tex = tekstura(a); k.depth = tekstura(b); k.gotowy = true;
      wczytane++; rysuj();
    };
    a.onload = licz; b.onload = licz;
    a.src = k.src.img; b.src = k.src.depth;
  });

  /* ---------- geometria kamery ---------- */
  var FOV = 1.0, DOK = CFG.dokument || [0.5, 0.56], DDOK = CFG.glebiaDokumentu || 0.58;
  var ZN = 0.26, ZF = 0.74;

  function promien(u, v, aspect) {
    var x = (u - 0.5) * aspect * FOV, y = (0.5 - v) * FOV, z = 1.0;
    var l = Math.sqrt(x * x + y * y + z * z);
    return [x / l, y / l, z / l];
  }

  function rozmiar() {
    var dpr = Math.min(devicePixelRatio || 1, 2);
    var w = cvs.clientWidth, h = cvs.clientHeight;
    if (cvs.width !== Math.round(w * dpr) || cvs.height !== Math.round(h * dpr)) {
      cvs.width = Math.round(w * dpr); cvs.height = Math.round(h * dpr);
    }
    return w / h;
  }

  var postep = 0;
  function licz_postep() {
    var sr = stage.getBoundingClientRect(), pr = pin.getBoundingClientRect();
    var zakres = (stage.offsetHeight - pin.offsetHeight) * 0.9;
    if (zakres <= 0) return 0;
    return Math.min(1, Math.max(0, (pr.top - sr.top) / zakres));
  }

  function rysuj() {
    var aspect = rozmiar();
    gl.viewport(0, 0, cvs.width, cvs.height);
    var pap = CFG.paper || '#F4F3EE';
    var r = parseInt(pap.slice(1, 3), 16) / 255, g = parseInt(pap.slice(3, 5), 16) / 255, b = parseInt(pap.slice(5, 7), 16) / 255;
    gl.clearColor(r, g, b, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST);

    var rd = promien(DOK[0], DOK[1], aspect);
    // glebokosc dokumentu przyjmujemy stala (kadry sa wyrownane), kamera dojezdza do 0.86 tej odleglosci
    var Zdok = 1.0 / (ZN + ZF * DDOK);
    var t = postep * 0.62 * Zdok;
    var cam = [rd[0] * t, rd[1] * t, rd[2] * t];

    gl.uniform3f(U.cam, cam[0], cam[1], cam[2]);
    gl.uniform1f(U.aspect, aspect);
    gl.uniform1f(U.fov, FOV);
    gl.uniform1f(U.zoomNear, ZN);
    gl.uniform1f(U.zoomFar, ZF);

    kadry.forEach(function (k) {
      if (!k.gotowy) return;
      var a = 0;
      if (postep >= k.od && postep <= k.do) {
        var wej = Math.min(1, (postep - k.od) / 0.12);
        var wyj = Math.min(1, (k.do - postep) / 0.12);
        a = Math.min(wej, wyj);
        if (k.od === 0) a = Math.min(1, wyj);
        if (k.do >= 1) a = Math.min(1, wej);
      }
      if (a <= 0.002) return;
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, k.tex); gl.uniform1i(U.tex, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, k.depth); gl.uniform1i(U.depthMap, 1);
      gl.uniform1f(U.alpha, a);
      gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
    });

    // wejscie w papier
    var bialo = Math.max(0, (postep - 0.74) / 0.26);
    stage.style.setProperty('--papier', bialo.toFixed(3));
    stage.style.setProperty('--pp', postep.toFixed(3));
    // akty tekstowe
    var akt = postep < 0.26 ? 1 : postep < 0.56 ? 2 : postep < 0.86 ? 3 : 4;
    if (akt !== stage.__akt) { stage.__akt = akt; stage.setAttribute('data-akt', akt); }
  }

  var czeka = false;
  function tick() {
    czeka = false;
    postep = licz_postep();
    rysuj();
  }
  addEventListener('scroll', function () { if (!czeka) { czeka = true; requestAnimationFrame(tick); } }, { passive: true });
  addEventListener('resize', function () { if (!czeka) { czeka = true; requestAnimationFrame(tick); } });
  tick();
  document.documentElement.classList.add('hero3d');

  function tryb_zapasowy() {
    document.documentElement.classList.add('hero-fallback');
  }
})();
