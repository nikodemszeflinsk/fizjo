/*
 * Dane strony gabinetu.
 *
 * Nazwa, kontakt, zespół, problemy i ceny przychodzą z assets/js/konfiguracja.js —
 * to jedyny plik do zmiany przy wdrożeniu. Tutaj zostaje treść, która jest treścią
 * strony, a nie ustawieniem: opisy problemów, opinie i pytania.
 */

const KONF = window.KONFIGURACJA;

/* Opisy problemów i zdjęcia żyją tutaj, bo są treścią strony, nie konfiguracją.
   Usługi, ceny, kolory i zespół przychodzą z konfiguracji. */
const TRESCI_PROBLEMOW = {
  kregoslup: {
    zdjecie: 'assets/img/spec-kregoslup.jpg',
    alt: 'Dłonie fizjoterapeuty uciskające mięśnie wzdłuż kręgosłupa leżącego pacjenta.',
    opis: 'Ból krzyża, rwa kulszowa, dyskopatia. Zaczynamy od badania ruchu, nie od zdjęcia MRI.',
    objawy: ['Ból promieniuje do nogi', 'Poranna sztywność', 'Boli przy schylaniu'],
  },
  sport: {
    zdjecie: 'assets/img/spec-sport.jpg',
    alt: 'Fizjoterapeutka testująca zakres ruchu w kolanie u biegacza.',
    opis: 'Skręcenia, przeciążenia, powrót do treningu po kontuzji. Z testami zamiast zgadywania.',
    objawy: ['Puchnie po wysiłku', 'Ucieka na nierównym', 'Ból wraca po powrocie do biegania'],
  },
  uraz: {
    zdjecie: 'assets/img/spec-uraz.jpg',
    alt: 'Fizjoterapeuta asekurujący pacjenta przy ćwiczeniu z taśmą.',
    opis: 'Po operacji, po złamaniu, po zdjęciu gipsu. Prowadzenie zgodne z protokołem operatora.',
    objawy: ['Sztywność po unieruchomieniu', 'Kulejesz', 'Blizna ogranicza ruch'],
  },
  biuro: {
    zdjecie: 'assets/img/spec-ciaza.jpg',
    alt: 'Fizjoterapeutka pokazująca ustawienie barków przy biurku.',
    opis: 'Kark, barki i głowa po dniu przy komputerze. Terapia plus ustawienie stanowiska pracy.',
    objawy: ['Ból narasta w ciągu dnia', 'Mrowienie w rękach', 'Ból głowy od potylicy'],
  },
};

