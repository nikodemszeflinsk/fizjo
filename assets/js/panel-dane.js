/*
 * Panel gabinetu — dane.
 *
 * Dane rezerwacji (zespół, usługi, lokalizacje, grafik, wizyty) są wspólne z kalendarzem
 * i żyją w jego stanie (KAL_UI). Tu są dane, które ma tylko panel: wiadomości do pacjentów
 * i dane gabinetu. Wszystko zapisuje się w tej przeglądarce.
 */
(() => {
  'use strict';

  const K = window.KAL;
  const P = (window.PANEL = window.PANEL || {});
  const KLUCZ = 'panel-cms-v2';

  /* ── Dane rezerwacji: pola, których kalendarz nie potrzebuje, a panel tak ── */
  const godz = (od, doo) => [K.zH(od), K.zH(doo)];
  /** Uzupełnia dane trybu o pola potrzebne panelowi. Niczego nie nadpisuje. */
  P.uzupelnij = (D, tryb) => {
    D.zespol.forEach((t) => {
      if (t.tytul === undefined) t.tytul = 'mgr fizjoterapii';
      if (t.online === undefined) t.online = true;
      if (t.google === undefined) t.google = false;
      if (!t.lokalizacje) t.lokalizacje = D.miejsca.map((m) => m.id);
    });
    if (tryb === 'ent') {
      const przypisane = { jan: ['pierwsza', 'manualna', 'kontrola', 'sport'], anna: ['pierwsza', 'manualna', 'kontrola', 'uro'], piotr: ['pierwsza', 'kontrola', 'dzieci', 'sport'] };
      D.zespol.forEach((t) => { if (!t.uslugi) t.uslugi = przypisane[t.id] ? [...przypisane[t.id]] : D.uslugi.map((u) => u.id); });
    }
    D.uslugi.forEach((u, i) => {
      if (u.online === undefined) u.online = true;
      if (u.kategoria === undefined) u.kategoria = u.id === 'pierwsza' || u.id === 'kontrola' ? 'Wizyty' : 'Terapie';
      if (u.kolej === undefined) u.kolej = i;
    });
    const otwarcie = tryb === 'ent'
      ? [{ 1: godz('8:00', '19:00'), 2: godz('8:00', '19:00'), 3: godz('8:00', '19:00'), 4: godz('8:00', '19:00'), 5: godz('8:00', '17:00'), 6: godz('9:00', '14:00') },
         { 2: godz('8:00', '19:00'), 3: godz('9:00', '19:00'), 4: godz('8:00', '16:00'), 5: godz('8:00', '15:00'), 6: godz('9:00', '13:00') }]
      : [{ 1: godz('8:00', '14:00'), 2: godz('9:00', '15:00'), 4: godz('14:00', '20:00') }, { 3: godz('8:00', '14:00'), 5: godz('8:00', '14:00') }];
    const ADRESY = tryb === 'ent'
      ? [
          { ulica: 'ul. Przykładowa 1', miasto: '30-001 Kraków', telefon: '12 345 67 89', dojazd: 'Tramwaj 4 i 8, przystanek „Rondo”. 3 minuty pieszo.', parking: 'Bezpłatny parking dla pacjentów na tyłach budynku.', dostepnosc: 'Parter, wejście bez schodów.' },
          { ulica: 'ul. Wzorcowa 7', miasto: '30-002 Kraków', telefon: '12 345 67 90', dojazd: 'Autobus 179 i 208, przystanek „Wzorcowa”.', parking: 'Parking pod budynkiem, 4 miejsca dla pacjentów.', dostepnosc: 'I piętro, jest winda.' },
        ]
      : [
          { ulica: 'ul. Przykładowa 1', miasto: '30-001 Kraków', telefon: '600 700 800', dojazd: 'Tramwaj 4 i 8, przystanek „Rondo”.', parking: 'Strefa płatnego parkowania.', dostepnosc: 'I piętro, jest winda.' },
          { ulica: 'ul. Wzorcowa 7', miasto: '30-002 Kraków', telefon: '600 700 800', dojazd: 'Autobus 179, przystanek „Wzorcowa”.', parking: 'Parking pod budynkiem.', dostepnosc: 'Parter.' },
        ];
    D.miejsca.forEach((m, i) => {
      const a = ADRESY[i] || { ulica: m.nazwa, miasto: '', telefon: '', dojazd: '', parking: '', dostepnosc: '' };
      for (const k of ['ulica', 'miasto', 'telefon', 'dojazd', 'parking', 'dostepnosc']) if (m[k] === undefined) m[k] = a[k];
      if (!m.otwarcie) m.otwarcie = JSON.parse(JSON.stringify(otwarcie[i] || {}));
    });
    const U = D.ustawienia;
    if (U.swietaZamkniete === undefined) U.swietaZamkniete = true;
    if (U.wyborTerapeuty === undefined) U.wyborTerapeuty = tryb === 'ent';
    if (U.pierwszyWolny === undefined) U.pierwszyWolny = true;
    if (!D.swietaOtwarte) D.swietaOtwarte = [];
    if (!D.zmianyGrafiku) D.zmianyGrafiku = [];
  };

  /* ── Dane tylko panelu: ustawienia gabinetu i przypomnienia ─────────── */
  P.ziarnoCms = (tryb) => {
    const ent = tryb === 'ent';
    return {
      nazwa: 'Linia Ruchu',
      /* Wiadomości do pacjentów: włączasz i wyłączasz, treść ustawiamy przy wdrożeniu. */
      powiadomienia: { potwierdzenie: true, przypomnienie: true, przypomnienieGodz: 24, odwolanie: true, zmiana: true, doGabinetu: true, doTerapeutow: true },
      /* SMS: 200 wiadomości miesięcznie w utrzymaniu, kolejne pakiety po 200 za 50 zł miesięcznie; własne SMS-y wysłane z panelu. */
      sms: { pakiety: ent ? 1 : 0, wlasne: [] }, /* zespół wysyła więcej wiadomości, więc w demie Team ma jeden dokupiony pakiet */
      pacjenci: {},
      konto: {
        nazwa: ent ? 'Linia Ruchu sp. z o.o.' : 'Linia Ruchu Jan Kowalski',
        email: 'kontakt@linia-ruchu.pl',
        telefon: ent ? '12 345 67 89' : '600 700 800',
        adres: 'ul. Przykładowa 1, 30-001 Kraków',
        wlasciciel: 'Jan Kowalski',
        dodatki: { zaliczki: true },
      },
    };
  };

  /* ── Zapis i odczyt ────────────────────────────────────────────────── */
  function wczytaj() {
    try {
      const z = JSON.parse(localStorage.getItem(KLUCZ));
      if (z && z.dane && z.dane.ind && z.dane.ent) return z;
    } catch (e) { /* pusty start */ }
    return { dane: { ind: P.ziarnoCms('ind'), ent: P.ziarnoCms('ent') } };
  }
  P.cms = wczytaj();
  P.zapiszCms = () => {
    try { localStorage.setItem(KLUCZ, JSON.stringify(P.cms)); } catch (e) { /* demo działa bez zapisu */ }
  };
  P.tryb = () => window.KAL_UI.stan().tryb;
  P.D = () => window.KAL_UI.D();
  P.C = () => P.cms.dane[P.tryb()];
  P.ent = () => P.tryb() === 'ent';
  P.przywrocCms = () => { P.cms = { dane: { ind: P.ziarnoCms('ind'), ent: P.ziarnoCms('ent') } }; P.zapiszCms(); };

  /** Zmiana w danych panelu z możliwością cofnięcia (ten sam komunikat co w kalendarzu). */
  P.zmienCms = (tekst, fn) => {
    const tryb = P.tryb();
    const snap = JSON.stringify(P.cms.dane[tryb]);
    fn(P.C());
    P.zapiszCms();
    P.odswiez();
    window.KAL_UI.toast(tekst, () => { P.cms.dane[tryb] = JSON.parse(snap); P.zapiszCms(); P.odswiez(); });
  };
  /** Zmiana w danych rezerwacji (zespół, usługi, grafik): przez kalendarz, żeby obie strony widziały to samo. */
  P.zmienRez = (tekst, fn) => {
    window.KAL_UI.zmien(tekst, () => fn(P.D()), { zamknij: true });
  };
  /** Bez komunikatu, np. przy pisaniu w polu tekstowym. */
  P.cichoCms = (fn) => { fn(P.C()); P.zapiszCms(); };
  P.cichoRez = (fn) => { fn(P.D()); window.KAL_UI.zapisz(); };
})();
