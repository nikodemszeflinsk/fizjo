/*
 * Panel — praca codzienna: pulpit, rezerwacje, pacjenci, statystyki.
 *
 * Wszystkie liczby biorą się z wizyt w kalendarzu: decyzja (odbyta, nieodbyta, odwołana),
 * cena wizyty i źródło pacjenta. Pacjent „z systemu” to ten, którego pierwsza wizyta
 * przyszła przez stronę (rezerwacja online).
 */
(() => {
  'use strict';

  const K = window.KAL;
  const P = window.PANEL;
  const esc = P.esc;
  const lw = (n, a, b, c) => (n === 1 ? a : n % 10 >= 2 && n % 10 <= 4 && !(n % 100 >= 12 && n % 100 <= 14) ? b : c);
  const wizyt = (n) => `${n} ${lw(n, 'wizyta', 'wizyty', 'wizyt')}`;
  const pacjentow = (n) => `${n} ${lw(n, 'pacjent', 'pacjentów', 'pacjentów')}`;
  const dzis = () => K.dzisIso();
  const klucz = (r) => r.data + K.pad(r.od);
  const tel = (t) => t.replace(/\D/g, '');

  /* ── Wspólne: filtr zespołu i pomocnicze liczby ─────────────────────── */
  P.filtrOsob = null; // null = cały zespół
  const wybrani = () => (P.ent() && P.filtrOsob ? P.filtrOsob : null);
  const wFiltrze = (r) => !wybrani() || wybrani().includes(r.terap);
  P.chipyZespolu = () => {
    if (!P.ent()) return '';
    const D = P.D();
    return `<div class="p-filtry" role="group" aria-label="Pokaż">
      <button type="button" class="p-chip p-chip--bez" data-pa="filtr-osob" data-id="" aria-pressed="${!P.filtrOsob}">Cały zespół</button>
      ${D.zespol.map((t) => `<button type="button" class="p-chip" data-pa="filtr-osob" data-id="${t.id}" aria-pressed="${!!(P.filtrOsob && P.filtrOsob.includes(t.id))}"><i style="background:${K.kolor(t.kolor)}">${P.inicjaly(t.nazwa)}</i>${esc(P.osobaNazwa(t))}</button>`).join('')}
    </div>`;
  };
  P.akcje['filtr-osob'] = (b) => {
    const id = b.dataset.id;
    if (!id) P.filtrOsob = null;
    else {
      const s = new Set(P.filtrOsob || []);
      if (s.has(id)) s.delete(id); else s.add(id);
      P.filtrOsob = s.size ? [...s] : null;
    }
    P.odswiez();
  };
  /** Mapa pacjentów (po telefonie) z pierwszym źródłem, przychodem i następną wizytą. */
  const pacjenci = () => K.pacjenci(P.D());
  P.zSystemu = (r, mapa) => { const p = (mapa || pacjenci()).get(tel(r.tel)); return !!p && p.zrodlo === 'strona'; };
  const odbyteW = (od, doo) => P.D().rezerwacje.filter((r) => r.status === 'przyszedl' && r.data >= od && r.data <= doo && wFiltrze(r));
  const suma = (lista) => lista.reduce((s, r) => s + K.cena(P.D(), r), 0);
  const poczMies = (d = new Date()) => K.iso(new Date(d.getFullYear(), d.getMonth(), 1));
  const konMies = (d = new Date()) => K.iso(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  const zmiana = (teraz, przed) => {
    if (!przed) return '';
    const p = Math.round(((teraz - przed) / przed) * 100);
    return `<span class="p-zmiana p-zmiana--${p >= 0 ? 'w-gore' : 'w-dol'}">${p >= 0 ? '+' : ''}${p}%</span>`;
  };
  const statusTag = (r) => {
    if (r.status === 'potwierdzona' && K.minelo(r.data, r.od + r.dl)) return '<span class="p-tag p-tag--zolty">Odbyła się?</span>';
    const kl = { potwierdzona: 'niebieski', oczekuje: 'zolty', przyszedl: 'zielony', nieobecny: 'czerwony', odwolana: 'czerwony', anulowana: 'czerwony' }[r.status];
    return `<span class="p-tag p-tag--${kl}">${esc(K.STATUSY[r.status])}</span>`;
  };
  P.statusTag = statusTag;
  const zrodloTag = (z) => `<span class="p-tag${z === 'strona' ? ' p-tag--zielony' : ''}">${esc(K.ZRODLA_KR[z] || z)}</span>`;
  P.zrodloTag = zrodloTag;
  const osoba = (id) => K.terap(P.D(), id);
  const kolorOsoby = (id) => K.kolor(osoba(id).kolor);

  /* Akcje wspólne dla list wizyt */
  P.akcje.status = (b) => window.KAL_UI.ustawStatus(b.dataset.id, b.dataset.s);
  P.akcje.widziane = (b) => { const r = P.D().rezerwacje.find((x) => x.id === b.dataset.id); if (r) { r.nowa = false; window.KAL_UI.zapisz(); } };
  P.akcje.umow = (b) => {
    P.zamknij(false);
    window.KAL_UI.nowa({ imie: b.dataset.imie || '', tel: b.dataset.tel || '', terap: b.dataset.terap || P.D().zespol[0].id, data: b.dataset.data || dzis(), od: b.dataset.od ? Number(b.dataset.od) : Math.min(K.END - 60, Math.max(K.START, Math.ceil((K.terazMin() + 30) / 15) * 15)), zrodlo: b.dataset.zrodlo || (b.dataset.tel ? 'powrot' : 'telefon') });
  };
  P.akcje.odwolaj = (b) => { P.zamknij(false); window.KAL_UI.odwolaj(b.dataset.id); };
  P.akcje.przenies = (b) => { P.zamknij(false); P.idz('kalendarz'); setTimeout(() => window.KAL_UI.przenies(b.dataset.id), 30); };

  /* ── Pulpit ─────────────────────────────────────────────────────────── */
  function wierszDzis(r) {
    const u = K.usluga(P.D(), r.usluga);
    const minela = K.minelo(r.data, r.od);
    const zakonczona = ['przyszedl', 'nieobecny'].includes(r.status);
    const akcje = zakonczona
      ? `<button type="button" class="p-btn p-btn--maly p-btn--cichy" data-pa="status" data-id="${r.id}" data-s="potwierdzona">Cofnij oznaczenie</button>`
      : `${r.status === 'oczekuje' ? `<button type="button" class="p-btn p-btn--maly p-btn--akcent" data-pa="status" data-id="${r.id}" data-s="potwierdzona">Potwierdź</button>` : ''}
         <button type="button" class="p-btn p-btn--maly ${minela ? 'p-btn--ok' : 'p-btn--cichy'}" data-pa="status" data-id="${r.id}" data-s="przyszedl">Odbyta</button>
         <button type="button" class="p-btn p-btn--maly p-btn--cichy" data-pa="status" data-id="${r.id}" data-s="nieobecny">Nieodbyta</button>
         ${minela ? '' : `<button type="button" class="p-btn p-btn--maly p-btn--cichy" data-pa="przenies" data-id="${r.id}">Przełóż</button><button type="button" class="p-btn p-btn--maly p-btn--cichy p-btn--ostrzez" data-pa="odwolaj" data-id="${r.id}">Odwołaj</button>`}`;
    return `<li class="p-wiersz${r.status === 'nieobecny' ? ' p-wiersz--x' : ''}${r.status === 'przyszedl' ? ' p-wiersz--ok' : ''}">
      <span class="p-wiersz__czas">${K.godz(r.od)}</span>
      <button type="button" class="p-wiersz__glowny" data-pa="rez" data-id="${r.id}">
        <b>${P.ent() ? `<span class="p-kropka" style="background:${kolorOsoby(r.terap)}"></span>` : ''}${esc(r.imie)} ${zakonczona || r.status === 'oczekuje' ? statusTag(r) : ''}${r.nowa ? '<span class="p-tag p-tag--niebieski">nowa</span>' : ''}</b>
        <small>${esc(u.nazwa)} · ${K.dlTekst(r.dl)} · ${P.zl(K.cena(P.D(), r))}${P.ent() ? ` · ${esc(P.osobaNazwa(osoba(r.terap)))}` : ''} · ${esc(K.ZRODLA_KR[r.zrodlo] || r.zrodlo)}</small>
      </button>
      <span class="p-wiersz__akcje">${akcje}</span>
    </li>`;
  }
  function doDecyzji() {
    const D = P.D();
    const d0 = K.iso(K.dodaj(new Date(), -3));
    const czeka = D.rezerwacje.filter((r) => r.status === 'oczekuje' && wFiltrze(r));
    const nowe = D.rezerwacje.filter((r) => r.nowa && K.aktywna(r) && !K.minelo(r.data, r.od) && wFiltrze(r));
    const ozn = D.rezerwacje.filter((r) => r.data >= d0 && r.data < dzis() && r.status === 'potwierdzona' && wFiltrze(r)).sort((a, b) => klucz(a).localeCompare(klucz(b)));
    return { czeka, nowe, ozn };
  }
  /** Pacjenci, którzy byli niedawno, a nie mają kolejnej wizyty. */
  P.bezKolejnej = () => {
    const teraz = dzis();
    return [...pacjenci().values()]
      .filter((p) => p.ostatniaOdbyta && !p.nastepna && (!wybrani() || wybrani().includes(p.terap)))
      .map((p) => ({ ...p, dni: K.dniMiedzy(p.ostatniaOdbyta, teraz) }))
      .filter((p) => p.dni >= 7 && p.dni <= 60)
      .sort((a, b) => a.dni - b.dni);
  };
  function zwolnione() {
    const D = P.D();
    const koniec = K.iso(K.dodaj(new Date(), 7));
    return D.rezerwacje
      .filter((r) => K.ODWOLANE.includes(r.status) && r.data >= dzis() && r.data <= koniec && !K.minelo(r.data, r.od) && wFiltrze(r))
      .filter((r) => !K.sprawdz(D, r.terap, r.data, r.od, r.dl, r.id).kolizja)
      .sort((a, b) => klucz(a).localeCompare(klucz(b)));
  }
  function wykresTygodni(tygodnie, { wysokosc = 180 } = {}) {
    const max = Math.max(1, ...tygodnie.map((t) => t.system + t.inne));
    return `<div class="p-wykres" style="height:${wysokosc}px" role="img" aria-label="Przychód tydzień po tygodniu: ${tygodnie.map((t) => `${t.etyk} ${P.zl(t.system + t.inne)}`).join(', ')}">
      ${tygodnie.map((t) => `<div class="p-wykres__s" title="${esc(t.etyk)}: ${P.zl(t.system + t.inne)} (z systemu ${P.zl(t.system)})"><div class="p-wykres__k" style="height:${Math.round(((t.system + t.inne) / max) * 100)}%"><i style="height:${t.system + t.inne ? (t.system / (t.system + t.inne)) * 100 : 0}%;background:var(--ok)"></i><i style="height:${t.system + t.inne ? (t.inne / (t.system + t.inne)) * 100 : 0}%;background:#9fb3c8"></i></div><span>${esc(t.etyk)}</span></div>`).join('')}
    </div>
    <div class="p-legenda"><span><i style="background:var(--ok)"></i>pacjenci pozyskani przez stronę</span><span><i style="background:#9fb3c8"></i>pozostali pacjenci</span></div>`;
  }
  P.tygodnie = (ile) => {
    const mapa = pacjenci();
    const pon = K.poniedzialek(new Date());
    const wynik = [];
    for (let i = ile - 1; i >= 0; i--) {
      const od = K.iso(K.dodaj(pon, -7 * i));
      const doo = K.iso(K.dodaj(pon, -7 * i + 6));
      const lista = odbyteW(od, doo);
      const system = suma(lista.filter((r) => P.zSystemu(r, mapa)));
      wynik.push({ etyk: P.dataKrotka(od).replace(/ (\S{3})\S*$/, ' $1'), system, inne: suma(lista) - system });
    }
    return wynik;
  };
  function paskiZrodel(od, doo) {
    const mapa = pacjenci();
    const nowi = [...mapa.values()].filter((p) => p.pierwsza >= od && p.pierwsza <= doo && (!wybrani() || wybrani().includes(p.terap)));
    const licz = {};
    nowi.forEach((p) => { licz[p.zrodlo] = (licz[p.zrodlo] || 0) + 1; });
    const max = Math.max(1, ...Object.values(licz));
    const wiersze = Object.entries(licz).sort((a, b) => b[1] - a[1]);
    return {
      nowi,
      html: wiersze.length ? `<div class="p-paski">${wiersze.map(([z, n]) => `<div class="p-pasek${z === 'strona' ? ' p-pasek--system' : ''}"><span>${esc(K.ZRODLA_KR[z] || z)}</span><span class="p-pasek__tor"><i style="width:${(n / max) * 100}%"></i></span><b>${pacjentow(n).replace(' pacjentów', '').replace(' pacjent', '')} os.</b></div>`).join('')}</div>` : P.pusto('W tym okresie nie było nowych pacjentów.'),
    };
  }

  P.widoki.pulpit = {
    tytul: 'Pulpit',
    podtytul: () => K.dlugaData(new Date()).replace(/^./, (c) => c.toUpperCase()),
    render() {
      const D = P.D();
      const C = P.C();
      const lista = D.rezerwacje.filter((r) => r.data === dzis() && K.aktywna(r) && wFiltrze(r)).sort((a, b) => a.od - b.od);
      const odbyteDzis = lista.filter((r) => r.status === 'przyszedl').length;
      const przed = lista.filter((r) => !K.minelo(r.data, r.od)).length;
      const teraz = new Date();
      const mies = odbyteW(poczMies(), dzis());
      const pop = new Date(teraz.getFullYear(), teraz.getMonth() - 1, 1);
      const popDoTegoDnia = K.iso(new Date(pop.getFullYear(), pop.getMonth(), Math.min(teraz.getDate(), new Date(pop.getFullYear(), pop.getMonth() + 1, 0).getDate())));
      const miesPop = odbyteW(K.iso(pop), popDoTegoDnia);
      const mapa = pacjenci();
      const nowiMies = [...mapa.values()].filter((p) => p.pierwsza >= poczMies() && p.pierwsza <= dzis() && (!wybrani() || wybrani().includes(p.terap)));
      const nowiSystem = nowiMies.filter((p) => p.zrodlo === 'strona').length;
      const pon = K.poniedzialek(teraz);
      const osobyF = wybrani() ? D.zespol.filter((t) => wybrani().includes(t.id)) : (P.ent() ? K.widoczni(D) : [D.zespol[0]]);
      let otw = 0;
      let zaj = 0;
      for (let i = 0; i < 6; i++) { const w = K.wypelnienie(D, osobyF, K.iso(K.dodaj(pon, i))); otw += w.otwarte; zaj += w.zajete; }
      const wyp = otw ? Math.round((zaj / otw) * 100) : 0;
      const { czeka, nowe, ozn } = doDecyzji();
      const bk = P.bezKolejnej();
      const zw = zwolnione();
      const zrodla = paskiZrodel(K.iso(K.dodaj(teraz, -90)), dzis());
      const zmianyStrony = P.zmianyStrony();
      const terminy = K.terminyPacjenta(D, D.uslugi[0].id, { ile: 4 });
      const uwagi = czeka.length + nowe.length + ozn.length;

      const kpi = `<div class="p-kpi">
        <a class="p-kpi__k" href="#/kalendarz"><span>Wizyty dziś</span><b>${lista.length}</b><small>${lista.length ? `${odbyteDzis} odbytych, ${przed} przed Tobą` : 'dziś wolne'}</small></a>
        <a class="p-kpi__k p-kpi__k--ciemny" href="#/statystyki"><span>Przychód w tym miesiącu</span><b>${P.zl(suma(mies))}</b><small>${wizyt(mies.length)} odbytych ${zmiana(suma(mies), suma(miesPop))}</small></a>
        <a class="p-kpi__k" href="#/pacjenci"><span>Nowi pacjenci w tym miesiącu</span><b>${nowiMies.length}</b><small>w tym <b>${nowiSystem}</b> z rezerwacji online</small></a>
        <a class="p-kpi__k${uwagi ? ' p-kpi__k--uwaga' : ''}" href="#/kalendarz"><span>${uwagi ? 'Czeka na decyzję' : 'Wypełnienie tygodnia'}</span><b>${uwagi || `${wyp}%`}</b><small>${uwagi ? 'wizyt do potwierdzenia lub oznaczenia' : 'zajęte godziny z grafiku'}</small></a>
      </div>`;

      const decyzje = (() => {
        const w = (r, akcje) => `<li class="p-wiersz"><button type="button" class="p-wiersz__glowny" data-pa="rez" data-id="${r.id}"><b>${esc(r.imie)}</b><small>${esc(K.wzgledna(r.data))}, ${K.godz(r.od)} · ${esc(K.usluga(D, r.usluga).nazwa)}${P.ent() ? ` · ${esc(P.osobaNazwa(osoba(r.terap)))}` : ''}</small></button><span class="p-wiersz__akcje">${akcje}</span></li>`;
        let h = '';
        if (czeka.length) h += `<h3 class="p-podp"><b>Do potwierdzenia</b> (${czeka.length})</h3><ul class="p-lista">${czeka.slice(0, 4).map((r) => w(r, `<button type="button" class="p-btn p-btn--maly p-btn--akcent" data-pa="status" data-id="${r.id}" data-s="potwierdzona">Potwierdź</button><button type="button" class="p-btn p-btn--maly p-btn--cichy p-btn--ostrzez" data-pa="odwolaj" data-id="${r.id}">Odrzuć</button>`)).join('')}</ul>`;
        if (ozn.length) h += `<h3 class="p-podp"><b>Odbyła się?</b> (${ozn.length}) Bez tej decyzji wizyta nie wejdzie do przychodu.</h3><ul class="p-lista">${ozn.slice(0, 5).map((r) => w(r, `<button type="button" class="p-btn p-btn--maly p-btn--ok" data-pa="status" data-id="${r.id}" data-s="przyszedl">Odbyta</button><button type="button" class="p-btn p-btn--maly p-btn--cichy" data-pa="status" data-id="${r.id}" data-s="nieobecny">Nieodbyta</button>`)).join('')}</ul>${ozn.length > 5 ? `<a class="p-btn p-btn--tekst" href="#/rezerwacje/oznacz">Pokaż wszystkie (${ozn.length})</a>` : ''}`;
        if (nowe.length) h += `<h3 class="p-podp"><b>Nowe rezerwacje ze strony</b> (${nowe.length})</h3><ul class="p-lista">${nowe.slice(0, 4).map((r) => w(r, `<button type="button" class="p-btn p-btn--maly p-btn--cichy" data-pa="widziane" data-id="${r.id}">Widziałem</button>`)).join('')}</ul>`;
        return h || P.pusto('Wszystko ogarnięte. Nic nie czeka na Twoją decyzję.');
      })();

      const bkHtml = bk.length
        ? `<ul class="p-lista">${bk.slice(0, 5).map((p) => `<li class="p-wiersz"><span class="p-osoba__av" style="background:${kolorOsoby(p.terap)};width:36px;height:36px;font-size:0.78rem">${esc(P.inicjaly(p.imie))}</span><button type="button" class="p-wiersz__glowny" data-pa="idz" data-cel="pacjenci/${tel(p.tel)}"><b>${esc(p.imie)}</b><small>${p.dni} dni od ostatniej wizyty · ${wizyt(p.odwiedzil)} odbytych${P.ent() ? ` · ${esc(P.osobaNazwa(osoba(p.terap)))}` : ''}</small></button><span class="p-wiersz__akcje"><a class="p-btn p-btn--maly p-btn--cichy" href="tel:${tel(p.tel)}">${P.ikona('telefon')}<span>Zadzwoń</span></a><button type="button" class="p-btn p-btn--maly p-btn--akcent" data-pa="umow" data-imie="${esc(p.imie)}" data-tel="${esc(p.tel)}" data-terap="${p.terap}">Umów</button></span></li>`).join('')}</ul>${bk.length > 5 ? `<a class="p-btn p-btn--tekst" href="#/pacjenci/bez-kolejnej">Wszyscy (${bk.length})</a>` : ''}`
        : P.pusto('Każdy, kto był u Ciebie w ostatnich dwóch miesiącach, ma już kolejny termin.');

      const zwHtml = zw.length
        ? `<ul class="p-lista">${zw.slice(0, 4).map((r) => `<li class="p-wiersz"><span class="p-wiersz__czas">${K.godz(r.od)}</span><div class="p-wiersz__glowny" style="cursor:default"><b>${esc(K.wzgledna(r.data))}, ${K.dlTekst(r.dl)}${P.ent() ? ` · ${esc(P.osobaNazwa(osoba(r.terap)))}` : ''}</b><small>Zwolnione: ${esc(r.imie)} ${r.status === 'anulowana' ? '(anulował gabinet)' : 'odwołał'}${bk[0] ? ` · może wskoczyć: ${bk.slice(0, 2).map((p) => esc(p.imie)).join(', ')}` : ''}</small></div><span class="p-wiersz__akcje">${bk[0] ? `<button type="button" class="p-btn p-btn--maly p-btn--akcent" data-pa="umow" data-imie="${esc(bk[0].imie)}" data-tel="${esc(bk[0].tel)}" data-terap="${r.terap}" data-data="${r.data}" data-od="${r.od}">Wpisz: ${esc(bk[0].imie.split(' ')[0])}</button>` : ''}<button type="button" class="p-btn p-btn--maly p-btn--cichy" data-pa="umow" data-terap="${r.terap}" data-data="${r.data}" data-od="${r.od}">Wpisz kogoś</button></span></li>`).join('')}</ul>`
        : P.pusto('W najbliższym tygodniu nikt nie odwołał wizyty.');

      const listaKontrolna = [
        { ok: !zmianyStrony, tekst: zmianyStrony ? `${zmianyStrony} ${lw(zmianyStrony, 'zmiana czeka', 'zmiany czekają', 'zmian czeka')} na publikację` : 'Strona jest opublikowana, bez zaległych zmian', cel: 'strona' },
        { ok: !C.strona.problemy.some((x) => x.status === 'szkic'), tekst: C.strona.problemy.some((x) => x.status === 'szkic') ? 'Jedna z podstron jest szkicem i nie widać jej w Google' : 'Wszystkie podstrony są opublikowane', cel: 'strona/podstrony' },
        { ok: !C.strona.wyglad.zdjecia.some((z) => !z.alt), tekst: C.strona.wyglad.zdjecia.some((z) => !z.alt) ? 'Zdjęcia bez opisu: pomagają w Google i czytnikach ekranu' : 'Zdjęcia mają opisy', cel: 'strona/wyglad' },
        { ok: D.zespol.every((t) => t.bio), tekst: D.zespol.every((t) => t.bio) ? 'Profile zespołu są uzupełnione' : 'Uzupełnij opis w profilu terapeuty', cel: 'zespol' },
      ];
      const gotowosc = Math.round((listaKontrolna.filter((x) => x.ok).length / listaKontrolna.length) * 100);

      return `<div class="p-stos">
        ${P.chipyZespolu()}
        ${kpi}
        <div class="p-siatka">
          ${P.karta('Dzisiejszy grafik', lista.length ? `<ul class="p-lista">${lista.map(wierszDzis).join('')}</ul>` : P.pusto('Dziś nie masz wizyt.', '<button type="button" class="p-btn p-btn--akcent p-btn--maly" data-pa="nowa-rez">Wpisz wizytę</button>'), { klasa: 'p-s7', pod: K.dlugaData(new Date()), akcje: `<a class="p-btn p-btn--maly p-btn--cichy" href="#/kalendarz">Kalendarz</a><button type="button" class="p-btn p-btn--maly p-btn--akcent" data-pa="nowa-rez">${P.ikona('plus')}<span>Wizyta</span></button>` })}
          ${P.karta('Czeka na Twoją decyzję', decyzje, { klasa: 'p-s5', pod: 'Potwierdzenia, nowe rezerwacje i wizyty do oznaczenia.' })}
          ${P.karta('Przychód: ostatnie 8 tygodni', wykresTygodni(P.tygodnie(8)), { klasa: 'p-s7', pod: 'Z wizyt oznaczonych jako odbyte, według ceny wizyty.', akcje: '<a class="p-btn p-btn--maly p-btn--cichy" href="#/statystyki">Statystyki</a>' })}
          ${P.karta('Skąd przychodzą nowi pacjenci', zrodla.html, { klasa: 'p-s5', pod: `Ostatnie 90 dni: ${pacjentow(zrodla.nowi.length)}, z czego ${zrodla.nowi.filter((p) => p.zrodlo === 'strona').length} z rezerwacji online.` })}
          ${P.karta('Nie umówili kolejnej wizyty', bkHtml, { klasa: 'p-s6', pod: 'Byli u Ciebie w ostatnich 2 miesiącach i nie mają następnego terminu.' })}
          ${P.karta('Zwolnione terminy', zwHtml, { klasa: 'p-s6', pod: 'Odwołane wizyty w najbliższym tygodniu. Termin jest wolny, można kogoś wpisać.' })}
          ${P.karta('Strona i rezerwacje online', `<div class="p-dwie">
              <div class="p-stos" style="gap:8px">
                <div class="p-limit${gotowosc < 100 ? ' p-limit--pelny' : ''}"><span>Gotowość strony: <b>${gotowosc}%</b></span><span class="p-limit__tor"><i style="width:${gotowosc}%"></i></span></div>
                <ul class="p-lista">${listaKontrolna.map((x) => `<li class="p-wiersz"><span class="p-tag p-tag--${x.ok ? 'zielony' : 'zolty'}">${x.ok ? 'gotowe' : 'do zrobienia'}</span><a class="p-wiersz__glowny" href="#/${x.cel}" style="text-decoration:none;color:inherit"><b>${esc(x.tekst)}</b></a></li>`).join('')}</ul>
              </div>
              <div class="p-stos" style="gap:8px">
                <p class="p-podp"><b>Pacjent widzi teraz na stronie najbliższe terminy:</b></p>
                ${terminy.length ? `<div class="p-tagi">${terminy.map((t) => `<span class="p-tag p-tag--niebieski">${esc(K.wzgledna(t.data))}, ${K.godz(t.od)}</span>`).join('')}</div>` : P.pusto('Brak wolnych terminów na stronie.')}
                <p class="p-podp">Zmienisz je w <a href="#/dostepnosc">Dostępności</a>. Treść strony w <a href="#/strona">Treściach strony</a>.</p>
              </div>
            </div>`, { klasa: 'p-s12', akcje: zmianyStrony ? '<a class="p-btn p-btn--maly p-btn--akcent" href="#/strona">Przejrzyj i opublikuj</a>' : '' })}
        </div>
      </div>`;
    },
  };

  /* ── Rezerwacje: lista z filtrami i decyzjami masowymi ─────────────── */
  const RF = { zakres: 'tydzien', status: 'wszystkie', zrodlo: '', terap: '', lok: '', q: '', sort: 'rosnaco', limit: 60, zazn: new Set(), od: '', do: '' };
  P.RF = RF;
  const ZAKRESY = [['dzis', 'Dziś'], ['tydzien', 'Ten tydzień'], ['nadchodzace', 'Nadchodzące'], ['miesiac', 'Ten miesiąc'], ['poprzedni', 'Poprzedni miesiąc'], ['30', 'Ostatnie 30 dni'], ['wszystkie', 'Wszystkie'], ['wlasny', 'Własny zakres']];
  const STATUSY = [['wszystkie', 'Wszystkie'], ['potwierdzona', 'Zaplanowane'], ['oczekuje', 'Do potwierdzenia'], ['oznacz', 'Do oznaczenia'], ['przyszedl', 'Odbyte'], ['nieobecny', 'Nieodbyte'], ['odwolane', 'Odwołane i anulowane']];
  function zakresDat() {
    const t = new Date();
    switch (RF.zakres) {
      case 'dzis': return [dzis(), dzis()];
      case 'tydzien': { const p = K.poniedzialek(t); return [K.iso(p), K.iso(K.dodaj(p, 6))]; }
      case 'nadchodzace': return [dzis(), K.iso(K.dodaj(t, 60))];
      case 'miesiac': return [poczMies(), konMies()];
      case 'poprzedni': { const p = new Date(t.getFullYear(), t.getMonth() - 1, 1); return [poczMies(p), konMies(p)]; }
      case '30': return [K.iso(K.dodaj(t, -30)), dzis()];
      case 'wlasny': return [RF.od || '0000', RF.do || '9999'];
      default: return ['0000', '9999'];
    }
  }
  function przefiltrowane() {
    const D = P.D();
    const [od, doo] = zakresDat();
    const q = RF.q.trim().toLowerCase();
    const cyfry = q.replace(/\D/g, '');
    return D.rezerwacje.filter((r) => {
      if (r.data < od || r.data > doo) return false;
      if (!wFiltrze(r)) return false;
      if (RF.terap && r.terap !== RF.terap) return false;
      if (RF.lok && r.lok !== RF.lok) return false;
      if (RF.zrodlo && r.zrodlo !== RF.zrodlo) return false;
      if (RF.status === 'odwolane' && K.aktywna(r)) return false;
      if (RF.status === 'oznacz' && !(r.status === 'potwierdzona' && K.minelo(r.data, r.od + r.dl))) return false;
      if (!['wszystkie', 'odwolane', 'oznacz'].includes(RF.status) && r.status !== RF.status) return false;
      if (q && !(r.imie.toLowerCase().includes(q) || (cyfry.length >= 3 && tel(r.tel).includes(cyfry)))) return false;
      return true;
    }).sort((a, b) => (RF.sort === 'rosnaco' ? 1 : -1) * klucz(a).localeCompare(klucz(b)));
  }
  P.widoki.rezerwacje = {
    tytul: 'Rezerwacje',
    podtytul: 'Wszystkie wizyty: ze strony i wpisane ręcznie. Decyzje możesz zmienić w każdej chwili.',
    render(arg) {
      if (arg === 'oznacz') { RF.status = 'oznacz'; RF.zakres = '30'; P.arg = ''; history.replaceState(null, '', '#/rezerwacje'); }
      const D = P.D();
      const lista = przefiltrowane();
      const widoczne = lista.slice(0, RF.limit);
      [...RF.zazn].forEach((id) => { if (!lista.some((r) => r.id === id)) RF.zazn.delete(id); });
      const odbyte = lista.filter((r) => r.status === 'przyszedl');
      const odw = lista.filter((r) => !K.aktywna(r));
      const nieodb = lista.filter((r) => r.status === 'nieobecny');
      const online = lista.filter((r) => r.zrodlo === 'strona').length;
      const wszystkieZazn = widoczne.length && widoczne.every((r) => RF.zazn.has(r.id));
      const filtry = `<div class="p-filtry">
        <label class="wybor"><span class="visually-hidden">Zakres</span><select data-pzm="rf-zakres">${ZAKRESY.map(([k, n]) => `<option value="${k}"${RF.zakres === k ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
        ${RF.zakres === 'wlasny' ? `<input type="date" aria-label="Od" value="${RF.od}" data-pzm="rf-od" /><input type="date" aria-label="Do" value="${RF.do}" data-pzm="rf-do" />` : ''}
        <label class="wybor"><span class="visually-hidden">Źródło</span><select data-pzm="rf-zrodlo"><option value="">Każde źródło</option>${Object.entries(K.ZRODLA).map(([k, n]) => `<option value="${k}"${RF.zrodlo === k ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
        ${P.ent() ? `<label class="wybor"><span class="visually-hidden">Terapeuta</span><select data-pzm="rf-terap"><option value="">Każdy terapeuta</option>${D.zespol.map((t) => `<option value="${t.id}"${RF.terap === t.id ? ' selected' : ''}>${esc(t.nazwa)}</option>`).join('')}</select></label>` : ''}
        ${D.miejsca.length > 1 ? `<label class="wybor"><span class="visually-hidden">Miejsce</span><select data-pzm="rf-lok"><option value="">Każde miejsce</option>${D.miejsca.map((m) => `<option value="${m.id}"${RF.lok === m.id ? ' selected' : ''}>${esc(m.kr)}</option>`).join('')}</select></label>` : ''}
        <input type="search" placeholder="Pacjent lub telefon" aria-label="Szukaj pacjenta" value="${esc(RF.q)}" id="rf-q" />
        <button type="button" class="p-btn p-btn--maly p-btn--cichy" data-pa="rf-csv">Eksport CSV</button>
      </div>
      <div class="p-filtry" role="group" aria-label="Status">${STATUSY.map(([k, n]) => `<button type="button" class="p-chip p-chip--bez" data-pa="rf-status" data-s="${k}" aria-pressed="${RF.status === k}">${n}</button>`).join('')}</div>`;
      const wiersze = widoczne.map((r) => {
        const u = K.usluga(D, r.usluga);
        const x = !K.aktywna(r) || r.status === 'nieobecny';
        return `<tr class="${RF.zazn.has(r.id) ? 'p-zazn' : ''}${x ? ' p-x' : ''}">
          <td><input type="checkbox" data-pa="rf-zaznacz" data-id="${r.id}" aria-label="Zaznacz: ${esc(r.imie)}, ${esc(r.data)}"${RF.zazn.has(r.id) ? ' checked' : ''} /></td>
          <td class="p-wazne" style="white-space:nowrap">${esc(K.wzgledna(r.data))}<small>${P.dataKrotka(r.data)}, ${K.czas(r.od, r.dl)}</small></td>
          <td><button type="button" class="p-link p-wazne" data-pa="rez" data-id="${r.id}">${esc(r.imie)}</button><small>${esc(r.tel)}</small></td>
          <td>${esc(u.nazwa)}${P.ent() ? `<small><span class="p-kropka" style="background:${kolorOsoby(r.terap)}"></span> ${esc(P.osobaNazwa(osoba(r.terap)))}</small>` : D.miejsca.length > 1 ? `<small>${esc(K.miejsce(D, r.lok).kr)}</small>` : ''}</td>
          <td>${zrodloTag(r.zrodlo)}</td>
          <td>${statusTag(r)}${r.pozno ? '<small>późno</small>' : ''}</td>
          <td class="p-liczba">${P.zl(K.cena(D, r))}</td>
          <td style="white-space:nowrap">${r.status === 'potwierdzona' && K.minelo(r.data, r.od + r.dl) ? `<button type="button" class="p-btn p-btn--maly p-btn--ok" data-pa="status" data-id="${r.id}" data-s="przyszedl" aria-label="Odbyta: ${esc(r.imie)}">Odbyta</button> <button type="button" class="p-btn p-btn--maly p-btn--cichy" data-pa="status" data-id="${r.id}" data-s="nieobecny" aria-label="Nieodbyta: ${esc(r.imie)}">Nieodbyta</button>` : `<button type="button" class="p-btn p-btn--maly p-btn--cichy" data-pa="rez" data-id="${r.id}" aria-label="Szczegóły: ${esc(r.imie)}">Otwórz</button>`}</td>
        </tr>`;
      }).join('');
      const masowo = RF.zazn.size ? `<div class="p-masowo" role="region" aria-label="Działania na zaznaczonych"><b>Zaznaczone: ${RF.zazn.size}</b>
        <button type="button" class="p-btn p-btn--ok" data-pa="rf-masowo" data-s="przyszedl">Odbyte</button>
        <button type="button" class="p-btn" data-pa="rf-masowo" data-s="nieobecny">Nieodbyte</button>
        <button type="button" class="p-btn" data-pa="rf-masowo" data-s="potwierdzona">Potwierdź / zdejmij oznaczenie</button>
        <button type="button" class="p-btn p-btn--alert" data-pa="rf-masowo" data-s="anulowana">Anuluj</button>
        <button type="button" class="p-btn p-btn--tekst" style="color:#fff" data-pa="rf-odznacz">Odznacz</button></div>` : '';
      return `<div class="p-stos">
        ${P.chipyZespolu()}
        ${P.karta('', `${filtry}
          <div class="p-podsum" aria-live="polite"><span><b>${wizyt(lista.length)}</b></span><span>odbyte: <b>${odbyte.length}</b></span><span>przychód: <b>${P.zl(suma(odbyte))}</b></span><span>nieodbyte: <b>${nieodb.length}</b>${nieodb.length ? ` (utracone ${P.zl(suma(nieodb))})` : ''}</span><span>odwołane: <b>${odw.length}</b></span><span>online: <b>${lista.length ? Math.round((online / lista.length) * 100) : 0}%</b></span></div>
          ${lista.length ? `<div class="p-tabela-przew"><table class="p-tabela"><thead><tr><th><input type="checkbox" data-pa="rf-wszystkie" aria-label="Zaznacz wszystkie widoczne"${wszystkieZazn ? ' checked' : ''} /></th><th><button type="button" class="p-link" data-pa="rf-sort">Termin ${RF.sort === 'rosnaco' ? '↑' : '↓'}</button></th><th>Pacjent</th><th>Usługa</th><th>Źródło</th><th>Status</th><th class="p-liczba">Cena</th><th><span class="visually-hidden">Akcje</span></th></tr></thead><tbody>${wiersze}</tbody></table></div>
          ${lista.length > RF.limit ? `<button type="button" class="p-btn p-btn--cichy" data-pa="rf-wiecej">Pokaż więcej (${lista.length - RF.limit})</button>` : ''}` : P.pusto('Brak wizyt dla tych filtrów.', '<button type="button" class="p-btn p-btn--maly p-btn--cichy" data-pa="rf-reset">Wyczyść filtry</button>')}
          ${masowo}`)}
      </div>`;
    },
    po(el) {
      const q = el.querySelector('#rf-q');
      if (q) q.addEventListener('input', () => { RF.q = q.value; RF.limit = 60; clearTimeout(P._rfq); P._rfq = setTimeout(P.odswiez, 160); });
    },
  };
  const rfZmien = (k) => (t) => { RF[k] = t.value; RF.limit = 60; P.odswiez(); };
  P.akcje['rf-zakres'] = rfZmien('zakres');
  P.akcje['rf-zrodlo'] = rfZmien('zrodlo');
  P.akcje['rf-terap'] = rfZmien('terap');
  P.akcje['rf-lok'] = rfZmien('lok');
  P.akcje['rf-od'] = rfZmien('od');
  P.akcje['rf-do'] = rfZmien('do');
  P.akcje['rf-status'] = (b) => { RF.status = b.dataset.s; RF.limit = 60; P.odswiez(); };
  P.akcje['rf-sort'] = () => { RF.sort = RF.sort === 'rosnaco' ? 'malejaco' : 'rosnaco'; P.odswiez(); };
  P.akcje['rf-wiecej'] = () => { RF.limit += 60; P.odswiez(); };
  P.akcje['rf-reset'] = () => { Object.assign(RF, { zakres: 'wszystkie', status: 'wszystkie', zrodlo: '', terap: '', lok: '', q: '' }); P.odswiez(); };
  P.akcje['rf-zaznacz'] = (b) => { if (RF.zazn.has(b.dataset.id)) RF.zazn.delete(b.dataset.id); else RF.zazn.add(b.dataset.id); P.odswiez(); };
  P.akcje['rf-wszystkie'] = (b) => { const w = przefiltrowane().slice(0, RF.limit); const wsz = w.every((r) => RF.zazn.has(r.id)); w.forEach((r) => (wsz ? RF.zazn.delete(r.id) : RF.zazn.add(r.id))); P.odswiez(); };
  P.akcje['rf-odznacz'] = () => { RF.zazn.clear(); P.odswiez(); };
  P.akcje['rf-masowo'] = (b) => {
    const s = b.dataset.s;
    const ids = [...RF.zazn];
    const n = ids.length;
    const nazwa = { przyszedl: 'odbyte', nieobecny: 'nieodbyte', potwierdzona: 'zaplanowane', anulowana: 'anulowane' }[s];
    RF.zazn.clear();
    window.KAL_UI.zmien(`${wizyt(n)} ${n === 1 ? 'oznaczona' : 'oznaczono'} jako ${nazwa}`, () => {
      P.D().rezerwacje.forEach((r) => { if (ids.includes(r.id)) { r.status = s; r.nowa = false; if (s === 'anulowana') { r.powod = 'Gabinet odwołał'; r.odwolano = new Date().toISOString(); } } });
    }, { zamknij: true });
  };
  P.akcje['rf-csv'] = () => {
    const D = P.D();
    const lista = przefiltrowane();
    const q = (s) => `"${String(s == null ? '' : s).replace(/"/g, '""')}"`;
    const csv = ['Data;Od;Do;Pacjent;Telefon;Usługa;Cena;Terapeuta;Miejsce;Status;Źródło']
      .concat(lista.map((r) => [r.data, K.godz(r.od), K.godz(r.od + r.dl), r.imie, r.tel, K.usluga(D, r.usluga).nazwa, K.cena(D, r), osoba(r.terap).nazwa, K.miejsce(D, r.lok).nazwa, K.STATUSY[r.status], K.ZRODLA[r.zrodlo] || r.zrodlo].map(q).join(';'))).join('\r\n');
    P.pobierz(`rezerwacje-${dzis()}.csv`, '﻿' + csv, 'text/csv;charset=utf-8');
    window.KAL_UI.toast(`Pobrano ${wizyt(lista.length)}.`);
  };
  P.pobierz = (nazwa, tresc, typ) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([tresc], { type: typ }));
    a.download = nazwa;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  };

  /* ── Pacjenci ───────────────────────────────────────────────────────── */
  const PF = { q: '', segment: 'wszyscy', zrodlo: '', sort: 'ostatnia' };
  const SEGMENTY = [['wszyscy', 'Wszyscy'], ['bez-kolejnej', 'Bez kolejnej wizyty'], ['nowi', 'Nowi w tym miesiącu'], ['nieodbyte', 'Z nieodbytymi wizytami'], ['system', 'Pozyskani przez stronę']];
  const notatkiPacjentow = () => { const C = P.C(); if (!C.pacjenci) C.pacjenci = {}; return C.pacjenci; };
  P.widoki.pacjenci = {
    tytul: 'Pacjenci',
    podtytul: 'Kontakty i historia wizyt. Bez dokumentacji medycznej.',
    render(arg) {
      if (arg === 'bez-kolejnej') { PF.segment = 'bez-kolejnej'; }
      else if (arg && /^\d+$/.test(arg)) setTimeout(() => P.otworzPacjenta(arg), 0);
      P.arg = '';
      const mapa = pacjenci();
      const bk = new Set(P.bezKolejnej().map((p) => tel(p.tel)));
      const q = PF.q.trim().toLowerCase();
      const cyfry = q.replace(/\D/g, '');
      const lista = [...mapa.entries()].filter(([k, p]) => {
        if (wybrani() && !wybrani().includes(p.terap)) return false;
        if (q && !(p.imie.toLowerCase().includes(q) || (cyfry.length >= 3 && k.includes(cyfry)))) return false;
        if (PF.zrodlo && p.zrodlo !== PF.zrodlo) return false;
        if (PF.segment === 'bez-kolejnej' && !bk.has(k)) return false;
        if (PF.segment === 'nowi' && p.pierwsza < poczMies()) return false;
        if (PF.segment === 'nieodbyte' && !p.nieobecny) return false;
        if (PF.segment === 'system' && p.zrodlo !== 'strona') return false;
        return true;
      }).sort((a, b) => (PF.sort === 'przychod' ? b[1].przychod - a[1].przychod : PF.sort === 'nazwisko' ? a[1].imie.split(' ').pop().localeCompare(b[1].imie.split(' ').pop(), 'pl') : (b[1].ostatnia || '').localeCompare(a[1].ostatnia || '')));
      const zSys = [...mapa.values()].filter((p) => p.zrodlo === 'strona');
      const przychodSys = zSys.reduce((s, p) => s + p.przychod, 0);
      const przychodWsz = [...mapa.values()].reduce((s, p) => s + p.przychod, 0);
      return `<div class="p-stos">
        ${P.chipyZespolu()}
        <div class="p-kpi">
          <div class="p-kpi__k"><span>Pacjenci w bazie</span><b>${mapa.size}</b><small>od kiedy działa system</small></div>
          <div class="p-kpi__k"><span>Pozyskani przez stronę</span><b>${zSys.length}</b><small>${mapa.size ? Math.round((zSys.length / mapa.size) * 100) : 0}% wszystkich pacjentów</small></div>
          <div class="p-kpi__k p-kpi__k--ciemny"><span>Przychód od nich</span><b>${P.zl(przychodSys)}</b><small>${przychodWsz ? Math.round((przychodSys / przychodWsz) * 100) : 0}% całego przychodu</small></div>
          <a class="p-kpi__k" href="#/pacjenci/bez-kolejnej"><span>Bez kolejnej wizyty</span><b>${bk.size}</b><small>warto zadzwonić</small></a>
        </div>
        ${P.karta('', `<div class="p-filtry">
            <input type="search" placeholder="Imię, nazwisko lub telefon" aria-label="Szukaj pacjenta" value="${esc(PF.q)}" id="pf-q" />
            <label class="wybor"><span class="visually-hidden">Źródło</span><select data-pzm="pf-zrodlo"><option value="">Każde źródło pozyskania</option>${Object.entries(K.ZRODLA).filter(([k]) => k !== 'powrot').map(([k, n]) => `<option value="${k}"${PF.zrodlo === k ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
            <label class="wybor"><span class="visually-hidden">Sortuj</span><select data-pzm="pf-sort"><option value="ostatnia"${PF.sort === 'ostatnia' ? ' selected' : ''}>Ostatnia wizyta</option><option value="nazwisko"${PF.sort === 'nazwisko' ? ' selected' : ''}>Nazwisko</option><option value="przychod"${PF.sort === 'przychod' ? ' selected' : ''}>Przychód</option></select></label>
          </div>
          <div class="p-filtry" role="group" aria-label="Grupa">${SEGMENTY.map(([k, n]) => `<button type="button" class="p-chip p-chip--bez" data-pa="pf-seg" data-s="${k}" aria-pressed="${PF.segment === k}">${n}</button>`).join('')}</div>
          ${lista.length ? `<div class="p-tabela-przew"><table class="p-tabela"><thead><tr><th>Pacjent</th><th>Pozyskany</th><th class="p-liczba">Odbyte</th><th class="p-liczba">Nieodbyte</th><th>Ostatnia</th><th>Następna</th><th class="p-liczba">Przychód</th></tr></thead><tbody>
            ${lista.map(([k, p]) => `<tr><td><button type="button" class="p-link" data-pa="pacjent" data-id="${k}">${esc(p.imie)}</button><small>${esc(p.tel)}</small></td><td>${zrodloTag(p.zrodlo)}<small>${P.dataKrotka(p.pierwsza)}</small></td><td class="p-liczba">${p.odwiedzil}</td><td class="p-liczba">${p.nieobecny || '–'}</td><td>${p.ostatnia ? esc(K.wzgledna(p.ostatnia)) : '–'}</td><td>${p.nastepna ? `${esc(K.wzgledna(p.nastepna.data))}, ${K.godz(p.nastepna.od)}` : bk.has(k) ? `<button type="button" class="p-btn p-btn--maly p-btn--akcent" data-pa="umow" data-imie="${esc(p.imie)}" data-tel="${esc(p.tel)}" data-terap="${p.terap}">Umów</button>` : '–'}</td><td class="p-liczba">${P.zl(p.przychod)}</td></tr>`).join('')}
          </tbody></table></div>` : P.pusto('Brak pacjentów dla tych filtrów.')}`)}
      </div>`;
    },
    po(el) {
      const q = el.querySelector('#pf-q');
      if (q) q.addEventListener('input', () => { PF.q = q.value; clearTimeout(P._pfq); P._pfq = setTimeout(P.odswiez, 160); });
    },
  };
  P.akcje['pf-seg'] = (b) => { PF.segment = b.dataset.s; P.odswiez(); };
  P.akcje['pf-zrodlo'] = (t) => { PF.zrodlo = t.value; P.odswiez(); };
  P.akcje['pf-sort'] = (t) => { PF.sort = t.value; P.odswiez(); };
  P.akcje.pacjent = (b) => P.otworzPacjenta(b.dataset.id);

  /** Karta pacjenta: kontakt, decyzje, historia wizyt, notatka i dane osobowe (RODO). */
  P.otworzPacjenta = (k) => {
    const budowa = () => {
      const D = P.D();
      const p = pacjenci().get(k);
      if (!p) return `${P.naglowek('Pacjent')}${P.pusto('Nie ma już tego pacjenta.')}`;
      const n = notatkiPacjentow()[k] || {};
      const wizyty = D.rezerwacje.filter((r) => tel(r.tel) === k).sort((a, b) => klucz(b).localeCompare(klucz(a)));
      return `${P.naglowek(esc(p.imie), `${esc(p.tel)} · pozyskany: ${esc(K.ZRODLA[p.zrodlo] || p.zrodlo)}, ${P.dataKrotka(p.pierwsza)}`)}
        <div class="sz__glowne">
          <a class="przycisk przycisk--cichy" href="tel:${k}">Zadzwoń</a>
          <button type="button" class="przycisk" data-pa="umow" data-imie="${esc(p.imie)}" data-tel="${esc(p.tel)}" data-terap="${p.terap}">Umów wizytę</button>
        </div>
        <dl class="dane">
          <div><dt>Wizyty</dt><dd>${p.odwiedzil} odbytych${p.nieobecny ? `, ${p.nieobecny} nieodbytych` : ''}${p.odwolal ? `, ${p.odwolal} odwołanych` : ''}</dd></div>
          <div><dt>Przychód</dt><dd>${P.zl(p.przychod)}</dd></div>
          <div><dt>Następna wizyta</dt><dd>${p.nastepna ? `${esc(K.dlugaData(K.zIso(p.nastepna.data)))}, ${K.godz(p.nastepna.od)}` : 'brak'}</dd></div>
        </dl>
        ${P.pole({ etykieta: 'Notatka o pacjencie <em>(nie medyczna, widzi ją tylko gabinet)</em>', wartosc: n.notatka || '', wiersze: 2, atr: `data-pac-notatka="${k}"`, placeholder: 'np. woli terminy rano, dzwonić po 16' })}
        ${P.przelacznik({ etykieta: 'Zgoda na przypomnienia SMS', wartosc: n.sms !== false, pod: 'Bez zgody pacjent dostaje tylko e-maile.', atr: `data-pac-sms="${k}"` })}
        <div class="p-sz-sekcja"><h3>Historia wizyt</h3>
          <ul class="p-lista">${wizyty.map((r) => `<li class="p-wiersz"><button type="button" class="p-wiersz__glowny" data-pa="rez" data-id="${r.id}"><b>${esc(K.dlugaData(K.zIso(r.data)))}, ${K.godz(r.od)} ${statusTag(r)}</b><small>${esc(K.usluga(D, r.usluga).nazwa)} · ${P.zl(K.cena(D, r))} · ${esc(K.ZRODLA_KR[r.zrodlo] || r.zrodlo)}${P.ent() ? ` · ${esc(P.osobaNazwa(osoba(r.terap)))}` : ''}</small></button></li>`).join('')}</ul>
        </div>
        <div class="p-sz-sekcja"><h3>Dane osobowe</h3>
          <p class="p-podp">Pacjent ma prawo do kopii swoich danych i do ich usunięcia. Usunięcie zostawia wizyty w statystykach, ale bez imienia i telefonu.</p>
          <div class="sz__drugie"><button type="button" class="przycisk przycisk--cichy" data-pa="pac-eksport" data-id="${k}">Pobierz dane pacjenta</button><button type="button" class="przycisk przycisk--cichy przycisk--ostrzez" data-pa="pac-usun" data-id="${k}">Usuń dane pacjenta</button></div>
        </div>`;
    };
    const s = P.otworz(budowa, {
      po: (el) => {
        const t = el.querySelector('[data-pac-notatka]');
        if (t) t.addEventListener('input', () => P.cichoCms(() => { const m = notatkiPacjentow(); m[k] = { ...(m[k] || {}), notatka: t.value }; }));
        const sms = el.querySelector('[data-pac-sms]');
        if (sms) sms.addEventListener('change', () => P.cichoCms(() => { const m = notatkiPacjentow(); m[k] = { ...(m[k] || {}), sms: sms.checked }; }));
      },
    });
    return s;
  };
  P.akcje['pac-eksport'] = (b) => {
    const k = b.dataset.id;
    const D = P.D();
    const p = pacjenci().get(k);
    const dane = { pacjent: { imie: p.imie, telefon: p.tel, notatka: (notatkiPacjentow()[k] || {}).notatka || '' }, wizyty: D.rezerwacje.filter((r) => tel(r.tel) === k).map((r) => ({ data: r.data, godzina: K.godz(r.od), usluga: K.usluga(D, r.usluga).nazwa, status: K.STATUSY[r.status], wiadomosc: r.uwaga || '' })) };
    P.pobierz(`dane-pacjenta-${k}.json`, JSON.stringify(dane, null, 2), 'application/json');
    window.KAL_UI.toast('Pobrano dane pacjenta.');
  };
  P.akcje['pac-usun'] = (b) => {
    const k = b.dataset.id;
    const p = pacjenci().get(k);
    if (!p) return;
    if (b.dataset.potw !== '1') { b.dataset.potw = '1'; b.textContent = 'Na pewno? Kliknij jeszcze raz'; return; }
    P.zamknij(false);
    const ano = `anonim-${Date.now().toString().slice(-6)}`;
    window.KAL_UI.zmien(`Usunięto dane: ${p.imie}`, () => {
      P.D().rezerwacje.forEach((r) => { if (tel(r.tel) === k) { r.imie = 'Pacjent usunięty'; r.tel = ano; r.uwaga = ''; r.notatka = ''; } });
    });
    P.cichoCms(() => { delete notatkiPacjentow()[k]; });
  };

  /* ── Statystyki ─────────────────────────────────────────────────────── */
  const SF = { okres: '30' };
  const OKRESY = [['30', 'Ostatnie 30 dni'], ['90', 'Ostatnie 90 dni'], ['miesiac', 'Ten miesiąc'], ['poprzedni', 'Poprzedni miesiąc']];
  function okresDat(o) {
    const t = new Date();
    if (o === 'miesiac') return [poczMies(), dzis()];
    if (o === 'poprzedni') { const p = new Date(t.getFullYear(), t.getMonth() - 1, 1); return [poczMies(p), konMies(p)]; }
    return [K.iso(K.dodaj(t, -Number(o) + 1)), dzis()];
  }
  function okresPoprzedni([od, doo]) {
    const dni = K.dniMiedzy(od, doo) + 1;
    return [K.iso(K.dodaj(K.zIso(od), -dni)), K.iso(K.dodaj(K.zIso(od), -1))];
  }
  function policz([od, doo]) {
    const D = P.D();
    const mapa = pacjenci();
    const R = D.rezerwacje.filter((r) => r.data >= od && r.data <= doo && wFiltrze(r));
    const minione = R.filter((r) => K.minelo(r.data, r.od));
    const odbyte = R.filter((r) => r.status === 'przyszedl');
    const nieodb = R.filter((r) => r.status === 'nieobecny');
    const odw = R.filter((r) => !K.aktywna(r));
    const nowi = [...mapa.values()].filter((p) => p.pierwsza >= od && p.pierwsza <= doo && (!wybrani() || wybrani().includes(p.terap)));
    const sysOdb = odbyte.filter((r) => P.zSystemu(r, mapa));
    return {
      R, odbyte, nieodb, odw, nowi, sysOdb,
      przychod: suma(odbyte),
      przychodSys: suma(sysOdb),
      utracone: suma(nieodb) + suma(odw.filter((r) => r.pozno)),
      nieobecnosc: minione.filter((r) => K.aktywna(r)).length ? Math.round((nieodb.length / minione.filter((r) => K.aktywna(r)).length) * 100) : 0,
      online: R.filter((r) => r.zrodlo === 'strona').length,
    };
  }
  P.widoki.statystyki = {
    tytul: 'Statystyki',
    podtytul: 'Przychód, pacjenci i to, ile przynosi system rezerwacji.',
    render() {
      const D = P.D();
      const zakres = okresDat(SF.okres);
      const a = policz(zakres);
      const b = policz(okresPoprzedni(zakres));
      const dni = K.dniMiedzy(zakres[0], zakres[1]) + 1;
      const abonament = (P.ent() ? 149 : 99) + (D.ustawienia.zaliczki ? 29 : 0);
      const koszt = Math.round((abonament * dni) / 30);
      const zwrot = koszt ? (a.przychodSys / koszt).toFixed(1).replace('.', ',') : '0';
      const zr = paskiZrodel(...zakres);
      const tyg = P.tygodnie(SF.okres === '90' ? 13 : 6);
      const uslugi = D.uslugi.map((u) => { const l = a.odbyte.filter((r) => r.usluga === u.id); return { u, n: l.length, p: suma(l) }; }).sort((x, y) => y.p - x.p);
      const maxU = Math.max(1, ...uslugi.map((x) => x.p));
      const kanaly = {};
      a.R.filter((r) => K.aktywna(r)).forEach((r) => { kanaly[r.zrodlo] = (kanaly[r.zrodlo] || 0) + 1; });
      const sumaK = Object.values(kanaly).reduce((s, n) => s + n, 0) || 1;
      let ruch = 0;
      for (let i = 0; i < dni; i++) ruch += P.ruch(K.iso(K.dodaj(K.zIso(zakres[0]), i)));
      const terapeuci = P.ent() ? D.zespol.map((t) => {
        const odb = a.odbyte.filter((r) => r.terap === t.id);
        let otw = 0;
        let zaj = 0;
        for (let i = 0; i < dni; i++) { const w = K.wypelnienie(D, [t], K.iso(K.dodaj(K.zIso(zakres[0]), i))); otw += w.otwarte; zaj += w.zajete; }
        return { t, n: odb.length, p: suma(odb), nie: a.nieodb.filter((r) => r.terap === t.id).length, wyp: otw ? Math.round((zaj / otw) * 100) : 0 };
      }) : [];
      return `<div class="p-stos">
        <div class="p-sekcja-g"><div class="p-filtry" role="group" aria-label="Okres">${OKRESY.map(([k, n]) => `<button type="button" class="p-chip p-chip--bez" data-pa="sf-okres" data-s="${k}" aria-pressed="${SF.okres === k}">${n}</button>`).join('')}</div>${P.chipyZespolu()}</div>
        <div class="p-kpi">
          <div class="p-kpi__k p-kpi__k--ciemny"><span>Przychód</span><b>${P.zl(a.przychod)}</b><small>${zmiana(a.przychod, b.przychod)} wobec poprzedniego okresu</small></div>
          <div class="p-kpi__k"><span>Odbyte wizyty</span><b>${a.odbyte.length}</b><small>średnio ${P.zl(a.odbyte.length ? a.przychod / a.odbyte.length : 0)} za wizytę</small></div>
          <div class="p-kpi__k"><span>Nowi pacjenci</span><b>${a.nowi.length}</b><small>w tym ${a.nowi.filter((p) => p.zrodlo === 'strona').length} ze strony ${zmiana(a.nowi.length, b.nowi.length)}</small></div>
          <div class="p-kpi__k"><span>Nieodbyte i późne odwołania</span><b>${a.nieobecnosc}%</b><small>utracone ok. ${P.zl(a.utracone)}</small></div>
        </div>
        <div class="p-siatka">
          ${P.karta('Ile przyniósł system rezerwacji', `<div class="p-dwie">
              <div class="p-stos" style="gap:6px"><span class="p-podp" style="color:#aab1b6">Przychód od pacjentów pozyskanych przez stronę</span><b style="font-family:var(--f-display);font-size:2.2rem;font-weight:900">${P.zl(a.przychodSys)}</b><span style="color:#aab1b6">${a.przychod ? Math.round((a.przychodSys / a.przychod) * 100) : 0}% całego przychodu w tym okresie</span></div>
              <div class="p-stos" style="gap:6px"><span class="p-podp" style="color:#aab1b6">Koszt systemu w tym okresie</span><b style="font-family:var(--f-display);font-size:2.2rem;font-weight:900">${P.zl(koszt)}</b><span style="color:#aab1b6">Na każdą złotówkę abonamentu: <b style="color:#fff">${zwrot} zł</b> przychodu</span></div>
            </div>
            <p class="p-podp" style="color:#aab1b6">Pacjent „ze strony” to ten, którego pierwsza wizyta przyszła przez rezerwację online. Liczymy wszystkie jego późniejsze wizyty, także umówione telefonicznie.</p>`, { klasa: 'p-s12 p-karta--ciemna' })}
          ${P.karta('Przychód tydzień po tygodniu', wykresTygodni(tyg, { wysokosc: 200 }), { klasa: 'p-s8' })}
          ${P.karta('Jak umawiają się pacjenci', `<div class="p-paski">${Object.entries(kanaly).sort((x, y) => y[1] - x[1]).map(([z, n]) => `<div class="p-pasek${z === 'strona' ? ' p-pasek--system' : ''}"><span>${esc(K.ZRODLA_KR[z] || z)}</span><span class="p-pasek__tor"><i style="width:${(n / sumaK) * 100}%"></i></span><b>${Math.round((n / sumaK) * 100)}%</b></div>`).join('') || P.pusto('Brak wizyt.')}</div>`, { klasa: 'p-s4', pod: 'Wszystkie wizyty w okresie, według sposobu umówienia.' })}
          ${P.karta('Skąd przyszli nowi pacjenci', zr.html, { klasa: 'p-s6', pod: `${pacjentow(zr.nowi.length)} w tym okresie.` })}
          ${P.karta('Usługi', `<div class="p-paski">${uslugi.map((x) => `<div class="p-pasek"><span>${esc(x.u.nazwa)}</span><span class="p-pasek__tor"><i style="width:${(x.p / maxU) * 100}%"></i></span><b>${P.zl(x.p)}</b></div>`).join('')}</div>`, { klasa: 'p-s6', pod: 'Przychód z odbytych wizyt.' })}
          ${P.ent() ? P.karta('Terapeuci', `<div class="p-tabela-przew"><table class="p-tabela"><thead><tr><th>Terapeuta</th><th class="p-liczba">Odbyte</th><th class="p-liczba">Nieodbyte</th><th class="p-liczba">Wypełnienie</th><th class="p-liczba">Przychód</th></tr></thead><tbody>${terapeuci.map((x) => `<tr><td><span class="p-kropka" style="background:${K.kolor(x.t.kolor)}"></span> ${esc(x.t.nazwa)}</td><td class="p-liczba">${x.n}</td><td class="p-liczba">${x.nie}</td><td class="p-liczba">${x.wyp}%</td><td class="p-liczba p-wazne">${P.zl(x.p)}</td></tr>`).join('')}</tbody></table></div>`, { klasa: 'p-s12' }) : ''}
          ${P.karta('Ruch na stronie a rezerwacje', `<div class="p-trzy">
              <div class="p-kpi__k" style="box-shadow:none;background:var(--floor)"><span>Odwiedziny strony</span><b>${ruch.toLocaleString('pl-PL')}</b><small>dane przykładowe w demie</small></div>
              <div class="p-kpi__k" style="box-shadow:none;background:var(--floor)"><span>Rezerwacje online</span><b>${a.online}</b><small>z kalendarza</small></div>
              <div class="p-kpi__k" style="box-shadow:none;background:var(--floor)"><span>Konwersja</span><b>${ruch ? ((a.online / ruch) * 100).toFixed(1).replace('.', ',') : 0}%</b><small>odwiedziny, które kończą się rezerwacją</small></div>
            </div>`, { klasa: 'p-s12', pod: 'W prawdziwym systemie odwiedziny pochodzą z analityki strony (bez ciasteczek).' })}
        </div>
      </div>`;
    },
  };
  P.akcje['sf-okres'] = (b) => { SF.okres = b.dataset.s; P.odswiez(); };
})();
