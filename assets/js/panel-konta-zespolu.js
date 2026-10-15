/*
 * Panel — konta terapeutów w pakiecie Team.
 *
 * Każdy terapeut ma własne konto: widzi swoje wizyty i sam ustawia swoją dostępność, w ramach godzin otwarcia
 * miejsc i miejsc, w których przyjmuje. Właściciel widzi każdą taką zmianę (kto, co i kiedy), może ją cofnąć
 * albo zmienić grafik sam, a w ustawieniach może wyłączyć samodzielne ustawianie grafiku (dla wszystkich albo dla jednej osoby).
 *
 * W prototypie „logowanie” to przełącznik konta w lewym dolnym rogu. Na produkcji każdy terapeut ma własny adres
 * e-mail i hasło, a uprawnienia sprawdza serwer.
 *
 * Zmiany grafiku wykrywamy porównaniem migawek (stały grafik, jednorazowe zmiany i blokady osoby), więc działa to tak samo
 * dla zmian z kalendarza, z „Dostępności” i z „Grafiku zespołu”, także gdy ktoś kliknie „Cofnij”.
 */
(() => {
  'use strict';

  const K = window.KAL;
  const P = window.PANEL;
  const esc = P.esc;
  const KLUCZ = 'panel-rola-v1';
  const DOZWOLONE_TERAPEUTA = ['pulpit', 'kalendarz', 'rezerwacje', 'dostepnosc', 'grafik'];
  const DOZWOLONE_REJESTRACJA = ['pulpit', 'kalendarz', 'rezerwacje', 'dostepnosc', 'grafik'];

  let rola = 'wl';
  try { rola = localStorage.getItem(KLUCZ) || 'wl'; } catch (e) { /* bez zapisu zaczynamy jako właściciel */ }
  const zapiszRole = () => { try { localStorage.setItem(KLUCZ, rola); } catch (e) { /* demo działa bez zapisu */ } };

  /* ── Rola ───────────────────────────────────────────────────────────── */
  /** Właściciel jest też terapeutą w danych przykładowych: jego konto to konto właściciela, nie osobne konto terapeuty. */
  const jestWlascicielem = (t) => !!P.C().konto.wlasciciel && t.nazwa.endsWith(P.C().konto.wlasciciel);
  P.rola = () => {
    if (!P.ent() || rola === 'wl') return 'wl';
    if (rola === 'rej') return 'rej';
    const t = P.D().zespol.find((x) => x.id === rola);
    return t && !jestWlascicielem(t) ? rola : 'wl';
  };
  /** Rejestracja widzi cały zespół (jak właściciel), ale tylko wybrane części panelu. */
  P.rejestracja = () => P.rola() === 'rej';
  P.rolaTerap = () => { const r = P.rola(); return r === 'wl' || r === 'rej' ? null : r; };
  P.dostep = (id) => (P.rejestracja() ? DOZWOLONE_REJESTRACJA.includes(id) : !P.rolaTerap() || DOZWOLONE_TERAPEUTA.includes(id));
  /** Terapeuta nie ustawia grafiku, gdy właściciel to wyłączył (dla wszystkich albo dla niego). Właściciel zawsze może. */
  P.zablokowany = (id) => {
    if (!P.rolaTerap()) return false;
    const D = P.D();
    const t = D.zespol.find((x) => x.id === id);
    return D.ustawienia.terapeuciGrafik === false || !!(t && t.grafikWlasny === false);
  };

  /* ── Uzupełnienie danych ────────────────────────────────────────────── */
  const stareUzupelnij = P.uzupelnij;
  P.uzupelnij = (D, tryb) => {
    stareUzupelnij(D, tryb);
    if (D.ustawienia.terapeuciGrafik === undefined) D.ustawienia.terapeuciGrafik = true;
    if (!D.dziennikGrafiku) D.dziennikGrafiku = [];
    if (!D.grafikMigawki) D.grafikMigawki = {};
    D.zespol.forEach((t) => { if (D.grafikMigawki[t.id] === undefined) D.grafikMigawki[t.id] = K.migawkaGrafiku(D, t.id); });
  };

  /* ── Dziennik zmian grafiku ─────────────────────────────────────────── */
  let wTrakcie = false;
  function kto() { return P.rola(); }
  function powodOdrzucenia(D, t, ja, bylo) {
    /* Rejestracja ustawia grafik każdej osoby, terapeuta tylko własny, o ile właściciel mu tego nie zablokował. */
    if (ja !== 'rej') {
      if (t.id !== ja) return 'Możesz zmieniać tylko własny grafik.';
      if (P.zablokowany(t.id)) return 'Grafik ustawia właściciel, więc ta zmiana nie została zapisana.';
    }
    /* Odrzucamy tylko nowe naruszenia: stare (np. ułożone przez właściciela) nie blokują drobnych zmian, jak urlop. */
    const klucz = (x) => `${x.typ}|${x.dz}|${x.r.od}|${x.r.do}|${x.r.lok}|${x.data || ''}`;
    const stare = new Set(K.naruszeniaZMigawki(D, t.id, bylo).map(klucz));
    const n = K.naruszeniaZMigawki(D, t.id, K.migawkaGrafiku(D, t.id)).filter((x) => !stare.has(klucz(x)));
    if (n.some((x) => x.typ === 'otwarcie')) {
      const x = n.find((y) => y.typ === 'otwarcie');
      const m = K.miejsce(D, x.r.lok);
      const dzien = x.data ? ` w dniu ${K.zIso(x.data).getDate()} ${K.MIES[K.zIso(x.data).getMonth()]}` : '';
      return `Godziny ${K.godz(x.r.od)}–${K.godz(x.r.do)}${dzien} wychodzą poza godziny otwarcia (${esc(m.kr || m.nazwa)}${x.o ? `: ${K.godz(x.o[0])}–${K.godz(x.o[1])}` : ', zamknięte w tym dniu'}). Zmiana nie została zapisana.`;
    }
    if (n.some((x) => x.typ === 'miejsce')) return ja === 'rej' ? 'Ta osoba nie przyjmuje w tym miejscu, więc zmiana nie została zapisana. Właściciel może dodać jej to miejsce w profilu.' : 'Nie przyjmujesz w tym miejscu, więc ta zmiana nie została zapisana. Właściciel może dodać Ci to miejsce.';
    return '';
  }
  function sledz() {
    if (wTrakcie || !P.ent()) return;
    const D = P.D();
    if (!D.grafikMigawki) D.grafikMigawki = {};
    const ja = kto();
    let zapisac = false;
    let odrzucono = '';
    D.zespol.forEach((t) => {
      const teraz = K.migawkaGrafiku(D, t.id);
      const bylo = D.grafikMigawki[t.id];
      if (bylo === undefined) { D.grafikMigawki[t.id] = teraz; zapisac = true; return; }
      if (bylo === teraz) return;
      if (ja !== 'wl') {
        const powod = powodOdrzucenia(D, t, ja, bylo);
        if (powod) { K.przywrocGrafik(D, t.id, bylo); odrzucono = powod; zapisac = true; return; }
      }
      const dz = D.dziennikGrafiku;
      const ostatni = dz.find((w) => w.kogo === t.id && !w.cofniete);
      if (ostatni && ostatni.kto === ja && ostatni.przed === teraz) {
        /* Cofnięcie ostatniej własnej zmiany („Cofnij” w komunikacie): wpis znika. */
        dz.splice(dz.indexOf(ostatni), 1);
      } else {
        dz.unshift({ id: `z${Date.now()}${Math.floor(Math.random() * 1000)}`, kiedy: new Date().toISOString(), kto: ja, kogo: t.id, opis: K.opisZmianyGrafiku(bylo, teraz), przed: bylo, po: teraz, widziane: ja === 'wl', widzianeT: ja !== 'wl' && ja !== 'rej' });
        if (dz.length > 60) dz.length = 60;
      }
      D.grafikMigawki[t.id] = teraz;
      zapisac = true;
    });
    if (!zapisac) return;
    wTrakcie = true;
    window.KAL_UI.zapisz();
    wTrakcie = false;
    /* Komunikat po chwili, żeby nie zginął pod komunikatem o samej zmianie, który kalendarz pokazuje zaraz po zapisie. */
    if (odrzucono) setTimeout(() => { window.KAL_UI.toast(odrzucono); P.odswiez(); }, 0);
  }
  document.addEventListener('kal:zmiana', sledz);

  const niewidziane = () => (P.D().dziennikGrafiku || []).filter((w) => w.kto !== 'wl' && !w.widziane && !w.cofniete);
  const dlaMnie = () => { const ja = P.rolaTerap(); return ja ? (P.D().dziennikGrafiku || []).filter((w) => (w.kto === 'wl' || w.kto === 'rej') && w.kogo === ja && !w.widzianeT) : []; };
  P.niewidzianeZmianyGrafiku = niewidziane;
  const kogo = (id) => { const t = P.D().zespol.find((x) => x.id === id); return t ? P.osobaNazwa(t) : 'ktoś'; };
  const ktoNazwa = (w) => (w.kto === 'wl' ? `Właściciel (${esc(P.C().konto.wlasciciel)})` : w.kto === 'rej' ? 'Rejestracja' : esc(kogo(w.kto)));

  /** Wiersz dziennika: kto, kogo, co i kiedy, z akcjami. */
  P.wierszZmianyGrafiku = (w, { akcje = true } = {}) => {
    const wlasne = w.kto === w.kogo;
    const opis = wlasne ? `${ktoNazwa(w)} zmienił${/a$/i.test(kogo(w.kto).split(' ')[0]) ? 'a' : ''} własny grafik` : `${ktoNazwa(w)} zmieni${w.kto === 'rej' ? 'ła' : 'ł'} grafik: ${esc(kogo(w.kogo))}`;
    const przyciski = akcje
      ? `<span class="p-wiersz__akcje">
          <button type="button" class="p-btn p-btn--maly p-btn--cichy" data-pa="zm-pokaz" data-terap="${w.kogo}">Zobacz grafik</button>
          ${w.kto !== 'wl' && !w.cofniete ? `<button type="button" class="p-btn p-btn--maly p-btn--cichy" data-pa="zm-cofnij" data-id="${w.id}">Cofnij zmianę</button>` : ''}
          ${w.kto !== 'wl' && !w.widziane ? `<button type="button" class="p-btn p-btn--maly p-btn--akcent" data-pa="zm-widziane" data-id="${w.id}">Widziałem</button>` : ''}
        </span>`
      : '';
    return `<li class="p-wiersz p-wiersz--zm"><div class="p-wiersz__glowny" style="cursor:default"><b>${opis}</b><small>${esc(w.opis)} · ${esc(P.kiedy(w.kiedy))}${w.cofniete ? ' · cofnięte' : ''}</small></div>${przyciski}</li>`;
  };

  P.akcje['zm-widziane'] = (b) => {
    P.cichoRez((D) => { (D.dziennikGrafiku || []).forEach((w) => { if (!b.dataset.id || w.id === b.dataset.id) w.widziane = true; }); });
    P.odswiez();
  };
  P.akcje['zm-widziane-t'] = () => {
    P.cichoRez((D) => { dlaMnie().forEach((w) => { w.widzianeT = true; }); });
    P.odswiez();
  };
  P.akcje['zm-pokaz'] = (b) => { P.GF.osoba = b.dataset.terap; if (P.GZ) P.GZ.fokus = b.dataset.terap; P.idz('grafik'); };
  P.akcje['zm-cofnij'] = (b) => {
    const w = (P.D().dziennikGrafiku || []).find((x) => x.id === b.dataset.id);
    if (!w) return;
    P.zmienRez(`Cofnięto zmianę grafiku: ${P.osobaNazwa(K.terap(P.D(), w.kogo))}`, (D) => {
      K.przywrocGrafik(D, w.kogo, w.przed);
      const e = D.dziennikGrafiku.find((x) => x.id === w.id);
      if (e) { e.cofniete = true; e.widziane = true; }
    });
  };

  /* ── Konto: przełącznik, menu, filtry ───────────────────────────────── */
  function zastosujRole() {
    const ja = P.rolaTerap();
    P.filtrOsob = ja ? [ja] : null;
    window.KAL_UI.ustawRole(ja);
  }
  P.poPakiecie = zastosujRole;
  P.poMenu = () => {
    const el = document.getElementById('p-konto');
    if (!el) return;
    if (!P.ent()) { el.innerHTML = ''; return; }
    const D = P.D();
    const wl = P.C().konto.wlasciciel;
    const opcje = [['wl', `Właściciel: ${wl}`], ['rej', 'Rejestracja']].concat(D.zespol.filter((t) => !jestWlascicielem(t)).map((t) => [t.id, `Terapeuta: ${P.osobaNazwa(t)}`]));
    el.innerHTML = `<label class="p-konto__et" for="p-konto-sel">Zaloguj jako <em>(demo)</em></label>
      <select id="p-konto-sel" data-pzm="rola">${opcje.map(([v, n]) => `<option value="${esc(v)}"${v === P.rola() ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>`;
    const ja = P.rolaTerap();
    if (ja) {
      const t = K.terap(D, ja);
      document.getElementById('p-kto').innerHTML = `${esc(P.osobaNazwa(t))}<em>terapeuta</em>`;
      document.getElementById('p-awatar').textContent = P.inicjaly(t.nazwa);
    } else if (P.rejestracja()) {
      document.getElementById('p-kto').innerHTML = 'Rejestracja<em>układa grafiki i wizyty</em>';
      document.getElementById('p-awatar').textContent = 'R';
    }
  };
  P.akcje.rola = (t) => {
    rola = t.value;
    zapiszRole();
    zastosujRole();
    if (!P.dostep(P.aktualny)) P.idz('pulpit');
    else P.odswiez();
    const ja = P.rolaTerap();
    window.KAL_UI.toast(ja ? `Konto terapeuty: ${P.osobaNazwa(K.terap(P.D(), ja))}. Widzisz tylko swoje wizyty i swój grafik.` : P.rejestracja() ? 'Konto rejestracji: układasz grafiki zespołu i zarządzasz wizytami. Ustawień, usług i rozliczeń nie widzisz.' : 'Konto właściciela: widzisz cały zespół.');
  };

  const stareMenu = P.MENU;
  P.MENU = () => {
    const m = stareMenu();
    if (!P.ent()) return m;
    if (P.rolaTerap()) {
      return [
        { grupa: null, poz: [['pulpit', 'Dziś'], ['kalendarz', 'Kalendarz'], ['rezerwacje', 'Rezerwacje']] },
        { grupa: 'Mój grafik', poz: [['dostepnosc', 'Moja dostępność'], ['grafik', 'Grafik zespołu']] },
      ];
    }
    if (P.rejestracja()) {
      return [
        { grupa: null, poz: [['pulpit', 'Dziś'], ['kalendarz', 'Kalendarz'], ['rezerwacje', 'Rezerwacje']] },
        { grupa: 'Grafiki', poz: [['grafik', 'Grafik zespołu'], ['dostepnosc', 'Dostępność']] },
      ];
    }
    m[1].poz.unshift(['grafik', 'Grafik zespołu']);
    return m;
  };
  /* Terapeuta nie filtruje po zespole, bo widzi tylko siebie. */
  const stareChipy = P.chipyZespolu;
  P.chipyZespolu = () => (P.rolaTerap() ? '' : stareChipy());

  /* ── Pulpit: zmiany w grafikach ─────────────────────────────────────── */
  const starePulpit = P.widoki.pulpit.render;
  P.widoki.pulpit.render = function render(...a) {
    const h = starePulpit.apply(this, a);
    if (!P.ent()) return h;
    let karta = '';
    if (P.rejestracja()) {
      karta = '';
    } else if (!P.rolaTerap()) {
      const nowe = niewidziane();
      if (nowe.length) {
        karta = P.karta('Zmiany w grafikach od zespołu', `<ul class="p-lista">${nowe.slice(0, 5).map((w) => P.wierszZmianyGrafiku(w)).join('')}</ul>${nowe.length > 5 ? `<p class="p-podp">i jeszcze ${nowe.length - 5}</p>` : ''}`,
          { akcje: `<button type="button" class="p-btn p-btn--maly p-btn--cichy" data-pa="zm-widziane">Widziałem wszystkie</button>`, pod: 'Terapeuci sami ustawiają dostępność. Każdą zmianę możesz zobaczyć i cofnąć.' });
      }
    } else {
      const dla = dlaMnie();
      if (dla.length) {
        karta = P.karta(dla.some((w) => w.kto === 'rej') ? 'Zmieniono Twój grafik' : 'Właściciel zmienił Twój grafik', `<ul class="p-lista">${dla.slice(0, 4).map((w) => P.wierszZmianyGrafiku(w, { akcje: false })).join('')}</ul>`,
          { akcje: `<button type="button" class="p-btn p-btn--maly p-btn--akcent" data-pa="zm-widziane-t">Dziękuję, widzę</button>` });
      }
    }
    return karta ? h.replace('<div class="p-stos">', `<div class="p-stos">${karta}`) : h;
  };

  /* ── Ustawienia (właściciel): konta terapeutów ──────────────────────── */
  const stareUstawienia = P.widoki.ustawienia.render;
  P.widoki.ustawienia.render = function render(...a) {
    const h = stareUstawienia.apply(this, a);
    if (!P.ent()) return h;
    const U = P.D().ustawienia;
    const karta = P.karta('Konta terapeutów', `<div class="p-formularz">
        ${P.przelacznik({ etykieta: 'Terapeuci sami ustawiają swoją dostępność', pf: 'rez:ustawienia.terapeuciGrafik', wartosc: U.terapeuciGrafik !== false, atr: 'data-odswiez', pod: U.terapeuciGrafik !== false ? 'Każdy terapeuta loguje się własnym kontem i ustawia godziny w ramach godzin otwarcia miejsc, w których przyjmuje. Widzisz każdą zmianę i możesz ją cofnąć.' : 'Grafik ustawiasz tylko Ty. Terapeuci widzą swoje godziny, ale ich nie zmieniają.' })}
        <p class="p-podp">Wyjątek dla jednej osoby ustawisz w jej profilu, w zakładce „Zespół”. Godziny otwarcia miejsc ustawiasz w „Lokalizacjach”.</p>
      </div>`);
    return h.replace('<div class="p-stos p-stos--waski">', `<div class="p-stos p-stos--waski">${karta}`);
  };

  window.KAL_UI.edycjaZablokowana = () => !!(P.rolaTerap() && P.zablokowany(P.rolaTerap()));
  zastosujRole();
})();
