/* Magazyn danych panelu.
 *
 * Prototyp działa bez serwera: całość stanu siedzi w localStorage tej przeglądarki.
 * Panel nigdy nie sięga do localStorage bezpośrednio — wszystko idzie przez ten moduł,
 * więc podmiana na prawdziwe API to wymiana jednego pliku.
 *
 * Zasada: nic, co da się policzyć, nie jest zapisywane. Wolne terminy, postęp terapii
 * i odsetek zrobionych ćwiczeń liczą się z wizyt i odhaczeń.
 */
(() => {
  'use strict';

  const KLUCZ = 'panel-gabinetu';
  const WERSJA = 3;

  /* ── Pomocnicze ────────────────────────────────────────────────────── */
  const dzis = new Date();
  dzis.setHours(0, 0, 0, 0);

  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const fromIso = (s) => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const przesun = (dni, od = dzis) => {
    const d = new Date(od);
    d.setDate(d.getDate() + dni);
    return d;
  };
  const isoZa = (dni) => iso(przesun(dni));

  let licznik = 0;
  const id = (prefiks) => `${prefiks}${Date.now().toString(36)}${(licznik++).toString(36)}`;

  /* ── Dane startowe ─────────────────────────────────────────────────── */
  function daneStartowe() {
    const linie = [
      { id: 'kregoslup', nazwa: 'Kręgosłup i plecy', kolor: '#1F5FD6', naKolorze: '#FFFFFF' },
      { id: 'sport', nazwa: 'Kontuzja sportowa', kolor: '#E8590C', naKolorze: '#14171A' },
      { id: 'uraz', nazwa: 'Po urazie lub operacji', kolor: '#13875A', naKolorze: '#FFFFFF' },
      { id: 'biuro', nazwa: 'Ból od siedzenia', kolor: '#C2255C', naKolorze: '#FFFFFF' },
    ];

    /* Zespół. Każda osoba ma własny grafik i własny zestaw problemów,
       którymi się zajmuje — z tego liczą się wolne terminy. */
    const zespol = [
      {
        id: 'z1',
        imie: 'mgr Jan Kowalski',
        inicjaly: 'JK',
        rola: 'Terapia manualna, kręgosłup',
        kolor: '#1F5FD6',
        linie: ['kregoslup', 'biuro', 'uraz'],
        godziny: { 1: [8, 19], 2: [8, 19], 3: [8, 19], 4: [8, 19], 5: [8, 16] },
        aktywny: true,
      },
      {
        id: 'z2',
        imie: 'mgr Anna Lewandowska',
        inicjaly: 'AL',
        rola: 'Fizjoterapia sportowa',
        kolor: '#E8590C',
        linie: ['sport', 'uraz', 'kregoslup'],
        godziny: { 1: [12, 20], 2: [12, 20], 3: [12, 20], 4: [12, 20], 5: [10, 18], 6: [9, 13] },
        aktywny: true,
      },
      {
        id: 'z3',
        imie: 'mgr Piotr Zawada',
        inicjaly: 'PZ',
        rola: 'Rehabilitacja pooperacyjna',
        kolor: '#13875A',
        linie: ['uraz', 'kregoslup'],
        godziny: { 2: [8, 15], 4: [8, 15], 6: [9, 13] },
        aktywny: true,
      },
    ];

    const uslugi = [
      { id: 'u-konsultacja', nazwa: 'Konsultacja z terapią', minuty: 60, cena: 220 },
      { id: 'u-manualna', nazwa: 'Terapia manualna', minuty: 50, cena: 200 },
      { id: 'u-sport', nazwa: 'Trening powrotu do sportu', minuty: 60, cena: 180 },
      { id: 'u-diagnostyka', nazwa: 'Diagnostyka funkcjonalna', minuty: 75, cena: 260 },
      { id: 'u-pooperacyjna', nazwa: 'Rehabilitacja pooperacyjna', minuty: 60, cena: 210 },
      { id: 'u-kark', nazwa: 'Terapia karku i barków', minuty: 50, cena: 200 },
      { id: 'u-stanowisko', nazwa: 'Konsultacja z oceną stanowiska', minuty: 60, cena: 230 },
    ];

    /* Biblioteka ćwiczeń — terapeuta wybiera z niej albo dopisuje własne.
       `rysunek` to id sylwetki rysowanej w karcie pacjenta (assets/js/pacjent.js). */
    const cwiczeniaBiblioteka = [
      { id: 'c-koci', nazwa: 'Koci grzbiet', opis: 'W klęku podpartym zaokrąglaj i prostuj plecy, powoli, bez bólu.', rysunek: 'kleczenie' },
      { id: 'c-mostek', nazwa: 'Mostek biodrowy', opis: 'Leżąc na plecach unieś biodra, zatrzymaj na 3 sekundy, opuść.', rysunek: 'lezenie' },
      { id: 'c-ptak', nazwa: 'Ptak-pies', opis: 'W klęku podpartym wyprostuj przeciwną rękę i nogę, utrzymaj 5 sekund.', rysunek: 'kleczenie' },
      { id: 'c-rotacja', nazwa: 'Rotacja odcinka piersiowego', opis: 'Siedząc, obróć tułów w bok i zatrzymaj oddech na 2 sekundy.', rysunek: 'siedzenie' },
      { id: 'c-lopatki', nazwa: 'Ściąganie łopatek', opis: 'Siedząc prosto, ściągnij łopatki do siebie i w dół, przytrzymaj 5 sekund.', rysunek: 'siedzenie' },
      { id: 'c-kark', nazwa: 'Rozciąganie karku', opis: 'Delikatnie przyciągnij ucho do barku, wytrzymaj 20 sekund na stronę.', rysunek: 'siedzenie' },
      { id: 'c-nadgarstek', nazwa: 'Mobilizacja nadgarstka', opis: 'Zegnij i wyprostuj nadgarstek, potem krążenia w obie strony.', rysunek: 'siedzenie' },
      { id: 'c-przysiad', nazwa: 'Przysiad przy ścianie', opis: 'Plecy na ścianie, zejdź do kąta prostego i wytrzymaj.', rysunek: 'sciana' },
      { id: 'c-lydka', nazwa: 'Wspięcia na palce', opis: 'Stojąc, unieś się na palce i powoli opuść. Trzymaj się oparcia.', rysunek: 'stanie' },
      { id: 'c-balans', nazwa: 'Stanie na jednej nodze', opis: 'Utrzymaj równowagę 30 sekund, potem z zamkniętymi oczami.', rysunek: 'stanie' },
    ];

    const pacjenci = [
      { id: 'p1', imie: 'Anna Zielińska', telefon: '+48 600 000 001', email: 'anna.z@przyklad.pl', zrodlo: 'mapy', utworzony: isoZa(-34), notatka: 'Pracuje zdalnie, ćwiczy rano przed pracą.', zgodaSms: true },
      { id: 'p2', imie: 'Marek Wysocki', telefon: '+48 600 000 002', email: 'm.wysocki@przyklad.pl', zrodlo: 'reklama', utworzony: isoZa(-12), notatka: 'Biega 3 razy w tygodniu, chce wrócić na zawody.', zgodaSms: true },
      { id: 'p3', imie: 'Ewa Malinowska', telefon: '+48 600 000 003', email: 'ewa.m@przyklad.pl', zrodlo: 'polecenie', utworzony: isoZa(-1), notatka: 'Prosi o wizyty po 16:00.', zgodaSms: true },
      { id: 'p4', imie: 'Krzysztof Dąb', telefon: '+48 600 000 004', email: 'k.dab@przyklad.pl', zrodlo: 'strona', utworzony: isoZa(-58), notatka: 'Po rekonstrukcji ACL, prowadzony z ortopedą.', zgodaSms: true },
      { id: 'p5', imie: 'Zofia Rutkowska', telefon: '+48 600 000 005', email: 'z.rutkowska@przyklad.pl', zrodlo: 'polecenie', utworzony: isoZa(-21), notatka: 'Studentka, ćwiczy nieregularnie w sesji.', zgodaSms: true },
      { id: 'p6', imie: 'Piotr Lewandowski', telefon: '+48 600 000 006', email: 'p.lewandowski@przyklad.pl', zrodlo: 'mapy', utworzony: isoZa(0), notatka: 'Zgłoszenie ze strony o 22:41, jeszcze nie oddzwoniono.', zgodaSms: true },
      { id: 'p7', imie: 'Hanna Sobczak', telefon: '+48 600 000 007', email: 'h.sobczak@przyklad.pl', zrodlo: 'strona', utworzony: isoZa(0), notatka: 'Po zdjęciu gipsu, pyta o termin w tym tygodniu.', zgodaSms: true },
      { id: 'p8', imie: 'Robert Jasiński', telefon: '+48 600 000 008', email: 'r.jasinski@przyklad.pl', zrodlo: 'reklama', utworzony: isoZa(-76), notatka: 'Cykl zakończony, kontrola za sześć tygodni.', zgodaSms: true },
      { id: 'p9', imie: 'Maria Cichoń', telefon: '+48 600 000 009', email: 'm.cichon@przyklad.pl', zrodlo: 'powrot', utworzony: isoZa(-5), notatka: 'Wraca po roku z tym samym odcinkiem.', zgodaSms: true },
      { id: 'p10', imie: 'Tadeusz Bąk', telefon: '+48 600 000 010', email: 't.bak@przyklad.pl', zrodlo: 'polecenie', utworzony: isoZa(-63), notatka: 'Chodzi bez kuli od trzech tygodni.', zgodaSms: true },
      { id: 'p11', imie: 'Julia Ostrowska', telefon: '+48 600 000 011', email: 'j.ostrowska@przyklad.pl', zrodlo: 'mapy', utworzony: isoZa(-90), notatka: 'Wystawiła opinię w Mapach Google.', zgodaSms: true },
      { id: 'p12', imie: 'Adam Wilk', telefon: '+48 600 000 012', email: 'a.wilk@przyklad.pl', zrodlo: 'reklama', utworzony: isoZa(-2), notatka: 'Bark po siłowni, trenuje cztery razy w tygodniu.', zgodaSms: true },
      { id: 'p13', imie: 'Barbara Nowicka', telefon: '+48 600 000 013', email: 'b.nowicka@przyklad.pl', zrodlo: 'polecenie', utworzony: isoZa(-16), notatka: 'Praca z myszką osiem godzin dziennie.', zgodaSms: true },
      { id: 'p14', imie: 'Grzegorz Pająk', telefon: '+48 600 000 014', email: 'g.pajak@przyklad.pl', zrodlo: 'strona', utworzony: isoZa(-40), notatka: 'Nie umówił kolejnej wizyty, nie odbiera od dwóch dni.', zgodaSms: true },
    ];

    const c = (idc, ile, razy) => ({ cwiczenieId: idc, powtorzenia: ile, razyWTygodniu: razy });

    const terapie = [
      { id: 't1', pacjentId: 'p1', linia: 'kregoslup', etykieta: 'Rwa kulszowa, odcinek L5-S1', cel: 'Przespać noc bez bólu i wrócić na basen', planWizyt: 8, odstepDni: 7, status: 'aktywna', start: isoZa(-34), cwiczenia: [c('c-koci', '10 powtórzeń', 5), c('c-mostek', '3 serie po 10', 5), c('c-ptak', '8 na stronę', 4)] },
      { id: 't2', pacjentId: 'p2', linia: 'sport', etykieta: 'Skręcenie stawu skokowego III stopnia', cel: 'Przebiec 5 km bez obrzęku', planWizyt: 6, odstepDni: 5, status: 'aktywna', start: isoZa(-12), cwiczenia: [c('c-lydka', '3 serie po 15', 5), c('c-balans', '3 razy po 30 sekund', 6)] },
      { id: 't3', pacjentId: 'p3', linia: 'biuro', etykieta: 'Kark i barki przy pracy zdalnej', cel: 'Przepracować dzień bez bólu karku', planWizyt: 4, odstepDni: 7, status: 'aktywna', start: isoZa(-1), cwiczenia: [c('c-kark', '20 sekund na stronę', 7), c('c-lopatki', '10 powtórzeń', 5)] },
      { id: 't4', pacjentId: 'p4', linia: 'uraz', etykieta: 'Stan po rekonstrukcji ACL, 11. tydzień', cel: 'Pełne zgięcie kolana i powrót do treningu', planWizyt: 10, odstepDni: 4, status: 'aktywna', start: isoZa(-58), cwiczenia: [c('c-przysiad', '3 serie po 30 sekund', 5), c('c-lydka', '3 serie po 15', 5), c('c-balans', '3 razy po 30 sekund', 5)] },
      { id: 't5', pacjentId: 'p5', linia: 'kregoslup', etykieta: 'Wada postawy i ból pleców', cel: 'Przesiedzieć wykłady bez bólu pleców', planWizyt: 6, odstepDni: 7, status: 'aktywna', start: isoZa(-21), cwiczenia: [c('c-lopatki', '10 powtórzeń', 5), c('c-rotacja', '8 na stronę', 4)] },
      { id: 't8', pacjentId: 'p8', linia: 'sport', etykieta: 'Kolano biegacza', cel: 'Powrót do biegania 10 km', planWizyt: 6, odstepDni: 7, status: 'zakonczona', start: isoZa(-76), koniec: isoZa(-14), cwiczenia: [c('c-przysiad', '3 serie po 30 sekund', 4)] },
      { id: 't9', pacjentId: 'p9', linia: 'kregoslup', etykieta: 'Nawracający ból lędźwiowy', cel: 'Wrócić do pracy w ogrodzie bez blokady', planWizyt: 5, odstepDni: 7, status: 'aktywna', start: isoZa(-5), cwiczenia: [c('c-koci', '10 powtórzeń', 5), c('c-mostek', '3 serie po 10', 4)] },
      { id: 't10', pacjentId: 'p10', linia: 'uraz', etykieta: 'Stan po endoprotezie biodra', cel: 'Chodzić 3 km bez kuli i wejść na piętro', planWizyt: 10, odstepDni: 5, status: 'aktywna', start: isoZa(-63), cwiczenia: [c('c-mostek', '3 serie po 10', 5), c('c-balans', '3 razy po 20 sekund', 5)] },
      { id: 't11', pacjentId: 'p11', linia: 'sport', etykieta: 'Powrót do biegania po przerwie', cel: 'Wrócić do biegania i ćwiczeń siłowych', planWizyt: 4, odstepDni: 10, status: 'zakonczona', start: isoZa(-90), koniec: isoZa(-30), cwiczenia: [c('c-lydka', '3 serie po 15', 4)] },
      { id: 't12', pacjentId: 'p12', linia: 'sport', etykieta: 'Zespół ciasnoty podbarkowej', cel: 'Wycisnąć sztangę nad głowę bez bólu', planWizyt: 4, odstepDni: 7, status: 'aktywna', start: isoZa(-2), cwiczenia: [c('c-lopatki', '10 powtórzeń', 5), c('c-rotacja', '8 na stronę', 4)] },
      { id: 't13', pacjentId: 'p13', linia: 'biuro', etykieta: 'Drętwienie ręki przy myszce', cel: 'Przepracować tydzień bez drętwienia ręki', planWizyt: 8, odstepDni: 7, status: 'aktywna', start: isoZa(-16), cwiczenia: [c('c-nadgarstek', '10 w każdą stronę', 7), c('c-kark', '20 sekund na stronę', 5)] },
      { id: 't14', pacjentId: 'p14', linia: 'kregoslup', etykieta: 'Dyskopatia L4-L5', cel: 'Przesiedzieć 8 godzin w pracy bez drętwienia', planWizyt: 6, odstepDni: 7, status: 'aktywna', start: isoZa(-40), cwiczenia: [c('c-koci', '10 powtórzeń', 5), c('c-ptak', '8 na stronę', 4)] },
    ];

    /* Każda terapia ma prowadzącego — pierwszą osobę z zespołu od tego problemu.
       W realnym wdrożeniu wybiera go rejestracja albo pacjent przy rezerwacji. */
    terapie.forEach((t, i) => {
      const chetni = zespol.filter((z) => z.linie.includes(t.linia));
      t.terapeutaId = (chetni.length ? chetni[i % chetni.length] : zespol[0]).id;
    });

    /* Wizyty: odbyte w przeszłości, zaplanowane w przyszłości.
       Wizytę prowadzi terapeuta od tej terapii — a jeśli tego dnia i o tej godzinie
       nie pracuje, ktoś inny od tego samego problemu. Inaczej grafik by kłamał. */
    /* Wizyty budujemy po kolei, bo każda kolejna musi omijać te już zajęte. */
    const juzUmowione = [];
    const w = (terapiaId, pacjentId, dni, godzina, uslugaId, status) => {
      const t = terapie.find((x) => x.id === terapiaId);
      const minuty = uslugi.find((u) => u.id === uslugaId).minuty;
      const start = Number(godzina.split(':')[0]) * 60 + Number(godzina.split(':')[1] || 0);

      const wGrafiku = (z, dow) => {
        const g = z.godziny[dow];
        return g && start >= g[0] * 60 && start + minuty <= g[1] * 60;
      };
      const zajety = (z, data) =>
        juzUmowione.some((x) => {
          if (x.terapeutaId !== z.id || x.data !== data) return false;
          const xs = Number(x.godzina.split(':')[0]) * 60 + Number(x.godzina.split(':')[1] || 0);
          return start < xs + x.minuty && start + minuty > xs;
        });

      const prowadzacy = zespol.find((z) => z.id === (t || {}).terapeutaId);
      const kolejnosc = [
        ...(prowadzacy ? [prowadzacy] : []),
        ...(t ? zespol.filter((z) => z.linie.includes(t.linia)) : []),
        ...zespol,
      ];

      /* Data z przesunięcia może wypaść w dzień, w którym nikt nie pracuje
         (niedziela, sobotnie popołudnie) albo wszyscy są zajęci. */
      const kierunek = dni <= 0 ? -1 : 1;
      let data = isoZa(dni);
      let kto = zespol[0];
      for (let krok = 0; krok <= 4; krok++) {
        const proba = isoZa(dni + krok * kierunek);
        const dow = fromIso(proba).getDay();
        const wolny = kolejnosc.find((z) => wGrafiku(z, dow) && !zajety(z, proba));
        if (wolny) {
          data = proba;
          kto = wolny;
          break;
        }
      }

      const nowa = { id: id('w'), pacjentId, terapiaId, terapeutaId: kto.id, data, godzina, uslugaId, minuty, status };
      juzUmowione.push(nowa);
      return nowa;
    };

    const wizyty = [
      // dzisiaj
      w('t1', 'p1', 0, '8:00', 'u-manualna', 'odbyta'),
      w('t10', 'p10', 0, '9:00', 'u-pooperacyjna', 'odbyta'),
      w('t2', 'p2', 0, '10:30', 'u-sport', 'potwierdzona'),
      w('t3', 'p3', 0, '12:00', 'u-stanowisko', 'potwierdzona'),
      w('t9', 'p9', 0, '13:30', 'u-konsultacja', 'potwierdzona'),
      w('t12', 'p12', 0, '15:00', 'u-diagnostyka', 'zaplanowana'),
      w('t5', 'p5', 0, '16:30', 'u-manualna', 'potwierdzona'),
      w('t4', 'p4', 0, '18:00', 'u-pooperacyjna', 'potwierdzona'),
      // najbliższe dni
      w('t4', 'p4', 1, '8:00', 'u-pooperacyjna', 'potwierdzona'),
      w('t5', 'p5', 1, '9:30', 'u-manualna', 'zaplanowana'),
      w('t1', 'p1', 1, '11:00', 'u-manualna', 'potwierdzona'),
      w('t13', 'p13', 1, '13:00', 'u-kark', 'zaplanowana'),
      w('t2', 'p2', 1, '15:00', 'u-sport', 'zaplanowana'),
      w('t9', 'p9', 2, '8:30', 'u-konsultacja', 'zaplanowana'),
      w('t12', 'p12', 2, '10:00', 'u-diagnostyka', 'zaplanowana'),
      w('t10', 'p10', 2, '12:00', 'u-pooperacyjna', 'zaplanowana'),
      w('t4', 'p4', 3, '9:00', 'u-pooperacyjna', 'zaplanowana'),
      w('t13', 'p13', 4, '14:30', 'u-kark', 'zaplanowana'),
      // historia
      w('t1', 'p1', -6, '8:00', 'u-manualna', 'odbyta'),
      w('t1', 'p1', -13, '8:00', 'u-konsultacja', 'odbyta'),
      w('t1', 'p1', -20, '9:00', 'u-manualna', 'odbyta'),
      w('t2', 'p2', -3, '15:00', 'u-sport', 'odbyta'),
      w('t2', 'p2', -8, '15:00', 'u-diagnostyka', 'odbyta'),
      w('t4', 'p4', -4, '18:00', 'u-pooperacyjna', 'odbyta'),
      w('t4', 'p4', -8, '18:00', 'u-pooperacyjna', 'odbyta'),
      w('t4', 'p4', -12, '17:00', 'u-pooperacyjna', 'odbyta'),
      w('t4', 'p4', -16, '17:00', 'u-pooperacyjna', 'odbyta'),
      w('t4', 'p4', -22, '17:00', 'u-konsultacja', 'odbyta'),
      w('t4', 'p4', -30, '17:00', 'u-konsultacja', 'odbyta'),
      w('t5', 'p5', -7, '16:30', 'u-manualna', 'odbyta'),
      w('t5', 'p5', -14, '16:30', 'u-manualna', 'odbyta'),
      w('t5', 'p5', -21, '16:30', 'u-konsultacja', 'odbyta'),
      w('t9', 'p9', -5, '13:30', 'u-konsultacja', 'odbyta'),
      w('t10', 'p10', -2, '9:00', 'u-pooperacyjna', 'odbyta'),
      w('t10', 'p10', -7, '9:00', 'u-pooperacyjna', 'odbyta'),
      w('t10', 'p10', -14, '9:00', 'u-pooperacyjna', 'odbyta'),
      w('t10', 'p10', -21, '9:00', 'u-pooperacyjna', 'odbyta'),
      w('t10', 'p10', -28, '9:00', 'u-konsultacja', 'odbyta'),
      w('t10', 'p10', -35, '9:00', 'u-konsultacja', 'odbyta'),
      w('t10', 'p10', -45, '9:00', 'u-konsultacja', 'odbyta'),
      w('t10', 'p10', -55, '9:00', 'u-konsultacja', 'odbyta'),
      w('t12', 'p12', -2, '15:00', 'u-diagnostyka', 'odbyta'),
      w('t13', 'p13', -9, '13:00', 'u-kark', 'odbyta'),
      w('t13', 'p13', -16, '13:00', 'u-konsultacja', 'odbyta'),
      w('t14', 'p14', -24, '11:00', 'u-manualna', 'odbyta'),
      w('t14', 'p14', -31, '11:00', 'u-konsultacja', 'odbyta'),
      w('t8', 'p8', -14, '17:00', 'u-sport', 'odbyta'),
      w('t11', 'p11', -30, '12:00', 'u-konsultacja', 'odbyta'),
      w('t3', 'p3', -8, '12:00', 'u-stanowisko', 'nieobecnosc'),
    ];

    /* Odhaczone ćwiczenia z ostatnich dwóch tygodni — stąd bierze się procent. */
    const odhaczenia = [];
    const dodajOdhaczenia = (terapiaId, cwiczenieId, dni) =>
      dni.forEach((d) => odhaczenia.push({ id: id('o'), terapiaId, cwiczenieId, data: isoZa(-d) }));
    dodajOdhaczenia('t1', 'c-koci', [1, 2, 3, 5, 6, 8, 9, 10, 12, 13]);
    dodajOdhaczenia('t1', 'c-mostek', [1, 2, 3, 5, 8, 9, 12, 13]);
    dodajOdhaczenia('t1', 'c-ptak', [2, 5, 9, 12]);
    dodajOdhaczenia('t2', 'c-lydka', [1, 3, 6, 8, 11]);
    dodajOdhaczenia('t2', 'c-balans', [1, 2, 6, 8]);
    dodajOdhaczenia('t4', 'c-przysiad', [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13]);
    dodajOdhaczenia('t4', 'c-lydka', [1, 2, 3, 5, 6, 8, 9, 10, 12]);
    dodajOdhaczenia('t4', 'c-balans', [1, 3, 5, 8, 10, 12]);
    dodajOdhaczenia('t5', 'c-lopatki', [4, 11]);
    dodajOdhaczenia('t9', 'c-koci', [1, 2, 4, 5]);
    dodajOdhaczenia('t10', 'c-mostek', [1, 2, 3, 5, 7, 8, 10, 12]);
    dodajOdhaczenia('t10', 'c-balans', [2, 5, 8, 12]);
    dodajOdhaczenia('t13', 'c-nadgarstek', [6, 13]);
    dodajOdhaczenia('t14', 'c-koci', [9]);

    /* Odczyty bólu z ankiet po wizycie. */
    const bol = [];
    const dodajBol = (terapiaId, pary) => pary.forEach(([d, v]) => bol.push({ id: id('b'), terapiaId, data: isoZa(-d), wartosc: v }));
    dodajBol('t1', [[34, 7], [27, 6], [20, 5], [6, 3]]);
    dodajBol('t2', [[12, 6], [8, 5], [3, 4]]);
    dodajBol('t4', [[58, 8], [45, 6], [30, 5], [14, 3], [4, 2]]);
    dodajBol('t5', [[21, 3], [14, 3], [7, 3]]);
    dodajBol('t8', [[76, 7], [60, 5], [40, 3], [20, 2], [14, 1]]);
    dodajBol('t9', [[5, 6]]);
    dodajBol('t10', [[63, 7], [48, 6], [30, 4], [12, 3], [2, 2]]);
    dodajBol('t11', [[90, 5], [70, 4], [50, 2], [30, 1]]);
    dodajBol('t12', [[2, 5]]);
    dodajBol('t14', [[40, 6], [31, 6], [24, 6]]);

    const zdarzenia = [
      { id: id('z'), pacjentId: 'p1', kiedy: isoZa(-1), typ: 'sms', tekst: 'Przypomnienie o wizycie — symulacja' },
      { id: id('z'), pacjentId: 'p11', kiedy: isoZa(-29), typ: 'opinia', tekst: 'Wystawiła opinię w Mapach Google (5/5)' },
      { id: id('z'), pacjentId: 'p8', kiedy: isoZa(-14), typ: 'terapia', tekst: 'Cykl terapii zakończony' },
    ];

    return {
      wersja: WERSJA,
      ustawienia: {
        nazwa: 'Linia Ruchu',
        terapeuta: 'mgr Jan Kowalski',
        inicjaly: 'JK',
        adres: 'ul. Przykładowa 1, 00-001 [Twoje Miasto]',
        telefon: '+48 000 000 000',
        /* Godziny pracy: dzień tygodnia → [od, do]. 0 = niedziela. */
        godziny: { 1: [8, 19], 2: [8, 19], 3: [8, 19], 4: [8, 19], 5: [8, 19], 6: [9, 13] },
        krokMinut: 30,
      },
      zespol,
      linie,
      uslugi,
      cwiczeniaBiblioteka,
      pacjenci,
      terapie,
      wizyty,
      odhaczenia,
      bol,
      zdarzenia,
      /* Urlop, przerwa, wyjazd — godziny wycięte z grafiku. */
      blokady: [
        { id: id('bl'), data: isoZa(11), od: 8, do: 19, powod: 'Szkolenie — terapia wisceralna' },
        { id: id('bl'), data: isoZa(12), od: 8, do: 19, powod: 'Szkolenie — terapia wisceralna' },
        { id: id('bl'), data: isoZa(3), od: 14, do: 19, powod: 'Wyjazd prywatny' },
      ],
      /* Pacjenci, którzy nie chcą danego typu wiadomości. */
      wylaczone: [],
    };
  }

  /* ── Zapis i odczyt ────────────────────────────────────────────────── */
  let stan = null;
  let poprzedni = null; // jeden krok wstecz dla „cofnij”
  const sluchacze = new Set();

  function wczytaj() {
    try {
      const surowe = localStorage.getItem(KLUCZ);
      if (surowe) {
        const dane = JSON.parse(surowe);
        if (dane && dane.wersja === WERSJA) return dane;
        /* Starsze dane uzupełniamy o nowe kolekcje, zamiast kasować pracę. */
        if (dane && dane.wersja >= 1 && dane.wersja < WERSJA) {
          dane.blokady = dane.blokady || [];
          dane.wylaczone = dane.wylaczone || [];
          /* Jednoosobowy gabinet staje się zespołem jednoosobowym. */
          if (!dane.zespol) {
            const u = dane.ustawienia;
            dane.zespol = [
              {
                id: 'z1',
                imie: u.terapeuta,
                inicjaly: u.inicjaly,
                rola: 'Fizjoterapeuta',
                kolor: '#1F5FD6',
                linie: dane.linie.map((l) => l.id),
                godziny: u.godziny,
                aktywny: true,
              },
            ];
            dane.terapie.forEach((t) => (t.terapeutaId = t.terapeutaId || 'z1'));
            dane.wizyty.forEach((x) => (x.terapeutaId = x.terapeutaId || 'z1'));
          }
          dane.wersja = WERSJA;
          return dane;
        }
      }
    } catch (_) {}
    return daneStartowe();
  }

  function zapisz() {
    try {
      localStorage.setItem(KLUCZ, JSON.stringify(stan));
    } catch (_) {
      /* Tryb prywatny albo brak miejsca — panel działa dalej, tylko bez zapamiętania. */
    }
  }

  function powiadom(opis) {
    sluchacze.forEach((fn) => fn(stan, opis));
  }

  /** Jedyna droga do zmiany stanu. Zwraca to, co zwróci mutator. */
  function zmien(opis, mutator) {
    poprzedni = JSON.parse(JSON.stringify(stan));
    const wynik = mutator(stan);
    zapisz();
    powiadom(opis);
    return wynik;
  }

  /* ── Wyliczenia ────────────────────────────────────────────────────── */
  const DZIEN_MS = 86400000;
  const dniOd = (isoData) => Math.round((dzis - fromIso(isoData)) / DZIEN_MS);

  const pacjent = (pid) => stan.pacjenci.find((p) => p.id === pid);
  const terapia = (tid) => stan.terapie.find((t) => t.id === tid);
  const usluga = (uid) => stan.uslugi.find((u) => u.id === uid);
  const linia = (lid) => stan.linie.find((l) => l.id === lid);
  const cwiczenie = (cid) => stan.cwiczeniaBiblioteka.find((c) => c.id === cid);

  const terapiaPacjenta = (pid) =>
    stan.terapie.filter((t) => t.pacjentId === pid).sort((a, b) => (a.status === 'aktywna' ? -1 : 1))[0] || null;

  const wizytyTerapii = (tid) => stan.wizyty.filter((w) => w.terapiaId === tid).sort((a, b) => (a.data + a.godzina).localeCompare(b.data + b.godzina));

  const odbyte = (tid) => wizytyTerapii(tid).filter((w) => w.status === 'odbyta').length;

  function nastepnaWizyta(tid) {
    const dzisIso = iso(dzis);
    return (
      wizytyTerapii(tid)
        .filter((w) => ['zaplanowana', 'potwierdzona'].includes(w.status) && w.data >= dzisIso)
        .sort((a, b) => (a.data + a.godzina).localeCompare(b.data + b.godzina))[0] || null
    );
  }

  function ostatniaWizyta(tid) {
    return (
      wizytyTerapii(tid)
        .filter((w) => w.status === 'odbyta')
        .sort((a, b) => (b.data + b.godzina).localeCompare(a.data + a.godzina))[0] || null
    );
  }

  /** Odsetek zrobionych ćwiczeń z ostatnich 14 dni — liczony, nie zapisany. */
  function compliance(tid) {
    const t = terapia(tid);
    if (!t || !t.cwiczenia.length) return null;
    const oczekiwane = t.cwiczenia.reduce((s, c) => s + (c.razyWTygodniu || 0) * 2, 0);
    if (!oczekiwane) return null;
    const granica = isoZa(-14);
    const zrobione = stan.odhaczenia.filter((o) => o.terapiaId === tid && o.data >= granica).length;
    return Math.min(Math.round((zrobione / oczekiwane) * 100), 100);
  }

  const bolTerapii = (tid) => stan.bol.filter((b) => b.terapiaId === tid).sort((a, b) => a.data.localeCompare(b.data));

  /** Minuty od północy — wspólna miara dla godzin, wizyt i blokad. */
  const naMinuty = (g) => {
    const [h, m] = String(g).split(':').map(Number);
    return h * 60 + (m || 0);
  };
  const naGodzine = (min) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;

  /** Zajęte przedziały dnia dla jednej osoby: jej wizyty plus blokady. */
  function zajetePrzedzialy(isoData, pomijajWizyte = null, terapeutaId = null) {
    const z = stan.wizyty
      .filter(
        (w) =>
          w.data === isoData &&
          w.status !== 'odwolana' &&
          w.id !== pomijajWizyte &&
          (!terapeutaId || w.terapeutaId === terapeutaId)
      )
      .map((w) => [naMinuty(w.godzina), naMinuty(w.godzina) + (w.minuty || 60)]);
    stan.blokady
      .filter((b) => b.data === isoData && (!b.terapeutaId || !terapeutaId || b.terapeutaId === terapeutaId))
      .forEach((b) => z.push([b.od * 60, b.do * 60]));
    return z;
  }

  const koliduje = (start, dlugosc, przedzialy) =>
    przedzialy.some(([a, b]) => start < b && start + dlugosc > a);

  const terapeuta = (zid) => stan.zespol.find((z) => z.id === zid) || null;
  const zespolAktywny = () => stan.zespol.filter((z) => z.aktywny !== false);

  /** Godziny pracy osoby danego dnia; bez wpisu w grafiku — wolne. */
  function grafikOsoby(zid, isoData) {
    const z = terapeuta(zid);
    if (!z) return null;
    return z.godziny[fromIso(isoData).getDay()] || null;
  }

  /** Godziny otwarcia gabinetu danego dnia: suma grafików zespołu. */
  function grafikGabinetu(isoData) {
    const dzien = fromIso(isoData).getDay();
    const zakresy = zespolAktywny()
      .map((z) => z.godziny[dzien])
      .filter(Boolean);
    if (!zakresy.length) return null;
    return [Math.min(...zakresy.map((x) => x[0])), Math.max(...zakresy.map((x) => x[1]))];
  }

  /**
   * Wolne godziny danego dnia. Bez `terapeutaId` godzina jest wolna, gdy
   * może ją wziąć ktokolwiek z zespołu.
   */
  function wolneGodziny(isoData, dlugosc = null, pomijajWizyte = null, terapeutaId = null) {
    const d = fromIso(isoData);
    const krok = stan.ustawienia.krokMinut;
    const trwa = dlugosc || krok;
    const teraz = new Date();
    const osoby = terapeutaId ? [terapeuta(terapeutaId)].filter(Boolean) : zespolAktywny();
    if (!osoby.length) return [];

    const wolneOsob = osoby
      .map((z) => {
        const zakres = z.godziny[d.getDay()];
        if (!zakres) return null;
        return { zakres, przedzialy: zajetePrzedzialy(isoData, pomijajWizyte, z.id) };
      })
      .filter(Boolean);
    if (!wolneOsob.length) return [];

    const od = Math.min(...wolneOsob.map((x) => x.zakres[0]));
    const doGodz = Math.max(...wolneOsob.map((x) => x.zakres[1]));
    const out = [];
    for (let min = od * 60; min + trwa <= doGodz * 60; min += krok) {
      const kiedy = new Date(d);
      kiedy.setHours(0, min, 0, 0);
      if (kiedy - teraz < 60 * 60 * 1000) continue;
      const ktos = wolneOsob.some(
        (x) => min >= x.zakres[0] * 60 && min + trwa <= x.zakres[1] * 60 && !koliduje(min, trwa, x.przedzialy)
      );
      if (ktos) out.push(naGodzine(min));
    }
    return out;
  }

  /** Kto z zespołu może wziąć ten termin. */
  function terapeuciWolni(isoData, godzina, dlugosc = null, pomijajWizyte = null) {
    const trwa = dlugosc || stan.ustawienia.krokMinut;
    const min = naMinuty(godzina);
    const dzien = fromIso(isoData).getDay();
    return zespolAktywny().filter((z) => {
      const zakres = z.godziny[dzien];
      if (!zakres || min < zakres[0] * 60 || min + trwa > zakres[1] * 60) return false;
      return !koliduje(min, trwa, zajetePrzedzialy(isoData, pomijajWizyte, z.id));
    });
  }

  /** Blokady danego dnia — panel rysuje z nich paski w kalendarzu. */
  const blokadyDnia = (isoData, terapeutaId = null) =>
    stan.blokady.filter((b) => b.data === isoData && (!terapeutaId || !b.terapeutaId || b.terapeutaId === terapeutaId));

  /** Najbliższe wolne terminy w kolejnych dniach. */
  function najblizszeTerminy(ile = 5, odDnia = 0) {
    const out = [];
    for (let i = odDnia; i < odDnia + 21 && out.length < ile; i++) {
      const d = isoZa(i);
      wolneGodziny(d).forEach((g) => out.length < ile && out.push({ data: d, godzina: g }));
    }
    return out;
  }

  /* ── Sygnały: kto wypada z cyklu ───────────────────────────────────── */
  function ryzyko(tid) {
    const t = terapia(tid);
    const powody = [];
    let punkty = 0;
    if (!t || t.status !== 'aktywna') return { punkty, powody, poziom: null, akcja: null };

    const ostatnia = ostatniaWizyta(tid);
    const dni = ostatnia ? dniOd(ostatnia.data) : null;
    const nastepna = nastepnaWizyta(tid);
    const odstep = t.odstepDni || 7;

    if (!nastepna) {
      punkty += dni !== null && dni > odstep ? 2 : 1;
      powody.push({ tekst: 'brak kolejnego terminu', typ: 'termin' });
    }
    if (dni !== null && dni > odstep * 2) {
      punkty += 2;
      powody.push({ tekst: `${dni} dni bez wizyty (plan: co ${odstep})`, typ: 'termin' });
    } else if (dni !== null && dni > odstep * 1.4) {
      punkty += 1;
      powody.push({ tekst: `${dni} dni bez wizyty`, typ: 'termin' });
    }

    const proc = compliance(tid);
    if (proc !== null && proc < 40) {
      punkty += 1;
      powody.push({ tekst: `ćwiczenia ${proc}% wg odhaczeń`, typ: 'cwiczenia' });
    }

    const odczyty = bolTerapii(tid);
    const zrobionych = odbyte(tid);
    if (odczyty.length >= 2 && odczyty[0].wartosc - odczyty[odczyty.length - 1].wartosc < 1 && zrobionych >= 3) {
      punkty += 2;
      powody.push({ tekst: `ból bez poprawy po ${zrobionych} wizytach`, typ: 'bol' });
    }
    if (t.planWizyt && zrobionych / t.planWizyt < 0.5 && dni !== null && dni > 14) {
      punkty += 1;
      powody.push({ tekst: `zrobione ${zrobionych} z ${t.planWizyt} wizyt`, typ: 'plan' });
    }

    const poziom = punkty >= 3 ? 'wysokie' : punkty >= 1.5 ? 'srednie' : null;
    let akcja = null;
    if (powody.some((r) => r.typ === 'termin')) akcja = 'Zadzwoń i umów termin';
    else if (powody.some((r) => r.typ === 'bol')) akcja = 'Zweryfikuj plan terapii';
    else if (powody.some((r) => r.typ === 'cwiczenia')) akcja = 'Zapytaj o ćwiczenia domowe';
    return { punkty, powody, poziom, akcja };
  }

  /* ── Kolejka wiadomości ────────────────────────────────────────────── */
  /* Nic tu nie jest zapisane: kolejka wynika z wizyt, terapii i kalendarza.
     Zapisujemy tylko wyłączenia i ślad po wysyłce. */
  const TYPY_WIADOMOSCI = {
    przypomnienie: { nazwa: 'Przypomnienie o wizycie', godzina: '18:00' },
    'ankieta-bol': { nazwa: 'Pytanie o ból po wizycie', godzina: '19:00' },
    'ankieta-cwiczenia': { nazwa: 'Tygodniowe pytanie o ćwiczenia', godzina: '9:00' },
    opinia: { nazwa: 'Prośba o opinię w Google', godzina: '10:00' },
  };

  const wylaczona = (pacjentId, typ) => stan.wylaczone.some((x) => x.pacjentId === pacjentId && x.typ === typ);

  function kolejkaWiadomosci(dniDoPrzodu = 7) {
    const dzisIso = iso(dzis);
    const granica = isoZa(dniDoPrzodu);
    const out = [];
    const dodaj = (pacjentId, terapiaId, typ, data, tresc) => {
      if (data < dzisIso || data > granica) return;
      const p = pacjent(pacjentId);
      if (!p) return;
      out.push({
        id: `${typ}-${pacjentId}-${data}`,
        pacjentId,
        terapiaId,
        typ,
        data,
        godzina: TYPY_WIADOMOSCI[typ].godzina,
        nazwa: TYPY_WIADOMOSCI[typ].nazwa,
        tresc,
        wylaczona: wylaczona(pacjentId, typ) || p.zgodaSms === false,
      });
    };

    stan.wizyty
      .filter((w) => ['zaplanowana', 'potwierdzona'].includes(w.status) && w.data >= dzisIso)
      .forEach((w) => {
        const p = pacjent(w.pacjentId);
        const dzien = fromIso(w.data);
        dzien.setDate(dzien.getDate() - 1);
        dodaj(
          w.pacjentId,
          w.terapiaId,
          'przypomnienie',
          iso(dzien),
          `${p.imie.split(' ')[0]}, przypominamy o wizycie jutro o ${w.godzina}. ${stan.ustawienia.nazwa}`
        );
      });

    stan.wizyty
      .filter((w) => w.status === 'odbyta' && w.data === dzisIso)
      .forEach((w) => {
        const p = pacjent(w.pacjentId);
        dodaj(
          w.pacjentId,
          w.terapiaId,
          'ankieta-bol',
          dzisIso,
          `${p.imie.split(' ')[0]}, jak dziś z bólem w skali 0–10? Odpowiedz jedną cyfrą albo kliknij w swoją kartę.`
        );
      });

    /* Pytanie o ćwiczenia idzie w poniedziałek rano. */
    const poniedzialek = new Date(dzis);
    poniedzialek.setDate(dzis.getDate() + ((8 - dzis.getDay()) % 7 || 7));
    stan.terapie
      .filter((t) => t.status === 'aktywna' && t.cwiczenia.length)
      .forEach((t) => {
        const p = pacjent(t.pacjentId);
        dodaj(
          t.pacjentId,
          t.id,
          'ankieta-cwiczenia',
          iso(poniedzialek),
          `${p.imie.split(' ')[0]}, jak poszły ćwiczenia w minionym tygodniu? Odhacz je w swojej karcie.`
        );
      });

    stan.terapie
      .filter((t) => t.status !== 'aktywna' && t.koniec && dniOd(t.koniec) <= 3)
      .filter((t) => !stan.zdarzenia.some((z) => z.pacjentId === t.pacjentId && z.typ === 'opinia'))
      .forEach((t) => {
        const p = pacjent(t.pacjentId);
        const dzien = fromIso(t.koniec);
        dzien.setDate(dzien.getDate() + 1);
        dodaj(
          t.pacjentId,
          t.id,
          'opinia',
          iso(dzien),
          `${p.imie.split(' ')[0]}, cieszymy się, że terapia dobiegła końca. Jeśli było warto, opinia w Mapach Google bardzo nam pomaga.`
        );
      });

    return out.sort((a, b) => (a.data + a.godzina.padStart(5, '0')).localeCompare(b.data + b.godzina.padStart(5, '0')));
  }

  /* ── Kto wejdzie na zwolniony termin ───────────────────────────────── */
  /** Pacjenci bez umówionego terminu, najpierw z tej samej linii problemu. */
  function kandydaciNaTermin(isoData, godzina, liniaZwolniona = null) {
    return stan.terapie
      .filter((t) => t.status === 'aktywna' && !nastepnaWizyta(t.id))
      .map((t) => {
        const ost = ostatniaWizyta(t.id);
        const czeka = ost ? dniOd(ost.data) : 999;
        return { terapia: t, pacjent: pacjent(t.pacjentId), czeka, taSamaLinia: t.linia === liniaZwolniona };
      })
      .filter((x) => x.pacjent)
      .sort((a, b) => b.taSamaLinia - a.taSamaLinia || b.czeka - a.czeka)
      .slice(0, 5);
  }

  /* ── Wynik terapii ─────────────────────────────────────────────────── */
  /** Liczby, które zamykają cykl. Liczone teraz, zamrażane przy zamknięciu. */
  function wynikTerapii(tid) {
    const t = terapia(tid);
    if (!t) return null;
    const odczyty = bolTerapii(tid);
    return {
      wizytyOdbyte: odbyte(tid),
      planWizyt: t.planWizyt,
      bolStart: odczyty.length ? odczyty[0].wartosc : null,
      bolKoniec: odczyty.length ? odczyty[odczyty.length - 1].wartosc : null,
      cwiczenia: compliance(tid),
      dni: t.start ? dniOd(t.start) : null,
    };
  }

  /* ── Podsumowanie miesiąca ─────────────────────────────────────────── */
  /** Przesunięcie 0 to bieżący miesiąc, -1 poprzedni. */
  function podsumowanieMiesiaca(przesuniecie = 0) {
    const d = new Date(dzis.getFullYear(), dzis.getMonth() + przesuniecie, 1);
    const prefiks = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const wizyty = stan.wizyty.filter((w) => w.data.startsWith(prefiks));
    const odbyteW = wizyty.filter((w) => w.status === 'odbyta');
    const nowi = stan.pacjenci.filter((p) => p.utworzony && p.utworzony.startsWith(prefiks));
    const zamkniete = stan.terapie.filter((t) => t.koniec && t.koniec.startsWith(prefiks));
    const zrodla = {};
    nowi.forEach((p) => (zrodla[p.zrodlo] = (zrodla[p.zrodlo] || 0) + 1));
    return {
      miesiac: d,
      nowiPacjenci: nowi.length,
      zrodla,
      wizytyOdbyte: odbyteW.length,
      nieobecnosci: wizyty.filter((w) => w.status === 'nieobecnosc').length,
      odwolane: wizyty.filter((w) => w.status === 'odwolana').length,
      przychod: odbyteW.reduce((s, w) => s + ((usluga(w.uslugaId) || {}).cena || 0), 0),
      terapieZamkniete: zamkniete.length,
      terapieWToku: stan.terapie.filter((t) => t.status === 'aktywna').length,
      sredniSpadekBolu: (() => {
        const spadki = zamkniete
          .map((t) => (t.wynik && t.wynik.bolStart !== null && t.wynik.bolKoniec !== null ? t.wynik.bolStart - t.wynik.bolKoniec : null))
          .filter((x) => x !== null);
        return spadki.length ? Math.round((spadki.reduce((a, b) => a + b, 0) / spadki.length) * 10) / 10 : null;
      })(),
    };
  }

  /* ── Akcje ─────────────────────────────────────────────────────────── */
  const inicjalyZImienia = (imie) =>
    String(imie)
      .split(' ')
      .filter((czesc) => /^[A-ZĄĆĘŁŃÓŚŹŻ]/.test(czesc))
      .map((czesc) => czesc[0])
      .join('')
      .slice(0, 2) || 'XX';

  const log = (s, pacjentId, typ, tekst) =>
    s.zdarzenia.unshift({ id: id('z'), pacjentId, kiedy: iso(new Date()), typ, tekst });

  const akcje = {
    dodajPacjenta(dane) {
      return zmien('Dodano pacjenta', (s) => {
        const p = {
          id: id('p'),
          imie: dane.imie.trim(),
          telefon: dane.telefon.trim(),
          email: (dane.email || '').trim(),
          zrodlo: dane.zrodlo || 'inne',
          utworzony: iso(new Date()),
          notatka: (dane.notatka || '').trim(),
          zgodaSms: dane.zgodaSms !== false,
        };
        s.pacjenci.unshift(p);
        log(s, p.id, 'pacjent', 'Dodano pacjenta do kartoteki');
        return p;
      });
    },

    zapiszUstawienia(dane) {
      return zmien('Zapisano dane gabinetu', (s) => {
        Object.assign(s.ustawienia, dane);
        return s.ustawienia;
      });
    },

    zapiszPacjenta(pid, dane) {
      return zmien('Zapisano dane pacjenta', (s) => {
        const p = s.pacjenci.find((x) => x.id === pid);
        Object.assign(p, dane);
        return p;
      });
    },

    dodajTerapie(pacjentId, dane) {
      return zmien('Założono kartę terapii', (s) => {
        const t = {
          id: id('t'),
          pacjentId,
          linia: dane.linia,
          etykieta: dane.etykieta.trim(),
          cel: (dane.cel || '').trim(),
          planWizyt: Number(dane.planWizyt) || 6,
          odstepDni: Number(dane.odstepDni) || 7,
          status: 'aktywna',
          start: iso(new Date()),
          cwiczenia: dane.cwiczenia || [],
        };
        s.terapie.unshift(t);
        log(s, pacjentId, 'terapia', `Założono kartę terapii: ${t.etykieta}`);
        return t;
      });
    },

    zapiszTerapie(tid, dane) {
      return zmien('Zapisano kartę terapii', (s) => {
        const t = s.terapie.find((x) => x.id === tid);
        Object.assign(t, dane);
        return t;
      });
    },

    /** Zamknięcie cyklu zamraża liczby — potem okno 14 dni by je przesunęło. */
    zakonczTerapie(tid, powod = 'plan zrealizowany') {
      const wynik = wynikTerapii(tid);
      return zmien('Zakończono terapię', (s) => {
        const t = s.terapie.find((x) => x.id === tid);
        t.status = 'zakonczona';
        t.koniec = iso(new Date());
        t.powodZakonczenia = powod;
        t.wynik = wynik;
        const spadek = wynik.bolStart !== null && wynik.bolKoniec !== null ? `, ból ${wynik.bolStart} → ${wynik.bolKoniec}` : '';
        log(s, t.pacjentId, 'terapia', `Cykl zakończony po ${wynik.wizytyOdbyte} wizytach${spadek}`);
        return t;
      });
    },

    /** Seria wizyt co tyle samo dni, o tej samej godzinie. Kolizje omija. */
    umowSerie({ pacjentId, terapiaId, uslugaId, data, godzina, ile, coIleDni, terapeutaId = null }) {
      const uslugaSerii = stan.uslugi.find((x) => x.id === uslugaId);
      const wolniTam = terapeuciWolni(data, godzina, uslugaSerii.minuty);
      const prowadzacy = terapiaId ? (terapia(terapiaId) || {}).terapeutaId : null;
      /* Serię prowadzi ten, kto naprawdę może wziąć pierwszy termin — inaczej
         wszystkie wizyty wylądowałyby poza czyimś grafikiem. */
      const osoba =
        terapeutaId ||
        (wolniTam.some((z) => z.id === prowadzacy) ? prowadzacy : (wolniTam[0] || {}).id) ||
        prowadzacy ||
        zespolAktywny()[0].id;
      if (terapeutaId && !wolniTam.some((z) => z.id === terapeutaId)) {
        return { blad: `${terapeuta(terapeutaId).imie} ma o tej godzinie zajęte.`, utworzone: [], pominiete: [] };
      }
      return zmien('Umówiono serię wizyt', (s) => {
        const u = s.uslugi.find((x) => x.id === uslugaId);
        const utworzone = [];
        const pominiete = [];
        let kursor = fromIso(data);
        for (let i = 0; i < ile; i++) {
          let dzienIso = iso(kursor);
          let proba = 0;
          /* Kolidujący termin przesuwamy o dzień do przodu, najwyżej o tydzień. */
          while (
            proba < 7 &&
            (!grafikOsoby(osoba, dzienIso) ||
              naMinuty(godzina) < grafikOsoby(osoba, dzienIso)[0] * 60 ||
              naMinuty(godzina) + u.minuty > grafikOsoby(osoba, dzienIso)[1] * 60 ||
              koliduje(naMinuty(godzina), u.minuty, zajetePrzedzialy(dzienIso, null, osoba)))
          ) {
            const d = fromIso(dzienIso);
            d.setDate(d.getDate() + 1);
            dzienIso = iso(d);
            proba++;
          }
          if (proba >= 7) {
            pominiete.push(iso(kursor));
          } else {
            const w = { id: id('w'), pacjentId, terapiaId, terapeutaId: osoba, data: dzienIso, godzina, uslugaId, minuty: u.minuty, status: 'zaplanowana' };
            s.wizyty.push(w);
            utworzone.push(w);
            kursor = fromIso(dzienIso);
          }
          kursor.setDate(kursor.getDate() + coIleDni);
        }
        log(s, pacjentId, 'wizyta', `Umówiono serię ${utworzone.length} wizyt co ${coIleDni} dni`);
        return { utworzone, pominiete };
      });
    },

    dodajBlokade({ data, od, do: doGodz, powod, dni = 1, terapeutaId = null }) {
      return zmien('Zablokowano czas', (s) => {
        const dodane = [];
        for (let i = 0; i < dni; i++) {
          const d = fromIso(data);
          d.setDate(d.getDate() + i);
          const b = { id: id('bl'), data: iso(d), od: Number(od), do: Number(doGodz), powod: (powod || 'Niedostępny').trim(), terapeutaId };
          s.blokady.push(b);
          dodane.push(b);
        }
        return dodane;
      });
    },

    usunBlokade(bid) {
      return zmien('Zdjęto blokadę', (s) => {
        s.blokady = s.blokady.filter((b) => b.id !== bid);
      });
    },

    dodajTerapeute(dane) {
      return zmien('Dodano osobę do zespołu', (s) => {
        const z = {
          id: id('z'),
          imie: dane.imie.trim(),
          inicjaly: dane.inicjaly || inicjalyZImienia(dane.imie),
          rola: (dane.rola || '').trim(),
          kolor: dane.kolor || '#535A61',
          linie: dane.linie && dane.linie.length ? dane.linie : s.linie.map((l) => l.id),
          godziny: dane.godziny || { 1: [8, 16], 2: [8, 16], 3: [8, 16], 4: [8, 16], 5: [8, 16] },
          aktywny: true,
        };
        s.zespol.push(z);
        return z;
      });
    },

    zapiszTerapeute(zid, dane) {
      return zmien('Zapisano dane osoby', (s) => {
        const z = s.zespol.find((x) => x.id === zid);
        Object.assign(z, dane);
        if (dane.imie && !dane.inicjaly) z.inicjaly = inicjalyZImienia(dane.imie);
        return z;
      });
    },

    /** Osoby nie kasujemy — jej wizyty i terapie muszą zostać w historii. */
    wylaczTerapeute(zid) {
      const przyszle = stan.wizyty.filter(
        (w) => w.terapeutaId === zid && w.data >= iso(dzis) && ['zaplanowana', 'potwierdzona'].includes(w.status)
      );
      if (przyszle.length) {
        return { blad: `Ta osoba ma jeszcze ${przyszle.length} umówionych wizyt. Przełóż je albo przypisz komuś innemu.` };
      }
      return zmien('Wyłączono osobę z grafiku', (s) => {
        const z = s.zespol.find((x) => x.id === zid);
        z.aktywny = false;
        return { terapeuta: z };
      });
    },

    wlaczTerapeute(zid) {
      return zmien('Włączono osobę do grafiku', (s) => {
        s.zespol.find((x) => x.id === zid).aktywny = true;
      });
    },

    /** Przepisanie terapii i przyszłych wizyt na kogoś innego. */
    przypiszTerapie(tid, terapeutaId) {
      return zmien('Zmieniono prowadzącego', (s) => {
        const t = s.terapie.find((x) => x.id === tid);
        t.terapeutaId = terapeutaId;
        const dzisIso = iso(dzis);
        s.wizyty
          .filter((w) => w.terapiaId === tid && w.data >= dzisIso && w.status !== 'odwolana')
          .forEach((w) => (w.terapeutaId = terapeutaId));
        const z = s.zespol.find((x) => x.id === terapeutaId);
        log(s, t.pacjentId, 'terapia', `Terapię prowadzi teraz ${z.imie}`);
        return t;
      });
    },

    /** Wyłączenie albo włączenie typu wiadomości dla jednego pacjenta. */
    przelaczWiadomosc(pacjentId, typ) {
      return zmien('Zmieniono ustawienia wiadomości', (s) => {
        const byla = s.wylaczone.findIndex((x) => x.pacjentId === pacjentId && x.typ === typ);
        if (byla >= 0) {
          s.wylaczone.splice(byla, 1);
          return { wylaczona: false };
        }
        s.wylaczone.push({ pacjentId, typ });
        return { wylaczona: true };
      });
    },

    ustawCwiczenia(tid, cwiczenia) {
      return zmien('Zmieniono plan ćwiczeń', (s) => {
        const t = s.terapie.find((x) => x.id === tid);
        t.cwiczenia = cwiczenia;
        log(s, t.pacjentId, 'cwiczenia', `Plan ćwiczeń: ${cwiczenia.length} ćwiczeń`);
        return t;
      });
    },

    umowWizyte({ pacjentId, terapiaId, data, godzina, uslugaId, terapeutaId = null }) {
      const u = stan.uslugi.find((x) => x.id === uslugaId);
      /* Bez wskazanej osoby bierzemy pierwszą wolną — najpierw prowadzącego terapię. */
      const wolni = terapeuciWolni(data, godzina, u.minuty);
      const prowadzacy = terapiaId ? (terapia(terapiaId) || {}).terapeutaId : null;
      const wybrany =
        terapeutaId ||
        (wolni.some((z) => z.id === prowadzacy) ? prowadzacy : (wolni[0] || {}).id) ||
        null;
      if (!wybrany) {
        return { blad: 'O tej godzinie nikt z zespołu nie jest wolny.' };
      }
      if (terapeutaId && !wolni.some((z) => z.id === terapeutaId)) {
        return { blad: `${terapeuta(terapeutaId).imie} ma o tej godzinie zajęte.` };
      }
      return zmien('Umówiono wizytę', (s) => {
        const w = { id: id('w'), pacjentId, terapiaId, terapeutaId: wybrany, data, godzina, uslugaId, minuty: u.minuty, status: 'zaplanowana' };
        s.wizyty.push(w);
        log(s, pacjentId, 'wizyta', `Umówiono wizytę: ${data} ${godzina}`);
        return { wizyta: w };
      });
    },

    przelozWizyte(wid, data, godzina) {
      return zmien('Przełożono wizytę', (s) => {
        const w = s.wizyty.find((x) => x.id === wid);
        if (koliduje(naMinuty(godzina), w.minuty || 60, zajetePrzedzialy(data, wid, w.terapeutaId))) {
          return { blad: `${(terapeuta(w.terapeutaId) || {}).imie || 'Terapeuta'} ma o tej godzinie zajęte.` };
        }
        const zakres = grafikOsoby(w.terapeutaId, data);
        const min = naMinuty(godzina);
        if (!zakres || min < zakres[0] * 60 || min + (w.minuty || 60) > zakres[1] * 60) {
          return { blad: `${(terapeuta(w.terapeutaId) || {}).imie || 'Terapeuta'} tego dnia o tej porze nie przyjmuje.` };
        }
        const stara = `${w.data} ${w.godzina}`;
        w.data = data;
        w.godzina = godzina;
        w.status = 'zaplanowana';
        log(s, w.pacjentId, 'wizyta', `Przełożono wizytę z ${stara} na ${data} ${godzina}`);
        return { wizyta: w };
      });
    },

    zmienStatusWizyty(wid, status) {
      return zmien('Zmieniono status wizyty', (s) => {
        const w = s.wizyty.find((x) => x.id === wid);
        w.status = status;
        const nazwy = { odbyta: 'Wizyta odbyta', nieobecnosc: 'Pacjent nie przyszedł', odwolana: 'Wizyta odwołana', potwierdzona: 'Wizyta potwierdzona' };
        log(s, w.pacjentId, 'wizyta', `${nazwy[status] || status}: ${w.data} ${w.godzina}`);
        return w;
      });
    },

    /** Zwykły wpis w historii pacjenta — fakt, nie wysyłka. */
    zapiszZdarzenie(pacjentId, typ, tekst) {
      return zmien('Zapisano zdarzenie', (s) => log(s, pacjentId, typ, tekst));
    },

    /** Symulacja wysyłki — nic nie wychodzi na zewnątrz, ale zostaje ślad. */
    zapiszWyslanie(pacjentId, typ, tekst) {
      return zmien('Zapisano wysyłkę', (s) => {
        log(s, pacjentId, typ, `${tekst} — symulacja`);
      });
    },

    /** Pacjent odhacza ćwiczenie ze swojej karty. */
    odhaczCwiczenie(terapiaId, cwiczenieId, data = iso(new Date())) {
      return zmien('Odhaczono ćwiczenie', (s) => {
        const juz = s.odhaczenia.find((o) => o.terapiaId === terapiaId && o.cwiczenieId === cwiczenieId && o.data === data);
        if (juz) {
          s.odhaczenia = s.odhaczenia.filter((o) => o !== juz);
          return { odhaczone: false };
        }
        s.odhaczenia.push({ id: id('o'), terapiaId, cwiczenieId, data });
        return { odhaczone: true };
      });
    },

    /** Pacjent odpowiada na pytanie o ból. */
    zapiszBol(terapiaId, wartosc) {
      return zmien('Zapisano poziom bólu', (s) => {
        const t = s.terapie.find((x) => x.id === terapiaId);
        s.bol.push({ id: id('b'), terapiaId, data: iso(new Date()), wartosc: Number(wartosc) });
        log(s, t.pacjentId, 'ankieta', `Pacjent ocenił ból na ${wartosc}/10`);
      });
    },

    dodajNotatke(pacjentId, tekst) {
      return zmien('Dodano notatkę', (s) => log(s, pacjentId, 'notatka', tekst));
    },

    cofnij() {
      if (!poprzedni) return false;
      stan = poprzedni;
      poprzedni = null;
      zapisz();
      powiadom('Cofnięto');
      return true;
    },

    reset() {
      stan = daneStartowe();
      poprzedni = null;
      zapisz();
      powiadom('Przywrócono dane demonstracyjne');
    },

    eksport() {
      return JSON.stringify(stan, null, 2);
    },

    import(json) {
      const dane = JSON.parse(json);
      if (!dane || dane.wersja !== WERSJA) throw new Error('Nieznany format pliku.');
      stan = dane;
      zapisz();
      powiadom('Wczytano dane z pliku');
    },
  };

  /* ── Wyjście ───────────────────────────────────────────────────────── */
  stan = wczytaj();

  window.Panel = {
    get stan() {
      return stan;
    },
    subskrybuj(fn) {
      sluchacze.add(fn);
      return () => sluchacze.delete(fn);
    },
    akcje,
    // odczyty
    dzis,
    iso,
    fromIso,
    isoZa,
    dniOd,
    pacjent,
    terapia,
    usluga,
    linia,
    cwiczenie,
    terapiaPacjenta,
    wizytyTerapii,
    odbyte,
    nastepnaWizyta,
    ostatniaWizyta,
    compliance,
    bolTerapii,
    wolneGodziny,
    najblizszeTerminy,
    ryzyko,
    blokadyDnia,
    terapeuta,
    zespolAktywny,
    grafikOsoby,
    grafikGabinetu,
    terapeuciWolni,
    kolejkaWiadomosci,
    kandydaciNaTermin,
    wynikTerapii,
    podsumowanieMiesiaca,
    TYPY_WIADOMOSCI,
  };
})();
