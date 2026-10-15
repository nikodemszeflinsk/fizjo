/*
 * Panel gabinetu — szkielet aplikacji.
 *
 * Szyna z zakładkami po lewej (jak w poprzednim panelu), górny pasek z wyszukiwarką
 * i rezerwacją, widoki pod adresami #/nazwa. Każdy widok rejestruje się w PANEL.widoki
 * w osobnym pliku. Pola formularzy wiążą się z danymi przez atrybut data-pf="cms:ścieżka"
 * albo data-pf="rez:ścieżka", więc widoki nie muszą obsługiwać każdego pola osobno.
 */
(() => {
  'use strict';

  const K = window.KAL;
  const P = window.PANEL;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  P.$ = $;
  P.$$ = $$;
  P.esc = K.esc;
  P.widoki = {};
  P.akcje = {};
  P.aktualny = null;

  /* ── Ikony (kreska 1.6, jak w poprzednim panelu) ──────────────────── */
  const IK = {
    pulpit: 'M3 10h3l2-5 4 10 2-5h3',
    kalendarz: 'M4 6.5h12v9.5H4zM4 9.5h12M7.5 4v4M12.5 4v4',
    rezerwacje: 'M5 4.5h10v11H5zM7.5 8h5M7.5 11h5M7.5 14h3',
    pacjenci: 'M8 9.5a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6ZM3 16c.6-2.8 2.7-4.3 5-4.3s4.4 1.5 5 4.3M13.5 9.2a2.3 2.3 0 1 0-.8-4.4M14.5 11.9c1.4.4 2.3 1.6 2.6 3.6',
    dostepnosc: 'M10 16.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13ZM10 6.5V10l2.5 1.6',
    grafik: 'M3.5 4.5h13v11h-13zM3.5 8h13M8 4.5v11M3.5 11.7h13',
    uslugi: 'M4 5h12M4 10h12M4 15h7M14.5 13.5l1.5 1.5 2.5-3',
    zespol: 'M7 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM13.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM2.5 16c.5-2.4 2.2-3.8 4.5-3.8s4 1.4 4.5 3.8M9.5 16c.5-2.4 1.8-3.8 4-3.8s3.6 1.4 4 3.8',
    lokalizacje: 'M10 17s5.5-5 5.5-9.2a5.5 5.5 0 0 0-11 0C4.5 12 10 17 10 17ZM10 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
    strona: 'M3.5 4.5h13v11h-13zM3.5 7.5h13M6 6h.01M8 6h.01M6.5 10.5h7M6.5 13h4',
    formularz: 'M5 3.5h10v13H5zM7.5 7h5M7.5 10h5M7.5 13h2.5',
    powiadomienia: 'M5.5 13.5V9a4.5 4.5 0 0 1 9 0v4.5l1.5 1.5h-12zM8.5 16.5a1.5 1.5 0 0 0 3 0',
    platnosci: 'M3 6h14v9H3zM3 9h14M6 12.5h3',
    statystyki: 'M4 16V9M8 16V5M12 16v-5M16 16V7',
    ustawienia: 'M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4',
    plus: 'M10 4.5v11M4.5 10h11',
    strzalka: 'M4 10h11m-4-4 4 4-4 4',
    zew: 'M8 4.5H4.5v11h11V12M11 4h5v5M16 4l-7 7',
    ok: 'M4.5 10.5l3.5 3.5 7.5-8',
    uwaga: 'M10 3l7.5 13h-15zM10 8v4M10 14.5v.01',
    gora: 'M10 15V5M5.5 9.5 10 5l4.5 4.5',
    dol: 'M10 5v10M5.5 10.5 10 15l4.5-4.5',
    kosz: 'M5 6h10M8 6V4.5h4V6M6.5 6l.7 10h5.6l.7-10',
    kopiuj: 'M7 7h8.5v9H7zM4.5 13V4h8.5',
    oko: 'M2.5 10s3-5.5 7.5-5.5 7.5 5.5 7.5 5.5-3 5.5-7.5 5.5S2.5 10 2.5 10ZM10 12.3a2.3 2.3 0 1 0 0-4.6 2.3 2.3 0 0 0 0 4.6Z',
    telefon: 'M6 3.5h3l1 3.5-2 1.2a8 8 0 0 0 3.8 3.8l1.2-2 3.5 1v3c0 .8-.7 1.5-1.5 1.5A12 12 0 0 1 4.5 5c0-.8.7-1.5 1.5-1.5Z',
    mail: 'M3.5 5.5h13v9h-13zM3.5 6l6.5 5 6.5-5',
  };
  P.ikona = (n, klasa = '') => `<svg class="p-ik ${klasa}" viewBox="0 0 20 20" aria-hidden="true"><path d="${IK[n] || ''}" /></svg>`;

  /* ── Menu ──────────────────────────────────────────────────────────── */
  P.MENU = () => [
    { grupa: null, poz: [['pulpit', 'Dziś'], ['kalendarz', 'Kalendarz'], ['rezerwacje', 'Rezerwacje']] },
    { grupa: 'Gabinet', poz: [['dostepnosc', 'Dostępność'], ['uslugi', 'Usługi i ceny'], ['zespol', P.ent() ? 'Zespół' : 'Mój profil'], ['lokalizacje', P.ent() ? 'Lokalizacje' : 'Miejsca przyjęć'], ['ustawienia', 'Ustawienia']] },
  ];
  function liczbaUwagi() {
    const D = P.D();
    const d0 = K.iso(K.dodaj(new Date(), -2));
    return D.rezerwacje.filter((r) => (r.nowa && !K.minelo(r.data, r.od)) || (r.zmiana && !r.zmiana.widziana) || r.status === 'oczekuje' || (r.data >= d0 && r.status === 'potwierdzona' && K.minelo(r.data, r.od + r.dl))).length;
  }
  P.liczbaUwagi = liczbaUwagi;
  function renderMenu() {
    const odznaki = { kalendarz: liczbaUwagi() };
    $('#p-menu').innerHTML = P.MENU().map((g) => `
      ${g.grupa ? `<p class="p-rail__grupa">${g.grupa}</p>` : ''}
      <ul>${g.poz.map(([id, nazwa]) => `<li><a class="p-rail__btn" href="#/${id}" ${P.aktualny === id ? 'aria-current="page"' : ''}>${P.ikona(id)}<span>${nazwa}</span>${odznaki[id] ? `<i class="p-rail__odznaka" title="Wymaga uwagi">${odznaki[id]}</i>` : ''}</a></li>`).join('')}</ul>`).join('');
    $$('[data-pakiet]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pakiet === P.tryb())));
    const C = P.C();
    $('#p-nazwa').textContent = C.nazwa;
    const wl = C.konto.wlasciciel;
    $('#p-kto').innerHTML = `${P.esc(wl)}<em>${P.ent() ? 'właściciel' : 'Twoje konto'}</em>`;
    $('#p-awatar').textContent = wl.split(' ').map((x) => x[0]).join('').slice(0, 2);
    if (P.poMenu) P.poMenu();
  }

  /* ── Router ────────────────────────────────────────────────────────── */
  function trasa() {
    const h = location.hash.replace(/^#\/?/, '');
    const [id, ...reszta] = h.split('/');
    const znany = P.widoki[id] || id === 'kalendarz' ? id : 'pulpit';
    /* Konto terapeuty nie ma dostępu do zakładek właściciela. */
    return { id: P.dostep && !P.dostep(znany) ? 'pulpit' : znany, arg: reszta.join('/') };
  }
  P.idz = (sciezka) => { if (location.hash === `#/${sciezka}`) pokaz(); else location.hash = `#/${sciezka}`; };
  function pokaz() {
    const { id, arg } = trasa();
    const zmiana = P.aktualny !== id;
    P.aktualny = id;
    P.arg = arg;
    zamknijMenuMobilne();
    if (zmiana) { P.zamknij(false); window.KAL_UI.zamknijSzuflade(); }
    if (id === 'kalendarz') {
      $('#p-kalendarz').hidden = false;
      $('#p-inne').hidden = true;
      $('#p-tytul').textContent = 'Kalendarz';
      $('#p-podtytul').textContent = 'Wizyty, wolne godziny i blokady. Kliknij termin albo przeciągnij po godzinach.';
      window.KAL_UI.render();
    } else {
      $('#p-kalendarz').hidden = true;
      $('#p-inne').hidden = false;
      renderWidok(zmiana);
    }
    renderMenu();
    document.title = `${$('#p-tytul').textContent} · Panel gabinetu`;
    if (zmiana) { window.scrollTo(0, 0); $('#p-tresc').focus({ preventScroll: true }); }
  }
  /** Zapamiętuje, które pole miało fokus, żeby po odświeżeniu wrócić do niego. */
  function selektorFokusu(kontener) {
    const a = document.activeElement;
    if (!a || !kontener.contains(a)) return null;
    /* Pola formularzy mają generowane id, więc najpierw szukamy po ścieżce danych. */
    if (a.dataset.pf) return `[data-pf="${a.dataset.pf}"]`;
    if (a.id) return `#${CSS.escape(a.id)}`;
    if (a.dataset.pa) return `[data-pa="${a.dataset.pa}"]${a.dataset.id ? `[data-id="${a.dataset.id}"]` : ''}`;
    return null;
  }
  function renderWidok(nowy) {
    const w = P.widoki[P.aktualny];
    const el = $('#p-inne');
    const fokus = nowy ? null : selektorFokusu(el);
    const a = document.activeElement;
    const zaznaczenie = fokus && a && typeof a.selectionStart === 'number' ? [a.selectionStart, a.selectionEnd] : null;
    const przew = window.scrollY;
    $('#p-tytul').textContent = typeof w.tytul === 'function' ? w.tytul() : w.tytul;
    $('#p-podtytul').textContent = typeof w.podtytul === 'function' ? w.podtytul() : w.podtytul || '';
    el.innerHTML = w.render(P.arg);
    if (w.po) w.po(el, P.arg);
    if (!nowy) {
      window.scrollTo(0, przew);
      if (fokus) {
        const f = $(fokus, el);
        if (f) { f.focus({ preventScroll: true }); if (zaznaczenie && typeof f.setSelectionRange === 'function') try { f.setSelectionRange(...zaznaczenie); } catch { /* pole bez zaznaczenia */ } }
      }
    }
  }
  /** Odświeża bieżący widok po zmianie danych (bez gubienia przewinięcia i fokusu). */
  P.odswiez = () => {
    if (!P.aktualny) return;
    if (P.aktualny === 'kalendarz') window.KAL_UI.render();
    else renderWidok(false);
    renderMenu();
    if (P.szuflada && P.szuflada.odswiez) P.szuflada.odswiez();
  };
  let cichy = false;
  /* Pacjent zmienił wizytę na stronie w innej karcie: kalendarz już wczytał nowy stan, my odświeżamy widok. */
  window.addEventListener('storage', (e) => { if (e.key === 'kalendarz-demo-v4' && P.aktualny) P.odswiez(); });
  document.addEventListener('kal:zmiana', () => {
    if (cichy || !P.aktualny) return;
    clearTimeout(P._odsw);
    P._odsw = setTimeout(P.odswiez, 0);
  });
  P.cichoRez = (fn) => { cichy = true; fn(P.D()); window.KAL_UI.zapisz(); cichy = false; };

  /* ── Szuflada panelu ───────────────────────────────────────────────── */
  P.szuflada = null;
  /**
   * Otwiera szufladę z formularzem. `budowa` zwraca HTML (wywoływana ponownie przy odświeżeniu),
   * `po` podpina zachowanie po każdym renderze.
   */
  P.otworz = (budowa, { po, szeroka } = {}) => {
    window.KAL_UI.zamknijSzuflade();
    const el = $('#p-szuflada');
    if (!P.szuflada) P.fokusPrzed = document.activeElement;
    const s = (P.szuflada = {
      odswiez: () => {
        const tresc = $('#p-szuflada-tresc');
        const f = selektorFokusu(tresc);
        const przew = tresc.scrollTop;
        tresc.innerHTML = budowa();
        if (po) po(tresc);
        tresc.scrollTop = przew;
        if (f) { const x = $(f, tresc); if (x) x.focus({ preventScroll: true }); }
      },
    });
    el.classList.toggle('p-szuflada--szeroka', !!szeroka);
    el.hidden = false;
    document.body.classList.add('ma-szuflade');
    $('#p-tlo').hidden = !matchMedia('(max-width: 700px)').matches;
    $('#p-szuflada-tresc').innerHTML = budowa();
    if (po) po($('#p-szuflada-tresc'));
    $('#p-szuflada-tresc').scrollTop = 0;
    const f = $('#p-szuflada-tresc [data-fokus]') || $('#p-szuflada-tytul');
    if (f) f.focus({ preventScroll: true });
    return s;
  };
  P.zamknij = (fokus = true) => {
    if (!P.szuflada) return;
    P.szuflada = null;
    $('#p-szuflada').hidden = true;
    $('#p-tlo').hidden = true;
    document.body.classList.remove('ma-szuflade');
    if (fokus && P.fokusPrzed && document.contains(P.fokusPrzed)) P.fokusPrzed.focus();
  };
  P.naglowek = (tytul, pod) => `<header class="sz__g"><div><h2 id="p-szuflada-tytul" tabindex="-1">${tytul}</h2>${pod ? `<p>${pod}</p>` : ''}</div><button type="button" class="ikona" data-pa="zamknij" aria-label="Zamknij panel">×</button></header>`;

  /* ── Drobne elementy interfejsu ────────────────────────────────────── */
  let licznikId = 0;
  P.uid = (pref = 'p') => `${pref}-${++licznikId}`;
  /** Pole tekstowe związane z danymi. */
  P.pole = ({ etykieta, pf, wartosc, typ = 'text', pod = '', placeholder = '', wiersze = 0, licznik = 0, id, atr = '', klasa = '' }) => {
    const i = id || P.uid();
    const w = P.esc(wartosc == null ? '' : wartosc);
    const licz = licznik ? `<span class="p-licznik" data-licznik-dla="${i}" data-max="${licznik}">${String(wartosc || '').length} / ${licznik}</span>` : '';
    const kontrolka = wiersze
      ? `<textarea id="${i}" rows="${wiersze}" ${pf ? `data-pf="${pf}"` : ''} placeholder="${P.esc(placeholder)}" ${atr}>${w}</textarea>`
      : `<input id="${i}" type="${typ}" value="${w}" ${pf ? `data-pf="${pf}"` : ''} ${typ === 'number' ? 'data-typ="liczba"' : ''} placeholder="${P.esc(placeholder)}" ${atr} />`;
    return `<div class="pole ${klasa}"><label for="${i}">${etykieta}${licz}</label>${kontrolka}${pod ? `<p class="pod">${pod}</p>` : ''}</div>`;
  };
  P.wybor = ({ etykieta, pf, wartosc, opcje, pod = '', id, atr = '' }) => {
    const i = id || P.uid();
    return `<div class="pole"><label for="${i}">${etykieta}</label><select id="${i}" ${pf ? `data-pf="${pf}"` : ''} ${atr}>${opcje.map(([v, n]) => `<option value="${P.esc(v)}"${String(v) === String(wartosc) ? ' selected' : ''}>${P.esc(n)}</option>`).join('')}</select>${pod ? `<p class="pod">${pod}</p>` : ''}</div>`;
  };
  /** Przełącznik wł./wył. związany z danymi. */
  P.przelacznik = ({ etykieta, pf, wartosc, pod = '', atr = '' }) => {
    const i = P.uid();
    return `<div class="p-sw"><input type="checkbox" role="switch" id="${i}" ${pf ? `data-pf="${pf}"` : ''}${wartosc ? ' checked' : ''} ${atr} /><label for="${i}"><span class="p-sw__tor" aria-hidden="true"></span><span class="p-sw__tekst">${etykieta}${pod ? `<small>${pod}</small>` : ''}</span></label></div>`;
  };
  P.karta = (tytul, tresc, { klasa = '', akcje = '', pod = '' } = {}) => `<section class="p-karta ${klasa}">${tytul ? `<header class="p-karta__g"><div><h2>${tytul}</h2>${pod ? `<p>${pod}</p>` : ''}</div>${akcje ? `<div class="p-karta__akcje">${akcje}</div>` : ''}</header>` : ''}${tresc}</section>`;
  P.pusto = (tekst, akcja = '') => `<div class="p-pusto"><p>${tekst}</p>${akcja}</div>`;
  P.podzakladki = (lista, aktywna, baza) => `<nav class="p-podz" aria-label="Części sekcji">${lista.map(([id, nazwa, odz]) => `<a href="#/${baza}/${id}" ${aktywna === id ? 'aria-current="page"' : ''}>${nazwa}${odz ? `<i>${odz}</i>` : ''}</a>`).join('')}</nav>`;
  P.btn = (tekst, pa, { klasa = 'p-btn--cichy', atr = '', ikona = '' } = {}) => `<button type="button" class="p-btn ${klasa}" data-pa="${pa}" ${atr}>${ikona ? P.ikona(ikona) : ''}<span>${tekst}</span></button>`;
  P.osobaNazwa = (t) => t.nazwa.replace(/^mgr\s+/, '');
  P.inicjaly = (n) => n.replace(/^mgr\s+/, '').split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase();
  P.zl = (n) => `${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} zł`;
  P.dataKrotka = (data) => { const d = K.zIso(data); return `${d.getDate()} ${K.MIES[d.getMonth()]}`; };
  P.kiedy = (iso) => {
    const d = new Date(iso);
    const r = Math.round((Date.now() - d) / 60000);
    if (r < 1) return 'przed chwilą';
    if (r < 60) return `${r} min temu`;
    if (r < 1440) return `${Math.round(r / 60)} h temu`;
    return `${Math.round(r / 1440)} ${Math.round(r / 1440) === 1 ? 'dzień' : 'dni'} temu`;
  };

  /* ── Wiązanie pól z danymi ─────────────────────────────────────────── */
  function ustawSciezke(obj, sciezka, wartosc) {
    const cz = sciezka.split('.');
    let o = obj;
    for (let i = 0; i < cz.length - 1; i++) o = o[cz[i]];
    o[cz[cz.length - 1]] = wartosc;
  }
  P.czytaj = (obj, sciezka) => sciezka.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
  function wartoscPola(t) {
    if (t.type === 'checkbox') return t.dataset.odwrotnie !== undefined ? !t.checked : t.checked;
    if (t.dataset.typ === 'liczba') return t.value === '' ? 0 : Number(t.value);
    if (t.dataset.typ === 'lista') return t.value.split('\n').map((x) => x.trim()).filter(Boolean);
    if (t.dataset.typ === 'godzina') return K.zH(t.value || '0:00');
    if (t.dataset.typ === 'bool') return t.value === '1';
    return t.value;
  }
  function zastosujPole(t) {
    const [zrodlo, sciezka] = t.dataset.pf.split(':');
    const w = wartoscPola(t);
    if (zrodlo === 'cms') P.cichoCms((C) => ustawSciezke(C, sciezka, w));
    else P.cichoRez((D) => ustawSciezke(D, sciezka, w));
    const licz = $(`[data-licznik-dla="${t.id}"]`);
    if (licz) {
      const n = t.value.length;
      licz.textContent = `${n} / ${licz.dataset.max}`;
      licz.classList.toggle('p-licznik--za-duzo', n > Number(licz.dataset.max));
    }
    const widok = P.widoki[P.aktualny];
    if (widok && widok.naZmiane) widok.naZmiane(sciezka, t, zrodlo);
    if (P.szuflada && P.szuflada.naZmiane) P.szuflada.naZmiane(sciezka, t, zrodlo);
    if (t.dataset.odswiez !== undefined) P.odswiez();
    renderMenu();
  }
  const zdarzeniaZmiany = (t) => t.tagName === 'SELECT' || t.type === 'checkbox' || t.type === 'radio' || t.type === 'date' || t.type === 'time';
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.matches && t.matches('[data-pf]') && !zdarzeniaZmiany(t)) zastosujPole(t);
  });
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.matches && t.matches('[data-pf]') && zdarzeniaZmiany(t)) zastosujPole(t);
    if (t.matches && t.matches('[data-pzm]')) { const f = P.akcje[t.dataset.pzm]; if (f) f(t, e); }
  });

  /* ── Akcje ─────────────────────────────────────────────────────────── */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pa]');
    if (b) {
      const f = P.akcje[b.dataset.pa];
      if (f) { e.preventDefault(); f(b, e); }
      return;
    }
    if (e.target.closest('[data-pakiet]')) {
      const t = e.target.closest('[data-pakiet]').dataset.pakiet;
      window.KAL_UI.ustawTryb(t);
      P.uzupelnij(P.D(), t);
      if (P.poPakiecie) P.poPakiecie();
      if (P.dostep && !P.dostep(P.aktualny)) location.hash = '#/pulpit';
      window.KAL_UI.zapisz();
      P.odswiez();
      return;
    }
    const w = $('#p-szukaj-wyniki');
    if (!w.hidden && !e.target.closest('.p-szukaj')) w.hidden = true;
  });
  P.akcje.zamknij = () => P.zamknij();
  P.akcje['nowa-rez'] = () => { P.zamknij(false); window.KAL_UI.nowa(); };
  P.akcje.rez = (b) => { P.zamknij(false); window.KAL_UI.otworzRez(b.dataset.id); };
  P.akcje.idz = (b) => P.idz(b.dataset.cel);

  /* ── Wyszukiwarka całego panelu ────────────────────────────────────── */
  const SEKCJE = [
    ['dostepnosc', 'Dostępność: godziny przyjęć, urlopy, święta', 'godziny grafik urlop święta przerwa zasady rezerwacji'],
    ['uslugi', 'Usługi i ceny', 'cena cennik usługa czas zaliczka'],
    ['zespol', 'Zespół i profile', 'terapeuta zespół profil'],
    ['lokalizacje', 'Miejsca przyjęć i godziny otwarcia', 'adres dojazd parking godziny otwarcia'],
    ['ustawienia', 'Ustawienia: przypomnienia, dane gabinetu, pakiet', 'przypomnienia sms e-mail konto nip pakiet eksport dane'],
  ];
  function szukaj(q) {
    const w = $('#p-szukaj-wyniki');
    const t = q.trim().toLowerCase();
    if (t.length < 2) { w.hidden = true; return; }
    const D = P.D();
    const cyfry = t.replace(/\D/g, '');
    const pacjenci = [...K.pacjenci(D).values()].filter((p) => p.imie.toLowerCase().includes(t) || (cyfry.length >= 3 && p.tel.replace(/\D/g, '').includes(cyfry))).slice(0, 5);
    const uslugi = D.uslugi.filter((u) => u.nazwa.toLowerCase().includes(t)).slice(0, 3);
    const osoby = D.zespol.filter((x) => x.nazwa.toLowerCase().includes(t)).slice(0, 3);
    const sekcje = SEKCJE.filter(([, n, s]) => n.toLowerCase().includes(t) || s.includes(t)).slice(0, 4);
    const grupa = (n, lista) => (lista.length ? `<li class="p-szukaj__g">${n}</li>${lista.join('')}` : '');
    const html = [
      grupa('Pacjenci', pacjenci.map((p) => `<li><button type="button" data-pa="pacjent" data-id="${p.tel.replace(/\D/g, '')}"><b>${P.esc(p.imie)}</b><span>${P.esc(p.tel)} · ${p.razem} wiz.</span></button></li>`)),
      grupa('Usługi', uslugi.map((u) => `<li><button type="button" data-pa="idz" data-cel="uslugi/${u.id}"><b>${P.esc(u.nazwa)}</b><span>${K.dlTekst(u.min)} · ${P.zl(u.cena)}</span></button></li>`)),
      grupa('Zespół', osoby.map((x) => `<li><button type="button" data-pa="idz" data-cel="zespol/${x.id}"><b>${P.esc(x.nazwa)}</b><span>profil i grafik</span></button></li>`)),
      grupa('Ustawienia', sekcje.map(([id, n]) => `<li><button type="button" data-pa="idz" data-cel="${id}"><b>${P.esc(n)}</b></button></li>`)),
    ].join('');
    w.innerHTML = html || '<li class="p-szukaj__pusto">Nic nie znaleziono.</li>';
    w.hidden = false;
  }
  $('#p-szukaj').addEventListener('input', (e) => szukaj(e.target.value));
  $('#p-szukaj').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { const pierwszy = $('#p-szukaj-wyniki button'); if (pierwszy) pierwszy.click(); }
    if (e.key === 'Escape') { $('#p-szukaj-wyniki').hidden = true; }
  });
  P.akcje.idzSzukaj = null;
  document.addEventListener('click', (e) => { if (e.target.closest('#p-szukaj-wyniki [data-pa="idz"]')) { $('#p-szukaj-wyniki').hidden = true; $('#p-szukaj').value = ''; } }, true);

  /* ── Menu na telefonie ─────────────────────────────────────────────── */
  function zamknijMenuMobilne() {
    document.body.classList.remove('p-menu-otwarte');
    $('#p-menu-btn').setAttribute('aria-expanded', 'false');
    if (!P.szuflada) $('#p-tlo').hidden = true;
  }
  $('#p-menu-btn').addEventListener('click', () => {
    const otw = !document.body.classList.contains('p-menu-otwarte');
    document.body.classList.toggle('p-menu-otwarte', otw);
    $('#p-menu-btn').setAttribute('aria-expanded', String(otw));
    $('#p-tlo').hidden = !otw;
  });
  $('#p-tlo').addEventListener('click', () => { zamknijMenuMobilne(); P.zamknij(); });
  $('#p-demo-x').addEventListener('click', () => $('#p-demo').remove());

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (P.szuflada) { e.stopPropagation(); P.zamknij(); return; }
      if (document.body.classList.contains('p-menu-otwarte')) zamknijMenuMobilne();
    }
    const pisze = e.target.closest && e.target.closest('input, textarea, select, [contenteditable]');
    if (!pisze && e.key === '/' && P.aktualny !== 'kalendarz') { e.preventDefault(); $('#p-szukaj').focus(); }
  }, true);

  /* ── Start ─────────────────────────────────────────────────────────── */
  P.start = () => {
    const st = window.KAL_UI.stan();
    P.uzupelnij(st.dane.ind, 'ind');
    P.uzupelnij(st.dane.ent, 'ent');
    window.KAL_UI.zapisz();
    window.KAL_UI.aktywny = () => P.aktualny === 'kalendarz';
    window.addEventListener('hashchange', pokaz);
    window.addEventListener('storage', (e) => { if (e.key === 'panel-cms-v1') { try { P.cms = JSON.parse(e.newValue); P.odswiez(); } catch (x) { /* ignorujemy */ } } });
    pokaz();
  };
})();
