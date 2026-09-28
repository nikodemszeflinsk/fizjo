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

  function najblizszy() {
    const teraz = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(teraz);
      d.setDate(teraz.getDate() + i);
      d.setHours(0, 0, 0, 0);
      if (!K.fizjoterapeuta.grafik.includes(d.getDay())) continue;
      const [od, doG] = d.getDay() === 6 ? K.godzinyWizyt.sobota : K.godzinyWizyt.tydzien;
      for (let h = od; h < doG; h++) {
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

  /* ── Otwarte teraz ──────────────────────────────────────────────────── */
  const el = $('#teraz');
  if (el) {
    const teraz = new Date();
    const dow = teraz.getDay();
    const zakres = K.fizjoterapeuta.grafik.includes(dow)
      ? dow === 6
        ? K.godzinyWizyt.sobota
        : K.godzinyWizyt.tydzien
      : null;
    const minuty = teraz.getHours() * 60 + teraz.getMinutes();
    const otwarte = zakres && minuty >= zakres[0] * 60 && minuty < zakres[1] * 60;
    el.hidden = false;
    el.className = `teraz ${otwarte ? 'is-open' : ''}`;
    el.innerHTML = otwarte
      ? `<span class="teraz__kropka" aria-hidden="true"></span>Otwarte teraz<em>do ${zakres[1]}:00</em>`
      : `<span class="teraz__kropka" aria-hidden="true"></span>Zamknięte<em>zostaw wiadomość</em>`;
  }
})();
