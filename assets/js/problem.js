/* Podstrona problemowa — statyczna treść, a z danych gabinetu tylko to,
 * co i tak musi być aktualne: telefon, adres, cennik linii i najbliższy termin. */
(() => {
  'use strict';

  const K = window.KLINIKA;
  if (!K) return;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const zl = (n) => `${n.toLocaleString('pl-PL')} zł`;

  /* Którą linię opisuje ta strona — po nazwie pliku. */
  const PLIKI = {
    'fizjoterapia-kregoslupa': 'kregoslup',
    'fizjoterapia-sportowa': 'sport',
    'rehabilitacja-po-operacji': 'uraz',
    'bol-karku-i-barkow': 'biuro',
  };
  const nazwaPliku = location.pathname.split('/').pop().replace('.html', '');
  const linia = K.linie.find((l) => l.id === PLIKI[nazwaPliku]) || K.linie[0];

  /* Placeholdery z konfiguracji, tak samo jak na stronie głównej. */
  $$('[data-k]').forEach((el) => {
    const v = K[el.dataset.k];
    if (typeof v === 'string') el.textContent = v;
  });
  $$('[data-k="miasto"]').forEach((el) => (el.textContent = K.gabinet.kod ? K.gabinet.kod.split(' ').slice(1).join(' ') || '[Twoje Miasto]' : '[Twoje Miasto]'));
  $$('[data-k="telefon"]').forEach((el) => (el.textContent = K.telefon || '+48 000 000 000'));
  const adres = $('#pro-adres');
  if (adres) adres.textContent = `${K.gabinet.adres}, ${K.gabinet.kod}`;

  /* ── Cennik tej linii ───────────────────────────────────────────────── */
  const cennik = $('#pro-cennik');
  if (cennik) {
    cennik.innerHTML = `<table class="pro-tabela">
      <caption>Cennik: ${esc(linia.specjalizacja.toLowerCase())}</caption>
      <thead><tr><th scope="col">Usługa</th><th scope="col">Czas</th><th scope="col">Cena</th></tr></thead>
      <tbody>
        ${linia.uslugi
          .map((u) => `<tr><td>${esc(u.nazwa)}</td><td>${u.minuty} min</td><td>${zl(u.cena)}</td></tr>`)
          .join('')}
      </tbody>
    </table>
    <p class="pro-tabela__note">Płatność kartą albo gotówką po wizycie. Faktura na życzenie. Odwołanie bez kosztu do 24 godzin przed terminem.</p>`;
  }

  /* ── Najbliższy wolny termin ────────────────────────────────────────── */
  const DNI = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
  const MIES = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];

  /** Kto z zespołu zajmuje się problemem opisanym na tej stronie. */
  const osoby = K.zespol.filter((z) => z.linie.includes(linia.id));

  /** Godziny, w których ktokolwiek od tego problemu przyjmuje danego dnia. */
  function godzinyDnia(dow) {
    const zakresy = osoby.map((z) => z.grafik[dow]).filter(Boolean);
    if (!zakresy.length) return null;
    return [Math.min(...zakresy.map((x) => x[0])), Math.max(...zakresy.map((x) => x[1]))];
  }

  function najblizszy() {
    const teraz = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(teraz);
      d.setDate(teraz.getDate() + i);
      d.setHours(0, 0, 0, 0);
      const zakres = godzinyDnia(d.getDay());
      if (!zakres) continue;
      for (let h = zakres[0]; h < zakres[1]; h++) {
        const kiedy = new Date(d);
        kiedy.setHours(h, h % 2 ? 30 : 0, 0, 0);
        if (kiedy - teraz > 2 * 3600 * 1000) return kiedy;
      }
    }
    return null;
  }

  const termin = $('#pro-termin');
  if (termin) {
    const t = najblizszy();
    termin.innerHTML = t
      ? `Najbliższy wolny termin: <strong>${DNI[t.getDay()]}, ${t.getDate()} ${MIES[t.getMonth()]}, ${t.getHours()}:${String(t.getMinutes()).padStart(2, '0')}</strong>`
      : 'Zadzwoń — dobierzemy termin poza grafikiem.';
  }

  /* ── Kto się tym zajmuje ────────────────────────────────────────────── */
  const ktoBox = $('#pro-kto');
  if (ktoBox && osoby.length) {
    ktoBox.innerHTML = osoby
      .map(
        (z) => `<article class="pro-osoba" style="--c:${z.kolor}">
          <img src="${z.zdjecie}" alt="${esc(z.alt)}" width="200" height="200" loading="lazy" />
          <div>
            <h3>${esc(z.imie)}</h3>
            <p class="pro-osoba__rola">${esc(z.rola)}</p>
            <p class="pro-osoba__bio">${esc(z.bio)}</p>
            <p class="pro-osoba__grafik">Przyjmuje: ${[1, 2, 3, 4, 5, 6]
              .filter((d) => z.grafik[d])
              .map((d) => `${['nd', 'pn', 'wt', 'śr', 'cz', 'pt', 'sb'][d]} ${z.grafik[d][0]}–${z.grafik[d][1]}`)
              .join(' · ')}</p>
          </div>
        </article>`
      )
      .join('');
  }

  /* ── Otwarte teraz ──────────────────────────────────────────────────── */
  const el = $('#teraz');
  if (el) {
    const teraz = new Date();
    const zakres = godzinyDnia(teraz.getDay());
    const minuty = teraz.getHours() * 60 + teraz.getMinutes();
    const otwarte = zakres && minuty >= zakres[0] * 60 && minuty < zakres[1] * 60;
    el.hidden = false;
    el.className = `teraz ${otwarte ? 'is-open' : ''}`;
    el.innerHTML = otwarte
      ? `<span class="teraz__kropka" aria-hidden="true"></span>Otwarte teraz<em>do ${zakres[1]}:00</em>`
      : `<span class="teraz__kropka" aria-hidden="true"></span>Zamknięte<em>zostaw wiadomość</em>`;
  }
})();
