/* Konfigurator strony i umowy: treść umowy i walidacje z artefaktu, krok „Twoja strona” przed umową.
   Z linku z CRM (?d=...) startuje od wskazanego kroku, z ustawionym pakietem i dodatkami. */
  (function () {
    'use strict';
    var root = document.getElementById('konf');
    if (!root) return;

    /* KONFIGURACJA. Uzupełnij przed pierwszym użyciem. Puste pola pokazują się w umowie jako żółte „do uzupełnienia”. */
    var KONF = {
      zatwierdzona: false, /* true dopiero po przeglądzie wzoru przez prawnika: wtedy znika znak PROJEKT */
      wersja: 'SW-2026-10-v3',
      wykonawca: { nazwa: '', nip: '', adres: '' },
      email: 'kontakt@studio-widok.pl',
      telefon: '783 480 341',
      sad: '',
      hosting: '', sms: '', poczta: '', eog: '', srodki: ''
    };

    var PAK = {
      individual: { nazwa: 'Individual', wdr: 2900, utr: 99, terapeuci: 1, miejsca: 3, uslugi: 7, podstrony: 5 },
      enterprise: { nazwa: 'Team', wdr: 4499, utr: 149, terapeuci: 99, miejsca: 99, uslugi: 99, podstrony: 10 }
    };
    var SMS = { cena: 49, limit: 200 };
    var ZAL = { wdr: 299, utr: 29 };
    /* 99 = bez limitu w pakiecie. */
    function doLim(n) { return n >= 99 ? 'bez limitu' : 'do ' + n; }
    var OPERATORZY = { p24: 'Przelewy24', tpay: 'Tpay', stripe: 'Stripe', pomoc: 'wybranego wspólnie z Wykonawcą spośród Przelewy24, Tpay i Stripe' };
    var MIES = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
    var KROKI = ['Pakiet i dodatki', 'Treści i materiały', 'Dane firmy', 'Umowa i podpis'];
    var MAX_PLIKOW = 20;
    var KLUCZ = 'konfigurator-strony-v1';
    var PROBLEMY = ['Ból kręgosłupa', 'Rwa kulszowa', 'Ból szyi i głowy', 'Ból barku', 'Ból kolana', 'Rehabilitacja po urazie', 'Rehabilitacja po operacji', 'Fizjoterapia sportowa', 'Terapia manualna', 'Fizjoterapia dzieci', 'Fizjoterapia uroginekologiczna', 'Inna specjalizacja'];
    var STYLE = { niebieski: { nazwa: 'Spokojny niebieski', kolor: '#1f5fd6' }, zielony: { nazwa: 'Naturalny zielony', kolor: '#13875a' }, cieply: { nazwa: 'Ciepły pomarańcz', kolor: '#e8590c' }, grafit: { nazwa: 'Elegancki grafit', kolor: '#2f353a' } };

    var S = {
      lead: '', krok: 0, pakiet: 'individual', sms: false, zaliczki: false, operator: 'pomoc', w_podstrony: false, w_kalendarze: false, w_kampania: false,
      firma: '', nip: '', adres: '', osoba: '', email: '', telefon: '',
      terapeuci: '1', miejsca: '1', adresyGab: '', kalendarz: 'wbudowany', domena: '', wizytowka: '',
      nazwa: '', miasto: '', problemy: [], uslugi: '', styl: 'niebieski', nowaDomena: '', teksty: 'my', zdjecia: 'klient',
      opis: '', zespol: '', godziny: '', kontaktPubl: '', social: '', uwagi: '', pliki: [], prawaMat: false,
      tryb: 'sms', kod: '', smsStan: { etap: 'start', maska: '', blad: '', kiedy: 0, probny: false },
      zgody: { a: false, b: false, c: false, d: false, e: false }, podpis: '', numer: '', bledy: {}, wynik: null
    };

    /* ── Pomocnicze ── */
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function zl(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' zł'; }
    function dataPL(d) { return d.getDate() + ' ' + MIES[d.getMonth()] + ' ' + d.getFullYear(); }
    function czasPL(d) { return dataPL(d) + ', ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
    function luka(v) { return v ? '<strong>' + esc(v) + '</strong>' : '<span class="luka">[do uzupełnienia]</span>'; }
    function dane(v) { return '<strong>' + esc(v) + '</strong>'; }
    function md(s, v) {
      return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\{([A-Z_]+)\}/g, function (_, k) { return v[k] !== undefined ? v[k] : '{' + k + '}'; });
    }
    function ust(lista, v) {
      return lista.filter(Boolean).map(function (t, i) { return '<p class="ust"><span class="n">' + (i + 1) + '.</span><span>' + md(t, v) + '</span></p>'; }).join('');
    }
    function ceny() { var P = PAK[S.pakiet]; return { wdr: P.wdr + (S.zaliczki ? ZAL.wdr : 0), baza: P.utr, utr: P.utr + (S.sms ? SMS.cena : 0) + (S.zaliczki ? ZAL.utr : 0) }; }
    function nipOk(n) {
      var c = String(n).replace(/[\s-]/g, '');
      if (!/^\d{10}$/.test(c)) return false;
      var w = [6, 5, 7, 2, 3, 4, 5, 6, 7], s = 0, i;
      for (i = 0; i < 9; i++) s += w[i] * Number(c[i]);
      return s % 11 === Number(c[9]);
    }
    function telOk(t) { var c = String(t).replace(/[\s-]/g, '').replace(/^(\+48|0048)/, ''); return /^[1-9]\d{8}$/.test(c); }
    function mailOk(m) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(m); }
    function norm(s) { return String(s).trim().replace(/\s+/g, ' ').toLowerCase(); }
    function sha256(tekst) {
      var enc = new TextEncoder().encode(tekst);
      if (window.crypto && window.crypto.subtle) {
        return window.crypto.subtle.digest('SHA-256', enc).then(function (b) {
          return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
        });
      }
      var h = 2166136261;
      for (var i = 0; i < enc.length; i++) { h ^= enc[i]; h = Math.imul(h, 16777619); }
      return Promise.resolve('fnv-' + ('00000000' + (h >>> 0).toString(16)).slice(-8));
    }
    function limity() {
      var P = PAK[S.pakiet], t = Number(S.terapeuci), m = Number(S.miejsca), w = [];
      if (S.pakiet === 'enterprise' && t > P.terapeuci) w.push('więcej niż ' + P.terapeuci + ' terapeutów');
      if (m > P.miejsca) w.push('więcej niż ' + P.miejsca + ' miejsca przyjęć');
      return w;
    }

    /* ── Treść umowy ── */
    function zmienne(wynik) {
      var c = ceny(), W = KONF.wykonawca;
      return {
        NUMER: dane(S.numer || '—'), DATA: dane(dataPL(wynik ? wynik.czas : new Date())),
        FIRMA: dane(S.firma), NIP: dane(S.nip), ADRES: dane(S.adres), OSOBA: dane(S.osoba), EMAIL: dane(S.email), TELEFON: dane(S.telefon),
        WYK_NAZWA: luka(W.nazwa), WYK_NIP: luka(W.nip), WYK_ADRES: luka(W.adres), WYK_EMAIL: dane(KONF.email), WYK_TEL: dane(KONF.telefon),
        PAKIET: dane(PAK[S.pakiet].nazwa), CENA_WDR: dane(zl(c.wdr)), CENA_UTR: dane(zl(c.utr)),
        WDR_OPIS: S.zaliczki ? ', w tym zaliczki online: ' + zl(ZAL.wdr) : '',
        UTR_OPIS: (S.sms || S.zaliczki) ? ', w tym ' + [S.sms && 'przypomnienia SMS (' + zl(SMS.cena) + ', do ' + SMS.limit + ' wiadomości miesięcznie)', S.zaliczki && 'zaliczki online (' + zl(ZAL.utr) + ')'].filter(Boolean).join(' oraz ') : '',
        CENA_DOD: dane(dodatkiLista().length ? dodatkiLista().join('; ') + ' (wliczone w kwoty z ust. 1)' : 'nie dotyczy'),
        DODATKI: dane(dodatkiLista().length ? dodatkiLista().join('; ') : 'brak'),
        OPERATOR: dane(OPERATORY_PLACE()),
        KAL_OPIS: S.kalendarz === 'google' ? 'Kalendarza Google Zamawiającego' : 'wbudowanego kalendarza dostępności, w którym Zamawiający ustawia godziny przyjęć i przegląda rezerwacje',
        KAL_DOST: S.kalendarz === 'google' ? ' oraz udostępni swój Kalendarz Google kontu usługi Wykonawcy (z prawem edycji wydarzeń)' : '',
        SAD: luka(KONF.sad), HOSTING: luka(KONF.hosting), SMSD: luka(KONF.sms), POCZTA: luka(KONF.poczta), EOG: luka(KONF.eog), SRODKI: luka(KONF.srodki)
      };
    }
    function dodatkiLista() {
      var d = [];
      if (S.sms) d.push('przypomnienia SMS (' + zl(SMS.cena) + ' miesięcznie, do ' + SMS.limit + ' wiadomości miesięcznie)');
      if (S.zaliczki) d.push('zaliczki płatne online (' + zl(ZAL.wdr) + ' wdrożenie, ' + zl(ZAL.utr) + ' miesięcznie)');
      return d;
    }
    function OPERATORY_PLACE() { return OPERATORZY[S.operator] || OPERATORZY.pomoc; }
    function opisPakietu() {
      var wspolne = 'potwierdzenia i przypomnienia o wizytach e-mailem z linkiem do zmiany lub odwołania wizyty przez pacjenta (bez konta i bez danych zdrowotnych), wizytówka Google, podstawowe SEO, polityka prywatności, cookies i regulamin rezerwacji, domena i hosting';
      return S.pakiet === 'individual'
        ? '1 terapeuta, do 3 miejsc przyjęć, do 7 usług, do 5 podstron, ' + wspolne
        : 'terapeuci z osobnymi grafikami bez limitu, wybór terapeuty albo pierwszy wolny termin, lokalizacje bez limitu, usługi bez limitu, do 10 podstron, ' + wspolne;
    }
    function tabela(wiersze) {
      return '<table>' + wiersze.map(function (r) {
        return '<tr>' + r.cells.map(function (c, i) { return '<' + (i === 0 ? 'th' : 'td') + '>' + c + '</' + (i === 0 ? 'th' : 'td') + '>'; }).join('') + '</tr>';
      }).join('') + '</table>';
    }
    function umowaHtml(wynik) {
      var v = zmienne(wynik), P = PAK[S.pakiet];
      var wycena = [S.w_podstrony && 'dodatkowe podstrony i artykuły', S.w_kalendarze && 'integracja z zewnętrznym kalendarzem innym niż Google', S.w_kampania && 'struktura pod kampanię reklamową (osobne zlecenie)'].filter(Boolean).join(', ');
      v.OPIS_PAK = esc(opisPakietu());
      var wybor = [
        { cells: ['Pakiet', esc(P.nazwa)] },
        { cells: ['Gabinet i miasto', esc(S.nazwa) + ', ' + esc(S.miasto)] },
        { cells: ['Podstrony (problemy)', S.problemy.length ? esc(S.problemy.join(', ')) : 'do ustalenia'] },
        { cells: ['Usługi w cenniku', esc(S.uslugi.trim()).replace(/\n/g, '<br />') || 'do ustalenia'] },
        { cells: ['Styl strony', esc(STYLE[S.styl].nazwa)] },
        { cells: ['Teksty', S.teksty === 'my' ? 'pisze Wykonawca' : 'dostarcza Zamawiający'] },
        { cells: ['Zdjęcia', S.zdjecia === 'klient' ? 'dostarcza Zamawiający' : 'zdjęcia stockowe lub sesja wg ustaleń'] },
        { cells: ['Nowa domena (propozycja)', S.nowaDomena ? esc(S.nowaDomena) : 'do ustalenia'] },
        { cells: ['Terapeuci', esc(S.terapeuci)] },
        { cells: [S.pakiet === 'individual' ? 'Miejsca przyjęć' : 'Lokalizacje', esc(S.miejsca)] },
        { cells: ['Adresy gabinetów', esc(S.adresyGab).replace(/\n/g, '<br />')] },
        { cells: ['Kalendarz dostępności', S.kalendarz === 'google' ? 'Kalendarz Google' : 'Kalendarz wbudowany'] },
        { cells: ['Obecna domena', S.domena ? esc(S.domena) : 'brak'] },
        { cells: ['Wizytówka Google', S.wizytowka ? esc(S.wizytowka) : 'brak'] },
        { cells: ['Godziny przyjęć', S.godziny.trim() ? esc(S.godziny.trim()).replace(/\n/g, '<br />') : 'do ustalenia'] },
        { cells: ['Materiały przekazane przez formularz', S.pliki.filter(function (p) { return p.status === 'ok'; }).length ? esc(S.pliki.filter(function (p) { return p.status === 'ok'; }).map(function (p) { return p.nazwa; }).join(', ')) : 'brak (dosłane później)'] },
        { cells: ['Dodatki w umowie', dodatkiLista().length ? esc(dodatkiLista().join('; ')) : 'brak'] },
        { cells: ['Wycena poza umową', wycena ? esc(wycena) : 'brak'] }
      ];
      var h = '';
      if (!KONF.zatwierdzona) h += '<p class="projekt">PROJEKT. Wzór umowy jest w przeglądzie prawnym i nie ma mocy prawnej.</p>';
      h += '<h1>UMOWA O STRONĘ INTERNETOWĄ Z SYSTEMEM REZERWACJI</h1>';
      h += '<p>' + md('Umowa nr {NUMER} z dnia {DATA}.', v) + '</p>';
      h += '<p>' + md('**Wykonawca:** {WYK_NAZWA}, marka Studio Widok, NIP {WYK_NIP}, adres {WYK_ADRES}, e-mail {WYK_EMAIL}, tel. {WYK_TEL}.', v) + '</p>';
      h += '<p>' + md('**Zamawiający:** {FIRMA}, NIP {NIP}, adres {ADRES}, reprezentowany przez {OSOBA}, e-mail {EMAIL}, tel. {TELEFON}.', v) + '</p>';

      h += '<h2>§1. Co robimy</h2>' + ust([
        'Wykonawca wykona i uruchomi dla Zamawiającego stronę internetową z systemem rezerwacji online (dalej: Strona) w pakiecie {PAKIET}. Pakiet obejmuje: {OPIS_PAK}.',
        'Umowa łączy trzy elementy: wykonanie Strony (stosuje się do niego przepisy o umowie o dzieło), utrzymanie Strony i systemu rezerwacji (przepisy o zleceniu) oraz licencję na Stronę (§4).',
        'Rezerwacje trafiają do {KAL_OPIS}. System rezerwacji działa na infrastrukturze Wykonawcy.',
        S.zaliczki ? '**Zaliczki online.** Pacjent wpłaca zaliczkę przy rezerwacji przez operatora płatności ({OPERATOR}), a termin potwierdza się po zaksięgowaniu wpłaty. Środki trafiają bezpośrednio na rachunek Zamawiającego u operatora. Wykonawca ich nie przyjmuje, nie przechowuje ani nie rozlicza. Zamawiający zawiera umowę z operatorem, ponosi jego prowizje, ustala kwotę zaliczki i zasady zwrotu oraz odpowiada za zwroty i rozliczenia z pacjentami.' : null,
        'Dodatki objęte umową: {DODATKI}. Reklamy Google i Meta oraz inne usługi są osobnymi zleceniami.',
        '**Poza zakresem:** dokumentacja medyczna, rozliczenia i faktury, NFZ, kasa fiskalna, gwarancje pozycji w Google.',
        'Zamawiający oświadcza, że zawiera umowę w związku z prowadzoną działalnością gospodarczą lub zawodową i że ma ona dla niego charakter zawodowy.'
      ], v);

      h += '<h2>§2. Wdrożenie</h2>' + ust([
        'Strona powstaje orientacyjnie w **około 14 dni** od dnia, w którym Wykonawca ma komplet materiałów, dostępów i akceptacji od Zamawiającego. Komplet to elementy z tabeli „Wybrane przez Zamawiającego” oraz materiały przekazane przez formularz lub e-mail. Terminy nie są sztywne.',
        'Zamawiający dostarczy godziny przyjęć, usługi i cennik, dane zespołu, zdjęcia oraz dostęp do domeny i wizytówki Google{KAL_DOST}. Zajmie mu to ok. 2–3 godzin.',
        'Wykonawca pisze teksty na życzenie Zamawiającego albo korzysta z jego tekstów.',
        'W cenie są **dwie tury poprawek**. Brak uwag przez 7 dni od przedstawienia materiału oznacza akceptację. Opóźnienia po stronie Zamawiającego przesuwają terminy.',
        'Zamawiający oświadcza, że ma prawa do dostarczonych materiałów (teksty, zdjęcia, logo) oraz zgody osób widocznych na zdjęciach na publikację ich wizerunku. Wykonawca może odmówić publikacji treści, które w jego ocenie naruszają prawo, w tym przepisy o reklamie działalności leczniczej, i poinformuje o tym Zamawiającego.'
      ], v);

      h += '<h2>§3. Cena i płatności</h2>' + ust([
        'Wdrożenie: {CENA_WDR}{WDR_OPIS}. Utrzymanie: {CENA_UTR} miesięcznie{UTR_OPIS}.',
        'Wykonawca korzysta ze zwolnienia podmiotowego z VAT, więc podane ceny nie zawierają doliczonego podatku. Jeśli Wykonawca utraci prawo do zwolnienia, poinformuje o tym Zamawiającego co najmniej 30 dni wcześniej, a od dnia utraty zwolnienia podane ceny są cenami netto powiększanymi o VAT. Zamawiający może wtedy zrezygnować z umowy (§6).',
        'Fakturę za wdrożenie Wykonawca wystawia **po akceptacji projektu**, z terminem płatności 7 dni. Strona zostaje uruchomiona na domenie Zamawiającego **po zapłacie**.',
        'Utrzymanie płatne jest od miesiąca następującego po uruchomieniu Strony, na podstawie faktury wystawianej z góry na początku miesiąca, z terminem płatności 7 dni.',
        'Zmiana ceny utrzymania wymaga zgody Zamawiającego. Bez zgody każda ze stron może zrezygnować z umowy (§6).',
        'Faktury są wystawiane i doręczane w formie elektronicznej zgodnie z obowiązującymi przepisami (w tym przez KSeF, jeśli jest wymagany). Zamawiający wyraża zgodę na faktury elektroniczne wysyłane na adres {EMAIL}. Za opóźnienie w płatności należą odsetki ustawowe za opóźnienie w transakcjach handlowych.'
      ], v);

      h += '<h2>§4. Prawa do Strony</h2>' + ust([
        'Prawa autorskie do projektu, kodu i treści stworzonych przez Wykonawcę **zostają przy Wykonawcy**. Od dnia zapłaty za wdrożenie Zamawiający dostaje **niewyłączną, bezterminową licencję** na korzystanie ze Strony na całym świecie, na polach eksploatacji: utrwalanie i zwielokrotnianie, publikowanie w internecie (publiczne udostępnianie w taki sposób, aby każdy miał dostęp w miejscu i czasie przez siebie wybranym), zmiany treści i przeniesienie na inny hosting oraz wprowadzanie zmian i opracowań na własny użytek. Wynagrodzenie za licencję jest zawarte w cenie wdrożenia.',
        'Licencja nie obejmuje odsprzedaży Strony ani kodu, udzielania dalszych licencji (poza firmą od hostingu lub obsługi technicznej Zamawiającego) ani używania kodu rezerwacji poza Stroną Zamawiającego. Wykonawca może używać własnych szablonów i narzędzi dla innych klientów.',
        '**Materiały Zamawiającego** (teksty, zdjęcia, logo) pozostają jego własnością. Zamawiający udziela Wykonawcy niewyłącznej, nieodpłatnej licencji na ich użycie w zakresie potrzebnym do wykonania umowy (zwielokrotnianie, kadrowanie i obróbka, publikacja na Stronie) na czas trwania umowy. Cudze licencje (zdjęcia stockowe, czcionki) obowiązują na swoich warunkach.',
        '**Domenę** kupuje Wykonawca na dane Zamawiającego. Jest ona własnością Zamawiającego, a jej koszt jest w cenie utrzymania. Wizytówka Google jest na koncie Zamawiającego.'
      ], v);

      h += '<h2>§5. Utrzymanie</h2>' + ust([
        'Utrzymanie obejmuje: hosting i certyfikat bezpieczeństwa, domenę, monitoring, naprawę błędów, aktualizacje Strony i systemu rezerwacji oraz drobne zmiany treści do **jednej godziny miesięcznie**.',
        'Wykonawca dokłada starań, żeby system działał bez przerw, ale nie gwarantuje stałej dostępności i nie odpowiada za awarie usług zewnętrznych (Google, hosting, poczta, SMS, operator płatności).',
        '**Błędy.** Zamawiający zgłasza błędy e-mailem lub telefonicznie. Wykonawca usuwa błędy Strony i systemu rezerwacji bezpłatnie przez cały czas trwania umowy i dokłada starań, żeby błąd uniemożliwiający rezerwacje usunąć w ciągu 2 dni roboczych, a pozostałe w ciągu 10 dni roboczych od zgłoszenia. W zakresie, w jakim prawo na to pozwala, strony wyłączają rękojmię, a w jej miejsce stosuje się ten ustęp.'
      ], v);

      h += '<h2>§6. Czas trwania i rezygnacja</h2>' + ust([
        'Umowa jest zawarta na **czas nieokreślony**, bez okresu minimalnego.',
        'Zamawiający może **zrezygnować w dowolnym momencie, ze skutkiem natychmiastowym**, e-mailem. **Opłacony z góry okres utrzymania nie jest zwracany**, ale system rezerwacji działa do jego końca, chyba że Zamawiający poprosi o wcześniejsze wyłączenie. Wykonawca może wypowiedzieć umowę z miesięcznym wyprzedzeniem, na koniec miesiąca kalendarzowego.',
        'W ciągu **7 dni** od zakończenia umowy Wykonawca przekazuje Zamawiającemu **pliki Strony** w formie umożliwiającej publikację na dowolnym hostingu, dostęp do domeny i wizytówki oraz eksport rezerwacji, jeśli go ma.',
        '**System rezerwacji działa na infrastrukturze Wykonawcy, więc po zakończeniu umowy przestaje działać**, dopóki Zamawiający nie skonfiguruje go sam albo nie zleci tego innej firmie. Wykonawca nie wspiera takiej konfiguracji i nie przekazuje swojej infrastruktury. Zamawiający został o tym poinformowany przed zawarciem umowy. Od zakończenia umowy hosting, aktualizacje, kopie zapasowe i opłaty za usługi zewnętrzne ponosi Zamawiający.',
        '**Brak płatności.** Jeśli faktura za utrzymanie nie zostanie zapłacona w terminie, Wykonawca w dniu terminu i po trzech dniach wyśle przypomnienie e-mailem. Jeśli zaległość nie zostanie zapłacona w ciągu **14 dni od terminu**, Wykonawca może wypowiedzieć umowę ze skutkiem natychmiastowym e-mailem, a system rezerwacji zostanie wyłączony. Pliki Strony Wykonawca przekazuje po uregulowaniu zaległości.',
        'Zamawiający może wypowiedzieć umowę ze skutkiem natychmiastowym, gdy system rezerwacji nie działa dłużej niż 14 dni z winy Wykonawcy.',
        'Wynagrodzenie za wdrożenie nie jest zwracane po uruchomieniu Strony. Przy rezygnacji przed uruchomieniem strony rozliczają się proporcjonalnie do wykonanych prac.'
      ], v);

      h += '<h2>§7. Dane osobowe</h2>' + ust([
        'Zamawiający jest **administratorem** danych osób umawiających wizyty (imię i nazwisko, telefon, e-mail, termin, opcjonalna wiadomość do gabinetu), a Wykonawca **przetwarza je w jego imieniu**, wyłącznie w celu świadczenia usług z umowy i na czas jej trwania (powierzenie, art. 28 RODO).',
        'Formularz prosi, żeby w wiadomości nie podawać danych zdrowotnych, ale mogą się tam pojawić. Zamawiający odpowiada za zgody, klauzule informacyjne i politykę prywatności na Stronie, a Wykonawca wdraża je w uzgodnionym brzmieniu. Przypomnienia trafiają tylko do osób, które się na nie zgodziły.',
        '**Zakres powierzenia.** Dane identyfikacyjne i kontaktowe pacjentów oraz informacje o terminie i rodzaju umówionej wizyty (mogą ujawniać stan zdrowia), a także dane zespołu Zamawiającego podane na Stronie. Osoby, których dane dotyczą: pacjenci i osoby kontaktujące się z gabinetem oraz zespół Zamawiającego.',
        'Wykonawca przetwarza dane wyłącznie na polecenie Zamawiającego, zapewnia poufność osób upoważnionych, stosuje zabezpieczenia: {SRODKI}, pomaga w realizacji praw osób i w obowiązkach z art. 32–36 RODO oraz zgłasza naruszenie bez zbędnej zwłoki, nie później niż w ciągu **48 godzin**. Na żądanie udostępnia informacje potrzebne do wykazania zgodności z umową, a Zamawiający może przeprowadzić audyt po uzgodnieniu terminu, nie częściej niż raz w roku.',
        'Podwykonawcy: hosting i baza {HOSTING}; SMS {SMSD}; poczta {POCZTA}; kalendarz: Google. Przekazywanie danych poza EOG: {EOG}. O zmianie podwykonawcy Wykonawca informuje z wyprzedzeniem co najmniej 14 dni, a Zamawiający może w tym czasie zgłosić uzasadniony sprzeciw. Jeśli strony nie dojdą do porozumienia, Zamawiający może zrezygnować z umowy (§6).' + (S.zaliczki ? ' Dane płatnicze pacjenta przetwarza operator płatności ({OPERATOR}) jako odrębny administrator. Wykonawca nie ma dostępu do numerów kart ani danych logowania do banku.' : ''),
        'Po zakończeniu umowy Wykonawca zwraca dane i usuwa je ze swoich systemów w ciągu **30 dni**, chyba że prawo wymaga ich przechowywania. Zamawiający może żądać informacji o spełnianiu tych obowiązków.',
        'Dane kontaktowe i dane do umowy Zamawiającego (w tym numer telefonu użyty do kodu SMS, materiały przekazane przez formularz) Wykonawca przetwarza jako administrator, żeby zawrzeć i wykonać umowę oraz wykazać jej zawarcie. Informacja o przetwarzaniu (art. 13 RODO) jest pokazana w konfiguratorze przed zawarciem umowy.'
      ], v);

      h += '<h2>§8. Odpowiedzialność i poufność</h2>' + ust([
        'Wykonawca nie gwarantuje liczby pacjentów, pozycji w wyszukiwarce ani terminu pierwszych efektów.',
        'Treści na Stronie powstają na podstawie informacji Zamawiającego, który je akceptuje i odpowiada za ich zgodność z przepisami o informacji i reklamie działalności leczniczej.',
        'Odpowiedzialność Wykonawcy jest ograniczona do rzeczywistej szkody i do **kwoty zapłaconej w ostatnich 12 miesiącach**, bez utraconych korzyści (o ile prawo na to pozwala). Nie dotyczy to szkód wyrządzonych umyślnie ani w wyniku rażącego niedbalstwa.',
        'Strony zachowują poufność informacji uzyskanych w związku z umową, a Wykonawca także danych osobowych, również po zakończeniu umowy.'
      ], v);

      var sms = S.tryb !== 'plik';
      h += '<h2>§9. Zawarcie umowy</h2>' + ust([
        sms
          ? 'Umowa jest zawarta w **formie dokumentowej**. Zamawiający akceptuje jej treść w konfiguratorze i potwierdza ją **jednorazowym kodem SMS** wysłanym na numer {TELEFON}, który wskazał w danych umowy. Umowa zostaje zawarta w chwili wpisania prawidłowego kodu, a czas zawarcia rejestruje serwer Wykonawcy. Kopia umowy trafia na adres {EMAIL}.'
          : 'Umowa jest zawarta w **formie dokumentowej**: Zamawiający akceptuje jej treść w konfiguratorze, wpisując imię i nazwisko osoby podpisującej, i wysyła wygenerowany plik e-mailem z adresu {EMAIL} na adres {WYK_EMAIL}. Umowa zaczyna obowiązywać, gdy Wykonawca potwierdzi odbiór pliku e-mailem lub SMS-em. Robi to w ciągu doby.',
        sms
          ? 'Zapis zawarcia umowy (numer, czas serwera, zanonimizowany numer telefonu, wersja wzoru i skrót SHA-256 treści umowy) jest dowodem jej treści i chwili zawarcia. Wykonawca przechowuje go w swoich systemach.'
          : 'Do pliku jest dołączony zapis akceptacji (numer umowy, data i godzina, osoba, wersja wzoru i skrót SHA-256 treści umowy) jako dowód jej treści.',
        sms
          ? 'Osoba akceptująca jest uprawniona do reprezentowania Zamawiającego oraz dysponuje numerem {TELEFON} i adresem {EMAIL}.'
          : 'Osoba akceptująca jest uprawniona do reprezentowania Zamawiającego i dysponuje adresem {EMAIL}.'
      ], v);

      var koncowe = [
        'Zmiany umowy wymagają formy dokumentowej (e-mail z potwierdzeniem). Komunikacja odbywa się na adresy e-mail z umowy, a zmianę adresu strona zgłasza drugiej niezwłocznie.',
        'Żadna ze stron nie może przenieść praw i obowiązków z umowy na inną osobę bez zgody drugiej. Wykonawca może korzystać z podwykonawców i odpowiada za nich jak za siebie.',
        'Żadna ze stron nie odpowiada za niewykonanie lub nienależyte wykonanie umowy z powodu siły wyższej (np. awarii sieci lub dostawców, działań władz), jeśli niezwłocznie poinformuje o tym drugą stronę.',
        'Jeśli któryś zapis umowy okaże się nieważny, pozostałe obowiązują.',
        S.zgody.e ? 'Zamawiający zgadza się, aby Wykonawca wskazał Stronę (nazwę gabinetu i adres Strony) jako swoją realizację. Zgodę można w każdej chwili cofnąć e-mailem.' : null,
        'Stosuje się prawo polskie. Strony najpierw próbują rozwiązać spór polubownie, a jeśli to się nie uda, rozstrzyga go sąd właściwy według przepisów ogólnych.'
      ];
      h += '<h2>§10. Postanowienia końcowe</h2>' + ust(koncowe, v);

      h += '<h2>Wybrane przez Zamawiającego</h2>' + tabela(wybor);
      return h;
    }
    function potwierdzenieHtml(w) {
      var sms = S.tryb !== 'plik';
      return '<h2>Zapis akceptacji</h2>' + ust([
        'Numer umowy: **' + esc(S.numer) + '**.',
        (sms ? 'Zawarto w konfiguratorze kodem SMS: **' : 'Zaakceptowano w konfiguratorze: **') + esc(czasPL(w.serwerCzas || w.czas)) + '**, osoba podpisująca: **' + esc(S.osoba) + '** (' + esc(S.firma) + ', NIP ' + esc(S.nip) + ')' + (sms && w.maska ? ', numer telefonu ' + esc(w.maska) : '') + '.',
        'Wersja wzoru: **' + esc(KONF.wersja) + '**. Skrót SHA-256 treści umowy (bez tego zapisu): **' + esc(w.hash) + '**.',
        sms ? 'Umowa została zawarta w chwili wpisania prawidłowego kodu SMS (§9 ust. 1).' : 'Umowa zostaje zawarta po potwierdzeniu odbioru pliku przez Wykonawcę (§9 ust. 1).'
      ], {});
    }
    var DOK_CSS = '.dok{font-family:"Segoe UI",Arial,sans-serif;font-size:10.5pt;line-height:1.5;color:#14171a;background:#fff}.dok h1{font-size:15pt;text-align:center;margin:0 0 14px;line-height:1.3}.dok h2{font-size:12pt;margin:18px 0 6px;page-break-after:avoid}.dok p{margin:0 0 6px}.dok .ust{display:flex;gap:8px}.dok .ust .n{flex:none;width:22px;font-weight:700}.dok table{width:100%;border-collapse:collapse;margin:10px 0}.dok th,.dok td{border:1px solid #bbb;padding:5px 8px;text-align:left;vertical-align:top}.dok th{background:#eef0ed}.dok .luka{background:#fff3c4}.dok .projekt{margin-bottom:12px;padding:8px 12px;background:#fdecea;color:#7a1c15;font-weight:700;text-align:center}';

    /* ── Link z CRM: ?d=<base64url(JSON)> ── */
    function odczytajToken() {
      var d = new URLSearchParams(location.search).get('d');
      if (!d) return null;
      try {
        var b = d.replace(/-/g, '+').replace(/_/g, '/');
        while (b.length % 4) b += '=';
        var j = JSON.parse(decodeURIComponent(escape(atob(b))));
        return j && j.l ? j : null;
      } catch (e) { return null; }
    }
    var TOKEN = odczytajToken();
    function zastosujToken() {
      var wybor = new URLSearchParams(location.search).get('p');
      if (!TOKEN && PAK[wybor]) {
        /* Przycisk „Wybieram …” z oferty bez linku z CRM: ustawiamy pakiet i zaczynamy od treści. */
        if (S.pakiet !== wybor) {
          S.pakiet = wybor;
          S.terapeuci = wybor === 'individual' ? '1' : (Number(S.terapeuci) > 1 ? S.terapeuci : '2'); S.miejsca = '1';
          if (S.problemy.length > PAK[wybor].podstrony) S.problemy = S.problemy.slice(0, PAK[wybor].podstrony);
        }
        S.krok = Math.max(S.krok, 1);
      }
      if (!TOKEN) return;
      var inny = S.lead !== TOKEN.l;
      if (inny) {
        /* Zapisany stan dotyczy kogoś innego (albo nikogo): zaczynamy czysto z danymi z linku. */
        S.firma = ''; S.nip = ''; S.adres = ''; S.osoba = ''; S.email = ''; S.telefon = '';
        S.problemy = []; S.uslugi = ''; S.adresyGab = ''; S.nowaDomena = ''; S.domena = ''; S.wizytowka = '';
        S.opis = ''; S.zespol = ''; S.godziny = ''; S.kontaktPubl = ''; S.social = ''; S.uwagi = ''; S.pliki = []; S.prawaMat = false;
        S.nazwa = TOKEN.g || ''; S.miasto = TOKEN.m || '';
        S.terapeuci = '1'; S.miejsca = '1';
      }
      S.lead = TOKEN.l;
      if (PAK[TOKEN.p]) S.pakiet = TOKEN.p;
      if (TOKEN.p === 'enterprise' && Number(S.terapeuci) < 2) S.terapeuci = '2';
      S.sms = !!TOKEN.s; S.zaliczki = !!TOKEN.z;
      if (!S.firma && TOKEN.g) S.firma = TOKEN.g;
      var start = TOKEN.k === 1 ? 1 : 2;
      S.krok = inny ? start : Math.max(Math.min(S.krok, 2), start === 1 ? 1 : 2);
    }
    /** Dane do odbiornika i do kodu: bez zgód, podpisu i błędów. */
    function paczka(typ) {
      var o = {}, c = ceny();
      ['pakiet', 'sms', 'zaliczki', 'operator', 'w_podstrony', 'w_kalendarze', 'w_kampania', 'firma', 'nip', 'adres', 'osoba', 'email', 'telefon', 'terapeuci', 'miejsca', 'adresyGab', 'kalendarz', 'domena', 'wizytowka', 'nazwa', 'miasto', 'problemy', 'uslugi', 'styl', 'nowaDomena', 'teksty', 'zdjecia', 'opis', 'zespol', 'godziny', 'kontaktPubl', 'social', 'uwagi'].forEach(function (k) { o[k] = S[k]; });
      o.pliki = S.pliki.filter(function (p) { return p.status === 'ok'; }).map(function (p) { return p.nazwa; });
      return {
        typ: typ, lead: S.lead, kiedy: new Date().toISOString(), konf: o, ceny: { wdr: c.wdr, utr: c.utr },
        umowa: S.wynik ? { numer: S.numer, czas: S.wynik.czas.toISOString(), hash: S.wynik.hash, wersja: KONF.wersja, osoba: S.osoba } : null
      };
    }
    function wyslij(typ) {
      if (!S.lead || !window.ODBIORNIK) return Promise.resolve(false);
      return window.ODBIORNIK.wyslij(paczka(typ));
    }

    /* ── Pomocnicze konfiguratora strony ── */
    function ascii(s) {
      var m = { 'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z' };
      return String(s).toLowerCase().replace(/[ąćęłńóśźż]/g, function (c) { return m[c]; });
    }
    function slug(s) { return ascii(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
    function liczLinie(t) { return String(t).split('\n').map(function (x) { return x.trim(); }).filter(Boolean).length; }
    function zapiszStan() {
      try {
        var kopia = JSON.parse(JSON.stringify(S));
        kopia.zgody = { a: false, b: false, c: false, d: false, e: false }; kopia.podpis = ''; kopia.wynik = null; kopia.bledy = {}; kopia.kod = ''; kopia.smsStan = { etap: 'start', maska: '', blad: '', kiedy: 0, probny: false };
        localStorage.setItem(KLUCZ, JSON.stringify(kopia));
      } catch (e) { /* bez zapisu konfigurator działa tak samo */ }
    }
    function wczytajStan() {
      try {
        var z = JSON.parse(localStorage.getItem(KLUCZ));
        if (z && z.pakiet && PAK[z.pakiet]) {
          Object.keys(z).forEach(function (k) { if (k in S && k !== 'wynik') S[k] = z[k]; });
          S.krok = Math.min(S.krok, 2);
          S.pliki = (S.pliki || []).filter(function (p) { return p && p.nazwa; }).map(function (p) { return p.status === 'ok' ? p : { id: p.id, nazwa: p.nazwa, rozmiar: p.rozmiar, status: 'blad', blad: 'Przerwano. Dodaj plik ponownie.' }; });
        }
      } catch (e) { /* pusty start */ }
    }

    /* ── Widoki kroków ── */
    function bl(k) { return S.bledy[k] ? '<p class="blad" id="e-' + k + '">' + esc(S.bledy[k]) + '</p>' : ''; }
    function pole(k, etykieta, opcje) {
      opcje = opcje || {};
      var inv = S.bledy[k] ? ' aria-invalid="true" aria-describedby="e-' + k + '"' : '';
      var typ = opcje.typ || 'text';
      var kontrolka = opcje.tekst
        ? '<textarea id="f-' + k + '" data-k="' + k + '" rows="' + (opcje.wiersze || 3) + '"' + (opcje.ph ? ' placeholder="' + esc(opcje.ph) + '"' : '') + inv + '>' + esc(S[k]) + '</textarea>'
        : '<input id="f-' + k + '" data-k="' + k + '" type="' + typ + '" value="' + esc(S[k]) + '"' + (opcje.ph ? ' placeholder="' + esc(opcje.ph) + '"' : '') + (opcje.inputmode ? ' inputmode="' + opcje.inputmode + '"' : '') + (opcje.ac ? ' autocomplete="' + opcje.ac + '"' : '') + (opcje.dis ? ' disabled' : '') + inv + ' />';
      return '<div class="kf-pole' + (opcje.pelne ? ' kf-pole--pelne' : '') + '"><label for="f-' + k + '">' + etykieta + '</label>' + kontrolka + (opcje.pod ? '<p class="pod">' + opcje.pod + '</p>' : '') + bl(k) + '</div>';
    }
    function podsumowanie() {
      var c = ceny();
      return '<div class="kf-podsum" aria-live="polite"><div><span>Wdrożenie</span> <b>' + zl(c.wdr) + '</b></div><div><span>Utrzymanie miesięcznie</span> <b>' + zl(c.utr) + '</b></div><small>Ceny końcowe: Wykonawca korzysta ze zwolnienia podmiotowego z VAT i nie dolicza go do ceny.</small></div>';
    }

    /* Krok 1: pakiet i dodatki */
    function widokPakiet() {
      var kart = Object.keys(PAK).map(function (id) {
        var P = PAK[id];
        var opis = id === 'individual' ? 'Jeden terapeuta, do 3 miejsc przyjęć, do 5 podstron' : 'Zespół i kilka lokalizacji: terapeuci i lokalizacje bez limitu, każdy z własnym grafikiem, do 10 podstron';
        return '<label class="kf-pakiet"><input type="radio" name="pakiet" data-k="pakiet" value="' + id + '"' + (S.pakiet === id ? ' checked' : '') + ' /><b>' + P.nazwa + '</b><span>' + opis + '</span><em>' + zl(P.wdr) + ' wdrożenie · ' + zl(P.utr) + ' / mies.</em></label>';
      }).join('');
      return '<h4>Wybierz pakiet</h4><div class="kf-pakiety" role="radiogroup" aria-label="Pakiet">' + kart + '</div>' +
        '<h4 class="kf-h-dod">Dodatki <em>(opcjonalnie)</em></h4>' +
        '<label class="kf-dodatek"><input type="checkbox" data-k="sms"' + (S.sms ? ' checked' : '') + ' /><span><b>Przypomnienia SMS</b> · +' + zl(SMS.cena) + ' / mies.<small>' + SMS.limit + ' wiadomości miesięcznie, oprócz przypomnienia e-mailem.</small></span></label>' +
        '<label class="kf-dodatek"><input type="checkbox" data-k="zaliczki"' + (S.zaliczki ? ' checked' : '') + ' /><span><b>Zaliczki płatne online</b> · +' + zl(ZAL.wdr) + ' wdrożenie, +' + zl(ZAL.utr) + ' / mies.<small>BLIK, karta lub przelew przy rezerwacji. Pieniądze trafiają na Twoje konto u operatora płatności, a prowizję pobiera operator.</small></span></label>' +
        (S.zaliczki ? '<div class="kf-pole" style="margin-top:12px;max-width:420px"><label for="f-operator">Operator płatności</label><select id="f-operator" data-k="operator">' + Object.keys(OPERATORZY).map(function (k) { return '<option value="' + k + '"' + (S.operator === k ? ' selected' : '') + '>' + (k === 'pomoc' ? 'Jeszcze nie wiem, doradzicie' : OPERATORZY[k]) + '</option>'; }).join('') + '</select></div>' : '') +
        '<div class="kf-wycena"><b>Chcesz wycenę czegoś jeszcze?</b> Te rzeczy wyceniamy osobno i nie wchodzą do tej umowy.<br />' +
        '<label><input type="checkbox" data-k="w_podstrony"' + (S.w_podstrony ? ' checked' : '') + ' /> dodatkowe podstrony i artykuły</label>' +
        '<label><input type="checkbox" data-k="w_kalendarze"' + (S.w_kalendarze ? ' checked' : '') + ' /> integracja z zewnętrznym kalendarzem innym niż Google</label>' +
        '<label><input type="checkbox" data-k="w_kampania"' + (S.w_kampania ? ' checked' : '') + ' /> struktura pod kampanię reklamową</label></div>' +
        '<div id="kf-podsum">' + podsumowanie() + '</div>';
    }

    /* Krok 2: konfigurator strony z podglądem na żywo */
    function podgladStrony() {
      var P = PAK[S.pakiet], st = STYLE[S.styl];
      var nazwa = S.nazwa.trim() || 'Twój gabinet';
      var miasto = S.miasto.trim() || 'Twoje miasto';
      var dom = S.nowaDomena.trim() || (S.nazwa.trim() ? slug(S.nazwa) + '.pl' : 'twoj-gabinet.pl');
      var pr = S.problemy;
      var h1 = pr.length ? esc(pr[0]) + '?' : 'Co Cię boli?';
      var nav = (pr.length ? pr.slice(0, 3) : ['Problem 1', 'Problem 2', 'Problem 3']).map(function (p) { return '<span>' + esc(p) + '</span>'; }).join('');
      var chipy = pr.slice(0, 6).map(function (p) { return '<span class="kf-pr__chip">' + esc(p) + '</span>'; }).join('') + (pr.length > 6 ? '<span class="kf-pr__chip kf-pr__chip--wiecej">+' + (pr.length - 6) + '</span>' : '');
      var uslugi = S.uslugi.split('\n').map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 3);
      var terap = S.pakiet === 'enterprise' ? 'Wybierz terapeutę lub pierwszy wolny termin' : 'Najbliższe wolne terminy';
      return '<div class="kf-pr" style="--ak:' + st.kolor + '" role="img" aria-label="Podgląd strony: ' + esc(nazwa) + ', ' + esc(miasto) + '">' +
        '<div class="kf-pr__bar"><i></i><i></i><i></i><span>' + esc(dom) + '</span></div>' +
        '<div class="kf-pr__strona"><div class="kf-pr__nav"><b>' + esc(nazwa) + '</b><div class="kf-pr__menu">' + nav + '</div><em>Umów wizytę</em></div>' +
        '<div class="kf-pr__hero"><p class="kf-pr__et">Fizjoterapia · ' + esc(miasto) + '</p><p class="kf-pr__h">' + h1 + '<span>Zacznijmy od znalezienia przyczyny.</span></p>' +
        (chipy ? '<div class="kf-pr__chipy">' + chipy + '</div>' : '') + '</div>' +
        '<div class="kf-pr__term"><p>' + terap + '</p><div><span>Jutro 9:00</span><span>Jutro 12:00</span><span>Pt 10:30</span></div></div>' +
        (uslugi.length ? '<ul class="kf-pr__cennik">' + uslugi.map(function (u) { return '<li>' + esc(u) + '</li>'; }).join('') + '</ul>' : '') +
        '</div></div>' +
        '<ul class="kf-pr__licz"><li><b>' + pr.length + ' z ' + P.podstrony + '</b> podstron</li><li><b>' + liczLinie(S.uslugi) + ' z ' + (P.uslugi >= 99 ? '∞' : P.uslugi) + '</b> usług w cenniku</li><li><b>' + (S.pakiet === 'enterprise' ? S.terapeuci : 1) + ' z ' + (P.terapeuci >= 99 ? '∞' : P.terapeuci) + '</b> terapeutów</li></ul>';
    }
    function widokStrona() {
      var ind = S.pakiet === 'individual', P = PAK[S.pakiet];
      var pelne = S.problemy.length >= P.podstrony;
      var chipy = PROBLEMY.map(function (p) {
        var on = S.problemy.indexOf(p) >= 0;
        return '<label class="kf-chip' + (on ? ' on' : '') + '"><input type="checkbox" data-p="' + esc(p) + '"' + (on ? ' checked' : '') + (!on && pelne ? ' disabled' : '') + ' /><span>' + esc(p) + '</span></label>';
      }).join('');
      var stylHtml = Object.keys(STYLE).map(function (k) {
        return '<label class="kf-styl"><input type="radio" name="styl" data-k="styl" value="' + k + '"' + (S.styl === k ? ' checked' : '') + ' /><i style="background:' + STYLE[k].kolor + '"></i><span>' + STYLE[k].nazwa + '</span></label>';
      }).join('');
      var lewa = '<div class="kf-siatka kf-siatka--jedna">' +
        pole('nazwa', 'Nazwa gabinetu', { pelne: true, ph: 'np. Linia Ruchu', ac: 'organization' }) +
        pole('miasto', 'Miasto', { ph: 'np. Kraków' }) +
        '<div class="kf-pole kf-pole--pelne"><label id="l-problemy">Na jakie problemy robić osobne podstrony? <em>(do ' + P.podstrony + ')</em></label><div class="kf-chipy" role="group" aria-labelledby="l-problemy">' + chipy + '</div>' +
        '<p class="pod" id="kf-pod-problemy">' + (pelne ? 'Limit pakietu osiągnięty. Kolejne podstrony wyceniamy osobno.' : 'Każdy problem to osobna strona, która odpowiada na to, co ktoś wpisuje w Google.') + '</p>' + bl('problemy') + '</div>' +
        pole('uslugi', 'Usługi i cennik <em>(po jednej w linii, do ' + P.uslugi + ')</em>', { pelne: true, tekst: true, wiersze: 4, ph: 'Konsultacja z terapią, 50 min, 200 zł\nTerapia manualna, 50 min, 180 zł', pod: 'Wystarczą nazwy. Ceny i czas dopiszemy razem na rozmowie startowej.' }) +
        (ind ? '' : pole('terapeuci', 'Liczba terapeutów <em>(' + doLim(P.terapeuci) + ')</em>', { typ: 'number', inputmode: 'numeric' })) +
        pole('miejsca', ind ? 'Miejsca przyjęć <em>(' + doLim(P.miejsca) + ')</em>' : 'Lokalizacje <em>(' + doLim(P.miejsca) + ')</em>', { typ: 'number', inputmode: 'numeric' }) +
        pole('adresyGab', 'Adres gabinetu <em>(każdy w osobnej linii)</em>', { pelne: true, tekst: true }) +
        '<div class="kf-pole kf-pole--pelne"><label id="l-styl">Styl strony</label><div class="kf-style" role="radiogroup" aria-labelledby="l-styl">' + stylHtml + '</div></div>' +
        '<div class="kf-pole kf-pole--pelne"><label>Kalendarz dostępności</label><div class="kf-radia" role="radiogroup" aria-label="Kalendarz dostępności">' +
        '<label><input type="radio" name="kalendarz" data-k="kalendarz" value="wbudowany"' + (S.kalendarz === 'wbudowany' ? ' checked' : '') + ' /> Wbudowany kalendarz (zalecany)</label>' +
        '<label><input type="radio" name="kalendarz" data-k="kalendarz" value="google"' + (S.kalendarz === 'google' ? ' checked' : '') + ' /> Mój Kalendarz Google</label></div></div>' +
        '<div class="kf-pole kf-pole--pelne"><label>Teksty na stronie</label><div class="kf-radia" role="radiogroup" aria-label="Teksty">' +
        '<label><input type="radio" name="teksty" data-k="teksty" value="my"' + (S.teksty === 'my' ? ' checked' : '') + ' /> Piszecie je za mnie</label>' +
        '<label><input type="radio" name="teksty" data-k="teksty" value="klient"' + (S.teksty === 'klient' ? ' checked' : '') + ' /> Mam własne teksty</label></div></div>' +
        '<div class="kf-pole kf-pole--pelne"><label>Zdjęcia</label><div class="kf-radia" role="radiogroup" aria-label="Zdjęcia">' +
        '<label><input type="radio" name="zdjecia" data-k="zdjecia" value="klient"' + (S.zdjecia === 'klient' ? ' checked' : '') + ' /> Dostarczę własne</label>' +
        '<label><input type="radio" name="zdjecia" data-k="zdjecia" value="stock"' + (S.zdjecia === 'stock' ? ' checked' : '') + ' /> Potrzebuję zdjęć stockowych</label></div></div>' +
        pole('nowaDomena', 'Domena <em>(jeśli masz propozycję)</em>', { ph: 'np. linia-ruchu.pl', pod: 'Kupujemy ją na Twoje dane, a koszt jest w cenie utrzymania.' }) +
        pole('domena', 'Obecna domena <em>(jeśli jest)</em>', {}) +
        pole('wizytowka', 'Wizytówka Google <em>(link, jeśli jest)</em>', {}) +
        '<h5 class="kf-sekcja">Treści na stronę <em>(możesz uzupełnić później)</em></h5>' +
        pole('opis', 'O gabinecie: kilka zdań o tym, czym się wyróżniacie', { pelne: true, tekst: true, wiersze: 3, ph: 'np. Pracujemy od 2012 roku, specjalizujemy się w bólu kręgosłupa, przyjmujemy też dzieci.' }) +
        pole('zespol', 'Zespół: imię, tytuł i specjalizacja <em>(jedna osoba w linii)</em>', { pelne: true, tekst: true, wiersze: 3, ph: 'mgr Anna Nowak, fizjoterapeutka, terapia manualna' }) +
        pole('godziny', 'Godziny przyjęć', { pelne: true, tekst: true, wiersze: 3, ph: 'pon–pt 8:00–18:00, sob 9:00–13:00', pod: 'Z tego ustawimy kalendarz dostępności.' }) +
        pole('kontaktPubl', 'Telefon i e-mail, które mają być na stronie', { pelne: true, ph: 'np. 600 100 200, recepcja@gabinet.pl' }) +
        pole('social', 'Facebook, Instagram, opinie i inne linki', { pelne: true, ph: 'adresy, każdy po przecinku' }) +
        pole('uwagi', 'Coś jeszcze, co powinniśmy wiedzieć?', { pelne: true, tekst: true, wiersze: 3 }) +
        '<h5 class="kf-sekcja">Materiały <em>(logo, zdjęcia, cennik, własne teksty)</em></h5>' + blokPlikow() +
        '</div><div id="kf-limit"></div>';
      return '<h4>Skonfiguruj swoją stronę</h4><div class="kf-strona"><div class="kf-strona__form">' + lewa + '</div><aside class="kf-strona__pod" aria-label="Podgląd na żywo"><p class="kf-pod-et">Podgląd na żywo</p><div id="kf-podglad-strony">' + podgladStrony() + '</div><div id="kf-podsum">' + podsumowanie() + '</div></aside></div>';
    }
    /* ── Pliki od klienta ── */
    function rozmiarTekst(b) { return b >= 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }
    var OPIS_STATUSU = { wysyla: 'wysyłanie…', ok: 'wysłany', blad: 'nie udało się' };
    function listaPlikow() {
      return S.pliki.map(function (p) {
        return '<li class="kf-plik kf-plik--' + p.status + '"><span class="kf-plik__n">' + esc(p.nazwa) + '</span><small>' + rozmiarTekst(p.rozmiar || 0) + ' · ' + (p.status === 'blad' && p.blad ? esc(p.blad) : OPIS_STATUSU[p.status]) + '</small></li>';
      }).join('');
    }
    function blokPlikow() {
      return '<div class="kf-pole kf-pole--pelne" id="kf-materialy">' +
        '<label class="kf-drop" id="kf-drop" for="f-pliki"><b>Dodaj pliki</b><span>Przeciągnij tutaj albo wybierz z telefonu lub komputera: logo, zdjęcia gabinetu i zespołu, cennik, własne teksty (zdjęcia, PDF, Word, Excel; do 8 MB każdy, do ' + MAX_PLIKOW + ' plików).</span><input id="f-pliki" type="file" multiple accept="image/jpeg,image/png,image/webp,.pdf,.doc,.docx,.xls,.xlsx,.txt" data-pliki /></label>' +
        '<ul class="kf-pliki" id="kf-lista-plikow" aria-live="polite">' + listaPlikow() + '</ul>' +
        '<p class="pod">Nie masz teraz wszystkiego pod ręką? To nie szkodzi, resztę dosłać można później e-mailem. Pomyłkowo wysłany plik zgłoś w uwagach, usuniemy go.</p>' +
        '<label class="kf-prawa"><input type="checkbox" data-k="prawaMat"' + (S.prawaMat ? ' checked' : '') + ' /><span>Mam prawa do tych materiałów i zgody osób widocznych na zdjęciach na publikację wizerunku.</span></label>' + bl('pliki') + bl('prawaMat') + '</div>';
    }
    function odswiezPliki() {
      var u = document.getElementById('kf-lista-plikow');
      if (u) u.innerHTML = listaPlikow();
    }
    function ensureLead() {
      if (!S.lead) { S.lead = 'web-' + Math.random().toString(36).slice(2, 10); zapiszStan(); }
      return S.lead;
    }
    var kolejkaPlikow = Promise.resolve();
    var BLEDY_PLIKU = { typ: 'ten typ pliku nie jest obsługiwany', rozmiar: 'plik jest większy niż 8 MB', obraz: 'nie udało się odczytać zdjęcia', limit: 'osiągnięto limit plików', limit_dzienny: 'dziś nie możemy przyjąć więcej plików', siec: 'brak połączenia, spróbuj ponownie', dane: 'plik jest uszkodzony' };
    function dodajPliki(lista) {
      var pliki = Array.prototype.slice.call(lista || []);
      pliki.forEach(function (plik) {
        var w = { id: 'p' + Date.now() + Math.random().toString(36).slice(2, 6), nazwa: plik.name, rozmiar: plik.size, status: 'wysyla', blad: '' };
        if (S.pliki.length >= MAX_PLIKOW) { w.status = 'blad'; w.blad = 'osiągnięto limit ' + MAX_PLIKOW + ' plików'; S.pliki.push(w); return; }
        S.pliki.push(w);
        kolejkaPlikow = kolejkaPlikow.then(function () {
          return window.ODBIORNIK.przygotujPlik(plik).then(function (p) {
            w.nazwa = p.nazwa; w.rozmiar = p.rozmiar;
            return window.ODBIORNIK.zapytaj({ typ: 'plik', lead: ensureLead(), nazwa: S.nazwa || S.firma, kiedy: new Date().toISOString(), plik: { nazwa: p.nazwa, mime: p.mime, b64: p.b64 } });
          }).then(function (r) {
            if (r && r.ok) { w.status = 'ok'; } else { w.status = 'blad'; w.blad = BLEDY_PLIKU[r && r.blad] || 'spróbuj ponownie'; }
          }, function (e) {
            w.status = 'blad'; w.blad = BLEDY_PLIKU[e && e.kod] || 'spróbuj ponownie';
          }).then(function () { zapiszStan(); odswiezPliki(); });
        });
      });
      zapiszStan();
      odswiezPliki();
    }
    function odswiezPodglad() {
      var p = document.getElementById('kf-podglad-strony');
      if (p) p.innerHTML = podgladStrony();
    }

    /* Krok 3: dane firmy */
    function widokDane() {
      return '<h4>Dane do umowy</h4><div class="kf-siatka">' +
        pole('firma', 'Nazwa firmy lub imię i nazwisko prowadzącego', { pelne: true, ac: 'organization' }) +
        pole('nip', 'NIP', { inputmode: 'numeric', pod: 'Sprawdzimy poprawność numeru.' }) +
        pole('osoba', 'Osoba podpisująca (imię i nazwisko)', { ac: 'name' }) +
        pole('adres', 'Adres siedziby', { pelne: true, ac: 'street-address' }) +
        pole('email', 'E-mail', { typ: 'email', ac: 'email', pod: 'Z tego adresu wyślesz podpisaną umowę.' }) +
        pole('telefon', 'Telefon (komórkowy)', { typ: 'tel', ac: 'tel', inputmode: 'tel', pod: 'Na ten numer wyślemy kod SMS do podpisu umowy.' }) + '</div>' +
        '<details class="kf-rodo"><summary>Jak przetwarzamy Twoje dane</summary><p><b>Administrator:</b> Wykonawca (dane w umowie). <b>Cel:</b> zawarcie i wykonanie umowy, kontakt z Tobą oraz wykazanie, że umowa została zawarta (art. 6 ust. 1 lit. b i f RODO). <b>Odbiorcy:</b> dostawcy, z których korzystamy: Google (arkusz, Dysk i poczta, na których zapisujemy dane i pliki) oraz operator SMS (wysyłka kodu). <b>Czas:</b> na czas umowy i do czasu przedawnienia roszczeń i obowiązków podatkowych. <b>Twoje prawa:</b> dostęp, sprostowanie, usunięcie, ograniczenie, sprzeciw i skarga do Prezesa UODO. Kontakt: kontakt@studio-widok.pl.</p></details>';
    }

    /* Krok 4: umowa */
    function widokUmowa() {
      if (!S.numer) S.numer = 'SW-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
      var z = S.zgody;
      function cb(k, t) { return '<label><input type="checkbox" data-z="' + k + '"' + (z[k] ? ' checked' : '') + ' /><span>' + t + '</span></label>'; }
      return '<h4>Przeczytaj i zaakceptuj umowę</h4>' +
        '<div class="kf-podglad" tabindex="0" role="region" aria-label="Treść umowy">' + umowaHtml(null) + '</div>' +
        '<div class="kf-zgody">' +
        cb('a', 'Przeczytałem umowę i akceptuję jej treść.') +
        cb('b', 'Rozumiem, że po zakończeniu umowy system rezerwacji przestaje działać, a Wykonawca nie wspiera jego samodzielnej konfiguracji (§6 ust. 4).') +
        cb('c', 'Jestem uprawniony do reprezentowania Zamawiającego (§9 ust. 3).') +
        cb('d', 'Akceptuję powierzenie przetwarzania danych osobowych (§7).') +
        (S.bledy.zgody ? '<p class="blad">' + esc(S.bledy.zgody) + '</p>' : '') +
        '<label class="kf-opc"><input type="checkbox" data-z="e"' + (z.e ? ' checked' : '') + ' /><span><em>Opcjonalnie:</em> zgadzam się, żeby Studio Widok wskazało moją stronę jako swoją realizację (§10).</span></label></div>' +
        blokPodpisu();
    }
    function blokPodpisu() {
      var st = S.smsStan;
      if (S.tryb === 'plik') {
        return '<div class="kf-pole kf-podpis"><label for="f-podpis">Podpis: wpisz imię i nazwisko osoby podpisującej</label><input id="f-podpis" data-k="podpis" type="text" value="' + esc(S.podpis) + '"' + (S.bledy.podpis ? ' aria-invalid="true"' : '') + ' />' + (S.bledy.podpis ? '<p class="blad">' + esc(S.bledy.podpis) + '</p>' : '') +
          '<p class="pod">Umowa zostaje zawarta w formie dokumentowej: po akceptacji pobierzesz plik i wyślesz go z adresu ' + esc(S.email) + ' na ' + esc(KONF.email) + '. Umowa obowiązuje po naszym potwierdzeniu odbioru. <button type="button" class="kf-link" data-akcja="tryb-sms">Wróć do podpisu kodem SMS</button></p></div>';
      }
      var h = '<div class="kf-sms"><h5 class="kf-sekcja">Podpis kodem SMS</h5><p>Wyślemy 6-cyfrowy kod na numer <b>' + esc(S.telefon) + '</b> (z kroku „Dane firmy”). Wpisanie kodu to Twój podpis pod umową i moment jej zawarcia. Kopię dostaniesz e-mailem.</p>';
      if (st.etap === 'wyslany') {
        h += '<p class="kf-sms__info" role="status">Kod wysłany na ' + esc(st.maska) + '. Jest ważny 10 minut.' + (st.probny ? ' <b>Tryb próbny, nic nie jest wysyłane: kod to ' + window.ODBIORNIK.kodProbny + '.</b>' : '') + '</p>' +
          '<div class="kf-pole kf-kod"><label for="f-kod">Kod z SMS-a</label><input id="f-kod" data-k="kod" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]*" value="' + esc(S.kod) + '"' + (st.blad ? ' aria-invalid="true" aria-describedby="e-kod"' : '') + ' />' + (st.blad ? '<p class="blad" id="e-kod" role="alert">' + esc(st.blad) + '</p>' : '') + '</div>' +
          '<p class="kf-sms__pod"><button type="button" class="kf-link" data-akcja="sms-wyslij">Wyślij kod ponownie</button> · <button type="button" class="kf-link" data-akcja="tryb-plik">Nie dostaję SMS-a: podpiszę plikiem</button></p>';
      } else {
        if (st.blad) h += '<p class="blad" role="alert">' + esc(st.blad) + '</p>';
        h += '<p class="kf-sms__pod"><button type="button" class="kf-link" data-akcja="tryb-plik">Wolę podpisać plikiem i e-mailem</button></p>';
      }
      return h + '</div>';
    }
    function mailtoHref() {
      var c = ceny();
      var temat = 'Umowa ' + S.numer + ' (' + S.firma + ')';
      var tresc = 'Dzień dobry,\n\nw załączeniu przesyłam zaakceptowaną umowę nr ' + S.numer + ' (pakiet ' + PAK[S.pakiet].nazwa + ', wdrożenie ' + zl(c.wdr) + ', utrzymanie ' + zl(c.utr) + ' miesięcznie).\nZaakceptowano: ' + czasPL(S.wynik.czas) + '\nSkrót SHA-256: ' + S.wynik.hash + '\n\nPozdrawiam,\n' + S.osoba;
      return 'mailto:' + KONF.email + '?subject=' + encodeURIComponent(temat) + '&body=' + encodeURIComponent(tresc);
    }
    function mailtoKonfiguracja() {
      var c = ceny(), P = PAK[S.pakiet];
      var tresc = 'Dzień dobry,\n\nchcę porozmawiać o stronie z rezerwacją. Moja konfiguracja:\n\nPakiet: ' + P.nazwa + ' (wdrożenie ' + zl(c.wdr) + ', utrzymanie ' + zl(c.utr) + ' miesięcznie)\nDodatki: ' + (dodatkiLista().length ? dodatkiLista().join('; ') : 'brak') + '\nGabinet: ' + (S.nazwa || '-') + ', ' + (S.miasto || '-') + '\nPodstrony: ' + (S.problemy.join(', ') || '-') + '\nUsługi:\n' + (S.uslugi.trim() || '-') + '\nTerapeuci: ' + S.terapeuci + ', miejsca przyjęć: ' + S.miejsca + '\nAdres: ' + (S.adresyGab.trim() || '-') + '\nStyl: ' + STYLE[S.styl].nazwa + '\nKalendarz: ' + (S.kalendarz === 'google' ? 'Google' : 'wbudowany') + '\n\nKontakt: ' + (S.email || S.telefon || '-');
      return 'mailto:' + KONF.email + '?subject=' + encodeURIComponent('Konfiguracja strony: ' + (S.nazwa || 'gabinet')) + '&body=' + encodeURIComponent(tresc);
    }
    function widokWynik() {
      var w = S.wynik;
      if (w.sms) {
        return '<div class="kf-wynik"><div class="ok"><div><h4>Umowa zawarta</h4><p class="kf-lead" style="margin-top:2px">Dziękujemy! Umowa nr ' + esc(S.numer) + ' została zawarta ' + esc(czasPL(w.serwerCzas || w.czas)) + '. ' + (w.mail ? 'Kopię wysłaliśmy na ' + esc(S.email) + '.' : 'Pobierz kopię poniżej.') + '</p></div></div>' +
          (w.symulacja ? '<p class="kf-baner"><b>Tryb próbny.</b> To podgląd lokalny: nic nie zostało wysłane ani zapisane.</p>' : '') +
          '<dl class="kf-dl"><dt>Numer umowy</dt><dd>' + esc(S.numer) + '</dd><dt>Pakiet</dt><dd>' + esc(PAK[S.pakiet].nazwa) + ' · ' + zl(ceny().wdr) + ' wdrożenie · ' + zl(ceny().utr) + ' / mies.</dd><dt>Osoba podpisująca</dt><dd>' + esc(S.osoba) + '</dd><dt>Czas zawarcia</dt><dd>' + esc(czasPL(w.serwerCzas || w.czas)) + '</dd><dt>Skrót SHA-256</dt><dd>' + esc(w.hash) + '</dd></dl>' +
          '<div class="kf-pobierz" id="kf-pobierz"><button type="button" class="kf-btn" data-akcja="html">Pobierz kopię umowy</button><button type="button" class="kf-btn kf-btn--cichy" data-akcja="drukuj">Drukuj / zapisz jako PDF</button></div>' +
          '<div class="kf-info" id="kf-info" role="status"></div>' +
          '<div class="kf-nast"><b>Co dalej</b><ol><li>W ciągu doby roboczej odezwiemy się z krótką listą rzeczy do dosłania i planem wdrożenia (strona powstaje w około 14 dni od kompletu materiałów).</li><li>Czego nie dodałeś w formularzu, możesz dosłać e-mailem na <b>' + esc(KONF.email) + '</b>.</li><li>Fakturę za wdrożenie wystawimy po Twojej akceptacji projektu, a stronę uruchomimy po wpłacie.</li></ol></div></div>';
      }
      return '<div class="kf-wynik"><div class="ok"><div><h4>Umowa zaakceptowana</h4><p class="kf-lead" style="margin-top:2px">Teraz pobierz plik i wyślij go do nas. Dopiero nasze potwierdzenie zawiera umowę.</p></div></div>' +
        '<dl class="kf-dl"><dt>Numer umowy</dt><dd>' + esc(S.numer) + '</dd><dt>Pakiet</dt><dd>' + esc(PAK[S.pakiet].nazwa) + ' · ' + zl(ceny().wdr) + ' wdrożenie · ' + zl(ceny().utr) + ' / mies.</dd><dt>Osoba podpisująca</dt><dd>' + esc(S.osoba) + '</dd><dt>Czas akceptacji</dt><dd>' + esc(czasPL(w.czas)) + '</dd><dt>Skrót SHA-256</dt><dd>' + esc(w.hash) + '</dd></dl>' +
        '<div class="kf-pobierz" id="kf-pobierz"><button type="button" class="kf-btn" data-akcja="html">Pobierz umowę (plik)</button><button type="button" class="kf-btn kf-btn--cichy" data-akcja="drukuj">Drukuj / zapisz jako PDF</button><a class="kf-btn kf-btn--cichy" href="' + mailtoHref() + '">Otwórz e-mail do nas</a><button type="button" class="kf-btn kf-btn--cichy" data-akcja="kopiuj">Kopiuj podsumowanie</button>' + (S.lead ? '<button type="button" class="kf-btn kf-btn--cichy" data-akcja="kod">Kopiuj kod dla Studio Widok</button>' : '') + '</div>' +
        '<div class="kf-info" id="kf-info" role="status"></div>' +
        '<div class="kf-nast"><b>Co dalej</b><ol><li>Pobierz plik umowy (albo zapisz ją jako PDF).</li><li>Wyślij go z adresu <b>' + esc(S.email) + '</b> na <b>' + esc(KONF.email) + '</b>. Przycisk „Otwórz e-mail do nas” przygotuje wiadomość, wystarczy dołączyć plik.</li><li>Potwierdzimy odbiór e-mailem lub SMS-em w ciągu doby. Wtedy umowa zaczyna obowiązywać, a my wracamy z listą rzeczy do zebrania.</li></ol></div>' +
        '<div class="kf-przyciski"><button type="button" class="kf-btn kf-btn--cichy" data-akcja="od-nowa">Zacznij od nowa</button></div></div>';
    }

    /* ── Walidacja ── */
    function waliduj(k) {
      var e = {}, P = PAK[S.pakiet];
      if (k === 1) {
        if (S.nazwa.trim().length < 3) e.nazwa = 'Wpisz nazwę gabinetu.';
        if (S.miasto.trim().length < 2) e.miasto = 'Wpisz miasto.';
        if (!S.problemy.length) e.problemy = 'Wybierz przynajmniej jeden problem. Od niego zaczniemy podstrony.';
        var ile = liczLinie(S.uslugi);
        if (ile < 1) e.uslugi = 'Wpisz przynajmniej jedną usługę.';
        else if (ile > P.uslugi) e.uslugi = 'W pakiecie ' + P.nazwa + ' jest do ' + P.uslugi + ' usług w cenniku. Skróć listę albo zaznacz dodatkowe usługi do wyceny.';
        var t = Number(S.terapeuci), m = Number(S.miejsca);
        if (S.pakiet === 'enterprise' && (!(t >= 1) || t !== Math.floor(t))) e.terapeuci = 'Wpisz liczbę terapeutów.';
        if (!(m >= 1) || m !== Math.floor(m)) e.miejsca = 'Wpisz liczbę miejsc.';
        if (!e.terapeuci && !e.miejsca && limity().length) e.limit = 'Ta konfiguracja przekracza pakiet: ' + limity().join(', ') + '. Napisz do nas, przygotujemy wycenę indywidualną.';
        if (S.adresyGab.trim().length < 5) e.adresyGab = 'Wpisz adres gabinetu.';
        if (S.pliki.some(function (p) { return p.status === 'wysyla'; })) e.pliki = 'Poczekaj chwilę, aż pliki się wyślą.';
        if (S.pliki.some(function (p) { return p.status === 'ok'; }) && !S.prawaMat) e.prawaMat = 'Zaznacz oświadczenie o prawach do materiałów.';
      }
      if (k === 2) {
        if (S.firma.trim().length < 3) e.firma = 'Wpisz nazwę firmy albo imię i nazwisko.';
        if (!nipOk(S.nip)) e.nip = 'Sprawdź NIP: numer jest niepoprawny.';
        if (S.osoba.trim().split(/\s+/).length < 2) e.osoba = 'Wpisz imię i nazwisko.';
        if (S.adres.trim().length < 6) e.adres = 'Wpisz adres siedziby.';
        if (!mailOk(S.email.trim())) e.email = 'Wpisz poprawny adres e-mail.';
        if (!telOk(S.telefon)) e.telefon = 'Wpisz numer telefonu (9 cyfr).';
      }
      if (k === 3) {
        if (!(S.zgody.a && S.zgody.b && S.zgody.c && S.zgody.d)) e.zgody = 'Zaznacz wszystkie oświadczenia, żeby kontynuować.';
        if (S.tryb === 'plik' && norm(S.podpis) !== norm(S.osoba)) e.podpis = 'Wpisz dokładnie: ' + S.osoba;
      }
      return e;
    }

    /* ── Render ── */
    function render() {
      var st = KROKI.map(function (n, i) {
        var kl = S.wynik ? ' class="zrobione"' : (i < S.krok ? ' class="zrobione"' : '');
        return '<li' + kl + (i === S.krok && !S.wynik ? ' aria-current="step"' : '') + '><span>' + n + '</span></li>';
      }).join('');
      var cialo = S.wynik ? widokWynik() : [widokPakiet, widokStrona, widokDane, widokUmowa][S.krok]();
      var prz = '';
      if (!S.wynik) {
        var glowny = S.krok < 3
          ? '<button type="button" class="kf-btn" data-akcja="dalej">Dalej</button>'
          : S.tryb === 'plik'
            ? '<button type="button" class="kf-btn" data-akcja="podpisz">Akceptuję i zawieram umowę</button>'
            : (S.smsStan.etap === 'wyslany' ? '<button type="button" class="kf-btn" data-akcja="podpisz">Zawieram umowę</button>' : '<button type="button" class="kf-btn" data-akcja="sms-wyslij">Wyślij kod SMS</button>');
        prz = '<div class="kf-przyciski"><button type="button" class="kf-btn kf-btn--cichy" data-akcja="wstecz"' + (S.krok === 0 ? ' disabled' : '') + '>Wstecz</button>' + glowny + '</div>';
      }
      var baner = '';
      if (!KONF.zatwierdzona) baner = '<p class="kf-baner"><b>Wersja próbna.</b> Wzór umowy jest w przeglądzie prawnym, więc wygenerowany dokument ma znak PROJEKT i nie ma mocy prawnej.</p>';
      var miekki = (!S.wynik && S.krok >= 1) ? '<p class="kf-miekki">Nie jesteś jeszcze gotowy na umowę? <a href="' + mailtoKonfiguracja() + '">Wyślij nam samą konfigurację</a> albo <a href="tel:+48783480341" data-zadzwon>zadzwoń: 783 480 341</a>.</p>' : '';
      var naglowek = S.lead
        ? '<h3>Wdrożenie dla: ' + esc(S.nazwa || S.firma || 'Twojego gabinetu') + '</h3><p class="kf-lead">Cztery krótkie kroki: treści i materiały do strony, dane firmy, a na końcu umowa potwierdzana kodem SMS. Wszystko, czego nie masz teraz pod ręką, możesz dosłać później. Do niczego Cię to nie zobowiązuje, dopóki nie wpiszesz kodu z SMS-a.</p>'
        : '<h3>Rozpocznij wdrożenie</h3><p class="kf-lead">Najpierw układasz stronę swojego gabinetu i widzisz ją na żywo, dodajesz materiały, potem wpisujesz dane firmy, a na końcu potwierdzasz umowę kodem SMS. Do niczego Cię to nie zobowiązuje, dopóki nie wpiszesz kodu z SMS-a.</p>';
      root.innerHTML = naglowek + baner +
        '<ol class="kf-kroki" aria-label="Kroki">' + st + '</ol><div class="kf-cialo">' + cialo + '</div>' + prz + miekki;
      if (S.krok === 1 && !S.wynik) pokazLimit();
    }
    function pokazLimit() {
      var box = document.getElementById('kf-limit');
      if (!box) return;
      var w = limity();
      box.innerHTML = w.length ? '<p class="kf-limit">Ta konfiguracja przekracza pakiet: ' + esc(w.join(', ')) + '. Napisz do nas, przygotujemy wycenę indywidualną.</p>' : '';
    }
    function ustawKrok(n) { S.krok = n; S.bledy = {}; zapiszStan(); render(); var h = root.querySelector('.kf-kroki'); if (h && h.scrollIntoView) h.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
    function fokusBledu() {
      var el = root.querySelector('[aria-invalid="true"]') || root.querySelector('.blad');
      if (el && el.focus) el.focus();
      else if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center' });
    }

    /* ── Zdarzenia ── */
    root.addEventListener('input', function (e) {
      var k = e.target.getAttribute('data-k');
      if (!k || e.target.type === 'radio') return;
      S[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      if (k === 'terapeuci' || k === 'miejsca') pokazLimit();
      if (S.krok === 1) odswiezPodglad();
      zapiszStan();
    });
    root.addEventListener('change', function (e) {
      var t = e.target, k = t.getAttribute('data-k'), z = t.getAttribute('data-z'), p = t.getAttribute('data-p');
      if (t.hasAttribute('data-pliki')) { dodajPliki(t.files); t.value = ''; return; }
      if (z) { S.zgody[z] = t.checked; return; }
      if (p !== null) {
        var i = S.problemy.indexOf(p);
        if (t.checked && i < 0) S.problemy.push(p);
        if (!t.checked && i >= 0) S.problemy.splice(i, 1);
        zapiszStan();
        var y = window.scrollY;
        render();
        window.scrollTo(0, y);
        var nowy = root.querySelector('[data-p="' + p.replace(/"/g, '\\"') + '"]');
        if (nowy) nowy.focus({ preventScroll: true });
        return;
      }
      if (!k) return;
      if (t.type === 'radio') {
        S[k] = t.value;
        if (k === 'pakiet') {
          S.terapeuci = t.value === 'individual' ? '1' : (Number(S.terapeuci) > 1 ? S.terapeuci : '2'); S.miejsca = '1';
          var lim = PAK[t.value].podstrony; if (S.problemy.length > lim) S.problemy = S.problemy.slice(0, lim);
          document.getElementById('kf-podsum').innerHTML = podsumowanie();
        }
        if (S.krok === 1) odswiezPodglad();
      } else if (t.tagName === 'SELECT') {
        S[k] = t.value;
      } else if (t.type === 'checkbox') {
        S[k] = t.checked;
        if (k === 'sms') document.getElementById('kf-podsum').innerHTML = podsumowanie();
        if (k === 'zaliczki') render();
      }
      zapiszStan();
    });
    root.addEventListener('dragover', function (e) { var d = e.target.closest('.kf-drop'); if (d) { e.preventDefault(); d.classList.add('kf-drop--nad'); } });
    root.addEventListener('dragleave', function (e) { var d = e.target.closest('.kf-drop'); if (d) d.classList.remove('kf-drop--nad'); });
    root.addEventListener('drop', function (e) {
      var d = e.target.closest('.kf-drop');
      if (!d) return;
      e.preventDefault(); d.classList.remove('kf-drop--nad');
      if (e.dataTransfer && e.dataTransfer.files) dodajPliki(e.dataTransfer.files);
    });
    function tekstBleduSms(kod, r) {
      var m = {
        telefon: 'Ten numer nie wygląda na numer komórkowy. Wróć do kroku „Dane firmy” i popraw telefon.',
        za_szybko: 'Kod został przed chwilą wysłany. Poczekaj kilkadziesiąt sekund i spróbuj ponownie.',
        limit: 'Wysłaliśmy już kilka kodów na ten numer. Spróbuj za kilka godzin albo podpisz plikiem.',
        limit_dzienny: 'Dziś nie możemy wysłać więcej kodów. Zadzwoń do nas (783 480 341) albo podpisz plikiem.',
        wygasl: 'Kod wygasł albo został już użyty. Wyślij nowy.',
        proby: 'Zbyt wiele błędnych prób. Wyślij nowy kod.',
        kod: 'Kod się nie zgadza.' + (r && typeof r.zostalo === 'number' ? ' Zostało prób: ' + r.zostalo + '.' : '')
      };
      return m[kod] || 'Nie udało się wysłać SMS-a. Zadzwoń do nas (783 480 341) albo podpisz plikiem.';
    }
    function komunikat(tekst, blad) { var i = document.getElementById('kf-info'); if (i) { i.textContent = tekst; i.className = 'kf-info' + (blad ? ' blad' : ''); } }
    function plikBody(w) { return '<div class="dok">' + umowaHtml(w) + potwierdzenieHtml(w) + '</div>'; }
    function dokument() {
      return '<!doctype html><html lang="pl"><head><meta charset="utf-8"><title>Umowa ' + esc(S.numer) + '</title><style>body{margin:24px auto;max-width:800px;padding:0 16px}' + DOK_CSS + '@media print{body{margin:0;max-width:none}}</style></head><body>' + plikBody(S.wynik) + '</body></html>';
    }
    function pobierz() {
      try {
        var blob = new Blob([dokument()], { type: 'text/html;charset=utf-8' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'Umowa-' + S.numer + '.html';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
        komunikat('Plik pobrany. Wyślij go na ' + KONF.email + '.');
      } catch (x) { komunikat('Nie udało się pobrać pliku. Użyj „Drukuj / zapisz jako PDF”.', true); }
    }
    function drukuj() {
      var w = window.open('', '_blank');
      if (!w) { komunikat('Przeglądarka zablokowała nowe okno. Zezwól na wyskakujące okna albo pobierz plik.', true); return; }
      w.document.open(); w.document.write(dokument()); w.document.close();
      w.focus();
      setTimeout(function () { w.print(); }, 350);
      komunikat('W oknie drukowania wybierz „Zapisz jako PDF”.');
    }
    function kopiuj() {
      var c = ceny(), tekst = 'Umowa ' + S.numer + ' (' + KONF.wersja + ')\nPakiet: ' + PAK[S.pakiet].nazwa + (S.sms ? ' + przypomnienia SMS' : '') + (S.zaliczki ? ' + zaliczki online' : '') + '\nWdrożenie: ' + zl(c.wdr) + ', utrzymanie: ' + zl(c.utr) + ' miesięcznie\nGabinet: ' + S.nazwa + ', ' + S.miasto + '\nFirma: ' + S.firma + ', NIP ' + S.nip + '\nOsoba podpisująca: ' + S.osoba + '\nE-mail: ' + S.email + ', telefon: ' + S.telefon + '\nZaakceptowano: ' + czasPL(S.wynik.czas) + '\nSHA-256: ' + S.wynik.hash;
      try { navigator.clipboard.writeText(tekst).then(function () { komunikat('Skopiowano. Wklej to do e-maila razem z plikiem umowy.'); }, function () { komunikat(tekst); }); } catch (x) { komunikat(tekst); }
    }
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-akcja]');
      if (!b) return;
      var a = b.getAttribute('data-akcja');
      if (a === 'wstecz') return ustawKrok(Math.max(0, S.krok - 1));
      if (a === 'dalej') {
        var er = waliduj(S.krok);
        if (Object.keys(er).length) { S.bledy = er; render(); return fokusBledu(); }
        if (S.krok === 2) { ensureLead(); wyslij('dane'); }
        return ustawKrok(S.krok + 1);
      }
      if (a === 'tryb-plik' || a === 'tryb-sms') { S.tryb = a === 'tryb-plik' ? 'plik' : 'sms'; S.bledy = {}; S.smsStan.blad = ''; return render(); }
      if (a === 'sms-wyslij') {
        var ez = waliduj(3);
        delete ez.podpis;
        if (Object.keys(ez).length) { S.bledy = ez; render(); return fokusBledu(); }
        S.bledy = {};
        if (b.disabled) return;
        b.disabled = true;
        ensureLead();
        return window.ODBIORNIK.zapytaj({ typ: 'sms_kod', lead: S.lead, telefon: S.telefon, numer: S.numer }).then(function (r) {
          if (r && r.ok) { S.smsStan = { etap: 'wyslany', maska: r.maska || '', blad: '', kiedy: Date.now(), probny: !!r.symulacja }; S.kod = ''; }
          else { S.smsStan.blad = tekstBleduSms(r && r.blad, r); if (r && r.blad === 'za_szybko' && S.smsStan.etap === 'wyslany') S.smsStan.blad = 'Kod został przed chwilą wysłany. Poczekaj kilkadziesiąt sekund i spróbuj ponownie.'; }
          render();
          var pole = document.getElementById('f-kod');
          if (pole) pole.focus();
        });
      }
      if (a === 'podpisz') {
        var er2 = waliduj(3);
        if (Object.keys(er2).length) { S.bledy = er2; render(); return fokusBledu(); }
        var czas = new Date();
        var tmp = document.createElement('div');
        tmp.innerHTML = umowaHtml({ czas: czas });
        if (S.tryb !== 'plik') {
          if (!/^\d{6}$/.test(String(S.kod).replace(/\D/g, ''))) { S.smsStan.blad = 'Wpisz 6-cyfrowy kod z SMS-a.'; render(); return fokusBledu(); }
          if (b.disabled) return;
          b.disabled = true;
          return sha256(tmp.textContent).then(function (hash) {
            S.wynik = { czas: czas, hash: hash, sms: true };
            var dok = dokument();
            S.wynik = null;
            var konf = paczka('umowa').konf;
            return window.ODBIORNIK.zapytaj({ typ: 'sms_potwierdz', lead: ensureLead(), telefon: S.telefon, kod: String(S.kod).replace(/\D/g, ''), dok: dok, konf: konf, ceny: ceny(), umowa: { numer: S.numer, hash: hash, wersja: KONF.wersja, osoba: S.osoba } }).then(function (r) {
              if (r && r.ok) {
                S.wynik = { czas: czas, hash: hash, sms: true, serwerCzas: r.czas ? new Date(r.czas) : czas, maska: S.smsStan.maska, mail: !!r.mail, symulacja: !!r.symulacja };
                S.kod = ''; S.smsStan = { etap: 'start', maska: '', blad: '', kiedy: 0, probny: false };
                render();
                var h = root.querySelector('.kf-wynik'); if (h && h.scrollIntoView) h.scrollIntoView({ block: 'start', behavior: 'smooth' });
              } else {
                S.smsStan.blad = tekstBleduSms(r && r.blad, r);
                S.kod = '';
                if (r && (r.blad === 'wygasl' || r.blad === 'proby')) S.smsStan.etap = 'start';
                render();
                fokusBledu();
              }
            });
          });
        }
        return sha256(tmp.textContent).then(function (hash) { S.wynik = { czas: czas, hash: hash }; render(); var h = root.querySelector('.kf-wynik'); if (h && h.scrollIntoView) h.scrollIntoView({ block: 'start', behavior: 'smooth' }); if (S.lead) { wyslij('umowa').then(function (ok) { if (window.ODBIORNIK && window.ODBIORNIK.aktywny()) komunikat(ok ? 'Umowa została wysłana do Studio Widok. Plik pobierz i wyślij mailem, tak jak niżej, żeby mieć ją u siebie.' : 'Nie udało się wysłać umowy automatycznie. Skopiuj kod poniżej i wklej go w e-mailu do nas.', !ok); }); } });
      }
      if (a === 'html') return pobierz();
      if (a === 'drukuj') return drukuj();
      if (a === 'kopiuj') return kopiuj();
      if (a === 'kod') {
        var kod = window.ODBIORNIK ? window.ODBIORNIK.kod(paczka('umowa')) : '';
        try { navigator.clipboard.writeText(kod).then(function () { komunikat('Kod skopiowany. Wklej go w e-mailu do nas razem z plikiem umowy.'); }, function () { komunikat(kod); }); } catch (x) { komunikat(kod); }
        return;
      }
      if (a === 'od-nowa') { S.wynik = null; S.numer = ''; S.zgody = { a: false, b: false, c: false, d: false, e: false }; S.podpis = ''; S.kod = ''; S.smsStan = { etap: 'start', maska: '', blad: '', kiedy: 0, probny: false }; return ustawKrok(0); }
    });

    /* Kliknięcie „Zadzwoń” (jeśli wiemy, kim jest klient) dajemy znać do CRM. */
    document.addEventListener('click', function (e) {
      if (!e.target.closest('[data-zadzwon]') || !S.lead || !window.ODBIORNIK) return;
      window.ODBIORNIK.wyslij({ typ: 'zadzwon', lead: S.lead, kiedy: new Date().toISOString(), dane: { skad: 'umowa', krok: S.krok } });
    });

    /* Przyciski wyboru pakietu poza konfiguratorem (karty cen) ustawiają pakiet i prowadzą do kroku 1. */
    document.addEventListener('click', function (e) {
      var w = e.target.closest('[data-wybierz-pakiet]');
      if (!w) return;
      var id = w.getAttribute('data-wybierz-pakiet');
      if (!PAK[id]) return;
      S.pakiet = id; S.wynik = null; S.krok = 0; S.terapeuci = id === 'individual' ? '1' : (Number(S.terapeuci) > 1 ? S.terapeuci : '2');
      if (S.problemy.length > PAK[id].podstrony) S.problemy = S.problemy.slice(0, PAK[id].podstrony);
      zapiszStan(); render();
    });

    window.KONFIGURATOR = { stan: S, umowaHtml: umowaHtml, render: render };
    wczytajStan();
    zastosujToken();
    render();
    /* Raz na sesję dajemy znać, że klient otworzył umowę z linku. */
    try {
      if (TOKEN && !sessionStorage.getItem('umowa-otwarta-' + TOKEN.l)) { sessionStorage.setItem('umowa-otwarta-' + TOKEN.l, '1'); wyslij('umowa_otwarta'); }
    } catch (e) { /* bez sessionStorage nic się nie dzieje */ }
  })();
