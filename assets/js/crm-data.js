/* Dane demonstracyjne CRM. Wszystko jest przykładowe i policzone od dzisiejszej daty,
   więc demo nigdy nie wygląda na nieaktualne. Nazwiska i numery są fikcyjne. */
(() => {
  'use strict';

  const dzis = new Date();
  dzis.setHours(0, 0, 0, 0);
  const dzien = (przesuniecie) => {
    const d = new Date(dzis);
    d.setDate(dzis.getDate() + przesuniecie);
    return d;
  };

  const linie = [
    { id: 'kregoslup', nazwa: 'Kręgosłup i plecy', kolor: '#1F5FD6', naKolorze: '#FFFFFF' },
    { id: 'sport', nazwa: 'Kontuzja sportowa', kolor: '#E8590C', naKolorze: '#14171A' },
    { id: 'uraz', nazwa: 'Po urazie lub operacji', kolor: '#13875A', naKolorze: '#FFFFFF' },
    { id: 'biuro', nazwa: 'Ból od siedzenia', kolor: '#C2255C', naKolorze: '#FFFFFF' },
  ];

  const fizjo = { id: 't1', imie: 'mgr Jan Kowalski', inicjaly: 'JK' };

  const gabinet = { nazwa: 'Gabinet', adres: 'ul. Przykładowa 1' };

  const zrodla = [
    { id: 'mapy', nazwa: 'Mapy Google' },
    { id: 'strona', nazwa: 'Strona i rezerwacja' },
    { id: 'polecenie', nazwa: 'Polecenie' },
    { id: 'reklama', nazwa: 'Reklama Google' },
    { id: 'powrot', nazwa: 'Powracający pacjent' },
  ];

  /* Pacjenci: etap mówi, gdzie pacjent jest w cyklu terapii. */
  const pacjenci = [
    { id: 'p1', imie: 'Anna Zielińska', linia: 'kregoslup', zrodlo: 'mapy', etap: 'terapia', wizyt: 4, plan: 8, od: -34, ostatnia: -6, nastepna: 0, wartosc: 880, telefon: '+48 600 000 001', email: 'anna.z@przyklad.pl', notatka: 'Rwa kulszowa po lewej. Ćwiczenia domowe robi regularnie, ból z 7 na 3.' },
    { id: 'p2', imie: 'Marek Wysocki', linia: 'sport', zrodlo: 'reklama', etap: 'terapia', wizyt: 2, plan: 6, od: -12, ostatnia: -3, nastepna: 0, wartosc: 520, telefon: '+48 600 000 002', email: 'm.wysocki@przyklad.pl', notatka: 'Skręcenie stawu skokowego, wraca do biegania. Testy siły w przyszłym tygodniu.' },
    { id: 'p3', imie: 'Ewa Malinowska', linia: 'biuro', zrodlo: 'polecenie', etap: 'nowy', wizyt: 0, plan: 4, od: -1, ostatnia: null, nastepna: 0, wartosc: 0, telefon: '+48 600 000 003', email: 'ewa.m@przyklad.pl', notatka: 'Ból karku i barków po przejściu na pracę zdalną. Prosi o wizyty po 16:00.' },
    { id: 'p4', imie: 'Krzysztof Dąb', linia: 'uraz', zrodlo: 'strona', etap: 'terapia', wizyt: 6, plan: 10, od: -58, ostatnia: -4, nastepna: 1, wartosc: 1260, telefon: '+48 600 000 004', email: 'k.dab@przyklad.pl', notatka: 'Po rekonstrukcji ACL, 11. tydzień. Zakres zgięcia 125°.' },
    { id: 'p5', imie: 'Zofia Rutkowska', linia: 'kregoslup', zrodlo: 'polecenie', etap: 'terapia', wizyt: 3, plan: 6, od: -21, ostatnia: -7, nastepna: 1, wartosc: 690, telefon: '+48 600 000 005', email: 'rodzic.zr@przyklad.pl', notatka: 'Wada postawy i ból pleców, 19 lat. Ćwiczenia robi nieregularnie.' },
    { id: 'p6', imie: 'Piotr Lewandowski', linia: 'kregoslup', zrodlo: 'mapy', etap: 'zapytanie', wizyt: 0, plan: 0, od: 0, ostatnia: null, nastepna: null, wartosc: 0, telefon: '+48 600 000 006', email: 'p.lewandowski@przyklad.pl', notatka: 'Formularz ze strony o 22:41: ból szyi przy pracy biurowej.' },
    { id: 'p7', imie: 'Hanna Sobczak', linia: 'uraz', zrodlo: 'strona', etap: 'zapytanie', wizyt: 0, plan: 0, od: 0, ostatnia: null, nastepna: null, wartosc: 0, telefon: '+48 600 000 007', email: 'h.sobczak@przyklad.pl', notatka: 'Po złamaniu nadgarstka, pyta o termin w tym tygodniu.' },
    { id: 'p8', imie: 'Robert Jasiński', linia: 'sport', zrodlo: 'reklama', etap: 'zakonczona', wizyt: 6, plan: 6, od: -76, ostatnia: -14, nastepna: null, wartosc: 1380, telefon: '+48 600 000 008', email: 'r.jasinski@przyklad.pl', notatka: 'Cykl zakończony. Kontrola za 6 tygodni — przypomnienie ustawione.' },
    { id: 'p9', imie: 'Maria Cichoń', linia: 'kregoslup', zrodlo: 'powrot', etap: 'terapia', wizyt: 1, plan: 5, od: -5, ostatnia: -5, nastepna: 2, wartosc: 220, telefon: '+48 600 000 009', email: 'm.cichon@przyklad.pl', notatka: 'Wraca po roku, ten sam odcinek lędźwiowy.' },
    { id: 'p10', imie: 'Tadeusz Bąk', linia: 'uraz', zrodlo: 'polecenie', etap: 'terapia', wizyt: 8, plan: 10, od: -63, ostatnia: -2, nastepna: 2, wartosc: 1680, telefon: '+48 600 000 010', email: 't.bak@przyklad.pl', notatka: 'Endoproteza biodra, chodzi bez kuli od 3 tygodni.' },
    { id: 'p11', imie: 'Julia Ostrowska', linia: 'sport', zrodlo: 'mapy', etap: 'zakonczona', wizyt: 4, plan: 4, od: -90, ostatnia: -30, nastepna: null, wartosc: 900, telefon: '+48 600 000 011', email: 'j.ostrowska@przyklad.pl', notatka: 'Powrót do biegania po rocznej przerwie. Prośba o opinię wysłana — wystawiła 5 gwiazdek.' },
    { id: 'p12', imie: 'Adam Wilk', linia: 'sport', zrodlo: 'reklama', etap: 'nowy', wizyt: 1, plan: 4, od: -2, ostatnia: -2, nastepna: 3, wartosc: 260, telefon: '+48 600 000 012', email: 'a.wilk@przyklad.pl', notatka: 'Bark po siłowni. Diagnostyka wykonana, plan na 4 wizyty.' },
    { id: 'p13', imie: 'Barbara Nowicka', linia: 'biuro', zrodlo: 'polecenie', etap: 'terapia', wizyt: 2, plan: 8, od: -16, ostatnia: -9, nastepna: 4, wartosc: 460, telefon: '+48 600 000 013', email: 'b.nowicka@przyklad.pl', notatka: 'Drętwienie prawej ręki przy pracy z myszką. Ustawienie stanowiska poprawione.' },
    { id: 'p14', imie: 'Grzegorz Pająk', linia: 'kregoslup', zrodlo: 'strona', etap: 'ryzyko', wizyt: 2, plan: 6, od: -40, ostatnia: -24, nastepna: null, wartosc: 440, telefon: '+48 600 000 014', email: 'g.pajak@przyklad.pl', notatka: 'Nie umówił kolejnej wizyty od 24 dni. Warto zadzwonić.' },
  ];

  /* Dzisiejszy grafik: godzina, pacjent, usługa, status. */
  const wizytyDzis = [
    { godz: '8:00', pacjent: 'p1', usluga: 'Terapia manualna', minuty: 50, status: 'zakonczona' },
    { godz: '9:00', pacjent: 'p10', usluga: 'Rehabilitacja pooperacyjna', minuty: 60, status: 'zakonczona' },
    { godz: '10:30', pacjent: 'p2', usluga: 'Trening powrotu do sportu', minuty: 60, status: 'trwa' },
    { godz: '12:00', pacjent: 'p3', usluga: 'Konsultacja z oceną stanowiska', minuty: 60, status: 'potwierdzona' },
    { godz: '13:30', pacjent: 'p9', usluga: 'Konsultacja z terapią', minuty: 60, status: 'potwierdzona' },
    { godz: '15:00', pacjent: 'p12', usluga: 'Diagnostyka funkcjonalna', minuty: 75, status: 'niepotwierdzona' },
    { godz: '16:30', pacjent: 'p5', usluga: 'Terapia karku i barków', minuty: 45, status: 'potwierdzona' },
    { godz: '18:00', pacjent: 'p4', usluga: 'Rehabilitacja pooperacyjna', minuty: 60, status: 'potwierdzona' },
  ];

  /* Tydzień w kalendarzu: [dzień 0–5, godzina startu, pacjent, terapeuta, minuty]. */
  const tydzien = [
    [0, 8, 'p1', 50], [0, 9, 'p10', 60], [0, 10.5, 'p2', 60], [0, 12, 'p3', 60],
    [0, 13.5, 'p9', 60], [0, 15, 'p12', 75], [0, 16.5, 'p5', 45], [0, 18, 'p4', 60],
    [1, 8, 'p4', 60], [1, 9.5, 'p5', 45], [1, 11, 'p1', 50], [1, 13, 'p13', 45],
    [1, 15, 'p2', 60], [1, 17, 'p10', 60],
    [2, 8.5, 'p9', 60], [2, 10, 'p12', 60], [2, 12, 'p11', 60], [2, 14, 'p1', 50],
    [2, 16, 'p4', 60], [2, 17.5, 'p13', 45],
    [3, 9, 'p10', 60], [3, 11, 'p2', 60], [3, 13, 'p3', 60], [3, 15, 'p5', 45],
    [3, 16.5, 'p9', 60],
    [4, 8, 'p1', 50], [4, 10, 'p4', 60], [4, 12, 'p12', 75], [4, 14.5, 'p13', 45],
    [4, 16, 'p10', 60], [4, 17.5, 'p2', 60],
    [5, 9, 'p5', 45], [5, 10.5, 'p9', 60], [5, 12, 'p11', 60],
  ];

  /* Zadania: to, o czym rejestracja ma pamiętać. */
  const zadania = [
    { id: 'z1', tekst: 'Oddzwoń do Piotra Lewandowskiego — formularz ze strony, 22:41', pacjent: 'p6', termin: 0, pilne: true, zrobione: false },
    { id: 'z2', tekst: 'Potwierdź wizytę Adama Wilka o 15:00 — brak odpowiedzi na SMS', pacjent: 'p12', termin: 0, pilne: true, zrobione: false },
    { id: 'z3', tekst: 'Zadzwoń do Grzegorza Pająka — 24 dni bez kolejnej wizyty', pacjent: 'p14', termin: 0, pilne: false, zrobione: false },
    { id: 'z4', tekst: 'Wyślij plan ćwiczeń do Hanny Sobczak', pacjent: 'p7', termin: 1, pilne: false, zrobione: false },
    { id: 'z5', tekst: 'Umów kontrolę Roberta Jasińskiego za 6 tygodni', pacjent: 'p8', termin: 2, pilne: false, zrobione: false },
    { id: 'z6', tekst: 'Wystaw fakturę za pakiet Marii Cichoń', pacjent: 'p9', termin: -1, pilne: false, zrobione: true },
  ];

  /* Automatyzacje: reguły, które chodzą same. */
  const automatyzacje = [
    { id: 'a1', nazwa: 'Potwierdzenie rezerwacji', opis: 'SMS i e-mail zaraz po umówieniu wizyty przez stronę.', kiedy: 'natychmiast', wlaczona: true, wyslane30: 128, efekt: '—' },
    { id: 'a2', nazwa: 'Przypomnienie o wizycie', opis: 'SMS dzień wcześniej o 18:00, z linkiem do zmiany terminu.', kiedy: '24 h przed wizytą', wlaczona: true, wyslane30: 214, efekt: 'nieobecności 9% → 3%' },
    { id: 'a3', nazwa: 'Prośba o opinię', opis: 'Po ostatniej wizycie z cyklu, z linkiem do profilu w Mapach Google.', kiedy: '2 h po wizycie', wlaczona: true, wyslane30: 46, efekt: '+18 opinii w kwartale' },
    { id: 'a4', nazwa: 'Przypomnienie o kontroli', opis: 'Dla pacjentów po zakończonym cyklu terapii.', kiedy: '6 tygodni po ostatniej wizycie', wlaczona: true, wyslane30: 31, efekt: '11 powrotów' },
    { id: 'a5', nazwa: 'Cisza po pierwszej wizycie', opis: 'Sygnał dla rejestracji, gdy pacjent nie umówił kolejnego terminu.', kiedy: '10 dni bez wizyty', wlaczona: false, wyslane30: 0, efekt: 'wyłączona' },
    { id: 'a6', nazwa: 'Życzenia urodzinowe', opis: 'Krótka wiadomość z kodem na masaż dla stałych pacjentów.', kiedy: 'w dniu urodzin', wlaczona: false, wyslane30: 0, efekt: 'wyłączona' },
  ];

  /* Skrzynka: ostatnie wiadomości i zgłoszenia. */
  const skrzynka = [
    { id: 'w1', pacjent: 'p6', kanal: 'Formularz', czas: '22:41', temat: 'Ból szyi przy pracy biurowej', tresc: 'Dzień dobry, od dwóch tygodni boli mnie kark i drętwieje ręka. Czy da się umówić w tym tygodniu po 17:00?', nowa: true },
    { id: 'w2', pacjent: 'p7', kanal: 'Formularz', czas: '21:05', temat: 'Termin po złamaniu nadgarstka', tresc: 'Zdjęto mi gips w poniedziałek, ortopeda zalecił rehabilitację. Proszę o najbliższy wolny termin.', nowa: true },
    { id: 'w3', pacjent: 'p12', kanal: 'SMS', czas: '19:12', temat: 'Odpowiedź na przypomnienie', tresc: 'Dzień dobry, czy mogę przesunąć jutrzejszą wizytę na godzinę 17:00?', nowa: true },
    { id: 'w4', pacjent: 'p5', kanal: 'SMS', czas: 'wczoraj', temat: 'Potwierdzenie wizyty', tresc: 'Tak, potwierdzam obecność. Dziękuję!', nowa: false },
    { id: 'w5', pacjent: 'p11', kanal: 'Opinia', czas: 'wczoraj', temat: 'Nowa opinia w Mapach Google — 5/5', tresc: 'Wreszcie ktoś wytłumaczył mi rozejście mięśni bez straszenia. Rezerwacja online o 23:00 to był strzał w dziesiątkę.', nowa: false },
  ];

  /* Wykres: rezerwacje w ostatnich 8 tygodniach, z podziałem na źródło. */
  const rezerwacjeTygodnie = [
    { tydzien: -7, strona: 18, telefon: 22 },
    { tydzien: -6, strona: 21, telefon: 21 },
    { tydzien: -5, strona: 26, telefon: 19 },
    { tydzien: -4, strona: 29, telefon: 20 },
    { tydzien: -3, strona: 34, telefon: 18 },
    { tydzien: -2, strona: 38, telefon: 17 },
    { tydzien: -1, strona: 41, telefon: 16 },
    { tydzien: 0, strona: 46, telefon: 15 },
  ];

  /* Epizod terapii — serce systemu. Wizyta jest tylko zdarzeniem w epizodzie.
     ból: odczyty z ankiety SMS po wizycie (0–10), d = ile dni temu.
     compliance: ile procent zadanych ćwiczeń pacjent odhaczył w ostatnich 14 dniach.
     odstepDni: co ile dni powinna odbywać się wizyta wg planu terapeuty. */
  const terapie = {
    p1: {
      etykieta: 'Rwa kulszowa, odcinek L5-S1',
      cel: 'Przespać noc bez bólu i wrócić na basen',
      odstepDni: 7,
      compliance: 82,
      lekarz: null,
      bol: [{ d: -34, v: 7 }, { d: -27, v: 6 }, { d: -20, v: 5 }, { d: -6, v: 3 }],
    },
    p2: {
      etykieta: 'Skręcenie stawu skokowego III stopnia',
      cel: 'Przebiec 5 km bez obrzęku',
      odstepDni: 5,
      compliance: 61,
      lekarz: 'dr Marek Zieliński, ortopeda',
      bol: [{ d: -12, v: 6 }, { d: -8, v: 5 }, { d: -3, v: 4 }],
    },
    p3: {
      etykieta: 'Kark i barki przy pracy zdalnej',
      cel: 'Przepracować dzień bez bólu karku',
      odstepDni: 7,
      compliance: null,
      lekarz: null,
      bol: [],
    },
    p4: {
      etykieta: 'Stan po rekonstrukcji ACL, 11. tydzień',
      cel: 'Pełne zgięcie kolana i powrót do treningu',
      odstepDni: 4,
      compliance: 91,
      lekarz: 'dr Piotr Kowal, ortopeda',
      bol: [{ d: -58, v: 8 }, { d: -45, v: 6 }, { d: -30, v: 5 }, { d: -14, v: 3 }, { d: -4, v: 2 }],
    },
    p5: {
      etykieta: 'Wada postawy i ból pleców',
      cel: 'Przesiedzieć wykłady bez bólu pleców',
      odstepDni: 7,
      compliance: 35,
      lekarz: null,
      bol: [{ d: -21, v: 3 }, { d: -14, v: 3 }, { d: -7, v: 3 }],
    },
    p6: { etykieta: 'Ból szyi przy pracy biurowej — zgłoszenie', cel: null, odstepDni: 7, compliance: null, lekarz: null, bol: [] },
    p7: { etykieta: 'Stan po złamaniu nadgarstka — zgłoszenie', cel: null, odstepDni: 5, compliance: null, lekarz: 'dr Anna Lis, ortopeda', bol: [] },
    p8: {
      etykieta: 'Kolano biegacza, zespół pasma biodrowo-piszczelowego',
      cel: 'Powrót do biegania 10 km',
      odstepDni: 7,
      compliance: 88,
      lekarz: null,
      bol: [{ d: -76, v: 7 }, { d: -60, v: 5 }, { d: -40, v: 3 }, { d: -20, v: 2 }, { d: -14, v: 1 }],
    },
    p9: {
      etykieta: 'Nawracający ból lędźwiowy',
      cel: 'Wrócić do pracy w ogrodzie bez blokady',
      odstepDni: 7,
      compliance: 55,
      lekarz: null,
      bol: [{ d: -5, v: 6 }],
    },
    p10: {
      etykieta: 'Stan po endoprotezie biodra',
      cel: 'Chodzić 3 km bez kuli i wejść na piętro',
      odstepDni: 5,
      compliance: 76,
      lekarz: 'dr Piotr Kowal, ortopeda',
      bol: [{ d: -63, v: 7 }, { d: -48, v: 6 }, { d: -30, v: 4 }, { d: -12, v: 3 }, { d: -2, v: 2 }],
    },
    p11: {
      etykieta: 'Powrót do biegania po przerwie',
      cel: 'Wrócić do biegania i ćwiczeń siłowych',
      odstepDni: 10,
      compliance: 80,
      lekarz: null,
      bol: [{ d: -90, v: 5 }, { d: -70, v: 4 }, { d: -50, v: 2 }, { d: -30, v: 1 }],
    },
    p12: {
      etykieta: 'Zespół ciasnoty podbarkowej',
      cel: 'Wycisnąć sztangę nad głowę bez bólu',
      odstepDni: 7,
      compliance: null,
      lekarz: null,
      bol: [{ d: -2, v: 5 }],
    },
    p13: {
      etykieta: 'Drętwienie ręki przy myszce',
      cel: 'Przepracować tydzień bez drętwienia ręki',
      odstepDni: 7,
      compliance: 28,
      lekarz: null,
      bol: [],
    },
    p14: {
      etykieta: 'Dyskopatia L4-L5',
      cel: 'Przesiedzieć 8 godzin w pracy bez drętwienia',
      odstepDni: 7,
      compliance: 20,
      lekarz: null,
      bol: [{ d: -40, v: 6 }, { d: -31, v: 6 }, { d: -24, v: 6 }],
    },
  };

  pacjenci.forEach((p) => (p.terapia = terapie[p.id]));

  window.CRM = {
    dzis,
    dzien,
    linie,
    fizjo,
    gabinet,
    zrodla,
    pacjenci,
    terapie,
    wizytyDzis,
    tydzien,
    zadania,
    automatyzacje,
    skrzynka,
    rezerwacjeTygodnie,
    klinika: { nazwa: 'Linia Ruchu', uzytkownik: 'mgr Jan Kowalski', inicjaly: 'JK' },
  };
})();
