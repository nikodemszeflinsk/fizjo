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
  var PAK = { individual: { nazwa: 'Individual', wdr: 2900, utr: 99 }, enterprise: { nazwa: 'Team', wdr: 4499, utr: 149 } };
  var sms = q.get('s') === '1', zal = q.get('z') === '1';
  function zl(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' zł'; }
  function b64u(t) { return btoa(unescape(encodeURIComponent(t))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }

  /* Adres konfiguratora: z leadem przez token (jak link do umowy z CRM), bez leada przez ?p=. */
  function adresStartu(p) {
    var wybrany = PAK[p] ? p : (PAK[pakiet] ? pakiet : '');
    if (lead && wybrany) return 'umowa.html?d=' + b64u(JSON.stringify({ l: lead, g: dla, m: '', p: wybrany, s: sms ? 1 : 0, z: zal ? 1 : 0, k: 1 }));
    return 'umowa.html' + (wybrany ? '?p=' + wybrany : '');
  }
  document.querySelectorAll('[data-start]').forEach(function (a) { a.setAttribute('href', adresStartu(a.getAttribute('data-start'))); });

  if (PAK[pakiet]) {
    var P = PAK[pakiet];
    var wiersz = document.getElementById('ofs-start-pakiet');
    if (wiersz) {
      wiersz.innerHTML = 'Przygotowaliśmy dla Ciebie pakiet <b>' + P.nazwa + '</b>: ' + zl(P.wdr + (zal ? 299 : 0)) + ' wdrożenie i ' + zl(P.utr + (sms ? 49 : 0) + (zal ? 29 : 0)) + ' miesięcznie (ceny końcowe).';
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
