/*
 * Panel gabinetu — dane.
 *
 * Dane rezerwacji (zespół, usługi, lokalizacje, grafik, wizyty) są wspólne z kalendarzem
 * i żyją w jego stanie (KAL_UI). Tu są dane, które ma tylko panel: treści strony, formularz
 * rezerwacji, powiadomienia, płatności i konto. Wszystko zapisuje się w tej przeglądarce.
 */
(() => {
  'use strict';

  const K = window.KAL;
  const P = (window.PANEL = window.PANEL || {});
  const KLUCZ = 'panel-cms-v1';

  /* ── Dane rezerwacji: pola, których kalendarz nie potrzebuje, a panel tak ── */
  const PROFILE = {
    jan: { tytul: 'mgr fizjoterapii', bio: 'Od 9 lat pracuję z bólem kręgosłupa i z pacjentami po urazach sportowych. Na pierwszej wizycie szukam przyczyny, a nie tylko miejsca, które boli.', specjalizacje: ['Kręgosłup', 'Terapia manualna', 'Fizjoterapia sportowa'] },
    anna: { tytul: 'mgr fizjoterapii', bio: 'Zajmuję się fizjoterapią uroginekologiczną i pracą z pacjentkami w ciąży i po porodzie.', specjalizacje: ['Uroginekologia', 'Kobiety w ciąży', 'Rozejście mięśni brzucha'] },
    piotr: { tytul: 'mgr fizjoterapii', bio: 'Pracuję z dziećmi i młodzieżą: wady postawy, skolioza, powrót do sportu po kontuzji.', specjalizacje: ['Dzieci', 'Wady postawy', 'Powrót do sportu'] },
  };
  const OPISY_USLUG = {
    pierwsza: 'Wywiad, badanie ruchu i pierwsza terapia. Wychodzisz z planem na kolejne tygodnie.',
    manualna: 'Praca na tkankach i stawach, dobrana do tego, co wyszło w badaniu.',
    kontrola: 'Sprawdzamy postępy i zmieniamy ćwiczenia, jeśli trzeba.',
    sport: 'Diagnostyka i terapia po kontuzji, z planem powrotu do treningów.',
    tejping: 'Plastrowanie wspierające terapię, zwykle jako uzupełnienie wizyty.',
    uro: 'Terapia mięśni dna miednicy, w ciąży i po porodzie.',
    dzieci: 'Wizyta dla dzieci i młodzieży: wady postawy, skolioza, kontuzje.',
  };
  const godz = (od, doo) => [K.zH(od), K.zH(doo)];
  /** Uzupełnia dane trybu o pola potrzebne panelowi. Niczego nie nadpisuje. */
  P.uzupelnij = (D, tryb) => {
    D.zespol.forEach((t) => {
      const p = PROFILE[t.id] || { tytul: 'mgr fizjoterapii', bio: '', specjalizacje: [] };
      if (t.tytul === undefined) t.tytul = p.tytul;
      if (t.bio === undefined) t.bio = p.bio;
      if (!t.specjalizacje) t.specjalizacje = [...p.specjalizacje];
      if (t.online === undefined) t.online = true;
      if (t.naStronie === undefined) t.naStronie = true;
      if (t.google === undefined) t.google = false;
      if (!t.lokalizacje) t.lokalizacje = D.miejsca.map((m) => m.id);
    });
    if (tryb === 'ent') {
      const przypisane = { jan: ['pierwsza', 'manualna', 'kontrola', 'sport'], anna: ['pierwsza', 'manualna', 'kontrola', 'uro'], piotr: ['pierwsza', 'kontrola', 'dzieci', 'sport'] };
      D.zespol.forEach((t) => { if (!t.uslugi) t.uslugi = przypisane[t.id] ? [...przypisane[t.id]] : D.uslugi.map((u) => u.id); });
    }
    D.uslugi.forEach((u, i) => {
      if (u.opis === undefined) u.opis = OPISY_USLUG[u.id] || '';
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

  /* ── Dane tylko panelu ─────────────────────────────────────────────── */
  const PROBLEMY = [
    { id: 'kregoslup', tytul: 'Ból kręgosłupa', slug: 'bol-kregoslupa', wstep: 'Ból pleców, który wraca falami albo nie pozwala przespać nocy, zwykle ma konkretną przyczynę. Na pierwszej wizycie jej szukamy.', objawy: ['Ból w dolnej części pleców', 'Sztywność rano', 'Ból nasila się przy siedzeniu'], przebieg: 'Wywiad i badanie ruchu, terapia manualna i ćwiczenia do domu. Zwykle 4–6 wizyt.', uslugi: ['pierwsza', 'manualna'], faq: [{ p: 'Czy potrzebuję skierowania?', o: 'Nie. Na wizytę prywatną skierowanie nie jest potrzebne.' }] },
    { id: 'rwa', tytul: 'Rwa kulszowa', slug: 'rwa-kulszowa', wstep: 'Ból promieniujący do nogi, mrowienie albo drętwienie. Sprawdzamy, skąd się bierze, i układamy plan terapii.', objawy: ['Ból promieniuje do pośladka i nogi', 'Mrowienie stopy', 'Ból przy kaszlu lub kichaniu'], przebieg: 'Badanie neurologiczne i ruchowe, terapia i ćwiczenia. Zwykle 5–8 wizyt.', uslugi: ['pierwsza', 'manualna'], faq: [] },
    { id: 'bark', tytul: 'Ból barku', slug: 'bol-barku', wstep: 'Ból przy podnoszeniu ręki, sięganiu za plecy albo w nocy na boku. Najczęściej da się go zmniejszyć bez zabiegów.', objawy: ['Ból przy unoszeniu ręki', 'Ból w nocy na boku', 'Ograniczony zakres ruchu'], przebieg: 'Testy funkcjonalne, terapia i ćwiczenia wzmacniające.', uslugi: ['pierwsza', 'manualna'], faq: [] },
    { id: 'sport', tytul: 'Fizjoterapia sportowa', slug: 'fizjoterapia-sportowa', wstep: 'Kontuzja, przeciążenie albo powrót do treningów. Planujemy terapię pod Twój sport.', objawy: ['Ból po treningu', 'Uraz stawu skokowego lub kolana', 'Przeciążenie ścięgien'], przebieg: 'Diagnostyka funkcjonalna, terapia i plan powrotu do sportu.', uslugi: ['sport'], faq: [] },
    { id: 'ciaza', tytul: 'Fizjoterapia w ciąży i po porodzie', slug: 'fizjoterapia-w-ciazy', wstep: 'Ból pleców w ciąży, rozejście mięśni brzucha, nietrzymanie moczu. Pracujemy delikatnie i bez pośpiechu.', objawy: ['Ból miednicy w ciąży', 'Rozejście mięśni brzucha', 'Nietrzymanie moczu po porodzie'], przebieg: 'Wywiad, badanie i terapia dopasowana do etapu ciąży lub połogu.', uslugi: ['uro'], faq: [] },
    { id: 'dzieci', tytul: 'Wady postawy u dzieci', slug: 'wady-postawy-dzieci', wstep: 'Skolioza, plecy okrągłe, płaskostopie. Badamy dziecko i uczymy ćwiczeń, które da się robić w domu.', objawy: ['Nierówne łopatki lub barki', 'Garbienie się', 'Szybkie męczenie się przy staniu'], przebieg: 'Badanie postawy i plan ćwiczeń z kontrolą co kilka tygodni.', uslugi: ['dzieci'], faq: [] },
    { id: 'kolano', tytul: 'Ból kolana', slug: 'bol-kolana', wstep: 'Ból przy schodach, przysiadzie albo bieganiu. Sprawdzamy, co go wywołuje.', objawy: ['Ból przy schodzeniu ze schodów', 'Obrzęk', 'Ból przy przysiadzie'], przebieg: 'Testy, terapia i ćwiczenia stabilizujące.', uslugi: ['pierwsza', 'manualna'], faq: [] },
  ];

  P.ziarnoCms = (tryb) => {
    const ent = tryb === 'ent';
    const problemy = (ent ? PROBLEMY.slice(0, 7) : PROBLEMY.slice(0, 4)).map((x, i) => ({
      ...JSON.parse(JSON.stringify(x)),
      uslugi: x.uslugi,
      seoTytul: `${x.tytul} — fizjoterapia Kraków | Linia Ruchu`,
      seoOpis: `${x.wstep.split('.')[0]}. Umów wizytę online w Krakowie.`,
      status: i === (ent ? 6 : 3) ? 'szkic' : 'opublikowana',
    }));
    const strona = {
      nazwa: 'Linia Ruchu',
      haslo: ent ? 'Klinika fizjoterapii w Krakowie' : 'Fizjoterapia w Krakowie',
      glowna: {
        h1: 'Co Cię boli?',
        lead: 'Zacznijmy od znalezienia przyczyny. Wybierz problem albo od razu umów wizytę.',
        cta: 'Umów wizytę',
        sekcje: [
          { id: 'problemy', nazwa: 'Problemy, z którymi przychodzą pacjenci', wl: true },
          { id: 'terminy', nazwa: 'Najbliższe wolne terminy', wl: true },
          { id: 'zespol', nazwa: ent ? 'Zespół' : 'O mnie', wl: true },
          { id: 'cennik', nazwa: 'Cennik', wl: true },
          { id: 'opinie', nazwa: 'Opinie pacjentów', wl: true },
          { id: 'faq', nazwa: 'Najczęstsze pytania', wl: true },
          { id: 'kontakt', nazwa: 'Kontakt i dojazd', wl: true },
        ],
      },
      problemy,
      oNas: { tytul: ent ? 'O klinice' : 'O mnie', tekst: ent ? 'Jesteśmy zespołem trzech fizjoterapeutów. Każdy pacjent zaczyna od badania, a plan terapii układamy razem z nim.' : 'Jestem fizjoterapeutą od 9 lat. Przyjmuję w dwóch miejscach w Krakowie.' },
      faq: [
        { p: 'Czy potrzebuję skierowania?', o: 'Nie. Na wizyty prywatne skierowanie nie jest potrzebne.' },
        { p: 'Co zabrać na pierwszą wizytę?', o: 'Wygodny strój i wyniki badań, jeśli je masz (np. rezonans, RTG).' },
        { p: 'Jak odwołać wizytę?', o: 'Link do odwołania jest w e-mailu z potwierdzeniem. Prosimy o odwołanie najpóźniej dzień wcześniej.' },
      ],
      opinie: { google: { pokaz: true, ocena: 4.9, liczba: ent ? 128 : 64 }, wlasne: [{ autor: 'Pani Katarzyna', tekst: 'Po trzech wizytach pierwszy raz od miesięcy przespałam noc bez bólu.', zgoda: true }] },
      komunikat: { wl: false, tekst: 'W dniach 20–24 października gabinet jest nieczynny. Rezerwacje na kolejne dni działają normalnie.', od: '', do: '', typ: 'info' },
      wyglad: { styl: 'niebieski', logo: false, zdjecia: [
        { id: 'z1', nazwa: 'gabinet-wnetrze.jpg', alt: 'Wnętrze gabinetu z kozetką i lustrem', gdzie: 'Strona główna' },
        { id: 'z2', nazwa: 'jan-kowalski.jpg', alt: 'Jan Kowalski, fizjoterapeuta', gdzie: 'Zespół' },
        { id: 'z3', nazwa: 'terapia-kregoslup.jpg', alt: '', gdzie: 'Ból kręgosłupa' },
      ] },
      seo: { tytul: `Linia Ruchu — ${ent ? 'klinika fizjoterapii' : 'fizjoterapia'} Kraków`, opis: 'Fizjoterapia w Krakowie: ból kręgosłupa, rwa kulszowa, urazy sportowe. Umów wizytę online, wolne terminy od ręki.', indeksowanie: true },
      kontakt: { telefon: ent ? '12 345 67 89' : '600 700 800', email: 'kontakt@linia-ruchu.pl', pokazMape: true, pokazTelefon: true },
    };
    return {
      strona,
      opublikowana: JSON.parse(JSON.stringify(strona)),
      historia: [{ kiedy: new Date(Date.now() - 6 * 86400000).toISOString(), opis: 'Pierwsza publikacja strony' }],
      formularz: {
        email: 'wymagany',
        wiadomosc: true,
        podpowiedz: 'Opisz krótko, z czym przychodzisz. Nie podawaj tu danych o zdrowiu, porozmawiamy o nich na wizycie.',
        zgodaPrzypomnienia: true,
        klauzula: 'Administratorem Twoich danych jest Linia Ruchu. Dane przetwarzamy, żeby umówić i potwierdzić wizytę. Szczegóły w polityce prywatności.',
        komunikatPo: 'Dziękujemy! Potwierdzenie wysłaliśmy na Twój e-mail. Do zobaczenia.',
        kwalifikator: [
          { id: 'q1', pytanie: 'Co Cię sprowadza?', odpowiedzi: [{ tekst: 'Ból kręgosłupa lub pleców', usluga: 'pierwsza' }, { tekst: 'Uraz po sporcie', usluga: 'sport' }, { tekst: 'Kontynuuję terapię', usluga: 'kontrola' }] },
        ],
      },
      powiadomienia: [
        { id: 'potw', nazwa: 'Potwierdzenie rezerwacji', kanal: 'email', komu: 'pacjent', wl: true, kiedy: 'od razu', temat: 'Potwierdzenie wizyty {data}, {godzina}', tresc: 'Dzień dobry {imie},\n\npotwierdzamy wizytę: {usluga}, {data} o {godzina}.\nAdres: {adres}.\n\nJeśli nie możesz przyjść, odwołaj wizytę tutaj: {link_odwolania}\n\nDo zobaczenia,\n{gabinet}' },
        { id: 'przyp', nazwa: 'Przypomnienie przed wizytą', kanal: 'email', komu: 'pacjent', wl: true, kiedy: '24', temat: 'Przypomnienie: jutro o {godzina}', tresc: 'Dzień dobry {imie},\n\nprzypominamy o wizycie jutro o {godzina} ({usluga}).\nAdres: {adres}. {dojazd}\n\nZmiana planów? {link_odwolania}\n\n{gabinet}' },
        { id: 'sms', nazwa: 'Przypomnienie SMS', kanal: 'sms', komu: 'pacjent', wl: false, kiedy: '24', temat: '', tresc: '{gabinet}: przypominamy o wizycie {data} o {godzina}. Odwolanie: {link_odwolania}', dodatek: true },
        { id: 'odw', nazwa: 'Odwołanie wizyty', kanal: 'email', komu: 'pacjent', wl: true, kiedy: 'od razu', temat: 'Wizyta {data} odwołana', tresc: 'Dzień dobry {imie},\n\nTwoja wizyta {data} o {godzina} została odwołana. Nowy termin zarezerwujesz na stronie: {link_strony}\n\n{gabinet}' },
        { id: 'zmiana', nazwa: 'Zmiana terminu', kanal: 'email', komu: 'pacjent', wl: true, kiedy: 'od razu', temat: 'Nowy termin wizyty: {data}, {godzina}', tresc: 'Dzień dobry {imie},\n\nTwoja wizyta została przeniesiona na {data} o {godzina}.\n\n{gabinet}' },
        { id: 'gabinet', nazwa: 'Nowa rezerwacja (do gabinetu)', kanal: 'email', komu: 'gabinet', wl: true, kiedy: 'od razu', temat: 'Nowa rezerwacja: {imie}, {data} {godzina}', tresc: 'Nowa rezerwacja ze strony:\n{imie}, tel. {telefon}\n{usluga}, {data} o {godzina}\nWiadomość: {wiadomosc}' },
      ],
      platnosci: { operator: 'p24', polaczone: false, tryb: 'stala', procent: 20, zwrot: 'Zaliczkę zwracamy w całości, jeśli odwołasz wizytę najpóźniej 24 godziny przed terminem. Przy późniejszym odwołaniu zaliczka przepada.' },
      konto: {
        nazwa: ent ? 'Linia Ruchu sp. z o.o.' : 'Linia Ruchu Jan Kowalski', nip: '1234563218', email: 'kontakt@linia-ruchu.pl', telefon: ent ? '12 345 67 89' : '600 700 800', adres: 'ul. Przykładowa 1, 30-001 Kraków',
        uzytkownicy: ent
          ? [{ id: 'u1', imie: 'Jan Kowalski', email: 'jan@linia-ruchu.pl', rola: 'wlasciciel' }, { id: 'u2', imie: 'Ewa Recepcja', email: 'recepcja@linia-ruchu.pl', rola: 'recepcja' }, { id: 'u3', imie: 'Anna Lewandowska', email: 'anna@linia-ruchu.pl', rola: 'terapeuta' }]
          : [{ id: 'u1', imie: 'Jan Kowalski', email: 'jan@linia-ruchu.pl', rola: 'wlasciciel' }],
        integracje: { googleWizytowka: true, analytics: false, searchConsole: true, znanylekarz: '' },
        domena: 'linia-ruchu.pl',
        retencja: 24,
        dodatki: { sms: false, zaliczki: true },
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

  /** Ile pól strony różni się od opublikowanej wersji. */
  P.zmianyStrony = () => {
    const a = P.C().strona;
    const b = P.C().opublikowana;
    let n = 0;
    const porownaj = (x, y) => {
      if (typeof x !== 'object' || x === null || typeof y !== 'object' || y === null) { if (JSON.stringify(x) !== JSON.stringify(y)) n += 1; return; }
      if (Array.isArray(x) !== Array.isArray(y) || (Array.isArray(x) && x.length !== y.length)) { n += 1; return; }
      new Set([...Object.keys(x), ...Object.keys(y)]).forEach((k) => porownaj(x[k], y[k]));
    };
    porownaj(a, b);
    return n;
  };

  /* ── Liczby do statystyk: ruch na stronie jest przykładowy, rezerwacje prawdziwe z kalendarza ── */
  P.ruch = (data) => {
    let h = 0;
    for (const c of data + P.tryb()) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const dz = K.zIso(data).getDay();
    const baza = P.ent() ? 120 : 55;
    return Math.round(baza * (dz === 0 ? 0.55 : dz === 6 ? 0.7 : 1) * (0.75 + (h % 50) / 100));
  };
})();
