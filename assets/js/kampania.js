/*
 * Strona docelowa kampanii: formularz leada (zapis w chmurze, karta w CRM ze źródłem i zgodą), UTM, licznik miejsc pilotażu,
 * baner cookies i opcjonalny piksel Meta (tylko po zgodzie i tylko gdy w stronie ustawiono window.KAMPANIA.pixelId).
 */
(function () {
  'use strict';
  var K = window.KAMPANIA || {};
  var q = new URLSearchParams(location.search);
  var $ = function (s, r) { return (r || document).querySelector(s); };

  /* ── UTM: zapamiętujemy z pierwszego wejścia w tej sesji ── */
  var UTM_KLUCZE = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  var utm = {};
  try { utm = JSON.parse(sessionStorage.getItem('kp-utm') || '{}') || {}; } catch (e) { utm = {}; }
  UTM_KLUCZE.forEach(function (k) { var v = (q.get(k) || '').slice(0, 80); if (v) utm[k] = v; });
  try { sessionStorage.setItem('kp-utm', JSON.stringify(utm)); } catch (e) { /* bez zapisu */ }

  /* ── Spójność reklama → strona: nagłówek i lead dopasowane do bólu z reklamy (utm_content b1…b3). Bez UTM zostaje tekst domyślny. ── */
  var WARIANTY = {
    b1: { h1: ['Pacjent nie przyszedł? ', 'Przypomni mu SMS.'], lead: 'Strona z rezerwacją online wysyła pacjentowi SMS z przypomnieniem dzień przed wizytą i pozwala zmienić termin bez dzwonienia. Ty widzisz wszystko w jednym kalendarzu. Gotowe w około 14 dni.' },
    b2: { h1: ['Trzy nieodebrane? ', 'Rezerwację przyjmie strona.'], lead: 'Pacjent wybiera Twój wolny termin o każdej porze i dostaje SMS z potwierdzeniem, a Ty nie musisz odbierać telefonu w trakcie zabiegu. Gotowe w około 14 dni.' },
    b3: { h1: ['23:12. Ktoś szuka fizjoterapeuty. ', 'Niech trafi do Ciebie.'], lead: 'Własna strona z osobnym wejściem na każdą dolegliwość, którą leczysz, i rezerwacją online w mniej niż minutę. Bez portalu i bez prowizji. Gotowe w około 14 dni.' }
  };
  (function dopasujNaglowek() {
    var w = WARIANTY[String(utm.utm_content || '').slice(0, 2)];
    var h1 = $('.kp-hero .ofr-hero__h1'), lead = $('.kp-hero .ofr-hero__lead');
    if (!w || !h1 || !lead) return;
    h1.textContent = '';
    w.h1.forEach(function (t, i) {
      if (i % 2 === 1) { var m = document.createElement('mark'); m.textContent = t; h1.appendChild(m); }
      else h1.appendChild(document.createTextNode(t));
    });
    lead.textContent = w.lead;
  })();

  /* ── Identyfikator leada: web-…, ten sam dla ofert z linku po wysłaniu formularza ── */
  function noweId() {
    var a = 'abcdefghjkmnpqrstuvwxyz23456789', s = 'web-';
    var b = new Uint8Array(10);
    (window.crypto || window.msCrypto).getRandomValues(b);
    for (var i = 0; i < b.length; i++) s += a[b[i] % a.length];
    return s;
  }

  /* ── Baner cookies i piksel Meta (tylko za zgodą) ── */
  var KLUCZ_ZGODY = 'kp-cookies';
  function zgoda() { try { return localStorage.getItem(KLUCZ_ZGODY); } catch (e) { return null; } }
  function ustawZgode(w) { try { localStorage.setItem(KLUCZ_ZGODY, w); } catch (e) { /* bez zapisu */ } }
  function wlaczPiksel() {
    if (!K.pixelId || window.fbq) return;
    /* Standardowy fragment Meta, ładowany wyłącznie po zgodzie. */
    (function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = true; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    /* Bez automatycznej konfiguracji Meta: nie zbiera pól formularza, tekstów przycisków ani dopasowania e-maila/telefonu. */
    window.fbq('set', 'autoConfig', false, String(K.pixelId));
    window.fbq('init', String(K.pixelId));
    window.fbq('track', 'PageView');
  }
  function zdarzeniePiksela(nazwa) { if (window.fbq && zgoda() === 'tak') window.fbq('track', nazwa); }
  (function cookies() {
    var baner = $('#kp-cookies'), zmien = $('#kp-cookies-zmien');
    if (!K.pixelId) return; /* bez piksela nic nie mierzymy, więc nie ma o co pytać */
    if (zmien) zmien.hidden = false;
    if (zgoda() === 'tak') wlaczPiksel();
    else if (zgoda() === null && baner) baner.hidden = false;
    var tak = $('#kp-cookies-tak'), nie = $('#kp-cookies-nie');
    if (tak) tak.addEventListener('click', function () { ustawZgode('tak'); baner.hidden = true; wlaczPiksel(); });
    if (nie) nie.addEventListener('click', function () { ustawZgode('nie'); baner.hidden = true; });
    if (zmien) zmien.addEventListener('click', function () { baner.hidden = false; });
  })();

  /* ── Licznik wolnych miejsc w pilotażu (prawdziwy, z serwera) ── */
  if (window.ODBIORNIK && window.ODBIORNIK.pilotaz) {
    window.ODBIORNIK.pilotaz().then(function (j) {
      if (!j) return;
      var wolne = Math.max(0, j.miejsc - j.zajete);
      var licznik = $('[data-pilot-wolne]');
      if (licznik) licznik.textContent = wolne ? 'Wolne miejsca: ' + wolne + ' z ' + j.miejsc : 'Wszystkie miejsca zajęte.';
      if (!wolne) {
        var blok = $('[data-pilot-blok]'); if (blok) blok.hidden = true;
        var pelny = $('[data-pilot-pelny]'); if (pelny) pelny.hidden = false;
      }
    });
  }

  /* ── Adres Wykonawcy w klauzuli informacyjnej ── */
  if (window.ODBIORNIK && window.ODBIORNIK.wykonawca) {
    window.ODBIORNIK.wykonawca().then(function (j) { var e = $('[data-adres]'); if (j && j.adres && e) e.textContent = j.adres; });
  }

  /* ── Pasek na dole (telefon): chowamy, gdy formularz jest w widoku ── */
  var pasekDol = $('.kp-pasek-dol'), kontakt = $('#kontakt');
  if (pasekDol && kontakt && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (w) { pasekDol.classList.toggle('kp-ukryty', w[0].isIntersecting); }, { threshold: 0.15 }).observe(kontakt);
  }
  var rok = $('#rok'); if (rok) rok.textContent = new Date().getFullYear();

  /* ── Formularz ── */
  var form = $('#kp-form');
  if (!form) return;
  var id = noweId();
  var BLEDY = {
    imie: 'Podaj imię i nazwisko.', gabinet: 'Podaj nazwę gabinetu lub kliniki.', telefon: 'Podaj numer komórkowy, np. 600 700 800.',
    email: 'Ten adres e-mail nie wygląda poprawnie.', zgoda: 'Bez zgody na kontakt nie mogę oddzwonić.',
    limit: 'Zbyt wiele prób. Spróbuj za chwilę albo zadzwoń: 783 480 341.', siec: 'Nie udało się wysłać. Sprawdź połączenie albo zadzwoń: 783 480 341.',
  };
  function blad(pole, tekst) {
    var e = $('[data-blad="' + pole + '"]', form);
    if (e) e.textContent = tekst || '';
    var wej = pole === 'zgoda' ? $('#kp-zgoda') : $('[name="' + pole + '"]', form);
    if (wej) { if (tekst) wej.setAttribute('aria-invalid', 'true'); else wej.removeAttribute('aria-invalid'); }
  }
  function telOk(t) { var c = String(t || '').replace(/[\s()-]/g, '').replace(/^(\+48|0048)/, '').replace(/^48(?=\d{9}$)/, ''); return /^[4-8]\d{8}$/.test(c); }
  function sprawdz() {
    var d = { imie: form.imie.value.trim(), gabinet: form.gabinet.value.trim(), telefon: form.telefon.value.trim(), email: form.email.value.trim() };
    var zle = [];
    ['imie', 'gabinet', 'telefon', 'email', 'zgoda', 'ogolny'].forEach(function (p) { blad(p, ''); });
    if (d.imie.length < 2) zle.push('imie');
    if (d.gabinet.length < 2) zle.push('gabinet');
    if (!telOk(d.telefon)) zle.push('telefon');
    if (d.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) zle.push('email');
    if (!form.zgoda.checked) zle.push('zgoda');
    zle.forEach(function (p) { blad(p, BLEDY[p]); });
    if (zle.length) { var pierwszy = zle[0] === 'zgoda' ? $('#kp-zgoda') : $('[name="' + zle[0] + '"]', form); if (pierwszy) pierwszy.focus(); }
    return zle.length ? null : d;
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var d = sprawdz();
    if (!d) return;
    var przycisk = $('.kp-wyslij', form);
    przycisk.disabled = true;
    var paczka = { id: id, gabinet: d.gabinet, imie: d.imie, telefon: d.telefon, email: d.email, miasto: form.miasto.value.trim(), okno: form.okno ? form.okno.value : '', zgoda: true, firma_www: form.firma_www.value, utm: utm, strona: 'dla-fizjoterapeutow' };
    var wysylka = window.ODBIORNIK && window.ODBIORNIK.lead ? window.ODBIORNIK.lead(paczka) : Promise.resolve({ ok: false, blad: 'siec' });
    wysylka.then(function (r) {
      if (r && r.ok) {
        form.hidden = true;
        var s = $('#kp-sukces'); s.hidden = false; s.focus();
        var of = $('#kp-oferta');
        if (of) of.href = 'oferta-strona.html?l=' + encodeURIComponent(id) + '&dla=' + encodeURIComponent(d.gabinet);
        zdarzeniePiksela('Lead');
        return;
      }
      przycisk.disabled = false;
      var kod = (r && r.blad) || 'siec';
      if (BLEDY[kod] && (kod === 'telefon' || kod === 'email' || kod === 'zgoda')) blad(kod, BLEDY[kod]);
      else blad('ogolny', BLEDY[kod] || BLEDY.siec);
    });
  });

  /* ── Diagnostyka piksela: dodaj ?kpdebug=1 do adresu, a na dole strony zobaczysz, co piksel faktycznie wysłał do Meta. ── */
  (function diagnostyka() {
    if (!/[?&]kpdebug=1/.test(location.search)) return;
    var pasek = document.createElement('div');
    pasek.setAttribute('role', 'status');
    pasek.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:99999;background:#14171A;color:#fff;font:13px/1.45 ui-monospace,Menlo,Consolas,monospace;padding:10px 14px;border-top:3px solid #E8600C';
    document.body.appendChild(pasek);
    function odswiez() {
      var wpisy = [];
      try { wpisy = performance.getEntriesByType('resource').filter(function (e) { return /facebook\.com\/tr/.test(e.name); }); } catch (e) { /* bez diagnostyki */ }
      var licz = {};
      wpisy.forEach(function (e) { var m = e.name.match(/[?&]ev=([A-Za-z]+)/); var k = m ? m[1] : '?'; licz[k] = (licz[k] || 0) + 1; });
      var lista = Object.keys(licz).map(function (k) { return k + ' ×' + licz[k]; }).join(', ') || 'brak';
      var piksel = K.pixelId ? K.pixelId : 'brak numeru';
      pasek.textContent = 'Zgoda cookies: ' + (zgoda() || 'brak') + ' | piksel: ' + piksel + ' | fbq: ' + (typeof window.fbq) + ' | wysłane do Meta: ' + lista;
    }
    odswiez(); setInterval(odswiez, 1000);
  })();
})();
