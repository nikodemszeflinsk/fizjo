/*
 * Kalendarz dostępności — demo.
 *
 * Osobny moduł, niezależny od panelu: własne dane, własny klucz w localStorage.
 * Pokazuje to, co klient dostaje w ofercie: ustawianie godzin przyjęć, rezerwacje,
 * blokady i podgląd tego, co widzi pacjent. Dwa warianty: Individual (jeden terapeuta,
 * kilka miejsc) i Enterprise (zespół, każdy z własnym grafikiem).
 */
(() => {
  'use strict';

  /* ── Stałe i narzędzia ───────────────────────────────────────────────── */
  const KLUCZ = 'kalendarz-demo-v2';
  const START = 8 * 60; // pierwszy rząd: 8:00
  const KONIEC = 19 * 60; // ostatni rząd kończy się o 19:00
  const KROK = 30; // minut na rząd
  const RZEDY = (KONIEC - START) / KROK;
  const DNI = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
  const DNI_KR = ['nd', 'pn', 'wt', 'śr', 'cz', 'pt', 'sb'];
  const MIES = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
  const KOLORY = ['#1f5fd6', '#e8590c', '#13875a', '#c2255c'];
  const WIDOCZNE_DNI = [1, 2, 3, 4, 5, 6]; // pn–sb

  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const zIso = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const dodaj = (d, n) => { const k = new Date(d); k.setDate(k.getDate() + n); return k; };
  const poniedzialek = (d) => dodaj(d, -((d.getDay() + 6) % 7));
  const godz = (min) => `${Math.floor(min / 60)}:${pad(min % 60)}`;
  const rzadNaMin = (r) => START + r * KROK;
  const minNaRzad = (m) => Math.round((m - START) / KROK);
  const zH = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); };
  const dlugaData = (d) => `${DNI[d.getDay()]}, ${d.getDate()} ${MIES[d.getMonth()]}`;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ── Dane przykładowe ───────────────────────────────────────────────── */
  const USLUGI = {
    konsultacja: { nazwa: 'Konsultacja z terapią', rzedy: 2 },
    manualna: { nazwa: 'Terapia manualna', rzedy: 2 },
    kontrola: { nazwa: 'Wizyta kontrolna', rzedy: 1 },
  };
  const IMIONA = ['Anna Zielińska', 'Marek Wysocki', 'Ewa Malinowska', 'Tadeusz Bąk', 'Zofia Rutkowska', 'Krzysztof Dąb', 'Maria Cichoń', 'Adam Wilk', 'Barbara Nowicka', 'Grzegorz Pająk', 'Katarzyna Woźniak', 'Piotr Lis', 'Joanna Kruk', 'Michał Sowa', 'Agnieszka Mróz', 'Tomasz Gajda'];
  const UWAGI = ['', '', 'Proszę o termin po południu.', '', 'Pierwsza wizyta u Was.', '', 'Przyjdę kilka minut wcześniej.', ''];

  function los(ziarno) {
    let a = ziarno >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function reg(od, doo, lok) { return { od, do: doo, lok }; }

  function ziarno(tryb) {
    const dzis = new Date();
    const pn = poniedzialek(dzis);
    const zespol =
      tryb === 'ind'
        ? [{ id: 'jan', nazwa: 'mgr Jan Kowalski', kolor: 0 }]
        : [
            { id: 'jan', nazwa: 'mgr Jan Kowalski', kolor: 0 },
            { id: 'anna', nazwa: 'mgr Anna Lewandowska', kolor: 1 },
            { id: 'piotr', nazwa: 'mgr Piotr Zawada', kolor: 2 },
          ];
    const miejsca =
      tryb === 'ind'
        ? [{ id: 'l1', nazwa: 'Gabinet, ul. Przykładowa 1', kr: 'Gabinet', kolor: 0 }, { id: 'l2', nazwa: 'Studio, ul. Wzorcowa 7', kr: 'Studio', kolor: 1 }]
        : [{ id: 'l1', nazwa: 'ul. Przykładowa 1', kr: 'Przykładowa 1', kolor: 0 }];
    const reguly =
      tryb === 'ind'
        ? { jan: { 1: reg('8:00', '13:00', 'l1'), 2: reg('10:00', '14:00', 'l1'), 3: reg('9:00', '12:00', 'l2'), 4: reg('15:00', '19:00', 'l1'), 5: reg('8:00', '13:00', 'l2') } }
        : {
            jan: { 1: reg('8:00', '16:00', 'l1'), 2: reg('8:00', '16:00', 'l1'), 3: reg('8:00', '16:00', 'l1'), 4: reg('8:00', '16:00', 'l1'), 5: reg('8:00', '14:00', 'l1') },
            anna: { 1: reg('10:00', '18:00', 'l1'), 2: reg('10:00', '18:00', 'l1'), 3: reg('10:00', '18:00', 'l1'), 4: reg('10:00', '18:00', 'l1'), 5: reg('10:00', '16:00', 'l1'), 6: reg('9:00', '13:00', 'l1') },
            piotr: { 2: reg('8:00', '15:00', 'l1'), 4: reg('8:00', '15:00', 'l1'), 6: reg('9:00', '13:00', 'l1') },
          };

    const rnd = los(tryb === 'ind' ? 11 : 29);
    const rezerwacje = [];
    let nr = 0;
    zespol.forEach((t) => {
      for (let tydz = -1; tydz <= 2; tydz++) {
        for (const dzien of WIDOCZNE_DNI) {
          const r = reguly[t.id][dzien];
          if (!r) continue;
          const data = dodaj(pn, tydz * 7 + (dzien - 1));
          let wskaznik = minNaRzad(zH(r.od));
          const koniec = minNaRzad(zH(r.do));
          while (wskaznik < koniec) {
            if (rnd() < 0.5) {
              const klucze = Object.keys(USLUGI);
              const u = klucze[Math.floor(rnd() * klucze.length)];
              const rzedy = USLUGI[u].rzedy;
              if (wskaznik + rzedy <= koniec) {
                const imie = IMIONA[Math.floor(rnd() * IMIONA.length)];
                rezerwacje.push({
                  id: `r${tryb}${++nr}`, terap: t.id, data: iso(data), od: wskaznik, rzedy, usluga: u, imie,
                  tel: `600 100 ${200 + Math.floor(rnd() * 99)}`, uwaga: UWAGI[Math.floor(rnd() * UWAGI.length)],
                  zrodlo: rnd() < 0.8 ? 'strona' : 'telefon', lok: r.lok,
                });
                const ost = rezerwacje[rezerwacje.length - 1];
                ost.zal = ost.zrodlo === 'strona' && rnd() < 0.75 ? { kwota: 50, metoda: ['BLIK', 'BLIK', 'karta', 'przelew'][Math.floor(rnd() * 4)] } : null;
                wskaznik += rzedy;
              }
            }
            wskaznik += 1 + Math.floor(rnd() * 3);
          }
        }
      }
    });
    const blokady =
      tryb === 'ind'
        ? [{ id: 'b1', terap: 'jan', od: iso(dodaj(pn, 10)), do: iso(dodaj(pn, 10)), powod: 'Szkolenie' }]
        : [{ id: 'b1', terap: 'anna', od: iso(dodaj(pn, 9)), do: iso(dodaj(pn, 11)), powod: 'Urlop' }];
    return { zespol, miejsca, reguly, rezerwacje, blokady, wyjatki: {} };
  }

  /* ── Stan ───────────────────────────────────────────────────────────── */
  let stan;
  function wczytaj() {
    try {
      const z = JSON.parse(localStorage.getItem(KLUCZ));
      if (z && z.dane && z.dane.ind && z.dane.ent) return z;
    } catch (e) { /* brak zapisu albo zablokowany localStorage: zaczynamy od danych przykładowych */ }
    return { tryb: 'ind', widok: 'tydzien', data: iso(new Date()), terap: 'jan', dane: { ind: ziarno('ind'), ent: ziarno('ent') } };
  }
  function zapisz() {
    try { localStorage.setItem(KLUCZ, JSON.stringify(stan)); } catch (e) { /* demo działa też bez zapisu */ }
  }
  stan = wczytaj();
  const D = () => stan.dane[stan.tryb];
  const terapeuta = (id) => D().zespol.find((t) => t.id === id) || D().zespol[0];
  const miejsce = (id) => D().miejsca.find((m) => m.id === id) || D().miejsca[0];
  const kolorTerap = (t) => KOLORY[t.kolor % KOLORY.length];
  /* Na telefonie siatka pokazuje jedną kolumnę naraz (dzień albo terapeutę), wybieraną chipami. */
  const waski = window.matchMedia('(max-width: 700px)');
  let mobIdx = null;

  /* ── Obliczanie stanu komórek ────────────────────────────────────────── */
  function rezerwacjaW(terap, data, rzad) {
    return D().rezerwacje.find((r) => r.terap === terap && r.data === data && rzad >= r.od && rzad < r.od + r.rzedy);
  }
  function blokadaW(terap, data) {
    return D().blokady.find((b) => (b.terap === terap || b.terap === '*') && data >= b.od && data <= b.do);
  }
  function minione(data, rzad) {
    const t = zIso(data);
    t.setMinutes(rzadNaMin(rzad));
    return t.getTime() + KROK * 60000 <= Date.now();
  }
  /** Stan jednej komórki: zajete | blokada | wolne | poza | minione, z danymi, jeśli są. */
  function komorka(terap, data, rzad) {
    const rez = rezerwacjaW(terap, data, rzad);
    if (rez) return { s: 'zajete', rez };
    const bl = blokadaW(terap, data);
    if (bl) return { s: 'blokada', bl };
    const dzien = zIso(data).getDay();
    const r = (D().reguly[terap] || {})[dzien];
    const wyj = D().wyjatki[`${terap}|${data}|${rzad}`];
    const wRegule = r && rzad >= minNaRzad(zH(r.od)) && rzad < minNaRzad(zH(r.do));
    const otwarte = wyj === 'open' || (wyj !== 'closed' && wRegule);
    if (minione(data, rzad)) return { s: 'minione', lok: otwarte ? (r ? r.lok : 'l1') : null };
    if (otwarte) return { s: 'wolne', lok: r ? r.lok : D().miejsca[0].id };
    return { s: 'poza' };
  }
  /** Ile pełnych godzin (dwóch sąsiednich wolnych rzędów) jest wolnych danego dnia. */
  function wolneBloki(terap, data) {
    let ile = 0;
    for (let r = 0; r < RZEDY - 1; r++) {
      if (komorka(terap, data, r).s === 'wolne' && komorka(terap, data, r + 1).s === 'wolne') { ile += 1; r += 1; }
    }
    return ile;
  }

  /** Podpis pod nazwą dnia: odróżnia „komplet” od „nie przyjmujesz” i od blokady. */
  function podpis(terap, data) {
    const ent = stan.tryb === 'ent';
    if (data < iso(new Date())) return 'minął';
    const bl = blokadaW(terap, data);
    if (bl) return bl.powod;
    const ma = (D().reguly[terap] || {})[zIso(data).getDay()] || Object.keys(D().wyjatki).some((k) => k.startsWith(`${terap}|${data}|`) && D().wyjatki[k] === 'open');
    if (!ma) return ent ? 'nie przyjmuje' : 'nie przyjmujesz';
    const w = wolneBloki(terap, data);
    return w ? `wolne godziny: ${w}` : 'komplet';
  }

  /** Pierwszy dzień (od dziś), w którym zostało co najmniej trzy wolne godziny. Dzięki temu demo nie zaczyna od pustego, przeszłego dnia. */
  function najblizszyOtwartyDzien() {
    for (let dz = 0; dz < 21; dz++) {
      const data = iso(dodaj(new Date(), dz));
      let wolne = 0;
      for (const t of D().zespol) for (let r = 0; r < RZEDY; r++) if (komorka(t.id, data, r).s === 'wolne') wolne += 1;
      if (wolne >= 6) return data;
    }
    return iso(new Date());
  }

  /* ── Render: pasek, siatka, boki ─────────────────────────────────────── */
  const zakres = () => {
    const d = zIso(stan.data);
    return stan.widok === 'tydzien' ? { od: poniedzialek(d), dni: WIDOCZNE_DNI.length } : { od: d, dni: 1 };
  };
  function tytulZakresu() {
    const { od, dni } = zakres();
    if (stan.widok === 'dzien') return dlugaData(od);
    const koniec = dodaj(od, dni - 1);
    return `${od.getDate()} ${od.getMonth() === koniec.getMonth() ? '' : MIES[od.getMonth()] + ' '}– ${koniec.getDate()} ${MIES[koniec.getMonth()]} ${koniec.getFullYear()}`.replace(/\s+/g, ' ');
  }

  function renderPasek() {
    const ent = stan.tryb === 'ent';
    const wybor = ent && stan.widok === 'tydzien'
      ? `<label class="wybor"><span>Terapeuta</span><select id="sel-terap">${D().zespol.map((t) => `<option value="${t.id}"${t.id === stan.terap ? ' selected' : ''}>${esc(t.nazwa)}</option>`).join('')}</select></label>`
      : '';
    const widoki = ent
      ? `<div class="seg" role="group" aria-label="Widok"><button type="button" data-widok="tydzien" aria-pressed="${stan.widok === 'tydzien'}">Tydzień</button><button type="button" data-widok="dzien" aria-pressed="${stan.widok === 'dzien'}">Dzień zespołu</button></div>`
      : '';
    $('#pasek').innerHTML = `
      <div class="pasek__nawig">
        <button type="button" class="ikona" data-nawig="-1" aria-label="${stan.widok === 'tydzien' ? 'Poprzedni tydzień' : 'Poprzedni dzień'}">‹</button>
        <button type="button" class="przycisk przycisk--cichy" data-nawig="0">Dziś</button>
        <button type="button" class="ikona" data-nawig="1" aria-label="${stan.widok === 'tydzien' ? 'Następny tydzień' : 'Następny dzień'}">›</button>
        <h2 class="pasek__tytul" aria-live="polite">${esc(tytulZakresu())}</h2>
      </div>
      <div class="pasek__opcje">${widoki}${wybor}
        <button type="button" class="przycisk" data-akcja="godziny">Godziny przyjęć</button>
        <button type="button" class="przycisk przycisk--cichy" data-akcja="blokada">Dodaj blokadę</button>
      </div>`;
    document.querySelectorAll('[data-tryb]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tryb === stan.tryb)));
  }

  function wszystkieKolumny() {
    const { od, dni } = zakres();
    if (stan.widok === 'tydzien') {
      const t = terapeuta(stan.terap);
      return Array.from({ length: dni }, (_, i) => ({ data: iso(dodaj(od, i)), terap: t.id, etykieta: null }));
    }
    const data = iso(od);
    return D().zespol.map((t) => ({ data, terap: t.id, etykieta: t.nazwa.replace(/^mgr\s+/, '') }));
  }
  function indeksMob(wsz) {
    if (mobIdx !== null && mobIdx < wsz.length) return mobIdx;
    if (stan.widok === 'tydzien') return Math.min(wsz.length - 1, (zIso(stan.data).getDay() + 6) % 7);
    return 0;
  }
  function kolumny() {
    const wsz = wszystkieKolumny();
    return waski.matches ? [wsz[indeksMob(wsz)]] : wsz;
  }
  function renderChipy() {
    const wsz = wszystkieKolumny();
    const akt = indeksMob(wsz);
    const dzisIso = iso(new Date());
    $('#chipy').innerHTML = wsz.map((k, i) => {
      const d = zIso(k.data);
      const t = terapeuta(k.terap);
      const wolne = wolneBloki(k.terap, k.data);
      const nazwa = stan.widok === 'dzien' ? `<i style="background:${kolorTerap(t)}"></i>${esc(k.etykieta.split(' ')[0])}` : `${DNI_KR[d.getDay()]} <b>${d.getDate()}</b>`;
      return `<button type="button" data-mob="${i}" aria-pressed="${i === akt}"${k.data === dzisIso && stan.widok === 'tydzien' ? ' class="dzis"' : ''}>${nazwa}<small>${wolne ? wolne + ' wolne' : '–'}</small></button>`;
    }).join('');
  }

  function renderSiatka() {
    const kol = kolumny();
    const ent = stan.tryb === 'ent';
    const dzisIso = iso(new Date());
    const szer = waski.matches ? 'minmax(0, 1fr)' : stan.widok === 'tydzien' ? 'minmax(112px, 1fr)' : 'minmax(170px, 1fr)';
    let h = '';
    h += `<div class="sg-rog" style="grid-row:1;grid-column:1"></div>`;
    kol.forEach((k, i) => {
      const d = zIso(k.data);
      const t = terapeuta(k.terap);
      const glowa = stan.widok === 'dzien'
        ? `<span class="sg-dzien sg-dzien--os"><i style="background:${kolorTerap(t)}"></i>${esc(k.etykieta)}</span><span class="sg-pod">${esc(podpis(k.terap, k.data))}</span>`
        : `<span class="sg-dzien">${DNI_KR[d.getDay()]} ${d.getDate()}</span><span class="sg-pod">${esc(podpis(k.terap, k.data))}</span>`;
      h += `<div class="sg-glowa${k.data === dzisIso ? ' sg-glowa--dzis' : ''}${k.data === dzisIso && stan.widok === 'tydzien' ? ' sg-glowa--znacznik' : ''}" style="grid-row:1;grid-column:${i + 2}">${glowa}</div>`;
    });
    for (let r = 0; r < RZEDY; r++) {
      h += `<div class="sg-czas" style="grid-row:${r + 2};grid-column:1">${r % 2 === 0 ? godz(rzadNaMin(r)) : ''}</div>`;
    }
    kol.forEach((k, i) => {
      const t = terapeuta(k.terap);
      const d = zIso(k.data);
      let r = 0;
      while (r < RZEDY) {
        const c = komorka(k.terap, k.data, r);
        const kol_ = i + 2, wiersz = r + 2;
        const etyk = `${DNI[d.getDay()]} ${d.getDate()} ${MIES[d.getMonth()]}, ${godz(rzadNaMin(r))}`;
        if (c.s === 'zajete') {
          const rez = c.rez;
          const lok = miejsce(rez.lok);
          const kolor = ent ? kolorTerap(t) : KOLORY[lok.kolor % KOLORY.length];
          h += `<button type="button" class="sg-rez${rez.rzedy === 1 ? ' sg-rez--1' : ''}" data-rez="${rez.id}" style="grid-row:${rez.od + 2} / span ${rez.rzedy};grid-column:${kol_};--c:${kolor}" aria-label="Rezerwacja: ${esc(rez.imie)}, ${esc(USLUGI[rez.usluga].nazwa)}, ${etyk}">
            <span class="sg-rez__l"><b>${godz(rzadNaMin(rez.od))}</b> ${esc(rez.imie)}</span><small>${esc(USLUGI[rez.usluga].nazwa)}</small></button>`;
          r = rez.od + rez.rzedy;
          continue;
        }
        if (c.s === 'blokada') {
          let koniec = r;
          while (koniec < RZEDY && komorka(k.terap, k.data, koniec).s === 'blokada') koniec++;
          h += `<button type="button" class="sg-blok" data-blok="${c.bl.id}" style="grid-row:${r + 2} / span ${koniec - r};grid-column:${kol_}" aria-label="Blokada: ${esc(c.bl.powod)}, ${esc(dlugaData(d))}"><span>${esc(c.bl.powod)}</span></button>`;
          r = koniec;
          continue;
        }
        const lok = c.lok ? miejsce(c.lok) : null;
        const kolor = c.s === 'wolne' ? (ent ? kolorTerap(t) : KOLORY[lok.kolor % KOLORY.length]) : '';
        const pierwsza = c.s === 'wolne' && (r === 0 || komorka(k.terap, k.data, r - 1).s !== 'wolne');
        const znak = pierwsza && !ent ? `<em>${esc(lok.kr)}</em>` : '';
        h += `<button type="button" class="sg-kom sg-kom--${c.s}" data-r="${r}" data-d="${k.data}" data-t="${k.terap}" style="grid-row:${wiersz};grid-column:${kol_}${kolor ? `;--c:${kolor}` : ''}" data-godz="${godz(rzadNaMin(r))}" aria-label="${etyk}: ${c.s === 'wolne' ? 'wolne' : c.s === 'minione' ? 'minęło' : 'nie przyjmujesz'}"${c.s === 'minione' ? ' tabindex="-1"' : ''}>${znak}</button>`;
        r += 1;
      }
    });
    const teraz = new Date();
    const minTeraz = teraz.getHours() * 60 + teraz.getMinutes();
    if (minTeraz >= START && minTeraz < KONIEC) {
      kol.forEach((k, i) => {
        if (k.data !== dzisIso) return;
        h += `<div class="sg-teraz" aria-hidden="true" style="grid-row:${Math.floor((minTeraz - START) / KROK) + 2};grid-column:${i + 2};--f:${((minTeraz - START) % KROK) / KROK}"></div>`;
      });
    }
    const n = kol.length;
    const el = $('#siatka');
    el.style.gridTemplateColumns = `${waski.matches ? 46 : 54}px repeat(${n}, ${szer})`;
    el.style.gridTemplateRows = `auto repeat(${RZEDY}, var(--h))`;
    el.innerHTML = h;
  }

  function renderLegenda() {
    const ent = stan.tryb === 'ent';
    const poz = [];
    if (ent) D().zespol.forEach((t) => poz.push(`<li><i style="background:${kolorTerap(t)}"></i>${esc(t.nazwa)}</li>`));
    else D().miejsca.forEach((m) => poz.push(`<li><i style="background:${KOLORY[m.kolor]}"></i>${esc(m.nazwa)}</li>`));
    poz.push('<li><i class="lg-wolne"></i>Wolne, pacjent może zarezerwować</li>', '<li><i class="lg-zajete"></i>Rezerwacja</li>', '<li><i class="lg-blok"></i>Blokada lub przerwa</li>');
    $('#legenda').innerHTML = poz.join('');
  }

  /** Najbliższe wolne godziny z perspektywy pacjenta: po dwa terminy dziennie, pełne godziny. */
  function wolneTerminy(ile) {
    const wynik = [];
    for (let dz = 0; dz < 21 && wynik.length < ile; dz++) {
      const data = iso(dodaj(new Date(), dz));
      const grupy = new Map();
      D().zespol.forEach((t) => {
        for (let r = 0; r < RZEDY - 1; r += 2) {
          const a = komorka(t.id, data, r);
          if (a.s === 'wolne' && komorka(t.id, data, r + 1).s === 'wolne') {
            const g = grupy.get(r) || { data, rzad: r, osoby: [], ids: [], lok: a.lok };
            g.osoby.push(t.nazwa.replace(/^mgr\s+/, '').split(' ')[0]);
            g.ids.push(t.id);
            grupy.set(r, g);
          }
        }
      });
      const dnia = [...grupy.values()].sort((x, y) => x.rzad - y.rzad);
      const wybrane = dnia.length > 2 ? [dnia[0], dnia[Math.floor(dnia.length / 2)]] : dnia;
      wybrane.forEach((g) => { if (wynik.length < ile) wynik.push(g); });
    }
    return wynik;
  }
  function wzgledna(data) {
    const dzis = iso(new Date());
    if (data === dzis) return 'Dziś';
    if (data === iso(dodaj(new Date(), 1))) return 'Jutro';
    const d = zIso(data);
    return `${DNI_KR[d.getDay()]} ${d.getDate()}.${pad(d.getMonth() + 1)}`;
  }

  function renderBoki() {
    const dzisIso = iso(new Date());
    const rez = D().rezerwacje.filter((r) => r.data === dzisIso).sort((x, y) => x.od - y.od);
    const wolneDzis = D().zespol.reduce((s, t) => s + wolneBloki(t.id, dzisIso), 0);
    const nast = D().rezerwacje.filter((r) => !minione(r.data, r.od)).sort((x, y) => (x.data + pad(x.od)).localeCompare(y.data + pad(y.od)))[0];
    const nastHtml = nast ? `<p class="nast">Następna wizyta: <b>${esc(wzgledna(nast.data))}, ${godz(rzadNaMin(nast.od))}</b> · ${esc(nast.imie)}</p>` : '';
    $('#dzis').innerHTML = `<h3>Dziś</h3>
      <dl class="liczby"><div><dt>Rezerwacje</dt><dd>${rez.length}</dd></div><div><dt>Wolne godziny</dt><dd>${wolneDzis}</dd></div></dl>
      ${rez.length ? `<ul class="dzis-lista">${rez.slice(0, 5).map((r) => `<li><button type="button" data-rez="${r.id}"><b>${godz(rzadNaMin(r.od))}</b><span>${esc(r.imie)}<small>${esc(USLUGI[r.usluga].nazwa)}</small></span></button></li>`).join('')}</ul>${rez.length > 5 ? `<p class="wiecej">i jeszcze ${rez.length - 5} w kalendarzu</p>` : ''}` : `<p class="pusto">Dziś nie ma rezerwacji.</p>${nastHtml}`}`;

    const terminy = wolneTerminy(6);
    $('#pacjent').innerHTML = `<h3>Co widzi pacjent</h3>
      <p class="pod">Najbliższe wolne terminy na Twojej stronie. Zmieniasz godziny, a lista zmienia się razem z nimi. Kliknij termin, żeby zobaczyć go w kalendarzu.</p>
      <div class="widget" aria-label="Podgląd widżetu rezerwacji na stronie gabinetu">
        <div class="widget__bar" aria-hidden="true"><i></i><i></i><i></i><span>twoja-strona.pl › umow-wizyte</span></div>
        <div class="widget__tresc">
          <p class="widget__h">Wybierz termin wizyty</p>
          ${terminy.length ? `<ul class="terminy">${terminy.map((t) => `<li><button type="button" data-skocz="${t.data}|${t.ids[0]}|${t.rzad}"><span class="t-dzien">${esc(wzgledna(t.data))}</span><b>${godz(rzadNaMin(t.rzad))}</b><span class="t-kto">${esc(stan.tryb === 'ent' ? t.osoby.join(', ') : miejsce(t.lok).kr)}</span></button></li>`).join('')}</ul>` : '<p class="pusto">Brak wolnych terminów. Pacjent zobaczy komunikat, że może zadzwonić.</p>'}
        </div>
      </div>`;
  }

  const OPISY = { ind: 'Jeden terapeuta, kilka miejsc przyjęć', ent: 'Zespół, każdy z własnym grafikiem' };
  function render() {
    renderPasek(); renderChipy(); renderSiatka(); renderLegenda(); renderBoki();
    $('#pakiet-opis').textContent = OPISY[stan.tryb];
  }

  /* ── Cofnij: po każdej zmianie migawka danych i krótki komunikat ───── */
  let migawka = null;
  let zegarToast = null;
  function toast(tekst, snap) {
    migawka = snap;
    $('#toast-t').textContent = tekst;
    $('#toast').hidden = false;
    clearTimeout(zegarToast);
    zegarToast = setTimeout(ukryjToast, 8000);
  }
  function ukryjToast() { $('#toast').hidden = true; migawka = null; clearTimeout(zegarToast); }
  /** Wykonuje zmianę danych, zapisuje, odświeża i pozwala ją cofnąć. */
  function zmien(tekst, fn) {
    const snap = JSON.stringify(D());
    fn();
    zapisz(); zamknij(); render(); toast(tekst, snap);
  }
  function cofnij() {
    if (!migawka) return;
    stan.dane[stan.tryb] = JSON.parse(migawka);
    zapisz(); ukryjToast(); render();
  }
  function blysnij(data, terap, rzad) {
    const c = document.querySelector(`.sg-kom[data-d="${data}"][data-t="${terap}"][data-r="${rzad}"]`);
    if (!c) return;
    c.classList.add('blysk');
    c.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    setTimeout(() => c.classList.remove('blysk'), 2200);
  }

  /* ── Okna dialogowe ──────────────────────────────────────────────────── */
  const okno = $('#okno');
  const tresc = $('#okno-tresc');
  function otworz(html) { tresc.innerHTML = html; if (!okno.open) okno.showModal(); const f = tresc.querySelector('input, select, button.przycisk'); if (f) f.focus(); }
  function zamknij() { if (okno.open) okno.close(); }
  const naglowek = (t, pod) => `<header class="okno__g"><h2 id="okno-tytul">${t}</h2>${pod ? `<p>${pod}</p>` : ''}<button type="button" class="ikona" data-akcja="zamknij" aria-label="Zamknij">×</button></header>`;

  function oknoRezerwacji(id) {
    const r = D().rezerwacje.find((x) => x.id === id);
    if (!r) return;
    const t = terapeuta(r.terap), d = zIso(r.data);
    otworz(`${naglowek('Rezerwacja', `${esc(dlugaData(d))}, ${godz(rzadNaMin(r.od))}–${godz(rzadNaMin(r.od + r.rzedy))}`)}
      <dl class="dane">
        <div><dt>Pacjent</dt><dd>${esc(r.imie)}</dd></div>
        <div><dt>Telefon</dt><dd><a href="tel:${esc(r.tel.replace(/\s/g, ''))}">${esc(r.tel)}</a></dd></div>
        <div><dt>Usługa</dt><dd>${esc(USLUGI[r.usluga].nazwa)}</dd></div>
        <div><dt>${stan.tryb === 'ent' ? 'Terapeuta' : 'Miejsce'}</dt><dd>${stan.tryb === 'ent' ? esc(t.nazwa) : esc(miejsce(r.lok).nazwa)}</dd></div>
        <div><dt>Źródło</dt><dd>${r.zrodlo === 'strona' ? 'Rezerwacja ze strony' : 'Wpisana ręcznie (telefon)'}</dd></div>
        <div><dt>Zaliczka online</dt><dd>${r.zal ? `${r.zal.kwota} zł, opłacona (${esc(r.zal.metoda)})` : 'brak'}</dd></div>
        ${r.uwaga ? `<div><dt>Wiadomość do gabinetu</dt><dd>${esc(r.uwaga)}</dd></div>` : ''}
      </dl>
      <p class="okno__nota">Odwołanie zwalnia termin: od razu pojawi się znów na stronie jako wolny.${r.zal ? ' Zaliczkę zwracasz zgodnie ze swoim regulaminem, u operatora płatności.' : ''}</p>
      <footer class="okno__st"><button type="button" class="przycisk przycisk--cichy" data-akcja="zamknij">Zamknij</button><button type="button" class="przycisk przycisk--alert" data-akcja="odwolaj" data-id="${r.id}">Odwołaj rezerwację</button></footer>`);
  }

  function oknoKomorki(terap, data, rzad) {
    const c = komorka(terap, data, rzad);
    if (c.s === 'minione') return;
    const t = terapeuta(terap), d = zIso(data);
    const tytulCzas = `${esc(dlugaData(d))}, ${godz(rzadNaMin(rzad))}`;
    if (c.s === 'blokada') return oknoBlokady(c.bl.id);
    if (c.s === 'wolne') {
      otworz(`${naglowek('Wolny termin', `${tytulCzas}${stan.tryb === 'ent' ? ' · ' + esc(t.nazwa) : ''}`)}
        <p class="okno__nota">Ten termin widzi pacjent na stronie. Możesz go zamknąć albo wpisać na niego pacjenta, który zadzwonił.</p>
        <div class="formularz">
          <div class="pole"><label for="p-imie">Imię i nazwisko pacjenta</label><input id="p-imie" type="text" autocomplete="off" /></div>
          <div class="pole"><label for="p-tel">Telefon</label><input id="p-tel" type="tel" inputmode="tel" autocomplete="off" /></div>
          <div class="pole"><label for="p-usl">Usługa</label><select id="p-usl">${Object.entries(USLUGI).map(([k, u]) => `<option value="${k}">${esc(u.nazwa)}</option>`).join('')}</select></div>
          <p class="blad" id="p-blad" hidden></p>
        </div>
        <footer class="okno__st"><button type="button" class="przycisk przycisk--cichy" data-akcja="zamknij-termin" data-t="${terap}" data-d="${data}" data-r="${rzad}">Zamknij ten termin</button><button type="button" class="przycisk" data-akcja="wpisz" data-t="${terap}" data-d="${data}" data-r="${rzad}">Wpisz pacjenta</button></footer>`);
      return;
    }
    otworz(`${naglowek('Termin zamknięty', `${tytulCzas}${stan.tryb === 'ent' ? ' · ' + esc(t.nazwa) : ''}`)}
      <p class="okno__nota">Poza godzinami przyjęć. Pacjent nie widzi tego terminu. Możesz go otworzyć jednorazowo, bez zmiany stałych godzin.</p>
      <footer class="okno__st"><button type="button" class="przycisk przycisk--cichy" data-akcja="zamknij">Zamknij</button><button type="button" class="przycisk" data-akcja="otworz-termin" data-t="${terap}" data-d="${data}" data-r="${rzad}">Otwórz ten termin</button></footer>`);
  }

  function oknoBlokady(id) {
    const b = D().blokady.find((x) => x.id === id);
    if (!b) return;
    const od = zIso(b.od), doo = zIso(b.do);
    const dla = b.terap === '*' ? 'cały gabinet' : terapeuta(b.terap).nazwa;
    otworz(`${naglowek(esc(b.powod), `${b.od === b.do ? esc(dlugaData(od)) : esc(dlugaData(od)) + ' – ' + esc(dlugaData(doo))} · ${esc(dla)}`)}
      <p class="okno__nota">W tym czasie termin nie jest dostępny dla pacjentów. Po usunięciu blokady wracają zwykłe godziny przyjęć.</p>
      <footer class="okno__st"><button type="button" class="przycisk przycisk--cichy" data-akcja="zamknij">Zamknij</button><button type="button" class="przycisk przycisk--alert" data-akcja="usun-blokade" data-id="${b.id}">Usuń blokadę</button></footer>`);
  }

  function oknoNowejBlokady() {
    const dzis = iso(new Date());
    const ent = stan.tryb === 'ent';
    otworz(`${naglowek('Dodaj blokadę', 'Urlop, szkolenie, zwolnienie. Terminy znikają ze strony od razu.')}
      <div class="formularz">
        <div class="pole"><label for="b-od">Od</label><input id="b-od" type="date" value="${dzis}" /></div>
        <div class="pole"><label for="b-do">Do (włącznie)</label><input id="b-do" type="date" value="${dzis}" /></div>
        ${ent ? `<div class="pole"><label for="b-kto">Dotyczy</label><select id="b-kto"><option value="${stan.terap}">${esc(terapeuta(stan.terap).nazwa)}</option>${D().zespol.filter((t) => t.id !== stan.terap).map((t) => `<option value="${t.id}">${esc(t.nazwa)}</option>`).join('')}<option value="*">Cały gabinet</option></select></div>` : ''}
        <div class="pole"><label for="b-powod">Powód <em>(widzisz tylko Ty)</em></label><input id="b-powod" type="text" value="Urlop" /></div>
        <p class="blad" id="b-blad" hidden></p>
      </div>
      <footer class="okno__st"><button type="button" class="przycisk przycisk--cichy" data-akcja="zamknij">Anuluj</button><button type="button" class="przycisk" data-akcja="zapisz-blokade">Dodaj blokadę</button></footer>`);
  }

  function oknoGodzin() {
    const ent = stan.tryb === 'ent';
    const t = terapeuta(stan.terap);
    const r = D().reguly[t.id] || {};
    const wiersze = [1, 2, 3, 4, 5, 6].map((dz) => {
      const x = r[dz];
      const opcjeLok = D().miejsca.map((m) => `<option value="${m.id}"${x && x.lok === m.id ? ' selected' : ''}>${esc(m.kr)}</option>`).join('');
      return `<tr><th scope="row"><label><input type="checkbox" data-dz="${dz}" ${x ? 'checked' : ''} /> ${DNI[dz]}</label></th>
        <td><input type="time" step="1800" data-od="${dz}" value="${x ? pad(Math.floor(zH(x.od) / 60)) + ':' + pad(zH(x.od) % 60) : '08:00'}" aria-label="Od, ${DNI[dz]}" /></td>
        <td><input type="time" step="1800" data-do="${dz}" value="${x ? pad(Math.floor(zH(x.do) / 60)) + ':' + pad(zH(x.do) % 60) : '16:00'}" aria-label="Do, ${DNI[dz]}" /></td>
        ${D().miejsca.length > 1 ? `<td><select data-lok="${dz}" aria-label="Miejsce, ${DNI[dz]}">${opcjeLok}</select></td>` : ''}</tr>`;
    }).join('');
    otworz(`${naglowek('Godziny przyjęć', ent ? esc(t.nazwa) : 'Stałe godziny w tygodniu' + (D().miejsca.length > 1 ? ', z miejscem przyjęć' : ''))}
      <p class="okno__nota">To stały grafik. Pojedyncze terminy zamykasz lub otwierasz w kalendarzu, a urlopy ustawiasz jako blokadę.</p>
      <div class="tabela-przew"><table class="godziny"><thead><tr><th scope="col">Dzień</th><th scope="col">Od</th><th scope="col">Do</th>${D().miejsca.length > 1 ? '<th scope="col">Miejsce</th>' : ''}</tr></thead><tbody>${wiersze}</tbody></table></div>
      <p class="blad" id="g-blad" hidden></p>
      <footer class="okno__st"><button type="button" class="przycisk przycisk--cichy" data-akcja="zamknij">Anuluj</button><button type="button" class="przycisk" data-akcja="zapisz-godziny">Zapisz godziny</button></footer>`);
  }

  /* ── Akcje ───────────────────────────────────────────────────────────── */
  function bladW(id, tekst) { const e = $(id); if (e) { e.textContent = tekst; e.hidden = !tekst; } }
  function zapiszGodziny() {
    const t = terapeuta(stan.terap);
    const nowe = {};
    for (const dz of [1, 2, 3, 4, 5, 6]) {
      if (!$(`[data-dz="${dz}"]`).checked) continue;
      const od = $(`[data-od="${dz}"]`).value, doo = $(`[data-do="${dz}"]`).value;
      if (!od || !doo || zH(od) >= zH(doo)) return bladW('#g-blad', `${DNI[dz][0].toUpperCase() + DNI[dz].slice(1)}: godzina „do” musi być późniejsza niż „od”.`);
      if (zH(od) < START || zH(doo) > KONIEC) return bladW('#g-blad', `Kalendarz pokazuje godziny ${godz(START)}–${godz(KONIEC)}.`);
      const sel = $(`[data-lok="${dz}"]`);
      nowe[dz] = reg(`${Math.floor(zH(od) / 60)}:${pad(zH(od) % 60)}`, `${Math.floor(zH(doo) / 60)}:${pad(zH(doo) % 60)}`, sel ? sel.value : D().miejsca[0].id);
    }
    zmien('Godziny przyjęć zapisane', () => {
      D().reguly[t.id] = nowe;
      Object.keys(D().wyjatki).filter((k) => k.startsWith(t.id + '|')).forEach((k) => delete D().wyjatki[k]);
    });
  }
  function zapiszBlokade() {
    const od = $('#b-od').value, doo = $('#b-do').value, powod = $('#b-powod').value.trim();
    if (!od || !doo) return bladW('#b-blad', 'Wybierz daty.');
    if (doo < od) return bladW('#b-blad', 'Data końca nie może być wcześniejsza niż początku.');
    if (!powod) return bladW('#b-blad', 'Wpisz powód, żebyś wiedział, czego dotyczy blokada.');
    const kto = $('#b-kto') ? $('#b-kto').value : D().zespol[0].id;
    const konflikt = D().rezerwacje.filter((r) => (kto === '*' || r.terap === kto) && r.data >= od && r.data <= doo && !minione(r.data, r.od));
    zmien('Blokada dodana, terminy zniknęły ze strony', () => D().blokady.push({ id: `b${Date.now()}`, terap: kto, od, do: doo, powod }));
    if (konflikt.length) {
      otworz(`${naglowek('Blokada dodana', `W tym czasie masz już ${konflikt.length} ${konflikt.length === 1 ? 'rezerwację' : 'rezerwacji'}`)}
        <p class="okno__nota">Blokada nie odwołuje istniejących rezerwacji. Zadzwoń do pacjentów albo odwołaj je w kalendarzu.</p>
        <footer class="okno__st"><button type="button" class="przycisk" data-akcja="zamknij">Rozumiem</button></footer>`);
    }
  }
  function wpiszPacjenta(terap, data, rzad) {
    const imie = $('#p-imie').value.trim(), tel = $('#p-tel').value.trim(), u = $('#p-usl').value;
    if (imie.split(/\s+/).length < 2) return bladW('#p-blad', 'Wpisz imię i nazwisko pacjenta.');
    if (tel.replace(/\D/g, '').length < 9) return bladW('#p-blad', 'Wpisz numer telefonu (9 cyfr).');
    const rzedy = USLUGI[u].rzedy;
    for (let i = 0; i < rzedy; i++) {
      if (komorka(terap, data, rzad + i).s !== 'wolne' || rzad + i >= RZEDY) return bladW('#p-blad', 'Ta usługa nie mieści się w wolnym terminie. Wybierz krótszą albo inną godzinę.');
    }
    const c = komorka(terap, data, rzad);
    zmien(`Wpisano pacjenta: ${imie}`, () => D().rezerwacje.push({ id: `r${Date.now()}`, terap, data, od: rzad, rzedy, usluga: u, imie, tel, uwaga: '', zrodlo: 'telefon', lok: c.lok }));
  }
  function ustawWyjatek(klucz, wartosc) {
    zmien(wartosc === 'closed' ? 'Termin zamknięty, pacjent go nie widzi' : 'Termin otwarty, pacjent może go zarezerwować', () => {
      if (wartosc) D().wyjatki[klucz] = wartosc; else delete D().wyjatki[klucz];
    });
  }

  /* ── Zdarzenia ───────────────────────────────────────────────────────── */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.tryb) {
      stan.tryb = b.dataset.tryb; stan.widok = stan.tryb === 'ent' ? 'dzien' : 'tydzien'; stan.terap = D().zespol[0].id; mobIdx = null; ukryjToast();
      stan.data = stan.widok === 'dzien' ? najblizszyOtwartyDzien() : iso(new Date());
      zapisz(); return render();
    }
    if (b.dataset.widok) { stan.widok = b.dataset.widok; mobIdx = null; zapisz(); return render(); }
    if (b.dataset.mob !== undefined) { mobIdx = Number(b.dataset.mob); return render(); }
    if (b.dataset.skocz) {
      const [d, t, r] = b.dataset.skocz.split('|');
      stan.data = d; stan.widok = stan.tryb === 'ent' ? 'dzien' : 'tydzien'; stan.terap = t;
      mobIdx = stan.tryb === 'ent' ? D().zespol.findIndex((x) => x.id === t) : null;
      zapisz(); render(); return blysnij(d, t, r);
    }
    if (b.dataset.nawig !== undefined) {
      const n = Number(b.dataset.nawig);
      mobIdx = null;
      stan.data = n === 0 ? iso(new Date()) : iso(dodaj(zIso(stan.data), n * (stan.widok === 'tydzien' ? 7 : 1)));
      zapisz(); return render();
    }
    if (b.dataset.rez) return oknoRezerwacji(b.dataset.rez);
    if (b.dataset.blok) return oknoBlokady(b.dataset.blok);
    if (b.classList.contains('sg-kom')) return oknoKomorki(b.dataset.t, b.dataset.d, Number(b.dataset.r));
    const a = b.dataset.akcja;
    if (!a) return;
    if (a === 'zamknij') return zamknij();
    if (a === 'cofnij') return cofnij();
    if (a === 'godziny') return oknoGodzin();
    if (a === 'blokada') return oknoNowejBlokady();
    if (a === 'zapisz-godziny') return zapiszGodziny();
    if (a === 'zapisz-blokade') return zapiszBlokade();
    if (a === 'wpisz') return wpiszPacjenta(b.dataset.t, b.dataset.d, Number(b.dataset.r));
    if (a === 'zamknij-termin') return ustawWyjatek(`${b.dataset.t}|${b.dataset.d}|${b.dataset.r}`, 'closed');
    if (a === 'otworz-termin') return ustawWyjatek(`${b.dataset.t}|${b.dataset.d}|${b.dataset.r}`, 'open');
    if (a === 'odwolaj') return zmien('Rezerwacja odwołana, termin znów jest wolny', () => { D().rezerwacje = D().rezerwacje.filter((r) => r.id !== b.dataset.id); });
    if (a === 'usun-blokade') return zmien('Blokada usunięta', () => { D().blokady = D().blokady.filter((x) => x.id !== b.dataset.id); });
  });
  document.addEventListener('change', (e) => {
    if (e.target.id === 'sel-terap') { stan.terap = e.target.value; mobIdx = null; zapisz(); render(); }
  });
  okno.addEventListener('click', (e) => { if (e.target === okno) zamknij(); });
  $('#demo-zamknij').addEventListener('click', () => $('#demo').remove());
  waski.addEventListener('change', render);

  /* Link z oferty może od razu otworzyć wariant: kalendarz.html?tryb=ent */
  const zLinku = new URLSearchParams(location.search).get('tryb');
  if ((zLinku === 'ent' || zLinku === 'ind') && zLinku !== stan.tryb) {
    stan.tryb = zLinku; stan.widok = zLinku === 'ent' ? 'dzien' : 'tydzien'; stan.terap = D().zespol[0].id; stan.data = iso(new Date());
  }
  if (stan.widok === 'dzien' && (zLinku || !localStorage.getItem(KLUCZ))) stan.data = najblizszyOtwartyDzien();
  render();
})();
