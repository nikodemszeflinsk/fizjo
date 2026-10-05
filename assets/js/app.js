/* Linia Ruchu — logika demo: kalendarz, rezerwacja, mapa, linia przewodnia. */
(() => {
  'use strict';

  const K = window.KLINIKA;
  if (!K) return;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const LINES = Object.fromEntries(K.linie.map((l) => [l.id, l]));
  const TEAM = K.zespol;
  const OSOBY = Object.fromEntries(TEAM.map((z) => [z.id, z]));
  const GABINET = K.gabinet;

  /** Kto zajmuje się danym problemem. */
  const osobyLinii = (lid) => TEAM.filter((z) => z.linie.includes(lid));
  /** „mgr Jan Kowalski" → „Jan Kowalski" tam, gdzie tytuł tylko zajmuje miejsce. */
  const bezTytulu = (imie) => String(imie).replace(/^(mgr|dr|lek\.?|prof\.?)\s+/i, '');
  const imieSame = (imie) => bezTytulu(imie).split(' ')[0];
  /* Każdy problem ma własną stronę — to ona odpowiada na pytanie z wyszukiwarki. */
  const PODSTRONY = {
    kregoslup: 'fizjoterapia-kregoslupa',
    sport: 'fizjoterapia-sportowa',
    uraz: 'rehabilitacja-po-operacji',
    biuro: 'bol-karku-i-barkow',
  };

  const SERVICES = {};
  K.linie.forEach((l) => l.uslugi.forEach((u) => (SERVICES[u.id] = { ...u, linia: l.id })));

  /* ── Ikony (jedna grubość kreski, jeden rysunek) ─────────────────────── */
  const ICON = {
    arrow: '<path d="M4 10h11m-4-4 4 4-4 4"/>',
    back: '<path d="M16 10H5m4-4-4 4 4 4"/>',
    check: '<path d="M5 10.5 8.5 14 15 6.5"/>',
    people:
      '<path d="M7.5 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2.5 17c0-2.8 2.2-5 5-5s5 2.2 5 5M13 4.2a3 3 0 0 1 0 5.6M14.5 12.3c1.8.6 3 2.3 3 4.7"/>',
    pin: '<path d="M10 17.5s5.5-4.8 5.5-9a5.5 5.5 0 1 0-11 0c0 4.2 5.5 9 5.5 9Zm0-7.3a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z"/>',
    route: '<path d="M3.5 9.5 16.5 3.5l-6 13-1.7-5.3Z"/>',
    calendar: '<path d="M4 5.5h12v11H4ZM4 8.5h12M7.5 3.5v3M12.5 3.5v3"/>',
    star: '<path d="M10 1.8l2.5 5.2 5.7.7-4.2 3.9 1.1 5.6L10 14.4l-5.1 2.8L6 11.6 1.8 7.7l5.7-.7Z"/>',
  };
  const icon = (name, cls = '') =>
    `<svg class="${cls}" viewBox="0 0 20 20" aria-hidden="true">${ICON[name]}</svg>`;

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  const zl = (n) => `${n.toLocaleString('pl-PL')} zł`;

  /* ── Placeholdery z konfiguracji ─────────────────────────────────────── */
  $$('[data-k]').forEach((el) => {
    const v = K[el.dataset.k];
    if (v) el.textContent = v;
  });

  /* ── Duoton: atrament + kolor linii ──────────────────────────────────── */
  const hexRgb = (h) => {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
  };
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

  (function injectDuotone() {
    const ink = hexRgb('#14171A');
    const paper = hexRgb('#F4F6F3');
    const tones = { ...Object.fromEntries(K.linie.map((l) => [l.id, l.kolor])), ink: '#5B6168' };
    const filters = Object.entries(tones)
      .map(([id, hex]) => {
        const c = hexRgb(hex);
        // Trzy przystanki: głęboki cień zabarwiony linią, sam kolor linii, jasny papier.
        const stops = [mix(ink, c, 0.18), mix(c, ink, 0.12), mix(c, paper, 0.55), paper];
        const ch = (i) => stops.map((s) => s[i].toFixed(3)).join(' ');
        return `<filter id="duo-${id}" color-interpolation-filters="sRGB">
          <feColorMatrix type="matrix" values="0.30 0.59 0.11 0 0  0.30 0.59 0.11 0 0  0.30 0.59 0.11 0 0  0 0 0 1 0"/>
          <feComponentTransfer>
            <feFuncR type="table" tableValues="${ch(0)}"/>
            <feFuncG type="table" tableValues="${ch(1)}"/>
            <feFuncB type="table" tableValues="${ch(2)}"/>
          </feComponentTransfer></filter>`;
      })
      .join('');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.style.position = 'absolute';
    svg.innerHTML = `<defs>${filters}</defs>`;
    document.body.prepend(svg);
  })();

  /* ── Kalendarz: deterministyczna dostępność z grafiku ────────────────── */
  const hash = (str) => {
    let h1 = 0xdeadbeef;
    for (let i = 0; i < str.length; i++) h1 = Math.imul(h1 ^ str.charCodeAt(i), 2654435761);
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    return ((h1 ^ (h1 >>> 13)) >>> 0) / 4294967296;
  };

  const DOW = ['nd', 'pn', 'wt', 'śr', 'cz', 'pt', 'sb'];
  const DOW_LONG = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
  const MONTHS = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];

  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const fromIso = (s) => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const DAYS = (() => {
    const out = [];
    for (let i = 0; out.length < 14 && i < 21; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      if (d.getDay() !== 0) out.push(d);
    }
    return out;
  })();

  const dayLabel = (d) => {
    const diff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - today) / 86400000);
    if (diff === 0) return 'dziś';
    if (diff === 1) return 'jutro';
    return `${DOW[d.getDay()]} ${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const dayLong = (d) => `${DOW_LONG[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  /* Biernik dla zdań typu „do zobaczenia w środę". */
  const DOW_BIERNIK = ['niedzielę', 'poniedziałek', 'wtorek', 'środę', 'czwartek', 'piątek', 'sobotę'];
  const dayWhen = (d) => `w ${DOW_BIERNIK[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;

  /** Godziny otwarcia gabinetu danego dnia: suma grafików zespołu. */
  function godzinyGabinetu(dow) {
    const zakresy = TEAM.map((z) => z.grafik[dow]).filter(Boolean);
    if (!zakresy.length) return null;
    return [Math.min(...zakresy.map((x) => x[0])), Math.max(...zakresy.map((x) => x[1]))];
  }

  /**
   * Wolne godziny w danym dniu. Każda osoba ma własny grafik, więc jeden termin
   * może być wolny u kilku osób naraz — slot niesie listę tych, którzy mogą go wziąć.
   */
  function slotsFor(d, filtr = {}) {
    const dow = d.getDay();
    let osoby = TEAM.filter((z) => z.grafik[dow]);
    if (filtr.osoba) osoby = osoby.filter((z) => z.id === filtr.osoba);
    if (filtr.line) osoby = osoby.filter((z) => z.linie.includes(filtr.line));
    if (!osoby.length) return [];

    const mapa = new Map();
    osoby.forEach((z) => {
      const [from, to] = z.grafik[dow];
      for (let h = from; h < to; h++) {
        const min = h % 2 ? 30 : 0;
        const at = new Date(d);
        at.setHours(h, min, 0, 0);
        if (at - now < 60 * 60 * 1000) continue; // nie wcześniej niż za godzinę
        if (hash(`${iso(d)}|${h}|${z.id}`) < 0.5) continue; // u tej osoby zajęte
        const klucz = `${h}:${String(min).padStart(2, '0')}`;
        if (!mapa.has(klucz)) mapa.set(klucz, { time: klucz, date: iso(d), at, osoby: [] });
        mapa.get(klucz).osoby.push(z);
      }
    });
    return [...mapa.values()].sort((a, b) => a.at - b.at);
  }

  /** Wszystkie wolne terminy, opcjonalnie w jednym dniu, u jednej osoby albo dla problemu. */
  function findSlots({ date, osoba, line } = {}) {
    const days = date ? [fromIso(date)] : DAYS;
    return days.flatMap((d) => slotsFor(d, { osoba, line })).sort((a, b) => a.at - b.at);
  }

  const nextSlot = (f) => findSlots(f)[0] || null;
  const slotText = (s) => (s ? `${dayLabel(s.at)}, ${s.time}` : 'brak w 2 tygodnie');

  /* ── Stan linii przewodniej ──────────────────────────────────────────── */
  const root = document.documentElement;
  function setGuide(lineId) {
    const l = LINES[lineId];
    root.style.setProperty('--guide', l ? l.kolor : 'var(--ink)');
    root.style.setProperty('--guide-on', l ? l.naKolorze : '#fff');
    $$('.line').forEach((b) => b.classList.toggle('is-chosen', b.dataset.line === lineId));
  }

  /* ── Tablica najbliższych terminów ───────────────────────────────────── */
  function renderBoard() {
    const picked = findSlots().slice(0, 3);
    const box = $('#board-rows');
    if (!picked.length) {
      box.innerHTML = '<li class="board__empty">Brak wolnych terminów w najbliższych dwóch tygodniach. Zadzwoń — znajdziemy miejsce.</li>';
      return;
    }
    box.innerHTML = picked
      .map(
        (s) => `<li><button class="board__row" type="button" data-slot="${s.date}|${s.time}">
          <span class="board__time">${s.time}</span>
          <span class="board__day">${dayLabel(s.at)}</span>
          <span class="board__line">${esc(GABINET.adres)}${icon('arrow', 'board__go')}</span>
          <span class="board__who">${s.osoby.map((z) => esc(imieSame(z.imie))).join(", ")}</span>
        </button></li>`
      )
      .join('');
  }

  /* ── Pięć linii w pierwszym ekranie ──────────────────────────────────── */
  function renderLines() {
    const lens = [60, 47, 66, 39, 53];
    const mr = [0, 14, 4, 22, 9];
    $('#lines').innerHTML = K.linie
      .map((l, i) => {
        const from = Math.min(...l.uslugi.map((u) => u.cena));
        const czas = Math.min(...l.uslugi.map((u) => u.minuty));
        return `<button class="line" type="button" role="listitem" data-line="${l.id}"
            style="--c:${l.kolor};--on:${l.naKolorze};--len-base:${lens[i]}%;--mr:${mr[i]}%;--i:${i}"
            aria-label="${esc(l.problem)} — ${esc(l.specjalizacja)}. Umów wizytę">
          <span class="line__stripe" aria-hidden="true"></span>
          <span class="line__stop" aria-hidden="true"></span>
          <span class="line__label">
            <span class="line__name">${esc(l.problem)}</span>
            <span class="line__meta">od ${czas} min · od ${zl(from)}</span>
          </span>
          ${icon('arrow', 'line__arrow')}
        </button>`;
      })
      .join('');
  }

  /* ── Specjalizacje ───────────────────────────────────────────────────── */
  function renderSpecs() {
    $('#specs').innerHTML = K.linie
      .map(
        (l) => `<article class="spec" id="linia-${l.id}" style="--c:${l.kolor};--on:${l.naKolorze}">
          <div class="spec__text">
            <h3 class="spec__stripe">${esc(l.problem)}</h3>
            <p class="spec__desc"><strong>${esc(l.specjalizacja)}.</strong> ${esc(l.opis)}</p>
            <ul class="chips" aria-label="Z czym przychodzą pacjenci">${l.objawy.map((o) => `<li>${esc(o)}</li>`).join('')}</ul>
            <ul class="services" aria-label="Usługi i ceny">
              ${l.uslugi
                .map(
                  (u) => `<li><span class="services__name">${esc(u.nazwa)}</span>
                    <span class="services__time">${u.minuty} min</span>
                    <span class="services__price">${zl(u.cena)}</span></li>`
                )
                .join('')}
            </ul>
            <div class="spec__akcje">
              <button class="btn btn--color spec__cta" type="button" data-start-line="${l.id}">
                Umów: ${esc(l.problem.toLowerCase())} ${icon('arrow')}
              </button>
              ${PODSTRONY[l.id] ? `<a class="spec__wiecej" href="${PODSTRONY[l.id]}.html">Więcej o tym problemie</a>` : ''}
            </div>
          </div>
          <figure class="spec__photo">
            <img class="duo" data-duo="${l.id}" src="${l.zdjecie}" alt="${esc(l.alt)}" width="1800" height="1200" loading="lazy" />
          </figure>
        </article>`
      )
      .join('');
  }

  /* ── Kto Cię przyjmie ──────────────────────────────────────────────── */
  function renderAbout() {
    $('#about').innerHTML = TEAM.map((z) => {
      const s = nextSlot({ osoba: z.id });
      const dni = [1, 2, 3, 4, 5, 6]
        .filter((d) => z.grafik[d])
        .map((d) => `${DOW[d]} ${z.grafik[d][0]}–${z.grafik[d][1]}`)
        .join(' · ');
      return `<article class="osoba-karta" style="--c:${z.kolor}">
        <figure class="osoba-karta__foto">
          <img class="duo" data-duo="${z.linie[0]}" src="${z.zdjecie}" alt="${esc(z.alt)}" width="720" height="900" loading="lazy" />
        </figure>
        <div class="osoba-karta__body">
          <h3 class="osoba-karta__name">${esc(z.imie)}</h3>
          <p class="osoba-karta__role">${esc(z.rola)}</p>
          <p class="osoba-karta__bio">${esc(z.bio)}</p>
          <ul class="osoba-karta__linie" aria-label="Czym się zajmuje">
            ${z.linie.map((lid) => `<li style="--c:${LINES[lid].kolor}">${esc(LINES[lid].problem)}</li>`).join('')}
          </ul>
          <ul class="osoba-karta__kursy" aria-label="Kursy i certyfikaty">
            ${z.kursy.map((k) => `<li>${esc(k)}</li>`).join('')}
          </ul>
          <p class="osoba-karta__grafik">Przyjmuje: ${dni}</p>
          <p class="osoba-karta__meta">Najbliższy termin: <strong>${slotText(s)}</strong></p>
          <button class="btn btn--color" type="button" data-start-osoba="${z.id}">
            Umów do: ${esc(imieSame(z.imie))} ${icon('arrow')}
          </button>
        </div>
      </article>`;
    }).join('');
  }

  function renderPrices() {
    $('#prices').innerHTML = K.linie
      .map(
        (l) => `<div class="price-group">
          <h3><span class="swatch" style="--c:${l.kolor}"></span>${esc(l.specjalizacja)}</h3>
          <table><tbody>${l.uslugi
            .map((u) => `<tr><td>${esc(u.nazwa)}</td><td>${u.minuty} min</td><td>${zl(u.cena)}</td></tr>`)
            .join('')}</tbody></table>
        </div>`
      )
      .join('');
  }

  function renderReviews() {
    $('#rating-stars').innerHTML = Array.from({ length: 5 }, () => icon('star')).join('');
    $('#reviews').innerHTML = K.opinie
      .map((o) => {
        const l = LINES[o.linia];
        return `<li class="review rv">
          <p class="review__line"><span class="swatch" style="--c:${l.kolor}"></span>${esc(l.specjalizacja)}</p>
          <blockquote>„${esc(o.tekst)}”</blockquote>
          <p class="review__who">${esc(o.autor)}</p>
        </li>`;
      })
      .join('');
  }

  function renderFaq() {
    $('#faq-list').innerHTML = K.faq
      .map(
        (f) => `<details><summary>${esc(f.q)}<span class="faq__icon" aria-hidden="true"></span></summary>
          <p class="faq__a">${esc(f.a)}</p></details>`
      )
      .join('');
  }

  function renderPlaces() {
    const p = GABINET;
    const s = nextSlot();
    const route = `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
    $('#places').innerHTML = `<li class="place" data-place="gabinet">
      <h3 class="place__name">${esc(p.adres)}</h3>
      <address class="place__addr">${esc(p.kod)}</address>
      <dl class="place__hours">${p.godziny.map(([d, h]) => `<dt>${d}</dt><dd>${h}</dd>`).join('')}</dl>
      <p class="place__more">${p.udogodnienia.map(esc).join(' · ')}</p>
      <p class="place__more">${esc(p.dojazd)}</p>
      <p class="place__more">Najbliższy wolny termin: <strong>${slotText(s)}</strong></p>
      <div class="place__actions">
        <a class="btn btn--line" href="${route}" target="_blank" rel="noopener">${icon('route')}Wyznacz trasę</a>
        <button class="btn btn--ink" type="button" data-book>Umów wizytę</button>
      </div>
    </li>`;

    $('#foot-places').innerHTML = `<p class="foot__h">Gabinet</p><div class="foot__places"><p><strong>${esc(K.nazwa)}</strong>${esc(p.adres)}<br />${esc(p.kod)}</p></div>`;
  }

  /* ── Mapa ────────────────────────────────────────────────────────────── */
  let map = null;
  const markers = {};

  function initMap() {
    const box = $('#map');
    const fail = () => {
      $('#map-fallback').hidden = false;
    };
    if (!window.L) return fail();

    map = L.map(box, { scrollWheelZoom: false, zoomControl: true, attributionControl: true });
    let tileErrors = 0;
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution: '&copy; OpenStreetMap &copy; CARTO',
    })
      .on('tileerror', () => ++tileErrors > 6 && fail())
      .addTo(map);

    const p = GABINET;
    const html = `<div class="pin" data-pin="gabinet"><div class="pin__head">${esc(K.nazwa)}</div><div class="pin__tail"></div></div>`;
    L.marker([p.lat, p.lng], {
      icon: L.divIcon({ className: '', html, iconSize: [140, 48], iconAnchor: [70, 48] }),
      title: `${K.nazwa} — ${p.adres}`,
      keyboard: true,
    }).addTo(map);
    map.setView([p.lat, p.lng], 15);
  }

  /* ── Rezerwacja ──────────────────────────────────────────────────────── */
  const STEPS = [
    { id: 'usluga', label: 'Usługa' },
    { id: 'termin', label: 'Termin' },
    { id: 'dane', label: 'Twoje dane' },
  ];

  const OPIS_MAX = 600;

  const B = {
    step: 0,
    line: null,
    service: null,
    osoba: null, // null = ktokolwiek wolny
    date: null,
    time: null,
    data: { name: '', phone: '', email: '', note: '', first: true, sms: true, consent: false },
    done: null,
  };

  const lineOf = () => LINES[B.line];

  /** Kto ostatecznie przyjmie: wybrana osoba albo pierwsza wolna w tym slocie. */
  function osobaWizyty() {
    if (B.osoba && OSOBY[B.osoba]) return OSOBY[B.osoba];
    const s = findSlots({ date: B.date, line: B.line }).find((x) => x.time === B.time);
    return (s && s.osoby[0]) || osobyLinii(B.line)[0] || TEAM[0];
  }

  function complete(i) {
    return [!!B.service, !!(B.date && B.time), false][i];
  }

  function firstOpen() {
    for (let i = 0; i < 2; i++) if (!complete(i)) return i;
    return 2;
  }

  /** Czyści wybory, które przestały pasować po zmianie wcześniejszego kroku. */
  function reconcile() {
    if (B.service && SERVICES[B.service].linia !== B.line) B.service = null;
    if (B.date && B.time && !findSlots({ date: B.date }).some((s) => s.time === B.time)) {
      B.date = B.time = null;
    }
  }

  function mountBooking() {
    $('#booking').innerHTML = `
      <div class="booking__main" id="booking-main"></div>
      <aside class="rail" aria-labelledby="rail-title">
        <h3 class="rail__title" id="rail-title">Twoja wizyta</h3>
        <ol class="rail__stops" id="rail-stops"></ol>
        <div class="rail__sum"><span id="rail-meta">Wybierz usługę</span><strong id="rail-price">—</strong></div>
      </aside>`;
    renderBooking(false);
  }

  function renderRail() {
    const l = lineOf();
    const svc = B.service && SERVICES[B.service];
    const when = B.date && B.time ? `${dayLong(fromIso(B.date))}, ${B.time}` : null;
    const values = [svc ? svc.nazwa : l ? `${l.specjalizacja} — wybierz usługę` : null, when, B.done ? B.data.name : null];
    const doneCount = B.done ? 3 : [0, 1].filter(complete).length;
    $('#rail-stops').style.setProperty('--rail', String(Math.min(doneCount, 2) / 2));
    $('#rail-stops').innerHTML = STEPS.map((s, i) => {
      const isDone = B.done || complete(i);
      const cur = !B.done && B.step === i;
      return `<li class="rail__stop${isDone ? ' is-done' : ''}${cur ? ' is-current' : ''}">
        <span class="rail__dot" aria-hidden="true"></span>
        <span class="rail__label">${s.label}</span>
        <span class="rail__value${values[i] ? '' : ' is-empty'}">${values[i] ? esc(values[i]) : 'jeszcze nie wybrano'}</span>
        ${isDone && !B.done && i < 2 && !cur ? `<button class="rail__edit" type="button" data-goto="${i}">Zmień<span class="visually-hidden"> — ${s.label}</span></button>` : ''}
      </li>`;
    }).join('');
    $('#rail-meta').textContent = svc ? `${svc.minuty} min · płatne na miejscu` : 'Wybierz usługę';
    $('#rail-price').textContent = svc ? zl(svc.cena) : '—';
  }

  function stepShell(i, title, body, { next = true, nextLabel = 'Dalej', nextDisabled = false } = {}) {
    return `<fieldset class="step is-entering" data-step="${i}">
      <p class="step__count">Krok ${i + 1} z ${STEPS.length}</p>
      <legend class="step__title" tabindex="-1">${title}</legend>
      ${body}
      <div class="step__nav">
        ${i > 0 ? `<button class="back" type="button" data-goto="${i - 1}">${icon('back')}Wstecz</button>` : '<span></span>'}
        ${next ? `<button class="btn btn--ink" type="button" data-next ${nextDisabled ? 'disabled' : ''}>${nextLabel}${icon('arrow')}</button>` : ''}
      </div>
    </fieldset>`;
  }

  function viewService() {
    const body = `
      <div class="options" role="radiogroup" aria-label="Czego dotyczy wizyta">
        ${K.linie
          .map(
            (l) => `<button class="opt" type="button" role="radio" aria-checked="${B.line === l.id}" data-pick-line="${l.id}" style="--c:${l.kolor}">
              <span class="opt__lead"><span class="swatch" style="--c:${l.kolor}"></span></span>
              <span class="opt__title">${esc(l.problem)}</span>
              <span class="opt__sub">${esc(l.specjalizacja)}</span>
            </button>`
          )
          .join('')}
      </div>
      ${
        B.line
          ? `<h4 class="sub-h">Rodzaj wizyty</h4>
        <div class="options options--wide" role="radiogroup" aria-label="Rodzaj wizyty">
          ${lineOf()
            .uslugi.map(
              (u) => `<button class="opt" type="button" role="radio" aria-checked="${B.service === u.id}" data-pick-service="${u.id}" style="--c:${lineOf().kolor}">
                <span class="opt__lead"><span class="swatch" style="--c:${lineOf().kolor}"></span></span>
                <span class="opt__title">${esc(u.nazwa)}</span>
                <span class="opt__sub">${u.minuty} minut${u.id.endsWith('1') ? ' · polecana na pierwszą wizytę' : ''}</span>
                <span class="opt__aside">${zl(u.cena)}</span>
              </button>`
            )
            .join('')}
        </div>`
          : ''
      }`;
    return stepShell(0, 'Z czym przychodzisz?', body, { nextDisabled: !B.service });
  }

  function viewTime() {
    const l = lineOf();
    const filtr = { osoba: B.osoba, line: B.line };
    const dostepni = osobyLinii(B.line);
    const counts = DAYS.map((d) => findSlots({ date: iso(d), ...filtr }).length);
    /* Po zmianie osoby zostajemy na wybranym dniu, nawet jeśli nic w nim nie ma.
       Ciche przeskoczenie na inny termin dezorientuje bardziej niż pusty dzień
       z wyjaśnieniem. Pierwsze wejście ustawia najbliższy dzień z wolnym. */
    const najblizszyWolny = counts.findIndex((n) => n > 0);
    if (!B.date) B.date = najblizszyWolny >= 0 ? iso(DAYS[najblizszyWolny]) : null;
    if (B.date && !counts[DAYS.findIndex((d) => iso(d) === B.date)]) B.time = null;
    const slots = B.date ? findSlots({ date: B.date, ...filtr }) : [];

    const body = `
      ${
        dostepni.length > 1
          ? `<div class="kto-wybor" role="group" aria-label="Kto ma przyjąć">
              <button class="kto-chip${B.osoba ? '' : ' is-on'}" type="button" data-pick-osoba="">Ktokolwiek wolny</button>
              ${dostepni
                .map(
                  (z) => `<button class="kto-chip${B.osoba === z.id ? ' is-on' : ''}" type="button" data-pick-osoba="${z.id}" style="--c:${z.kolor}">
                    <span class="kto-chip__mark"></span>${esc(bezTytulu(z.imie))}
                  </button>`
                )
                .join('')}
            </div>`
          : ''
      }
      <div class="days" role="group" aria-label="Wybierz dzień">
        ${DAYS.map(
          (d, i) => `<button class="day" type="button" data-pick-date="${iso(d)}" aria-pressed="${B.date === iso(d)}" ${counts[i] ? '' : 'disabled'}
              aria-label="${dayLong(d)}: ${counts[i] ? `${counts[i]} wolnych terminów` : 'brak wolnych terminów'}">
            <span class="day__dow">${DOW[d.getDay()]}</span>
            <span class="day__num">${d.getDate()}</span>
            <span class="day__free">${counts[i] ? `${counts[i]} wolne` : 'brak'}</span>
          </button>`
        ).join('')}
      </div>
      <h4 class="sub-h">${B.date ? `Godziny: ${dayLong(fromIso(B.date))}` : 'Godziny'}</h4>
      ${
        slots.length
          ? `<div class="slots" role="group" aria-label="Wybierz godzinę" style="--c:${l.kolor};--on:${l.naKolorze}">
            ${slots
              .map(
                (s) => `<button class="slot" type="button" data-pick-time="${s.time}" aria-pressed="${B.time === s.time}"
                  aria-label="${s.time}, przyjmie: ${s.osoby.map((z) => bezTytulu(z.imie)).join(' albo ')}">${s.time}${
                  !B.osoba && dostepni.length > 1 ? `<em>${s.osoby.map((z) => imieSame(z.imie)).join('/')}</em>` : ''
                }</button>`
              )
              .join('')}
          </div>`
          : `<div class="empty"><strong>${
              B.osoba ? `${esc(imieSame(OSOBY[B.osoba].imie))} nie ma tego dnia wolnych godzin.` : 'W tym dniu nie ma już wolnych godzin.'
            }</strong>
             ${
               najblizszyWolny >= 0
                 ? `Najbliższy wolny termin${B.osoba ? ' u tej osoby' : ''}: <button class="empty__skok" type="button" data-pick-date="${iso(DAYS[najblizszyWolny])}">${dayLong(DAYS[najblizszyWolny])}</button>.`
                 : `Zadzwoń, dobierzemy termin: ${esc(K.telefon)}.`
             }</div>`
      }`;
    return stepShell(1, 'Kiedy Ci pasuje?', body, { nextDisabled: !(B.date && B.time) });
  }

  /** Odpowiedzi z kwalifikatora zamieniamy w pierwsze zdania opisu — pacjent poprawia, a nie zaczyna od zera. */
  function opisZKwalifikatora() {
    const o = (typeof KW !== 'undefined' && KW.odp) || {};
    if (!o.gdzie) return '';
    const gdzie = { plecy: 'plecy albo krzyż', kark: 'kark, barki albo głowa', staw: 'staw (kolano, bark albo skokowy)', pooperacyjne: 'miejsce po operacji lub złamaniu' };
    const kiedy = { swieze: 'krócej niż dwa tygodnie', kilka: 'od kilku tygodni', dlugo: 'od miesięcy, wraca falami' };
    const co = { siedzenie: 'siedzenie i praca przy biurku', ruch: 'wysiłek lub trening', rano: 'poranna sztywność', uraz: 'konkretny uraz albo zabieg' };
    return [
      gdzie[o.gdzie] ? `Boli mnie: ${gdzie[o.gdzie]}.` : '',
      kiedy[o.kiedy] ? `Trwa ${kiedy[o.kiedy]}.` : '',
      co[o.co] ? `Gorzej jest przy: ${co[o.co]}.` : '',
    ]
      .filter(Boolean)
      .join(' ');
  }

  function viewData(errors = {}) {
    if (!B.data.note && !B.data.notePodpowiedziano) {
      B.data.note = opisZKwalifikatora();
      B.data.notePodpowiedziano = true;
    }
    const d = B.data;
    const field = (id, label, type, value, extra = '', full = false, auto = '') => `
      <div class="field${full ? ' field--full' : ''}">
        <label for="f-${id}">${label}</label>
        <input id="f-${id}" name="${id}" type="${type}" value="${esc(value)}" ${auto ? `autocomplete="${auto}"` : ''} ${extra}
          ${errors[id] ? `aria-invalid="true" aria-describedby="e-${id}"` : ''} />
        ${errors[id] ? `<p class="field__err" id="e-${id}">${errors[id]}</p>` : ''}
      </div>`;
    const body = `
      <div class="fields">
        ${field('name', 'Imię i nazwisko', 'text', d.name, 'placeholder="Jan Przykładowy"', true, 'name')}
        ${field('phone', 'Telefon', 'tel', d.phone, 'placeholder="+48 000 000 000" inputmode="tel"', false, 'tel')}
        ${field('email', 'E-mail <em>(opcjonalnie)</em>', 'email', d.email, 'placeholder="adres@email.com"', false, 'email')}
        <div class="field field--full field--opis">
          <label for="f-note">Opisz swoimi słowami, co Cię boli</label>
          <p class="field__hint" id="h-note">
            Nie musisz pisać po medycznemu. Terapeuta przeczyta to przed wizytą i przyjdzie
            przygotowany — to skraca pierwszą rozmowę i pozwala od razu przejść do sedna.
          </p>
          <textarea id="f-note" name="note" rows="4" maxlength="${OPIS_MAX}" aria-describedby="h-note f-note-licznik"
            placeholder="Np. ból lędźwi od dwóch tygodni, promieniuje do lewej nogi. Gorzej po siedzeniu, lepiej po spacerze.">${esc(d.note)}</textarea>
          <div class="field__pod">
            <span class="opis__podpowiedzi" role="group" aria-label="Podpowiedzi, od czego zacząć">
              <button class="opis__chip" type="button" data-opis-start="Boli mnie: ">Gdzie boli?</button>
              <button class="opis__chip" type="button" data-opis-start="Trwa od: ">Od kiedy?</button>
              <button class="opis__chip" type="button" data-opis-start="Gorzej jest, gdy: ">Co pogarsza?</button>
              <button class="opis__chip" type="button" data-opis-start="Pomaga: ">Co pomaga?</button>
            </span>
            <span class="opis__licznik" id="f-note-licznik" aria-live="off">${d.note.length}/${OPIS_MAX}</span>
          </div>
        </div>
        <label class="check field--full"><input type="checkbox" name="first" ${d.first ? 'checked' : ''} /> To moja pierwsza wizyta</label>
        <label class="check field--full"><input type="checkbox" name="sms" ${d.sms ? 'checked' : ''} /> Przypomnij mi SMS-em dzień przed wizytą</label>
        <div class="field field--full">
          <label class="check"><input type="checkbox" name="consent" ${d.consent ? 'checked' : ''} ${errors.consent ? 'aria-invalid="true" aria-describedby="e-consent"' : ''} />
            Zgadzam się na przetwarzanie danych w celu umówienia wizyty (regulamin i polityka prywatności — do uzupełnienia).</label>
          ${errors.consent ? `<p class="field__err" id="e-consent">${errors.consent}</p>` : ''}
        </div>
      </div>
      <p class="demo-note">Tryb demo: rezerwacja nie zostanie nigdzie wysłana.</p>`;
    return stepShell(2, 'Twoje dane', body, { nextLabel: 'Potwierdź wizytę' });
  }

  function viewDone() {
    const l = lineOf();
    const svc = SERVICES[B.service];
    return `<div class="done step is-entering" style="--c:${l.kolor};--on:${l.naKolorze}">
      <div class="done__mark">${icon('check')}</div>
      <h3 class="done__title" tabindex="-1">Do zobaczenia ${
        dayLabel(fromIso(B.date)) === 'jutro' ? 'jutro' : dayWhen(fromIso(B.date))
      }.</h3>
      <p class="done__code">Numer rezerwacji: <strong>${B.done}</strong></p>
      <dl class="done__list">
        <dt>Wizyta</dt><dd>${esc(svc.nazwa)} · ${svc.minuty} min · ${zl(svc.cena)}</dd>
        <dt>Prowadzi</dt><dd>${esc(osobaWizyty().imie)}</dd>
        <dt>Kiedy</dt><dd>${dayLong(fromIso(B.date))}, ${B.time}</dd>
        <dt>Gdzie</dt><dd>${esc(GABINET.adres)}, ${esc(GABINET.kod)}</dd>
        <dt>Potwierdzenie</dt><dd>${
          B.data.sms || !B.data.email.trim() ? 'SMS na ' + esc(B.data.phone) : 'e-mail na ' + esc(B.data.email)
        }</dd>
        ${
          B.data.note
            ? `<dt>Twój opis</dt><dd class="done__opis"><q>${esc(B.data.note)}</q><span>Terapeuta przeczyta to przed wizytą.</span></dd>`
            : ''
        }
      </dl>
      <div class="done__actions">
        <button class="btn btn--color" type="button" data-ics>${icon('calendar')}Dodaj do kalendarza</button>
        <a class="btn btn--line" href="https://www.google.com/maps/dir/?api=1&destination=${GABINET.lat},${GABINET.lng}" target="_blank" rel="noopener">${icon('route')}Wyznacz trasę</a>
        <button class="back" type="button" data-restart>Umów kolejną wizytę</button>
      </div>
      <ul class="done__dalej">
        <li>Dzień przed wizytą dostaniesz SMS z przypomnieniem.</li>
        <li>W SMS-ie jest link do Twojej karty: terminy, ćwiczenia i przycisk „nie mogę, przełóż”.</li>
        <li>Termin możesz zmienić sam, bez dzwonienia.</li>
      </ul>
      <p class="demo-note">Tryb demo: w prawdziwym wdrożeniu rezerwacja trafia do kalendarza gabinetu, a pacjent dostaje przypomnienie o wizycie e-mailem (pakiet Widoczność), w pakiecie Prowadzenie także SMS-em.</p>
    </div>`;
  }

  function renderBooking(focus = true, errors) {
    const main = $('#booking-main');
    if (!main) return;
    setGuide(B.line);
    if (B.done) main.innerHTML = viewDone();
    else main.innerHTML = [viewService, viewTime, () => viewData(errors)][B.step]();
    renderRail();
    if (focus) {
      const target = errors ? $('[aria-invalid="true"]', main) : $('.step__title, .done__title', main);
      target && target.focus({ preventScroll: true });
      const top = $('#booking').getBoundingClientRect().top;
      if (top < 0 || top > window.innerHeight * 0.6) {
        $('#rezerwacja').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      }
    }
  }

  function goto(i) {
    B.step = Math.max(0, Math.min(2, i));
    B.done = null;
    renderBooking();
  }

  function readForm() {
    const main = $('#booking-main');
    const val = (n) => ($(`[name="${n}"]`, main) || {}).value || '';
    const chk = (n) => !!($(`[name="${n}"]`, main) || {}).checked;
    B.data = {
      name: val('name').trim(),
      phone: val('phone').trim(),
      email: val('email').trim(),
      note: val('note').trim(),
      notePodpowiedziano: true,
      first: chk('first'),
      sms: chk('sms'),
      consent: chk('consent'),
    };
  }

  function validate() {
    const d = B.data;
    const e = {};
    if (d.name.length < 3) e.name = 'Podaj imię i nazwisko.';
    if (d.phone.replace(/\D/g, '').length < 9) e.phone = 'Podaj numer telefonu — wyślemy na niego przypomnienie.';
    /* E-mail jest opcjonalny — potwierdzenie i tak idzie SMS-em. Sprawdzamy go
       tylko wtedy, gdy ktoś go wpisał. */
    if (d.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email))
      e.email = 'Sprawdź adres e-mail — brakuje w nim „@” albo domeny.';
    if (!d.consent) e.consent = 'Bez tej zgody nie możemy zapisać wizyty.';
    return e;
  }

  function confirm() {
    readForm();
    const errors = validate();
    if (Object.keys(errors).length) return renderBooking(true, errors);
    const letters = 'ABCDEFGHJKLMNPRSTUWXYZ23456789';
    B.done = 'LR-' + Array.from({ length: 5 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
    try {
      localStorage.setItem('linia-ruchu-wizyta', JSON.stringify({ code: B.done, date: B.date, time: B.time, service: B.service, note: B.data.note }));
    } catch (_) {}
    renderBooking();
    toast(`Wizyta zarezerwowana: ${dayLabel(fromIso(B.date))}, ${B.time}`);
  }

  function downloadIcs() {
    const svc = SERVICES[B.service];
    const start = fromIso(B.date);
    const [h, m] = B.time.split(':').map(Number);
    start.setHours(h, m, 0, 0);
    const end = new Date(start.getTime() + svc.minuty * 60000);
    const f = (d) =>
      `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}00`;
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Linia Ruchu//Demo//PL',
      'BEGIN:VEVENT',
      `UID:${B.done}@linia-ruchu.demo`,
      `DTSTART:${f(start)}`,
      `DTEND:${f(end)}`,
      `SUMMARY:${svc.nazwa} — ${K.nazwa}`,
      `DESCRIPTION:${osobaWizyty().imie}. Numer rezerwacji ${B.done}. Zabierz wygodny strój.`,
      `LOCATION:${GABINET.adres}\\, ${GABINET.kod}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `wizyta-${B.done}.ics` });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /** Wejście do rezerwacji z dowolnego miejsca strony, z tym, co już wiadomo. */
  function startBooking(pre = {}) {
    B.done = null;
    if (pre.line) {
      B.line = pre.line;
      B.service = null;
      B.date = B.time = null;
    }
    /* Kwalifikator zna już usługę — rezerwacja zaczyna się od wyboru terminu. */
    if (pre.service) B.service = pre.service;
    B.osoba = pre.osoba || null;
    if (pre.date) {
      B.date = pre.date;
      B.time = pre.time;
      if (!B.line) B.line = K.linie[0].id;
      if (!B.service) B.service = LINES[B.line].uslugi[0].id;
    }
    reconcile();
    B.step = pre.date && B.service ? 2 : firstOpen();
    renderBooking(true);
    $('#rezerwacja').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }

  function onBookingClick(e) {
    const t = e.target.closest('button');
    if (!t || !$('#booking').contains(t)) return;
    const d = t.dataset;
    if (d.pickLine) {
      B.line = d.pickLine;
      if (B.osoba && !OSOBY[B.osoba].linie.includes(B.line)) B.osoba = null;
      reconcile();
      renderBooking(false);
      const first = $('[data-pick-service]', $('#booking-main'));
      first && first.focus();
    } else if (d.pickService) {
      B.service = d.pickService;
      goto(firstOpen());
    } else if (d.pickDate) {
      B.date = d.pickDate;
      B.time = null;
      renderBooking(false);
      const s = $('.slot', $('#booking-main'));
      s && s.focus();
    } else if (d.pickOsoba !== undefined) {
      B.osoba = d.pickOsoba || null;
      B.time = null;
      renderBooking(false);
    } else if (d.pickTime) {
      B.time = d.pickTime;
      goto(2);
    } else if ('goto' in d) {
      if (B.step === 2) readForm();
      goto(Number(d.goto));
    } else if ('next' in d) {
      if (B.step === 2) confirm();
      else goto(firstOpen() > B.step ? firstOpen() : B.step + 1);
    } else if ('ics' in d) {
      downloadIcs();
    } else if ('restart' in d) {
      Object.assign(B, { step: 0, line: null, service: null, osoba: null, date: null, time: null, done: null });
      B.data.consent = false;
      renderBooking();
    }
  }

  /* ── Komunikat ───────────────────────────────────────────────────────── */
  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-on'), 4200);
  }

  /* ── Linia przewodnia, przystanki, nawigacja ─────────────────────────── */
  function initGuide() {
    const journey = $('#journey');
    const fill = $('#guide-fill');
    const stops = $$('.stop', journey);
    let ticking = false;

    const update = () => {
      ticking = false;
      const r = journey.getBoundingClientRect();
      const probe = window.innerHeight * 0.55;
      const progress = Math.min(1, Math.max(0, (probe - r.top) / r.height));
      fill && fill.style.setProperty('--progress', progress.toFixed(4));
      stops.forEach((s) => s.classList.toggle('is-passed', s.getBoundingClientRect().top < probe));
      $('#top').classList.toggle('is-stuck', window.scrollY > 8);
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();

    const links = $$('.nav a');
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          links.forEach((a) => a.setAttribute('aria-current', String(a.getAttribute('href') === `#${en.target.id}`)));
        }),
      { rootMargin: '-45% 0px -50% 0px' }
    );
    stops.forEach((s) => io.observe(s));
  }

  /* ── Wejścia elementów ───────────────────────────────────────────────── */
  function initReveals() {
    $$('.visit__step').forEach((el, i) => el.style.setProperty('--i', i));
    const targets = [...$$('.spec'), $('#visit-steps'), $('.finale'), ...$$('.rv')].filter(Boolean);
    if (reduced || !('IntersectionObserver' in window)) {
      targets.forEach((t) => t.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add('is-in');
            io.unobserve(en.target);
          }
        }),
      { rootMargin: '0px 0px -12% 0px', threshold: 0.12 }
    );
    targets.forEach((t) => io.observe(t));
  }

  /* ── Globalne kliknięcia ─────────────────────────────────────────────── */
  function initClicks() {
    document.addEventListener('click', (e) => {
      const el = e.target.closest('a, button');
      if (!el) return;
      const d = el.dataset;

      /* Kwalifikator: odpowiedź, krok wstecz, reset, przejście do rezerwacji. */
      if (d.kw) {
        KW.odp[d.kw] = d.kwVal;
        KW.krok += 1;
        renderKw();
        return;
      }
      if ('kwWstecz' in d) {
        KW.krok = Math.max(0, KW.krok - 1);
        renderKw();
        return;
      }
      if ('kwReset' in d) {
        KW.krok = 0;
        KW.odp = {};
        renderKw();
        return;
      }
      if (d.kwUmow) {
        const u = SERVICES[d.kwUmow];
        return startBooking({ line: u.linia, service: u.id });
      }

      if (d.startOsoba) {
        const z = OSOBY[d.startOsoba];
        return startBooking({ line: z.linie[0], osoba: z.id });
      }
      if (el.matches('.line')) return startBooking({ line: d.line });
      if (d.startLine) return startBooking({ line: d.startLine });
      if (d.slot) {
        const [date, time] = d.slot.split('|');
        return startBooking({ date, time });
      }
      if ('book' in d) {
        e.preventDefault();
        $('#rezerwacja').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
        setTimeout(() => {
          const t = $('.step__title, .done__title', $('#booking-main'));
          t && t.focus({ preventScroll: true });
        }, reduced ? 0 : 600);
      }
    });

    $('#booking').addEventListener('click', onBookingClick);

    /* Podpowiedzi opisu: wstawiają początek zdania w miejsce kursora. */
    $('#booking').addEventListener('click', (e) => {
      const chip = e.target.closest('[data-opis-start]');
      if (!chip) return;
      const pole = $('#f-note');
      if (!pole) return;
      const start = chip.dataset.opisStart;
      const przed = pole.value;
      const sep = przed && !/[\s]$/.test(przed) ? ' ' : '';
      pole.value = (przed + sep + start).slice(0, OPIS_MAX);
      pole.focus();
      pole.setSelectionRange(pole.value.length, pole.value.length);
      pole.dispatchEvent(new Event('input', { bubbles: true }));
    });
    $('#booking').addEventListener('input', (e) => {
      if (e.target.id !== 'f-note') return;
      const l = $('#f-note-licznik');
      if (l) {
        l.textContent = `${e.target.value.length}/${OPIS_MAX}`;
        l.classList.toggle('is-blisko', e.target.value.length > OPIS_MAX - 60);
      }
    });

    const bar = $('#demo-bar');
    try {
      if (sessionStorage.getItem('demo-bar-off')) bar.remove();
    } catch (_) {}
    $('.demo-bar__close', bar)?.addEventListener('click', () => {
      bar.remove();
      try {
        sessionStorage.setItem('demo-bar-off', '1');
      } catch (_) {}
    });
  }

  /* ── Kwalifikator ────────────────────────────────────────────────────── */
  /* Trzy pytania zamiast przeglądania cennika. Odpowiedzi wskazują linię
     problemu i usługę, od której najsensowniej zacząć. */
  const PYTANIA = [
    {
      id: 'gdzie',
      tekst: 'Gdzie boli najbardziej?',
      opcje: [
        { id: 'plecy', tekst: 'Plecy albo krzyż', linia: 'kregoslup' },
        { id: 'kark', tekst: 'Kark, barki, głowa', linia: 'biuro' },
        { id: 'staw', tekst: 'Kolano, bark, staw skokowy', linia: 'sport' },
        { id: 'pooperacyjne', tekst: 'Miejsce po operacji lub złamaniu', linia: 'uraz' },
      ],
    },
    {
      id: 'kiedy',
      tekst: 'Od jak dawna?',
      opcje: [
        { id: 'swieze', tekst: 'Krócej niż dwa tygodnie' },
        { id: 'kilka', tekst: 'Od kilku tygodni' },
        { id: 'dlugo', tekst: 'Od miesięcy, wraca falami' },
      ],
    },
    {
      id: 'co',
      tekst: 'Co pogarsza objawy?',
      opcje: [
        { id: 'siedzenie', tekst: 'Siedzenie i praca przy biurku' },
        { id: 'ruch', tekst: 'Wysiłek, bieganie, trening' },
        { id: 'rano', tekst: 'Poranna sztywność' },
        { id: 'uraz', tekst: 'Konkretny uraz albo zabieg' },
      ],
    },
  ];

  const KW = { krok: 0, odp: {} };

  /** Usługa startowa dla linii i odpowiedzi — pierwsza wizyta zawsze diagnostyczna. */
  function kwUsluga(linia, odp) {
    const l = LINES[linia];
    if (!l) return null;
    if (odp.co === 'ruch' && l.uslugi.some((u) => /diagnostyka/i.test(u.nazwa)))
      return l.uslugi.find((u) => /diagnostyka/i.test(u.nazwa));
    if (odp.kiedy === 'swieze' && l.uslugi.some((u) => /manualna|tkanek/i.test(u.nazwa)))
      return l.uslugi.find((u) => /manualna|tkanek/i.test(u.nazwa));
    return l.uslugi.find((u) => /konsultacja/i.test(u.nazwa)) || l.uslugi[0];
  }

  function kwUzasadnienie(odp) {
    if (odp.co === 'ruch') return 'Objawy wracają przy wysiłku, więc zaczynamy od sprawdzenia, jak pracuje całe ciało w ruchu.';
    if (odp.co === 'siedzenie') return 'Ból od pozycji siedzącej najczęściej ma źródło poza miejscem, które boli — pierwsza wizyta to szukanie tego źródła.';
    if (odp.kiedy === 'swieze') return 'Świeży problem reaguje najlepiej, więc zaczynamy od terapii, nie od czekania.';
    if (odp.kiedy === 'dlugo') return 'Dolegliwość wraca falami, więc pierwsza wizyta idzie w stronę przyczyny, a nie doraźnej ulgi.';
    return 'Pierwsza wizyta to rozmowa, badanie ruchu i terapia — wychodzisz z planem na kolejne tygodnie.';
  }

  function renderKw() {
    const box = $('#kw');
    if (!box) return;

    if (KW.krok >= PYTANIA.length) {
      const linia = PYTANIA[0].opcje.find((o) => o.id === KW.odp.gdzie).linia;
      const l = LINES[linia];
      const u = kwUsluga(linia, KW.odp);
      const slot = nextSlot();
      box.innerHTML = `<div class="kw__wynik" style="--c:${l.kolor};--on:${l.naKolorze}">
        <p class="kw__label">Na podstawie Twoich odpowiedzi</p>
        <h3 class="kw__h3">${esc(l.specjalizacja)}</h3>
        <p class="kw__dlaczego">${esc(kwUzasadnienie(KW.odp))}</p>
        <dl class="kw__dane">
          <div><dt>Zaczynamy od</dt><dd>${esc(u.nazwa)}</dd></div>
          <div><dt>Czas i koszt</dt><dd>${u.minuty} min · ${zl(u.cena)}</dd></div>
          <div><dt>Najbliższy termin</dt><dd>${slot ? `${dayLong(slot.at)}, ${slot.time}` : 'zadzwoń, dobierzemy termin'}</dd></div>
        </dl>
        <div class="kw__akcje">
          <button class="btn btn--color btn--lg" type="button" data-kw-umow="${u.id}">Wybierz termin</button>
          <button class="back" type="button" data-kw-reset>Zacznij od nowa</button>
        </div>
        <p class="kw__uwaga">To podpowiedź, nie diagnoza. Na wizycie sprawdzamy, czy kierunek jest właściwy — jeśli nie, mówimy to wprost.</p>
      </div>`;
      return;
    }

    const q = PYTANIA[KW.krok];
    box.innerHTML = `<div class="kw__pytanie">
      <p class="kw__licznik">Pytanie ${KW.krok + 1} z ${PYTANIA.length}</p>
      <h3 class="kw__h3">${esc(q.tekst)}</h3>
      <div class="kw__opcje">
        ${q.opcje
          .map(
            (o) => `<button class="kw__opcja" type="button" data-kw="${q.id}" data-kw-val="${o.id}"
              ${o.linia ? `style="--c:${LINES[o.linia].kolor}"` : ''}>
              ${o.linia ? '<span class="kw__kreska"></span>' : ''}${esc(o.tekst)}
            </button>`
          )
          .join('')}
      </div>
      ${KW.krok ? '<button class="back" type="button" data-kw-wstecz>Wróć</button>' : ''}
    </div>`;
  }

  /* ── Otwarte teraz ───────────────────────────────────────────────────── */
  function renderTeraz() {
    const el = $('#teraz');
    if (!el) return;
    const teraz = new Date();
    const dow = teraz.getDay();
    const zakres = godzinyGabinetu(dow);
    const minuty = teraz.getHours() * 60 + teraz.getMinutes();
    const otwarte = zakres && minuty >= zakres[0] * 60 && minuty < zakres[1] * 60;
    el.hidden = false;
    el.className = `teraz ${otwarte ? 'is-open' : ''}`;
    if (otwarte) {
      el.innerHTML = `<span class="teraz__kropka" aria-hidden="true"></span>Otwarte teraz<em>do ${zakres[1]}:00</em>`;
      return;
    }
    /* Najbliższy dzień, w którym ktokolwiek z zespołu przyjmuje. */
    for (let i = 1; i <= 7; i++) {
      const d = new Date(teraz);
      d.setDate(teraz.getDate() + i);
      const g = godzinyGabinetu(d.getDay());
      if (!g) continue;
      const od = g[0];
      el.innerHTML = `<span class="teraz__kropka" aria-hidden="true"></span>Zamknięte<em>${i === 1 ? 'jutro' : dayLong(d)} od ${od}:00</em>`;
      return;
    }
    el.hidden = true;
  }

  /* ── Start ───────────────────────────────────────────────────────────── */
  renderLines();
  renderBoard();
  renderSpecs();
  renderAbout();
  renderPrices();
  renderReviews();
  renderFaq();
  renderPlaces();
  renderKw();
  renderTeraz();
  mountBooking();
  initClicks();
  initGuide();
  initReveals();

  const fin = nextSlot();
  $('#finale-next').textContent = fin
    ? `${dayLabel(fin.at)}, ${fin.time} — ${fin.osoby.map((z) => imieSame(z.imie)).join(' lub ')}`
    : 'zadzwoń, znajdziemy miejsce';

  // Linie wjeżdżają dopiero, gdy krój jest gotowy — inaczej podpisy przeskoczą.
  const reveal = () => requestAnimationFrame(() => $('#lines').classList.add('is-in'));
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(reveal);
  setTimeout(reveal, 900);

  // Leaflet ładuje się z opóźnieniem (defer) — mapa startuje, gdy jest gotowy.
  if (window.L) initMap();
  else window.addEventListener('load', initMap, { once: true });

  // Powrót pacjenta z zarezerwowaną wizytą.
  try {
    const saved = JSON.parse(localStorage.getItem('linia-ruchu-wizyta') || 'null');
    if (saved && fromIso(saved.date) >= today) {
      setTimeout(() => toast(`Twoja wizyta: ${dayLabel(fromIso(saved.date))}, ${saved.time} · nr ${saved.code}`), 1400);
    }
  } catch (_) {}
})();
