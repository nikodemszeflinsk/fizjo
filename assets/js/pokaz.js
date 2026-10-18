/*
 * Pokaz w minutę: nawigacja po ekranach i zdarzenia dla CRM.
 * Link z CRM: pokaz.html?l=<id leada>&dla=<nazwa gabinetu>&m=<miasto>&sp=<specjalizacja>
 *  - miasto i specjalizacja personalizują przykładowy wynik wyszukiwania na pierwszym ekranie (bez cen).
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

  /* Personalizacja pierwszego ekranu: miasto gabinetu i jego główna specjalizacja. */
  var miasto = (q.get('m') || '').replace(/[<>]/g, '').trim().slice(0, 40);
  var spec = (q.get('sp') || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0142/g, 'l');
  var SPEC = [
    ['sport', { q: 'kontuzja sportowa fizjoterapeuta', url: 'fizjoterapia-sportowa', t: 'Fizjoterapia sportowa', o: 'Powrót do sportu po kontuzji, ból kolana i barku. Najbliższy wolny termin: jutro.' }],
    ['neuro', { q: 'rehabilitacja neurologiczna', url: 'rehabilitacja-neurologiczna', t: 'Rehabilitacja neurologiczna', o: 'Rehabilitacja po udarze i urazach układu nerwowego. Najbliższy wolny termin: jutro.' }],
    ['dzieci', { q: 'fizjoterapia dziecięca', url: 'fizjoterapia-dzieci', t: 'Fizjoterapia dziecięca', o: 'Wady postawy, rehabilitacja niemowląt i dzieci. Najbliższy wolny termin: jutro.' }],
    ['pediatr', { q: 'fizjoterapia dziecięca', url: 'fizjoterapia-dzieci', t: 'Fizjoterapia dziecięca', o: 'Wady postawy, rehabilitacja niemowląt i dzieci. Najbliższy wolny termin: jutro.' }],
    ['uroginek', { q: 'fizjoterapia uroginekologiczna', url: 'fizjoterapia-uroginekologiczna', t: 'Fizjoterapia uroginekologiczna', o: 'Mięśnie dna miednicy, ciąża i połóg. Najbliższy wolny termin: jutro.' }],
    ['manual', { q: 'terapia manualna fizjoterapeuta', url: 'terapia-manualna', t: 'Terapia manualna', o: 'Ból kręgosłupa, karku i stawów. Najbliższy wolny termin: jutro.' }],
    ['rehabilit', { q: 'rehabilitacja po operacji fizjoterapeuta', url: 'rehabilitacja', t: 'Rehabilitacja po urazach i operacjach', o: 'Powrót do sprawności po operacji i urazie. Najbliższy wolny termin: jutro.' }],
  ];
  var dop = null;
  SPEC.forEach(function (s) { if (!dop && spec.indexOf(s[0]) !== -1) dop = s[1]; });
  if (miasto || dop) {
    var ust = function (id, tekst) { var e = document.getElementById(id); if (e) e.textContent = tekst; };
    var nazwaMiasta = miasto || '';
    var fraza = dop ? dop.q : 'ból krzyża fizjoterapeuta';
    ust('pk-q', (fraza + ' ' + nazwaMiasta).trim());
    ust('pk-tytul', ((dop ? dop.t : 'Fizjoterapia kręgosłupa') + ' ' + nazwaMiasta).trim());
    if (dop) { ust('pk-url', 'twoj-gabinet.pl › ' + dop.url); ust('pk-opis', dop.o); }
    var fig = document.getElementById('pk-serp-fig');
    if (fig) fig.setAttribute('aria-label', 'Przykład wyników wyszukiwania frazy „' + (fraza + ' ' + nazwaMiasta).trim() + '”: na górze strona gabinetu i wizytówka w Mapach, niżej lista specjalistów z portalu.');
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

  /* SMS z ofertą: gdy działa chmura, klient podaje numer i dostaje link do pełnej oferty od razu. */
  var BLEDY_SMS = { telefon: 'Ten numer nie wygląda na komórkowy. Wpisz 9 cyfr, np. 600 700 800.', limit: 'Na ten numer wysłaliśmy już ofertę. Sprawdź wiadomości albo daj znać w rozmowie.', limit_dzienny: 'Dziś nie możemy wysłać więcej wiadomości. Powiedz mi o tym w rozmowie, a prześlę ofertę.', siec: 'Brak połączenia. Spróbuj ponownie albo powiedz mi o tym w rozmowie.' };
  function idLeada() {
    if (lead) return lead;
    try {
      var z = sessionStorage.getItem('pokaz-lead');
      if (!z) { z = 'web-' + Math.random().toString(36).slice(2, 10); sessionStorage.setItem('pokaz-lead', z); }
      return z;
    } catch (e) { return 'web-' + Math.random().toString(36).slice(2, 10); }
  }
  document.getElementById('pk-chce').addEventListener('click', function () {
    var b = this;
    b.disabled = true;
    zdarzenie('pokaz_chce', { ekran: teraz + 1 });
    b.textContent = 'Zapisane';
    var form = document.getElementById('pk-sms');
    function pokazFormularz() { form.hidden = false; document.getElementById('pk-tel').focus(); }
    function podziekuj(r) {
      var d = document.getElementById('pk-dzieki');
      d.innerHTML = '<b>Wysłane!</b> SMS z pełną ofertą jest w drodze' + (r && r.maska ? ' na numer ' + r.maska : '') + '. Zadzwonię, żeby odpowiedzieć na pytania.';
      d.hidden = false;
    }
    if (!(window.ODBIORNIK && window.ODBIORNIK.aktywny() && window.ODBIORNIK.zapytaj)) { document.getElementById('pk-dzieki').hidden = false; return; }
    /* Gdy numer klienta jest już w CRM (link z CRM), wysyłamy od razu, bez pytania. Inaczej prosimy o numer. */
    if (lead) {
      window.ODBIORNIK.zapytaj({ typ: 'sms_oferta', lead: lead, dla: dla }).then(function (r) {
        if (r && r.ok) podziekuj(r);
        else if (r && (r.blad === 'limit' || r.blad === 'limit_dzienny')) { var d = document.getElementById('pk-dzieki'); d.innerHTML = '<b>Oferta już do Ciebie wysłana.</b> Sprawdź wiadomości w telefonie, a jeśli jej nie ma, powiedz mi o tym w rozmowie.'; d.hidden = false; }
        else pokazFormularz();
      });
    } else pokazFormularz();
  });
  document.getElementById('pk-sms').addEventListener('submit', function (e) {
    e.preventDefault();
    var tel = document.getElementById('pk-tel').value;
    var blad = document.getElementById('pk-sms-blad');
    var wyslij = document.getElementById('pk-sms-wyslij');
    blad.textContent = '';
    if (String(tel).replace(/\D/g, '').replace(/^(48|0048)/, '').length !== 9) { blad.textContent = BLEDY_SMS.telefon; return; }
    wyslij.disabled = true; wyslij.textContent = 'Wysyłam…';
    window.ODBIORNIK.zapytaj({ typ: 'sms_oferta', lead: idLeada(), dla: dla, telefon: tel }).then(function (r) {
      if (r && r.ok) {
        document.getElementById('pk-sms').hidden = true;
        var d = document.getElementById('pk-dzieki');
        d.innerHTML = '<b>Wysłane!</b> SMS z pełną ofertą jest w drodze na numer ' + (r.maska ? r.maska : 'który podałeś') + '. Zadzwonię, żeby odpowiedzieć na pytania.';
        d.hidden = false;
        return;
      }
      blad.textContent = BLEDY_SMS[r && r.blad] || 'Nie udało się wysłać SMS-a. Powiedz mi o tym w rozmowie, a prześlę ofertę.';
      wyslij.disabled = false; wyslij.textContent = 'Wyślij SMS';
    });
  });

  try {
    if (lead && !sessionStorage.getItem('pokaz-otwarty-' + lead)) {
      sessionStorage.setItem('pokaz-otwarty-' + lead, '1');
      zdarzenie('pokaz_otwarty', { ekran: innerWidth + 'x' + innerHeight });
    }
  } catch (e) { /* bez sessionStorage wysyłamy przy każdym wejściu, co nie szkodzi */ }

  ustaw(0);
})();