window.KLINIKA = {
  nazwa: KONF.gabinet.nazwa,
  podtytul: KONF.gabinet.podtytul,
  miasto: KONF.gabinet.miasto,
  telefon: KONF.gabinet.telefon,
  telefonHref: KONF.gabinet.telefon.replace(/\s/g, ''),
  email: KONF.gabinet.email,
  agencja: KONF.agencja.nazwa,
  narzedzie: KONF.agencja.narzedzie,

  /* Problem = kolor + usługi z konfiguracji, opis i zdjęcie stąd. */
  linie: KONF.problemy.map((p) => ({
    id: p.id,
    problem: p.problem,
    specjalizacja: p.specjalizacja,
    strona: p.strona,
    kolor: p.kolor,
    naKolorze: p.naKolorze,
    uslugi: p.uslugi,
    ...TRESCI_PROBLEMOW[p.id],
  })),

  zespol: KONF.zespol,

  gabinet: {
    nazwa: 'Gabinet',
    adres: KONF.gabinet.adres,
    kod: KONF.gabinet.kod,
    lat: KONF.gabinet.lat,
    lng: KONF.gabinet.lng,
    godziny: (() => {
      /* Godziny otwarcia liczone z grafików zespołu — jedna prawda zamiast dwóch. */
      const DNI = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
      const SKROT = ['Nd', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob'];
      const zakresy = [1, 2, 3, 4, 5, 6, 0].map((dzien) => {
        const g = KONF.zespol.map((z) => z.grafik[dzien]).filter(Boolean);
        return { dzien, zakres: g.length ? [Math.min(...g.map((x) => x[0])), Math.max(...g.map((x) => x[1]))] : null };
      });
      /* Kolejne dni z tymi samymi godzinami scalamy w jeden wiersz. */
      const out = [];
      zakresy.forEach(({ dzien, zakres }) => {
        if (!zakres) return;
        const tekst = `${zakres[0]}:00–${zakres[1]}:00`;
        const ostatni = out[out.length - 1];
        if (ostatni && ostatni.tekst === tekst && ostatni.doDnia === dzien - 1) {
          ostatni.doDnia = dzien;
          return;
        }
        out.push({ odDnia: dzien, doDnia: dzien, tekst });
      });
      return out.map((x) => [x.odDnia === x.doDnia ? DNI[x.odDnia].replace(/^./, (z) => z.toUpperCase()) : `${SKROT[x.odDnia]}–${SKROT[x.doDnia]}`, x.tekst]);
    })(),
    udogodnienia: KONF.gabinet.udogodnienia,
    dojazd: KONF.gabinet.dojazd,
  },

  /* Zapas, gdyby zespół był pusty — normalnie godziny biorą się z grafików. */
  godzinyWizyt: { tydzien: [8, 20], sobota: [9, 13] },

  opinie: [
    {
      linia: 'kregoslup',
      tekst:
        'Po trzech wizytach pierwszy raz od miesięcy przespałem noc bez bólu. Dostałem ćwiczenia, które faktycznie robię, bo zajmują 10 minut.',
      autor: 'Pacjent, 46 lat',
    },
    {
      linia: 'sport',
      tekst:
        'Wróciłam do biegania po skręceniu kostki z planem na każdy tydzień. Zero zgadywania, czy już mogę.',
      autor: 'Pacjentka, 31 lat',
    },
    {
      linia: 'uraz',
      tekst:
        'Po endoprotezie biodra bałem się każdego kroku. Po sześciu tygodniach chodzę bez kuli i wchodzę na piętro.',
      autor: 'Pacjent, 67 lat',
    },
    {
      linia: 'biuro',
      tekst:
        'Kark bolał mnie codziennie od dwóch lat. Terapia plus ustawienie biurka — po miesiącu problem zniknął.',
      autor: 'Pacjentka, 34 lata',
    },
  ],

  faq: [
    {
      q: 'Czy potrzebuję skierowania?',
      a: 'Nie. Przyjmuję prywatnie, bez skierowania. Jeśli masz dokumentację — wyniki rezonansu, RTG, wypis ze szpitala — weź ją ze sobą.',
    },
    {
      q: 'Jak wygląda pierwsza wizyta?',
      a: 'Sześćdziesiąt minut: rozmowa o tym, co i od kiedy boli, badanie ruchu, pierwsza terapia i plan na kolejne tygodnie. Wychodzisz z ćwiczeniami do domu.',
    },
    {
      q: 'Co zabrać i w co się ubrać?',
      a: 'Wygodny strój sportowy, w którym da się swobodnie ruszać, oraz dokumentację, jeśli ją masz. Ręczniki czekają na miejscu.',
    },
    {
      q: 'Jak odwołać lub przełożyć wizytę?',
      a: 'Link do zmiany terminu znajdziesz w SMS-ie z przypomnieniem. Proszę o informację najpóźniej 24 godziny wcześniej — wtedy termin może trafić do kogoś, kto czeka.',
    },
    {
      q: 'Ile wizyt będę potrzebować?',
      a: 'Po pierwszej wizycie powiem wprost: zwykle od trzech do ośmiu, zależnie od problemu. Jeśli po dwóch nie widać poprawy, zmieniamy plan albo kieruję dalej.',
    },
    {
      q: 'Czy wystawiasz faktury i jak można zapłacić?',
      a: 'Tak, faktura na życzenie. Płatność kartą, BLIK-iem lub gotówką na miejscu.',
    },
  ],
};
