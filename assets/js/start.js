/*
 * Formularz startowy (strona klienta).
 *
 * Wczytuje definicję pól z start-schemat.js, odpowiedzi z API (po tajnym tokenie z linku) i zapisuje je na bieżąco,
 * sekcja po sekcji. Pliki idą osobnym zapytaniem. Gdy zapis się nie uda (brak sieci), szkic czeka w przeglądarce
 * i wysyła się przy kolejnej zmianie albo po powrocie sieci.
 */
(function () {
  'use strict';

  var SCH = window.START_SCHEMAT;
  var q = new URLSearchParams(location.search);
  var T = q.get('t') || '';
  var API = String(window.STUDIO_API || '').replace(/\/$/, '');
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && q.get('api')) API = q.get('api').replace(/\/$/, '');
  /* Podgląd (?podglad=1): pełny formularz bez serwera i bez tokenu. Odpowiedzi zostają tylko w tej przeglądarce, nic nie jest wysyłane. */
  var PODGLAD = q.get('podglad') === '1';
  var PODGLAD_DANE = {};
  if (PODGLAD) { API = 'https://podglad.lokalnie'; T = 'podglad'; }

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var losowe = function () { return Math.random().toString(36).slice(2, 10); };
  var godz = function (d) { d = d || new Date(); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); };
  var MB = 1024 * 1024;

  var st = { dla: '', sekcje: {}, pliki: [], status: 'szkic', aktywna: 'gabinet', zapis: '', wgrywane: {}, wyslano: null, przedWyslaniem: false };
  var KLUCZ_SZKICU = 'start-szkic-' + T.slice(0, 10);
  var terminy = {};
  var trwaZapis = Promise.resolve();

  function pokazKomunikat(tytul, tekst) {
    $('#st-uklad').hidden = true;
    var k = $('#st-komunikat');
    k.hidden = false;
    k.innerHTML = '<h1>' + esc(tytul) + '</h1><p>' + tekst + '</p><p><a class="st-btn" href="tel:+48783480341">Zadzwoń: 783 480 341</a> <a class="st-btn st-btn--cichy" href="mailto:kontakt@studio-widok.pl">kontakt@studio-widok.pl</a></p>';
  }

  /* ── Dostęp do odpowiedzi: ścieżka „sekcja|pole|indeks|podpole” ── */
  function wez(sc, utworz) {
    var cz = sc.split('|');
    var o = st.sekcje[cz[0]];
    if (!o) { if (!utworz) return undefined; o = st.sekcje[cz[0]] = {}; }
    for (var i = 1; i < cz.length; i++) {
      if (o == null) return undefined;
      var k = /^\d+$/.test(cz[i]) ? Number(cz[i]) : cz[i];
      if (i === cz.length - 1) return o[k];
      if (o[k] == null) { if (!utworz) return undefined; o[k] = /^\d+$/.test(cz[i + 1]) ? [] : {}; }
      o = o[k];
    }
    return o;
  }
  function ustaw(sc, wart) {
    var cz = sc.split('|');
    var o = st.sekcje[cz[0]] || (st.sekcje[cz[0]] = {});
    for (var i = 1; i < cz.length - 1; i++) {
      var k = /^\d+$/.test(cz[i]) ? Number(cz[i]) : cz[i];
      if (o[k] == null) o[k] = /^\d+$/.test(cz[i + 1]) ? [] : {};
      o = o[k];
    }
    var ost = cz[cz.length - 1];
    o[/^\d+$/.test(ost) ? Number(ost) : ost] = wart;
    oznaczZmiane(cz[0]);
  }

  /* ── Zapis ── */
  function szkicLokalny() { try { var d = {}; Object.keys(terminy).forEach(function (s) { d[s] = { dane: st.sekcje[s], czas: Date.now() }; }); if (Object.keys(d).length) localStorage.setItem(KLUCZ_SZKICU, JSON.stringify(d)); else localStorage.removeItem(KLUCZ_SZKICU); } catch (e) { /* bez zapisu lokalnego */ } }
  function oznaczZmiane(s) {
    clearTimeout(terminy[s]);
    terminy[s] = setTimeout(function () { zapiszSekcje(s); }, 800);
    pokazZapis('Zapisuję…');
    szkicLokalny();
    clearTimeout(oznaczZmiane.t);
    oznaczZmiane.t = setTimeout(odswiezPostep, 400);
  }
  function pokazZapis(t) { st.zapis = t; var e = $('#st-zapis'); if (e) e.textContent = t; }
  function zapiszSekcje(s) {
    delete terminy[s];
    var dane = JSON.parse(JSON.stringify(st.sekcje[s] || {}));
    delete dane._zm;
    trwaZapis = trwaZapis.then(function () {
      return fetch(API + '/formularz/sekcja?t=' + encodeURIComponent(T) + '&s=' + s, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ dane: dane }) })
        .then(function (r) { return r.json().then(function (j) { return { r: r, j: j }; }); })
        .then(function (x) {
          if (!x.r.ok || !x.j.ok) throw new Error('zapis');
          st.status = x.j.status || st.status;
          if (!terminy[s]) { szkicLokalny(); pokazZapis('Zapisano ' + godz()); }
        })
        .catch(function () { pokazZapis('Brak połączenia. Zapiszemy, gdy wróci.'); terminy[s] = setTimeout(function () { zapiszSekcje(s); }, 10000); });
    });
    return trwaZapis;
  }

  /* ── Pomocnicze do pól ── */
  function plikiPola(sciezka) { return st.pliki.filter(function (p) { return p.pole === sciezka; }); }
  function sciezkaPlikuPola(s, p, kontekst) {
    if (kontekst) return SCH.sciezkaPliku(s.id, kontekst.lista + '.' + kontekst.id, p.id);
    return SCH.sciezkaPliku(s.id, p.id);
  }
  function wartoscKarty(karta, pola) { var p = pola[0]; return karta && karta[p.id] ? String(karta[p.id]).trim() : ''; }

  /* ── Rysowanie pól ── */
  function idPola(sc) { return 'p-' + sc.replace(/[^a-z0-9]+/gi, '-'); }
  function etykieta(p, id) { return '<label class="st-et" for="' + id + '">' + esc(p.etykieta) + (p.k ? ' <span class="st-wazne">ważne</span>' : '') + '</label>' + (p.pod ? '<p class="st-pod" id="' + id + '-pod">' + esc(p.pod) + '</p>' : ''); }
  function legenda(p) { return '<legend class="st-et">' + esc(p.etykieta) + (p.k ? ' <span class="st-wazne">ważne</span>' : '') + '</legend>' + (p.pod ? '<p class="st-pod">' + esc(p.pod) + '</p>' : ''); }
  function opisOpcji(o) { return Array.isArray(o) ? [o[0], o[1]] : [o, o]; }

  function poleHtml(s, p, sc, kontekst) {
    var id = idPola(sc);
    var w = wez(sc);
    var opisany = p.pod ? ' aria-describedby="' + id + '-pod"' : '';
    switch (p.typ) {
      case 'tekst':
        return '<div class="st-pole">' + etykieta(p, id) + '<input id="' + id + '" type="text" data-sc="' + sc + '" value="' + esc(w || '') + '"' + opisany + ' autocomplete="off" /></div>';
      case 'dlugi':
        return '<div class="st-pole">' + etykieta(p, id) + '<textarea id="' + id + '" data-sc="' + sc + '" rows="' + (p.wiersze || 3) + '"' + opisany + '>' + esc(w || '') + '</textarea></div>';
      case 'wybor':
        return '<fieldset class="st-pole st-grupa">' + legenda(p) + '<div class="st-opcje">' + p.opcje.map(function (o, i) {
          var v = opisOpcji(o)[0], n = opisOpcji(o)[1];
          return '<label class="st-opcja"><input type="radio" name="' + id + '" data-sc="' + sc + '" value="' + esc(v) + '"' + (w === v ? ' checked' : '') + ' /><span>' + esc(n) + '</span></label>';
        }).join('') + '</div></fieldset>';
      case 'taknie':
        return '<fieldset class="st-pole st-grupa st-grupa--wiersz">' + legenda(p) + '<div class="st-opcje st-opcje--wiersz">' + SCH.TAKNIE.map(function (o) {
          return '<label class="st-opcja"><input type="radio" name="' + id + '" data-sc="' + sc + '" value="' + o[0] + '"' + (w === o[0] ? ' checked' : '') + ' /><span>' + o[1] + '</span></label>';
        }).join('') + '</div></fieldset>';
      case 'wiele': {
        var wyb = Array.isArray(w) ? w : [];
        var pelne = p.maks && wyb.length >= p.maks;
        var scInne = sc + '_inne';
        return '<fieldset class="st-pole st-grupa">' + legenda(p) + (p.maks ? '<p class="st-pod">Wybierz do ' + p.maks + '.</p>' : '') + '<div class="st-opcje st-opcje--chipy">' + p.opcje.map(function (o) {
          var on = wyb.indexOf(o) >= 0;
          return '<label class="st-chip' + (on ? ' on' : '') + '"><input type="checkbox" data-sc="' + sc + '" data-wiele value="' + esc(o) + '"' + (on ? ' checked' : '') + (!on && pelne ? ' disabled' : '') + ' /><span>' + esc(o) + '</span></label>';
        }).join('') + '</div>' + (p.inne && (wyb.indexOf('Inne') >= 0 || wyb.indexOf('Inni') >= 0) ? '<div class="st-pole st-pole--w"><label class="st-et" for="' + idPola(scInne) + '">Jakie?</label><input id="' + idPola(scInne) + '" type="text" data-sc="' + scInne + '" value="' + esc(wez(scInne) || '') + '" /></div>' : '') + '</fieldset>';
      }
      case 'kolor': {
        var hex = /^#[0-9a-f]{6}$/i.test(w || '') ? w : '';
        return '<div class="st-pole">' + etykieta(p, id) + '<div class="st-kolor"><input id="' + id + '" type="color" data-sc="' + sc + '" data-kolor value="' + (hex || '#1f5fd6') + '" aria-label="Wybierz kolor" /><input type="text" data-sc="' + sc + '" data-kolor-hex value="' + esc(w || '') + '" placeholder="#1F5FD6" maxlength="7" aria-label="Kod koloru" /><button type="button" class="st-btn st-btn--maly st-btn--cichy" data-akcja="kolor-wyczysc" data-sc="' + sc + '">Brak</button></div></div>';
      }
      case 'linki': {
        var lista = Array.isArray(w) ? w : [];
        var wiersze = lista.map(function (x, i) {
          return '<div class="st-linek"><input type="text" data-sc="' + sc + '|' + i + '|url" value="' + esc(x.url || '') + '" placeholder="https://…" aria-label="Adres ' + (i + 1) + '" />' + (p.opcjaKomentarza ? '<input type="text" data-sc="' + sc + '|' + i + '|kom" value="' + esc(x.kom || '') + '" placeholder="Co Ci się tu podoba?" aria-label="Komentarz ' + (i + 1) + '" />' : '') + '<button type="button" class="st-ikona" data-akcja="linek-usun" data-sc="' + sc + '" data-i="' + i + '" aria-label="Usuń pozycję ' + (i + 1) + '">×</button></div>';
        }).join('');
        return '<fieldset class="st-pole st-grupa">' + legenda(p) + wiersze + ((p.maks || 8) > lista.length ? '<button type="button" class="st-btn st-btn--maly st-btn--cichy" data-akcja="linek-dodaj" data-sc="' + sc + '">+ Dodaj</button>' : '') + '</fieldset>';
      }
      case 'plik': {
        var sciezka = sciezkaPlikuPola(s, p, kontekst);
        var pl = plikiPola(sciezka);
        var wg = st.wgrywane[sciezka] || [];
        var pelneP = p.maks && pl.length >= p.maks;
        return '<div class="st-pole st-pole--plik" data-sciezka-pliku="' + esc(sciezka) + '"><span class="st-et" id="' + id + '-et">' + esc(p.etykieta) + (p.k ? ' <span class="st-wazne">ważne</span>' : '') + '</span>' + (p.pod ? '<p class="st-pod">' + esc(p.pod) + '</p>' : '') +
          '<ul class="st-pliki">' + pl.map(function (f) { return plikHtml(f); }).join('') + wg.map(function (f) { return '<li class="st-plik st-plik--' + f.stan + '"><span class="st-plik__n">' + esc(f.nazwa) + '</span><small>' + (f.stan === 'blad' ? esc(f.blad) : 'wysyłanie…') + '</small></li>'; }).join('') + '</ul>' +
          (pelneP ? '<p class="st-pod">Osiągnięto limit plików w tym miejscu (' + p.maks + ').</p>' : '<label class="st-drop" for="' + id + '"><b>' + (p.wiele ? 'Dodaj pliki' : 'Dodaj plik') + '</b><span>Przeciągnij tutaj albo wybierz. Do 8 MB każdy.</span><input id="' + id + '" type="file"' + (p.wiele ? ' multiple' : '') + (p.akceptuj ? ' accept="' + esc(p.akceptuj) + '"' : '') + ' data-plik="' + esc(sciezka) + '" aria-describedby="' + id + '-et" /></label>') + '</div>';
      }
      case 'lista': return listaHtml(s, p, sc);
      default: return '';
    }
  }
  function plikHtml(f) {
    var obraz = /^image\/(jpeg|png|webp|gif|svg\+xml)$/.test(f.mime) && (!PODGLAD || !!PODGLAD_DANE[f.id]);
    var adres = PODGLAD ? PODGLAD_DANE[f.id] || '' : API + '/formularz/plik?t=' + encodeURIComponent(T) + '&id=' + f.id;
    return '<li class="st-plik st-plik--ok">' + (obraz ? '<img src="' + adres + '" alt="" loading="lazy" />' : '<span class="st-plik__ik" aria-hidden="true">PDF</span>') + '<span class="st-plik__n">' + esc(f.nazwa) + '</span><small>' + rozmiarTekst(f.rozmiar) + '</small><button type="button" class="st-ikona" data-akcja="plik-usun" data-id="' + f.id + '" aria-label="Usuń plik ' + esc(f.nazwa) + '">×</button></li>';
  }
  function rozmiarTekst(b) { return b >= MB ? (b / MB).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }

  function listaHtml(s, p, sc) {
    var karty = wez(sc);
    if (!Array.isArray(karty)) karty = [];
    if (!karty.length && (p.min || 0) >= 1) { ustawBezZapisu(sc, [nowaKarta()]); karty = wez(sc); }
    var html = karty.map(function (k, i) {
      var skSc = sc + '|' + i;
      var tytul = wartoscKarty(k, p.pola) || (p.element.charAt(0).toUpperCase() + p.element.slice(1) + ' ' + (i + 1));
      return '<section class="st-karta" aria-label="' + esc(tytul) + '"><header class="st-karta__g"><h3>' + (i + 1) + '. ' + esc(tytul) + '</h3>' + (karty.length > (p.min || 0) ? '<button type="button" class="st-btn st-btn--maly st-btn--cichy" data-akcja="karta-usun" data-sc="' + sc + '" data-i="' + i + '">Usuń</button>' : '') + '</header>' +
        p.pola.map(function (pp) { return poleHtml(s, pp, skSc + '|' + pp.id, { lista: p.id, id: k._id }); }).join('') + '</section>';
    }).join('');
    return '<div class="st-lista"><p class="st-et">' + esc(p.etykieta) + (p.k ? ' <span class="st-wazne">ważne</span>' : '') + '</p>' + html + (karty.length < (p.maks || 20) ? '<button type="button" class="st-btn st-btn--cichy" data-akcja="karta-dodaj" data-sc="' + sc + '">+ ' + esc(p.dodaj) + '</button>' : '') + '</div>';
  }
  function nowaKarta() { return { _id: losowe() }; }
  function ustawBezZapisu(sc, w) { var cz = sc.split('|'); var o = st.sekcje[cz[0]] || (st.sekcje[cz[0]] = {}); o[cz[1]] = w; }

  /* ── Widoki: nawigacja, sekcja, podsumowanie ── */
  function ikonaStanu(stan) { return { puste: '○', w_trakcie: '◐', gotowe: '●', pominieta: '–' }[stan] || '○'; }
  function nawigacja() {
    var p = SCH.postep(st.sekcje, st.pliki);
    var html = SCH.sekcje.map(function (s, i) {
      var x = p.sekcje[i];
      return '<button type="button" class="st-nav__poz' + (st.aktywna === s.id ? ' on' : '') + ' st-stan--' + x.stan + '" data-akcja="idz" data-id="' + s.id + '"' + (st.aktywna === s.id ? ' aria-current="step"' : '') + '><span class="st-nav__ik" aria-hidden="true">' + ikonaStanu(x.stan) + '</span><span class="st-nav__t">' + esc(s.tytul) + '</span><span class="st-nav__st visually-hidden">' + { puste: 'nie zaczęte', w_trakcie: 'w trakcie', gotowe: 'gotowe', pominieta: 'pominięte na razie' }[x.stan] + '</span></button>';
    }).join('') + '<button type="button" class="st-nav__poz st-nav__poz--koniec' + (st.aktywna === 'podsumowanie' ? ' on' : '') + '" data-akcja="idz" data-id="podsumowanie"><span class="st-nav__ik" aria-hidden="true">✓</span><span class="st-nav__t">Podsumowanie i wysyłka</span></button>';
    return html;
  }
  function odswiezPostep() {
    var p = SCH.postep(st.sekcje, st.pliki);
    $('#st-pasek').style.width = p.procent + '%';
    $('#st-nav').innerHTML = nawigacja();
    var licz = $('#st-licznik');
    if (licz) licz.textContent = p.procent + '% ważnych pytań';
  }
  function sekcjaHtml(s, i) {
    var dane = st.sekcje[s.id] || {};
    var prev = SCH.sekcje[i - 1], next = SCH.sekcje[i + 1];
    var pola = s.pola.map(function (p) { return poleHtml(s, p, s.id + '|' + p.id); }).join('');
    return '<section class="st-sekcja" aria-labelledby="st-h">' +
      '<p class="st-krok">Krok ' + (i + 1) + ' z ' + SCH.sekcje.length + ' · około ' + esc(s.czas) + '</p><h1 id="st-h" tabindex="-1">' + esc(s.tytul) + '</h1><p class="st-po-co">' + esc(s.po_co) + '</p>' +
      (i === 0 && !st.sekcje._wstep ? '<aside class="st-wstep"><b>Jak to działa</b><p>Wszystko zapisuje się na bieżąco, a do formularza możesz wrócić tym samym linkiem w każdej chwili. Czego nie masz pod ręką, pomiń: nic się nie stanie. Pola oznaczone „ważne” są potrzebne do rozpoczęcia projektu graficznego, ale nawet bez nich możesz wysłać formularz i dosłać resztę później.</p><button type="button" class="st-btn st-btn--maly st-btn--cichy" data-akcja="wstep-ukryj">Rozumiem</button></aside>' : '') +
      '<label class="st-pomin"><input type="checkbox" data-akcja-zmiana="pomin" data-s="' + s.id + '"' + (dane._pomin ? ' checked' : '') + ' /> Wypełnię tę część później</label>' +
      '<div class="st-pola' + (dane._pomin ? ' st-pola--wyciszone' : '') + '">' + pola + '</div>' +
      '<nav class="st-dol" aria-label="Poprzednia i następna część">' + (prev ? '<button type="button" class="st-btn st-btn--cichy" data-akcja="idz" data-id="' + prev.id + '">← ' + esc(prev.tytul) + '</button>' : '<span></span>') + '<button type="button" class="st-btn" data-akcja="idz" data-id="' + (next ? next.id : 'podsumowanie') + '">' + (next ? esc(next.tytul) + ' →' : 'Podsumowanie →') + '</button></nav></section>';
  }
  function podsumowanieHtml() {
    var p = SCH.postep(st.sekcje, st.pliki);
    var wyslany = st.status === 'wyslany' || st.status === 'zmieniony';
    var braki = p.braki;
    return '<section class="st-sekcja" aria-labelledby="st-h"><p class="st-krok">Ostatni krok</p><h1 id="st-h" tabindex="-1">Podsumowanie i wysyłka</h1>' +
      '<div class="st-wynik"><b id="st-licznik">' + p.procent + '% ważnych pytań</b><span>Brief jest tym pełniejszy, im więcej wiemy. Możesz go wysłać już teraz i uzupełniać dalej.</span></div>' +
      '<ul class="st-lista-sekcji">' + SCH.sekcje.map(function (s, i) { var x = p.sekcje[i]; return '<li class="st-stan--' + x.stan + '"><button type="button" class="st-link" data-akcja="idz" data-id="' + s.id + '"><span aria-hidden="true">' + ikonaStanu(x.stan) + '</span> ' + esc(s.tytul) + '</button><small>' + ({ puste: 'nie zaczęte', w_trakcie: x.brakuje.length + ' ' + (x.brakuje.length === 1 ? 'ważna rzecz do uzupełnienia' : 'ważnych rzeczy do uzupełnienia'), gotowe: 'gotowe', pominieta: 'wypełnisz później' }[x.stan]) + '</small></li>'; }).join('') + '</ul>' +
      (braki.length ? '<details class="st-braki"><summary>Czego jeszcze brakuje (' + braki.length + ')</summary><ul>' + braki.slice(0, 30).map(function (b) { return '<li><button type="button" class="st-link" data-akcja="idz" data-id="' + b.sekcja + '">' + esc(b.pole) + '</button></li>'; }).join('') + '</ul></details>' : '<p class="st-ok">Wszystkie ważne pytania mają odpowiedź.</p>') +
      (wyslany ? '<p class="st-ok st-ok--duze" role="status">Formularz został wysłany' + (st.wyslano ? ' (' + esc(new Date(st.wyslano).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' })) + ')' : '') + '. Dziękujemy! Zmiany, które wprowadzisz teraz, też do nas dotrą.</p>' : '') +
      '<div class="st-wysylka"><button type="button" class="st-btn" data-akcja="wyslij" id="st-wyslij">' + (wyslany ? 'Wyślij ponownie po zmianach' : 'Wyślij do Studio Widok') + '</button><p class="st-pod">Po wysłaniu dostajemy powiadomienie i zaczynamy od projektu graficznego. Plików i odpowiedzi nie musisz podawać drugi raz.</p></div>' +
      '<nav class="st-dol"><button type="button" class="st-btn st-btn--cichy" data-akcja="idz" data-id="' + SCH.sekcje[SCH.sekcje.length - 1].id + '">← ' + esc(SCH.sekcje[SCH.sekcje.length - 1].tytul) + '</button><span></span></nav></section>';
  }
  function render(zFokusem) {
    var g = $('#st-glowny');
    var i = SCH.sekcje.findIndex(function (s) { return s.id === st.aktywna; });
    g.innerHTML = st.aktywna === 'podsumowanie' || i < 0 ? podsumowanieHtml() : sekcjaHtml(SCH.sekcje[i], i);
    $('#st-nav').innerHTML = nawigacja();
    if (zFokusem) { var h = $('#st-h'); if (h) h.focus({ preventScroll: true }); window.scrollTo(0, 0); }
    odswiezPostep();
  }
  function przejdz(id) {
    $$('#st-glowny input, #st-glowny textarea').forEach(function () { /* zmiany już w stanie */ });
    st.aktywna = id;
    try { history.replaceState(null, '', '#' + id); } catch (e) { /* bez historii */ }
    render(true);
  }

  /* ── Pliki ── */
  function przygotujPlik(plik) {
    var mime = plik.type || '';
    if (!/^image\/(jpeg|png|webp)$/.test(mime)) return Promise.resolve(plik.size > 8 * MB ? Promise.reject(new Error('rozmiar')) : plik);
    return new Promise(function (ok, blad) {
      var u = URL.createObjectURL(plik), img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(u);
        var sk = Math.min(1, 2600 / Math.max(img.naturalWidth, img.naturalHeight));
        if (sk === 1 && plik.size <= 2 * MB) return ok(plik);
        var c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * sk); c.height = Math.round(img.naturalHeight * sk);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (b) { if (!b || b.size > 8 * MB) blad(new Error('rozmiar')); else ok(b); }, mime === 'image/png' ? 'image/png' : 'image/jpeg', 0.86);
      };
      img.onerror = function () { URL.revokeObjectURL(u); blad(new Error('obraz')); };
      img.src = u;
    });
  }
  var BLEDY_PLIKU = { rozmiar: 'plik jest większy niż 8 MB', typ: 'ten typ pliku nie jest obsługiwany', obraz: 'nie udało się odczytać zdjęcia', limit: 'osiągnięto limit plików', siec: 'brak połączenia, spróbuj ponownie' };
  var kolejkaPlikow = Promise.resolve();
  function wgraj(sciezka, pliki) {
    pliki.forEach(function (plik) {
      var w = { nazwa: plik.name, stan: 'wysyla', blad: '' };
      (st.wgrywane[sciezka] = st.wgrywane[sciezka] || []).push(w);
      kolejkaPlikow = kolejkaPlikow.then(function () {
        return przygotujPlik(plik).then(function (blob) {
          var mime = blob.type || plik.type;
          return fetch(API + '/formularz/plik?t=' + encodeURIComponent(T) + '&pole=' + encodeURIComponent(sciezka) + '&nazwa=' + encodeURIComponent(plik.name), { method: 'POST', headers: { 'content-type': mime }, body: blob })
            .then(function (r) { return r.json().then(function (j) { return { r: r, j: j }; }); });
        }).then(function (x) {
          if (x.r.ok && x.j.ok) { st.pliki.push(x.j.plik); st.wgrywane[sciezka].splice(st.wgrywane[sciezka].indexOf(w), 1); }
          else { w.stan = 'blad'; w.blad = BLEDY_PLIKU[x.j.blad] || 'spróbuj ponownie'; }
        }).catch(function (e) { w.stan = 'blad'; w.blad = BLEDY_PLIKU[e && e.message] || BLEDY_PLIKU.siec; })
          .then(function () {
            odswiezPlikiPola(sciezka); odswiezPostep();
            /* Gdy skończyły się wszystkie wysyłki, przerysowujemy pole (limit plików, podgląd). */
            var trwa = Object.keys(st.wgrywane).some(function (k) { return st.wgrywane[k].some(function (x) { return x.stan === 'wysyla'; }); });
            if (!trwa) render(false);
          });
      });
    });
    odswiezPlikiPola(sciezka);
  }
  function odswiezPlikiPola(sciezka) {
    var el = $$('[data-sciezka-pliku]').filter(function (x) { return x.getAttribute('data-sciezka-pliku') === sciezka; })[0];
    if (!el) return;
    var i = SCH.sekcje.findIndex(function (s) { return s.id === st.aktywna; });
    if (i < 0) return;
    /* Przerysowujemy tylko listę plików i pole wyboru, bez ruszania reszty formularza. */
    var tmp = document.createElement('div');
    tmp.innerHTML = '<div></div>';
    var ul = el.querySelector('.st-pliki');
    var wg = st.wgrywane[sciezka] || [];
    if (ul) ul.innerHTML = plikiPola(sciezka).map(plikHtml).join('') + wg.map(function (f) { return '<li class="st-plik st-plik--' + f.stan + '"><span class="st-plik__n">' + esc(f.nazwa) + '</span><small>' + (f.stan === 'blad' ? esc(f.blad) : 'wysyłanie…') + '</small></li>'; }).join('');
  }

  /* ── Zdarzenia ── */
  function podpiecie() {
    var g = $('#st-glowny');
    g.addEventListener('input', function (e) {
      var t = e.target, sc = t.getAttribute('data-sc');
      if (!sc || t.type === 'radio' || t.type === 'checkbox' || t.type === 'file') return;
      if (t.hasAttribute('data-kolor')) { ustaw(sc, t.value); var hex = $('[data-kolor-hex][data-sc="' + sc + '"]', g); if (hex) hex.value = t.value; return; }
      if (t.hasAttribute('data-kolor-hex')) { ustaw(sc, t.value); if (/^#[0-9a-f]{6}$/i.test(t.value)) { var k = $('[data-kolor][data-sc="' + sc + '"]', g); if (k) k.value = t.value; } return; }
      ustaw(sc, t.value);
      /* Tytuł karty (np. imię osoby) odświeżamy bez przerysowania pola. */
      var karta = t.closest('.st-karta');
      if (karta && /\|0$|\|imie$|\|nazwa$/.test(sc)) { var h = $('h3', karta); var nr = h.textContent.match(/^\d+\./); if (h && t.value.trim()) h.textContent = (nr ? nr[0] + ' ' : '') + t.value.trim(); }
    });
    g.addEventListener('change', function (e) {
      var t = e.target, sc = t.getAttribute('data-sc');
      if (t.hasAttribute('data-akcja-zmiana') && t.getAttribute('data-akcja-zmiana') === 'pomin') {
        var s = t.getAttribute('data-s'); (st.sekcje[s] = st.sekcje[s] || {})._pomin = t.checked; oznaczZmiane(s);
        $('.st-pola', g).classList.toggle('st-pola--wyciszone', t.checked); odswiezPostep(); return;
      }
      if (t.hasAttribute('data-plik')) { wgraj(t.getAttribute('data-plik'), Array.prototype.slice.call(t.files)); t.value = ''; return; }
      if (!sc) return;
      if (t.type === 'radio') { ustaw(sc, t.value); odswiezPostep(); return; }
      if (t.hasAttribute('data-wiele')) {
        var teraz = (wez(sc) || []).slice();
        var i = teraz.indexOf(t.value);
        if (t.checked && i < 0) teraz.push(t.value);
        if (!t.checked && i >= 0) teraz.splice(i, 1);
        ustaw(sc, teraz);
        var y = window.scrollY; var f = t.value;
        render(false); window.scrollTo(0, y);
        var n = $$('input[data-wiele]').filter(function (x) { return x.value === f && x.getAttribute('data-sc') === sc; })[0]; if (n) n.focus({ preventScroll: true });
        return;
      }
    });
    g.addEventListener('click', function (e) {
      var b = e.target.closest('[data-akcja]');
      if (!b) return;
      var a = b.getAttribute('data-akcja'), sc = b.getAttribute('data-sc');
      if (a === 'idz') return przejdz(b.getAttribute('data-id'));
      if (a === 'wstep-ukryj') { (st.sekcje._wstep = true); try { localStorage.setItem('start-wstep', '1'); } catch (x) { /* bez zapisu */ } return render(false); }
      if (a === 'linek-dodaj') { var l = (wez(sc) || []).slice(); l.push({ url: '', kom: '' }); ustaw(sc, l); return render(false); }
      if (a === 'linek-usun') { var l2 = (wez(sc) || []).slice(); l2.splice(Number(b.getAttribute('data-i')), 1); ustaw(sc, l2); return render(false); }
      if (a === 'karta-dodaj') { var k = (wez(sc) || []).slice(); k.push(nowaKarta()); ustaw(sc, k); render(false); var ost = $$('.st-karta', g).pop(); if (ost) { var pi = $('input, textarea', ost); if (pi) pi.focus(); } return; }
      if (a === 'karta-usun') { if (!confirm('Usunąć tę kartę razem z jej danymi?')) return; var k2 = (wez(sc) || []).slice(); k2.splice(Number(b.getAttribute('data-i')), 1); ustaw(sc, k2); return render(false); }
      if (a === 'kolor-wyczysc') { ustaw(sc, ''); return render(false); }
      if (a === 'plik-usun') {
        var id = b.getAttribute('data-id');
        return fetch(API + '/formularz/plik?t=' + encodeURIComponent(T) + '&id=' + id, { method: 'DELETE' }).then(function (r) { if (r.ok) { st.pliki = st.pliki.filter(function (p) { return p.id !== id; }); render(false); } });
      }
      if (a === 'wyslij') {
        b.disabled = true; b.textContent = 'Wysyłam…';
        Object.keys(terminy).forEach(function (s) { clearTimeout(terminy[s]); zapiszSekcje(s); });
        return trwaZapis.then(function () { return fetch(API + '/formularz/wyslij?t=' + encodeURIComponent(T), { method: 'POST' }); }).then(function (r) { return r.json(); }).then(function (j) {
          if (j.ok) { st.status = 'wyslany'; st.wyslano = j.wyslano; render(true); } else { b.disabled = false; b.textContent = 'Spróbuj ponownie'; }
        }).catch(function () { b.disabled = false; b.textContent = 'Brak połączenia, spróbuj ponownie'; });
      }
    });
    /* Przeciąganie plików na pole. */
    g.addEventListener('dragover', function (e) { var d = e.target.closest('.st-drop'); if (d) { e.preventDefault(); d.classList.add('st-drop--nad'); } });
    g.addEventListener('dragleave', function (e) { var d = e.target.closest('.st-drop'); if (d) d.classList.remove('st-drop--nad'); });
    g.addEventListener('drop', function (e) {
      var d = e.target.closest('.st-drop'); if (!d) return;
      e.preventDefault(); d.classList.remove('st-drop--nad');
      var wej = $('input[type=file]', d);
      if (wej && e.dataTransfer && e.dataTransfer.files.length) wgraj(wej.getAttribute('data-plik'), Array.prototype.slice.call(wej.multiple ? e.dataTransfer.files : [e.dataTransfer.files[0]]));
    });
    $('#st-nav').addEventListener('click', function (e) { var b = e.target.closest('[data-akcja="idz"]'); if (b) przejdz(b.getAttribute('data-id')); });
    window.addEventListener('online', function () { Object.keys(terminy).forEach(function (s) { clearTimeout(terminy[s]); zapiszSekcje(s); }); });
    window.addEventListener('beforeunload', function () { Object.keys(terminy).forEach(function (s) { clearTimeout(terminy[s]); }); });
  }


  /* ── Podgląd: atrapa serwera w przeglądarce ── */
  function instalujPodglad() {
    var KL = 'start-podglad-v1';
    var ps = { sekcje: {}, pliki: [], status: 'szkic', wyslano: null };
    try { var z0 = JSON.parse(localStorage.getItem(KL) || 'null'); if (z0) ps = z0; } catch (e) { /* pusty start */ }
    var zapisz = function () { try { localStorage.setItem(KL, JSON.stringify(ps)); } catch (e) { /* bez zapisu */ } };
    var json = function (o, status) { return Promise.resolve(new Response(JSON.stringify(o), { status: status || 200, headers: { 'content-type': 'application/json' } })); };
    var prawdziwy = window.fetch.bind(window);
    window.fetch = function (url, o) {
      url = String(url);
      if (url.indexOf(API) !== 0) return prawdziwy(url, o);
      var u = new URL(url);
      var m = (o && o.method) || 'GET';
      var sciezka = u.pathname;
      if (sciezka === '/formularz' && m === 'GET') return json({ ok: true, dla: 'Przykładowy gabinet (podgląd)', sekcje: ps.sekcje, pliki: ps.pliki, status: ps.status, wyslano: ps.wyslano });
      if (sciezka === '/formularz/sekcja' && m === 'PUT') {
        var cialo = JSON.parse(o.body).dane || {};
        cialo._zm = new Date().toISOString();
        ps.sekcje[u.searchParams.get('s')] = cialo; zapisz();
        return json({ ok: true, status: ps.status });
      }
      if (sciezka === '/formularz/plik' && m === 'POST') {
        return o.body.arrayBuffer().then(function (bajty) {
          var id = 'p' + losowe();
          var meta = { id: id, pole: u.searchParams.get('pole'), nazwa: u.searchParams.get('nazwa') || 'plik', mime: o.body.type || 'application/octet-stream', rozmiar: bajty.byteLength, czas: new Date().toISOString() };
          PODGLAD_DANE[id] = URL.createObjectURL(o.body);
          ps.pliki.push(meta); zapisz();
          return json({ ok: true, plik: meta });
        });
      }
      if (sciezka === '/formularz/plik' && m === 'DELETE') { var id2 = u.searchParams.get('id'); ps.pliki = ps.pliki.filter(function (p) { return p.id !== id2; }); zapisz(); return json({ ok: true }); }
      if (sciezka === '/formularz/wyslij' && m === 'POST') { ps.status = 'wyslany'; ps.wyslano = new Date().toISOString(); zapisz(); return json({ ok: true, wyslano: ps.wyslano }); }
      return json({ ok: false }, 404);
    };
    var gora = $('.st-gora');
    if (gora) gora.insertAdjacentHTML('afterend', '<p role="note" style="margin:0;padding:10px 16px;background:#fff4d6;color:#5a3d00;border-bottom:1px solid #f2d27a;font-size:0.95rem"><b>Podgląd formularza.</b> Tak go zobaczy klient. Nic nie jest wysyłane, a odpowiedzi zostają tylko w tej przeglądarce. <a href="#" id="st-podglad-czysc" style="color:inherit;font-weight:700">Wyczyść odpowiedzi</a></p>');
    var c = $('#st-podglad-czysc');
    if (c) c.addEventListener('click', function (e) { e.preventDefault(); try { localStorage.removeItem(KL); localStorage.removeItem(KLUCZ_SZKICU); localStorage.removeItem('start-wstep'); } catch (x) { /* bez zapisu */ } location.reload(); });
  }

  /* ── Start ── */
  function start() {
    if (PODGLAD) instalujPodglad();
    if (!SCH) return pokazKomunikat('Nie udało się wczytać formularza', 'Odśwież stronę. Jeśli to się powtarza, napisz do nas.');
    if (!API) return pokazKomunikat('Formularz nie jest jeszcze włączony', 'Skontaktuj się z nami, a przekażemy Ci działający link.');
    if (!T) return pokazKomunikat('Brakuje linku do formularza', 'Otwórz formularz z linku, który dostałeś od Studio Widok. Jeśli go nie masz, odezwij się.');
    fetch(API + '/formularz?t=' + encodeURIComponent(T)).then(function (r) { return r.json().then(function (j) { return { r: r, j: j }; }); }).then(function (x) {
      if (x.r.status === 404) return pokazKomunikat('Ten link jest nieaktywny', 'Mógł wygasnąć albo zostać zastąpiony nowym. Odezwij się do nas, a przekażemy aktualny.');
      if (!x.r.ok || !x.j.ok) throw new Error('start');
      var j = x.j;
      st.dla = j.dla || ''; st.sekcje = j.sekcje || {}; st.pliki = j.pliki || []; st.status = j.status; st.wyslano = j.wyslano;
      try { if (localStorage.getItem('start-wstep')) st.sekcje._wstep = true; } catch (e) { /* bez zapisu */ }
      /* Szkic z przeglądarki, który nie dotarł na serwer (np. zamknięta karta bez sieci). */
      try {
        var szkic = JSON.parse(localStorage.getItem(KLUCZ_SZKICU) || 'null');
        if (szkic) Object.keys(szkic).forEach(function (s) { var zm = st.sekcje[s] && st.sekcje[s]._zm ? Date.parse(st.sekcje[s]._zm) : 0; if (szkic[s].czas > zm) { st.sekcje[s] = szkic[s].dane; oznaczZmiane(s); } });
      } catch (e) { /* uszkodzony szkic pomijamy */ }
      $('#st-uklad').hidden = false;
      if (st.dla) { var d = $('#st-dla'); d.querySelector('b').textContent = st.dla; d.hidden = false; }
      var h = (location.hash || '').replace('#', '');
      if (h === 'podsumowanie' || SCH.sekcje.some(function (s) { return s.id === h; })) st.aktywna = h;
      podpiecie();
      render(false);
      pokazZapis(st.zapis || (j.sekcje && Object.keys(j.sekcje).length ? 'Zapisane odpowiedzi wczytane' : ''));
    }).catch(function () { pokazKomunikat('Nie udało się połączyć', 'Sprawdź połączenie z internetem i odśwież stronę. Jeśli problem wraca, zadzwoń.'); });
  }
  window.START_STRONA = { stan: st, przejdz: przejdz, render: render };
  start();
})();
