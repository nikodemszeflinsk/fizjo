/*
 * Panel — dostępność.
 *
 * Jedna strona, od góry do dołu:
 *   1. Godziny przyjęć w tygodniu: każdy dzień to jeden wiersz z przełącznikiem i godzinami od–do.
 *   2. Urlopy i dni wolne, święta.
 *   3. Zasady rezerwacji online (jak wcześnie i jak daleko pacjent może rezerwować).
 * Obok widać, jakie terminy zobaczy pacjent. Każdą zmianę można cofnąć.
 * Pojedyncze godziny (jednorazowo) zmienia się w Kalendarzu, w trybie „Zmień dostępność”.
 */
(() => {
  'use strict';

  const K = window.KAL;
  const P = window.PANEL;
  const esc = P.esc;
  const DNI = K.DNI_PRACY;
  const NAZWY = { 1: 'Poniedziałek', 2: 'Wtorek', 3: 'Środa', 4: 'Czwartek', 5: 'Piątek', 6: 'Sobota' };
  const godzTekst = K.godzTekst;

  const GF = { osoba: null };
  P.GF = GF;

  /* ── Dane ───────────────────────────────────────────────────────────── */
  const osoba = () => {
    const D = P.D();
    if (!P.ent()) return D.zespol[0];
    return D.zespol.find((t) => t.id === GF.osoba) || D.zespol[0];
  };
  const przedzialy = (D, terap, dz) => (((D.reguly[terap] || {})[dz]) || []).slice().sort((a, b) => a.od - b.od);
  const kolorLok = (id) => K.kolor(K.miejsce(P.D(), id).kolor);
  const ileLok = () => P.D().miejsca.length;
  const lacznie = (D, terap) => DNI.reduce((s, dz) => s + przedzialy(D, terap, dz).reduce((x, r) => x + (r.do - r.od), 0), 0);

  /** Zapis zmiany grafiku przez kalendarz: z komunikatem i cofaniem. Sąsiadujące godziny w tym samym miejscu scalamy. */
  function zmienGrafik(tekst, fn) {
    P.zmienRez(tekst, (D) => {
      fn(D.reguly, D);
      Object.keys(D.reguly).forEach((t) => Object.keys(D.reguly[t]).forEach((dz) => {
        const rr = D.reguly[t][dz];
        if (!rr.length) { delete D.reguly[t][dz]; return; }
        rr.sort((a, b) => a.od - b.od);
        const w = [];
        for (const r of rr) {
          const o = w[w.length - 1];
          if (o && o.lok === r.lok && r.od <= o.do) o.do = Math.max(o.do, r.do);
          else w.push({ od: r.od, do: r.do, lok: r.lok });
        }
        D.reguly[t][dz] = w;
      }));
    });
  }
  /** Nie można być w dwóch miejscach naraz: przedział nachodzący na godziny w innym miejscu. */
  const kolizja = (lista, od, doo, lok, pomin = -1) => lista.find((r, i) => i !== pomin && r.od < doo && r.do > od && r.lok !== lok) || null;
  const otwarcie = (lok, dz) => { const m = K.miejsce(P.D(), lok); return m.otwarcie ? m.otwarcie[dz] || null : null; };
  const poza = (r, dz) => { const o = otwarcie(r.lok, dz); return P.D().miejsca.some((m) => m.otwarcie) && (!o || r.od < o[0] || r.do > o[1]); };
  const domyslneMiejsce = (D, terap) => {
    for (const dz of DNI) { const l = przedzialy(D, terap, dz); if (l.length) return l[0].lok; }
    return D.miejsca[0].id;
  };

  /* ── Tydzień: wiersze dni ───────────────────────────────────────────── */
  function ostrzezenia(lista, dz) {
    const w = [];
    lista.forEach((r, i) => {
      if (poza(r, dz)) {
        const o = otwarcie(r.lok, dz);
        w.push(o ? `${K.godz(r.od)}–${K.godz(r.do)} wychodzi poza godziny otwarcia miejsca (${K.godz(o[0])}–${K.godz(o[1])}).` : `${K.miejsce(P.D(), r.lok).nazwa} jest tego dnia zamknięte.`);
      }
      const n = lista[i + 1];
      if (n && n.lok !== r.lok && n.od - r.do < 30) w.push(`Tylko ${n.od - r.do} min na dojazd między miejscami.`);
    });
    return w;
  }
  function wiersz(t, dz) {
    const D = P.D();
    const lista = przedzialy(D, t.id, dz);
    const suma = lista.reduce((s, r) => s + (r.do - r.od), 0);
    const baza = `dz-${t.id}-${dz}`;
    const przel = `<div class="p-sw"><input type="checkbox" role="switch" id="${baza}-wl" data-pzm="gf-dzien-wl" data-terap="${t.id}" data-dz="${dz}"${lista.length ? ' checked' : ''} /><label for="${baza}-wl"><span class="p-sw__tor" aria-hidden="true"></span><span class="p-sw__tekst">${NAZWY[dz]}</span></label></div>`;
    const zakresy = lista.map((r, i) => `<div class="dz-zakres">
        <label class="dz-cz"><span>od</span><input type="time" step="900" id="${baza}-${i}-od" value="${K.godz2(r.od)}" data-pzm="gf-czas" data-pole="od" data-terap="${t.id}" data-dz="${dz}" data-i="${i}" aria-label="${NAZWY[dz]}, początek przyjęć" /></label>
        <label class="dz-cz"><span>do</span><input type="time" step="900" id="${baza}-${i}-do" value="${K.godz2(r.do)}" data-pzm="gf-czas" data-pole="do" data-terap="${t.id}" data-dz="${dz}" data-i="${i}" aria-label="${NAZWY[dz]}, koniec przyjęć" /></label>
        ${ileLok() > 1 ? `<label class="dz-cz dz-cz--miejsce"><span class="visually-hidden">Miejsce</span><i class="dz-kropka" style="background:${kolorLok(r.lok)}"></i><select id="${baza}-${i}-m" data-pzm="gf-miejsce" data-terap="${t.id}" data-dz="${dz}" data-i="${i}" aria-label="${NAZWY[dz]}, miejsce przyjęć">${D.miejsca.map((m) => `<option value="${m.id}"${m.id === r.lok ? ' selected' : ''}>${esc(m.kr || m.nazwa)}</option>`).join('')}</select></label>` : ''}
        <button type="button" class="p-btn p-btn--ikona p-btn--cichy p-btn--maly" data-pa="gf-usun" data-terap="${t.id}" data-dz="${dz}" data-i="${i}" aria-label="Usuń godziny ${K.godz(r.od)}–${K.godz(r.do)}">${P.ikona('kosz')}</button>
      </div>`).join('');
    const ost = ostrzezenia(lista, dz).map((x) => `<p class="dz-ost">${P.ikona('uwaga')}<span>${esc(x)}</span></p>`).join('');
    return `<div class="dz-w${lista.length ? '' : ' dz-w--wolne'}">
      <div class="dz-dzien">${przel}</div>
      <div class="dz-tresc">
        ${lista.length ? `${zakresy}<div class="dz-akcje"><button type="button" class="p-btn p-btn--tekst p-btn--maly" data-pa="gf-dodaj" data-terap="${t.id}" data-dz="${dz}">${P.ikona('plus')}<span>${lista.length > 1 ? 'Kolejne godziny' : 'Przerwa i drugie godziny'}</span></button><button type="button" class="p-btn p-btn--tekst p-btn--maly" data-pa="gf-kopiuj" data-terap="${t.id}" data-dz="${dz}">${P.ikona('kopiuj')}<span>Skopiuj na inne dni</span></button></div>${ost}` : '<p class="dz-wolne">Nie przyjmujesz. Włącz przełącznik, żeby dodać godziny.</p>'}
      </div>
      <div class="dz-suma">${suma ? godzTekst(suma) : '–'}</div>
    </div>`;
  }
  /** Wiersz nad tygodniem: kto (tylko Enterprise) oraz szybkie ustawienia. */
  function pasekNarzedzi() {
    const D = P.D();
    const t = osoba();
    const inni = D.zespol.filter((x) => x.id !== t.id);
    const szybko = `<label class="wybor wybor--maly"><span class="visually-hidden">Ustaw szybko</span><select data-pzm="gf-szybko" data-terap="${t.id}"><option value="">Ustaw szybko…</option><option value="8-16">Pn–Pt 8:00–16:00</option><option value="9-17">Pn–Pt 9:00–17:00</option><option value="2zm">Pn–Pt dwie zmiany: 8–12 i 15–19</option><option value="pusty">Wyczyść cały tydzień</option></select></label>`;
    const kopiuj = P.ent() ? `<label class="wybor wybor--maly"><span class="visually-hidden">Skopiuj grafik od</span><select data-pzm="gf-kopiuj-od" data-terap="${t.id}"><option value="">Skopiuj grafik od…</option>${inni.map((x) => `<option value="${x.id}">${esc(P.osobaNazwa(x))}</option>`).join('')}</select></label>` : '';
    const osoby = P.ent() ? `<div class="p-filtry" role="group" aria-label="Czyj grafik ustawiasz">${D.zespol.map((x) => `<button type="button" class="p-chip" data-pa="gf-osoba" data-id="${x.id}" aria-pressed="${x.id === t.id}"><span class="p-osoba__av" style="background:${K.kolor(x.kolor)}">${P.inicjaly(x.nazwa)}</span>${esc(P.osobaNazwa(x))}</button>`).join('')}</div>` : '';
    return `<div class="dz-osoby">${osoby}<span class="dz-osoby__narz">${szybko}${kopiuj}</span></div>`;
  }
  function kartaTygodnia() {
    const D = P.D();
    const t = osoba();
    const naLok = {};
    DNI.forEach((dz) => przedzialy(D, t.id, dz).forEach((r) => { naLok[r.lok] = (naLok[r.lok] || 0) + (r.do - r.od); }));
    const razem = lacznie(D, t.id);
    return P.karta(P.ent() ? `Godziny przyjęć: ${esc(P.osobaNazwa(t))}` : 'Godziny przyjęć w tygodniu',
      `${pasekNarzedzi()}<div class="dz-tydzien">${DNI.map((dz) => wiersz(t, dz)).join('')}</div>
      <p class="dz-razem">Razem: <b>${godzTekst(razem)}</b> w tygodniu${ileLok() > 1 ? ' · ' + Object.entries(naLok).map(([l, m]) => `<span class="dz-kropka" style="background:${kolorLok(l)}"></span> ${esc(K.miejsce(D, l).kr || K.miejsce(D, l).nazwa)} ${godzTekst(m)}`).join(' · ') : ''}</p>`,
      { pod: 'Włącz dni, w które przyjmujesz, i ustaw godziny. Pacjent zobaczy tylko te godziny, a zajęte znikną z listy.' });
  }

  /* ── Akcje: godziny w tygodniu ──────────────────────────────────────── */
  P.akcje['gf-osoba'] = (b) => { GF.osoba = b.dataset.id; P.odswiez(); };
  P.akcje['gf-dzien-wl'] = (t) => {
    const terap = t.dataset.terap;
    const dz = Number(t.dataset.dz);
    if (!t.checked) { zmienGrafik(`${NAZWY[dz]}: nie przyjmujesz`, (R) => { if (R[terap]) delete R[terap][dz]; }); return; }
    const D = P.D();
    const lok = domyslneMiejsce(D, terap);
    /* Nowy dzień dostaje godziny najbliższego dnia, który już masz ustawiony, a jeśli nie ma żadnego: 9:00–17:00. */
    const wzor = DNI.map((x) => przedzialy(D, terap, x)).filter((l) => l.length)[0];
    zmienGrafik(`${NAZWY[dz]}: przyjmujesz`, (R) => {
      const o = R[terap] || (R[terap] = {});
      o[dz] = wzor ? JSON.parse(JSON.stringify(wzor)) : [{ od: K.zH('9:00'), do: K.zH('17:00'), lok }];
    });
  };
  P.akcje['gf-czas'] = (t) => {
    const terap = t.dataset.terap;
    const dz = Number(t.dataset.dz);
    const i = Number(t.dataset.i);
    const D = P.D();
    const lista = przedzialy(D, terap, dz);
    const r = lista[i];
    if (!r || !t.value) { P.odswiez(); return; }
    const nowy = { od: r.od, do: r.do };
    nowy[t.dataset.pole] = K.zH(t.value);
    let blad = '';
    if (nowy.do <= nowy.od) blad = 'Koniec przyjęć musi być później niż początek.';
    else if (nowy.od < K.START || nowy.do > K.END) blad = `Kalendarz obejmuje godziny ${K.godz(K.START)}–${K.godz(K.END)}.`;
    else if (kolizja(lista, nowy.od, nowy.do, r.lok, i)) blad = 'W tym czasie przyjmujesz w innym miejscu.';
    if (blad) { window.KAL_UI.toast(blad); P.odswiez(); return; }
    zmienGrafik(`${NAZWY[dz]}: ${K.godz(nowy.od)}–${K.godz(nowy.do)}`, (R) => { Object.assign(R[terap][dz].slice().sort((a, b) => a.od - b.od)[i], nowy); });
  };
  P.akcje['gf-miejsce'] = (t) => {
    const terap = t.dataset.terap;
    const dz = Number(t.dataset.dz);
    const i = Number(t.dataset.i);
    const lista = przedzialy(P.D(), terap, dz);
    const r = lista[i];
    if (!r) return;
    if (kolizja(lista, r.od, r.do, t.value, i)) { window.KAL_UI.toast('W tym czasie przyjmujesz w innym miejscu.'); P.odswiez(); return; }
    zmienGrafik(`${NAZWY[dz]}: ${K.godz(r.od)}–${K.godz(r.do)}, ${K.miejsce(P.D(), t.value).nazwa}`, (R) => { R[terap][dz].slice().sort((a, b) => a.od - b.od)[i].lok = t.value; });
  };
  P.akcje['gf-usun'] = (b) => {
    const { terap, i } = b.dataset;
    const dz = Number(b.dataset.dz);
    zmienGrafik(`${NAZWY[dz]}: usunięto godziny`, (R) => { const l = R[terap][dz].slice().sort((a, c) => a.od - c.od); l.splice(Number(i), 1); R[terap][dz] = l; });
  };
  P.akcje['gf-dodaj'] = (b) => {
    const { terap } = b.dataset;
    const dz = Number(b.dataset.dz);
    const lista = przedzialy(P.D(), terap, dz);
    const ost = lista[lista.length - 1];
    const od = ost ? ost.do + 60 : K.zH('9:00');
    if (od > K.END - 60) { window.KAL_UI.toast(`Po ${K.godz(ost.do)} nie ma już miejsca w kalendarzu.`); return; }
    const doo = Math.min(od + 180, K.END);
    zmienGrafik(`${NAZWY[dz]}: dodano godziny ${K.godz(od)}–${K.godz(doo)}`, (R) => { R[terap][dz].push({ od, do: doo, lok: ost ? ost.lok : P.D().miejsca[0].id }); });
  };
  P.akcje['gf-kopiuj'] = (b) => {
    const { terap } = b.dataset;
    const zr = Number(b.dataset.dz);
    P.otworz(() => `${P.naglowek(`Skopiuj: ${NAZWY[zr].toLowerCase()}`, `${przedzialy(P.D(), terap, zr).map((r) => `${K.godz(r.od)}–${K.godz(r.do)}`).join(', ')}. Wybierz dni, które mają mieć te same godziny.`)}
      <div class="formularz">
        <div class="gf__dni dz-dni">${DNI.filter((x) => x !== zr).map((x) => `<label><input type="checkbox" data-gf-kopia="${x}"${x <= 5 ? ' checked' : ''} /> ${NAZWY[x]}</label>`).join('')}</div>
        <p class="pod">Godziny w zaznaczonych dniach zostaną zastąpione. Możesz to cofnąć.</p>
      </div>
      <footer class="sz__st"><button type="button" class="przycisk przycisk--cichy" data-pa="zamknij">Anuluj</button><button type="button" class="przycisk" data-pa="gf-kopiuj-ok" data-terap="${terap}" data-dz="${zr}">Skopiuj</button></footer>`);
  };
  P.akcje['gf-kopiuj-ok'] = (b) => {
    const { terap } = b.dataset;
    const zr = Number(b.dataset.dz);
    const cele = [...document.querySelectorAll('[data-gf-kopia]:checked')].map((x) => Number(x.dataset.gfKopia));
    if (!cele.length) { window.KAL_UI.toast('Zaznacz przynajmniej jeden dzień.'); return; }
    P.zamknij(false);
    zmienGrafik(`Skopiowano ${NAZWY[zr].toLowerCase()} na ${cele.length} ${cele.length === 1 ? 'dzień' : 'dni'}`, (R) => {
      const wzor = JSON.parse(JSON.stringify(R[terap][zr]));
      cele.forEach((x) => { R[terap][x] = JSON.parse(JSON.stringify(wzor)); });
    });
  };
  P.akcje['gf-szybko'] = (t) => {
    const v = t.value;
    if (!v) return;
    const terap = t.dataset.terap;
    const lok = domyslneMiejsce(P.D(), terap);
    const r = (a, b) => ({ od: K.zH(a), do: K.zH(b), lok });
    zmienGrafik(v === 'pusty' ? 'Wyczyszczono tydzień' : 'Ustawiono godziny na cały tydzień roboczy', (R) => {
      R[terap] = {};
      if (v !== 'pusty') [1, 2, 3, 4, 5].forEach((dz) => { R[terap][dz] = v === '8-16' ? [r('8:00', '16:00')] : v === '9-17' ? [r('9:00', '17:00')] : [r('8:00', '12:00'), r('15:00', '19:00')]; });
    });
  };
  P.akcje['gf-kopiuj-od'] = (t) => {
    if (!t.value) return;
    const zr = K.terap(P.D(), t.value);
    zmienGrafik(`Skopiowano grafik od: ${P.osobaNazwa(zr)}`, (R) => { R[t.dataset.terap] = JSON.parse(JSON.stringify(R[t.value] || {})); });
  };

  /* ── Urlopy i dni wolne ─────────────────────────────────────────────── */
  function wolneLista() {
    const D = P.D();
    const dzis = K.dzisIso();
    const el = [];
    D.blokady.filter((b) => b.do >= dzis).forEach((b) => {
      let wiz = 0;
      for (let d = b.od < dzis ? dzis : b.od, n = 0; d <= b.do && n < 120; n++, d = K.iso(K.dodaj(K.zIso(d), 1))) wiz += K.wizytyWPrzedziale(D, b.terap, d, b.odMin == null ? K.START : b.odMin, b.doMin == null ? K.END : b.doMin).filter((r) => !K.minelo(r.data, r.od)).length;
      el.push({ data: b.od, typ: 'blokada', b, wiz });
    });
    const grupy = new Map();
    D.wyjatki.filter((w) => w.data >= dzis).forEach((w) => {
      const k = `${w.terap}|${w.data}`;
      const g = grupy.get(k) || { data: w.data, typ: 'wyjatek', terap: w.terap, otw: [], zam: [] };
      (w.typ === 'open' ? g.otw : g.zam).push(w);
      grupy.set(k, g);
    });
    el.push(...grupy.values());
    return el.sort((a, b) => a.data.localeCompare(b.data));
  }
  function kartaWolne() {
    const D = P.D();
    const kto = (id) => (P.ent() ? ` · ${id === '*' ? 'cały gabinet' : esc(P.osobaNazwa(K.terap(D, id)))}` : '');
    const wiersze = wolneLista().map((x) => {
      const d = K.zIso(x.data);
      const data = `<div class="gf-zm__data">${d.getDate()} ${K.MIES[d.getMonth()].slice(0, 3)}<small>${K.DNI[d.getDay()]}</small></div>`;
      if (x.typ === 'blokada') {
        const b = x.b;
        const ile = K.dniMiedzy(b.od, b.do) + 1;
        return `<div class="gf-zm">${data}<div class="gf-zm__opis"><b>${esc(b.powod)}</b><small>${ile > 1 ? `do ${esc(P.dataKrotka(b.do))} (${ile} dni)` : 'jeden dzień'} · ${b.odMin == null ? 'cały dzień' : K.czas(b.odMin, b.doMin - b.odMin)}${kto(b.terap)}${x.wiz ? ` · <b style="color:var(--warn)">${x.wiz} ${x.wiz === 1 ? 'wizyta do przełożenia' : 'wizyty do przełożenia'}</b>` : ''}</small></div><div class="p-karta__akcje"><button type="button" class="p-btn p-btn--maly p-btn--cichy" data-pa="gf-blokada" data-id="${b.id}">Zmień</button><button type="button" class="p-btn p-btn--maly p-btn--cichy p-btn--ostrzez" data-pa="gf-usun-blokade" data-id="${b.id}">Usuń</button></div></div>`;
      }
      const opis = [...x.otw.map((w) => `dodatkowo ${K.czas(w.od, w.do - w.od)}${w.lok && ileLok() > 1 ? ` (${esc(K.miejsce(D, w.lok).kr || K.miejsce(D, w.lok).nazwa)})` : ''}`), ...x.zam.map((w) => `zamknięte ${K.czas(w.od, w.do - w.od)}`)].join(', ');
      return `<div class="gf-zm">${data}<div class="gf-zm__opis"><b>${opis}</b><small>zmiana tylko tego dnia${kto(x.terap)}</small></div><div class="p-karta__akcje"><button type="button" class="p-btn p-btn--maly p-btn--cichy" data-pa="gf-pokaz" data-terap="${x.terap}" data-data="${x.data}">W kalendarzu</button><button type="button" class="p-btn p-btn--maly p-btn--cichy p-btn--ostrzez" data-pa="gf-usun-wyjatek" data-terap="${x.terap}" data-data="${x.data}">Przywróć grafik</button></div></div>`;
    }).join('');
    return P.karta('Urlopy i dni wolne', wiersze || P.pusto('Brak zaplanowanych wolnych dni. Wszystko działa według godzin z góry.'),
      { pod: 'Urlop, szkolenie albo jeden dzień wolny. Pacjent nie zobaczy wtedy terminów, a wizyty, które już są, pokażemy do przełożenia.', akcje: `<button type="button" class="p-btn p-btn--akcent" data-pa="gf-blokada">${P.ikona('plus')}<span>Dodaj urlop lub dzień wolny</span></button>` });
  }
  P.akcje['gf-blokada'] = (b) => { P.zamknij(false); window.KAL_UI.blokada(b.dataset.id ? { id: b.dataset.id } : { terap: osoba().id }); };
  P.akcje['gf-usun-blokade'] = (b) => { const bl = P.D().blokady.find((x) => x.id === b.dataset.id); P.zmienRez(`Usunięto: ${bl ? bl.powod : 'blokadę'}`, (D) => { D.blokady = D.blokady.filter((x) => x.id !== b.dataset.id); }); };
  P.akcje['gf-usun-wyjatek'] = (b) => P.zmienRez(`Przywrócono grafik: ${P.dataKrotka(b.dataset.data)}`, (D) => { D.wyjatki = D.wyjatki.filter((w) => !(w.terap === b.dataset.terap && w.data === b.dataset.data)); });
  P.akcje['gf-pokaz'] = (b) => { P.idz('kalendarz'); setTimeout(() => window.KAL_UI.idzDo(b.dataset.terap, b.dataset.data, P.ent() ? 'dzien' : 'tydzien'), 30); };

  /* ── Święta ─────────────────────────────────────────────────────────── */
  function kartaSwieta() {
    const D = P.D();
    const dzis = K.dzisIso();
    const rok = new Date().getFullYear();
    const lista = [];
    [rok, rok + 1].forEach((y) => K.swieta(y).forEach((n, d) => { if (d >= dzis && K.zIso(d).getDay() !== 0) lista.push([d, n]); }));
    lista.sort((a, b) => a[0].localeCompare(b[0]));
    const wl = D.ustawienia.swietaZamkniete !== false;
    const nast = lista.slice(0, 3).map(([d, n]) => `${esc(P.dataKrotka(d))} (${esc(n)})`).join(', ');
    return P.karta('Święta', `<div class="p-formularz">${P.przelacznik({ etykieta: 'Nie przyjmuję w dni ustawowo wolne od pracy', pf: 'rez:ustawienia.swietaZamkniete', wartosc: wl, pod: wl ? `Pacjent nie zobaczy wtedy terminów. Najbliższe: ${nast}.` : 'Terminy w święta są dostępne według godzin przyjęć.' })}</div>`);
  }

  /* ── Zasady rezerwacji online ───────────────────────────────────────── */
  function kartaZasady() {
    const U = P.D().ustawienia;
    const rez = (s) => `rez:ustawienia.${s}`;
    return P.karta('Zasady rezerwacji online', `<div class="p-formularz"><div class="pola2">
        ${P.wybor({ etykieta: 'Najwcześniej za', pf: rez('wyprzedzenie'), wartosc: U.wyprzedzenie, opcje: [[0, 'od razu'], [1, '1 godzinę'], [2, '2 godziny'], [4, '4 godziny'], [12, '12 godzin'], [24, '24 godziny'], [48, '2 dni']], atr: 'data-typ="liczba"', pod: 'Pacjent nie zarezerwuje bliższego terminu, więc nie zaskoczy Cię rano.' })}
        ${P.wybor({ etykieta: 'Najdalej na', pf: rez('horyzont'), wartosc: U.horyzont, opcje: [[14, '2 tygodnie'], [30, '30 dni'], [60, '60 dni'], [90, '90 dni'], [180, 'pół roku']], atr: 'data-typ="liczba"' })}
        ${P.wybor({ etykieta: 'Przerwa po wizycie', pf: rez('bufor'), wartosc: U.bufor, opcje: [[0, 'bez przerwy'], [5, '5 min'], [10, '10 min'], [15, '15 min'], [30, '30 min']], atr: 'data-typ="liczba"', pod: 'Czas na notatki i przygotowanie gabinetu.' })}
        ${P.wybor({ etykieta: 'Potwierdzanie wizyt', pf: rez('auto'), wartosc: U.auto ? '1' : '0', opcje: [['1', 'Automatyczne'], ['0', 'Ręcznie przez gabinet']], atr: 'data-typ="bool"', pod: 'Przy ręcznym wizyty czekają na Twoje „Potwierdź” na pulpicie.' })}
      </div>
      ${P.przelacznik({ etykieta: 'Pacjent może sam zmienić albo odwołać wizytę', pf: rez('pacjentZmiany'), wartosc: U.pacjentZmiany !== false, pod: 'Dostaje link w e-mailu z potwierdzeniem i przypomnieniem. Bez konta, bez logowania i bez pytania o zdrowie.' })}
      ${U.pacjentZmiany !== false ? P.wybor({ etykieta: 'Pacjent może to zrobić najpóźniej', pf: rez('pacjentGodz'), wartosc: U.pacjentGodz == null ? 24 : U.pacjentGodz, opcje: [[2, '2 godziny przed wizytą'], [12, '12 godzin przed'], [24, 'dzień przed (24 godziny)'], [48, '2 dni przed']], atr: 'data-typ="liczba"', pod: 'Później pacjent zobaczy numer do gabinetu. Dzięki temu nie dostajesz odwołań w ostatniej chwili.' }) : ''}
      ${P.ent() ? `${P.przelacznik({ etykieta: 'Pacjent może wybrać terapeutę', pf: rez('wyborTerapeuty'), wartosc: U.wyborTerapeuty })}${U.wyborTerapeuty ? P.przelacznik({ etykieta: 'Pokaż opcję „Pierwszy wolny termin”', pf: rez('pierwszyWolny'), wartosc: U.pierwszyWolny }) : ''}` : ''}
      </div>`);
  }

  /* ── Co zobaczy pacjent ─────────────────────────────────────────────── */
  function podglad() {
    const D = P.D();
    const t = osoba();
    const usl = (t.uslugi && t.uslugi[0]) || D.uslugi[0].id;
    const terminy = K.terminyPacjenta(D, usl, { ile: 6, terap: P.ent() ? t.id : null });
    return `<aside class="dz-podglad" aria-label="Co zobaczy pacjent"><p class="dz-podglad__et">Co zobaczy pacjent</p>
      <p class="dz-podglad__tyt">${terminy.length ? `Najbliższe wolne terminy${P.ent() ? `: ${esc(P.osobaNazwa(t))}` : ''}` : 'Brak wolnych terminów'}</p>
      ${terminy.length ? `<ul>${terminy.map((x) => `<li><b>${esc(K.wzgledna(x.data))}, ${K.godz(x.od)}</b>${ileLok() > 1 ? `<small><i class="dz-kropka" style="background:${kolorLok(x.lok)}"></i>${esc(K.miejsce(D, x.lok).kr || K.miejsce(D, x.lok).nazwa)}</small>` : ''}</li>`).join('')}</ul>` : '<p class="p-podp">Włącz dni i ustaw godziny, a terminy pojawią się tutaj.</p>'}
      <p class="p-podp">Lista zmienia się razem z Twoimi ustawieniami. Zajęte godziny są pomijane.</p>
    </aside>`;
  }

  /* ── Widok ─────────────────────────────────────────────────────────── */
  P.widoki.dostepnosc = {
    tytul: 'Dostępność',
    podtytul: () => (P.ent() ? 'Kiedy przyjmuje każdy terapeut. Pacjent widzi tylko wolne terminy.' : 'Kiedy przyjmujesz. Pacjent widzi tylko wolne terminy.'),
    render() {
      if (!P.D().zespol.some((t) => t.id === GF.osoba)) GF.osoba = P.D().zespol[0].id;
      return `<div class="dz">
        <div class="dz__glowna p-stos">${kartaTygodnia()}${kartaWolne()}${kartaSwieta()}${kartaZasady()}
          <p class="p-podp">Jedną godzinę albo jeden dzień zmienisz szybciej w <a href="#/kalendarz">Kalendarzu</a>: przycisk „Zmień dostępność”.</p></div>
        ${podglad()}
      </div>`;
    },
    naZmiane() { P.odswiez(); },
  };

  /* Zmiana grafiku zaplanowana na datę, która już minęła, staje się obecnym grafikiem (zostało z poprzednich wersji danych). */
  const stareUzupelnij = P.uzupelnij;
  P.uzupelnij = (D, tryb) => {
    stareUzupelnij(D, tryb);
    const dzis = K.dzisIso();
    const minione = (D.zmianyGrafiku || []).filter((z) => z.od <= dzis).sort((a, b) => a.od.localeCompare(b.od));
    if (minione.length) {
      D.reguly = minione[minione.length - 1].reguly;
      D.zmianyGrafiku = D.zmianyGrafiku.filter((z) => z.od > dzis);
    }
  };
})();
