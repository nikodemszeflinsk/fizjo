/*
 * Kalendarz dostępności — interfejs.
 *
 * Z jednego ekranu: widać rezerwacje i dostępność, klika się w termin, przeciąga zakres godzin,
 * przenosi wizytę i cofa każdą zmianę. Reguły (co jest wolne, co koliduje) są w kalendarz-model.js.
 * Dane przykładowe zapisują się tylko w tej przeglądarce.
 */
(() => {
  'use strict';

  const K = window.KAL;
  const { START, END, KROK, RZEDY, DNI, DNI_KR, MIES, MIES_M } = K;
  const esc = K.esc;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const lw = (n, a, b, c) => (n === 1 ? a : n % 10 >= 2 && n % 10 <= 4 && !(n % 100 >= 12 && n % 100 <= 14) ? b : c);
  const wizyt = (n) => `${n} ${lw(n, 'wizyta', 'wizyty', 'wizyt')}`;
  const przewijanie = () => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');
  const MNOGA = { 0: 'niedziele', 1: 'poniedziałki', 2: 'wtorki', 3: 'środy', 4: 'czwartki', 5: 'piątki', 6: 'soboty' };

  /* ── Stan ───────────────────────────────────────────────────────────── */
  const KLUCZ = 'kalendarz-demo-v4';
  let stan;
  function nowyStan() {
    return { tryb: 'ind', widok: 'tydzien', data: K.dzisIso(), terap: 'jan', dane: { ind: K.ziarno('ind'), ent: K.ziarno('ent') } };
  }
  function wczytaj() {
    try {
      const z = JSON.parse(localStorage.getItem(KLUCZ));
      if (z && z.dane && z.dane.ind && z.dane.ent) return z;
    } catch (e) { /* brak zapisu albo zablokowany localStorage: zaczynamy od danych przykładowych */ }
    return nowyStan();
  }
  function zapisz() {
    try { localStorage.setItem(KLUCZ, JSON.stringify(stan)); } catch (e) { /* demo działa też bez zapisu */ }
    /* Panel słucha tego zdarzenia, żeby odświeżyć swoje widoki po zmianie w kalendarzu. */
    document.dispatchEvent(new CustomEvent('kal:zmiana'));
  }
  stan = wczytaj();
  const D = () => stan.dane[stan.tryb];
  const ent = () => stan.tryb === 'ent';
  const terapeuta = (id) => K.terap(D(), id);
  const osoby = () => (ent() ? K.widoczni(D()) : [D().zespol[0]]);

  /* Stan chwilowy, który nie trafia do localStorage. */
  const ui = {
    mobIdx: null, szuflada: null, przenos: null, edycja: false, pedzel: 'otworz', szukaj: '', uslugaPacjenta: null,
    drag: null, ostatniWskaznik: 0, odwolywanie: false, fokus: null,
  };
  const waski = matchMedia('(max-width: 700px)');
  let przesuwanie = null;

  /* ── Zmiany z cofaniem ──────────────────────────────────────────────── */
  let migawka = null;
  let zegarToast = null;
  function toast(tekst, snap) {
    migawka = snap || null;
    $('#toast-t').textContent = tekst;
    $('#toast [data-akcja="cofnij"]').hidden = !snap;
    $('#toast').hidden = false;
    clearTimeout(zegarToast);
    zegarToast = setTimeout(ukryjToast, 9000);
  }
  function ukryjToast() { $('#toast').hidden = true; migawka = null; clearTimeout(zegarToast); }
  /** Wykonuje zmianę danych, zapisuje, odświeża i pozwala ją cofnąć. */
  function zmien(tekst, fn, { zamknij = true } = {}) {
    const snap = JSON.stringify(D());
    fn();
    zapisz();
    if (zamknij) zamknijSzuflade(false);
    render();
    toast(tekst, snap);
  }
  function cofnij() {
    if (!migawka) return;
    /* Panel może podać własną funkcję cofania (np. dla treści strony). */
    if (typeof migawka === 'function') { const f = migawka; ukryjToast(); f(); return; }
    stan.dane[stan.tryb] = JSON.parse(migawka);
    zapisz(); ukryjToast(); zamknijSzuflade(false); render();
  }
  /** Zmiana ustawień na żywo, bez komunikatu o cofnięciu. */
  function ustaw(fn) { fn(); zapisz(); render(); }

  /* ── Zakres widoku ──────────────────────────────────────────────────── */
  function kolumny() {
    const d = K.zIso(stan.data);
    if (stan.widok === 'tydzien') {
      const pon = K.poniedzialek(d);
      const t = terapeuta(stan.terap);
      return K.DNI_PRACY.map((dz) => ({ data: K.iso(K.dodaj(pon, dz - 1)), terap: t.id }));
    }
    return osoby().map((t) => ({ data: stan.data, terap: t.id, etykieta: t.nazwa.replace(/^mgr\s+/, '') }));
  }
  function indeksMob(wsz) {
    if (ui.mobIdx !== null && ui.mobIdx < wsz.length) return ui.mobIdx;
    if (stan.widok === 'tydzien') return Math.min(wsz.length - 1, (K.zIso(stan.data).getDay() + 6) % 7);
    return 0;
  }
  const widoczneKolumny = () => { const w = kolumny(); return waski.matches ? [w[indeksMob(w)]] : w; };
  function tytulZakresu() {
    const d = K.zIso(stan.data);
    if (stan.widok === 'dzien') return K.dlugaData(d);
    if (stan.widok === 'miesiac') return `${MIES_M[d.getMonth()]} ${d.getFullYear()}`;
    if (stan.widok === 'agenda') return `Od ${d.getDate()} ${MIES[d.getMonth()]}`;
    const pon = K.poniedzialek(d);
    const kon = K.dodaj(pon, 5);
    return `${pon.getDate()} ${pon.getMonth() === kon.getMonth() ? '' : MIES[pon.getMonth()] + ' '}– ${kon.getDate()} ${MIES[kon.getMonth()]} ${kon.getFullYear()}`.replace(/\s+/g, ' ');
  }
  function przesun(n) {
    const d = K.zIso(stan.data);
    if (stan.widok === 'miesiac') { d.setMonth(d.getMonth() + n, 1); stan.data = K.iso(d); }
    else stan.data = K.iso(K.dodaj(d, n * (stan.widok === 'tydzien' || stan.widok === 'agenda' ? 7 : 1)));
    ui.mobIdx = null;
    zapisz(); render();
  }
  function doDnia(data) {
    stan.data = data;
    if (stan.widok === 'miesiac' || stan.widok === 'agenda') stan.widok = ent() ? 'dzien' : 'tydzien';
    ui.mobIdx = null;
    zapisz(); render();
  }
  /** Przechodzi do widoku, w którym widać dany dzień i osobę. */
  function idzDoRezerwacji(terap, data) {
    stan.data = data;
    if (stan.widok === 'tydzien' && D().zespol.some((t) => t.id === terap)) stan.terap = terap;
    if (stan.widok === 'miesiac' || stan.widok === 'agenda') stan.widok = ent() ? 'dzien' : 'tydzien';
    ui.mobIdx = null;
    zapisz(); render();
  }

  /* ── Podpisy i liczby ───────────────────────────────────────────────── */
  function podpis(terap, data) {
    const bl = K.blokady(D(), terap, data).find((x) => x.od <= START && x.do >= END);
    const n = K.rezDnia(D(), terap, data).length;
    if (bl) return bl.b.powod;
    if (K.swietoZamkniete(D(), data) && !K.przedzialy(D(), terap, data).length) return `${K.swieto(data)}${n ? ', ' + wizyt(n) : ''}`;
    if (!K.przedzialy(D(), terap, data).length) return n ? `${wizyt(n)}, poza grafikiem` : ent() ? 'nie przyjmuje' : 'nie przyjmujesz';
    if (data < K.dzisIso()) return wizyt(n);
    const od = data === K.dzisIso() ? Math.max(START, Math.ceil(K.terazMin() / 15) * 15) : START;
    const w = K.suma(K.przeciecie(K.wolnePrzedzialy(D(), terap, data), [od, END]));
    return `${wizyt(n)} · ${w ? 'wolne ' + K.godzTekst(w) : 'komplet'}`;
  }

  /* ── Pasek narzędzi ─────────────────────────────────────────────────── */
  const WIDOKI = [['tydzien', 'Tydzień'], ['dzien', 'Dzień'], ['miesiac', 'Miesiąc'], ['agenda', 'Agenda']];
  function renderPasek() {
    const w = WIDOKI.map(([k, n]) => `<button type="button" data-widok="${k}" aria-pressed="${stan.widok === k}">${k === 'dzien' && ent() ? '<span class="dl">Dzień zespołu</span><span class="kr">Zespół</span>' : n}</button>`).join('');
    const wybor = ent() && stan.widok === 'tydzien'
      ? `<label class="wybor"><span>Terapeuta</span><select id="sel-terap">${D().zespol.map((t) => `<option value="${t.id}"${t.id === stan.terap ? ' selected' : ''}>${esc(t.nazwa)}</option>`).join('')}</select></label>`
      : '';
    $('#pasek').innerHTML = `
      <div class="pasek__rzad">
        <div class="pasek__nawig">
          <button type="button" class="ikona" data-nawig="-1" aria-label="Wstecz">‹</button>
          <button type="button" class="przycisk przycisk--cichy" data-nawig="0">Dziś</button>
          <button type="button" class="ikona" data-nawig="1" aria-label="Dalej">›</button>
          <h2 class="pasek__tytul" aria-live="polite">${esc(tytulZakresu())}</h2>
        </div>
        <div class="pasek__opcje">
          <div class="seg" role="group" aria-label="Widok">${w}</div>
          ${wybor}
          <div class="szukaj"><input id="szukaj" type="search" placeholder="Szukaj pacjenta lub telefonu" aria-label="Szukaj pacjenta lub telefonu" autocomplete="off" value="${esc(ui.szukaj)}" /><ul class="szukaj__wyniki" id="szukaj-wyniki" hidden></ul></div>
        </div>
      </div>
      <div class="pasek__rzad pasek__rzad--akcje">
        <button type="button" class="przycisk" data-akcja="nowa"><span aria-hidden="true">+</span> Rezerwacja</button>
        <button type="button" class="przycisk przycisk--tryb" data-akcja="edycja" aria-pressed="${ui.edycja}">Zmień dostępność</button>
        ${document.body.dataset.app === 'panel' ? '<a class="przycisk przycisk--cichy" href="#/dostepnosc">Grafik</a>' : '<button type="button" class="przycisk przycisk--cichy" data-akcja="godziny">Godziny przyjęć</button>'}
        <button type="button" class="przycisk przycisk--cichy" data-akcja="blokada">Blokada</button>
        ${document.body.dataset.app === 'panel' ? '' : '<button type="button" class="przycisk przycisk--cichy" data-akcja="ustawienia">Ustawienia</button>'}
        <div class="menu"><button type="button" class="przycisk przycisk--cichy" data-akcja="menu" aria-haspopup="true" aria-expanded="false" aria-label="Więcej">⋯</button>
          <ul class="menu__lista" id="menu-lista" hidden>
            <li class="tylko-tel"><button type="button" data-akcja="godziny">Godziny przyjęć</button></li>
            <li class="tylko-tel"><button type="button" data-akcja="blokada">Blokada</button></li>
            <li class="tylko-tel"><button type="button" data-akcja="ustawienia">Ustawienia</button></li>
            <li><button type="button" data-akcja="csv">Eksport rezerwacji (CSV)</button></li>
            <li><button type="button" data-akcja="drukuj">Drukuj widok</button></li>
            <li><button type="button" data-akcja="skroty">Skróty klawiszowe</button></li>
            <li><a href="demo.html" target="_blank" rel="noopener">Zobacz stronę pacjenta</a></li>
            <li><button type="button" data-akcja="reset">Przywróć dane przykładowe</button></li>
          </ul></div>
      </div>`;
    $$('[data-tryb]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tryb === stan.tryb)));
    const opisPakietu = $('#pakiet-opis');
    if (opisPakietu) opisPakietu.textContent = ent() ? 'Zespół, każdy z własnym grafikiem' : 'Jeden terapeuta, kilka miejsc przyjęć';
  }

  function renderTryb() {
    const p = $('#tryb-pasek');
    p.hidden = !ui.edycja;
    if (!ui.edycja) return;
    const miejsce = stan.widok === 'tydzien' ? `dla ${esc(terapeuta(stan.terap).nazwa)}` : 'dla widocznych terapeutów';
    p.innerHTML = `
      <div class="tryb">
        <p class="tryb__et"><b>Zmieniasz dostępność</b> ${miejsce}. Zaznacz prostokąt w kalendarzu, a godziny się otworzą albo zamkną. Kliknięcie zmienia całą godzinę. Zmiana dotyczy tylko wybranych dat.</p>
        <div class="tryb__pedzel" role="radiogroup" aria-label="Co robi zaznaczenie">
          <button type="button" role="radio" aria-checked="${ui.pedzel === 'otworz'}" data-pedzel="otworz" class="pedzel pedzel--otworz">Otwieram godziny</button>
          <button type="button" role="radio" aria-checked="${ui.pedzel === 'zamknij'}" data-pedzel="zamknij" class="pedzel pedzel--zamknij">Zamykam godziny</button>
        </div>
        <div class="tryb__akcje">
          <button type="button" class="przycisk przycisk--cichy" data-akcja="grafik-z-tygodnia" ${stan.widok !== 'tydzien' ? 'disabled' : ''}>Ustaw ten tydzień jako stały grafik</button>
          <button type="button" class="przycisk przycisk--cichy" data-akcja="wyczysc-tydzien">Cofnij zmiany jednorazowe</button>
          <button type="button" class="przycisk" data-akcja="edycja">Gotowe</button>
        </div>
      </div>`;
  }

  function renderPrzenos() {
    const p = $('#przenos');
    const r = ui.przenos && D().rezerwacje.find((x) => x.id === ui.przenos);
    p.hidden = !r;
    if (!r) { ui.przenos = null; return; }
    p.innerHTML = `<p><b>Przekładasz: ${esc(r.imie)}</b> (${esc(K.dlTekst(r.dl))}, teraz ${esc(K.wzgledna(r.data).toLowerCase())} ${K.godz(r.od)}). Kliknij nowy termin w kalendarzu.</p><button type="button" class="przycisk przycisk--cichy" data-akcja="przenos-anuluj">Anuluj</button>`;
  }

  /* ── Chipy dnia na telefonie ────────────────────────────────────────── */
  function renderChipy() {
    const box = $('#chipy');
    if (stan.widok === 'miesiac' || stan.widok === 'agenda') { box.innerHTML = ''; return; }
    const wsz = kolumny();
    const akt = indeksMob(wsz);
    box.innerHTML = wsz.map((k, i) => {
      const d = K.zIso(k.data);
      const t = terapeuta(k.terap);
      const nazwa = stan.widok === 'dzien' && ent() ? `<i style="background:${K.kolor(t.kolor)}"></i>${esc(k.etykieta.split(' ')[0])}` : `${DNI_KR[d.getDay()]} <b>${d.getDate()}</b>`;
      const n = K.rezDnia(D(), k.terap, k.data).length;
      return `<button type="button" data-mob="${i}" aria-pressed="${i === akt}"${k.data === K.dzisIso() && stan.widok === 'tydzien' ? ' class="dzis"' : ''}>${nazwa}<small>${n ? wizyt(n) : '–'}</small></button>`;
    }).join('');
  }

  /* ── Siatka: tydzień i dzień ────────────────────────────────────────── */
  function badge(r) {
    const znaki = [];
    if (r.nowa) znaki.push('<i class="b b--nowa" title="Nowa rezerwacja ze strony">nowa</i>');
    if (r.status === 'przyszedl') znaki.push('<i class="b b--ok" title="Przyszedł">✓</i>');
    if (r.status === 'nieobecny') znaki.push('<i class="b b--x" title="Nie przyszedł">✕</i>');
    if (r.status === 'oczekuje') znaki.push('<i class="b b--czeka" title="Do potwierdzenia">?</i>');
    if (r.zal && D().ustawienia.zaliczki) znaki.push('<i class="b b--zal" title="Zaliczka opłacona">zał.</i>');
    return znaki.join('');
  }

  function renderSiatka() {
    const kol = widoczneKolumny();
    const dzisIso = K.dzisIso();
    let h = '<div class="sg-rog" style="grid-row:1;grid-column:1"></div>';
    kol.forEach((k, i) => {
      const d = K.zIso(k.data);
      const t = terapeuta(k.terap);
      const glowa = stan.widok === 'dzien' && ent()
        ? `<span class="sg-dzien sg-dzien--os"><i style="background:${K.kolor(t.kolor)}"></i>${esc(k.etykieta)}</span>`
        : `<span class="sg-dzien">${DNI_KR[d.getDay()]} ${d.getDate()}</span>`;
      h += `<button type="button" class="sg-glowa${k.data === dzisIso ? ' sg-glowa--dzis' : ''}${k.data === dzisIso && stan.widok === 'tydzien' ? ' sg-glowa--znacznik' : ''}" data-dzien="${k.data}|${k.terap}" style="grid-row:1;grid-column:${i + 2}" aria-label="${esc(K.dlugaData(d))}, ${esc(t.nazwa)}: edytuj godziny tego dnia">${glowa}<span class="sg-pod">${esc(podpis(k.terap, k.data))}</span></button>`;
    });
    for (let r = 0; r < RZEDY; r += 4) h += `<div class="sg-czas" style="grid-row:${r + 2} / span 4;grid-column:1">${K.godz(K.rzadNaMin(r))}</div>`;
    kol.forEach((k, i) => {
      const t = terapeuta(k.terap);
      const stany = K.stanyKolumny(D(), k.terap, k.data);
      const d = K.zIso(k.data);
      const kolorT = K.kolor(t.kolor);
      const startyPrzedz = new Set(K.przedzialy(D(), k.terap, k.data).map(([x]) => K.minNaRzad(x)));
      for (let r = 0; r < RZEDY; r++) {
        const c = stany[r];
        const min = K.rzadNaMin(r);
        const otwarte = c.s === 'wolne' || (c.s === 'blokada' && c.wolneBylo);
        const klasy = `sg-kom sg-kom--${c.s === 'wolne' ? 'wolne' : 'poza'}${c.past ? ' sg-kom--minione' : ''}${r % 4 === 0 ? ' h' : r % 2 === 0 ? ' p' : ''}${c.s === 'rez' || c.s === 'blokada' ? ' sg-kom--pod' : ''}`;
        const kolor = ent() ? kolorT : K.kolor(K.miejsce(D(), c.lok || D().miejsca[0].id).kolor);
        const etyk = c.s === 'wolne' && !ent() && D().miejsca.length > 1 && (startyPrzedz.has(r) || (r > 0 && stany[r - 1].s === 'wolne' && stany[r - 1].lok !== c.lok)) ? `<em>${esc(K.miejsce(D(), c.lok).kr)}</em>` : '';
        h += `<button type="button" tabindex="-1" class="${klasy}" data-r="${r}" data-d="${k.data}" data-t="${k.terap}" data-godz="${K.godz(min)}" style="grid-row:${r + 2};grid-column:${i + 2};--c:${kolor}" aria-label="${esc(DNI[d.getDay()])} ${d.getDate()} ${MIES[d.getMonth()]}, ${K.godz(min)}: ${otwarte ? 'otwarte' : 'zamknięte'}">${etyk}</button>`;
      }
      let r = 0;
      while (r < RZEDY) {
        const c = stany[r];
        if (c.s === 'rez') {
          const rez = c.rez;
          let e = r;
          while (e < RZEDY && stany[e].s === 'rez' && stany[e].rez === rez) e++;
          const lok = K.miejsce(D(), rez.lok);
          const kolor = ent() ? kolorT : K.kolor(lok.kolor);
          const u = K.usluga(D(), rez.usluga);
          const klasa = `sg-rez${e - r <= 2 ? ' sg-rez--k' : ''}${rez.status === 'przyszedl' ? ' sg-rez--ok' : ''}${rez.status === 'nieobecny' ? ' sg-rez--x' : ''}${rez.status === 'oczekuje' ? ' sg-rez--czeka' : ''}${rez.nowa ? ' sg-rez--nowa' : ''}${ui.przenos === rez.id ? ' sg-rez--przenos' : ''}`;
          h += `<button type="button" class="${klasa}" data-rez="${rez.id}" style="grid-row:${r + 2} / span ${e - r};grid-column:${i + 2};--c:${kolor}" aria-label="Rezerwacja: ${esc(rez.imie)}, ${esc(u.nazwa)}, ${esc(DNI[d.getDay()])} ${d.getDate()} ${MIES[d.getMonth()]}, ${K.godz(rez.od)}">
            <span class="sg-rez__l"><b>${K.godz(rez.od)}</b> ${esc(rez.imie)}</span><small>${esc(u.nazwa)}</small><span class="sg-rez__b">${badge(rez)}</span></button>`;
          r = e;
        } else if (c.s === 'blokada') {
          let e = r;
          while (e < RZEDY && stany[e].s === 'blokada' && stany[e].bl === c.bl) e++;
          h += `<button type="button" class="sg-blok" data-blok="${c.bl.id}" style="grid-row:${r + 2} / span ${e - r};grid-column:${i + 2}" aria-label="Blokada: ${esc(c.bl.powod)}"><span>${esc(c.bl.powod)}</span></button>`;
          r = e;
        } else r += 1;
      }
      if (k.data === dzisIso) {
        const m = K.terazMin();
        if (m >= START && m < END) h += `<div class="sg-teraz" aria-hidden="true" style="grid-row:${Math.floor((m - START) / KROK) + 2};grid-column:${i + 2};--f:${((m - START) % KROK) / KROK}"></div>`;
      }
    });
    const el = document.createElement('div');
    el.className = `kal-przew${ui.edycja ? ' kal-przew--edycja' : ''}${ui.przenos ? ' kal-przew--przenos' : ''}`;
    el.id = 'siatka-przew';
    el.innerHTML = `<div class="siatka" id="siatka" style="grid-template-columns:${waski.matches ? 46 : 54}px repeat(${kol.length}, ${waski.matches ? 'minmax(0, 1fr)' : stan.widok === 'tydzien' ? 'minmax(112px, 1fr)' : 'minmax(180px, 1fr)'});grid-template-rows:auto repeat(${RZEDY}, var(--h))">${h}</div>`;
    $('#widok').replaceChildren(el);
  }

  /* ── Widok miesiąca ─────────────────────────────────────────────────── */
  function renderMiesiac() {
    const d = K.zIso(stan.data);
    const pierwszy = new Date(d.getFullYear(), d.getMonth(), 1);
    const pon = K.poniedzialek(pierwszy);
    const ludzie = osoby();
    let h = `<div class="mi" role="grid" aria-label="${esc(tytulZakresu())}">${['pn', 'wt', 'śr', 'cz', 'pt', 'sb', 'nd'].map((x) => `<div class="mi__gl" role="columnheader">${x}</div>`).join('')}`;
    for (let i = 0; i < 42; i++) {
      const dd = K.dodaj(pon, i);
      if (i >= 35 && dd.getMonth() !== d.getMonth()) break;
      const data = K.iso(dd);
      const wyp = K.wypelnienie(D(), ludzie, data);
      const n = ludzie.reduce((s, t) => s + K.rezDnia(D(), t.id, data).length, 0);
      const zam = ludzie.every((t) => !K.przedzialy(D(), t.id, data).length);
      const bl = ludzie.some((t) => K.blokady(D(), t.id, data).some((x) => x.od <= START && x.do >= END));
      h += `<button type="button" role="gridcell" class="mi__dzien${dd.getMonth() !== d.getMonth() ? ' mi__dzien--obcy' : ''}${data === K.dzisIso() ? ' mi__dzien--dzis' : ''}${zam ? ' mi__dzien--zam' : ''}" data-miesiac-dzien="${data}" aria-label="${esc(K.dlugaData(dd))}: ${wizyt(n)}${bl ? ', blokada' : zam ? ', nie przyjmujesz' : ''}">
        <span class="mi__nr">${dd.getDate()}</span>
        ${zam ? `<span class="mi__stan">${bl ? 'blokada' : K.swietoZamkniete(D(), data) ? esc(K.swieto(data)) : n ? wizyt(n) : 'wolne'}</span>` : `<span class="mi__n">${n ? wizyt(n) : '—'}</span><span class="mi__pasek" aria-hidden="true"><i style="width:${wyp.procent}%"></i></span><span class="mi__p">${wyp.procent}% zajęte</span>`}
      </button>`;
    }
    $('#widok').innerHTML = h + '</div>';
  }

  /* ── Agenda ─────────────────────────────────────────────────────────── */
  function renderAgenda() {
    const od = K.zIso(stan.data);
    const ludzie = osoby();
    let h = '<div class="ag">';
    let razem = 0;
    for (let i = 0; i < 14; i++) {
      const data = K.iso(K.dodaj(od, i));
      const lista = ludzie.flatMap((t) => K.rezDnia(D(), t.id, data)).sort((a, b) => a.od - b.od);
      razem += lista.length;
      if (!lista.length && ludzie.every((t) => !K.przedzialy(D(), t.id, data).length)) continue;
      const wolne = K.wolneMinuty(D(), ludzie, data, data === K.dzisIso() ? K.terazMin() : START);
      const etyk = ['Dziś', 'Jutro'].includes(K.wzgledna(data)) ? `${K.wzgledna(data)}, ${K.dlugaData(K.zIso(data))}` : K.dlugaData(K.zIso(data));
      h += `<section class="ag__dzien"><h3><button type="button" data-miesiac-dzien="${data}">${esc(etyk)}</button><small>${wizyt(lista.length)} · wolne ${esc(K.godzTekst(wolne))}</small></h3>`;
      if (!lista.length) h += '<p class="ag__pusto">Brak wizyt.</p>';
      else {
        h += '<ul>';
        for (const r of lista) {
          const u = K.usluga(D(), r.usluga);
          const t = terapeuta(r.terap);
          h += `<li class="ag__w${r.status === 'przyszedl' ? ' ag__w--ok' : ''}${r.status === 'nieobecny' ? ' ag__w--x' : ''}">
            <button type="button" class="ag__glowny" data-rez="${r.id}"><b>${K.czas(r.od, r.dl)}</b><span class="ag__imie">${esc(r.imie)}</span><span class="ag__usl">${esc(u.nazwa)}${ent() ? ' · ' + esc(t.nazwa.replace(/^mgr\s+/, '')) : ''}</span><span class="ag__znaki">${badge(r)}</span></button>
            <span class="ag__szybkie">
              <a class="przycisk przycisk--mini przycisk--cichy" href="tel:${esc(r.tel.replace(/\s/g, ''))}">Zadzwoń</a>
              ${K.minelo(r.data, r.od) && r.status === 'potwierdzona' ? `<button type="button" class="przycisk przycisk--mini" data-status="${r.id}|przyszedl">Przyszedł</button>` : ''}
            </span></li>`;
        }
        h += '</ul>';
      }
      h += '</section>';
    }
    if (!razem) h += '<p class="ag__pusto ag__pusto--duze">Brak wizyt w najbliższych dwóch tygodniach.</p>';
    $('#widok').innerHTML = h + '</div>';
  }

  function renderWidok() {
    if (stan.widok === 'miesiac') renderMiesiac();
    else if (stan.widok === 'agenda') renderAgenda();
    else renderSiatka();
    $('.kal-karta').dataset.widok = stan.widok;
  }

  function renderLegenda() {
    const poz = [];
    if (ent()) D().zespol.filter((t) => t.widoczny !== false).forEach((t) => poz.push(`<li><i style="background:${K.kolor(t.kolor)}"></i>${esc(t.nazwa)}</li>`));
    else D().miejsca.forEach((m) => poz.push(`<li><i style="background:${K.kolor(m.kolor)}"></i>${esc(m.nazwa)}</li>`));
    poz.push('<li><i class="lg-wolne"></i>Otwarte, pacjent może zarezerwować</li>', '<li><i class="lg-zajete"></i>Rezerwacja</li>', '<li><i class="lg-blok"></i>Blokada</li>');
    if (ui.edycja) poz.push('<li><i class="lg-zam"></i>Zamknięte</li>');
    $('#legenda').innerHTML = stan.widok === 'miesiac' || stan.widok === 'agenda' ? '' : poz.join('');
  }

  /* ── Panel boczny ───────────────────────────────────────────────────── */
  function doOznaczenia() {
    const d0 = K.iso(K.dodaj(new Date(), -2));
    return D().rezerwacje.filter((r) => r.data >= d0 && r.status === 'potwierdzona' && K.minelo(r.data, r.od + r.dl)).sort((a, b) => (a.data + K.pad(a.od)).localeCompare(b.data + K.pad(b.od)));
  }
  function renderBoki() {
    const dzis = K.dzisIso();
    const ludzie = osoby();
    const lista = ludzie.flatMap((t) => K.rezDnia(D(), t.id, dzis)).sort((a, b) => a.od - b.od);
    const wyp = K.wypelnienie(D(), ludzie, dzis);
    const teraz = K.terazMin();
    const wolneDzis = K.wolneMinuty(D(), ludzie, dzis, Math.max(START, teraz));
    const nast = D().rezerwacje.filter((r) => !K.minelo(r.data, r.od)).sort((a, b) => (a.data + K.pad(a.od)).localeCompare(b.data + K.pad(b.od)))[0];
    let nastTekst = '';
    if (nast) {
      const roznica = K.dniMiedzy(dzis, nast.data) * 1440 + nast.od - teraz;
      const kiedy = nast.data === dzis ? (roznica < 60 ? `za ${Math.max(1, roznica)} min` : `za ${Math.round(roznica / 60)} h`) : `${K.wzgledna(nast.data).toLowerCase()}, ${K.godz(nast.od)}`;
      nastTekst = `<button type="button" class="nast" data-rez="${nast.id}"><span>Następna wizyta</span><b>${esc(kiedy)}</b><em>${esc(nast.imie)}, ${esc(K.usluga(D(), nast.usluga).nazwa)}</em></button>`;
    }
    if ($('#dzis')) $('#dzis').innerHTML = `<h3>Dziś</h3>
      <dl class="liczby"><div><dt>Wizyty</dt><dd>${lista.length}</dd></div><div><dt>Wolne</dt><dd>${esc(K.godzTekst(wolneDzis))}</dd></div><div><dt>Zajęte</dt><dd>${wyp.procent}%</dd></div></dl>
      ${nastTekst}
      ${lista.length ? `<ul class="dzis-lista">${lista.slice(0, 5).map((r) => `<li><button type="button" data-rez="${r.id}" class="${r.status === 'przyszedl' ? 'ok' : r.status === 'nieobecny' ? 'x' : ''}"><b>${K.godz(r.od)}</b><span>${esc(r.imie)}<small>${esc(K.usluga(D(), r.usluga).nazwa)}</small></span></button></li>`).join('')}</ul>${lista.length > 5 ? `<p class="wiecej">i jeszcze ${lista.length - 5} <button type="button" class="link" data-widok="agenda">w agendzie</button></p>` : ''}` : '<p class="pusto">Dziś nie ma rezerwacji.</p>'}`;

    /* Wymaga uwagi: do potwierdzenia, nowe ze strony, do oznaczenia. */
    const nowe = D().rezerwacje.filter((r) => r.nowa && !K.minelo(r.data, r.od));
    const czeka = D().rezerwacje.filter((r) => r.status === 'oczekuje');
    const ozn = doOznaczenia();
    const wiersz = (r, akcje) => `<li><button type="button" class="uw__glowny" data-rez="${r.id}"><b>${esc(K.wzgledna(r.data))}, ${K.godz(r.od)}</b><span>${esc(r.imie)}<small>${esc(K.usluga(D(), r.usluga).nazwa)}</small></span></button><span class="uw__akcje">${akcje}</span></li>`;
    let u = '';
    if (czeka.length) u += `<h4>Do potwierdzenia <i>${czeka.length}</i></h4><ul>${czeka.slice(0, 4).map((r) => wiersz(r, `<button type="button" class="przycisk przycisk--mini" data-status="${r.id}|potwierdzona">Potwierdź</button>`)).join('')}</ul>`;
    if (nowe.length) u += `<h4>Nowe ze strony <i>${nowe.length}</i></h4><ul>${nowe.slice(0, 4).map((r) => wiersz(r, `<button type="button" class="przycisk przycisk--mini przycisk--cichy" data-widziane="${r.id}">Widziałem</button>`)).join('')}</ul>`;
    if (ozn.length) u += `<h4>Oznacz, czy przyszedł <i>${ozn.length}</i></h4><ul>${ozn.slice(0, 4).map((r) => wiersz(r, `<button type="button" class="przycisk przycisk--mini" data-status="${r.id}|przyszedl" aria-label="Przyszedł: ${esc(r.imie)}">✓</button><button type="button" class="przycisk przycisk--mini przycisk--cichy" data-status="${r.id}|nieobecny" aria-label="Nie przyszedł: ${esc(r.imie)}">✕</button>`)).join('')}</ul>${ozn.length > 4 ? `<p class="wiecej">i jeszcze ${ozn.length - 4}</p>` : ''}`;
    if ($('#uwaga')) $('#uwaga').innerHTML = `<h3>Wymaga uwagi</h3>${u || '<p class="pusto">Wszystko ogarnięte. Nic nie czeka na Twoją decyzję.</p>'}`;

    /* Co widzi pacjent: wybór usługi, lista terminów i symulacja rezerwacji. */
    const uslId = ui.uslugaPacjenta && D().uslugi.some((x) => x.id === ui.uslugaPacjenta) ? ui.uslugaPacjenta : D().uslugi[0].id;
    ui.uslugaPacjenta = uslId;
    const terminy = K.terminyPacjenta(D(), uslId, { ile: 6 });
    if (!$('#pacjent')) return;
    $('#pacjent').innerHTML = `<h3>Co widzi pacjent</h3>
      <p class="pod">Najbliższe wolne terminy na Twojej stronie. Lista zmienia się razem z grafikiem. Kliknij termin, żeby zobaczyć go w kalendarzu.</p>
      <div class="widget" aria-label="Podgląd widżetu rezerwacji na stronie gabinetu">
        <div class="widget__bar" aria-hidden="true"><i></i><i></i><i></i><span>twoja-strona.pl › umow-wizyte</span></div>
        <div class="widget__tresc">
          <label class="widget__usl"><span>Usługa</span><select id="sel-usluga">${D().uslugi.map((x) => `<option value="${x.id}"${x.id === uslId ? ' selected' : ''}>${esc(x.nazwa)} (${esc(K.dlTekst(x.min))})</option>`).join('')}</select></label>
          ${terminy.length ? `<ul class="terminy">${terminy.map((t) => `<li><button type="button" data-skocz="${t.data}|${t.ids[0]}|${t.od}"><span class="t-dzien">${esc(K.wzgledna(t.data))}</span><b>${K.godz(t.od)}</b><span class="t-kto">${esc(ent() ? t.osoby.join(', ') : K.miejsce(D(), t.lok).kr)}</span></button></li>`).join('')}</ul>` : '<p class="pusto">Brak wolnych terminów. Pacjent zobaczy komunikat, że może zadzwonić.</p>'}
        </div>
      </div>
      <button type="button" class="przycisk przycisk--cichy przycisk--pelny" data-akcja="symuluj" ${terminy.length ? '' : 'disabled'}>Zasymuluj rezerwację ze strony</button>
      <p class="pod pod--mala">Pokazuje, jak nowa rezerwacja pacjenta pojawia się w kalendarzu.</p>`;
  }

  /* ── Render całości ─────────────────────────────────────────────────── */
  function render() {
    renderPasek();
    renderTryb();
    renderPrzenos();
    renderChipy();
    renderWidok();
    renderLegenda();
    renderBoki();
    if (ui.szuflada) odswiezSzuflade();
  }

  /* ── Szuflada: jedno miejsce na wszystkie formularze ────────────────── */
  const sz = () => $('#szuflada');
  function otworzSzuflade(typ, arg) {
    if (!ui.szuflada) ui.fokus = document.activeElement;
    ui.szuflada = { typ, arg };
    ui.odwolywanie = false;
    sz().hidden = false;
    $('#szuflada-tlo').hidden = !waski.matches;
    document.body.classList.add('ma-szuflade');
    odswiezSzuflade(true);
  }
  function zamknijSzuflade(przywrocFokus = true) {
    if (!ui.szuflada) return;
    ui.szuflada = null;
    ui.odwolywanie = false;
    sz().hidden = true;
    $('#szuflada-tlo').hidden = true;
    document.body.classList.remove('ma-szuflade');
    if (przywrocFokus && ui.fokus && document.contains(ui.fokus)) ui.fokus.focus();
  }
  function selektorFokusu() {
    const a = document.activeElement;
    if (!a || !sz().contains(a)) return null;
    if (a.id) return `#${a.id}`;
    const d = a.dataset;
    for (const k of ['u', 'z', 'm', 'g', 's', 'p']) if (d[k] !== undefined) return `[data-${k}="${d[k]}"]${d.i !== undefined ? `[data-i="${d.i}"]` : ''}${d.dz !== undefined ? `[data-dz="${d.dz}"]` : ''}`;
    return null;
  }
  function odswiezSzuflade(fokus) {
    const { typ, arg } = ui.szuflada;
    const zapamietany = fokus ? null : selektorFokusu();
    const budowa = { rez: szufladaRez, nowa: szufladaNowa, zaznaczenie: szufladaZaznaczenie, dzien: szufladaDzien, godziny: szufladaGodziny, blokada: szufladaBlokada, ustawienia: szufladaUstawienia, skroty: szufladaSkroty }[typ];
    const html = budowa(arg);
    if (html == null) { zamknijSzuflade(false); return; }
    const tresc = $('#szuflada-tresc');
    const przewiniecie = tresc.scrollTop;
    tresc.innerHTML = html;
    if (fokus) {
      const f = $('[data-fokus]', tresc) || $('input:not([type=checkbox]):not([type=radio]), select', tresc);
      (f || $('#szuflada-tytul')).focus({ preventScroll: true });
      tresc.scrollTop = 0;
    } else {
      tresc.scrollTop = przewiniecie;
      if (zapamietany) { const f = $(zapamietany, tresc); if (f) f.focus({ preventScroll: true }); }
    }
    if (typ === 'nowa') statusNowej();
    if (typ === 'blokada') statusBlokady();
  }
  const naglowek = (tytul, pod) => `<header class="sz__g"><div><h2 id="szuflada-tytul" tabindex="-1">${tytul}</h2>${pod ? `<p>${pod}</p>` : ''}</div><button type="button" class="ikona" data-akcja="zamknij" aria-label="Zamknij panel">×</button></header>`;
  const opcje = (lista, wybrana) => lista.map(([v, n]) => `<option value="${esc(v)}"${String(v) === String(wybrana) ? ' selected' : ''}>${esc(n)}</option>`).join('');
  const OPCJE_DL = Array.from({ length: 12 }, (_, i) => [(i + 1) * 15, K.dlTekst((i + 1) * 15)]);
  const pole = (id, etykieta, tresc, pod = '') => `<div class="pole"><label for="${id}">${etykieta}</label>${tresc}${pod ? `<p class="pod">${pod}</p>` : ''}</div>`;

  /* Szczegóły rezerwacji */
  const DECYZJE = [
    ['potwierdzona', 'Potwierdzona', ''],
    ['przyszedl', '✓ Odbyta', 'ok'],
    ['nieobecny', '✕ Nieodbyta', 'x'],
  ];
  function szufladaRez(id) {
    const r = D().rezerwacje.find((x) => x.id === id);
    if (!r) return null;
    const u = K.usluga(D(), r.usluga);
    const t = terapeuta(r.terap);
    const d = K.zIso(r.data);
    const hist = K.pacjenci(D()).get(r.tel.replace(/\D/g, ''));
    const odwolana = !K.aktywna(r);
    const minela = K.minelo(r.data, r.od);
    const status = `<span class="stat stat--${r.status}">${esc(K.STATUSY[r.status])}</span>`;
    if (ui.odwolywanie) {
      const godzinDo = Math.round((K.zIso(r.data).getTime() + r.od * 60000 - Date.now()) / 3600000);
      return `${naglowek('Odwołać wizytę?', `${esc(r.imie)}, ${esc(K.dlugaData(d))}, ${K.godz(r.od)}`)}
        <div class="formularz">
          <fieldset class="zakres zakres--decyzja"><legend>Kto odwołuje</legend>
            <label><input type="radio" name="kto-odwoluje" value="odwolana" checked data-fokus /> Pacjent odwołał</label>
            <label><input type="radio" name="kto-odwoluje" value="anulowana" /> Gabinet anuluje (np. choroba terapeuty)</label>
          </fieldset>
          ${pole('f-powod', 'Powód <em>(widzisz tylko Ty)</em>', '<select id="f-powod"><option>Bez podania powodu</option><option>Choroba</option><option>Brak czasu, przełoży później</option><option>Nie odbiera telefonu</option><option>Choroba terapeuty</option><option>Inny powód</option></select>')}
          <label class="check"><input type="checkbox" id="f-pozno"${godzinDo >= 0 && godzinDo < 24 ? ' checked' : ''} /><span>Odwołanie później niż 24 godziny przed wizytą</span></label>
          ${r.zrodlo === 'strona' ? '<label class="check"><input type="checkbox" id="f-powiadom" checked /><span>Powiadom pacjenta e-mailem (w demie to symulacja)</span></label>' : ''}
          ${r.zal && D().ustawienia.zaliczki ? `<p class="okno__nota">Pacjent wpłacił zaliczkę ${r.zal.kwota} zł (${esc(r.zal.metoda)}). Zwrot robisz u operatora płatności, zgodnie ze swoim regulaminem.</p>` : ''}
          <p class="okno__nota">Termin od razu wraca na stronę jako wolny, a wizyta zostaje w historii jako odwołana. Możesz to cofnąć albo przywrócić wizytę później.</p>
        </div>
        <footer class="sz__st"><button type="button" class="przycisk przycisk--cichy" data-akcja="odwolaj-wroc">Wróć</button><button type="button" class="przycisk przycisk--alert" data-akcja="odwolaj-potwierdz" data-id="${r.id}">Odwołaj wizytę</button></footer>`;
    }
    const decyzje = odwolana
      ? `<p class="sz__odwolana">${esc(K.STATUSY[r.status])}${r.powod ? `: ${esc(r.powod)}` : ''}${r.pozno ? ' · późno (mniej niż 24 h)' : ''}. Termin jest wolny.</p>
         <button type="button" class="przycisk" data-akcja="przywroc" data-id="${r.id}">Przywróć wizytę</button>`
      : `${r.status === 'oczekuje' ? `<button type="button" class="przycisk" data-status="${r.id}|potwierdzona">Potwierdź wizytę</button>` : ''}
         <div class="decyzje" role="group" aria-label="Decyzja o wizycie">${DECYZJE.map(([k, n, kl]) => `<button type="button" class="decyzja${kl ? ' decyzja--' + kl : ''}" data-status="${r.id}|${k}" aria-pressed="${r.status === k}"${k !== 'potwierdzona' && !minela ? ' title="Wizyta jeszcze się nie odbyła"' : ''}>${n}</button>`).join('')}</div>`;
    return `${naglowek(esc(r.imie), `${esc(K.dlugaData(d))}, ${K.czas(r.od, r.dl)}`)}
      <div class="sz__chipy">${status}<span class="stat">${esc(K.ZRODLA_KR[r.zrodlo] || r.zrodlo)}</span>${r.nowa ? '<span class="stat stat--nowa">nowa</span>' : ''}${r.zal && D().ustawienia.zaliczki ? `<span class="stat stat--zal">zaliczka ${r.zal.kwota} zł</span>` : ''}</div>
      <div class="sz__glowne">${decyzje}</div>
      <dl class="dane">
        <div><dt>Telefon</dt><dd><a href="tel:${esc(r.tel.replace(/\s/g, ''))}">${esc(r.tel)}</a></dd></div>
        <div><dt>Usługa</dt><dd>${esc(u.nazwa)}, ${esc(K.dlTekst(r.dl))}</dd></div>
        <div><dt>${ent() ? 'Terapeuta' : 'Miejsce'}</dt><dd>${ent() ? esc(t.nazwa) : esc(K.miejsce(D(), r.lok).nazwa)}</dd></div>
        <div><dt>Skąd przyszedł</dt><dd><select class="dane__sel" data-zrodlo-rez="${r.id}" aria-label="Skąd przyszedł pacjent">${Object.entries(K.ZRODLA).map(([k, n]) => `<option value="${k}"${r.zrodlo === k ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></dd></div>
        ${r.zal && D().ustawienia.zaliczki ? `<div><dt>Zaliczka online</dt><dd>${r.zal.kwota} zł, opłacona (${esc(r.zal.metoda)})</dd></div>` : ''}
        ${r.uwaga ? `<div><dt>Wiadomość od pacjenta</dt><dd>${esc(r.uwaga)}</dd></div>` : ''}
        <div><dt>Historia</dt><dd>${hist && hist.razem > 1 ? `${wizyt(hist.razem)} u Was${hist.nieobecny ? `, ${hist.nieobecny}× nieodbyta` : ''}${hist.odwolal ? `, ${hist.odwolal}× odwołana` : ''}` : 'pierwsza wizyta'}</dd></div>
      </dl>
      <div class="pola2">
        ${pole('f-cena', 'Cena wizyty <em>(zł)</em>', `<input id="f-cena" type="number" min="0" step="10" data-cena="${r.id}" value="${K.cena(D(), r)}" />`, r.cena != null && r.cena !== u.cena ? `W cenniku: ${u.cena} zł` : 'Liczy się do przychodu, gdy wizyta jest odbyta.')}
      </div>
      ${pole('f-notatka', 'Notatka dla gabinetu <em>(nie widzi jej pacjent)</em>', `<textarea id="f-notatka" data-notatka="${r.id}" rows="2" placeholder="np. woli rano, ma zwolnienie">${esc(r.notatka || '')}</textarea>`)}
      ${odwolana ? '' : `<div class="sz__drugie">
        <button type="button" class="przycisk przycisk--cichy" data-akcja="przenos" data-id="${r.id}">Przełóż</button>
        <button type="button" class="przycisk przycisk--cichy" data-akcja="edytuj" data-id="${r.id}">Zmień dane</button>
        <button type="button" class="przycisk przycisk--cichy" data-akcja="powtorz" data-id="${r.id}">Za tydzień</button>
        <button type="button" class="przycisk przycisk--cichy przycisk--ostrzez" data-akcja="odwolaj" data-id="${r.id}">Odwołaj</button>
      </div>
      <p class="pod">Przełóż: kliknij nowy termin w kalendarzu albo przeciągnij wizytę.</p>`}`;
  }

  /* Nowa lub edytowana rezerwacja */
  function szufladaNowa(a) {
    const edytowana = a.id ? D().rezerwacje.find((x) => x.id === a.id) : null;
    if (a.id && !edytowana) return null;
    const r = edytowana || { imie: a.imie || '', tel: a.tel || '', notatka: '' };
    const data = r.data || a.data || stan.data;
    const od = r.od != null ? r.od : a.od != null ? a.od : K.zH('9:00');
    const terap = r.terap || a.terap || stan.terap;
    /* Kliknięty wolny termin: proponujemy pierwszą usługę, która się w nim mieści, zamiast od razu pokazywać kolizję. */
    const miesci = (u) => { const w = K.sprawdz(D(), terap, data, od, u.min, null); return !w.kolizja && !w.zakres; };
    const usl = r.usluga || a.usluga || (!edytowana && a.od != null ? (D().uslugi.find(miesci) || D().uslugi[0]).id : D().uslugi[0].id);
    const dl = r.dl || a.dl || K.usluga(D(), usl).min;
    const lokId = r.lok || K.lok(D(), terap, data, od);
    const znani = [...K.pacjenci(D()).values()];
    return `${naglowek(edytowana ? 'Zmień rezerwację' : 'Nowa rezerwacja', edytowana ? esc(edytowana.imie) : 'Pacjent, który zadzwonił albo przyszedł do recepcji.')}
      <div class="formularz" data-formularz="nowa" data-edytowana="${edytowana ? edytowana.id : ''}">
        <datalist id="znani">${znani.map((p) => `<option value="${esc(p.imie)}">${esc(p.tel)}</option>`).join('')}</datalist>
        ${pole('f-imie', 'Pacjent', `<input id="f-imie" data-fokus list="znani" type="text" autocomplete="off" value="${esc(r.imie || '')}" placeholder="Imię i nazwisko" />`, '<span id="znany"></span>')}
        ${pole('f-tel', 'Telefon', `<input id="f-tel" type="tel" inputmode="tel" autocomplete="off" value="${esc(r.tel || '')}" placeholder="600 100 200" />`)}
        <div class="pola2">
          ${pole('f-usl', 'Usługa', `<select id="f-usl">${D().uslugi.map((u) => `<option value="${u.id}"${u.id === usl ? ' selected' : ''}>${esc(u.nazwa)}</option>`).join('')}</select>`)}
          ${pole('f-dl', 'Czas trwania', `<select id="f-dl">${opcje(OPCJE_DL, dl)}</select>`)}
        </div>
        <div class="pola2">
          ${pole('f-data', 'Data', `<input id="f-data" type="date" value="${data}" />`)}
          ${pole('f-od', 'Godzina', `<input id="f-od" type="time" step="900" value="${K.godz2(od)}" />`)}
        </div>
        ${ent() || D().miejsca.length > 1 ? `<div class="${ent() && D().miejsca.length > 1 ? 'pola2' : ''}">
          ${ent() ? pole('f-terap', 'Terapeuta', `<select id="f-terap">${D().zespol.map((t) => `<option value="${t.id}"${t.id === terap ? ' selected' : ''}>${esc(t.nazwa)}</option>`).join('')}</select>`) : ''}
          ${D().miejsca.length > 1 ? pole('f-lok', ent() ? 'Lokalizacja' : 'Miejsce', `<select id="f-lok">${D().miejsca.map((m) => `<option value="${m.id}"${m.id === lokId ? ' selected' : ''}>${esc(m.nazwa)}</option>`).join('')}</select>`, 'Podpowiadamy z grafiku, możesz zmienić.') : ''}
        </div>` : ''}
        <p class="status-nowej" id="nowa-status" role="status"></p>
        <div class="pola2">
          ${pole('f-zrodlo', 'Skąd przyszedł pacjent', `<select id="f-zrodlo">${Object.entries(K.ZRODLA).map(([k, n]) => `<option value="${k}"${(r.zrodlo || a.zrodlo || 'telefon') === k ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>`)}
          ${pole('f-cena', 'Cena <em>(zł)</em>', `<input id="f-cena" type="number" min="0" step="10" value="${r.id ? K.cena(D(), r) : K.usluga(D(), usl).cena}" />`)}
        </div>
        ${pole('f-notatka', 'Notatka <em>(dla gabinetu)</em>', `<textarea id="f-notatka" rows="2">${esc(r.notatka || '')}</textarea>`)}
        ${edytowana ? '' : pole('f-powt', 'Powtarzaj', `<select id="f-powt"><option value="0">Nie powtarzaj</option>${[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `<option value="${n}">co tydzień, jeszcze ${n} ${lw(n, 'raz', 'razy', 'razy')}</option>`).join('')}</select>`, 'Seria wizyt o tej samej godzinie. Kolidujące terminy pomijamy i mówimy o tym.')}
      </div>
      <footer class="sz__st">
        ${!edytowana && a.zamknijLink ? `<button type="button" class="przycisk przycisk--cichy" data-akcja="zamknij-termin" data-t="${terap}" data-d="${data}" data-od="${od}">Zamknij ten termin dla pacjentów</button>` : ''}
        <button type="button" class="przycisk przycisk--cichy" data-akcja="zamknij">Anuluj</button>
        <button type="button" class="przycisk" data-akcja="zapisz-nowa" id="zapisz-nowa">${edytowana ? 'Zapisz zmiany' : 'Zapisz rezerwację'}</button>
      </footer>`;
  }
  function odczytNowej() {
    return {
      imie: $('#f-imie').value.trim(), tel: $('#f-tel').value.trim(), usluga: $('#f-usl').value, dl: Number($('#f-dl').value),
      data: $('#f-data').value, od: K.zH($('#f-od').value || '0:00'), terap: $('#f-terap') ? $('#f-terap').value : (ui.szuflada.arg.terap || stan.terap),
      lok: $('#f-lok') ? $('#f-lok').value : null, notatka: $('#f-notatka').value.trim(), powt: $('#f-powt') ? Number($('#f-powt').value) : 0,
      zrodlo: $('#f-zrodlo') ? $('#f-zrodlo').value : 'telefon', cena: $('#f-cena') ? Number($('#f-cena').value) || 0 : null,
      edytowana: $('[data-formularz="nowa"]').dataset.edytowana,
    };
  }
  function statusNowej() {
    const el = $('#nowa-status');
    if (!el) return;
    const f = odczytNowej();
    const przycisk = $('#zapisz-nowa');
    if (!f.data || !$('#f-od').value) { el.className = 'status-nowej status-nowej--blad'; el.textContent = 'Wybierz datę i godzinę.'; przycisk.disabled = true; return; }
    const w = K.sprawdz(D(), f.terap, f.data, f.od, f.dl, f.edytowana || null);
    przycisk.disabled = !!w.kolizja || !!w.zakres;
    if (w.kolizja) { el.className = 'status-nowej status-nowej--blad'; el.textContent = `Termin zajęty: ${w.kolizja.imie}, ${K.czas(w.kolizja.od, w.kolizja.dl)}.`; }
    else if (w.zakres) { el.className = 'status-nowej status-nowej--blad'; el.textContent = `Kalendarz pokazuje godziny ${K.godz(START)}–${K.godz(END)}.`; }
    else if (w.blokada) { el.className = 'status-nowej status-nowej--uwaga'; el.textContent = `W tym czasie jest blokada: ${w.blokada.powod}. Możesz wpisać pacjenta mimo to.`; }
    else if (w.poza) { el.className = 'status-nowej status-nowej--uwaga'; el.textContent = 'Poza godzinami przyjęć. Możesz wpisać pacjenta mimo to, a termin nie pojawi się na stronie.'; }
    else { el.className = 'status-nowej status-nowej--ok'; el.textContent = `Mieści się w godzinach przyjęć: ${K.czas(f.od, f.dl)}.`; }
    const znany = $('#znany');
    const hist = K.pacjenci(D()).get(f.tel.replace(/\D/g, ''));
    if (znany) znany.textContent = hist ? `Znamy go: ${wizyt(hist.razem)}, ostatnio ${K.wzgledna(hist.ostatnia).toLowerCase()}.` : '';
  }
  function pokazBlad(tekst, selektor) {
    const el = $('#nowa-status');
    if (el) { el.className = 'status-nowej status-nowej--blad'; el.textContent = tekst; }
    const p = $(selektor);
    if (p) { p.setAttribute('aria-invalid', 'true'); p.focus(); }
  }
  function zapiszNowa() {
    const f = odczytNowej();
    if (f.imie.split(/\s+/).filter(Boolean).length < 2) return pokazBlad('Wpisz imię i nazwisko pacjenta.', '#f-imie');
    if (f.tel.replace(/\D/g, '').length < 9) return pokazBlad('Wpisz numer telefonu (9 cyfr).', '#f-tel');
    const w = K.sprawdz(D(), f.terap, f.data, f.od, f.dl, f.edytowana || null);
    if (w.kolizja || w.zakres) return;
    if (f.edytowana) {
      zmien(`Zapisano zmiany: ${f.imie}`, () => {
        const r = D().rezerwacje.find((x) => x.id === f.edytowana);
        Object.assign(r, { imie: f.imie, tel: f.tel, usluga: f.usluga, dl: f.dl, data: f.data, od: f.od, terap: f.terap, lok: f.lok || K.lok(D(), f.terap, f.data, f.od), notatka: f.notatka, zrodlo: f.zrodlo, cena: f.cena });
      });
      return;
    }
    const pominiete = [];
    let dodane = 0;
    zmien(f.powt ? `Wpisano serię: ${f.imie}` : `Wpisano pacjenta: ${f.imie}`, () => {
      for (let i = 0; i <= f.powt; i++) {
        const data = K.iso(K.dodaj(K.zIso(f.data), i * 7));
        if (K.sprawdz(D(), f.terap, data, f.od, f.dl).kolizja) { pominiete.push(K.wzgledna(data)); continue; }
        D().rezerwacje.push({ id: `r${Date.now()}${i}`, terap: f.terap, data, od: f.od, dl: f.dl, usluga: f.usluga, cena: f.cena, imie: f.imie, tel: f.tel, uwaga: '', notatka: f.notatka, zrodlo: i === 0 ? f.zrodlo : 'powrot', lok: f.lok || K.lok(D(), f.terap, data, f.od), status: 'potwierdzona', nowa: false, zal: null });
        dodane += 1;
      }
    });
    if (f.powt) toast(`Wpisano ${dodane} z ${f.powt + 1} wizyt${pominiete.length ? `. Pominięto zajęte terminy: ${pominiete.join(', ')}.` : '.'}`, migawka);
    idzDoRezerwacji(f.terap, f.data);
  }

  /* Zaznaczenie zakresu: jedno miejsce, cztery akcje */
  function szufladaZaznaczenie(a) {
    const jednaKol = a.kol.length === 1;
    const t0 = terapeuta(a.kol[0].terap);
    const d0 = K.zIso(a.kol[0].data);
    const tekst = jednaKol ? `${DNI[d0.getDay()]} ${d0.getDate()}.${K.pad(d0.getMonth() + 1)}, ${K.czas(a.od, a.doo - a.od)}` : `${a.kol.length} ${lw(a.kol.length, 'dzień', 'dni', 'dni')}, ${K.czas(a.od, a.doo - a.od)}`;
    const konflikty = a.kol.reduce((s, k) => s + K.wizytyWPrzedziale(D(), k.terap, k.data, a.od, a.doo).length, 0);
    return `${naglowek('Zaznaczone godziny', `${esc(tekst)}${ent() && jednaKol ? ' · ' + esc(t0.nazwa) : ''}`)}
      <div class="sz__lista">
        ${jednaKol ? `<button type="button" class="sz__akcja" data-akcja="sel-pacjent"><b>Wpisz pacjenta</b><span>Rezerwacja od ${K.godz(a.od)}, do ${esc(K.dlTekst(Math.min(a.doo - a.od, 180)))}.</span></button>` : ''}
        <button type="button" class="sz__akcja" data-akcja="sel-zamknij"><b>Zamknij dla pacjentów</b><span>Pacjent nie zobaczy tych godzin na stronie. Istniejące wizyty zostają.${konflikty ? ` W tym czasie jest ${wizyt(konflikty)}.` : ''}</span></button>
        <button type="button" class="sz__akcja" data-akcja="sel-otworz"><b>Otwórz dla pacjentów</b><span>Jednorazowo, bez zmiany stałych godzin przyjęć.</span></button>
        <button type="button" class="sz__akcja" data-akcja="sel-blokada"><b>Dodaj blokadę</b><span>Z powodem, np. szkolenie albo wizyta lekarska.</span></button>
      </div>`;
  }

  /* Jeden dzień: przedziały, zamknięcie, przywrócenie grafiku */
  function szufladaDzien(a) {
    const d = K.zIso(a.data);
    const t = terapeuta(a.terap);
    if (!a.przedz) a.przedz = K.przedzialy(D(), a.terap, a.data).map((p) => [...p]);
    const rez = K.rezDnia(D(), a.terap, a.data);
    const bl = K.blokady(D(), a.terap, a.data);
    const wiersze = a.przedz.map(([x, y], i) => `<div class="przedz" data-i="${i}"><input type="time" step="900" data-p="od" value="${K.godz2(x)}" aria-label="Od" /><span>–</span><input type="time" step="900" data-p="do" value="${K.godz2(y)}" aria-label="Do" /><button type="button" class="ikona ikona--mala" data-akcja="przedz-usun" data-i="${i}" aria-label="Usuń przedział">×</button></div>`).join('');
    const mod = D().wyjatki.filter((w) => w.terap === a.terap && w.data === a.data).length;
    return `${naglowek(esc(K.dlugaData(d)), ent() ? esc(t.nazwa) : 'Godziny przyjęć w tym dniu')}
      <div class="sz__chipy"><span class="stat">${wizyt(rez.length)}</span>${bl.length ? `<span class="stat stat--blok">blokada: ${esc(bl[0].b.powod)}</span>` : ''}${mod ? '<span class="stat stat--nowa">zmiana jednorazowa</span>' : ''}</div>
      <div class="przedz-lista" id="przedz-lista">${wiersze || '<p class="pusto">W tym dniu nie przyjmujesz.</p>'}</div>
      <div class="sz__drugie"><button type="button" class="przycisk przycisk--cichy" data-akcja="przedz-dodaj">+ Dodaj przedział</button>
        <button type="button" class="przycisk przycisk--cichy" data-akcja="dzien-zamknij">Zamknij cały dzień</button>
        ${mod ? '<button type="button" class="przycisk przycisk--cichy" data-akcja="dzien-przywroc">Przywróć stały grafik</button>' : ''}</div>
      <fieldset class="zakres"><legend>Zastosuj</legend>
        <label><input type="radio" name="zakres" value="dzien" checked /> Tylko ${esc(K.dlugaData(d))}</label>
        <label><input type="radio" name="zakres" value="regula" /> Zmień stały grafik: wszystkie ${MNOGA[d.getDay()]}</label>
      </fieldset>
      <p class="status-nowej" id="dzien-status" role="status"></p>
      <footer class="sz__st"><button type="button" class="przycisk przycisk--cichy" data-akcja="zamknij">Anuluj</button><button type="button" class="przycisk" data-akcja="dzien-zapisz">Zapisz godziny</button></footer>`;
  }
  const odczytPrzedzialow = () => $$('#przedz-lista .przedz').map((p) => [K.zH($('[data-p="od"]', p).value || '0:00'), K.zH($('[data-p="do"]', p).value || '0:00')]);
  function zapiszDzien() {
    const a = ui.szuflada.arg;
    const przedz = odczytPrzedzialow();
    const blad = przedz.find(([x, y]) => y <= x || x < START || y > END);
    const st = $('#dzien-status');
    if (blad) { st.className = 'status-nowej status-nowej--blad'; st.textContent = blad[1] <= blad[0] ? 'Godzina „do” musi być późniejsza niż „od”.' : `Kalendarz pokazuje godziny ${K.godz(START)}–${K.godz(END)}.`; return; }
    const sc = K.scal(przedz);
    const regula = $('input[name="zakres"]:checked').value === 'regula';
    const d = K.zIso(a.data);
    zmien(regula ? 'Zmieniono stały grafik' : 'Zapisano godziny na ten dzień', () => {
      if (regula) {
        const tab = D().reguly[a.terap] || (D().reguly[a.terap] = {});
        const lok = (tab[d.getDay()] && tab[d.getDay()][0] && tab[d.getDay()][0].lok) || D().miejsca[0].id;
        if (sc.length) tab[d.getDay()] = sc.map(([x, y]) => ({ od: x, do: y, lok })); else delete tab[d.getDay()];
        D().wyjatki = D().wyjatki.filter((w) => !(w.terap === a.terap && w.data === a.data));
      } else K.ustawDzien(D(), a.terap, a.data, sc);
    });
  }

  /* Stały grafik tygodnia */
  function szufladaGodziny(a) {
    if (!a.stan) a.stan = JSON.parse(JSON.stringify(D().reguly[a.terap] || {}));
    const t = terapeuta(a.terap);
    const wiersze = K.DNI_PRACY.map((dz) => {
      const rr = a.stan[dz] || [];
      const lokSel = D().miejsca.length > 1
        ? `<select data-g="lok" data-dz="${dz}" aria-label="Miejsce, ${DNI[dz]}">${D().miejsca.map((m) => `<option value="${m.id}"${rr[0] && rr[0].lok === m.id ? ' selected' : ''}>${esc(m.kr)}</option>`).join('')}</select>`
        : '';
      return `<div class="gd" data-dz="${dz}"><div class="gd__gl"><label class="check check--dzien"><input type="checkbox" data-g="wl" data-dz="${dz}"${rr.length ? ' checked' : ''} /><span>${DNI[dz][0].toUpperCase() + DNI[dz].slice(1)}</span></label>${rr.length && dz <= 5 ? `<button type="button" class="link" data-akcja="gd-kopiuj" data-dz="${dz}">Skopiuj na pn–pt</button>` : ''}</div>
        ${rr.length ? `<div class="gd__przedz">${rr.map((r, i) => `<div class="przedz"><input type="time" step="900" data-g="od" data-dz="${dz}" data-i="${i}" value="${K.godz2(r.od)}" aria-label="Od, ${DNI[dz]}" /><span>–</span><input type="time" step="900" data-g="do" data-dz="${dz}" data-i="${i}" value="${K.godz2(r.do)}" aria-label="Do, ${DNI[dz]}" /><button type="button" class="ikona ikona--mala" data-akcja="gd-usun" data-dz="${dz}" data-i="${i}" aria-label="Usuń przedział">×</button></div>`).join('')}<div class="gd__dol"><button type="button" class="link" data-akcja="gd-dodaj" data-dz="${dz}">+ przedział (np. po przerwie)</button>${lokSel}</div></div>` : '<p class="gd__zam">nie przyjmujesz</p>'}</div>`;
    }).join('');
    const razem = K.DNI_PRACY.reduce((s, dz) => s + (a.stan[dz] || []).reduce((x, r) => x + Math.max(0, r.do - r.od), 0), 0);
    return `${naglowek('Godziny przyjęć', ent() ? esc(t.nazwa) : 'Stały grafik tygodnia')}
      <div class="presety"><span>Szybkie ustawienie:</span>
        <button type="button" class="chip" data-akcja="preset" data-p="8-16">Pn–Pt 8–16</button>
        <button type="button" class="chip" data-akcja="preset" data-p="9-17">Pn–Pt 9–17</button>
        <button type="button" class="chip" data-akcja="preset" data-p="2zm">Dwie zmiany</button>
        ${ent() ? `<label class="wybor wybor--maly"><span>Skopiuj od</span><select data-g="kopiuj-od"><option value="">wybierz…</option>${D().zespol.filter((x) => x.id !== a.terap).map((x) => `<option value="${x.id}">${esc(x.nazwa)}</option>`).join('')}</select></label>` : ''}</div>
      <div class="gd-lista">${wiersze}</div>
      <p class="razem">W tygodniu: <b>${esc(K.godzTekst(razem))}</b></p>
      <p class="status-nowej" id="gd-status" role="status"></p>
      <footer class="sz__st"><button type="button" class="przycisk przycisk--cichy" data-akcja="zamknij">Anuluj</button><button type="button" class="przycisk" data-akcja="gd-zapisz">Zapisz godziny</button></footer>`;
  }
  function zapiszGodziny() {
    const a = ui.szuflada.arg;
    const st = $('#gd-status');
    for (const dz of K.DNI_PRACY) {
      for (const r of a.stan[dz] || []) {
        const nazwa = DNI[dz][0].toUpperCase() + DNI[dz].slice(1);
        if (r.do <= r.od) { st.className = 'status-nowej status-nowej--blad'; st.textContent = `${nazwa}: godzina „do” musi być późniejsza niż „od”.`; return; }
        if (r.od < START || r.do > END) { st.className = 'status-nowej status-nowej--blad'; st.textContent = `Kalendarz pokazuje godziny ${K.godz(START)}–${K.godz(END)}.`; return; }
      }
    }
    const nowe = {};
    for (const dz of K.DNI_PRACY) {
      const sc = K.scal((a.stan[dz] || []).map((r) => [r.od, r.do]));
      const lok = (a.stan[dz] && a.stan[dz][0] && a.stan[dz][0].lok) || D().miejsca[0].id;
      if (sc.length) nowe[dz] = sc.map(([x, y]) => ({ od: x, do: y, lok }));
    }
    zmien('Godziny przyjęć zapisane', () => { D().reguly[a.terap] = nowe; });
  }

  /* Blokada */
  function szufladaBlokada(a) {
    const b = a.id ? D().blokady.find((x) => x.id === a.id) : null;
    if (a.id && !b) return null;
    const od = b ? b.od : a.od || stan.data;
    const doo = b ? b.do : a.do || od;
    const caly = b ? b.odMin == null : a.odMin == null;
    const odMin = b && b.odMin != null ? b.odMin : a.odMin != null ? a.odMin : K.zH('12:00');
    const doMin = b && b.doMin != null ? b.doMin : a.doMin != null ? a.doMin : K.zH('13:00');
    const dotyczy = b ? b.terap : a.terap || stan.terap;
    return `${naglowek(b ? esc(b.powod) : 'Dodaj blokadę', b ? 'Zmień albo usuń blokadę.' : 'Urlop, szkolenie, zwolnienie. Terminy znikają ze strony od razu.')}
      <div class="formularz" data-formularz="blokada" data-id="${b ? b.id : ''}">
        <div class="pola2">${pole('b-od', 'Od', `<input id="b-od" data-fokus type="date" value="${od}" />`)}${pole('b-do', 'Do (włącznie)', `<input id="b-do" type="date" value="${doo}" />`)}</div>
        <label class="check"><input type="checkbox" id="b-caly"${caly ? ' checked' : ''} /><span>Cały dzień</span></label>
        <div class="pola2" id="b-godz"${caly ? ' hidden' : ''}>${pole('b-odh', 'Od godziny', `<input id="b-odh" type="time" step="900" value="${K.godz2(odMin)}" />`)}${pole('b-doh', 'Do godziny', `<input id="b-doh" type="time" step="900" value="${K.godz2(doMin)}" />`)}</div>
        ${ent() ? pole('b-kto', 'Dotyczy', `<select id="b-kto">${D().zespol.map((t) => `<option value="${t.id}"${t.id === dotyczy ? ' selected' : ''}>${esc(t.nazwa)}</option>`).join('')}<option value="*"${dotyczy === '*' ? ' selected' : ''}>Cały gabinet</option></select>`) : ''}
        ${pole('b-powod', 'Powód <em>(widzisz tylko Ty)</em>', `<input id="b-powod" type="text" value="${esc(b ? b.powod : a.powod != null ? a.powod : 'Urlop')}" />`)}
        <p class="status-nowej" id="b-status" role="status"></p>
        <ul class="konflikty" id="b-konflikty"></ul>
      </div>
      <footer class="sz__st">${b ? `<button type="button" class="przycisk przycisk--alert" data-akcja="usun-blokade" data-id="${b.id}">Usuń blokadę</button>` : ''}<button type="button" class="przycisk przycisk--cichy" data-akcja="zamknij">Anuluj</button><button type="button" class="przycisk" data-akcja="zapisz-blokade">${b ? 'Zapisz' : 'Dodaj blokadę'}</button></footer>`;
  }
  function odczytBlokady() {
    const caly = $('#b-caly').checked;
    return {
      id: $('[data-formularz="blokada"]').dataset.id, od: $('#b-od').value, do: $('#b-do').value, caly,
      odMin: caly ? null : K.zH($('#b-odh').value || '0:00'), doMin: caly ? null : K.zH($('#b-doh').value || '0:00'),
      kto: $('#b-kto') ? $('#b-kto').value : D().zespol[0].id, powod: $('#b-powod').value.trim(),
    };
  }
  function konfliktyBlokady(f) {
    const wynik = [];
    if (!f.od || !f.do || f.do < f.od) return wynik;
    for (let d = f.od, i = 0; d <= f.do && i < 120; i++, d = K.iso(K.dodaj(K.zIso(d), 1))) {
      for (const r of K.wizytyWPrzedziale(D(), f.kto, d, f.odMin == null ? START : f.odMin, f.doMin == null ? END : f.doMin)) if (!K.minelo(r.data, r.od)) wynik.push(r);
    }
    return wynik;
  }
  function bladBlokady(f) {
    if (!f.od || !f.do) return 'Wybierz daty.';
    if (f.do < f.od) return 'Data końca nie może być wcześniejsza niż początku.';
    if (!f.caly && f.doMin <= f.odMin) return 'Godzina „do” musi być późniejsza niż „od”.';
    return '';
  }
  function statusBlokady() {
    const st = $('#b-status');
    if (!st) return;
    const f = odczytBlokady();
    $('#b-godz').hidden = f.caly;
    const blad = bladBlokady(f);
    st.className = `status-nowej${blad ? ' status-nowej--blad' : ''}`;
    st.textContent = blad;
    const k = blad ? [] : konfliktyBlokady(f);
    $('#b-konflikty').innerHTML = k.length ? `<li class="konflikty__g">W tym czasie masz już ${wizyt(k.length)}. Blokada ich nie odwołuje.</li>${k.slice(0, 5).map((r) => `<li><button type="button" class="link" data-rez="${r.id}">${esc(K.wzgledna(r.data))}, ${K.godz(r.od)} ${esc(r.imie)}</button></li>`).join('')}${k.length > 5 ? `<li>i jeszcze ${k.length - 5}</li>` : ''}` : '';
  }
  function zapiszBlokade() {
    const f = odczytBlokady();
    statusBlokady();
    if (bladBlokady(f)) return;
    if (!f.powod) { $('#b-status').className = 'status-nowej status-nowej--blad'; $('#b-status').textContent = 'Wpisz powód, żebyś wiedział, czego dotyczy blokada.'; $('#b-powod').focus(); return; }
    const k = konfliktyBlokady(f).length;
    zmien(k ? `Blokada zapisana. Zostało ${wizyt(k)} do przełożenia.` : 'Blokada zapisana, terminy zniknęły ze strony', () => {
      if (f.id) D().blokady = D().blokady.filter((b) => b.id !== f.id);
      D().blokady.push({ id: f.id || `b${Date.now()}`, terap: f.kto, od: f.od, do: f.do, odMin: f.odMin, doMin: f.doMin, powod: f.powod });
    });
  }

  /* Ustawienia: zasady, usługi, zespół, dodatki */
  function szufladaUstawienia() {
    const U = D().ustawienia;
    const lim = K.LIMITY[stan.tryb];
    const uslugi = D().uslugi.map((u, i) => `<div class="ust-wiersz" data-i="${i}">
      <input type="text" data-u="nazwa" data-i="${i}" value="${esc(u.nazwa)}" aria-label="Nazwa usługi" />
      <select data-u="min" data-i="${i}" aria-label="Czas trwania">${opcje(OPCJE_DL, u.min)}</select>
      <input type="number" min="0" step="10" data-u="cena" data-i="${i}" value="${u.cena}" aria-label="Cena w złotych" />
      ${U.zaliczki ? `<label class="check check--mini"><input type="checkbox" data-u="zaliczka" data-i="${i}"${u.zaliczka ? ' checked' : ''} /><span>zaliczka</span></label>` : ''}
      <button type="button" class="ikona ikona--mala" data-akcja="usluga-usun" data-i="${i}" aria-label="Usuń usługę"${D().uslugi.length < 2 ? ' disabled' : ''}>×</button></div>`).join('');
    const zespol = D().zespol.map((t, i) => `<div class="ust-wiersz ust-wiersz--zespol" data-i="${i}">
      <input type="text" data-z="nazwa" data-i="${i}" value="${esc(t.nazwa)}" aria-label="Imię i nazwisko" />
      <select data-z="kolor" data-i="${i}" aria-label="Kolor">${K.KOLORY.map((c, j) => `<option value="${j}"${t.kolor === j ? ' selected' : ''}>Kolor ${j + 1}</option>`).join('')}</select>
      <i class="kolor" style="background:${K.kolor(t.kolor)}"></i>
      <label class="check check--mini"><input type="checkbox" data-z="widoczny" data-i="${i}"${t.widoczny !== false ? ' checked' : ''} /><span>w kalendarzu</span></label>
      <button type="button" class="ikona ikona--mala" data-akcja="terap-usun" data-i="${i}" aria-label="Usuń terapeutę"${D().zespol.length < 2 ? ' disabled' : ''}>×</button></div>`).join('');
    const miejsca = D().miejsca.map((m, i) => `<div class="ust-wiersz ust-wiersz--miejsce" data-i="${i}">
      <input type="text" data-m="nazwa" data-i="${i}" value="${esc(m.nazwa)}" aria-label="Adres" />
      <input type="text" data-m="kr" data-i="${i}" value="${esc(m.kr)}" aria-label="Krótka nazwa" />
      <i class="kolor" style="background:${K.kolor(m.kolor)}"></i>
      <button type="button" class="ikona ikona--mala" data-akcja="miejsce-usun" data-i="${i}" aria-label="Usuń miejsce"${D().miejsca.length < 2 ? ' disabled' : ''}>×</button></div>`).join('');
    return `${naglowek('Ustawienia', `Pakiet ${esc(lim.nazwa)}: limity pokazują, ile mieści się w cenie.`)}
      <section class="ust"><h3>Zasady rezerwacji</h3>
        <div class="pola2">
          ${pole('s-wyp', 'Najwcześniej za', `<select id="s-wyp" data-s="wyprzedzenie">${opcje([[0, 'od razu'], [1, '1 godzinę'], [2, '2 godziny'], [4, '4 godziny'], [12, '12 godzin'], [24, '24 godziny'], [48, '2 dni']], U.wyprzedzenie)}</select>`, 'Pacjent nie zarezerwuje bliższego terminu.')}
          ${pole('s-hor', 'Najdalej na', `<select id="s-hor" data-s="horyzont">${opcje([[14, '2 tygodnie'], [30, '30 dni'], [60, '60 dni'], [90, '90 dni'], [180, 'pół roku']], U.horyzont)}</select>`, 'Jak daleko widać wolne terminy.')}
        </div>
        <div class="pola2">
          ${pole('s-buf', 'Przerwa po wizycie', `<select id="s-buf" data-s="bufor">${opcje([[0, 'bez przerwy'], [5, '5 min'], [10, '10 min'], [15, '15 min'], [30, '30 min']], U.bufor)}</select>`, 'Pacjent nie zarezerwuje terminu tuż po wizycie.')}
          ${pole('s-aut', 'Potwierdzanie', `<select id="s-aut" data-s="auto">${opcje([['1', 'automatyczne'], ['0', 'ręcznie przez gabinet']], U.auto ? '1' : '0')}</select>`, 'Przy ręcznym wizyty ze strony czekają na „Potwierdź”.')}
        </div>
      </section>
      <section class="ust"><h3>Usługi <small>${D().uslugi.length} z ${lim.uslugi} w pakiecie</small></h3>
        <div class="ust-lista">${uslugi}</div>
        <button type="button" class="przycisk przycisk--cichy przycisk--mini" data-akcja="usluga-dodaj"${D().uslugi.length >= lim.uslugi ? ' disabled' : ''}>+ Dodaj usługę</button>
        ${D().uslugi.length >= lim.uslugi ? '<p class="pod">Limit pakietu osiągnięty. Kolejne usługi wyceniamy osobno.</p>' : ''}
      </section>
      ${ent() ? `<section class="ust"><h3>Zespół <small>${D().zespol.length} z ${lim.terapeuci} w pakiecie</small></h3><div class="ust-lista">${zespol}</div>
        <button type="button" class="przycisk przycisk--cichy przycisk--mini" data-akcja="terap-dodaj"${D().zespol.length >= lim.terapeuci ? ' disabled' : ''}>+ Dodaj terapeutę</button>
        ${D().zespol.length >= lim.terapeuci ? '<p class="pod">Limit pakietu osiągnięty. Więcej terapeutów wyceniamy osobno.</p>' : ''}</section>` : ''}
      <section class="ust"><h3>${ent() ? 'Lokalizacje' : 'Miejsca przyjęć'} <small>${D().miejsca.length} z ${lim.miejsca} w pakiecie</small></h3><div class="ust-lista">${miejsca}</div>
        <button type="button" class="przycisk przycisk--cichy przycisk--mini" data-akcja="miejsce-dodaj"${D().miejsca.length >= lim.miejsca ? ' disabled' : ''}>+ Dodaj ${ent() ? 'lokalizację' : 'miejsce'}</button>
        ${D().miejsca.length >= lim.miejsca ? '<p class="pod">Limit pakietu osiągnięty.</p>' : ''}</section>
      <section class="ust"><h3>Dodatek: zaliczki online</h3>
        <label class="check"><input type="checkbox" data-s="zaliczki"${U.zaliczki ? ' checked' : ''} /><span>Pacjent płaci zaliczkę przy rezerwacji (BLIK, karta, przelew)</span></label>
        ${U.zaliczki ? pole('s-zal', 'Kwota zaliczki', `<select id="s-zal" data-s="zaliczkaKwota">${opcje([[30, '30 zł'], [50, '50 zł'], [80, '80 zł'], [100, '100 zł']], U.zaliczkaKwota)}</select>`, 'Pieniądze trafiają na Twoje konto u operatora płatności. Usługi wymagające zaliczki zaznaczasz wyżej.') : ''}
      </section>
      <footer class="sz__st"><button type="button" class="przycisk" data-akcja="zamknij">Gotowe</button></footer>`;
  }
  function szufladaSkroty() {
    const lista = [['T', 'dziś'], ['← →', 'poprzedni / następny zakres'], ['W D M A', 'tydzień, dzień, miesiąc, agenda'], ['N', 'nowa rezerwacja'], ['E', 'zmiana dostępności'], ['/', 'szukaj pacjenta'], ['Z', 'cofnij ostatnią zmianę'], ['Esc', 'zamknij panel albo anuluj']];
    return `${naglowek('Skróty klawiszowe', 'Działają, gdy nie piszesz w polu tekstowym.')}<dl class="skroty">${lista.map(([k, o]) => `<div><dt><kbd>${k}</kbd></dt><dd>${o}</dd></div>`).join('')}</dl>
      <footer class="sz__st"><button type="button" class="przycisk" data-akcja="zamknij">Zamknij</button></footer>`;
  }

  /* ── Działania na rezerwacjach ──────────────────────────────────────── */
  function ustawStatus(id, status) {
    const r = D().rezerwacje.find((x) => x.id === id);
    if (!r) return;
    if (r.status === status && status !== 'potwierdzona') status = 'potwierdzona';
    const tekst = status === 'przyszedl' ? `${r.imie}: wizyta odbyta${K.cena(D(), r) ? `, ${K.cena(D(), r)} zł do przychodu` : ''}` : status === 'nieobecny' ? `${r.imie}: wizyta nieodbyta` : r.status === 'oczekuje' ? `Potwierdzono: ${r.imie}` : `${r.imie}: zdjęto oznaczenie`;
    zmien(tekst, () => { r.status = status; r.nowa = false; }, { zamknij: false });
  }
  function przeniesRezerwacje(id, terap, data, od) {
    const r = D().rezerwacje.find((x) => x.id === id);
    if (!r) return false;
    const w = K.sprawdz(D(), terap, data, od, r.dl, id);
    if (w.kolizja) { toast(`Termin zajęty: ${w.kolizja.imie}, ${K.czas(w.kolizja.od, w.kolizja.dl)}.`); return false; }
    if (w.zakres) { toast(`Kalendarz pokazuje godziny ${K.godz(START)}–${K.godz(END)}.`); return false; }
    ui.przenos = null;
    zmien(`Przełożono: ${r.imie}, ${K.wzgledna(data).toLowerCase()} ${K.godz(od)}${w.poza || w.blokada ? ' (poza godzinami przyjęć)' : ''}`, () => {
      r.terap = terap; r.data = data; r.od = od; r.lok = K.lok(D(), terap, data, od); r.nowa = false;
    });
    return true;
  }
  function powtorzZaTydzien(id) {
    const r = D().rezerwacje.find((x) => x.id === id);
    if (!r) return;
    const data = K.iso(K.dodaj(K.zIso(r.data), 7));
    const w = K.sprawdz(D(), r.terap, data, r.od, r.dl);
    if (w.kolizja) { toast(`Za tydzień ten termin jest zajęty: ${w.kolizja.imie}.`); return; }
    zmien(`Wpisano za tydzień: ${r.imie}, ${K.dlugaData(K.zIso(data))}`, () => {
      D().rezerwacje.push({ ...r, id: `r${Date.now()}`, data, status: 'potwierdzona', nowa: false, zrodlo: 'powrot', zal: null, uwaga: '', lok: K.lok(D(), r.terap, data, r.od) });
    });
  }
  const IMIONA_SYM = [['Dorota Kamińska', '601 200 111'], ['Paweł Stolarz', '601 200 122'], ['Natalia Brzozowska', '601 200 133'], ['Łukasz Kubiak', '601 200 144'], ['Iwona Sadowska', '601 200 155'], ['Wojciech Marczak', '601 200 166']];
  function symulujRezerwacje() {
    const uslId = ui.uslugaPacjenta || D().uslugi[0].id;
    const u = K.usluga(D(), uslId);
    const t = K.terminyPacjenta(D(), uslId, { ile: 1 })[0];
    if (!t) { toast('Brak wolnych terminów, więc pacjent nie ma co zarezerwować.'); return; }
    const p = IMIONA_SYM[Math.floor(Math.random() * IMIONA_SYM.length)];
    const ust = D().ustawienia;
    const rez = { id: `r${Date.now()}`, terap: t.ids[0], data: t.data, od: t.od, dl: u.min, usluga: uslId, cena: u.cena, imie: p[0], tel: p[1], uwaga: 'Pierwsza wizyta u Was.', notatka: '', zrodlo: 'strona', lok: t.lok, status: ust.auto ? 'potwierdzona' : 'oczekuje', nowa: true, zal: ust.zaliczki && u.zaliczka ? { kwota: ust.zaliczkaKwota, metoda: 'BLIK' } : null };
    zmien(`Nowa rezerwacja ze strony: ${p[0]}, ${K.wzgledna(t.data).toLowerCase()} ${K.godz(t.od)}.`, () => { D().rezerwacje.push(rez); }, { zamknij: false });
    idzDoRezerwacji(t.ids[0], t.data);
    setTimeout(() => blysnijRez(rez.id), 60);
  }
  function blysnijRez(id) {
    const e = document.querySelector(`.sg-rez[data-rez="${id}"]`);
    if (!e) return;
    e.classList.add('blysk');
    e.scrollIntoView({ block: 'center', behavior: przewijanie() });
    setTimeout(() => e.classList.remove('blysk'), 2400);
  }
  function blysnijKom(data, terap, rzad) {
    const c = document.querySelector(`.sg-kom[data-d="${data}"][data-t="${terap}"][data-r="${rzad}"]`);
    if (!c) return;
    c.classList.add('blysk');
    c.scrollIntoView({ block: 'center', behavior: przewijanie() });
    setTimeout(() => c.classList.remove('blysk'), 2300);
  }

  /* ── Dostępność: otwieranie i zamykanie godzin ──────────────────────── */
  function zastosujZakres(kol, od, doo, otworz) {
    let zmian = 0;
    let wizytyWZamknietych = 0;
    const snap = JSON.stringify(D());
    for (const k of kol) {
      if (K.maluj(D(), k.terap, k.data, od, doo, otworz)) zmian += 1;
      if (!otworz) wizytyWZamknietych += K.wizytyWPrzedziale(D(), k.terap, k.data, od, doo).length;
    }
    if (!zmian) { stan.dane[stan.tryb] = JSON.parse(snap); toast(otworz ? 'Te godziny były już otwarte.' : 'Te godziny były już zamknięte.'); return; }
    zapisz(); zamknijSzuflade(false); render();
    toast(`${otworz ? 'Otwarto' : 'Zamknięto'} godziny ${K.czas(od, doo - od)}${kol.length > 1 ? ` w ${kol.length} dniach` : ''}.${wizytyWZamknietych ? ` Zostało ${wizyt(wizytyWZamknietych)}.` : ''}`, snap);
  }

  /* ── Zaznaczanie myszą: zakres godzin i malowanie dostępności ───────── */
  const komorkaSpod = (x, y) => document.elementsFromPoint(x, y).find((n) => n.classList && n.classList.contains('sg-kom')) || null;
  const opisKomorki = (c) => ({ data: c.dataset.d, terap: c.dataset.t, r: Number(c.dataset.r) });
  function prostokat(a, b) {
    const kol = widoczneKolumny();
    const klucze = kol.map((k) => `${k.data}|${k.terap}`);
    const ia = klucze.indexOf(`${a.data}|${a.terap}`);
    const ib = klucze.indexOf(`${b.data}|${b.terap}`);
    if (ia < 0 || ib < 0) return null;
    const [i0, i1] = ia <= ib ? [ia, ib] : [ib, ia];
    return { kol: kol.slice(i0, i1 + 1), r0: Math.min(a.r, b.r), r1: Math.max(a.r, b.r) };
  }
  function pokazZaznaczenie(p) {
    $$('.sg-kom.sel').forEach((c) => c.classList.remove('sel'));
    if (!p) return;
    for (const k of p.kol) for (let r = p.r0; r <= p.r1; r++) {
      const c = document.querySelector(`.sg-kom[data-d="${k.data}"][data-t="${k.terap}"][data-r="${r}"]`);
      if (c) c.classList.add('sel');
    }
  }
  function zakonczZaznaczenie(p, jedna) {
    let { r0, r1 } = p;
    /* W trybie dostępności samo kliknięcie zmienia całą godzinę. */
    if (ui.edycja && jedna) { r0 = Math.floor(r0 / 4) * 4; r1 = r0 + 3; }
    const od = K.rzadNaMin(r0);
    const doo = K.rzadNaMin(r1 + 1);
    if (ui.przenos) { przeniesRezerwacje(ui.przenos, p.kol[0].terap, p.kol[0].data, K.rzadNaMin(p.r0)); return; }
    const kol = p.kol.filter((k) => !K.minelo(k.data, doo - 1));
    if (!kol.length) { toast('Tych godzin już nie zmienisz: minęły.'); return; }
    if (ui.edycja) { zastosujZakres(kol, od, doo, ui.pedzel === 'otworz'); return; }
    if (jedna) { otworzSzuflade('nowa', { terap: p.kol[0].terap, data: p.kol[0].data, od, zamknijLink: true }); return; }
    otworzSzuflade('zaznaczenie', { kol, od, doo });
  }
  function startZaznaczenia(e) {
    if (e.button !== 0 || e.pointerType === 'touch') return;
    const c = e.target.closest('.sg-kom');
    if (!c) return;
    const o = opisKomorki(c);
    if (K.minelo(o.data, K.rzadNaMin(o.r) + KROK) && !ui.przenos) return;
    ui.drag = { start: o, teraz: o, ruch: false };
    ui.ostatniWskaznik = Date.now();
    pokazZaznaczenie(prostokat(o, o));
    e.preventDefault();
  }
  function ruchZaznaczenia(e) {
    if (!ui.drag) return;
    const c = komorkaSpod(e.clientX, e.clientY);
    if (!c) return;
    let o = opisKomorki(c);
    /* Poza trybem dostępności zaznaczamy tylko jedną kolumnę. */
    if (!ui.edycja) o = { ...o, data: ui.drag.start.data, terap: ui.drag.start.terap };
    const t = ui.drag.teraz;
    if (o.data === t.data && o.terap === t.terap && o.r === t.r) return;
    ui.drag.teraz = o;
    ui.drag.ruch = true;
    pokazZaznaczenie(prostokat(ui.drag.start, o));
  }
  function koniecZaznaczenia() {
    if (!ui.drag) return;
    const d = ui.drag;
    ui.drag = null;
    ui.ostatniWskaznik = Date.now();
    const p = prostokat(d.start, d.teraz);
    pokazZaznaczenie(null);
    if (!p) return;
    zakonczZaznaczenie(p, !d.ruch || (p.kol.length === 1 && p.r0 === p.r1));
  }

  /* Przeciąganie wizyty na inny termin */
  function startPrzesuwania(e) {
    if (e.button !== 0 || e.pointerType === 'touch' || ui.edycja) return;
    const b = e.target.closest('.sg-rez');
    const r = b && D().rezerwacje.find((x) => x.id === b.dataset.rez);
    if (!r) return;
    const rect = b.getBoundingClientRect();
    const wiersze = r.dl / KROK;
    przesuwanie = { id: r.id, x0: e.clientX, y0: e.clientY, ruch: false, przesuniecie: Math.max(0, Math.min(wiersze - 1, Math.floor((e.clientY - rect.top) / (rect.height / wiersze)))), el: b, cel: null };
  }
  function ruchPrzesuwania(e) {
    const p = przesuwanie;
    if (!p) return;
    if (!p.ruch && Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < 6) return;
    if (!p.ruch) { p.ruch = true; p.el.classList.add('sg-rez--ciagnie'); document.body.classList.add('ciagnie'); }
    $$('.sg-kom.cel, .sg-kom.cel--zle').forEach((x) => x.classList.remove('cel', 'cel--zle'));
    p.cel = null;
    const c = komorkaSpod(e.clientX, e.clientY);
    if (!c) return;
    const o = opisKomorki(c);
    const r = D().rezerwacje.find((x) => x.id === p.id);
    const r0 = Math.max(0, o.r - p.przesuniecie);
    const od = K.rzadNaMin(r0);
    const w = K.sprawdz(D(), o.terap, o.data, od, r.dl, r.id);
    const dobry = !w.kolizja && !w.zakres;
    p.cel = dobry ? { terap: o.terap, data: o.data, od } : null;
    for (let i = 0; i < r.dl / KROK; i++) {
      const x = document.querySelector(`.sg-kom[data-d="${o.data}"][data-t="${o.terap}"][data-r="${r0 + i}"]`);
      if (x) x.classList.add(dobry ? 'cel' : 'cel--zle');
    }
  }
  function koniecPrzesuwania() {
    const p = przesuwanie;
    if (!p) return;
    przesuwanie = null;
    document.body.classList.remove('ciagnie');
    $$('.sg-kom.cel, .sg-kom.cel--zle').forEach((x) => x.classList.remove('cel', 'cel--zle'));
    p.el.classList.remove('sg-rez--ciagnie');
    if (!p.ruch) return;
    ui.ostatniWskaznik = Date.now();
    if (p.cel) przeniesRezerwacje(p.id, p.cel.terap, p.cel.data, p.cel.od);
    else toast('Nie da się tam przenieść wizyty: termin jest zajęty albo poza kalendarzem.');
  }

  /* ── Szukanie, CSV ──────────────────────────────────────────────────── */
  function szukaj(q) {
    const lista = $('#szukaj-wyniki');
    ui.szukaj = q;
    const t = q.trim().toLowerCase();
    const cyfry = t.replace(/\D/g, '');
    if (t.length < 2) { lista.hidden = true; lista.innerHTML = ''; return; }
    const wynik = D().rezerwacje
      .filter((r) => r.imie.toLowerCase().includes(t) || (cyfry.length >= 3 && r.tel.replace(/\D/g, '').includes(cyfry)))
      .sort((a, b) => Math.abs(K.dniMiedzy(K.dzisIso(), a.data)) - Math.abs(K.dniMiedzy(K.dzisIso(), b.data)))
      .slice(0, 8);
    lista.hidden = false;
    lista.innerHTML = wynik.length ? wynik.map((r) => `<li><button type="button" data-szukaj-rez="${r.id}"><b>${esc(r.imie)}</b><span>${esc(K.wzgledna(r.data))}, ${K.godz(r.od)} · ${esc(K.usluga(D(), r.usluga).nazwa)}${K.aktywna(r) ? '' : ' · odwołana'}</span></button></li>`).join('') : '<li class="pusto">Nic nie znaleziono.</li>';
  }
  function eksportCsv() {
    const od = K.iso(K.dodaj(new Date(), -30));
    const wiersze = D().rezerwacje.filter((r) => r.data >= od).sort((a, b) => (a.data + K.pad(a.od)).localeCompare(b.data + K.pad(b.od)));
    const q = (s) => `"${String(s == null ? '' : s).replace(/"/g, '""')}"`;
    const csv = ['Data;Od;Do;Pacjent;Telefon;Usługa;Cena;Terapeuta;Miejsce;Status;Źródło;Zaliczka;Notatka']
      .concat(wiersze.map((r) => [r.data, K.godz(r.od), K.godz(r.od + r.dl), r.imie, r.tel, K.usluga(D(), r.usluga).nazwa, K.cena(D(), r), terapeuta(r.terap).nazwa, K.miejsce(D(), r.lok).nazwa, K.STATUSY[r.status], K.ZRODLA[r.zrodlo] || r.zrodlo, r.zal ? `${r.zal.kwota} zł` : '', r.notatka].map(q).join(';'))).join('\r\n');
    try {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
      a.download = `rezerwacje-${K.dzisIso()}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 3000);
      toast(`Pobrano ${wiersze.length} rezerwacji (od 30 dni wstecz).`);
    } catch (x) { toast('Nie udało się pobrać pliku.'); }
  }

  /* ── Zdarzenia ──────────────────────────────────────────────────────── */
  document.addEventListener('click', (e) => {
    const menu = $('#menu-lista');
    if (menu && !menu.hidden && !e.target.closest('.menu')) { menu.hidden = true; const mb = $('[data-akcja="menu"]'); if (mb) mb.setAttribute('aria-expanded', 'false'); }
    const wyniki = $('#szukaj-wyniki');
    if (wyniki && !wyniki.hidden && !e.target.closest('.szukaj')) wyniki.hidden = true;

    /* Po przeciągnięciu przeglądarka wysyła jeszcze „click”: pomijamy go. */
    const swiezy = Date.now() - ui.ostatniWskaznik < 350;
    const kom = e.target.closest('.sg-kom');
    if (kom) {
      if (swiezy) return;
      const o = opisKomorki(kom);
      const od = K.rzadNaMin(o.r);
      if (ui.przenos) return void przeniesRezerwacje(ui.przenos, o.terap, o.data, od);
      if (K.minelo(o.data, od + KROK)) return;
      return void zakonczZaznaczenie({ kol: [{ terap: o.terap, data: o.data }], r0: o.r, r1: o.r }, true);
    }
    const b = e.target.closest('button, a[data-rez]');
    if (!b) return;
    if (b.dataset.tryb) {
      stan.tryb = b.dataset.tryb; stan.widok = stan.tryb === 'ent' ? 'dzien' : 'tydzien'; stan.terap = D().zespol[0].id; stan.data = K.dzisIso();
      ui.mobIdx = null; ui.przenos = null; ui.uslugaPacjenta = null; ukryjToast(); zamknijSzuflade(false); zapisz(); return render();
    }
    if (b.dataset.widok) { stan.widok = b.dataset.widok; ui.mobIdx = null; zapisz(); return render(); }
    if (b.dataset.mob !== undefined) { ui.mobIdx = Number(b.dataset.mob); return render(); }
    if (b.dataset.nawig !== undefined) {
      const n = Number(b.dataset.nawig);
      if (n === 0) { stan.data = K.dzisIso(); ui.mobIdx = null; zapisz(); return render(); }
      return przesun(n);
    }
    if (b.dataset.miesiacDzien) return doDnia(b.dataset.miesiacDzien);
    if (b.dataset.dzien) { const [d, t] = b.dataset.dzien.split('|'); return otworzSzuflade('dzien', { data: d, terap: t }); }
    if (b.dataset.rez) {
      if (swiezy) return;
      const r = D().rezerwacje.find((x) => x.id === b.dataset.rez);
      if (!r) return;
      if (r.nowa) { r.nowa = false; zapisz(); renderBoki(); renderWidok(); }
      return otworzSzuflade('rez', r.id);
    }
    if (b.dataset.blok) return otworzSzuflade('blokada', { id: b.dataset.blok });
    if (b.dataset.szukajRez) {
      const r = D().rezerwacje.find((x) => x.id === b.dataset.szukajRez);
      if (!r) return;
      $('#szukaj-wyniki').hidden = true;
      idzDoRezerwacji(r.terap, r.data);
      otworzSzuflade('rez', r.id);
      return void setTimeout(() => blysnijRez(r.id), 60);
    }
    if (b.dataset.skocz) {
      const [d, t, od] = b.dataset.skocz.split('|');
      stan.data = d; stan.widok = ent() ? 'dzien' : 'tydzien'; stan.terap = t; ui.mobIdx = ent() ? Math.max(0, osoby().findIndex((x) => x.id === t)) : null;
      zapisz(); render();
      return void blysnijKom(d, t, K.minNaRzad(Number(od)));
    }
    if (b.dataset.status) { const [id, s] = b.dataset.status.split('|'); return ustawStatus(id, s); }
    if (b.dataset.widziane) { const r = D().rezerwacje.find((x) => x.id === b.dataset.widziane); if (r) { r.nowa = false; zapisz(); render(); } return; }
    if (b.dataset.pedzel) { ui.pedzel = b.dataset.pedzel; return renderTryb(); }
    akcja(b);
  });

  function akcja(b) {
    const a = b.dataset.akcja;
    if (!a) return;
    const arg = ui.szuflada && ui.szuflada.arg;
    switch (a) {
      case 'zamknij': return zamknijSzuflade();
      case 'cofnij': return cofnij();
      case 'nowa': return otworzSzuflade('nowa', { terap: stan.terap, data: stan.widok === 'tydzien' || stan.widok === 'miesiac' || stan.widok === 'agenda' ? K.dzisIso() : stan.data, od: Math.min(END - 60, Math.max(START, Math.ceil((K.terazMin() + 30) / 15) * 15)) });
      case 'godziny': return otworzSzuflade('godziny', { terap: stan.terap });
      case 'blokada': return otworzSzuflade('blokada', {});
      case 'ustawienia': return otworzSzuflade('ustawienia', {});
      case 'skroty': return otworzSzuflade('skroty', {});
      case 'menu': { const m = $('#menu-lista'); m.hidden = !m.hidden; b.setAttribute('aria-expanded', String(!m.hidden)); return; }
      case 'csv': return eksportCsv();
      case 'drukuj': return window.print();
      case 'reset': return zmien('Przywrócono dane przykładowe', () => { stan.dane[stan.tryb] = K.ziarno(stan.tryb); });
      case 'edycja': ui.edycja = !ui.edycja; ui.przenos = null; zamknijSzuflade(false); return render();
      case 'grafik-z-tygodnia': return zmien('Ten tydzień jest teraz stałym grafikiem', () => { K.grafikZTygodnia(D(), stan.terap, K.poniedzialek(K.zIso(stan.data))); }, { zamknij: false });
      case 'wyczysc-tydzien': {
        const pon = K.poniedzialek(K.zIso(stan.data));
        const dni = new Set(K.DNI_PRACY.map((dz) => K.iso(K.dodaj(pon, dz - 1))));
        const ludzie = stan.widok === 'tydzien' ? [stan.terap] : osoby().map((t) => t.id);
        const dotyczy = (w) => ludzie.includes(w.terap) && (stan.widok === 'tydzien' ? dni.has(w.data) : w.data === stan.data);
        if (!D().wyjatki.some(dotyczy)) return toast('Nie ma zmian jednorazowych do cofnięcia.');
        return zmien('Przywrócono stały grafik', () => { D().wyjatki = D().wyjatki.filter((w) => !dotyczy(w)); }, { zamknij: false });
      }
      case 'przenos': { zamknijSzuflade(false); ui.przenos = b.dataset.id; ui.edycja = false; const r = D().rezerwacje.find((x) => x.id === b.dataset.id); if (r) idzDoRezerwacji(r.terap, r.data); return render(); }
      case 'przenos-anuluj': ui.przenos = null; return render();
      case 'edytuj': return otworzSzuflade('nowa', { id: b.dataset.id });
      case 'powtorz': return powtorzZaTydzien(b.dataset.id);
      case 'odwolaj': ui.odwolywanie = true; return odswiezSzuflade(true);
      case 'odwolaj-wroc': ui.odwolywanie = false; return odswiezSzuflade(true);
      case 'odwolaj-potwierdz': {
        const r = D().rezerwacje.find((x) => x.id === b.dataset.id);
        if (!r) return;
        const pow = $('#f-powiadom') && $('#f-powiadom').checked;
        const kto = ($('input[name="kto-odwoluje"]:checked') || { value: 'odwolana' }).value;
        const powod = $('#f-powod') ? $('#f-powod').value : '';
        const pozno = !!($('#f-pozno') && $('#f-pozno').checked);
        ui.odwolywanie = false;
        return zmien(`${kto === 'anulowana' ? 'Anulowano' : 'Odwołano'}: ${r.imie}. Termin znów jest wolny${pow ? ', e-mail do pacjenta wysłany (symulacja)' : ''}.`, () => { Object.assign(r, { status: kto, powod, pozno, nowa: false, odwolano: new Date().toISOString() }); });
      }
      case 'przywroc': {
        const r = D().rezerwacje.find((x) => x.id === b.dataset.id);
        if (!r) return;
        const w = K.sprawdz(D(), r.terap, r.data, r.od, r.dl, r.id);
        if (w.kolizja) return toast(`Nie da się przywrócić: termin zajął już ${w.kolizja.imie}. Przełóż wizytę na inny termin.`);
        return zmien(`Przywrócono wizytę: ${r.imie}`, () => { r.status = K.minelo(r.data, r.od) ? 'przyszedl' : 'potwierdzona'; delete r.powod; delete r.pozno; delete r.odwolano; }, { zamknij: false });
      }
      case 'zapisz-nowa': return zapiszNowa();
      case 'zamknij-termin': { const od = Number(b.dataset.od); return zastosujZakres([{ terap: b.dataset.t, data: b.dataset.d }], od, od + 30, false); }
      case 'sel-pacjent': return otworzSzuflade('nowa', { terap: arg.kol[0].terap, data: arg.kol[0].data, od: arg.od, dl: Math.min(Math.max(arg.doo - arg.od, 15), 180) });
      case 'sel-zamknij': return zastosujZakres(arg.kol, arg.od, arg.doo, false);
      case 'sel-otworz': return zastosujZakres(arg.kol, arg.od, arg.doo, true);
      case 'sel-blokada': return otworzSzuflade('blokada', { od: arg.kol[0].data, do: arg.kol[arg.kol.length - 1].data, odMin: arg.od, doMin: arg.doo, terap: arg.kol[0].terap, powod: '' });
      case 'przedz-dodaj': { arg.przedz = odczytPrzedzialow(); const ost = arg.przedz[arg.przedz.length - 1]; const od = ost ? Math.min(ost[1] + 60, END - 60) : K.zH('9:00'); arg.przedz.push([od, Math.min(od + 240, END)]); return odswiezSzuflade(); }
      case 'przedz-usun': { arg.przedz = odczytPrzedzialow(); arg.przedz.splice(Number(b.dataset.i), 1); return odswiezSzuflade(); }
      case 'dzien-zamknij': { arg.przedz = []; return odswiezSzuflade(); }
      case 'dzien-przywroc': return zmien('Przywrócono stały grafik tego dnia', () => { D().wyjatki = D().wyjatki.filter((w) => !(w.terap === arg.terap && w.data === arg.data)); });
      case 'dzien-zapisz': return zapiszDzien();
      case 'gd-zapisz': return zapiszGodziny();
      case 'gd-dodaj': { const dz = b.dataset.dz; const rr = arg.stan[dz] || (arg.stan[dz] = []); const ost = rr[rr.length - 1]; const od = ost ? Math.min(ost.do + 60, END - 60) : K.zH('9:00'); rr.push({ od, do: Math.min(od + 180, END), lok: ost ? ost.lok : D().miejsca[0].id }); return odswiezSzuflade(); }
      case 'gd-usun': { arg.stan[b.dataset.dz].splice(Number(b.dataset.i), 1); if (!arg.stan[b.dataset.dz].length) delete arg.stan[b.dataset.dz]; return odswiezSzuflade(); }
      case 'gd-kopiuj': { const zrodlo = JSON.parse(JSON.stringify(arg.stan[b.dataset.dz])); [1, 2, 3, 4, 5].filter((dz) => dz !== Number(b.dataset.dz)).forEach((dz) => { arg.stan[dz] = JSON.parse(JSON.stringify(zrodlo)); }); return odswiezSzuflade(); }
      case 'preset': {
        const p = b.dataset.p;
        const r = (od, doo) => ({ od: K.zH(od), do: K.zH(doo), lok: D().miejsca[0].id });
        arg.stan = {};
        [1, 2, 3, 4, 5].forEach((dz) => { arg.stan[dz] = p === '8-16' ? [r('8:00', '16:00')] : p === '9-17' ? [r('9:00', '17:00')] : [r('8:00', '12:00'), r('15:00', '19:00')]; });
        return odswiezSzuflade();
      }
      case 'zapisz-blokade': return zapiszBlokade();
      case 'usun-blokade': return zmien('Blokada usunięta', () => { D().blokady = D().blokady.filter((x) => x.id !== b.dataset.id); });
      case 'symuluj': return symulujRezerwacje();
      case 'usluga-dodaj': return ustaw(() => { D().uslugi.push({ id: `u${Date.now()}`, nazwa: 'Nowa usługa', min: 45, cena: 150, zaliczka: false }); });
      case 'usluga-usun': { const u = D().uslugi[Number(b.dataset.i)]; if (D().rezerwacje.some((r) => r.usluga === u.id)) return toast('Ta usługa ma rezerwacje, więc nie można jej usunąć.'); return ustaw(() => { D().uslugi.splice(Number(b.dataset.i), 1); }); }
      case 'terap-dodaj': return ustaw(() => { D().zespol.push({ id: `t${Date.now()}`, nazwa: 'mgr Nowa Osoba', kolor: D().zespol.length % K.KOLORY.length, widoczny: true }); });
      case 'terap-usun': { const t = D().zespol[Number(b.dataset.i)]; if (D().rezerwacje.some((r) => r.terap === t.id)) return toast('Ta osoba ma rezerwacje, więc nie można jej usunąć.'); return ustaw(() => { D().zespol.splice(Number(b.dataset.i), 1); delete D().reguly[t.id]; if (stan.terap === t.id) stan.terap = D().zespol[0].id; }); }
      case 'miejsce-dodaj': return ustaw(() => { D().miejsca.push({ id: `l${Date.now()}`, nazwa: 'Nowy adres', kr: 'Nowe', kolor: D().miejsca.length % K.KOLORY.length }); });
      case 'miejsce-usun': { const m = D().miejsca[Number(b.dataset.i)]; if (D().rezerwacje.some((r) => r.lok === m.id)) return toast('To miejsce ma rezerwacje, więc nie można go usunąć.'); return ustaw(() => { D().miejsca.splice(Number(b.dataset.i), 1); }); }
      default:
    }
  }

  /* Pola formularzy w szufladzie i na pasku */
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.id === 'szukaj') return szukaj(t.value);
    if (t.matches('[data-notatka]')) { const r = D().rezerwacje.find((x) => x.id === t.dataset.notatka); if (r) { r.notatka = t.value; zapisz(); } return; }
    if (t.matches('[data-cena]')) { const r = D().rezerwacje.find((x) => x.id === t.dataset.cena); if (r) { r.cena = Number(t.value) || 0; zapisz(); } return; }
    if (t.closest('[data-formularz="nowa"]')) { t.removeAttribute('aria-invalid'); if (t.id === 'f-imie') uzupelnijZnanego(t); return statusNowej(); }
    if (t.closest('[data-formularz="blokada"]')) return statusBlokady();
    if (t.matches('#przedz-lista input')) { ui.szuflada.arg.przedz = odczytPrzedzialow(); return; }
    if (t.matches('[data-g="od"], [data-g="do"]')) { ui.szuflada.arg.stan[t.dataset.dz][Number(t.dataset.i)][t.dataset.g] = K.zH(t.value || '0:00'); return aktualizujRazem(); }
    if (t.matches('[data-u]') && t.type !== 'checkbox') { const u = D().uslugi[Number(t.dataset.i)]; u[t.dataset.u] = t.dataset.u === 'cena' ? Number(t.value) || 0 : t.dataset.u === 'min' ? Number(t.value) : t.value; zapisz(); return; }
    if (t.matches('[data-z="nazwa"]')) { D().zespol[Number(t.dataset.i)].nazwa = t.value; zapisz(); return; }
    if (t.matches('[data-m]')) { D().miejsca[Number(t.dataset.i)][t.dataset.m] = t.value; zapisz(); }
  });
  function aktualizujRazem() {
    const a = ui.szuflada.arg;
    const razem = K.DNI_PRACY.reduce((s, dz) => s + (a.stan[dz] || []).reduce((x, r) => x + Math.max(0, r.do - r.od), 0), 0);
    const el = $('.razem b');
    if (el) el.textContent = K.godzTekst(razem);
  }
  function uzupelnijZnanego(t) {
    const p = [...K.pacjenci(D()).values()].find((x) => x.imie.toLowerCase() === t.value.trim().toLowerCase());
    if (p && !$('#f-tel').value) $('#f-tel').value = p.tel;
    if (p && $('#f-zrodlo') && !$('[data-formularz="nowa"]').dataset.edytowana) $('#f-zrodlo').value = 'powrot';
  }
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'sel-terap') { stan.terap = t.value; ui.mobIdx = null; zapisz(); return render(); }
    if (t.matches('[data-zrodlo-rez]')) { const r = D().rezerwacje.find((x) => x.id === t.dataset.zrodloRez); if (r) { r.zrodlo = t.value; zapisz(); toast(`Źródło: ${K.ZRODLA[t.value]}`); } return; }
    if (t.id === 'sel-usluga') { ui.uslugaPacjenta = t.value; return renderBoki(); }
    if (t.closest('[data-formularz="nowa"]')) {
      if (t.id === 'f-usl') { $('#f-dl').value = String(K.usluga(D(), t.value).min); if ($('#f-cena')) $('#f-cena').value = String(K.usluga(D(), t.value).cena); }
      if (['f-od', 'f-data', 'f-terap'].includes(t.id) && $('#f-lok') && $('#f-data').value) $('#f-lok').value = K.lok(D(), $('#f-terap') ? $('#f-terap').value : stan.terap, $('#f-data').value, K.zH($('#f-od').value || '9:00'));
      return statusNowej();
    }
    if (t.closest('[data-formularz="blokada"]')) return statusBlokady();
    if (t.matches('[data-g="wl"]')) {
      const a = ui.szuflada.arg;
      if (t.checked) a.stan[t.dataset.dz] = [{ od: K.zH('9:00'), do: K.zH('15:00'), lok: D().miejsca[0].id }]; else delete a.stan[t.dataset.dz];
      return odswiezSzuflade();
    }
    if (t.matches('[data-g="lok"]')) { (ui.szuflada.arg.stan[t.dataset.dz] || []).forEach((r) => { r.lok = t.value; }); return; }
    if (t.matches('[data-g="kopiuj-od"]')) { if (t.value) { ui.szuflada.arg.stan = JSON.parse(JSON.stringify(D().reguly[t.value] || {})); return odswiezSzuflade(); } return; }
    if (t.matches('[data-s]')) {
      const k = t.dataset.s;
      return ustaw(() => { D().ustawienia[k] = t.type === 'checkbox' ? t.checked : k === 'auto' ? t.value === '1' : Number(t.value); });
    }
    if (t.matches('[data-u][type="checkbox"]')) return ustaw(() => { D().uslugi[Number(t.dataset.i)].zaliczka = t.checked; });
    if (t.matches('[data-u="min"]')) return ustaw(() => { D().uslugi[Number(t.dataset.i)].min = Number(t.value); });
    if (t.matches('[data-z="kolor"]')) return ustaw(() => { D().zespol[Number(t.dataset.i)].kolor = Number(t.value); });
    if (t.matches('[data-z="widoczny"]')) return ustaw(() => { D().zespol[Number(t.dataset.i)].widoczny = t.checked; });
    if (t.matches('[data-z="nazwa"], [data-m]')) render();
  });

  document.addEventListener('pointerdown', (e) => { if (e.target.closest('.sg-rez')) startPrzesuwania(e); else if (e.target.closest('.sg-kom')) startZaznaczenia(e); });
  document.addEventListener('pointermove', (e) => { ruchZaznaczenia(e); ruchPrzesuwania(e); });
  document.addEventListener('pointerup', () => { koniecZaznaczenia(); koniecPrzesuwania(); });
  document.addEventListener('pointercancel', () => { ui.drag = null; pokazZaznaczenie(null); przesuwanie = null; document.body.classList.remove('ciagnie'); });

  document.addEventListener('keydown', (e) => {
    if (window.KAL_UI && window.KAL_UI.aktywny && !window.KAL_UI.aktywny()) return;
    if (e.key === 'Escape') {
      const w = $('#szukaj-wyniki');
      if (w && !w.hidden) { w.hidden = true; return; }
      if (ui.przenos) { ui.przenos = null; return render(); }
      if (ui.szuflada) return zamknijSzuflade();
      if (ui.edycja) { ui.edycja = false; return render(); }
      return;
    }
    if (e.target.closest && e.target.closest('input, textarea, select')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 't') { stan.data = K.dzisIso(); ui.mobIdx = null; zapisz(); return render(); }
    if (e.key === 'ArrowLeft') return przesun(-1);
    if (e.key === 'ArrowRight') return przesun(1);
    if ('wdma'.includes(k) && k.length === 1) { stan.widok = { w: 'tydzien', d: 'dzien', m: 'miesiac', a: 'agenda' }[k]; ui.mobIdx = null; zapisz(); return render(); }
    if (k === 'n') { e.preventDefault(); return akcja({ dataset: { akcja: 'nowa' } }); }
    if (k === 'e') { ui.edycja = !ui.edycja; return render(); }
    if (k === 'z') return cofnij();
    if (e.key === '/') { e.preventDefault(); const s = $('#szukaj'); if (s) s.focus(); return; }
    if (e.key === '?') return otworzSzuflade('skroty', {});
  });
  $('#szuflada-tlo').addEventListener('click', () => zamknijSzuflade());
  if ($('#demo-zamknij')) $('#demo-zamknij').addEventListener('click', () => $('#demo').remove());
  waski.addEventListener('change', render);
  /* Linia „teraz” i liczniki odświeżają się raz na minutę. */
  setInterval(() => {
    if (window.KAL_UI && window.KAL_UI.aktywny && !window.KAL_UI.aktywny()) return;
    if (!ui.drag && !przesuwanie && !ui.szuflada) { renderWidok(); renderBoki(); }
  }, 60000);
  /* Zmiana w innej karcie (np. w panelu) od razu trafia tutaj. */
  window.addEventListener('storage', (e) => { if (e.key === KLUCZ && !ui.drag && !przesuwanie) { stan = wczytaj(); render(); } });

  /* Link z oferty: kalendarz.html?tryb=ent otwiera od razu wariant zespołu. */
  const zLinku = new URLSearchParams(location.search).get('tryb');
  if ((zLinku === 'ent' || zLinku === 'ind') && zLinku !== stan.tryb) {
    stan.tryb = zLinku; stan.widok = zLinku === 'ent' ? 'dzien' : 'tydzien'; stan.terap = D().zespol[0].id; stan.data = K.dzisIso();
  }

  /* Interfejs dla panelu: ten sam stan, te same okna i to samo cofanie. */
  window.KAL_UI = Object.assign(window.KAL_UI || {}, {
    stan: () => stan,
    D,
    zapisz,
    render,
    zmien,
    toast,
    ukryjToast,
    zamknijSzuflade: () => zamknijSzuflade(false),
    otworzRez: (id) => otworzSzuflade('rez', id),
    ustawStatus,
    odwolaj: (id) => { otworzSzuflade('rez', id); ui.odwolywanie = true; odswiezSzuflade(true); },
    przenies: (id) => akcja({ dataset: { akcja: 'przenos', id } }),
    nowa: (arg) => otworzSzuflade('nowa', arg || { terap: stan.terap, data: K.dzisIso(), od: Math.min(END - 60, Math.max(START, Math.ceil((K.terazMin() + 30) / 15) * 15)) }),
    blokada: (arg) => otworzSzuflade('blokada', arg || {}),
    idzDo: (terap, data, widok) => { if (widok) stan.widok = widok; idzDoRezerwacji(terap, data); },
    ustawTryb: (tryb) => {
      if (tryb === stan.tryb) return;
      stan.tryb = tryb; stan.widok = tryb === 'ent' ? 'dzien' : 'tydzien'; stan.terap = D().zespol[0].id; stan.data = K.dzisIso();
      ui.mobIdx = null; ui.przenos = null; ui.uslugaPacjenta = null; ui.edycja = false; ukryjToast(); zamknijSzuflade(false); zapisz(); render();
    },
    przeladuj: () => { stan = wczytaj(); render(); },
    nowyStan: () => { stan = nowyStan(); zapisz(); render(); },
  });
  render();
})();
