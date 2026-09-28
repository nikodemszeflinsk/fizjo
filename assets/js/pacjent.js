/* Karta pacjenta — to samo, co widzi pacjent po kliknięciu linku z SMS-a.
 *
 * Bez logowania: link zawiera identyfikator terapii. Pacjent odhacza ćwiczenia
 * i ocenia ból; jedno i drugie ląduje w tym samym magazynie, z którego czyta panel.
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

  let toastT;
  function toast(tekst) {
    $('#toast-text').textContent = tekst;
    $('#toast').classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(() => $('#toast').classList.remove('is-on'), 2600);
  }

  /* Z linku: ?t=<terapia> albo ?p=<pacjent>. */
  function znajdzTerapie() {
    const q = new URLSearchParams(location.search);
    const tid = q.get('t');
    if (tid && P.terapia(tid)) return P.terapia(tid);
    const pid = q.get('p');
    if (pid && P.terapiaPacjenta(pid)) return P.terapiaPacjenta(pid);
    return null;
  }

  function brak() {
    $('#karta').innerHTML = `
      <section class="blok blok--brak">
        <h1>Nie znaleźliśmy tej karty</h1>
        <p>Link mógł stracić ważność albo terapia została już zamknięta. Zadzwoń do gabinetu i poproś o nowy link.</p>
        <p class="blok__tel"><a href="tel:${esc(String(P.stan.ustawienia.telefon).replace(/\s/g, ''))}">${esc(P.stan.ustawienia.telefon)}</a></p>
      </section>`;
  }

  function render() {
    const t = znajdzTerapie();
    if (!t) return brak();

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

    /* Pasek siedmiu dni: ile ćwiczeń odhaczono każdego dnia. */
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
            <p class="termin__kto">${esc(u.terapeuta)} · <a href="tel:${esc(String(u.telefon).replace(/\s/g, ''))}">${esc(u.telefon)}</a></p>`;
        })()
      : `<p class="termin__kiedy termin__kiedy--brak">Nie masz jeszcze umówionego kolejnego terminu.</p>
         <p class="termin__kto"><a class="btn btn--ink" href="tel:${esc(String(u.telefon).replace(/\s/g, ''))}">Zadzwoń i umów: ${esc(u.telefon)}</a></p>`;

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
        <p class="blok__note">Wysokość słupka to ćwiczenia odhaczone danego dnia.</p>
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
        <p><a href="tel:${esc(String(u.telefon).replace(/\s/g, ''))}">${esc(u.telefon)}</a> · ${esc(u.adres)}</p>
        <p class="stopka__note">Ta strona pokazuje plan ćwiczeń i terminy. Nie jest dokumentacją medyczną i nie zastępuje kontaktu z fizjoterapeutą. Jeśli ból wyraźnie rośnie, przerwij ćwiczenia i zadzwoń.</p>
      </footer>`;

    licznik(t, dzisIso);
  }

  function licznik(t, dzisIso) {
    const el = $('#cw-licznik');
    if (!el) return;
    const ile = P.stan.odhaczenia.filter((o) => o.terapiaId === t.id && o.data === dzisIso).length;
    el.textContent = ile === t.cwiczenia.length ? 'Wszystko na dziś zrobione. Dobra robota.' : `Odhaczone dzisiaj: ${ile} z ${t.cwiczenia.length}`;
    el.classList.toggle('is-gotowe', ile === t.cwiczenia.length);
  }

  document.addEventListener('click', (e) => {
    const el = e.target.closest('button');
    if (!el) return;
    const t = znajdzTerapie();
    if (!t) return;

    if (el.dataset.cw) {
      const wynik = P.akcje.odhaczCwiczenie(t.id, el.dataset.cw, P.iso(P.dzis));
      toast(wynik.odhaczone ? 'Odhaczone' : 'Cofnięte');
      return;
    }
    if (el.dataset.bol !== undefined) {
      P.akcje.zapiszBol(t.id, el.dataset.bol);
      toast('Dziękujemy za odpowiedź');
    }
  });

  P.subskrybuj(() => render());
  window.addEventListener('storage', () => render());
  render();
})();
