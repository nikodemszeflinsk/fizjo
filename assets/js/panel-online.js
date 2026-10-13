/*
 * Panel — rezerwacje online: formularz i zasady, powiadomienia, płatności.
 */
(() => {
  'use strict';

  const K = window.KAL;
  const P = window.PANEL;
  const esc = P.esc;

  /* ── Formularz i zasady ─────────────────────────────────────────────── */
  const FS = { krok: 1 };
  function podgladFormularza() {
    const D = P.D();
    const C = P.C();
    const F = C.formularz;
    const U = D.ustawienia;
    const krok = FS.krok;
    const u = D.uslugi.find((x) => x.online !== false) || D.uslugi[0];
    let tresc = '';
    if (krok === 1) {
      const q = F.kwalifikator[0];
      tresc = `<p class="ps__h1" style="font-size:1.1rem">${q ? esc(q.pytanie) : 'Wybierz usługę'}</p>
        ${q ? q.odpowiedzi.map((o) => `<span class="ps-form__opcja">${esc(o.tekst)}</span>`).join('') : ''}
        <p class="ps__et" style="margin-top:6px">albo wybierz usługę</p>
        ${D.uslugi.filter((x) => x.online !== false).slice(0, 4).map((x) => `<span class="ps-form__opcja" style="display:flex;justify-content:space-between">${esc(x.nazwa)}<small>${K.dlTekst(x.min)} · ${x.cena} zł</small></span>`).join('')}`;
    } else if (krok === 2) {
      const t = K.terminyPacjenta(D, u.id, { ile: 6 });
      tresc = `<p class="ps__h1" style="font-size:1.1rem">Kiedy Ci pasuje?</p><p class="p-podp">${esc(u.nazwa)}, ${K.dlTekst(u.min)}</p>
        ${P.ent() && U.wyborTerapeuty ? `<div class="ps__chipy">${U.pierwszyWolny ? '<span>Pierwszy wolny</span>' : ''}${D.zespol.filter((x) => x.online !== false && (!x.uslugi || x.uslugi.includes(u.id))).map((x) => `<span>${esc(P.osobaNazwa(x).split(' ')[0])}</span>`).join('')}</div>` : ''}
        ${t.length ? `<div class="ps__terminy">${t.map((x) => `<span>${esc(K.wzgledna(x.data))} ${K.godz(x.od)}</span>`).join('')}</div>` : '<p class="ps__pusto">Brak wolnych terminów.</p>'}
        <p class="p-podp">Najwcześniej za ${U.wyprzedzenie ? `${U.wyprzedzenie} h` : 'chwilę'}, najdalej ${U.horyzont} dni naprzód.</p>`;
    } else if (krok === 3) {
      tresc = `<p class="ps__h1" style="font-size:1.1rem">Twoje dane</p>
        <div class="ps-form__pole"><i>Imię i nazwisko</i><span></span></div>
        <div class="ps-form__pole"><i>Telefon</i><span></span></div>
        ${F.email !== 'ukryty' ? `<div class="ps-form__pole"><i>E-mail${F.email === 'opcjonalny' ? ' (opcjonalnie)' : ''}</i><span></span></div>` : ''}
        ${F.wiadomosc ? `<div class="ps-form__pole"><i>Wiadomość do gabinetu (opcjonalnie)</i><span style="min-height:44px">${esc(F.podpowiedz)}</span></div>` : ''}
        ${F.zgodaPrzypomnienia ? '<span class="ps-form__zgoda">Chcę dostać przypomnienie o wizycie</span>' : ''}
        <span class="ps-form__zgoda">Akceptuję regulamin rezerwacji${U.zaliczki && u.zaliczka ? ' i zasady zaliczki' : ''}</span>
        <small style="color:var(--muted);font-size:0.66rem">${esc(F.klauzula)}</small>
        ${U.zaliczki && u.zaliczka ? `<span class="ps-form__opcja" style="border-color:var(--ak)">Zaliczka ${U.zaliczkaKwota} zł · BLIK, karta, przelew</span>` : ''}
        <span class="ps-form__btn">${U.zaliczki && u.zaliczka ? `Rezerwuję i płacę ${U.zaliczkaKwota} zł` : 'Rezerwuję wizytę'}</span>`;
    } else {
      tresc = `<p class="ps__h1" style="font-size:1.1rem">${U.auto ? 'Wizyta zarezerwowana' : 'Prośba wysłana'}</p><p>${esc(U.auto ? F.komunikatPo : 'Dziękujemy! Gabinet potwierdzi wizytę, zwykle w ciągu kilku godzin. Dostaniesz e-mail.')}</p>`;
    }
    return `<div class="ps ps--tel" style="--ak:${P.kolorStylu()}"><div class="ps__strona"><div class="ps__nav"><b>${esc(C.strona.nazwa)}</b><small></small><em>Umów</em></div><div class="ps-form"><div class="ps-form__kroki">${[1, 2, 3].map((k) => `<span class="${k <= krok ? 'on' : ''}"></span>`).join('')}</div>${tresc}</div></div></div>`;
  }
  P.widoki.formularz = {
    tytul: 'Formularz i zasady',
    podtytul: 'Jak pacjent rezerwuje na stronie: zasady terminów, pola formularza, zgody i pytania na start.',
    render() {
      const D = P.D();
      const C = P.C();
      const F = C.formularz;
      const U = D.ustawienia;
      const rez = (s) => `rez:ustawienia.${s}`;
      const cms = (s) => `cms:formularz.${s}`;
      return `<div class="ed" style="grid-template-columns:minmax(0,1fr) minmax(320px,360px)"><div class="ed__forma">
        ${P.karta('Zasady terminów', `<div class="p-formularz"><div class="pola2">
            ${P.wybor({ etykieta: 'Najwcześniej za', pf: rez('wyprzedzenie'), wartosc: U.wyprzedzenie, opcje: [[0, 'od razu'], [1, '1 godzinę'], [2, '2 godziny'], [4, '4 godziny'], [12, '12 godzin'], [24, '24 godziny'], [48, '2 dni']], atr: 'data-typ="liczba"', pod: 'Pacjent nie zarezerwuje bliższego terminu, więc nie zaskoczy Cię rano.' })}
            ${P.wybor({ etykieta: 'Najdalej na', pf: rez('horyzont'), wartosc: U.horyzont, opcje: [[14, '2 tygodnie'], [30, '30 dni'], [60, '60 dni'], [90, '90 dni'], [180, 'pół roku']], atr: 'data-typ="liczba"' })}
            ${P.wybor({ etykieta: 'Przerwa po wizycie', pf: rez('bufor'), wartosc: U.bufor, opcje: [[0, 'bez przerwy'], [5, '5 min'], [10, '10 min'], [15, '15 min'], [30, '30 min']], atr: 'data-typ="liczba"', pod: 'Czas na notatki i przygotowanie gabinetu.' })}
            ${P.wybor({ etykieta: 'Potwierdzanie wizyt', pf: rez('auto'), wartosc: U.auto ? '1' : '0', opcje: [['1', 'Automatyczne'], ['0', 'Ręcznie przez gabinet']], atr: 'data-typ="bool"', pod: 'Przy ręcznym wizyty czekają na Twoje „Potwierdź” na pulpicie.' })}
          </div></div>`)}
        ${P.ent() ? P.karta('Wybór terapeuty', `<div class="p-formularz">${P.przelacznik({ etykieta: 'Pacjent może wybrać terapeutę', pf: rez('wyborTerapeuty'), wartosc: U.wyborTerapeuty })}${P.przelacznik({ etykieta: 'Opcja „Pierwszy wolny termin”', pf: rez('pierwszyWolny'), wartosc: U.pierwszyWolny, pod: 'Pokazuje najbliższy termin u kogokolwiek, kto wykonuje tę usługę.' })}</div>`) : ''}
        ${P.karta('Pola formularza', `<div class="p-formularz">
            ${P.wybor({ etykieta: 'E-mail pacjenta', pf: cms('email'), wartosc: F.email, opcje: [['wymagany', 'Wymagany (wysyłamy potwierdzenie)'], ['opcjonalny', 'Opcjonalny'], ['ukryty', 'Nie pytamy (tylko telefon)']] })}
            ${P.przelacznik({ etykieta: 'Pole „Wiadomość do gabinetu”', pf: cms('wiadomosc'), wartosc: F.wiadomosc, pod: 'Opcjonalne dla pacjenta.' })}
            ${P.pole({ etykieta: 'Podpowiedź w polu wiadomości', pf: cms('podpowiedz'), wartosc: F.podpowiedz, wiersze: 2, licznik: 160, pod: 'Zostaw prośbę, żeby nie podawać danych o zdrowiu. Tak jest bezpieczniej dla obu stron.' })}
          </div>`)}
        ${P.karta('Zgody', `<div class="p-formularz">
            ${P.przelacznik({ etykieta: 'Pytaj o zgodę na przypomnienia', pf: cms('zgodaPrzypomnienia'), wartosc: F.zgodaPrzypomnienia, pod: 'Bez tej zgody pacjent nie dostanie przypomnienia SMS.' })}
            ${P.pole({ etykieta: 'Klauzula informacyjna pod formularzem', pf: cms('klauzula'), wartosc: F.klauzula, wiersze: 3, licznik: 400 })}
            <p class="p-podp">Pełną politykę prywatności i regulamin rezerwacji przygotowujemy przy wdrożeniu, a Ty je akceptujesz.</p>
          </div>`)}
        ${P.karta('Pytania na start (kwalifikator)', `<div class="ed__lista">${F.kwalifikator.map((q, i) => `<div class="ed__el">
            <div class="ed__el-g"><b>Pytanie ${i + 1}</b><button type="button" class="p-btn p-btn--ikona p-btn--cichy p-btn--maly" data-pa="fq-usun" data-i="${i}" aria-label="Usuń pytanie">${P.ikona('kosz')}</button></div>
            ${P.pole({ etykieta: 'Pytanie', pf: cms(`kwalifikator.${i}.pytanie`), wartosc: q.pytanie })}
            ${q.odpowiedzi.map((o, j) => `<div class="pola2" style="align-items:end">${P.pole({ etykieta: `Odpowiedź ${j + 1}`, pf: cms(`kwalifikator.${i}.odpowiedzi.${j}.tekst`), wartosc: o.tekst })}<div style="display:flex;gap:6px;align-items:end">${P.wybor({ etykieta: 'Prowadzi do usługi', pf: cms(`kwalifikator.${i}.odpowiedzi.${j}.usluga`), wartosc: o.usluga, opcje: D.uslugi.map((u) => [u.id, u.nazwa]) })}<button type="button" class="p-btn p-btn--ikona p-btn--cichy" data-pa="fo-usun" data-i="${i}" data-j="${j}" aria-label="Usuń odpowiedź" style="margin-bottom:4px">×</button></div></div>`).join('')}
            <button type="button" class="p-btn p-btn--maly p-btn--cichy" data-pa="fo-dodaj" data-i="${i}">${P.ikona('plus')}<span>Dodaj odpowiedź</span></button>
          </div>`).join('')}</div>
          ${F.kwalifikator.length < 3 ? `<button type="button" class="p-btn p-btn--cichy" data-pa="fq-dodaj">${P.ikona('plus')}<span>Dodaj pytanie</span></button>` : ''}`, { pod: 'Pacjent, który nie wie, co wybrać, odpowiada na pytanie i trafia do właściwej usługi.' })}
        ${P.karta('Po rezerwacji', P.pole({ etykieta: 'Komunikat po zarezerwowaniu', pf: cms('komunikatPo'), wartosc: F.komunikatPo, wiersze: 2, licznik: 200 }))}
      </div>
      <aside class="ed__podglad"><div class="ed__podglad-g"><span>Podgląd formularza</span><span class="p-filtry" role="group" aria-label="Krok">${[[1, 'Usługa'], [2, 'Termin'], [3, 'Dane'], [4, 'Gotowe']].map(([k, n]) => `<button type="button" class="p-chip p-chip--bez" data-pa="fs-krok" data-k="${k}" aria-pressed="${FS.krok === k}" style="padding:4px 10px;font-size:0.8rem">${n}</button>`).join('')}</span></div><div id="fs-podglad">${podgladFormularza()}</div></aside></div>`;
    },
    naZmiane() { const el = document.getElementById('fs-podglad'); if (el) el.innerHTML = podgladFormularza(); },
  };
  P.akcje['fs-krok'] = (b) => { FS.krok = Number(b.dataset.k); P.odswiez(); };
  P.akcje['fq-dodaj'] = () => P.zmienCms('Dodano pytanie', (C) => { C.formularz.kwalifikator.push({ id: `q${Date.now()}`, pytanie: 'Nowe pytanie', odpowiedzi: [{ tekst: 'Odpowiedź', usluga: P.D().uslugi[0].id }] }); });
  P.akcje['fq-usun'] = (b) => P.zmienCms('Usunięto pytanie', (C) => { C.formularz.kwalifikator.splice(Number(b.dataset.i), 1); });
  P.akcje['fo-dodaj'] = (b) => P.zmienCms('Dodano odpowiedź', (C) => { C.formularz.kwalifikator[Number(b.dataset.i)].odpowiedzi.push({ tekst: '', usluga: P.D().uslugi[0].id }); });
  P.akcje['fo-usun'] = (b) => P.zmienCms('Usunięto odpowiedź', (C) => { C.formularz.kwalifikator[Number(b.dataset.i)].odpowiedzi.splice(Number(b.dataset.j), 1); });

  /* ── Powiadomienia ──────────────────────────────────────────────────── */
  const PW = { id: 'potw' };
  const ZMIENNE = [['imie', 'imię pacjenta'], ['data', 'data'], ['godzina', 'godzina'], ['usluga', 'usługa'], ['adres', 'adres'], ['dojazd', 'dojazd'], ['gabinet', 'nazwa gabinetu'], ['link_odwolania', 'link do odwołania'], ['link_strony', 'link do strony'], ['telefon', 'telefon pacjenta'], ['wiadomosc', 'wiadomość pacjenta']];
  function przyklad() {
    const D = P.D();
    const r = D.rezerwacje.find((x) => K.aktywna(x) && !K.minelo(x.data, x.od)) || D.rezerwacje[0];
    const m = K.miejsce(D, r.lok);
    return { imie: r.imie.split(' ')[0], data: P.dataKrotka(r.data), godzina: K.godz(r.od), usluga: K.usluga(D, r.usluga).nazwa, adres: `${m.ulica || m.nazwa}${m.miasto ? `, ${m.miasto}` : ''}`, dojazd: m.dojazd || '', gabinet: P.C().strona.nazwa, link_odwolania: `${P.C().konto.domena}/w/4821`, link_strony: P.C().konto.domena, telefon: r.tel, wiadomosc: r.uwaga || '(brak)' };
  }
  const wstaw = (tekst, dane, znacz) => esc(tekst).replace(/\{(\w+)\}/g, (_, k) => (dane[k] !== undefined ? (znacz ? `<mark>${esc(dane[k])}</mark>` : esc(dane[k])) : `{${k}}`));
  function segmentySms(t) {
    const pl = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(t);
    const max = pl ? 70 : 160;
    const multi = pl ? 67 : 153;
    return { dl: t.length, seg: t.length <= max ? 1 : Math.ceil(t.length / multi), pl };
  }
  function podgladPowiadomienia(n) {
    const dane = przyklad();
    if (n.kanal === 'sms') {
      const tekst = n.tresc.replace(/\{(\w+)\}/g, (_, k) => (dane[k] !== undefined ? dane[k] : `{${k}}`));
      const s = segmentySms(tekst);
      return `<div class="smsy"><span class="p-podp">SMS od: ${esc(P.C().strona.nazwa.slice(0, 11))}</span><div class="smsy__b">${wstaw(n.tresc, dane, false)}</div></div>
        <p class="p-podp">${s.dl} znaków · ${s.seg} ${s.seg === 1 ? 'SMS' : 'SMS-y'} na wiadomość${s.pl ? '. Polskie znaki skracają SMS do 70 znaków, więc treść jest bez nich.' : ''}</p>`;
    }
    return `<div class="mail"><div class="mail__g"><span>Od: ${esc(P.C().strona.nazwa)} &lt;${esc(P.C().konto.email)}&gt;</span><span>Do: ${n.komu === 'gabinet' ? esc(P.C().konto.email) : 'pacjent'}</span><b>${wstaw(n.temat, dane, true)}</b></div><div class="mail__t">${wstaw(n.tresc, dane, true)}</div></div>`;
  }
  P.widoki.powiadomienia = {
    tytul: 'Powiadomienia',
    podtytul: 'E-maile i SMS-y, które wychodzą same: potwierdzenia, przypomnienia, odwołania.',
    render(arg) {
      const C = P.C();
      if (arg && C.powiadomienia.some((n) => n.id === arg)) PW.id = arg;
      P.arg = '';
      const i = Math.max(0, C.powiadomienia.findIndex((n) => n.id === PW.id));
      const n = C.powiadomienia[i];
      const smsWyl = n.kanal === 'sms' && !C.konto.dodatki.sms;
      const kiedy = (x) => (x.kiedy === 'od razu' ? 'od razu' : `${x.kiedy} h przed wizytą`);
      return `<div class="pw">
        <nav class="pw__lista" aria-label="Rodzaje powiadomień">${C.powiadomienia.map((x) => `<a class="pw__el" href="#/powiadomienia/${x.id}" ${x.id === n.id ? 'aria-current="page"' : ''}><b>${esc(x.nazwa)}</b><small>${x.komu === 'gabinet' ? 'do gabinetu' : 'do pacjenta'} · ${kiedy(x)}</small><span class="p-tag p-tag--${!x.wl || (x.kanal === 'sms' && !C.konto.dodatki.sms) ? '' : 'zielony'}">${x.kanal === 'sms' ? 'SMS' : 'e-mail'}${x.wl && !(x.kanal === 'sms' && !C.konto.dodatki.sms) ? '' : ' · wył.'}</span></a>`).join('')}</nav>
        <div class="p-stos">
          ${P.karta(esc(n.nazwa), `<div class="p-formularz">
            ${smsWyl ? `<div class="p-ostrz p-ostrz--info">${P.ikona('uwaga')}<span>Przypomnienia SMS to dodatek: 49 zł miesięcznie za 200 wiadomości. <a href="#/ustawienia/pakiet">Włącz w ustawieniach pakietu</a>.</span></div>` : ''}
            ${P.przelacznik({ etykieta: 'Wysyłaj to powiadomienie', pf: `cms:powiadomienia.${i}.wl`, wartosc: n.wl, atr: smsWyl ? 'disabled' : '', pod: n.id === 'gabinet' ? 'E-mail do gabinetu przy każdej nowej rezerwacji ze strony.' : n.kanal === 'sms' ? 'Tylko do pacjentów, którzy zgodzili się na przypomnienia.' : '' })}
            ${n.kiedy !== 'od razu' ? P.wybor({ etykieta: 'Kiedy wysłać', pf: `cms:powiadomienia.${i}.kiedy`, wartosc: n.kiedy, opcje: [['2', '2 godziny przed wizytą'], ['12', '12 godzin przed'], ['24', 'dzień przed (24 h)'], ['48', '2 dni przed']] }) : ''}
            ${n.kanal === 'email' ? P.pole({ etykieta: 'Temat', pf: `cms:powiadomienia.${i}.temat`, wartosc: n.temat, id: 'pw-temat' }) : ''}
            ${P.pole({ etykieta: 'Treść', pf: `cms:powiadomienia.${i}.tresc`, wartosc: n.tresc, wiersze: n.kanal === 'sms' ? 3 : 9, id: 'pw-tresc' })}
            <div class="pole"><span style="font-weight:700;font-size:0.93rem">Wstaw w miejscu kursora:</span><div class="zmienne">${ZMIENNE.filter(([k]) => n.komu === 'gabinet' || !['telefon', 'wiadomosc'].includes(k)).map(([k, opis]) => `<button type="button" data-pa="pw-zmienna" data-k="${k}" title="${esc(opis)}">{${k}}</button>`).join('')}</div></div>
            <div class="sz__drugie" style="margin:0"><button type="button" class="p-btn p-btn--cichy" data-pa="pw-test">Wyślij próbną do siebie</button><button type="button" class="p-btn p-btn--tekst" data-pa="pw-reset" data-i="${i}">Przywróć domyślną treść</button></div>
          </div>`)}
        </div>
        <aside class="pw__podglad"><div class="ed__podglad-g">Podgląd z przykładową wizytą</div><div id="pw-podglad">${podgladPowiadomienia(n)}</div></aside>
      </div>`;
    },
    naZmiane() { const C = P.C(); const n = C.powiadomienia.find((x) => x.id === PW.id) || C.powiadomienia[0]; const el = document.getElementById('pw-podglad'); if (el) el.innerHTML = podgladPowiadomienia(n); },
  };
  P.akcje['pw-zmienna'] = (b) => {
    const pole = document.activeElement && ['pw-temat', 'pw-tresc'].includes(document.activeElement.id) ? document.activeElement : (P.ostatniePolePw && document.getElementById(P.ostatniePolePw)) || document.getElementById('pw-tresc');
    const z = `{${b.dataset.k}}`;
    const s = pole.selectionStart ?? pole.value.length;
    const e = pole.selectionEnd ?? s;
    pole.value = pole.value.slice(0, s) + z + pole.value.slice(e);
    pole.focus();
    pole.setSelectionRange(s + z.length, s + z.length);
    pole.dispatchEvent(new Event('input', { bubbles: true }));
  };
  document.addEventListener('focusin', (e) => { if (e.target.id === 'pw-temat' || e.target.id === 'pw-tresc') P.ostatniePolePw = e.target.id; });
  /* Klik w przycisk zmiennej nie może zabrać fokusu polu tekstowemu. */
  document.addEventListener('mousedown', (e) => { if (e.target.closest('[data-pa="pw-zmienna"]')) e.preventDefault(); });
  P.akcje['pw-test'] = () => window.KAL_UI.toast(`Wysłano próbną wiadomość na ${P.C().konto.email} (symulacja).`);
  P.akcje['pw-reset'] = (b) => { const dom = P.ziarnoCms(P.tryb()).powiadomienia[Number(b.dataset.i)]; P.zmienCms('Przywrócono domyślną treść', (C) => { const n = C.powiadomienia[Number(b.dataset.i)]; n.temat = dom.temat; n.tresc = dom.tresc; n.kiedy = dom.kiedy; }); };

  /* ── Płatności ──────────────────────────────────────────────────────── */
  const OPERATORZY = { p24: 'Przelewy24', tpay: 'Tpay', stripe: 'Stripe' };
  P.widoki.platnosci = {
    tytul: 'Płatności',
    podtytul: 'Zaliczki płatne przy rezerwacji. Pieniądze trafiają prosto na Twoje konto u operatora.',
    render() {
      const D = P.D();
      const C = P.C();
      const U = D.ustawienia;
      const Pl = C.platnosci;
      const zal = D.rezerwacje.filter((r) => r.zal).sort((a, b) => (b.data + K.pad(b.od)).localeCompare(a.data + K.pad(a.od)));
      const mies = K.iso(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
      const wMies = zal.filter((r) => r.data >= mies);
      const doZwrotu = zal.filter((r) => r.status === 'anulowana' || (r.status === 'odwolana' && !r.pozno));
      const dodatek = C.konto.dodatki.zaliczki;
      return `<div class="p-stos">
        ${!dodatek ? `<div class="p-ostrz p-ostrz--info">${P.ikona('uwaga')}<span>Zaliczki online to dodatek: 590 zł wdrożenie i 29 zł miesięcznie. <a href="#/ustawienia/pakiet">Zobacz w ustawieniach pakietu</a>.</span></div>` : ''}
        <div class="p-kpi">
          <div class="p-kpi__k"><span>Zaliczki w tym miesiącu</span><b>${P.zl(wMies.reduce((s, r) => s + r.zal.kwota, 0))}</b><small>${wMies.length} wpłat</small></div>
          <div class="p-kpi__k${doZwrotu.length ? ' p-kpi__k--uwaga' : ''}"><span>Do zwrotu</span><b>${doZwrotu.length}</b><small>wizyty odwołane z wyprzedzeniem albo anulowane przez gabinet</small></div>
          <div class="p-kpi__k"><span>Operator</span><b style="font-size:1.4rem">${esc(OPERATORZY[Pl.operator])}</b><small>${Pl.polaczone ? 'konto połączone' : 'konto niepołączone'}</small></div>
          <div class="p-kpi__k"><span>Nieodbyte z zaliczką</span><b>${zal.filter((r) => r.status === 'nieobecny').length}</b><small>zaliczka zostaje w gabinecie</small></div>
        </div>
        <div class="p-siatka">
          ${P.karta('Zaliczki przy rezerwacji', `<div class="p-formularz">
              ${P.przelacznik({ etykieta: 'Pobieraj zaliczkę przy rezerwacji online', pf: 'rez:ustawienia.zaliczki', wartosc: U.zaliczki, atr: `data-odswiez${dodatek ? '' : ' disabled'}`, pod: 'Pacjent płaci BLIK-iem, kartą albo szybkim przelewem. Termin potwierdza się po wpłacie.' })}
              <div class="pola2">
                ${P.wybor({ etykieta: 'Kwota', pf: 'cms:platnosci.tryb', wartosc: Pl.tryb, opcje: [['stala', 'Stała kwota'], ['procent', 'Procent ceny wizyty']], atr: 'data-odswiez' })}
                ${Pl.tryb === 'stala' ? P.wybor({ etykieta: 'Zaliczka', pf: 'rez:ustawienia.zaliczkaKwota', wartosc: U.zaliczkaKwota, opcje: [[30, '30 zł'], [50, '50 zł'], [80, '80 zł'], [100, '100 zł']], atr: 'data-typ="liczba"' }) : P.wybor({ etykieta: 'Procent ceny', pf: 'cms:platnosci.procent', wartosc: Pl.procent, opcje: [[10, '10%'], [20, '20%'], [30, '30%'], [50, '50%'], [100, 'całość']], atr: 'data-typ="liczba"' })}
              </div>
              <div class="pole"><span style="font-weight:700;font-size:0.93rem">Które usługi wymagają zaliczki</span><div class="p-check-lista">${D.uslugi.map((u, i) => `<label><input type="checkbox" data-pf="rez:uslugi.${i}.zaliczka"${u.zaliczka ? ' checked' : ''} /> ${esc(u.nazwa)}<small style="margin-left:auto;color:var(--muted)">${u.cena} zł</small></label>`).join('')}</div><p class="pod">Zaliczka ma sens przy dłuższych wizytach i pierwszych wizytach, na które pacjenci najczęściej nie przychodzą.</p></div>
              ${P.pole({ etykieta: 'Zasady zwrotu (widzi je pacjent przed płatnością)', pf: 'cms:platnosci.zwrot', wartosc: Pl.zwrot, wiersze: 3, licznik: 400, pod: 'Warto, żeby sprawdził je prawnik albo księgowa.' })}
            </div>`, { klasa: 'p-s7' })}
          ${P.karta('Operator płatności', `<div class="p-formularz">
              ${P.wybor({ etykieta: 'Operator', pf: 'cms:platnosci.operator', wartosc: Pl.operator, opcje: Object.entries(OPERATORZY), atr: 'data-odswiez' })}
              <div class="p-filtry"><span class="p-tag p-tag--${Pl.polaczone ? 'zielony' : 'zolty'}">${Pl.polaczone ? 'połączone' : 'niepołączone'}</span><button type="button" class="p-btn p-btn--maly ${Pl.polaczone ? 'p-btn--cichy' : 'p-btn--akcent'}" data-pa="pl-polacz">${Pl.polaczone ? 'Rozłącz' : `Połącz konto ${esc(OPERATORZY[Pl.operator])}`}</button></div>
              <p class="p-podp">Umowę z operatorem zawierasz Ty, a pieniądze trafiają bezpośrednio na Twoje konto. My ich nie przyjmujemy ani nie przechowujemy. Prowizję pobiera operator według swojego cennika. W demie połączenie to symulacja.</p>
            </div>`, { klasa: 'p-s5' })}
          ${P.karta('Ostatnie wpłaty', zal.length ? `<div class="p-tabela-przew"><table class="p-tabela"><thead><tr><th>Wizyta</th><th>Pacjent</th><th>Metoda</th><th>Status wizyty</th><th class="p-liczba">Kwota</th></tr></thead><tbody>${zal.slice(0, 12).map((r) => `<tr><td class="p-wazne">${esc(K.wzgledna(r.data))}<small>godz. ${K.godz(r.od)}</small></td><td><button type="button" class="p-link" data-pa="rez" data-id="${r.id}">${esc(r.imie)}</button></td><td>${esc(r.zal.metoda)}</td><td>${P.statusTag(r)}${r.status === 'anulowana' || (r.status === 'odwolana' && !r.pozno) ? '<small style="color:var(--warn)">do zwrotu</small>' : ''}</td><td class="p-liczba">${P.zl(r.zal.kwota)}</td></tr>`).join('')}</tbody></table></div>` : P.pusto('Jeszcze nie było wpłat.'), { klasa: 'p-s12', pod: 'Zwrot robisz w panelu operatora. Przy wizycie odwołanej później niż 24 h przed terminem zaliczka zgodnie z zasadami zostaje.' })}
        </div>
      </div>`;
    },
  };
  P.akcje['pl-polacz'] = () => P.zmienCms(P.C().platnosci.polaczone ? 'Rozłączono konto operatora' : 'Połączono konto operatora (symulacja)', (C) => { C.platnosci.polaczone = !C.platnosci.polaczone; });
})();
