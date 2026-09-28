/*
 * Dane gabinetu demo — JEDYNE miejsce do podmiany treści.
 *
 * Demo pokazuje jednoosobowy gabinet fizjoterapii: jeden terapeuta, jeden adres.
 * Wszystko tutaj to przykład: nazwisko, adres, telefon, ceny i współrzędne.
 * Żeby przerobić demo na konkretny gabinet, wystarczy edytować ten plik
 * i podmienić zdjęcia w assets/img (te same nazwy plików).
 */

window.KLINIKA = {
  nazwa: 'Linia Ruchu',
  podtytul: 'Gabinet fizjoterapii',
  miasto: '[Twoje Miasto]',
  telefon: '+48 000 000 000',
  telefonHref: '+48000000000',
  email: 'adres@email.com',
  agencja: 'Studio Widok',
  narzedzie: 'System pozyskiwania pacjentów',

  /* Cztery linie = cztery problemy, z którymi przychodzą pacjenci.
     Kolor ma znaczenie i nie pojawia się nigdzie indziej. */
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
        'Ból krzyża, szyi i pleców, który wraca, promieniuje do nogi albo nie pozwala przespać nocy. Szukam źródła, a nie tylko miejsca, które boli.',
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
      specjalizacja: 'Rehabilitacja pooperacyjna',
      kolor: '#13875A',
      naKolorze: '#FFFFFF',
      zdjecie: 'assets/img/spec-uraz.jpg',
      alt: 'Fizjoterapeutka mobilizująca staw skokowy pacjenta po urazie.',
      opis:
        'Endoprotezy, rekonstrukcje więzadeł, złamania. Prowadzę od pierwszych dni po zabiegu do pełnej sprawności, w porozumieniu z Twoim ortopedą.',
      objawy: ['Rekonstrukcja ACL', 'Endoproteza biodra i kolana', 'Po złamaniu', 'Zamrożony bark', 'Blizna po zabiegu'],
      uslugi: [
        { id: 'u1', nazwa: 'Rehabilitacja pooperacyjna', minuty: 60, cena: 210 },
        { id: 'u2', nazwa: 'Terapia blizny', minuty: 40, cena: 170 },
        { id: 'u3', nazwa: 'Kinesiotaping', minuty: 20, cena: 80 },
      ],
    },
    {
      id: 'biuro',
      problem: 'Ból od siedzenia',
      specjalizacja: 'Terapia dla pracujących przy biurku',
      kolor: '#C2255C',
      naKolorze: '#FFFFFF',
      zdjecie: 'assets/img/spec-biuro.jpg',
      alt: 'Fizjoterapeuta pracujący z napiętym karkiem siedzącego pacjenta.',
      opis:
        'Kark, barki i nadgarstki po ośmiu godzinach przy monitorze. Terapia plus ustawienie stanowiska, żeby ból nie wracał w poniedziałek.',
      objawy: ['Napięty kark', 'Drętwienie rąk', 'Ból między łopatkami', 'Nadgarstek przy myszce', 'Bóle głowy od karku'],
      uslugi: [
        { id: 'b1', nazwa: 'Konsultacja z oceną stanowiska', minuty: 60, cena: 230 },
        { id: 'b2', nazwa: 'Terapia karku i barków', minuty: 50, cena: 200 },
        { id: 'b3', nazwa: 'Masaż leczniczy', minuty: 45, cena: 170 },
      ],
    },
  ],

  /* Jeden fizjoterapeuta — to jego gabinet i jego kalendarz. */
  fizjoterapeuta: {
    id: 't1',
    imie: 'mgr Jan Kowalski',
    rola: 'Fizjoterapeuta, terapia manualna',
    zdjecie: 'assets/img/zespol-1.jpg',
    alt: 'Portret fizjoterapeuty w jasnej koszulce polo.',
    bio: 'Od dwunastu lat pracuję z bólem kręgosłupa i powrotami do sportu. Certyfikowany terapeuta metody McKenziego, absolwent AWF.',
    kursy: ['Metoda McKenziego (cert. A–D)', 'Terapia manualna wg Kaltenborna', 'Suche igłowanie', 'Diagnostyka funkcjonalna FMS'],
    jezyki: ['polski', 'angielski'],
    /* Dni tygodnia, w które przyjmuje: 1 = poniedziałek, 6 = sobota. */
    grafik: [1, 2, 3, 4, 5, 6],
  },

  /* Jeden adres. Współrzędne przykładowe — podmień na swoje. */
  gabinet: {
    nazwa: 'Gabinet',
    adres: 'ul. Przykładowa 1',
    kod: '00-001 [Twoje Miasto]',
    lat: 52.2297,
    lng: 21.0122,
    godziny: [['Pon–Pt', '8:00–19:00'], ['Sobota', '9:00–13:00']],
    udogodnienia: ['Parking pod budynkiem', 'Winda i podjazd', 'Wejście z poziomu ulicy'],
    dojazd: 'Przystanek tramwajowy 150 m, wjazd na parking od podwórza.',
  },

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
