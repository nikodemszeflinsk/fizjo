/* Panel gabinetu — prototyp.
 *
 * Wszystko, co widać, liczy się z danych w magazynie (store.js). Każda akcja zmienia
 * stan i przeżywa odświeżenie strony. SMS-y i e-maile nie wychodzą na zewnątrz,
 * ale zostawiają wpis w historii pacjenta.
 */
(() => {
  'use strict';

  const P = window.Panel;
  if (!P) return;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (v) =>
    String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const zl = (n) => `${Math.round(n).toLocaleString('pl-PL')} zł`;

  const S = () => P.stan;

  /* ── Daty ──────────────────────────────────────────────────────────── */
  const DNI = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
  const DNI_KR = ['nd', 'pn', 'wt', 'śr', 'cz', 'pt', 'sb'];
  const MIES = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
  const dlugaData = (d) => `${DNI[d.getDay()]}, ${d.getDate()} ${MIES[d.getMonth()]}`;
  const krotka = (isoData) => {
    const d = P.fromIso(isoData);
    return `${DNI_KR[d.getDay()]} ${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
  };
  const wzgledna = (isoData) => {
    if (!isoData) return '—';
    const dni = P.dniOd(isoData);
    if (dni === 0) return 'dziś';
    if (dni === 1) return 'wczoraj';
    if (dni === -1) return 'jutro';
    return dni > 0 ? `${dni} dni temu` : `za ${Math.abs(dni)} dni (${krotka(isoData)})`;
  };
  const inicjaly = (imie) =>
    String(imie)
      .split(' ')
      .filter((c) => /[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]/.test(c[0] || ''))
      .map((c) => c[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

  /* ── Ikony ─────────────────────────────────────────────────────────── */
  const ICON = {
    dzis: '<path d="M2.5 11.5h3l2-5 3 9 2.5-6 1.5 2h3"/>',
    kalendarz: '<path d="M4 5.5h12v11H4ZM4 8.5h12M7.5 3.5v3M12.5 3.5v3"/>',
    pacjenci: '<path d="M7.5 9.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2.5 17c0-2.8 2.2-5 5-5s5 2.2 5 5M13 4.7a3 3 0 0 1 0 5.6M14.5 12.6c1.8.6 3 2.3 3 4.4"/>',
    ustawienia: '<path d="M10 3.5v3M10 13.5v3M16.5 10h-3M6.5 10h-3M14.6 5.4l-2.1 2.1M7.5 12.5l-2.1 2.1M14.6 14.6l-2.1-2.1M7.5 7.5 5.4 5.4M10 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/>',
    plus: '<path d="M10 4.5v11M4.5 10h11"/>',
    phone: '<path d="M6.5 3.5h-2a1 1 0 0 0-1 1c0 6.6 5.4 12 12 12a1 1 0 0 0 1-1v-2L13 12l-1.5 1.5a8 8 0 0 1-4-4L9 8 6.5 3.5Z"/>',
    sms: '<path d="M3.5 4.5h13v9h-8l-4 3v-3h-1Z"/>',
    link: '<path d="M8.5 11.5a3 3 0 0 0 4.2 0l2.3-2.3a3 3 0 1 0-4.2-4.2l-.9.9M11.5 8.5a3 3 0 0 0-4.2 0L5 10.8a3 3 0 1 0 4.2 4.2l.9-.9"/>',
    wiadomosci: '<path d="M3.5 4.5h13v9h-8l-4 3v-3h-1Z"/>',
    miesiac: '<path d="M3.5 16.5v-6M8 16.5V6M12.5 16.5v-9M17 16.5V3.5"/>',
    druk: '<path d="M6 8V3.5h8V8M5 8h10v6h-2v3H7v-3H5Z"/>',
    blokada: '<path d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9M4.5 9h11v7.5h-11Z"/>',
  };
  const ikona = (n) => `<svg viewBox="0 0 20 20" aria-hidden="true">${ICON[n]}</svg>`;

  /* ── Komunikat z cofnięciem ────────────────────────────────────────── */
  let toastT;
  function toast(tekst, cofalne = false) {
    $('#toast-text').textContent = tekst;
    $('#toast-undo').hidden = !cofalne;
    $('#toast').classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(() => $('#toast').classList.remove('is-on'), cofalne ? 6000 : 3600);
  }

  /* ── Okno dialogowe ────────────────────────────────────────────────── */
  function modal(tytul, tresc, stopka = '') {
    $('#modal-title').textContent = tytul;
    $('#modal-body').innerHTML = tresc;
    $('#modal-foot').innerHTML = stopka;
    $('#modal').hidden = false;
    document.body.style.overflow = 'hidden';
    const pierwszy = $('#modal-body input, #modal-body select, #modal-body textarea, #modal-foot button');
    pierwszy && pierwszy.focus();
  }
  function schowajModal() {
    $('#modal').hidden = true;
    if ($('#drawer').hidden) document.body.style.overflow = '';
  }

  /* ── Widoki ────────────────────────────────────────────────────────── */
  const WIDOKI = [
    { id: 'dzis', nazwa: 'Dziś' },
    { id: 'kalendarz', nazwa: 'Kalendarz' },
    { id: 'pacjenci', nazwa: 'Pacjenci' },
    { id: 'wiadomosci', nazwa: 'Wiadomości' },
    { id: 'miesiac', nazwa: 'Miesiąc' },
    { id: 'ustawienia', nazwa: 'Ustawienia' },
  ];
  let widok = 'dzis';
  let tydzienPrzesuniecie = 0;
  let filtrPacjentow = 'wszyscy';
  let filtrZespolu = null; // null = cały zespół

  /* Pasek zespołu pokazuje się tylko wtedy, gdy jest z czego wybierać. */
  function paskiZespolu() {
    const zespol = P.zespolAktywny();
    if (zespol.length < 2) return '';
    return `<div class="zespol-filtr">
      <button class="osoba${filtrZespolu ? '' : ' is-on'}" type="button" data-zespol="">Cały zespół</button>
      ${zespol
        .map(
          (z) => `<button class="osoba${filtrZespolu === z.id ? ' is-on' : ''}" type="button" data-zespol="${z.id}" style="--c:${z.kolor}">
            <span class="osoba__mark">${esc(z.inicjaly)}</span>${esc(krotkieImie(z.imie))}
          </button>`
        )
        .join('')}
    </div>`;
  }

  /** „mgr Jan Kowalski” → „Jan Kowalski”; tytuł zjada miejsce w interfejsie. */
  const krotkieImie = (imie) => String(imie).replace(/^(mgr|dr|lek\.?|prof\.?)\s+/i, '');

  const naleziZespolu = (w) => !filtrZespolu || w.terapeutaId === filtrZespolu;

  /** Znaczek osoby przy wizycie — inicjały w jej kolorze. */
  function znaczekOsoby(zid, klasa = '') {
    const z = P.terapeuta(zid);
    if (!z || P.zespolAktywny().length < 2) return '';
    return `<span class="kto ${klasa}" style="--c:${z.kolor}" title="${esc(z.imie)}">${esc(z.inicjaly)}</span>`;
  }

  function renderRail() {
    const pilne = zagrozone().length;
    $('#rail-list').innerHTML = WIDOKI.map(
      (w) => `<li><button class="rail__btn" type="button" data-view="${w.id}" aria-current="${w.id === widok}">
        ${ikona(w.id)}${w.nazwa}
        ${w.id === 'dzis' && pilne ? `<span class="rail__badge">${pilne}</span>` : ''}
      </button></li>`
    ).join('');
    const u = S().ustawienia;
    $('#brand-name').textContent = u.nazwa;
    $('#rail-inicjaly').textContent = u.inicjaly;
    $('#rail-terapeuta').innerHTML = `${esc(u.terapeuta)}<em>${esc(u.nazwa)}</em>`;
  }

  function pokazWidok(id) {
    widok = id;
    WIDOKI.forEach((w) => ($(`#${w.id}`).hidden = w.id !== id));
    $('#view-title').textContent = WIDOKI.find((x) => x.id === id).nazwa;
    $('.app').classList.remove('is-open');
    $('#menu').setAttribute('aria-expanded', 'false');
    $('#widok').scrollTo({ top: 0 });
    render();
  }

  /* ── Wyliczenia na potrzeby widoków ────────────────────────────────── */
  const aktywneTerapie = () => S().terapie.filter((t) => t.status === 'aktywna');

  const zagrozone = () =>
    aktywneTerapie()
      .map((t) => ({ t, r: P.ryzyko(t.id) }))
      .filter((x) => x.r && x.r.poziom)
      .sort((a, b) => b.r.punkty - a.r.punkty);

  const wizytyDnia = (isoData, respektujFiltr = true) =>
    S()
      .wizyty.filter((w) => w.data === isoData && w.status !== 'odwolana' && (!respektujFiltr || naleziZespolu(w)))
      .sort((a, b) => Number(a.godzina.replace(':', '.')) - Number(b.godzina.replace(':', '.')));

  const bezTerminu = () =>
    S().pacjenci.filter((p) => !S().wizyty.some((w) => w.pacjentId === p.id && w.status !== 'odwolana'));

  function przychodMiesiaca() {
    const teraz = P.dzis;
    const prefiks = `${teraz.getFullYear()}-${String(teraz.getMonth() + 1).padStart(2, '0')}`;
    return S()
      .wizyty.filter((w) => w.status === 'odbyta' && w.data.startsWith(prefiks) && naleziZespolu(w))
      .reduce((suma, w) => suma + ((P.usluga(w.uslugaId) || {}).cena || 0), 0);
  }

  const STATUS = {
    zaplanowana: { tekst: 'zaplanowana', klasa: '' },
    potwierdzona: { tekst: 'potwierdzona', klasa: 'pill--ok' },
    odbyta: { tekst: 'odbyta', klasa: 'pill--done' },
    nieobecnosc: { tekst: 'nieobecność', klasa: 'pill--warn' },
    odwolana: { tekst: 'odwołana', klasa: 'pill--done' },
  };

  const ZRODLA = {
    mapy: 'Mapy Google',
    strona: 'Strona i rezerwacja',
    polecenie: 'Polecenie',
    reklama: 'Reklama Google',
    powrot: 'Pacjent wrócił',
    inne: 'Inne',
  };

  /* ── Widok: Dziś ───────────────────────────────────────────────────── */
  function renderDzis() {
    const dzisIso = P.iso(P.dzis);
    $('#view-date').textContent = dlugaData(P.dzis);
    const wizyty = wizytyDnia(dzisIso);
    const pilni = zagrozone().filter(({ t }) => !filtrZespolu || t.terapeutaId === filtrZespolu);
    const nowi = bezTerminu();
    const wolne = P.wolneGodziny(dzisIso, null, null, filtrZespolu).length;

    const kafel = (label, value, foot, klasa = '') =>
      `<article class="tile${klasa}"><p class="tile__label">${label}</p><p class="tile__value">${value}</p><p class="tile__foot">${foot}</p></article>`;

    const wizytaWiersz = (w) => {
      const p = P.pacjent(w.pacjentId);
      const t = w.terapiaId ? P.terapia(w.terapiaId) : null;
      const l = t ? P.linia(t.linia) : null;
      const s = STATUS[w.status];
      const u = P.usluga(w.uslugaId);
      return `<li class="wizyta">
        <span class="wizyta__czas">${w.godzina}</span>
        <span class="wizyta__tresc">
          <span class="wizyta__naglowek">
            <button class="wizyta__kto" type="button" data-pacjent="${p.id}">
              ${l ? `<span class="dot" style="--c:${l.kolor}"></span>` : ''}${esc(p.imie)}
            </button>
            <span class="pill ${s.klasa}">${s.tekst}</span>
            ${znaczekOsoby(w.terapeutaId)}
          </span>
          <span class="wizyta__co">${esc(u ? u.nazwa : '')} · ${w.minuty} min${t ? ` · ${P.odbyte(t.id)} z ${t.planWizyt} wizyt` : ''}</span>
        </span>
        <span class="wizyta__akcje">
          ${
            /* Wizyty zamkniętej nie przekłada się ani nie odwołuje — można tylko cofnąć omyłkę. */
            ['odbyta', 'nieobecnosc'].includes(w.status)
              ? `<button class="btn btn--sm btn--ghost" type="button" data-akcja="status" data-wizyta="${w.id}" data-status="potwierdzona">Cofnij oznaczenie</button>`
              : `${w.status === 'zaplanowana' ? `<button class="btn btn--sm" type="button" data-akcja="status" data-wizyta="${w.id}" data-status="potwierdzona">Potwierdź</button>` : ''}
                 <button class="btn btn--sm btn--accent" type="button" data-akcja="status" data-wizyta="${w.id}" data-status="odbyta">Odbyta</button>
                 <button class="btn btn--sm btn--ghost" type="button" data-akcja="status" data-wizyta="${w.id}" data-status="nieobecnosc">Nie przyszedł</button>
                 <button class="btn btn--sm btn--ghost" type="button" data-akcja="przeloz" data-wizyta="${w.id}">Przełóż</button>
                 <button class="btn btn--sm btn--ghost" type="button" data-akcja="odwolaj" data-wizyta="${w.id}">Odwołaj</button>`
          }
        </span>
      </li>`;
    };

    const pilnyWiersz = ({ t, r }) => {
      const p = P.pacjent(t.pacjentId);
      const l = P.linia(t.linia);
      const ost = P.ostatniaWizyta(t.id);
      return `<li class="radar__row radar__row--${r.poziom}">
        <span class="radar__mark" style="--c:${l.kolor};--on:${l.naKolorze}">${inicjaly(p.imie)}</span>
        <div class="radar__body">
          <p class="radar__name">${esc(p.imie)}
            <span class="radar__meta">${esc(t.etykieta)} · ${P.odbyte(t.id)} z ${t.planWizyt} wizyt${ost ? ` · ostatnia ${wzgledna(ost.data)}` : ''}${
              P.zespolAktywny().length > 1 && P.terapeuta(t.terapeutaId) ? ` · ${esc(krotkieImie(P.terapeuta(t.terapeutaId).imie))}` : ''
            }</span>
          </p>
          <p class="radar__why">${r.powody.map((x) => `<span class="why why--${x.typ}">${esc(x.tekst)}</span>`).join('')}</p>
        </div>
        <div class="radar__act">
          <button class="btn btn--sm btn--accent" type="button" data-akcja="umow" data-pacjent-id="${p.id}">Umów termin</button>
          <button class="btn btn--sm btn--ghost" type="button" data-pacjent="${p.id}">Karta</button>
        </div>
      </li>`;
    };

    const osoba = filtrZespolu ? P.terapeuta(filtrZespolu) : null;

    $('#dzis').innerHTML = `
      ${paskiZespolu()}
      <div class="tiles">
        ${kafel('Wizyty dzisiaj', wizyty.length, wolne ? `${wolne} wolnych godzin` : 'grafik pełny')}
        ${kafel('Nie umówili kolejnej', pilni.length, pilni.length ? 'zadzwoń dziś' : 'wszyscy mają termin', pilni.length ? ' tile--alert' : '')}
        ${kafel(
          'Terapie w toku',
          aktywneTerapie().filter((t) => !filtrZespolu || t.terapeutaId === filtrZespolu).length,
          osoba ? `prowadzi ${esc(krotkieImie(osoba.imie))}` : `${S().pacjenci.length} osób w kartotece`
        )}
        ${kafel('Przychód w tym miesiącu', zl(przychodMiesiaca()), 'z wizyt oznaczonych jako odbyte', ' tile--ink')}
      </div>

      <div class="grid grid--dzis">
        <article class="card">
          <header class="card__head card__head--row">
            <div>
              <h2>Dzisiejszy grafik</h2>
              <p class="card__note">${dlugaData(P.dzis)}${osoba ? ` · ${esc(krotkieImie(osoba.imie))}` : ''}</p>
            </div>
            <button class="btn btn--sm btn--accent" type="button" data-akcja="nowa-wizyta">${ikona('plus')}Umów</button>
          </header>
          ${wizyty.length ? `<ul class="wizyty">${wizyty.map(wizytaWiersz).join('')}</ul>` : '<p class="pusto">Dzisiaj nie ma wizyt. Dobry dzień na telefony do pacjentów z listy obok.</p>'}
        </article>

        <article class="card card--radar">
          <header class="card__head">
            <h2 data-ile="${pilni.length ? `${pilni.length} pilne` : 'czysto'}">Nie umówili kolejnej wizyty</h2>
            <p class="card__note">Liczone z terminów wizyt i z ćwiczeń odhaczonych przez pacjenta.</p>
          </header>
          ${pilni.length ? `<ul class="radar">${pilni.slice(0, 6).map(pilnyWiersz).join('')}</ul>` : '<p class="pusto">Każda aktywna terapia ma umówiony kolejny termin.</p>'}
        </article>

        <article class="card">
          <header class="card__head">
            <h2>Nowi bez wizyty</h2>
            <p class="card__note">W kartotece, ale jeszcze bez żadnego terminu</p>
          </header>
          ${
            nowi.length
              ? `<ul class="prosta">${nowi
                  .map(
                    (p) => `<li>
                      <button class="prosta__kto" type="button" data-pacjent="${p.id}">${esc(p.imie)}<em>${esc(p.telefon)} · dodany ${wzgledna(p.utworzony)}</em></button>
                      <button class="btn btn--sm btn--accent" type="button" data-akcja="umow" data-pacjent-id="${p.id}">Umów</button>
                    </li>`
                  )
                  .join('')}</ul>`
              : '<p class="pusto">Wszyscy pacjenci mają umówioną wizytę.</p>'
          }
        </article>

        <article class="card">
          <header class="card__head">
            <h2>Skąd przychodzą pacjenci</h2>
            <p class="card__note">Cała kartoteka, ${S().pacjenci.length} osób</p>
          </header>
          ${zrodlaHtml()}
        </article>
      </div>`;
  }

  function zrodlaHtml() {
    const suma = S().pacjenci.length || 1;
    const liczby = Object.keys(ZRODLA)
      .map((id) => ({ id, ile: S().pacjenci.filter((p) => p.zrodlo === id).length }))
      .filter((x) => x.ile)
      .sort((a, b) => b.ile - a.ile);
    return `<ul class="sources">${liczby
      .map(
        (z) => `<li>
          <span>${ZRODLA[z.id]}</span><b>${Math.round((z.ile / suma) * 100)}%</b>
          <span class="sources__track"><span class="sources__fill" style="width:${(z.ile / suma) * 100}%"></span></span>
        </li>`
      )
      .join('')}</ul>`;
  }

  /* ── Widok: Kalendarz ──────────────────────────────────────────────── */
  function renderKalendarz() {
    const poniedzialek = new Date(P.dzis);
    poniedzialek.setDate(P.dzis.getDate() - ((P.dzis.getDay() + 6) % 7) + tydzienPrzesuniecie * 7);
    const dni = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(poniedzialek);
      d.setDate(poniedzialek.getDate() + i);
      return d;
    });
    const zakres = `${dni[0].getDate()}.${String(dni[0].getMonth() + 1).padStart(2, '0')} – ${dni[5].getDate()}.${String(dni[5].getMonth() + 1).padStart(2, '0')}`;
    $('#view-date').textContent = tydzienPrzesuniecie === 0 ? `Bieżący tydzień · ${zakres}` : zakres;

    const godzinyDnia = (d) => (filtrZespolu ? P.grafikOsoby(filtrZespolu, P.iso(d)) : P.grafikGabinetu(P.iso(d)));
    const czynne = dni.filter(godzinyDnia);
    if (!czynne.length) {
      $('#kalendarz').innerHTML = `${paskiZespolu()}<p class="pusto">W tym tygodniu nikt nie przyjmuje.</p>`;
      return;
    }
    const start = Math.min(...czynne.map((d) => godzinyDnia(d)[0]));
    const koniec = Math.max(...czynne.map((d) => godzinyDnia(d)[1]));
    const godziny = Array.from({ length: koniec - start }, (_, i) => start + i);
    const pozycja = (g) => {
      const [h, m] = g.split(':').map(Number);
      return (h - start + m / 60) * 52;
    };

    const kolumna = (d) => {
      const isoD = P.iso(d);
      if (!godzinyDnia(d)) return `<div class="cal__col cal__col--off"><p class="cal__off">wolne</p></div>`;
      const wizyty = wizytyDnia(isoD);
      const wolne = P.wolneGodziny(isoD, null, null, filtrZespolu);
      const blokady = P.blokadyDnia(isoD, filtrZespolu);
      return `<div class="cal__col">
        ${godziny.map(() => '<div class="cal__line"></div>').join('')}
        ${blokady
          .map(
            (b) => `<button class="blok" type="button" data-akcja="zdejmij-blokade" data-blokada="${b.id}"
              style="top:${pozycja(`${b.od}:00`) + 1}px;height:${(b.do - b.od) * 52 - 3}px"
              title="Kliknij, żeby zdjąć blokadę"><span>${esc(b.powod)}${
                b.terapeutaId && P.terapeuta(b.terapeutaId) ? ` · ${esc(P.terapeuta(b.terapeutaId).inicjaly)}` : ''
              }</span></button>`
          )
          .join('')}
        ${wolne
          .map((g) => {
            const wolni = P.terapeuciWolni(isoD, g, null);
            return `<button class="wolny" type="button" data-akcja="umow-slot" data-data="${isoD}" data-godzina="${g}"
              style="top:${pozycja(g) + 1}px"
              aria-label="Umów wizytę ${krotka(isoD)} o ${g}${wolni.length ? `, wolni: ${wolni.map((z) => z.imie).join(', ')}` : ''}">${g}${
              P.zespolAktywny().length > 1 ? `<em>${wolni.map((z) => z.inicjaly).join(' ')}</em>` : ''
            }</button>`;
          })
          .join('')}
        ${wizyty
          .map((w) => {
            const p = P.pacjent(w.pacjentId);
            const t = w.terapiaId ? P.terapia(w.terapiaId) : null;
            const l = t ? P.linia(t.linia) : { kolor: '#535A61' };
            const z = P.terapeuta(w.terapeutaId);
            const wielu = P.zespolAktywny().length > 1;
            return `<button class="event" type="button" data-pacjent="${p.id}" style="--c:${l.kolor};top:${pozycja(w.godzina) + 1}px;height:${Math.max((w.minuty / 60) * 52 - 3, 32)}px">
              <b>${esc(p.imie)}${wielu && z ? `<i style="--c:${z.kolor}">${esc(z.inicjaly)}</i>` : ''}</b>
              <span>${w.godzina} · ${esc((P.usluga(w.uslugaId) || {}).nazwa || '')}</span>
            </button>`;
          })
          .join('')}
      </div>`;
    };

    $('#kalendarz').innerHTML = `
      ${paskiZespolu()}
      <div class="cal__bar">
        <div class="cal__nav">
          <button class="btn btn--sm" type="button" data-akcja="tydzien" data-o="-1">← Poprzedni</button>
          <button class="btn btn--sm" type="button" data-akcja="tydzien" data-o="0">Ten tydzień</button>
          <button class="btn btn--sm" type="button" data-akcja="tydzien" data-o="1">Następny →</button>
        </div>
        <p class="cal__hint">Kliknij wolną godzinę, żeby umówić wizytę. Kolor paska to rodzaj terapii.</p>
        <button class="btn btn--sm" type="button" data-akcja="blokada">${ikona('blokada')}Zablokuj czas</button>
      </div>
      <div class="cal">
        <div class="cal__head"></div>
        ${dni
          .map((d) => {
            const dzisiaj = P.iso(d) === P.iso(P.dzis);
            return `<div class="cal__head${dzisiaj ? ' cal__head--today' : ''}">${DNI_KR[d.getDay()]} ${d.getDate()}<span>${dzisiaj ? 'dzisiaj' : MIES[d.getMonth()].slice(0, 3)}</span></div>`;
          })
          .join('')}
        <div class="cal__hours">${godziny.map((g) => `<div class="cal__hour">${g}:00</div>`).join('')}</div>
        ${dni.map(kolumna).join('')}
      </div>`;
  }

  /* ── Widok: Pacjenci ───────────────────────────────────────────────── */
  function renderPacjenci() {
    $('#view-date').textContent = `${S().pacjenci.length} osób w kartotece`;
    const filtry = [
      { id: 'wszyscy', nazwa: 'Wszyscy' },
      { id: 'aktywni', nazwa: 'W terapii' },
      { id: 'ryzyko', nazwa: 'Nie umówili kolejnej' },
      { id: 'bez', nazwa: 'Bez wizyty' },
      { id: 'zakonczone', nazwa: 'Zakończone' },
    ];
    const lista = S().pacjenci.filter((p) => {
      const t = P.terapiaPacjenta(p.id);
      if (filtrPacjentow === 'aktywni') return t && t.status === 'aktywna';
      if (filtrPacjentow === 'zakonczone') return t && t.status !== 'aktywna';
      if (filtrPacjentow === 'ryzyko') return t && t.status === 'aktywna' && P.ryzyko(t.id).poziom;
      if (filtrPacjentow === 'bez') return !S().wizyty.some((w) => w.pacjentId === p.id && w.status !== 'odwolana');
      return true;
    }).filter((p) => {
      if (!filtrZespolu) return true;
      const t = P.terapiaPacjenta(p.id);
      return t ? t.terapeutaId === filtrZespolu : false;
    });

    const wielu = P.zespolAktywny().length > 1;
    const wiersz = (p) => {
      const t = P.terapiaPacjenta(p.id);
      const l = t ? P.linia(t.linia) : null;
      const zrobione = t ? P.odbyte(t.id) : 0;
      const proc = t && t.planWizyt ? Math.min(Math.round((zrobione / t.planWizyt) * 100), 100) : 0;
      const nast = t ? P.nastepnaWizyta(t.id) : null;
      const ost = t ? P.ostatniaWizyta(t.id) : null;
      const cw = t ? P.compliance(t.id) : null;
      return `<tr tabindex="0" data-pacjent="${p.id}">
        <td>
          <span class="who">
            <span class="who__mark" style="--c:${l ? l.kolor : '#535A61'};--on:${l ? l.naKolorze : '#fff'}">${inicjaly(p.imie)}</span>
            <span><span class="who__name">${esc(p.imie)}</span><span class="who__sub">${esc(p.telefon)} · ${ZRODLA[p.zrodlo] || 'inne'}</span></span>
          </span>
        </td>
        <td>${t ? `<span class="who"><span class="dot" style="--c:${l.kolor}"></span>${esc(t.etykieta)}</span>` : '<span class="tag">bez karty terapii</span>'}</td>
        ${wielu ? `<td>${t && P.terapeuta(t.terapeutaId) ? esc(krotkieImie(P.terapeuta(t.terapeutaId).imie)) : '—'}</td>` : ''}
        <td>${
          t
            ? `<span class="progress"><span class="progress__track"><span class="progress__fill" style="--c:${l.kolor};width:${proc}%"></span></span><b>${zrobione}/${t.planWizyt}</b></span>`
            : '—'
        }</td>
        <td>${cw === null ? '<span class="tag">brak odhaczeń</span>' : `${cw}%`}</td>
        <td>${ost ? wzgledna(ost.data) : '—'}</td>
        <td>${nast ? `${wzgledna(nast.data)}, ${nast.godzina}` : '<span class="tag">brak terminu</span>'}</td>
      </tr>`;
    };

    $('#pacjenci').innerHTML = `
      ${paskiZespolu()}
      <div class="table__bar">
        <div class="chips">
          ${filtry.map((f) => `<button class="chip" type="button" data-filtr="${f.id}" aria-pressed="${filtrPacjentow === f.id}">${f.nazwa}</button>`).join('')}
        </div>
        <div class="table__akcje">
          <p class="table__count">${lista.length} z ${S().pacjenci.length}</p>
          <button class="btn btn--sm btn--accent" type="button" data-akcja="nowy-pacjent">${ikona('plus')}Dodaj pacjenta</button>
        </div>
      </div>
      <div class="table-wrap">
        <table class="table">
          <caption class="visually-hidden">Kartoteka pacjentów</caption>
          <thead><tr>
            <th scope="col">Pacjent</th><th scope="col">Terapia</th>${wielu ? '<th scope="col">Prowadzi</th>' : ''}<th scope="col">Wizyty</th>
            <th scope="col">Ćwiczenia</th><th scope="col">Ostatnia</th><th scope="col">Następna</th>
          </tr></thead>
          <tbody>${
            lista.length
              ? lista.map(wiersz).join('')
              : `<tr><td colspan="${wielu ? 7 : 6}" class="pusto">Nikogo tu nie ma. Zmień filtr albo dodaj pacjenta.</td></tr>`
          }</tbody>
        </table>
      </div>`;
  }

  /* ── Widok: Wiadomości ─────────────────────────────────────────────── */
  function renderWiadomosci() {
    const kolejka = P.kolejkaWiadomosci(7);
    const czynne = kolejka.filter((w) => !w.wylaczona);
    $('#view-date').textContent = `${czynne.length} wiadomości w kolejce na siedem dni`;

    const dni = [...new Set(kolejka.map((w) => w.data))];
    const grupa = (dataIso) => {
      const poz = kolejka.filter((w) => w.data === dataIso);
      return `<article class="card">
        <header class="card__head card__head--row">
          <div>
            <h2>${krotka(dataIso)}${P.dniOd(dataIso) === 0 ? ' · dzisiaj' : ''}</h2>
            <p class="card__note">${poz.filter((w) => !w.wylaczona).length} z ${poz.length} pójdzie</p>
          </div>
        </header>
        <ul class="kolejka">
          ${poz
            .map((w) => {
              const p = P.pacjent(w.pacjentId);
              return `<li class="${w.wylaczona ? 'is-off' : ''}">
                <span class="kolejka__czas">${w.godzina}</span>
                <span class="kolejka__co">
                  <strong>${esc(w.nazwa)}</strong>
                  <button class="kolejka__kto" type="button" data-pacjent="${p.id}">${esc(p.imie)} · ${esc(p.telefon)}</button>
                  <em>${esc(w.tresc)}</em>
                </span>
                <button class="switch" type="button" role="switch" aria-checked="${!w.wylaczona}"
                  data-akcja="przelacz-wiadomosc" data-pacjent-id="${p.id}" data-typ="${w.typ}">
                  <span></span>${w.wylaczona ? 'wyłączone' : 'włączone'}
                </button>
              </li>`;
            })
            .join('')}
        </ul>
      </article>`;
    };

    $('#wiadomosci').innerHTML = `
      <p class="wyjasnienie">Kolejka wynika z kalendarza i z terapii — nic nie trzeba w nią wpisywać. Przypomnienie idzie dzień przed wizytą, pytanie o ból wieczorem po wizycie, pytanie o ćwiczenia w poniedziałek rano. Wyłącznik działa dla jednego pacjenta i jednego rodzaju wiadomości.</p>
      <p class="wyjasnienie wyjasnienie--uwaga">W prototypie nic nie wychodzi na zewnątrz. W działającym systemie SMS-y są wliczone w abonament do 200 miesięcznie.</p>
      ${dni.length ? dni.map(grupa).join('') : '<p class="pusto">Na najbliższy tydzień nie ma nic do wysłania.</p>'}`;
  }

  /* ── Widok: Miesiąc ────────────────────────────────────────────────── */
  let miesiacPrzesuniecie = 0;

  function renderMiesiac() {
    const m = P.podsumowanieMiesiaca(miesiacPrzesuniecie);
    const nazwa = ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'][m.miesiac.getMonth()];
    $('#view-date').textContent = `${nazwa} ${m.miesiac.getFullYear()}`;

    const zrodla = Object.entries(m.zrodla).sort((a, b) => b[1] - a[1]);
    const suma = m.nowiPacjenci || 1;
    const kafel = (label, value, foot, klasa = '') =>
      `<article class="tile${klasa}"><p class="tile__label">${label}</p><p class="tile__value">${value}</p><p class="tile__foot">${foot}</p></article>`;

    $('#miesiac').innerHTML = `
      <div class="cal__bar">
        <div class="cal__nav">
          <button class="btn btn--sm" type="button" data-akcja="miesiac" data-o="-1">← Poprzedni</button>
          <button class="btn btn--sm" type="button" data-akcja="miesiac" data-o="0">Ten miesiąc</button>
          <button class="btn btn--sm" type="button" data-akcja="miesiac" data-o="1">Następny →</button>
        </div>
        <p class="cal__hint">To samo podsumowanie idzie raz w miesiącu na Twojego maila.</p>
      </div>

      <div class="tiles">
        ${kafel('Nowi pacjenci', m.nowiPacjenci, m.nowiPacjenci ? 'weszli do kartoteki' : 'brak nowych')}
        ${kafel('Wizyty odbyte', m.wizytyOdbyte, `${m.nieobecnosci} nieobecności, ${m.odwolane} odwołań`)}
        ${kafel('Terapie zamknięte', m.terapieZamkniete, `${m.terapieWToku} nadal w toku`)}
        ${kafel('Przychód', zl(m.przychod), 'z wizyt oznaczonych jako odbyte', ' tile--ink')}
      </div>

      <div class="grid grid--ust">
        <article class="card">
          <header class="card__head"><h2>Skąd przyszli nowi</h2><p class="card__note">${m.nowiPacjenci} osób w tym miesiącu</p></header>
          ${
            zrodla.length
              ? `<ul class="sources">${zrodla
                  .map(
                    ([k, ile]) => `<li><span>${ZRODLA[k] || k}</span><b>${ile}</b>
                      <span class="sources__track"><span class="sources__fill" style="width:${(ile / suma) * 100}%"></span></span></li>`
                  )
                  .join('')}</ul>`
              : '<p class="pusto">W tym miesiącu nikt nowy nie trafił do kartoteki.</p>'
          }
        </article>

        <article class="card">
          <header class="card__head"><h2>Efekt terapii</h2><p class="card__note">Z zamkniętych cykli</p></header>
          ${
            m.sredniSpadekBolu !== null
              ? `<p class="duza">${m.sredniSpadekBolu}<span>punktu spadku bólu średnio na zamkniętą terapię, w skali 0–10</span></p>`
              : '<p class="pusto">Żadna terapia nie została w tym miesiącu zamknięta z odczytami bólu.</p>'
          }
        </article>

        <article class="card">
          <header class="card__head"><h2>Zamknięte cykle</h2><p class="card__note">Z wynikiem i powodem</p></header>
          ${(() => {
            const prefiks = `${m.miesiac.getFullYear()}-${String(m.miesiac.getMonth() + 1).padStart(2, '0')}`;
            const lista = S().terapie.filter((t) => t.koniec && t.koniec.startsWith(prefiks));
            if (!lista.length) return '<p class="pusto">Brak.</p>';
            return `<ul class="prosta">${lista
              .map((t) => {
                const p = P.pacjent(t.pacjentId);
                const w = t.wynik || {};
                const spadek = w.bolStart !== null && w.bolStart !== undefined && w.bolKoniec !== null ? `ból ${w.bolStart} → ${w.bolKoniec}` : 'bez odczytów bólu';
                return `<li>
                  <button class="prosta__kto" type="button" data-pacjent="${p.id}">${esc(p.imie)}<em>${esc(t.etykieta)} · ${w.wizytyOdbyte || 0} wizyt · ${spadek}</em></button>
                  <span class="tag">${esc(t.powodZakonczenia || 'zakończona')}</span>
                </li>`;
              })
              .join('')}</ul>`;
          })()}
        </article>
      </div>`;
  }

  /* ── Widok: Ustawienia ─────────────────────────────────────────────── */
  function renderUstawienia() {
    const u = S().ustawienia;
    $('#view-date').textContent = 'Gabinet i dane prototypu';
    const godziny = [1, 2, 3, 4, 5, 6, 0]
      .map((d) => {
        const zakresy = P.zespolAktywny()
          .map((z) => z.godziny[d])
          .filter(Boolean);
        const ile = zakresy.length;
        const tekst = ile ? `${Math.min(...zakresy.map((x) => x[0]))}:00 – ${Math.max(...zakresy.map((x) => x[1]))}:00` : 'nieczynne';
        return `<tr><td>${DNI[d]}</td><td>${tekst}</td><td>${ile ? `${ile} ${ile === 1 ? 'osoba' : 'osoby'}` : ''}</td></tr>`;
      })
      .join('');
    const dniSkrot = { 1: 'pn', 2: 'wt', 3: 'śr', 4: 'cz', 5: 'pt', 6: 'sb', 0: 'nd' };
    const osobaWiersz = (z) => `<li class="osoba-wiersz${z.aktywny === false ? ' is-off' : ''}">
      <span class="osoba__mark osoba__mark--duzy" style="--c:${z.kolor}">${esc(z.inicjaly)}</span>
      <span class="osoba-wiersz__dane">
        <strong>${esc(z.imie)}</strong>
        <em>${esc(z.rola || 'Fizjoterapeuta')}</em>
        <span class="osoba-wiersz__grafik">${
          [1, 2, 3, 4, 5, 6, 0]
            .filter((d) => z.godziny[d])
            .map((d) => `${dniSkrot[d]} ${z.godziny[d][0]}–${z.godziny[d][1]}`)
            .join(' · ') || 'brak godzin w grafiku'
        }</span>
        <span class="osoba-wiersz__linie">${z.linie
          .map((lid) => {
            const l = P.linia(lid);
            return l ? `<span class="tag" style="--c:${l.kolor}">${esc(l.nazwa)}</span>` : '';
          })
          .join('')}</span>
      </span>
      <span class="osoba-wiersz__akcje">
        <button class="btn btn--sm" type="button" data-akcja="edytuj-osobe" data-osoba="${z.id}">Edytuj</button>
        <button class="btn btn--sm btn--ghost" type="button" data-akcja="${z.aktywny === false ? 'wlacz-osobe' : 'wylacz-osobe'}" data-osoba="${z.id}">
          ${z.aktywny === false ? 'Włącz' : 'Wyłącz z grafiku'}
        </button>
      </span>
    </li>`;

    $('#ustawienia').innerHTML = `
      <div class="grid grid--ust">
        <article class="card card--szeroka">
          <header class="card__head card__head--row">
            <div>
              <h2>Zespół</h2>
              <p class="card__note">Grafik każdej osoby decyduje o tym, jakie terminy widzi pacjent na stronie</p>
            </div>
            <button class="btn btn--sm btn--accent" type="button" data-akcja="nowa-osoba">${ikona('plus')}Dodaj osobę</button>
          </header>
          <ul class="osoby">${S().zespol.map(osobaWiersz).join('')}</ul>
        </article>

        <article class="card">
          <header class="card__head card__head--row">
            <div><h2>Gabinet</h2><p class="card__note">Te dane widzi pacjent w swojej karcie</p></div>
            <button class="btn btn--sm" type="button" data-akcja="edytuj-gabinet">Edytuj</button>
          </header>
          <dl class="dane">
            <div><dt>Nazwa</dt><dd>${esc(u.nazwa)}</dd></div>
            <div><dt>Adres</dt><dd>${esc(u.adres)}</dd></div>
            <div><dt>Telefon</dt><dd>${esc(u.telefon)}</dd></div>
            <div><dt>Krok w grafiku</dt><dd>${u.krokMinut} min</dd></div>
          </dl>
        </article>

        <article class="card">
          <header class="card__head"><h2>Godziny otwarcia</h2><p class="card__note">Suma grafików zespołu</p></header>
          <table class="mini"><tbody>${godziny}</tbody></table>
        </article>

        <article class="card">
          <header class="card__head"><h2>Usługi</h2><p class="card__note">${S().uslugi.length} pozycji w cenniku</p></header>
          <table class="mini"><tbody>${S()
            .uslugi.map((x) => `<tr><td>${esc(x.nazwa)}</td><td>${x.minuty} min</td><td>${zl(x.cena)}</td></tr>`)
            .join('')}</tbody></table>
        </article>

        <article class="card">
          <header class="card__head"><h2>Dane prototypu</h2><p class="card__note">Wszystko zapisuje się w tej przeglądarce</p></header>
          <div class="dane__akcje">
            <button class="btn btn--sm" type="button" data-akcja="eksport">Pobierz kopię (JSON)</button>
            <button class="btn btn--sm" type="button" data-akcja="import">Wczytaj z pliku</button>
            <button class="btn btn--sm btn--ghost" type="button" data-akcja="reset">Przywróć dane demonstracyjne</button>
          </div>
          <p class="card__note">Prototyp nie wysyła SMS-ów ani e-maili — zapisuje je w historii pacjenta jako symulację. Dane nie opuszczają tego komputera.</p>
        </article>
      </div>`;
  }

  /* ── Karta pacjenta ────────────────────────────────────────────────── */
  let otwartyPacjent = null;

  function renderDrawer() {
    if (!otwartyPacjent) return;
    const p = P.pacjent(otwartyPacjent);
    if (!p) return zamknijDrawer();
    const t = P.terapiaPacjenta(p.id);
    const l = t ? P.linia(t.linia) : null;
    const zrobione = t ? P.odbyte(t.id) : 0;
    const proc = t && t.planWizyt ? Math.min(Math.round((zrobione / t.planWizyt) * 100), 100) : 0;
    const cw = t ? P.compliance(t.id) : null;
    const odczyty = t ? P.bolTerapii(t.id) : [];
    const historia = S()
      .wizyty.filter((w) => w.pacjentId === p.id)
      .sort((a, b) => (b.data + b.godzina).localeCompare(a.data + a.godzina))
      .slice(0, 6);
    const zdarzenia = S().zdarzenia.filter((z) => z.pacjentId === p.id).slice(0, 5);

    $('#drawer-body').innerHTML = `
      <div class="pat__head">
        <span class="pat__mark" style="--c:${l ? l.kolor : '#535A61'};--on:${l ? l.naKolorze : '#fff'}">${inicjaly(p.imie)}</span>
        <div>
          <h2 class="pat__name" id="drawer-name">${esc(p.imie)}</h2>
          <p class="pat__sub">${esc(p.telefon)} · ${ZRODLA[p.zrodlo] || 'inne'}</p>
        </div>
      </div>

      ${
        t
          ? `<div class="pat__epizod">
              <div class="pat__epizod-head">
                <p class="pat__diag">${esc(t.etykieta)}</p>
                <button class="btn btn--sm btn--ghost" type="button" data-akcja="edytuj-terapie" data-terapia="${t.id}">Edytuj</button>
              </div>
              ${
                P.zespolAktywny().length > 1
                  ? `<p class="pat__prowadzi">Prowadzi
                      <select class="wybor-osoby" data-akcja="przypisz" data-terapia="${t.id}" aria-label="Kto prowadzi terapię">
                        ${P.zespolAktywny()
                          .map((z) => `<option value="${z.id}" ${z.id === t.terapeutaId ? 'selected' : ''}>${esc(z.imie)}</option>`)
                          .join('')}
                      </select>
                    </p>`
                  : ''
              }
              ${t.cel ? `<p class="pat__cel">Cel: <strong>${esc(t.cel)}</strong></p>` : ''}
              <div class="pat__bars">
                <div>
                  <p class="pat__bar-label">Plan wizyt <b>${zrobione} z ${t.planWizyt}</b></p>
                  <span class="progress__track"><span class="progress__fill" style="--c:${l.kolor};width:${proc}%"></span></span>
                </div>
                <div>
                  <p class="pat__bar-label">Ćwiczenia <em>z odhaczeń pacjenta</em> <b>${cw === null ? 'brak' : `${cw}%`}</b></p>
                  <span class="progress__track"><span class="progress__fill" style="--c:${l.kolor};width:${cw || 0}%"></span></span>
                </div>
              </div>
              ${
                odczyty.length
                  ? `<p class="pat__bol-txt">Ból z ankiet: <strong>${odczyty[0].wartosc} → ${odczyty[odczyty.length - 1].wartosc}</strong> w skali 0–10</p>`
                  : '<p class="pat__bol-txt">Pacjent nie odpowiedział jeszcze na pytanie o ból.</p>'
              }
              ${
                t.status !== 'aktywna' && t.wynik
                  ? `<p class="pat__zamknieta">Cykl zamknięty ${wzgledna(t.koniec)} — ${esc(t.powodZakonczenia || 'zakończony')}, ${t.wynik.wizytyOdbyte} wizyt.</p>`
                  : ''
              }
            </div>

            <div class="pat__block">
              <h3>Ćwiczenia domowe</h3>
              ${
                t.cwiczenia.length
                  ? `<ul class="cwiczenia">${t.cwiczenia
                      .map((c) => {
                        const def = P.cwiczenie(c.cwiczenieId);
                        const ile = S().odhaczenia.filter(
                          (o) => o.terapiaId === t.id && o.cwiczenieId === c.cwiczenieId && o.data >= P.isoZa(-14)
                        ).length;
                        return `<li><span>${esc(def ? def.nazwa : c.cwiczenieId)}<em>${esc(c.powtorzenia)} · ${c.razyWTygodniu}× w tygodniu</em></span><b>${ile} odhaczeń</b></li>`;
                      })
                      .join('')}</ul>`
                  : '<p class="pusto">Brak zadanych ćwiczeń.</p>'
              }
              <div class="pat__akcje pat__akcje--male">
                <button class="btn btn--sm" type="button" data-akcja="cwiczenia" data-terapia="${t.id}">Zmień ćwiczenia</button>
                <button class="btn btn--sm" type="button" data-akcja="link" data-terapia="${t.id}">${ikona('link')}Wyślij link pacjentowi</button>
                <button class="btn btn--sm btn--ghost" type="button" data-akcja="druk-cwiczen" data-terapia="${t.id}">${ikona('druk')}Wydrukuj kartę</button>
              </div>
            </div>`
          : `<div class="pat__epizod pat__epizod--pusty">
              <p>Ten pacjent nie ma jeszcze karty terapii.</p>
              <button class="btn btn--sm btn--accent" type="button" data-akcja="nowa-terapia" data-pacjent-id="${p.id}">Załóż kartę terapii</button>
            </div>`
      }

      <div class="pat__block">
        <h3>Wizyty</h3>
        ${
          historia.length
            ? `<ul class="prosta prosta--wizyty">${historia
                .map((w) => {
                  const s = STATUS[w.status];
                  return `<li><span>${krotka(w.data)}, ${w.godzina}<em>${esc((P.usluga(w.uslugaId) || {}).nazwa || '')}</em></span><span class="pill ${s.klasa}">${s.tekst}</span></li>`;
                })
                .join('')}</ul>`
            : '<p class="pusto">Brak wizyt.</p>'
        }
      </div>

      ${
        zdarzenia.length
          ? `<div class="pat__block">
              <h3>Historia kontaktu</h3>
              <ul class="prosta prosta--log">${zdarzenia
                .map((z) => `<li><span>${esc(z.tekst)}<em>${krotka(z.kiedy)}</em></span></li>`)
                .join('')}</ul>
            </div>`
          : ''
      }

      <div class="pat__block">
        <h3>Wiadomości do pacjenta</h3>
        <ul class="ustawienia-sms">
          ${Object.entries(P.TYPY_WIADOMOSCI)
            .map(([typ, def]) => {
              const wyl = S().wylaczone.some((x) => x.pacjentId === p.id && x.typ === typ);
              return `<li>
                <span>${esc(def.nazwa)}<em>o ${def.godzina}</em></span>
                <button class="switch" type="button" role="switch" aria-checked="${!wyl}"
                  data-akcja="przelacz-wiadomosc" data-pacjent-id="${p.id}" data-typ="${typ}">
                  <span></span>${wyl ? 'wyłączone' : 'włączone'}
                </button>
              </li>`;
            })
            .join('')}
        </ul>
      </div>

      <div class="pat__block">
        <h3>Notatka</h3>
        <p class="pat__note">${esc(p.notatka || 'Brak notatki.')}</p>
        <div class="pat__akcje pat__akcje--male">
          <button class="btn btn--sm" type="button" data-akcja="notatka" data-pacjent-id="${p.id}">${p.notatka ? 'Zmień notatkę' : 'Dodaj notatkę'}</button>
        </div>
      </div>

      <div class="pat__akcje">
        <button class="btn btn--accent" type="button" data-akcja="umow" data-pacjent-id="${p.id}">${ikona('plus')}Umów wizytę</button>
        <button class="btn" type="button" data-akcja="przypomnienie" data-pacjent-id="${p.id}">${ikona('sms')}Wyślij przypomnienie</button>
        <a class="btn btn--ghost" href="tel:${esc(String(p.telefon).replace(/\s/g, ''))}">${ikona('phone')}${esc(p.telefon)}</a>
        ${t && t.status === 'aktywna' ? `<button class="btn btn--ghost" type="button" data-akcja="zakoncz" data-terapia="${t.id}">Zamknij terapię z wynikiem</button>` : ''}
      </div>`;
  }

  function otworzPacjenta(pid) {
    otwartyPacjent = pid;
    renderDrawer();
    $('#drawer').hidden = false;
    document.body.style.overflow = 'hidden';
    $('.drawer__close').focus();
  }

  function zamknijDrawer() {
    otwartyPacjent = null;
    $('#drawer').hidden = true;
    if ($('#modal').hidden) document.body.style.overflow = '';
  }

  /* ── Formularze ────────────────────────────────────────────────────── */
  const pole = (id, label, typ = 'text', wartosc = '', extra = '') =>
    `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="${typ}" value="${esc(wartosc)}" ${extra} /></div>`;

  function bladModalu(id, tekst) {
    const el = $(`#${id}`);
    el.textContent = tekst;
    el.hidden = false;
  }

  function formNowyPacjent() {
    modal(
      'Nowy pacjent',
      `<div class="form-grid">
        ${pole('np-imie', 'Imię i nazwisko')}
        ${pole('np-tel', 'Telefon', 'tel')}
        ${pole('np-mail', 'E-mail <em>(opcjonalnie)</em>', 'email')}
        <div class="field">
          <label for="np-zrodlo">Skąd trafił</label>
          <select id="np-zrodlo">${Object.entries(ZRODLA).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
        </div>
        <div class="field field--full">
          <label for="np-notatka">Notatka <em>(opcjonalnie)</em></label>
          <textarea id="np-notatka" rows="2"></textarea>
        </div>
      </div>
      <p class="modal__err" id="np-err" hidden></p>`,
      `<button class="btn btn--ghost" type="button" data-close>Anuluj</button>
       <button class="btn btn--accent" type="button" data-zapisz="pacjent">Dodaj pacjenta</button>`
    );
  }

  function zapiszNowegoPacjenta() {
    const imie = $('#np-imie').value.trim();
    const tel = $('#np-tel').value.trim();
    if (imie.length < 3) return bladModalu('np-err', 'Podaj imię i nazwisko.');
    if (tel.replace(/\D/g, '').length < 9) return bladModalu('np-err', 'Podaj numer telefonu — bez niego nie wyślesz pacjentowi linku ani przypomnienia.');
    const p = P.akcje.dodajPacjenta({
      imie,
      telefon: tel,
      email: $('#np-mail').value.trim(),
      zrodlo: $('#np-zrodlo').value,
      notatka: $('#np-notatka').value.trim(),
    });
    schowajModal();
    toast(`Dodano pacjenta: ${p.imie}`, true);
    otworzPacjenta(p.id);
  }

  function formNowaTerapia(pacjentId) {
    const p = P.pacjent(pacjentId);
    modal(
      `Karta terapii — ${p.imie}`,
      `<div class="form-grid">
        <div class="field">
          <label for="nt-linia">Rodzaj problemu</label>
          <select id="nt-linia">${S().linie.map((l) => `<option value="${l.id}">${l.nazwa}</option>`).join('')}</select>
        </div>
        ${pole('nt-etykieta', 'Krótki opis terapii', 'text', '', 'placeholder="np. ból karku przy pracy przy biurku"')}
        <div class="field field--full">
          <label for="nt-cel">Cel pacjenta <em>(jego słowami)</em></label>
          <input id="nt-cel" type="text" placeholder="np. przespać noc bez bólu" />
        </div>
        ${pole('nt-plan', 'Zaplanowana liczba wizyt', 'number', '6', 'min="1" max="30"')}
        ${pole('nt-odstep', 'Co ile dni wizyta', 'number', '7', 'min="1" max="30"')}
      </div>
      <p class="modal__err" id="nt-err" hidden></p>
      <p class="modal__info">Bez opisu badania i dokumentacji medycznej — panel trzyma tylko to, co potrzebne do prowadzenia wizyt.</p>`,
      `<button class="btn btn--ghost" type="button" data-close>Anuluj</button>
       <button class="btn btn--accent" type="button" data-zapisz="terapia" data-pacjent-id="${pacjentId}">Załóż kartę</button>`
    );
  }

  function zapiszNowaTerapie(pacjentId) {
    const etykieta = $('#nt-etykieta').value.trim();
    if (etykieta.length < 3) return bladModalu('nt-err', 'Napisz krótko, czego dotyczy terapia.');
    P.akcje.dodajTerapie(pacjentId, {
      linia: $('#nt-linia').value,
      etykieta,
      cel: $('#nt-cel').value.trim(),
      planWizyt: Number($('#nt-plan').value) || 6,
      odstepDni: Number($('#nt-odstep').value) || 7,
    });
    schowajModal();
    toast('Założono kartę terapii', true);
  }

  function formEdytujTerapie(tid) {
    const t = P.terapia(tid);
    modal(
      'Karta terapii',
      `<div class="form-grid">
        <div class="field">
          <label for="et-linia">Rodzaj problemu</label>
          <select id="et-linia">${S().linie.map((l) => `<option value="${l.id}" ${l.id === t.linia ? 'selected' : ''}>${l.nazwa}</option>`).join('')}</select>
        </div>
        ${pole('et-etykieta', 'Krótki opis terapii', 'text', t.etykieta)}
        <div class="field field--full">
          <label for="et-cel">Cel pacjenta</label>
          <input id="et-cel" type="text" value="${esc(t.cel || '')}" />
        </div>
        ${pole('et-plan', 'Zaplanowana liczba wizyt', 'number', t.planWizyt, 'min="1" max="30"')}
        ${pole('et-odstep', 'Co ile dni wizyta', 'number', t.odstepDni, 'min="1" max="30"')}
      </div>`,
      `<button class="btn btn--ghost" type="button" data-close>Anuluj</button>
       <button class="btn btn--accent" type="button" data-zapisz="edycja-terapii" data-terapia="${tid}">Zapisz</button>`
    );
  }

  function zapiszEdycjeTerapii(tid) {
    P.akcje.zapiszTerapie(tid, {
      linia: $('#et-linia').value,
      etykieta: $('#et-etykieta').value.trim(),
      cel: $('#et-cel').value.trim(),
      planWizyt: Number($('#et-plan').value) || 6,
      odstepDni: Number($('#et-odstep').value) || 7,
    });
    schowajModal();
    toast('Zapisano kartę terapii', true);
  }

  function formNotatka(pacjentId) {
    const p = P.pacjent(pacjentId);
    modal(
      'Notatka',
      `<div class="field field--full">
        <label for="nn-tekst">Notatka o pacjencie</label>
        <textarea id="nn-tekst" rows="4">${esc(p.notatka || '')}</textarea>
      </div>
      <p class="modal__info">Krótko i operacyjnie: czego pacjent unika, o czym pamiętać przy kolejnej wizycie. Bez danych medycznych.</p>`,
      `<button class="btn btn--ghost" type="button" data-close>Anuluj</button>
       <button class="btn btn--accent" type="button" data-zapisz="notatka" data-pacjent-id="${pacjentId}">Zapisz</button>`
    );
  }

  function formCwiczenia(tid) {
    const t = P.terapia(tid);
    const wybrane = Object.fromEntries(t.cwiczenia.map((c) => [c.cwiczenieId, c]));
    modal(
      'Ćwiczenia domowe',
      `<p class="modal__info">Zaznacz ćwiczenia i ustaw, ile razy w tygodniu pacjent ma je robić. Zobaczy je w swojej karcie pod linkiem i tam je odhaczy.</p>
      <ul class="wybor">
        ${S()
          .cwiczeniaBiblioteka.map((c) => {
            const w = wybrane[c.id];
            return `<li>
              <label class="wybor__check"><input type="checkbox" data-cw="${c.id}" ${w ? 'checked' : ''} /><span><strong>${esc(c.nazwa)}</strong><em>${esc(c.opis || '')}</em></span></label>
              <span class="wybor__ile">
                <input type="text" data-cw-pow="${c.id}" value="${esc(w ? w.powtorzenia : '10 powtórzeń')}" aria-label="Powtórzenia: ${esc(c.nazwa)}" />
                <input type="number" data-cw-razy="${c.id}" value="${w ? w.razyWTygodniu : 5}" min="1" max="7" aria-label="Razy w tygodniu: ${esc(c.nazwa)}" />
                <span>×/tydz.</span>
              </span>
            </li>`;
          })
          .join('')}
      </ul>`,
      `<button class="btn btn--ghost" type="button" data-close>Anuluj</button>
       <button class="btn btn--accent" type="button" data-zapisz="cwiczenia" data-terapia="${tid}">Zapisz plan</button>`
    );
  }

  function zapiszCwiczenia(tid) {
    const wybrane = $$('#modal [data-cw]:checked').map((i) => ({
      cwiczenieId: i.dataset.cw,
      powtorzenia: $(`[data-cw-pow="${i.dataset.cw}"]`).value.trim() || '10 powtórzeń',
      razyWTygodniu: Number($(`[data-cw-razy="${i.dataset.cw}"]`).value) || 5,
    }));
    P.akcje.ustawCwiczenia(tid, wybrane);
    schowajModal();
    toast(wybrane.length ? `Zapisano plan: ${wybrane.length} ćwiczeń` : 'Wyczyszczono plan ćwiczeń', true);
  }

  /* ── Umawianie i przekładanie ──────────────────────────────────────── */
  function formUmow({ pacjentId = null, data = null, godzina = null, wizytaId = null } = {}) {
    const przekladana = wizytaId ? S().wizyty.find((w) => w.id === wizytaId) : null;
    const pacjenci = S()
      .pacjenci.slice()
      .sort((a, b) => a.imie.localeCompare(b.imie, 'pl'));
    const dni = data ? [data] : [...new Set(P.najblizszeTerminy(300).map((t) => t.data))];
    /* Gdy pacjent ma terapię, domyślnie proponujemy jej prowadzącego. */
    const terapiaWstepna = pacjentId ? P.terapiaPacjenta(pacjentId) : null;
    const terapeutaWstepny = terapiaWstepna ? terapiaWstepna.terapeutaId : null;

    modal(
      przekladana ? 'Przełóż wizytę' : 'Umów wizytę',
      `<div class="form-grid">
        ${
          przekladana
            ? `<p class="modal__info field--full">${esc(P.pacjent(przekladana.pacjentId).imie)} · teraz ${krotka(przekladana.data)}, ${przekladana.godzina}. Stary termin wróci do wolnych godzin.</p>`
            : `<div class="field field--full">
                <label for="uw-pacjent">Pacjent</label>
                <select id="uw-pacjent">${pacjenci
                  .map((p) => `<option value="${p.id}" ${p.id === pacjentId ? 'selected' : ''}>${esc(p.imie)}</option>`)
                  .join('')}</select>
              </div>
              <div class="field field--full">
                <label for="uw-usluga">Usługa</label>
                <select id="uw-usluga">${S()
                  .uslugi.map((u) => `<option value="${u.id}">${esc(u.nazwa)} · ${u.minuty} min · ${zl(u.cena)}</option>`)
                  .join('')}</select>
              </div>
              ${
                P.zespolAktywny().length > 1
                  ? `<div class="field field--full">
                      <label for="uw-terapeuta">Kto przyjmie</label>
                      <select id="uw-terapeuta">
                        <option value="">Ktokolwiek wolny</option>
                        ${P.zespolAktywny()
                          .map((z) => `<option value="${z.id}" ${z.id === terapeutaWstepny ? 'selected' : ''}>${esc(z.imie)}</option>`)
                          .join('')}
                      </select>
                    </div>`
                  : ''
              }`
        }
        <div class="field field--full">
          <label for="uw-dzien">Dzień</label>
          <select id="uw-dzien">${dni.map((d) => `<option value="${d}" ${d === data ? 'selected' : ''}>${krotka(d)}</option>`).join('')}</select>
        </div>
      </div>
      <p class="modal__label">Wolne godziny</p>
      <div class="sloty" id="uw-sloty"></div>
      ${
        przekladana
          ? ''
          : `<div class="seria">
              <label class="seria__check"><input type="checkbox" id="uw-seria" /><span><strong>Umów od razu całą serię</strong><em>Ta sama godzina, stały odstęp. Kolidujące terminy przesuwają się o dzień.</em></span></label>
              <div class="seria__pola" id="uw-seria-pola" hidden>
                <label for="uw-ile">Ile wizyt</label>
                <input id="uw-ile" type="number" value="6" min="2" max="20" />
                <label for="uw-co-ile">co ile dni</label>
                <input id="uw-co-ile" type="number" value="7" min="1" max="30" />
              </div>
            </div>`
      }
      <p class="modal__err" id="uw-err" hidden></p>`,
      `<button class="btn btn--ghost" type="button" data-close>Anuluj</button>
       <button class="btn btn--accent" type="button" data-zapisz="${wizytaId ? 'przelozenie' : 'wizyta'}" ${wizytaId ? `data-wizyta="${wizytaId}"` : ''}>${wizytaId ? 'Przełóż' : 'Umów'}</button>`
    );
    renderSloty(godzina);
  }

  function renderSloty(wybranaGodzina = null) {
    const wybor = $('#uw-dzien');
    if (!wybor) return;
    const kto = ($('#uw-terapeuta') || {}).value || null;
    const wolne = P.wolneGodziny(wybor.value, null, null, kto);
    $('#uw-sloty').innerHTML = wolne.length
      ? wolne
          .map((g) => {
            const wolni = P.terapeuciWolni(wybor.value, g, null);
            return `<button class="slot" type="button" data-godz="${g}" aria-pressed="${g === wybranaGodzina}">${g}${
              !kto && P.zespolAktywny().length > 1 ? `<em>${wolni.map((z) => z.inicjaly).join(' ')}</em>` : ''
            }</button>`;
          })
          .join('')
      : '<p class="pusto">W tym dniu nie ma już wolnych godzin dla tej osoby.</p>';
  }

  function zapiszWizyte() {
    const wybrana = $('#uw-sloty [aria-pressed="true"]');
    if (!wybrana) return bladModalu('uw-err', 'Wybierz godzinę.');
    const pacjentId = $('#uw-pacjent').value;
    const t = P.terapiaPacjenta(pacjentId);

    if ($('#uw-seria') && $('#uw-seria').checked) {
      const wynik = P.akcje.umowSerie({
        pacjentId,
        terapiaId: t && t.status === 'aktywna' ? t.id : null,
        terapeutaId: ($('#uw-terapeuta') || {}).value || null,
        uslugaId: $('#uw-usluga').value,
        data: $('#uw-dzien').value,
        godzina: wybrana.dataset.godz,
        ile: Number($('#uw-ile').value) || 6,
        coIleDni: Number($('#uw-co-ile').value) || 7,
      });
      schowajModal();
      const od = wynik.utworzone[0];
      const do_ = wynik.utworzone[wynik.utworzone.length - 1];
      return toast(
        wynik.utworzone.length
          ? `Umówiono ${wynik.utworzone.length} wizyt: ${krotka(od.data)} – ${krotka(do_.data)}`
          : 'Nie udało się umówić żadnego terminu w tej serii',
        true
      );
    }

    const wynik = P.akcje.umowWizyte({
      pacjentId,
      terapiaId: t && t.status === 'aktywna' ? t.id : null,
      terapeutaId: ($('#uw-terapeuta') || {}).value || null,
      data: $('#uw-dzien').value,
      godzina: wybrana.dataset.godz,
      uslugaId: $('#uw-usluga').value,
    });
    if (wynik.blad) return bladModalu('uw-err', wynik.blad);
    schowajModal();
    toast(`Umówiono: ${krotka(wynik.wizyta.data)}, ${wynik.wizyta.godzina}`, true);
  }

  function zapiszPrzelozenie(wid) {
    const wybrana = $('#uw-sloty [aria-pressed="true"]');
    if (!wybrana) return bladModalu('uw-err', 'Wybierz nową godzinę.');
    const wynik = P.akcje.przelozWizyte(wid, $('#uw-dzien').value, wybrana.dataset.godz);
    if (wynik.blad) return bladModalu('uw-err', wynik.blad);
    schowajModal();
    toast(`Przełożono na ${krotka(wynik.wizyta.data)}, ${wynik.wizyta.godzina}`, true);
  }

  /* ── Zespół ────────────────────────────────────────────────────────── */
  const DNI_FORM = [
    [1, 'poniedziałek'],
    [2, 'wtorek'],
    [3, 'środa'],
    [4, 'czwartek'],
    [5, 'piątek'],
    [6, 'sobota'],
    [0, 'niedziela'],
  ];
  const KOLORY_OSOB = ['#1F5FD6', '#E8590C', '#13875A', '#C2255C', '#6741D9', '#0B7285'];

  function formOsoba(zid = null) {
    const z = zid ? P.terapeuta(zid) : null;
    const g = z ? z.godziny : { 1: [8, 16], 2: [8, 16], 3: [8, 16], 4: [8, 16], 5: [8, 16] };
    modal(
      z ? `Edytuj: ${krotkieImie(z.imie)}` : 'Nowa osoba w zespole',
      `<div class="form-grid">
        ${pole('os-imie', 'Imię i nazwisko', 'text', z ? z.imie : '', 'placeholder="np. mgr Anna Nowak"')}
        ${pole('os-rola', 'Specjalizacja <em>(jedno zdanie)</em>', 'text', z ? z.rola : '', 'placeholder="np. terapia manualna"')}
      </div>

      <p class="modal__label">Kolor w grafiku</p>
      <div class="kolory">
        ${KOLORY_OSOB.map(
          (k) => `<button class="kolor" type="button" data-kolor="${k}" style="--c:${k}"
            aria-pressed="${z ? z.kolor === k : k === KOLORY_OSOB[0]}" aria-label="Kolor ${k}"></button>`
        ).join('')}
      </div>

      <p class="modal__label">Czym się zajmuje</p>
      <div class="wybor-linii">
        ${S()
          .linie.map(
            (l) => `<label class="linia-check"><input type="checkbox" data-linia="${l.id}" ${
              !z || z.linie.includes(l.id) ? 'checked' : ''
            } /><span style="--c:${l.kolor}">${esc(l.nazwa)}</span></label>`
          )
          .join('')}
      </div>

      <p class="modal__label">Grafik</p>
      <table class="grafik">
        <tbody>
          ${DNI_FORM.map(
            ([d, nazwa]) => `<tr>
              <td><label class="linia-check"><input type="checkbox" data-dzien="${d}" ${g[d] ? 'checked' : ''} /><span>${nazwa}</span></label></td>
              <td><input type="number" data-od="${d}" min="0" max="23" value="${g[d] ? g[d][0] : 8}" aria-label="${nazwa}: od godziny" /></td>
              <td aria-hidden="true">–</td>
              <td><input type="number" data-do="${d}" min="1" max="24" value="${g[d] ? g[d][1] : 16}" aria-label="${nazwa}: do godziny" /></td>
            </tr>`
          ).join('')}
        </tbody>
      </table>
      <p class="modal__err" id="os-err" hidden></p>`,
      `<button class="btn btn--ghost" type="button" data-close>Anuluj</button>
       <button class="btn btn--accent" type="button" data-zapisz="osoba" ${zid ? `data-osoba="${zid}"` : ''}>${z ? 'Zapisz' : 'Dodaj do zespołu'}</button>`
    );
  }

  function zapiszOsobe(zid) {
    const imie = $('#os-imie').value.trim();
    if (imie.length < 3) return bladModalu('os-err', 'Podaj imię i nazwisko.');
    const linie = $$('#modal [data-linia]:checked').map((i) => i.dataset.linia);
    if (!linie.length) return bladModalu('os-err', 'Zaznacz przynajmniej jeden problem, którym ta osoba się zajmuje.');

    const godziny = {};
    for (const [d] of DNI_FORM) {
      if (!$(`#modal [data-dzien="${d}"]`).checked) continue;
      const od = Number($(`#modal [data-od="${d}"]`).value);
      const doG = Number($(`#modal [data-do="${d}"]`).value);
      if (!(doG > od)) return bladModalu('os-err', 'W każdym zaznaczonym dniu godzina końca musi być późniejsza niż początku.');
      godziny[d] = [od, doG];
    }
    if (!Object.keys(godziny).length) return bladModalu('os-err', 'Zaznacz przynajmniej jeden dzień pracy.');

    const wybranyKolor = $('#modal [data-kolor][aria-pressed="true"]');
    const dane = {
      imie,
      rola: $('#os-rola').value.trim(),
      kolor: wybranyKolor ? wybranyKolor.dataset.kolor : KOLORY_OSOB[0],
      linie,
      godziny,
    };

    if (zid) {
      P.akcje.zapiszTerapeute(zid, dane);
      schowajModal();
      return toast('Zapisano dane osoby', true);
    }
    const z = P.akcje.dodajTerapeute(dane);
    schowajModal();
    toast(`${krotkieImie(z.imie)} dołącza do zespołu`, true);
  }

  /* ── Dane gabinetu ─────────────────────────────────────────────────── */
  function formGabinet() {
    const u = S().ustawienia;
    modal(
      'Dane gabinetu',
      `<p class="modal__info">To, co tu wpiszesz, pacjent zobaczy w swojej karcie i w treści SMS-ów.</p>
      <div class="form-grid">
        ${pole('gb-nazwa', 'Nazwa gabinetu', 'text', u.nazwa)}
        ${pole('gb-telefon', 'Telefon', 'tel', u.telefon)}
        <div class="field field--full">
          <label for="gb-adres">Adres</label>
          <input id="gb-adres" type="text" value="${esc(u.adres)}" />
        </div>
        <div class="field">
          <label for="gb-krok">Co ile minut zaczyna się wizyta</label>
          <select id="gb-krok">
            ${[15, 20, 30, 60].map((m) => `<option value="${m}" ${m === u.krokMinut ? 'selected' : ''}>${m} min</option>`).join('')}
          </select>
        </div>
      </div>
      <p class="modal__err" id="gb-err" hidden></p>`,
      `<button class="btn btn--ghost" type="button" data-close>Anuluj</button>
       <button class="btn btn--accent" type="button" data-zapisz="gabinet">Zapisz</button>`
    );
  }

  /* ── Blokada czasu ─────────────────────────────────────────────────── */
  function formBlokada() {
    const dzisIso = P.iso(P.dzis);
    modal(
      'Zablokuj czas',
      `<p class="modal__info">Urlop, szkolenie, wyjazd. Zablokowane godziny znikają z wolnych terminów — Twoich i tych, które widzi pacjent na stronie.</p>
      <div class="form-grid">
        ${pole('bl-data', 'Od dnia', 'date', dzisIso)}
        ${pole('bl-dni', 'Ile dni', 'number', '1', 'min="1" max="30"')}
        ${pole('bl-od', 'Od godziny', 'number', '8', 'min="0" max="23"')}
        ${pole('bl-do', 'Do godziny', 'number', '19', 'min="1" max="24"')}
        ${
          P.zespolAktywny().length > 1
            ? `<div class="field field--full">
                <label for="bl-kto">Kogo dotyczy</label>
                <select id="bl-kto">
                  <option value="">Cały gabinet</option>
                  ${P.zespolAktywny().map((z) => `<option value="${z.id}">${esc(z.imie)}</option>`).join('')}
                </select>
              </div>`
            : ''
        }
        <div class="field field--full">
          <label for="bl-powod">Powód <em>(widoczny tylko dla Ciebie)</em></label>
          <input id="bl-powod" type="text" placeholder="np. szkolenie, urlop" />
        </div>
      </div>
      <p class="modal__err" id="bl-err" hidden></p>`,
      `<button class="btn btn--ghost" type="button" data-close>Anuluj</button>
       <button class="btn btn--accent" type="button" data-zapisz="blokada">Zablokuj</button>`
    );
  }

  function zapiszBlokade() {
    const data = $('#bl-data').value;
    const od = Number($('#bl-od').value);
    const doG = Number($('#bl-do').value);
    if (!data) return bladModalu('bl-err', 'Wybierz dzień.');
    if (!(doG > od)) return bladModalu('bl-err', 'Godzina końca musi być późniejsza niż początku.');
    const dni = Math.min(Number($('#bl-dni').value) || 1, 30);
    const kolidujace = [];
    for (let i = 0; i < dni; i++) {
      const d = P.fromIso(data);
      d.setDate(d.getDate() + i);
      const iso = P.iso(d);
      const kto = ($('#bl-kto') || {}).value || null;
      S()
        .wizyty.filter((w) => w.data === iso && w.status !== 'odwolana' && (!kto || w.terapeutaId === kto))
        .forEach((w) => {
          const h = Number(w.godzina.split(':')[0]);
          if (h >= od && h < doG) kolidujace.push(w);
        });
    }
    P.akcje.dodajBlokade({ data, od, do: doG, powod: $('#bl-powod').value, dni, terapeutaId: ($('#bl-kto') || {}).value || null });
    schowajModal();
    toast(
      kolidujace.length
        ? `Zablokowano. Uwaga: w tym czasie stoi ${kolidujace.length} umówionych wizyt — przełóż je.`
        : `Zablokowano ${dni > 1 ? `${dni} dni` : 'czas'}`,
      true
    );
  }

  /* ── Kto wejdzie na zwolniony termin ───────────────────────────────── */
  function formKandydaci(wizyta) {
    const t = wizyta.terapiaId ? P.terapia(wizyta.terapiaId) : null;
    const kandydaci = P.kandydaciNaTermin(wizyta.data, wizyta.godzina, t ? t.linia : null);
    if (!kandydaci.length) return;
    modal(
      'Zwolnił się termin',
      `<p class="modal__info"><strong>${krotka(wizyta.data)}, ${wizyta.godzina}</strong> jest znów wolny. Ci pacjenci mają aktywną terapię i nie mają umówionego kolejnego terminu — na górze osoby z tym samym problemem i czekające najdłużej.</p>
      <ul class="prosta">
        ${kandydaci
          .map(
            (k) => `<li>
              <span>${esc(k.pacjent.imie)}<em>${esc(k.terapia.etykieta)}${k.czeka < 900 ? ` · ${k.czeka} dni od ostatniej wizyty` : ' · jeszcze bez wizyty'}${k.taSamaLinia ? ' · ten sam problem' : ''}</em></span>
              <span class="prosta__akcje">
                <a class="btn btn--sm btn--ghost" href="tel:${esc(String(k.pacjent.telefon).replace(/\s/g, ''))}">${ikona('phone')}Zadzwoń</a>
                <button class="btn btn--sm btn--accent" type="button" data-zapisz="wstaw-na-termin"
                  data-pacjent-id="${k.pacjent.id}" data-terapia="${k.terapia.id}"
                  data-data="${wizyta.data}" data-godzina="${wizyta.godzina}" data-usluga="${wizyta.uslugaId}">Wstaw tutaj</button>
              </span>
            </li>`
          )
          .join('')}
      </ul>`,
      `<button class="btn btn--ghost" type="button" data-close>Zostaw wolny</button>`
    );
  }

  /* ── Zamknięcie terapii ────────────────────────────────────────────── */
  function formZamknij(tid) {
    const t = P.terapia(tid);
    const p = P.pacjent(t.pacjentId);
    const w = P.wynikTerapii(tid);
    const poprawa = w.bolStart !== null && w.bolKoniec !== null ? w.bolStart - w.bolKoniec : null;
    const tekst =
      `${p.imie.split(' ')[0]}, dziękujemy za wspólną pracę. ` +
      (poprawa !== null && poprawa > 0 ? `Ból spadł z ${w.bolStart} na ${w.bolKoniec} w skali 0–10. ` : '') +
      `Jeśli było warto, opinia w Mapach Google bardzo pomaga innym trafić do gabinetu: [link do wizytówki]`;

    modal(
      'Zamknij terapię',
      `<p class="modal__info">${esc(p.imie)} · ${esc(t.etykieta)}</p>
      <div class="wynik">
        <div><span>Wizyty</span><b>${w.wizytyOdbyte} z ${w.planWizyt}</b></div>
        <div><span>Ból</span><b>${w.bolStart !== null ? `${w.bolStart} → ${w.bolKoniec}` : 'brak odczytów'}</b></div>
        <div><span>Ćwiczenia</span><b>${w.cwiczenia === null ? 'brak odhaczeń' : `${w.cwiczenia}%`}</b></div>
        <div><span>Czas terapii</span><b>${w.dni !== null ? `${w.dni} dni` : '—'}</b></div>
      </div>
      <div class="field field--full">
        <label for="zk-powod">Dlaczego kończymy</label>
        <select id="zk-powod">
          <option value="plan zrealizowany">Plan zrealizowany, cel osiągnięty</option>
          <option value="poprawa przed planem">Poprawa wcześniej niż zakładaliśmy</option>
          <option value="pacjent przerwał">Pacjent przerwał terapię</option>
          <option value="skierowanie dalej">Przekazany do innego specjalisty</option>
        </select>
      </div>
      <p class="modal__label">Prośba o opinię — gotowa do wysłania</p>
      <div class="field field--full"><textarea id="zk-opinia" rows="4" readonly>${esc(tekst)}</textarea></div>
      <label class="seria__check"><input type="checkbox" id="zk-wyslij" checked /><span><strong>Zapisz prośbę o opinię</strong><em>Trafi do historii pacjenta i do kolejki wiadomości na jutro.</em></span></label>`,
      `<button class="btn btn--ghost" type="button" data-close>Anuluj</button>
       <button class="btn btn--accent" type="button" data-zapisz="zamknij-terapie" data-terapia="${tid}">Zamknij terapię</button>`
    );
  }

  /* ── Link do karty pacjenta ────────────────────────────────────────── */
  function formLink(tid) {
    const t = P.terapia(tid);
    const p = P.pacjent(t.pacjentId);
    const url = `${location.origin}${location.pathname.replace(/crm\.html$/, '')}pacjent.html?t=${t.id}`;
    const tresc = `${p.imie.split(' ')[0]}, tutaj Twoje ćwiczenia i terminy: ${url} — ${S().ustawienia.nazwa}`;
    modal(
      'Link do karty pacjenta',
      `<p class="modal__info">Pacjent otwiera link bez logowania. Widzi cel terapii, najbliższą wizytę, ćwiczenia do odhaczenia i pytanie o ból. Odhaczenia wracają do panelu.</p>
      <div class="field field--full"><label for="lk-url">Link</label><input id="lk-url" type="text" value="${esc(url)}" readonly /></div>
      <div class="field field--full"><label for="lk-tresc">Treść SMS-a</label><textarea id="lk-tresc" rows="3" readonly>${esc(tresc)}</textarea></div>
      <p class="modal__info">W prototypie nic nie wychodzi na zewnątrz — wysyłka zapisuje się w historii pacjenta.</p>`,
      `<a class="btn btn--ghost" href="${esc(url)}" target="_blank" rel="noopener">Otwórz kartę</a>
       <button class="btn" type="button" data-zapisz="kopiuj-link">Kopiuj link</button>
       <button class="btn btn--accent" type="button" data-zapisz="wyslij-link" data-pacjent-id="${p.id}">Wyślij SMS-em</button>`
    );
  }

  /* ── Wyszukiwarka ──────────────────────────────────────────────────── */
  function szukaj(fraza) {
    const out = $('#search-out');
    const q = fraza.trim().toLowerCase();
    if (q.length < 2) {
      out.hidden = true;
      return;
    }
    const trafienia = S()
      .pacjenci.filter((p) => `${p.imie} ${p.telefon}`.toLowerCase().includes(q))
      .slice(0, 6);
    out.hidden = false;
    out.innerHTML = trafienia.length
      ? trafienia
          .map((p) => {
            const t = P.terapiaPacjenta(p.id);
            const l = t ? P.linia(t.linia) : null;
            return `<li><button type="button" data-pacjent="${p.id}">
              <span class="dot" style="--c:${l ? l.kolor : '#535A61'}"></span>${esc(p.imie)}<em>${esc(t ? t.etykieta : 'bez karty terapii')}</em>
            </button></li>`;
          })
          .join('')
      : '<li class="search__empty">Nie znaleziono pacjenta.</li>';
  }

  /* ── Render ────────────────────────────────────────────────────────── */
  function render() {
    renderRail();
    if (widok === 'dzis') renderDzis();
    if (widok === 'kalendarz') renderKalendarz();
    if (widok === 'pacjenci') renderPacjenci();
    if (widok === 'wiadomosci') renderWiadomosci();
    if (widok === 'miesiac') renderMiesiac();
    if (widok === 'ustawienia') renderUstawienia();
    if (otwartyPacjent) renderDrawer();
  }

  /* ── Zdarzenia ─────────────────────────────────────────────────────── */
  document.addEventListener('click', async (e) => {
    /* Wiersz kartoteki też jest klikalny — nie tylko przyciski w nim. */
    const el = e.target.closest('button, a, tr[data-pacjent]');
    if (!el) return;
    const d = el.dataset;

    if (d.close !== undefined || el.classList.contains('modal__veil') || el.classList.contains('drawer__veil')) {
      return el.closest('#modal') ? schowajModal() : zamknijDrawer();
    }
    if (d.view) return pokazWidok(d.view);
    if (d.pacjent) {
      $('#search-out').hidden = true;
      return otworzPacjenta(d.pacjent);
    }
    if (d.filtr) {
      filtrPacjentow = d.filtr;
      return renderPacjenci();
    }
    if (d.godz) {
      $$('#uw-sloty .slot').forEach((s) => s.setAttribute('aria-pressed', String(s === el)));
      $('#uw-err').hidden = true;
      return;
    }
    if (d.kolor) {
      $$('#modal [data-kolor]').forEach((k) => k.setAttribute('aria-pressed', String(k === el)));
      return;
    }
    if (d.zespol !== undefined) {
      filtrZespolu = d.zespol || null;
      return render();
    }

    switch (d.akcja) {
      case 'nowa-wizyta':
        return formUmow();
      case 'umow':
        return formUmow({ pacjentId: d.pacjentId });
      case 'umow-slot':
        return formUmow({ data: d.data, godzina: d.godzina });
      case 'nowy-pacjent':
        return formNowyPacjent();
      case 'nowa-terapia':
        return formNowaTerapia(d.pacjentId);
      case 'edytuj-terapie':
        return formEdytujTerapie(d.terapia);
      case 'notatka':
        return formNotatka(d.pacjentId);
      case 'cwiczenia':
        return formCwiczenia(d.terapia);
      case 'link':
        return formLink(d.terapia);
      case 'status': {
        const poprzedni = (S().wizyty.find((x) => x.id === d.wizyta) || {}).status;
        P.akcje.zmienStatusWizyty(d.wizyta, d.status);
        const nazwy = {
          odbyta: 'Wizyta oznaczona jako odbyta',
          nieobecnosc: 'Zapisano nieobecność',
          potwierdzona: poprzedni === 'odbyta' || poprzedni === 'nieobecnosc' ? 'Cofnięto oznaczenie' : 'Wizyta potwierdzona',
        };
        return toast(nazwy[d.status] || 'Zmieniono status wizyty', true);
      }
      case 'przeloz':
        return formUmow({ wizytaId: d.wizyta });
      case 'odwolaj': {
        const w = S().wizyty.find((x) => x.id === d.wizyta);
        const kopia = w ? { ...w } : null;
        P.akcje.zmienStatusWizyty(d.wizyta, 'odwolana');
        toast('Wizyta odwołana, termin znów jest wolny', true);
        /* Zwolniona godzina to dziura w grafiku — pokazujemy, kim ją zapełnić. */
        if (kopia && P.dniOd(kopia.data) <= 0) formKandydaci(kopia);
        return;
      }
      case 'zakoncz':
        return formZamknij(d.terapia);
      case 'blokada':
        return formBlokada();
      case 'nowa-osoba':
        return formOsoba();
      case 'edytuj-osobe':
        return formOsoba(d.osoba);
      case 'edytuj-gabinet':
        return formGabinet();
      case 'wylacz-osobe': {
        const wynik = P.akcje.wylaczTerapeute(d.osoba);
        return toast(wynik.blad ? wynik.blad : `${krotkieImie(wynik.terapeuta.imie)} nie pojawia się już w grafiku`, !wynik.blad);
      }
      case 'wlacz-osobe':
        P.akcje.wlaczTerapeute(d.osoba);
        return toast('Osoba wróciła do grafiku', true);
      case 'zdejmij-blokade': {
        const b = S().blokady.find((x) => x.id === d.blokada);
        P.akcje.usunBlokade(d.blokada);
        return toast(`Zdjęto blokadę${b ? `: ${b.powod}` : ''}`, true);
      }
      case 'miesiac':
        miesiacPrzesuniecie = d.o === '0' ? 0 : miesiacPrzesuniecie + Number(d.o);
        return renderMiesiac();
      case 'przelacz-wiadomosc': {
        const wynik = P.akcje.przelaczWiadomosc(d.pacjentId, d.typ);
        return toast(wynik.wylaczona ? 'Wyłączono ten rodzaj wiadomości dla pacjenta' : 'Włączono z powrotem', true);
      }
      case 'druk-cwiczen': {
        window.open(`pacjent.html?t=${d.terapia}&druk=1`, '_blank', 'noopener');
        return;
      }
      case 'przypomnienie': {
        const p = P.pacjent(d.pacjentId);
        P.akcje.zapiszWyslanie(p.id, 'sms', 'Przypomnienie o wizycie');
        return toast(`Przypomnienie zapisane w historii (${p.telefon})`);
      }
      case 'tydzien':
        tydzienPrzesuniecie = d.o === '0' ? 0 : tydzienPrzesuniecie + Number(d.o);
        return renderKalendarz();
      case 'eksport': {
        const blob = new Blob([P.akcje.eksport()], { type: 'application/json' });
        const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'panel-gabinetu.json' });
        document.body.append(a);
        a.click();
        a.remove();
        return toast('Pobrano kopię danych');
      }
      case 'import': {
        const input = Object.assign(document.createElement('input'), { type: 'file', accept: 'application/json' });
        input.addEventListener('change', async () => {
          try {
            P.akcje.import(await input.files[0].text());
            toast('Wczytano dane z pliku');
          } catch (_) {
            toast('Nie udało się wczytać tego pliku.');
          }
        });
        input.click();
        return;
      }
      case 'reset':
        P.akcje.reset();
        zamknijDrawer();
        return toast('Przywrócono dane demonstracyjne');
      default:
        break;
    }

    switch (d.zapisz) {
      case 'pacjent':
        return zapiszNowegoPacjenta();
      case 'terapia':
        return zapiszNowaTerapie(d.pacjentId);
      case 'edycja-terapii':
        return zapiszEdycjeTerapii(d.terapia);
      case 'notatka':
        P.akcje.dodajNotatke(d.pacjentId, $('#nn-tekst').value.trim());
        schowajModal();
        return toast('Zapisano notatkę', true);
      case 'cwiczenia':
        return zapiszCwiczenia(d.terapia);
      case 'wizyta':
        return zapiszWizyte();
      case 'przelozenie':
        return zapiszPrzelozenie(d.wizyta);
      case 'kopiuj-link':
        try {
          await navigator.clipboard.writeText($('#lk-url').value);
          toast('Link skopiowany');
        } catch (_) {
          $('#lk-url').select();
          toast('Zaznaczono link — skopiuj go skrótem klawiszowym');
        }
        return;
      case 'wyslij-link':
        P.akcje.zapiszWyslanie(d.pacjentId, 'sms', 'Link do karty terapii i ćwiczeń');
        schowajModal();
        return toast('SMS zapisany w historii pacjenta');
      case 'blokada':
        return zapiszBlokade();
      case 'osoba':
        return zapiszOsobe(d.osoba);
      case 'gabinet': {
        const nazwa = $('#gb-nazwa').value.trim();
        if (nazwa.length < 2) return bladModalu('gb-err', 'Podaj nazwę gabinetu.');
        P.akcje.zapiszUstawienia({
          nazwa,
          telefon: $('#gb-telefon').value.trim(),
          adres: $('#gb-adres').value.trim(),
          krokMinut: Number($('#gb-krok').value),
        });
        schowajModal();
        return toast('Zapisano dane gabinetu', true);
      }
      case 'wstaw-na-termin': {
        const wynik = P.akcje.umowWizyte({
          pacjentId: d.pacjentId,
          terapiaId: d.terapia,
          data: d.data,
          godzina: d.godzina,
          uslugaId: d.usluga,
        });
        schowajModal();
        return toast(wynik.blad ? wynik.blad : `Wstawiono na ${krotka(d.data)}, ${d.godzina}`, !wynik.blad);
      }
      case 'zamknij-terapie': {
        const t = P.terapia(d.terapia);
        P.akcje.zakonczTerapie(d.terapia, $('#zk-powod').value);
        if ($('#zk-wyslij').checked) P.akcje.zapiszWyslanie(t.pacjentId, 'opinia', 'Prośba o opinię w Mapach Google');
        schowajModal();
        return toast('Terapia zamknięta z wynikiem', true);
      }
      default:
        break;
    }
  });

  document.addEventListener('change', (e) => {
    if (e.target.id === 'uw-dzien' || e.target.id === 'uw-terapeuta') renderSloty();
    if (e.target.id === 'uw-seria') $('#uw-seria-pola').hidden = !e.target.checked;
    if (e.target.dataset.akcja === 'przypisz') {
      P.akcje.przypiszTerapie(e.target.dataset.terapia, e.target.value);
      toast('Zmieniono prowadzącego terapię', true);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!$('#modal').hidden) return schowajModal();
      if (!$('#drawer').hidden) return zamknijDrawer();
      $('#search-out').hidden = true;
      return;
    }
    const tr = e.target.closest && e.target.closest('#pacjenci tr[data-pacjent]');
    if (tr && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      otworzPacjenta(tr.dataset.pacjent);
    }
  });

  $('#search').addEventListener('input', (e) => szukaj(e.target.value));
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search')) $('#search-out').hidden = true;
  });

  $('#menu').addEventListener('click', () => {
    const otwarte = $('.app').classList.toggle('is-open');
    $('#menu').setAttribute('aria-expanded', String(otwarte));
  });

  $('#toast-undo').addEventListener('click', () => {
    if (P.akcje.cofnij()) {
      toast('Cofnięto ostatnią zmianę');
    } else {
      toast('Nie ma już czego cofać');
    }
  });

  const bar = $('#demo-bar');
  try {
    if (sessionStorage.getItem('panel-bar-off')) bar.remove();
  } catch (_) {}
  bar &&
    bar.querySelector('.demo-bar__close') &&
    bar.querySelector('.demo-bar__close').addEventListener('click', () => {
      bar.remove();
      try {
        sessionStorage.setItem('panel-bar-off', '1');
      } catch (_) {}
    });

  /* Po każdej zmianie w magazynie odświeżamy to, co widać. */
  P.subskrybuj(() => render());

  /* Gdy pacjent odhaczy ćwiczenie w swojej karcie w innej karcie przeglądarki. */
  window.addEventListener('storage', () => render());

  pokazWidok('dzis');
})();
