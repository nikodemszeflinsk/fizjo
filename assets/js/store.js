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
  const WERSJA = 6;

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
  /* Konfiguracja gabinetu — ten sam plik, z którego czyta strona. */
  const KONF = window.KONFIGURACJA || {};
  /* Tryb czytamy przy każdym starcie i resecie, nie raz na zawsze — dzięki temu
     da się przełączyć gabinet z demo na pracę bez przeładowania kodu. */
  const tryb = () => (KONF.tryb === 'praca' ? 'praca' : 'demo');

  /** Stałe gabinetu: problemy, cennik, zespół, dane kontaktowe. */
  function zKonfiguracji() {
    return {
      ustawienia: {
        nazwa: KONF.gabinet.nazwa,
        adres: `${KONF.gabinet.adres}, ${KONF.gabinet.kod}`,
        telefon: KONF.gabinet.telefon,
        email: KONF.gabinet.email,
        krokMinut: KONF.krokMinut || 30,
      },
      linie: KONF.problemy.map((x) => ({
        id: x.id,
        nazwa: x.problem,
        kolor: x.kolor,
        naKolorze: x.naKolorze,
      })),
      /* Cennik to wszystkie usługi ze wszystkich problemów, spłaszczone. */
      uslugi: KONF.problemy.flatMap((x) => x.uslugi.map((u) => ({ ...u, linia: x.id }))),
      zespol: KONF.zespol.map((z) => ({
        id: z.id,
        imie: z.imie,
        inicjaly: z.inicjaly,
        rola: z.rola,
        kolor: z.kolor,
        linie: z.linie,
        godziny: z.grafik,
        aktywny: true,
      })),
    };
  }

  /** Pusty gabinet — start przy wdrożeniu u klienta. */
  function daneCzyste() {
    const stale = zKonfiguracji();
    return {
      wersja: WERSJA,
      tryb: 'praca',
      ...stale,
      cwiczeniaBiblioteka: bibliotekaCwiczen(),
      pacjenci: [],
      terapie: [],
      wizyty: [],
      odhaczenia: [],
      bol: [],
      zdarzenia: [],
      blokady: [],
      wylaczone: [],
      notatki: [],
      wiadomosci: {},
      nadpisaneWiadomosci: {},
      pominieteWiadomosci: [],
      /* Terminy przesunięte ręcznie i wiadomości już wysłane. */
      terminyWiadomosci: {},
      wyslaneWiadomosci: [],
      /* Odstępstwa od reguł gabinetu dla pojedynczych pacjentów. */
      wiadomosciPacjenta: {},
      /* Wiadomości napisane ręcznie, poza regułami. */
      wiadomosciWlasne: [],
    };
  }

  function bibliotekaCwiczen() {
    /* Biblioteka ćwiczeń — terapeuta wybiera z niej albo dopisuje własne.
       `powtorzenia` i `razy` to domyślne wartości podstawiane przy układaniu
       planu; `material` to odnośnik do nagrania z gabinetu, jeśli już jest. */
    const cwiczeniaBiblioteka = [
      { id: 'c-koci', nazwa: 'Koci grzbiet', opis: 'W klęku podpartym zaokrąglaj i prostuj plecy, powoli, bez bólu.', powtorzenia: '10 powtórzeń', razy: 5, material: { url: 'https://linia-ruchu.pl/nagrania/koci-grzbiet', opis: 'Nagranie z gabinetu, 40 sekund' } },
      { id: 'c-mostek', nazwa: 'Mostek biodrowy', opis: 'Leżąc na plecach unieś biodra, zatrzymaj na 3 sekundy, opuść.', powtorzenia: '3 serie po 10', razy: 5, material: null },
      { id: 'c-ptak', nazwa: 'Ptak-pies', opis: 'W klęku podpartym wyprostuj przeciwną rękę i nogę, utrzymaj 5 sekund.', powtorzenia: '8 na stronę', razy: 4, material: null },
      { id: 'c-rotacja', nazwa: 'Rotacja odcinka piersiowego', opis: 'Siedząc, obróć tułów w bok i zatrzymaj oddech na 2 sekundy.', powtorzenia: '10 na stronę', razy: 5, material: null },
      { id: 'c-lopatki', nazwa: 'Ściąganie łopatek', opis: 'Siedząc prosto, ściągnij łopatki do siebie i w dół, przytrzymaj 5 sekund.', powtorzenia: '12 powtórzeń', razy: 5, material: null },
      { id: 'c-kark', nazwa: 'Rozciąganie karku', opis: 'Delikatnie przyciągnij ucho do barku, wytrzymaj 20 sekund na stronę.', powtorzenia: '20 sekund na stronę', razy: 6, material: null },
      { id: 'c-nadgarstek', nazwa: 'Mobilizacja nadgarstka', opis: 'Zegnij i wyprostuj nadgarstek, potem krążenia w obie strony.', powtorzenia: '15 powtórzeń', razy: 5, material: null },
      { id: 'c-przysiad', nazwa: 'Przysiad przy ścianie', opis: 'Plecy na ścianie, zejdź do kąta prostego i wytrzymaj.', powtorzenia: '3 serie po 30 sekund', razy: 4, material: null },
      { id: 'c-lydka', nazwa: 'Wspięcia na palce', opis: 'Stojąc, unieś się na palce i powoli opuść. Trzymaj się oparcia.', powtorzenia: '3 serie po 15', razy: 5, material: null },
      { id: 'c-balans', nazwa: 'Stanie na jednej nodze', opis: 'Utrzymaj równowagę 30 sekund, potem z zamkniętymi oczami.', powtorzenia: '30 sekund na nogę', razy: 5, material: null },
    ];
    return cwiczeniaBiblioteka;
  }

  /* ── Dane demonstracyjne ───────────────────────────────────────────── */
  function daneStartowe() {
    const stale = zKonfiguracji();
    const { linie, uslugi, zespol } = stale;
    const cwiczeniaBiblioteka = bibliotekaCwiczen();

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
      /* Ten wpadł sam, przez rezerwację na stronie, i jeszcze go nie znacie. */
      { id: 'p15', imie: 'Michał Stępień', telefon: '+48 600 000 015', email: 'm.stepien@przyklad.pl', zrodlo: 'strona', utworzony: isoZa(0), notatka: 'Rezerwacja online, wybrał termin sam.', zgodaSms: true },
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
      w('t1', 'p1', 0, '8:00', 'k2', 'odbyta'),
      w('t10', 'p10', 0, '9:00', 'u1', 'odbyta'),
      w('t2', 'p2', 0, '10:30', 's3', 'potwierdzona'),
      w('t3', 'p3', 0, '12:00', 'b1', 'potwierdzona'),
      w('t9', 'p9', 0, '13:30', 'k1', 'potwierdzona'),
      w('t12', 'p12', 0, '15:00', 's1', 'zaplanowana'),
      w('t5', 'p5', 0, '16:30', 'k2', 'potwierdzona'),
      w('t4', 'p4', 0, '18:00', 'u1', 'potwierdzona'),
      // najbliższe dni
      w('t4', 'p4', 1, '8:00', 'u1', 'potwierdzona'),
      w('t5', 'p5', 1, '9:30', 'k2', 'zaplanowana'),
      w('t1', 'p1', 1, '11:00', 'k2', 'potwierdzona'),
      w('t13', 'p13', 1, '13:00', 'b2', 'zaplanowana'),
      w('t2', 'p2', 1, '15:00', 's3', 'zaplanowana'),
      w('t9', 'p9', 2, '8:30', 'k1', 'zaplanowana'),
      w('t12', 'p12', 2, '10:00', 's1', 'zaplanowana'),
      w('t10', 'p10', 2, '12:00', 'u1', 'zaplanowana'),
      w('t4', 'p4', 3, '9:00', 'u1', 'zaplanowana'),
      w('t13', 'p13', 4, '14:30', 'b2', 'zaplanowana'),
      // historia
      w('t1', 'p1', -6, '8:00', 'k2', 'odbyta'),
      w('t1', 'p1', -13, '8:00', 'k1', 'odbyta'),
      w('t1', 'p1', -20, '9:00', 'k2', 'odbyta'),
      w('t2', 'p2', -3, '15:00', 's3', 'odbyta'),
      w('t2', 'p2', -8, '15:00', 's1', 'odbyta'),
      w('t4', 'p4', -4, '18:00', 'u1', 'odbyta'),
      w('t4', 'p4', -8, '18:00', 'u1', 'odbyta'),
      w('t4', 'p4', -12, '17:00', 'u1', 'odbyta'),
      w('t4', 'p4', -16, '17:00', 'u1', 'odbyta'),
      w('t4', 'p4', -22, '17:00', 'k1', 'odbyta'),
      w('t4', 'p4', -30, '17:00', 'k1', 'odbyta'),
      w('t5', 'p5', -7, '16:30', 'k2', 'odbyta'),
      w('t5', 'p5', -14, '16:30', 'k2', 'odbyta'),
      w('t5', 'p5', -21, '16:30', 'k1', 'odbyta'),
      w('t9', 'p9', -5, '13:30', 'k1', 'odbyta'),
      w('t10', 'p10', -2, '9:00', 'u1', 'odbyta'),
      w('t10', 'p10', -7, '9:00', 'u1', 'odbyta'),
      w('t10', 'p10', -14, '9:00', 'u1', 'odbyta'),
      w('t10', 'p10', -21, '9:00', 'u1', 'odbyta'),
      w('t10', 'p10', -28, '9:00', 'k1', 'odbyta'),
      w('t10', 'p10', -35, '9:00', 'k1', 'odbyta'),
      w('t10', 'p10', -45, '9:00', 'k1', 'odbyta'),
      w('t10', 'p10', -55, '9:00', 'k1', 'odbyta'),
      w('t12', 'p12', -2, '15:00', 's1', 'odbyta'),
      w('t13', 'p13', -9, '13:00', 'b2', 'odbyta'),
      w('t13', 'p13', -16, '13:00', 'k1', 'odbyta'),
      w('t14', 'p14', -24, '11:00', 'k2', 'odbyta'),
      w('t14', 'p14', -31, '11:00', 'k1', 'odbyta'),
      /* Dwa domknięte cykle w całości — z nich bierze się wypis dla pacjenta. */
      w('t8', 'p8', -76, '17:00', 's1', 'odbyta'),
      w('t8', 'p8', -68, '17:00', 's2', 'odbyta'),
      w('t8', 'p8', -55, '17:00', 's3', 'odbyta'),
      w('t8', 'p8', -41, '17:00', 's3', 'odbyta'),
      w('t8', 'p8', -27, '17:00', 's3', 'odbyta'),
      w('t8', 'p8', -14, '17:00', 's3', 'odbyta'),
      w('t11', 'p11', -90, '12:00', 'k1', 'odbyta'),
      w('t11', 'p11', -76, '12:00', 'k2', 'odbyta'),
      w('t11', 'p11', -55, '12:00', 's3', 'odbyta'),
      w('t11', 'p11', -30, '12:00', 's3', 'odbyta'),
      w('t3', 'p3', -8, '12:00', 'b1', 'nieobecnosc'),
      /* Rezerwacja ze strony, zrobiona wczoraj wieczorem. Bez karty terapii —
         ta powstaje dopiero na pierwszej wizycie. */
      w(null, 'p15', 1, '12:00', 'k1', 'zaplanowana'),
    ];

    /* Opisy z formularza rezerwacji. Pierwszy pacjent wpadł wczoraj w nocy, drugi
       zarezerwował przez stronę zanim pierwszy raz do nas przyszedł. */
    const opisz = (pacjentId, opis, zrodlo = 'strona') => {
      const wiz = wizyty
        .filter((x) => x.pacjentId === pacjentId && x.status !== 'odwolana')
        .sort((a, b) => (a.data + a.godzina).localeCompare(b.data + b.godzina))[0];
      if (wiz) Object.assign(wiz, { opis, zrodlo });
    };
    opisz('p15', 'Ból w dolnej części pleców od dwóch tygodni, promieniuje do lewej nogi. Gorzej po siedzeniu przy biurku, lepiej po spacerze. Boję się, że to dysk.');
    opisz('p12', 'Prawy bark po treningu na siłowni, boli przy podnoszeniu ręki nad głowę i w nocy, kiedy leżę na tym boku.');

    /* Odhaczone ćwiczenia z ostatnich dwóch tygodni — stąd bierze się procent. */
    const odhaczenia = [];
    /* Godzina każdego odhaczenia i odpowiedzi — gabinet widzi nie tylko „zrobił”,
       ale kiedy. Dla dni minionych deterministyczna, dla dzisiaj liczona wstecz od
       teraz, żeby w demie nic nie wydarzyło się „w przyszłości". */
    let licznikGodzin = 0;
    const GODZINY_CW = [7, 8, 9, 12, 17, 18, 19, 20, 21];
    const godzinaSeed = (dniWstecz, godziny = GODZINY_CW) => {
      licznikGodzin += 1;
      if (dniWstecz === 0) {
        const teraz = new Date();
        const minuty = teraz.getHours() * 60 + teraz.getMinutes() - (20 + ((licznikGodzin * 37) % 150));
        return minuty >= 390 ? `${Math.floor(minuty / 60)}:${String(minuty % 60).padStart(2, '0')}` : null;
      }
      return `${godziny[licznikGodzin % godziny.length]}:${String((licznikGodzin * 17) % 60).padStart(2, '0')}`;
    };
    const dodajOdhaczenia = (terapiaId, cwiczenieId, dni) =>
      dni.forEach((d) => {
        const godzina = godzinaSeed(d);
        if (godzina === null) return;
        odhaczenia.push({ id: id('o'), terapiaId, cwiczenieId, data: isoZa(-d), godzina });
      });
    /* t1 odhacza od początku terapii — stąd w karcie widać, że z tygodnia
       na tydzień robi więcej, a ból w tym samym czasie spada. */
    dodajOdhaczenia('t1', 'c-koci', [1, 2, 3, 5, 6, 8, 9, 10, 12, 13, 15, 16, 19, 20, 22, 24, 27]);
    dodajOdhaczenia('t1', 'c-mostek', [1, 2, 3, 5, 8, 9, 12, 13, 15, 17, 20, 23, 26]);
    dodajOdhaczenia('t1', 'c-ptak', [2, 5, 9, 12, 16, 19, 25]);
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
    /* Zamknięte cykle: odhaczenia z czasu trwania terapii, nie z ostatnich dni. */
    dodajOdhaczenia('t8', 'c-przysiad', [16, 18, 21, 23, 25, 28, 30, 32, 35, 38, 42, 45, 49, 52, 56, 60, 63, 67, 70, 74]);
    dodajOdhaczenia('t11', 'c-lydka', [32, 35, 39, 42, 46, 49, 53, 56, 60, 63, 67, 70, 74, 78, 82, 86]);
    dodajOdhaczenia('t14', 'c-koci', [9]);
    /* Dzisiaj: kilka osób już ćwiczyło, reszta jeszcze nie. */
    dodajOdhaczenia('t4', 'c-przysiad', [0]);
    dodajOdhaczenia('t4', 'c-lydka', [0]);
    dodajOdhaczenia('t10', 'c-mostek', [0]);
    dodajOdhaczenia('t2', 'c-lydka', [0]);

    /* Odczyty bólu z ankiet po wizycie. */
    const bol = [];
    const dodajBol = (terapiaId, pary) =>
      pary.forEach(([d, v]) => {
        const godzina = godzinaSeed(d, [19, 20, 21]);
        if (godzina === null) return;
        bol.push({ id: id('b'), terapiaId, data: isoZa(-d), wartosc: v, godzina });
      });
    dodajBol('t1', [[34, 7], [27, 6], [20, 5], [6, 3]]);
    dodajBol('t2', [[12, 6], [8, 5], [3, 4]]);
    dodajBol('t4', [[58, 8], [45, 6], [30, 5], [14, 3], [4, 2], [0, 2]]);
    dodajBol('t5', [[21, 3], [14, 3], [7, 3]]);
    dodajBol('t8', [[76, 7], [60, 5], [40, 3], [20, 2], [14, 1]]);
    dodajBol('t9', [[5, 6]]);
    dodajBol('t10', [[63, 7], [48, 6], [30, 4], [12, 3], [2, 2]]);
    dodajBol('t11', [[90, 5], [70, 4], [50, 2], [30, 1]]);
    dodajBol('t12', [[2, 5]]);
    dodajBol('t14', [[40, 6], [31, 6], [24, 6]]);

    /* Zamknięte terapie mają zamrożony wynik — tak samo jak te, które gabinet
       zamyka ręcznie. Bez niego pacjent nie dostałby wypisu po cyklu. */
    const domknij = (tid, powod) => {
      const t = terapie.find((x) => x.id === tid);
      if (!t) return;
      const odczyty = bol.filter((b) => b.terapiaId === tid).sort((a, b) => a.data.localeCompare(b.data));
      /* Dla zamkniętego cyklu liczymy z całego jego czasu, nie z dwóch tygodni. */
      const tygodnie = Math.max(Math.round((fromIso(t.koniec) - fromIso(t.start)) / DZIEN_MS / 7), 1);
      const oczekiwane = t.cwiczenia.reduce((s, x) => s + (x.razyWTygodniu || 0) * tygodnie, 0);
      const zrobione = odhaczenia.filter((o) => o.terapiaId === tid && o.data >= t.start && o.data <= t.koniec).length;
      t.powodZakonczenia = powod;
      t.wynik = {
        wizytyOdbyte: wizyty.filter((w) => w.terapiaId === tid && w.status === 'odbyta').length,
        planWizyt: t.planWizyt,
        bolStart: odczyty.length ? odczyty[0].wartosc : null,
        bolKoniec: odczyty.length ? odczyty[odczyty.length - 1].wartosc : null,
        cwiczenia: oczekiwane ? Math.min(Math.round((zrobione / oczekiwane) * 100), 100) : null,
        dni: Math.round((fromIso(t.koniec) - fromIso(t.start)) / DZIEN_MS),
      };
    };
    domknij('t8', 'plan zrealizowany');
    domknij('t11', 'poprawa przed planem');

    const zdarzenia = [
      { id: id('z'), pacjentId: 'p1', kiedy: isoZa(-1), godzina: '18:00', typ: 'sms', tekst: 'Przypomnienie o wizycie — symulacja' },
      { id: id('z'), pacjentId: 'p1', kiedy: isoZa(-1), godzina: '19:12', typ: 'ankieta', tekst: 'Pacjent ocenił ból na 3/10' },
      { id: id('z'), pacjentId: 'p1', kiedy: isoZa(-6), godzina: '8:52', typ: 'wizyta', tekst: 'Wizyta odbyta: 8:00' },
      { id: id('z'), pacjentId: 'p1', kiedy: isoZa(-6), godzina: '9:05', typ: 'cwiczenia', tekst: 'Plan ćwiczeń: 3 ćwiczenia' },
      { id: id('z'), pacjentId: 'p11', kiedy: isoZa(-29), godzina: '11:40', typ: 'opinia', tekst: 'Wystawiła opinię w Mapach Google (5/5)' },
      { id: id('z'), pacjentId: 'p8', kiedy: isoZa(-14), godzina: '10:18', typ: 'terapia', tekst: 'Cykl terapii zakończony' },
      { id: id('z'), pacjentId: 'p15', kiedy: isoZa(-1), godzina: '21:12', typ: 'pacjent', tekst: 'Rezerwacja przez stronę — wybrał termin sam' },
    ];

    return {
      wersja: WERSJA,
      tryb: 'demo',
      ...stale,
      cwiczeniaBiblioteka,
      pacjenci,
      terapie,
      wizyty,
      odhaczenia,
      bol,
      zdarzenia,
      /* Notatki z karty. Domyślnie prywatne; oznaczone jako widoczne
         pokazują się pacjentowi w jego karcie pod linkiem. */
      notatki: [
        { id: id('n'), pacjentId: 'p1', terapiaId: 't1', kiedy: isoZa(-6), tekst: 'Praca zdalna, laptop na kolanach — omówić ustawienie biurka na następnej wizycie.', dlaPacjenta: false },
        { id: id('n'), pacjentId: 'p1', terapiaId: 't1', kiedy: isoZa(-6), tekst: 'Ćwiczenia najlepiej rano, przed pracą — wieczorem i tak nie wychodzi.', dlaPacjenta: true },
        { id: id('n'), pacjentId: 'p2', terapiaId: 't2', kiedy: isoZa(-3), tekst: 'Wraca do biegania szybciej, niż ustaliliśmy. Pilnować obciążeń.', dlaPacjenta: false },
        { id: id('n'), pacjentId: 'p4', terapiaId: 't4', kiedy: isoZa(-4), tekst: 'Do czasu kontroli u operatora bez skoków i biegania.', dlaPacjenta: true },
        { id: id('n'), pacjentId: 'p8', terapiaId: 't8', kiedy: isoZa(-14), tekst: 'Wracamy do dystansu stopniowo: pierwszy miesiąc do 5 km, potem dokładamy po kilometrze na tydzień.', dlaPacjenta: true },
        { id: id('n'), pacjentId: 'p8', terapiaId: 't8', kiedy: isoZa(-14), tekst: 'Przysiad przy ścianie zostaje na stałe, w dni po bieganiu.', dlaPacjenta: true },
      ],
      /* Urlop, przerwa, wyjazd — godziny wycięte z grafiku. */
      blokady: [
        { id: id('bl'), data: isoZa(11), od: 8, do: 19, powod: 'Szkolenie — terapia wisceralna' },
        { id: id('bl'), data: isoZa(12), od: 8, do: 19, powod: 'Szkolenie — terapia wisceralna' },
        { id: id('bl'), data: isoZa(3), od: 14, do: 19, powod: 'Wyjazd prywatny' },
      ],
      /* Pacjenci, którzy nie chcą danego typu wiadomości. */
      wylaczone: [],
      /* Ustawienia rodzajów wiadomości; puste = domyślne z TYPY_WIADOMOSCI. */
      wiadomosci: {},
      /* Pojedyncze wiadomości: zmieniona treść i te wyjęte z kolejki. */
      nadpisaneWiadomosci: {},
      pominieteWiadomosci: [],
      /* Terminy przesunięte ręcznie i wiadomości już wysłane. */
      terminyWiadomosci: {},
      wyslaneWiadomosci: [],
      /* Odstępstwa od reguł gabinetu dla pojedynczych pacjentów. */
      wiadomosciPacjenta: {},
      /* Wiadomości napisane ręcznie, poza regułami. */
      wiadomosciWlasne: [],
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
          dane.wiadomosci = dane.wiadomosci || {};
          dane.nadpisaneWiadomosci = dane.nadpisaneWiadomosci || {};
          dane.pominieteWiadomosci = dane.pominieteWiadomosci || [];
          dane.wiadomosciWlasne = dane.wiadomosciWlasne || [];
          dane.terminyWiadomosci = dane.terminyWiadomosci || {};
          dane.wyslaneWiadomosci = dane.wyslaneWiadomosci || [];
          /* Biblioteka ćwiczeń dostała domyślne wartości i miejsce na materiał. */
          const wzorce = Object.fromEntries(bibliotekaCwiczen().map((c) => [c.id, c]));
          (dane.cwiczeniaBiblioteka || []).forEach((c) => {
            const w = wzorce[c.id];
            if (c.powtorzenia === undefined) c.powtorzenia = w ? w.powtorzenia : '10 powtórzeń';
            if (c.razy === undefined) c.razy = w ? w.razy : 5;
            if (c.material === undefined) c.material = w ? w.material : null;
          });
          /* Pytanie o ćwiczenia raz w tygodniu stało się przypomnieniem w dni
             ćwiczeń — stary „dzień" zostaje pierwszym dniem nowej listy. */
          const naDni = (u) => {
            if (!u || !u['ankieta-cwiczenia']) return;
            const stare = u['ankieta-cwiczenia'];
            if (stare.dzien !== undefined && !stare.dni) {
              stare.dni = [Number(stare.dzien)];
              delete stare.dzien;
            }
          };
          naDni(dane.wiadomosci);
          Object.values(dane.wiadomosciPacjenta || {}).forEach(naDni);
          /* Jedna notatka w polu pacjenta staje się pierwszą notatką w karcie. */
          if (!dane.notatki) {
            dane.notatki = [];
            (dane.pacjenci || []).forEach((x) => {
              if (x.notatka) {
                dane.notatki.push({
                  id: id('n'),
                  pacjentId: x.id,
                  terapiaId: null,
                  kiedy: x.utworzony || iso(dzis),
                  tekst: x.notatka,
                  dlaPacjenta: false,
                });
              }
            });
          }
          /* Stara lista wyłączeń staje się odstępstwami pacjentów. */
          if (!dane.wiadomosciPacjenta) {
            dane.wiadomosciPacjenta = {};
            (dane.wylaczone || []).forEach((x) => {
              dane.wiadomosciPacjenta[x.pacjentId] = dane.wiadomosciPacjenta[x.pacjentId] || {};
              dane.wiadomosciPacjenta[x.pacjentId][x.typ] = { wlaczona: false };
            });
          }
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
    return tryb() === 'praca' ? daneCzyste() : daneStartowe();
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

  /** Ćwiczenia do wyboru przy układaniu planu — bez wycofanych z użycia. */
  const cwiczeniaDoWyboru = () => stan.cwiczeniaBiblioteka.filter((c) => !c.wycofane);

  /**
   * Gdzie to ćwiczenie jest używane. Bez tego nie da się bezpiecznie usuwać:
   * pozycja wypisana z biblioteki nadal siedzi w planach i w odhaczeniach,
   * a pacjent z zamkniętego cyklu ma ją na wypisie.
   */
  function uzycieCwiczenia(cid) {
    const terapie = stan.terapie.filter((t) => t.cwiczenia.some((x) => x.cwiczenieId === cid));
    return {
      terapie: terapie.length,
      aktywne: terapie.filter((t) => t.status === 'aktywna').length,
      odhaczenia: stan.odhaczenia.filter((o) => o.cwiczenieId === cid).length,
    };
  }

  /* ── Rozpoznawanie osoby, która już tu jest ──────────────────────── */
  /* Pacjent wraca po roku i wpisuje numer bez spacji, a nazwisko przez „o”
     zamiast „ó”. Bez porównywania uproszczonych form kartoteka zapełnia się
     tą samą osobą w trzech wersjach — i każda ma własną historię. */
  const OGONKI = { ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z' };

  const bezOgonkow = (s) =>
    String(s || '')
      .toLowerCase()
      .replace(/[ąćęłńóśźż]/g, (z) => OGONKI[z]);

  /** Dziewięć cyfr numeru, bez spacji, myślników i kierunkowego. */
  const kluczTelefonu = (t) => String(t || '').replace(/\D/g, '').replace(/^0+/, '').replace(/^48(?=\d{9}$)/, '').slice(-9);

  /** Imię i nazwisko bez ogonków, znaków i kolejności — „Kowalska Anna” = „Anna Kowalska”. */
  const kluczImienia = (s) =>
    bezOgonkow(s)
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .split(' ')
      .filter(Boolean)
      .sort()
      .join(' ');

  const kluczMaila = (s) => String(s || '').trim().toLowerCase();

  /** Odległość edycyjna do jednego błędu — dalej nie liczymy, bo i tak odrzucimy. */
  function bliskie(a, b) {
    if (a === b) return true;
    if (Math.abs(a.length - b.length) > 1) return false;
    let i = 0;
    let j = 0;
    let roznice = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) {
        i++;
        j++;
        continue;
      }
      if (++roznice > 1) return false;
      if (a.length > b.length) i++;
      else if (a.length < b.length) j++;
      else {
        i++;
        j++;
      }
    }
    return roznice + (a.length - i) + (b.length - j) <= 1;
  }

  /**
   * Kto w kartotece może być tą samą osobą. Numer i e-mail są rozstrzygające,
   * imię i nazwisko to już tylko podejrzenie — dlatego każdy wynik niesie
   * powód, a decyzję podejmuje człowiek przy biurku, nie panel.
   */
  function podobniPacjenci(dane, pomijajId = null) {
    const tel = kluczTelefonu(dane.telefon);
    const mail = kluczMaila(dane.email);
    const imie = kluczImienia(dane.imie);
    const out = [];
    stan.pacjenci.forEach((p) => {
      if (p.id === pomijajId) return;
      const pTel = kluczTelefonu(p.telefon);
      const pMail = kluczMaila(p.email);
      const pImie = kluczImienia(p.imie);
      if (tel && tel.length >= 7 && pTel === tel) return out.push({ pacjent: p, powod: 'ten sam numer telefonu', pewny: true });
      if (mail && pMail === mail) return out.push({ pacjent: p, powod: 'ten sam adres e-mail', pewny: true });
      if (imie && pImie === imie) return out.push({ pacjent: p, powod: 'to samo imię i nazwisko', pewny: false });
      if (imie && imie.length > 6 && bliskie(imie, pImie)) {
        out.push({ pacjent: p, powod: 'imię i nazwisko różni się jedną literą', pewny: false });
      }
    });
    return out.sort((a, b) => Number(b.pewny) - Number(a.pewny));
  }

  /** Pacjent, który jeszcze u nas nie był — żadnej odbytej wizyty. */
  const nowyPacjent = (pid) => !stan.wizyty.some((w) => w.pacjentId === pid && w.status === 'odbyta');

  /** Opisy dolegliwości, które pacjent wpisał własnymi słowami przy rezerwacji — od najnowszego. */
  const opisyPacjenta = (pid) =>
    stan.wizyty
      .filter((w) => w.pacjentId === pid && w.opis)
      .sort((a, b) => (b.data + b.godzina).localeCompare(a.data + a.godzina))
      .map((w) => ({ data: w.data, godzina: w.godzina, opis: w.opis, zrodlo: w.zrodlo || 'gabinet', wizytaId: w.id }));

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

  /**
   * Odhaczenia w kolejnych tygodniach wstecz: ile pacjent zrobił i ile miał
   * zrobić. Z tego samego liczenia korzysta karta pacjenta i widok ankiet,
   * żeby nigdzie nie wyszły dwie różne prawdy o tej samej osobie.
   */
  function tygodnieCwiczen(tid, ile = 4) {
    const t = terapia(tid);
    if (!t || !t.cwiczenia.length) return [];
    const naTydzien = t.cwiczenia.reduce((s, c) => s + (c.razyWTygodniu || 0), 0);
    const out = [];
    for (let i = ile - 1; i >= 0; i--) {
      const koniec = new Date(dzis);
      koniec.setDate(dzis.getDate() - i * 7);
      const poczatek = new Date(koniec);
      poczatek.setDate(koniec.getDate() - 6);
      const od = iso(poczatek);
      const doKiedy = iso(koniec);
      out.push({
        od,
        doKiedy,
        zrobione: stan.odhaczenia.filter((o) => o.terapiaId === tid && o.data >= od && o.data <= doKiedy).length,
        zadane: naTydzien,
        etykieta: i === 0 ? 'ten tydzień' : `−${i} tydz.`,
      });
    }
    return out;
  }

  /**
   * Dzień po dniu: co pacjent zaznaczył, ćwiczył i odpowiedział. Podział na dni
   * ćwiczeń bierze z reguły przypomnień, więc „nie zrobił” znaczy tylko wtedy,
   * gdy tego dnia miał ćwiczyć.
   */
  function dziennikTerapii(tid, dni = 14) {
    const t = terapia(tid);
    if (!t) return [];
    const u = ustawieniaRodzaju('ankieta-cwiczenia', t.pacjentId);
    const dniCw = Array.isArray(u.dni) && u.dni.length ? u.dni.map(Number) : [1, 2, 3, 4, 5];
    const dzisIso = iso(dzis);
    const out = [];
    for (let i = 0; i < dni; i++) {
      const data = isoZa(-i);
      if (data < t.start) break;
      if (t.koniec && data > t.koniec) continue;
      const cwiczenia = t.cwiczenia.map((c) => {
        const o = stan.odhaczenia.find((x) => x.terapiaId === tid && x.cwiczenieId === c.cwiczenieId && x.data === data);
        const def = cwiczenie(c.cwiczenieId);
        return { id: c.cwiczenieId, nazwa: def ? def.nazwa : c.cwiczenieId, zrobione: !!o, godzina: o ? o.godzina || null : null };
      });
      const b = stan.bol.filter((x) => x.terapiaId === tid && x.data === data).pop();
      out.push({
        data,
        dzis: data === dzisIso,
        planowany: t.cwiczenia.length > 0 && dniCw.includes(fromIso(data).getDay()),
        cwiczenia,
        zrobione: cwiczenia.filter((x) => x.zrobione).length,
        zadane: cwiczenia.length,
        bol: b ? { wartosc: b.wartosc, godzina: b.godzina || null } : null,
      });
    }
    return out;
  }

  /** Które ćwiczenia pacjenci faktycznie robią: z zaplanowanych dni, ile odhaczono. */
  function statystykaCwiczen(dni = 14) {
    const wynik = {};
    stan.terapie
      .filter((t) => t.status === 'aktywna')
      .forEach((t) => {
        const dz = dziennikTerapii(t.id, dni);
        dz.filter((d) => d.planowany && !d.dzis).forEach((d) => {
          d.cwiczenia.forEach((c) => {
            const w = (wynik[c.id] = wynik[c.id] || { zadane: 0, zrobione: 0, pacjentow: new Set() });
            w.zadane += 1;
            if (c.zrobione) w.zrobione += 1;
            w.pacjentow.add(t.pacjentId);
          });
        });
      });
    Object.values(wynik).forEach((w) => (w.pacjentow = w.pacjentow.size));
    return wynik;
  }

  /**
   * Wszystko, co pacjenci odesłali między wizytami, w jednym miejscu.
   * Kolejność: najpierw ci, o których trzeba się zatroszczyć — milczący
   * i ci, u których ból nie spada.
   */
  function przegladAnkiet() {
    const wiersze = stan.terapie
      .filter((t) => t.status === 'aktywna')
      .map((t) => {
        const p = pacjent(t.pacjentId);
        if (!p) return null;
        const odczyty = bolTerapii(t.id);
        const pierwszy = odczyty.length ? odczyty[0].wartosc : null;
        const ostatni = odczyty.length ? odczyty[odczyty.length - 1].wartosc : null;
        const tygodnie = tygodnieCwiczen(t.id);
        const biezacy = tygodnie.length ? tygodnie[tygodnie.length - 1] : null;
        const ostatnieOdhaczenie = stan.odhaczenia
          .filter((o) => o.terapiaId === t.id)
          .map((o) => o.data)
          .sort()
          .pop() || null;
        const milczy = !odczyty.length && !ostatnieOdhaczenie;
        const dzisWpis = dziennikTerapii(t.id, 1)[0] || null;
        const wizytaDzis = stan.wizyty.some((w) => w.pacjentId === p.id && w.data === iso(dzis) && w.status === 'odbyta');
        /* Ostatnia aktywność pacjenta: najpóźniejsze z odhaczeń i odpowiedzi o bólu. */
        const aktywnosci = [
          ...stan.odhaczenia.filter((o) => o.terapiaId === t.id).map((o) => ({ data: o.data, godzina: o.godzina || '' })),
          ...odczyty.map((o) => ({ data: o.data, godzina: o.godzina || '' })),
        ].sort((a, b) => (b.data + (b.godzina || '').padStart(5, '0')).localeCompare(a.data + (a.godzina || '').padStart(5, '0')));
        /* Jeden odczyt nie jest żadnym kierunkiem — „bez zmiany" przy pierwszej
           odpowiedzi brzmiałoby jak zarzut wobec kogoś, kto właśnie zaczął. */
        const kierunek = odczyty.length < 2 ? null : pierwszy - ostatni;
        return {
          terapiaId: t.id,
          pacjentId: p.id,
          imie: p.imie,
          linia: t.linia,
          etykieta: t.etykieta,
          terapeutaId: t.terapeutaId,
          odczyty,
          bolPierwszy: pierwszy,
          bolOstatni: ostatni,
          bolKierunek: kierunek,
          bolKiedy: odczyty.length ? odczyty[odczyty.length - 1].data : null,
          tygodnie,
          zadaneWTygodniu: biezacy ? biezacy.zadane : 0,
          zrobioneWTygodniu: biezacy ? biezacy.zrobione : 0,
          ostatnieOdhaczenie,
          ostatniaAktywnosc: aktywnosci[0] || null,
          dzisWpis,
          wizytaDzis,
          maCwiczenia: t.cwiczenia.length > 0,
          milczy,
        };
      })
      .filter(Boolean);

    /* Kolejność ma odpowiadać na pytanie „do kogo zadzwonić najpierw". */
    const waga = (w) => {
      if (w.milczy) return 0;
      if (w.bolKierunek !== null && w.bolKierunek <= 0) return 1;
      if (w.maCwiczenia && w.zadaneWTygodniu && w.zrobioneWTygodniu / w.zadaneWTygodniu < 0.5) return 2;
      return 3;
    };
    return wiersze.sort((a, b) => waga(a) - waga(b) || a.imie.localeCompare(b.imie, 'pl'));
  }

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
  /* Rodzaje wiadomości. `kiedy` opisuje, co da się w nich przestawić, a `szablon`
     jest punktem wyjścia — gabinet może go zmienić w Ustawieniach wiadomości. */
  const TYPY_WIADOMOSCI = {
    przypomnienie: {
      nazwa: 'Przypomnienie o wizycie',
      opis: 'Idzie przed każdą umówioną wizytą.',
      kiedy: 'przed',
      domyslne: { wlaczona: true, dniPrzed: 1, godzina: '18:00' },
      szablon: '{imie}, przypominamy o wizycie {kiedy} o {godzina}. {gabinet}',
      pola: ['imie', 'kiedy', 'godzina', 'gabinet', 'adres', 'link'],
    },
    'ankieta-bol': {
      nazwa: 'Pytanie o ból po wizycie',
      opis: 'Jedna cyfra od pacjenta. Z tego bierze się krzywa bólu w karcie terapii.',
      kiedy: 'poWizycie',
      domyslne: { wlaczona: true, godzina: '19:00' },
      szablon: '{imie}, jak dziś z bólem w skali 0–10? Odpowiedz w swojej karcie: {link}',
      pola: ['imie', 'gabinet', 'link'],
    },
    'ankieta-cwiczenia': {
      nazwa: 'Przypomnienie o ćwiczeniach',
      opis: 'Idzie w każdy dzień, w który pacjent ma ćwiczyć — i tylko wtedy, gdy jeszcze nie odhaczył.',
      kiedy: 'dniTygodnia',
      domyslne: { wlaczona: true, dni: [1, 2, 3, 4, 5], godzina: '9:00' },
      szablon: '{imie}, dziś dzień ćwiczeń — {cwiczenia}. Odhacz je tutaj: {link}',
      pola: ['imie', 'cwiczenia', 'gabinet', 'link'],
    },
    opinia: {
      nazwa: 'Prośba o opinię w Google',
      opis: 'Po zamknięciu terapii, gdy jest czym się chwalić.',
      kiedy: 'poTerapii',
      domyslne: { wlaczona: true, dniPo: 1, godzina: '10:00' },
      szablon:
        '{imie}, cieszymy się, że terapia dobiegła końca. Jeśli było warto, opinia w Mapach Google bardzo nam pomaga: {link}',
      pola: ['imie', 'gabinet', 'link'],
    },
  };

  /**
   * Ustawienia rodzaju. Bez pacjenta — reguła gabinetu. Z pacjentem — ta sama
   * reguła plus to, co ustawiono wyłącznie dla niego (inna pora, inny odstęp,
   * wyłączenie). Nadpisania trzymamy osobno, żeby zmiana reguły gabinetu
   * nadal działała dla wszystkich, którzy jej nie zmienili.
   */
  function ustawieniaRodzaju(typ, pacjentId = null) {
    const gabinet = {
      ...TYPY_WIADOMOSCI[typ].domyslne,
      szablon: TYPY_WIADOMOSCI[typ].szablon,
      ...((stan.wiadomosci || {})[typ] || {}),
    };
    if (!pacjentId) return gabinet;
    const wlasne = ((stan.wiadomosciPacjenta || {})[pacjentId] || {})[typ] || {};
    return { ...gabinet, ...wlasne, wlasne: Object.keys(wlasne).length > 0 };
  }

  /** Czy ten pacjent ma cokolwiek ustawione po swojemu. */
  const maWlasneUstawienia = (pacjentId) =>
    Object.keys((stan.wiadomosciPacjenta || {})[pacjentId] || {}).length > 0;

  const DNI_TYGODNIA = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];

  const wylaczona = (pacjentId, typ) => ustawieniaRodzaju(typ, pacjentId).wlaczona === false;

  /** Podstawia dane pacjenta i wizyty w szablon. */
  function wypelnij(szablon, dane) {
    return String(szablon).replace(/\{(\w+)\}/g, (całość, pole) => (dane[pole] !== undefined ? dane[pole] : całość));
  }

  function kolejkaWiadomosci(dniDoPrzodu = 7) {
    const dzisIso = iso(dzis);
    const granica = isoZa(dniDoPrzodu);
    const nadpisane = stan.nadpisaneWiadomosci || {};
    const pominiete = stan.pominieteWiadomosci || [];
    const out = [];

    const dodaj = (pacjentId, terapiaId, typ, dataZReguly, dane, opis) => {
      if (dataZReguly > granica) return;
      const p = pacjent(pacjentId);
      if (!p) return;
      const u = ustawieniaRodzaju(typ, pacjentId);
      /* Reguła może wskazać dzień, który już minął — np. „trzy dni przed"
         przy wizycie jutro. Systemu nie da się cofnąć, więc wiadomość idzie
         najbliżej jak można, a kolejka mówi wprost, że termin minął. */
      const spozniona = dataZReguly < dzisIso;
      const data = spozniona ? dzisIso : dataZReguly;
      const id = `${typ}-${pacjentId}-${dataZReguly}`;
      /* Termin przesunięty ręcznie wygrywa z regułą. */
      const przesuniete = (stan.terminyWiadomosci || {})[id];
      out.push({
        id,
        pacjentId,
        terapiaId,
        typ,
        data: przesuniete ? przesuniete.data : data,
        godzina: przesuniete ? przesuniete.godzina : u.godzina,
        przesunieta: !!przesuniete,
        nazwa: TYPY_WIADOMOSCI[typ].nazwa,
        powod: opis,
        tresc: nadpisane[id] !== undefined ? nadpisane[id] : wypelnij(u.szablon, dane),
        wlasnaTresc: nadpisane[id] !== undefined,
        usunieta: pominiete.includes(id),
        wyslana: (stan.wyslaneWiadomosci || []).includes(id),
        /* Wiadomość nie pójdzie, gdy rodzaj jest wyłączony w gabinecie,
           gdy pacjent go sobie wyłączył albo gdy nie ma zgody na SMS. */
        /* Rodzaj wyłączony w gabinecie to co innego niż wyłączony dla tej osoby. */
        wylaczonaRodzaj: ustawieniaRodzaju(typ).wlaczona === false,
        wylaczonaPacjent: wylaczona(pacjentId, typ) || p.zgodaSms === false,
        wlasnyHarmonogram: !!u.wlasne,
        spozniona,
      });
    };

    /* Link do karty pacjenta: w prototypie składamy go z nazwy gabinetu,
       żeby w podglądzie wyglądał tak, jak będzie wyglądał naprawdę. */
    const domena = `${stan.ustawienia.nazwa
      .toLowerCase()
      .replace(/[ąćęłńóśźż]/g, (z) => ({ ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z' })[z])
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')}.pl`;

    const daneWspolne = (p) => ({
      imie: p.imie.split(' ')[0],
      gabinet: stan.ustawienia.nazwa,
      adres: stan.ustawienia.adres,
      link: `${domena}/k/${p.id.replace(/\D/g, '').padStart(4, '0').slice(-4)}`,
    });

    /* Przypomnienie: tyle dni przed wizytą, ile ustawiono dla tego pacjenta. */
    {
      stan.wizyty
        .filter((w) => ['zaplanowana', 'potwierdzona'].includes(w.status) && w.data >= dzisIso)
        .forEach((w) => {
          const p = pacjent(w.pacjentId);
          if (!p) return;
          const u = ustawieniaRodzaju('przypomnienie', w.pacjentId);
          const dzien = fromIso(w.data);
          dzien.setDate(dzien.getDate() - (u.dniPrzed || 1));
          const kiedy = (u.dniPrzed || 1) === 1 ? 'jutro' : `${DNI_TYGODNIA[fromIso(w.data).getDay()]}`;
          dodaj(w.pacjentId, w.terapiaId, 'przypomnienie', iso(dzien), { ...daneWspolne(p), kiedy, godzina: w.godzina }, `wizyta ${krotkaData(w.data)}, ${w.godzina}`);
        });
    }

    /* Pytanie o ból: wieczorem w dniu odbytej wizyty. */
    stan.wizyty
      .filter((w) => w.status === 'odbyta' && w.data === dzisIso)
      .forEach((w) => {
        const p = pacjent(w.pacjentId);
        if (!p) return;
        dodaj(w.pacjentId, w.terapiaId, 'ankieta-bol', dzisIso, daneWspolne(p), 'wizyta odbyta dzisiaj');
      });

    /* Ćwiczenia: w każdy dzień ćwiczeń tego pacjenta, a nie raz w tygodniu.
       Dzień, w którym odhaczył już wszystko, pomijamy — przypominanie komuś
       o czymś, co właśnie zrobił, jest najszybszym sposobem na wypisanie się. */
    stan.terapie
      .filter((t) => t.status === 'aktywna' && t.cwiczenia.length)
      .forEach((t) => {
        const p = pacjent(t.pacjentId);
        if (!p) return;
        const u = ustawieniaRodzaju('ankieta-cwiczenia', t.pacjentId);
        const dni = Array.isArray(u.dni) && u.dni.length ? u.dni.map(Number) : [1, 2, 3, 4, 5];
        const ile = t.cwiczenia.length;
        const opisCwiczen = ile === 1 ? 'jedno ćwiczenie' : `${ile} ćwiczenia`;
        for (let i = 0; i <= dniDoPrzodu; i++) {
          const dzien = new Date(dzis);
          dzien.setDate(dzis.getDate() + i);
          if (!dni.includes(dzien.getDay())) continue;
          const data = iso(dzien);
          const odhaczoneDzis = stan.odhaczenia.filter((o) => o.terapiaId === t.id && o.data === data).length;
          if (odhaczoneDzis >= ile) continue;
          dodaj(
            t.pacjentId,
            t.id,
            'ankieta-cwiczenia',
            data,
            { ...daneWspolne(p), cwiczenia: opisCwiczen },
            odhaczoneDzis ? `${odhaczoneDzis} z ${ile} już odhaczone` : `${opisCwiczen} na dzisiaj`
          );
        }
      });

    /* Prośba o opinię: tyle dni po zamknięciu cyklu, ile ustawił gabinet. */
    {
      stan.terapie
        .filter((t) => t.status !== 'aktywna' && t.koniec && dniOd(t.koniec) <= 3)
        .filter((t) => !stan.zdarzenia.some((z) => z.pacjentId === t.pacjentId && z.typ === 'opinia'))
        .forEach((t) => {
          const p = pacjent(t.pacjentId);
          if (!p) return;
          const u = ustawieniaRodzaju('opinia', t.pacjentId);
          const dzien = fromIso(t.koniec);
          dzien.setDate(dzien.getDate() + (u.dniPo || 1));
          dodaj(t.pacjentId, t.id, 'opinia', iso(dzien), daneWspolne(p), 'terapia zamknięta');
        });
    }

    /* Wiadomości napisane ręcznie — ta sama kolejka, ten sam zestaw akcji. */
    (stan.wiadomosciWlasne || []).forEach((w) => {
      if (w.data < dzisIso || w.data > granica) return;
      const p = pacjent(w.pacjentId);
      if (!p) return;
      out.push({
        id: w.id,
        pacjentId: w.pacjentId,
        terapiaId: null,
        typ: 'wlasna',
        data: w.data,
        godzina: w.godzina,
        nazwa: 'Wiadomość od Ciebie',
        powod: 'napisana ręcznie',
        tresc: w.tresc,
        wlasnaTresc: false,
        recznaWiadomosc: true,
        usunieta: pominiete.includes(w.id),
        wyslana: (stan.wyslaneWiadomosci || []).includes(w.id),
        przesunieta: false,
        wylaczonaRodzaj: false,
        wylaczonaPacjent: p.zgodaSms === false,
        wlasnyHarmonogram: false,
      });
    });

    return out.sort((a, b) =>
      `${a.data} ${String(naMinuty(a.godzina)).padStart(4, '0')}`.localeCompare(
        `${b.data} ${String(naMinuty(b.godzina)).padStart(4, '0')}`
      )
    );
  }

  /** Notatki z karty, najnowsze na górze. */
  const notatkiPacjenta = (pacjentId, tylkoDlaPacjenta = false) =>
    (stan.notatki || [])
      .filter((n) => n.pacjentId === pacjentId && (!tylkoDlaPacjenta || n.dlaPacjenta))
      .sort((a, b) => b.kiedy.localeCompare(a.kiedy));

  /** Wszystko, co wyjdzie do jednego pacjenta. */
  const wiadomosciPacjenta = (pacjentId, dni = 21) =>
    kolejkaWiadomosci(dni).filter((w) => w.pacjentId === pacjentId);

  /** Data w formacie, który czyta się w treści wiadomości. */
  function krotkaData(isoData) {
    const d = fromIso(isoData);
    return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
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

  /** Godzina teraz, w formacie takim samym jak godziny wizyt. */
  const terazGodzina = () => {
    const d = new Date();
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const log = (s, pacjentId, typ, tekst) =>
    s.zdarzenia.unshift({ id: id('z'), pacjentId, kiedy: iso(new Date()), godzina: terazGodzina(), typ, tekst });

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

    /**
     * Zamknięcie cyklu zamraża liczby — potem okno 14 dni by je przesunęło.
     * Zabiera też ze sobą to, co nie ma już prawa się wydarzyć: umówione dalej
     * wizyty i przypomnienia o nich. Inaczej pacjent po zamkniętej terapii
     * dostałby SMS o wizycie, której nikt nie zamierza odbyć.
     */
    zakonczTerapie(tid, powod = 'plan zrealizowany') {
      const wynik = wynikTerapii(tid);
      return zmien('Zakończono terapię', (s) => {
        const t = s.terapie.find((x) => x.id === tid);
        t.status = 'zakonczona';
        t.koniec = iso(new Date());
        t.powodZakonczenia = powod;
        t.wynik = wynik;

        const dzisIso = iso(dzis);
        const doOdwolania = s.wizyty.filter(
          (w) => w.terapiaId === tid && w.data >= dzisIso && ['zaplanowana', 'potwierdzona'].includes(w.status)
        );
        doOdwolania.forEach((w) => {
          w.status = 'odwolana';
          w.odwolanaZZamknieciem = true;
        });
        /* Z kolejki znikają też ślady po tych wizytach: własne terminy,
           poprawione treści i oznaczenia wysłania. */
        doOdwolania.forEach((w) => {
          const klucz = `przypomnienie-${w.pacjentId}-`;
          Object.keys(s.terminyWiadomosci || {}).forEach((k) => k.startsWith(klucz) && delete s.terminyWiadomosci[k]);
          Object.keys(s.nadpisaneWiadomosci || {}).forEach((k) => k.startsWith(klucz) && delete s.nadpisaneWiadomosci[k]);
        });
        s.wiadomosciWlasne = (s.wiadomosciWlasne || []).filter(
          (w) => !(w.pacjentId === t.pacjentId && w.data >= dzisIso)
        );

        const spadek = wynik.bolStart !== null && wynik.bolKoniec !== null ? `, ból ${wynik.bolStart} → ${wynik.bolKoniec}` : '';
        const zdjete = doOdwolania.length ? `, zdjęto ${doOdwolania.length} umówionych wizyt` : '';
        log(s, t.pacjentId, 'terapia', `Cykl zakończony po ${wynik.wizytyOdbyte} wizytach${spadek}${zdjete}`);
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

    /** Ustawienia całego rodzaju: włącznik, harmonogram, szablon treści. */
    zapiszRodzajWiadomosci(typ, dane) {
      return zmien('Zmieniono ustawienia wiadomości', (s) => {
        s.wiadomosci = s.wiadomosci || {};
        s.wiadomosci[typ] = { ...ustawieniaRodzaju(typ), ...dane };
        return s.wiadomosci[typ];
      });
    },

    przelaczRodzajWiadomosci(typ) {
      const teraz = ustawieniaRodzaju(typ).wlaczona;
      return zmien('Przełączono rodzaj wiadomości', (s) => {
        s.wiadomosci = s.wiadomosci || {};
        s.wiadomosci[typ] = { ...ustawieniaRodzaju(typ), wlaczona: !teraz };
        return { wlaczona: !teraz };
      });
    },

    /** Zmiana treści jednej wiadomości, bez ruszania szablonu. */
    nadpiszWiadomosc(id, tresc) {
      return zmien('Zmieniono treść wiadomości', (s) => {
        const wlasna = (s.wiadomosciWlasne || []).find((x) => x.id === id);
        if (wlasna) {
          wlasna.tresc = tresc;
          return;
        }
        s.nadpisaneWiadomosci = s.nadpisaneWiadomosci || {};
        s.nadpisaneWiadomosci[id] = tresc;
      });
    },

    przywrocTrescWiadomosci(id) {
      return zmien('Przywrócono treść z szablonu', (s) => {
        if (s.nadpisaneWiadomosci) delete s.nadpisaneWiadomosci[id];
      });
    },

    /** Przesunięcie terminu jednej wiadomości, bez ruszania reguły. */
    przesunWiadomosc(id, data, godzina) {
      return zmien('Przesunięto wiadomość', (s) => {
        s.terminyWiadomosci = s.terminyWiadomosci || {};
        s.terminyWiadomosci[id] = { data, godzina };
        const wlasna = (s.wiadomosciWlasne || []).find((x) => x.id === id);
        if (wlasna) Object.assign(wlasna, { data, godzina });
      });
    },

    przywrocTerminWiadomosci(id) {
      return zmien('Przywrócono termin z reguły', (s) => {
        if (s.terminyWiadomosci) delete s.terminyWiadomosci[id];
      });
    },

    /**
     * Wysyłka od razu, zamiast czekania na termin. W prototypie zostaje
     * ślad w historii pacjenta; wiadomość znika z kolejki, żeby nie poszła
     * drugi raz o zaplanowanej porze.
     */
    wyslijWiadomoscTeraz(id, pacjentId, tekst) {
      return zmien('Wysłano wiadomość', (s) => {
        s.wyslaneWiadomosci = s.wyslaneWiadomosci || [];
        if (!s.wyslaneWiadomosci.includes(id)) s.wyslaneWiadomosci.push(id);
        log(s, pacjentId, 'sms', `${tekst} — symulacja`);
      });
    },

    /** Usunięcie jednej wiadomości z kolejki — nie rusza pozostałych. */
    usunWiadomosc(id) {
      return zmien('Usunięto wiadomość z kolejki', (s) => {
        s.pominieteWiadomosci = s.pominieteWiadomosci || [];
        if (!s.pominieteWiadomosci.includes(id)) s.pominieteWiadomosci.push(id);
      });
    },

    przywrocWiadomosc(id) {
      return zmien('Przywrócono wiadomość', (s) => {
        s.pominieteWiadomosci = (s.pominieteWiadomosci || []).filter((x) => x !== id);
      });
    },

    /** Wyłączenie albo włączenie typu wiadomości dla jednego pacjenta. */
    przelaczWiadomosc(pacjentId, typ) {
      const teraz = ustawieniaRodzaju(typ, pacjentId).wlaczona !== false;
      return zmien('Zmieniono ustawienia wiadomości', (s) => {
        s.wiadomosciPacjenta = s.wiadomosciPacjenta || {};
        s.wiadomosciPacjenta[pacjentId] = s.wiadomosciPacjenta[pacjentId] || {};
        const biezace = s.wiadomosciPacjenta[pacjentId][typ] || {};
        s.wiadomosciPacjenta[pacjentId][typ] = { ...biezace, wlaczona: !teraz };
        return { wylaczona: teraz };
      });
    },

    /** Harmonogram tylko dla tego pacjenta: inna pora, inny odstęp. */
    ustawWiadomoscPacjenta(pacjentId, typ, dane) {
      return zmien('Zmieniono ustawienia wiadomości pacjenta', (s) => {
        s.wiadomosciPacjenta = s.wiadomosciPacjenta || {};
        s.wiadomosciPacjenta[pacjentId] = s.wiadomosciPacjenta[pacjentId] || {};
        s.wiadomosciPacjenta[pacjentId][typ] = { ...(s.wiadomosciPacjenta[pacjentId][typ] || {}), ...dane };
        return s.wiadomosciPacjenta[pacjentId][typ];
      });
    },

    /** Powrót do reguły gabinetu — kasujemy wszystkie odstępstwa pacjenta. */
    przywrocUstawieniaPacjenta(pacjentId, typ = null) {
      return zmien('Przywrócono ustawienia gabinetu', (s) => {
        if (!s.wiadomosciPacjenta || !s.wiadomosciPacjenta[pacjentId]) return;
        if (typ) delete s.wiadomosciPacjenta[pacjentId][typ];
        else delete s.wiadomosciPacjenta[pacjentId];
      });
    },

    /** Jednorazowa wiadomość napisana ręcznie. */
    dodajWiadomosc({ pacjentId, data, godzina, tresc }) {
      return zmien('Zaplanowano wiadomość', (s) => {
        s.wiadomosciWlasne = s.wiadomosciWlasne || [];
        const w = { id: id('wl'), pacjentId, data, godzina, tresc: tresc.trim() };
        s.wiadomosciWlasne.push(w);
        log(s, pacjentId, 'sms', `Zaplanowano wiadomość na ${data} ${godzina}`);
        return w;
      });
    },

    zmienWiadomoscWlasna(wid, dane) {
      return zmien('Zmieniono wiadomość', (s) => {
        const w = (s.wiadomosciWlasne || []).find((x) => x.id === wid);
        if (w) Object.assign(w, dane);
        return w;
      });
    },

    skasujWiadomoscWlasna(wid) {
      return zmien('Skasowano wiadomość', (s) => {
        s.wiadomosciWlasne = (s.wiadomosciWlasne || []).filter((x) => x.id !== wid);
      });
    },

    /* ── Biblioteka ćwiczeń ──────────────────────────────────────────── */
    dodajCwiczenieDoBiblioteki(dane) {
      return zmien('Dodano ćwiczenie', (s) => {
        const c = {
          id: id('cw'),
          nazwa: String(dane.nazwa || '').trim(),
          opis: String(dane.opis || '').trim(),
          powtorzenia: String(dane.powtorzenia || '').trim() || '10 powtórzeń',
          razy: Number(dane.razy) || 5,
          material: dane.material && dane.material.url ? { url: dane.material.url.trim(), opis: (dane.material.opis || '').trim() } : null,
          wlasne: true,
        };
        s.cwiczeniaBiblioteka.push(c);
        return c;
      });
    },

    zmienCwiczenieWBibliotece(cid, dane) {
      return zmien('Zapisano ćwiczenie', (s) => {
        const c = s.cwiczeniaBiblioteka.find((x) => x.id === cid);
        if (!c) return null;
        c.nazwa = String(dane.nazwa || c.nazwa).trim();
        c.opis = String(dane.opis || '').trim();
        c.powtorzenia = String(dane.powtorzenia || '').trim() || c.powtorzenia;
        c.razy = Number(dane.razy) || c.razy;
        c.material = dane.material && dane.material.url ? { url: dane.material.url.trim(), opis: (dane.material.opis || '').trim() } : null;
        return c;
      });
    },

    /**
     * Ćwiczenie używane w planach zostaje w danych, tylko znika z listy wyboru —
     * inaczej zniknęłoby też z kart pacjentów i z wypisów sprzed lat.
     * Nieużywane kasujemy naprawdę.
     */
    usunCwiczenieZBiblioteki(cid) {
      const uzycie = uzycieCwiczenia(cid);
      const wycofane = uzycie.terapie > 0 || uzycie.odhaczenia > 0;
      zmien(wycofane ? 'Wycofano ćwiczenie z listy' : 'Usunięto ćwiczenie', (s) => {
        if (wycofane) {
          const c = s.cwiczeniaBiblioteka.find((x) => x.id === cid);
          if (c) c.wycofane = true;
          return c;
        }
        s.cwiczeniaBiblioteka = s.cwiczeniaBiblioteka.filter((x) => x.id !== cid);
        return null;
      });
      return { wycofane, ...uzycie };
    },

    przywrocCwiczenie(cid) {
      return zmien('Przywrócono ćwiczenie', (s) => {
        const c = s.cwiczeniaBiblioteka.find((x) => x.id === cid);
        if (c) delete c.wycofane;
        return c;
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

    umowWizyte({ pacjentId, terapiaId, data, godzina, uslugaId, terapeutaId = null, opis = '', zrodlo = 'gabinet' }) {
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
        /* Opis własnymi słowami pacjenta — z formularza na stronie albo wpisany przez gabinet. */
        const tekst = String(opis || '').trim();
        if (tekst) {
          w.opis = tekst;
          w.zrodlo = zrodlo;
        }
        s.wizyty.push(w);
        log(s, pacjentId, 'wizyta', `Umówiono wizytę: ${data} ${godzina}${tekst ? ' — z opisem dolegliwości' : ''}`);
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
        /* Godzinę zapisujemy tylko dla dzisiaj — odhaczenie wstecz nie ma „teraz". */
        const wpis = { id: id('o'), terapiaId, cwiczenieId, data };
        if (data === iso(new Date())) wpis.godzina = terazGodzina();
        s.odhaczenia.push(wpis);
        return { odhaczone: true };
      });
    },

    /** Pacjent odpowiada na pytanie o ból. */
    zapiszBol(terapiaId, wartosc) {
      return zmien('Zapisano poziom bólu', (s) => {
        const t = s.terapie.find((x) => x.id === terapiaId);
        s.bol.push({ id: id('b'), terapiaId, data: iso(new Date()), wartosc: Number(wartosc), godzina: terazGodzina() });
        log(s, t.pacjentId, 'ankieta', `Pacjent ocenił ból na ${wartosc}/10`);
      });
    },

    /** Notatka w karcie. `dlaPacjenta` decyduje, czy zobaczy ją pacjent. */
    dodajNotatkeKarty({ pacjentId, terapiaId = null, tekst, dlaPacjenta = false }) {
      return zmien('Dodano notatkę', (s) => {
        s.notatki = s.notatki || [];
        const n = { id: id('n'), pacjentId, terapiaId, kiedy: iso(new Date()), tekst: tekst.trim(), dlaPacjenta };
        s.notatki.unshift(n);
        return n;
      });
    },

    zmienNotatke(nid, dane) {
      return zmien('Zmieniono notatkę', (s) => {
        const n = (s.notatki || []).find((x) => x.id === nid);
        if (n) Object.assign(n, dane);
        return n;
      });
    },

    przelaczWidocznoscNotatki(nid) {
      return zmien('Zmieniono widoczność notatki', (s) => {
        const n = (s.notatki || []).find((x) => x.id === nid);
        if (n) n.dlaPacjenta = !n.dlaPacjenta;
        return n;
      });
    },

    usunNotatke(nid) {
      return zmien('Usunięto notatkę', (s) => {
        s.notatki = (s.notatki || []).filter((x) => x.id !== nid);
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

    /** Przywraca stan wyjściowy dla bieżącego trybu: demo albo pusty gabinet. */
    reset() {
      const praca = tryb() === 'praca';
      stan = praca ? daneCzyste() : daneStartowe();
      poprzedni = null;
      zapisz();
      powiadom(praca ? 'Wyczyszczono gabinet' : 'Przywrócono dane demonstracyjne');
    },

    /** Kreator pierwszego uruchomienia: dane gabinetu i pierwsza osoba naraz. */
    uruchomGabinet({ nazwa, telefon, adres, email, terapeuta, inicjaly, rola, godziny }) {
      return zmien('Ustawiono gabinet', (s) => {
        Object.assign(s.ustawienia, {
          nazwa: nazwa.trim(),
          telefon: telefon.trim(),
          adres: adres.trim(),
          email: (email || '').trim(),
        });
        s.zespol = [
          {
            id: 'z1',
            imie: terapeuta.trim(),
            inicjaly: inicjaly || inicjalyZImienia(terapeuta),
            rola: (rola || 'Fizjoterapeuta').trim(),
            kolor: '#1F5FD6',
            linie: s.linie.map((l) => l.id),
            godziny,
            aktywny: true,
          },
        ];
        s.uruchomiony = iso(new Date());
        return s.ustawienia;
      });
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
    cwiczeniaDoWyboru,
    uzycieCwiczenia,
    terapiaPacjenta,
    opisyPacjenta,
    podobniPacjenci,
    nowyPacjent,
    kluczTelefonu,
    wizytyTerapii,
    odbyte,
    nastepnaWizyta,
    ostatniaWizyta,
    compliance,
    bolTerapii,
    tygodnieCwiczen,
    dziennikTerapii,
    statystykaCwiczen,
    przegladAnkiet,
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
    ustawieniaRodzaju,
    maWlasneUstawienia,
    wiadomosciPacjenta,
    notatkiPacjenta,
    DNI_TYGODNIA,
  };
})();
