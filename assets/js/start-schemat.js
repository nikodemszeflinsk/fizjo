/*
 * Formularz startowy: definicja pól (jedno źródło prawdy).
 *
 * Czytają ją: strona klienta (start.html), widok odpowiedzi w CRM i generator briefu. Zmiana pytania to zmiana tutaj.
 * Pole „k: true” jest kluczowe: bez niego brief jest niekompletny i CRM pokaże, czego brakuje.
 * Typy pól: tekst, dlugi, wybor (jedna odpowiedź), wiele (kilka), taknie, kolor, linki (adres + komentarz), plik, lista (powtarzalne karty).
 */
(function (korzen) {
  'use strict';

  var TAKNIE = [['tak', 'Tak'], ['nie', 'Nie']];

  var SEKCJE = [
    {
      id: 'gabinet', tytul: 'Gabinet i cele', czas: '5 min',
      po_co: 'Z tego powstaje główny przekaz strony: kim jesteście, dla kogo i po co ta strona ma być.',
      pola: [
        { id: 'nazwa', typ: 'tekst', etykieta: 'Nazwa gabinetu lub kliniki, jak ma być na stronie', k: true },
        { id: 'rok', typ: 'tekst', etykieta: 'Od kiedy działacie', pod: 'Np. „od 2012 roku”. Zostaw puste, jeśli nie chcesz tego pokazywać.' },
        { id: 'opis', typ: 'dlugi', etykieta: 'Czym się zajmujecie? Opisz własnymi słowami, jakbyś mówił do nowego pacjenta', k: true, wiersze: 4 },
        { id: 'wyroznik', typ: 'dlugi', etykieta: 'Co Was wyróżnia? Wymień do trzech rzeczy', pod: 'Metoda, sprzęt, doświadczenie, podejście do pacjenta, dostępność terminów.', k: true, wiersze: 3 },
        { id: 'dla_kogo', typ: 'wiele', etykieta: 'Kto najczęściej do Was przychodzi?', k: true, opcje: ['Osoby pracujące przy biurku', 'Sportowcy i osoby aktywne', 'Seniorzy', 'Dzieci i młodzież', 'Kobiety w ciąży i po porodzie', 'Osoby po urazach i operacjach', 'Osoby z bólem przewlekłym', 'Inni'], inne: true },
        { id: 'cel', typ: 'wiele', etykieta: 'Co ma dać Wam ta strona?', k: true, opcje: ['Więcej rezerwacji online', 'Nowych pacjentów z Google', 'Mniej telefonów w trakcie zabiegów', 'Profesjonalny wizerunek', 'Pokazanie zespołu', 'Odejście od portalu z lekarzami', 'Inne'], inne: true },
        { id: 'pytania_pacjentow', typ: 'dlugi', etykieta: 'O co pacjenci pytają Was najczęściej, zanim przyjdą?', pod: 'Z tego zrobimy sekcję pytań i odpowiedzi.', wiersze: 4 },
      ],
    },
    {
      id: 'kontakt', tytul: 'Kontakt i internet', czas: '3 min',
      po_co: 'Dane do paska „Zadzwoń”, stopki i wizytówki w Google.',
      pola: [
        { id: 'telefony', typ: 'dlugi', etykieta: 'Telefony, które mają być na stronie', pod: 'Jeden w linii, najlepiej z podpisem, np. „Recepcja 600 100 200”.', k: true, wiersze: 2 },
        { id: 'email', typ: 'tekst', etykieta: 'E-mail, który ma być na stronie', k: true },
        { id: 'godziny_tel', typ: 'tekst', etykieta: 'W jakich godzinach można dzwonić?', pod: 'Np. pn–pt 8–18.' },
        { id: 'preferowany_kontakt', typ: 'wybor', etykieta: 'Jak wolicie, żeby pacjent się z Wami kontaktował?', opcje: ['Rezerwacja online', 'Telefon', 'Formularz z pytaniem', 'Bez różnicy'] },
        { id: 'social', typ: 'linki', etykieta: 'Facebook, Instagram, YouTube, TikTok i inne profile', pod: 'Adres profilu. Komentarz jest opcjonalny.', opcjaKomentarza: false, maks: 8 },
        { id: 'wizytowka_google', typ: 'tekst', etykieta: 'Link do Waszej wizytówki w Google (z Map)', pod: 'Jeśli jej nie ma, napisz „brak”. Założymy ją w ramach wdrożenia.', k: true },
        { id: 'portale', typ: 'linki', etykieta: 'Profile na ZnanyLekarz, Booksy i podobnych', pod: 'Zostają, a strona może do nich linkować.', opcjaKomentarza: false, maks: 5 },
      ],
    },
    {
      id: 'lokalizacje', tytul: 'Miejsca przyjęć', czas: '5 min',
      po_co: 'Każde miejsce dostaje adres, mapę, godziny otwarcia i opis dojazdu. To też ramy dla grafiku terapeutów.',
      pola: [
        { id: 'miejsca', typ: 'lista', etykieta: 'Miejsca, w których przyjmujecie', k: true, element: 'miejsce', dodaj: 'Dodaj miejsce', min: 1, maks: 12,
          pola: [
            { id: 'nazwa', typ: 'tekst', etykieta: 'Nazwa miejsca', pod: 'Np. „Klinika Podgórze” albo „Gabinet na Ruczaju”.', k: true },
            { id: 'adres', typ: 'tekst', etykieta: 'Ulica, numer, kod pocztowy i miasto', k: true },
            { id: 'telefon', typ: 'tekst', etykieta: 'Telefon do tego miejsca' },
            { id: 'godziny', typ: 'dlugi', etykieta: 'Godziny otwarcia', pod: 'Dzień po dniu, np. „pn–pt 8:00–19:00, sb 9:00–14:00, nd zamknięte”.', k: true, wiersze: 3 },
            { id: 'dojazd', typ: 'dlugi', etykieta: 'Jak dojechać i gdzie zaparkować', wiersze: 3 },
            { id: 'dostepnosc', typ: 'tekst', etykieta: 'Dostępność dla osób z ograniczoną mobilnością', pod: 'Piętro, winda, wejście bez schodów.' },
            { id: 'zdjecia', typ: 'plik', etykieta: 'Zdjęcia tego miejsca (wejście, recepcja, gabinet)', wiele: true, maks: 8, akceptuj: 'image/*' },
          ] },
      ],
    },
    {
      id: 'zespol', tytul: 'Zespół', czas: '10 min',
      po_co: 'Karty terapeutów, wybór osoby przy rezerwacji i podstawa grafiku w systemie.',
      pola: [
        { id: 'osoby', typ: 'lista', etykieta: 'Terapeuci i osoby przyjmujące pacjentów', k: true, element: 'osoba', dodaj: 'Dodaj osobę', min: 1, maks: 40,
          pola: [
            { id: 'imie', typ: 'tekst', etykieta: 'Imię i nazwisko', k: true },
            { id: 'tytul', typ: 'tekst', etykieta: 'Tytuł i stanowisko', pod: 'Np. „mgr fizjoterapii, terapeuta manualny”.' },
            { id: 'specjalizacje', typ: 'dlugi', etykieta: 'Specjalizacje i metody', wiersze: 2 },
            { id: 'opis', typ: 'dlugi', etykieta: 'Kilka zdań o tej osobie', pod: 'Doświadczenie, podejście do pacjenta, to, co ją wyróżnia. Piszemy w trzeciej osobie.', wiersze: 3 },
            { id: 'certyfikaty', typ: 'dlugi', etykieta: 'Wykształcenie, kursy i certyfikaty', wiersze: 2 },
            { id: 'uslugi', typ: 'tekst', etykieta: 'Jakie usługi wykonuje', pod: 'Nazwy z cennika, po przecinku.' },
            { id: 'miejsca', typ: 'tekst', etykieta: 'W których miejscach przyjmuje' },
            { id: 'godziny', typ: 'dlugi', etykieta: 'Kiedy przyjmuje', pod: 'Np. „pn, śr 8–16 w Podgórzu, wt, cz 10–18 w Bronowicach”. Z tego ułożymy pierwszy grafik.', wiersze: 2 },
            { id: 'online', typ: 'taknie', etykieta: 'Czy pacjent może zarezerwować wizytę u tej osoby online?' },
            { id: 'zdjecie', typ: 'plik', etykieta: 'Zdjęcie', pod: 'Najlepiej pionowe lub kwadratowe, dobrej jakości.', wiele: false, akceptuj: 'image/*' },
            { id: 'zgoda_wizerunek', typ: 'taknie', etykieta: 'Ta osoba zgadza się na publikację swojego wizerunku i opisu na stronie', k: true },
          ] },
      ],
    },
    {
      id: 'uslugi', tytul: 'Usługi i cennik', czas: '8 min',
      po_co: 'Cennik, czas wizyt i reguły rezerwacji online dla każdej usługi.',
      pola: [
        { id: 'lista', typ: 'lista', etykieta: 'Usługi', k: true, element: 'usługa', dodaj: 'Dodaj usługę', min: 1, maks: 60,
          pola: [
            { id: 'nazwa', typ: 'tekst', etykieta: 'Nazwa usługi', k: true },
            { id: 'czas', typ: 'tekst', etykieta: 'Czas trwania (minuty)', k: true },
            { id: 'cena', typ: 'tekst', etykieta: 'Cena (zł)', pod: 'Jeśli „od”, wpisz „od 180”.', k: true },
            { id: 'opis', typ: 'dlugi', etykieta: 'Krótki opis dla pacjenta', pod: 'Co się dzieje na wizycie i dla kogo jest.', wiersze: 2 },
            { id: 'online', typ: 'taknie', etykieta: 'Można ją zarezerwować online' },
            { id: 'zaliczka', typ: 'taknie', etykieta: 'Wymaga zaliczki online' },
          ] },
        { id: 'platnosci', typ: 'wiele', etykieta: 'Jak płaci pacjent na miejscu?', opcje: ['Gotówka', 'Karta', 'BLIK', 'Przelew'] },
        { id: 'refundacja', typ: 'wybor', etykieta: 'Czy przyjmujecie pacjentów w ramach NFZ lub refundacji?', opcje: ['Nie, tylko prywatnie', 'Tak, w ramach NFZ', 'Częściowo'] },
        { id: 'karnety', typ: 'dlugi', etykieta: 'Karnety, pakiety wizyt, zniżki', pod: 'Opisz, jeśli macie. Pokażemy je w cenniku.', wiersze: 3 },
      ],
    },
    {
      id: 'problemy', tytul: 'Z czym przychodzą pacjenci', czas: '5 min',
      po_co: 'Każda wybrana dolegliwość dostaje własną podstronę, która odpowiada na to, co pacjent wpisuje w Google.',
      pola: [
        { id: 'wybrane', typ: 'wiele', etykieta: 'Na jakie problemy robimy osobne podstrony?', k: true, opcje: ['Ból kręgosłupa', 'Rwa kulszowa', 'Ból szyi i głowy', 'Ból barku', 'Ból kolana', 'Ból biodra', 'Rehabilitacja po urazie', 'Rehabilitacja po operacji', 'Fizjoterapia sportowa', 'Terapia manualna', 'Fizjoterapia dzieci', 'Fizjoterapia uroginekologiczna', 'Fizjoterapia w ciąży i po porodzie', 'Inne'], inne: true },
        { id: 'flagowe', typ: 'dlugi', etykieta: 'Które trzy z nich chcecie promować najmocniej?', pod: 'Na tym skupimy tytuły, zdjęcia i kolejność na stronie.', k: true, wiersze: 2 },
        { id: 'nie_robimy', typ: 'dlugi', etykieta: 'Czego NIE leczycie albo czego nie chcecie na stronie?', wiersze: 2 },
        { id: 'metody', typ: 'dlugi', etykieta: 'Metody i terapie, które chcecie opisać', pod: 'Np. terapia manualna, dry needling, kinesiotaping, terapia powięziowa.', wiersze: 3 },
        { id: 'przed_wizyta', typ: 'dlugi', etykieta: 'Co pacjent powinien wiedzieć i przynieść przed pierwszą wizytą?', pod: 'Ubranie, dokumenty, wyniki badań, skierowanie.', wiersze: 3 },
      ],
    },
    {
      id: 'wyglad', tytul: 'Wygląd i inspiracje', czas: '12 min',
      po_co: 'To jest brief graficzny: na jego podstawie od razu zaczynamy projekt. Im więcej przykładów i zdjęć, tym trafniejszy pierwszy projekt.',
      pola: [
        { id: 'klimat', typ: 'wiele', etykieta: 'Jaki ma być klimat strony? Wybierz do trzech', k: true, maks: 3, opcje: ['Spokojny i medyczny', 'Ciepły i ludzki', 'Sportowy i energiczny', 'Elegancki i premium', 'Nowoczesny i minimalistyczny', 'Rodzinny i przyjazny', 'Naturalny (zieleń, drewno, światło)', 'Zdecydowany i odważny'], inne: true },
        { id: 'uczucie', typ: 'dlugi', etykieta: 'Jak ma się czuć osoba, która wchodzi na stronę? Opisz własnymi słowami', pod: 'Np. „że jest w dobrych rękach”, „że to nowoczesne miejsce, ale bez sztywności”.', k: true, wiersze: 3 },
        { id: 'motyw', typ: 'wybor', etykieta: 'Jasny czy ciemny motyw?', opcje: ['Jasny', 'Ciemny', 'Jasny z ciemnymi akcentami', 'Bez preferencji'] },
        { id: 'kolory_marki', typ: 'wybor', etykieta: 'Czy macie kolory marki?', k: true, opcje: ['Tak, mamy ustalone kolory', 'Mamy logo, ale kolory można dobrać', 'Nie, dobierzcie je Wy'] },
        { id: 'kolor_glowny', typ: 'kolor', etykieta: 'Kolor główny marki (jeśli jest)' },
        { id: 'kolor_dodatkowy', typ: 'kolor', etykieta: 'Kolor dodatkowy (jeśli jest)' },
        { id: 'kolory_lubicie', typ: 'dlugi', etykieta: 'Kolory, które lubicie', pod: 'Nazwy albo kody, np. „głęboka zieleń”, „piaskowy beż”, #1F5FD6.', wiersze: 2 },
        { id: 'kolory_nie', typ: 'dlugi', etykieta: 'Kolory, których nie chcecie', wiersze: 2 },
        { id: 'logo_stan', typ: 'wybor', etykieta: 'Logo', k: true, opcje: ['Mamy gotowe logo', 'Mamy logo, ale chcemy je odświeżyć', 'Nie mamy logo'] },
        { id: 'logo', typ: 'plik', etykieta: 'Pliki logo', pod: 'Najlepiej SVG lub PNG z przezroczystym tłem, PDF też może być. Dołącz też księgę znaku, jeśli jest.', wiele: true, maks: 6, akceptuj: 'image/*,.pdf,.zip', k: true },
        { id: 'czcionka', typ: 'wybor', etykieta: 'Jakie litery do Was pasują?', opcje: ['Proste, nowoczesne (bezszeryfowe)', 'Eleganckie, klasyczne (szeryfowe)', 'Mieszanka', 'Bez preferencji'] },
        { id: 'czcionki_marki', typ: 'tekst', etykieta: 'Czcionki, których już używacie (jeśli są)' },
        { id: 'zdjecia_zrodlo', typ: 'wybor', etykieta: 'Skąd będą zdjęcia na stronie?', k: true, opcje: ['Prześlemy własne zdjęcia', 'Potrzebujemy sesji zdjęciowej', 'Zdjęcia stockowe wystarczą', 'Część własne, część stockowe'] },
        { id: 'zdjecia_styl', typ: 'wiele', etykieta: 'Jaki styl zdjęć Wam odpowiada?', opcje: ['Prawdziwi ludzie i prawdziwy gabinet', 'Zbliżenia terapii i dłoni', 'Jasne, naturalne światło', 'Wyraziste, kolorowe', 'Czarno-białe', 'Sportowe, w ruchu'] },
        { id: 'zdjecia_wlasne', typ: 'plik', etykieta: 'Wasze zdjęcia: gabinet, zespół, sprzęt, wnętrza', pod: 'Wrzuć, co masz, nawet jeśli nie jesteś pewien jakości. Ocenimy i dobierzemy.', wiele: true, maks: 30, akceptuj: 'image/*' },
        { id: 'inspiracje_strony', typ: 'linki', etykieta: 'Strony, które Wam się podobają', pod: 'Adres i jedno zdanie, co dokładnie: kolory, układ, zdjęcia, nastrój. Mogą być z innych branż.', k: true, opcjaKomentarza: true, maks: 8 },
        { id: 'inspiracje_nie', typ: 'linki', etykieta: 'Strony, które Wam się NIE podobają', pod: 'Co Wam przeszkadza? To pomaga uniknąć błędów.', opcjaKomentarza: true, maks: 5 },
        { id: 'inspiracje_obrazy', typ: 'plik', etykieta: 'Inspiracje obrazkowe: zrzuty ekranu, zdjęcia, moodboard', pod: 'Wszystko, co pokazuje, jak ma wyglądać i jaki ma być nastrój. Linki do Pinteresta lub Instagrama wpisz poniżej.', wiele: true, maks: 20, akceptuj: 'image/*,.pdf' },
        { id: 'inspiracje_linki', typ: 'dlugi', etykieta: 'Linki do tablic, profili i kolekcji z inspiracjami', wiersze: 2 },
        { id: 'elementy', typ: 'wiele', etykieta: 'Co ma być na stronie?', opcje: ['Duże zdjęcia', 'Krótkie wideo w tle', 'Subtelne animacje', 'Ikony i proste ilustracje', 'Dużo białej przestrzeni', 'Zdjęcia zespołu na wierzchu'] },
        { id: 'materialy_marki', typ: 'plik', etykieta: 'Istniejące materiały marki: wizytówki, ulotki, szyld, prezentacje', wiele: true, maks: 12, akceptuj: 'image/*,.pdf' },
        { id: 'unikac', typ: 'dlugi', etykieta: 'Czego na pewno unikać w projekcie?', wiersze: 3 },
      ],
    },
    {
      id: 'teksty', tytul: 'Teksty i opinie', czas: '5 min',
      po_co: 'Ustalamy, kto pisze teksty, w jakim tonie i jakie frazy mają przyprowadzać pacjentów z Google.',
      pola: [
        { id: 'kto_pisze', typ: 'wybor', etykieta: 'Kto pisze teksty na stronę?', k: true, opcje: ['Piszecie Wy, na podstawie tego formularza', 'Piszecie Wy, uzupełnimy własnymi tekstami', 'Mamy gotowe teksty'] },
        { id: 'ton', typ: 'wybor', etykieta: 'W jakim tonie mają być teksty?', k: true, opcje: ['Ciepły i prosty, jak do znajomego', 'Spokojny i rzeczowy', 'Ekspercki, z fachowym językiem', 'Energiczny i motywujący'] },
        { id: 'forma', typ: 'wybor', etykieta: 'Jak zwracamy się do pacjenta?', opcje: ['Na „Ty”', 'Na „Państwo” / „Pan” / „Pani”', 'Bez zwrotów do pacjenta'] },
        { id: 'teksty_wlasne', typ: 'plik', etykieta: 'Własne teksty, jeśli są', wiele: true, maks: 10, akceptuj: '.doc,.docx,.pdf,.txt' },
        { id: 'frazy', typ: 'dlugi', etykieta: 'Na jakie hasła chcecie być znalezieni w Google?', pod: 'Np. „fizjoterapeuta Kraków Podgórze”, „rwa kulszowa leczenie”. Jeśli nie wiesz, zostaw puste, zaproponujemy.', wiersze: 3 },
        { id: 'obszar', typ: 'tekst', etykieta: 'Z jakich miast i dzielnic przychodzą pacjenci?' },
        { id: 'opinie', typ: 'dlugi', etykieta: 'Opinie pacjentów, które możemy pokazać', pod: 'Wklej treść i imię (lub inicjały). Potwierdzasz, że pacjent zgodził się na publikację.', wiersze: 5 },
        { id: 'osiagniecia', typ: 'dlugi', etykieta: 'Nagrody, publikacje, wystąpienia, wzmianki w mediach', wiersze: 3 },
        { id: 'certyfikaty_pliki', typ: 'plik', etykieta: 'Skany certyfikatów, dyplomów i nagród', wiele: true, maks: 12, akceptuj: 'image/*,.pdf' },
      ],
    },
    {
      id: 'rezerwacja', tytul: 'Rezerwacja i zasady', czas: '5 min',
      po_co: 'Ustawienia systemu rezerwacji: jak daleko i jak wcześnie pacjent może się umówić oraz co się dzieje przy odwołaniu.',
      pola: [
        { id: 'wyprzedzenie', typ: 'wybor', etykieta: 'Najwcześniejszy termin, na jaki pacjent może się umówić', opcje: ['Od razu', 'Za 2 godziny', 'Za 12 godzin', 'Od następnego dnia', 'Za 2 dni'] },
        { id: 'horyzont', typ: 'wybor', etykieta: 'Jak daleko do przodu można rezerwować?', opcje: ['2 tygodnie', '30 dni', '60 dni', '90 dni'] },
        { id: 'potwierdzanie', typ: 'wybor', etykieta: 'Potwierdzanie rezerwacji', k: true, opcje: ['Automatyczne (od razu po rezerwacji)', 'Ręczne (potwierdzacie każdą)'] },
        { id: 'odwolanie', typ: 'wybor', etykieta: 'Do kiedy pacjent może sam zmienić albo odwołać wizytę?', opcje: ['2 godziny przed', '12 godzin przed', 'Dzień przed (24 h)', '2 dni przed (48 h)'] },
        { id: 'zaliczki', typ: 'wybor', etykieta: 'Zaliczki online przy rezerwacji', opcje: ['Nie chcemy', 'Tak, dla wybranych usług', 'Tak, dla pierwszej wizyty'] },
        { id: 'zaliczka_kwota', typ: 'tekst', etykieta: 'Kwota zaliczki i zasady zwrotu', pod: 'Np. „50 zł, zwrot przy odwołaniu do 24 h”.' },
        { id: 'wybor_terapeuty', typ: 'wybor', etykieta: 'Czy pacjent wybiera terapeutę?', opcje: ['Tak, wybiera osobę', 'Tak, albo „pierwszy wolny termin”', 'Nie, przydzielamy sami', 'Nie dotyczy (jedna osoba)'] },
        { id: 'kalendarz', typ: 'wybor', etykieta: 'Gdzie ma być kalendarz?', opcje: ['Wbudowany kalendarz dostępności', 'Mój Kalendarz Google', 'Nie wiem, doradźcie'] },
        { id: 'sms', typ: 'wybor', etykieta: 'Przypomnienia dla pacjentów', opcje: ['Tylko e-mail', 'E-mail i SMS', 'Nie wiem'] },
        { id: 'uwagi_rez', typ: 'dlugi', etykieta: 'Inne zasady, o których pacjent ma wiedzieć', pod: 'Spóźnienia, odwołania w ostatniej chwili, wizyty dla dzieci, osoby towarzyszące.', wiersze: 3 },
      ],
    },
    {
      id: 'techniczne', tytul: 'Domena, strona i dostępy', czas: '5 min',
      po_co: 'Ustalamy, co przenosimy, jaką domenę podpinamy i jakie dostępy będą potrzebne. Haseł nie podawaj tutaj, o dostępy poprosimy osobno.',
      pola: [
        { id: 'domena_stan', typ: 'wybor', etykieta: 'Domena', k: true, opcje: ['Mamy domenę, zostaje', 'Mamy domenę, ale chcemy nową', 'Nie mamy domeny'] },
        { id: 'domena_adres', typ: 'tekst', etykieta: 'Adres obecnej domeny i gdzie jest wykupiona' },
        { id: 'domena_nowa', typ: 'dlugi', etykieta: 'Propozycje nowej domeny (od najważniejszej)', pod: 'Sprawdzimy dostępność.', wiersze: 2 },
        { id: 'strona_obecna', typ: 'tekst', etykieta: 'Adres obecnej strony (jeśli jest)' },
        { id: 'strona_zachowac', typ: 'dlugi', etykieta: 'Co ze starej strony ma zostać?', pod: 'Teksty, zdjęcia, adresy podstron ważne dla Google.', wiersze: 3 },
        { id: 'poczta', typ: 'wybor', etykieta: 'Poczta w Waszej domenie', opcje: ['Mamy, działa', 'Chcemy założyć', 'Nie potrzebujemy'] },
        { id: 'analityka', typ: 'wybor', etykieta: 'Statystyki odwiedzin', opcje: ['Chcemy statystyki bez banera cookies', 'Mamy Google Analytics i chcemy zostać przy nim', 'Nie potrzebujemy'] },
        { id: 'inne_systemy', typ: 'dlugi', etykieta: 'Inne narzędzia, z którymi strona ma współpracować', pod: 'Program do prowadzenia dokumentacji, kalendarz, newsletter.', wiersze: 2 },
      ],
    },
    {
      id: 'prawne', tytul: 'Dane prawne', czas: '4 min',
      po_co: 'Polityka prywatności, regulamin rezerwacji i stopka wymagają danych podmiotu i kilku oświadczeń.',
      pola: [
        { id: 'podmiot', typ: 'tekst', etykieta: 'Pełna nazwa podmiotu prowadzącego gabinet', k: true },
        { id: 'adres_siedziby', typ: 'tekst', etykieta: 'Adres siedziby', k: true },
        { id: 'nip_regon', typ: 'tekst', etykieta: 'NIP i REGON', k: true },
        { id: 'rejestr', typ: 'tekst', etykieta: 'Numer wpisu do rejestru podmiotów wykonujących działalność leczniczą (lub prawo wykonywania zawodu)', pod: 'Jeśli Was dotyczy. Pokażemy go w stopce.', k: true },
        { id: 'rodo_kontakt', typ: 'tekst', etykieta: 'Adres e-mail do spraw danych osobowych', pod: 'Tu pacjent może poprosić o wgląd w swoje dane.', k: true },
        { id: 'iod', typ: 'taknie', etykieta: 'Czy macie inspektora ochrony danych?' },
        { id: 'ubezpieczenie', typ: 'tekst', etykieta: 'Ubezpieczenie OC (informacja do stopki, opcjonalnie)' },
        { id: 'zgoda_prawa', typ: 'taknie', etykieta: 'Potwierdzam, że mam prawa do przesłanych materiałów (teksty, zdjęcia, logo) i zgody osób widocznych na zdjęciach na publikację wizerunku', k: true },
        { id: 'portfolio', typ: 'taknie', etykieta: 'Zgadzam się, żeby Studio Widok pokazało gotową stronę w swoim portfolio' },
      ],
    },
    {
      id: 'organizacja', tytul: 'Współpraca i terminy', czas: '2 min',
      po_co: 'Wiemy, z kim rozmawiać, kto akceptuje projekt i czy są terminy, których musimy dopilnować.',
      pola: [
        { id: 'kontakt_imie', typ: 'tekst', etykieta: 'Osoba do kontaktu w sprawie strony', k: true },
        { id: 'kontakt_tel', typ: 'tekst', etykieta: 'Telefon i e-mail tej osoby', k: true },
        { id: 'kontakt_godziny', typ: 'tekst', etykieta: 'Kiedy najlepiej się z nią kontaktować?' },
        { id: 'akceptuje', typ: 'tekst', etykieta: 'Kto akceptuje projekt (jeśli to inna osoba)' },
        { id: 'terminy', typ: 'dlugi', etykieta: 'Ważne terminy', pod: 'Otwarcie nowego miejsca, kampania, wakacje zespołu, kiedy strona ma ruszyć.', wiersze: 3 },
        { id: 'uwagi', typ: 'dlugi', etykieta: 'Cokolwiek jeszcze powinniśmy wiedzieć', wiersze: 4 },
      ],
    },
  ];

  /* ── Odpowiedzi i kompletność ───────────────────────────────────────── */
  function niepuste(pole, w, pliki, sciezka) {
    if (pole.typ === 'plik') return (pliki || []).some((p) => p.pole === sciezka);
    if (w == null) return false;
    if (Array.isArray(w)) return w.some((x) => (x && typeof x === 'object' ? Object.keys(x).some((k) => k !== '_id' && String(x[k]).trim()) : String(x).trim()));
    if (typeof w === 'object') return Object.keys(w).some((k) => String(w[k] == null ? '' : w[k]).trim());
    return String(w).trim() !== '';
  }
  function sciezkaPliku(sekcja, pole, item) { return item ? `${sekcja}.${pole}.${item}` : `${sekcja}.${pole}`; }

  /** Dla jednej sekcji: ile pól kluczowych jest wypełnionych i czego brakuje. Sekcja „pominięta” nie liczy się do braków. */
  function postepSekcji(sekcja, dane, pliki) {
    dane = dane || {};
    var kluczowe = 0, ok = 0, brakuje = [], odpowiedzi = 0;
    sekcja.pola.forEach(function (p) {
      var w = dane[p.id];
      if (p.typ === 'lista') {
        var karty = Array.isArray(w) ? w : [];
        if (karty.some(function (x) { return Object.keys(x).some(function (k) { return k !== '_id' && String(x[k]).trim(); }); })) odpowiedzi += 1;
        if (p.k) {
          kluczowe += 1;
          if (karty.length >= (p.min || 1)) ok += 1; else brakuje.push(p.etykieta);
        }
        karty.forEach(function (x, i) {
          p.pola.forEach(function (pp) {
            var wart = niepuste(pp, x[pp.id], pliki, sciezkaPliku(sekcja.id, p.id + '.' + (x._id || i), pp.id));
            if (pp.k) { kluczowe += 1; if (wart) ok += 1; else brakuje.push(p.etykieta + ' ' + (i + 1) + ': ' + pp.etykieta); }
          });
        });
        return;
      }
      var wypelnione = niepuste(p, w, pliki, sciezkaPliku(sekcja.id, p.id));
      if (wypelnione) odpowiedzi += 1;
      if (p.k) { kluczowe += 1; if (wypelnione) ok += 1; else brakuje.push(p.etykieta); }
    });
    var pominieta = !!dane._pomin;
    var stan = pominieta ? 'pominieta' : odpowiedzi === 0 ? 'puste' : (brakuje.length ? 'w_trakcie' : 'gotowe');
    return { id: sekcja.id, kluczowe: kluczowe, ok: ok, brakuje: brakuje, odpowiedzi: odpowiedzi, stan: stan, pominieta: pominieta };
  }
  /** Całość: procent kluczowych pól, lista braków i stan każdej sekcji. */
  function postep(sekcje, pliki) {
    var lista = SEKCJE.map(function (s) { return postepSekcji(s, (sekcje || {})[s.id], pliki); });
    var k = lista.reduce(function (a, x) { return a + x.kluczowe; }, 0);
    var ok = lista.reduce(function (a, x) { return a + x.ok; }, 0);
    return { sekcje: lista, procent: k ? Math.round((ok / k) * 100) : 0, kluczowe: k, ok: ok, braki: lista.filter(function (x) { return !x.pominieta; }).reduce(function (a, x) { return a.concat(x.brakuje.map(function (b) { return { sekcja: x.id, pole: b }; })); }, []) };
  }

  var API = { wersja: 1, sekcje: SEKCJE, postep: postep, postepSekcji: postepSekcji, sciezkaPliku: sciezkaPliku, TAKNIE: TAKNIE };
  korzen.START_SCHEMAT = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
