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
    odpacjenta: '<path d="M3.5 11.5h4l.8 2h3.4l.8-2h4M3.5 11.5l2-7h9l2 7v4.5h-13Z"/>',
    druk: '<path d="M6 8V3.5h8V8M5 8h10v6h-2v3H7v-3H5Z"/>',
    blokada: '<path d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9M4.5 9h11v7.5h-11Z"/>',
    film: '<path d="M2.5 5.5h15v9h-15ZM8.5 8l4 2.5-4 2.5Z"/>',
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

  /* <input type="time"> przyjmuje tylko HH:MM, a reguły trzymamy po ludzku
     („9:00"). Bez dopełnienia zera pole otwierało się puste. */
  const naZegar = (g) => {
    const [h, m] = String(g || '').split(':');
    return h ? `${String(h).padStart(2, '0')}:${(m || '00').padStart(2, '0')}` : '';
  };

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
    { id: 'odpacjenta', nazwa: 'Od pacjenta' },
    { id: 'wiadomosci', nazwa: 'Wiadomości' },
    { id: 'miesiac', nazwa: 'Miesiąc' },
    { id: 'ustawienia', nazwa: 'Ustawienia' },
  ];
  let widok = 'dzis';
  let tydzienPrzesuniecie = 0;
  let filtrPacjentow = 'wszyscy';
  let filtrWiadomosci = 'wszystkie';
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
    const zespol = P.zespolAktywny();
    $('#brand-name').textContent = u.nazwa;
    /* Stopka menu: przy jednej osobie jej nazwisko, przy zespole — ilu ich jest. */
    if (zespol.length === 1) {
      $('#rail-inicjaly').textContent = zespol[0].inicjaly;
      $('#rail-inicjaly').style.background = zespol[0].kolor;
      $('#rail-terapeuta').innerHTML = `${esc(krotkieImie(zespol[0].imie))}<em>${esc(u.nazwa)}</em>`;
    } else {
      $('#rail-inicjaly').textContent = String(zespol.length);
      $('#rail-inicjaly').style.background = '';
      $('#rail-terapeuta').innerHTML = `${zespol.length} ${zespol.length < 5 ? 'osoby' : 'osób'} w zespole<em>${esc(u.nazwa)}</em>`;
    }
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

  /**
   * Pacjenci, którzy jeszcze u Was nie byli — ci bez żadnego terminu i ci,
   * którzy właśnie zarezerwowali sami przez stronę. Jedni wymagają telefonu,
   * drudzy tylko tego, żeby o nich wiedzieć przed ich pierwszym wejściem.
   */
  const nowiPacjenci = () =>
    S()
      .pacjenci.filter((p) => P.nowyPacjent(p.id))
      .map((p) => ({
        p,
        wizyta: S()
          .wizyty.filter((w) => w.pacjentId === p.id && w.status !== 'odwolana' && w.data >= P.iso(P.dzis))
          .sort((a, b) => (a.data + a.godzina).localeCompare(b.data + b.godzina))[0],
      }))
      .filter(({ p, wizyta }) => !filtrZespolu || !wizyta || wizyta.terapeutaId === filtrZespolu || !P.terapiaPacjenta(p.id))
      .sort((a, b) => String(b.p.utworzony).localeCompare(String(a.p.utworzony)));

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
    if (gabinetPusty()) return renderStart();
    const dzisIso = P.iso(P.dzis);
    $('#view-date').textContent = dlugaData(P.dzis);
    const wizyty = wizytyDnia(dzisIso);
    const pilni = zagrozone().filter(({ t }) => !filtrZespolu || t.terapeutaId === filtrZespolu);
    const nowi = nowiPacjenci();
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
            <h2>Nowi pacjenci</h2>
            <p class="card__note">Jeszcze u Was nie byli — ani razu</p>
          </header>
          ${
            nowi.length
              ? `<ul class="prosta">${nowi
                  .map(
                    ({ p, wizyta }) => `<li>
                      <button class="prosta__kto" type="button" data-pacjent="${p.id}">
                        ${esc(p.imie)}<span class="znak-nowy">nowy</span>
                        <em>${esc(p.telefon)} · ${ZRODLA[p.zrodlo] || 'inne'} · ${wzgledna(p.utworzony)}</em>
                        <em>${
                          wizyta
                            ? `pierwsza wizyta ${wzgledna(wizyta.data)}, ${wizyta.godzina}`
                            : '<b class="prosta__pilne">bez terminu</b>'
                        }</em>
                        ${wizyta && wizyta.opis ? `<em class="prosta__opis">„${esc(wizyta.opis.length > 90 ? wizyta.opis.slice(0, 88) + '…' : wizyta.opis)}”</em>` : ''}
                      </button>
                      ${
                        wizyta
                          ? `<button class="btn btn--sm" type="button" data-akcja="w-kalendarzu" data-data="${wizyta.data}">W kalendarzu</button>`
                          : `<button class="btn btn--sm btn--accent" type="button" data-akcja="umow" data-pacjent-id="${p.id}">Umów</button>`
                      }
                    </li>`
                  )
                  .join('')}</ul>`
              : '<p class="pusto">Każdy w kartotece był już na wizycie.</p>'
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
            return `<button class="event" type="button" data-akcja="wizyta" data-wizyta="${w.id}" style="--c:${l.kolor};top:${pozycja(w.godzina) + 1}px;height:${Math.max((w.minuty / 60) * 52 - 3, 32)}px">
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
            <span><span class="who__name">${esc(p.imie)}${P.nowyPacjent(p.id) ? '<span class="znak-nowy">nowy</span>' : ''}</span><span class="who__sub">${esc(p.telefon)} · ${ZRODLA[p.zrodlo] || 'inne'}</span></span>
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

  /* ── Pierwsze uruchomienie ─────────────────────────────────────────── */
  /* Pusty gabinet to nie błąd, tylko pierwszy dzień. Zamiast pokazywać zera,
     panel prowadzi przez trzy rzeczy, bez których nic nie ruszy. */
  const gabinetPusty = () => !S().pacjenci.length && !S().uruchomiony;

  function renderStart() {
    const u = S().ustawienia;
    const z = S().zespol[0] || {};
    $('#view-date').textContent = 'Zacznijmy od trzech rzeczy';
    $('#dzis').innerHTML = `
      <section class="start">
        <p class="start__kicker">Pierwsze uruchomienie</p>
        <h2 class="start__h">Twój gabinet jest pusty.<br />Ustawmy go w dwie minuty.</h2>
        <p class="start__lead">
          Potem panel zacznie codziennie mówić, kogo masz dzisiaj i do kogo zadzwonić.
          Wszystko da się później zmienić w Ustawieniach.
        </p>

        <ol class="start__kroki">
          <li class="start__krok${u.nazwa && u.telefon ? ' is-ok' : ''}">
            <span class="start__num">1</span>
            <div>
              <h3>Dane gabinetu</h3>
              <p>Nazwa, telefon i adres. Pacjent zobaczy je w swojej karcie i w SMS-ach.</p>
              <p class="start__stan">${u.nazwa ? `${esc(u.nazwa)} · ${esc(u.telefon || 'brak telefonu')}` : 'jeszcze nieustawione'}</p>
            </div>
          </li>
          <li class="start__krok${z.imie ? ' is-ok' : ''}">
            <span class="start__num">2</span>
            <div>
              <h3>Kto przyjmuje i kiedy</h3>
              <p>Godziny pracy decydują o tym, jakie terminy zobaczy pacjent na stronie.</p>
              <p class="start__stan">${z.imie ? `${esc(z.imie)}` : 'jeszcze nieustawione'}</p>
            </div>
          </li>
          <li class="start__krok">
            <span class="start__num">3</span>
            <div>
              <h3>Pierwszy pacjent</h3>
              <p>Dodaj kogoś, kogo prowadzisz teraz — reszta panelu ożyje od razu.</p>
            </div>
          </li>
        </ol>

        <div class="start__akcje">
          <button class="btn btn--accent" type="button" data-akcja="kreator">Ustaw gabinet</button>
          <button class="btn" type="button" data-akcja="nowy-pacjent">Dodaj pacjenta</button>
          <button class="btn btn--ghost" type="button" data-akcja="import">Wczytaj kopię zapasową</button>
        </div>

        <p class="start__stopka">
          Chcesz najpierw zobaczyć, jak to wygląda z pacjentami?
          <button class="link-btn" type="button" data-akcja="wczytaj-demo">Wczytaj dane przykładowe</button>
        </p>
      </section>`;
  }

  function formKreator() {
    const u = S().ustawienia;
    const z = S().zespol[0] || {};
    const DNI_KREATOR = [
      [1, 'poniedziałek'],
      [2, 'wtorek'],
      [3, 'środa'],
      [4, 'czwartek'],
      [5, 'piątek'],
      [6, 'sobota'],
    ];
    modal(
      'Ustaw gabinet',
      `<p class="modal__info">Tyle wystarczy, żeby zacząć. Zespół, cennik i resztę dołożysz w Ustawieniach.</p>
      <div class="form-grid">
        ${pole('kr-nazwa', 'Nazwa gabinetu', 'text', u.nazwa || '', 'placeholder="np. Gabinet Fizjoterapii Kowalski"')}
        ${pole('kr-telefon', 'Telefon', 'tel', u.telefon || '', 'placeholder="+48 600 000 000"')}
        <div class="field field--full">
          <label for="kr-adres">Adres</label>
          <input id="kr-adres" type="text" value="${esc(u.adres || '')}" placeholder="ul. Przykładowa 1, 00-001 Miasto" />
        </div>
        ${pole('kr-terapeuta', 'Kto przyjmuje', 'text', z.imie || '', 'placeholder="mgr Jan Kowalski"')}
        ${pole('kr-rola', 'Specjalizacja <em>(opcjonalnie)</em>', 'text', z.rola || '', 'placeholder="terapia manualna"')}
      </div>

      <p class="modal__label">Godziny przyjęć</p>
      <table class="grafik">
        <tbody>
          ${DNI_KREATOR.map(([d, nazwa]) => {
            const g = (z.godziny || { 1: [8, 16], 2: [8, 16], 3: [8, 16], 4: [8, 16], 5: [8, 16] })[d];
            return `<tr>
              <td><label class="linia-check"><input type="checkbox" data-dzien="${d}" ${g ? 'checked' : ''} /><span>${nazwa}</span></label></td>
              <td><input type="number" data-od="${d}" min="0" max="23" value="${g ? g[0] : 8}" aria-label="${nazwa}: od godziny" /></td>
              <td aria-hidden="true">–</td>
              <td><input type="number" data-do="${d}" min="1" max="24" value="${g ? g[1] : 16}" aria-label="${nazwa}: do godziny" /></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      <p class="modal__err" id="kr-err" hidden></p>`,
      `<button class="btn btn--ghost" type="button" data-close>Anuluj</button>
       <button class="btn btn--accent" type="button" data-zapisz="kreator">Zapisz i zacznij</button>`
    );
  }

  function zapiszKreator() {
    const nazwa = $('#kr-nazwa').value.trim();
    const telefon = $('#kr-telefon').value.trim();
    const terapeuta = $('#kr-terapeuta').value.trim();
    if (nazwa.length < 2) return bladModalu('kr-err', 'Podaj nazwę gabinetu.');
    if (telefon.replace(/\D/g, '').length < 9) return bladModalu('kr-err', 'Podaj telefon — pacjent zobaczy go w swojej karcie.');
    if (terapeuta.length < 3) return bladModalu('kr-err', 'Podaj imię i nazwisko osoby, która przyjmuje.');

    const godziny = {};
    for (const d of [1, 2, 3, 4, 5, 6]) {
      if (!$(`#modal [data-dzien="${d}"]`).checked) continue;
      const od = Number($(`#modal [data-od="${d}"]`).value);
      const doG = Number($(`#modal [data-do="${d}"]`).value);
      if (!(doG > od)) return bladModalu('kr-err', 'Godzina końca musi być późniejsza niż początku.');
      godziny[d] = [od, doG];
    }
    if (!Object.keys(godziny).length) return bladModalu('kr-err', 'Zaznacz przynajmniej jeden dzień przyjęć.');

    P.akcje.uruchomGabinet({
      nazwa,
      telefon,
      adres: $('#kr-adres').value,
      terapeuta,
      rola: $('#kr-rola').value,
      godziny,
    });
    schowajModal();
    toast('Gabinet ustawiony. Dodaj pierwszego pacjenta.');
  }

  /* ── Widok: Wiadomości ─────────────────────────────────────────────── */
  /* Góra ekranu to ustawienia rodzajów — jeden włącznik na rodzaj, nie na
     wiadomość. Dół to kolejka konkretnych wysyłek, gdzie da się poprawić
     albo wyjąć pojedynczą sztukę, nie ruszając reszty. */

  const DNI_PELNE = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];

  /** Kiedy idzie dany rodzaj, jednym zdaniem. */
  function kiedyIdzie(typ) {
    const u = P.ustawieniaRodzaju(typ);
    const def = P.TYPY_WIADOMOSCI[typ];
    if (def.kiedy === 'przed') {
      const d = u.dniPrzed || 1;
      return `${d === 1 ? 'dzień' : `${d} dni`} przed wizytą, o ${u.godzina}`;
    }
    if (def.kiedy === 'poWizycie') return `w dniu wizyty, o ${u.godzina}`;
    if (def.kiedy === 'dniTygodnia') return `${opisDni(u.dni)}, o ${u.godzina}`;
    if (def.kiedy === 'poTerapii') {
      const d = u.dniPo || 1;
      return `${d === 1 ? 'dzień' : `${d} dni`} po zamknięciu terapii, o ${u.godzina}`;
    }
    return `o ${u.godzina}`;
  }

  function renderWiadomosci() {
    const wszystkie = P.kolejkaWiadomosci(7);
    /* Przypomnienie o ćwiczeniach idzie codziennie, więc samo potrafi zająć
       całą kolejkę. Filtr nie chowa niczego na stałe — pozwala tylko spojrzeć
       na jeden rodzaj naraz, zamiast przewijać przez wszystkie. */
    if (filtrWiadomosci !== 'wszystkie' && !wszystkie.some((w) => w.typ === filtrWiadomosci)) filtrWiadomosci = 'wszystkie';
    const kolejka = filtrWiadomosci === 'wszystkie' ? wszystkie : wszystkie.filter((w) => w.typ === filtrWiadomosci);
    const pojda = kolejka.filter((w) => !w.usunieta && !w.wylaczonaRodzaj && !w.wylaczonaPacjent);
    $('#view-date').textContent = `${pojda.length} ${pojda.length === 1 ? 'wiadomość' : 'wiadomości'} wyjdzie w ciągu siedmiu dni`;

    const rodzaj = (typ) => {
      const def = P.TYPY_WIADOMOSCI[typ];
      const u = P.ustawieniaRodzaju(typ);
      const ile = wszystkie.filter((w) => w.typ === typ && !w.usunieta && !w.wylaczonaPacjent).length;
      return `<article class="rodzaj${u.wlaczona ? '' : ' is-off'}">
        <div class="rodzaj__gora">
          <div>
            <h3 class="rodzaj__nazwa">${esc(def.nazwa)}</h3>
            <p class="rodzaj__opis">${esc(def.opis)}</p>
          </div>
          <button class="switch" type="button" role="switch" aria-checked="${u.wlaczona}"
            data-akcja="przelacz-rodzaj" data-typ="${typ}" aria-label="${esc(def.nazwa)}: włącz albo wyłącz">
            <span></span>${u.wlaczona ? 'włączone' : 'wyłączone'}
          </button>
        </div>

        <dl class="rodzaj__dane">
          <div><dt>Kiedy</dt><dd>${kiedyIdzie(typ)}</dd></div>
          <div><dt>W kolejce</dt><dd>${ile ? `${ile} na siedem dni` : 'nic w tym tygodniu'}</dd></div>
        </dl>

        <p class="rodzaj__szablon">${esc(u.szablon)}</p>

        <div class="rodzaj__akcje">
          <button class="btn btn--sm" type="button" data-akcja="ustaw-rodzaj" data-typ="${typ}">Zmień treść i porę</button>
        </div>
      </article>`;
    };

    const dni = [...new Set(kolejka.map((w) => w.data))];
    const grupa = (dataIso) => {
      const poz = kolejka.filter((w) => w.data === dataIso);
      const ilePojdzie = poz.filter((w) => !w.usunieta && !w.wylaczonaRodzaj && !w.wylaczonaPacjent).length;
      return `<article class="card">
        <header class="card__head card__head--row">
          <div>
            <h3 class="kolejka__dzien">${krotka(dataIso)}${P.dniOd(dataIso) === 0 ? ' · dzisiaj' : ''}</h3>
            <p class="card__note">${ilePojdzie} z ${poz.length} pójdzie</p>
          </div>
        </header>
        <ul class="kolejka">${poz.map(wiersz).join('')}</ul>
      </article>`;
    };

    const wiersz = (w) => {
      const p = P.pacjent(w.pacjentId);
      const nieidzie = w.wyslana || w.usunieta || w.wylaczonaRodzaj || w.wylaczonaPacjent;
      const powod = w.wyslana
        ? 'wysłana wcześniej, ręcznie'
        : w.usunieta
        ? 'usunięta z kolejki'
        : w.wylaczonaRodzaj
          ? 'ten rodzaj jest wyłączony'
          : w.wylaczonaPacjent
            ? 'pacjent nie chce takich wiadomości'
            : '';
      return `<li class="${nieidzie ? 'is-off' : ''}">
        <span class="kolejka__czas">${w.godzina}</span>
        <span class="kolejka__co">
          <strong>${esc(w.nazwa)}${w.wlasnaTresc ? '<span class="kolejka__znak">zmieniona</span>' : ''}</strong>
          <button class="kolejka__kto" type="button" data-pacjent="${p.id}">${esc(p.imie)} · ${esc(p.telefon)}</button>
          <em>${esc(w.tresc)}</em>
          ${powod ? `<span class="kolejka__powod">Nie pójdzie: ${powod}</span>` : `<span class="kolejka__skad">${esc(w.powod)}</span>`}
        </span>
        <span class="kolejka__akcje">
          ${
            w.usunieta
              ? `<button class="btn btn--sm" type="button" data-akcja="przywroc-wiadomosc" data-wid="${w.id}">Przywróć</button>`
              : `<button class="btn btn--sm" type="button" data-akcja="edytuj-wiadomosc" data-wid="${w.id}">Edytuj</button>
                 <button class="btn btn--sm btn--ghost" type="button" data-akcja="usun-wiadomosc" data-wid="${w.id}">Usuń</button>`
          }
        </span>
      </li>`;
    };

    $('#wiadomosci').innerHTML = `
      <p class="wyjasnienie">
        Kolejka układa się sama z kalendarza i z terapii — nie trzeba jej niczym karmić.
        Tutaj decydujesz, które rodzaje wiadomości wychodzą, kiedy i co w nich jest.
      </p>

      <div class="rodzaje">${Object.keys(P.TYPY_WIADOMOSCI).map(rodzaj).join('')}</div>

      <h2 class="sekcja-h">Najbliższe siedem dni</h2>
      <p class="wyjasnienie wyjasnienie--uwaga">
        W prototypie nic nie wychodzi na zewnątrz. W działającym systemie SMS-y są wliczone
        w abonament do 200 miesięcznie.
      </p>
      <div class="chips chips--kolejka">
        <button class="chip" type="button" data-filtr-wiad="wszystkie" aria-pressed="${filtrWiadomosci === 'wszystkie'}">Wszystkie · ${wszystkie.length}</button>
        ${Object.entries(P.TYPY_WIADOMOSCI)
          .map(([typ, def]) => {
            const ile = wszystkie.filter((w) => w.typ === typ).length;
            return ile
              ? `<button class="chip" type="button" data-filtr-wiad="${typ}" aria-pressed="${filtrWiadomosci === typ}">${esc(def.nazwa)} · ${ile}</button>`
              : '';
          })
          .join('')}
      </div>
      ${dni.length ? dni.map(grupa).join('') : '<p class="pusto">Na najbliższy tydzień nie ma nic do wysłania.</p>'}`;
  }

  /* ── Ustawienia rodzaju wiadomości ─────────────────────────────────── */
  const DNI_KOLEJNOSC = [1, 2, 3, 4, 5, 6, 0];
  const DNI_SKROT = { 1: 'pn', 2: 'wt', 3: 'śr', 4: 'cz', 5: 'pt', 6: 'sb', 0: 'nd' };

  /**
   * Dni, w które pacjent ma ćwiczyć. Nie pytamy „ile razy w tygodniu", tylko
   * które to dni — bo przypomnienie musi wiedzieć, kiedy dokładnie wyjść.
   */
  function wybieraczDni(idBazowe, wybrane) {
    const dni = Array.isArray(wybrane) && wybrane.length ? wybrane.map(Number) : [1, 2, 3, 4, 5];
    return `<fieldset class="dni-cw field--full">
      <legend>W które dni ćwiczy</legend>
      <div class="dni-cw__lista">
        ${DNI_KOLEJNOSC.map(
          (d) => `<label class="dni-cw__dzien">
            <input type="checkbox" name="${idBazowe}" value="${d}" ${dni.includes(d) ? 'checked' : ''} />
            <span>${DNI_SKROT[d]}</span>
          </label>`
        ).join('')}
      </div>
      <p class="dni-cw__info">Przypomnienie idzie tylko w zaznaczone dni — i tylko wtedy, gdy pacjent jeszcze nie odhaczył ćwiczeń.</p>
    </fieldset>`;
  }

  const odczytajDni = (idBazowe) =>
    [...document.querySelectorAll(`input[name="${idBazowe}"]:checked`)].map((x) => Number(x.value));

  const opisDni = (dni) => {
    const lista = Array.isArray(dni) && dni.length ? dni.map(Number) : [1, 2, 3, 4, 5];
    if (lista.length === 7) return 'codziennie';
    const uporzadkowane = DNI_KOLEJNOSC.filter((d) => lista.includes(d));
    if (uporzadkowane.join() === [1, 2, 3, 4, 5].join()) return 'od poniedziałku do piątku';
    return uporzadkowane.map((d) => DNI_SKROT[d]).join(', ');
  };

  function formRodzaj(typ) {
    const def = P.TYPY_WIADOMOSCI[typ];
    const u = P.ustawieniaRodzaju(typ);


    const kiedyPola = () => {
      if (def.kiedy === 'przed') {
        return `<div class="field">
            <label for="rw-dni">Ile dni przed wizytą</label>
            <select id="rw-dni">
              ${[1, 2, 3].map((d) => `<option value="${d}" ${d === (u.dniPrzed || 1) ? 'selected' : ''}>${d === 1 ? 'dzień przed' : `${d} dni przed`}</option>`).join('')}
            </select>
          </div>`;
      }
      if (def.kiedy === 'dniTygodnia') return wybieraczDni('rw-dni-cw', u.dni);
      if (def.kiedy === 'poTerapii') {
        return `<div class="field">
            <label for="rw-po">Ile dni po zamknięciu terapii</label>
            <select id="rw-po">
              ${[1, 2, 3, 7].map((d) => `<option value="${d}" ${d === (u.dniPo || 1) ? 'selected' : ''}>${d === 1 ? 'następnego dnia' : `po ${d} dniach`}</option>`).join('')}
            </select>
          </div>`;
      }
      return '<p class="modal__info field--full">Ta wiadomość idzie w dniu wizyty — do ustawienia zostaje godzina.</p>';
    };

    modal(
      `Wiadomość: ${def.nazwa.toLowerCase()}`,
      `<p class="modal__info">${esc(def.opis)}</p>

      <p class="modal__label">Kiedy wychodzi</p>
      <div class="form-grid">
        ${kiedyPola()}
        ${pole('rw-godzina', 'O której', 'time', naZegar(u.godzina))}
      </div>

      <p class="modal__label">Treść</p>
      <div class="field field--full">
        <label for="rw-szablon" class="visually-hidden">Treść wiadomości</label>
        <textarea id="rw-szablon" rows="4">${esc(u.szablon)}</textarea>
      </div>
      <p class="modal__info">
        Słowa w nawiasach klamrowych podmieniają się same przy wysyłce. Kliknij, żeby wstawić:
      </p>
      <div class="pola">
        ${def.pola.map((pole) => `<button class="pole-btn" type="button" data-pole="${pole}">{${pole}}</button>`).join('')}
      </div>
      <p class="podglad" id="rw-podglad"></p>
      <p class="modal__err" id="rw-err" hidden></p>`,
      `<button class="btn btn--ghost" type="button" data-close>Anuluj</button>
       <button class="btn" type="button" data-zapisz="rodzaj-domyslny" data-typ="${typ}">Przywróć domyślną</button>
       <button class="btn btn--accent" type="button" data-zapisz="rodzaj" data-typ="${typ}">Zapisz</button>`
    );
    podgladSzablonu();
  }

  /** Podgląd na prawdziwym pacjencie, żeby było widać efekt podmiany. */
  function podgladSzablonu() {
    const pole = $('#rw-szablon');
    const out = $('#rw-podglad');
    if (!pole || !out) return;
    const p = S().pacjenci[0];
    const dane = {
      imie: p ? p.imie.split(' ')[0] : 'Anna',
      gabinet: S().ustawienia.nazwa,
      adres: S().ustawienia.adres,
      kiedy: 'jutro',
      godzina: '9:30',
      cwiczenia: '3 ćwiczenia',
      link: 'linia-ruchu.pl/k/4821',
    };
    const tekst = pole.value.replace(/\{(\w+)\}/g, (calosc, k) => (dane[k] !== undefined ? dane[k] : calosc));
    out.innerHTML = `<span>Tak zobaczy to pacjent:</span>${esc(tekst)}`;
  }

  function zapiszRodzaj(typ) {
    const szablon = $('#rw-szablon').value.trim();
    if (szablon.length < 10) return bladModalu('rw-err', 'Treść jest za krótka.');
    const dane = { godzina: $('#rw-godzina').value, szablon };
    if ($('#rw-dni')) dane.dniPrzed = Number($('#rw-dni').value);
    if ($('#rw-po')) dane.dniPo = Number($('#rw-po').value);
    if (document.querySelector('[name="rw-dni-cw"]')) {
      const dni = odczytajDni('rw-dni-cw');
      if (!dni.length) return bladModalu('rw-err', 'Zaznacz przynajmniej jeden dzień ćwiczeń.');
      dane.dni = dni;
    }
    P.akcje.zapiszRodzajWiadomosci(typ, dane);
    schowajModal();
    toast('Zapisano ustawienia wiadomości', true);
  }

  /* ── Notatka w karcie ──────────────────────────────────────────────── */
  function formNotatkaKarty(pacjentId, nid = null) {
    const n = nid ? (S().notatki || []).find((x) => x.id === nid) : null;
    const t = P.terapiaPacjenta(pacjentId);
    modal(
      n ? 'Edytuj notatkę' : 'Nowa notatka',
      `<div class="field field--full">
        <label for="nk-tekst">Treść</label>
        <textarea id="nk-tekst" rows="4" placeholder="Co warto pamiętać przy następnej wizycie.">${esc(n ? n.tekst : '')}</textarea>
      </div>

      <label class="seria__check">
        <input type="checkbox" id="nk-dla-pacjenta" ${n && n.dlaPacjenta ? 'checked' : ''} />
        <span>
          <strong>Pokaż tę notatkę pacjentowi</strong>
          <em>Trafi do jego karty pod linkiem z SMS-a, nad ćwiczeniami. Bez zaznaczenia zostaje tylko u Ciebie.</em>
        </span>
      </label>

      <p class="modal__info">Panel nie jest dokumentacją medyczną — notatki trzymaj operacyjne: o czym pamiętać, co ustalić, czego unikać.</p>
      <p class="modal__err" id="nk-err" hidden></p>`,
      `<button class="btn btn--ghost" type="button" data-close>Anuluj</button>
       <button class="btn btn--accent" type="button" data-zapisz="notatka-karty" data-pacjent-id="${pacjentId}" ${nid ? `data-notatka="${nid}"` : ''} ${t ? `data-terapia="${t.id}"` : ''}>Zapisz</button>`
    );
  }

  /* ── Wiadomość napisana ręcznie ────────────────────────────────────── */
  function formNapisz(pacjentId) {
    const pac = P.pacjent(pacjentId);
    const t = P.terapiaPacjenta(pacjentId);
    const nast = t ? P.nastepnaWizyta(t.id) : null;
    const imie = pac.imie.split(' ')[0];
    /* Kilka zdań, które i tak pisze się najczęściej. */
    const gotowce = [
      `${imie}, muszę przesunąć jutrzejszą wizytę. Proszę o telefon: ${S().ustawienia.telefon}`,
      `${imie}, proszę zabrać na wizytę wyniki badań obrazowych.`,
      `${imie}, zwolnił się wcześniejszy termin. Jeśli pasuje, proszę dać znać.`,
      `${imie}, proszę przyjść w wygodnym stroju do ćwiczeń.`,
    ];

    modal(
      `Napisz do: ${krotkieImie(pac.imie)}`,
      `<p class="modal__info">
        Jednorazowa wiadomość, poza regułami. Trafi do kolejki i wyjdzie
        o wskazanej porze.${nast ? ` Najbliższa wizyta: ${krotka(nast.data)}, ${nast.godzina}.` : ''}
      </p>

      <div class="form-grid">
        ${pole('nw-data', 'Kiedy wysłać', 'date', P.iso(P.dzis), `min="${P.iso(P.dzis)}"`)}
        ${pole('nw-godzina', 'O której', 'time', '10:00')}
      </div>

      <div class="field field--full">
        <label for="nw-tresc">Treść</label>
        <textarea id="nw-tresc" rows="3" placeholder="Napisz to, co powiedziałbyś przez telefon."></textarea>
      </div>

      <p class="modal__label">Zacznij od gotowego</p>
      <div class="gotowce">
        ${gotowce.map((g, i) => `<button class="gotowiec" type="button" data-gotowiec="${i}">${esc(g)}</button>`).join('')}
      </div>
      <p class="modal__err" id="nw-err" hidden></p>`,
      `<button class="btn btn--ghost" type="button" data-close>Anuluj</button>
       <button class="btn" type="button" data-zapisz="napisz-teraz" data-pacjent-id="${pacjentId}">Wyślij teraz</button>
       <button class="btn btn--accent" type="button" data-zapisz="napisz" data-pacjent-id="${pacjentId}">Zaplanuj</button>`
    );
    /* Gotowce trzymamy przy oknie, żeby klik mógł je wstawić bez szukania. */
    $('#modal').dataset.gotowce = JSON.stringify(gotowce);
  }

  function zapiszNapisz(pacjentId) {
    const tresc = $('#nw-tresc').value.trim();
    const data = $('#nw-data').value;
    const godzina = $('#nw-godzina').value;
    if (tresc.length < 5) return bladModalu('nw-err', 'Napisz treść wiadomości.');
    if (!data) return bladModalu('nw-err', 'Wybierz dzień wysyłki.');
    if (!godzina) return bladModalu('nw-err', 'Podaj godzinę.');
    if (data < P.iso(P.dzis)) return bladModalu('nw-err', 'Nie da się wysłać wstecz — wybierz dzisiaj albo później.');
    P.akcje.dodajWiadomosc({ pacjentId, data, godzina, tresc });
    schowajModal();
    toast(`Wiadomość zaplanowana na ${krotka(data)}, ${godzina}`, true);
  }

  /* ── Pora rodzaju dla jednego pacjenta ─────────────────────────────── */
  function formPoraPacjenta(pacjentId, typ) {
    const pac = P.pacjent(pacjentId);
    const def = P.TYPY_WIADOMOSCI[typ];
    const u = P.ustawieniaRodzaju(typ, pacjentId);
    const gabinet = P.ustawieniaRodzaju(typ);

    const kiedyPole = () => {
      if (def.kiedy === 'przed') {
        return `<div class="field">
            <label for="pp-dni">Ile dni przed wizytą</label>
            <select id="pp-dni">
              ${[1, 2, 3, 5, 7]
                .map((d) => `<option value="${d}" ${d === (u.dniPrzed || 1) ? 'selected' : ''}>${d === 1 ? 'dzień przed' : `${d} dni przed`}</option>`)
                .join('')}
            </select>
          </div>`;
      }
      if (def.kiedy === 'dniTygodnia') return wybieraczDni('pp-dni-cw', u.dni);
      if (def.kiedy === 'poTerapii') {
        return `<div class="field">
            <label for="pp-po">Ile dni po terapii</label>
            <select id="pp-po">
              ${[1, 2, 3, 7]
                .map((d) => `<option value="${d}" ${d === (u.dniPo || 1) ? 'selected' : ''}>${d === 1 ? 'następnego dnia' : `po ${d} dniach`}</option>`)
                .join('')}
            </select>
          </div>`;
      }
      return '';
    };

    modal(
      `${def.nazwa} — ${krotkieImie(pac.imie)}`,
      `<p class="modal__info">
        Reguła gabinetu: <strong>${kiedyIdzie(typ)}</strong>. Tutaj ustawiasz wyjątek
        tylko dla tej osoby — reszta pacjentów zostaje przy regule.
      </p>

      <div class="form-grid">
        ${kiedyPole()}
        ${pole('pp-godzina', 'O której', 'time', naZegar(u.godzina))}
      </div>

      <p class="podglad" id="pp-podglad"></p>
      <p class="modal__err" id="pp-err" hidden></p>`,
      `<button class="btn btn--ghost" type="button" data-close>Anuluj</button>
       ${u.wlasne ? `<button class="btn" type="button" data-zapisz="pora-domyslna" data-pacjent-id="${pacjentId}" data-typ="${typ}">Wróć do reguły</button>` : ''}
       <button class="btn btn--accent" type="button" data-zapisz="pora-pacjenta" data-pacjent-id="${pacjentId}" data-typ="${typ}">Zapisz wyjątek</button>`
    );
    podgladPory(pacjentId, typ);
  }

  /** Pokazuje, kiedy dokładnie wyjdzie najbliższa taka wiadomość. */
  function podgladPory(pacjentId, typ) {
    const out = $('#pp-podglad');
    if (!out) return;
    const naj = P.wiadomosciPacjenta(pacjentId, 30).find((w) => w.typ === typ);
    out.innerHTML = naj
      ? `<span>Najbliższa taka wiadomość</span>${krotka(naj.data)} o ${naj.godzina}${naj.spozniona ? ' (termin z reguły już minął)' : ''}`
      : '<span>Najbliższa taka wiadomość</span>w najbliższym miesiącu nie ma powodu, żeby wyszła';
  }

  /* ── Edycja jednej wiadomości ──────────────────────────────────────── */
  function formWiadomosc(wid) {
    const w = P.kolejkaWiadomosci(30).find((x) => x.id === wid);
    if (!w) return;
    const pac = P.pacjent(w.pacjentId);
    modal(
      'Ta jedna wiadomość',
      `<p class="modal__info">
        Do: <strong>${esc(pac.imie)}</strong> · ${esc(pac.telefon)}<br />
        Powód: ${esc(w.powod)}.
      </p>

      <p class="modal__label">Kiedy wyjdzie</p>
      <div class="form-grid">
        ${pole('ew-data', 'Dzień', 'date', w.data, `min="${P.iso(P.dzis)}"`)}
        ${pole('ew-godzina', 'Godzina', 'time', naZegar(w.godzina))}
      </div>
      ${w.przesunieta ? '<p class="modal__info">Ten termin jest już przesunięty ręcznie — reguła gabinetu mówi co innego.</p>' : ''}

      <p class="modal__label">Treść</p>
      <div class="field field--full">
        <label for="ew-tresc" class="visually-hidden">Treść wiadomości</label>
        <textarea id="ew-tresc" rows="4">${esc(w.tresc)}</textarea>
      </div>
      <p class="modal__info">Zmiany dotyczą tylko tej jednej wiadomości. Reguła i szablon zostają bez zmian.</p>
      <p class="modal__err" id="ew-err" hidden></p>`,
      `<button class="btn btn--ghost" type="button" data-close>Anuluj</button>
       ${w.wlasnaTresc || w.przesunieta ? `<button class="btn" type="button" data-zapisz="wiadomosc-domyslna" data-wid="${wid}">Wróć do reguły</button>` : ''}
       <button class="btn" type="button" data-zapisz="wyslij-teraz" data-wid="${wid}">Wyślij teraz</button>
       <button class="btn btn--accent" type="button" data-zapisz="wiadomosc" data-wid="${wid}">Zapisz</button>`
    );
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
  /** Jedno ćwiczenie w bibliotece: co mówi pacjentowi i gdzie już siedzi. */
  function cwiczenieWiersz(c, stat = null) {
    const u = P.uzycieCwiczenia(c.id);
    const gdzie = u.terapie
      ? `${u.terapie} ${u.terapie === 1 ? 'plan' : 'planów'}${u.aktywne ? `, w tym ${u.aktywne} w toku` : ''}`
      : 'w żadnym planie';
    return `<li class="cwb__poz${c.wycofane ? ' is-off' : ''}">
      <span class="cwb__tresc">
        <strong>${esc(c.nazwa)}${c.wycofane ? '<span class="cwb__znak">wycofane</span>' : ''}</strong>
        ${c.opis ? `<em class="cwb__opis">${esc(c.opis)}</em>` : '<em class="cwb__opis cwb__opis--brak">bez opisu dla pacjenta</em>'}
        <span class="cwb__meta">
          <span>${esc(c.powtorzenia || '')}${c.razy ? ` · ${c.razy}× w tygodniu` : ''}</span>
          <span>${gdzie}</span>
          ${
            stat && stat.zadane
              ? `<span class="cwb__robione">Robione: ${Math.round((stat.zrobione / stat.zadane) * 100)}% <em>(${stat.zrobione} z ${stat.zadane} zaplanowanych odhaczeń, 14 dni)</em></span>`
              : ''
          }
          ${
            c.material && c.material.url
              ? `<a class="cwb__material" href="${esc(c.material.url)}" target="_blank" rel="noopener">${ikona('film')}${esc(c.material.opis || 'nagranie')}</a>`
              : '<span class="cwb__material cwb__material--brak">bez nagrania</span>'
          }
        </span>
      </span>
      <span class="cwb__akcje">
        <button class="btn btn--sm" type="button" data-akcja="edytuj-cwiczenie" data-cw-id="${c.id}">Edytuj</button>
        ${
          c.wycofane
            ? `<button class="btn btn--sm btn--ghost" type="button" data-akcja="przywroc-cwiczenie" data-cw-id="${c.id}">Przywróć</button>`
            : `<button class="btn btn--sm btn--ghost" type="button" data-akcja="usun-cwiczenie" data-cw-id="${c.id}">Usuń</button>`
        }
      </span>
    </li>`;
  }

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

  /** Kiedy dany rodzaj wychodzi akurat do tego pacjenta. */
  function kiedyDlaPacjenta(typ, pacjentId) {
    const u = P.ustawieniaRodzaju(typ, pacjentId);
    const def = P.TYPY_WIADOMOSCI[typ];
    if (def.kiedy === 'przed') {
      const d = u.dniPrzed || 1;
      return `${d === 1 ? 'dzień' : `${d} dni`} przed wizytą, ${u.godzina}`;
    }
    if (def.kiedy === 'poWizycie') return `w dniu wizyty, ${u.godzina}`;
    if (def.kiedy === 'dniTygodnia') return `${opisDni(u.dni)}, ${u.godzina}`;
    if (def.kiedy === 'poTerapii') {
      const d = u.dniPo || 1;
      return `${d === 1 ? 'dzień' : `${d} dni`} po terapii, ${u.godzina}`;
    }
    return u.godzina;
  }

  /** Jedna konkretna wiadomość w karcie pacjenta. */
  function wiadomoscWKarcie(w) {
    const nieidzie = w.wyslana || w.usunieta || w.wylaczonaRodzaj || w.wylaczonaPacjent;
    const powod = w.wyslana
      ? 'wysłana wcześniej, ręcznie'
      : w.usunieta
      ? 'usunięta z kolejki'
      : w.wylaczonaRodzaj
        ? 'rodzaj wyłączony w gabinecie'
        : w.wylaczonaPacjent
          ? 'wyłączone dla tego pacjenta'
          : '';
    return `<li class="wiad-lista__poz${nieidzie ? ' is-off' : ''}">
      <span class="wiad-lista__kiedy">
        <strong>${krotka(w.data)}</strong>
        <em>${w.godzina}</em>
      </span>
      <span class="wiad-lista__co">
        <span class="wiad-lista__nazwa">
          ${esc(w.nazwa)}
          ${w.recznaWiadomosc ? '<span class="kolejka__znak">ręczna</span>' : ''}
          ${w.wlasnaTresc ? '<span class="kolejka__znak">zmieniona</span>' : ''}
          ${w.wlasnyHarmonogram ? '<span class="kolejka__znak kolejka__znak--pora">własna pora</span>' : ''}
          ${w.przesunieta ? '<span class="kolejka__znak kolejka__znak--pora">termin zmieniony</span>' : ''}
        </span>
        <em>${esc(w.tresc)}</em>
        ${
          powod
            ? `<span class="kolejka__powod">Nie pójdzie: ${powod}</span>`
            : w.spozniona
              ? '<span class="kolejka__powod">Termin z reguły już minął — pójdzie dzisiaj</span>'
              : `<span class="kolejka__skad">${esc(w.powod)}</span>`
        }
      </span>
      <span class="wiad-lista__akcje">
        ${
          w.usunieta
            ? `<button class="btn btn--sm" type="button" data-akcja="przywroc-wiadomosc" data-wid="${w.id}">Przywróć</button>`
            : `<button class="btn btn--sm btn--ghost" type="button" data-akcja="edytuj-wiadomosc" data-wid="${w.id}">Edytuj</button>
               <button class="btn btn--sm btn--ghost" type="button" data-akcja="${w.recznaWiadomosc ? 'skasuj-wiadomosc' : 'usun-wiadomosc'}" data-wid="${w.id}">${w.recznaWiadomosc ? 'Skasuj' : 'Nie wysyłaj'}</button>`
        }
      </span>
    </li>`;
  }

  /**
   * Co pacjent naprawdę odpowiedział: kolejne oceny bólu i odhaczenia
   * tydzień po tygodniu. Bez tego procent w karcie jest liczbą bez historii.
   */
  function odpowiedziPacjenta(t) {
    const bol = P.bolTerapii(t.id);
    const l = P.linia(t.linia);

    /* Cztery ostatnie tygodnie, od najstarszego. */
    const tygodnie = Array.from({ length: 4 }, (_, i) => {
      const od = P.isoZa(-7 * (4 - i));
      const doKiedy = P.isoZa(-7 * (3 - i));
      return { od, doKiedy, etykieta: i === 3 ? 'ten tydzień' : `−${4 - i} tydz.` };
    });

    const wiersz = (cw) => {
      const def = P.cwiczenie(cw.cwiczenieId);
      const cel = cw.razyWTygodniu || 0;
      return `<tr>
        <th scope="row">${esc(def ? def.nazwa : cw.cwiczenieId)}<em>${cel}× w tygodniu</em></th>
        ${tygodnie
          .map((tydz) => {
            const ile = S().odhaczenia.filter(
              (o) => o.terapiaId === t.id && o.cwiczenieId === cw.cwiczenieId && o.data >= tydz.od && o.data < tydz.doKiedy
            ).length;
            const proc = cel ? Math.min(Math.round((ile / cel) * 100), 100) : 0;
            return `<td><span class="slupek" style="--h:${proc}%;--c:${l.kolor}" title="${ile} z ${cel}"></span><b>${ile}</b></td>`;
          })
          .join('')}
      </tr>`;
    };

    const bolHtml = bol.length
      ? `<ol class="bol-lista">
          ${bol
            .slice(-8)
            .map((b, i, tab) => {
              const poprz = i ? tab[i - 1].wartosc : null;
              const zmiana = poprz === null ? '' : b.wartosc < poprz ? 'w dół' : b.wartosc > poprz ? 'w górę' : 'bez zmian';
              return `<li>
                <span class="bol-lista__data">${krotka(b.data)}</span>
                <span class="bol-lista__pasek"><span style="width:${b.wartosc * 10}%;--c:${l.kolor}"></span></span>
                <span class="bol-lista__wartosc">${b.wartosc}<em>/10</em></span>
                <span class="bol-lista__zmiana">${zmiana}</span>
              </li>`;
            })
            .join('')}
        </ol>
        <p class="pat__nastepna-wiad">Pierwszy odczyt ${bol[0].wartosc}, ostatni ${bol[bol.length - 1].wartosc}. ${
          bol.length > 1
            ? bol[bol.length - 1].wartosc < bol[0].wartosc
              ? 'Ból spada.'
              : bol[bol.length - 1].wartosc > bol[0].wartosc
                ? 'Ból rośnie — warto sprawdzić plan.'
                : 'Bez zmiany od początku terapii.'
            : ''
        }</p>`
      : '<p class="pusto">Pacjent nie odpowiedział jeszcze na żadne pytanie o ból. Ankieta idzie wieczorem po wizycie.</p>';

    const dzisDzien = P.dziennikTerapii(t.id, 1)[0];
    const dzisHtml = dzisDzien && (dzisDzien.zrobione || dzisDzien.bol || dzisDzien.planowany)
      ? `<p class="wiad-naglowek">Dzisiaj</p>
         ${odpCwiczenia(dzisDzien)}
         ${dzisDzien.bol ? odpBol(dzisDzien, bol.length > 1 ? bol[bol.length - 2] : null) : ''}`
      : '';

    return `<div class="pat__block">
      <h3 class="pat__h3--row">Co odpowiada pacjent
        <button class="btn btn--sm" type="button" data-odp-dni="${t.id}">Dzień po dniu</button>
      </h3>

      ${dzisHtml}

      <p class="wiad-naglowek">Ból po wizytach</p>
      ${bolHtml}

      <p class="wiad-naglowek">Odhaczone ćwiczenia, tydzień po tygodniu</p>
      ${
        t.cwiczenia.length
          ? `<div class="table-wrap">
              <table class="odhaczenia">
                <thead><tr><th scope="col">Ćwiczenie</th>${tygodnie.map((x) => `<th scope="col">${x.etykieta}</th>`).join('')}</tr></thead>
                <tbody>${t.cwiczenia.map(wiersz).join('')}</tbody>
              </table>
            </div>
            <p class="notatki__info">Liczba to odhaczenia w danym tygodniu, słupek pokazuje je w stosunku do tego, co zadałeś.</p>`
          : '<p class="pusto">Ten pacjent nie ma zadanych ćwiczeń.</p>'
      }
    </div>`;
  }

  /** Wiersz wizyty w karcie pacjenta — z akcjami, żeby nie wracać do „Dziś". */
  function wizytaWKarcie(w) {
    const s = STATUS[w.status];
    const dni = P.dniOd(w.data);
    const zamknieta = ['odbyta', 'nieobecnosc'].includes(w.status);
    const przyszla = dni <= 0 && !zamknieta;
    const akcje = zamknieta
      ? `<button class="btn btn--sm btn--ghost" type="button" data-akcja="status" data-wizyta="${w.id}" data-status="potwierdzona">Cofnij</button>`
      : `${dni === 0 ? `<button class="btn btn--sm btn--accent" type="button" data-akcja="status" data-wizyta="${w.id}" data-status="odbyta">Odbyta</button>
             <button class="btn btn--sm btn--ghost" type="button" data-akcja="status" data-wizyta="${w.id}" data-status="nieobecnosc">Nie przyszedł</button>` : ''}
         ${przyszla && w.status === 'zaplanowana' ? `<button class="btn btn--sm" type="button" data-akcja="status" data-wizyta="${w.id}" data-status="potwierdzona">Potwierdź</button>` : ''}
         ${przyszla ? `<button class="btn btn--sm btn--ghost" type="button" data-akcja="przeloz" data-wizyta="${w.id}">Przełóż</button>
             <button class="btn btn--sm btn--ghost" type="button" data-akcja="odwolaj" data-wizyta="${w.id}">Odwołaj</button>` : ''}`;
    return `<li class="wizyta-mini">
      <span class="wizyta-mini__gora">
        <span>${krotka(w.data)}, ${w.godzina}<em>${esc((P.usluga(w.uslugaId) || {}).nazwa || '')}${
          P.zespolAktywny().length > 1 && P.terapeuta(w.terapeutaId) ? ` · ${esc(krotkieImie(P.terapeuta(w.terapeutaId).imie))}` : ''
        }</em></span>
        <span class="pill ${s.klasa}">${s.tekst}</span>
      </span>
      ${akcje.trim() ? `<span class="wizyta-mini__akcje">${akcje}</span>` : ''}
    </li>`;
  }

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
          <h2 class="pat__name" id="drawer-name">${esc(p.imie)}${
            P.nowyPacjent(p.id) ? '<span class="znak-nowy">nowy</span>' : ''
          }</h2>
          <p class="pat__sub">${esc(p.telefon)} · ${ZRODLA[p.zrodlo] || 'inne'}${
            P.nowyPacjent(p.id) ? ' · jeszcze u Was nie był' : ''
          }</p>
        </div>
      </div>

      <div class="pat__block">
        <h3 class="pat__h3--row">Notatki
          <button class="btn btn--sm" type="button" data-akcja="nowa-notatka" data-pacjent-id="${p.id}">${ikona('plus')}Dopisz</button>
        </h3>
        <p class="notatki__info">Domyślnie notatka zostaje u Ciebie. Oznaczona jako widoczna trafia do karty, którą pacjent otwiera z SMS-a.</p>
        ${(() => {
          const lista = P.notatkiPacjenta(p.id);
          if (!lista.length) return '<p class="pusto">Nie ma jeszcze żadnej notatki.</p>';
          return `<ul class="notatki">${lista
            .map(
              (n) => `<li class="notatka${n.dlaPacjenta ? ' is-dla-pacjenta' : ''}">
                <span class="notatka__gora">
                  <span class="notatka__znak">${n.dlaPacjenta ? 'Widzi pacjent' : 'Tylko dla Ciebie'}</span>
                  <span class="notatka__data">${krotka(n.kiedy)}</span>
                </span>
                <p class="notatka__tekst">${esc(n.tekst)}</p>
                <span class="notatka__akcje">
                  <button class="btn btn--sm btn--ghost" type="button" data-akcja="widocznosc-notatki" data-notatka="${n.id}">
                    ${n.dlaPacjenta ? 'Ukryj przed pacjentem' : 'Pokaż pacjentowi'}
                  </button>
                  <button class="btn btn--sm btn--ghost" type="button" data-akcja="edytuj-notatke" data-notatka="${n.id}">Edytuj</button>
                  <button class="btn btn--sm btn--ghost" type="button" data-akcja="usun-notatke" data-notatka="${n.id}">Usuń</button>
                </span>
              </li>`
            )
            .join('')}</ul>`;
        })()}
      </div>


      ${(() => {
        const opisy = P.opisyPacjenta(p.id);
        if (!opisy.length) return '';
        return `<div class="pat__block pat__block--opis">
          <h3>Własnymi słowami</h3>
          <p class="notatki__info">Tak pacjent opisał swój problem przy rezerwacji.</p>
          <ul class="opisy">${opisy
            .slice(0, 3)
            .map(
              (o) => `<li>
                <span class="opisy__meta">${krotka(o.data)}${o.zrodlo === 'strona' ? ' · rezerwacja ze strony' : ''}</span>
                <q>${esc(o.opis)}</q>
              </li>`
            )
            .join('')}</ul>
        </div>`;
      })()}

      ${
        t
          ? `<div class="pat__epizod${t.status !== 'aktywna' ? ' pat__epizod--zamkniety' : ''}">
              <div class="pat__epizod-head">
                <p class="pat__diag">${esc(t.etykieta)}${
                  t.status !== 'aktywna'
                    ? `<span class="pat__zamkniety">zamknięty${t.koniec ? ` ${krotka(t.koniec)}` : ''}</span>`
                    : ''
                }</p>
                ${
                  t.status === 'aktywna'
                    ? `<button class="btn btn--sm btn--ghost" type="button" data-akcja="edytuj-terapie" data-terapia="${t.id}">Edytuj</button>`
                    : `<button class="btn btn--sm btn--accent" type="button" data-akcja="nowa-terapia" data-pacjent-id="${p.id}">${ikona('plus')}Zacznij nowy cykl</button>`
                }
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

      ${t ? odpowiedziPacjenta(t) : ''}

      <div class="pat__block">
        <h3 class="pat__h3--row">Wizyty
          <span class="pat__h3-akcje">
            ${
              t && P.nastepnaWizyta(t.id)
                ? `<button class="btn btn--sm btn--ghost" type="button" data-akcja="w-kalendarzu" data-data="${P.nastepnaWizyta(t.id).data}">${ikona('kalendarz')}W kalendarzu</button>`
                : ''
            }
            <button class="btn btn--sm btn--accent" type="button" data-akcja="umow" data-pacjent-id="${p.id}">${ikona('plus')}Umów</button>
          </span>
        </h3>
        ${
          historia.length
            ? `<ul class="prosta prosta--wizyty">${historia.map(wizytaWKarcie).join('')}</ul>`
            : '<p class="pusto">Brak wizyt.</p>'
        }
      </div>

      ${
        zdarzenia.length
          ? `<div class="pat__block">
              <h3>Historia kontaktu</h3>
              <ul class="prosta prosta--log">${zdarzenia
                .map((z) => `<li><span>${esc(z.tekst)}<em>${krotka(z.kiedy)}${z.godzina ? `, ${z.godzina}` : ''}</em></span></li>`)
                .join('')}</ul>
            </div>`
          : ''
      }

      <div class="pat__block">
        <h3 class="pat__h3--row">Wiadomości
          <span class="pat__h3-akcje">
            ${P.maWlasneUstawienia(p.id) ? `<button class="btn btn--sm btn--ghost" type="button" data-akcja="reset-wiad" data-pacjent-id="${p.id}">Wróć do reguł gabinetu</button>` : ''}
            <button class="btn btn--sm btn--accent" type="button" data-akcja="napisz" data-pacjent-id="${p.id}">${ikona('sms')}Napisz</button>
          </span>
        </h3>

        ${(() => {
          const kolejka = P.wiadomosciPacjenta(p.id, 21);
          if (!kolejka.length) {
            return '<p class="pusto">W najbliższych trzech tygodniach nic do tego pacjenta nie wyjdzie.</p>';
          }
          /* Przypomnienie o ćwiczeniach powtarza się w każdy dzień ćwiczeń, więc
             w karcie pokazujemy dwa najbliższe i jedno zdanie o reszcie. Inaczej
             lista wiadomości byłaby ścianą tego samego zdania. */
          const powtarzalne = kolejka.filter((w) => w.typ === 'ankieta-cwiczenia');
          const ukryte = Math.max(powtarzalne.length - 2, 0);
          const pokazane = kolejka.filter(
            (w) => w.typ !== 'ankieta-cwiczenia' || powtarzalne.indexOf(w) < 2
          );
          return `<ul class="wiad-lista">${pokazane.map(wiadomoscWKarcie).join('')}</ul>
            ${
              ukryte
                ? `<p class="wiad-lista__reszta">I tak samo w każdy kolejny dzień ćwiczeń — ${ukryte} ${
                    ukryte === 1 ? 'wiadomość' : 'wiadomości'
                  } w najbliższych trzech tygodniach. Dzień, w którym pacjent sam odhaczy ćwiczenia, wypada z kolejki.</p>`
                : ''
            }`;
        })()}

        <p class="wiad-naglowek">Co i kiedy do niego wychodzi</p>
        <ul class="wiad-rodzaje">
          ${Object.entries(P.TYPY_WIADOMOSCI)
            .map(([typ, def]) => {
              const u = P.ustawieniaRodzaju(typ, p.id);
              const gabinetowe = P.ustawieniaRodzaju(typ);
              const wylaczonyWGabinecie = gabinetowe.wlaczona === false;
              const wlaczona = u.wlaczona !== false && !wylaczonyWGabinecie;
              return `<li class="${wlaczona ? '' : 'is-off'}">
                <span class="wiad-rodzaje__co">
                  <strong>${esc(def.nazwa)}</strong>
                  <em>${kiedyDlaPacjenta(typ, p.id)}${u.wlasne ? ' · ustawione dla tej osoby' : ''}</em>
                  ${wylaczonyWGabinecie ? '<span class="wiad-rodzaje__uwaga">Ten rodzaj jest wyłączony w całym gabinecie</span>' : ''}
                </span>
                <span class="wiad-rodzaje__akcje">
                  <button class="btn btn--sm btn--ghost" type="button" data-akcja="pora-pacjenta" data-pacjent-id="${p.id}" data-typ="${typ}"
                    ${wylaczonyWGabinecie ? 'disabled' : ''}>Pora</button>
                  <button class="switch" type="button" role="switch" aria-checked="${wlaczona}"
                    data-akcja="przelacz-wiadomosc" data-pacjent-id="${p.id}" data-typ="${typ}"
                    ${wylaczonyWGabinecie ? 'disabled' : ''} aria-label="${esc(def.nazwa)} dla tego pacjenta">
                    <span></span>${wlaczona ? 'tak' : 'nie'}
                  </button>
                </span>
              </li>`;
            })
            .join('')}
        </ul>
        ${p.zgodaSms === false ? '<p class="wiad-rodzaje__uwaga">Pacjent nie zgodził się na SMS-y — nic do niego nie wyjdzie, niezależnie od ustawień.</p>' : ''}
      </div>

      <div class="pat__akcje">
        <button class="btn btn--accent" type="button" data-akcja="umow" data-pacjent-id="${p.id}">${ikona('plus')}Umów wizytę</button>
        <button class="btn" type="button" data-akcja="przypomnienie" data-pacjent-id="${p.id}">${ikona('sms')}Wyślij przypomnienie</button>
        <a class="btn btn--ghost" href="tel:${esc(String(p.telefon).replace(/\s/g, ''))}">${ikona('phone')}${esc(p.telefon)}</a>
        ${
          t && t.status === 'aktywna'
            ? `<button class="btn btn--ghost" type="button" data-akcja="zakoncz" data-terapia="${t.id}">Zamknij terapię z wynikiem</button>`
            : t
              ? `<button class="btn btn--ghost" type="button" data-akcja="nowa-terapia" data-pacjent-id="${p.id}">${ikona('plus')}Zacznij nowy cykl</button>`
              : ''
        }
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

  /* ── Ten pacjent już tu jest ───────────────────────────────────────── */
  /* Numer wpisany bez spacji i nazwisko bez ogonków to wciąż ta sama osoba.
     Zamiast pozwolić na drugą kartę, pokazujemy tę, która już istnieje —
     w tym samym oknie, żeby nikt nie tracił tego, co zdążył wpisać. */
  function trafieniaHtml(trafienia, akcja) {
    const pewne = trafienia.some((x) => x.pewny);
    return `<p class="dubel__h">${
      pewne ? 'Ta osoba jest już w kartotece' : 'Ktoś o bardzo podobnych danych już tu jest'
    }</p>
      <ul class="dubel__lista">
        ${trafienia
          .map(({ pacjent: p, powod, pewny }) => {
            const t = P.terapiaPacjenta(p.id);
            return `<li>
              <span class="dubel__kto">
                <strong>${esc(p.imie)}</strong>
                <em>${esc(p.telefon)}${p.email ? ` · ${esc(p.email)}` : ''}</em>
                <em>${t ? esc(t.etykieta) : 'bez karty terapii'} · ${ZRODLA[p.zrodlo] || 'inne'}</em>
              </span>
              <span class="dubel__powod${pewny ? ' dubel__powod--pewny' : ''}">${esc(powod)}</span>
              <button class="btn btn--sm btn--accent" type="button" data-akcja="${akcja}" data-pacjent-id="${p.id}">To ta osoba</button>
            </li>`;
          })
          .join('')}
      </ul>
      <p class="dubel__stopka">${
        pewne
          ? 'Porównujemy numer bez spacji i adres bez wielkich liter — ten sam numer to ta sama osoba, więc drugiej karty nie założymy. Zmień numer, jeśli to jednak ktoś inny.'
          : 'Porównujemy nazwisko bez ogonków, więc „Stępień” i „Stepien” to dla panelu jedna osoba. Jeśli to naprawdę ktoś inny, kliknij zapis jeszcze raz.'
      }</p>`;
  }

  /** Sprawdza wpisane dane i wypełnia ramkę pod polami. Zwraca liczbę trafień. */
  function sprawdzDublet(idRamki, dane, akcja) {
    const ramka = $(idRamki);
    if (!ramka) return 0;
    const trafienia = dane.imie.trim().length > 2 || String(dane.telefon).replace(/\D/g, '').length >= 7 ? P.podobniPacjenci(dane) : [];
    ramka.innerHTML = trafienia.length ? trafieniaHtml(trafienia, akcja) : '';
    ramka.hidden = !trafienia.length;
    return trafienia.length;
  }

  function formNowyPacjent(imieWstepne = '') {
    modal(
      'Nowy pacjent',
      `<div class="form-grid">
        ${pole('np-imie', 'Imię i nazwisko', 'text', imieWstepne)}
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
      <div class="dubel" id="np-dubel" hidden></div>
      <p class="modal__err" id="np-err" hidden></p>`,
      `<button class="btn btn--ghost" type="button" data-close>Anuluj</button>
       <button class="btn btn--accent" type="button" data-zapisz="pacjent">Dodaj pacjenta</button>`
    );
    if (imieWstepne) sprawdzDubletNowego();
  }

  const sprawdzDubletUmawiania = () =>
    sprawdzDublet('#uw-dubel', { imie: $('#uw-imie').value, telefon: $('#uw-tel').value, email: '' }, 'uw-wez-istniejacego');

  const sprawdzDubletNowego = () =>
    sprawdzDublet(
      '#np-dubel',
      { imie: $('#np-imie').value, telefon: $('#np-tel').value, email: $('#np-mail').value },
      'otworz-istniejacego'
    );

  function zapiszNowegoPacjenta() {
    const imie = $('#np-imie').value.trim();
    const tel = $('#np-tel').value.trim();
    if (imie.length < 3) return bladModalu('np-err', 'Podaj imię i nazwisko.');
    if (tel.replace(/\D/g, '').length < 9) return bladModalu('np-err', 'Podaj numer telefonu — bez niego nie wyślesz pacjentowi linku ani przypomnienia.');
    const dane = {
      imie,
      telefon: tel,
      email: $('#np-mail').value.trim(),
      zrodlo: $('#np-zrodlo').value,
      notatka: $('#np-notatka').value.trim(),
    };
    /* Ten sam numer to zawsze ta sama osoba — tu nie ma czego rozstrzygać.
       Przy samej zbieżności nazwiska pytamy raz i pozwalamy przejść dalej. */
    const trafienia = P.podobniPacjenci(dane);
    const pewne = trafienia.filter((x) => x.pewny);
    if (pewne.length) {
      sprawdzDubletNowego();
      return bladModalu('np-err', `${pewne[0].pacjent.imie} ma już kartę — ${pewne[0].powod}. Otwórz ją zamiast zakładać drugą.`);
    }
    if (trafienia.length && !potwierdzonyDubel) {
      potwierdzonyDubel = true;
      sprawdzDubletNowego();
      return bladModalu('np-err', 'Sprawdź, czy to nie ta sama osoba. Jeśli jednak inna — kliknij „Dodaj pacjenta” jeszcze raz.');
    }
    const p = P.akcje.dodajPacjenta(dane);
    potwierdzonyDubel = false;
    schowajModal();
    toast(`Dodano pacjenta: ${p.imie}`, true);
    otworzPacjenta(p.id);
  }

  /* Drugie kliknięcie „Dodaj” znaczy: wiem, że podobny istnieje, to jednak ktoś inny. */
  let potwierdzonyDubel = false;

  /**
   * Nowa karta terapii. Gdy pacjent już u nas był, podpowiadamy to, co było
   * ostatnio — wraca zwykle z tym samym problemem, a przepisywanie wszystkiego
   * od nowa jest jedynym powodem, dla którego ktoś zakładałby drugi profil.
   */
  function formNowaTerapia(pacjentId) {
    const p = P.pacjent(pacjentId);
    const poprzednia = S()
      .terapie.filter((t) => t.pacjentId === pacjentId)
      .sort((a, b) => String(b.koniec || b.start).localeCompare(String(a.koniec || a.start)))[0];
    const wznowienie = !!poprzednia;
    const cwPoprzednie = poprzednia ? poprzednia.cwiczenia || [] : [];
    modal(
      wznowienie ? `Nowy cykl — ${p.imie}` : `Karta terapii — ${p.imie}`,
      `${
        wznowienie
          ? `<p class="modal__info">Poprzedni cykl: <strong>${esc(poprzednia.etykieta)}</strong>${
              poprzednia.koniec ? `, zamknięty ${krotka(poprzednia.koniec)}` : ''
            }${
              poprzednia.wynik && poprzednia.wynik.bolStart !== null && poprzednia.wynik.bolKoniec !== null
                ? ` · ból ${poprzednia.wynik.bolStart} → ${poprzednia.wynik.bolKoniec}`
                : ''
            }. Historia, notatki i numer zostają — zakładamy tylko nowy cykl.</p>`
          : ''
      }
      <div class="form-grid">
        <div class="field">
          <label for="nt-linia">Rodzaj problemu</label>
          <select id="nt-linia">${S()
            .linie.map((l) => `<option value="${l.id}" ${poprzednia && poprzednia.linia === l.id ? 'selected' : ''}>${l.nazwa}</option>`)
            .join('')}</select>
        </div>
        ${pole(
          'nt-etykieta',
          'Krótki opis terapii',
          'text',
          poprzednia ? poprzednia.etykieta : '',
          'placeholder="np. ból karku przy pracy przy biurku"'
        )}
        <div class="field field--full">
          <label for="nt-cel">Cel pacjenta <em>(jego słowami)</em></label>
          <input id="nt-cel" type="text" placeholder="np. przespać noc bez bólu" />
        </div>
        ${pole('nt-plan', 'Zaplanowana liczba wizyt', 'number', String(poprzednia ? poprzednia.planWizyt : 6), 'min="1" max="30"')}
        ${pole('nt-odstep', 'Co ile dni wizyta', 'number', String(poprzednia ? poprzednia.odstepDni : 7), 'min="1" max="30"')}
      </div>
      ${
        cwPoprzednie.length
          ? `<label class="seria__check">
              <input type="checkbox" id="nt-cwiczenia" checked />
              <span><strong>Przenieś plan ćwiczeń z poprzedniego cyklu</strong><em>${cwPoprzednie
                .map((x) => esc((P.cwiczenie(x.cwiczenieId) || {}).nazwa || x.cwiczenieId))
                .join(', ')}</em></span>
            </label>`
          : ''
      }
      <p class="modal__err" id="nt-err" hidden></p>
      <p class="modal__info">Bez opisu badania i dokumentacji medycznej — panel trzyma tylko to, co potrzebne do prowadzenia wizyt.</p>`,
      `<button class="btn btn--ghost" type="button" data-close>Anuluj</button>
       <button class="btn btn--accent" type="button" data-zapisz="terapia" data-pacjent-id="${pacjentId}">${
         wznowienie ? 'Zacznij nowy cykl' : 'Załóż kartę'
       }</button>`
    );
  }

  function zapiszNowaTerapie(pacjentId) {
    const etykieta = $('#nt-etykieta').value.trim();
    if (etykieta.length < 3) return bladModalu('nt-err', 'Napisz krótko, czego dotyczy terapia.');
    const przenies = $('#nt-cwiczenia') && $('#nt-cwiczenia').checked;
    const poprzednia = przenies
      ? S()
          .terapie.filter((t) => t.pacjentId === pacjentId)
          .sort((a, b) => String(b.koniec || b.start).localeCompare(String(a.koniec || a.start)))[0]
      : null;
    P.akcje.dodajTerapie(pacjentId, {
      linia: $('#nt-linia').value,
      etykieta,
      cel: $('#nt-cel').value.trim(),
      planWizyt: Number($('#nt-plan').value) || 6,
      odstepDni: Number($('#nt-odstep').value) || 7,
      cwiczenia: poprzednia ? poprzednia.cwiczenia.map((x) => ({ ...x })) : [],
    });
    schowajModal();
    toast(poprzednia ? 'Zaczęto nowy cykl' : 'Założono kartę terapii', true);
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

  /**
   * Kreator ćwiczenia. To, co tu wpiszesz, pacjent zobaczy dosłownie w swojej
   * karcie — dlatego pod polami stoi podgląd dokładnie w tej formie.
   */
  function formCwiczenieBiblioteka(cid = null) {
    const c = cid ? P.cwiczenie(cid) : null;
    const u = cid ? P.uzycieCwiczenia(cid) : null;
    modal(
      c ? `Ćwiczenie: ${c.nazwa}` : 'Nowe ćwiczenie',
      `${
        u && u.terapie
          ? `<p class="modal__info">To ćwiczenie jest w ${u.terapie} ${u.terapie === 1 ? 'planie' : 'planach'}${
              u.aktywne ? `, w tym ${u.aktywne} w toku` : ''
            }. Zmiana opisu albo nagrania wejdzie od razu do kart tych pacjentów.</p>`
          : ''
      }
      <div class="form-grid">
        ${pole('cw-nazwa', 'Nazwa', 'text', c ? c.nazwa : '', 'placeholder="np. Koci grzbiet"')}
        <div class="field field--full">
          <label for="cw-opis">Jak je wykonać <em>(tekst dla pacjenta)</em></label>
          <textarea id="cw-opis" rows="2" placeholder="W klęku podpartym zaokrąglaj i prostuj plecy, powoli, bez bólu.">${esc(c ? c.opis || '' : '')}</textarea>
        </div>
        ${pole('cw-pow', 'Domyślne powtórzenia', 'text', c ? c.powtorzenia || '' : '10 powtórzeń', 'placeholder="10 powtórzeń"')}
        ${pole('cw-razy', 'Domyślnie razy w tygodniu', 'number', String(c ? c.razy || 5 : 5), 'min="1" max="7"')}
      </div>

      <p class="modal__label">Materiał</p>
      <div class="form-grid">
        ${pole('cw-material', 'Odnośnik do nagrania', 'url', c && c.material ? c.material.url : '', 'placeholder="https://…"')}
        ${pole('cw-material-opis', 'Podpis pod nagraniem', 'text', c && c.material ? c.material.opis || '' : '', 'placeholder="np. Nagranie z gabinetu, 40 sekund"')}
      </div>
      <p class="modal__info">Wklej odnośnik do filmu — z YouTube, z dysku albo z Waszej strony. Bez niego pacjent zobaczy w tym miejscu ramkę z napisem „nagranie gabinetu”.</p>

      <p class="modal__label">Tak zobaczy to pacjent</p>
      <div class="cw-podglad" id="cw-podglad"></div>
      <p class="modal__err" id="cw-err" hidden></p>`,
      `<button class="btn btn--ghost" type="button" data-close>Anuluj</button>
       <button class="btn btn--accent" type="button" data-zapisz="cwiczenie-biblioteka" ${cid ? `data-cw-id="${cid}"` : ''}>${
         c ? 'Zapisz zmiany' : 'Dodaj do biblioteki'
       }</button>`
    );
    podgladCwiczenia();
  }

  /** Podgląd pozycji tak, jak wygląda w karcie pacjenta. */
  function podgladCwiczenia() {
    const out = $('#cw-podglad');
    if (!out) return;
    const nazwa = $('#cw-nazwa').value.trim() || 'Nazwa ćwiczenia';
    const opis = $('#cw-opis').value.trim();
    const pow = $('#cw-pow').value.trim() || '10 powtórzeń';
    const razy = Number($('#cw-razy').value) || 5;
    const material = $('#cw-material').value.trim();
    const podpis = $('#cw-material-opis').value.trim();
    out.innerHTML = `
      <span class="cw-podglad__box" aria-hidden="true"></span>
      <span class="cw-podglad__tresc">
        <strong>${esc(nazwa)}</strong>
        <em>${esc(pow)} · ${razy}× w tygodniu</em>
        ${opis ? `<span class="cw-podglad__opis">${esc(opis)}</span>` : ''}
      </span>
      <span class="cw-podglad__material${material ? ' cw-podglad__material--jest' : ''}">
        ${material ? `${ikona('film')}${esc(podpis || 'obejrzyj nagranie')}` : 'nagranie<br />gabinetu'}
      </span>`;
  }

  function zapiszCwiczenieBiblioteka(cid) {
    const nazwa = $('#cw-nazwa').value.trim();
    if (nazwa.length < 3) return bladModalu('cw-err', 'Podaj nazwę ćwiczenia.');
    const url = $('#cw-material').value.trim();
    if (url && !/^https?:\/\//i.test(url)) return bladModalu('cw-err', 'Odnośnik musi zaczynać się od http:// albo https://');
    const dane = {
      nazwa,
      opis: $('#cw-opis').value.trim(),
      powtorzenia: $('#cw-pow').value.trim(),
      razy: Number($('#cw-razy').value),
      material: url ? { url, opis: $('#cw-material-opis').value.trim() } : null,
    };
    if (cid) P.akcje.zmienCwiczenieWBibliotece(cid, dane);
    else P.akcje.dodajCwiczenieDoBiblioteki(dane);
    schowajModal();
    toast(cid ? `Zapisano: ${nazwa}` : `Dodano ćwiczenie: ${nazwa}`, true);
  }

  function usunCwiczenieZPytaniem(cid) {
    const c = P.cwiczenie(cid);
    const u = P.uzycieCwiczenia(cid);
    if (!u.terapie && !u.odhaczenia) {
      P.akcje.usunCwiczenieZBiblioteki(cid);
      return toast(`Usunięto: ${c.nazwa}`, true);
    }
    modal(
      `Usunąć „${c.nazwa}”?`,
      `<p class="modal__info">
        To ćwiczenie jest w ${u.terapie} ${u.terapie === 1 ? 'planie' : 'planach'}${
          u.aktywne ? `, w tym ${u.aktywne} w toku` : ''
        }, i ma ${u.odhaczenia} ${u.odhaczenia === 1 ? 'odhaczenie' : 'odhaczeń'} od pacjentów.
      </p>
      <p class="modal__info">
        Dlatego nie kasujemy go z danych — zniknąłby z kart pacjentów i z wypisów.
        Wycofujemy go z listy, z której układasz nowe plany. Tam, gdzie już jest, zostaje.
      </p>`,
      `<button class="btn btn--ghost" type="button" data-close>Zostaw</button>
       <button class="btn btn--accent" type="button" data-zapisz="wycofaj-cwiczenie" data-cw-id="${cid}">Wycofaj z listy</button>`
    );
  }

  /** Jedna pozycja na liście wyboru ćwiczeń, z wartościami z biblioteki. */
  function wyborCwiczenia(c, w) {
    return `<li>
      <label class="wybor__check"><input type="checkbox" data-cw="${c.id}" ${w ? 'checked' : ''} /><span>
        <strong>${esc(c.nazwa)}${c.wycofane ? '<span class="cwb__znak">wycofane</span>' : ''}</strong>
        <em>${esc(c.opis || 'bez opisu')}</em>
        ${c.material && c.material.url ? `<span class="wybor__material">${ikona('film')}${esc(c.material.opis || 'nagranie')}</span>` : ''}
      </span></label>
      <span class="wybor__ile">
        <input type="text" data-cw-pow="${c.id}" value="${esc(w ? w.powtorzenia : c.powtorzenia || '10 powtórzeń')}" aria-label="Powtórzenia: ${esc(c.nazwa)}" />
        <input type="number" data-cw-razy="${c.id}" value="${w ? w.razyWTygodniu : c.razy || 5}" min="1" max="7" aria-label="Razy w tygodniu: ${esc(c.nazwa)}" />
        <span>×/tydz.</span>
      </span>
    </li>`;
  }

  function formCwiczenia(tid) {
    const t = P.terapia(tid);
    const wybrane = Object.fromEntries(t.cwiczenia.map((c) => [c.cwiczenieId, c]));
    /* Wycofane ćwiczenia znikają z listy, chyba że ten pacjent już je ma —
       wtedy trzeba je widać, żeby dało się je świadomie zdjąć. */
    const lista = S().cwiczeniaBiblioteka.filter((c) => !c.wycofane || wybrane[c.id]);
    modal(
      'Ćwiczenia domowe',
      `<p class="modal__info">Zaznacz ćwiczenia i ustaw, ile razy w tygodniu pacjent ma je robić. Zobaczy je w swojej karcie pod linkiem i tam je odhaczy — razem z opisem i nagraniem z biblioteki.</p>
      <ul class="wybor" id="cw-lista">
        ${lista.map((c) => wyborCwiczenia(c, wybrane[c.id])).join('')}
      </ul>

      <div class="cw-dopisz">
        <button class="link-btn" type="button" data-akcja="cw-dopisz">${ikona('plus')}Dopisz własne ćwiczenie</button>
        <div class="cw-dopisz__pola" id="cw-dopisz-pola" hidden>
          <div class="form-grid">
            ${pole('cwd-nazwa', 'Nazwa', 'text', '', 'placeholder="np. Rozciąganie pasma IT"')}
            ${pole('cwd-pow', 'Powtórzenia', 'text', '10 powtórzeń')}
          </div>
          <div class="field field--full">
            <label for="cwd-opis">Jak je wykonać <em>(tekst dla pacjenta)</em></label>
            <textarea id="cwd-opis" rows="2"></textarea>
          </div>
          <div class="cw-dopisz__akcje">
            <button class="btn btn--sm btn--accent" type="button" data-akcja="cw-dopisz-zapisz">Dodaj do planu i do biblioteki</button>
            <button class="link-btn" type="button" data-akcja="cw-dopisz-anuluj">Rezygnuję</button>
          </div>
          <p class="modal__info">Trafi też do biblioteki, więc następnym razem będzie już na liście. Nagranie dorzucisz później w Ustawieniach.</p>
        </div>
      </div>
      <p class="modal__err" id="cwp-err" hidden></p>`,
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
    /* Przy istniejącej terapii proponujemy usługę z jej problemu, a nie pierwszą z cennika. */
    const uslugaWstepna = terapiaWstepna
      ? (S().uslugi.find((u) => u.linia === terapiaWstepna.linia) || {}).id
      : null;

    modal(
      przekladana ? 'Przełóż wizytę' : 'Umów wizytę',
      `<div class="form-grid">
        ${
          przekladana
            ? `<p class="modal__info field--full">${esc(P.pacjent(przekladana.pacjentId).imie)} · teraz ${krotka(przekladana.data)}, ${przekladana.godzina}. Stary termin wróci do wolnych godzin.</p>`
            : `<div class="field field--full">
                <label for="uw-pacjent">Pacjent</label>
                <span class="pole-z-akcja">
                  <select id="uw-pacjent">${pacjenci
                    .map((p) => `<option value="${p.id}" ${p.id === pacjentId ? 'selected' : ''}>${esc(p.imie)}</option>`)
                    .join('')}</select>
                  <button class="link-btn" type="button" data-akcja="uw-nowy">Nowy pacjent</button>
                </span>
              </div>
              <div class="nowy-inline field--full" id="uw-nowy-pola" hidden>
                <p class="nowy-inline__h">Dodaj pacjenta i od razu umów</p>
                <div class="form-grid">
                  ${pole('uw-imie', 'Imię i nazwisko', 'text', '', 'placeholder="Jan Przykładowy"')}
                  ${pole('uw-tel', 'Telefon', 'tel', '', 'placeholder="600 000 000"')}
                </div>
                <div class="dubel" id="uw-dubel" hidden></div>
                <button class="link-btn" type="button" data-akcja="uw-anuluj-nowy">Wybiorę z listy</button>
              </div>
              <div class="field field--full">
                <label for="uw-usluga">Usługa</label>
                <select id="uw-usluga">${S()
                  .uslugi.map(
                    (u) => `<option value="${u.id}" ${u.id === uslugaWstepna ? 'selected' : ''}>${esc(u.nazwa)} · ${u.minuty} min · ${zl(u.cena)}</option>`
                  )
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
        ${
          przekladana
            ? ''
            : `<div class="field field--full">
                <label for="uw-opis">Opis dolegliwości <em>(jego słowami, opcjonalnie)</em></label>
                <textarea id="uw-opis" rows="2" maxlength="600" placeholder="Np. ból lędźwi od dwóch tygodni, promieniuje do lewej nogi."></textarea>
              </div>`
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

    /* Pacjenta, którego jeszcze nie ma w kartotece, zakładamy tu i teraz. */
    let pacjentId = $('#uw-pacjent').value;
    const nowe = $('#uw-nowy-pola');
    if (nowe && !nowe.hidden) {
      const imie = $('#uw-imie').value.trim();
      const tel = $('#uw-tel').value.trim();
      if (imie.length < 3) return bladModalu('uw-err', 'Podaj imię i nazwisko nowego pacjenta.');
      if (tel.replace(/\D/g, '').length < 9) return bladModalu('uw-err', 'Podaj telefon nowego pacjenta.');
      const dane = { imie, telefon: tel, zrodlo: 'inne' };
      /* Ten sam numer to zawsze ta sama osoba — nie zakładamy jej drugi raz. */
      const pewne = P.podobniPacjenci(dane).filter((x) => x.pewny);
      if (pewne.length) {
        sprawdzDubletUmawiania();
        return bladModalu('uw-err', `${pewne[0].pacjent.imie} ma już kartę — ${pewne[0].powod}. Wybierz ją zamiast zakładać drugą.`);
      }
      pacjentId = P.akcje.dodajPacjenta(dane).id;
    }
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
      opis: ($('#uw-opis') || {}).value || '',
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

  /* ── Okno wizyty ───────────────────────────────────────────────────── */
  /* Klik w wizytę w kalendarzu otwiera ją samą, a nie całą kartotekę —
     stąd da się zrobić wszystko, co dotyczy tej godziny, i wejść głębiej. */
  function formWizyta(wid) {
    const w = S().wizyty.find((x) => x.id === wid);
    if (!w) return;
    const pac = P.pacjent(w.pacjentId);
    const t = w.terapiaId ? P.terapia(w.terapiaId) : null;
    const u = P.usluga(w.uslugaId);
    const z = P.terapeuta(w.terapeutaId);
    const s = STATUS[w.status];
    const zamknieta = ['odbyta', 'nieobecnosc'].includes(w.status);

    modal(
      `${krotka(w.data)}, ${w.godzina}`,
      `<div class="wizyta-okno">
        <button class="wizyta-okno__kto" type="button" data-akcja="karta-pacjenta" data-pacjent-id="${pac.id}">
          <span class="pat__mark" style="--c:${t ? P.linia(t.linia).kolor : '#535A61'};--on:#fff">${inicjaly(pac.imie)}</span>
          <span>
            <strong>${esc(pac.imie)}</strong>
            <em>${esc(pac.telefon)}${t ? ` · ${esc(t.etykieta)}` : ' · bez karty terapii'}</em>
          </span>
          <span class="wizyta-okno__strzalka">${ikona('link')}Otwórz kartę</span>
        </button>

        ${
          w.opis
            ? `<div class="wizyta-opis">
                <p class="wizyta-opis__h">Własnymi słowami pacjenta${w.zrodlo === 'strona' ? ' · rezerwacja ze strony' : ''}</p>
                <q>${esc(w.opis)}</q>
              </div>`
            : ''
        }

        <dl class="dane">
          <div><dt>Usługa</dt><dd>${esc(u ? u.nazwa : '—')} · ${w.minuty} min${u ? ` · ${zl(u.cena)}` : ''}</dd></div>
          ${z ? `<div><dt>Prowadzi</dt><dd>${esc(z.imie)}</dd></div>` : ''}
          <div><dt>Status</dt><dd><span class="pill ${s.klasa}">${s.tekst}</span></dd></div>
          ${t ? `<div><dt>Postęp terapii</dt><dd>${P.odbyte(t.id)} z ${t.planWizyt} wizyt</dd></div>` : ''}
        </dl>

        <div class="wizyta-okno__akcje">
          ${
            zamknieta
              ? `<button class="btn" type="button" data-akcja="status" data-wizyta="${w.id}" data-status="potwierdzona" data-zamknij>Cofnij oznaczenie</button>`
              : `<button class="btn btn--accent" type="button" data-akcja="status" data-wizyta="${w.id}" data-status="odbyta" data-zamknij>Odbyta</button>
                 ${w.status === 'zaplanowana' ? `<button class="btn" type="button" data-akcja="status" data-wizyta="${w.id}" data-status="potwierdzona" data-zamknij>Potwierdź</button>` : ''}
                 <button class="btn btn--ghost" type="button" data-akcja="status" data-wizyta="${w.id}" data-status="nieobecnosc" data-zamknij>Nie przyszedł</button>
                 <button class="btn btn--ghost" type="button" data-akcja="przeloz" data-wizyta="${w.id}">Przełóż</button>
                 <button class="btn btn--ghost" type="button" data-akcja="odwolaj" data-wizyta="${w.id}">Odwołaj</button>`
          }
          <a class="btn btn--ghost" href="tel:${esc(String(pac.telefon).replace(/\s/g, ''))}">${ikona('phone')}Zadzwoń</a>
        </div>
      </div>`,
      `<button class="btn btn--ghost" type="button" data-close>Zamknij</button>
       <button class="btn" type="button" data-akcja="umow" data-pacjent-id="${pac.id}">Umów kolejną</button>`
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

    const doZdjecia = P.wizytyTerapii(tid).filter(
      (w) => w.data >= P.iso(P.dzis) && ['zaplanowana', 'potwierdzona'].includes(w.status)
    ).length;

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
      <label class="seria__check"><input type="checkbox" id="zk-wyslij" checked /><span><strong>Zapisz prośbę o opinię</strong><em>Trafi do historii pacjenta i do kolejki wiadomości na jutro.</em></span></label>
      ${
        doZdjecia
          ? `<p class="modal__info modal__ostrzezenie">Zamknięcie zdejmie z kalendarza ${doZdjecia} ${
              doZdjecia === 1 ? 'umówioną wizytę' : 'umówione wizyty'
            } tego pacjenta i przypomnienia o nich. Jeśli któraś ma się odbyć, przenieś ją najpierw do nowego cyklu.</p>`
          : ''
      }`,
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
      : `<li class="search__empty">
            Nikogo takiego nie ma w kartotece.
            <button class="link-btn" type="button" data-akcja="nowy-pacjent" data-imie="${esc(fraza.trim())}">Dodaj „${esc(fraza.trim())}"</button>
          </li>`;
  }

  /* ── Render ────────────────────────────────────────────────────────── */
  /* ── Od pacjenta: wszystko, co pacjenci odsyłają między wizytami ─────── */
  /* Jedno miejsce na odpowiedzi z ankiet i odhaczone ćwiczenia, od dzisiejszych
     godzin po tygodnie. Odpowiedzi to jedyne, co wiesz o pacjencie między wizytami,
     a rozsiane po kartach nie dawały się ze sobą porównać. */
  let odpZakladka = 'dzis';
  let odpTerapia = null;
  const ODP_ZAKLADKI = [
    { id: 'dzis', nazwa: 'Dziś', opis: 'Co pacjenci odesłali dzisiaj' },
    { id: 'dni', nazwa: 'Dzień po dniu', opis: 'Każdy dzień jednego pacjenta, z godzinami' },
    { id: 'tygodnie', nazwa: 'Tygodnie', opis: 'Odpowiedzi z ostatnich czterech tygodni' },
    { id: 'biblioteka', nazwa: 'Ćwiczenia', opis: 'Z tej listy układasz plan pacjenta' },
  ];

  /** Ćwiczenia jednego dnia: zrobione z godziną, reszta wprost jako niezrobione. */
  function odpCwiczenia(dzien) {
    if (!dzien.cwiczenia.length) return '<p class="odp-pusto">Brak zadanych ćwiczeń.</p>';
    return `<ul class="odp-cw">${dzien.cwiczenia
      .map((x) =>
        x.zrobione
          ? `<li class="is-ok"><span class="odp-cw__znak" aria-hidden="true">✓</span><span class="odp-cw__nazwa">${esc(x.nazwa)}</span><em>${x.godzina ? `o ${x.godzina}` : 'zaznaczone'}</em></li>`
          : `<li class="is-brak"><span class="odp-cw__znak" aria-hidden="true">○</span><span class="odp-cw__nazwa">${esc(x.nazwa)}</span><em>${dzien.dzis ? 'jeszcze nie' : 'nie odhaczone'}</em></li>`
      )
      .join('')}</ul>`;
  }

  /** Odpowiedź o bólu z godziną i porównaniem z poprzednią. */
  function odpBol(dzien, poprzednia) {
    const b = dzien.bol;
    if (!b) return '';
    const zmiana = !poprzednia ? '' : b.wartosc < poprzednia.wartosc ? 'niżej niż ostatnio' : b.wartosc > poprzednia.wartosc ? 'wyżej niż ostatnio' : 'tak samo jak ostatnio';
    return `<p class="odp-bol"><span>Odpowiedź o bólu</span><b>${b.wartosc}<i>/10</i></b>${
      b.godzina ? `<em>o ${b.godzina}</em>` : ''
    }${poprzednia ? `<em>${zmiana} (${poprzednia.wartosc}/10, ${krotka(poprzednia.data)})</em>` : ''}</p>`;
  }

  const odpKto = (w) => {
    const l = P.linia(w.linia);
    return `<span class="who">
      <span class="who__mark" style="--c:${l ? l.kolor : '#535A61'};--on:${l ? l.naKolorze : '#fff'}">${inicjaly(w.imie)}</span>
      <span><span class="who__name">${esc(w.imie)}</span><span class="who__sub">${esc(w.etykieta)}</span></span>
    </span>`;
  };

  const odpAkcje = (w) => `<span class="odp-os__akcje">
    <button class="btn btn--sm btn--ghost" type="button" data-akcja="napisz" data-pacjent-id="${w.pacjentId}">Napisz</button>
    <button class="btn btn--sm" type="button" data-odp-dni="${w.terapiaId}">Dzień po dniu</button>
    <button class="btn btn--sm" type="button" data-pacjent="${w.pacjentId}">Karta</button>
  </span>`;

  const odpKafel = (label, value, foot, klasa = '') =>
    `<article class="tile${klasa}"><p class="tile__label">${label}</p><p class="tile__value">${value}</p><p class="tile__foot">${foot}</p></article>`;

  const odpOstatnia = (w) => {
    const a = w.ostatniaAktywnosc;
    return a ? `${wzgledna(a.data)}${a.godzina ? `, ${a.godzina}` : ''}` : 'jeszcze nic';
  };

  /* Dziś: kto co zaznaczył i odpowiedział, z godzinami. */
  function odpDzis(wiersze) {
    const z = wiersze.filter((w) => w.dzisWpis);
    const ostatniaGodzina = (w) => {
      const g = [...w.dzisWpis.cwiczenia.map((x) => x.godzina), w.dzisWpis.bol && w.dzisWpis.bol.godzina].filter(Boolean);
      return g.map((x) => x.padStart(5, '0')).sort().pop() || '';
    };
    const odeslali = z
      .filter((w) => w.dzisWpis.zrobione || w.dzisWpis.bol)
      .sort((a, b) => ostatniaGodzina(b).localeCompare(ostatniaGodzina(a)));
    const cisza = z.filter((w) => !odeslali.includes(w) && w.dzisWpis.planowany);
    const wolne = z.filter((w) => !odeslali.includes(w) && !w.dzisWpis.planowany);

    const planowanych = z.filter((w) => w.dzisWpis.planowany);
    const cwiczylo = planowanych.filter((w) => w.dzisWpis.zrobione).length;
    const zadane = planowanych.reduce((s, w) => s + w.dzisWpis.zadane, 0);
    const zrobione = planowanych.reduce((s, w) => s + w.dzisWpis.zrobione, 0);
    const oBol = z.filter((w) => w.dzisWpis.bol).length;

    const karta = (w) => {
      const d = w.dzisWpis;
      const poprz = w.odczyty.length > 1 ? w.odczyty[w.odczyty.length - 2] : null;
      return `<li class="odp-os">
        <div class="odp-os__gora">
          ${odpKto(w)}
          <span class="odp-os__postep"><b>${d.zrobione}</b> z ${d.zadane} ćwiczeń</span>
        </div>
        ${odpCwiczenia(d)}
        ${d.bol ? odpBol(d, poprz) : w.wizytaDzis ? '<p class="odp-bol odp-bol--brak">Po dzisiejszej wizycie pytanie o ból jeszcze bez odpowiedzi.</p>' : ''}
        ${odpAkcje(w)}
      </li>`;
    };

    const kompakt = (w) => `<li class="odp-cicho">
      ${odpKto(w)}
      <span class="odp-cicho__info">${
        w.dzisWpis.planowany ? `ćwiczenia: 0 z ${w.dzisWpis.zadane}` : w.maCwiczenia ? 'dziś bez ćwiczeń w planie' : 'bez zadanych ćwiczeń'
      }<em>ostatnia odpowiedź: ${odpOstatnia(w)}</em></span>
      ${odpAkcje(w)}
    </li>`;

    return `<div class="tiles">
        ${odpKafel('Ćwiczyło dziś', cwiczylo, `z ${planowanych.length} osób, które dziś mają ćwiczyć`)}
        ${odpKafel('Odhaczone ćwiczenia', zadane ? `${Math.round((zrobione / zadane) * 100)}%` : '—', `${zrobione} z ${zadane} na dziś`)}
        ${odpKafel('Odpowiedzi o bólu', oBol, 'zebrane dzisiaj')}
        ${odpKafel('Jeszcze cicho', cisza.length, 'mieli dziś ćwiczyć · dzień trwa', cisza.length ? ' tile--alert' : '')}
      </div>

      <h2 class="sekcja-h">Odesłali coś dzisiaj · ${odeslali.length}</h2>
      ${odeslali.length ? `<ul class="odp-lista">${odeslali.map(karta).join('')}</ul>` : '<p class="pusto">Nikt jeszcze dzisiaj nie odhaczył ćwiczenia ani nie odpowiedział na ankietę.</p>'}

      ${cisza.length ? `<h2 class="sekcja-h">Mieli dziś ćwiczyć, na razie cisza · ${cisza.length}</h2><ul class="odp-lista odp-lista--kompakt">${cisza.map(kompakt).join('')}</ul>` : ''}
      ${wolne.length ? `<h2 class="sekcja-h">Dziś bez ćwiczeń w planie · ${wolne.length}</h2><ul class="odp-lista odp-lista--kompakt">${wolne.map(kompakt).join('')}</ul>` : ''}

      <p class="card__note card__note--stopka">Godziny to chwila, w której pacjent kliknął w swojej karcie. Brak wpisu znaczy tylko, że pacjent niczego jeszcze nie zaznaczył — niczego nie dopowiadamy za niego.</p>`;
  }

  /* Dzień po dniu: co dokładnie robił jeden pacjent, każdego dnia. */
  function odpDni(wiersze) {
    if (!wiersze.length) return '<div class="card"><p class="pusto">Nie ma terapii w toku, więc nie ma dnia do pokazania.</p></div>';
    /* Bez wybranej osoby zaczynamy od tej, która odezwała się ostatnio — pusty dziennik niczego nie pokazuje. */
    const klucz = (x) => (x.ostatniaAktywnosc ? x.ostatniaAktywnosc.data + (x.ostatniaAktywnosc.godzina || '').padStart(5, '0') : '');
    const najaktywniejszy = [...wiersze].sort((a, b) => klucz(b).localeCompare(klucz(a)))[0];
    const w = wiersze.find((x) => x.terapiaId === odpTerapia) || najaktywniejszy;
    odpTerapia = w.terapiaId;
    const dni = P.dziennikTerapii(w.terapiaId, 14);
    const zakonczone = dni.filter((d) => d.planowany && !d.dzis);
    const zadane = zakonczone.reduce((s, d) => s + d.zadane, 0);
    const zrobione = zakonczone.reduce((s, d) => s + d.zrobione, 0);
    const dniAktywne = zakonczone.filter((d) => d.zrobione).length;
    const odczyty = w.odczyty.filter((o) => o.data >= P.isoZa(-13));

    const etykietaDnia = (d) => {
      const rel = P.dniOd(d.data);
      const rela = rel === 0 ? 'dziś' : rel === 1 ? 'wczoraj' : DNI[P.fromIso(d.data).getDay()];
      return `<b>${rela}</b><span>${krotka(d.data)}</span>`;
    };

    const wiersz = (d) => {
      const poprz = (() => {
        const przed = w.odczyty.filter((o) => o.data < d.data);
        return przed.length ? przed[przed.length - 1] : null;
      })();
      const wolny = !d.planowany && !d.zrobione;
      return `<li class="dz${d.dzis ? ' dz--dzis' : ''}${wolny ? ' dz--wolny' : ''}">
        <span class="dz__data">${etykietaDnia(d)}</span>
        <span class="dz__cw">${
          wolny
            ? `<span class="odp-pusto">${d.zadane ? 'Dzień bez ćwiczeń w planie.' : 'Brak zadanych ćwiczeń.'}</span>`
            : `${odpCwiczenia(d)}${
                !d.planowany ? '<span class="odp-pusto">Dzień bez ćwiczeń w planie — pacjent ćwiczył dodatkowo.</span>' : ''
              }`
        }</span>
        <span class="dz__bol">${
          d.bol
            ? odpBol(d, poprz).replace('<p class="odp-bol">', '<span class="odp-bol">').replace('</p>', '</span>')
            : '<span class="odp-brak" aria-label="bez odpowiedzi o bólu">—</span>'
        }</span>
      </li>`;
    };

    const l = P.linia(w.linia);
    return `<div class="card card--szeroka odp-wybor">
        <div class="odp-wybor__gora">
          <div class="field odp-wybor__pole">
            <label for="odp-terapia">Pacjent</label>
            <select id="odp-terapia">
              ${[...wiersze].sort((a, b) => a.imie.localeCompare(b.imie, 'pl')).map((x) => `<option value="${x.terapiaId}"${x.terapiaId === w.terapiaId ? ' selected' : ''}>${esc(x.imie)} — ${esc(x.etykieta)}</option>`).join('')}
            </select>
          </div>
          <span class="odp-os__akcje">
            <button class="btn btn--sm btn--ghost" type="button" data-akcja="napisz" data-pacjent-id="${w.pacjentId}">Napisz</button>
            <button class="btn btn--sm" type="button" data-pacjent="${w.pacjentId}">Karta</button>
          </span>
        </div>
        <p class="odp-wybor__podsumowanie">
          ${
            zadane
              ? `Ostatnie dwa tygodnie: odhaczone <b>${zrobione} z ${zadane}</b> zaplanowanych ćwiczeń (${Math.round((zrobione / zadane) * 100)}%), ćwiczył w <b>${dniAktywne} z ${zakonczone.length}</b> dni z planu.`
              : 'W tym okresie nie było zaplanowanych dni ćwiczeń.'
          }
          ${
            odczyty.length
              ? ` Ból: ${odczyty.map((o) => `${o.wartosc}`).join(' → ')}.`
              : ' Ból: bez odpowiedzi w tym czasie.'
          }
        </p>
      </div>

      <ul class="dz-lista" style="--c:${l ? l.kolor : '#535A61'}">${dni.map(wiersz).join('')}</ul>
      <p class="card__note card__note--stopka">Dni bez ćwiczeń w planie pochodzą z przypomnień pacjenta (Wiadomości → Przypomnienie o ćwiczeniach). „Nie odhaczone” znaczy tylko tyle, że pacjent niczego nie zaznaczył.</p>`;
  }

  /* Tygodnie: dotychczasowa tabela, z przejściem do dnia po dniu. */
  function odpTygodnie(wiersze) {
    if (!wiersze.length) return '<div class="card"><p class="pusto">Nie ma terapii w toku, więc nie ma o co pytać.</p></div>';
    const zOdczytami = wiersze.filter((w) => w.bolOstatni !== null);
    const wDol = zOdczytami.filter((w) => w.bolKierunek > 0).length;
    const milczacy = wiersze.filter((w) => w.milczy);
    const zCwiczeniami = wiersze.filter((w) => w.maCwiczenia && w.zadaneWTygodniu);
    const zrobione = zCwiczeniami.reduce((s, w) => s + w.zrobioneWTygodniu, 0);
    const zadane = zCwiczeniami.reduce((s, w) => s + w.zadaneWTygodniu, 0);

    const kafel = (label, value, foot, klasa = '') =>
      `<article class="tile${klasa}"><p class="tile__label">${label}</p><p class="tile__value">${value}</p><p class="tile__foot">${foot}</p></article>`;

    const iskra = (w) => {
      if (!w.odczyty.length) return '<span class="tag">brak odczytów</span>';
      const ostatnie = w.odczyty.slice(-6);
      return `<span class="iskra" role="img" aria-label="Kolejne oceny bólu: ${ostatnie.map((o) => o.wartosc).join(', ')}">
        ${ostatnie
          .map((o) => `<i style="height:${Math.max(o.wartosc, 0.4) * 10}%" title="${krotka(o.data)}: ${o.wartosc} z 10"></i>`)
          .join('')}
      </span><b class="iskra__teraz">${w.bolOstatni}<span>/10</span></b>`;
    };

    const kierunek = (w) => {
      if (w.bolKierunek === null) return w.odczyty.length === 1 ? '<span class="trend trend--pierwszy">pierwszy odczyt</span>' : '';
      if (w.bolKierunek > 0) return `<span class="trend trend--up">w dół o ${w.bolKierunek}</span>`;
      if (w.bolKierunek === 0) return '<span class="trend trend--stoi">bez zmiany</span>';
      return `<span class="trend trend--down">w górę o ${Math.abs(w.bolKierunek)}</span>`;
    };

    const tygodnie = (w) =>
      w.tygodnie.length
        ? `<span class="tyg" role="img" aria-label="Odhaczenia w kolejnych tygodniach: ${w.tygodnie
            .map((t) => `${t.etykieta} ${t.zrobione} z ${t.zadane}`)
            .join('; ')}">${w.tygodnie
            .map(
              (t) =>
                `<i title="${t.etykieta}: ${t.zrobione} z ${t.zadane}"><b style="height:${
                  t.zadane ? Math.min(Math.round((t.zrobione / t.zadane) * 100), 100) : 0
                }%"></b></i>`
            )
            .join('')}</span>`
        : '<span class="tag">bez ćwiczeń</span>';

    const wiersz = (w) => {
      const l = P.linia(w.linia);
      return `<tr data-pacjent="${w.pacjentId}"${w.milczy ? ' class="is-cicho"' : ''}>
        <td>
          <span class="who">
            <span class="who__mark" style="--c:${l ? l.kolor : '#535A61'};--on:${l ? l.naKolorze : '#fff'}">${inicjaly(w.imie)}</span>
            <span><span class="who__name">${esc(w.imie)}</span><span class="who__sub">${esc(w.etykieta)}</span></span>
          </span>
        </td>
        <td><span class="bol-kol">${iskra(w)}</span>${kierunek(w)}</td>
        <td>${w.bolKiedy ? krotka(w.bolKiedy) : '<span class="tag">nigdy</span>'}</td>
        <td>${tygodnie(w)}</td>
        <td>${
          w.maCwiczenia && w.zadaneWTygodniu
            ? `<b>${w.zrobioneWTygodniu}</b> z ${w.zadaneWTygodniu}`
            : '<span class="tag">—</span>'
        }</td>
        <td class="ank__akcje">
          <button class="btn btn--sm btn--ghost" type="button" data-akcja="napisz" data-pacjent-id="${w.pacjentId}">Napisz</button>
          <button class="btn btn--sm" type="button" data-odp-dni="${w.terapiaId}">Dzień po dniu</button>
          <button class="btn btn--sm" type="button" data-pacjent="${w.pacjentId}">Karta</button>
        </td>
      </tr>`;
    };

    return `<div class="tiles">
        ${kafel('Odpowiedziało o bólu', zOdczytami.length, `z ${wiersze.length} osób w terapii`)}
        ${kafel('Ból spada', wDol, zOdczytami.length ? `z ${zOdczytami.length}, które odpowiedziały` : 'brak odczytów')}
        ${kafel(
          'Ćwiczenia w tym tygodniu',
          zadane ? `${Math.round((zrobione / zadane) * 100)}%` : '—',
          `${zrobione} z ${zadane} zadanych`
        )}
        ${kafel(
          'Milczą',
          milczacy.length,
          milczacy.length ? 'ani bólu, ani ćwiczeń' : 'każdy coś odesłał',
          milczacy.length ? ' tile--alert' : ''
        )}
      </div>

      <div class="card card--szeroka">
        <div class="card__head">
          <h2>Kto co odesłał</h2>
          <p class="card__note">Na górze ci, do których warto zadzwonić najpierw: milczący, potem ból, który nie spada.</p>
        </div>
        <div class="table-wrap">
          <table class="table">
            <caption class="visually-hidden">Odpowiedzi pacjentów z ankiet</caption>
            <thead><tr>
              <th scope="col">Pacjent</th><th scope="col">Ból po wizytach</th><th scope="col">Ostatnia odpowiedź</th>
              <th scope="col">Ćwiczenia, 4 tygodnie</th><th scope="col">Ten tydzień</th><th scope="col"><span class="visually-hidden">Akcje</span></th>
            </tr></thead>
            <tbody>${wiersze.map(wiersz).join('')}</tbody>
          </table>
        </div>
        <p class="card__note card__note--stopka">Wszystko tutaj pochodzi z tego, co pacjent kliknął w swojej karcie. Pusto znaczy, że nie odpowiedział — niczego nie dopowiadamy za niego.</p>
      </div>`;
  }

  /* Ćwiczenia: biblioteka, z której układasz plany — razem z tym, co pacjenci z niej faktycznie robią. */
  function odpBiblioteka() {
    const stat = P.statystykaCwiczen(14);
    return `<article class="card card--szeroka">
        <header class="card__head card__head--row">
          <div>
            <h2>Biblioteka ćwiczeń</h2>
            <p class="card__note">Opis i nagranie trafiają prosto do karty pacjenta. Przy każdym ćwiczeniu widać, jak chętnie pacjenci je odhaczają.</p>
          </div>
          <button class="btn btn--sm btn--accent" type="button" data-akcja="nowe-cwiczenie">${ikona('plus')}Dodaj ćwiczenie</button>
        </header>
        <ul class="cwb">${
          S().cwiczeniaBiblioteka.length
            ? S().cwiczeniaBiblioteka.map((c) => cwiczenieWiersz(c, stat[c.id])).join('')
            : '<li class="pusto">Biblioteka jest pusta. Dodaj pierwsze ćwiczenie.</li>'
        }</ul>
      </article>`;
  }

  function renderOdPacjenta() {
    if (gabinetPusty()) return renderStart();
    const wiersze = P.przegladAnkiet().filter((w) => !filtrZespolu || w.terapeutaId === filtrZespolu);
    const zakl = ODP_ZAKLADKI.find((x) => x.id === odpZakladka) || ODP_ZAKLADKI[0];
    $('#view-date').textContent = zakl.opis;

    const tresc = {
      dzis: () => (wiersze.length ? odpDzis(wiersze) : '<div class="card"><p class="pusto">Nie ma terapii w toku, więc nie ma o co pytać.</p></div>'),
      dni: () => odpDni(wiersze),
      tygodnie: () => odpTygodnie(wiersze),
      biblioteka: () => odpBiblioteka(),
    }[zakl.id]();

    $('#odpacjenta').innerHTML = `${zakl.id === 'biblioteka' ? '' : paskiZespolu()}
      <div class="odp-zakladki" role="tablist" aria-label="Widoki odpowiedzi pacjentów">
        ${ODP_ZAKLADKI.map(
          (x) => `<button class="odp-zakladka" type="button" role="tab" aria-selected="${x.id === zakl.id}" data-odp-zakl="${x.id}">${x.nazwa}</button>`
        ).join('')}
      </div>
      <div role="tabpanel">${tresc}</div>`;
  }

  function render() {
    renderRail();
    if (widok === 'dzis') renderDzis();
    if (widok === 'kalendarz') renderKalendarz();
    if (widok === 'pacjenci') renderPacjenci();
    if (widok === 'odpacjenta') renderOdPacjenta();
    if (widok === 'wiadomosci') renderWiadomosci();
    if (widok === 'miesiac') renderMiesiac();
    if (widok === 'ustawienia') renderUstawienia();
    if (otwartyPacjent) renderDrawer();
  }

  /* ── Zdarzenia ─────────────────────────────────────────────────────── */
  document.addEventListener('click', async (e) => {
    /* Kliknięcie w tło zamyka to, co jest na wierzchu. Sprawdzamy to przed
       szukaniem przycisku, bo tło przyciskiem nie jest. */
    if (e.target.classList.contains('modal__veil')) return schowajModal();
    if (e.target.classList.contains('drawer__veil')) return zamknijDrawer();

    /* Wiersz kartoteki też jest klikalny — nie tylko przyciski w nim. */
    const el = e.target.closest('button, a, tr[data-pacjent]');
    if (!el) return;
    const d = el.dataset;

    if (d.close !== undefined) {
      return el.closest('#modal') ? schowajModal() : zamknijDrawer();
    }
    if (d.view) {
      if (!$('#drawer').hidden) zamknijDrawer();
      return pokazWidok(d.view);
    }
    if (d.odpZakl) {
      odpZakladka = d.odpZakl;
      return renderOdPacjenta();
    }
    if (d.odpDni) {
      /* Z karty pacjenta albo z listy: ten sam widok, od razu na tej osobie. */
      odpTerapia = d.odpDni;
      odpZakladka = 'dni';
      if (!$('#drawer').hidden) zamknijDrawer();
      return pokazWidok('odpacjenta');
    }
    if (d.pacjent) {
      $('#search-out').hidden = true;
      return otworzPacjenta(d.pacjent);
    }
    if (d.filtrWiad) {
      filtrWiadomosci = d.filtrWiad;
      return renderWiadomosci();
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
    if (d.gotowiec !== undefined) {
      const lista = JSON.parse($('#modal').dataset.gotowce || '[]');
      $('#nw-tresc').value = lista[Number(d.gotowiec)] || '';
      $('#nw-tresc').focus();
      return;
    }
    if (d.pole) {
      const pole = $('#rw-szablon');
      const poz = pole.selectionStart;
      pole.value = `${pole.value.slice(0, poz)}{${d.pole}}${pole.value.slice(pole.selectionEnd)}`;
      pole.focus();
      pole.selectionStart = pole.selectionEnd = poz + d.pole.length + 2;
      podgladSzablonu();
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
      case 'wizyta':
        return formWizyta(d.wizyta);
      case 'w-kalendarzu': {
        /* Przeskakujemy na tydzień, w którym leży ta wizyta. */
        const cel = P.fromIso(d.data);
        const poniedzialekTeraz = new Date(P.dzis);
        poniedzialekTeraz.setDate(P.dzis.getDate() - ((P.dzis.getDay() + 6) % 7));
        const poniedzialekCelu = new Date(cel);
        poniedzialekCelu.setDate(cel.getDate() - ((cel.getDay() + 6) % 7));
        tydzienPrzesuniecie = Math.round((poniedzialekCelu - poniedzialekTeraz) / (7 * 86400000));
        zamknijDrawer();
        return pokazWidok('kalendarz');
      }
      case 'karta-pacjenta':
        schowajModal();
        return otworzPacjenta(d.pacjentId);
      case 'otworz-istniejacego':
        schowajModal();
        toast('Otwarta karta, która już była w kartotece');
        return otworzPacjenta(d.pacjentId);
      case 'uw-wez-istniejacego': {
        /* Zostajemy w oknie umawiania — tylko zamiast nowego profilu
           wskazujemy ten, który już jest. */
        $('#uw-pacjent').value = d.pacjentId;
        $('#uw-nowy-pola').hidden = true;
        $('#uw-pacjent').closest('.field').hidden = false;
        $('#uw-dubel').hidden = true;
        $('#uw-err').hidden = true;
        $('#uw-imie').value = '';
        $('#uw-tel').value = '';
        renderSloty();
        return toast(`Umawiamy do istniejącej karty: ${P.pacjent(d.pacjentId).imie}`);
      }
      case 'uw-nowy': {
        $('#uw-nowy-pola').hidden = false;
        $('#uw-pacjent').closest('.field').hidden = true;
        $('#uw-imie').focus();
        return;
      }
      case 'uw-anuluj-nowy': {
        $('#uw-nowy-pola').hidden = true;
        $('#uw-pacjent').closest('.field').hidden = false;
        return;
      }
      case 'nowa-wizyta':
        return formUmow();
      case 'umow':
        schowajModal();
        return formUmow({ pacjentId: d.pacjentId });
      case 'umow-slot':
        return formUmow({ data: d.data, godzina: d.godzina });
      case 'nowy-pacjent':
        $('#search-out').hidden = true;
        $('#search').value = '';
        return formNowyPacjent(d.imie || '');
      case 'nowa-terapia':
        return formNowaTerapia(d.pacjentId);
      case 'nowe-cwiczenie':
        return formCwiczenieBiblioteka();
      case 'cw-dopisz':
        $('#cw-dopisz-pola').hidden = false;
        e.target.closest('.cw-dopisz').querySelector('.link-btn').hidden = true;
        $('#cwd-nazwa').focus();
        return;
      case 'cw-dopisz-anuluj':
        $('#cw-dopisz-pola').hidden = true;
        $('.cw-dopisz > .link-btn').hidden = false;
        return;
      case 'cw-dopisz-zapisz': {
        const nazwa = $('#cwd-nazwa').value.trim();
        if (nazwa.length < 3) return bladModalu('cwp-err', 'Podaj nazwę ćwiczenia.');
        const nowe = P.akcje.dodajCwiczenieDoBiblioteki({
          nazwa,
          opis: $('#cwd-opis').value.trim(),
          powtorzenia: $('#cwd-pow').value.trim(),
          razy: 5,
        });
        /* Dopisujemy wiersz zamiast przerysowywać okno — zaznaczenia zostają. */
        $('#cw-lista').insertAdjacentHTML('beforeend', wyborCwiczenia(nowe, { powtorzenia: nowe.powtorzenia, razyWTygodniu: nowe.razy }));
        $('#cw-dopisz-pola').hidden = true;
        $('.cw-dopisz > .link-btn').hidden = false;
        $('#cwd-nazwa').value = '';
        $('#cwd-opis').value = '';
        $('#cwp-err').hidden = true;
        return toast(`Dodano ćwiczenie: ${nazwa}`);
      }
      case 'edytuj-cwiczenie':
        return formCwiczenieBiblioteka(d.cwId);
      case 'usun-cwiczenie':
        return usunCwiczenieZPytaniem(d.cwId);
      case 'przywroc-cwiczenie': {
        const c = P.cwiczenie(d.cwId);
        P.akcje.przywrocCwiczenie(d.cwId);
        return toast(`Przywrócono: ${c.nazwa}`, true);
      }
      case 'edytuj-terapie':
        return formEdytujTerapie(d.terapia);
      case 'cwiczenia':
        return formCwiczenia(d.terapia);
      case 'link':
        return formLink(d.terapia);
      case 'status': {
        const poprzedni = (S().wizyty.find((x) => x.id === d.wizyta) || {}).status;
        P.akcje.zmienStatusWizyty(d.wizyta, d.status);
        if (d.zamknij !== undefined) schowajModal();
        const nazwy = {
          odbyta: 'Wizyta oznaczona jako odbyta',
          nieobecnosc: 'Zapisano nieobecność',
          potwierdzona: poprzedni === 'odbyta' || poprzedni === 'nieobecnosc' ? 'Cofnięto oznaczenie' : 'Wizyta potwierdzona',
        };
        return toast(nazwy[d.status] || 'Zmieniono status wizyty', true);
      }
      case 'przeloz':
        schowajModal();
        return formUmow({ wizytaId: d.wizyta });
      case 'odwolaj': {
        schowajModal();
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
      case 'kreator':
        return formKreator();
      case 'wczytaj-demo': {
        const byl = window.KONFIGURACJA.tryb;
        window.KONFIGURACJA.tryb = 'demo';
        P.akcje.reset();
        window.KONFIGURACJA.tryb = byl;
        return toast('Wczytano dane przykładowe');
      }
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
      case 'przelacz-rodzaj': {
        const wynik = P.akcje.przelaczRodzajWiadomosci(d.typ);
        return toast(
          wynik.wlaczona
            ? `${P.TYPY_WIADOMOSCI[d.typ].nazwa}: znów wychodzi`
            : `${P.TYPY_WIADOMOSCI[d.typ].nazwa}: wyłączone dla wszystkich`,
          true
        );
      }
      case 'ustaw-rodzaj':
        return formRodzaj(d.typ);
      case 'edytuj-wiadomosc':
        return formWiadomosc(d.wid);
      case 'usun-wiadomosc':
        P.akcje.usunWiadomosc(d.wid);
        return toast('Wiadomość nie pójdzie', true);
      case 'przywroc-wiadomosc':
        P.akcje.przywrocWiadomosc(d.wid);
        return toast('Wiadomość wraca do kolejki', true);
      case 'nowa-notatka':
        return formNotatkaKarty(d.pacjentId);
      case 'edytuj-notatke': {
        const n = (S().notatki || []).find((x) => x.id === d.notatka);
        return formNotatkaKarty(n.pacjentId, n.id);
      }
      case 'widocznosc-notatki': {
        const wynik = P.akcje.przelaczWidocznoscNotatki(d.notatka);
        return toast(wynik.dlaPacjenta ? 'Pacjent zobaczy tę notatkę w swojej karcie' : 'Notatka znów jest tylko dla Ciebie', true);
      }
      case 'usun-notatke':
        P.akcje.usunNotatke(d.notatka);
        return toast('Notatka usunięta', true);
      case 'napisz':
        return formNapisz(d.pacjentId);
      case 'pora-pacjenta':
        return formPoraPacjenta(d.pacjentId, d.typ);
      case 'reset-wiad':
        P.akcje.przywrocUstawieniaPacjenta(d.pacjentId);
        return toast('Ten pacjent wraca do reguł gabinetu', true);
      case 'skasuj-wiadomosc':
        P.akcje.skasujWiadomoscWlasna(d.wid);
        return toast('Wiadomość skasowana', true);
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
      case 'cwiczenie-biblioteka':
        return zapiszCwiczenieBiblioteka(d.cwId || null);
      case 'wycofaj-cwiczenie': {
        const c = P.cwiczenie(d.cwId);
        P.akcje.usunCwiczenieZBiblioteki(d.cwId);
        schowajModal();
        return toast(`Wycofano z listy: ${c.nazwa}`, true);
      }
      case 'terapia':
        return zapiszNowaTerapie(d.pacjentId);
      case 'edycja-terapii':
        return zapiszEdycjeTerapii(d.terapia);
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
      case 'kreator':
        return zapiszKreator();
      case 'notatka-karty': {
        const tekst = $('#nk-tekst').value.trim();
        if (tekst.length < 3) return bladModalu('nk-err', 'Napisz treść notatki.');
        const dlaPacjenta = $('#nk-dla-pacjenta').checked;
        if (d.notatka) P.akcje.zmienNotatke(d.notatka, { tekst, dlaPacjenta });
        else P.akcje.dodajNotatkeKarty({ pacjentId: d.pacjentId, terapiaId: d.terapia || null, tekst, dlaPacjenta });
        schowajModal();
        return toast(dlaPacjenta ? 'Zapisano. Pacjent zobaczy tę notatkę.' : 'Zapisano notatkę', true);
      }
      case 'napisz':
        return zapiszNapisz(d.pacjentId);
      case 'pora-pacjenta': {
        const dane = { godzina: $('#pp-godzina').value };
        if ($('#pp-dni')) dane.dniPrzed = Number($('#pp-dni').value);
        if ($('#pp-po')) dane.dniPo = Number($('#pp-po').value);
        if (document.querySelector('[name="pp-dni-cw"]')) {
          const dni = odczytajDni('pp-dni-cw');
          if (!dni.length) return bladModalu('pp-err', 'Zaznacz przynajmniej jeden dzień ćwiczeń.');
          dane.dni = dni;
        }
        if (!dane.godzina) return bladModalu('pp-err', 'Podaj godzinę.');
        P.akcje.ustawWiadomoscPacjenta(d.pacjentId, d.typ, dane);
        schowajModal();
        return toast('Zapisano wyjątek dla tego pacjenta', true);
      }
      case 'pora-domyslna':
        P.akcje.przywrocUstawieniaPacjenta(d.pacjentId, d.typ);
        schowajModal();
        return toast('Ten rodzaj wraca do reguły gabinetu', true);
      case 'rodzaj':
        return zapiszRodzaj(d.typ);
      case 'rodzaj-domyslny': {
        const def = P.TYPY_WIADOMOSCI[d.typ];
        P.akcje.zapiszRodzajWiadomosci(d.typ, { ...def.domyslne, szablon: def.szablon });
        schowajModal();
        return toast('Przywrócono domyślne ustawienia', true);
      }
      case 'wiadomosc': {
        const tresc = $('#ew-tresc').value.trim();
        const data = $('#ew-data').value;
        const godzina = $('#ew-godzina').value;
        if (tresc.length < 5) return bladModalu('ew-err', 'Treść jest za krótka.');
        if (!data || !godzina) return bladModalu('ew-err', 'Podaj dzień i godzinę.');
        if (data < P.iso(P.dzis)) return bladModalu('ew-err', 'Nie da się wysłać wstecz.');
        P.akcje.nadpiszWiadomosc(d.wid, tresc);
        P.akcje.przesunWiadomosc(d.wid, data, godzina);
        schowajModal();
        return toast(`Wyjdzie ${krotka(data)} o ${godzina}`, true);
      }
      case 'wyslij-teraz': {
        const w = P.kolejkaWiadomosci(30).find((x) => x.id === d.wid);
        if (!w) return;
        P.akcje.wyslijWiadomoscTeraz(w.id, w.pacjentId, ($('#ew-tresc') || {}).value || w.tresc);
        schowajModal();
        return toast('Wysłane. Ślad jest w historii pacjenta.', true);
      }
      case 'napisz-teraz': {
        const tresc = $('#nw-tresc').value.trim();
        if (tresc.length < 5) return bladModalu('nw-err', 'Napisz treść wiadomości.');
        P.akcje.zapiszWyslanie(d.pacjentId, 'sms', tresc);
        schowajModal();
        return toast('Wysłane. Ślad jest w historii pacjenta.', true);
      }
      case 'wiadomosc-domyslna':
        P.akcje.przywrocTrescWiadomosci(d.wid);
        P.akcje.przywrocTerminWiadomosci(d.wid);
        schowajModal();
        return toast('Wróciła treść i termin z reguły', true);
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

  document.addEventListener('input', (e) => {
    if (e.target.id === 'rw-szablon') podgladSzablonu();
    if (['cw-nazwa', 'cw-opis', 'cw-pow', 'cw-razy', 'cw-material', 'cw-material-opis'].includes(e.target.id)) podgladCwiczenia();
    /* Podpowiedź o dublecie odnawia się przy pisaniu, a nie dopiero przy zapisie —
       lepiej zobaczyć „ten numer już tu jest" przed wypełnieniem reszty. */
    if (['np-imie', 'np-tel', 'np-mail'].includes(e.target.id)) {
      potwierdzonyDubel = false;
      sprawdzDubletNowego();
    }
    if (['uw-imie', 'uw-tel'].includes(e.target.id)) sprawdzDubletUmawiania();
  });

  document.addEventListener('change', (e) => {
    if (e.target.id === 'uw-dzien' || e.target.id === 'uw-terapeuta') renderSloty();
    if (['pp-dni', 'pp-po', 'pp-godzina'].includes(e.target.id) || e.target.name === 'pp-dni-cw') {
      const przycisk = $('[data-zapisz="pora-pacjenta"]');
      if (przycisk) {
        /* Podgląd liczymy na zapisanych danych, więc pokazujemy tylko zmianę pory. */
        const godz = $('#pp-godzina').value;
        const out = $('#pp-podglad');
        if (out) out.innerHTML = `<span>Po zapisaniu</span>wiadomość wyjdzie o ${godz}`;
      }
    }
    if (e.target.id === 'uw-seria') $('#uw-seria-pola').hidden = !e.target.checked;
    if (e.target.id === 'odp-terapia') {
      odpTerapia = e.target.value;
      renderOdPacjenta();
      $('#odp-terapia').focus();
    }
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
  /* W gabinecie pracującym pasek o prototypie byłby nieprawdą. */
  if (window.KONFIGURACJA && window.KONFIGURACJA.tryb === 'praca' && bar) bar.remove();
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
