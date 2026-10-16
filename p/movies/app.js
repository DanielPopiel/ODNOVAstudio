/* Movies – lista IMDb Top 5000 do odhaczania we dwoje (Daniel i Kasia). Wszystko lokalnie, działa offline. */
(() => {
  'use strict';

  const OSOBY = { d: 'Daniel', k: 'Kasia' };
  const KLUCZ = 'kino250.v1';
  const $ = (s, el = document) => el.querySelector(s);

  // Filtry „kto widział”: [klucz, etykieta, kropki D/K, warunek]
  const KTO = [
    ['wszystkie', 'Wszystkie', null, () => true],
    ['nikt', 'Oboje nie widzieliśmy', [0, 0], (d, k) => !d && !k],
    ['tylkoD', `${OSOBY.d} tak, ${OSOBY.k} nie`, [1, 0], (d, k) => d && !k],
    ['tylkoK', `${OSOBY.k} tak, ${OSOBY.d} nie`, [0, 1], (d, k) => !d && k],
    ['oboje', 'Oboje widzieliśmy', [1, 1], (d, k) => d && k],
    ['nieD', `${OSOBY.d} nie widział`, null, (d) => !d],
    ['nieK', `${OSOBY.k} nie widziała`, null, (d, k) => !k],
  ];
  const DLUGOSC = [
    ['krotki', 'do 1,5 h', (m) => m <= 90],
    ['sredni', '1,5–2,5 h', (m) => m > 90 && m <= 150],
    ['dlugi', 'ponad 2,5 h', (m) => m > 150],
  ];

  // ---------- stan ----------
  let filmy = [];
  let meta = {};
  let stan = wczytaj();
  const widok = { q: '', kto: 'wszystkie', dekady: new Set(), gatunki: new Set(), dlugosc: new Set(), sort: 'r' };

  function wczytaj() {
    const pusty = { wersja: 1, widzieli: {}, tytuly: 'pl' };
    try {
      const s = JSON.parse(localStorage.getItem(KLUCZ) || 'null');
      if (s && typeof s === 'object' && s.widzieli) return { ...pusty, ...s };
    } catch (e) { /* brak dostępu do pamięci – działamy bez zapisu */ }
    return pusty;
  }
  function zapisz() {
    try { localStorage.setItem(KLUCZ, JSON.stringify(stan)); }
    catch (e) { toast('Nie udało się zapisać – zrób kopię zapasową'); }
  }
  const w = (id) => stan.widzieli[id] || {};
  const widzial = (id, o) => !!w(id)[o];

  function przelacz(id, o) {
    const rek = { ...w(id) };
    if (rek[o]) delete rek[o]; else rek[o] = new Date().toISOString().slice(0, 10);
    if (rek.d || rek.k) stan.widzieli[id] = rek; else delete stan.widzieli[id];
    zapisz();
    synchFilm(id);
    if (navigator.vibrate) navigator.vibrate(rek[o] ? 12 : 6);
    return !!rek[o];
  }

  // ---------- pomocnicze ----------
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');
  const czas = (m) => (m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min` : `${m} min`);
  const liczba = (n) => n.toLocaleString('pl-PL');
  const glosy = (v) => (v >= 1e6 ? `${(v / 1e6).toLocaleString('pl-PL', { maximumFractionDigits: 2 })} mln` : `${Math.round(v / 1000)} tys.`);
  const ocena = (x) => x.toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  function odm(n, [jeden, kilka, wiele]) {
    if (n === 1) return jeden;
    const j = n % 10, d = n % 100;
    return j >= 2 && j <= 4 && (d < 12 || d > 14) ? kilka : wiele;
  }
  const hue = (rok) => Math.round(28 + ((rok - 1920) / 110) * 250) % 360; // kolor kafelka wg epoki
  const tytul = (f) => (stan.tytuly === 'oryg' && f.o ? f.o : f.t);
  const drugi = (f) => (stan.tytuly === 'oryg' ? (f.o ? f.t : null) : f.o);

  const IKONA_GW = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z"/></svg>';
  const IKONA_OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';

  function kafel(f) {
    return `<div class="kafel${f.r >= 100 ? ' dlugi' : ''}" style="--h:${hue(f.y)}" aria-hidden="true"><div class="nr"><small>#</small>${f.r}</div><div class="rok">${f.y}</div><img src="okladki/${f.id}.jpg" alt="" loading="lazy" decoding="async" onerror="this.parentNode.classList.add('bez');this.remove()"><span class="plak">${f.r}</span></div>`;
  }

  // ---------- lista ----------
  const lista = $('#lista');

  function htmlFilmu(f) {
    const d = widzial(f.id, 'd'), k = widzial(f.id, 'k');
    const t = tytul(f), o = drugi(f);
    return `<li class="film${d ? ' d' : ''}${k ? ' k' : ''}" data-id="${f.id}">
      ${kafel(f)}
      <div class="opis" data-otworz>
        <h2>${esc(t)}</h2>
        ${o ? `<p class="oryg">${esc(o)}</p>` : ''}
        ${f.op ? `<p class="fab">${esc(f.op)}</p>` : ''}
        <div class="meta"><span class="ocena">${IKONA_GW}${ocena(f.oc)}</span><span>${f.y}</span><span>${czas(f.min)}</span><span class="gat">${esc(f.g.join(' · '))}</span></div>
      </div>
      <div class="przelaczniki">
        <button type="button" class="os d" data-os="d" aria-pressed="${d}" aria-label="${OSOBY.d} widział: ${esc(t)}">D<span class="ptaszek">${IKONA_OK}</span></button>
        <button type="button" class="os k" data-os="k" aria-pressed="${k}" aria-label="${OSOBY.k} widziała: ${esc(t)}">K<span class="ptaszek">${IKONA_OK}</span></button>
      </div>
    </li>`;
  }

  function przefiltrowane(pomijajKto = false) {
    const q = norm(widok.q.trim());
    const kto = KTO.find((x) => x[0] === widok.kto)[3];
    let wynik = filmy.filter((f) => {
      if (!pomijajKto && !kto(widzial(f.id, 'd'), widzial(f.id, 'k'))) return false;
      if (widok.dekady.size && !widok.dekady.has(Math.floor(f.y / 10) * 10)) return false;
      if (widok.gatunki.size && !f.g.some((g) => widok.gatunki.has(g))) return false;
      if (widok.dlugosc.size && !DLUGOSC.some(([kl, , war]) => widok.dlugosc.has(kl) && war(f.min))) return false;
      if (q) {
        if (/^#?\d{1,3}$/.test(q)) return f.r === +q.replace('#', '') || String(f.y).startsWith(q);
        if (/^\d{4}$/.test(q)) return f.y === +q;
        return f._szuk.includes(q);
      }
      return true;
    });
    const s = widok.sort;
    const por = {
      r: (a, b) => a.r - b.r,
      oc: (a, b) => b.oc - a.oc || b.v - a.v,
      nowe: (a, b) => b.y - a.y || a.r - b.r,
      stare: (a, b) => a.y - b.y || a.r - b.r,
      krotkie: (a, b) => a.min - b.min,
      dlugie: (a, b) => b.min - a.min,
      az: (a, b) => tytul(a).localeCompare(tytul(b), 'pl'),
    }[s];
    return wynik.sort(por);
  }

  // Lista rysuje się partiami (5000 kart naraz zamuliłoby telefon) – kolejne dochodzą przy przewijaniu.
  const PARTIA = 120;
  let wynikListy = [], pokazane = 0;
  const czujnik = document.createElement('li');
  czujnik.className = 'czujnik';
  czujnik.setAttribute('aria-hidden', 'true');
  const obserwator = new IntersectionObserver((w) => { if (w.some((x) => x.isIntersecting)) dorysuj(); }, { rootMargin: '1200px 0px' });
  // Zapas na przeglądarki, w których obserwator się nie odzywa: sprawdzamy też przy przewijaniu.
  let klatka = 0;
  const blisko = () => czujnik.isConnected && czujnik.getBoundingClientRect().top < innerHeight + 1200;
  window.addEventListener('scroll', () => {
    if (klatka) return;
    klatka = setTimeout(() => { klatka = 0; while (pokazane < wynikListy.length && blisko()) dorysuj(); }, 50);
  }, { passive: true });

  function dorysuj(ile = PARTIA) {
    if (pokazane >= wynikListy.length) return;
    const kolejne = wynikListy.slice(pokazane, pokazane + ile);
    czujnik.insertAdjacentHTML('beforebegin', kolejne.map(htmlFilmu).join(''));
    pokazane += kolejne.length;
    if (pokazane >= wynikListy.length) obserwator.unobserve(czujnik);
  }

  // zachowaj = true: odśwież bez cofania przewinięcia (np. zmiana przyszła z drugiego urządzenia).
  function rysujListe(zachowaj = false) {
    const wynik = przefiltrowane();
    const ile = zachowaj ? Math.max(PARTIA, pokazane) : PARTIA;
    wynikListy = wynik; pokazane = 0;
    lista.innerHTML = '';
    lista.appendChild(czujnik);
    dorysuj(ile);
    obserwator.unobserve(czujnik);
    if (pokazane < wynik.length) obserwator.observe(czujnik);
    $('#pusto').hidden = wynik.length > 0;
    const ileFiltrow = widok.dekady.size + widok.gatunki.size + widok.dlugosc.size + (widok.sort !== 'r' ? 1 : 0);
    const aktywne = ileFiltrow > 0 || widok.kto !== 'wszystkie' || widok.q;
    $('#wyniki').textContent = aktywne ? `${wynik.length} ${odm(wynik.length, ['film', 'filmy', 'filmów'])}` : `Cała lista · ${filmy.length} filmów`;
    $('#resetFiltry').hidden = !aktywne;
    const bf = $('#otworzFiltry');
    bf.classList.toggle('aktywne', ileFiltrow > 0);
    $('#liczFiltry').textContent = ileFiltrow;
    rysujCzipyKto();
  }

  // ---------- statystyki ----------
  function statystyki() {
    let d = 0, k = 0, r = 0, minRazem = 0;
    for (const f of filmy) {
      const wd = widzial(f.id, 'd'), wk = widzial(f.id, 'k');
      if (wd) d++;
      if (wk) k++;
      if (wd && wk) r++; else minRazem += f.min;
    }
    const n = filmy.length || 5000;
    const luk = (el, ile) => {
      const c = 2 * Math.PI * el.r.baseVal.value;
      el.style.strokeDasharray = `${c}`;
      el.style.strokeDashoffset = `${c * (1 - ile / n)}`;
    };
    luk($('#lukD'), d); luk($('#lukK'), k); luk($('#lukR'), r);
    const proc = (x) => { const p = (x / n) * 100; return `${(p > 0 && p < 10 ? Math.round(p * 10) / 10 : Math.round(p)).toLocaleString('pl-PL')}%`; };
    $('#liczRazem').textContent = r;
    $('#liczD').innerHTML = `${d}<small>${proc(d)}</small>`;
    $('#liczK').innerHTML = `${k}<small>${proc(k)}</small>`;
    $('#liczR').innerHTML = `${r}<small>${proc(r)}</small>`;
    const zost = n - r;
    $('#zostalo').innerHTML = zost === 0
      ? '<b>Wszystkie 5000 obejrzane razem.</b> Szacunek.'
      : `Razem zostało <b>${zost} ${odm(zost, ['film', 'filmy', 'filmów'])}</b> · ok. <b>${liczba(Math.round(minRazem / 60))} h</b> seansów`;
  }

  // ---------- czipy ----------
  function czip(kl, etykieta, wl, extra = '') {
    return `<button type="button" class="czip" data-v="${esc(kl)}" aria-pressed="${wl}">${extra}${esc(etykieta)}</button>`;
  }
  function kropki(k) {
    if (!k) return '';
    return `<span class="kropki"><i class="d${k[0] ? ' on' : ''}"></i><i class="k${k[1] ? ' on' : ''}"></i></span>`;
  }
  function rysujCzipyKto() {
    const baza = przefiltrowane(true);
    const html = KTO.map(([kl, et, kr, war]) => {
      const n = baza.filter((f) => war(widzial(f.id, 'd'), widzial(f.id, 'k'))).length;
      return `<button type="button" class="czip" data-v="${kl}" aria-pressed="${widok.kto === kl}">${kropki(kr)}${esc(et)} <span class="n">${n}</span></button>`;
    }).join('');
    $('#czipyKto').innerHTML = html;
    $('#fKto').innerHTML = html;
  }
  function rysujFiltry() {
    const dekady = [...new Set(filmy.map((f) => Math.floor(f.y / 10) * 10))].sort((a, b) => a - b);
    $('#fDekada').innerHTML = dekady.map((d) => czip(d, d < 2000 ? `lata ${String(d).slice(2)}.` : `${d}–${d + 9}`, widok.dekady.has(d))).join('');
    const licz = {};
    filmy.forEach((f) => f.g.forEach((g) => (licz[g] = (licz[g] || 0) + 1)));
    const gat = Object.keys(licz).sort((a, b) => licz[b] - licz[a]);
    $('#fGatunek').innerHTML = gat.map((g) => czip(g, g, widok.gatunki.has(g))).join('');
    $('#fGatunek').querySelectorAll('.czip').forEach((b) => b.insertAdjacentHTML('beforeend', ` <span class="n">${licz[b.dataset.v]}</span>`));
    $('#fDlugosc').innerHTML = DLUGOSC.map(([kl, et]) => czip(kl, et, widok.dlugosc.has(kl))).join('');
    $('#sort').value = widok.sort;
    $('#fTytuly').innerHTML = czip('pl', 'Polskie', stan.tytuly !== 'oryg') + czip('oryg', 'Oryginalne', stan.tytuly === 'oryg');
  }

  // ---------- szczegóły filmu ----------
  let otwartyId = null;
  function pokazFilm(id) {
    const f = filmy.find((x) => x.id === id);
    if (!f) return;
    otwartyId = id;
    const d = widzial(id, 'd'), k = widzial(id, 'k');
    const daty = w(id);
    const o = drugi(f);
    $('#filmTresc').innerHTML = `
      <div class="szcz-gora">${kafel(f)}<div><h2 id="tFilm">${esc(tytul(f))}</h2>${o ? `<p class="oryg">${esc(o)}</p>` : ''}</div></div>
      ${f.op ? `<p class="szcz-fab">${esc(f.op)}</p>` : ''}
      <div class="fakty">
        <div class="fakt"><b style="color:var(--zloto2)">★ ${ocena(f.oc)}</b><span>${glosy(f.v)} głosów</span></div>
        <div class="fakt"><b>${f.y}</b><span>rok premiery</span></div>
        <div class="fakt"><b>${czas(f.min)}</b><span>długość</span></div>
      </div>
      <div class="gatunki">${f.g.map((g) => `<span>${esc(g)}</span>`).join('')}</div>
      <div class="razem-pasek${d && k ? ' widac' : ''}" id="razemPasek">Obejrzany przez oboje</div>
      <div class="kto">
        <button type="button" class="d" data-os="d" aria-pressed="${d}"><span class="lit"><em>D</em></span>${OSOBY.d}</button>
        <button type="button" class="k" data-os="k" aria-pressed="${k}"><span class="lit"><em>K</em></span>${OSOBY.k}</button>
      </div>
      <p class="notka" id="daty">${opisDat(daty)}</p>
      <div class="dwa" style="margin-top:14px">
        <a class="przycisk" href="https://www.imdb.com/title/${f.id}/" target="_blank" rel="noopener" style="text-decoration:none">Otwórz w IMDb</a>
        <button class="przycisk" type="button" data-zamknij>Zamknij</button>
      </div>`;
    otworz($('#arkFilm'));
  }
  function opisDat(r) {
    const fmt = (s) => new Date(s + 'T12:00:00').toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
    const cz = [];
    if (r.d && /^\d{4}-/.test(r.d)) cz.push(`${OSOBY.d}: odhaczone ${fmt(r.d)}`);
    if (r.k && /^\d{4}-/.test(r.k)) cz.push(`${OSOBY.k}: odhaczone ${fmt(r.k)}`);
    return cz.length ? cz.join(' · ') : 'Nikt z was jeszcze nie odhaczył tego filmu.';
  }

  function odswiezKarte(id) {
    const li = lista.querySelector(`[data-id="${id}"]`);
    const d = widzial(id, 'd'), k = widzial(id, 'k');
    if (li) {
      li.classList.toggle('d', d);
      li.classList.toggle('k', k);
      li.querySelector('.os.d').setAttribute('aria-pressed', d);
      li.querySelector('.os.k').setAttribute('aria-pressed', k);
    }
    return { li, d, k };
  }

  function obsluzPrzelaczenie(id, o) {
    const przed = widzial(id, 'd') && widzial(id, 'k');
    const teraz = przelacz(id, o);
    const { li, d, k } = odswiezKarte(id);
    if (!przed && d && k && li) {
      li.classList.remove('blysk'); void li.offsetWidth; li.classList.add('blysk');
      const f = filmy.find((x) => x.id === id);
      toast(`Razem: ${tytul(f)}`);
    } else if (teraz) {
      toast(`${OSOBY[o]} – odhaczone`);
    }
    statystyki();
    rysujCzipyKto(); // liczniki; sama lista zostaje, żeby karta nie znikała spod palca
    if (otwartyId === id && $('#arkFilm').open) {
      $('#filmTresc').querySelectorAll('[data-os]').forEach((b) => b.setAttribute('aria-pressed', widzial(id, b.dataset.os)));
      $('#razemPasek').classList.toggle('widac', d && k);
      $('#daty').textContent = opisDat(w(id));
    }
  }

  // ---------- arkusze ----------
  function otworz(dlg) {
    if (!dlg.open) dlg.showModal();
  }
  document.querySelectorAll('dialog.arkusz').forEach((dlg) => {
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg || e.target.closest('[data-zamknij]')) dlg.close();
    });
    dlg.addEventListener('close', () => { if (dlg.id === 'arkFilm') otwartyId = null; });
  });

  // ---------- toast ----------
  let tId;
  function toast(t) {
    const el = $('#toast');
    el.textContent = t;
    el.classList.add('widac');
    clearTimeout(tId);
    tId = setTimeout(() => el.classList.remove('widac'), 1800);
  }

  // ---------- zdarzenia ----------
  lista.addEventListener('click', (e) => {
    const li = e.target.closest('.film');
    if (!li) return;
    const os = e.target.closest('[data-os]');
    if (os) obsluzPrzelaczenie(li.dataset.id, os.dataset.os);
    else pokazFilm(li.dataset.id);
  });
  $('#filmTresc').addEventListener('click', (e) => {
    const os = e.target.closest('[data-os]');
    if (os && otwartyId) obsluzPrzelaczenie(otwartyId, os.dataset.os);
  });

  const pole = $('#szukaj');
  let qId;
  pole.addEventListener('input', () => {
    $('#pole').classList.toggle('ma', !!pole.value);
    clearTimeout(qId);
    qId = setTimeout(() => { widok.q = pole.value; rysujListe(); }, 120);
  });
  $('#czysc').addEventListener('click', (e) => {
    e.preventDefault();
    pole.value = ''; widok.q = ''; $('#pole').classList.remove('ma'); rysujListe(); pole.focus();
  });

  function ustawKto(e) {
    const b = e.target.closest('.czip');
    if (!b) return;
    widok.kto = widok.kto === b.dataset.v ? 'wszystkie' : b.dataset.v;
    rysujListe();
    window.scrollTo({ top: Math.min(window.scrollY, $('.narzedzia').offsetTop), behavior: 'smooth' });
  }
  $('#czipyKto').addEventListener('click', ustawKto);
  $('#fKto').addEventListener('click', ustawKto);

  function przelaczZbior(zbior, v) { zbior.has(v) ? zbior.delete(v) : zbior.add(v); }
  $('#fDekada').addEventListener('click', (e) => { const b = e.target.closest('.czip'); if (!b) return; przelaczZbior(widok.dekady, +b.dataset.v); rysujFiltry(); rysujListe(); });
  $('#fGatunek').addEventListener('click', (e) => { const b = e.target.closest('.czip'); if (!b) return; przelaczZbior(widok.gatunki, b.dataset.v); rysujFiltry(); rysujListe(); });
  $('#fDlugosc').addEventListener('click', (e) => { const b = e.target.closest('.czip'); if (!b) return; przelaczZbior(widok.dlugosc, b.dataset.v); rysujFiltry(); rysujListe(); });
  $('#sort').addEventListener('change', (e) => { widok.sort = e.target.value; rysujListe(); });
  $('#fTytuly').addEventListener('click', (e) => { const b = e.target.closest('.czip'); if (!b) return; stan.tytuly = b.dataset.v; zapisz(); rysujFiltry(); rysujListe(); });

  function wyczyscWszystko() {
    widok.q = ''; pole.value = ''; $('#pole').classList.remove('ma');
    widok.kto = 'wszystkie'; widok.dekady.clear(); widok.gatunki.clear(); widok.dlugosc.clear(); widok.sort = 'r';
    rysujFiltry(); rysujListe();
  }
  $('#fWyczysc').addEventListener('click', wyczyscWszystko);
  $('#resetFiltry').addEventListener('click', wyczyscWszystko);
  $('#pustoReset').addEventListener('click', wyczyscWszystko);
  $('#otworzFiltry').addEventListener('click', () => { rysujFiltry(); rysujCzipyKto(); otworz($('#arkFiltry')); });
  $('#otworzUstawienia').addEventListener('click', () => { rysujFiltry(); otworz($('#arkUst')); });

  $('#losuj').addEventListener('click', () => {
    let pula = przefiltrowane();
    if (widok.kto === 'wszystkie') {
      const nieRazem = pula.filter((f) => !(widzial(f.id, 'd') && widzial(f.id, 'k')));
      if (nieRazem.length) pula = nieRazem; // domyślnie losuj spośród tych, których nie widzieliście razem
    }
    if (!pula.length) { toast('Brak filmów do losowania'); return; }
    const f = pula[Math.floor(Math.random() * pula.length)];
    pokazFilm(f.id);
  });

  // ---------- kopia zapasowa ----------
  $('#eksport').addEventListener('click', () => {
    const dane = { aplikacja: 'Movies', wersja: 1, zapisano: new Date().toISOString(), osoby: OSOBY, widzieli: stan.widzieli,
      tytuly: Object.fromEntries(Object.keys(stan.widzieli).map((id) => [id, (filmy.find((f) => f.id === id) || {}).t || ''])) };
    const blob = new Blob([JSON.stringify(dane, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `movies-kopia-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('Kopia zapisana w Pobranych');
  });
  $('#importBtn').addEventListener('click', () => $('#importPlik').click());
  $('#importPlik').addEventListener('change', async (e) => {
    const plik = e.target.files[0];
    e.target.value = '';
    if (!plik) return;
    try {
      const dane = JSON.parse(await plik.text());
      if (!dane || typeof dane.widzieli !== 'object') throw new Error('zły plik');
      const czyste = {};
      for (const [id, r] of Object.entries(dane.widzieli)) {
        if (!/^tt\d+$/.test(id) || !r || typeof r !== 'object') continue;
        const x = {};
        if (r.d) x.d = typeof r.d === 'string' ? r.d.slice(0, 10) : '1';
        if (r.k) x.k = typeof r.k === 'string' ? r.k.slice(0, 10) : '1';
        if (x.d || x.k) czyste[id] = x;
      }
      const n = Object.keys(czyste).length;
      const tryb = confirm(`W kopii jest ${n} ${odm(n, ['film', 'filmy', 'filmów'])} z odhaczeniami.\n\nOK – zastąp obecny postęp kopią.\nAnuluj – połącz (dodaj odhaczenia z kopii do obecnych).`);
      if (tryb) stan.widzieli = czyste;
      else for (const [id, r] of Object.entries(czyste)) stan.widzieli[id] = { ...(stan.widzieli[id] || {}), ...r };
      zapisz(); synchWszystko(); statystyki(); rysujListe(true);
      toast(tryb ? 'Postęp wczytany z kopii' : 'Kopia dołączona');
    } catch (err) {
      toast('To nie jest plik kopii Movies');
    }
  });
  $('#wyzeruj').addEventListener('click', () => {
    if (!confirm('Na pewno wyzerować cały postęp Daniela i Kasi? (Najpierw warto zapisać kopię.)')) return;
    stan.widzieli = {}; zapisz(); synchWszystko(); statystyki(); rysujListe(); toast('Postęp wyzerowany');
  });

  // ---------- synchronizacja (wspólna lista w Firebase) ----------
  // Odhaczenia leżą w bazie pod długim, losowym kodem listy. Każde urządzenie z tym kodem widzi to samo, na bieżąco.
  const BAZA = 'https://kino250-52b93-default-rtdb.europe-west1.firebasedatabase.app/kino250';
  const ZNAKI = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let zrodlo = null, synchStan = 'wyl', zalegle = false, rysujPozniej = null;

  const adres = (sciezka = '') => `${BAZA}/${stan.pokoj}/widzieli${sciezka}.json`;
  const nowyKod = () => {
    const los = crypto.getRandomValues(new Uint8Array(24));
    return Array.from(los, (b) => ZNAKI[b % ZNAKI.length]).join('').match(/.{4}/g).join('-');
  };
  const czystyKod = (s) => (String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').match(/.{1,4}/g) || []).join('-');
  const linkListy = () => `${location.origin}${location.pathname}#lista=${stan.pokoj}`;

  function czystyRekord(r) {
    if (!r || typeof r !== 'object') return null;
    const x = {};
    if (r.d) x.d = String(r.d).slice(0, 10);
    if (r.k) x.k = String(r.k).slice(0, 10);
    return x.d || x.k ? x : null;
  }
  function czysteWszystko(obj) {
    const out = {};
    for (const [id, r] of Object.entries(obj || {})) { const x = czystyRekord(r); if (/^tt\d+$/.test(id) && x) out[id] = x; }
    return out;
  }
  async function wyslij(sciezka, dane) {
    const r = await fetch(adres(sciezka), { method: 'PUT', body: JSON.stringify(dane) });
    if (!r.ok) throw new Error(r.status);
  }
  function synchFilm(id) {
    if (!stan.pokoj) return;
    wyslij('/' + id, stan.widzieli[id] || null).catch(() => { zalegle = true; ustawStan('blad'); });
  }
  function synchWszystko() {
    if (!stan.pokoj) return;
    wyslij('', stan.widzieli).then(() => { zalegle = false; }).catch(() => { zalegle = true; ustawStan('blad'); });
  }

  // Zmiana przyszła z bazy (z innego urządzenia albo pierwszy odczyt).
  function zastosuj(sciezka, dane) {
    const cz = sciezka.split('/').filter(Boolean);
    if (!cz.length) { stan.widzieli = czysteWszystko(dane); return; }
    const rek = cz.length === 1 ? dane : { ...(stan.widzieli[cz[0]] || {}), [cz[1]]: dane };
    const x = czystyRekord(rek);
    if (x) stan.widzieli[cz[0]] = x; else delete stan.widzieli[cz[0]];
  }
  function poZmianieZBazy() {
    zapisz();
    clearTimeout(rysujPozniej);
    rysujPozniej = setTimeout(() => {
      statystyki(); rysujListe(true);
      if (otwartyId && $('#arkFilm').open) pokazFilm(otwartyId);
    }, 60);
  }

  function rozlacz() {
    if (zrodlo) { zrodlo.close(); zrodlo = null; }
  }
  function nasluchuj() {
    rozlacz();
    if (!stan.pokoj) { ustawStan('wyl'); return; }
    ustawStan('laczy');
    zrodlo = new EventSource(adres());
    const obsluz = (typ) => (e) => {
      let m; try { m = JSON.parse(e.data); } catch (err) { return; }
      if (!m) return;
      // Zmiany zrobione bez internetu mają pierwszeństwo – wysyłamy je zamiast przyjmować stan z bazy.
      if (zalegle && typ === 'put' && m.path === '/') { synchWszystko(); ustawStan('ok'); return; }
      if (typ === 'put') zastosuj(m.path, m.data);
      else for (const [k, v] of Object.entries(m.data || {})) zastosuj(`${m.path.replace(/\/$/, '')}/${k}`, v);
      ustawStan('ok');
      poZmianieZBazy();
    };
    zrodlo.addEventListener('put', obsluz('put'));
    zrodlo.addEventListener('patch', obsluz('patch'));
    zrodlo.addEventListener('cancel', () => { ustawStan('blad'); rozlacz(); });
    zrodlo.onerror = () => ustawStan('blad'); // EventSource sam spróbuje ponownie
  }

  // Pierwsze podłączenie urządzenia: łączymy to, co jest tu, z tym, co jest w bazie (nic nie ginie).
  async function dolacz(kod, nowa) {
    rozlacz();
    stan.pokoj = kod; zapisz();
    ustawStan('laczy');
    try {
      let zdalne = {};
      if (!nowa) {
        const r = await fetch(adres());
        if (!r.ok) throw new Error(r.status);
        zdalne = czysteWszystko(await r.json());
      }
      const razem = { ...zdalne };
      for (const [id, r] of Object.entries(stan.widzieli)) {
        const z = razem[id] || {};
        const x = {};
        for (const o of ['d', 'k']) { const a = r[o], b = z[o]; if (a || b) x[o] = a && b ? (a < b ? a : b) : a || b; }
        razem[id] = x;
      }
      stan.widzieli = czysteWszystko(razem);
      await wyslij('', stan.widzieli);
      zalegle = false;
      poZmianieZBazy();
      nasluchuj();
      toast(nowa ? 'Wspólna lista utworzona' : 'Połączono ze wspólną listą');
    } catch (err) {
      zalegle = true;
      nasluchuj();
      ustawStan('blad');
      toast('Brak połączenia – spróbuję ponownie, gdy wróci internet');
    }
  }

  function ustawStan(s) { synchStan = s; rysujSynch(); }
  function rysujSynch() {
    const box = $('#synchBox');
    if (!box) return;
    if (!stan.pokoj) {
      box.innerHTML = `<p class="notka" style="margin:0 0 10px">Odhaczenia są teraz tylko na tym urządzeniu. Włącz wspólną listę, żeby telefon, komputer i telefon Kasi widziały to samo.</p>
        <div class="dwa"><button class="przycisk glowny" type="button" id="synchNowa">Utwórz wspólną listę</button><button class="przycisk" type="button" id="synchDolacz">Mam kod listy</button></div>`;
      $('#synchNowa').onclick = () => dolacz(nowyKod(), true);
      $('#synchDolacz').onclick = () => {
        const kod = czystyKod(prompt('Wklej kod wspólnej listy (z drugiego urządzenia):'));
        if (kod.replace(/-/g, '').length < 20) { if (kod) toast('To nie wygląda na kod listy'); return; }
        dolacz(kod, false);
      };
      return;
    }
    const opis = { ok: 'Zsynchronizowano', laczy: 'Łączę…', blad: 'Brak połączenia – zmiany wyślę później', wyl: '' }[synchStan];
    box.innerHTML = `<div class="synch-stan ${synchStan}"><i></i>${opis}</div>
      <div class="synch-kod">${esc(stan.pokoj)}</div>
      <div class="dwa"><button class="przycisk glowny" type="button" id="synchLink">Wyślij link</button><button class="przycisk" type="button" id="synchKopiuj">Kopiuj kod</button></div>
      <p class="notka">Na drugim urządzeniu otwórz wysłany link albo wybierz tam „Mam kod listy” i wklej kod. Kod działa jak klucz – dawaj go tylko domownikom.</p>
      <button class="przycisk ostrzez" type="button" id="synchOdlacz" style="width:100%;margin-top:10px">Odłącz to urządzenie</button>`;
    const kopiuj = (t, ok) => {
      if (navigator.clipboard) navigator.clipboard.writeText(t).then(() => toast(ok), () => prompt('Skopiuj:', t));
      else prompt('Skopiuj:', t);
    };
    $('#synchKopiuj').onclick = () => kopiuj(stan.pokoj, 'Kod skopiowany');
    $('#synchLink').onclick = () => {
      if (navigator.share) navigator.share({ title: 'Movies – wspólna lista', url: linkListy() }).catch(() => {});
      else kopiuj(linkListy(), 'Link skopiowany');
    };
    $('#synchOdlacz').onclick = () => {
      if (!confirm('Odłączyć to urządzenie od wspólnej listy? Odhaczenia zostaną tutaj, ale przestaną się synchronizować.')) return;
      rozlacz(); delete stan.pokoj; zapisz(); ustawStan('wyl');
    };
  }

  window.addEventListener('online', () => { if (stan.pokoj && (zalegle || !zrodlo || zrodlo.readyState === 2)) nasluchuj(); });

  function startSynch() {
    const m = location.hash.match(/lista=([A-Za-z0-9-]{20,})/);
    if (m) {
      history.replaceState(null, '', location.pathname + location.search);
      const kod = czystyKod(m[1]);
      if (kod !== stan.pokoj && confirm('Połączyć to urządzenie ze wspólną listą Movies? Twoje obecne odhaczenia zostaną do niej dołączone.')) { dolacz(kod, false); return; }
    }
    if (stan.pokoj) nasluchuj(); else rysujSynch();
  }

  // ---------- instalacja ----------
  let prosba = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); prosba = e; $('#instaluj').classList.add('widac'); });
  $('#instaluj').addEventListener('click', async () => {
    if (!prosba) return;
    prosba.prompt();
    await prosba.userChoice.catch(() => null);
    prosba = null; $('#instaluj').classList.remove('widac');
  });
  window.addEventListener('appinstalled', () => { $('#instaluj').classList.remove('widac'); toast('Zainstalowano Movies'); });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  // ---------- start ----------
  function wczytajListe() {
    lista.innerHTML = '<li class="pusto"><strong>Wczytuję listę…</strong></li>';
    const stoper = new AbortController();
    const limit = setTimeout(() => stoper.abort(), 12000);
    fetch('filmy.json', { signal: stoper.signal })
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((dane) => {
      meta = dane;
      filmy = dane.filmy.map((f) => ({ ...f, _szuk: norm([f.t, f.o || '', f.g.join(' ')].join(' ')) }));
      const data = new Date(dane.pobrano + 'T12:00:00').toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
      $('#oDanych').textContent = `Lista: ${dane.zrodlo}, stan na ${data}. Tytuły polskie i gatunki według IMDb. Postęp jest zapisany pod numerami filmów z IMDb, więc przetrwa przyszłą aktualizację listy.`;
      rysujFiltry();
      statystyki();
      rysujListe();
      startSynch();
    })
    .catch(() => {
      lista.innerHTML = '<li class="pusto"><strong>Nie udało się wczytać listy</strong>Sprawdź internet i spróbuj jeszcze raz – potem działa też offline.<button type="button" class="ponow" id="ponow">Spróbuj ponownie</button></li>';
      $('#ponow').addEventListener('click', wczytajListe);
    })
    .finally(() => clearTimeout(limit));
  }
  wczytajListe();
})();
