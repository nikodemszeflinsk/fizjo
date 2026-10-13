/*
 * Panel — dostępność.
 *
 * Stały grafik to oś czasu: każdy terapeuta, każdy dzień, paski godzin w kolorze lokalizacji.
 * Pasek rysujesz przeciągnięciem po pustym torze, przesuwasz go albo rozciągasz za krawędź,
 * a kliknięcie otwiera dokładne ustawienia. Do tego zaplanowane zmiany grafiku od wybranej daty,
 * jednorazowe zmiany i urlopy oraz święta. Każdą zmianę można cofnąć.
 */
(() => {
  'use strict';

  const K = window.KAL;
  const P = window.PANEL;
  const esc = P.esc;
  const ZAKRES = K.END - K.START;
  const DNI = K.DNI_PRACY;
  const DNI_KR = { 1: 'Pn', 2: 'Wt', 3: 'Śr', 4: 'Cz', 5: 'Pt', 6: 'Sb' };
  const NAZWY = { 1: 'poniedziałek', 2: 'wtorek', 3: 'środa', 4: 'czwartek', 5: 'piątek', 6: 'sobota' };
  const proc = (min) => ((min - K.START) / ZAKRES) * 100;
  const snap = (min) => Math.round(min / 15) * 15;
  const godzTekst = K.godzTekst;

  const GF = { tab: 'staly', wersja: null, lok: '', pedzelLok: null, dymek: null };
  P.GF = GF;

  /* ── Dane: który grafik edytujemy ───────────────────────────────────── */
  const wersja = () => (GF.wersja ? (P.D().zmianyGrafiku || []).find((z) => z.id === GF.wersja) || null : null);
  const tabela = (D) => { const w = GF.wersja ? (D.zmianyGrafiku || []).find((z) => z.id === GF.wersja) : null; return w ? w.reguly : D.reguly; };
  const przedzialyOsoby = (D, terap, dz) => ((tabela(D)[terap] || {})[dz] || []).slice().sort((a, b) => a.od - b.od);
  const osobyGrafiku = () => {
    const D = P.D();
    const lista = P.ent() ? D.zespol : [D.zespol[0]];
    return P.filtrOsob ? lista.filter((t) => P.filtrOsob.includes(t.id)) : lista;
  };
  const kolorLok = (id) => K.kolor(K.miejsce(P.D(), id).kolor);
  const ileLok = () => P.D().miejsca.length;

  /** Zapis zmiany w grafiku: przez kalendarz, z komunikatem i cofaniem. */
  function zmienGrafik(tekst, fn) {
    GF.dymek = null;
    P.zmienRez(tekst, (D) => {
      const tab = tabela(D);
      fn(tab, D);
      Object.keys(tab).forEach((t) => Object.keys(tab[t]).forEach((dz) => {
        const rr = tab[t][dz];
        if (!rr.length) { delete tab[t][dz]; return; }
        /* Scalamy sąsiadujące przedziały w tym samym miejscu. */
        rr.sort((a, b) => a.od - b.od);
        const w = [];
        for (const r of rr) {
          const o = w[w.length - 1];
          if (o && o.lok === r.lok && r.od <= o.do) o.do = Math.max(o.do, r.do);
          else w.push({ od: r.od, do: r.do, lok: r.lok });
        }
        tab[t][dz] = w;
      }));
    });
  }
  /** Czy nowy przedział koliduje z godzinami w innym miejscu (nie można być w dwóch miejscach naraz). */
  function kolizja(lista, od, doo, lok, pomin = -1) {
    return lista.find((r, i) => i !== pomin && r.od < doo && r.do > od && r.lok !== lok) || null;
  }
  /** Godziny otwarcia lokalizacji danego dnia: [od, do] albo null (zamknięte). */
  const otwarcie = (lok, dz) => { const m = K.miejsce(P.D(), lok); return m.otwarcie ? m.otwarcie[dz] || null : null; };
  const pozaOtwarciem = (r, dz) => { const o = otwarcie(r.lok, dz); return P.D().miejsca.some((m) => m.otwarcie) && (!o || r.od < o[0] || r.do > o[1]); };

  /* ── Render: stały grafik ───────────────────────────────────────────── */
  function os() {
    let h = '';
    for (let m = K.START; m <= K.END; m += 60) h += `<span style="left:${proc(m)}%">${m / 60}</span>`;
    return `<div class="gf__os" aria-hidden="true"><span></span><div class="gf__os-skala">${h}</div><span></span></div>`;
  }
  function wiersz(t, dz) {
    const D = P.D();
    const lista = przedzialyOsoby(D, t.id, dz);
    const suma = lista.reduce((s, r) => s + (r.do - r.od), 0);
    const otw = GF.lok ? otwarcie(GF.lok, dz) : (ileLok() === 1 ? otwarcie(D.miejsca[0].id, dz) : null);
    let h = '';
    if (otw) h += `<span class="gf__otw" style="left:${proc(otw[0])}%;width:${proc(otw[1]) - proc(otw[0])}%" title="Godziny otwarcia: ${K.godz(otw[0])}–${K.godz(otw[1])}"></span>`;
    lista.forEach((r, i) => {
      const poza = pozaOtwarciem(r, dz);
      const wyc = GF.lok && r.lok !== GF.lok;
      const wybr = GF.dymek && GF.dymek.terap === t.id && Number(GF.dymek.dz) === dz && GF.dymek.i === i;
      const m = K.miejsce(D, r.lok);
      const etyk = `${K.godz(r.od)}–${K.godz(r.do)}${ileLok() > 1 ? ` · ${m.kr}` : ''}`;
      h += `<button type="button" class="gf__pas${poza ? ' gf__pas--poza' : ''}${wyc ? ' gf__pas--wyciszony' : ''}${wybr ? ' gf__pas--wybrany' : ''}" style="left:${proc(r.od)}%;width:${proc(r.do) - proc(r.od)}%;--c:${kolorLok(r.lok)}" data-gf-pas data-terap="${t.id}" data-dz="${dz}" data-i="${i}" aria-label="${esc(NAZWY[dz])}, ${etyk}${poza ? ', poza godzinami otwarcia' : ''}. Strzałki przesuwają, Shift ze strzałką zmienia koniec, Delete usuwa." title="${esc(etyk)}${poza ? ' · poza godzinami otwarcia lokalizacji' : ''}"><span class="gf__uchwyt gf__uchwyt--l" data-uchwyt="l"></span><span>${esc(etyk)}</span><span class="gf__uchwyt gf__uchwyt--p" data-uchwyt="p"></span></button>`;
      const nast = lista[i + 1];
      if (nast && nast.lok !== r.lok && nast.od - r.do < 30) h += `<span class="gf__dojazd" style="left:${proc(r.do)}%;width:${Math.max(0.6, proc(nast.od) - proc(r.do))}%" title="Tylko ${nast.od - r.do} min na dojazd między miejscami"></span>`;
    });
    return `<div class="gf__wiersz" data-terap="${t.id}" data-dz="${dz}">
      <div class="gf__dzien">${DNI_KR[dz]}<small>${lista.length ? '' : 'wolne'}</small>
        <button type="button" class="p-btn p-btn--ikona p-btn--cichy gf__menu" data-pa="gf-dzien" data-terap="${t.id}" data-dz="${dz}" aria-label="Opcje dnia: ${NAZWY[dz]}${P.ent() ? `, ${esc(t.nazwa)}` : ''}">⋯</button></div>
      <div class="gf__tor${lista.length ? '' : ' gf__tor--zamk'}" data-gf-tor data-terap="${t.id}" data-dz="${dz}">${h}</div>
      <div class="gf__suma">${suma ? godzTekst(suma) : '–'}</div>
    </div>`;
  }
  function blokOsoby(t) {
    const D = P.D();
    let suma = 0;
    const naLok = {};
    DNI.forEach((dz) => przedzialyOsoby(D, t.id, dz).forEach((r) => { suma += r.do - r.od; naLok[r.lok] = (naLok[r.lok] || 0) + (r.do - r.od); }));
    const inni = D.zespol.filter((x) => x.id !== t.id);
    return `<section class="gf__osoba" aria-label="Grafik: ${esc(t.nazwa)}">
      ${P.ent() ? `<div class="gf__osoba-g"><span class="p-osoba__av" style="background:${K.kolor(t.kolor)};width:34px;height:34px;font-size:0.78rem">${P.inicjaly(t.nazwa)}</span><div><b>${esc(t.nazwa)}</b><br /><small>${godzTekst(suma)} w tygodniu${t.online === false ? ' · nie przyjmuje rezerwacji online' : ''}</small></div>
        <div class="p-karta__akcje">
          <label class="wybor wybor--maly"><span class="visually-hidden">Skopiuj grafik od</span><select data-pzm="gf-kopiuj-od" data-terap="${t.id}"><option value="">Skopiuj grafik od…</option>${inni.map((x) => `<option value="${x.id}">${esc(x.nazwa)}</option>`).join('')}</select></label>
          <label class="wybor wybor--maly"><span class="visually-hidden">Szablon</span><select data-pzm="gf-szablon" data-terap="${t.id}"><option value="">Szablon…</option><option value="8-16">Pn–Pt 8–16</option><option value="9-17">Pn–Pt 9–17</option><option value="2zm">Dwie zmiany 8–12 i 15–19</option><option value="pusty">Wyczyść tydzień</option></select></label>
        </div></div>` : ''}
      ${DNI.map((dz) => wiersz(t, dz)).join('')}
      <div class="gf__osoba-stopka"><span>Razem: <b>${godzTekst(suma)}</b></span>${ileLok() > 1 ? Object.entries(naLok).map(([l, m]) => `<span><span class="p-kropka" style="background:${kolorLok(l)}"></span> ${esc(K.miejsce(D, l).kr)}: <b>${godzTekst(m)}</b></span>`).join('') : ''}${!P.ent() ? `<span style="margin-left:auto"><label class="wybor wybor--maly"><span class="visually-hidden">Szablon</span><select data-pzm="gf-szablon" data-terap="${t.id}"><option value="">Szablon tygodnia…</option><option value="8-16">Pn–Pt 8–16</option><option value="9-17">Pn–Pt 9–17</option><option value="2zm">Dwie zmiany 8–12 i 15–19</option><option value="pusty">Wyczyść tydzień</option></select></label></span>` : ''}</div>
    </section>`;
  }
  function paskiWersji() {
    const D = P.D();
    const zm = (D.zmianyGrafiku || []).slice().sort((a, b) => a.od.localeCompare(b.od));
    const pierwsza = zm[0];
    return `<div class="gf__wersje" role="group" aria-label="Który grafik edytujesz">
      <button type="button" class="gf__wersja" data-pa="gf-wersja" data-id="" aria-pressed="${!GF.wersja}">Obecny grafik${pierwsza ? `<small>do ${esc(P.dataKrotka(K.iso(K.dodaj(K.zIso(pierwsza.od), -1))))}</small>` : ''}</button>
      ${zm.map((z) => `<button type="button" class="gf__wersja" data-pa="gf-wersja" data-id="${z.id}" aria-pressed="${GF.wersja === z.id}">Od ${esc(P.dataKrotka(z.od))}<small>nowy grafik</small></button>`).join('')}
      <button type="button" class="p-btn p-btn--maly p-btn--cichy" data-pa="gf-nowa-wersja">${P.ikona('plus')}<span>Zaplanuj zmianę grafiku od dnia</span></button>
    </div>`;
  }
  function renderStaly() {
    const D = P.D();
    if (!GF.pedzelLok || !D.miejsca.some((m) => m.id === GF.pedzelLok)) GF.pedzelLok = D.miejsca[0].id;
    const w = wersja();
    const osoby = osobyGrafiku();
    let calosc = 0;
    const naLok = {};
    osoby.forEach((t) => DNI.forEach((dz) => przedzialyOsoby(D, t.id, dz).forEach((r) => { calosc += r.do - r.od; naLok[r.lok] = (naLok[r.lok] || 0) + (r.do - r.od); })));
    return `<div class="gf">
      ${paskiWersji()}
      ${w ? `<div class="p-ostrz p-ostrz--info">${P.ikona('uwaga')}<span>Edytujesz grafik, który zacznie obowiązywać <b>${esc(K.dlugaData(K.zIso(w.od)))}</b>. Do tego dnia pacjenci widzą obecne godziny. <button type="button" class="p-btn p-btn--tekst" data-pa="gf-usun-wersje" data-id="${w.id}">Usuń tę zmianę</button></span></div>` : ''}
      <div class="gf__pasek">
        ${ileLok() > 1 ? `<div class="p-filtry" role="group" aria-label="Pokaż miejsce"><button type="button" class="p-chip p-chip--bez" data-pa="gf-lok" data-id="" aria-pressed="${!GF.lok}">Wszystkie miejsca</button>${D.miejsca.map((m) => `<button type="button" class="p-chip" data-pa="gf-lok" data-id="${m.id}" aria-pressed="${GF.lok === m.id}"><i style="background:${kolorLok(m.id)}"> </i>${esc(m.kr)}</button>`).join('')}</div>` : ''}
        ${ileLok() > 1 ? `<label class="gf__pedzel">Nowe godziny w:<select data-pzm="gf-pedzel">${D.miejsca.map((m) => `<option value="${m.id}"${GF.pedzelLok === m.id ? ' selected' : ''}>${esc(m.kr)}</option>`).join('')}</select></label>` : ''}
        <p class="p-podp" style="margin-left:auto">W tygodniu: <b>${godzTekst(calosc)}</b>${ileLok() > 1 ? ' · ' + Object.entries(naLok).map(([l, m]) => `${esc(K.miejsce(D, l).kr)} ${godzTekst(m)}`).join(' · ') : ''}</p>
      </div>
      ${P.chipyZespolu()}
      <div class="gf__ramka" id="gf-ramka">
        <div class="gf__siatka" id="gf-siatka">
          <div class="gf__wew">
            ${os()}
            ${osoby.map(blokOsoby).join('')}
          </div>
        </div>
        ${GF.dymek ? dymek() : ''}
      </div>
      <p class="p-podp">Przeciągnij po pustym torze, żeby dodać godziny. Pasek przesuniesz chwytając go, a czas zmienisz, ciągnąc za krawędź. Kliknięcie otwiera dokładne godziny i kopiowanie na inne dni. ${ileLok() > 1 ? 'Kolor paska oznacza miejsce przyjęć, kreskowanie: poza godzinami otwarcia miejsca, przerywana linia: mało czasu na dojazd.' : ''}</p>
    </div>`;
  }

  /* ── Dymek: dokładne godziny, miejsce, kopiowanie ──────────────────── */
  function dymek() {
    const d = GF.dymek;
    const D = P.D();
    if (d.typ === 'dzien') {
      const lista = przedzialyOsoby(D, d.terap, d.dz);
      return `<div class="gf__dymek" id="gf-dymek" role="dialog" aria-label="Opcje dnia" style="left:${d.x}px;top:${d.y}px">
        <h3>${esc(NAZWY[d.dz])}${P.ent() ? ` · ${esc(P.osobaNazwa(K.terap(D, d.terap)))}` : ''}<button type="button" class="ikona ikona--mala" data-pa="gf-dymek-x" aria-label="Zamknij">×</button></h3>
        <button type="button" class="p-btn p-btn--cichy" data-pa="gf-dodaj" data-terap="${d.terap}" data-dz="${d.dz}">${P.ikona('plus')}<span>Dodaj godziny</span></button>
        ${lista.length ? `<button type="button" class="p-btn p-btn--cichy" data-pa="gf-kopiuj-dzien" data-terap="${d.terap}" data-dz="${d.dz}">${P.ikona('kopiuj')}<span>Skopiuj na pn–pt</span></button>
        <button type="button" class="p-btn p-btn--cichy p-btn--ostrzez" data-pa="gf-wyczysc-dzien" data-terap="${d.terap}" data-dz="${d.dz}">${P.ikona('kosz')}<span>Nie przyjmuję w ten dzień</span></button>` : ''}
      </div>`;
    }
    const lista = przedzialyOsoby(D, d.terap, d.dz);
    const r = d.nowy ? d.nowy : lista[d.i];
    if (!r) { GF.dymek = null; return ''; }
    return `<div class="gf__dymek" id="gf-dymek" role="dialog" aria-label="Godziny przyjęć" style="left:${d.x}px;top:${d.y}px">
      <h3>${d.nowy ? 'Nowe godziny' : 'Godziny przyjęć'} · ${esc(NAZWY[d.dz])}<button type="button" class="ikona ikona--mala" data-pa="gf-dymek-x" aria-label="Zamknij">×</button></h3>
      <div class="pola2">
        <div class="pole"><label for="gf-od">Od</label><input id="gf-od" type="time" step="900" value="${K.godz2(r.od)}" data-fokus /></div>
        <div class="pole"><label for="gf-do">Do</label><input id="gf-do" type="time" step="900" value="${K.godz2(r.do)}" /></div>
      </div>
      ${ileLok() > 1 ? `<div class="pole"><label for="gf-lok">Miejsce</label><select id="gf-lok">${D.miejsca.map((m) => `<option value="${m.id}"${r.lok === m.id ? ' selected' : ''}>${esc(m.nazwa)}</option>`).join('')}</select></div>` : ''}
      <div class="pole"><span style="font-weight:700;font-size:0.93rem">Te same godziny także w:</span><div class="gf__dni">${DNI.filter((x) => x !== Number(d.dz)).map((x) => `<label><input type="checkbox" data-gf-kopia="${x}" /> ${DNI_KR[x]}</label>`).join('')}</div></div>
      <p class="status-nowej status-nowej--blad" id="gf-blad" role="status"></p>
      <div class="sz__drugie" style="margin:0;justify-content:flex-end">
        ${d.nowy ? '' : `<button type="button" class="przycisk przycisk--cichy przycisk--ostrzez" data-pa="gf-usun" style="margin-right:auto">Usuń</button>`}
        <button type="button" class="przycisk przycisk--cichy" data-pa="gf-dymek-x">Anuluj</button>
        <button type="button" class="przycisk" data-pa="gf-zapisz">Zapisz</button>
      </div>
    </div>`;
  }
  function pozycjaDymku(el) {
    const s = document.getElementById('gf-ramka');
    if (!s || !el) return { x: 20, y: 60 };
    const a = s.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    const x = Math.max(8, Math.min(b.left - a.left, a.width - 340));
    return { x, y: b.bottom - a.top + 6 };
  }
  function otworzDymek(arg, el) {
    GF.dymek = { ...arg, ...pozycjaDymku(el) };
    P.odswiez();
    const f = document.querySelector('#gf-dymek [data-fokus]') || document.querySelector('#gf-dymek button');
    if (f) f.focus({ preventScroll: true });
    const dm = document.getElementById('gf-dymek');
    if (dm && dm.getBoundingClientRect().bottom > innerHeight) dm.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  P.akcje['gf-dymek-x'] = () => { GF.dymek = null; P.odswiez(); };
  P.akcje['gf-zapisz'] = () => {
    const d = GF.dymek;
    const od = K.zH(document.getElementById('gf-od').value || '0:00');
    const doo = K.zH(document.getElementById('gf-do').value || '0:00');
    const lok = document.getElementById('gf-lok') ? document.getElementById('gf-lok').value : P.D().miejsca[0].id;
    const blad = document.getElementById('gf-blad');
    if (doo <= od) { blad.textContent = 'Godzina „do” musi być późniejsza niż „od”.'; return; }
    if (od < K.START || doo > K.END) { blad.textContent = `Grafik obejmuje godziny ${K.godz(K.START)}–${K.godz(K.END)}.`; return; }
    const kopie = [...document.querySelectorAll('[data-gf-kopia]:checked')].map((x) => Number(x.dataset.gfKopia));
    const D = P.D();
    for (const dz of [Number(d.dz), ...kopie]) {
      const lista = przedzialyOsoby(D, d.terap, dz);
      const pomin = dz === Number(d.dz) && !d.nowy ? d.i : -1;
      const k = kolizja(lista, od, doo, lok, pomin);
      if (k) { blad.textContent = `${NAZWY[dz][0].toUpperCase() + NAZWY[dz].slice(1)}: w tym czasie przyjmujesz w innym miejscu (${K.godz(k.od)}–${K.godz(k.do)}).`; return; }
    }
    zmienGrafik(kopie.length ? `Zapisano godziny i skopiowano na ${kopie.length} ${kopie.length === 1 ? 'dzień' : 'dni'}` : 'Zapisano godziny', (tab) => {
      const os_ = tab[d.terap] || (tab[d.terap] = {});
      const dzien = os_[d.dz] || (os_[d.dz] = []);
      if (d.nowy) dzien.push({ od, do: doo, lok });
      else { const posort = dzien.slice().sort((a, b) => a.od - b.od); const r = posort[d.i]; Object.assign(r, { od, do: doo, lok }); }
      kopie.forEach((dz) => {
        const l = os_[dz] || (os_[dz] = []);
        /* Kopia zastępuje to, co nachodzi na te godziny, resztę dnia zostawia. */
        os_[dz] = l.filter((x) => x.do <= od || x.od >= doo).concat([{ od, do: doo, lok }]);
      });
    });
  };
  P.akcje['gf-usun'] = () => {
    const d = GF.dymek;
    zmienGrafik(`Usunięto godziny: ${NAZWY[d.dz]}`, (tab) => {
      const posort = ((tab[d.terap] || {})[d.dz] || []).slice().sort((a, b) => a.od - b.od);
      const r = posort[d.i];
      tab[d.terap][d.dz] = tab[d.terap][d.dz].filter((x) => x !== r);
    });
  };
  P.akcje['gf-dzien'] = (b) => otworzDymek({ typ: 'dzien', terap: b.dataset.terap, dz: Number(b.dataset.dz) }, b);
  P.akcje['gf-dodaj'] = (b) => {
    const dz = Number(b.dataset.dz);
    const lista = przedzialyOsoby(P.D(), b.dataset.terap, dz);
    const od = lista.length ? Math.min(lista[lista.length - 1].do + 60, K.END - 120) : K.zH('9:00');
    const wiersz_ = document.querySelector(`.gf__wiersz[data-terap="${b.dataset.terap}"][data-dz="${dz}"] .gf__tor`);
    otworzDymek({ terap: b.dataset.terap, dz, nowy: { od, do: Math.min(od + 180, K.END), lok: GF.pedzelLok || P.D().miejsca[0].id } }, wiersz_);
  };
  P.akcje['gf-kopiuj-dzien'] = (b) => {
    const dz = Number(b.dataset.dz);
    const t = b.dataset.terap;
    zmienGrafik(`Skopiowano ${NAZWY[dz]} na pozostałe dni pn–pt`, (tab) => {
      const zrodlo = JSON.parse(JSON.stringify(tab[t][dz]));
      [1, 2, 3, 4, 5].filter((x) => x !== dz).forEach((x) => { tab[t][x] = JSON.parse(JSON.stringify(zrodlo)); });
    });
  };
  P.akcje['gf-wyczysc-dzien'] = (b) => {
    const dz = Number(b.dataset.dz);
    zmienGrafik(`${NAZWY[dz][0].toUpperCase() + NAZWY[dz].slice(1)}: bez przyjęć`, (tab) => { if (tab[b.dataset.terap]) delete tab[b.dataset.terap][dz]; });
  };
  P.akcje['gf-szablon'] = (t) => {
    const v = t.value;
    if (!v) return;
    const lok = GF.pedzelLok || P.D().miejsca[0].id;
    const r = (a, b) => ({ od: K.zH(a), do: K.zH(b), lok });
    zmienGrafik(v === 'pusty' ? 'Wyczyszczono tydzień' : 'Zastosowano szablon tygodnia', (tab) => {
      tab[t.dataset.terap] = {};
      if (v !== 'pusty') [1, 2, 3, 4, 5].forEach((dz) => { tab[t.dataset.terap][dz] = v === '8-16' ? [r('8:00', '16:00')] : v === '9-17' ? [r('9:00', '17:00')] : [r('8:00', '12:00'), r('15:00', '19:00')]; });
    });
  };
  P.akcje['gf-kopiuj-od'] = (t) => {
    if (!t.value) return;
    const zr = K.terap(P.D(), t.value);
    zmienGrafik(`Skopiowano grafik od: ${zr.nazwa}`, (tab) => { tab[t.dataset.terap] = JSON.parse(JSON.stringify(tab[t.value] || {})); });
  };
  P.akcje['gf-lok'] = (b) => { GF.lok = b.dataset.id; P.odswiez(); };
  P.akcje['gf-pedzel'] = (t) => { GF.pedzelLok = t.value; };
  P.akcje['gf-wersja'] = (b) => { GF.wersja = b.dataset.id || null; GF.dymek = null; P.odswiez(); };
  P.akcje['gf-nowa-wersja'] = () => {
    const data = K.iso(K.dodaj(K.poniedzialek(new Date()), 14));
    P.otworz(() => `${P.naglowek('Zaplanuj zmianę grafiku', 'Np. grafik wakacyjny albo nowe godziny od nowego miesiąca. Do wybranego dnia obowiązuje obecny grafik.')}
      <div class="formularz">
        ${P.pole({ etykieta: 'Nowy grafik obowiązuje od', typ: 'date', wartosc: data, id: 'gf-wersja-od', atr: `min="${K.iso(K.dodaj(new Date(), 1))}" data-fokus` })}
        <p class="pod">Skopiujemy obecny grafik. Potem zmienisz w nim tylko to, co ma być inaczej.</p>
      </div>
      <footer class="sz__st"><button type="button" class="przycisk przycisk--cichy" data-pa="zamknij">Anuluj</button><button type="button" class="przycisk" data-pa="gf-utworz-wersje">Utwórz</button></footer>`);
  };
  P.akcje['gf-utworz-wersje'] = () => {
    const od = document.getElementById('gf-wersja-od').value;
    if (!od || od <= K.dzisIso()) { window.KAL_UI.toast('Wybierz datę w przyszłości.'); return; }
    if ((P.D().zmianyGrafiku || []).some((z) => z.od === od)) { window.KAL_UI.toast('Na ten dzień jest już zaplanowana zmiana.'); return; }
    const id = `g${Date.now()}`;
    P.zamknij(false);
    P.zmienRez(`Zaplanowano zmianę grafiku od ${P.dataKrotka(od)}`, (D) => {
      const poprzednia = K.wersjaGrafiku(D, od);
      D.zmianyGrafiku.push({ id, od, reguly: JSON.parse(JSON.stringify(poprzednia ? poprzednia.reguly : D.reguly)) });
    });
    GF.wersja = id;
    GF.tab = 'staly';
    P.idz('dostepnosc/staly');
  };
  P.akcje['gf-usun-wersje'] = (b) => {
    const z = (P.D().zmianyGrafiku || []).find((x) => x.id === b.dataset.id);
    if (!z) return;
    GF.wersja = null;
    P.zmienRez(`Usunięto zmianę grafiku od ${P.dataKrotka(z.od)}`, (D) => { D.zmianyGrafiku = D.zmianyGrafiku.filter((x) => x.id !== z.id); });
  };

  /* ── Przeciąganie na osi czasu ──────────────────────────────────────── */
  let ciag = null;
  const minZ = (tor, x) => { const a = tor.getBoundingClientRect(); return Math.max(K.START, Math.min(K.END, snap(K.START + ((x - a.left) / a.width) * ZAKRES))); };
  document.addEventListener('pointerdown', (e) => {
    if (P.aktualny !== 'dostepnosc' || GF.tab !== 'staly' || e.button !== 0) return;
    const pas = e.target.closest('[data-gf-pas]');
    const tor = e.target.closest('[data-gf-tor]');
    if (!tor) return;
    if (e.pointerType === 'touch') return; // na dotyku: dotknięcie otwiera dymek (obsługa w click)
    const terap = tor.dataset.terap;
    const dz = Number(tor.dataset.dz);
    if (pas) {
      const lista = przedzialyOsoby(P.D(), terap, dz);
      const r = lista[Number(pas.dataset.i)];
      const uchwyt = e.target.closest('[data-uchwyt]');
      ciag = { typ: uchwyt ? uchwyt.dataset.uchwyt : 'przesun', tor, pas, terap, dz, i: Number(pas.dataset.i), r0: { ...r }, x0: e.clientX, m0: minZ(tor, e.clientX), ruch: false, nowe: { ...r } };
    } else {
      const m = minZ(tor, e.clientX);
      const duch = document.createElement('span');
      duch.className = 'gf__duch';
      tor.appendChild(duch);
      ciag = { typ: 'nowy', tor, terap, dz, m0: m, x0: e.clientX, ruch: false, duch, nowe: { od: m, do: m, lok: GF.pedzelLok || P.D().miejsca[0].id } };
    }
    e.preventDefault();
  });
  document.addEventListener('pointermove', (e) => {
    if (!ciag) return;
    if (!ciag.ruch && Math.abs(e.clientX - ciag.x0) < 4) return;
    ciag.ruch = true;
    const m = minZ(ciag.tor, e.clientX);
    const n = ciag.nowe;
    if (ciag.typ === 'nowy') { n.od = Math.min(ciag.m0, m); n.do = Math.max(ciag.m0, m); }
    else if (ciag.typ === 'przesun') { const dl = ciag.r0.do - ciag.r0.od; let od = ciag.r0.od + (m - ciag.m0); od = Math.max(K.START, Math.min(K.END - dl, od)); n.od = od; n.do = od + dl; }
    else if (ciag.typ === 'l') n.od = Math.min(m, ciag.r0.do - 15);
    else if (ciag.typ === 'p') n.do = Math.max(m, ciag.r0.od + 15);
    const lista = przedzialyOsoby(P.D(), ciag.terap, ciag.dz);
    ciag.zle = n.do - n.od < 15 || !!kolizja(lista, n.od, n.do, n.lok, ciag.typ === 'nowy' ? -1 : ciag.i);
    const el = ciag.typ === 'nowy' ? ciag.duch : ciag.pas;
    el.style.left = `${proc(n.od)}%`;
    el.style.width = `${proc(n.do) - proc(n.od)}%`;
    if (ciag.typ === 'nowy') { el.textContent = n.do > n.od ? `${K.godz(n.od)}–${K.godz(n.do)}` : ''; el.classList.toggle('gf__duch--zle', ciag.zle); }
    else { el.querySelector('span:not([data-uchwyt])').textContent = `${K.godz(n.od)}–${K.godz(n.do)}`; el.style.outline = ciag.zle ? '3px solid var(--alert)' : ''; }
  });
  document.addEventListener('pointerup', () => {
    if (!ciag) return;
    const c = ciag;
    ciag = null;
    P.ostatniCiag = Date.now();
    if (c.duch) c.duch.remove();
    if (!c.ruch) {
      if (c.typ !== 'nowy') otworzDymek({ terap: c.terap, dz: c.dz, i: c.i }, c.pas);
      else {
        const od = Math.max(K.START, Math.min(K.END - 120, Math.floor(c.m0 / 60) * 60));
        otworzDymek({ terap: c.terap, dz: c.dz, nowy: { od, do: od + 120, lok: GF.pedzelLok || P.D().miejsca[0].id } }, c.tor);
      }
      return;
    }
    const n = c.nowe;
    if (c.zle || n.do - n.od < 15) {
      window.KAL_UI.toast(n.do - n.od < 15 ? 'Za krótki przedział. Przeciągnij dalej.' : 'W tym czasie przyjmujesz w innym miejscu.');
      P.odswiez();
      return;
    }
    if (c.typ === 'nowy') {
      zmienGrafik(`Dodano ${NAZWY[c.dz]}: ${K.godz(n.od)}–${K.godz(n.do)}`, (tab) => { const o = tab[c.terap] || (tab[c.terap] = {}); (o[c.dz] || (o[c.dz] = [])).push({ od: n.od, do: n.do, lok: n.lok }); });
    } else {
      zmienGrafik(`${NAZWY[c.dz][0].toUpperCase() + NAZWY[c.dz].slice(1)}: ${K.godz(n.od)}–${K.godz(n.do)}`, (tab) => {
        const posort = tab[c.terap][c.dz].slice().sort((a, b) => a.od - b.od);
        Object.assign(posort[c.i], { od: n.od, do: n.do });
      });
    }
  });
  /* Dotyk i klawiatura */
  document.addEventListener('click', (e) => {
    if (P.aktualny !== 'dostepnosc' || Date.now() - (P.ostatniCiag || 0) < 300) return;
    const pas = e.target.closest('[data-gf-pas]');
    const tor = e.target.closest('[data-gf-tor]');
    if (pas) { otworzDymek({ terap: pas.dataset.terap, dz: Number(pas.dataset.dz), i: Number(pas.dataset.i) }, pas); return; }
    if (tor) {
      const a = tor.getBoundingClientRect();
      const m = Math.floor((K.START + ((e.clientX - a.left) / a.width) * ZAKRES) / 60) * 60;
      const od = Math.max(K.START, Math.min(K.END - 120, m));
      otworzDymek({ terap: tor.dataset.terap, dz: Number(tor.dataset.dz), nowy: { od, do: od + 120, lok: GF.pedzelLok || P.D().miejsca[0].id } }, tor);
      return;
    }
    if (GF.dymek && !e.target.closest('#gf-dymek') && !e.target.closest('[data-pa="gf-dzien"]') && P.aktualny === 'dostepnosc') { GF.dymek = null; P.odswiez(); }
  });
  document.addEventListener('keydown', (e) => {
    const pas = e.target.closest && e.target.closest('[data-gf-pas]');
    if (!pas) {
      if (e.key === 'Escape' && GF.dymek && P.aktualny === 'dostepnosc') { GF.dymek = null; P.odswiez(); }
      return;
    }
    const terap = pas.dataset.terap;
    const dz = Number(pas.dataset.dz);
    const i = Number(pas.dataset.i);
    const lista = przedzialyOsoby(P.D(), terap, dz);
    const r = lista[i];
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); GF.dymek = { terap, dz, i }; P.akcje['gf-usun'](); return; }
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const krok = e.key === 'ArrowLeft' ? -15 : 15;
    let { od, do: doo } = r;
    if (e.shiftKey) doo = Math.max(od + 15, Math.min(K.END, doo + krok));
    else { od += krok; doo += krok; if (od < K.START || doo > K.END) return; }
    if (kolizja(lista, od, doo, r.lok, i)) return;
    zmienGrafik(`${DNI_KR[dz]}: ${K.godz(od)}–${K.godz(doo)}`, (tab) => { const p = tab[terap][dz].slice().sort((a, b) => a.od - b.od)[i]; Object.assign(p, { od, do: doo }); });
    setTimeout(() => { const n = document.querySelector(`[data-gf-pas][data-terap="${terap}"][data-dz="${dz}"][data-i="${i}"]`); if (n) n.focus(); }, 20);
  });

  /* ── Zmiany jednorazowe i urlopy ────────────────────────────────────── */
  function zmianyLista() {
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
    (D.zmianyGrafiku || []).forEach((z) => el.push({ data: z.od, typ: 'wersja', z }));
    const rok = new Date().getFullYear();
    if (D.ustawienia.swietaZamkniete !== false) [rok, rok + 1].forEach((y) => K.swieta(y).forEach((n, d) => { if (d >= dzis && d <= K.iso(K.dodaj(new Date(), 120)) && K.swietoZamkniete(D, d) && K.zIso(d).getDay() !== 0) el.push({ data: d, typ: 'swieto', nazwa: n }); }));
    return el.sort((a, b) => a.data.localeCompare(b.data));
  }
  function renderZmiany() {
    const D = P.D();
    const el = zmianyLista();
    let mies = '';
    const wiersze = el.map((x) => {
      const d = K.zIso(x.data);
      const m = `${K.MIES_M[d.getMonth()]} ${d.getFullYear()}`;
      const nag = m !== mies ? `<p class="gf-mies">${m}</p>` : '';
      mies = m;
      const data = `<div class="gf-zm__data">${d.getDate()} ${K.MIES[d.getMonth()].slice(0, 3)}<small>${K.DNI[d.getDay()]}</small></div>`;
      const kto = (id) => (P.ent() ? ` · ${id === '*' ? 'cały gabinet' : esc(K.terap(D, id).nazwa)}` : '');
      if (x.typ === 'blokada') {
        const b = x.b;
        const ile = K.dniMiedzy(b.od, b.do) + 1;
        return `${nag}<div class="gf-zm">${data}<div class="gf-zm__opis"><b><span class="p-tag">blokada</span> ${esc(b.powod)}</b><small>${ile > 1 ? `do ${esc(P.dataKrotka(b.do))} (${ile} dni)` : 'jeden dzień'} · ${b.odMin == null ? 'cały dzień' : K.czas(b.odMin, b.doMin - b.odMin)}${kto(b.terap)}${x.wiz ? ` · <b style="color:var(--warn)">${x.wiz} ${x.wiz === 1 ? 'wizyta do przełożenia' : 'wizyty do przełożenia'}</b>` : ''}</small></div><div class="p-karta__akcje"><button type="button" class="p-btn p-btn--maly p-btn--cichy" data-pa="gf-blokada" data-id="${b.id}">Zmień</button><button type="button" class="p-btn p-btn--maly p-btn--cichy p-btn--ostrzez" data-pa="gf-usun-blokade" data-id="${b.id}">Usuń</button></div></div>`;
      }
      if (x.typ === 'wyjatek') {
        const opis = [...x.otw.map((w) => `<span class="p-tag p-tag--zielony">dodatkowo</span> ${K.czas(w.od, w.do - w.od)}${w.lok && ileLok() > 1 ? ` (${esc(K.miejsce(D, w.lok).kr)})` : ''}`), ...x.zam.map((w) => `<span class="p-tag p-tag--czerwony">zamknięte</span> ${K.czas(w.od, w.do - w.od)}`)].join('<br />');
        return `${nag}<div class="gf-zm">${data}<div class="gf-zm__opis"><b>${opis}</b><small>zmiana tylko tego dnia${kto(x.terap)}</small></div><div class="p-karta__akcje"><button type="button" class="p-btn p-btn--maly p-btn--cichy" data-pa="gf-pokaz" data-terap="${x.terap}" data-data="${x.data}">W kalendarzu</button><button type="button" class="p-btn p-btn--maly p-btn--cichy p-btn--ostrzez" data-pa="gf-usun-wyjatek" data-terap="${x.terap}" data-data="${x.data}">Przywróć grafik</button></div></div>`;
      }
      if (x.typ === 'wersja') return `${nag}<div class="gf-zm">${data}<div class="gf-zm__opis"><b><span class="p-tag p-tag--niebieski">nowy grafik</span> Od tego dnia obowiązuje zmieniony stały grafik</b><small>zaplanowana zmiana</small></div><div class="p-karta__akcje"><button type="button" class="p-btn p-btn--maly p-btn--cichy" data-pa="gf-wersja-otworz" data-id="${x.z.id}">Edytuj</button><button type="button" class="p-btn p-btn--maly p-btn--cichy p-btn--ostrzez" data-pa="gf-usun-wersje" data-id="${x.z.id}">Usuń</button></div></div>`;
      return `${nag}<div class="gf-zm">${data}<div class="gf-zm__opis"><b><span class="p-tag p-tag--zolty">święto</span> ${esc(x.nazwa)}</b><small>gabinet zamknięty</small></div><div class="p-karta__akcje"><a class="p-btn p-btn--maly p-btn--cichy" href="#/dostepnosc/swieta">Zmień</a></div></div>`;
    }).join('');
    return `<div class="p-stos">
      <div class="p-filtry">
        <button type="button" class="p-btn p-btn--akcent" data-pa="gf-blokada">${P.ikona('plus')}<span>Urlop lub blokada</span></button>
        <button type="button" class="p-btn" data-pa="gf-jednorazowo" data-typ="open">${P.ikona('plus')}<span>Dodatkowe godziny</span></button>
        <button type="button" class="p-btn" data-pa="gf-jednorazowo" data-typ="closed">Zamknij godziny w wybranym dniu</button>
      </div>
      ${P.karta('Nadchodzące zmiany', el.length ? wiersze : P.pusto('Brak zaplanowanych zmian. Wszystko działa według stałego grafiku.'), { pod: 'Urlopy, blokady, dodatkowe i zamknięte godziny, święta i zaplanowane zmiany grafiku. Minione nie są pokazywane.' })}
    </div>`;
  }
  P.akcje['gf-blokada'] = (b) => { P.zamknij(false); window.KAL_UI.blokada(b.dataset.id ? { id: b.dataset.id } : {}); };
  P.akcje['gf-usun-blokade'] = (b) => { const bl = P.D().blokady.find((x) => x.id === b.dataset.id); P.zmienRez(`Usunięto blokadę: ${bl ? bl.powod : ''}`, (D) => { D.blokady = D.blokady.filter((x) => x.id !== b.dataset.id); }); };
  P.akcje['gf-usun-wyjatek'] = (b) => P.zmienRez(`Przywrócono stały grafik: ${P.dataKrotka(b.dataset.data)}`, (D) => { D.wyjatki = D.wyjatki.filter((w) => !(w.terap === b.dataset.terap && w.data === b.dataset.data)); });
  P.akcje['gf-pokaz'] = (b) => { P.idz('kalendarz'); setTimeout(() => window.KAL_UI.idzDo(b.dataset.terap, b.dataset.data, P.ent() ? 'dzien' : 'tydzien'), 30); };
  P.akcje['gf-wersja-otworz'] = (b) => { GF.wersja = b.dataset.id; P.idz('dostepnosc/staly'); };
  P.akcje['gf-jednorazowo'] = (b) => {
    const otw = b.dataset.typ === 'open';
    const D = P.D();
    P.otworz(() => `${P.naglowek(otw ? 'Dodatkowe godziny' : 'Zamknij godziny', otw ? 'Jednorazowo, np. sobota przed urlopem. Stały grafik się nie zmienia.' : 'Jednorazowo, np. wizyta u lekarza. Istniejące wizyty zostają w kalendarzu.')}
      <div class="formularz">
        ${P.pole({ etykieta: 'Dzień', typ: 'date', wartosc: K.iso(K.dodaj(new Date(), 1)), id: 'jd-data', atr: `min="${K.dzisIso()}" data-fokus` })}
        <div class="pola2">${P.pole({ etykieta: 'Od', typ: 'time', wartosc: otw ? '09:00' : '12:00', id: 'jd-od', atr: 'step="900"' })}${P.pole({ etykieta: 'Do', typ: 'time', wartosc: otw ? '13:00' : '14:00', id: 'jd-do', atr: 'step="900"' })}</div>
        ${P.ent() ? P.wybor({ etykieta: 'Terapeuta', id: 'jd-terap', wartosc: (P.filtrOsob || [])[0] || D.zespol[0].id, opcje: D.zespol.map((t) => [t.id, t.nazwa]) }) : ''}
        ${otw && ileLok() > 1 ? P.wybor({ etykieta: 'Miejsce', id: 'jd-lok', wartosc: GF.pedzelLok || D.miejsca[0].id, opcje: D.miejsca.map((m) => [m.id, m.nazwa]) }) : ''}
        <p class="status-nowej" id="jd-status" role="status"></p>
      </div>
      <footer class="sz__st"><button type="button" class="przycisk przycisk--cichy" data-pa="zamknij">Anuluj</button><button type="button" class="przycisk" data-pa="gf-jednorazowo-zapisz" data-typ="${b.dataset.typ}">${otw ? 'Dodaj godziny' : 'Zamknij godziny'}</button></footer>`);
  };
  P.akcje['gf-jednorazowo-zapisz'] = (b) => {
    const otw = b.dataset.typ === 'open';
    const data = document.getElementById('jd-data').value;
    const od = K.zH(document.getElementById('jd-od').value || '0:00');
    const doo = K.zH(document.getElementById('jd-do').value || '0:00');
    const terap = document.getElementById('jd-terap') ? document.getElementById('jd-terap').value : P.D().zespol[0].id;
    const lok = document.getElementById('jd-lok') ? document.getElementById('jd-lok').value : null;
    const st = document.getElementById('jd-status');
    st.className = 'status-nowej status-nowej--blad';
    if (!data) { st.textContent = 'Wybierz dzień.'; return; }
    if (doo <= od) { st.textContent = 'Godzina „do” musi być późniejsza niż „od”.'; return; }
    const D = P.D();
    if (otw && K.przedzialy(D, terap, data).some(([x, y]) => x <= od && y >= doo)) { st.textContent = 'W tym czasie już przyjmujesz według grafiku.'; return; }
    P.zamknij(false);
    P.zmienRez(`${otw ? 'Dodano' : 'Zamknięto'} godziny ${K.czas(od, doo - od)}, ${P.dataKrotka(data)}`, (D_) => { K.maluj(D_, terap, data, od, doo, otw, lok); });
  };

  /* ── Święta ─────────────────────────────────────────────────────────── */
  function renderSwieta() {
    const D = P.D();
    const dzis = K.dzisIso();
    const rok = new Date().getFullYear();
    const lista = [];
    [rok, rok + 1].forEach((y) => K.swieta(y).forEach((n, d) => { if (d >= dzis) lista.push([d, n]); }));
    lista.sort((a, b) => a[0].localeCompare(b[0]));
    const wl = D.ustawienia.swietaZamkniete !== false;
    return `<div class="p-stos">
      ${P.karta('', `${P.przelacznik({ etykieta: 'Zamykaj gabinet w dni ustawowo wolne od pracy', pf: 'rez:ustawienia.swietaZamkniete', wartosc: wl, pod: 'Pacjent nie zobaczy wolnych terminów w święta. Pojedyncze święto możesz otworzyć niżej. Od 2025 r. wolna jest także Wigilia.', atr: 'data-odswiez' })}`)}
      ${P.karta('Najbliższe święta', `<ul class="p-lista">${lista.slice(0, 16).map(([d, n]) => {
        const dd = K.zIso(d);
        const otwarte = (D.swietaOtwarte || []).includes(d);
        const niedziela = dd.getDay() === 0;
        const wiz = D.rezerwacje.filter((r) => r.data === d && K.aktywna(r)).length;
        return `<li class="p-wiersz"><div class="gf-zm__data" style="min-width:90px">${dd.getDate()} ${K.MIES[dd.getMonth()].slice(0, 3)} ${dd.getFullYear() !== rok ? dd.getFullYear() : ''}<small>${K.DNI[dd.getDay()]}</small></div>
          <div class="p-wiersz__glowny" style="cursor:default"><b>${esc(n)}</b><small>${niedziela ? 'wypada w niedzielę' : !wl ? 'gabinet działa według grafiku (zamykanie w święta wyłączone)' : otwarte ? 'otwarte wyjątkowo, według grafiku' : 'zamknięte'}${wiz ? ` · <b style="color:var(--warn)">${wiz} ${wiz === 1 ? 'wizyta' : 'wizyty'} w tym dniu</b>` : ''}</small></div>
          ${niedziela || !wl ? '' : `<span class="p-wiersz__akcje"><button type="button" class="p-btn p-btn--maly ${otwarte ? 'p-btn--cichy' : 'p-btn--cichy'}" data-pa="gf-swieto" data-data="${d}">${otwarte ? 'Zamknij' : 'Otwórz wyjątkowo'}</button></span>`}</li>`;
      }).join('')}</ul>`, { pod: 'Daty liczone automatycznie, także Wielkanoc i Boże Ciało.' })}
    </div>`;
  }
  P.akcje['gf-swieto'] = (b) => {
    const d = b.dataset.data;
    const otw = (P.D().swietaOtwarte || []).includes(d);
    P.zmienRez(`${K.swieto(d)}: ${otw ? 'zamknięte' : 'otwarte według grafiku'}`, (D) => { D.swietaOtwarte = otw ? D.swietaOtwarte.filter((x) => x !== d) : [...(D.swietaOtwarte || []), d]; });
  };

  /* ── Widok ─────────────────────────────────────────────────────────── */
  P.widoki.dostepnosc = {
    tytul: 'Dostępność',
    podtytul: () => (P.ent() ? 'Kiedy i gdzie przyjmuje każdy terapeuta. Pacjent widzi tylko wolne terminy.' : 'Kiedy i gdzie przyjmujesz. Pacjent widzi tylko wolne terminy.'),
    render(arg) {
      if (['staly', 'zmiany', 'swieta'].includes(arg)) GF.tab = arg;
      if (GF.wersja && !(P.D().zmianyGrafiku || []).some((z) => z.id === GF.wersja)) GF.wersja = null;
      const ileZmian = zmianyLista().filter((x) => x.typ !== 'swieto').length;
      const tresc = GF.tab === 'zmiany' ? renderZmiany() : GF.tab === 'swieta' ? renderSwieta() : renderStaly();
      return `<div class="p-stos">${P.podzakladki([['staly', 'Stały grafik'], ['zmiany', 'Zmiany i urlopy', ileZmian || ''], ['swieta', 'Święta']], GF.tab, 'dostepnosc')}${tresc}</div>`;
    },
  };

  /* Zmiana grafiku, której data już minęła, staje się obecnym grafikiem. */
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
