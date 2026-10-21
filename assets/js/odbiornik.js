/*
 * Odbiornik zdarzeń Studio Widok.
 *
 * Strona jest statyczna, więc dane od klienta (otwarcie oferty, dane do umowy, podpisana umowa, pliki)
 * wysyłamy do małego skryptu Google Apps Script, który zapisuje je w arkuszu i na Dysku oraz wysyła Ci e-mail.
 * Ten sam skrypt wysyła klientowi kod SMS do podpisu umowy i sprawdza go. CRM pobiera zdarzenia jednym kliknięciem.
 *
 * Instrukcja wdrożenia: _wewnetrzne/CRM-instrukcja.md. Dopóki `url` jest pusty, nic nie jest wysyłane,
 * a klient dostaje „kod”, który wklejasz w CRM ręcznie.
 */
(function () {
  'use strict';
  var CFG = {
    url: 'https://script.google.com/macros/s/AKfycbwKZb3lPZKXibtU6-euI37PeJy4b--ABgWmkIyS0BXUA3-RPqZtdgSTLtO_MemqWgtb/exec' /* wdrożenie Apps Script (zapisuje w arkuszu „Zdarzenia Studio Widok”) */
  };
  var KOD_PROBNY = '123456';

  /* Lokalnie (testy, podgląd z dysku) nic nie wysyłamy, żeby nie zaśmiecać arkusza, Dysku i skrzynki, ani nie wysyłać prawdziwych SMS-ów.
     Kod SMS i pliki są wtedy symulowane (kod próbny 123456). Żeby przetestować prawdziwą wysyłkę z własnego komputera:
     localStorage.setItem('odbiornik-test', '1'). */
  /* Adres publicznego API w Cloudflare (assets/js/chmura-config.js). Na localhost można go podać w adresie: ?api=http://127.0.0.1:8788 (wtedy nic nie jest symulowane). */
  function adresApi() {
    var a = String(window.STUDIO_API || '');
    var q = new URLSearchParams(location.search).get('api');
    if (q && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) a = q;
    return a.replace(/\/$/, '');
  }
  function lokalnie() {
    var lok = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === 'file:';
    if (!lok) return false;
    if (new URLSearchParams(location.search).get('api')) return false;
    try { return localStorage.getItem('odbiornik-test') !== '1'; } catch (e) { return true; }
  }

  function symuluj(p) {
    if (p.typ === 'sms_kod') return { ok: true, symulacja: true, maska: '*** *** ' + String(p.telefon || '').replace(/\D/g, '').slice(-3), waznyS: 600 };
    if (p.typ === 'sms_potwierdz') {
      return String(p.kod) === KOD_PROBNY
        ? { ok: true, symulacja: true, czas: new Date().toISOString(), numer: (p.umowa && p.umowa.numer) || '', mail: false }
        : { ok: false, blad: 'kod', zostalo: 4 };
    }
    if (p.typ === 'sms_oferta' && !p.telefon) return { ok: false, blad: 'telefon' };
    if (p.typ === 'sms_oferta') return { ok: true, symulacja: true, maska: '*** *** ' + String(p.telefon || '').replace(/\D/g, '').slice(-3) };
    if (p.typ === 'plik') return { ok: true, symulacja: true };
    return { ok: true, symulacja: true };
  }

  function wczytajObraz(plik) {
    return new Promise(function (ok, blad) {
      var u = URL.createObjectURL(plik), img = new Image();
      img.onload = function () { URL.revokeObjectURL(u); ok(img); };
      img.onerror = function () { URL.revokeObjectURL(u); blad(new Error('obraz')); };
      img.src = u;
    });
  }
  function doBase64(blob) {
    return new Promise(function (ok, blad) {
      var r = new FileReader();
      r.onload = function () { ok(String(r.result).split(',')[1] || ''); };
      r.onerror = function () { blad(new Error('odczyt')); };
      r.readAsDataURL(blob);
    });
  }
  var MAX_PLIK = 8 * 1024 * 1024;
  var DOZWOLONE_TYPY = /^(image\/(jpeg|png|webp|gif)|application\/(pdf|msword|vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet)|vnd\.ms-excel)|text\/plain)$/;

  window.ODBIORNIK = {
    aktywny: function () { return !!(adresApi() || CFG.url); },
    api: adresApi,
    lokalnie: lokalnie,
    kodProbny: KOD_PROBNY,
    /** Wysyła paczkę (obiekt). Zwraca Promise<boolean>: true, gdy żądanie wyszło. Odpowiedź jest nieczytelna (no-cors). */
    wyslij: function (paczka) {
      if ((!CFG.url && !adresApi()) || lokalnie()) return Promise.resolve(false);
      if (adresApi()) {
        try {
          return fetch(adresApi() + '/zdarzenie', { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(paczka), keepalive: true })
            .then(function (r) { return r.ok; }, function () { return false; });
        } catch (e) { return Promise.resolve(false); }
      }
      try {
        return fetch(CFG.url, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(paczka),
          keepalive: true
        }).then(function () { return true; }, function () { return false; });
      } catch (e) {
        return Promise.resolve(false);
      }
    },
    /** Wysyła paczkę i czyta odpowiedź skryptu (kod SMS, pliki). Zawsze rozwiązuje się obiektem; {ok:false, blad:'siec'} przy braku połączenia. */
    /** Czy link do umowy jest ważny (tylko w chmurze). Zwraca {wazna, wygasa} albo null, gdy nie da się sprawdzić. */
    /** Termin pilotażu w ofercie z CRM: {znany, pilot_do, teraz} albo null (lokalnie albo bez chmury). */
    ofertaStatus: function (o, lead) {
      if ((!o && !lead) || !adresApi() || lokalnie()) return Promise.resolve(null);
      return fetch(adresApi() + '/oferta/status?' + (o ? 'o=' + encodeURIComponent(o) : 'l=' + encodeURIComponent(lead))).then(function (r) { return r.json(); })
        .then(function (j) { return j && j.ok ? j : null; }).catch(function () { return null; });
    },
    /** Klient z oferty z CRM: z tokenu oferty dostaje link do umowy (z terminem). Zwraca {ok, ut, wygasa}; lokalnie symulacja. */
    umowaStart: function (p) {
      if (!adresApi()) return Promise.resolve({ ok: false, blad: 'brak_odbiornika' });
      if (lokalnie()) return Promise.resolve({ ok: true, symulacja: true, ut: '' });
      return fetch(adresApi() + '/umowa/start', { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(p) })
        .then(function (r) { return r.json(); }).then(function (j) { return j && typeof j === 'object' ? j : { ok: false, blad: 'odpowiedz' }; }).catch(function () { return { ok: false, blad: 'siec' }; });
    },
    /** Link do formularza startowego przed umową (kolejność: dane firmy → formularz → umowa). Zwraca {ok, token}; lokalnie symulacja bez tokenu. */
    startToken: function (p) {
      if (!adresApi()) return Promise.resolve({ ok: false, blad: 'brak_odbiornika' });
      if (lokalnie()) return Promise.resolve({ ok: true, symulacja: true, token: '' });
      return fetch(adresApi() + '/formularz/start', { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(p) })
        .then(function (r) { return r.json(); }).then(function (j) { return j && typeof j === 'object' ? j : { ok: false, blad: 'odpowiedz' }; }).catch(function () { return { ok: false, blad: 'siec' }; });
    },
    /** Stan formularza startowego po tokenie: {status, zmieniono} albo null, gdy nie da się sprawdzić. */
    formularzStatus: function (t) {
      if (!t || !adresApi() || lokalnie()) return Promise.resolve(null);
      return fetch(adresApi() + '/formularz?t=' + encodeURIComponent(t)).then(function (r) { return r.json(); })
        .then(function (j) { return j && j.ok ? { status: j.status, zmieniono: j.zmieniono } : null; }).catch(function () { return null; });
    },
    /** Zajęte i wolne miejsca w pilotażu pierwszych klientów (tylko w chmurze). Zwraca {miejsc, zajete} albo null. */
    pilotaz: function () {
      if (!adresApi() || lokalnie()) return Promise.resolve(null);
      return fetch(adresApi() + '/pilotaz').then(function (r) { return r.json(); })
        .then(function (j) { return j && j.ok && typeof j.miejsc === 'number' ? j : null; }).catch(function () { return null; });
    },
    /** Adres Wykonawcy z Ustawień CRM ({adres}) albo null. */
    wykonawca: function () {
      if (!adresApi() || lokalnie()) return Promise.resolve(null);
      return fetch(adresApi() + '/wykonawca').then(function (r) { return r.json(); })
        .then(function (j) { return j && j.ok && j.adres ? j : null; }).catch(function () { return null; });
    },
    statusLinku: function (ut) {
      if (!ut || !adresApi() || lokalnie()) return Promise.resolve(null);
      return fetch(adresApi() + '/umowa/status?ut=' + encodeURIComponent(ut)).then(function (r) { return r.json(); })
        .then(function (j) { return j && j.ok ? j : null; }).catch(function () { return null; });
    },
    zapytaj: function (paczka) {
      if (!CFG.url && !adresApi()) return Promise.resolve({ ok: false, blad: 'brak_odbiornika' });
      if (lokalnie()) return Promise.resolve(symuluj(paczka));
      if (adresApi()) {
        var sciezka = { sms_kod: '/sms/kod', sms_potwierdz: '/sms/potwierdz', sms_oferta: '/sms/oferta' }[paczka.typ];
        if (!sciezka) return Promise.resolve({ ok: false, blad: 'nieobslugiwane' });
        var sterA = typeof AbortController === 'function' ? new AbortController() : null;
        var limitA = setTimeout(function () { if (sterA) sterA.abort(); }, 60000);
        return fetch(adresApi() + sciezka, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(paczka), signal: sterA ? sterA.signal : undefined })
          .then(function (r) { return r.json(); })
          .then(function (j) { clearTimeout(limitA); return j && typeof j === 'object' ? j : { ok: false, blad: 'odpowiedz' }; })
          .catch(function () { clearTimeout(limitA); return { ok: false, blad: 'siec' }; });
      }
      var ster = typeof AbortController === 'function' ? new AbortController() : null;
      var limit = setTimeout(function () { if (ster) ster.abort(); }, 90000);
      return fetch(CFG.url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(paczka), signal: ster ? ster.signal : undefined })
        .then(function (r) { return r.json(); })
        .then(function (j) { clearTimeout(limit); return j && typeof j === 'object' ? j : { ok: false, blad: 'odpowiedz' }; })
        .catch(function () { clearTimeout(limit); return { ok: false, blad: 'siec' }; });
    },
    /** Przygotowuje plik do wysyłki: zmniejsza duże zdjęcia, sprawdza typ i rozmiar. Rozwiązuje się {nazwa, mime, b64, rozmiar} albo odrzuca z .kod. */
    przygotujPlik: function (plik) {
      var odrzuc = function (kod) { var e = new Error(kod); e.kod = kod; return Promise.reject(e); };
      var mime = plik.type || '';
      if (!DOZWOLONE_TYPY.test(mime)) return odrzuc('typ');
      if (!/^image\/(jpeg|png|webp)$/.test(mime)) {
        if (plik.size > MAX_PLIK) return odrzuc('rozmiar');
        return doBase64(plik).then(function (b64) { return { nazwa: plik.name, mime: mime, b64: b64, rozmiar: plik.size }; });
      }
      return wczytajObraz(plik).then(function (img) {
        var maks = 2400, sk = Math.min(1, maks / Math.max(img.naturalWidth, img.naturalHeight));
        if (sk === 1 && plik.size <= 2 * 1024 * 1024) return doBase64(plik).then(function (b64) { return { nazwa: plik.name, mime: mime, b64: b64, rozmiar: plik.size }; });
        var c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * sk); c.height = Math.round(img.naturalHeight * sk);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        var wyj = mime === 'image/png' ? 'image/png' : 'image/jpeg';
        return new Promise(function (ok) { c.toBlob(ok, wyj, 0.86); }).then(function (blob) {
          if (!blob || blob.size > MAX_PLIK) return odrzuc('rozmiar');
          var nazwa = wyj === mime ? plik.name : plik.name.replace(/\.[^.]+$/, '') + '.jpg';
          return doBase64(blob).then(function (b64) { return { nazwa: nazwa, mime: wyj, b64: b64, rozmiar: blob.size }; });
        });
      }, function () { return odrzuc('obraz'); });
    },
    /** Kod do wklejenia w CRM, gdy odbiornik nie jest ustawiony albo klient jest offline. */
    kod: function (paczka) {
      var json = JSON.stringify(paczka);
      return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
  };
})();
