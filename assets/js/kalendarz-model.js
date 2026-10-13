/*
 * Kalendarz dostępności — model danych i reguły.
 *
 * Nic tu nie dotyka DOM-u. Plik odpowiada na pytania: kiedy gabinet przyjmuje, co jest zajęte,
 * co zobaczy pacjent, czy nowa wizyta się mieści. Interfejs (kalendarz.js) tylko to pokazuje.
 * Czas liczymy w minutach od północy, siatka ma krok 15 minut.
 */
(() => {
  'use strict';

  const K = (window.KAL = {});

  /* ── Stałe ─────────────────────────────────────────────────────────── */
  K.START = 7 * 60;
  K.END = 20 * 60;
  K.KROK = 15;
  K.RZEDY = (K.END - K.START) / K.KROK;
  K.DNI = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
  K.DNI_KR = ['nd', 'pn', 'wt', 'śr', 'cz', 'pt', 'sb'];
  K.MIES = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
  K.MIES_M = ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'];
  K.KOLORY = ['#1f5fd6', '#e8590c', '#13875a', '#c2255c', '#7048e8', '#0c8599', '#a16207', '#5f6b73'];
  K.DNI_PRACY = [1, 2, 3, 4, 5, 6]; // pn–sb
  K.LIMITY = {
    ind: { terapeuci: 1, miejsca: 3, uslugi: 6, nazwa: 'Individual' },
    ent: { terapeuci: 8, miejsca: 2, uslugi: 15, nazwa: 'Enterprise' },
  };
  K.STATUSY = {
    potwierdzona: 'Potwierdzona',
    oczekuje: 'Do potwierdzenia',
    przyszedl: 'Przyszedł',
    nieobecny: 'Nie przyszedł',
  };

  /* ── Czas i daty ───────────────────────────────────────────────────── */
  const pad = (n) => String(n).padStart(2, '0');
  K.pad = pad;
  K.iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  K.zIso = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  K.dodaj = (d, n) => { const k = new Date(d); k.setDate(k.getDate() + n); return k; };
  K.poniedzialek = (d) => K.dodaj(d, -((d.getDay() + 6) % 7));
  K.godz = (min) => `${Math.floor(min / 60)}:${pad(min % 60)}`;
  K.godz2 = (min) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
  K.zH = (t) => { const [h, m] = String(t).split(':').map(Number); return (h || 0) * 60 + (m || 0); };
  K.dlugaData = (d) => `${K.DNI[d.getDay()]}, ${d.getDate()} ${K.MIES[d.getMonth()]}`;
  K.dniMiedzy = (a, b) => Math.round((K.zIso(b) - K.zIso(a)) / 86400000);
  K.rzadNaMin = (r) => K.START + r * K.KROK;
  K.minNaRzad = (m) => Math.round((m - K.START) / K.KROK);
  K.dzisIso = () => K.iso(new Date());
  K.terazMin = () => { const t = new Date(); return t.getHours() * 60 + t.getMinutes(); };
  /** Czy moment `min` danego dnia już minął. */
  K.minelo = (data, min) => K.zIso(data).getTime() + min * 60000 <= Date.now();
  K.czas = (od, dl) => `${K.godz(od)}–${K.godz(od + dl)}`;
  K.dlTekst = (dl) => (dl < 60 ? `${dl} min` : dl % 60 ? `${Math.floor(dl / 60)} h ${dl % 60} min` : `${dl / 60} h`);
  K.wzgledna = (data) => {
    const r = K.dniMiedzy(K.dzisIso(), data);
    if (r === 0) return 'Dziś';
    if (r === 1) return 'Jutro';
    if (r === -1) return 'Wczoraj';
    const d = K.zIso(data);
    return `${K.DNI_KR[d.getDay()]} ${d.getDate()}.${pad(d.getMonth() + 1)}`;
  };
  K.esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  K.slug = (s) => String(s).toLowerCase().replace(/[ąćęłńóśźż]/g, (c) => ({ ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z' }[c])).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  /* ── Przedziały ────────────────────────────────────────────────────── */
  K.scal = (l) => {
    const s = l.filter((x) => x[1] > x[0]).map((x) => [x[0], x[1]]).sort((a, b) => a[0] - b[0]);
    const w = [];
    for (const x of s) {
      const o = w[w.length - 1];
      if (o && x[0] <= o[1]) o[1] = Math.max(o[1], x[1]);
      else w.push(x);
    }
    return w;
  };
  K.odejmij = (l, b) => {
    const w = [];
    for (const [x, y] of l) {
      if (b[1] <= x || b[0] >= y) { w.push([x, y]); continue; }
      if (b[0] > x) w.push([x, b[0]]);
      if (b[1] < y) w.push([b[1], y]);
    }
    return w;
  };
  K.suma = (l) => l.reduce((s, [a, b]) => s + (b - a), 0);
  K.przeciecie = (l, [a, b]) => l.map(([x, y]) => [Math.max(x, a), Math.min(y, b)]).filter(([x, y]) => y > x);

  /* ── Odczyt danych jednego trybu (D) ───────────────────────────────── */
  K.terap = (D, id) => D.zespol.find((t) => t.id === id) || D.zespol[0];
  K.miejsce = (D, id) => D.miejsca.find((m) => m.id === id) || D.miejsca[0];
  K.usluga = (D, id) => D.uslugi.find((u) => u.id === id) || D.uslugi[0];
  K.kolor = (i) => K.KOLORY[i % K.KOLORY.length];
  K.widoczni = (D) => D.zespol.filter((t) => t.widoczny !== false);

  /** Godziny przyjęć w danym dniu po uwzględnieniu wyjątków (otwarte i zamknięte pojedyncze terminy). */
  K.przedzialy = (D, terap, data) => {
    const dzien = K.zIso(data).getDay();
    let o = K.scal(((D.reguly[terap] || {})[dzien] || []).map((r) => [r.od, r.do]));
    for (const w of D.wyjatki) {
      if (w.terap !== terap || w.data !== data) continue;
      o = w.typ === 'open' ? K.scal([...o, [w.od, w.do]]) : K.odejmij(o, [w.od, w.do]);
    }
    return o;
  };
  K.lok = (D, terap, data, min) => {
    const r = ((D.reguly[terap] || {})[K.zIso(data).getDay()] || []).find((x) => min >= x.od && min < x.do);
    return r ? r.lok : D.miejsca[0].id;
  };
  /** Blokady dotyczące osoby i dnia, z godzinami (cały dzień, jeśli bez godzin). */
  K.blokady = (D, terap, data) =>
    D.blokady
      .filter((b) => (b.terap === terap || b.terap === '*') && data >= b.od && data <= b.do)
      .map((b) => ({ b, od: b.odMin == null ? K.START : b.odMin, do: b.doMin == null ? K.END : b.doMin }));
  K.rezDnia = (D, terap, data) => D.rezerwacje.filter((r) => r.terap === terap && r.data === data).sort((a, b) => a.od - b.od);

  /** Stan każdego 15-minutowego wiersza jednej kolumny: poza | wolne | blokada | rez. */
  K.stanyKolumny = (D, terap, data) => {
    const a = Array.from({ length: K.RZEDY }, () => ({ s: 'poza' }));
    const wiersze = (od, dl) => {
      const r0 = Math.max(0, Math.floor((od - K.START) / K.KROK));
      const r1 = Math.min(K.RZEDY, Math.ceil((od + dl - K.START) / K.KROK));
      return [r0, r1];
    };
    for (const [x, y] of K.przedzialy(D, terap, data)) {
      const [r0, r1] = wiersze(x, y - x);
      for (let r = r0; r < r1; r++) a[r] = { s: 'wolne', lok: K.lok(D, terap, data, K.rzadNaMin(r)) };
    }
    for (const { b, od, do: d } of K.blokady(D, terap, data)) {
      const [r0, r1] = wiersze(od, d - od);
      for (let r = r0; r < r1; r++) a[r] = { s: 'blokada', bl: b, wolneBylo: a[r].s === 'wolne' };
    }
    for (const rez of K.rezDnia(D, terap, data)) {
      const [r0, r1] = wiersze(rez.od, rez.dl);
      for (let r = r0; r < r1; r++) a[r] = { s: 'rez', rez };
    }
    a.forEach((c, r) => { c.past = K.minelo(data, K.rzadNaMin(r) + K.KROK); });
    return a;
  };

  /** Wolne przedziały, które mógłby zająć pacjent: godziny przyjęć bez blokad i rezerwacji (z buforem po wizycie). */
  K.wolnePrzedzialy = (D, terap, data, { bufor = 0 } = {}) => {
    let o = K.przedzialy(D, terap, data);
    for (const { od, do: d } of K.blokady(D, terap, data)) o = K.odejmij(o, [od, d]);
    for (const r of K.rezDnia(D, terap, data)) o = K.odejmij(o, [r.od, r.od + r.dl + bufor]);
    return o;
  };

  /** Konflikt nowej lub przenoszonej wizyty: kolizja z wizytą (twarda) albo poza godzinami / w blokadzie (miękka). */
  K.sprawdz = (D, terap, data, od, dl, ignoruj) => {
    const wynik = { kolizja: null, poza: false, blokada: null };
    const koniec = od + dl;
    if (od < K.START || koniec > K.END) { wynik.poza = true; wynik.zakres = true; }
    wynik.kolizja = K.rezDnia(D, terap, data).find((r) => r.id !== ignoruj && r.od < koniec && r.od + r.dl > od) || null;
    const bl = K.blokady(D, terap, data).find((x) => x.od < koniec && x.do > od);
    wynik.blokada = bl ? bl.b : null;
    const otw = K.przedzialy(D, terap, data);
    if (!otw.some(([x, y]) => od >= x && koniec <= y)) wynik.poza = true;
    return wynik;
  };

  /* ── Co widzi pacjent ──────────────────────────────────────────────── */
  K.terminyPacjenta = (D, uslugaId, { ile = 6, terap = null } = {}) => {
    const u = K.usluga(D, uslugaId);
    const ust = D.ustawienia;
    const teraz = Date.now() + ust.wyprzedzenie * 3600000;
    const wynik = [];
    const osoby = (terap ? D.zespol.filter((t) => t.id === terap) : K.widoczni(D));
    for (let dz = 0; dz <= ust.horyzont && wynik.length < ile; dz++) {
      const data = K.iso(K.dodaj(new Date(), dz));
      const grupy = new Map();
      for (const t of osoby) {
        const wolne = K.wolnePrzedzialy(D, t.id, data, { bufor: ust.bufor });
        for (let s = K.START; s + u.min <= K.END; s += 30) {
          if (K.zIso(data).getTime() + s * 60000 < teraz) continue;
          if (!wolne.some(([x, y]) => s >= x && s + u.min <= y)) continue;
          const g = grupy.get(s) || { data, od: s, dl: u.min, osoby: [], ids: [], lok: K.lok(D, t.id, data, s) };
          g.osoby.push(t.nazwa.replace(/^mgr\s+/, '').split(' ')[0]);
          g.ids.push(t.id);
          grupy.set(s, g);
        }
      }
      const dnia = [...grupy.values()].sort((x, y) => x.od - y.od);
      const wybrane = dnia.length > 2 ? [dnia[0], dnia[Math.floor(dnia.length / 2)]] : dnia;
      for (const g of wybrane) if (wynik.length < ile) wynik.push(g);
    }
    return wynik;
  };

  /* ── Liczby do podsumowań ──────────────────────────────────────────── */
  /** Minuty wolne dla pacjentów w danym dniu (od `odMin` w górę). */
  K.wolneMinuty = (D, osoby, data, odMin = K.START) => {
    let suma = 0;
    for (const t of osoby) suma += K.suma(K.przeciecie(K.wolnePrzedzialy(D, t.id, data), [odMin, K.END]));
    return suma;
  };
  /** Wypełnienie dnia: zajęte minuty przez minuty przyjęć (po odjęciu blokad). */
  K.wypelnienie = (D, osoby, data) => {
    let otw = 0;
    let zaj = 0;
    for (const t of osoby) {
      let o = K.przedzialy(D, t.id, data);
      for (const { od, do: d } of K.blokady(D, t.id, data)) o = K.odejmij(o, [od, d]);
      otw += K.suma(o);
      zaj += K.rezDnia(D, t.id, data).filter((r) => r.status !== 'nieobecny').reduce((s, r) => s + r.dl, 0);
    }
    return { otwarte: otw, zajete: zaj, procent: otw ? Math.min(100, Math.round((zaj / otw) * 100)) : 0 };
  };
  K.godzTekst = (min) => {
    if (min <= 0) return '0 h';
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h && m ? `${h} h ${m} min` : h ? `${h} h` : `${m} min`;
  };
  /** Wcześniejsze wizyty pacjenta (po telefonie), do podpowiedzi „bywał u Was”. */
  K.pacjenci = (D) => {
    const m = new Map();
    for (const r of D.rezerwacje) {
      const k = r.tel.replace(/\D/g, '');
      const p = m.get(k) || { imie: r.imie, tel: r.tel, razem: 0, odwiedzil: 0, nieobecny: 0, ostatnia: null };
      p.razem += 1;
      if (r.status === 'przyszedl') p.odwiedzil += 1;
      if (r.status === 'nieobecny') p.nieobecny += 1;
      if (!p.ostatnia || r.data > p.ostatnia) p.ostatnia = r.data;
      m.set(k, p);
    }
    return m;
  };

  /* ── Zarządzanie dostępnością ──────────────────────────────────────── */
  /** Przedziały wynikające wyłącznie ze stałego grafiku, bez wyjątków. */
  K.regulyDnia = (D, terap, data) => K.scal(((D.reguly[terap] || {})[K.zIso(data).getDay()] || []).map((r) => [r.od, r.do]));

  /**
   * Ustawia, kiedy w danym dniu przyjmuje osoba `terap`: `koncowe` to docelowa lista przedziałów.
   * Zapisujemy tylko różnicę względem stałego grafiku (otwarcia i zamknięcia), żeby lista wyjątków była krótka.
   */
  K.ustawDzien = (D, terap, data, koncowe) => {
    D.wyjatki = D.wyjatki.filter((w) => !(w.terap === terap && w.data === data));
    const baza = K.regulyDnia(D, terap, data);
    const fin = K.scal(koncowe);
    let dodane = fin;
    for (const b of baza) dodane = K.odejmij(dodane, b);
    let zdjete = baza;
    for (const f of fin) zdjete = K.odejmij(zdjete, f);
    dodane.forEach(([od, doo]) => D.wyjatki.push({ terap, data, od, do: doo, typ: 'open' }));
    zdjete.forEach(([od, doo]) => D.wyjatki.push({ terap, data, od, do: doo, typ: 'closed' }));
  };
  /** Otwiera albo zamyka przedział w danym dniu. Zwraca true, jeśli coś się zmieniło. */
  K.maluj = (D, terap, data, od, doo, otworz) => {
    const przed = K.przedzialy(D, terap, data);
    const po = otworz ? K.scal([...przed, [od, doo]]) : K.odejmij(przed, [od, doo]);
    if (JSON.stringify(po) === JSON.stringify(przed)) return false;
    K.ustawDzien(D, terap, data, po);
    return true;
  };
  /** Zamienia godziny widoczne w tygodniu (z wyjątkami) w nowy stały grafik tej osoby. */
  K.grafikZTygodnia = (D, terap, pon) => {
    const nowe = {};
    for (const dz of K.DNI_PRACY) {
      const data = K.iso(K.dodaj(pon, dz - 1));
      const przedz = K.przedzialy(D, terap, data);
      if (przedz.length) nowe[dz] = przedz.map(([od, doo]) => ({ od, do: doo, lok: K.lok(D, terap, data, od) }));
      D.wyjatki = D.wyjatki.filter((w) => !(w.terap === terap && w.data === data));
    }
    D.reguly[terap] = nowe;
  };
  /** Ile godzin w tygodniu przyjmuje osoba według stałego grafiku. */
  K.godzinyTygodnia = (D, terap) => K.DNI_PRACY.reduce((s, dz) => s + ((D.reguly[terap] || {})[dz] || []).reduce((x, r) => x + (r.do - r.od), 0), 0);
  /** Wizyty, które wypadną poza godziny po zmianie (przy zamknięciu przedziału lub blokadzie). */
  K.wizytyWPrzedziale = (D, terap, data, od, doo) => D.rezerwacje.filter((r) => (terap === '*' || r.terap === terap) && r.data === data && r.od < doo && r.od + r.dl > od);

  /* ── Dane przykładowe ──────────────────────────────────────────────── */
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
  const reg = (od, doo, lok) => ({ od: K.zH(od), do: K.zH(doo), lok });
  const PACJENCI = [
    ['Anna Zielińska', '600 100 211'], ['Marek Wysocki', '600 100 232'], ['Ewa Malinowska', '600 100 247'], ['Tadeusz Bąk', '600 100 259'],
    ['Zofia Rutkowska', '600 100 263'], ['Krzysztof Dąb', '600 100 271'], ['Maria Cichoń', '600 100 288'], ['Adam Wilk', '600 100 294'],
    ['Barbara Nowicka', '600 100 305'], ['Grzegorz Pająk', '600 100 316'], ['Katarzyna Woźniak', '600 100 327'], ['Piotr Lis', '600 100 338'],
    ['Joanna Kruk', '600 100 349'], ['Michał Sowa', '600 100 351'], ['Agnieszka Mróz', '600 100 362'], ['Tomasz Gajda', '600 100 373'],
    ['Halina Kaczmarek', '600 100 384'], ['Robert Jasiński', '600 100 395'],
  ];
  const UWAGI = ['', '', '', 'Proszę o termin po południu.', '', 'Pierwsza wizyta u Was.', '', 'Boli od tygodnia, proszę o szybki termin.', ''];

  K.ziarno = (tryb) => {
    const ind = tryb === 'ind';
    const pn = K.poniedzialek(new Date());
    const uslugi = ind
      ? [
          { id: 'pierwsza', nazwa: 'Pierwsza wizyta z badaniem', min: 60, cena: 220, zaliczka: true },
          { id: 'manualna', nazwa: 'Terapia manualna', min: 45, cena: 180, zaliczka: false },
          { id: 'kontrola', nazwa: 'Wizyta kontrolna', min: 30, cena: 120, zaliczka: false },
          { id: 'sport', nazwa: 'Fizjoterapia sportowa', min: 60, cena: 200, zaliczka: true },
          { id: 'tejping', nazwa: 'Kinesiotaping', min: 30, cena: 90, zaliczka: false },
        ]
      : [
          { id: 'pierwsza', nazwa: 'Pierwsza wizyta z badaniem', min: 60, cena: 240, zaliczka: true },
          { id: 'manualna', nazwa: 'Terapia manualna', min: 45, cena: 190, zaliczka: false },
          { id: 'kontrola', nazwa: 'Wizyta kontrolna', min: 30, cena: 130, zaliczka: false },
          { id: 'sport', nazwa: 'Fizjoterapia sportowa', min: 60, cena: 210, zaliczka: true },
          { id: 'uro', nazwa: 'Fizjoterapia uroginekologiczna', min: 60, cena: 230, zaliczka: true },
          { id: 'dzieci', nazwa: 'Fizjoterapia dzieci', min: 45, cena: 180, zaliczka: false },
        ];
    const zespol = ind
      ? [{ id: 'jan', nazwa: 'mgr Jan Kowalski', kolor: 0, widoczny: true }]
      : [
          { id: 'jan', nazwa: 'mgr Jan Kowalski', kolor: 0, widoczny: true },
          { id: 'anna', nazwa: 'mgr Anna Lewandowska', kolor: 1, widoczny: true },
          { id: 'piotr', nazwa: 'mgr Piotr Zawada', kolor: 2, widoczny: true },
        ];
    const miejsca = ind
      ? [
          { id: 'l1', nazwa: 'Gabinet, ul. Przykładowa 1', kr: 'Gabinet', kolor: 0 },
          { id: 'l2', nazwa: 'Studio, ul. Wzorcowa 7', kr: 'Studio', kolor: 1 },
        ]
      : [{ id: 'l1', nazwa: 'ul. Przykładowa 1', kr: 'Przykładowa 1', kolor: 0 }];
    const reguly = ind
      ? {
          jan: {
            1: [reg('8:00', '13:00', 'l1')],
            2: [reg('10:00', '14:00', 'l1')],
            3: [reg('9:00', '12:00', 'l2')],
            4: [reg('15:00', '19:00', 'l1')],
            5: [reg('8:00', '13:00', 'l2')],
          },
        }
      : {
          jan: { 1: [reg('8:00', '12:00', 'l1'), reg('13:00', '16:00', 'l1')], 2: [reg('8:00', '12:00', 'l1'), reg('13:00', '16:00', 'l1')], 3: [reg('8:00', '16:00', 'l1')], 4: [reg('8:00', '16:00', 'l1')], 5: [reg('8:00', '14:00', 'l1')] },
          anna: { 1: [reg('10:00', '18:00', 'l1')], 2: [reg('10:00', '18:00', 'l1')], 3: [reg('10:00', '18:00', 'l1')], 4: [reg('10:00', '18:00', 'l1')], 5: [reg('10:00', '16:00', 'l1')], 6: [reg('9:00', '13:00', 'l1')] },
          piotr: { 2: [reg('8:00', '15:00', 'l1')], 4: [reg('8:00', '15:00', 'l1')], 6: [reg('9:00', '13:00', 'l1')] },
        };

    const rnd = los(ind ? 11 : 29);
    const rezerwacje = [];
    let nr = 0;
    const teraz = Date.now();
    zespol.forEach((t) => {
      for (let tydz = -1; tydz <= 2; tydz++) {
        for (const dzien of K.DNI_PRACY) {
          const rr = reguly[t.id][dzien];
          if (!rr) continue;
          const data = K.dodaj(pn, tydz * 7 + (dzien - 1));
          for (const przedzial of rr) {
            let w = przedzial.od;
            while (w < przedzial.do) {
              if (rnd() < 0.55) {
                const u = uslugi[Math.floor(rnd() * uslugi.length)];
                if (w + u.min <= przedzial.do) {
                  const p = PACJENCI[Math.floor(rnd() * PACJENCI.length)];
                  const strona = rnd() < 0.78;
                  const minela = data.getTime() + (w + u.min) * 60000 <= teraz;
                  let status = 'potwierdzona';
                  if (minela) {
                    const x = rnd();
                    status = x < 0.84 ? 'przyszedl' : x < 0.92 ? 'nieobecny' : 'potwierdzona';
                  }
                  rezerwacje.push({
                    id: `r${tryb}${++nr}`, terap: t.id, data: K.iso(data), od: w, dl: u.min, usluga: u.id,
                    imie: p[0], tel: p[1], uwaga: UWAGI[Math.floor(rnd() * UWAGI.length)], notatka: '',
                    zrodlo: strona ? 'strona' : 'telefon', lok: przedzial.lok, status, nowa: false,
                    zal: strona && u.zaliczka ? { kwota: 50, metoda: ['BLIK', 'BLIK', 'karta', 'przelew'][Math.floor(rnd() * 4)] } : null,
                  });
                  w += u.min;
                }
              }
              w += 15 * (1 + Math.floor(rnd() * 3));
            }
          }
        }
      }
    });
    /* Dwie rezerwacje „świeżo ze strony”: lista „Wymaga uwagi” nie startuje pusta. */
    const przyszle = rezerwacje.filter((r) => r.zrodlo === 'strona' && !K.minelo(r.data, r.od)).slice(1, 4);
    przyszle.slice(0, 2).forEach((r) => { r.nowa = true; });

    const blokady = ind
      ? [{ id: 'b1', terap: 'jan', od: K.iso(K.dodaj(pn, 10)), do: K.iso(K.dodaj(pn, 10)), odMin: null, doMin: null, powod: 'Szkolenie' }]
      : [
          { id: 'b1', terap: 'anna', od: K.iso(K.dodaj(pn, 9)), do: K.iso(K.dodaj(pn, 11)), odMin: null, doMin: null, powod: 'Urlop' },
          { id: 'b2', terap: '*', od: K.iso(K.dodaj(pn, 8)), do: K.iso(K.dodaj(pn, 8)), odMin: K.zH('14:00'), doMin: K.zH('15:00'), powod: 'Zebranie zespołu' },
        ];
    return {
      zespol, miejsca, uslugi, reguly, rezerwacje, blokady, wyjatki: [],
      ustawienia: { wyprzedzenie: 2, horyzont: 60, bufor: 0, auto: true, zaliczki: true, zaliczkaKwota: 50 },
    };
  };
})();
