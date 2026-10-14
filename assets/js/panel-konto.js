/*
 * Panel — ustawienia konta: dane gabinetu, użytkownicy i role, integracje,
 * domena, prywatność i eksport danych, pakiet i dodatki.
 */
(() => {
  'use strict';

  const K = window.KAL;
  const P = window.PANEL;
  const esc = P.esc;
  const US = { tab: 'gabinet' };
  const ROLE = {
    wlasciciel: ['Właściciel', 'Wszystko, także płatności, pakiet i użytkownicy.'],
    recepcja: ['Recepcja', 'Kalendarz, rezerwacje i pacjenci wszystkich terapeutów. Bez statystyk przychodu i ustawień.'],
    terapeuta: ['Terapeuta', 'Własny kalendarz, własne wizyty i własny grafik. Bez danych innych terapeutów.'],
  };
  const UPRAWNIENIA = [
    ['Kalendarz i rezerwacje', 1, 1, 'własne'],
    ['Pacjenci', 1, 1, 'własni'],
    ['Dostępność i grafik', 1, 1, 'własny'],
    ['Usługi, zespół, lokalizacje', 1, 0, 0],
    ['Treści strony', 1, 0, 0],
    ['Statystyki i przychód', 1, 0, 'własne'],
    ['Płatności, pakiet, użytkownicy', 1, 0, 0],
  ];

  function gabinet(C) {
    const k = (s) => `cms:konto.${s}`;
    return P.karta('Dane gabinetu', `<div class="p-formularz">
      ${P.pole({ etykieta: 'Nazwa firmy', pf: k('nazwa'), wartosc: C.konto.nazwa, pod: 'Na fakturach i w umowie. Nazwę na stronie zmienisz w Treściach strony.' })}
      <div class="pola2">${P.pole({ etykieta: 'NIP', pf: k('nip'), wartosc: C.konto.nip })}${P.pole({ etykieta: 'Telefon kontaktowy', pf: k('telefon'), wartosc: C.konto.telefon, typ: 'tel' })}</div>
      ${P.pole({ etykieta: 'Adres siedziby', pf: k('adres'), wartosc: C.konto.adres })}
      ${P.pole({ etykieta: 'E-mail do powiadomień', pf: k('email'), wartosc: C.konto.email, typ: 'email', pod: 'Tu przychodzą nowe rezerwacje i wiadomości od pacjentów.' })}
    </div>`);
  }
  function uzytkownicy(C) {
    const D = P.D();
    if (!P.ent()) {
      return P.karta('Użytkownicy', `<ul class="p-lista">${C.konto.uzytkownicy.map((u) => `<li class="p-wiersz"><span class="p-osoba__av" style="background:var(--ink)">${P.inicjaly(u.imie)}</span><div class="p-wiersz__glowny" style="cursor:default"><b>${esc(u.imie)} <span class="p-tag">${ROLE[u.rola][0]}</span></b><small>${esc(u.email)}</small></div></li>`).join('')}</ul>
        <p class="p-podp">W pakiecie Individual panel ma jedno konto. Konta dla recepcji i zespołu są w pakiecie Enterprise.</p>`);
    }
    return `${P.karta('Użytkownicy', `<ul class="p-lista">${C.konto.uzytkownicy.map((u, i) => `<li class="p-wiersz"><span class="p-osoba__av" style="background:${u.rola === 'wlasciciel' ? 'var(--ink)' : u.rola === 'recepcja' ? '#7048e8' : K.kolor((D.zespol.find((t) => t.nazwa.includes(u.imie.split(' ').pop())) || { kolor: 2 }).kolor)}">${P.inicjaly(u.imie)}</span>
        <div class="p-wiersz__glowny" style="cursor:default"><b>${esc(u.imie)}</b><small>${esc(u.email)}${u.zaproszony ? ' · zaproszenie wysłane' : ''}</small></div>
        <span class="p-wiersz__akcje">${u.rola === 'wlasciciel' ? '<span class="p-tag">Właściciel</span>' : `<label class="wybor wybor--maly"><span class="visually-hidden">Rola</span><select data-pf="cms:konto.uzytkownicy.${i}.rola">${Object.entries(ROLE).filter(([r]) => r !== 'wlasciciel').map(([r, [n]]) => `<option value="${r}"${u.rola === r ? ' selected' : ''}>${n}</option>`).join('')}</select></label><button type="button" class="p-btn p-btn--ikona p-btn--cichy p-btn--maly" data-pa="uz-usun" data-i="${i}" aria-label="Usuń dostęp: ${esc(u.imie)}">${P.ikona('kosz')}</button>`}</span></li>`).join('')}</ul>
        <button type="button" class="p-btn p-btn--cichy" data-pa="uz-zapros">${P.ikona('plus')}<span>Zaproś osobę</span></button>`, { pod: 'Każdy loguje się swoim e-mailem. Hasła nie przechodzą przez nas.' })}
      ${P.karta('Co może każda rola', `<div class="p-tabela-przew"><table class="p-tabela"><thead><tr><th>Część panelu</th><th>Właściciel</th><th>Recepcja</th><th>Terapeuta</th></tr></thead><tbody>${UPRAWNIENIA.map(([n, a, b, c]) => `<tr><td>${n}</td>${[a, b, c].map((x) => `<td>${x === 1 ? '<span class="p-tag p-tag--zielony">tak</span>' : x ? `<span class="p-tag p-tag--niebieski">${x}</span>` : '<span class="p-tag">nie</span>'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`)}`;
  }
  function integracje(C) {
    const D = P.D();
    const I = C.konto.integracje;
    const wiersz = (nazwa, opis, stan, akcja) => `<li class="p-wiersz"><div class="p-wiersz__glowny" style="cursor:default"><b>${nazwa} <span class="p-tag p-tag--${stan ? 'zielony' : 'zolty'}">${stan ? 'połączone' : 'niepołączone'}</span></b><small>${opis}</small></div><span class="p-wiersz__akcje">${akcja}</span></li>`;
    return `${P.karta('Integracje', `<ul class="p-lista">
        ${wiersz('Wizytówka Google', 'Godziny otwarcia, adres i link do rezerwacji trafiają do Map Google.', I.googleWizytowka, `<button type="button" class="p-btn p-btn--maly p-btn--cichy" data-pa="in-przelacz" data-k="googleWizytowka">${I.googleWizytowka ? 'Rozłącz' : 'Połącz'}</button>`)}
        ${wiersz('Google Search Console', 'Widzisz, na jakie frazy pokazuje się strona i ile osób klika.', I.searchConsole, `<button type="button" class="p-btn p-btn--maly p-btn--cichy" data-pa="in-przelacz" data-k="searchConsole">${I.searchConsole ? 'Rozłącz' : 'Połącz'}</button>`)}
        ${wiersz('Analityka strony (bez ciasteczek)', 'Liczba odwiedzin i rezerwacji bez banera zgód.', I.analytics, `<button type="button" class="p-btn p-btn--maly p-btn--cichy" data-pa="in-przelacz" data-k="analytics">${I.analytics ? 'Wyłącz' : 'Włącz'}</button>`)}
        ${D.zespol.map((t) => wiersz(`Kalendarz Google: ${esc(t.nazwa)}`, 'Prywatne wydarzenia blokują terminy, wizyty trafiają do kalendarza w telefonie.', t.google, `<button type="button" class="p-btn p-btn--maly p-btn--cichy" data-pa="t-google" data-terap="${t.id}">${t.google ? 'Rozłącz' : 'Połącz'}</button>`)).join('')}
      </ul><p class="p-podp">W demie połączenia są symulacją.</p>`)}
      ${P.karta('ZnanyLekarz', `<div class="p-formularz">${P.pole({ etykieta: 'Link do profilu albo kod widżetu', pf: 'cms:konto.integracje.znanylekarz', wartosc: I.znanylekarz, wiersze: 2, placeholder: 'https://www.znanylekarz.pl/…', pod: 'Dodamy na stronie link do Twojego profilu. Kod widżetu wygenerujesz w swoim koncie ZnanyLekarz.' })}</div>`)}`;
  }
  function domena(C) {
    return P.karta('Domena i strona', `<ul class="p-lista">
      <li class="p-wiersz"><div class="p-wiersz__glowny" style="cursor:default"><b>${esc(C.konto.domena)} <span class="p-tag p-tag--zielony">aktywna</span></b><small>Zarejestrowana na Twoje dane, odnawiana w ramach utrzymania.</small></div></li>
      <li class="p-wiersz"><div class="p-wiersz__glowny" style="cursor:default"><b>Certyfikat bezpieczeństwa (https) <span class="p-tag p-tag--zielony">ważny</span></b><small>Odnawiany automatycznie.</small></div></li>
      <li class="p-wiersz"><div class="p-wiersz__glowny" style="cursor:default"><b>Monitoring <span class="p-tag p-tag--zielony">strona działa</span></b><small>Sprawdzamy stronę i rezerwacje co 5 minut. Ostatnia przerwa: brak w ostatnich 30 dniach.</small></div></li>
      <li class="p-wiersz"><div class="p-wiersz__glowny" style="cursor:default"><b>Widoczność w Google</b><small>${C.strona.seo.indeksowanie ? 'Strona jest widoczna w wyszukiwarkach.' : 'Strona jest ukryta przed wyszukiwarkami.'} Zmienisz to w <a href="#/strona/seo">SEO i Google</a>.</small></div></li>
    </ul>`);
  }
  function dane(C) {
    const D = P.D();
    return `${P.karta('Prywatność i dane pacjentów', `<div class="p-formularz">
        <p class="p-podp">Jesteś administratorem danych pacjentów, a my przetwarzamy je w Twoim imieniu na podstawie umowy powierzenia.</p>
        <div class="p-filtry"><button type="button" class="p-btn p-btn--cichy" data-pa="rodo-umowa">Pobierz umowę powierzenia</button><button type="button" class="p-btn p-btn--cichy" data-pa="rodo-rejestr">Rejestr czynności przetwarzania</button></div>
        ${P.wybor({ etykieta: 'Usuwaj dane pacjentów, którzy nie mieli wizyty od', pf: 'cms:konto.retencja', wartosc: C.konto.retencja, opcje: [[12, '12 miesięcy'], [24, '2 lat'], [36, '3 lat'], [60, '5 lat'], [0, 'nie usuwaj automatycznie']], atr: 'data-typ="liczba"', pod: 'Dotyczy danych kontaktowych z rezerwacji. Statystyki zostają bez imion i telefonów.' })}
      </div>`)}
      ${P.karta('Eksport danych', `<div class="p-formularz"><p class="p-podp">Twoje dane są Twoje. Pobierzesz je w każdej chwili, także gdy zrezygnujesz z utrzymania.</p>
        <div class="p-filtry"><button type="button" class="p-btn p-btn--cichy" data-pa="eks-rez">Rezerwacje (CSV)</button><button type="button" class="p-btn p-btn--cichy" data-pa="eks-pac">Pacjenci (CSV)</button><button type="button" class="p-btn p-btn--cichy" data-pa="eks-calosc">Wszystko (JSON)</button></div>
        <p class="p-podp">${D.rezerwacje.length} rezerwacji, ${K.pacjenci(D).size} pacjentów.</p></div>`)}`;
  }
  function pakiet(C) {
    const D = P.D();
    const L = K.LIMITY[P.tryb()];
    const podstron = C.strona.problemy.length;
    const maxPod = P.ent() ? 10 : 5;
    const pasek = (n, max, nazwa) => `<div class="p-limit${n >= max ? ' p-limit--pelny' : ''}"><span>${nazwa}: <b>${K.zLimitu(n, max)}</b></span>${max === Infinity ? '' : `<span class="p-limit__tor"><i style="width:${Math.min(100, (n / max) * 100)}%"></i></span>`}</div>`;
    const d = C.konto.dodatki;
    return `${P.karta(`Pakiet ${L.nazwa}`, `<div class="p-dwie">
        <div class="p-stos" style="gap:10px">${pasek(D.zespol.length, L.terapeuci, 'Terapeuci')}${pasek(D.miejsca.length, L.miejsca, P.ent() ? 'Lokalizacje' : 'Miejsca przyjęć')}${pasek(D.uslugi.length, L.uslugi, 'Usługi w cenniku')}${pasek(podstron, maxPod, 'Podstrony')}</div>
        <div class="p-stos" style="gap:6px"><p class="p-podp">Utrzymanie</p><b style="font-family:var(--f-display);font-size:2rem;font-weight:900">${P.ent() ? 149 : 99} zł <small style="font-size:0.9rem;color:var(--muted);font-weight:500">miesięcznie</small></b><p class="p-podp">Hosting, domena, certyfikat, monitoring, aktualizacje i do godziny drobnych zmian miesięcznie. Ceny końcowe.</p></div>
      </div>`)}
      ${P.karta('Dodatki', `<ul class="p-lista">
        <li class="p-wiersz"><div class="p-wiersz__glowny" style="cursor:default"><b>Przypomnienia SMS <span class="p-tag p-tag--${d.sms ? 'zielony' : ''}">${d.sms ? 'włączone' : 'wyłączone'}</span></b><small>49 zł miesięcznie za 200 SMS-ów. Pacjenci rzadziej zapominają o wizycie.</small></div><span class="p-wiersz__akcje"><button type="button" class="p-btn p-btn--maly ${d.sms ? 'p-btn--cichy' : 'p-btn--akcent'}" data-pa="dod-przelacz" data-k="sms">${d.sms ? 'Wyłącz' : 'Włącz'}</button></span></li>
        <li class="p-wiersz"><div class="p-wiersz__glowny" style="cursor:default"><b>Zaliczki online <span class="p-tag p-tag--${d.zaliczki ? 'zielony' : ''}">${d.zaliczki ? 'włączone' : 'wyłączone'}</span></b><small>299 zł wdrożenie i 29 zł miesięcznie. Pacjent płaci przy rezerwacji.</small></div><span class="p-wiersz__akcje"><button type="button" class="p-btn p-btn--maly ${d.zaliczki ? 'p-btn--cichy' : 'p-btn--akcent'}" data-pa="dod-przelacz" data-k="zaliczki">${d.zaliczki ? 'Wyłącz' : 'Włącz'}</button></span></li>
        <li class="p-wiersz"><div class="p-wiersz__glowny" style="cursor:default"><b>Dodatkowe podstrony, inne kalendarze, kampania reklamowa</b><small>Wyceniamy osobno.</small></div><span class="p-wiersz__akcje"><a class="p-btn p-btn--maly p-btn--cichy" href="mailto:kontakt@studio-widok.pl?subject=Wycena%20dodatku">Zapytaj o wycenę</a></span></li>
      </ul><p class="p-podp">W prawdziwym panelu włączenie dodatku wysyła nam prośbę, a my zmieniamy umowę. W demie działa od razu.</p>`)}
      ${P.karta('Demo', `<div class="p-filtry"><button type="button" class="p-btn p-btn--cichy p-btn--ostrzez" data-pa="demo-reset">Przywróć dane przykładowe</button><span class="p-podp">Wraca do stanu początkowego w obu pakietach.</span></div>`)}`;
  }

  P.widoki.ustawienia = {
    tytul: 'Ustawienia',
    podtytul: 'Konto gabinetu, dostęp dla zespołu, integracje i dane.',
    render(arg) {
      if (arg) US.tab = arg;
      const C = P.C();
      const czesci = { gabinet, uzytkownicy, integracje, domena, dane, pakiet };
      return `<div class="p-stos">${P.podzakladki([['gabinet', 'Gabinet'], ['uzytkownicy', 'Użytkownicy i role'], ['integracje', 'Integracje'], ['domena', 'Domena'], ['dane', 'Prywatność i dane'], ['pakiet', 'Pakiet i dodatki']], US.tab, 'ustawienia')}${(czesci[US.tab] || gabinet)(C)}</div>`;
    },
  };

  P.akcje['uz-zapros'] = () => P.otworz(() => `${P.naglowek('Zaproś osobę', 'Dostanie e-mail z linkiem do ustawienia hasła.')}
    <div class="formularz">
      ${P.pole({ etykieta: 'Imię i nazwisko', id: 'uz-imie', atr: 'data-fokus' })}
      ${P.pole({ etykieta: 'E-mail', id: 'uz-email', typ: 'email' })}
      <div class="pole"><span style="font-weight:700;font-size:0.93rem">Rola</span><div class="p-check-lista">${Object.entries(ROLE).filter(([r]) => r !== 'wlasciciel').map(([r, [n, o]], i) => `<label><input type="radio" name="uz-rola" value="${r}"${i === 0 ? ' checked' : ''} /> <span><b>${n}</b><br /><small style="color:var(--muted)">${o}</small></span></label>`).join('')}</div></div>
      <p class="status-nowej status-nowej--blad" id="uz-blad" role="status"></p>
    </div>
    <footer class="sz__st"><button type="button" class="przycisk przycisk--cichy" data-pa="zamknij">Anuluj</button><button type="button" class="przycisk" data-pa="uz-wyslij">Wyślij zaproszenie</button></footer>`);
  P.akcje['uz-wyslij'] = () => {
    const imie = document.getElementById('uz-imie').value.trim();
    const email = document.getElementById('uz-email').value.trim();
    const rola = document.querySelector('input[name="uz-rola"]:checked').value;
    if (imie.split(/\s+/).length < 2) { document.getElementById('uz-blad').textContent = 'Wpisz imię i nazwisko.'; return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { document.getElementById('uz-blad').textContent = 'Wpisz poprawny e-mail.'; return; }
    P.zamknij(false);
    P.zmienCms(`Wysłano zaproszenie: ${imie} (symulacja)`, (C) => { C.konto.uzytkownicy.push({ id: `u${Date.now()}`, imie, email, rola, zaproszony: true }); });
  };
  P.akcje['uz-usun'] = (b) => { const u = P.C().konto.uzytkownicy[Number(b.dataset.i)]; P.zmienCms(`Usunięto dostęp: ${u.imie}`, (C) => { C.konto.uzytkownicy.splice(Number(b.dataset.i), 1); }); };
  P.akcje['in-przelacz'] = (b) => { const k = b.dataset.k; const stan = P.C().konto.integracje[k]; P.zmienCms(`${stan ? 'Rozłączono' : 'Połączono'} (symulacja)`, (C) => { C.konto.integracje[k] = !stan; }); };
  P.akcje['dod-przelacz'] = (b) => {
    const k = b.dataset.k;
    const wl = !P.C().konto.dodatki[k];
    P.zmienCms(`${k === 'sms' ? 'Przypomnienia SMS' : 'Zaliczki online'}: ${wl ? 'włączone' : 'wyłączone'}`, (C) => {
      C.konto.dodatki[k] = wl;
      if (k === 'sms') { const n = C.powiadomienia.find((x) => x.id === 'sms'); if (n) n.wl = wl; }
    });
    if (k === 'zaliczki') P.cichoRez((D) => { D.ustawienia.zaliczki = wl; });
  };
  P.akcje['rodo-umowa'] = () => window.KAL_UI.toast('Umowa powierzenia jest częścią Twojej umowy. W demie nie pobieramy pliku.');
  P.akcje['rodo-rejestr'] = () => window.KAL_UI.toast('Rejestr czynności przetwarzania przygotowujemy przy wdrożeniu.');
  P.akcje['eks-rez'] = () => { P.RF.zakres = 'wszystkie'; P.RF.status = 'wszystkie'; P.akcje['rf-csv'](); };
  P.akcje['eks-pac'] = () => {
    const D = P.D();
    const q = (s) => `"${String(s == null ? '' : s).replace(/"/g, '""')}"`;
    const wiersze = [...K.pacjenci(D).values()];
    const csv = ['Pacjent;Telefon;Pierwsza wizyta;Źródło pozyskania;Wizyty odbyte;Nieodbyte;Ostatnia;Przychód'].concat(wiersze.map((p) => [p.imie, p.tel, p.pierwsza, K.ZRODLA[p.zrodlo] || p.zrodlo, p.odwiedzil, p.nieobecny, p.ostatnia, p.przychod].map(q).join(';'))).join('\r\n');
    P.pobierz(`pacjenci-${K.dzisIso()}.csv`, '﻿' + csv, 'text/csv;charset=utf-8');
    window.KAL_UI.toast(`Pobrano ${wiersze.length} pacjentów.`);
  };
  P.akcje['eks-calosc'] = () => { P.pobierz(`panel-gabinetu-${K.dzisIso()}.json`, JSON.stringify({ rezerwacje: P.D(), strona: P.C() }, null, 2), 'application/json'); window.KAL_UI.toast('Pobrano wszystkie dane.'); };
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
