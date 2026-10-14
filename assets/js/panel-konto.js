/*
 * Panel — ustawienia: przypomnienia dla pacjentów, dane gabinetu, zaliczki, pakiet i dodatki, eksport danych.
 * Jedna strona bez zakładek.
 */
(() => {
  'use strict';

  const K = window.KAL;
  const P = window.PANEL;
  const esc = P.esc;

  function przypomnienia(C) {
    const N = C.powiadomienia;
    const sms = C.konto.dodatki.sms;
    const n = (s) => `cms:powiadomienia.${s}`;
    return P.karta('Wiadomości do pacjentów', `<div class="p-formularz">
      ${P.przelacznik({ etykieta: 'Potwierdzenie rezerwacji e-mailem', pf: n('potwierdzenie'), wartosc: N.potwierdzenie, pod: 'Pacjent dostaje je od razu po rezerwacji, z linkiem do odwołania.' })}
      ${P.przelacznik({ etykieta: 'Przypomnienie e-mailem przed wizytą', pf: n('przypomnienie'), wartosc: N.przypomnienie, atr: 'data-odswiez' })}
      ${N.przypomnienie ? P.wybor({ etykieta: 'Kiedy wysyłać przypomnienie', pf: n('przypomnienieGodz'), wartosc: N.przypomnienieGodz, opcje: [[2, '2 godziny przed wizytą'], [12, '12 godzin przed'], [24, 'Dzień przed wizytą'], [48, '2 dni przed']], atr: 'data-typ="liczba"' }) : ''}
      ${P.przelacznik({ etykieta: 'Informacja o odwołaniu i zmianie terminu', pf: n('odwolanie'), wartosc: N.odwolanie })}
      ${P.przelacznik({ etykieta: 'Przypomnienie SMS', pf: n('sms'), wartosc: sms && N.sms, atr: sms ? '' : 'disabled', pod: sms ? 'Pacjent dostaje SMS tylko wtedy, gdy zgodził się na to przy rezerwacji. W cenie 200 wiadomości miesięcznie.' : 'To dodatek, 49 zł miesięcznie. Włączysz go niżej, w pakiecie.' })}
      ${P.przelacznik({ etykieta: 'E-mail do gabinetu o nowej rezerwacji', pf: n('doGabinetu'), wartosc: N.doGabinetu, pod: `Wysyłamy na ${esc(C.konto.email)}.` })}
    </div>`, { pod: 'Treść wiadomości przygotowujemy przy wdrożeniu, tak żeby pasowała do Twojego gabinetu.' });
  }
  function zaliczki(C) {
    const U = P.D().ustawienia;
    if (!C.konto.dodatki.zaliczki) return '';
    const D = P.D();
    return P.karta('Zaliczki online', `<div class="p-formularz">
      ${P.przelacznik({ etykieta: 'Pobieraj zaliczkę przy rezerwacji online', pf: 'rez:ustawienia.zaliczki', wartosc: U.zaliczki, atr: 'data-odswiez', pod: 'Pacjent płaci BLIK-iem, kartą albo przelewem, a pieniądze trafiają na Twoje konto u operatora płatności. Które usługi wymagają zaliczki, ustawisz w „Usługi i ceny”.' })}
      ${U.zaliczki ? `<div class="pola2">${P.pole({ etykieta: 'Kwota zaliczki (zł)', pf: 'rez:ustawienia.zaliczkaKwota', wartosc: U.zaliczkaKwota, typ: 'number', atr: 'min="0" step="10" data-typ="liczba"' })}</div><p class="p-podp">Zaliczka dotyczy ${D.uslugi.filter((u) => u.zaliczka).length} z ${D.uslugi.length} usług.</p>` : ''}
    </div>`);
  }
  function gabinet(C) {
    const k = (s) => `cms:konto.${s}`;
    return P.karta('Dane gabinetu', `<div class="p-formularz">
      ${P.pole({ etykieta: 'Nazwa gabinetu', pf: 'cms:nazwa', wartosc: C.nazwa, atr: 'data-odswiez' })}
      <div class="pola2">${P.pole({ etykieta: 'Telefon', pf: k('telefon'), wartosc: C.konto.telefon, typ: 'tel' })}${P.pole({ etykieta: 'E-mail', pf: k('email'), wartosc: C.konto.email, typ: 'email', pod: 'Tu przychodzą nowe rezerwacje.' })}</div>
      ${P.pole({ etykieta: 'Adres siedziby', pf: k('adres'), wartosc: C.konto.adres })}
      <p class="p-podp">Adresy miejsc, w których przyjmujesz pacjentów, ustawisz w zakładce „${P.ent() ? 'Lokalizacje' : 'Miejsca przyjęć'}”.</p>
    </div>`);
  }
  function pakiet(C) {
    const D = P.D();
    const L = K.LIMITY[P.tryb()];
    const pasek = (n, max, nazwa) => `<div class="p-limit${n >= max ? ' p-limit--pelny' : ''}"><span>${nazwa}: <b>${K.zLimitu(n, max)}</b></span>${max === Infinity ? '' : `<span class="p-limit__tor"><i style="width:${Math.min(100, (n / max) * 100)}%"></i></span>`}</div>`;
    const d = C.konto.dodatki;
    return P.karta(`Pakiet ${L.nazwa}`, `<div class="p-dwie">
        <div class="p-stos" style="gap:10px">${pasek(D.zespol.length, L.terapeuci, 'Terapeuci')}${pasek(D.miejsca.length, L.miejsca, P.ent() ? 'Lokalizacje' : 'Miejsca przyjęć')}${pasek(D.uslugi.length, L.uslugi, 'Usługi w cenniku')}</div>
        <div class="p-stos" style="gap:6px"><p class="p-podp">Utrzymanie</p><b style="font-family:var(--f-display);font-size:2rem;font-weight:900">${P.ent() ? 149 : 99} zł <small style="font-size:0.9rem;font-weight:500">miesięcznie</small></b><p class="p-podp">Hosting, domena, aktualizacje i do godziny drobnych zmian miesięcznie. Ceny końcowe.</p></div>
      </div>
      <ul class="p-lista" style="margin-top:14px">
        <li class="p-wiersz"><div class="p-wiersz__glowny" style="cursor:default"><b>Przypomnienia SMS <span class="p-tag p-tag--${d.sms ? 'zielony' : ''}">${d.sms ? 'włączone' : 'wyłączone'}</span></b><small>49 zł miesięcznie za 200 SMS-ów, każdy ponad limit według taryfy operatora.</small></div><span class="p-wiersz__akcje"><button type="button" class="p-btn p-btn--maly ${d.sms ? 'p-btn--cichy' : 'p-btn--akcent'}" data-pa="dod-przelacz" data-k="sms">${d.sms ? 'Wyłącz' : 'Włącz'}</button></span></li>
        <li class="p-wiersz"><div class="p-wiersz__glowny" style="cursor:default"><b>Zaliczki online <span class="p-tag p-tag--${d.zaliczki ? 'zielony' : ''}">${d.zaliczki ? 'włączone' : 'wyłączone'}</span></b><small>299 zł wdrożenie i 29 zł miesięcznie. Pacjent płaci przy rezerwacji, a pieniądze trafiają prosto do Ciebie.</small></div><span class="p-wiersz__akcje"><button type="button" class="p-btn p-btn--maly ${d.zaliczki ? 'p-btn--cichy' : 'p-btn--akcent'}" data-pa="dod-przelacz" data-k="zaliczki">${d.zaliczki ? 'Wyłącz' : 'Włącz'}</button></span></li>
      </ul>
      <p class="p-podp">W prawdziwym panelu włączenie dodatku wysyła nam prośbę, a my zmieniamy umowę. W demie działa od razu.</p>`);
  }
  function dane() {
    const D = P.D();
    return P.karta('Twoje dane', `<div class="p-formularz"><p class="p-podp">Dane należą do Ciebie. Pobierzesz je w każdej chwili, także gdy zrezygnujesz z utrzymania. W panelu jest ${D.rezerwacje.length} rezerwacji i ${K.pacjenci(D).size} pacjentów.</p>
      <div class="p-filtry"><button type="button" class="p-btn p-btn--cichy" data-pa="eks-rez">Rezerwacje (CSV)</button><button type="button" class="p-btn p-btn--cichy" data-pa="eks-pac">Pacjenci (CSV)</button></div></div>`);
  }
  function demo() {
    return P.karta('Demo', '<div class="p-filtry"><button type="button" class="p-btn p-btn--cichy p-btn--ostrzez" data-pa="demo-reset">Przywróć dane przykładowe</button><span class="p-podp">Wraca do stanu początkowego w obu pakietach.</span></div>');
  }

  P.widoki.ustawienia = {
    tytul: 'Ustawienia',
    podtytul: 'Wiadomości do pacjentów, dane gabinetu, pakiet i eksport danych.',
    render() {
      const C = P.C();
      return `<div class="p-stos p-stos--waski">${przypomnienia(C)}${zaliczki(C)}${gabinet(C)}${pakiet(C)}${dane()}${demo()}</div>`;
    },
  };

  P.akcje['dod-przelacz'] = (b) => {
    const k = b.dataset.k;
    const wl = !P.C().konto.dodatki[k];
    P.zmienCms(`${k === 'sms' ? 'Przypomnienia SMS' : 'Zaliczki online'}: ${wl ? 'włączone' : 'wyłączone'}`, (C) => {
      C.konto.dodatki[k] = wl;
      if (k === 'sms') C.powiadomienia.sms = wl;
    });
    if (k === 'zaliczki') P.cichoRez((D) => { D.ustawienia.zaliczki = wl; });
  };
  P.akcje['eks-rez'] = () => { P.RF.zakres = 'wszystkie'; P.RF.status = 'wszystkie'; P.akcje['rf-csv'](); };
  P.akcje['eks-pac'] = () => {
    const D = P.D();
    const q = (s) => `"${String(s == null ? '' : s).replace(/"/g, '""')}"`;
    const wiersze = [...K.pacjenci(D).values()];
    const csv = ['Pacjent;Telefon;Pierwsza wizyta;Źródło pozyskania;Wizyty odbyte;Nieodbyte;Ostatnia;Przychód'].concat(wiersze.map((p) => [p.imie, p.tel, p.pierwsza, K.ZRODLA[p.zrodlo] || p.zrodlo, p.odwiedzil, p.nieobecny, p.ostatnia, p.przychod].map(q).join(';'))).join('\r\n');
    P.pobierz(`pacjenci-${K.dzisIso()}.csv`, '﻿' + csv, 'text/csv;charset=utf-8');
    window.KAL_UI.toast(`Pobrano ${wiersze.length} pacjentów.`);
  };
  P.akcje['demo-reset'] = (b) => {
    if (b.dataset.potw !== '1') { b.dataset.potw = '1'; b.querySelector('span') ? (b.querySelector('span').textContent = 'Na pewno? Kliknij jeszcze raz') : (b.textContent = 'Na pewno? Kliknij jeszcze raz'); return; }
    window.KAL_UI.nowyStan();
    P.przywrocCms();
    const st = window.KAL_UI.stan();
    P.uzupelnij(st.dane.ind, 'ind');
    P.uzupelnij(st.dane.ent, 'ent');
    window.KAL_UI.zapisz();
    P.filtrOsob = null;
    P.idz('pulpit');
    window.KAL_UI.toast('Przywrócono dane przykładowe.');
  };
})();
