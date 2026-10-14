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
    ind: { terapeuci: 1, miejsca: 3, uslugi: 7, nazwa: 'Individual' },
    ent: { terapeuci: Infinity, miejsca: Infinity, uslugi: Infinity, nazwa: 'Team' },
  };
  /** „3 z 7” albo „3 · bez limitu”, gdy pakiet nie ogranicza liczby. */
  K.zLimitu = (n, max) => (max === Infinity ? `${n} · bez limitu` : `${n} z ${max}`);
  K.STATUSY = {
    potwierdzona: 'Potwierdzona',
    oczekuje: 'Do potwierdzenia',
    przyszedl: 'Odbyta',
    nieobecny: 'Nieodbyta',
    odwolana: 'Odwołana przez pacjenta',
    anulowana: 'Anulowana przez gabinet',
  };
  /** Wizyta odwołana albo anulowana nie zajmuje terminu, ale zostaje w historii i w statystykach. */
  K.ODWOLANE = ['odwolana', 'anulowana'];
  K.aktywna = (r) => !K.ODWOLANE.includes(r.status);
  /** Skąd przyszła rezerwacja. „strona” to system rezerwacji online. */
  K.ZRODLA = {
    strona: 'Strona (rezerwacja online)',
    telefon: 'Telefon',
    powrot: 'Powracający pacjent',
    polecenie: 'Polecenie',
    znanylekarz: 'ZnanyLekarz',
    google: 'Wizytówka Google',
    social: 'Instagram lub Facebook',
    osobiscie: 'Przyszedł osobiście',
    inne: 'Inne',
  };
  K.ZRODLA_KR = { strona: 'strona', telefon: 'telefon', powrot: 'powracający', polecenie: 'polecenie', znanylekarz: 'ZnanyLekarz', google: 'Google', social: 'social media', osobiscie: 'osobiście', inne: 'inne' };
  /** Cena konkretnej wizyty (może różnić się od cennika, np. rabat). */
  K.cena = (D, r) => (r.cena != null ? r.cena : (D.uslugi.find((u) => u.id === r.usluga) || { cena: 0 }).cena);

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

  /* ── Święta (Polska) ──────────────────────────────────────────────── */
  const wielkanoc = (y) => {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const mies = Math.floor((h + l - 7 * m + 114) / 31), dz = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, mies - 1, dz);
  };
  const pamiecSwiat = new Map();
  /** Dni ustawowo wolne w danym roku: data → nazwa. Od 2025 r. wolna jest też Wigilia. */
  K.swieta = (rok) => {
    if (pamiecSwiat.has(rok)) return pamiecSwiat.get(rok);
    const w = wielkanoc(rok);
    const s = new Map([
      [`${rok}-01-01`, 'Nowy Rok'], [`${rok}-01-06`, 'Trzech Króli'],
      [K.iso(w), 'Wielkanoc'], [K.iso(K.dodaj(w, 1)), 'Poniedziałek Wielkanocny'],
      [`${rok}-05-01`, 'Święto Pracy'], [`${rok}-05-03`, 'Święto Konstytucji 3 Maja'],
      [K.iso(K.dodaj(w, 49)), 'Zielone Świątki'], [K.iso(K.dodaj(w, 60)), 'Boże Ciało'],
      [`${rok}-08-15`, 'Wniebowzięcie NMP'], [`${rok}-11-01`, 'Wszystkich Świętych'], [`${rok}-11-11`, 'Święto Niepodległości'],
      [`${rok}-12-25`, 'Boże Narodzenie'], [`${rok}-12-26`, 'Drugi dzień świąt'],
    ]);
    if (rok >= 2025) s.set(`${rok}-12-24`, 'Wigilia');
    pamiecSwiat.set(rok, s);
    return s;
  };
  K.swieto = (data) => K.swieta(Number(data.slice(0, 4))).get(data) || null;
  /** Czy gabinet ma tego dnia zamknięte z powodu święta (domyślnie tak, chyba że ktoś je otworzył). */
  K.swietoZamkniete = (D, data) => !!K.swieto(data) && (D.ustawienia || {}).swietaZamkniete !== false && !(D.swietaOtwarte || []).includes(data);

  /* ── Grafik: wersja obowiązująca w danym dniu ──────────────────────── */
  /** Zaplanowane zmiany grafiku: od podanej daty obowiązuje inny stały grafik. */
  K.wersjaGrafiku = (D, data) => (D.zmianyGrafiku || []).filter((z) => z.od <= data).sort((a, b) => b.od.localeCompare(a.od))[0] || null;
  K.regulyOsoby = (D, terap, data) => {
    const w = data ? K.wersjaGrafiku(D, data) : null;
    return (w ? w.reguly[terap] : D.reguly[terap]) || {};
  };

  /** Godziny przyjęć w danym dniu po uwzględnieniu świąt i wyjątków (otwarte i zamknięte pojedyncze terminy). */
  K.przedzialy = (D, terap, data) => {
    let o = K.bazaDnia(D, terap, data);
    for (const w of D.wyjatki) {
      if (w.terap !== terap || w.data !== data) continue;
      o = w.typ === 'open' ? K.scal([...o, [w.od, w.do]]) : K.odejmij(o, [w.od, w.do]);
    }
    return o;
  };
  K.lok = (D, terap, data, min) => {
    const w = D.wyjatki.find((x) => x.terap === terap && x.data === data && x.typ === 'open' && x.lok && min >= x.od && min < x.do);
    if (w) return w.lok;
    const r = (K.regulyOsoby(D, terap, data)[K.zIso(data).getDay()] || []).find((x) => min >= x.od && min < x.do);
    return r ? r.lok : D.miejsca[0].id;
  };
  /** Blokady dotyczące osoby i dnia, z godzinami (cały dzień, jeśli bez godzin). */
  K.blokady = (D, terap, data) =>
    D.blokady
      .filter((b) => (b.terap === terap || b.terap === '*') && data >= b.od && data <= b.do)
      .map((b) => ({ b, od: b.odMin == null ? K.START : b.odMin, do: b.doMin == null ? K.END : b.doMin }));
  K.rezDnia = (D, terap, data) => D.rezerwacje.filter((r) => r.terap === terap && r.data === data && K.aktywna(r)).sort((a, b) => a.od - b.od);

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
    /* Termin pokazujemy tylko u osób, które tę usługę wykonują i przyjmują przez internet. */
    const osoby = (terap ? D.zespol.filter((t) => t.id === terap) : K.widoczni(D)).filter((t) => t.online !== false && (!t.uslugi || t.uslugi.includes(u.id)));
    if (u.online === false) return [];
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

  /* ── Zmiana wizyty przez pacjenta (link w e-mailu, bez konta i bez danych zdrowotnych) ─────── */
  K.POWODY_PACJENTA = ['Zmiana planów', 'Nie mogę w tym terminie', 'Umówiłem się gdzie indziej', 'Wolę nie podawać'];
  /** Zasady gabinetu: czy pacjent może zmieniać wizyty sam i do ilu godzin przed wizytą. */
  K.polityka = (D) => {
    const u = D.ustawienia || {};
    return { wl: u.pacjentZmiany !== false, godz: u.pacjentGodz == null ? 24 : Number(u.pacjentGodz) };
  };
  /** Czy pacjent może teraz sam zmienić albo odwołać wizytę. `kod` mówi, dlaczego nie. */
  K.zmianaPacjenta = (D, r) => {
    const p = K.polityka(D);
    if (!K.aktywna(r)) return { ok: false, kod: 'odwolana' };
    if (r.status === 'przyszedl' || r.status === 'nieobecny' || K.minelo(r.data, r.od)) return { ok: false, kod: 'minela' };
    if (!p.wl) return { ok: false, kod: 'wylaczone', godz: p.godz };
    const doWizyty = (K.zIso(r.data).getTime() + r.od * 60000 - Date.now()) / 3600000;
    if (doWizyty < p.godz) return { ok: false, kod: 'za-pozno', godz: p.godz };
    return { ok: true, godz: p.godz };
  };
  /**
   * Wolne terminy, na które pacjent może przełożyć wizytę: ta sama usługa i długość, ten sam terapeuta
   * (albo `terap: 'any'`, czyli ktokolwiek, kto ją wykonuje). Własny termin wizyty liczy się jako wolny.
   * Zwraca listę dni z godzinami, od najbliższego.
   */
  K.terminyDoZmiany = (D, r, { dni = 21, terap = null } = {}) => {
    const ust = D.ustawienia;
    const bezTej = Object.assign({}, D, { rezerwacje: D.rezerwacje.filter((x) => x.id !== r.id) });
    const teraz = Date.now() + ust.wyprzedzenie * 3600000;
    const osoby = terap === 'any'
      ? K.widoczni(D).filter((t) => t.online !== false && (!t.uslugi || t.uslugi.includes(r.usluga)))
      : [K.terap(D, terap || r.terap)];
    const wynik = [];
    const max = Math.min(dni, ust.horyzont);
    for (let dz = 0; dz <= max; dz++) {
      const data = K.iso(K.dodaj(new Date(), dz));
      const sloty = new Map();
      for (const t of osoby) {
        const wolne = K.wolnePrzedzialy(bezTej, t.id, data, { bufor: ust.bufor });
        for (let st = K.START; st + r.dl <= K.END; st += 30) {
          if (K.zIso(data).getTime() + st * 60000 < teraz) continue;
          if (!wolne.some(([x, y]) => st >= x && st + r.dl <= y)) continue;
          if (data === r.data && st === r.od && t.id === r.terap) continue;
          const g = sloty.get(st) || { data, od: st, dl: r.dl, osoby: [] };
          g.osoby.push({ id: t.id, nazwa: t.nazwa, lok: K.lok(D, t.id, data, st) });
          sloty.set(st, g);
        }
      }
      if (sloty.size) wynik.push({ data, sloty: [...sloty.values()].sort((a, b) => a.od - b.od) });
    }
    return wynik;
  };
  /** Opis zmiany zrobionej przez pacjenta, do pokazania gabinetowi. */
  K.opisZmiany = (r, krotko = false) => {
    if (!r.zmiana) return '';
    const bylo = r.zmiana.bylo ? `${K.wzgledna(r.zmiana.bylo.data)}, ${K.godz(r.zmiana.bylo.od)}`.toLowerCase() : '';
    const co = r.zmiana.typ === 'odwolana' ? 'odwołał wizytę z' : 'przełożył wizytę z';
    return krotko ? `${co[0].toUpperCase()}${co.slice(1)} ${bylo}` : `Pacjent ${co} ${bylo}`;
  };
  /** Zapis przełożenia. Zwraca false, gdy termin w międzyczasie ktoś zajął. */
  K.przelozPacjent = (D, r, { data, od, terap }) => {
    const kto = terap || r.terap;
    const w = K.sprawdz(D, kto, data, od, r.dl, r.id);
    if (w.kolizja || w.poza || w.blokada) return false;
    const bylo = { data: r.data, od: r.od, terap: r.terap };
    Object.assign(r, { data, od, terap: kto, lok: K.lok(D, kto, data, od), zmiana: { typ: 'przelozona', kiedy: new Date().toISOString(), bylo, widziana: false }, nowa: false });
    (r.zmiany = r.zmiany || []).push({ kiedy: new Date().toISOString(), typ: 'przelozona', bylo, jest: { data, od, terap: kto } });
    return true;
  };
  K.odwolajPacjent = (D, r, powod) => {
    const bylo = { data: r.data, od: r.od, terap: r.terap };
    Object.assign(r, {
      status: 'odwolana', powod: `Pacjent odwołał z linku: ${powod || 'bez podania powodu'}`, pozno: false, odwolano: new Date().toISOString(), nowa: false,
      zmiana: { typ: 'odwolana', kiedy: new Date().toISOString(), bylo, widziana: false },
    });
    (r.zmiany = r.zmiany || []).push({ kiedy: new Date().toISOString(), typ: 'odwolana', bylo });
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
    const posortowane = [...D.rezerwacje].sort((a, b) => (a.data + K.pad(a.od)).localeCompare(b.data + K.pad(b.od)));
    for (const r of posortowane) {
      const k = r.tel.replace(/\D/g, '');
      const p = m.get(k) || { imie: r.imie, tel: r.tel, razem: 0, odwiedzil: 0, nieobecny: 0, odwolal: 0, ostatnia: null, ostatniaOdbyta: null, nastepna: null, pierwsza: r.data, zrodlo: r.zrodlo, przychod: 0, terap: r.terap };
      p.razem += 1;
      if (r.status === 'przyszedl') { p.odwiedzil += 1; p.przychod += K.cena(D, r); p.ostatniaOdbyta = r.data; }
      if (r.status === 'nieobecny') p.nieobecny += 1;
      if (K.ODWOLANE.includes(r.status)) p.odwolal += 1;
      if (K.aktywna(r)) {
        if (!p.ostatnia || r.data > p.ostatnia) p.ostatnia = r.data;
        if (!K.minelo(r.data, r.od) && (!p.nastepna || r.data + K.pad(r.od) < p.nastepna.data + K.pad(p.nastepna.od))) p.nastepna = r;
      }
      p.terap = r.terap;
      m.set(k, p);
    }
    return m;
  };


  /* ── Zarządzanie dostępnością ──────────────────────────────────────── */
  /** Przedziały wynikające wyłącznie ze stałego grafiku, bez wyjątków. */
  K.regulyDnia = (D, terap, data) => K.scal((K.regulyOsoby(D, terap, data)[K.zIso(data).getDay()] || []).map((r) => [r.od, r.do]));
  /** Godziny z grafiku, zanim nałożymy wyjątki: w święto zamknięte, poza tym według obowiązującej wersji grafiku. */
  K.bazaDnia = (D, terap, data) => (K.swietoZamkniete(D, data) ? [] : K.regulyDnia(D, terap, data));

  /**
   * Ustawia, kiedy w danym dniu przyjmuje osoba `terap`: `koncowe` to docelowa lista przedziałów.
   * Zapisujemy tylko różnicę względem stałego grafiku (otwarcia i zamknięcia), żeby lista wyjątków była krótka.
   */
  K.ustawDzien = (D, terap, data, koncowe) => {
    const lokacje = D.wyjatki.filter((w) => w.terap === terap && w.data === data && w.typ === 'open' && w.lok);
    D.wyjatki = D.wyjatki.filter((w) => !(w.terap === terap && w.data === data));
    const baza = K.bazaDnia(D, terap, data);
    const fin = K.scal(koncowe);
    let dodane = fin;
    for (const b of baza) dodane = K.odejmij(dodane, b);
    let zdjete = baza;
    for (const f of fin) zdjete = K.odejmij(zdjete, f);
    dodane.forEach(([od, doo]) => {
      const stara = lokacje.find((w) => w.od < doo && w.do > od);
      D.wyjatki.push({ terap, data, od, do: doo, typ: 'open', ...(stara ? { lok: stara.lok } : {}) });
    });
    zdjete.forEach(([od, doo]) => D.wyjatki.push({ terap, data, od, do: doo, typ: 'closed' }));
  };
  /** Otwiera albo zamyka przedział w danym dniu. Zwraca true, jeśli coś się zmieniło. */
  K.maluj = (D, terap, data, od, doo, otworz, lok) => {
    const przed = K.przedzialy(D, terap, data);
    const po = otworz ? K.scal([...przed, [od, doo]]) : K.odejmij(przed, [od, doo]);
    if (JSON.stringify(po) === JSON.stringify(przed)) return false;
    K.ustawDzien(D, terap, data, po);
    /* Jednorazowo otwarte godziny mogą mieć własne miejsce przyjęć. */
    if (otworz && lok) D.wyjatki.filter((w) => w.terap === terap && w.data === data && w.typ === 'open' && w.od < doo && w.do > od).forEach((w) => { w.lok = lok; });
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
  K.wizytyWPrzedziale = (D, terap, data, od, doo) => D.rezerwacje.filter((r) => (terap === '*' || r.terap === terap) && r.data === data && K.aktywna(r) && r.od < doo && r.od + r.dl > od);

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
  const IMIONA = ['Anna Zielińska', 'Marek Wysocki', 'Ewa Malinowska', 'Tadeusz Bąk', 'Zofia Rutkowska', 'Krzysztof Dąb', 'Maria Cichoń', 'Adam Wilk',
    'Barbara Nowicka', 'Grzegorz Pająk', 'Katarzyna Woźniak', 'Piotr Lis', 'Joanna Kruk', 'Michał Sowa', 'Agnieszka Mróz', 'Tomasz Gajda',
    'Halina Kaczmarek', 'Robert Jasiński', 'Magdalena Pawlak', 'Łukasz Zając', 'Monika Wróbel', 'Jakub Michalski', 'Aleksandra Kozieł', 'Paweł Nowak',
    'Ewelina Krawczyk', 'Dariusz Sikora', 'Natalia Baran', 'Sebastian Kubiak', 'Iwona Szymańska', 'Mateusz Górski', 'Karolina Wójcik', 'Henryk Lewicki',
    'Beata Ostrowska', 'Wojciech Dudek', 'Patrycja Mazur', 'Rafał Czarnecki', 'Dorota Sadowska', 'Kamil Tomaszewski', 'Renata Pietrzak', 'Bartosz Jabłoński'];
  const PACJENCI = IMIONA.map((n, i) => [n, `600 1${String(10 + Math.floor(i / 10)).padStart(2, '0')} ${String(200 + i * 7).padStart(3, '0')}`]);

  /* Kto z zespołu Team prowadzi które usługi (te same listy podpowiada panel). */
  const USLUGI_TERAP = { jan: ['pierwsza', 'manualna', 'kontrola', 'sport'], anna: ['pierwsza', 'manualna', 'kontrola', 'uro'], piotr: ['pierwsza', 'kontrola', 'dzieci', 'sport'] };
  const kobieta = (imie) => /a$/i.test(imie.split(' ')[0]) && !/^kuba/i.test(imie);
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
      : [
          { id: 'l1', nazwa: 'Klinika Podgórze, ul. Przykładowa 1', kr: 'Podgórze', kolor: 0 },
          { id: 'l2', nazwa: 'Filia Bronowice, ul. Wzorcowa 7', kr: 'Bronowice', kolor: 1 },
        ];
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
          jan: { 1: [reg('8:00', '12:00', 'l1'), reg('13:00', '16:00', 'l1')], 2: [reg('8:00', '12:00', 'l1'), reg('14:00', '18:00', 'l2')], 3: [reg('8:00', '16:00', 'l1')], 4: [reg('8:00', '16:00', 'l1')], 5: [reg('8:00', '14:00', 'l2')] },
          anna: { 1: [reg('10:00', '18:00', 'l1')], 2: [reg('10:00', '18:00', 'l1')], 3: [reg('10:00', '18:00', 'l2')], 4: [reg('10:00', '18:00', 'l1')], 5: [reg('10:00', '16:00', 'l1')], 6: [reg('9:00', '13:00', 'l1')] },
          piotr: { 2: [reg('8:00', '13:00', 'l2')], 4: [reg('8:00', '15:00', 'l2')], 6: [reg('9:00', '13:00', 'l2')] },
        };

    const rnd = los(ind ? 11 : 29);
    const rezerwacje = [];
    let nr = 0;
    const teraz = Date.now();
    /* Każdy pacjent ma jedno źródło pozyskania (pierwsza wizyta), kolejne wizyty umawia na stronie albo telefonicznie. */
    const pozyskanie = PACJENCI.map(() => { const x = rnd(); return x < 0.5 ? 'strona' : x < 0.64 ? 'polecenie' : x < 0.76 ? 'znanylekarz' : x < 0.86 ? 'google' : x < 0.93 ? 'telefon' : 'social'; });
    const byl = new Set();
    const TYGODNIE = [-8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3];
    zespol.forEach((t) => {
      for (const tydz of TYGODNIE) {
        for (const dzien of K.DNI_PRACY) {
          const rr = reguly[t.id][dzien];
          if (!rr) continue;
          const data = K.dodaj(pn, tydz * 7 + (dzien - 1));
          for (const przedzial of rr) {
            let w = przedzial.od;
            while (w < przedzial.do) {
              if (rnd() < (tydz > 1 ? 0.38 : 0.58)) {
                const mozliwe = ind ? uslugi : uslugi.filter((x) => USLUGI_TERAP[t.id].includes(x.id));
                const u = mozliwe[Math.floor(rnd() * mozliwe.length)];
                if (w + u.min <= przedzial.do) {
                  /* Baza pacjentów rośnie z tygodnia na tydzień, więc co tydzień przychodzą nowi. */
                  const pula = Math.min(PACJENCI.length, (ind ? 10 : 16) + (tydz + 8) * (ind ? 3 : 4));
                  let i = Math.floor(rnd() * pula);
                  /* Fizjoterapia uroginekologiczna: w przykładowych danych tylko pacjentki. */
                  if (u.id === 'uro') for (let k = 0; k < pula && !kobieta(PACJENCI[i][0]); k++) i = (i + 1) % pula;
                  const p = PACJENCI[i];
                  const pierwsza = !byl.has(i);
                  byl.add(i);
                  const zrodlo = pierwsza ? pozyskanie[i] : rnd() < 0.62 ? 'strona' : rnd() < 0.6 ? 'powrot' : 'telefon';
                  const minela = data.getTime() + (w + u.min) * 60000 <= teraz;
                  const swieza = minela && teraz - data.getTime() < 2 * 86400000;
                  let status = 'potwierdzona';
                  const x = rnd();
                  if (minela) status = swieza && x < 0.35 ? 'potwierdzona' : x < 0.82 ? 'przyszedl' : x < 0.88 ? 'nieobecny' : x < 0.97 ? 'odwolana' : 'anulowana';
                  else if (x < 0.05) status = 'odwolana';
                  const r = {
                    id: `r${tryb}${++nr}`, terap: t.id, data: K.iso(data), od: w, dl: u.min, usluga: u.id, cena: u.cena,
                    imie: p[0], tel: p[1], uwaga: zrodlo === 'strona' ? UWAGI[Math.floor(rnd() * UWAGI.length)] : '', notatka: '',
                    zrodlo, lok: przedzial.lok, status, nowa: false,
                    zal: zrodlo === 'strona' && u.zaliczka ? { kwota: 50, metoda: ['BLIK', 'BLIK', 'karta', 'przelew'][Math.floor(rnd() * 4)] } : null,
                  };
                  if (K.ODWOLANE.includes(status)) { r.powod = status === 'odwolana' ? 'Pacjent odwołał' : 'Gabinet odwołał'; r.pozno = rnd() < 0.3; }
                  rezerwacje.push(r);
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
    const przyszle = rezerwacje.filter((r) => r.zrodlo === 'strona' && K.aktywna(r) && !K.minelo(r.data, r.od)).slice(1, 4);
    przyszle.slice(0, 2).forEach((r) => { r.nowa = true; });

    const blokady = ind
      ? [{ id: 'b1', terap: 'jan', od: K.iso(K.dodaj(pn, 10)), do: K.iso(K.dodaj(pn, 10)), odMin: null, doMin: null, powod: 'Szkolenie' }]
      : [
          { id: 'b1', terap: 'anna', od: K.iso(K.dodaj(pn, 9)), do: K.iso(K.dodaj(pn, 11)), odMin: null, doMin: null, powod: 'Urlop' },
          { id: 'b2', terap: '*', od: K.iso(K.dodaj(pn, 8)), do: K.iso(K.dodaj(pn, 8)), odMin: K.zH('14:00'), doMin: K.zH('15:00'), powod: 'Zebranie zespołu' },
        ];
    return {
      zespol, miejsca, uslugi, reguly, rezerwacje, blokady, wyjatki: [],
      ustawienia: { wyprzedzenie: 2, horyzont: 60, bufor: 0, auto: true, zaliczki: true, zaliczkaKwota: 50, pacjentZmiany: true, pacjentGodz: 24 },
    };
  };
})();
