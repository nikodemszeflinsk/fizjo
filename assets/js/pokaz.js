/*
 * Pokaz w minutę: nawigacja po ekranach i zdarzenia dla CRM.
 * Link z CRM: pokaz.html?l=<id leada>&dla=<nazwa gabinetu>
 *  - „pokaz_otwarty” raz na sesję, „pokaz_chce” po kliknięciu „Tak, wyślij mi pełną ofertę”
 *    (zdarzenia lecą tylko z id leada i skonfigurowanym odbiornikiem).
 */
(function () {
  'use strict';
  var q = new URLSearchParams(location.search);
  var lead = (q.get('l') || '').slice(0, 40);
  var dla = (q.get('dla') || '').slice(0, 90);

  var tor = document.getElementById('pk-tor');
  var slajdy = Array.prototype.slice.call(tor.querySelectorAll('.pk-slajd'));
  var kropki = Array.prototype.slice.call(document.querySelectorAll('#pk-kropki button'));
  var dalej = document.getElementById('pk-dalej');
  var licznik = document.getElementById('pk-licznik');
  var teraz = 0;

  if (dla) {
    var el = document.getElementById('pk-dla');
    el.querySelector('b').textContent = dla;
    el.hidden = false;
  }
  function zdarzenie(typ, dane) {
    if (!lead || !window.ODBIORNIK || !window.ODBIORNIK.aktywny()) return;
    window.ODBIORNIK.wyslij({ typ: typ, lead: lead, kiedy: new Date().toISOString(), dane: dane || {} });
  }

  function ustaw(i) {
    teraz = i;
    kropki.forEach(function (k, j) {
      if (j === i) k.setAttribute('aria-current', 'true'); else k.removeAttribute('aria-current');
    });
    licznik.textContent = (i + 1) + ' z ' + slajdy.length;
    var ost = i === slajdy.length - 1;
    dalej.hidden = ost;
  }
  function przejdz(i) {
    i = Math.max(0, Math.min(slajdy.length - 1, i));
    tor.scrollTo({ left: slajdy[i].offsetLeft, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    ustaw(i);
  }
  var czekaNaScroll;
  tor.addEventListener('scroll', function () {
    clearTimeout(czekaNaScroll);
    czekaNaScroll = setTimeout(function () {
      var i = Math.round(tor.scrollLeft / tor.clientWidth);
      if (i !== teraz) ustaw(i);
    }, 60);
  }, { passive: true });
  dalej.addEventListener('click', function () { przejdz(teraz + 1); });
  kropki.forEach(function (k) { k.addEventListener('click', function () { przejdz(Number(k.getAttribute('data-do'))); }); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); przejdz(teraz + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); przejdz(teraz - 1); }
  });

  document.getElementById('pk-chce').addEventListener('click', function () {
    var b = this;
    b.disabled = true;
    zdarzenie('pokaz_chce', { ekran: teraz + 1 });
    document.getElementById('pk-dzieki').hidden = false;
    b.textContent = 'Zapisane';
  });

  try {
    if (lead && !sessionStorage.getItem('pokaz-otwarty-' + lead)) {
      sessionStorage.setItem('pokaz-otwarty-' + lead, '1');
      zdarzenie('pokaz_otwarty', { ekran: innerWidth + 'x' + innerHeight });
    }
  } catch (e) { /* bez sessionStorage wysyłamy przy każdym wejściu, co nie szkodzi */ }

  ustaw(0);
})();
