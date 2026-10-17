/*
 * Panel — Grafik zespołu (pakiet Team): kto, gdzie i kiedy przyjmuje.
 *
 * Dwa widoki tego samego tygodnia:
 *   - „Osoby”: wiersz na terapeutę, kolumna na dzień. Komórka pokazuje godziny i miejsce. Klik otwiera edytor dnia,
 *     a tryb „Maluj grafik” pozwala ustawić wiele komórek naraz (godziny + miejsce, gumka czyści dzień).
 *   - „Lokalizacje”: dla każdego miejsca godziny otwarcia i oś dnia z paskami terapeutów. Widać, kto jest w klinice,
 *     kiedy jest otwarte, a nikt nie przyjmuje (dziury), oraz godziny wychodzące poza otwarcie.
 * Pod spodem lista „Do sprawdzenia” i historia zmian. Konto terapeuty widzi to samo w trybie podglądu.
 * Edycje idą przez te same funkcje co „Dostępność” (P.GFX), więc cofanie i dziennik zmian działają tak samo.
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

  const PRESETY = [['rano', 'Rano', '8:00', '14:00'], ['popoludnie', 'Popołudnie', '14:00', '20:00'], ['caly', 'Cały dzień', '8:00', '16:00']];
  const GZ = (P.GZ = { widok: 'plan', fokus: null, pedzel: { on: false, gumka: false, preset: 'caly', od: '8:00', do: '16:00', lok: null }, drag: null });

  const edytuje = () => !P.rolaTerap();
  /** Godziny otwarcia miejsc i profile zespołu zmienia tylko właściciel. */
  const wlasciciel = () => !P.rolaTerap() && !P.rejestracja();
  const kolorT = (t) => K.kolor(t.kolor);
  const widoczni = () => P.D().zespol.filter((t) => t.widoczny !== false);
  const wiele = () => P.D().miejsca.length > 1;
  const lw = (n, a, b, c) => (n === 1 ? a : n % 10 >= 2 && n % 10 <= 4 && !(n % 100 >= 12 && n % 100 <= 14) ? b : c);

  /* ── Widok „Osoby” ──────────────────────────────────────────────────── */
  function komorka(t, dz) {
    const D = P.D();
    const lista = GFX.przedzialy(D, t.id, dz);
    const tresc = lista.length
      ? lista.map((r) => {
        const m = K.miejsce(D, r.lok);
        const zle = GFX.poza(r, dz);
        return `<span class="gz-zm${zle ? ' gz-zm--zle' : ''}" style="--k:${K.kolor(m.kolor)}">${H(r.od)}–${H(r.do)}${wiele() ? `<small>${esc(m.kr || m.nazwa)}</small>` : ''}${zle ? '<i class="gz-ost" title="Poza godzinami otwarcia">!</i>' : ''}</span>`;
      }).join('')
      : '<span class="gz-wolne">–</span>';
    const opis = `${P.osobaNazwa(t)}, ${K.DNI[dz]}: ${lista.length ? lista.map((r) => `${H(r.od)}–${H(r.do)}, ${K.miejsce(D, r.lok).nazwa}`).join('; ') : 'nie przyjmuje'}`;
    return edytuje()
      ? `<button type="button" class="gz-kom" data-pa="gz-kom" data-terap="${t.id}" data-dz="${dz}" aria-label="${esc(opis)}. ${GZ.pedzel.on ? 'Kliknij, żeby zastosować pędzel' : 'Kliknij, żeby edytować'}">${tresc}</button>`
      : `<div class="gz-kom gz-kom--ro" role="text" aria-label="${esc(opis)}">${tresc}</div>`;
  }
  function wierszOsoby(t) {
    const D = P.D();
    const ja = P.rolaTerap() === t.id;
    const razem = K.godzinyTygodnia(D, t.id);
    return `<tr class="${ja ? 'gz-ja' : ''}${GZ.fokus === t.id ? ' gz-fokus' : ''}" data-terap-wiersz="${t.id}">
      <th scope="row"><span class="p-osoba__av" style="background:${kolorT(t)};width:34px;height:34px;font-size:0.78rem">${esc(P.inicjaly(t.nazwa))}</span>
        <span class="gz-os-nazwa"><b>${esc(P.osobaNazwa(t))}</b><small>${razem ? K.godzTekst(razem) : 'brak godzin'}${ja ? ' · to Ty' : ''}</small></span></th>
      ${DNI.map((dz) => `<td>${komorka(t, dz)}</td>`).join('')}
      <td class="gz-akc">${edytuje() ? `<button type="button" class="p-btn p-btn--maly p-btn--cichy" data-pa="gz-tydzien" data-terap="${t.id}">Cały tydzień</button>` : ''}</td>
    </tr>`;
  }
  function pedzelHtml() {
    if (!edytuje()) return '';
    const D = P.D();
    const b = GZ.pedzel;
    if (!b.lok || !D.miejsca.some((m) => m.id === b.lok)) b.lok = D.miejsca[0].id;
    const cel = b.on
      ? `<div class="gz-pedzel__opcje">
          <div class="p-filtry" role="group" aria-label="Zmiana do wstawienia">
            ${PRESETY.map(([id, n, a, c]) => `<button type="button" class="p-chip p-chip--bez" data-pa="gz-preset" data-id="${id}" aria-pressed="${!b.gumka && b.preset === id}">${n} <small>${a}–${c}</small></button>`).join('')}
            <button type="button" class="p-chip p-chip--bez" data-pa="gz-gumka" aria-pressed="${b.gumka}">Gumka (wolne)</button>
          </div>
          ${b.gumka ? '' : `<div class="gz-pedzel__wlasne">
            <label class="dz-cz"><span>od</span><input type="time" step="900" value="${K.godz2 ? K.godz2(K.zH(b.od)) : b.od}" data-pzm="gz-czas" data-pole="od" aria-label="Początek zmiany" /></label>
            <label class="dz-cz"><span>do</span><input type="time" step="900" value="${K.godz2 ? K.godz2(K.zH(b.do)) : b.do}" data-pzm="gz-czas" data-pole="do" aria-label="Koniec zmiany" /></label>
            ${wiele() ? `<label class="dz-cz"><span>w</span><select data-pzm="gz-lok" aria-label="Miejsce">${D.miejsca.map((m) => `<option value="${m.id}"${b.lok === m.id ? ' selected' : ''}>${esc(m.kr || m.nazwa)}</option>`).join('')}</select></label>` : ''}
          </div>`}
          <p class="p-podp">Klikaj albo przeciągaj po komórkach tabeli. ${b.gumka ? 'Każda zaznaczona komórka zostanie wolna.' : 'Każda zaznaczona komórka dostanie te godziny (zastępują dotychczasowe w tym dniu).'} Całość cofniesz jednym kliknięciem.</p>
        </div>`
      : '<p class="p-podp">Żeby ułożyć wiele dni naraz, włącz „Maluj grafik”. Pojedynczy dzień edytujesz kliknięciem w komórkę.</p>';
    return `<div class="gz-pedzel"><div class="gz-pedzel__g"><button type="button" class="p-btn ${b.on ? 'p-btn--akcent' : 'p-btn--cichy'}" data-pa="gz-maluj" aria-pressed="${b.on}">${P.ikona('dostepnosc')}<span>Maluj grafik</span></button></div>${cel}</div>`;
  }
  function tabelaOsoby() {
    const D = P.D();
    const osoby = widoczni();
    const ile = (dz) => osoby.filter((t) => GFX.przedzialy(D, t.id, dz).length).length;
    const legenda = wiele() ? `<ul class="gz-legenda" aria-label="Miejsca">${D.miejsca.map((m) => `<li><i style="background:${K.kolor(m.kolor)}"></i>${esc(m.kr || m.nazwa)}</li>`).join('')}</ul>` : '';
    return `${pedzelHtml()}<div class="gz-przew${GZ.pedzel.on ? ' gz-maluje' : ''}" id="gz-tabela"><table class="gz-tab">
      <thead><tr><th scope="col">Osoba</th>${DNI.map((dz) => `<th scope="col">${SK[dz]}</th>`).join('')}<th scope="col"><span class="visually-hidden">Akcje</span></th></tr></thead>
      <tbody>${osoby.map(wierszOsoby).join('')}</tbody>
      <tfoot><tr><th scope="row">Osób w pracy</th>${DNI.map((dz) => `<td>${ile(dz)}</td>`).join('')}<td></td></tr></tfoot>
    </table></div>${legenda}`;
  }

  /* ── Widok „Lokalizacje” ───────────────────────────────────────────── */
  const proc = (min) => `${(((min - K.START) / (K.END - K.START)) * 100).toFixed(2)}%`;
  const szer = (a, b) => `${(((b - a) / (K.END - K.START)) * 100).toFixed(2)}%`;
  function osDnia(m, dz) {
    const D = P.D();
    const data = K.dataTygodnia(P.PL.pon, dz);
    const c = K.pokrycieData(D, m.id, data);
    const pasy = [];
    c.przedz.forEach((p) => pasy.push({ t: D.zespol.find((x) => x.id === p.t), r: { od: p.od, do: p.do } }));
    const poza = (r) => D.miejsca.some((x) => x.otwarcie) && (!c.otw || r.od < c.otw[0] || r.do > c.otw[1]);
    const lanes = [...new Set(pasy.map((p) => p.t.id))];
    const tla = (c.otw ? `<i class="gz-os__otw" style="left:${proc(c.otw[0])};width:${szer(c.otw[0], c.otw[1])}"></i>` : '') +
      c.dziury.filter(([a, b]) => b - a >= 30).map(([a, b]) => `<i class="gz-os__dziura" style="left:${proc(a)};width:${szer(a, b)}" title="Otwarte, a nikt nie przyjmuje: ${H(a)}–${H(b)}"></i>`).join('');
    const paski = pasy.map(({ t, r }) => {
      const zle = poza(r);
      const tekst = `${esc(P.inicjaly(t.nazwa))} ${H(r.od)}–${H(r.do)}`;
      const styl = `left:${proc(r.od)};width:${szer(r.od, r.do)};top:${lanes.indexOf(t.id) * 28 + 4}px;--k:${kolorT(t)}`;
      const opis = `${P.osobaNazwa(t)} ${H(r.od)}–${H(r.do)}${zle ? ' (poza otwarciem)' : ''}`;
      return edytuje()
        ? `<button type="button" class="gz-pasek${zle ? ' gz-pasek--zle' : ''}" style="${styl}" data-pa="pl-edytuj" data-terap="${t.id}" data-dz="${dz}" title="${esc(opis)}" aria-label="${esc(opis)}">${tekst}</button>`
        : `<span class="gz-pasek${zle ? ' gz-pasek--zle' : ''}" style="${styl}" title="${esc(opis)}">${tekst}</span>`;
    }).join('');
    const wys = Math.max(1, lanes.length) * 28 + 8;
    const dz0 = c.dziury.filter(([a, b]) => b - a >= 30);
    const info = !c.otw ? `<span class="gz-t gz-t--zamk">${c.zamkniete ? esc(K.swieto(data)) : 'zamknięte'}</span>`
      : dz0.length ? `<span class="gz-t gz-t--ost">Bez terapeuty: ${dz0.map(([a, b]) => `${H(a)}–${H(b)}`).join(', ')}</span>`
        : '<span class="gz-t gz-t--ok">pokryte</span>';
    return `<div class="gz-lok-w"><div class="gz-lok-dzien"><b>${SK[dz]} ${K.zIso(data).getDate()}.${K.pad(K.zIso(data).getMonth() + 1)}</b><small>${c.otw ? `${H(c.otw[0])}–${H(c.otw[1])}` : 'zamknięte'}</small></div>
      <div class="gz-os" style="height:${wys}px" role="group" aria-label="${SK[dz]}, ${esc(m.nazwa)}">${tla}${paski}</div>
      <div class="gz-lok-info">${info}</div></div>`;
  }
  function osGodzin() {
    const t = [];
    for (let h = Math.ceil(K.START / 60); h * 60 <= K.END; h += 2) t.push(`<span style="left:${proc(h * 60)}">${h}:00</span>`);
    return `<div class="gz-lok-w gz-lok-w--osie" aria-hidden="true"><div></div><div class="gz-osie">${t.join('')}</div><div></div></div>`;
  }
  function blokLokalizacji(m) {
    const D = P.D();
    const kto = D.zespol.filter((t) => K.DNI_PRACY.some((dz) => ((D.reguly[t.id] || {})[dz] || []).some((r) => r.lok === m.id)));
    return `<section class="p-karta gz-lok"><header class="p-karta__g"><div><h2><i class="gz-kr" style="background:${K.kolor(m.kolor)}"></i>${esc(m.nazwa)}</h2>
        <p>${kto.length ? `Przyjmują: ${kto.map((t) => esc(P.osobaNazwa(t).split(' ')[0])).join(', ')}` : 'Nikt tu jeszcze nie przyjmuje.'}</p></div>
        ${wlasciciel() ? `<div class="p-karta__akcje"><button type="button" class="p-btn p-btn--maly p-btn--cichy" data-pa="l-edytuj" data-id="${m.id}">Godziny otwarcia</button></div>` : ''}</header>
      <div class="gz-lok-tlo">${osGodzin()}${DNI.map((dz) => osDnia(m, dz)).join('')}</div></section>`;
  }

  /* ── Do sprawdzenia ─────────────────────────────────────────────────── */
  function problemy() {
    const D = P.D();
    const p = [];
    D.miejsca.forEach((m) => DNI.forEach((dz) => {
      const c = K.pokrycie(D, m.id, dz);
      c.dziury.filter(([a, b]) => b - a >= 30).forEach(([a, b]) => p.push({ typ: 'dziura', m, dz, a, b, wszystko: c.otw && a === c.otw[0] && b === c.otw[1] }));
      c.poza.forEach((x) => p.push({ typ: 'poza', m, dz, ...x }));
    }));
    D.zespol.filter((t) => t.widoczny !== false).forEach((t) => {
      if (!K.godzinyTygodnia(D, t.id)) p.push({ typ: 'brak', t });
      K.naruszeniaGrafiku(D, t.id).filter((x) => x.typ === 'miejsce').forEach((x) => p.push({ typ: 'miejsce', t, ...x }));
    });
    const wiz = K.wizytyPozaGrafikiem(D);
    if (wiz.length) p.push({ typ: 'wizyty', lista: wiz });
    return p;
  }
  const osobaPoId = (id) => K.terap(P.D(), id);
  function opisProblemu(x) {
    const nm = (id) => esc(P.osobaNazwa(osobaPoId(id)));
    const mn = (m) => esc(m.kr || m.nazwa);
    switch (x.typ) {
      case 'dziura':
        return { tekst: `${mn(x.m)}, ${SK[x.dz]}: ${x.wszystko ? `otwarte ${H(x.a)}–${H(x.b)}, a nikt tu nie przyjmuje` : `nikt nie przyjmuje ${H(x.a)}–${H(x.b)}`}`, pod: 'Dodaj kogoś w tych godzinach albo skróć godziny otwarcia.', akcja: !wlasciciel() ? '' : `<button type="button" class="p-btn p-btn--maly p-btn--cichy" data-pa="l-edytuj" data-id="${x.m.id}">Godziny otwarcia</button>` };
      case 'poza':
        return { tekst: `${nm(x.t)}, ${SK[x.dz]} ${H(x.od)}–${H(x.do)}: poza godzinami otwarcia (${mn(x.m)})`, pod: 'Pacjent nie wejdzie do zamkniętego gabinetu. Przesuń godziny albo zmień otwarcie.', akcja: `<button type="button" class="p-btn p-btn--maly p-btn--cichy" data-pa="gz-kom" data-terap="${x.t}" data-dz="${x.dz}">Popraw</button>` };
      case 'brak':
        return { tekst: `${esc(P.osobaNazwa(x.t))}: brak godzin przyjęć w tygodniu`, pod: 'Pacjent nie zarezerwuje u tej osoby.', akcja: `<button type="button" class="p-btn p-btn--maly p-btn--cichy" data-pa="gz-tydzien" data-terap="${x.t.id}">Ustaw godziny</button>` };
      case 'miejsce':
        return { tekst: `${esc(P.osobaNazwa(x.t))}, ${SK[x.dz]}: przyjmuje w miejscu, którego nie ma w jej profilu`, pod: 'Dodaj to miejsce w profilu („Gdzie przyjmuje”) albo zmień miejsce w grafiku.', akcja: !wlasciciel() ? '' : `<button type="button" class="p-btn p-btn--maly p-btn--cichy" data-pa="t-edytuj" data-terap="${x.t.id}">Profil</button>` };
      default:
        return { tekst: `${x.lista.length} ${lw(x.lista.length, 'wizyta wypada', 'wizyty wypadają', 'wizyt wypada')} poza godzinami przyjęć (najbliższe 4 tygodnie)`, pod: 'Po skróceniu grafiku albo urlopie te wizyty trzeba przełożyć.', akcja: x.lista.slice(0, 2).map((r) => `<button type="button" class="p-btn p-btn--maly p-btn--cichy" data-pa="rez" data-id="${r.id}">${esc(r.imie)}, ${esc(K.wzgledna(r.data))}</button>`).join('') };
    }
  }
  function kartaProblemow() {
    if (!edytuje()) return '';
    const D = P.D();
    const lista = problemy();
    const dziury = lista.filter((x) => x.typ === 'dziura');
    const bledy = lista.filter((x) => x.typ !== 'dziura');
    const kolejnosc = { wizyty: 0, poza: 1, miejsce: 2, brak: 3 };
    bledy.sort((a, b) => kolejnosc[a.typ] - kolejnosc[b.typ]);
    const poz = bledy.slice(0, 8).map((x) => { const o = opisProblemu(x); return `<li class="p-wiersz p-wiersz--zm"><div class="p-wiersz__glowny" style="cursor:default"><b>${o.tekst}</b><small>${o.pod}</small></div><span class="p-wiersz__akcje">${o.akcja}</span></li>`; }).join('');
    /* Otwarte godziny bez terapeuty to nie błąd (może być recepcja), więc zbieramy je w jedną zwijaną listę na miejsce. */
    const poMiejscach = D.miejsca.map((m) => {
      const w = dziury.filter((x) => x.m.id === m.id);
      return w.length ? `<li><b>${esc(m.kr || m.nazwa)}</b>: ${w.map((x) => `${SK[x.dz]} ${H(x.a)}–${H(x.b)}`).join(', ')} ${wlasciciel() ? `<button type="button" class="p-btn p-btn--maly p-btn--cichy" data-pa="l-edytuj" data-id="${m.id}">Godziny otwarcia</button>` : ''}</li>` : '';
    }).join('');
    const szczegoly = dziury.length
      ? `<details class="gz-dziury"><summary>Otwarte, a nikt nie przyjmuje (${dziury.length})</summary><p class="p-podp">To nie błąd, jeśli w tych godzinach jest otwarta recepcja. Jeśli nie, dodaj kogoś albo skróć godziny otwarcia.</p><ul>${poMiejscach}</ul></details>`
      : '';
    const tresc = bledy.length ? `<ul class="p-lista">${poz}</ul>${bledy.length > 8 ? `<p class="p-podp">i jeszcze ${bledy.length - 8}</p>` : ''}`
      : P.pusto('Godziny mieszczą się w otwarciu, każdy ma grafik, a wizyty są w godzinach przyjęć.');
    return P.karta('Do sprawdzenia', tresc + szczegoly, { pod: 'Godziny poza otwarciem, osoby bez grafiku i wizyty poza godzinami przyjęć.' });
  }
  function kartaHistorii() {
    const ja = P.rolaTerap();
    const lista = (P.D().dziennikGrafiku || []).filter((w) => !ja || w.kogo === ja || w.kto === ja).slice(0, 8);
    return P.karta('Ostatnie zmiany w grafikach', lista.length ? `<ul class="p-lista">${lista.map((w) => P.wierszZmianyGrafiku(w, { akcje: wlasciciel() })).join('')}</ul>` : P.pusto('Jeszcze nikt nie zmieniał grafiku. Zmiany terapeutów i Twoje pojawią się tutaj.'),
      { pod: ja ? 'Zmiany Twojego grafiku.' : 'Kto, co i kiedy zmienił. Zmianę terapeuty możesz cofnąć.' });
  }

  /* ── Widok ──────────────────────────────────────────────────────────── */
  P.widoki.grafik = {
    tytul: 'Grafik zespołu',
    podtytul: () => (P.rolaTerap() ? 'Kto, gdzie i kiedy przyjmuje, tydzień po tygodniu. Swoje godziny planujesz tutaj albo w „Mojej dostępności”.' : 'Kto, gdzie i kiedy przyjmuje, tydzień po tygodniu. Ułóż plan dla całego zespołu i sprawdź, czy otwarte godziny są pokryte.'),
    render() {
      const D = P.D();
      if (!P.ent()) return `<div class="p-stos">${P.pusto('Grafik zespołu jest w pakiecie Team. W pakiecie Individual godziny ustawiasz w „Dostępności”.')}</div>`;
      const w = GZ.widok;
      const przelacznik = `<div class="p-filtry gz-widok" role="group" aria-label="Widok grafiku">
        <button type="button" class="p-chip p-chip--bez" data-pa="gz-widok" data-id="plan" aria-pressed="${w === 'plan'}">Plan tygodni</button>
        <button type="button" class="p-chip p-chip--bez" data-pa="gz-widok" data-id="osoby" aria-pressed="${w === 'osoby'}">Wzorzec tygodnia</button>
        <button type="button" class="p-chip p-chip--bez" data-pa="gz-widok" data-id="lokalizacje" aria-pressed="${w === 'lokalizacje'}">Lokalizacje</button>
        ${P.rolaTerap() ? `<a class="p-btn p-btn--maly p-btn--cichy" href="#/dostepnosc">Mój stały grafik</a>` : ''}</div>`;
      const glowna = w === 'plan'
        ? P.PL.karta(widoczni(), { tytul: 'Plan tygodni' })
        : w === 'osoby'
          ? P.karta('Wzorzec tygodnia', tabelaOsoby(), { pod: 'Stały grafik, który powtarza się co tydzień. Konkretne tygodnie, zastępstwa i urlopy planujesz w „Planie tygodni”.' })
          : `${P.karta('Tydzień w miejscach przyjęć', P.PL.nawigator(), { pod: 'Kto, gdzie i kiedy przyjmuje w wybranym tygodniu, razem z urlopami, świętami i jednorazowymi zmianami.' })}<div class="p-stos">${D.miejsca.map(blokLokalizacji).join('')}</div>`;
      return `<div class="p-stos gz">${przelacznik}${glowna}${kartaProblemow()}${kartaHistorii()}</div>`;
    },
    po() {
      if (GZ.fokus) {
        const el = document.querySelector(`[data-terap-wiersz="${GZ.fokus}"]`);
        if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center', behavior: 'auto' });
        GZ.fokus = null;
      }
    },
  };

  /* ── Edytor dnia i całego tygodnia ──────────────────────────────────── */
  function otworzDzien(terap, dz) {
    P.otworz(() => {
      const t = K.terap(P.D(), terap);
      return `${P.naglowek(`${esc(P.osobaNazwa(t))}: ${GFX.NAZWY[dz].toLowerCase()}`, 'Godziny przyjęć i miejsce. Możesz dodać drugi przedział albo skopiować dzień na inne dni.')}
        <div class="p-formularz"><div class="dz-tydzien gz-edytor">${GFX.wiersz(t, dz)}</div></div>
        <footer class="sz__st"><button type="button" class="p-btn p-btn--cichy" data-pa="gz-tydzien" data-terap="${terap}">Cały tydzień tej osoby</button><button type="button" class="przycisk" data-pa="zamknij">Gotowe</button></footer>`;
    }, { szeroka: true });
  }
  P.akcje['gz-kom'] = (b, e) => {
    const terap = b.dataset.terap;
    const dz = Number(b.dataset.dz);
    if (GZ.pedzel.on && b.closest('#gz-tabela')) { if (e && e.detail === 0) maluj([{ terap, dz }]); return; }
    otworzDzien(terap, dz);
  };
  P.akcje['gz-tydzien'] = (b) => {
    P.GF.osoba = b.dataset.terap;
    P.otworz(() => `${P.naglowek(esc(P.osobaNazwa(K.terap(P.D(), P.GF.osoba))), 'Cały tydzień: godziny, miejsca i szybkie ustawienia.')}<div class="p-formularz">${GFX.kartaTygodnia()}</div>
      <footer class="sz__st"><button type="button" class="przycisk" data-pa="zamknij">Gotowe</button></footer>`, { szeroka: true });
  };
  P.akcje['gz-widok'] = (b) => { GZ.widok = b.dataset.id; P.odswiez(); };

  /* ── Malowanie grafiku ──────────────────────────────────────────────── */
  P.akcje['gz-maluj'] = () => { GZ.pedzel.on = !GZ.pedzel.on; P.odswiez(); };
  P.akcje['gz-preset'] = (b) => {
    const p = PRESETY.find((x) => x[0] === b.dataset.id);
    Object.assign(GZ.pedzel, { gumka: false, preset: p[0], od: p[2], do: p[3] });
    P.odswiez();
  };
  P.akcje['gz-gumka'] = () => { GZ.pedzel.gumka = !GZ.pedzel.gumka; P.odswiez(); };
  P.akcje['gz-czas'] = (t) => { GZ.pedzel[t.dataset.pole] = t.value || GZ.pedzel[t.dataset.pole]; GZ.pedzel.preset = 'wlasne'; P.odswiez(); };
  P.akcje['gz-lok'] = (t) => { GZ.pedzel.lok = t.value; P.odswiez(); };
  function maluj(komorki) {
    if (!komorki.length || !edytuje()) return;
    const b = GZ.pedzel;
    const od = K.zH(b.od);
    const doo = K.zH(b.do);
    if (!b.gumka && (doo <= od || od < K.START || doo > K.END)) { window.KAL_UI.toast(doo <= od ? 'Koniec zmiany musi być później niż początek.' : `Kalendarz obejmuje godziny ${H(K.START)}–${H(K.END)}.`); return; }
    const miejsce = K.miejsce(P.D(), b.lok);
    const opis = b.gumka ? `Wolne: ${komorki.length} ${lw(komorki.length, 'komórka', 'komórki', 'komórek')}` : `Ustawiono ${H(od)}–${H(doo)}${wiele() ? ` (${miejsce.kr || miejsce.nazwa})` : ''}: ${komorki.length} ${lw(komorki.length, 'komórka', 'komórki', 'komórek')}`;
    GFX.zmienGrafik(opis, (R) => {
      komorki.forEach(({ terap, dz }) => {
        const o = R[terap] || (R[terap] = {});
        if (b.gumka) delete o[dz]; else o[dz] = [{ od, do: doo, lok: b.lok }];
      });
    });
  }
  const komorkaZ = (el) => (el && el.closest ? el.closest('#gz-tabela .gz-kom[data-terap]') : null);
  const dodaj = (c) => {
    if (!c || !GZ.drag) return;
    const k = `${c.dataset.terap}|${c.dataset.dz}`;
    if (GZ.drag.zaznaczone.has(k)) return;
    GZ.drag.zaznaczone.set(k, { terap: c.dataset.terap, dz: Number(c.dataset.dz) });
    c.classList.add('gz-kom--wybrana');
  };
  document.addEventListener('pointerdown', (e) => {
    if (P.aktualny !== 'grafik' || !GZ.pedzel.on || e.button > 0) return;
    const c = komorkaZ(e.target);
    if (!c) return;
    GZ.drag = { zaznaczone: new Map() };
    dodaj(c);
  });
  document.addEventListener('pointermove', (e) => {
    if (!GZ.drag) return;
    dodaj(komorkaZ(document.elementFromPoint(e.clientX, e.clientY)));
  });
  const koniecPedzla = () => {
    if (!GZ.drag) return;
    const k = [...GZ.drag.zaznaczone.values()];
    GZ.drag = null;
    maluj(k);
  };
  document.addEventListener('pointerup', koniecPedzla);
  document.addEventListener('pointercancel', () => { GZ.drag = null; P.odswiez(); });
})();
