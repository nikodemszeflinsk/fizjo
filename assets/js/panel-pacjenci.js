/*
 * Panel: zakładka „Pacjenci”. Lista osób, które umówiły wizytę: kontakt, źródło, liczba wizyt, ostatnia i następna wizyta,
 * zgoda na SMS-y oraz skróty (zadzwoń, SMS, umów). Karta pacjenta otwiera się z listy.
 * Bez danych medycznych: nie pokazujemy usług ani opisów dolegliwości, a notatka w karcie pacjenta jest organizacyjna.
 */
(() => {
  'use strict';

  const K = window.KAL;
  const P = window.PANEL;
  const esc = P.esc;

  const PF = { q: '', zrodlo: '', sort: 'ostatnia', filtr: 'wszyscy', limit: 60 };
  const cyfry = (t) => String(t || '').replace(/\D/g, '');
  const dniOd = (iso) => Math.round((K.zIso(K.dzisIso()) - K.zIso(iso)) / 86400000);
  const zgodaSms = (k) => { const C = P.C(); return !(C.pacjenci && C.pacjenci[k] && C.pacjenci[k].sms === false); };
  const FILTRY = [
    ['wszyscy', 'Wszyscy', () => true],
    ['nowi', 'Nowi (30 dni)', (p) => dniOd(p.pierwsza) <= 30],
    ['wracaja', 'Wrócili (2+ wizyty)', (p) => p.odwiedzil >= 2],
    ['nie-wrocili', 'Dawno u nas nie byli', (p) => !p.nastepna && p.ostatnia && dniOd(p.ostatnia) > 60],
    ['bez-sms', 'Bez zgody na SMS', (p, k) => !zgodaSms(k)],
  ];
  const SORTY = [
    ['ostatnia', 'Ostatnia wizyta'],
    ['imie', 'Imię i nazwisko'],
    ['wizyty', 'Najwięcej wizyt'],
    ['przychod', 'Przychód'],
  ];

  function lista() {
    const q = PF.q.trim().toLowerCase(), qc = cyfry(PF.q);
    const filtr = FILTRY.find((f) => f[0] === PF.filtr) || FILTRY[0];
    const wiersze = [...K.pacjenci(P.D()).entries()]
      .filter(([k, p]) => (!q || p.imie.toLowerCase().includes(q) || (qc.length >= 3 && cyfry(p.tel).includes(qc))) && (!PF.zrodlo || p.zrodlo === PF.zrodlo) && filtr[2](p, k));
    const kmp = {
      ostatnia: (a, b) => String(b[1].ostatnia || '').localeCompare(String(a[1].ostatnia || '')),
      imie: (a, b) => a[1].imie.localeCompare(b[1].imie, 'pl'),
      wizyty: (a, b) => b[1].odwiedzil - a[1].odwiedzil || a[1].imie.localeCompare(b[1].imie, 'pl'),
      przychod: (a, b) => b[1].przychod - a[1].przychod,
    }[PF.sort];
    return wiersze.sort(kmp);
  }
  const liczba = (f) => [...K.pacjenci(P.D()).entries()].filter(([k, p]) => f[2](p, k)).length;

  P.widoki.pacjenci = {
    tytul: 'Pacjenci',
    podtytul: 'Kontakt i historia wizyt. Bez danych medycznych.',
    render() {
      const wszyscy = lista();
      const widoczni = wszyscy.slice(0, PF.limit);
      const filtry = `<div class="p-filtry">
        <input type="search" placeholder="Imię, nazwisko lub telefon" aria-label="Szukaj pacjenta" value="${esc(PF.q)}" id="pf-q" />
        <label class="wybor"><span class="visually-hidden">Źródło</span><select data-pzm="pf-zrodlo"><option value="">Każde źródło</option>${Object.entries(K.ZRODLA).map(([k, n]) => `<option value="${k}"${PF.zrodlo === k ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
        <label class="wybor"><span class="visually-hidden">Sortowanie</span><select data-pzm="pf-sort">${SORTY.map(([k, n]) => `<option value="${k}"${PF.sort === k ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
        <button type="button" class="p-btn p-btn--maly p-btn--cichy" data-pa="eks-pac">Eksport CSV</button>
      </div>
      <div class="p-filtry" role="group" aria-label="Grupa pacjentów">${FILTRY.map((f) => `<button type="button" class="p-chip p-chip--bez" data-pa="pf-filtr" data-f="${f[0]}" aria-pressed="${PF.filtr === f[0]}">${esc(f[1])} <i>${liczba(f)}</i></button>`).join('')}</div>`;
      const wiersze = widoczni.map(([k, p]) => `<tr>
          <td><button type="button" class="p-link p-wazne" data-pa="pacjent" data-id="${k}">${esc(p.imie)}</button><small>${esc(p.tel)}</small></td>
          <td>${P.zrodloTag(p.zrodlo)}</td>
          <td class="p-liczba">${p.odwiedzil}${p.nieobecny ? `<small>nieodbytych: ${p.nieobecny}</small>` : ''}</td>
          <td style="white-space:nowrap">${p.ostatnia ? `${esc(K.wzgledna(p.ostatnia))}<small>${P.dataKrotka(p.ostatnia)}</small>` : '<span class="p-podp">brak</span>'}</td>
          <td style="white-space:nowrap">${p.nastepna ? `${P.dataKrotka(p.nastepna.data)}<small>${K.godz(p.nastepna.od)}</small>` : '<span class="p-podp">brak</span>'}</td>
          <td class="p-liczba">${P.zl(p.przychod)}</td>
          <td>${zgodaSms(k) ? '<span class="p-tag p-tag--zielony">tak</span>' : '<span class="p-tag p-tag--czerwony">nie</span>'}</td>
          <td style="white-space:nowrap"><a class="p-btn p-btn--maly p-btn--cichy" href="tel:${esc(cyfry(p.tel))}" aria-label="Zadzwoń: ${esc(p.imie)}">Zadzwoń</a> <button type="button" class="p-btn p-btn--maly p-btn--cichy" data-pa="sms-nowy" data-tel="${esc(p.tel)}" aria-label="Wyślij SMS: ${esc(p.imie)}">SMS</button> <button type="button" class="p-btn p-btn--maly p-btn--cichy" data-pa="umow" data-imie="${esc(p.imie)}" data-tel="${esc(p.tel)}" data-terap="${p.terap}" aria-label="Umów wizytę: ${esc(p.imie)}">Umów</button></td>
        </tr>`).join('');
      return `<div class="p-stos">${P.chipyZespolu ? P.chipyZespolu() : ''}${P.karta('', `${filtry}
        <div class="p-podsum" aria-live="polite"><span><b>${wszyscy.length}</b> ${wszyscy.length === 1 ? 'pacjent' : 'pacjentów'}</span></div>
        ${wszyscy.length ? `<div class="p-tabela-przew"><table class="p-tabela"><thead><tr><th>Pacjent</th><th>Źródło</th><th class="p-liczba">Wizyty</th><th>Ostatnia</th><th>Następna</th><th class="p-liczba">Przychód</th><th>SMS</th><th><span class="visually-hidden">Działania</span></th></tr></thead><tbody>${wiersze}</tbody></table></div>
          ${wszyscy.length > PF.limit ? `<button type="button" class="p-btn p-btn--cichy" data-pa="pf-wiecej">Pokaż więcej (${wszyscy.length - PF.limit})</button>` : ''}` : P.pusto('Brak pacjentów dla tych filtrów.', '<button type="button" class="p-btn p-btn--maly p-btn--cichy" data-pa="pf-reset">Wyczyść filtry</button>')}
        <p class="p-podp">Panel nie przechowuje danych medycznych. Nie wpisuj diagnoz ani opisów dolegliwości w notatkach, wystarczą rzeczy organizacyjne (np. preferowane godziny).</p>`)}</div>`;
    },
    po(el) {
      const q = el.querySelector('#pf-q');
      if (q) q.addEventListener('input', () => { PF.q = q.value; PF.limit = 60; clearTimeout(P._pfq); P._pfq = setTimeout(P.odswiez, 160); });
    },
  };
  P.akcje['pf-zrodlo'] = (t) => { PF.zrodlo = t.value; PF.limit = 60; P.odswiez(); };
  P.akcje['pf-sort'] = (t) => { PF.sort = t.value; P.odswiez(); };
  P.akcje['pf-filtr'] = (b) => { PF.filtr = b.dataset.f; PF.limit = 60; P.odswiez(); };
  P.akcje['pf-wiecej'] = () => { PF.limit += 60; P.odswiez(); };
  P.akcje['pf-reset'] = () => { Object.assign(PF, { q: '', zrodlo: '', sort: 'ostatnia', filtr: 'wszyscy', limit: 60 }); P.odswiez(); };
})();
