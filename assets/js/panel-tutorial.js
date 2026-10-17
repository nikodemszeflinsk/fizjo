/*
 * Bardzo szybki samouczek przy pierwszym otwarciu dema panelu: cztery krótkie kroki z podświetleniem.
 * Pokazuje się raz (zapamiętane w przeglądarce), wraca przyciskiem „Wskazówki” w pasku demo.
 * Nie włącza się w automatycznych testach (navigator.webdriver), chyba że adres ma ?tutorial=1; ?tutorial=0 wyłącza go zawsze.
 */
(function () {
  'use strict';
  var KLUCZ = 'panel-samouczek-v1';
  var q = new URLSearchParams(location.search).get('tutorial');
  var KROKI = [
    { cel: '#p-menu a[href="#/pulpit"]', tytul: 'Dziś', tekst: 'Wizyty na dziś i nowe rezerwacje ze strony. Zacznij od potwierdzenia nowych.' },
    { cel: '#p-menu a[href="#/kalendarz"]', tytul: 'Kalendarz', tekst: 'Kliknij wizytę, żeby ją zmienić. Przeciągnij ją, żeby przenieść na inny termin.' },
    { cel: '#p-menu a[href="#/pacjenci"]', tytul: 'Pacjenci', tekst: 'Lista pacjentów z telefonem i historią wizyt. Bez danych medycznych.' },
    { cel: '#p-menu a[href="#/dostepnosc"], #p-menu a[href="#/grafik"]', tytul: 'Stały grafik', tekst: 'Godziny przyjęć ustawiasz tu albo w Kalendarzu (przycisk „Zmień dostępność”). Pacjent widzi tylko to, co otworzysz.' },
    { cel: '.p-pakiet', tytul: 'Dwa pakiety', tekst: 'To demo pokazuje oba. Przełącz na Team, żeby zobaczyć grafik zespołu.' }
  ];
  var i = 0, nakladka = null, karta = null, ring = null;

  function widoczny(el) { if (!el) return false; var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight; }
  function cel(k) { return k.cel.split(',').map(function (s) { return document.querySelector(s.trim()); }).filter(widoczny)[0] || null; }
  function zapamietaj() { try { localStorage.setItem(KLUCZ, '1'); } catch (e) { /* bez zapisu samouczek wróci przy następnym wejściu */ } }
  function zamknij() {
    zapamietaj();
    if (nakladka) { nakladka.remove(); nakladka = null; }
    document.removeEventListener('keydown', klawisz, true);
    window.removeEventListener('resize', rysuj);
  }
  function klawisz(e) {
    if (e.key === 'Escape') { e.preventDefault(); zamknij(); }
  }
  function rysuj() {
    if (!nakladka) return;
    var k = KROKI[i], el = cel(k), ost = i === KROKI.length - 1;
    karta.querySelector('.p-sam__licznik').textContent = (i + 1) + ' z ' + KROKI.length;
    karta.querySelector('.p-sam__tytul').textContent = k.tytul;
    karta.querySelector('.p-sam__tekst').textContent = k.tekst;
    karta.querySelector('[data-sam="dalej"]').textContent = ost ? 'Zaczynam' : 'Dalej';
    if (el) {
      var r = el.getBoundingClientRect();
      ring.hidden = false;
      ring.style.cssText = 'left:' + (r.left - 6) + 'px;top:' + (r.top - 6) + 'px;width:' + (r.width + 12) + 'px;height:' + (r.height + 12) + 'px';
    } else { ring.hidden = true; }
    var waski = innerWidth < 760 || !el;
    karta.classList.toggle('p-sam__karta--dol', waski);
    if (waski) { karta.style.left = ''; karta.style.top = ''; }
    else {
      var rr = el.getBoundingClientRect();
      var top = Math.max(12, Math.min(innerHeight - karta.offsetHeight - 12, rr.top - 6));
      karta.style.left = (rr.right + 20) + 'px';
      karta.style.top = top + 'px';
    }
  }
  function otworz() {
    if (nakladka) return;
    i = 0;
    nakladka = document.createElement('div');
    nakladka.className = 'p-sam';
    nakladka.innerHTML = '<div class="p-sam__pierscien" hidden></div>' +
      '<div class="p-sam__karta" role="dialog" aria-modal="false" aria-labelledby="p-sam-tytul">' +
      '<p class="p-sam__licznik"></p><h2 class="p-sam__tytul" id="p-sam-tytul"></h2><p class="p-sam__tekst"></p>' +
      '<div class="p-sam__akcje"><button type="button" class="p-sam__pomin" data-sam="pomin">Pomiń</button><button type="button" class="p-btn p-btn--akcent" data-sam="dalej">Dalej</button></div></div>';
    document.body.appendChild(nakladka);
    karta = nakladka.querySelector('.p-sam__karta');
    ring = nakladka.querySelector('.p-sam__pierscien');
    nakladka.addEventListener('click', function (e) {
      var b = e.target.closest('[data-sam]');
      if (!b) return;
      if (b.getAttribute('data-sam') === 'pomin') return zamknij();
      if (i >= KROKI.length - 1) return zamknij();
      i += 1; rysuj();
      var d = karta.querySelector('[data-sam="dalej"]'); if (d) d.focus();
    });
    document.addEventListener('keydown', klawisz, true);
    window.addEventListener('resize', rysuj);
    rysuj();
    var d = karta.querySelector('[data-sam="dalej"]'); if (d) d.focus();
  }

  window.PANEL_SAMOUCZEK = { otworz: otworz };

  /* Przycisk „Wskazówki” w pasku demo. */
  var pasek = document.getElementById('p-demo');
  if (pasek) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'p-demo__wskazowki'; b.textContent = 'Wskazówki';
    b.addEventListener('click', otworz);
    pasek.insertBefore(b, pasek.querySelector('.p-demo__x'));
  }

  var widziany = false;
  try { widziany = localStorage.getItem(KLUCZ) === '1'; } catch (e) { /* pokażemy */ }
  var wymus = q === '1', wylacz = q === '0' || (navigator.webdriver && !wymus);
  if (!wylacz && (wymus || !widziany)) setTimeout(otworz, 500);
})();
