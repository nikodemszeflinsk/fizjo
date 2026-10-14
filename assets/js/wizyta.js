/*
 * Zmiana wizyty przez pacjenta: link z e-maila → termin, przełożenie, odwołanie.
 *
 * Bez konta, bez logowania i bez pytań o zdrowie: pacjent widzi tylko własną wizytę, wybiera nowy termin
 * albo odwołuje (powód z listy, bez wolnego tekstu). Zasady (do ilu godzin przed wizytą) ustawia gabinet.
 *
 * W demie czytamy i zapisujemy ten sam stan co kalendarz gabinetu (localStorage), więc zmianę widać tam od razu.
 * W prawdziwym wdrożeniu to samo robi serwer, a link ma długi losowy token przypisany do jednej wizyty.
 */
(() => {
  'use strict';

  const K = window.KAL;
  const KLUCZ = 'kalendarz-demo-v4';
  const q = new URLSearchParams(location.search);
  const app = document.getElementById('app');
  const esc = K.esc;
  const pad = K.pad;

  /* ── Stan ───────────────────────────────────────────────────────────── */
  function wczytaj() {
    try {
      const z = JSON.parse(localStorage.getItem(KLUCZ));
      if (z && z.dane && z.dane.ind && z.dane.ent) return z;
    } catch (e) { /* zaczynamy od danych przykładowych */ }
    const nowy = { tryb: 'ind', widok: 'tydzien', data: K.dzisIso(), terap: 'jan', dane: { ind: K.ziarno('ind'), ent: K.ziarno('ent') } };
    try { localStorage.setItem(KLUCZ, JSON.stringify(nowy)); } catch (e) { /* bez zapisu demo działa tylko w tej karcie */ }
    return nowy;
  }
  const zapisz = (st) => { try { localStorage.setItem(KLUCZ, JSON.stringify(st)); } catch (e) { /* jw. */ } };
  let ref = null; /* { id, tryb } wizyty, na której pracujemy */

  function znajdz(st) {
    if (ref) { const D = st.dane[ref.tryb]; const r = D.rezerwacje.find((x) => x.id === ref.id); return r ? { tryb: ref.tryb, D, r } : null; }
    const id = q.get('r');
    const kolej = q.get('t') === 'ent' ? ['ent', 'ind'] : ['ind', 'ent'];
    if (id) {
      for (const tr of kolej) { const r = st.dane[tr].rezerwacje.find((x) => x.id === id); if (r) { ref = { id, tryb: tr }; return { tryb: tr, D: st.dane[tr], r }; } }
      return null;
    }
    /* Bez parametru pokazujemy przykładową wizytę: najbliższą aktywną, najlepiej taką, którą pacjent może jeszcze zmienić. */
    const tr = q.get('t') === 'ent' ? 'ent' : 'ind';
    const D = st.dane[tr];
    const przyszle = D.rezerwacje.filter((r) => K.aktywna(r) && !K.minelo(r.data, r.od)).sort((a, b) => (a.data + K.pad(a.od)).localeCompare(b.data + K.pad(b.od)));
    const r = przyszle.find((x) => x.zrodlo === 'strona' && K.zmianaPacjenta(D, x).ok) || przyszle.find((x) => K.zmianaPacjenta(D, x).ok) || przyszle[0]
      || [...D.rezerwacje].sort((a, b) => b.data.localeCompare(a.data))[0];
    if (!r) return null;
    ref = { id: r.id, tryb: tr };
    try { history.replaceState(null, '', `?r=${encodeURIComponent(r.id)}&t=${tr}`); } catch (e) { /* adres zostaje bez parametrów */ }
    return { tryb: tr, D, r };
  }
  /** Zapis zmiany na świeżym stanie (kalendarz mógł się zmienić w innej karcie). */
  function modyfikuj(fn) {
    const st = wczytaj();
    const c = znajdz(st);
    if (!c) return { blad: 'brak' };
    const w = fn(c.D, c.r);
    zapisz(st);
    return w;
  }

  /* ── Dane gabinetu ──────────────────────────────────────────────────── */
  function gabinet(tryb, D, r) {
    let C = null;
    try { C = JSON.parse(localStorage.getItem('panel-cms-v2')).dane[tryb]; } catch (e) { /* bez ustawień z panelu */ }
    const m = K.miejsce(D, r.lok);
    return {
      nazwa: (C && C.nazwa) || 'Linia Ruchu',
      tel: m.telefon || (C && C.konto && C.konto.telefon) || (tryb === 'ent' ? '12 345 67 89' : '600 700 800'),
      adres: m.ulica ? `${m.ulica}${m.miasto ? `, ${m.miasto}` : ''}` : m.nazwa,
      miejsce: m.nazwa, dojazd: m.dojazd || '', parking: m.parking || '', dostepnosc: m.dostepnosc || '',
    };
  }

  /* ── Widok ──────────────────────────────────────────────────────────── */
  const V = { ekran: 'wizyta', terap: 'same', dzien: '', slot: null, powod: '', blad: '', wynik: null };
  const IK = {
    kal: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 6.5h12v9.5H4zM4 9.5h12M7.5 4v4M12.5 4v4" /></svg>',
    trasa: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 17s5.5-5 5.5-9.2a5.5 5.5 0 0 0-11 0C4.5 12 10 17 10 17ZM10 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /></svg>',
    tel: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 3.5h3l1 3.5-2 1.2a8 8 0 0 0 3.8 3.8l1.2-2 3.5 1v3c0 .8-.7 1.5-1.5 1.5A12 12 0 0 1 4.5 5c0-.8.7-1.5 1.5-1.5Z" /></svg>',
    ok: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 10.5l3.5 3.5 7.5-8" /></svg>',
    x: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" /></svg>',
  };
  const lw = (n, a, b, c) => (n === 1 ? a : n % 10 >= 2 && n % 10 <= 4 && !(n % 100 >= 12 && n % 100 <= 14) ? b : c);
  const dataTekst = (data) => K.dlugaData(K.zIso(data));
  const zakres = (r) => `${K.godz(r.od)}–${K.godz(r.od + r.dl)}`;
  const kiedyTermin = (data, od) => `${dataTekst(data)}, ${K.godz(od)}`;
  const telLink = (g) => `<a class="btn btn--glowny" href="tel:${esc(g.tel.replace(/\s/g, ''))}">${IK.tel}Zadzwoń: ${esc(g.tel)}</a>`;

  function termin(r) {
    return `<div class="termin"><small>Twoja wizyta</small><b>${esc(dataTekst(r.data))}</b><span>${esc(zakres(r))} · ${esc(K.usluga(DANE.D, r.usluga).nazwa)}</span></div>`;
  }
  function szczegoly(r, g) {
    const t = K.terap(DANE.D, r.terap);
    return `<dl class="dl">
      <dt>Kto</dt><dd>${esc(t.nazwa)}</dd>
      <dt>Gdzie</dt><dd>${esc(g.adres)}${g.dojazd ? `<small>${esc(g.dojazd)}</small>` : ''}${g.parking ? `<small>${esc(g.parking)}</small>` : ''}${g.dostepnosc ? `<small>${esc(g.dostepnosc)}</small>` : ''}</dd>
      <dt>Koszt</dt><dd>${esc(String(K.cena(DANE.D, r)))} zł, płatność na miejscu${r.zal && DANE.D.ustawienia.zaliczki ? `<small>Zaliczka ${esc(String(r.zal.kwota))} zł opłacona (${esc(r.zal.metoda)}).</small>` : ''}</dd>
    </dl>`;
  }
  function termZasady(kontrola, r) {
    const doKiedy = new Date(K.zIso(r.data).getTime() + r.od * 60000 - kontrola.godz * 3600000);
    return `Możesz zmienić termin albo odwołać wizytę do <b>${esc(K.DNI_KR[doKiedy.getDay()])} ${doKiedy.getDate()}.${pad(doKiedy.getMonth() + 1)}, ${doKiedy.getHours()}:${pad(doKiedy.getMinutes())}</b> (${kontrola.godz} h przed wizytą).`;
  }

  function ekranWizyta() {
    const { D, r } = DANE;
    const g = DANE.g;
    const k = K.zmianaPacjenta(D, r);
    let znak = '<span class="znak">Potwierdzona</span>';
    if (r.status === 'oczekuje') znak = '<span class="znak znak--czeka">Czeka na potwierdzenie gabinetu</span>';
    if (!K.aktywna(r)) znak = '<span class="znak znak--x">Odwołana</span>';
    if (k.kod === 'minela') znak = '<span class="znak znak--stary">Wizyta już się odbyła</span>';
    const imie = esc(r.imie.split(' ')[0]);
    let akcje = '';
    let regula = '';
    if (k.ok) {
      akcje = `<div class="akcje"><button type="button" class="btn btn--glowny" data-a="przeloz">${IK.kal}Zmień termin</button><button type="button" class="btn btn--alarm" data-a="odwolaj">Odwołaj wizytę</button></div>`;
      regula = `<p class="regula">${termZasady(k, r)}</p>`;
    } else if (k.kod === 'za-pozno') {
      regula = `<p class="regula regula--uwaga"><b>Do wizyty zostało mniej niż ${k.godz} godzin</b>, więc nie zmienisz jej już tutaj. Zadzwoń do gabinetu, a postaramy się znaleźć rozwiązanie.</p>`;
      akcje = `<div class="akcje">${telLink(g)}</div>`;
    } else if (k.kod === 'wylaczone') {
      regula = '<p class="regula regula--uwaga">Termin zmienisz telefonicznie. Zadzwoń do gabinetu.</p>';
      akcje = `<div class="akcje">${telLink(g)}</div>`;
    } else if (k.kod === 'odwolana') {
      regula = `<p class="regula">${r.zmiana && r.zmiana.typ === 'odwolana' ? 'Odwołałeś tę wizytę, a termin jest znów wolny.' : 'Ta wizyta została odwołana.'} Możesz umówić nową.</p>`;
      akcje = `<div class="akcje"><a class="btn btn--glowny" href="demo.html">Umów nową wizytę</a></div>`;
    }
    const zmiana = r.zmiana && r.zmiana.typ === 'przelozona' && K.aktywna(r)
      ? `<p class="regula">Wizyta została przełożona z ${esc(kiedyTermin(r.zmiana.bylo.data, r.zmiana.bylo.od).toLowerCase())}.</p>` : '';
    const dod = K.aktywna(r) && k.kod !== 'minela'
      ? `<div class="dwa"><button type="button" class="btn btn--cichy" data-a="ics">${IK.kal}Do kalendarza</button><a class="btn btn--cichy" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(g.adres)}" target="_blank" rel="noopener">${IK.trasa}Trasa</a></div>` : '';
    return `<h1>Dzień dobry, ${imie}</h1>
      <section class="karta" aria-label="Szczegóły wizyty">${znak}${termin(r)}${szczegoly(r, g)}</section>
      ${zmiana}${regula}${akcje}${dod}`;
  }

  function ekranPrzeloz() {
    const { D, r } = DANE;
    const g = DANE.g;
    const ent = DANE.tryb === 'ent';
    const lista = K.terminyDoZmiany(D, r, { dni: 21, terap: V.terap === 'any' ? 'any' : null });
    if (!lista.length) {
      return `<button type="button" class="wstecz" data-a="wstecz">← Wróć do wizyty</button><h1>Zmień termin</h1>
        <p class="regula regula--uwaga"><b>W najbliższych tygodniach nie ma wolnych terminów${V.terap === 'any' ? '' : ' u tego terapeuty'}.</b> Zadzwoń do gabinetu, a znajdziemy coś razem.</p>
        ${ent && V.terap !== 'any' ? '<button type="button" class="btn btn--cichy" data-a="dowolny">Pokaż terminy u każdego terapeuty</button>' : ''}<div class="akcje">${telLink(g)}</div>`;
    }
    if (!lista.some((d) => d.data === V.dzien)) { V.dzien = lista[0].data; V.slot = null; }
    const dzien = lista.find((d) => d.data === V.dzien);
    const wybrany = V.slot ? dzien.sloty.find((s) => s.od === V.slot) : null;
    const dniHtml = lista.map((d) => {
      const dd = K.zIso(d.data);
      return `<button type="button" class="dzien" data-a="dzien" data-d="${d.data}" aria-pressed="${d.data === V.dzien}" aria-label="${esc(dataTekst(d.data))}, ${d.sloty.length} ${lw(d.sloty.length, 'wolny termin', 'wolne terminy', 'wolnych terminów')}"><small>${esc(K.DNI_KR[dd.getDay()])}</small><b>${dd.getDate()}.${pad(dd.getMonth() + 1)}</b><small>${d.sloty.length} ${lw(d.sloty.length, 'termin', 'terminy', 'terminów')}</small></button>`;
    }).join('');
    const sloty = dzien.sloty.map((s) => `<button type="button" class="godz" data-a="godz" data-o="${s.od}" aria-pressed="${s.od === V.slot}">${K.godz(s.od)}${V.terap === 'any' && s.osoby.length ? `<small>${esc(s.osoby.map((o) => o.nazwa.replace(/^mgr\s+/, '').split(' ')[0]).join(', '))}</small>` : ''}</button>`).join('');
    const osoba = wybrany ? wybrany.osoby[0] : null;
    return `<button type="button" class="wstecz" data-a="wstecz">← Wróć do wizyty</button>
      <h1>Wybierz nowy termin</h1>
      <p class="wstep">${esc(K.usluga(D, r.usluga).nazwa)}, ${esc(K.dlTekst(r.dl))}. Teraz: ${esc(kiedyTermin(r.data, r.od).toLowerCase())}.</p>
      ${ent ? `<div class="pole"><label for="terap">Terapeuta</label><select id="terap"><option value="same"${V.terap === 'same' ? ' selected' : ''}>Ten sam: ${esc(K.terap(D, r.terap).nazwa)}</option><option value="any"${V.terap === 'any' ? ' selected' : ''}>Dowolny, kto ma wolny termin</option></select></div>` : ''}
      ${V.blad ? `<p class="regula regula--blad" role="alert">${esc(V.blad)}</p>` : ''}
      <section class="karta" aria-label="Wolne terminy">
        <div class="pole"><span class="legenda" id="l-dni" style="font-weight:800;font-size:.95rem">Dzień</span><div class="dni" role="group" aria-labelledby="l-dni">${dniHtml}</div></div>
        <div class="pole"><span style="font-weight:800;font-size:.95rem" id="l-godz">Godzina w dniu: ${esc(dataTekst(dzien.data))}</span><div class="godziny" role="group" aria-labelledby="l-godz">${sloty}</div></div>
      </section>
      ${wybrany ? `<div class="wybrany przed-po"><small>Nowy termin</small><b>${esc(dataTekst(dzien.data))}, ${K.godz(wybrany.od)}–${K.godz(wybrany.od + r.dl)}</b><span>${esc(osoba.nazwa)}${DANE.D.miejsca.length > 1 ? `, ${esc(K.miejsce(D, osoba.lok).nazwa)}` : ''}</span><s>Zamiast: ${esc(kiedyTermin(r.data, r.od).toLowerCase())}</s></div>${r.zal && D.ustawienia.zaliczki ? `<p class="nic">Zaliczka ${esc(String(r.zal.kwota))} zł zostaje przy nowym terminie.</p>` : ''}` : '<p class="nic">Wybierz godzinę, a pokażemy podsumowanie.</p>'}
      <div class="akcje"><button type="button" class="btn btn--glowny" data-a="potwierdz-przeloz" ${wybrany ? '' : 'disabled'}>Potwierdź nowy termin</button></div>`;
  }

  function ekranOdwolaj() {
    const { D, r } = DANE;
    return `<button type="button" class="wstecz" data-a="wstecz">← Wróć do wizyty</button>
      <h1>Odwołać wizytę?</h1>
      <section class="karta" aria-label="Wizyta do odwołania">${termin(r)}</section>
      <div class="regula"><b>Wolisz inny termin?</b> Przełóż wizytę zamiast ją odwoływać, zajmie to chwilę.<div class="akcje" style="margin-top:10px"><button type="button" class="btn btn--glowny" data-a="przeloz">${IK.kal}Zmień termin</button></div></div>
      <fieldset class="pole"><legend>Dlaczego odwołujesz? <span style="font-weight:500;color:var(--muted)">(nieobowiązkowo)</span></legend>
        ${K.POWODY_PACJENTA.map((p, i) => `<label class="radio"><input type="radio" name="powod" value="${esc(p)}"${(V.powod || K.POWODY_PACJENTA[3]) === p ? ' checked' : ''} />${esc(p)}</label>`).join('')}
        <p class="nic">Nie podawaj tu informacji o zdrowiu. Nie pytamy o nie.</p>
      </fieldset>
      ${r.zal && D.ustawienia.zaliczki ? `<p class="regula">Odwołujesz wizytę w terminie, więc zaliczka <b>${esc(String(r.zal.kwota))} zł zostanie Ci zwrócona</b>.</p>` : ''}
      ${V.blad ? `<p class="regula regula--blad" role="alert">${esc(V.blad)}</p>` : ''}
      <div class="akcje"><button type="button" class="btn btn--alarm-pelny" data-a="potwierdz-odwolaj">Odwołaj wizytę</button><button type="button" class="btn btn--cichy" data-a="wstecz">Nie, zostawiam wizytę</button></div>`;
  }

  function ekranGotowe() {
    const { r } = DANE;
    const g = DANE.g;
    if (V.wynik === 'odwolana') {
      return `<div class="sukces"><span class="sukces__ikona sukces__ikona--x">${IK.ok}</span><h1>Wizyta odwołana</h1></div>
        <p class="wstep">Gabinet dostał informację, a termin ${esc(kiedyTermin(r.zmiana ? r.zmiana.bylo.data : r.data, r.zmiana ? r.zmiana.bylo.od : r.od).toLowerCase())} jest znów wolny dla innych. Potwierdzenie wyślemy e-mailem.</p>
        ${r.zal && DANE.D.ustawienia.zaliczki ? `<p class="regula">Zaliczka ${esc(String(r.zal.kwota))} zł wróci na Twoje konto.</p>` : ''}
        <div class="akcje"><a class="btn btn--glowny" href="demo.html">Umów nową wizytę</a></div>`;
    }
    return `<div class="sukces"><span class="sukces__ikona">${IK.ok}</span><h1>Termin zmieniony</h1></div>
      <section class="karta" aria-label="Nowy termin">${termin(r)}${szczegoly(r, g)}</section>
      <p class="wstep">Wysłaliśmy potwierdzenie e-mailem, a gabinet już o tym wie.</p>
      <div class="dwa"><button type="button" class="btn btn--cichy" data-a="ics">${IK.kal}Do kalendarza</button><a class="btn btn--cichy" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(g.adres)}" target="_blank" rel="noopener">${IK.trasa}Trasa</a></div>
      <div class="akcje"><button type="button" class="btn btn--cichy" data-a="wstecz">Wróć do wizyty</button></div>`;
  }

  function brak() {
    app.innerHTML = '<h1>Nie znaleźliśmy tej wizyty</h1><p class="regula regula--uwaga">Link mógł wygasnąć albo wizyta została usunięta. Zadzwoń do gabinetu albo otwórz link z najnowszego e-maila.</p><div class="akcje"><a class="btn btn--glowny" href="demo.html">Umów nową wizytę</a></div>';
  }

  let DANE = null;
  function render(fokus = true) {
    const st = wczytaj();
    const c = znajdz(st);
    if (!c) { document.getElementById('gabinet').textContent = 'Gabinet'; return brak(); }
    DANE = { tryb: c.tryb, D: c.D, r: c.r, g: gabinet(c.tryb, c.D, c.r) };
    document.getElementById('gabinet').textContent = DANE.g.nazwa;
    document.title = `Twoja wizyta · ${DANE.g.nazwa}`;
    const tel = document.getElementById('gora-tel');
    tel.hidden = false; tel.href = `tel:${DANE.g.tel.replace(/\s/g, '')}`; tel.textContent = DANE.g.tel;
    document.getElementById('demo').hidden = false;
    document.getElementById('demo-kal').href = `kalendarz.html${c.tryb === 'ent' ? '?tryb=ent' : ''}`;
    document.getElementById('demo-cofnij').hidden = !c.r.zmiana;
    app.innerHTML = { wizyta: ekranWizyta, przeloz: ekranPrzeloz, odwolaj: ekranOdwolaj, gotowe: ekranGotowe }[V.ekran]();
    const wyb = app.querySelector('.dzien[aria-pressed="true"]');
    if (wyb) wyb.parentElement.scrollLeft = Math.max(0, wyb.offsetLeft - 16);
    if (fokus) { const h = app.querySelector('h1'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); window.scrollTo({ top: 0 }); } }
  }
  const idz = (ekran) => { V.ekran = ekran; V.blad = ''; render(); };

  /* ── Pobranie wizyty do kalendarza ──────────────────────────────────── */
  function ics() {
    const { r, g } = DANE;
    const d = r.data.replace(/-/g, '');
    const t = (min) => `${pad(Math.floor(min / 60))}${pad(min % 60)}00`;
    const e = (s) => String(s).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
    const teraz = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const tresc = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Studio Widok//Wizyta//PL', 'BEGIN:VEVENT', `UID:${r.id}@wizyta`, `DTSTAMP:${teraz}`, `DTSTART:${d}T${t(r.od)}`, `DTEND:${d}T${t(r.od + r.dl)}`,
      `SUMMARY:${e(`${K.usluga(DANE.D, r.usluga).nazwa}, ${g.nazwa}`)}`, `LOCATION:${e(g.adres)}`, `DESCRIPTION:${e(`Telefon do gabinetu: ${g.tel}. Zmiana terminu: ${location.href}`)}`, 'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:Wizyta za 2 godziny', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([tresc], { type: 'text/calendar;charset=utf-8' }));
    a.download = `wizyta-${r.data}.ics`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  /* ── Zdarzenia ──────────────────────────────────────────────────────── */
  app.addEventListener('click', (e) => {
    const b = e.target.closest('[data-a]');
    if (!b) return;
    const a = b.dataset.a;
    if (a === 'przeloz') { V.slot = null; V.dzien = ''; return idz('przeloz'); }
    if (a === 'odwolaj') return idz('odwolaj');
    if (a === 'wstecz') return idz('wizyta');
    if (a === 'dowolny') { V.terap = 'any'; return render(false); }
    if (a === 'dzien') { V.dzien = b.dataset.d; V.slot = null; V.blad = ''; return render(false); }
    if (a === 'godz') { V.slot = Number(b.dataset.o); V.blad = ''; render(false); const p = app.querySelector('.wybrany'); if (p) p.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); return; }
    if (a === 'ics') return ics();
    if (a === 'potwierdz-przeloz') {
      const dzien = K.terminyDoZmiany(DANE.D, DANE.r, { dni: 21, terap: V.terap === 'any' ? 'any' : null }).find((d) => d.data === V.dzien);
      const slot = dzien && dzien.sloty.find((s) => s.od === V.slot);
      if (!slot) { V.blad = 'Ten termin przed chwilą ktoś zajął. Wybierz inny.'; V.slot = null; return render(false); }
      const w = modyfikuj((D, r) => (K.zmianaPacjenta(D, r).ok ? (K.przelozPacjent(D, r, { data: slot.data, od: slot.od, terap: slot.osoby[0].id }) ? { ok: true } : { blad: 'zajete' }) : { blad: 'za-pozno' }));
      if (w.ok) { V.wynik = 'przelozona'; return idz('gotowe'); }
      V.blad = w.blad === 'za-pozno' ? 'Do wizyty zostało już za mało czasu, żeby zmienić ją tutaj. Zadzwoń do gabinetu.' : 'Ten termin przed chwilą ktoś zajął. Wybierz inny.';
      V.slot = null;
      return render(false);
    }
    if (a === 'potwierdz-odwolaj') {
      const powod = (app.querySelector('input[name="powod"]:checked') || { value: '' }).value;
      const w = modyfikuj((D, r) => (K.zmianaPacjenta(D, r).ok ? (K.odwolajPacjent(D, r, powod), { ok: true }) : { blad: 'za-pozno' }));
      if (w.ok) { V.wynik = 'odwolana'; return idz('gotowe'); }
      V.blad = 'Do wizyty zostało już za mało czasu, żeby odwołać ją tutaj. Zadzwoń do gabinetu.';
      return render(false);
    }
  });
  app.addEventListener('change', (e) => {
    if (e.target.id === 'terap') { V.terap = e.target.value; V.slot = null; V.dzien = ''; render(false); }
    if (e.target.name === 'powod') V.powod = e.target.value;
  });
  document.getElementById('demo-cofnij').addEventListener('click', () => {
    modyfikuj((D, r) => {
      if (!r.zmiana) return null;
      if (r.zmiana.typ === 'odwolana') { r.status = 'potwierdzona'; delete r.powod; delete r.pozno; delete r.odwolano; } else Object.assign(r, r.zmiana.bylo, { lok: K.lok(D, r.zmiana.bylo.terap, r.zmiana.bylo.data, r.zmiana.bylo.od) });
      delete r.zmiana;
      if (r.zmiany) r.zmiany.pop();
      return null;
    });
    V.ekran = 'wizyta'; V.wynik = null;
    render();
  });
  window.addEventListener('storage', (e) => { if (e.key === KLUCZ && V.ekran === 'wizyta') render(false); });

  render(false);
})();
