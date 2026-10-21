/*
 * Personalizacja oferty linkiem z CRM: ?l=<id leada>&dla=<nazwa gabinetu>&p=<individual|enterprise>&s=1&z=1
 *  - pasek „Oferta przygotowana dla …”,
 *  - znaczek „Polecany dla Państwa” przy wskazanym pakiecie,
 *  - przyciski „Rozpocznij wdrożenie” prowadzą do konfiguratora z ustawionym pakietem, dodatkami i leadem,
 *  - zdarzenia dla CRM (tylko z id leada i skonfigurowanym odbiornikiem): „oferta otwarta” raz na sesję oraz „zadzwoń” po kliknięciu telefonu.
 * Bez parametrów strona wygląda jak zwykle, a przyciski prowadzą do konfiguratora bez danych leada.
 */
(function () {
  'use strict';
  var q = new URLSearchParams(location.search);
  var lead = (q.get('l') || '').slice(0, 40);
  var dla = (q.get('dla') || '').slice(0, 90);
  var pakiet = q.get('p');
  var ot = (q.get('o') || '').slice(0, 80); /* token oferty z CRM: pozwala dostać link do umowy po kliknięciu „Rozpocznij wdrożenie” */
  var PAK = { individual: { nazwa: 'Individual', wdr: 2900, utr: 149 }, enterprise: { nazwa: 'Team', wdr: 4499, utr: 299 } };
  var sms = q.get('s') === '1', zal = q.get('z') === '1', pil = q.get('pil') === '1';
  var PILOT_WDR = { individual: 1900, enterprise: 2999 };
  function zl(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' zł'; }
  function b64u(t) { return btoa(unescape(encodeURIComponent(t))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }

  /* Standardowe pakiety są „na razie niedostępne”, dopóki trwa pilotaż; gdy pilotaż się kończy (termin albo brak miejsc), wracają. */
  function udostepnijPakiety() {
    document.querySelectorAll('[data-pakiety-standard]').forEach(function (e) { e.classList.remove('ofs-ceny--niedostepne'); });
  }

  var pilotWazny = true; /* po terminie pilotażu z oferty (licznik) nie niesiemy pilotażu do umowy */

  /* Adres konfiguratora: z leadem przez token (jak link do umowy z CRM), bez leada przez ?p=. */
  function adresStartu(p, pilotaz) {
    var wybrany = PAK[p] ? p : (PAK[pakiet] ? pakiet : '');
    var wPilotazu = pilotWazny && (pilotaz || pil);
    if (lead && wybrany) return 'umowa.html?d=' + b64u(JSON.stringify({ l: lead, g: dla, m: '', p: wybrany, s: sms ? 1 : 0, z: zal ? 1 : 0, k: 1, pil: wPilotazu ? 1 : 0, o: ot || undefined }));
    return 'umowa.html' + (wybrany ? '?p=' + wybrany + (wPilotazu ? '&pil=1' : '') : (wPilotazu ? '?pil=1' : ''));
  }
  document.querySelectorAll('[data-start]').forEach(function (a) { a.setAttribute('href', adresStartu(a.getAttribute('data-start'))); });
  document.querySelectorAll('[data-start-pilot]').forEach(function (a) { a.setAttribute('href', adresStartu(a.getAttribute('data-start-pilot'), true)); });

  /* Licznik terminu pilotażu: tylko dla oferty z CRM (termin: dwa tygodnie od wygenerowania oferty, liczy go serwer). */
  if ((ot || lead) && window.ODBIORNIK && window.ODBIORNIK.ofertaStatus) {
    window.ODBIORNIK.ofertaStatus(ot, lead).then(function (j) {
      if (!j || !j.znany || !j.pilot_do) return;
      var koniec = Date.parse(j.pilot_do), przesuniecie = Date.parse(j.teraz) - Date.now();
      var pasek = document.querySelector('[data-pilot-licznik]');
      if (!pasek || isNaN(koniec)) return;
      var d = new Date(koniec);
      pasek.querySelector('[data-zegar-do]').textContent = d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
      var czas;
      function minal() {
        clearInterval(czas);
        pilotWazny = false;
        udostepnijPakiety();
        pasek.hidden = true;
        document.querySelectorAll('.ofs-pilot__cta, .ofs-cta__pilot').forEach(function (e) { e.hidden = true; });
        var po = document.querySelector('[data-pilot-po]'); if (po) po.hidden = false;
        document.querySelectorAll('[data-start]').forEach(function (a) { a.setAttribute('href', adresStartu(a.getAttribute('data-start'))); });
      }
      function tik() {
        var ms = koniec - (Date.now() + przesuniecie);
        if (ms <= 0) return minal();
        var q2 = function (k, v) { var e = pasek.querySelector('[data-zegar="' + k + '"]'); if (e) e.textContent = v; };
        q2('dni', Math.floor(ms / 86400000)); q2('godz', Math.floor(ms % 86400000 / 3600000)); q2('min', Math.floor(ms % 3600000 / 60000));
      }
      pasek.hidden = false;
      tik();
      czas = setInterval(tik, 30000);
    });
  }

  /* Licznik miejsc w pilotażu: prawdziwy, z serwera. Gdy pilotaż jest pełny, ukrywamy go w ofercie (nie udajemy dostępności). */
  if (window.ODBIORNIK && window.ODBIORNIK.pilotaz) {
    window.ODBIORNIK.pilotaz().then(function (j) {
      if (!j) return;
      var wolne = Math.max(0, j.miejsc - j.zajete);
      if (!wolne && !pil) { document.querySelectorAll('[data-pilot-blok]').forEach(function (e) { e.hidden = true; }); udostepnijPakiety(); return; }
      document.querySelectorAll('[data-pilot-wolne]').forEach(function (e) { e.textContent = 'wolne miejsca: ' + wolne + ' z ' + j.miejsc; });
    });
  }

  if (PAK[pakiet]) {
    var P = PAK[pakiet];
    var wiersz = document.getElementById('ofs-start-pakiet');
    if (wiersz) {
      wiersz.innerHTML = 'Przygotowaliśmy dla Ciebie pakiet <b>' + P.nazwa + '</b>' + (pil ? ' w pilotażu pierwszych klientów' : '') + ': ' + zl((pil ? PILOT_WDR[pakiet] : P.wdr) + (zal ? 299 : 0)) + ' wdrożenie i ' + zl(P.utr + 0 + (zal ? 29 : 0)) + ' miesięcznie (ceny końcowe).';
      wiersz.hidden = false;
    }
  }

  function zdarzenie(typ, dane) {
    if (!lead || !window.ODBIORNIK || !window.ODBIORNIK.aktywny()) return;
    window.ODBIORNIK.wyslij({ typ: typ, lead: lead, kiedy: new Date().toISOString(), dane: dane || {} });
  }
  document.querySelectorAll('[data-zadzwon]').forEach(function (a) {
    a.addEventListener('click', function () {
      try { if (sessionStorage.getItem('zadzwon-' + lead)) return; sessionStorage.setItem('zadzwon-' + lead, '1'); } catch (e) { /* wysyłamy przy każdym kliknięciu */ }
      zdarzenie('zadzwon', { skad: 'oferta' });
    });
  });

  if (!lead && !dla) return;
  var pasek = document.getElementById('ofs-dla');
  if (pasek && dla) {
    pasek.querySelector('b').textContent = dla;
    pasek.hidden = false;
  }
  if (PAK[pakiet]) {
    document.querySelectorAll('.ofs-ceny article').forEach(function (a) {
      var h = a.querySelector('h3');
      if (h && h.textContent.trim() === PAK[pakiet].nazwa) {
        var z = document.createElement('span');
        z.className = 'ofs-polecany';
        z.textContent = 'Polecany dla Państwa';
        a.insertBefore(z, a.firstChild);
        a.classList.add('ofs-cena--polecana');
      }
    });
  }
  try {
    if (lead && !sessionStorage.getItem('oferta-otwarta-' + lead)) {
      sessionStorage.setItem('oferta-otwarta-' + lead, '1');
      zdarzenie('oferta_otwarta', { ekran: innerWidth + 'x' + innerHeight });
    }
  } catch (e) { /* bez sessionStorage wysyłamy przy każdym wejściu, co nie szkodzi */ }
})();
