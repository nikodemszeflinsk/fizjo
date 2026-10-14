/*
 * Odbiornik zdarzeń Studio Widok.
 *
 * Strona jest statyczna, więc dane od klienta (otwarcie oferty, dane do umowy, podpisana umowa)
 * wysyłamy do małego skryptu Google Apps Script, który zapisuje je w arkuszu i wysyła Ci e-mail.
 * CRM pobiera je stamtąd jednym kliknięciem.
 *
 * Instrukcja wdrożenia: _wewnetrzne/CRM-instrukcja.md. Dopóki `url` jest pusty, nic nie jest wysyłane,
 * a klient dostaje „kod”, który wklejasz w CRM ręcznie.
 */
(function () {
  'use strict';
  var CFG = {
    url: '' /* adres wdrożenia Apps Script, np. https://script.google.com/macros/s/.../exec */
  };
  window.ODBIORNIK = {
    aktywny: function () { return !!CFG.url; },
    /** Wysyła paczkę (obiekt). Zwraca Promise<boolean>: true, gdy żądanie wyszło. Odpowiedź jest nieczytelna (no-cors). */
    wyslij: function (paczka) {
      if (!CFG.url) return Promise.resolve(false);
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
    /** Kod do wklejenia w CRM, gdy odbiornik nie jest ustawiony albo klient jest offline. */
    kod: function (paczka) {
      var json = JSON.stringify(paczka);
      return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
  };
})();
