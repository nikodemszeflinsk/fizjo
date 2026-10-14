/*
 * Personalizacja oferty linkiem z CRM: ?l=<id leada>&dla=<nazwa gabinetu>&p=<individual|enterprise>
 *  - pasek „Oferta przygotowana dla …”,
 *  - znaczek „Polecany dla Państwa” przy wskazanym pakiecie,
 *  - jedno zdarzenie „oferta otwarta” na sesję (tylko jeśli skonfigurowany jest odbiornik).
 * Bez parametrów strona wygląda jak zwykle.
 */
(function () {
  'use strict';
  var q = new URLSearchParams(location.search);
  var lead = (q.get('l') || '').slice(0, 40);
  var dla = (q.get('dla') || '').slice(0, 90);
  var pakiet = q.get('p');
  if (!lead && !dla) return;

  var pasek = document.getElementById('ofs-dla');
  if (pasek && dla) {
    pasek.querySelector('b').textContent = dla;
    pasek.hidden = false;
  }
  if (pakiet === 'individual' || pakiet === 'enterprise') {
    var nazwa = pakiet === 'individual' ? 'Individual' : 'Enterprise';
    document.querySelectorAll('.ofs-ceny article').forEach(function (a) {
      var h = a.querySelector('h3');
      if (h && h.textContent.trim() === nazwa) {
        var z = document.createElement('span');
        z.className = 'ofs-polecany';
        z.textContent = 'Polecany dla Państwa';
        a.insertBefore(z, a.firstChild);
        a.classList.add('ofs-cena--polecana');
      }
    });
  }
  try {
    if (lead && window.ODBIORNIK && window.ODBIORNIK.aktywny() && !sessionStorage.getItem('oferta-otwarta-' + lead)) {
      sessionStorage.setItem('oferta-otwarta-' + lead, '1');
      window.ODBIORNIK.wyslij({ typ: 'oferta_otwarta', lead: lead, kiedy: new Date().toISOString(), dane: { ekran: innerWidth + 'x' + innerHeight } });
    }
  } catch (e) { /* bez sessionStorage wysyłamy przy każdym wejściu, co nie szkodzi */ }
})();
