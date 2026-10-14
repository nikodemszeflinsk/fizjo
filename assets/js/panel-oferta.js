/*
 * Panel — oferta: usługi i cennik, zespół, lokalizacje.
 *
 * To są te same dane, z których korzysta kalendarz i strona: usługa ma czas i cenę,
 * terapeuta wykonuje wybrane usługi w wybranych miejscach, miejsce ma godziny otwarcia.
 */
(() => {
  'use strict';

  const K = window.KAL;
  const P = window.PANEL;
  const esc = P.esc;
  const OPCJE_DL = Array.from({ length: 12 }, (_, i) => [(i + 1) * 15, K.dlTekst((i + 1) * 15)]);
  const lim = () => K.LIMITY[P.tryb()];
  const limit = (n, max, nazwa) => `<div class="p-limit${n >= max ? ' p-limit--pelny' : ''}"><span>${nazwa}: <b>${K.zLimitu(n, max)}</b> w pakiecie ${lim().nazwa}</span>${max === Infinity ? '' : `<span class="p-limit__tor"><i style="width:${Math.min(100, (n / max) * 100)}%"></i></span>`}</div>`;
  const avatar = (t, rozm = 34) => `<span class="p-osoba__av" style="background:${K.kolor(t.kolor)};width:${rozm}px;height:${rozm}px;font-size:${rozm < 40 ? '0.76rem' : '1rem'}" title="${esc(t.nazwa)}">${P.inicjaly(t.nazwa)}</span>`;
  const sumaGodzin = (D, terap, lok) => K.DNI_PRACY.reduce((s, dz) => s + ((D.reguly[terap] || {})[dz] || []).filter((r) => !lok || r.lok === lok).reduce((x, r) => x + (r.do - r.od), 0), 0);

  /* ── Usługi i cennik ────────────────────────────────────────────────── */
  function podgladCennika(D) {
    const kategorie = [...new Set(D.uslugi.map((u) => u.kategoria || 'Usługi'))];
    const styl = (P.C().strona.wyglad || {}).styl;
    const kolor = { niebieski: '#1f5fd6', zielony: '#13875a', cieply: '#e8590c', grafit: '#2f353a' }[styl] || '#1f5fd6';
    return `<div class="ps" style="--ak:${kolor}"><div class="ps__bar"><i></i><i></i><i></i><span>${esc(P.C().konto.domena)} › cennik</span></div>
      <div class="ps__strona"><div class="ps__blok" style="border-top:0"><h4>Cennik</h4>
        ${kategorie.map((k) => `<p class="ps__et" style="margin-top:6px">${esc(k)}</p><div class="ps__cennik">${D.uslugi.filter((u) => (u.kategoria || 'Usługi') === k).sort((a, b) => a.kolej - b.kolej).map((u) => `<div><span>${esc(u.nazwa)}<br /><small style="color:var(--muted)">${K.dlTekst(u.min)}${u.online === false ? ' · tylko telefonicznie' : ''}</small></span><b>${u.cena} zł</b></div>`).join('')}</div>`).join('')}
        <span class="ps__cta">Umów wizytę</span>
      </div></div></div>`;
  }
  P.widoki.uslugi = {
    tytul: 'Usługi i cennik',
    podtytul: 'Co można u Ciebie zarezerwować, ile trwa i ile kosztuje. Zmiany od razu widać w kalendarzu i na stronie.',
    render(arg) {
      const D = P.D();
      if (arg && D.uslugi.some((u) => u.id === arg)) setTimeout(() => P.otworzUsluge(arg), 0);
      P.arg = '';
      const uslugi = D.uslugi.slice().sort((a, b) => a.kolej - b.kolej);
      const mies = K.iso(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
      const wiersze = uslugi.map((u, i) => {
        const idx = D.uslugi.indexOf(u);
        const odb = D.rezerwacje.filter((r) => r.usluga === u.id && r.status === 'przyszedl' && r.data >= mies);
        const kto = P.ent() ? D.zespol.filter((t) => !t.uslugi || t.uslugi.includes(u.id)) : [];
        return `<div class="ed__el">
          <div class="ed__el-g">
            <span class="p-karta__akcje" style="flex-direction:column;gap:2px"><button type="button" class="p-btn p-btn--ikona p-btn--cichy p-btn--maly" data-pa="u-gora" data-id="${u.id}" aria-label="Wyżej: ${esc(u.nazwa)}" ${i === 0 ? 'disabled' : ''}>${P.ikona('gora')}</button><button type="button" class="p-btn p-btn--ikona p-btn--cichy p-btn--maly" data-pa="u-dol" data-id="${u.id}" aria-label="Niżej: ${esc(u.nazwa)}" ${i === uslugi.length - 1 ? 'disabled' : ''}>${P.ikona('dol')}</button></span>
            <div style="flex:1;min-width:0;display:grid;gap:8px">
              <div class="p-trzy" style="grid-template-columns:minmax(0,2fr) minmax(0,1fr) minmax(0,1fr)">
                ${P.pole({ etykieta: 'Nazwa', pf: `rez:uslugi.${idx}.nazwa`, wartosc: u.nazwa })}
                ${P.wybor({ etykieta: 'Czas', pf: `rez:uslugi.${idx}.min`, wartosc: u.min, opcje: OPCJE_DL, atr: 'data-typ="liczba"' })}
                ${P.pole({ etykieta: 'Cena (zł)', pf: `rez:uslugi.${idx}.cena`, wartosc: u.cena, typ: 'number', atr: 'min="0" step="10"' })}
              </div>
              <div class="p-filtry" style="justify-content:space-between">
                <span class="p-filtry">${P.przelacznik({ etykieta: 'Rezerwacja online', pf: `rez:uslugi.${idx}.online`, wartosc: u.online !== false })}${D.ustawienia.zaliczki ? P.przelacznik({ etykieta: 'Zaliczka', pf: `rez:uslugi.${idx}.zaliczka`, wartosc: !!u.zaliczka }) : ''}</span>
                <span class="p-podp">${odb.length ? `w tym miesiącu: ${odb.length} odbytych, ${P.zl(odb.reduce((s, r) => s + K.cena(D, r), 0))}` : 'w tym miesiącu bez odbytych wizyt'}</span>
              </div>
              ${P.ent() ? `<div class="p-filtry"><span class="p-podp">Wykonują:</span>${kto.length ? kto.map((t) => avatar(t, 28)).join('') : '<span class="p-tag p-tag--czerwony">nikt: usługi nie da się zarezerwować</span>'}</div>` : ''}
            </div>
            <button type="button" class="p-btn p-btn--maly p-btn--cichy" data-pa="u-edytuj" data-id="${u.id}">Więcej</button>
          </div>
        </div>`;
      }).join('');
      return `<div class="ed" style="grid-template-columns:minmax(0,1fr) minmax(300px,380px)">
        <div class="ed__forma">
          ${P.karta('Usługi', `${limit(D.uslugi.length, lim().uslugi, 'Usługi')}<div class="ed__lista">${wiersze}</div>
            <button type="button" class="p-btn p-btn--cichy" data-pa="u-dodaj" ${D.uslugi.length >= lim().uslugi ? 'disabled' : ''}>${P.ikona('plus')}<span>Dodaj usługę</span></button>
            ${D.uslugi.length >= lim().uslugi ? '<p class="p-podp">Limit pakietu osiągnięty. Kolejne usługi wyceniamy osobno.</p>' : ''}`, { pod: 'Kolejność jest taka jak w cenniku na stronie. Zmiany zapisują się od razu.' })}
        </div>
        <aside class="ed__podglad"><div class="ed__podglad-g">Tak wygląda cennik na stronie</div><div id="u-podglad">${podgladCennika(D)}</div></aside>
      </div>`;
    },
    naZmiane(sciezka) { if (sciezka.startsWith('uslugi')) { const el = document.getElementById('u-podglad'); if (el) el.innerHTML = podgladCennika(P.D()); } },
  };
  const przestaw = (id, krok) => P.zmienRez('Zmieniono kolejność usług', (D) => {
    const lista = D.uslugi.slice().sort((a, b) => a.kolej - b.kolej);
    const i = lista.findIndex((u) => u.id === id);
    const j = i + krok;
    if (j < 0 || j >= lista.length) return;
    [lista[i], lista[j]] = [lista[j], lista[i]];
    lista.forEach((u, k) => { u.kolej = k; });
  });
  P.akcje['u-gora'] = (b) => przestaw(b.dataset.id, -1);
  P.akcje['u-dol'] = (b) => przestaw(b.dataset.id, 1);
  P.akcje['u-dodaj'] = () => {
    const id = `u${Date.now()}`;
    P.zmienRez('Dodano usługę', (D) => { D.uslugi.push({ id, nazwa: 'Nowa usługa', min: 45, cena: 150, zaliczka: false, opis: '', online: true, kategoria: 'Terapie', kolej: D.uslugi.length }); });
    setTimeout(() => P.otworzUsluge(id), 30);
  };
  P.akcje['u-edytuj'] = (b) => P.otworzUsluge(b.dataset.id);
  P.otworzUsluge = (id) => {
    P.otworz(() => {
      const D = P.D();
      const i = D.uslugi.findIndex((u) => u.id === id);
      if (i < 0) return `${P.naglowek('Usługa')}${P.pusto('Tej usługi już nie ma.')}`;
      const u = D.uslugi[i];
      const rez = D.rezerwacje.filter((r) => r.usluga === id).length;
      const kategorie = [...new Set(D.uslugi.map((x) => x.kategoria).filter(Boolean))];
      return `${P.naglowek(esc(u.nazwa), `${K.dlTekst(u.min)} · ${u.cena} zł`)}
        <div class="p-formularz">
          ${P.pole({ etykieta: 'Nazwa', pf: `rez:uslugi.${i}.nazwa`, wartosc: u.nazwa, atr: 'data-fokus' })}
          <div class="pola2">${P.wybor({ etykieta: 'Czas', pf: `rez:uslugi.${i}.min`, wartosc: u.min, opcje: OPCJE_DL, atr: 'data-typ="liczba"' })}${P.pole({ etykieta: 'Cena (zł)', pf: `rez:uslugi.${i}.cena`, wartosc: u.cena, typ: 'number', atr: 'min="0" step="10"' })}</div>
          ${P.pole({ etykieta: 'Kategoria w cenniku', pf: `rez:uslugi.${i}.kategoria`, wartosc: u.kategoria || '', atr: 'list="u-kategorie"', pod: 'Np. „Wizyty” albo „Terapie”. Usługi z tej samej kategorii są obok siebie.' })}
          <datalist id="u-kategorie">${kategorie.map((k) => `<option value="${esc(k)}"></option>`).join('')}</datalist>
          ${P.pole({ etykieta: 'Opis na stronie', pf: `rez:uslugi.${i}.opis`, wartosc: u.opis || '', wiersze: 3, licznik: 200, pod: 'Jedno, dwa zdania: dla kogo i co się dzieje na wizycie. Bez obietnic wyleczenia.' })}
          ${P.przelacznik({ etykieta: 'Pacjent może zarezerwować online', pf: `rez:uslugi.${i}.online`, wartosc: u.online !== false, pod: 'Wyłączona usługa jest w cenniku, ale umawia się ją telefonicznie.' })}
          ${D.ustawienia.zaliczki ? P.przelacznik({ etykieta: 'Wymaga zaliczki online', pf: `rez:uslugi.${i}.zaliczka`, wartosc: !!u.zaliczka, pod: `Kwota: ${D.ustawienia.zaliczkaKwota} zł. Zmienisz ją w Płatnościach.` }) : ''}
          ${P.ent() ? `<div class="p-sz-sekcja"><h3>Kto wykonuje tę usługę</h3><div class="p-check-lista">${D.zespol.map((t) => `<label><input type="checkbox" data-pzm="u-kto" data-usl="${id}" data-terap="${t.id}"${!t.uslugi || t.uslugi.includes(id) ? ' checked' : ''} />${avatar(t, 26)} ${esc(t.nazwa)}</label>`).join('')}</div><p class="pod">Pacjent zobaczy termin tylko u osób, które ją wykonują.</p></div>` : ''}
          <div class="p-sz-sekcja"><h3>Usuń usługę</h3>${rez ? `<p class="p-podp">Ta usługa ma ${rez} ${rez === 1 ? 'wizytę' : 'wizyt'} w historii, więc nie można jej usunąć. Możesz wyłączyć rezerwację online.</p>` : `<button type="button" class="przycisk przycisk--cichy przycisk--ostrzez" data-pa="u-usun" data-id="${id}">Usuń usługę</button>`}</div>
        </div>
        <footer class="sz__st"><button type="button" class="przycisk" data-pa="zamknij">Gotowe</button></footer>`;
    });
  };
  P.akcje['u-kto'] = (t) => {
    P.cichoRez((D) => {
      const os = D.zespol.find((x) => x.id === t.dataset.terap);
      if (!os.uslugi) os.uslugi = D.uslugi.map((u) => u.id);
      os.uslugi = t.checked ? [...new Set([...os.uslugi, t.dataset.usl])] : os.uslugi.filter((x) => x !== t.dataset.usl);
    });
    P.odswiez();
  };
  P.akcje['u-usun'] = (b) => { P.zamknij(false); P.zmienRez('Usunięto usługę', (D) => { D.uslugi = D.uslugi.filter((u) => u.id !== b.dataset.id); D.zespol.forEach((t) => { if (t.uslugi) t.uslugi = t.uslugi.filter((x) => x !== b.dataset.id); }); }); };

  /* ── Zespół / Mój profil ───────────────────────────────────────────── */
  function formularzProfilu(t, i) {
    const D = P.D();
    return `<div class="p-formularz">
      <div class="pola2">${P.pole({ etykieta: 'Imię i nazwisko', pf: `rez:zespol.${i}.nazwa`, wartosc: t.nazwa })}${P.pole({ etykieta: 'Tytuł', pf: `rez:zespol.${i}.tytul`, wartosc: t.tytul || '', placeholder: 'np. mgr fizjoterapii' })}</div>
      ${P.pole({ etykieta: 'O mnie (na stronie)', pf: `rez:zespol.${i}.bio`, wartosc: t.bio || '', wiersze: 4, licznik: 400, pod: 'Krótko: z czym pracujesz i jak wygląda pierwsza wizyta. Bez obietnic wyleczenia.' })}
      ${P.pole({ etykieta: 'Specjalizacje <em>(po jednej w linii)</em>', pf: `rez:zespol.${i}.specjalizacje`, wartosc: (t.specjalizacje || []).join('\n'), wiersze: 3, atr: 'data-typ="lista"' })}
      <div class="p-sz-sekcja"><h3>Rezerwacje</h3>
        ${P.przelacznik({ etykieta: 'Przyjmuje rezerwacje online', pf: `rez:zespol.${i}.online`, wartosc: t.online !== false, pod: 'Wyłączony terapeuta nadal ma kalendarz, ale pacjent nie zarezerwuje u niego na stronie.' })}
        ${P.ent() ? P.przelacznik({ etykieta: 'Widoczny na stronie w sekcji „Zespół”', pf: `rez:zespol.${i}.naStronie`, wartosc: t.naStronie !== false }) : ''}
        ${P.ent() ? P.przelacznik({ etykieta: 'Widoczny w kalendarzu gabinetu', pf: `rez:zespol.${i}.widoczny`, wartosc: t.widoczny !== false }) : ''}
      </div>
      ${P.ent() ? `<div class="p-sz-sekcja"><h3>Usługi</h3><div class="p-check-lista">${D.uslugi.map((u) => `<label><input type="checkbox" data-pzm="u-kto" data-usl="${u.id}" data-terap="${t.id}"${!t.uslugi || t.uslugi.includes(u.id) ? ' checked' : ''} /> ${esc(u.nazwa)} <small style="margin-left:auto;color:var(--muted)">${K.dlTekst(u.min)}</small></label>`).join('')}</div></div>` : ''}
      ${D.miejsca.length > 1 ? `<div class="p-sz-sekcja"><h3>Gdzie przyjmuje</h3><div class="p-check-lista">${D.miejsca.map((m) => `<label><input type="checkbox" data-pzm="t-lok" data-terap="${t.id}" data-lok="${m.id}"${(t.lokalizacje || []).includes(m.id) ? ' checked' : ''} /><span class="p-kropka" style="background:${K.kolor(m.kolor)}"></span> ${esc(m.nazwa)}<small style="margin-left:auto;color:var(--muted)">${K.godzTekst(sumaGodzin(D, t.id, m.id))} w grafiku</small></label>`).join('')}</div><p class="pod">Godziny w każdym miejscu ustawisz w <a href="#/dostepnosc">Dostępności</a>.</p></div>` : ''}
      ${P.ent() ? `<div class="p-sz-sekcja"><h3>Kolor w kalendarzu</h3><div class="p-filtry">${K.KOLORY.map((c, j) => `<button type="button" class="p-chip p-chip--bez" data-pa="t-kolor" data-terap="${t.id}" data-k="${j}" aria-pressed="${t.kolor === j}" aria-label="Kolor ${j + 1}"><span class="p-kropka" style="background:${c};width:16px;height:16px"></span></button>`).join('')}</div></div>` : ''}
      <div class="p-sz-sekcja"><h3>Kalendarz Google</h3>
        <div class="p-filtry"><span class="p-tag p-tag--${t.google ? 'zielony' : 'zolty'}">${t.google ? 'połączony' : 'niepołączony'}</span><button type="button" class="p-btn p-btn--maly p-btn--cichy" data-pa="t-google" data-terap="${t.id}">${t.google ? 'Rozłącz' : 'Połącz Kalendarz Google'}</button></div>
        <p class="pod">Prywatne wydarzenia z Google blokują terminy, a wizyty pojawiają się w Twoim kalendarzu w telefonie. W demie to symulacja.</p>
      </div>
    </div>`;
  }
  function podgladProfilu(t) {
    return `<div class="ps"><div class="ps__bar"><i></i><i></i><i></i><span>${esc(P.C().konto.domena)} › ${P.ent() ? 'zespol' : 'o-mnie'}</span></div><div class="ps__strona"><div class="ps__blok" style="border-top:0;justify-items:start">
      <div class="p-osoba">${avatar(t, 54)}<div><b style="font-family:var(--f-display);font-size:1rem">${esc(t.nazwa)}</b><small>${esc(t.tytul || '')}</small></div></div>
      <div class="ps__chipy">${(t.specjalizacje || []).map((s) => `<span>${esc(s)}</span>`).join('')}</div>
      <p>${esc(t.bio || '') || '<span class="ps__pusto">Brak opisu.</span>'}</p>
      ${t.online !== false ? '<span class="ps__cta">Umów wizytę</span>' : '<p class="ps__pusto">Rezerwacja tylko telefonicznie.</p>'}
    </div></div></div>`;
  }
  P.widoki.zespol = {
    tytul: () => (P.ent() ? 'Zespół' : 'Mój profil'),
    podtytul: () => (P.ent() ? 'Kto przyjmuje, jakie usługi wykonuje i gdzie. Profil każdej osoby jest na stronie.' : 'Twój profil na stronie i ustawienia rezerwacji.'),
    render(arg) {
      const D = P.D();
      if (!P.ent()) {
        const t = D.zespol[0];
        return `<div class="ed" style="grid-template-columns:minmax(0,1fr) minmax(300px,380px)"><div class="ed__forma">${P.karta('Profil', formularzProfilu(t, 0))}</div><aside class="ed__podglad"><div class="ed__podglad-g">Tak wyglądasz na stronie</div><div id="t-podglad">${podgladProfilu(t)}</div></aside></div>`;
      }
      if (arg && D.zespol.some((t) => t.id === arg)) setTimeout(() => P.otworzOsobe(arg), 0);
      P.arg = '';
      const mies = K.iso(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
      return `<div class="p-stos">
        ${limit(D.zespol.length, lim().terapeuci, 'Terapeuci')}
        <div class="p-karty">
          ${D.zespol.map((t) => {
            const odb = D.rezerwacje.filter((r) => r.terap === t.id && r.status === 'przyszedl' && r.data >= mies);
            return `<button type="button" class="p-kafel" data-pa="t-edytuj" data-terap="${t.id}">
              <div class="p-osoba">${avatar(t, 48)}<div><b>${esc(t.nazwa)}</b><small>${esc(t.tytul || '')}</small></div></div>
              <div class="p-tagi">${(t.specjalizacje || []).slice(0, 3).map((s) => `<span class="p-tag">${esc(s)}</span>`).join('')}</div>
              ${D.miejsca.length > 1 ? `<div class="p-kafel__lok">${P.ikona('lokalizacje')}${D.miejsca.filter((m) => sumaGodzin(D, t.id, m.id)).map((m) => `<span><i style="background:${K.kolor(m.kolor)}"></i>${esc(m.kr || m.nazwa)} · ${K.godzTekst(sumaGodzin(D, t.id, m.id))}</span>`).join('') || '<span>bez godzin w grafiku</span>'}</div>` : ''}
              <div class="p-kafel__dol"><span>${K.godzTekst(sumaGodzin(D, t.id))} w tygodniu</span><span>${odb.length} wizyt w tym miesiącu</span><span>${P.zl(odb.reduce((s, r) => s + K.cena(D, r), 0))}</span></div>
              <div class="p-tagi">${t.online === false ? '<span class="p-tag p-tag--czerwony">bez rezerwacji online</span>' : '<span class="p-tag p-tag--zielony">rezerwacje online</span>'}${t.google ? '<span class="p-tag p-tag--niebieski">Kalendarz Google</span>' : ''}${t.naStronie === false ? '<span class="p-tag">ukryty na stronie</span>' : ''}</div>
            </button>`;
          }).join('')}
          <button type="button" class="p-kafel p-kafel--dodaj" data-pa="t-dodaj" ${D.zespol.length >= lim().terapeuci ? 'disabled' : ''}>${P.ikona('plus')}<span>${D.zespol.length >= lim().terapeuci ? 'Limit pakietu osiągnięty' : 'Dodaj terapeutę'}</span></button>
        </div>
      </div>`;
    },
    naZmiane(sciezka) { if (!P.ent() && sciezka.startsWith('zespol')) { const el = document.getElementById('t-podglad'); if (el) el.innerHTML = podgladProfilu(P.D().zespol[0]); } },
  };
  P.otworzOsobe = (id) => P.otworz(() => {
    const D = P.D();
    const i = D.zespol.findIndex((t) => t.id === id);
    if (i < 0) return `${P.naglowek('Terapeuta')}${P.pusto('Tej osoby już nie ma w zespole.')}`;
    const t = D.zespol[i];
    const rez = D.rezerwacje.filter((r) => r.terap === id).length;
    return `${P.naglowek(esc(t.nazwa), `${K.godzTekst(sumaGodzin(D, id))} w tygodniu · <a href="#/dostepnosc" data-pa="t-grafik" data-terap="${id}">Zobacz grafik</a>`)}
      ${formularzProfilu(t, i)}
      <div class="p-sz-sekcja"><h3>Usuń z zespołu</h3>${rez ? `<p class="p-podp">Ta osoba ma ${rez} wizyt w historii, więc nie można jej usunąć. Wyłącz rezerwacje online i ukryj ją na stronie.</p>` : `<button type="button" class="przycisk przycisk--cichy przycisk--ostrzez" data-pa="t-usun" data-terap="${id}"${D.zespol.length < 2 ? ' disabled' : ''}>Usuń z zespołu</button>`}</div>
      <footer class="sz__st"><button type="button" class="przycisk" data-pa="zamknij">Gotowe</button></footer>`;
  }, { szeroka: true });
  P.akcje['t-edytuj'] = (b) => P.otworzOsobe(b.dataset.terap);
  P.akcje['t-grafik'] = (b) => { P.zamknij(false); P.filtrOsob = [b.dataset.terap]; P.GF.tab = 'staly'; P.idz('dostepnosc/staly'); };
  P.akcje['t-kolor'] = (b) => P.zmienRez('Zmieniono kolor', (D) => { D.zespol.find((t) => t.id === b.dataset.terap).kolor = Number(b.dataset.k); });
  P.akcje['t-google'] = (b) => { const t = P.D().zespol.find((x) => x.id === b.dataset.terap); P.zmienRez(t.google ? `Rozłączono Kalendarz Google: ${t.nazwa}` : `Połączono Kalendarz Google: ${t.nazwa} (symulacja)`, () => { t.google = !t.google; }); };
  P.akcje['t-lok'] = (t) => { P.cichoRez((D) => { const os = D.zespol.find((x) => x.id === t.dataset.terap); os.lokalizacje = t.checked ? [...new Set([...(os.lokalizacje || []), t.dataset.lok])] : (os.lokalizacje || []).filter((x) => x !== t.dataset.lok); }); P.odswiez(); };
  P.akcje['t-dodaj'] = () => {
    const id = `t${Date.now()}`;
    P.zmienRez('Dodano terapeutę', (D) => {
      D.zespol.push({ id, nazwa: 'mgr Nowa Osoba', kolor: D.zespol.length % K.KOLORY.length, widoczny: true, tytul: 'mgr fizjoterapii', bio: '', specjalizacje: [], online: true, naStronie: true, google: false, lokalizacje: D.miejsca.map((m) => m.id), uslugi: D.uslugi.map((u) => u.id) });
      D.reguly[id] = {};
    });
    setTimeout(() => P.otworzOsobe(id), 30);
  };
  P.akcje['t-usun'] = (b) => { P.zamknij(false); P.zmienRez('Usunięto z zespołu', (D) => { D.zespol = D.zespol.filter((t) => t.id !== b.dataset.terap); delete D.reguly[b.dataset.terap]; }); };

  /* ── Lokalizacje ────────────────────────────────────────────────────── */
  const DN = { 1: 'Pn', 2: 'Wt', 3: 'Śr', 4: 'Cz', 5: 'Pt', 6: 'Sb' };
  function konfliktyOtwarcia(D, m) {
    const wynik = [];
    D.zespol.forEach((t) => K.DNI_PRACY.forEach((dz) => ((D.reguly[t.id] || {})[dz] || []).filter((r) => r.lok === m.id).forEach((r) => {
      const o = (m.otwarcie || {})[dz];
      if (!o || r.od < o[0] || r.do > o[1]) wynik.push({ t, dz, r });
    })));
    return wynik;
  }
  P.widoki.lokalizacje = {
    tytul: () => (P.ent() ? 'Lokalizacje' : 'Miejsca przyjęć'),
    podtytul: 'Adres, godziny otwarcia i dojazd. Te dane są na stronie i w wizytówce Google.',
    render() {
      const D = P.D();
      return `<div class="p-stos">
        ${limit(D.miejsca.length, lim().miejsca, P.ent() ? 'Lokalizacje' : 'Miejsca przyjęć')}
        <div class="p-karty" style="grid-template-columns:repeat(auto-fill,minmax(340px,1fr))">
          ${D.miejsca.map((m) => {
            const kto = D.zespol.filter((t) => sumaGodzin(D, t.id, m.id));
            const konf = konfliktyOtwarcia(D, m);
            return `<button type="button" class="p-kafel" data-pa="l-edytuj" data-id="${m.id}">
              <div class="p-osoba"><span class="p-osoba__av" style="background:${K.kolor(m.kolor)}">${P.ikona('lokalizacje')}</span><div><b>${esc(m.ulica && m.nazwa.endsWith(m.ulica) && m.nazwa.length > m.ulica.length ? m.nazwa.slice(0, -m.ulica.length).replace(/[,\s·–-]+$/, '') : m.nazwa)}</b><small>${esc(m.ulica || '')}${m.miasto ? `, ${esc(m.miasto)}` : ''}</small></div></div>
              <div class="p-tagi">${K.DNI_PRACY.map((dz) => { const o = (m.otwarcie || {})[dz]; return `<span class="p-tag${o ? '' : ' p-tag--czerwony'}">${DN[dz]} ${o ? `${K.godz(o[0])}–${K.godz(o[1])}` : 'zamk.'}</span>`; }).join('')}</div>
              <div class="p-kafel__dol"><span>${m.telefon ? esc(m.telefon) : 'bez telefonu'}</span><span>${kto.length ? `przyjmuje: ${kto.map((t) => esc(P.osobaNazwa(t).split(' ')[0])).join(', ')}` : 'nikt tu nie przyjmuje'}</span></div>
              ${konf.length ? `<span class="p-ostrz">${P.ikona('uwaga')}<span>${konf.length} ${konf.length === 1 ? 'przedział grafiku wychodzi' : 'przedziały grafiku wychodzą'} poza godziny otwarcia</span></span>` : ''}
            </button>`;
          }).join('')}
          <button type="button" class="p-kafel p-kafel--dodaj" data-pa="l-dodaj" ${D.miejsca.length >= lim().miejsca ? 'disabled' : ''}>${P.ikona('plus')}<span>${D.miejsca.length >= lim().miejsca ? 'Limit pakietu osiągnięty' : P.ent() ? 'Dodaj lokalizację' : 'Dodaj miejsce przyjęć'}</span></button>
        </div>
      </div>`;
    },
  };
  P.otworzMiejsce = (id) => P.otworz(() => {
    const D = P.D();
    const i = D.miejsca.findIndex((m) => m.id === id);
    if (i < 0) return `${P.naglowek('Miejsce')}${P.pusto('Tego miejsca już nie ma.')}`;
    const m = D.miejsca[i];
    const konf = konfliktyOtwarcia(D, m);
    const uzyte = D.rezerwacje.some((r) => r.lok === id) || D.zespol.some((t) => sumaGodzin(D, t.id, id));
    return `${P.naglowek(esc(m.nazwa), esc(`${m.ulica || ''} ${m.miasto || ''}`))}
      <div class="p-formularz">
        <div class="pola2">${P.pole({ etykieta: 'Nazwa', pf: `rez:miejsca.${i}.nazwa`, wartosc: m.nazwa, atr: 'data-fokus' })}${P.pole({ etykieta: 'Krótka nazwa', pf: `rez:miejsca.${i}.kr`, wartosc: m.kr, pod: 'Na paskach w kalendarzu.' })}</div>
        <div class="pola2">${P.pole({ etykieta: 'Ulica i numer', pf: `rez:miejsca.${i}.ulica`, wartosc: m.ulica || '' })}${P.pole({ etykieta: 'Kod i miasto', pf: `rez:miejsca.${i}.miasto`, wartosc: m.miasto || '' })}</div>
        ${P.pole({ etykieta: 'Telefon', pf: `rez:miejsca.${i}.telefon`, wartosc: m.telefon || '', typ: 'tel' })}
        <div class="p-sz-sekcja"><h3>Godziny otwarcia</h3><p class="p-podp">Pokazujemy je na stronie i w wizytówce Google. Grafik terapeutów powinien się w nich mieścić.</p>
          ${K.DNI_PRACY.map((dz) => { const o = (m.otwarcie || {})[dz]; return `<div class="przedz"><label class="check" style="width:120px"><input type="checkbox" data-pzm="l-dzien" data-id="${id}" data-dz="${dz}"${o ? ' checked' : ''} /><span>${K.DNI[dz]}</span></label>${o ? `<input type="time" step="900" value="${K.godz2(o[0])}" data-pzm="l-godz" data-id="${id}" data-dz="${dz}" data-k="0" aria-label="Otwarcie, ${K.DNI[dz]}" /><span>–</span><input type="time" step="900" value="${K.godz2(o[1])}" data-pzm="l-godz" data-id="${id}" data-dz="${dz}" data-k="1" aria-label="Zamknięcie, ${K.DNI[dz]}" />` : '<span class="p-podp">zamknięte</span>'}</div>`; }).join('')}
          ${konf.length ? `<div class="p-ostrz">${P.ikona('uwaga')}<span>Poza godzinami otwarcia: ${konf.slice(0, 4).map((x) => `${esc(P.osobaNazwa(x.t).split(' ')[0])} ${DN[x.dz]} ${K.godz(x.r.od)}–${K.godz(x.r.do)}`).join(', ')}${konf.length > 4 ? '…' : ''}. <a href="#/dostepnosc" data-pa="zamknij">Popraw grafik</a></span></div>` : '<div class="p-ostrz p-ostrz--ok">' + P.ikona('ok') + '<span>Grafik wszystkich terapeutów mieści się w godzinach otwarcia.</span></div>'}
        </div>
        <div class="p-sz-sekcja"><h3>Dojazd</h3>
          ${P.pole({ etykieta: 'Jak dojechać', pf: `rez:miejsca.${i}.dojazd`, wartosc: m.dojazd || '', wiersze: 2 })}
          ${P.pole({ etykieta: 'Parking', pf: `rez:miejsca.${i}.parking`, wartosc: m.parking || '' })}
          ${P.pole({ etykieta: 'Dostępność', pf: `rez:miejsca.${i}.dostepnosc`, wartosc: m.dostepnosc || '', pod: 'Np. piętro, winda, wejście bez schodów. Pacjenci po urazach o to pytają.' })}
        </div>
        <div class="p-sz-sekcja"><h3>Kolor</h3><div class="p-filtry">${K.KOLORY.map((c, j) => `<button type="button" class="p-chip p-chip--bez" data-pa="l-kolor" data-id="${id}" data-k="${j}" aria-pressed="${m.kolor === j}" aria-label="Kolor ${j + 1}"><span class="p-kropka" style="background:${c};width:16px;height:16px"></span></button>`).join('')}</div></div>
        <div class="p-sz-sekcja"><h3>Usuń</h3>${uzyte ? '<p class="p-podp">W tym miejscu są wizyty albo godziny w grafiku, więc nie można go usunąć.</p>' : `<button type="button" class="przycisk przycisk--cichy przycisk--ostrzez" data-pa="l-usun" data-id="${id}"${D.miejsca.length < 2 ? ' disabled' : ''}>Usuń miejsce</button>`}</div>
      </div>
      <footer class="sz__st"><button type="button" class="przycisk" data-pa="zamknij">Gotowe</button></footer>`;
  }, { szeroka: true });
  P.akcje['l-edytuj'] = (b) => P.otworzMiejsce(b.dataset.id);
  P.akcje['l-kolor'] = (b) => P.zmienRez('Zmieniono kolor miejsca', (D) => { D.miejsca.find((m) => m.id === b.dataset.id).kolor = Number(b.dataset.k); });
  P.akcje['l-dzien'] = (t) => P.zmienRez(`Godziny otwarcia: ${K.DNI[t.dataset.dz]} ${t.checked ? 'otwarte' : 'zamknięte'}`, (D) => { const m = D.miejsca.find((x) => x.id === t.dataset.id); if (!m.otwarcie) m.otwarcie = {}; if (t.checked) m.otwarcie[t.dataset.dz] = [K.zH('8:00'), K.zH('16:00')]; else delete m.otwarcie[t.dataset.dz]; });
  P.akcje['l-godz'] = (t) => { P.cichoRez((D) => { const m = D.miejsca.find((x) => x.id === t.dataset.id); m.otwarcie[t.dataset.dz][Number(t.dataset.k)] = K.zH(t.value || '0:00'); }); P.odswiez(); };
  P.akcje['l-dodaj'] = () => {
    const id = `l${Date.now()}`;
    P.zmienRez('Dodano miejsce', (D) => { D.miejsca.push({ id, nazwa: 'Nowe miejsce', kr: 'Nowe', kolor: D.miejsca.length % K.KOLORY.length, ulica: '', miasto: '', telefon: '', dojazd: '', parking: '', dostepnosc: '', otwarcie: { 1: [480, 960], 2: [480, 960], 3: [480, 960], 4: [480, 960], 5: [480, 960] } }); D.zespol.forEach((t) => { if (t.lokalizacje) t.lokalizacje.push(id); }); });
    setTimeout(() => P.otworzMiejsce(id), 30);
  };
  P.akcje['l-usun'] = (b) => { P.zamknij(false); P.zmienRez('Usunięto miejsce', (D) => { D.miejsca = D.miejsca.filter((m) => m.id !== b.dataset.id); D.zespol.forEach((t) => { if (t.lokalizacje) t.lokalizacje = t.lokalizacje.filter((x) => x !== b.dataset.id); }); }); };
})();
