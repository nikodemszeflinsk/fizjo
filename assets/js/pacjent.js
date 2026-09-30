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

  /* ── Miejsce na materiał ćwiczenia ─────────────────────────────────── */
  /* W demie stoi tu ramka zastępcza. Przy wdrożeniu wchodzi w nią nagranie
     albo zdjęcie z gabinetu — to, co terapeuta pokazuje pacjentowi na wizycie. */
  const miejsceNaMaterial = () => `
    <span class="cw__material" aria-hidden="true">
      <svg viewBox="0 0 64 48"><rect x="1" y="1" width="62" height="46" rx="7" /><path d="M26 17.5v13l11.5-6.5Z" /></svg>
      <span>nagranie<br />gabinetu</span>
    </span>`;

  /* ── Komunikat ─────────────────────────────────────────────────────── */
  let toastT;
  function toast(tekst) {
    $('#toast-text').textContent = tekst;
    $('#toast').classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(() => $('#toast').classList.remove('is-on'), 2600);
  }

  /** Strona gabinetu z rezerwacją — obok karty pacjenta w tym samym wdrożeniu. */
  const adresRezerwacji = () => `${location.pathname.replace(/pacjent\.html$/, '')}demo.html#rezerwacja`;

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
      `DESCRIPTION:${(P.terapeuta(wizyta.terapeutaId) || {}).imie || u.nazwa}, tel. ${u.telefon}`,
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
    /* Dni, w których prowadzący ma cokolwiek wolnego. */
    const dni = [];
    for (let i = 0; i < 28 && dni.length < 14; i++) {
      const dzien = P.isoZa(i);
      if (P.wolneGodziny(dzien, wizyta.minuty || 60, wizyta.id, wizyta.terapeutaId).length) dni.push(dzien);
    }
    $('#modal-body').innerHTML = `
      <p class="modal__info">Twój termin: <strong>${krotka(wizyta.data)}, ${wizyta.godzina}</strong>${
        P.terapeuta(wizyta.terapeutaId) ? ` u: ${esc(P.terapeuta(wizyta.terapeutaId).imie)}` : ''
      }. Wybierz nowy — stary od razu zwolni się dla kogoś innego.</p>
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
    /* Pacjent wraca do tej samej osoby, więc godziny liczymy z jej grafiku. */
    const wolne = P.wolneGodziny(dzien, przekladanaWizyta.minuty || 60, przekladanaWizyta.id, przekladanaWizyta.terapeutaId);
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

  /* ── Wypis po zakończonej terapii ──────────────────────────────────── */
  /* Pacjent, który skończył cykl, nie potrzebuje już listy ćwiczeń na dziś.
     Potrzebuje jednej kartki: co osiągnęliście, co robić dalej i jak wrócić. */
  function renderWypis(t) {
    const p = P.pacjent(t.pacjentId);
    const u = P.stan.ustawienia;
    const l = P.linia(t.linia);
    const w = t.wynik;
    const imie = p.imie.split(' ')[0];
    const spadek = w.bolStart !== null && w.bolKoniec !== null ? w.bolStart - w.bolKoniec : null;
    const zalecenia = P.notatkiPacjenta(p.id, true);
    document.title = `Podsumowanie terapii · ${u.nazwa}`;

    $('#karta').innerHTML = `
      <header class="naglowek" style="--c:${l.kolor}">
        <p class="naglowek__gabinet">${esc(u.nazwa)}</p>
        <h1 class="naglowek__h1">To już koniec cyklu,<br />${esc(imie)}.</h1>
        <p class="naglowek__linia">${esc(t.etykieta)} · ${esc(t.powodZakonczenia || 'terapia zakończona')}</p>
      </header>

      ${t.cel ? `<section class="blok blok--cel"><p class="cel__label">Cel, od którego zaczynaliśmy</p><p class="cel__tekst">${esc(t.cel)}</p></section>` : ''}

      <section class="blok">
        <h2>Co się udało</h2>
        <div class="wypis__liczby">
          <div><span>Wizyty</span><b>${w.wizytyOdbyte}</b><em>z ${w.planWizyt} zaplanowanych</em></div>
          <div><span>Ból</span><b>${w.bolStart !== null ? `${w.bolStart} → ${w.bolKoniec}` : '—'}</b><em>${
            spadek !== null && spadek > 0 ? `mniej o ${spadek} w skali 0–10` : 'w skali 0–10'
          }</em></div>
          <div><span>Ćwiczenia</span><b>${w.cwiczenia === null ? '—' : `${w.cwiczenia}%`}</b><em>z tego, co było zadane</em></div>
          <div><span>Czas</span><b>${w.dni !== null ? w.dni : '—'}</b><em>dni terapii</em></div>
        </div>
      </section>

      ${
        zalecenia.length
          ? `<section class="blok blok--od-terapeuty">
              <h2>Na dalej</h2>
              <ul class="od-terapeuty">
                ${zalecenia.map((n) => `<li><p>${esc(n.tekst)}</p><em>${krotka(n.kiedy)}</em></li>`).join('')}
              </ul>
            </section>`
          : ''
      }

      ${
        t.cwiczenia.length
          ? `<section class="blok">
              <h2>Ćwiczenia, które warto zostawić</h2>
              <p class="blok__note">Nie musisz robić wszystkiego codziennie. Te trzymają efekt, na który pracowaliśmy.</p>
              <ul class="wypis__cw">
                ${t.cwiczenia
                  .map((cw) => {
                    const def = P.cwiczenie(cw.cwiczenieId);
                    return `<li><strong>${esc(def ? def.nazwa : cw.cwiczenieId)}</strong><em>${esc(cw.powtorzenia)} · ${cw.razyWTygodniu}× w tygodniu</em></li>`;
                  })
                  .join('')}
              </ul>
              <a class="btn btn--linia" href="?t=${t.id}&druk=1">Wydrukuj kartę ćwiczeń</a>
            </section>`
          : ''
      }

      <section class="blok">
        <h2>Gdyby wróciło</h2>
        <p class="blok__note">
          Nawroty zdarzają się najczęściej przy zmianie obciążenia: nowa praca, powrót do sportu,
          dłuższy wyjazd. Nie czekaj, aż ból będzie taki jak na początku — wtedy wracamy do punktu wyjścia.
        </p>
        <div class="termin__akcje">
          <a class="btn btn--ink" href="${esc(adresRezerwacji())}">Zarezerwuj wizytę online</a>
          <a class="btn btn--linia" href="tel:${esc(tel(u.telefon))}">Zadzwoń: ${esc(u.telefon)}</a>
        </div>
      </section>

      <footer class="stopka">
        <p>${esc(u.nazwa)}${P.terapeuta(t.terapeutaId) ? ` · ${esc(P.terapeuta(t.terapeutaId).imie)}` : ''}</p>
        <p><a href="tel:${esc(tel(u.telefon))}">${esc(u.telefon)}</a> · ${esc(u.adres)}</p>
        <p class="stopka__note">To podsumowanie terapii, nie dokumentacja medyczna. Zachowaj je, gdyby przydało się przy kolejnej wizycie.</p>
      </footer>`;
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
            <p class="druk__gabinet">${esc(u.nazwa)}${P.terapeuta(t.terapeutaId) ? ` · ${esc(P.terapeuta(t.terapeutaId).imie)}` : ''}</p>
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
    /* Cykl zamknięty — zamiast bieżących ćwiczeń pacjent dostaje wypis. */
    if (t.status !== 'aktywna' && t.wynik) return renderWypis(t);

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
            <p class="termin__kto">${
              P.terapeuta(nast.terapeutaId) ? `${esc(P.terapeuta(nast.terapeutaId).imie)} · ` : ''
            }<a href="tel:${esc(tel(u.telefon))}">${esc(u.telefon)}</a></p>
            <div class="termin__akcje">
              <button class="btn btn--ink" type="button" data-ics="${nast.id}">Dodaj do kalendarza</button>
              <button class="btn btn--linia" type="button" data-przeloz="${nast.id}">Nie mogę, przełóż</button>
              <a class="btn btn--linia" href="${esc(adresRezerwacji())}">Zarezerwuj kolejną online</a>
            </div>`;
        })()
      : `<p class="termin__kiedy termin__kiedy--brak">Nie masz jeszcze umówionego kolejnego terminu.</p>
         <div class="termin__akcje">
           <a class="btn btn--ink" href="${esc(adresRezerwacji())}">Zarezerwuj online</a>
           <a class="btn btn--linia" href="tel:${esc(tel(u.telefon))}">Albo zadzwoń: ${esc(u.telefon)}</a>
         </div>`;

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

      ${(() => {
        const notatki = P.notatkiPacjenta(p.id, true);
        if (!notatki.length) return '';
        return `<section class="blok blok--od-terapeuty">
          <h2>Od Twojego fizjoterapeuty</h2>
          <ul class="od-terapeuty">
            ${notatki.map((n) => `<li><p>${esc(n.tekst)}</p><em>${krotka(n.kiedy)}</em></li>`).join('')}
          </ul>
        </section>`;
      })()}

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
                      ${miejsceNaMaterial()}
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
        <p>${esc(u.nazwa)}${P.terapeuta(t.terapeutaId) ? ` · ${esc(P.terapeuta(t.terapeutaId).imie)}` : ''}</p>
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
    /* Tło okna nie jest przyciskiem, więc sprawdzamy je osobno. */
    if (e.target.classList.contains('modal__veil')) return zamknijModal();

    const el = e.target.closest('button');
    if (!el) return;
    const t = znajdzTerapie();

    if (el.dataset.drukuj !== undefined) return window.print();
    if (el.dataset.close !== undefined) return zamknijModal();
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
