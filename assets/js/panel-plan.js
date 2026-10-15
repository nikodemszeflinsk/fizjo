/*
 * Panel — plan godzin przyjęć na konkretne tygodnie.
 *
 * Stały grafik (tydzień, który się powtarza) jest podstawą. Ten plik dodaje to, czego brakuje do planowania z wyprzedzeniem:
 *   - nawigator tygodni: widać, kto, gdzie i kiedy przyjmuje w dowolnym tygodniu, z urlopami, świętami i jednorazowymi zmianami,
 *   - edytor tygodnia jednej osoby z wyborem zakresu zmiany: tylko ten tydzień, ten i kolejne tygodnie albo na stałe od tego tygodnia
 *     (zaplanowana zmiana stałego grafiku, która zaczyna działać sama w wybranym dniu),
 *   - narzędzia: skopiuj poprzedni tydzień, powtórz tydzień albo dwa tygodnie na przemian, wyczyść zmiany jednorazowe,
 *   - przegląd najbliższych tygodni z ostrzeżeniami oraz podgląd terminów, które zobaczy pacjent.
 * Zmiany idą przez `P.zmienRez`, więc działają: cofanie, dziennik zmian grafiku i ograniczenia konta terapeuty.
 */
(() => {
  'use strict';

  const K = window.KAL;
  const P = window.PANEL;
  const esc = P.esc;
  const GFX = P.GFX;
  const DNI = K.DNI_PRACY;
  const SK = { 1: 'Pn', 2: 'Wt', 3: 'Śr', 4: 'Cz', 5: 'Pt', 6: 'Sb' };
  const H = K.godz;
  const lw = (n, a, b, c) => (n === 1 ? a : n % 10 >= 2 && n % 10 <= 4 && !(n % 100 >= 12 && n % 100 <= 14) ? b : c);
  const PL = (P.PL = { pon: K.poniedzialekIso(K.dzisIso()), edit: null });

  /* ── Pomocnicze ─────────────────────────────────────────────────────── */
  const wiele = () => P.D().miejsca.length > 1;
  const dzisIso = () => K.dzisIso();
  const dniKr = (data) => `${K.zIso(data).getDate()} ${K.MIES[K.zIso(data).getMonth()].slice(0, 3)}`;
  const tytulTygodnia = (pon) => {
    const a = K.zIso(pon);
    const b = K.zIso(K.dataTygodnia(pon, 6));
    return a.getMonth() === b.getMonth() ? `${a.getDate()}–${b.getDate()} ${K.MIES[b.getMonth()]} ${b.getFullYear()}` : `${a.getDate()} ${K.MIES[a.getMonth()]} – ${b.getDate()} ${K.MIES[b.getMonth()]} ${b.getFullYear()}`;
  };
  const roznicaTygodni = (pon) => Math.round(K.dniMiedzy(K.poniedzialekIso(dzisIso()), pon) / 7);
  const opisTygodnia = (pon) => {
    const r = roznicaTygodni(pon);
    return r === 0 ? 'ten tydzień' : r === 1 ? 'za tydzień' : r === -1 ? 'poprzedni tydzień' : r > 1 ? `za ${r} ${lw(r, 'tydzień', 'tygodnie', 'tygodni')}` : `${-r} ${lw(-r, 'tydzień', 'tygodnie', 'tygodni')} temu`;
  };
  const tydzienMinal = (pon) => K.dataTygodnia(pon, 6) < dzisIso();
  const sumaOsoby = (D, id, pon) => DNI.reduce((s, dz) => {
    const data = K.dataTygodnia(pon, dz);
    let l = K.efektywnyDzien(D, id, data).map((r) => [r.od, r.do]);
    K.blokady(D, id, data).forEach(({ od, do: d }) => { l = K.odejmij(l, [od, d]); });
    return s + K.suma(l);
  }, 0);
  const jednorazowa = (D, id, data) => D.wyjatki.some((w) => w.terap === id && w.data === data);
  /** Kto może zmieniać plan tej osoby: właściciel i rejestracja każdego, terapeuta siebie (jeśli właściciel mu tego nie zablokował). */
  const mozeEdytowac = (id) => { const ja = P.rolaTerap(); return !ja || (ja === id && !P.zablokowany(id)); };
  /** Osoby, których dotyczy bieżąca karta planu (w Dostępności jedna osoba, w grafiku zespołu wszyscy). */
  const osobyWZakresie = () => {
    const D = P.D();
    const ja = P.rolaTerap();
    return D.zespol.filter((t) => t.widoczny !== false && (!ja || t.id === ja) && (!PL.osoby || PL.osoby.includes(t.id)));
  };
  const pozaOtwarciem = (D, r, data) => {
    if (!D.miejsca.some((m) => m.otwarcie)) return null;
    const m = K.miejsce(D, r.lok);
    const o = m && m.otwarcie ? m.otwarcie[K.zIso(data).getDay()] : null;
    return !o || r.od < o[0] || r.do > o[1] ? { o: o || null, m } : null;
  };

  /* ── Nawigator tygodni ──────────────────────────────────────────────── */
  function nawigator() {
    return `<div class="pl-nav" role="group" aria-label="Wybór tygodnia">
      <button type="button" class="p-btn p-btn--cichy p-btn--ikona" data-pa="pl-tydz" data-d="-1" aria-label="Poprzedni tydzień">‹</button>
      <div class="pl-nav__tyt" aria-live="polite"><b>${esc(tytulTygodnia(PL.pon))}</b><small>${esc(opisTygodnia(PL.pon))}</small></div>
      <button type="button" class="p-btn p-btn--cichy p-btn--ikona" data-pa="pl-tydz" data-d="1" aria-label="Następny tydzień">›</button>
      <button type="button" class="p-btn p-btn--maly p-btn--cichy" data-pa="pl-dzis"${roznicaTygodni(PL.pon) === 0 ? ' disabled' : ''}>Ten tydzień</button>
      <label class="pl-nav__data"><span>Przejdź do daty</span><input type="date" id="pl-skocz" data-pzm="pl-skocz" value="${PL.pon}" /></label>
    </div>`;
  }
  P.PL.nawigator = nawigator;
  P.akcje['pl-tydz'] = (b) => { PL.pon = K.iso(K.dodaj(K.zIso(PL.pon), 7 * Number(b.dataset.d))); P.odswiez(); };
  P.akcje['pl-dzis'] = () => { PL.pon = K.poniedzialekIso(dzisIso()); P.odswiez(); };
  P.akcje['pl-skocz'] = (t) => { if (t.value) { PL.pon = K.poniedzialekIso(t.value); P.odswiez(); } };
  P.akcje['pl-idz'] = (b) => { PL.pon = b.dataset.pon; P.odswiez(); const el = document.getElementById('pl-tabela'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center' }); };

  /* ── Tabela tygodnia ────────────────────────────────────────────────── */
  function komorka(t, dz) {
    const D = P.D();
    const data = K.dataTygodnia(PL.pon, dz);
    const naglow = `${esc(P.osobaNazwa(t))}, ${K.DNI[K.zIso(data).getDay()]} ${dniKr(data)}`;
    if (K.dzienZamkniety(D, data)) return `<div class="gz-kom gz-kom--ro pl-sw" role="text" aria-label="${naglow}: ${esc(K.swieto(data))}">${esc(K.swieto(data))}</div>`;
    const minal = data < dzisIso();
    const lista = K.efektywnyDzien(D, t.id, data);
    const bl = K.blokady(D, t.id, data);
    const calyDzien = bl.find(({ b }) => b.odMin == null);
    const jedn = jednorazowa(D, t.id, data);
    const chips = lista.map((r) => {
      const m = K.miejsce(D, r.lok);
      const zle = pozaOtwarciem(D, r, data);
      return `<span class="gz-zm${zle ? ' gz-zm--zle' : ''}${calyDzien ? ' pl-przekr' : ''}" style="--k:${K.kolor(m.kolor)}">${H(r.od)}–${H(r.do)}${wiele() ? `<small>${esc(m.kr || m.nazwa)}</small>` : ''}${zle ? '<i class="gz-ost" title="Poza godzinami otwarcia">!</i>' : ''}</span>`;
    }).join('');
    const urlop = bl.map(({ b, od, do: d }) => `<span class="pl-urlop">${esc(b.powod || 'blokada')}${b.odMin == null ? '' : ` <small>${H(od)}–${H(d)}</small>`}</span>`).join('');
    const tresc = `${urlop}${chips || (urlop ? '' : '<span class="gz-wolne">–</span>')}${jedn ? '<span class="pl-jedn" title="Jednorazowa zmiana względem stałego grafiku">zmiana jednorazowa</span>' : ''}`;
    const opis = `${naglow}: ${lista.length ? lista.map((r) => `${H(r.od)}–${H(r.do)}, ${K.miejsce(D, r.lok).nazwa}`).join('; ') : 'nie przyjmuje'}${calyDzien ? `, ${calyDzien.b.powod || 'blokada'}` : ''}${jedn ? ', zmiana jednorazowa' : ''}`;
    if (!mozeEdytowac(t.id) || minal) return `<div class="gz-kom gz-kom--ro${minal ? ' pl-minal' : ''}" role="text" aria-label="${esc(opis)}">${tresc}</div>`;
    return `<button type="button" class="gz-kom${jedn ? ' pl-kom--jedn' : ''}" data-pa="pl-edytuj" data-terap="${t.id}" data-dz="${dz}" aria-label="${esc(opis)}. Kliknij, żeby zmienić.">${tresc}</button>`;
  }
  function wierszOsoby(t) {
    const D = P.D();
    const ja = P.rolaTerap() === t.id;
    const suma = sumaOsoby(D, t.id, PL.pon);
    const akc = mozeEdytowac(t.id) && !tydzienMinal(PL.pon) ? `<button type="button" class="p-btn p-btn--maly p-btn--cichy" data-pa="pl-edytuj" data-terap="${t.id}">Cały tydzień</button>` : '';
    return `<tr class="${ja ? 'gz-ja' : ''}" data-plan-wiersz="${t.id}">
      <th scope="row"><span class="p-osoba__av" style="background:${K.kolor(t.kolor)};width:34px;height:34px;font-size:0.78rem">${esc(P.inicjaly(t.nazwa))}</span>
        <span class="gz-os-nazwa"><b>${esc(P.osobaNazwa(t))}</b><small>${suma ? K.godzTekst(suma) : 'brak godzin'}${ja ? ' · to Ty' : ''}</small></span></th>
      ${DNI.map((dz) => `<td>${komorka(t, dz)}</td>`).join('')}
      <td class="gz-akc">${akc}</td>
    </tr>`;
  }
  function tabela(osoby) {
    const D = P.D();
    const naglowki = DNI.map((dz) => {
      const data = K.dataTygodnia(PL.pon, dz);
      return `<th scope="col"><span>${SK[dz]}</span><small class="pl-data">${dniKr(data)}</small></th>`;
    }).join('');
    const wPracy = (dz) => osoby.filter((t) => K.efektywnyDzien(D, t.id, K.dataTygodnia(PL.pon, dz)).length).length;
    const wolne = (dz) => {
      const data = K.dataTygodnia(PL.pon, dz);
      return K.dzienZamkniety(D, data) ? '–' : K.godzTekst(K.wolneMinuty(D, K.widoczni(D), data, data === dzisIso() ? K.terazMin() : K.START));
    };
    const legenda = wiele() ? `<ul class="gz-legenda" aria-label="Miejsca">${D.miejsca.map((m) => `<li><i style="background:${K.kolor(m.kolor)}"></i>${esc(m.kr || m.nazwa)}</li>`).join('')}</ul>` : '';
    return `<div class="gz-przew" id="pl-tabela"><table class="gz-tab pl-tab">
      <thead><tr><th scope="col">Osoba</th>${naglowki}<th scope="col"><span class="visually-hidden">Akcje</span></th></tr></thead>
      <tbody>${osoby.map(wierszOsoby).join('')}</tbody>
      <tfoot><tr><th scope="row">Osób w pracy</th>${DNI.map((dz) => `<td>${wPracy(dz)}</td>`).join('')}<td></td></tr>
      <tr><th scope="row">Wolne dla pacjentów</th>${DNI.map((dz) => `<td>${wolne(dz)}</td>`).join('')}<td></td></tr></tfoot>
    </table></div>${legenda}`;
  }

  /* ── Zaplanowane zmiany stałego grafiku ─────────────────────────────── */
  function opisZmianyStalego(z) {
    const D = P.D();
    const wczesniej = K.regulyOsoby(D, z.terap, K.iso(K.dodaj(K.zIso(z.od), -1)));
    return K.opisZmianyGrafiku(JSON.stringify({ r: wczesniej, w: [], b: [] }), JSON.stringify({ r: z.reguly, w: [], b: [] }));
  }
  function kartaZaplanowanych(osoby) {
    const D = P.D();
    const ids = new Set(osoby.map((t) => t.id));
    const lista = K.zaplanowaneZmiany(D).filter((z) => ids.has(z.terap));
    if (!lista.length) return '';
    return `<div class="pl-zapl" aria-label="Zaplanowane zmiany stałego grafiku"><b>Zaplanowane zmiany stałego grafiku</b><ul>${lista.map((z) => {
      const t = K.terap(D, z.terap);
      return `<li><span><b>od ${esc(dniKr(z.od))}</b>${P.ent() ? ` · ${esc(P.osobaNazwa(t))}` : ''}: ${esc(opisZmianyStalego(z))}</span>
        <span class="pl-zapl__akc"><button type="button" class="p-btn p-btn--maly p-btn--cichy" data-pa="pl-pokaz" data-pon="${K.poniedzialekIso(z.od)}">Pokaż tydzień</button>${mozeEdytowac(z.terap) ? `<button type="button" class="p-btn p-btn--maly p-btn--cichy p-btn--ostrzez" data-pa="pl-usun-zapl" data-id="${esc(z.id)}">Usuń</button>` : ''}</span></li>`;
    }).join('')}</ul></div>`;
  }
  P.akcje['pl-pokaz'] = (b) => { PL.pon = b.dataset.pon; P.odswiez(); };
  P.akcje['pl-usun-zapl'] = (b) => {
    const z = (P.D().zmianyGrafiku || []).find((x) => x.id === b.dataset.id);
    if (!z) return;
    P.zmienRez(`Usunięto zaplanowaną zmianę grafiku od ${dniKr(z.od)}`, (D) => { D.zmianyGrafiku = D.zmianyGrafiku.filter((x) => x.id !== z.id); });
  };

  /* ── Co zobaczy pacjent w tym tygodniu ──────────────────────────────── */
  function podgladPacjenta() {
    const D = P.D();
    const wiersze = DNI.map((dz) => {
      const data = K.dataTygodnia(PL.pon, dz);
      if (K.dzienZamkniety(D, data)) return `<li><b>${SK[dz]} ${dniKr(data)}</b><span>${esc(K.swieto(data))}: bez terminów</span></li>`;
      let wolne = [];
      K.widoczni(D).forEach((t) => { wolne = K.scal([...wolne, ...K.wolnePrzedzialy(D, t.id, data)]); });
      if (data === dzisIso()) wolne = K.przeciecie(wolne, [K.terazMin(), K.END]);
      const tekst = data < dzisIso() ? 'minął' : wolne.length ? wolne.map(([a, b]) => `${H(a)}–${H(b)}`).join(', ') : 'brak wolnych terminów';
      return `<li><b>${SK[dz]} ${dniKr(data)}</b><span>${esc(tekst)}</span></li>`;
    }).join('');
    return `<details class="pl-pacjent"><summary>Co zobaczy pacjent w tym tygodniu</summary><p class="p-podp">Godziny, w których można zarezerwować wizytę (zajęte terminy i urlopy są pominięte). Zasady „najwcześniej za” i „najdalej na” zmieniasz w zasadach rezerwacji.</p><ul>${wiersze}</ul></details>`;
  }

  /* ── Przegląd najbliższych tygodni ──────────────────────────────────── */
  function przeglad(osoby, ile = 8) {
    const D = P.D();
    const start = K.poniedzialekIso(dzisIso());
    const wiersze = [];
    for (let i = 0; i < ile; i++) {
      const pon = K.iso(K.dodaj(K.zIso(start), 7 * i));
      const znaki = [];
      let godz = 0;
      let jedn = 0;
      let wiz = 0;
      const urlopy = new Set();
      osoby.forEach((t) => {
        godz += sumaOsoby(D, t.id, pon);
        DNI.forEach((dz) => {
          const data = K.dataTygodnia(pon, dz);
          if (jednorazowa(D, t.id, data)) jedn++;
          if (K.blokady(D, t.id, data).length) urlopy.add(P.osobaNazwa(t).split(' ')[0]);
        });
      });
      DNI.forEach((dz) => { const data = K.dataTygodnia(pon, dz); osoby.forEach((t) => { wiz += K.rezDnia(D, t.id, data).filter((r) => !K.przedzialy(D, t.id, data).some(([a, b]) => r.od >= a && r.od + r.dl <= b)).length; }); });
      const zapl = K.zaplanowaneZmiany(D).filter((z) => osoby.some((t) => t.id === z.terap) && z.od >= pon && z.od <= K.dataTygodnia(pon, 6)).length;
      if (!godz) znaki.push('<span class="pl-znak pl-znak--zle">brak godzin</span>');
      if (urlopy.size) znaki.push(`<span class="pl-znak">urlopy i blokady: ${esc([...urlopy].join(', '))}</span>`);
      if (jedn) znaki.push(`<span class="pl-znak">zmian jednorazowych: ${jedn}</span>`);
      if (zapl) znaki.push('<span class="pl-znak">od tego tygodnia nowy stały grafik</span>');
      if (wiz) znaki.push(`<span class="pl-znak pl-znak--zle">wizyt poza godzinami: ${wiz}</span>`);
      wiersze.push(`<li${pon === PL.pon ? ' class="pl-biezacy"' : ''}><button type="button" class="pl-przeglad__w" data-pa="pl-idz" data-pon="${pon}" aria-label="Pokaż tydzień ${esc(tytulTygodnia(pon))}"><span class="pl-przeglad__t"><b>${esc(tytulTygodnia(pon).replace(/ \d{4}$/, ''))}</b><small>${esc(opisTygodnia(pon))}</small></span><span class="pl-przeglad__g">${godz ? K.godzTekst(godz) : '–'}</span><span class="pl-przeglad__z">${znaki.join('') || '<span class="pl-znak pl-znak--ok">bez uwag</span>'}</span></button></li>`);
    }
    return `<ul class="pl-przeglad" aria-label="Najbliższe tygodnie">${wiersze.join('')}</ul>`;
  }

  /* ── Narzędzia tygodnia ─────────────────────────────────────────────── */
  function narzedzia(osoby) {
    const ed = osoby.filter((t) => mozeEdytowac(t.id));
    if (!ed.length || tydzienMinal(PL.pon)) return '';
    return `<div class="pl-narz"><button type="button" class="p-btn p-btn--maly p-btn--cichy" data-pa="pl-poprzedni">Skopiuj poprzedni tydzień</button>
      <button type="button" class="p-btn p-btn--maly p-btn--cichy" data-pa="pl-seria">Powtórz na kolejne tygodnie…</button>
      <button type="button" class="p-btn p-btn--maly p-btn--cichy" data-pa="pl-wyczysc">Wyczyść zmiany jednorazowe</button></div>`;
  }
  P.akcje['pl-poprzedni'] = () => {
    const ludzie = osobyWZakresie().filter((t) => mozeEdytowac(t.id));
    const poprz = K.iso(K.dodaj(K.zIso(PL.pon), -7));
    let dni = 0;
    P.zmienRez(`Skopiowano poprzedni tydzień na ${tytulTygodnia(PL.pon)}`, (D) => { ludzie.forEach((t) => { dni += K.kopiujTydzien(D, t.id, poprz, PL.pon); }); });
    if (!dni) window.KAL_UI.toast('Poprzedni tydzień wygląda tak samo, więc nic nie zmieniono.');
  };
  P.akcje['pl-wyczysc'] = () => {
    const ludzie = new Set(osobyWZakresie().filter((t) => mozeEdytowac(t.id)).map((t) => t.id));
    const dni = new Set(DNI.map((dz) => K.dataTygodnia(PL.pon, dz)));
    const ile = P.D().wyjatki.filter((w) => ludzie.has(w.terap) && dni.has(w.data)).length;
    if (!ile) { window.KAL_UI.toast('W tym tygodniu nie ma zmian jednorazowych.'); return; }
    P.zmienRez('Przywrócono stały grafik w tym tygodniu', (D) => { D.wyjatki = D.wyjatki.filter((w) => !(ludzie.has(w.terap) && dni.has(w.data))); });
  };
  P.akcje['pl-seria'] = () => {
    const D = P.D();
    const ludzie = osobyWZakresie().filter((t) => mozeEdytowac(t.id));
    if (!PL.seria) PL.seria = { kto: '*', tryb: 'powtorz', ile: 4 };
    const S = PL.seria;
    P.otworz(() => `${P.naglowek('Powtórz plan na kolejne tygodnie', `Źródło: ${esc(tytulTygodnia(PL.pon))}. Wybrane tygodnie dostaną takie same godziny i miejsca jako zmiany jednorazowe.`)}
      <div class="p-formularz">
        ${P.ent() && ludzie.length > 1 ? `<div class="pole"><label for="pl-s-kto">Dla kogo</label><select id="pl-s-kto" data-pzm="pl-s-kto"><option value="*"${S.kto === '*' ? ' selected' : ''}>Dla całego zespołu</option>${ludzie.map((t) => `<option value="${t.id}"${S.kto === t.id ? ' selected' : ''}>${esc(P.osobaNazwa(t))}</option>`).join('')}</select></div>` : ''}
        <fieldset class="pl-radio"><legend>Co powtórzyć</legend>
          <label><input type="radio" name="pl-s-tryb" value="powtorz" data-pzm="pl-s-tryb"${S.tryb === 'powtorz' ? ' checked' : ''} /> Ten tydzień co tydzień</label>
          <label><input type="radio" name="pl-s-tryb" value="przemian" data-pzm="pl-s-tryb"${S.tryb === 'przemian' ? ' checked' : ''} /> Ten i następny tydzień na przemian <small>(dwa różne tygodnie, np. rotacja poranna i popołudniowa)</small></label>
        </fieldset>
        <div class="pole"><label for="pl-s-ile">Przez ile tygodni</label><select id="pl-s-ile" data-pzm="pl-s-ile">${[1, 2, 3, 4, 6, 8, 12].map((n) => `<option value="${n}"${S.ile === n ? ' selected' : ''}>${n} ${lw(n, 'tydzień', 'tygodnie', 'tygodni')}</option>`).join('')}</select>
          <p class="pod">${S.tryb === 'powtorz' ? `Zmienią się tygodnie po ${esc(tytulTygodnia(PL.pon).replace(/ \d{4}$/, ''))}.` : 'Kolejne tygodnie po następnym będą na przemian jak ten i jak następny.'}</p></div>
      </div>
      <footer class="sz__st"><button type="button" class="p-btn p-btn--cichy" data-pa="zamknij">Anuluj</button><button type="button" class="przycisk" data-pa="pl-seria-ok">Powtórz</button></footer>`);
  };
  P.akcje['pl-s-kto'] = (t) => { PL.seria.kto = t.value; };
  P.akcje['pl-s-tryb'] = (t) => { PL.seria.tryb = t.value; if (P.szuflada) P.szuflada.odswiez(); };
  P.akcje['pl-s-ile'] = (t) => { PL.seria.ile = Number(t.value); };
  P.akcje['pl-seria-ok'] = () => {
    const S = PL.seria;
    const ludzie = osobyWZakresie().filter((t) => mozeEdytowac(t.id) && (S.kto === '*' || S.kto === t.id));
    const pon = PL.pon;
    const nast = K.iso(K.dodaj(K.zIso(pon), 7));
    let dni = 0;
    P.zamknij(false);
    P.zmienRez(`Powtórzono plan: ${S.tryb === 'powtorz' ? `${S.ile} ${lw(S.ile, 'tydzień', 'tygodnie', 'tygodni')}` : `na przemian, ${S.ile} ${lw(S.ile, 'tydzień', 'tygodnie', 'tygodni')}`}`, (D) => {
      ludzie.forEach((t) => {
        /* Dla „na przemian” wzorzec B to następny tydzień z chwili startu, więc zapamiętujemy go przed zmianami. */
        const wzorB = DNI.map((dz) => [dz, K.efektywnyDzien(D, t.id, K.dataTygodnia(nast, dz))]);
        for (let k = 1; k <= S.ile; k++) {
          const cel = K.iso(K.dodaj(K.zIso(pon), 7 * (S.tryb === 'powtorz' ? k : k + 1)));
          if (S.tryb === 'powtorz') { dni += K.kopiujTydzien(D, t.id, pon, cel); continue; }
          if (k % 2 === 1) { dni += K.kopiujTydzien(D, t.id, pon, cel); continue; }
          wzorB.forEach(([dz, zakresy]) => {
            const data = K.dataTygodnia(cel, dz);
            if (K.swietoZamkniete(D, data) || JSON.stringify(zakresy) === JSON.stringify(K.efektywnyDzien(D, t.id, data))) return;
            K.ustawDzienZLok(D, t.id, data, zakresy);
            dni++;
          });
        }
      });
    });
    if (!dni) window.KAL_UI.toast('Wybrane tygodnie już tak wyglądają, więc nic nie zmieniono.');
  };

  /* ── Edytor tygodnia jednej osoby ───────────────────────────────────── */
  const kopiaD = (D) => JSON.parse(JSON.stringify(D));
  function szkic(terap, pon, fokus) {
    const D = P.D();
    const dni = {};
    DNI.forEach((dz) => {
      const data = K.dataTygodnia(pon, dz);
      dni[dz] = { data, zamk: K.dzienZamkniety(D, data), minal: data < dzisIso(), zakresy: K.efektywnyDzien(D, terap, data).map((r) => ({ ...r })) };
    });
    const e = { terap, pon, dni, fokus: fokus || null, zakres: 'tydzien', ile: 4 };
    e.orig = JSON.stringify(zakresyDni(e));
    return e;
  }
  const zakresyDni = (e) => Object.fromEntries(DNI.map((dz) => [dz, e.dni[dz].zakresy]));
  const zmienioneDni = (e) => {
    const orig = JSON.parse(e.orig);
    return DNI.filter((dz) => !e.dni[dz].zamk && !e.dni[dz].minal && JSON.stringify(e.dni[dz].zakresy) !== JSON.stringify(orig[dz]));
  };
  /** Stosuje szkic do danych: według wybranego zakresu zapisuje jednorazowe zmiany albo zaplanowaną zmianę stałego grafiku. */
  function zastosuj(D, e) {
    const zm = zmienioneDni(e);
    if (e.zakres === 'stale') {
      K.zmienOdTygodnia(D, e.terap, e.pon, (R) => { zm.forEach((dz) => { if (e.dni[dz].zakresy.length) R[dz] = e.dni[dz].zakresy.map((r) => ({ ...r })); else delete R[dz]; }); });
      /* Jednorazowe zmiany w tym tygodniu ustąpiły nowemu stałemu grafikowi. */
      D.wyjatki = D.wyjatki.filter((w) => !(w.terap === e.terap && zm.some((dz) => w.data === e.dni[dz].data)));
      return;
    }
    const tygodni = e.zakres === 'n' ? e.ile : 1;
    for (let k = 0; k < tygodni; k++) {
      zm.forEach((dz) => {
        const data = K.iso(K.dodaj(K.zIso(e.dni[dz].data), 7 * k));
        if (K.swietoZamkniete(D, data)) return;
        K.ustawDzienZLok(D, e.terap, data, e.dni[dz].zakresy);
      });
    }
  }
  /** Skutki zmiany bez zapisywania: wizyty, które wypadną poza godziny, oraz naruszenia ograniczeń konta terapeuty. */
  function skutki(e) {
    const D = P.D();
    const kopia = kopiaD(D);
    const przed = new Set(K.wizytyPozaGrafikiem(kopia, 120).map((r) => r.id));
    zastosuj(kopia, e);
    const wiz = K.wizytyPozaGrafikiem(kopia, 120).filter((r) => !przed.has(r.id));
    const ja = P.rolaTerap();
    let naruszenia = [];
    if (ja) {
      const klucz = (x) => JSON.stringify([x.typ, x.dz, x.r.od, x.r.do, x.r.lok, x.data || '']);
      const stare = new Set(K.naruszeniaZMigawki(D, e.terap, K.migawkaGrafiku(D, e.terap)).map(klucz));
      naruszenia = K.naruszeniaZMigawki(kopia, e.terap, K.migawkaGrafiku(kopia, e.terap)).filter((x) => !stare.has(klucz(x)));
    }
    return { wiz, naruszenia };
  }
  function ostrzezeniaDnia(e, dz) {
    const D = P.D();
    const d = e.dni[dz];
    const w = [];
    d.zakresy.forEach((r, i) => {
      const z = pozaOtwarciem(D, r, d.data);
      if (z) w.push(z.o ? `${H(r.od)}–${H(r.do)} wychodzi poza godziny otwarcia miejsca (${H(z.o[0])}–${H(z.o[1])}).` : `${esc(z.m.nazwa)} jest tego dnia zamknięte.`);
      const n = d.zakresy[i + 1];
      if (n && n.lok !== r.lok && n.od - r.do < 30) w.push(`Tylko ${n.od - r.do} min na dojazd między miejscami.`);
    });
    const bl = K.blokady(D, e.terap, d.data);
    if (bl.length) w.push(`W tym dniu: ${bl.map(({ b }) => b.powod || 'blokada').join(', ')}. Pacjenci nie zarezerwują tych godzin.`);
    return w;
  }
  function wierszEdytora(e, dz) {
    const D = P.D();
    const d = e.dni[dz];
    const nazwa = GFX.NAZWY[dz];
    const naglow = `<div class="dz-dzien"><b>${nazwa}</b><small class="pl-data">${dniKr(d.data)}</small></div>`;
    if (d.zamk) return `<div class="dz-w dz-w--wolne">${naglow}<div class="dz-tresc"><p class="dz-wolne">${esc(K.swieto(d.data))}: święto, nie przyjmujesz. To ustawienie zmienisz w zasadach „Święta”.</p></div><div class="dz-suma">–</div></div>`;
    if (d.minal) return `<div class="dz-w dz-w--wolne">${naglow}<div class="dz-tresc"><p class="dz-wolne">Ten dzień już minął.</p></div><div class="dz-suma">–</div></div>`;
    const b = `pl-${dz}`;
    const suma = d.zakresy.reduce((s, r) => s + (r.do - r.od), 0);
    const przel = `<div class="p-sw"><input type="checkbox" role="switch" id="${b}-wl" data-pzm="pl-e-wl" data-dz="${dz}"${d.zakresy.length ? ' checked' : ''}${e.fokus === dz ? ' data-fokus' : ''} /><label for="${b}-wl"><span class="p-sw__tor" aria-hidden="true"></span><span class="p-sw__tekst">${nazwa}<small>${dniKr(d.data)}</small></span></label></div>`;
    const zakresy = d.zakresy.map((r, i) => `<div class="dz-zakres">
        <label class="dz-cz"><span>od</span><input type="time" step="900" id="${b}-${i}-od" value="${K.godz2(r.od)}" data-pzm="pl-e-czas" data-pole="od" data-dz="${dz}" data-i="${i}" aria-label="${nazwa}, początek przyjęć" /></label>
        <label class="dz-cz"><span>do</span><input type="time" step="900" id="${b}-${i}-do" value="${K.godz2(r.do)}" data-pzm="pl-e-czas" data-pole="do" data-dz="${dz}" data-i="${i}" aria-label="${nazwa}, koniec przyjęć" /></label>
        ${wiele() ? `<label class="dz-cz dz-cz--miejsce"><span class="visually-hidden">Miejsce</span><i class="dz-kropka" style="background:${GFX.kolorLok(r.lok)}"></i><select id="${b}-${i}-m" data-pzm="pl-e-miejsce" data-dz="${dz}" data-i="${i}" aria-label="${nazwa}, miejsce przyjęć">${D.miejsca.map((m) => `<option value="${m.id}"${m.id === r.lok ? ' selected' : ''}>${esc(m.kr || m.nazwa)}</option>`).join('')}</select></label>` : ''}
        <button type="button" class="p-btn p-btn--ikona p-btn--cichy p-btn--maly" data-pa="pl-e-usun" data-dz="${dz}" data-i="${i}" aria-label="Usuń godziny ${H(r.od)}–${H(r.do)}">${P.ikona('kosz')}</button>
      </div>`).join('');
    const ost = ostrzezeniaDnia(e, dz).map((x) => `<p class="dz-ost">${P.ikona('uwaga')}<span>${esc(x)}</span></p>`).join('');
    const akcje = d.zakresy.length ? `<div class="dz-akcje"><button type="button" class="p-btn p-btn--tekst p-btn--maly" data-pa="pl-e-dodaj" data-dz="${dz}">${P.ikona('plus')}<span>${d.zakresy.length > 1 ? 'Kolejne godziny' : 'Przerwa i drugie godziny'}</span></button><button type="button" class="p-btn p-btn--tekst p-btn--maly" data-pa="pl-e-kopiuj" data-dz="${dz}">${P.ikona('kopiuj')}<span>Skopiuj na dni robocze</span></button></div>` : '';
    return `<div class="dz-w${d.zakresy.length ? '' : ' dz-w--wolne'}"><div class="dz-dzien">${przel}</div><div class="dz-tresc">${d.zakresy.length ? `${zakresy}${akcje}${ost}` : '<p class="dz-wolne">Nie przyjmujesz. Włącz przełącznik, żeby dodać godziny.</p>'}</div><div class="dz-suma">${suma ? K.godzTekst(suma) : '–'}</div></div>`;
  }
  function tekstZakresu(e) {
    const r = e.zakres === 'stale' ? (e.pon <= dzisIso() ? 'na stałe, od teraz' : `na stałe od ${dniKr(e.pon)}`) : e.zakres === 'n' ? `w ${e.ile} ${lw(e.ile, 'tygodniu', 'tygodniach', 'tygodniach')} od tego` : 'tylko w tym tygodniu';
    return r;
  }
  function widokEdytora() {
    const e = PL.edit;
    const D = P.D();
    const t = K.terap(D, e.terap);
    const zm = zmienioneDni(e);
    const nast = K.zaplanowaneZmiany(D, e.terap).filter((z) => z.od > e.pon)[0];
    const s = zm.length ? skutki(e) : { wiz: [], naruszenia: [] };
    const radio = (id, tytul, pod) => `<label class="pl-zakres__op"><input type="radio" name="pl-zakres" value="${id}" data-pzm="pl-e-zakres"${e.zakres === id ? ' checked' : ''} /><span><b>${tytul}</b><small>${pod}</small></span></label>`;
    const presety = `<div class="p-filtry pl-presety" role="group" aria-label="Szybkie ustawienia tygodnia">
      <button type="button" class="p-chip p-chip--bez" data-pa="pl-e-preset" data-id="8-16">Pn–Pt 8:00–16:00</button>
      <button type="button" class="p-chip p-chip--bez" data-pa="pl-e-preset" data-id="9-17">Pn–Pt 9:00–17:00</button>
      <button type="button" class="p-chip p-chip--bez" data-pa="pl-e-preset" data-id="2zm">Dwie zmiany 8–12 i 15–19</button>
      <button type="button" class="p-chip p-chip--bez" data-pa="pl-e-preset" data-id="staly">Jak w stałym grafiku</button>
      <button type="button" class="p-chip p-chip--bez" data-pa="pl-e-preset" data-id="pusty">Wyczyść tydzień</button></div>`;
    const wiz = s.wiz.length ? `<p class="dz-ost">${P.ikona('uwaga')}<span><b>${s.wiz.length} ${lw(s.wiz.length, 'wizyta wypadnie', 'wizyty wypadną', 'wizyt wypadnie')} poza nowymi godzinami</b> (najbliższe 4 miesiące). Po zapisie trzeba je przełożyć: ${s.wiz.slice(0, 3).map((r) => `${esc(r.imie)}, ${esc(K.wzgledna(r.data))}`).join('; ')}${s.wiz.length > 3 ? '…' : ''}.</span></p>` : '';
    const nar = s.naruszenia.length ? `<p class="dz-ost dz-ost--blad">${P.ikona('uwaga')}<span>Ta zmiana nie zostanie zapisana: ${esc(naruszenieTekst(s.naruszenia[0]))}</span></p>` : '';
    const opisZmian = zm.length ? `Zmienione dni: ${zm.map((dz) => SK[dz]).join(', ')}.` : 'Nic jeszcze nie zmieniono.';
    return `${P.naglowek(`Plan: ${esc(P.osobaNazwa(t))}`, `${esc(tytulTygodnia(e.pon))}. Ustaw godziny i miejsca, a potem wybierz, jak długo ma to obowiązywać.`)}
      <div class="p-formularz">
        ${presety}
        <div class="dz-tydzien gz-edytor">${DNI.map((dz) => wierszEdytora(e, dz)).join('')}</div>
        <fieldset class="pl-zakres"><legend>Jak długo ma to obowiązywać</legend>
          ${radio('tydzien', 'Tylko w tym tygodniu', 'Jednorazowa zmiana. Od następnego tygodnia wraca stały grafik.')}
          ${radio('n', 'W tym i kolejnych tygodniach', `Ta sama zmiana przez ${e.ile} ${lw(e.ile, 'tydzień', 'tygodnie', 'tygodni')} z rzędu (np. urlop kolegi, zastępstwo). <span class="pl-ile"><label class="visually-hidden" for="pl-e-ile">Liczba tygodni</label><select id="pl-e-ile" data-pzm="pl-e-ile">${[2, 3, 4, 6, 8, 12].map((n) => `<option value="${n}"${e.ile === n ? ' selected' : ''}>${n} ${lw(n, 'tydzień', 'tygodnie', 'tygodni')}</option>`).join('')}</select></span>`)}
          ${radio('stale', e.pon <= dzisIso() ? 'Na stałe, od teraz' : `Na stałe od ${esc(dniKr(e.pon))}`, e.pon <= dzisIso() ? 'Zmienia stały grafik, który powtarza się co tydzień.' : `Stały grafik zmieni się sam w poniedziałek ${esc(dniKr(e.pon))}.${nast ? ` Zaplanowana zmiana od ${esc(dniKr(nast.od))} zostaje.` : ''}`)}
        </fieldset>
        ${wiz}${nar}
        <p class="p-podp" aria-live="polite">${opisZmian}${zm.length ? ` Zakres: ${esc(tekstZakresu(e))}.` : ''}</p>
      </div>
      <footer class="sz__st"><button type="button" class="p-btn p-btn--cichy" data-pa="zamknij">Anuluj</button><button type="button" class="przycisk" data-pa="pl-e-zapisz"${zm.length && !s.naruszenia.length ? '' : ' disabled'}>Zapisz plan</button></footer>`;
  }
  function otworzEdytor(terap, dz) {
    PL.edit = szkic(terap, PL.pon, dz || null);
    P.otworz(() => (PL.edit ? widokEdytora() : ''), { szeroka: true });
  }
  const odswiezEdytor = () => { if (P.szuflada && PL.edit) P.szuflada.odswiez(); };
  P.akcje['pl-edytuj'] = (b) => {
    if (!mozeEdytowac(b.dataset.terap)) return;
    otworzEdytor(b.dataset.terap, b.dataset.dz ? Number(b.dataset.dz) : null);
  };
  P.akcje['pl-e-wl'] = (t) => {
    const e = PL.edit;
    const dz = Number(t.dataset.dz);
    if (!t.checked) e.dni[dz].zakresy = [];
    else {
      const D = P.D();
      const wzor = DNI.map((x) => e.dni[x].zakresy).find((l) => l.length);
      e.dni[dz].zakresy = wzor ? wzor.map((r) => ({ ...r })) : [{ od: K.zH('9:00'), do: K.zH('17:00'), lok: GFX.domyslneMiejsce(D, e.terap) }];
    }
    odswiezEdytor();
  };
  P.akcje['pl-e-czas'] = (t) => {
    const e = PL.edit;
    const dz = Number(t.dataset.dz);
    const r = e.dni[dz].zakresy[Number(t.dataset.i)];
    if (!r || !t.value) { odswiezEdytor(); return; }
    const nowy = { od: r.od, do: r.do };
    nowy[t.dataset.pole] = K.zH(t.value);
    let blad = '';
    if (nowy.do <= nowy.od) blad = 'Koniec przyjęć musi być później niż początek.';
    else if (nowy.od < K.START || nowy.do > K.END) blad = `Kalendarz obejmuje godziny ${H(K.START)}–${H(K.END)}.`;
    else if (GFX.kolizja(e.dni[dz].zakresy, nowy.od, nowy.do, r.lok, Number(t.dataset.i))) blad = 'W tym czasie przyjmujesz w innym miejscu.';
    if (blad) { window.KAL_UI.toast(blad); odswiezEdytor(); return; }
    Object.assign(r, nowy);
    odswiezEdytor();
  };
  P.akcje['pl-e-miejsce'] = (t) => {
    const e = PL.edit;
    const dz = Number(t.dataset.dz);
    const i = Number(t.dataset.i);
    const r = e.dni[dz].zakresy[i];
    if (!r) return;
    if (GFX.kolizja(e.dni[dz].zakresy, r.od, r.do, t.value, i)) { window.KAL_UI.toast('W tym czasie przyjmujesz w innym miejscu.'); odswiezEdytor(); return; }
    r.lok = t.value;
    odswiezEdytor();
  };
  P.akcje['pl-e-usun'] = (b) => { PL.edit.dni[Number(b.dataset.dz)].zakresy.splice(Number(b.dataset.i), 1); odswiezEdytor(); };
  P.akcje['pl-e-dodaj'] = (b) => {
    const d = PL.edit.dni[Number(b.dataset.dz)];
    const ost = d.zakresy[d.zakresy.length - 1];
    const od = ost ? ost.do + 60 : K.zH('9:00');
    if (od > K.END - 60) { window.KAL_UI.toast(`Po ${H(ost.do)} nie ma już miejsca w kalendarzu.`); return; }
    d.zakresy.push({ od, do: Math.min(od + 180, K.END), lok: ost ? ost.lok : P.D().miejsca[0].id });
    odswiezEdytor();
  };
  P.akcje['pl-e-kopiuj'] = (b) => {
    const e = PL.edit;
    const zr = Number(b.dataset.dz);
    DNI.filter((x) => x <= 5 && x !== zr && !e.dni[x].zamk && !e.dni[x].minal).forEach((x) => { e.dni[x].zakresy = e.dni[zr].zakresy.map((r) => ({ ...r })); });
    odswiezEdytor();
  };
  P.akcje['pl-e-preset'] = (b) => {
    const e = PL.edit;
    const D = P.D();
    const lok = GFX.domyslneMiejsce(D, e.terap);
    const r = (a, c) => ({ od: K.zH(a), do: K.zH(c), lok });
    DNI.forEach((dz) => {
      const d = e.dni[dz];
      if (d.zamk || d.minal) return;
      const id = b.dataset.id;
      if (id === 'pusty') d.zakresy = [];
      else if (id === 'staly') d.zakresy = (K.regulyOsoby(D, e.terap, d.data)[K.zIso(d.data).getDay()] || []).map((x) => ({ od: x.od, do: x.do, lok: x.lok }));
      else if (dz <= 5) d.zakresy = id === '8-16' ? [r('8:00', '16:00')] : id === '9-17' ? [r('9:00', '17:00')] : [r('8:00', '12:00'), r('15:00', '19:00')];
      else d.zakresy = [];
    });
    odswiezEdytor();
  };
  P.akcje['pl-e-zakres'] = (t) => { PL.edit.zakres = t.value; odswiezEdytor(); };
  P.akcje['pl-e-ile'] = (t) => { PL.edit.ile = Number(t.value); PL.edit.zakres = 'n'; odswiezEdytor(); };
  function naruszenieTekst(x) {
    const D = P.D();
    const m = K.miejsce(D, x.r.lok);
    const dzien = x.data ? ` (${dniKr(x.data)})` : '';
    if (x.typ === 'otwarcie') return `godziny ${H(x.r.od)}–${H(x.r.do)}${dzien} wychodzą poza godziny otwarcia (${m.kr || m.nazwa}${x.o ? `: ${H(x.o[0])}–${H(x.o[1])}` : ', zamknięte w tym dniu'}).`;
    return `nie przyjmujesz w miejscu „${m.kr || m.nazwa}”${dzien}. Właściciel może dodać Ci to miejsce.`;
  }
  P.akcje['pl-e-zapisz'] = () => {
    const e = PL.edit;
    if (!e) return;
    const zm = zmienioneDni(e);
    if (!zm.length) { window.KAL_UI.toast('Nic nie zmieniono.'); return; }
    const s = skutki(e);
    if (s.naruszenia.length) { window.KAL_UI.toast(`Ta zmiana nie została zapisana: ${naruszenieTekst(s.naruszenia[0])}`); return; }
    const t = K.terap(P.D(), e.terap);
    const opis = `Plan: ${P.osobaNazwa(t)}, ${tytulTygodnia(e.pon).replace(/ \d{4}$/, '')} (${tekstZakresu(e)})${s.wiz.length ? `. ${s.wiz.length} ${lw(s.wiz.length, 'wizyta wypada', 'wizyty wypadają', 'wizyt wypada')} poza godzinami` : ''}`;
    P.zamknij(false);
    P.zmienRez(opis, (D) => zastosuj(D, e));
  };
  /* Zamknięcie szuflady (Anuluj, Esc, ×) kasuje szkic. */
  const zamknijStare = P.zamknij;
  P.zamknij = (...a) => { PL.edit = null; return zamknijStare(...a); };

  /* ── Karty gotowe do wstawienia w widoki ────────────────────────────── */
  /** Nawigator, tabela i narzędzia dla podanych osób. */
  P.PL.karta = (osoby, { tytul = 'Plan tygodni', pod = '', przegladOsoby = null } = {}) => {
    const ja = P.rolaTerap();
    PL.osoby = osoby.map((t) => t.id);
    const nota = ja && P.zablokowany(ja) ? `<p class="p-ostrz">${P.ikona('uwaga')}<span>Grafik na razie ustawia właściciel. Jeśli chcesz coś zmienić, napisz do niego.</span></p>` : '';
    return P.karta(tytul, `${nota}${nawigator()}${kartaZaplanowanych(osoby)}${tabela(osoby)}${narzedzia(osoby)}${podgladPacjenta()}`,
      { pod: pod || 'Plan konkretnego tygodnia: stały grafik, urlopy, święta i zmiany jednorazowe. Kliknij godziny, żeby je zmienić na ten tydzień, kilka tygodni albo na stałe.' })
      + P.karta('Najbliższe tygodnie', `${przeglad(przegladOsoby || osoby)}`, { pod: 'Szybki przegląd na dwa miesiące do przodu. Kliknij tydzień, żeby go otworzyć.' });
  };

  /* Dostępność (jedna osoba): plan tygodni pod stałym grafikiem. */
  const dostep = P.widoki.dostepnosc;
  const stareRender = dostep.render;
  dostep.render = function render(...a) {
    const h = stareRender.apply(this, a);
    const D = P.D();
    const ja = P.rolaTerap();
    const kto = ja ? D.zespol.find((t) => t.id === ja) : (P.ent() ? D.zespol.find((t) => t.id === P.GF.osoba) : D.zespol[0]);
    if (!kto) return h;
    const karta = P.PL.karta([kto], { tytul: ja ? 'Mój plan na kolejne tygodnie' : `Plan na kolejne tygodnie${P.ent() ? `: ${esc(P.osobaNazwa(kto))}` : ''}`, pod: 'Stały grafik powyżej powtarza się co tydzień. Tutaj planujesz konkretne tygodnie do przodu: zastępstwa, zmiany godzin, rotację i urlopy.' });
    const poz = h.indexOf('<h2>Urlopy i dni wolne</h2>');
    const start = poz < 0 ? -1 : h.lastIndexOf('<section', poz);
    return start < 0 ? h : `${h.slice(0, start)}${karta}${h.slice(start)}`;
  };
})();
