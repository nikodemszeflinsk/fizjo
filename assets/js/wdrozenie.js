/*
 * Strona wdrożenia klienta: etapy, projekt graficzny do akceptacji, okno płatności z rachunkiem, budowa, rozmowa końcowa.
 * Dane z API po tajnym tokenie z linku (?t=). Klient może zaakceptować projekt, zgłosić uwagi i zgłosić wpłatę.
 */
(function () {
  'use strict';

  var q = new URLSearchParams(location.search);
  var T = q.get('t') || '';
  var API = String(window.STUDIO_API || '').replace(/\/$/, '');
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && q.get('api')) API = q.get('api').replace(/\/$/, '');

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var zl = function (n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' zł'; };
  var dataPL = function (iso) { if (!iso) return ''; var d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso); return isNaN(d) ? esc(iso) : d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }); };
  var dataGodz = function (iso) { var d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('pl-PL', { dateStyle: 'long', timeStyle: 'short' }); };

  var ETAPY = [
    ['formularz', 'Formularz startowy'],
    ['projekt', 'Projekt graficzny'],
    ['platnosc', 'Płatność'],
    ['budowa', 'Budowa strony'],
    ['rozmowa', 'Rozmowa końcowa'],
  ];
  var st = { dane: null, widok: null, komunikat: '' };

  function pokazKomunikat(tytul, tekst) {
    $('#wd-glowny').hidden = true;
    var k = $('#st-komunikat');
    k.hidden = false;
    k.innerHTML = '<h1>' + esc(tytul) + '</h1><p>' + tekst + '</p><p><a class="st-btn" href="tel:+48783480341">Zadzwoń: 783 480 341</a> <a class="st-btn st-btn--cichy" href="mailto:kontakt@studio-widok.pl">kontakt@studio-widok.pl</a></p>';
  }
  function adres(sciezka, tail) { return API + sciezka + '?t=' + encodeURIComponent(T) + (tail || ''); }
  function plikUrl(id, pobierz) { return adres('/wdrozenie/plik', '&id=' + id + (pobierz ? '&pobierz=1' : '')); }

  /* ── Etapy ── */
  function indeksEtapu(e) { return e === 'gotowe' ? ETAPY.length : Math.max(0, ETAPY.findIndex(function (x) { return x[0] === e; })); }
  function etapyHtml(d) {
    var ak = indeksEtapu(d.etap);
    return ETAPY.map(function (x, i) {
      var stan = i < ak ? 'zrobiony' : i === ak ? 'biezacy' : 'przed';
      return '<li class="wd-etap wd-etap--' + stan + '"' + (stan === 'biezacy' ? ' aria-current="step"' : '') + '><span class="wd-etap__nr" aria-hidden="true">' + (stan === 'zrobiony' ? '✓' : i + 1) + '</span><span class="wd-etap__n">' + esc(x[1]) + '</span><span class="visually-hidden">' + (stan === 'zrobiony' ? ' (zrobione)' : stan === 'biezacy' ? ' (teraz)' : ' (następny)') + '</span></li>';
    }).join('');
  }

  /* ── Sekcje etapów ── */
  function komunikatHtml(d) { return d.komunikat ? '<aside class="wd-info"><b>Wiadomość od Studio Widok</b><p>' + esc(d.komunikat).replace(/\n/g, '<br>') + '</p></aside>' : ''; }
  function sekcjaFormularz(d) {
    var wyslany = d.formularz === 'wyslany' || d.formularz === 'zmieniony';
    var link = d.formularz_token ? 'start.html?t=' + encodeURIComponent(d.formularz_token) + (q.get('api') ? '&api=' + encodeURIComponent(q.get('api')) : '') : '';
    return '<section class="wd-karta"><h2>Formularz startowy</h2>' +
      (wyslany ? '<p class="st-ok">Formularz został wysłany. Dziękujemy! Możesz do niego wrócić i dopisać zmiany.</p><p>Od razu przystępujemy do projektu graficznego. Gdy pierwsza propozycja będzie gotowa, zobaczysz ją tutaj.</p>' : '<p>To ostatnia rzecz po Twojej stronie, zanim zaczniemy: treści, zdjęcia, logo, zespół, usługi i inspiracje graficzne. <b>Od razu po wysłaniu formularza przystępujemy do projektu graficznego.</b></p>') +
      (link ? '<a class="st-btn" href="' + esc(link) + '">' + (wyslany ? 'Otwórz formularz' : d.formularz === 'brak' ? 'Wypełnij formularz startowy' : 'Dokończ formularz') + '</a>' : '<p class="st-pod">Link do formularza dostaniesz od nas w wiadomości.</p>') + '</section>';
  }
  function projektHtml(p, d) {
    var obrazy = p.pliki.map(function (f) { return /^image\//.test(f.mime) ? '<a href="' + plikUrl(f.id) + '" target="_blank" rel="noopener" class="wd-obraz"><img src="' + plikUrl(f.id) + '" alt="' + esc(p.nazwa + ', ' + f.nazwa) + '" loading="lazy" /></a>' : '<a class="st-btn st-btn--maly st-btn--cichy" href="' + plikUrl(f.id, true) + '">' + esc(f.nazwa) + '</a>'; }).join('');
    var link = p.link && /^https:\/\//i.test(p.link)
      ? '<div class="wd-link-projektu"><a class="st-btn" href="' + esc(p.link) + '" target="_blank" rel="noopener noreferrer">Otwórz projekt graficzny</a><p class="st-pod">Projekt otwiera się w nowej karcie. Obejrzyj go, a potem wróć tutaj, żeby go zaakceptować albo wysłać uwagi.</p></div>'
      : '';
    var status = { do_akceptacji: ['Czeka na Twoją decyzję', 'czeka'], zaakceptowany: ['Zaakceptowany', 'ok'], uwagi: ['Uwagi wysłane, poprawiamy', 'uwagi'] }[p.status] || ['', ''];
    var akcje = '';
    if (p.status === 'do_akceptacji') {
      akcje = '<div class="wd-decyzja" data-projekt="' + esc(p.id) + '">' +
        '<label class="st-pomin wd-potw"><input type="checkbox" data-potw /> Potwierdzam, że akceptuję projekt graficzny w tej wersji. Po akceptacji wystawiamy rachunek za wdrożenie.</label>' +
        '<div class="wd-przyciski"><button type="button" class="st-btn" data-akcja="akceptuj" data-id="' + esc(p.id) + '" disabled>Akceptuję projekt</button><button type="button" class="st-btn st-btn--cichy" data-akcja="uwagi-otworz" data-id="' + esc(p.id) + '">Mam uwagi</button></div>' +
        '<div class="wd-uwagi" hidden><label class="st-et" for="uw-' + esc(p.id) + '">Co zmienić?</label><p class="st-pod">Opisz własnymi słowami: co się nie podoba i jak ma być. W cenie są ' + d.tury.wCenie + ' tury poprawek (wykorzystano: ' + d.tury.uzyte + ').</p><textarea id="uw-' + esc(p.id) + '" rows="5"></textarea><button type="button" class="st-btn" data-akcja="uwagi-wyslij" data-id="' + esc(p.id) + '">Wyślij uwagi</button></div></div>';
    }
    var odp = p.odpowiedz ? '<p class="wd-odp"><b>' + (p.odpowiedz.typ === 'akceptacja' ? 'Zaakceptowano' : 'Twoje uwagi') + '</b> ' + esc(dataGodz(p.odpowiedz.czas)) + (p.odpowiedz.tekst ? '<br>' + esc(p.odpowiedz.tekst).replace(/\n/g, '<br>') : '') + '</p>' : '';
    return '<article class="wd-projekt wd-projekt--' + p.status + '"><header><h3>' + esc(p.nazwa) + ' <small>wersja ' + esc(p.wersja) + '</small></h3><span class="wd-znak wd-znak--' + status[1] + '">' + status[0] + '</span></header>' + (p.opis ? '<p>' + esc(p.opis) + '</p>' : '') + link + (obrazy ? '<div class="wd-obrazy">' + obrazy + '</div>' : '') + odp + akcje + '</article>';
  }
  function sekcjaProjekt(d) {
    var lista = d.projekty.slice().reverse();
    return '<section class="wd-karta"><h2>Projekt graficzny</h2>' + (lista.length ? lista.map(function (p) { return projektHtml(p, d); }).join('') : '<p>Pracujemy nad pierwszą propozycją na podstawie Twojego formularza. Gdy będzie gotowa, pojawi się tutaj i damy Ci znać.</p>') + '</section>';
  }
  function kopiujPrzycisk(wartosc, etykieta) { return '<button type="button" class="st-btn st-btn--maly st-btn--cichy" data-akcja="kopiuj" data-w="' + esc(wartosc) + '" aria-label="Kopiuj: ' + esc(etykieta) + '">Kopiuj</button>'; }
  /** Krótkie wyjaśnienie, dlaczego klient dostaje rachunek, a nie fakturę (działalność nierejestrowana). */
  function dlaczegoRachunek() {
    return '<details class="wd-dlaczego"><summary>Dlaczego rachunek, a nie faktura?</summary><p>Studio Widok prowadzi działalność nierejestrowaną, dlatego zamiast faktury VAT wystawiamy rachunek. Nie jesteśmy płatnikiem VAT, więc cena jest <span class="wd-tip" tabindex="0" aria-describedby="wd-tip-t">końcowa<span class="wd-tip__t" id="wd-tip-t" role="tooltip">Po przekroczeniu progu VAT i zmianie statusu prawnego Studio aktualne ceny pozostaną cenami brutto.</span></span> i nie doliczamy do niej podatku. Rachunek jest pełnoprawnym dokumentem sprzedaży: ma numer, dane stron, opis usługi i kwotę. Możesz go zaksięgować jako koszt prowadzenia działalności (bez VAT do odliczenia, bo VAT nie występuje). Szczegóły potwierdzi Twój księgowy.</p></details>';
  }
  function sekcjaPlatnosc(d) {
    var P = d.platnosc;
    if (P.status === 'brak') return '<section class="wd-karta"><h2>Płatność</h2><p>Po akceptacji projektu przygotujemy rachunek za wdrożenie i pokażemy go tutaj razem z danymi do przelewu.</p></section>';
    var dokument = P.dokument || P.pdf ? '<a class="st-btn st-btn--cichy" href="' + adres(P.pdf ? '/wdrozenie/rachunek.pdf' : '/wdrozenie/dokument') + '" target="_blank" rel="noopener">Zobacz rachunek' + (P.faktura_nr ? ' ' + esc(P.faktura_nr) : '') + (P.pdf ? ' (PDF)' : '') + '</a>' : '';
    var faktura = P.dokument ? '' : P.faktura ? '<a class="st-btn st-btn--cichy" href="' + plikUrl(P.faktura.id, true) + '">Pobierz dokument' + (P.faktura_nr ? ' ' + esc(P.faktura_nr) : '') + ' (PDF)</a>' : (P.faktura_nr ? '<p class="st-pod">Numer rachunku: ' + esc(P.faktura_nr) + '</p>' : '<p class="st-pod">Rachunek dodamy tutaj w ciągu dnia roboczego.</p>');
    var stan = { oczekuje: '', zgloszona: '<p class="st-ok">Dziękujemy! Zgłosiłeś wpłatę. Sprawdzamy ją i od razu przechodzimy do budowy strony.</p>', oplacona: '<p class="st-ok st-ok--duze">Zapłacone' + (P.zaplacono ? ' ' + esc(dataPL(P.zaplacono)) : '') + '. Dziękujemy!' + (d.etap === 'platnosc' || d.etap === 'budowa' ? ' Przechodzimy do budowy strony.' : '') + '</p>' }[P.status] || '';
    var dane = P.status === 'oczekuje' || P.status === 'zgloszona'
      ? '<dl class="wd-przelew"><div><dt>Odbiorca</dt><dd>' + esc(P.odbiorca) + '</dd></div><div><dt>Numer rachunku</dt><dd><span id="wd-rachunek">' + esc(P.rachunek) + '</span> ' + kopiujPrzycisk(P.rachunek, 'numer rachunku') + '</dd></div><div><dt>Tytuł przelewu</dt><dd>' + esc(P.tytul) + ' ' + kopiujPrzycisk(P.tytul, 'tytuł przelewu') + '</dd></div><div><dt>Kwota</dt><dd><b>' + zl(P.kwota) + '</b> ' + kopiujPrzycisk(String(P.kwota).replace('.', ','), 'kwota') + '</dd></div></dl>'
      : '';
    var oplacona = P.status === 'oplacona';
    return '<section class="wd-karta wd-platnosc"><h2>Płatność</h2><div class="wd-kwota' + (oplacona ? ' wd-kwota--ok' : '') + '"><span>' + (oplacona ? 'Zapłacono' : 'Do zapłaty') + '</span><b>' + zl(P.kwota) + '</b>' + (oplacona ? (P.zaplacono ? '<small>' + esc(dataPL(P.zaplacono)) + '</small>' : '') : P.termin ? '<small>Termin: ' + esc(dataPL(P.termin)) + '</small>' : '') + '</div>' +
      '<p>' + esc(P.opis) + '</p><p class="st-pod">Ceny końcowe, bez doliczania VAT.</p>' + dlaczegoRachunek() + stan + dane +
      '<div class="wd-przyciski">' + dokument + faktura + (P.link_online && P.status === 'oczekuje' ? '<a class="st-btn" href="' + esc(P.link_online) + '" target="_blank" rel="noopener">Zapłać online</a>' : '') + (P.status === 'oczekuje' ? '<button type="button" class="st-btn' + (P.link_online ? ' st-btn--cichy' : '') + '" data-akcja="zaplacono">Zapłaciłem przelewem</button>' : '') + '</div>' +
      (P.status === 'oczekuje' ? '<p class="st-pod">Po wpłacie kliknij „Zapłaciłem przelewem”, żebyśmy wiedzieli, że mamy szukać wpłaty. Ruszamy z budową zaraz po zaksięgowaniu.</p>' : '') + '</section>';
  }
  function sekcjaBudowa(d) {
    var ile = d.budowa.filter(function (b) { return b.gotowe; }).length;
    return '<section class="wd-karta"><h2>Budowa strony</h2><p>Budujemy stronę, podpinamy rezerwację, ustawiamy kalendarz i konta dla zespołu. <b>Gotowe: ' + ile + ' z ' + d.budowa.length + '.</b></p><span class="wd-postep" aria-hidden="true"><i style="width:' + Math.round((ile / d.budowa.length) * 100) + '%"></i></span><ul class="wd-lista">' + d.budowa.map(function (b) { return '<li class="' + (b.gotowe ? 'ok' : '') + '"><span aria-hidden="true">' + (b.gotowe ? '✓' : '○') + '</span> ' + esc(b.nazwa) + '<span class="visually-hidden">' + (b.gotowe ? ' (gotowe)' : ' (w toku)') + '</span></li>'; }).join('') + '</ul></section>';
  }
  function sekcjaRozmowa(d) {
    var r = d.rozmowa || {};
    var linkOk = /^https?:\/\//i.test(r.link || '');
    return '<section class="wd-karta"><h2>Rozmowa końcowa: przekazanie i szkolenie</h2><p>Na końcu spotykamy się, żeby przekazać Ci stronę i pokazać, jak z niej korzystać: kalendarz, rezerwacje, godziny przyjęć i konta dla zespołu.</p>' +
      (r.termin ? '<p class="wd-termin"><b>' + esc(dataGodz(r.termin)) + '</b></p>' : '<p>Termin ustalimy z Tobą, gdy strona będzie gotowa.</p>') +
      (linkOk ? '<a class="st-btn" href="' + esc(r.link) + '" target="_blank" rel="noopener">Dołącz do rozmowy</a>' : (r.link ? '<p class="st-pod">Link do rozmowy: ' + esc(r.link) + '</p>' : '')) + (r.notatka ? '<p class="st-pod">' + esc(r.notatka) + '</p>' : '') + '</section>';
  }
  /** Rozmowa końcowa przed (budowa) i po zakończeniu wdrożenia: pokazujemy ją, gdy właściciel ustawił termin albo link. */
  function rozmowaGdyJest(d) { var r = d.rozmowa || {}; return r.termin || r.link ? sekcjaRozmowa(d) : ''; }
  function sekcjaGotowe() { return '<section class="wd-karta"><h2>Wdrożenie zakończone</h2><p class="st-ok st-ok--duze">Strona działa, a rezerwacje trafiają do Twojego kalendarza. Dziękujemy za zaufanie!</p><p>W razie pytań dzwoń albo pisz: <a href="tel:+48783480341">783 480 341</a>, <a href="mailto:kontakt@studio-widok.pl">kontakt@studio-widok.pl</a>.</p></section>'; }

  function renderuj() {
    var d = st.dane;
    $('#wd-etapy').innerHTML = etapyHtml(d);
    var i = indeksEtapu(d.etap);
    var tresc = komunikatHtml(d);
    if (d.etap === 'gotowe') tresc += sekcjaGotowe() + rozmowaGdyJest(d) + sekcjaPlatnosc(d).replace('<section class="wd-karta wd-platnosc">', '<section class="wd-karta wd-platnosc wd-platnosc--tylko">');
    else tresc += [sekcjaFormularz, sekcjaProjekt, sekcjaPlatnosc, sekcjaBudowa, sekcjaRozmowa][i](d) + (i === 3 ? rozmowaGdyJest(d) : '');
    /* Wcześniejsze etapy: krótkie przypomnienie (np. projekt zaakceptowany), żeby nic nie znikało. */
    if (i >= 2 && d.projekty.length && d.etap !== 'gotowe') tresc += '<details class="wd-wczesniej"><summary>Zaakceptowany projekt graficzny</summary>' + d.projekty.slice().reverse().filter(function (p) { return p.status === 'zaakceptowany'; }).map(function (p) { return projektHtml(p, d); }).join('') + '</details>';
    $('#wd-tresc').innerHTML = tresc;
  }
  function pobierz(cicho) {
    return fetch(adres('/wdrozenie')).then(function (r) { return r.json().then(function (j) { return { r: r, j: j }; }); }).then(function (x) {
      if (x.r.status === 404) { pokazKomunikat('Ten link jest nieaktywny', 'Mógł wygasnąć albo zostać zastąpiony nowym. Odezwij się do nas, a przekażemy aktualny.'); return; }
      if (!x.r.ok || !x.j.ok) throw new Error('wdrozenie');
      var zmiana = !st.dane || JSON.stringify(st.dane) !== JSON.stringify(x.j);
      st.dane = x.j;
      $('#wd-glowny').hidden = false;
      if (x.j.dla) { var e = $('#wd-dla'); e.querySelector('b').textContent = x.j.dla; e.hidden = false; }
      if (zmiana) renderuj();
      $('#wd-stan').textContent = '';
    }).catch(function () { if (!cicho) pokazKomunikat('Nie udało się połączyć', 'Sprawdź połączenie z internetem i odśwież stronę. Jeśli problem wraca, zadzwoń.'); else $('#wd-stan').textContent = 'Brak połączenia'; });
  }
  function wyslij(sciezka, ciało, przycisk) {
    if (przycisk) przycisk.disabled = true;
    return fetch(adres(sciezka), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(ciało || {}) })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (!j.ok && przycisk) przycisk.disabled = false; return pobierz(true).then(function () { return j; }); })
      .catch(function () { if (przycisk) przycisk.disabled = false; $('#wd-stan').textContent = 'Nie udało się zapisać. Spróbuj ponownie.'; });
  }

  document.addEventListener('change', function (e) {
    if (e.target.matches('[data-potw]')) { var b = $('[data-akcja="akceptuj"]', e.target.closest('.wd-decyzja')); if (b) b.disabled = !e.target.checked; }
  });
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-akcja]');
    if (!b) return;
    var a = b.getAttribute('data-akcja'), id = b.getAttribute('data-id');
    if (a === 'akceptuj') return wyslij('/wdrozenie/akceptuj', { projekt: id, potwierdzam: true }, b);
    if (a === 'uwagi-otworz') { var u = $('.wd-uwagi', b.closest('.wd-decyzja')); u.hidden = !u.hidden; if (!u.hidden) $('textarea', u).focus(); return; }
    if (a === 'uwagi-wyslij') { var pole = $('#uw-' + id); if (!pole || !pole.value.trim()) { pole && pole.focus(); return; } return wyslij('/wdrozenie/uwagi', { projekt: id, tekst: pole.value }, b); }
    if (a === 'zaplacono') { if (window.confirm('Potwierdzasz, że przelew został wysłany?')) wyslij('/wdrozenie/zaplacono', {}, b); return; }
    if (a === 'kopiuj') { var w = b.getAttribute('data-w'); var t = b.textContent; try { navigator.clipboard.writeText(w).then(function () { b.textContent = 'Skopiowano'; setTimeout(function () { b.textContent = t; }, 1500); }); } catch (x) { window.prompt('Skopiuj (Ctrl+C):', w); } }
  });

  function start() {
    if (!API) return pokazKomunikat('Strona nie jest jeszcze włączona', 'Skontaktuj się z nami, a przekażemy Ci działający link.');
    if (!T) return pokazKomunikat('Brakuje linku', 'Otwórz tę stronę z linku, który dostałeś od Studio Widok. Jeśli go nie masz, odezwij się.');
    pobierz(false);
    setInterval(function () { if (!document.hidden && !$('textarea:focus')) pobierz(true); }, 60000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) pobierz(true); });
  }
  window.WDROZENIE_STRONA = { stan: st, pobierz: pobierz };
  start();
})();
