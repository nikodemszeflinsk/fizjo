/*
 * Dane kliniki demo — JEDYNE miejsce do podmiany treści.
 *
 * Wszystko tutaj to przykład: nazwiska, adresy, telefony, ceny i współrzędne.
 * Żeby przerobić demo na konkretny gabinet, wystarczy edytować ten plik
 * i podmienić zdjęcia w assets/img (te same nazwy plików).
 */

window.KLINIKA = {
  nazwa: 'Linia Ruchu',
  podtytul: 'Klinika fizjoterapii',
  miasto: '[Twoje Miasto]',
  telefon: '+48 000 000 000',
  telefonHref: '+48000000000',
  email: 'adres@email.com',
  agencja: 'Studio Widok',
  narzedzie: 'System pozyskiwania pacjentów',

  /* Pięć linii = pięć specjalizacji. Kolor ma znaczenie i nie pojawia się nigdzie indziej. */
  linie: [
    {
      id: 'kregoslup',
      problem: 'Kręgosłup i plecy',
      specjalizacja: 'Terapia kręgosłupa',
      kolor: '#1F5FD6',
      naKolorze: '#FFFFFF',
      zdjecie: 'assets/img/spec-kregoslup.jpg',
      alt: 'Dłonie fizjoterapeuty uciskające mięśnie wzdłuż kręgosłupa leżącego pacjenta.',
      opis:
        'Ból krzyża, szyi i pleców, który wraca, promieniuje do nogi albo nie pozwala przespać nocy. Szukamy źródła, a nie tylko miejsca, które boli.',
      objawy: ['Rwa kulszowa', 'Dyskopatia', 'Ból szyi przy pracy biurowej', 'Sztywność poranna', 'Bóle głowy napięciowe'],
      uslugi: [
        { id: 'k1', nazwa: 'Konsultacja z terapią', minuty: 60, cena: 220 },
        { id: 'k2', nazwa: 'Terapia manualna', minuty: 50, cena: 200 },
        { id: 'k3', nazwa: 'Metoda McKenziego', minuty: 50, cena: 200 },
      ],
    },
    {
      id: 'sport',
      problem: 'Kontuzja sportowa',
      specjalizacja: 'Fizjoterapia sportowa',
      kolor: '#E8590C',
      naKolorze: '#14171A',
      zdjecie: 'assets/img/spec-sport.jpg',
      alt: 'Fizjoterapeuta badający zakres ruchu w kolanie sportowca leżącego na niebieskim ręczniku.',
      opis:
        'Skręcona kostka, kolano biegacza, bark po sezonie. Wracasz do treningu z planem, który mówi kiedy i ile — a nie „na wyczucie”.',
      objawy: ['Skręcenie stawu skokowego', 'Kolano biegacza', 'Naderwanie mięśnia', 'Bark pływaka', 'Zapalenie ścięgna Achillesa'],
      uslugi: [
        { id: 's1', nazwa: 'Diagnostyka funkcjonalna', minuty: 75, cena: 260 },
        { id: 's2', nazwa: 'Terapia tkanek miękkich', minuty: 50, cena: 200 },
        { id: 's3', nazwa: 'Trening powrotu do sportu', minuty: 60, cena: 180 },
      ],
    },
    {
      id: 'uraz',
      problem: 'Po urazie lub operacji',
      specjalizacja: 'Ortopedia i rehabilitacja',
      kolor: '#13875A',
      naKolorze: '#FFFFFF',
      zdjecie: 'assets/img/spec-uraz.jpg',
      alt: 'Fizjoterapeutka mobilizująca staw skokowy pacjenta po urazie.',
      opis:
        'Endoprotezy, rekonstrukcje więzadeł, złamania. Prowadzimy od pierwszych dni po zabiegu do pełnej sprawności, w porozumieniu z Twoim ortopedą.',
      objawy: ['Rekonstrukcja ACL', 'Endoproteza biodra i kolana', 'Po złamaniu', 'Zamrożony bark', 'Blizna po zabiegu'],
      uslugi: [
        { id: 'u1', nazwa: 'Rehabilitacja pooperacyjna', minuty: 60, cena: 210 },
        { id: 'u2', nazwa: 'Terapia blizny', minuty: 40, cena: 170 },
        { id: 'u3', nazwa: 'Kinesiotaping', minuty: 20, cena: 80 },
      ],
    },
    {
      id: 'ciaza',
      problem: 'Ciąża i połóg',
      specjalizacja: 'Uroginekologia',
      kolor: '#C2255C',
      naKolorze: '#FFFFFF',
      zdjecie: 'assets/img/spec-ciaza.jpg',
      alt: 'Kobieta w zaawansowanej ciąży w stroju sportowym, z dłońmi na brzuchu.',
      opis:
        'Ból pleców w ciąży, rozejście mięśni brzucha, nietrzymanie moczu po porodzie. Rozmawiamy spokojnie i konkretnie — to częstsze, niż się mówi.',
      objawy: ['Rozejście mięśni prostych', 'Nietrzymanie moczu', 'Ból miednicy w ciąży', 'Przygotowanie do porodu', 'Powrót do aktywności po porodzie'],
      uslugi: [
        { id: 'c1', nazwa: 'Konsultacja uroginekologiczna', minuty: 60, cena: 250 },
        { id: 'c2', nazwa: 'Terapia rozejścia mięśni brzucha', minuty: 50, cena: 220 },
        { id: 'c3', nazwa: 'Przygotowanie do porodu', minuty: 60, cena: 220 },
      ],
    },
    {
      id: 'dzieci',
      problem: 'Dziecko',
      specjalizacja: 'Fizjoterapia dziecięca',
      kolor: '#F2B705',
      naKolorze: '#14171A',
      zdjecie: 'assets/img/spec-dzieci.jpg',
      alt: 'Fizjoterapeutka przybija piątkę z chłopcem siedzącym na stole terapeutycznym.',
      opis:
        'Od niemowląt po nastolatki: asymetria, opóźniony rozwój ruchowy, wady postawy. Terapia wygląda jak zabawa — i działa, bo dziecko chce wracać.',
      objawy: ['Asymetria u niemowlęcia', 'Wady postawy', 'Płaskostopie', 'Skolioza', 'Opóźniony rozwój ruchowy'],
      uslugi: [
        { id: 'd1', nazwa: 'Ocena rozwoju niemowlęcia', minuty: 60, cena: 230 },
        { id: 'd2', nazwa: 'Terapia wad postawy', minuty: 45, cena: 190 },
        { id: 'd3', nazwa: 'Terapia NDT-Bobath', minuty: 50, cena: 220 },
      ],
    },
  ],

  /*
   * Grafik: dni tygodnia 1 = poniedziałek … 6 = sobota.
   * Dostępność terminów jest generowana deterministycznie z tego grafiku,
   * więc demo za każdym razem pokazuje wiarygodny, ale spójny kalendarz.
   */
  zespol: [
    {
      id: 't1',
      imie: 'mgr Jan Kowalski',
      rola: 'Fizjoterapeuta, terapia manualna',
      linie: ['kregoslup', 'uraz'],
      zdjecie: 'assets/img/zespol-1.jpg',
      alt: 'Portret fizjoterapeuty w jasnej koszulce polo.',
      bio: 'Od 12 lat pracuje z bólem kręgosłupa. Certyfikowany terapeuta metody McKenziego.',
      jezyki: ['polski', 'angielski'],
      grafik: { centrum: [1, 3, 5], polnoc: [2, 4] },
    },
    {
      id: 't2',
      imie: 'mgr Tomasz Nowak',
      rola: 'Fizjoterapeuta sportowy',
      linie: ['sport', 'uraz'],
      zdjecie: 'assets/img/zespol-2.jpg',
      alt: 'Portret fizjoterapeuty sportowego ze skrzyżowanymi rękami.',
      bio: 'Pracował z drużynami ligowymi. Specjalizuje się w powrocie do sportu po kontuzji kolana.',
      jezyki: ['polski', 'angielski', 'niemiecki'],
      grafik: { centrum: [2, 4, 6], poludnie: [1, 3] },
    },
    {
      id: 't3',
      imie: 'mgr Anna Wiśniewska',
      rola: 'Fizjoterapeutka, rehabilitacja ortopedyczna',
      linie: ['uraz', 'kregoslup'],
      zdjecie: 'assets/img/zespol-3.jpg',
      alt: 'Portret fizjoterapeutki w turkusowym stroju medycznym.',
      bio: 'Prowadzi pacjentów po endoprotezach i rekonstrukcjach więzadeł, od pierwszej doby po zabiegu.',
      jezyki: ['polski'],
      grafik: { polnoc: [1, 3, 5], poludnie: [2, 4] },
    },
    {
      id: 't4',
      imie: 'mgr Katarzyna Wójcik',
      rola: 'Fizjoterapeutka uroginekologiczna',
      linie: ['ciaza'],
      zdjecie: 'assets/img/zespol-4.jpg',
      alt: 'Portret uśmiechniętej fizjoterapeutki w okularach.',
      bio: 'Pracuje z kobietami w ciąży i po porodzie. Prowadzi też zajęcia przygotowujące do porodu.',
      jezyki: ['polski', 'angielski'],
      grafik: { centrum: [1, 2, 4], polnoc: [5] },
    },
    {
      id: 't5',
      imie: 'mgr Magdalena Kamińska',
      rola: 'Fizjoterapeutka dziecięca, NDT-Bobath',
      linie: ['dzieci'],
      zdjecie: 'assets/img/zespol-5.jpg',
      alt: 'Portret uśmiechniętej fizjoterapeutki w niebieskiej bluzie.',
      bio: 'Terapeutka NDT-Bobath. Pracuje z niemowlętami i dziećmi w wieku szkolnym.',
      jezyki: ['polski'],
      grafik: { poludnie: [1, 2, 4, 5], polnoc: [3, 6] },
    },
  ],

  /* Współrzędne są przykładowe — podmień na adresy gabinetu. */
  lokalizacje: [
    {
      id: 'centrum',
      nazwa: 'Centrum',
      adres: 'ul. Przykładowa 1',
      kod: '00-001 [Twoje Miasto]',
      lat: 52.2297,
      lng: 21.0122,
      godziny: [['Pon–Pt', '7:30–20:00'], ['Sobota', '9:00–14:00']],
      udogodnienia: ['Parking dla pacjentów', 'Winda i podjazd', 'Poczekalnia dla rodzica z dzieckiem'],
    },
    {
      id: 'polnoc',
      nazwa: 'Północ',
      adres: 'ul. Testowa 12',
      kod: '00-002 [Twoje Miasto]',
      lat: 52.2712,
      lng: 20.9836,
      godziny: [['Pon–Pt', '8:00–19:00'], ['Sobota', '9:00–13:00']],
      udogodnienia: ['Przystanek tramwajowy 100 m', 'Parter, bez schodów', 'Sala do ćwiczeń'],
    },
    {
      id: 'poludnie',
      nazwa: 'Południe',
      adres: 'al. Wzorcowa 5',
      kod: '00-003 [Twoje Miasto]',
      lat: 52.1931,
      lng: 21.0368,
      godziny: [['Pon–Pt', '8:00–20:00'], ['Sobota', 'nieczynne']],
      udogodnienia: ['Duży parking', 'Kącik zabaw', 'Winda'],
    },
  ],

  godzinyWizyt: { tydzien: [8, 19], sobota: [9, 13] },

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
      linia: 'ciaza',
      tekst:
        'Wreszcie ktoś wytłumaczył mi rozejście mięśni bez straszenia. Rezerwacja online o 23:00 — idealne z noworodkiem.',
      autor: 'Pacjentka, 34 lata',
    },
    {
      linia: 'dzieci',
      tekst:
        'Syn czeka na zajęcia jak na plac zabaw. Po pół roku wada postawy jest ledwo widoczna.',
      autor: 'Mama 9-latka',
    },
  ],

  faq: [
    {
      q: 'Czy potrzebuję skierowania?',
      a: 'Nie. Na wizyty prywatne przyjmujemy bez skierowania. Jeśli masz dokumentację — wyniki rezonansu, RTG, wypis ze szpitala — weź ją ze sobą.',
    },
    {
      q: 'Jak wygląda pierwsza wizyta?',
      a: 'Trwa 60 minut: rozmowa o objawach, badanie ruchu, pierwsza terapia i plan dalszego postępowania z ćwiczeniami do domu. Nie musisz się specjalnie przygotowywać.',
    },
    {
      q: 'Co zabrać i w co się ubrać?',
      a: 'Wygodny strój sportowy, który pozwala odsłonić leczone miejsce, i dokumentację medyczną, jeśli ją masz. Ręczniki zapewniamy.',
    },
    {
      q: 'Jak odwołać lub przełożyć wizytę?',
      a: 'Link do zmiany terminu znajdziesz w SMS-ie z przypomnieniem. Prosimy o informację najpóźniej 24 godziny wcześniej — wtedy termin może trafić do kogoś, kto czeka.',
    },
    {
      q: 'Ile wizyt będę potrzebować?',
      a: 'Zależy od problemu. Na pierwszej wizycie terapeuta powie, czego się spodziewać — przy większości bólów kręgosłupa poprawę widać po 2–4 spotkaniach.',
    },
    {
      q: 'Czy wystawiacie faktury i jak można zapłacić?',
      a: 'Tak, wystawiamy faktury na osobę prywatną i firmę. Płatność kartą, BLIK-iem lub gotówką po wizycie.',
    },
  ],
};
