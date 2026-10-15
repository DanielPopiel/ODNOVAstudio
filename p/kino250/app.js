/* Kino 250 – lista IMDb Top 250 do odhaczania we dwoje (Daniel i Kasia). Wszystko lokalnie, działa offline. */
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
    return `<div class="kafel${f.r >= 100 ? ' dlugi' : ''}" style="--h:${hue(f.y)}" aria-hidden="true"><div class="nr"><small>#</small>${f.r}</div><div class="rok">${f.y}</div></div>`;
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
        <div class="meta"><span class="ocena">${IKONA_GW}${ocena(f.oc)}</span><span>${czas(f.min)}</span><span class="gat">${esc(f.g.join(' · '))}</span></div>
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

  function rysujListe() {
    const wynik = przefiltrowane();
    lista.innerHTML = wynik.map(htmlFilmu).join('');
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
    const n = filmy.length || 250;
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
      ? '<b>Wszystkie 250 obejrzane razem.</b> Szacunek.'
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
    const dane = { aplikacja: 'Kino 250', wersja: 1, zapisano: new Date().toISOString(), osoby: OSOBY, widzieli: stan.widzieli,
      tytuly: Object.fromEntries(Object.keys(stan.widzieli).map((id) => [id, (filmy.find((f) => f.id === id) || {}).t || ''])) };
    const blob = new Blob([JSON.stringify(dane, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `kino250-kopia-${new Date().toISOString().slice(0, 10)}.json`;
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
      zapisz(); statystyki(); rysujListe();
      toast(tryb ? 'Postęp wczytany z kopii' : 'Kopia dołączona');
    } catch (err) {
      toast('To nie jest plik kopii Kino 250');
    }
  });
  $('#wyzeruj').addEventListener('click', () => {
    if (!confirm('Na pewno wyzerować cały postęp Daniela i Kasi? (Najpierw warto zapisać kopię.)')) return;
    stan.widzieli = {}; zapisz(); statystyki(); rysujListe(); toast('Postęp wyzerowany');
  });

  // ---------- instalacja ----------
  let prosba = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); prosba = e; $('#instaluj').classList.add('widac'); });
  $('#instaluj').addEventListener('click', async () => {
    if (!prosba) return;
    prosba.prompt();
    await prosba.userChoice.catch(() => null);
    prosba = null; $('#instaluj').classList.remove('widac');
  });
  window.addEventListener('appinstalled', () => { $('#instaluj').classList.remove('widac'); toast('Zainstalowano Kino 250'); });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  // ---------- start ----------
  fetch('filmy.json')
    .then((r) => r.json())
    .then((dane) => {
      meta = dane;
      filmy = dane.filmy.map((f) => ({ ...f, _szuk: norm([f.t, f.o || '', f.g.join(' ')].join(' ')) }));
      const data = new Date(dane.pobrano + 'T12:00:00').toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
      $('#oDanych').textContent = `Lista: ${dane.zrodlo}, stan na ${data}. Tytuły polskie i gatunki według IMDb. Postęp jest zapisany pod numerami filmów z IMDb, więc przetrwa przyszłą aktualizację listy.`;
      rysujFiltry();
      statystyki();
      rysujListe();
    })
    .catch(() => {
      lista.innerHTML = '<li class="pusto"><strong>Nie udało się wczytać listy</strong>Otwórz aplikację raz z internetem – potem działa offline.</li>';
    });
})();
