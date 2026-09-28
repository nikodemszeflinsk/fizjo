/* Karta pacjenta — to, co widzi pacjent po kliknięciu linku z SMS-a.
 *
 * Bez logowania: link zawiera identyfikator terapii. Pacjent odhacza ćwiczenia,
 * ocenia ból i może sam przełożyć wizytę; wszystko ląduje w tym samym magazynie,
 * z którego czyta panel. `?druk=1` otwiera wersję do wydrukowania.
 */
(() => {
  'use strict';

  const P = window.Panel;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (v) =>
    String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  const DNI_KR = ['nd', 'pn', 'wt', 'śr', 'cz', 'pt', 'sb'];
  const MIES = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
  const DNI = ['niedzielę', 'poniedziałek', 'wtorek', 'środę', 'czwartek', 'piątek', 'sobotę'];
  const tel = (t) => String(t).replace(/\s/g, '');
  const krotka = (isoData) => {
    const d = P.fromIso(isoData);
    return `${DNI_KR[d.getDay()]} ${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  /* ── Rysunki ćwiczeń ───────────────────────────────────────────────── */
  /* Pacjent, który nie pamięta pozycji, nie ćwiczy. Sylwetka wystarczy. */
  const RYSUNKI = {
    kleczenie:
      '<path d="M14 44h44" class="podloga"/><path d="M20 44V30c0-8 6-13 14-13h10c8 0 13 5 13 12"/><circle cx="60" cy="24" r="5"/><path d="M20 44v-6M34 44v-8M48 44v-7"/>',
    lezenie:
      '<path d="M8 44h56" class="podloga"/><path d="M14 44v-6h12l8-12 10 8 8-2v12"/><circle cx="16" cy="32" r="5"/>',
    siedzenie:
      '<path d="M12 56h48" class="podloga"/><path d="M26 56V34h16v22M26 34l-4-14M42 34l6-10"/><circle cx="34" cy="14" r="6"/><path d="M42 44h10"/>',
    sciana:
      '<path d="M10 8v52" class="podloga"/><path d="M18 14v22l14 2v22"/><circle cx="20" cy="10" r="5"/><path d="M32 38h14"/><path d="M14 60h40" class="podloga"/>',
    stanie:
      '<path d="M12 58h48" class="podloga"/><path d="M36 58V32M36 32l-8-12M36 32l8-12M36 32v-8"/><circle cx="36" cy="16" r="6"/><path d="M30 58h12"/>',
  };
  const rysunek = (id) =>
    `<svg class="cw__rys" viewBox="0 0 72 64" aria-hidden="true">${RYSUNKI[id] || RYSUNKI.stanie}</svg>`;

  /* ── Komunikat ─────────────────────────────────────────────────────── */
  let toastT;
  function toast(tekst) {
    $('#toast-text').textContent = tekst;
    $('#toast').classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(() => $('#toast').classList.remove('is-on'), 2600);
  }

  /* ── Z linku: ?t=<terapia> albo ?p=<pacjent> ───────────────────────── */
  const parametry = new URLSearchParams(location.search);
  const doDruku = parametry.get('druk') === '1';

  function znajdzTerapie() {
    const tid = parametry.get('t');
    if (tid && P.terapia(tid)) return P.terapia(tid);
    const pid = parametry.get('p');
    if (pid && P.terapiaPacjenta(pid)) return P.terapiaPacjenta(pid);
    return null;
  }

  function brak() {
    $('#karta').innerHTML = `
      <section class="blok blok--brak">
        <h1>Nie znaleźliśmy tej karty</h1>
        <p>Link mógł stracić ważność albo terapia została już zamknięta. Zadzwoń do gabinetu i poproś o nowy.</p>
        <p class="blok__tel"><a href="tel:${esc(tel(P.stan.ustawienia.telefon))}">${esc(P.stan.ustawienia.telefon)}</a></p>
      </section>`;
  }

  /* ── Plik .ics do kalendarza w telefonie ───────────────────────────── */
  function pobierzIcs(wizyta) {
    const u = P.stan.ustawienia;
    const usl = P.usluga(wizyta.uslugaId);
    const [y, m, d] = wizyta.data.split('-').map(Number);
    const [gh, gm] = wizyta.godzina.split(':').map(Number);
    const start = new Date(y, m - 1, d, gh, gm);
    const koniec = new Date(start.getTime() + (wizyta.minuty || 60) * 60000);
    const stamp = (dt) =>
      `${dt.getFullYear()}${String(dt.getMonth() + 1).padStart(2, '0')}${String(dt.getDate()).padStart(2, '0')}T${String(dt.getHours()).padStart(2, '0')}${String(dt.getMinutes()).padStart(2, '0')}00`;
    const tresc = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Studio Widok//Panel gabinetu//PL',
      'BEGIN:VEVENT',
      `UID:${wizyta.id}@panel-gabinetu`,
      `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(koniec)}`,
      `SUMMARY:${usl ? usl.nazwa : 'Wizyta'} — ${u.nazwa}`,
      `LOCATION:${u.adres}`,
      `DESCRIPTION:${u.terapeuta}, tel. ${u.telefon}`,
      'BEGIN:VALARM',
      'TRIGGER:-PT2H',
      'ACTION:DISPLAY',
      'DESCRIPTION:Wizyta za 2 godziny',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const blob = new Blob([tresc], { type: 'text/calendar;charset=utf-8' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'wizyta.ics' });
    document.body.append(a);
    a.click();
    a.remove();
    toast('Wizyta pobrana do kalendarza');
  }

  /* ── Przełożenie wizyty przez pacjenta ─────────────────────────────── */
  let przekladanaWizyta = null;

  function otworzPrzelozenie(wizyta) {
    przekladanaWizyta = wizyta;
    const dni = [...new Set(P.najblizszeTerminy(300).map((t) => t.data))].slice(0, 14);
    $('#modal-body').innerHTML = `
      <p class="modal__info">Twój termin: <strong>${krotka(wizyta.data)}, ${wizyta.godzina}</strong>. Wybierz nowy — stary od razu zwolni się dla kogoś innego.</p>
      <div class="field">
        <label for="pz-dzien">Dzień</label>
        <select id="pz-dzien">${dni.map((d) => `<option value="${d}">${krotka(d)}</option>`).join('')}</select>
      </div>
      <p class="modal__label">Wolne godziny</p>
      <div class="sloty" id="pz-sloty"></div>
      <p class="modal__err" id="pz-err" hidden></p>`;
    $('#modal').hidden = false;
    document.body.style.overflow = 'hidden';
    rysujSloty();
  }

  function rysujSloty() {
    const dzien = $('#pz-dzien').value;
    const wolne = P.wolneGodziny(dzien, przekladanaWizyta.minuty || 60, przekladanaWizyta.id);
    $('#pz-sloty').innerHTML = wolne.length
      ? wolne.map((g) => `<button class="slot" type="button" data-godz="${g}" aria-pressed="false">${g}</button>`).join('')
      : '<p class="pusto">W tym dniu nie ma wolnych godzin. Wybierz inny dzień.</p>';
  }

  function zamknijModal() {
    $('#modal').hidden = true;
    document.body.style.overflow = '';
    przekladanaWizyta = null;
  }

  function zapiszPrzelozenie() {
    const wybrana = $('#pz-sloty [aria-pressed="true"]');
    if (!wybrana) {
      $('#pz-err').textContent = 'Wybierz godzinę.';
      $('#pz-err').hidden = false;
      return;
    }
    const wynik = P.akcje.przelozWizyte(przekladanaWizyta.id, $('#pz-dzien').value, wybrana.dataset.godz);
    if (wynik.blad) {
      $('#pz-err').textContent = wynik.blad;
      $('#pz-err').hidden = false;
      return;
    }
    P.akcje.zapiszZdarzenie(wynik.wizyta.pacjentId, 'wizyta', 'Pacjent sam przełożył wizytę przez swoją kartę');
    zamknijModal();
    toast('Termin zmieniony. Gabinet już o tym wie.');
  }

  /* ── Seria dni pod rząd ────────────────────────────────────────────── */
  function seriaDni(tid) {
    let seria = 0;
    for (let i = 0; i < 60; i++) {
      const dzien = P.isoZa(-i);
      const jest = P.stan.odhaczenia.some((o) => o.terapiaId === tid && o.data === dzien);
      if (jest) seria++;
      else if (i > 0) break;
    }
    return seria;
  }

  /* ── Widok do druku ────────────────────────────────────────────────── */
  function renderDruk(t) {
    const p = P.pacjent(t.pacjentId);
    const u = P.stan.ustawienia;
    const dni = ['pn', 'wt', 'śr', 'cz', 'pt', 'sb', 'nd'];
    document.title = `Ćwiczenia — ${p.imie}`;
    $('#karta').innerHTML = `
      <div class="druk">
        <header class="druk__head">
          <div>
            <p class="druk__gabinet">${esc(u.nazwa)} · ${esc(u.terapeuta)}</p>
            <h1>Ćwiczenia domowe — ${esc(p.imie)}</h1>
            <p class="druk__terapia">${esc(t.etykieta)}${t.cel ? ` · cel: ${esc(t.cel)}` : ''}</p>
          </div>
          <p class="druk__tel">${esc(u.telefon)}<span>${esc(u.adres)}</span></p>
        </header>

        <table class="druk__tabela">
          <thead>
            <tr><th scope="col">Ćwiczenie</th><th scope="col">Ile</th>${dni.map((d) => `<th scope="col">${d}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${t.cwiczenia
              .map((c) => {
                const def = P.cwiczenie(c.cwiczenieId);
                return `<tr>
                  <td><strong>${esc(def ? def.nazwa : c.cwiczenieId)}</strong><em>${esc(def ? def.opis : '')}</em></td>
                  <td>${esc(c.powtorzenia)}<em>${c.razyWTygodniu}× w tygodniu</em></td>
                  ${dni.map(() => '<td class="druk__kratka"></td>').join('')}
                </tr>`;
              })
              .join('')}
          </tbody>
        </table>

        <p class="druk__stopka">Odhaczaj wykonane ćwiczenia w kratkach. Jeśli ból wyraźnie rośnie, przerwij i zadzwoń: ${esc(u.telefon)}.</p>
        <button class="btn btn--ink druk__btn" type="button" data-drukuj>Drukuj</button>
      </div>`;
    setTimeout(() => window.print(), 400);
  }

  /* ── Widok główny ──────────────────────────────────────────────────── */
  function render() {
    const t = znajdzTerapie();
    if (!t) return brak();
    if (doDruku) return renderDruk(t);

    const p = P.pacjent(t.pacjentId);
    const u = P.stan.ustawienia;
    const l = P.linia(t.linia);
    const imie = p.imie.split(' ')[0];
    const dzisIso = P.iso(P.dzis);
    const odbyte = P.odbyte(t.id);
    const proc = t.planWizyt ? Math.min(Math.round((odbyte / t.planWizyt) * 100), 100) : 0;
    const nast = P.nastepnaWizyta(t.id);
    const bolDzis = P.stan.bol.some((b) => b.terapiaId === t.id && b.data === dzisIso);
    const ostatniBol = P.bolTerapii(t.id).slice(-1)[0];
    const seria = seriaDni(t.id);

    const tydzien = Array.from({ length: 7 }, (_, i) => {
      const iso = P.isoZa(-(6 - i));
      return {
        iso,
        dzien: DNI_KR[P.fromIso(iso).getDay()],
        ile: P.stan.odhaczenia.filter((o) => o.terapiaId === t.id && o.data === iso).length,
        dzisiaj: iso === dzisIso,
      };
    });
    const cel = t.cwiczenia.length;

    const terminHtml = nast
      ? (() => {
          const d = P.fromIso(nast.data);
          const dni = P.dniOd(nast.data);
          const kiedy = dni === 0 ? 'dzisiaj' : dni === -1 ? 'jutro' : `w ${DNI[d.getDay()]}, ${d.getDate()} ${MIES[d.getMonth()]}`;
          return `<p class="termin__kiedy">${kiedy} o <strong>${nast.godzina}</strong></p>
            <p class="termin__gdzie">${esc(u.adres)}</p>
            <p class="termin__kto">${esc(u.terapeuta)} · <a href="tel:${esc(tel(u.telefon))}">${esc(u.telefon)}</a></p>
            <div class="termin__akcje">
              <button class="btn btn--ink" type="button" data-ics="${nast.id}">Dodaj do kalendarza</button>
              <button class="btn btn--linia" type="button" data-przeloz="${nast.id}">Nie mogę, przełóż</button>
            </div>`;
        })()
      : `<p class="termin__kiedy termin__kiedy--brak">Nie masz jeszcze umówionego kolejnego terminu.</p>
         <div class="termin__akcje"><a class="btn btn--ink" href="tel:${esc(tel(u.telefon))}">Zadzwoń i umów: ${esc(u.telefon)}</a></div>`;

    $('#karta').innerHTML = `
      <header class="naglowek" style="--c:${l.kolor}">
        <p class="naglowek__gabinet">${esc(u.nazwa)}</p>
        <h1 class="naglowek__h1">Cześć, ${esc(imie)}.<br />Oto Twoja terapia.</h1>
        <p class="naglowek__linia">${esc(t.etykieta)}</p>
      </header>

      ${t.cel ? `<section class="blok blok--cel"><p class="cel__label">Do czego dążymy</p><p class="cel__tekst">${esc(t.cel)}</p></section>` : ''}

      <section class="blok">
        <h2>Najbliższa wizyta</h2>
        <div class="termin">${terminHtml}</div>
      </section>

      <section class="blok">
        <h2>Ćwiczenia na dziś</h2>
        <p class="blok__note">Odhacz każde, które zrobisz. Twój fizjoterapeuta widzi to przed wizytą i wie, jak Ci idzie.</p>
        ${
          cel
            ? `<ul class="cw" id="cw">${t.cwiczenia
                .map((c) => {
                  const def = P.cwiczenie(c.cwiczenieId);
                  const zrobione = P.stan.odhaczenia.some(
                    (o) => o.terapiaId === t.id && o.cwiczenieId === c.cwiczenieId && o.data === dzisIso
                  );
                  return `<li>
                    <button class="cw__btn" type="button" data-cw="${c.cwiczenieId}" aria-pressed="${zrobione}">
                      <span class="cw__box" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M5 10.5 8.5 14 15 6.5" /></svg></span>
                      <span class="cw__tresc">
                        <strong>${esc(def ? def.nazwa : c.cwiczenieId)}</strong>
                        <em>${esc(c.powtorzenia)} · ${c.razyWTygodniu}× w tygodniu</em>
                        ${def && def.opis ? `<span class="cw__opis">${esc(def.opis)}</span>` : ''}
                      </span>
                      ${rysunek(def && def.rysunek)}
                    </button>
                  </li>`;
                })
                .join('')}</ul>
              <p class="cw__licznik" id="cw-licznik"></p>`
            : '<p class="blok__note">Na razie nie masz zadanych ćwiczeń. Dostaniesz je po najbliższej wizycie.</p>'
        }
      </section>

      <section class="blok">
        <h2>Ostatnie siedem dni</h2>
        <ul class="tydzien">
          ${tydzien
            .map(
              (d) => `<li class="${d.dzisiaj ? 'is-dzis' : ''}">
                <span class="tydzien__slupek" style="--h:${cel ? Math.min(d.ile / cel, 1) * 100 : 0}%;--c:${l.kolor}"></span>
                <span class="tydzien__dzien">${d.dzien}</span>
              </li>`
            )
            .join('')}
        </ul>
        <p class="blok__note">${
          seria >= 2 ? `Ćwiczysz ${seria} dni z rzędu. Tak to działa najlepiej.` : 'Wysokość słupka to ćwiczenia odhaczone danego dnia.'
        }</p>
      </section>

      <section class="blok">
        <h2>Plan wizyt</h2>
        <p class="plan__licz"><strong>${odbyte}</strong> z ${t.planWizyt} wizyt za Tobą</p>
        <span class="plan__track"><span class="plan__fill" style="--c:${l.kolor};width:${proc}%"></span></span>
      </section>

      <section class="blok blok--bol">
        <h2>Jak dziś z bólem?</h2>
        ${
          bolDzis
            ? `<p class="blok__note">Dziękujemy — dzisiejszą odpowiedź już mamy${ostatniBol ? ` (${ostatniBol.wartosc}/10)` : ''}. Zapytamy znowu jutro.</p>`
            : `<p class="blok__note">0 to brak bólu, 10 to najgorszy, jaki znasz. Jedno kliknięcie.</p>
               <div class="skala" id="skala">${Array.from({ length: 11 }, (_, i) => `<button class="skala__btn" type="button" data-bol="${i}">${i}</button>`).join('')}</div>`
        }
      </section>

      <footer class="stopka">
        <p>${esc(u.nazwa)} · ${esc(u.terapeuta)}</p>
        <p><a href="tel:${esc(tel(u.telefon))}">${esc(u.telefon)}</a> · ${esc(u.adres)}</p>
        <p class="stopka__note">Ta strona pokazuje plan ćwiczeń i terminy. Nie jest dokumentacją medyczną i nie zastępuje kontaktu z fizjoterapeutą. Jeśli ból wyraźnie rośnie, przerwij ćwiczenia i zadzwoń.</p>
      </footer>

      <a class="dzwon" href="tel:${esc(tel(u.telefon))}">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6.5 3.5h-2a1 1 0 0 0-1 1c0 6.6 5.4 12 12 12a1 1 0 0 0 1-1v-2L13 12l-1.5 1.5a8 8 0 0 1-4-4L9 8 6.5 3.5Z"/></svg>
        Zadzwoń do gabinetu
      </a>`;

    licznik(t, dzisIso);
  }

  function licznik(t, dzisIso) {
    const el = $('#cw-licznik');
    if (!el) return;
    const ile = P.stan.odhaczenia.filter((o) => o.terapiaId === t.id && o.data === dzisIso).length;
    el.textContent = ile === t.cwiczenia.length ? 'Wszystko na dziś zrobione. Dobra robota.' : `Odhaczone dzisiaj: ${ile} z ${t.cwiczenia.length}`;
    el.classList.toggle('is-gotowe', ile === t.cwiczenia.length);
  }

  /* ── Zdarzenia ─────────────────────────────────────────────────────── */
  document.addEventListener('click', (e) => {
    const el = e.target.closest('button');
    if (!el) return;
    const t = znajdzTerapie();

    if (el.dataset.drukuj !== undefined) return window.print();
    if (el.dataset.close !== undefined || el.classList.contains('modal__veil')) return zamknijModal();
    if (el.dataset.godz) {
      document.querySelectorAll('#pz-sloty .slot').forEach((s) => s.setAttribute('aria-pressed', String(s === el)));
      $('#pz-err').hidden = true;
      return;
    }
    if (el.dataset.zapisz === 'przelozenie') return zapiszPrzelozenie();
    if (!t) return;

    if (el.dataset.ics) {
      const w = P.stan.wizyty.find((x) => x.id === el.dataset.ics);
      return w && pobierzIcs(w);
    }
    if (el.dataset.przeloz) {
      const w = P.stan.wizyty.find((x) => x.id === el.dataset.przeloz);
      return w && otworzPrzelozenie(w);
    }
    if (el.dataset.cw) {
      const wynik = P.akcje.odhaczCwiczenie(t.id, el.dataset.cw, P.iso(P.dzis));
      return toast(wynik.odhaczone ? 'Odhaczone' : 'Cofnięte');
    }
    if (el.dataset.bol !== undefined) {
      P.akcje.zapiszBol(t.id, el.dataset.bol);
      toast('Dziękujemy za odpowiedź');
    }
  });

  document.addEventListener('change', (e) => {
    if (e.target.id === 'pz-dzien') rysujSloty();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#modal').hidden) zamknijModal();
  });

  P.subskrybuj(() => render());
  window.addEventListener('storage', () => render());
  render();
})();
