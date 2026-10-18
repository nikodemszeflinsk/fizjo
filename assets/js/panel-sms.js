/*
 * Panel: wiadomości SMS do pacjentów.
 *  - licznik w nagłówku: ile wiadomości zostało w puli (200 w utrzymaniu Individual, 650 w Team; wiadomości ponad limit w sztukach),
 *  - własny SMS do pacjenta (szablony, liczba części, zgoda pacjenta), też z karty pacjenta,
 *  - karta „Wiadomości SMS” w Ustawieniach: stan limitu, wiadomości ponad limit, ostatnio wysłane.
 * To prototyp: nic nie jest wysyłane, a liczniki liczą się z danych demo (potwierdzenie i przypomnienie do każdej wizyty) i z własnych SMS-ów.
 */
(() => {
  'use strict';

  const K = window.KAL;
  const P = window.PANEL;
  const esc = P.esc;
  const LIMIT_IND = 200, LIMIT_TEAM = 650;
  const limitPakietu = () => (P.ent() ? LIMIT_TEAM : LIMIT_IND);
  /* Wiadomości ponad limit pokazujemy w sztukach; rozlicza je faktura/rachunek wg taryfy operatora. */

  /** Dane SMS w ustawieniach panelu: własne wiadomości. */
  const dane = () => { const C = P.C(); if (!C.sms) C.sms = { wlasne: [] }; return C.sms; };
  const miesiac = () => K.dzisIso().slice(0, 7);
  const cyfry = (t) => String(t || '').replace(/\D/g, '').replace(/^48(?=\d{9}$)/, '');

  /** Liczba części SMS-a (polskie znaki wymuszają unicode: 70 znaków w jednej części, dalej po 67). */
  const czesci = (t) => {
    const n = String(t).length;
    if (!n) return 0;
    return /[^\x00-\x7F]/.test(t) ? (n <= 70 ? 1 : Math.ceil(n / 67)) : (n <= 160 ? 1 : Math.ceil(n / 153));
  };
  /** Wiadomości automatyczne w danym miesiącu: potwierdzenie i przypomnienie do każdej wizyty, której termin już był albo jest dziś. */
  const automatyczne = (m = miesiac()) => {
    const D = P.D(), dzis = K.dzisIso();
    return D.rezerwacje.filter((r) => String(r.data).slice(0, 7) === m && r.data <= dzis && r.status !== 'anulowana' && r.status !== 'odwolana').length * 2;
  };
  const wlasneMiesiac = () => dane().wlasne.filter((w) => w.m === miesiac());
  const wlasneW = (m = miesiac()) => dane().wlasne.filter((w) => w.m === m).reduce((s, w) => s + w.czesci, 0);
  const nastepny = (m) => { const [r, mm] = m.split('-').map(Number); return mm === 12 ? `${r + 1}-01` : `${r}-${String(mm + 1).padStart(2, '0')}`; };
  const poprzedni = () => { const d = K.zIso(K.dzisIso()); d.setDate(1); d.setMonth(d.getMonth() - 1); return K.iso(d).slice(0, 7); };
  /**
   * Niewykorzystane SMS-y nie przepadają z końcem miesiąca: z każdego miesiąca przechodzi reszta puli.
   * W demie gabinet korzysta od zeszłego miesiąca, więc przenosimy resztę od niego.
   */
  const przeniesione = () => {
    const S = dane();
    if (!S.od) S.od = poprzedni();
    const limit = limitPakietu();
    let reszta = 0;
    for (let m = S.od; m < miesiac(); m = nastepny(m)) reszta = Math.max(0, reszta + limit - automatyczne(m) - wlasneW(m));
    return reszta;
  };
  const stan = () => {
    const limit = limitPakietu();
    const przenies = przeniesione();
    const pula = limit + przenies;
    const wlasne = wlasneW();
    const auto = automatyczne();
    const uzyte = auto + wlasne;
    const nadwyzka = Math.max(0, uzyte - pula);
    return { limit, przeniesione: przenies, pula, uzyte, auto, wlasne, pozostalo: Math.max(0, pula - uzyte), nadwyzka };
  };
  P.sms = { stan, czesci };

  const poziom = (s) => (s.pozostalo === 0 ? 'wyczerpany' : s.pozostalo <= s.pula * 0.2 ? 'malo' : 'ok');

  /* ── Licznik w nagłówku ─────────────────────────────────────────────── */
  function chip() {
    let b = document.getElementById('p-sms-chip');
    if (!b) {
      const gora = document.querySelector('.p-top');
      const akcent = gora && gora.querySelector('.p-btn--akcent');
      if (!gora || !akcent) return null;
      b = document.createElement('button');
      b.type = 'button'; b.id = 'p-sms-chip'; b.className = 'p-btn p-btn--cichy p-sms-chip'; b.setAttribute('data-pa', 'sms-nowy');
      gora.insertBefore(b, akcent);
    }
    return b;
  }
  function odswiezChip() {
    const b = chip();
    if (!b || !P.C || !window.KAL_UI) return;
    let s;
    try { s = stan(); } catch (e) { return; }
    b.dataset.poziom = poziom(s);
    b.title = `Pozostało ${s.pozostalo} z ${s.pula} wiadomości SMS (${s.limit} w tym miesiącu i ${s.przeniesione} przeniesionych). Kliknij, żeby wysłać własny SMS.`;
    b.innerHTML = `${P.ikona('powiadomienia')}<span class="p-sms-chip__t">SMS: <b>${s.pozostalo}</b> z ${s.pula}</span>`;
    b.setAttribute('aria-label', `Wyślij SMS. Pozostało ${s.pozostalo} z ${s.pula} wiadomości`);
  }
  const odswiezPierwotne = P.odswiez;
  P.odswiez = () => { odswiezPierwotne(); odswiezChip(); };
  window.addEventListener('hashchange', () => setTimeout(odswiezChip, 0));
  document.addEventListener('click', (e) => { if (e.target.closest('[data-pakiet]')) setTimeout(odswiezChip, 60); });
  setTimeout(odswiezChip, 0);
  setTimeout(odswiezChip, 400);

  /* ── Szablony i okno „Własny SMS” ───────────────────────────────────── */
  const SZABLONY = [
    ['Prośba o potwierdzenie', (imie, nazwa) => `Dzień dobry${imie ? ', ' + imie : ''}. Tu ${nazwa}. Prosimy o potwierdzenie wizyty odpowiedzią na ten numer lub telefonem.`],
    ['Zmiana godziny wizyty', (imie, nazwa) => `Dzień dobry${imie ? ', ' + imie : ''}. Tu ${nazwa}. Musimy przesunąć Pana/Pani wizytę. Zadzwonimy, żeby ustalić nowy termin. Przepraszamy za utrudnienie.`],
    ['Wolny termin', (imie, nazwa) => `Dzień dobry${imie ? ', ' + imie : ''}. Tu ${nazwa}. Zwolnił się wcześniejszy termin. Jeśli chce Pan/Pani skorzystać, prosimy o telefon.`],
  ];
  let TMP = { kto: '', numer: '', tresc: '' };
  const pacjenciLista = () => [...K.pacjenci(P.D()).entries()].filter(([, p]) => cyfry(p.tel).length === 9).sort((a, b) => a[1].imie.localeCompare(b[1].imie, 'pl')).slice(0, 80);
  const zgoda = (k) => { const C = P.C(); return !(C.pacjenci && C.pacjenci[k] && C.pacjenci[k].sms === false); };

  function budowaOkna() {
    const s = stan();
    const lista = pacjenciLista();
    const wybrany = TMP.kto && TMP.kto !== 'inny' ? lista.find(([k]) => k === TMP.kto) : null;
    const bezZgody = !!(wybrany && !zgoda(wybrany[0]));
    const nazwa = esc(P.C().nazwa || 'gabinet');
    const c = czesci(TMP.tresc);
    const ponadLimit = Math.max(0, c - s.pozostalo);
    const numerOk = TMP.kto === 'inny' ? cyfry(TMP.numer).length === 9 : !!wybrany;
    const ostatnie = wlasneMiesiac().slice(-4).reverse();
    return `${P.naglowek('Własny SMS', 'Do pacjenta: zmiana godziny, wolny termin, prośba o telefon. Bez danych o zdrowiu.')}
      <div class="p-sms-stan p-sms-stan--${poziom(s)}"><b>Pozostało ${s.pozostalo} z ${s.pula}</b> wiadomości (${s.limit} w tym miesiącu${s.przeniesione ? ` i ${s.przeniesione} przeniesionych` : ''})${s.pozostalo === 0 ? `. Limit wyczerpany: kolejne wiadomości są wysyłane i liczą się jako wiadomości ponad limit.` : ''}</div>
      <div class="p-formularz">
        ${P.wybor({ etykieta: 'Do kogo', id: 'sms-kto', wartosc: TMP.kto, opcje: [['', 'Wybierz pacjenta…'], ...lista.map(([k, p]) => [k, `${p.imie}, ${p.tel}`]), ['inny', 'Inny numer…']] })}
        ${TMP.kto === 'inny' ? P.pole({ etykieta: 'Numer telefonu', id: 'sms-numer', typ: 'tel', wartosc: TMP.numer, placeholder: '600 700 800' }) : ''}
        ${bezZgody ? '<p class="p-sms-ostrz" role="alert">Ten pacjent nie zgodził się na SMS-y. Zadzwoń do niego.</p>' : ''}
        <div class="pole"><label>Szablon</label><div class="p-filtry" role="group" aria-label="Szablony SMS">${SZABLONY.map(([n], i) => `<button type="button" class="p-btn p-btn--maly p-btn--cichy" data-pa="sms-szablon" data-i="${i}">${esc(n)}</button>`).join('')}</div></div>
        ${P.pole({ etykieta: 'Treść SMS-a', id: 'sms-tresc', wiersze: 5, wartosc: TMP.tresc, placeholder: 'Wpisz treść albo wybierz szablon' })}
        <p class="p-podp" id="sms-licznik" aria-live="polite">${TMP.tresc.length} znaków, ${c} ${c === 1 ? 'wiadomość' : (c >= 2 && c <= 4 ? 'wiadomości' : 'wiadomości')} z limitu${/[^\x00-\x7F]/.test(TMP.tresc) ? ' (polskie znaki skracają część do 70 znaków)' : ''}.</p>
        ${ponadLimit && c ? `<p class="p-sms-ostrz" role="status">Ta treść wykracza poza limit o ${ponadLimit} ${ponadLimit === 1 ? 'wiadomość' : 'wiadomości'}. Będą liczone jako wiadomości ponad limit.</p>` : ''}
        <div class="sz__glowne"><button type="button" class="przycisk" data-pa="sms-wyslij" ${(!c || !numerOk || bezZgody) ? 'disabled' : ''}>Wyślij SMS (symulacja)</button></div>
      </div>
      ${ostatnie.length ? `<div class="p-sz-sekcja"><h3>Ostatnio wysłane</h3><ul class="p-lista">${ostatnie.map((w) => `<li class="p-wiersz"><div class="p-wiersz__glowny" style="cursor:default"><b>${esc(w.imie || w.do)}</b><small>${esc(w.tekst.length > 90 ? w.tekst.slice(0, 90) + '…' : w.tekst)}</small></div></li>`).join('')}</ul></div>` : ''}`;
  }
  function podepnij(el) {
    const kto = el.querySelector('#sms-kto');
    if (kto) kto.addEventListener('change', () => { TMP.kto = kto.value; if (P.szuflada) P.szuflada.odswiez(); });
    const num = el.querySelector('#sms-numer');
    if (num) num.addEventListener('input', () => { TMP.numer = num.value; const b = el.querySelector('[data-pa="sms-wyslij"]'); if (b) b.disabled = !(cyfry(num.value).length === 9 && czesci(TMP.tresc)); });
    const tr = el.querySelector('#sms-tresc');
    if (tr) tr.addEventListener('input', () => {
      TMP.tresc = tr.value;
      const c = czesci(tr.value), s = stan();
      el.querySelector('#sms-licznik').textContent = `${tr.value.length} znaków, ${c} ${c === 1 ? 'wiadomość' : 'wiadomości'} z limitu${/[^\x00-\x7F]/.test(tr.value) ? ' (polskie znaki skracają część do 70 znaków)' : ''}.`;
      const b = el.querySelector('[data-pa="sms-wyslij"]');
      const wybrany = TMP.kto && TMP.kto !== 'inny' ? pacjenciLista().find(([k]) => k === TMP.kto) : null;
      const numerOk = TMP.kto === 'inny' ? cyfry(TMP.numer).length === 9 : !!wybrany;
      if (b) b.disabled = !(c && numerOk && s.pozostalo >= c && !(wybrany && !zgoda(wybrany[0])));
    });
  }
  /** Otwiera okno własnego SMS-a (opcjonalnie z wybranym pacjentem: klucz = 9 cyfr numeru). */
  P.otworzSms = (kluczPacjenta = '') => {
    TMP = { kto: kluczPacjenta && pacjenciLista().some(([k]) => k === kluczPacjenta) ? kluczPacjenta : '', numer: '', tresc: '' };
    return P.otworz(budowaOkna, { po: podepnij });
  };
  P.akcje['sms-nowy'] = (b) => P.otworzSms(b.dataset.tel ? cyfry(b.dataset.tel) : '');
  P.akcje['sms-szablon'] = (b) => {
    const wybrany = TMP.kto && TMP.kto !== 'inny' ? pacjenciLista().find(([k]) => k === TMP.kto) : null;
    const imie = wybrany ? wybrany[1].imie.split(' ')[0] : '';
    TMP.tresc = SZABLONY[Number(b.dataset.i)][1](imie, P.C().nazwa || 'gabinet');
    if (P.szuflada) P.szuflada.odswiez();
  };
  P.akcje['sms-wyslij'] = () => {
    const wybrany = TMP.kto && TMP.kto !== 'inny' ? pacjenciLista().find(([k]) => k === TMP.kto) : null;
    const c = czesci(TMP.tresc), s = stan();
    const numer = wybrany ? wybrany[1].tel : TMP.numer;
    if (!c || !(wybrany || cyfry(TMP.numer).length === 9) || (wybrany && !zgoda(wybrany[0]))) return;
    const imie = wybrany ? wybrany[1].imie : '';
    const tekst = TMP.tresc;
    P.zamknij(false);
    P.zmienCms(`SMS wysłany do ${imie || numer} (symulacja). Pozostało ${Math.max(0, s.pozostalo - c)} z ${s.pula}${c > s.pozostalo ? `, ${c - s.pozostalo} ponad limit` : ''}.`, (C) => {
      if (!C.sms) C.sms = { wlasne: [] };
      C.sms.wlasne.push({ k: new Date().toISOString(), m: miesiac(), do: numer, imie, tekst, czesci: c });
    });
    TMP = { kto: '', numer: '', tresc: '' };
  };

  /* ── Karta w Ustawieniach ───────────────────────────────────────────── */
  P.smsKarta = () => {
    const s = stan();
    const proc = Math.min(100, Math.round((s.uzyte / s.pula) * 100));
    return P.karta('Wiadomości SMS', `<div class="p-formularz">
      <div class="p-sms-licznik p-sms-licznik--${poziom(s)}">
        <p class="p-sms-licznik__duzy"><b>${s.pozostalo}</b> <span>z ${s.pula} wiadomości w puli: ${s.limit} w tym miesiącu${s.przeniesione ? ` i ${s.przeniesione} przeniesionych z poprzednich` : ''}</span></p>
        <span class="p-limit__tor"><i style="width:${proc}%"></i></span>
        <p class="p-podp">Wysłano ${s.uzyte}: ${s.auto} automatycznych (potwierdzenie i przypomnienie do wizyt) i ${s.wlasne} własnych.${s.nadwyzka ? ` Wiadomości ponad limit: ${s.nadwyzka}.` : s.pozostalo <= s.pula * 0.2 ? ' Zbliża się koniec limitu. Wiadomości będą wychodzić dalej jako wiadomości ponad limit.' : ''}</p>
      </div>
      <div class="p-filtry"><button type="button" class="p-btn p-btn--akcent" data-pa="sms-nowy">Wyślij własny SMS</button></div>
      <ul class="p-lista"><li class="p-wiersz"><div class="p-wiersz__glowny" style="cursor:default"><b>Limit: ${s.limit} SMS-ów miesięcznie w utrzymaniu</b><small>Niewykorzystane wiadomości nie przepadają z końcem miesiąca. Wiadomości ponad limit ${s.nadwyzka ? `(teraz: ${s.nadwyzka}) ` : ''}rozliczamy według taryfy operatora.</small></div></li></ul>
      <p class="p-podp">Pacjent dostaje SMS-y tylko wtedy, gdy zgodził się na nie przy rezerwacji.</p>
    </div>`);
  };
})();
