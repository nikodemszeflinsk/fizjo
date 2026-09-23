/* CRM kliniki — demo. Wszystko liczone lokalnie, bez serwera i bez wysyłania danych. */
(() => {
  'use strict';

  const D = window.CRM;
  if (!D) return;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (v) =>
    String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const zl = (n) => `${Math.round(n).toLocaleString('pl-PL')} zł`;

  const LINIE = Object.fromEntries(D.linie.map((l) => [l.id, l]));
  const ZESPOL = Object.fromEntries(D.zespol.map((t) => [t.id, t]));
  const GABINETY = Object.fromEntries(D.gabinety.map((g) => [g.id, g]));
  const ZRODLA = Object.fromEntries(D.zrodla.map((z) => [z.id, z]));
  const PACJENCI = Object.fromEntries(D.pacjenci.map((p) => [p.id, p]));

  const ETAPY = [
    { id: 'zapytanie', nazwa: 'Zapytanie' },
    { id: 'nowy', nazwa: 'Pierwsza wizyta' },
    { id: 'terapia', nazwa: 'W terapii' },
    { id: 'ryzyko', nazwa: 'Cisza po wizycie' },
    { id: 'zakonczona', nazwa: 'Cykl zakończony' },
  ];
  const ETAP = Object.fromEntries(ETAPY.map((e) => [e.id, e.nazwa]));

  const ICON = {
    pulpit: '<path d="M3.5 10.5 10 4l6.5 6.5M5.5 9v7.5h9V9"/>',
    kalendarz: '<path d="M4 5.5h12v11H4ZM4 8.5h12M7.5 3.5v3M12.5 3.5v3"/>',
    pacjenci: '<path d="M7.5 9.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2.5 17c0-2.8 2.2-5 5-5s5 2.2 5 5M13 4.7a3 3 0 0 1 0 5.6M14.5 12.6c1.8.6 3 2.3 3 4.4"/>',
    skrzynka: '<path d="M3.5 5.5h13v9h-13ZM3.5 6l6.5 5 6.5-5"/>',
    automatyzacje: '<path d="M10 3.5v3M10 13.5v3M16.5 10h-3M6.5 10h-3M14.6 5.4l-2.1 2.1M7.5 12.5l-2.1 2.1M14.6 14.6l-2.1-2.1M7.5 7.5 5.4 5.4M10 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/>',
    up: '<path d="M10 15.5v-11M5.5 9 10 4.5 14.5 9"/>',
    down: '<path d="M10 4.5v11M5.5 11 10 15.5 14.5 11"/>',
    phone: '<path d="M6.5 3.5h-2a1 1 0 0 0-1 1c0 6.6 5.4 12 12 12a1 1 0 0 0 1-1v-2L13 12l-1.5 1.5a8 8 0 0 1-4-4L9 8 6.5 3.5Z"/>',
    sms: '<path d="M3.5 4.5h13v9h-8l-4 3v-3h-1Z"/>',
    plus: '<path d="M10 4.5v11M4.5 10h11"/>',
  };
  const ikona = (n, cls = '') => `<svg class="${cls}" viewBox="0 0 20 20" aria-hidden="true">${ICON[n]}</svg>`;

  /* ── Daty ──────────────────────────────────────────────────────────── */
  const DNI = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
  const DNI_KR = ['nd', 'pn', 'wt', 'śr', 'cz', 'pt', 'sb'];
  const MIES = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
  const dlugaData = (d) => `${DNI[d.getDay()]}, ${d.getDate()} ${MIES[d.getMonth()]}`;
  const krotkaData = (d) => `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
  const wzgledna = (przesuniecie) => {
    if (przesuniecie === null || przesuniecie === undefined) return '—';
    if (przesuniecie === 0) return 'dziś';
    if (przesuniecie === 1) return 'jutro';
    if (przesuniecie === -1) return 'wczoraj';
    const d = D.dzien(przesuniecie);
    return przesuniecie < 0 ? `${Math.abs(przesuniecie)} dni temu` : `za ${przesuniecie} dni (${krotkaData(d)})`;
  };

  const inicjaly = (imie) =>
    imie
      .split(' ')
      .map((c) => c[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

  const kolorPacjenta = (p) => LINIE[p.linia];

  /* ── Powiadomienie ─────────────────────────────────────────────────── */
  let toastT;
  const toast = (tekst) => {
    const el = $('#toast');
    el.textContent = tekst;
    el.classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(() => el.classList.remove('is-on'), 3600);
  };

  /* ── Nawigacja ─────────────────────────────────────────────────────── */
  const WIDOKI = [
    { id: 'pulpit', nazwa: 'Pulpit' },
    { id: 'kalendarz', nazwa: 'Kalendarz' },
    { id: 'pacjenci', nazwa: 'Pacjenci' },
    { id: 'skrzynka', nazwa: 'Skrzynka' },
    { id: 'automatyzacje', nazwa: 'Automatyzacje' },
  ];

  const stanSkrzynki = D.skrzynka.map((w) => ({ ...w }));

  function renderRail() {
    const nowe = stanSkrzynki.filter((w) => w.nowa).length;
    $('#rail-list').innerHTML = WIDOKI.map(
      (w) => `<li><button class="rail__btn" type="button" data-view="${w.id}" aria-current="${w.id === 'pulpit'}">
        ${ikona(w.id)}${w.nazwa}
        ${w.id === 'skrzynka' && nowe ? `<span class="rail__badge">${nowe}</span>` : ''}
      </button></li>`
    ).join('');
  }

  function pokazWidok(id) {
    WIDOKI.forEach((w) => ($(`#${w.id}`).hidden = w.id !== id));
    $$('.rail__btn').forEach((b) => b.setAttribute('aria-current', String(b.dataset.view === id)));
    const w = WIDOKI.find((x) => x.id === id);
    $('#view-title').textContent = w.nazwa;
    $('#view-date').textContent =
      id === 'kalendarz' ? 'Bieżący tydzień' : id === 'pacjenci' ? `${D.pacjenci.length} osób w kartotece` : dlugaData(D.dzis);
    $('.app').classList.remove('is-open');
    $('#menu').setAttribute('aria-expanded', 'false');
    $('#widok').scrollTo({ top: 0 });
  }

  /* ── Pulpit: kafle ─────────────────────────────────────────────────── */
  function renderTiles() {
    const doPotwierdzenia = D.wizytyDzis.filter((w) => w.status === 'niepotwierdzona').length;
    const noweZapytania = stanSkrzynki.filter((w) => w.nowa).length;
    const online30 = D.rezerwacjeTygodnie.slice(-4).reduce((s, t) => s + t.strona, 0);
    const [przedostatni, ostatni] = D.rezerwacjeTygodnie.slice(-2);
    const wzrost = Math.round(((ostatni.strona - przedostatni.strona) / przedostatni.strona) * 100);
    const przychod = D.pacjenci.reduce((s, p) => s + p.wartosc, 0);

    const kafel = (label, value, foot, ink) => `
      <article class="tile${ink ? ' tile--ink' : ''}">
        <p class="tile__label">${label}</p>
        <p class="tile__value">${value}</p>
        <p class="tile__foot">${foot}</p>
      </article>`;

    $('#tiles').innerHTML = [
      kafel('Wizyty dzisiaj', D.wizytyDzis.length, doPotwierdzenia ? `${doPotwierdzenia} czeka na potwierdzenie` : 'wszystkie potwierdzone'),
      kafel('Nowe zapytania', noweZapytania, 'ostatnie dziś o 22:41'),
      kafel(
        'Rezerwacje online (30 dni)',
        online30,
        `<span class="trend trend--up">${ikona('up')}+${wzrost}%</span> tydzień do tygodnia`
      ),
      kafel(
        'Wartość terapii w toku',
        zl(przychod),
        `<span class="trend trend--up">${ikona('up')}+14%</span> wobec zeszłego miesiąca`,
        true
      ),
    ].join('');
  }

  /* ── Pulpit: wykres ────────────────────────────────────────────────── */
  function renderChart() {
    const max = Math.max(...D.rezerwacjeTygodnie.map((t) => t.strona + t.telefon));
    $('#chart').innerHTML = D.rezerwacjeTygodnie.map((t) => {
      const suma = t.strona + t.telefon;
      const h = (n) => `${(n / max) * 100}%`;
      const etykieta = t.tydzien === 0 ? 'ten tydz.' : `−${Math.abs(t.tydzien)}`;
      return `<div class="bar">
        <span class="bar__sum">${suma}</span>
        <span class="bar__stack" role="img" aria-label="${etykieta}: ${t.strona} rezerwacji online, ${t.telefon} telefonicznie">
          <span class="bar__seg bar__seg--tel" style="height:${h(t.telefon)}"></span>
          <span class="bar__seg bar__seg--online" style="height:${h(t.strona)}"></span>
        </span>
        <span class="bar__label">${etykieta}</span>
      </div>`;
    }).join('');
  }

  /* ── Pulpit: dzisiejsze wizyty ─────────────────────────────────────── */
  const STATUS = {
    zakonczona: { tekst: 'zakończona', klasa: 'pill--done' },
    trwa: { tekst: 'trwa', klasa: 'pill--live' },
    potwierdzona: { tekst: 'potwierdzona', klasa: 'pill--ok' },
    niepotwierdzona: { tekst: 'bez potwierdzenia', klasa: 'pill--warn' },
  };

  function renderVisits() {
    $('#today-note').textContent = `${dlugaData(D.dzis)} · ${D.wizytyDzis.length} wizyt`;
    $('#visits').innerHTML = D.wizytyDzis.map((w) => {
      const p = PACJENCI[w.pacjent];
      const l = LINIE[p.linia];
      const s = STATUS[w.status];
      return `<li><button type="button" data-patient="${p.id}">
        <span class="visit__time">${w.godz}</span>
        <span class="visit__who"><span class="dot" style="--c:${l.kolor}"></span><span>${esc(p.imie)}</span></span>
        <span class="pill ${s.klasa}">${s.tekst}</span>
        <span class="visit__what">${esc(w.usluga)} · ${w.minuty} min · ${esc(ZESPOL[w.terapeuta].imie)} · ${esc(GABINETY[w.gabinet].nazwa)}</span>
      </button></li>`;
    }).join('');
  }

  /* ── Pulpit: zadania ───────────────────────────────────────────────── */
  const stanZadan = D.zadania.map((z) => ({ ...z }));

  function renderTasks() {
    $('#tasks').innerHTML = stanZadan
      .slice()
      .sort((a, b) => Number(a.zrobione) - Number(b.zrobione) || Number(b.pilne) - Number(a.pilne) || a.termin - b.termin)
      .map((z) => `<li class="task${z.zrobione ? ' is-done' : ''}">
        <label class="task__check">
          <input type="checkbox" data-task="${z.id}" ${z.zrobione ? 'checked' : ''} />
          <span class="visually-hidden">Odhacz: ${esc(z.tekst)}</span>
        </label>
        <span class="task__text">${esc(z.tekst)}</span>
        <span class="task__meta">
          ${z.pilne && !z.zrobione ? '<span class="tag tag--now">na dziś</span>' : `<span class="tag">${wzgledna(z.termin)}</span>`}
          <button class="btn btn--ghost btn--sm" type="button" data-patient="${z.pacjent}">Otwórz kartę</button>
        </span>
      </li>`)
      .join('');
  }

  /* ── Pulpit: lejek i źródła ────────────────────────────────────────── */
  function renderFunnel() {
    const liczby = ETAPY.map((e) => ({ ...e, ile: D.pacjenci.filter((p) => p.etap === e.id).length }));
    const max = Math.max(...liczby.map((e) => e.ile));
    $('#funnel').innerHTML = liczby
      .map(
        (e) => `<li>
          <span class="funnel__name">${e.nazwa}</span>
          <span class="funnel__val">${e.ile}</span>
          <span class="funnel__track"><span class="funnel__fill" style="width:${(e.ile / max) * 100}%"></span></span>
        </li>`
      )
      .join('');
  }

  function renderSources() {
    const liczby = D.zrodla.map((z) => ({ ...z, ile: D.pacjenci.filter((p) => p.zrodlo === z.id).length }));
    const suma = liczby.reduce((s, z) => s + z.ile, 0);
    $('#sources').innerHTML = liczby
      .sort((a, b) => b.ile - a.ile)
      .map(
        (z) => `<li>
          <span>${z.nazwa}</span>
          <b>${Math.round((z.ile / suma) * 100)}%</b>
          <span class="sources__track"><span class="sources__fill" style="width:${(z.ile / suma) * 100}%"></span></span>
        </li>`
      )
      .join('');
  }

  /* ── Kalendarz ─────────────────────────────────────────────────────── */
  const GODZ_OD = 8;
  const GODZ_DO = 20;
  const WYS = 52; // wysokość godziny w pikselach
  let filtrLinii = 'all';

  function poniedzialek() {
    const d = new Date(D.dzis);
    const dow = (d.getDay() + 6) % 7; // 0 = poniedziałek
    d.setDate(d.getDate() - dow);
    return d;
  }

  function renderCalFilters() {
    const chip = (id, nazwa, kolor) =>
      `<button class="chip" type="button" data-line="${id}" aria-pressed="${filtrLinii === id}">
        ${kolor ? `<span class="chip__key" style="--c:${kolor}"></span>` : ''}${nazwa}
      </button>`;
    $('#cal-filters').innerHTML = [chip('all', 'Wszystkie'), ...D.linie.map((l) => chip(l.id, l.nazwa, l.kolor))].join('');
  }

  function renderCal() {
    const pn = poniedzialek();
    const dni = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(pn);
      d.setDate(pn.getDate() + i);
      return d;
    });
    const godziny = Array.from({ length: GODZ_DO - GODZ_OD }, (_, i) => GODZ_OD + i);

    const naglowki = ['<div class="cal__head"></div>'].concat(
      dni.map((d) => {
        const dzis = d.toDateString() === D.dzis.toDateString();
        return `<div class="cal__head${dzis ? ' cal__head--today' : ''}">${DNI_KR[d.getDay()]} ${d.getDate()}<span>${dzis ? 'dzisiaj' : MIES[d.getMonth()].slice(0, 3)}</span></div>`;
      })
    );

    const kolumnaGodzin = `<div class="cal__hours">${godziny.map((g) => `<div class="cal__hour">${g}:00</div>`).join('')}</div>`;

    const kolumny = dni.map((_, i) => {
      const linie = godziny.map(() => '<div class="cal__line"></div>').join('');
      const wpisy = D.tydzien
        .filter((w) => w[0] === i)
        .map(([, start, pid, tid, minuty]) => {
          const p = PACJENCI[pid];
          const l = LINIE[p.linia];
          const top = (start - GODZ_OD) * WYS;
          const h = Math.max((minuty / 60) * WYS - 4, 34);
          const godz = `${Math.floor(start)}:${start % 1 ? '30' : '00'}`;
          const dim = filtrLinii !== 'all' && filtrLinii !== p.linia;
          return `<button class="event${dim ? ' is-dim' : ''}" type="button" data-patient="${p.id}" data-line="${p.linia}"
              style="--c:${l.kolor};top:${top + 2}px;height:${h}px">
            <b>${esc(p.imie)}</b><span>${godz} · ${esc(ZESPOL[tid].inicjaly)}</span>
          </button>`;
        })
        .join('');
      return `<div class="cal__col">${linie}${wpisy}</div>`;
    });

    $('#cal').innerHTML = naglowki.join('') + kolumnaGodzin + kolumny.join('');
  }

  /* ── Pacjenci ──────────────────────────────────────────────────────── */
  let filtrEtapu = 'all';

  function renderPatFilters() {
    const chip = (id, nazwa, ile) =>
      `<button class="chip" type="button" data-stage="${id}" aria-pressed="${filtrEtapu === id}">${nazwa} <span aria-hidden="true">${ile}</span></button>`;
    $('#pat-filters').innerHTML = [
      chip('all', 'Wszyscy', D.pacjenci.length),
      ...ETAPY.map((e) => chip(e.id, e.nazwa, D.pacjenci.filter((p) => p.etap === e.id).length)),
    ].join('');
  }

  function renderPatients() {
    const lista = D.pacjenci.filter((p) => filtrEtapu === 'all' || p.etap === filtrEtapu);
    $('#pat-count').textContent = `${lista.length} z ${D.pacjenci.length} pacjentów`;
    $('#patients-body').innerHTML = lista
      .map((p) => {
        const l = kolorPacjenta(p);
        const postep = p.plan ? Math.round((p.wizyt / p.plan) * 100) : 0;
        return `<tr tabindex="0" data-patient="${p.id}">
          <td>
            <span class="who">
              <span class="who__mark" style="--c:${l.kolor};--on:${l.naKolorze}">${inicjaly(p.imie)}</span>
              <span>
                <span class="who__name">${esc(p.imie)}</span>
                <span class="who__sub">${ETAP[p.etap]} · ${esc(ZRODLA[p.zrodlo].nazwa)}</span>
              </span>
            </span>
          </td>
          <td><span class="who"><span class="dot" style="--c:${l.kolor}"></span>${esc(l.nazwa)}</span></td>
          <td>${esc(ZESPOL[p.terapeuta].imie)}<br /><span class="who__sub">${esc(GABINETY[p.gabinet].nazwa)}</span></td>
          <td>
            <span class="progress">
              <span class="progress__track"><span class="progress__fill" style="--c:${l.kolor};width:${postep}%"></span></span>
              <b>${p.wizyt}/${p.plan || '—'}</b>
            </span>
          </td>
          <td>${wzgledna(p.ostatnia)}</td>
          <td>${p.nastepna === null ? '<span class="tag">brak terminu</span>' : wzgledna(p.nastepna)}</td>
          <td class="money">${p.wartosc ? zl(p.wartosc) : '—'}</td>
        </tr>`;
      })
      .join('');
  }

  /* ── Skrzynka ──────────────────────────────────────────────────────── */
  let otwartaWiadomosc = stanSkrzynki[0].id;

  function renderInbox() {
    const nowe = stanSkrzynki.filter((w) => w.nowa).length;
    $('#inbox-note').textContent = nowe ? `${nowe} nowe wiadomości` : 'wszystko przeczytane';
    $('#inbox').innerHTML = stanSkrzynki
      .map((w) => {
        const p = PACJENCI[w.pacjent];
        const l = LINIE[p.linia];
        return `<li class="${w.id === otwartaWiadomosc ? 'is-open' : ''}">
          <button type="button" data-msg="${w.id}">
            <span class="inbox__from">
              ${w.nowa ? '<span class="new-dot" aria-label="nowa"></span>' : `<span class="dot" style="--c:${l.kolor}"></span>`}
              ${esc(p.imie)}
            </span>
            <span class="inbox__time">${esc(w.czas)}</span>
            <span class="inbox__subj">${esc(w.kanal)} · ${esc(w.temat)}</span>
          </button>
        </li>`;
      })
      .join('');
    renderRail();
    $$('.rail__btn').forEach((b) => b.setAttribute('aria-current', String(!$(`#${b.dataset.view}`).hidden)));
  }

  function renderThread() {
    const w = stanSkrzynki.find((x) => x.id === otwartaWiadomosc);
    const p = PACJENCI[w.pacjent];
    const l = LINIE[p.linia];
    $('#thread').innerHTML = `
      <div class="thread__head">
        <div>
          <h2>${esc(w.temat)}</h2>
          <p class="card__note">${esc(p.imie)} · ${esc(w.kanal)} · ${esc(w.czas)}</p>
        </div>
        <span class="pill" style="background:${l.kolor};color:${l.naKolorze}">${esc(l.nazwa)}</span>
      </div>
      <p class="thread__msg">${esc(w.tresc)}</p>
      <div class="thread__reply">
        <label class="visually-hidden" for="reply">Odpowiedź</label>
        <textarea id="reply" placeholder="Napisz odpowiedź albo zaproponuj termin…"></textarea>
        <div class="thread__actions">
          <button class="btn btn--accent" type="button" data-reply>${ikona('sms')}Wyślij odpowiedź</button>
          <button class="btn" type="button" data-patient="${p.id}">Otwórz kartę pacjenta</button>
          <button class="btn btn--ghost" type="button" data-call="${esc(p.telefon)}">${ikona('phone')}${esc(p.telefon)}</button>
        </div>
      </div>`;
  }

  function otworzWiadomosc(id) {
    otwartaWiadomosc = id;
    const w = stanSkrzynki.find((x) => x.id === id);
    if (w) w.nowa = false;
    renderInbox();
    renderThread();
  }

  /* ── Automatyzacje ─────────────────────────────────────────────────── */
  const stanRegul = D.automatyzacje.map((a) => ({ ...a }));

  function renderRules() {
    $('#rules').innerHTML = stanRegul
      .map(
        (a) => `<article class="rule${a.wlaczona ? '' : ' is-off'}" data-rule="${a.id}">
          <div class="rule__top">
            <div>
              <h3>${esc(a.nazwa)}</h3>
              <p class="rule__when">${esc(a.kiedy)}</p>
            </div>
            <label class="switch">
              <input type="checkbox" data-switch="${a.id}" ${a.wlaczona ? 'checked' : ''} />
              <span></span>
              <span class="visually-hidden">Włącz automatyzację: ${esc(a.nazwa)}</span>
            </label>
          </div>
          <p>${esc(a.opis)}</p>
          <div class="rule__foot">
            <span>Wysłane w 30 dni: <b>${a.wyslane30}</b></span>
            <span>${esc(a.efekt)}</span>
          </div>
        </article>`
      )
      .join('');
  }

  /* ── Karta pacjenta ────────────────────────────────────────────────── */
  function historia(p) {
    const wpisy = [];
    if (p.nastepna !== null && p.nastepna !== undefined)
      wpisy.push({ kiedy: wzgledna(p.nastepna), co: 'Zaplanowana wizyta', kto: ZESPOL[p.terapeuta].imie });
    if (p.ostatnia !== null && p.ostatnia !== undefined)
      wpisy.push({ kiedy: wzgledna(p.ostatnia), co: `Wizyta ${p.wizyt} z ${p.plan || '—'}`, kto: ZESPOL[p.terapeuta].imie });
    if (p.wizyt > 1) wpisy.push({ kiedy: wzgledna(p.ostatnia - 7), co: 'Terapia i ćwiczenia domowe', kto: ZESPOL[p.terapeuta].imie });
    wpisy.push({ kiedy: wzgledna(p.od), co: p.etap === 'zapytanie' ? 'Zapytanie ze strony' : 'Pierwszy kontakt', kto: ZRODLA[p.zrodlo].nazwa });
    return wpisy;
  }

  function otworzPacjenta(id) {
    const p = PACJENCI[id];
    if (!p) return;
    const l = kolorPacjenta(p);
    $('#drawer-body').innerHTML = `
      <div class="pat__head">
        <span class="pat__mark" style="--c:${l.kolor};--on:${l.naKolorze}">${inicjaly(p.imie)}</span>
        <div>
          <h2 class="pat__name" id="drawer-name">${esc(p.imie)}</h2>
          <p class="pat__sub">${esc(l.nazwa)} · ${ETAP[p.etap]}</p>
        </div>
      </div>

      <dl class="pat__facts">
        <div><dt>Terapeuta</dt><dd>${esc(ZESPOL[p.terapeuta].imie)}</dd></div>
        <div><dt>Gabinet</dt><dd>${esc(GABINETY[p.gabinet].nazwa)}</dd></div>
        <div><dt>Postęp terapii</dt><dd>${p.wizyt} / ${p.plan || '—'}</dd></div>
        <div><dt>Wartość</dt><dd>${p.wartosc ? zl(p.wartosc) : '—'}</dd></div>
      </dl>

      <div class="pat__block">
        <h3>Kontakt</h3>
        <p class="pat__note">${esc(p.telefon)} · ${esc(p.email)}<br />Źródło: ${esc(ZRODLA[p.zrodlo].nazwa)}</p>
      </div>

      <div class="pat__block">
        <h3>Notatka terapeuty</h3>
        <p class="pat__note">${esc(p.notatka)}</p>
      </div>

      <div class="pat__block">
        <h3>Historia</h3>
        <ul class="timeline">
          ${historia(p)
            .map(
              (w) => `<li style="--c:${l.kolor}"><b>${esc(w.co)}</b><span>${esc(w.kiedy)} · ${esc(w.kto)}</span></li>`
            )
            .join('')}
        </ul>
      </div>

      <div class="pat__actions">
        <button class="btn btn--accent" type="button" data-book="${p.id}">${ikona('plus')}Umów wizytę</button>
        <button class="btn" type="button" data-sms="${p.id}">${ikona('sms')}Wyślij SMS</button>
        <button class="btn btn--ghost" type="button" data-call="${esc(p.telefon)}">${ikona('phone')}Zadzwoń</button>
      </div>`;
    const d = $('#drawer');
    d.hidden = false;
    document.body.style.overflow = 'hidden';
    $('.drawer__close').focus();
  }

  function zamknijPacjenta() {
    $('#drawer').hidden = true;
    document.body.style.overflow = '';
  }

  /* ── Wyszukiwarka ──────────────────────────────────────────────────── */
  function szukaj(fraza) {
    const out = $('#search-out');
    const q = fraza.trim().toLowerCase();
    if (q.length < 2) {
      out.hidden = true;
      return;
    }
    const trafienia = D.pacjenci
      .filter((p) => `${p.imie} ${p.telefon} ${LINIE[p.linia].nazwa}`.toLowerCase().includes(q))
      .slice(0, 6);
    out.hidden = false;
    out.innerHTML = trafienia.length
      ? trafienia
          .map((p) => {
            const l = LINIE[p.linia];
            return `<li><button type="button" data-patient="${p.id}">
              <span class="dot" style="--c:${l.kolor}"></span>${esc(p.imie)}<em>${ETAP[p.etap]}</em>
            </button></li>`;
          })
          .join('')
      : '<li class="search__empty">Brak pacjenta o takiej nazwie lub numerze.</li>';
  }

  /* ── Zdarzenia ─────────────────────────────────────────────────────── */
  function podlacz() {
    document.addEventListener('click', (e) => {
      const el = e.target.closest('button, [data-patient]');
      if (!el) return;
      const d = el.dataset;

      if (d.view) return pokazWidok(d.view);

      if (d.patient) {
        $('#search-out').hidden = true;
        return otworzPacjenta(d.patient);
      }
      if (d.line !== undefined && el.classList.contains('chip')) {
        filtrLinii = d.line;
        renderCalFilters();
        renderCal();
        return;
      }
      if (d.stage) {
        filtrEtapu = d.stage;
        renderPatFilters();
        renderPatients();
        return;
      }
      if (d.msg) return otworzWiadomosc(d.msg);
      if ('reply' in d) {
        const pole = $('#reply');
        if (!pole.value.trim()) {
          pole.focus();
          return toast('Napisz treść odpowiedzi — w demo i tak nic nie wysyłamy.');
        }
        pole.value = '';
        return toast('Demo: odpowiedź nie została nigdzie wysłana.');
      }
      if (d.call) return toast(`Demo: zadzwoniłbyś na ${d.call}.`);
      if (d.sms) return toast('Demo: SMS nie został wysłany.');
      if (d.book) return toast('Demo: tu otworzyłby się kalendarz z wolnymi terminami.');
      if ('close' in d) return zamknijPacjenta();
    });

    $('#drawer').addEventListener('click', (e) => {
      if (e.target.closest('[data-close]')) zamknijPacjenta();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!$('#drawer').hidden) zamknijPacjenta();
        $('#search-out').hidden = true;
      }
    });

    $('#patients-body').addEventListener('keydown', (e) => {
      const tr = e.target.closest('tr');
      if (tr && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        otworzPacjenta(tr.dataset.patient);
      }
    });

    document.addEventListener('change', (e) => {
      const t = e.target;
      if (t.dataset.task) {
        const z = stanZadan.find((x) => x.id === t.dataset.task);
        z.zrobione = t.checked;
        renderTasks();
        toast(z.zrobione ? 'Zadanie odhaczone.' : 'Zadanie wróciło na listę.');
      }
      if (t.dataset.switch) {
        const a = stanRegul.find((x) => x.id === t.dataset.switch);
        a.wlaczona = t.checked;
        if (!a.wlaczona) a.efekt = 'wyłączona';
        renderRules();
        toast(`${a.nazwa}: ${a.wlaczona ? 'włączona' : 'wyłączona'}.`);
      }
    });

    $('#search').addEventListener('input', (e) => szukaj(e.target.value));
    $('#search').addEventListener('focus', (e) => szukaj(e.target.value));
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search')) $('#search-out').hidden = true;
    });

    $('#add-visit').addEventListener('click', () => toast('Demo: tu otworzyłby się formularz nowej wizyty.'));

    $('#menu').addEventListener('click', () => {
      const app = $('.app');
      const otwarte = app.classList.toggle('is-open');
      $('#menu').setAttribute('aria-expanded', String(otwarte));
    });

    const bar = $('#demo-bar');
    try {
      if (sessionStorage.getItem('crm-bar-off')) bar.remove();
    } catch (_) {}
    bar?.querySelector('.demo-bar__close')?.addEventListener('click', () => {
      bar.remove();
      try {
        sessionStorage.setItem('crm-bar-off', '1');
      } catch (_) {}
    });
  }

  /* ── Start ─────────────────────────────────────────────────────────── */
  renderRail();
  renderTiles();
  renderChart();
  renderVisits();
  renderTasks();
  renderFunnel();
  renderSources();
  renderCalFilters();
  renderCal();
  renderPatFilters();
  renderPatients();
  renderInbox();
  renderThread();
  renderRules();
  podlacz();
  pokazWidok('pulpit');
})();
