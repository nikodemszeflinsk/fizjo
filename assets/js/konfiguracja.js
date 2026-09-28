/*
 * KONFIGURACJA GABINETU — jedyny plik, który zmieniasz przy wdrożeniu u klienta.
 *
 * Czytają go i strona (assets/js/data.js), i panel (assets/js/store.js), więc nazwa,
 * telefon, zespół i godziny są w obu miejscach takie same. Zmiana tutaj przestawia
 * całość: stronę gabinetu, podstrony problemów, panel i kartę pacjenta.
 *
 * Zdjęcia podmienia się w assets/img pod tymi samymi nazwami plików.
 * Pełna lista kroków wdrożenia: _wewnetrzne/WDROZENIE.md
 */

window.KONFIGURACJA = {
  /* 'demo' — panel startuje z przykładowymi pacjentami i pokazuje pasek prototypu.
     'praca' — panel startuje pusty i prowadzi przez ustawienie gabinetu.
     Przy wdrożeniu u klienta: 'praca'. */
  tryb: 'demo',

  gabinet: {
    nazwa: 'Linia Ruchu',
    podtytul: 'Gabinet fizjoterapii',
    miasto: '[Twoje Miasto]',
    telefon: '+48 000 000 000',
    email: 'adres@email.com',
    adres: 'ul. Przykładowa 1',
    kod: '00-001 [Twoje Miasto]',
    /* Współrzędne do mapy — podmień na swoje (prawy klik w Mapach Google → „Co tu jest?"). */
    lat: 52.2297,
    lng: 21.0122,
    udogodnienia: ['Parking pod budynkiem', 'Winda i podjazd', 'Wejście z poziomu ulicy'],
    dojazd: 'Przystanek tramwajowy 150 m, wjazd na parking od podwórza.',
  },

  /* Co ile minut może zaczynać się wizyta. */
  krokMinut: 30,

  /*
   * Problemy, z którymi przychodzą pacjenci. Każdy ma swój kolor, swoją stronę
   * w wyszukiwarce i swoje usługi. Kolor pojawia się tylko tutaj i nigdzie indziej.
   * `strona` to nazwa pliku podstrony (bez .html); pusta wartość = brak podstrony.
   */
  problemy: [
    {
      id: 'kregoslup',
      problem: 'Kręgosłup i plecy',
      specjalizacja: 'Terapia kręgosłupa',
      strona: 'fizjoterapia-kregoslupa',
      kolor: '#1F5FD6',
      naKolorze: '#FFFFFF',
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
      strona: 'fizjoterapia-sportowa',
      kolor: '#E8590C',
      naKolorze: '#14171A',
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
      strona: 'rehabilitacja-po-operacji',
      kolor: '#13875A',
      naKolorze: '#FFFFFF',
      uslugi: [
        { id: 'u1', nazwa: 'Rehabilitacja pooperacyjna', minuty: 60, cena: 210 },
        { id: 'u2', nazwa: 'Terapia blizny', minuty: 40, cena: 160 },
        { id: 'u3', nazwa: 'Nauka chodu i obciążania', minuty: 50, cena: 190 },
      ],
    },
    {
      id: 'biuro',
      problem: 'Ból od siedzenia',
      specjalizacja: 'Terapia karku i barków',
      strona: 'bol-karku-i-barkow',
      kolor: '#C2255C',
      naKolorze: '#FFFFFF',
      uslugi: [
        { id: 'b1', nazwa: 'Konsultacja z oceną stanowiska', minuty: 60, cena: 230 },
        { id: 'b2', nazwa: 'Terapia karku i barków', minuty: 50, cena: 200 },
        { id: 'b3', nazwa: 'Masaż leczniczy', minuty: 45, cena: 170 },
      ],
    },
  ],

  /*
   * Zespół. `grafik` to godziny pracy: dzień tygodnia → [od, do], 1 = poniedziałek.
   * Brak wpisu dla dnia znaczy, że tego dnia dana osoba nie przyjmuje.
   * `linie` to problemy, którymi się zajmuje — z tego wynika, kogo pacjent
   * zobaczy przy wybranym problemie i czyje terminy dostanie.
   */
  zespol: [
    {
      id: 'z1',
      imie: 'mgr Jan Kowalski',
      inicjaly: 'JK',
      rola: 'Terapia manualna, kręgosłup',
      kolor: '#1F5FD6',
      zdjecie: 'assets/img/zespol-1.jpg',
      alt: 'Portret fizjoterapeuty w jasnej koszulce polo.',
      bio: 'Od dwunastu lat pracuję z bólem kręgosłupa i powrotami do pracy po długiej przerwie. Certyfikowany terapeuta metody McKenziego, absolwent AWF.',
      kursy: ['Metoda McKenziego (cert. A–D)', 'Terapia manualna wg Kaltenborna', 'Suche igłowanie'],
      jezyki: ['polski', 'angielski'],
      linie: ['kregoslup', 'biuro', 'uraz'],
      grafik: { 1: [8, 19], 2: [8, 19], 3: [8, 19], 4: [8, 19], 5: [8, 16] },
    },
    {
      id: 'z2',
      imie: 'mgr Anna Lewandowska',
      inicjaly: 'AL',
      rola: 'Fizjoterapia sportowa',
      kolor: '#E8590C',
      zdjecie: 'assets/img/zespol-2.jpg',
      alt: 'Portret fizjoterapeutki w ciemnej koszulce sportowej.',
      bio: 'Pracuję z biegaczami i osobami wracającymi po kontuzjach stawów. Prowadzę testy funkcjonalne, po których wiadomo, kiedy naprawdę można wrócić do treningu.',
      kursy: ['Diagnostyka funkcjonalna FMS', 'Terapia tkanek miękkich', 'Taping medyczny'],
      jezyki: ['polski', 'angielski'],
      linie: ['sport', 'uraz', 'kregoslup'],
      grafik: { 1: [12, 20], 2: [12, 20], 3: [12, 20], 4: [12, 20], 5: [10, 18], 6: [9, 13] },
    },
    {
      id: 'z3',
      imie: 'mgr Piotr Zawada',
      inicjaly: 'PZ',
      rola: 'Rehabilitacja pooperacyjna',
      kolor: '#13875A',
      zdjecie: 'assets/img/zespol-3.jpg',
      alt: 'Portret fizjoterapeuty przy kozetce w gabinecie.',
      bio: 'Prowadzę pacjentów po rekonstrukcjach więzadeł i endoprotezach, od zdjęcia ortezy do powrotu do normalnego chodzenia. Współpracuję z operatorami przy ustalaniu tempa.',
      kursy: ['PNF podstawowy i rozwijający', 'Rehabilitacja po endoprotezoplastyce', 'Terapia blizny'],
      jezyki: ['polski'],
      linie: ['uraz', 'kregoslup'],
      grafik: { 2: [8, 15], 4: [8, 15], 6: [9, 13] },
    },
  ],

  /* Kto prowadzi system. Widoczne w stopce demo i w ofercie. */
  agencja: {
    nazwa: 'Studio Widok',
    telefon: '783 480 341',
    email: 'kontakt@studio-widok.pl',
    www: 'studio-widok.pl',
    narzedzie: 'System pozyskiwania pacjentów',
  },
};
