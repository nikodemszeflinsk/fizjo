/*
 * Panel — treści strony.
 *
 * Edytujesz szkic, a pacjenci widzą ostatnią opublikowaną wersję. Podgląd po prawej
 * zmienia się przy każdym znaku. Cennik, zespół, adresy i wolne terminy strona bierze
 * z danych rezerwacji, więc nie trzeba ich wpisywać drugi raz.
 */
(() => {
  'use strict';

  const K = window.KAL;
  const P = window.PANEL;
  const esc = P.esc;
  const STYLE = { niebieski: ['Spokojny niebieski', '#1f5fd6'], zielony: ['Naturalny zielony', '#13875a'], cieply: ['Ciepły pomarańcz', '#e8590c'], grafit: ['Elegancki grafit', '#2f353a'] };
  P.kolorStylu = () => (STYLE[(P.C().strona.wyglad || {}).styl] || STYLE.niebieski)[1];
  const PS = { strona: 'glowna', urzadzenie: 'komputer' };

  /* Słowa, których lepiej unikać w informacji o działalności leczniczej. */
  const RYZYKO = [['najlepsz', 'porównanie z innymi'], ['najskuteczniej', 'porównanie z innymi'], ['gwarant', 'gwarancja efektu'], ['100%', 'gwarancja efektu'], ['wyleczy', 'obietnica wyleczenia'], ['wyleczen', 'obietnica wyleczenia'], ['cudown', 'przesadna obietnica'], ['jedyn', 'porównanie z innymi'], ['natychmiast', 'obietnica szybkiego efektu'], ['bez bólu', 'obietnica efektu']];
  function lint(teksty) {
    const t = teksty.join(' ').toLowerCase();
    const znalezione = RYZYKO.filter(([s]) => t.includes(s));
    if (!znalezione.length) return '';
    return `<div class="p-ostrz">${P.ikona('uwaga')}<span><b>Warto zmienić:</b> ${[...new Set(znalezione.map(([s, o]) => `„${s}…” (${o})`))].join(', ')}. Informacja o gabinecie fizjoterapii nie powinna obiecywać efektów ani porównywać z innymi. Opisz usługę i przebieg wizyty.</span></div>`;
  }

  /* ── Podgląd strony ─────────────────────────────────────────────────── */
  function komunikat(S) {
    const k = S.komunikat;
    if (!k || !k.wl || !k.tekst) return '';
    const d = K.dzisIso();
    if ((k.od && d < k.od) || (k.do && d > k.do)) return '';
    return `<div class="ps__kom${k.typ === 'uwaga' ? ' ps__kom--uwaga' : ''}">${esc(k.tekst)}</div>`;
  }
  function naglowekStrony(S) {
    const menu = S.problemy.filter((p) => p.status !== 'szkic').slice(0, 3).map((p) => p.tytul);
    return `<div class="ps__nav"><b>${esc(S.nazwa)}</b><small>${menu.map(esc).join(' · ')}${menu.length ? ' · ' : ''}Cennik · Kontakt</small><em>${esc(S.glowna.cta || 'Umów wizytę')}</em></div>`;
  }
  function stopka(S, D) {
    return `<div class="ps__stopka"><b style="color:#fff">${esc(S.nazwa)}</b>${D.miejsca.map((m) => `<span>${esc(m.ulica || m.nazwa)}${m.miasto ? `, ${esc(m.miasto)}` : ''}</span>`).join('')}${S.kontakt.pokazTelefon ? `<span>tel. ${esc(S.kontakt.telefon)}</span>` : ''}<span>Polityka prywatności · Regulamin rezerwacji</span></div>`;
  }
  function blokSekcji(id, S, D) {
    if (id === 'problemy') { const p = S.problemy.filter((x) => x.status !== 'szkic'); return p.length ? `<div class="ps__blok"><h4>Z czym przychodzą pacjenci</h4><div class="ps__chipy">${p.map((x) => `<span>${esc(x.tytul)}</span>`).join('')}</div></div>` : ''; }
    if (id === 'terminy') { const t = K.terminyPacjenta(D, D.uslugi[0].id, { ile: 4 }); return `<div class="ps__blok"><h4>Najbliższe wolne terminy</h4>${t.length ? `<div class="ps__terminy">${t.map((x) => `<span>${esc(K.wzgledna(x.data))} ${K.godz(x.od)}</span>`).join('')}</div>` : '<p class="ps__pusto">Brak wolnych terminów.</p>'}</div>`; }
    if (id === 'zespol') { const z = D.zespol.filter((t) => t.naStronie !== false); return `<div class="ps__blok"><h4>${esc(S.oNas.tytul)}</h4><p>${esc(S.oNas.tekst)}</p>${P.ent() ? `<div class="ps__zespol">${z.map((t) => `<div><i style="background:${K.kolor(t.kolor)}">${P.inicjaly(t.nazwa)}</i>${esc(P.osobaNazwa(t))}</div>`).join('')}</div>` : ''}</div>`; }
    if (id === 'cennik') return `<div class="ps__blok"><h4>Cennik</h4><div class="ps__cennik">${D.uslugi.slice().sort((a, b) => a.kolej - b.kolej).slice(0, 4).map((u) => `<div><span>${esc(u.nazwa)}</span><b>${u.cena} zł</b></div>`).join('')}</div></div>`;
    if (id === 'opinie') { const o = S.opinie; return `<div class="ps__blok"><h4>Opinie pacjentów</h4>${o.google.pokaz ? `<p><b>★ ${String(o.google.ocena).replace('.', ',')}</b> · ${o.google.liczba} opinii w Google</p>` : ''}${o.wlasne.filter((x) => x.zgoda).slice(0, 1).map((x) => `<p class="ps__opinia">„${esc(x.tekst)}” <small>— ${esc(x.autor)}</small></p>`).join('')}</div>`; }
    if (id === 'faq') return S.faq.length ? `<div class="ps__blok ps__faq"><h4>Najczęstsze pytania</h4>${S.faq.slice(0, 3).map((f) => `<div>${esc(f.p)}</div>`).join('')}</div>` : '';
    if (id === 'kontakt') return `<div class="ps__blok"><h4>Kontakt i dojazd</h4>${D.miejsca.map((m) => `<p><b>${esc(m.nazwa)}</b><br />${esc(m.ulica || '')} ${esc(m.miasto || '')}${m.parking ? `<br /><small>${esc(m.parking)}</small>` : ''}</p>`).join('')}${S.kontakt.pokazMape ? '<div style="height:60px;border-radius:8px;background:repeating-linear-gradient(45deg,#e2e5e1 0 8px,#edefec 8px 16px);display:grid;place-items:center;font-size:0.7rem;color:var(--muted)">mapa</div>' : ''}</div>`;
    return '';
  }
  P.podgladStrony = (opcje = {}) => {
    const C = P.C();
    const D = P.D();
    const S = C.strona;
    const p = opcje.problem;
    let tresc;
    let adres = C.konto.domena;
    if (p) {
      adres += ` › ${p.slug}`;
      const uslugi = D.uslugi.filter((u) => (p.uslugi || []).includes(u.id));
      tresc = `${naglowekStrony(S)}
        <div class="ps__hero"><span class="ps__et">${esc(S.haslo)}</span><div class="ps__h1">${esc(p.tytul)}</div><p class="ps__lead">${esc(p.wstep || '')}</p><span class="ps__cta">${esc(S.glowna.cta || 'Umów wizytę')}</span></div>
        ${(p.objawy || []).length ? `<div class="ps__blok"><h4>Objawy, z którymi przychodzą pacjenci</h4><ul class="ps__lista">${p.objawy.map((o) => `<li>${esc(o)}</li>`).join('')}</ul></div>` : ''}
        ${p.przebieg ? `<div class="ps__blok"><h4>Jak wygląda terapia</h4><p>${esc(p.przebieg)}</p></div>` : ''}
        ${uslugi.length ? `<div class="ps__blok"><h4>Usługi i ceny</h4><div class="ps__cennik">${uslugi.map((u) => `<div><span>${esc(u.nazwa)}</span><b>${u.cena} zł</b></div>`).join('')}</div></div>` : ''}
        ${blokSekcji('terminy', S, D)}
        ${(p.faq || []).length ? `<div class="ps__blok ps__faq"><h4>Pytania</h4>${p.faq.map((f) => `<div>${esc(f.p)}</div>`).join('')}</div>` : ''}`;
    } else {
      tresc = `${naglowekStrony(S)}
        <div class="ps__hero"><span class="ps__et">${esc(S.haslo)}</span><div class="ps__h1">${esc(S.glowna.h1)}</div><p class="ps__lead">${esc(S.glowna.lead)}</p><span class="ps__cta">${esc(S.glowna.cta || 'Umów wizytę')}</span></div>
        ${S.glowna.sekcje.filter((s) => s.wl).map((s) => blokSekcji(s.id, S, D)).join('')}`;
    }
    return `<div class="ps${PS.urzadzenie === 'telefon' ? ' ps--tel' : ''}" style="--ak:${P.kolorStylu()}"><div class="ps__bar"><i></i><i></i><i></i><span>${esc(adres)}</span></div><div class="ps__strona">${komunikat(S)}${tresc}${stopka(S, D)}</div></div>`;
  };
  function snippet(tytul, url, opis) {
    return `<div class="sn" aria-label="Podgląd wyniku w Google"><span class="sn__url">${esc(P.C().strona.nazwa)} <small>https://${esc(url)}</small></span><span class="sn__tytul">${esc(tytul.length > 62 ? tytul.slice(0, 60) + '…' : tytul)}</span><span class="sn__opis">${esc(opis.length > 158 ? opis.slice(0, 156) + '…' : opis)}</span></div>`;
  }

  /* ── Części edytora ─────────────────────────────────────────────────── */
  const pf = (s) => `cms:strona.${s}`;
  function edGlowna(S) {
    return `${P.karta('Pierwszy ekran', `<div class="p-formularz">
        <div class="pola2">${P.pole({ etykieta: 'Nazwa gabinetu', pf: pf('nazwa'), wartosc: S.nazwa })}${P.pole({ etykieta: 'Hasło nad nagłówkiem', pf: pf('haslo'), wartosc: S.haslo, pod: 'Np. „Fizjoterapia w Krakowie”. Dobrze, gdy jest w nim miasto.' })}</div>
        ${P.pole({ etykieta: 'Nagłówek', pf: pf('glowna.h1'), wartosc: S.glowna.h1, licznik: 60, pod: 'Pytanie albo problem pacjenta działa lepiej niż nazwa gabinetu.' })}
        ${P.pole({ etykieta: 'Tekst pod nagłówkiem', pf: pf('glowna.lead'), wartosc: S.glowna.lead, wiersze: 2, licznik: 180 })}
        ${P.pole({ etykieta: 'Napis na przycisku', pf: pf('glowna.cta'), wartosc: S.glowna.cta, licznik: 24 })}
        <div id="lint-glowna">${lint([S.glowna.h1, S.glowna.lead])}</div>
      </div>`, { pod: 'To pacjent widzi w pierwszych pięciu sekundach.' })}
      ${P.karta('Sekcje strony głównej', `<div class="ed__lista">${S.glowna.sekcje.map((s, i) => `<div class="ed__sekcja${s.wl ? '' : ' ed__sekcja--wyl'}"><span>${esc(s.nazwa)}</span>
          <button type="button" class="p-btn p-btn--ikona p-btn--cichy p-btn--maly" data-pa="ps-sekcja" data-i="${i}" data-k="-1" aria-label="Wyżej: ${esc(s.nazwa)}" ${i === 0 ? 'disabled' : ''}>${P.ikona('gora')}</button>
          <button type="button" class="p-btn p-btn--ikona p-btn--cichy p-btn--maly" data-pa="ps-sekcja" data-i="${i}" data-k="1" aria-label="Niżej: ${esc(s.nazwa)}" ${i === S.glowna.sekcje.length - 1 ? 'disabled' : ''}>${P.ikona('dol')}</button>
          ${P.przelacznik({ etykieta: '<span class="visually-hidden">Pokaż sekcję</span>', pf: pf(`glowna.sekcje.${i}.wl`), wartosc: s.wl, atr: 'data-odswiez' })}</div>`).join('')}</div>`, { pod: 'Kolejność i widoczność. Cennik, zespół i kontakt biorą się z danych gabinetu.' })}`;
  }
  function edPodstrony(S) {
    const max = K.LIMITY[P.tryb()].nazwa === 'Enterprise' ? 10 : 5;
    return P.karta('Podstrony problemów', `<div class="p-limit${S.problemy.length >= max ? ' p-limit--pelny' : ''}"><span>Podstrony: <b>${S.problemy.length} z ${max}</b> w pakiecie</span><span class="p-limit__tor"><i style="width:${(S.problemy.length / max) * 100}%"></i></span></div>
      <ul class="p-lista">${S.problemy.map((p) => `<li class="p-wiersz"><a class="p-wiersz__glowny" href="#/strona/podstrona-${p.id}" style="text-decoration:none;color:inherit"><b>${esc(p.tytul)} <span class="p-tag p-tag--${p.status === 'szkic' ? 'zolty' : 'zielony'}">${p.status === 'szkic' ? 'szkic' : 'opublikowana'}</span></b><small>/${esc(p.slug)} · ${(p.objawy || []).length} objawy · ${(p.faq || []).length} pytania</small></a><span class="p-wiersz__akcje"><a class="p-btn p-btn--maly p-btn--cichy" href="#/strona/podstrona-${p.id}">Edytuj</a></span></li>`).join('')}</ul>
      <button type="button" class="p-btn p-btn--cichy" data-pa="ps-nowa" ${S.problemy.length >= max ? 'disabled' : ''}>${P.ikona('plus')}<span>Dodaj podstronę</span></button>
      ${S.problemy.length >= max ? '<p class="p-podp">Limit pakietu osiągnięty. Dodatkowe podstrony wyceniamy osobno.</p>' : ''}`, { pod: 'Każdy problem to osobna strona, która odpowiada na to, co pacjent wpisuje w Google.' });
  }
  function edPodstrona(S, i) {
    const p = S.problemy[i];
    const D = P.D();
    const sciezka = (x) => pf(`problemy.${i}.${x}`);
    return `${P.karta('', `<div class="p-sekcja-g"><a class="p-btn p-btn--maly p-btn--cichy" href="#/strona/podstrony">← Wszystkie podstrony</a><span class="p-filtry">${P.przelacznik({ etykieta: 'Opublikowana', wartosc: p.status !== 'szkic', atr: `data-status-podstrony="${i}"` })}<button type="button" class="p-btn p-btn--maly p-btn--cichy p-btn--ostrzez" data-pa="ps-usun" data-i="${i}">Usuń</button></span></div>`)}
      ${P.karta('Treść', `<div class="p-formularz">
        ${P.pole({ etykieta: 'Tytuł', pf: sciezka('tytul'), wartosc: p.tytul, licznik: 50, pod: 'Tak, jak pacjent nazwałby swój problem: „Ból kręgosłupa”, nie „Terapia kręgosłupa metodą…”.' })}
        <div class="pole"><label for="ps-slug">Adres podstrony</label><div class="p-filtry" style="flex-wrap:nowrap"><span class="p-podp" style="white-space:nowrap">${esc(P.C().konto.domena)}/</span><input id="ps-slug" type="text" value="${esc(p.slug)}" data-pf="${sciezka('slug')}" data-slug-reczny style="flex:1;padding:10px 12px;border:1.5px solid var(--line);border-radius:12px;background:var(--bg)" /></div></div>
        ${P.pole({ etykieta: 'Wstęp', pf: sciezka('wstep'), wartosc: p.wstep || '', wiersze: 3, licznik: 300 })}
        ${P.pole({ etykieta: 'Objawy <em>(po jednym w linii)</em>', pf: sciezka('objawy'), wartosc: (p.objawy || []).join('\n'), wiersze: 4, atr: 'data-typ="lista"' })}
        ${P.pole({ etykieta: 'Jak wygląda terapia', pf: sciezka('przebieg'), wartosc: p.przebieg || '', wiersze: 3, licznik: 400 })}
        <div id="lint-podstrona">${lint([p.tytul, p.wstep || '', p.przebieg || '', ...(p.objawy || [])])}</div>
      </div>`)}
      ${P.karta('Usługi na tej podstronie', `<div class="p-check-lista">${D.uslugi.map((u) => `<label><input type="checkbox" data-pzm="ps-usluga" data-i="${i}" data-u="${u.id}"${(p.uslugi || []).includes(u.id) ? ' checked' : ''} /> ${esc(u.nazwa)}<small style="margin-left:auto;color:var(--muted)">${u.cena} zł</small></label>`).join('')}</div>`, { pod: 'Pacjent zobaczy ich ceny i od razu zarezerwuje właściwą wizytę.' })}
      ${P.karta('Pytania na tej podstronie', `<div class="ed__lista">${(p.faq || []).map((f, j) => `<div class="ed__el"><div class="ed__el-g"><b>Pytanie ${j + 1}</b><button type="button" class="p-btn p-btn--ikona p-btn--cichy p-btn--maly" data-pa="ps-faq-usun" data-i="${i}" data-j="${j}" aria-label="Usuń pytanie">${P.ikona('kosz')}</button></div>${P.pole({ etykieta: 'Pytanie', pf: sciezka(`faq.${j}.p`), wartosc: f.p })}${P.pole({ etykieta: 'Odpowiedź', pf: sciezka(`faq.${j}.o`), wartosc: f.o, wiersze: 2 })}</div>`).join('')}</div><button type="button" class="p-btn p-btn--cichy" data-pa="ps-faq-dodaj" data-i="${i}">${P.ikona('plus')}<span>Dodaj pytanie</span></button>`, { pod: 'Pytania pomagają też w Google: pokazujemy je jako dane strukturalne.' })}
      ${P.karta('Wynik w Google', `<div class="p-formularz">
        ${P.pole({ etykieta: 'Tytuł w Google', pf: sciezka('seoTytul'), wartosc: p.seoTytul || '', licznik: 60 })}
        ${P.pole({ etykieta: 'Opis w Google', pf: sciezka('seoOpis'), wartosc: p.seoOpis || '', wiersze: 2, licznik: 155 })}
        <div id="ps-snippet">${snippet(p.seoTytul || p.tytul, `${P.C().konto.domena}/${p.slug}`, p.seoOpis || p.wstep || '')}</div>
      </div>`, { pod: 'Do 60 znaków tytułu i 155 znaków opisu, żeby Google ich nie ucinał.' })}`;
  }
  function edONas(S) {
    return P.karta(P.ent() ? 'O klinice' : 'O mnie', `<div class="p-formularz">
      ${P.pole({ etykieta: 'Tytuł sekcji', pf: pf('oNas.tytul'), wartosc: S.oNas.tytul })}
      ${P.pole({ etykieta: 'Tekst', pf: pf('oNas.tekst'), wartosc: S.oNas.tekst, wiersze: 5, licznik: 600 })}
      <p class="p-podp">${P.ent() ? 'Profile terapeutów (zdjęcie, opis, specjalizacje) edytujesz w zakładce <a href="#/zespol">Zespół</a>.' : 'Twój opis, specjalizacje i zdjęcie edytujesz w <a href="#/zespol">Moim profilu</a>.'}</p>
      <div id="lint-onas">${lint([S.oNas.tekst])}</div>
    </div>`);
  }
  function edKontakt(S) {
    return P.karta('Kontakt', `<div class="p-formularz">
      <div class="pola2">${P.pole({ etykieta: 'Telefon na stronie', pf: pf('kontakt.telefon'), wartosc: S.kontakt.telefon, typ: 'tel' })}${P.pole({ etykieta: 'E-mail na stronie', pf: pf('kontakt.email'), wartosc: S.kontakt.email, typ: 'email' })}</div>
      ${P.przelacznik({ etykieta: 'Pokazuj telefon i pasek „Zadzwoń” na telefonie', pf: pf('kontakt.pokazTelefon'), wartosc: S.kontakt.pokazTelefon })}
      ${P.przelacznik({ etykieta: 'Pokazuj mapę dojazdu', pf: pf('kontakt.pokazMape'), wartosc: S.kontakt.pokazMape })}
      <p class="p-podp">Adresy, godziny otwarcia, parking i dojazd biorą się z zakładki <a href="#/lokalizacje">${P.ent() ? 'Lokalizacje' : 'Miejsca przyjęć'}</a>.</p>
    </div>`);
  }
  function edFaq(S) {
    return P.karta('Najczęstsze pytania', `<div class="ed__lista">${S.faq.map((f, j) => `<div class="ed__el"><div class="ed__el-g"><b>Pytanie ${j + 1}</b>
        <button type="button" class="p-btn p-btn--ikona p-btn--cichy p-btn--maly" data-pa="ps-gfaq-przesun" data-j="${j}" data-k="-1" aria-label="Wyżej" ${j === 0 ? 'disabled' : ''}>${P.ikona('gora')}</button>
        <button type="button" class="p-btn p-btn--ikona p-btn--cichy p-btn--maly" data-pa="ps-gfaq-przesun" data-j="${j}" data-k="1" aria-label="Niżej" ${j === S.faq.length - 1 ? 'disabled' : ''}>${P.ikona('dol')}</button>
        <button type="button" class="p-btn p-btn--ikona p-btn--cichy p-btn--maly" data-pa="ps-gfaq-usun" data-j="${j}" aria-label="Usuń pytanie">${P.ikona('kosz')}</button></div>
        ${P.pole({ etykieta: 'Pytanie', pf: pf(`faq.${j}.p`), wartosc: f.p })}${P.pole({ etykieta: 'Odpowiedź', pf: pf(`faq.${j}.o`), wartosc: f.o, wiersze: 2 })}</div>`).join('')}</div>
      <button type="button" class="p-btn p-btn--cichy" data-pa="ps-gfaq-dodaj">${P.ikona('plus')}<span>Dodaj pytanie</span></button>`, { pod: 'Odpowiedz na to, o co pacjenci pytają przez telefon: skierowanie, strój, odwoływanie, płatność.' });
  }
  function edOpinie(S) {
    const o = S.opinie;
    return `${P.karta('Opinie z Google', `${P.przelacznik({ etykieta: `Pokazuj ocenę z wizytówki Google (★ ${String(o.google.ocena).replace('.', ',')}, ${o.google.liczba} opinii)`, pf: pf('opinie.google.pokaz'), wartosc: o.google.pokaz, pod: 'Ocena odświeża się sama. Nie piszemy ani nie kupujemy opinii.' })}`)}
      ${P.karta('Opinie pacjentów na stronie', `<div class="ed__lista">${o.wlasne.map((x, j) => `<div class="ed__el"><div class="ed__el-g"><b>Opinia ${j + 1}</b><button type="button" class="p-btn p-btn--ikona p-btn--cichy p-btn--maly" data-pa="ps-op-usun" data-j="${j}" aria-label="Usuń opinię">${P.ikona('kosz')}</button></div>
        ${P.pole({ etykieta: 'Podpis', pf: pf(`opinie.wlasne.${j}.autor`), wartosc: x.autor, pod: 'Imię albo „Pani K.”, bez nazwiska.' })}${P.pole({ etykieta: 'Treść', pf: pf(`opinie.wlasne.${j}.tekst`), wartosc: x.tekst, wiersze: 2 })}
        ${P.przelacznik({ etykieta: 'Mam zgodę pacjenta na publikację', pf: pf(`opinie.wlasne.${j}.zgoda`), wartosc: x.zgoda, pod: 'Bez zgody opinia nie pojawi się na stronie.' })}</div>`).join('')}</div>
        <button type="button" class="p-btn p-btn--cichy" data-pa="ps-op-dodaj">${P.ikona('plus')}<span>Dodaj opinię</span></button>`)}`;
  }
  function edKomunikat(S) {
    const k = S.komunikat;
    return P.karta('Komunikat na górze strony', `<div class="p-formularz">
      ${P.przelacznik({ etykieta: 'Pokazuj komunikat', pf: pf('komunikat.wl'), wartosc: k.wl, pod: 'Np. urlop, zmiana adresu, nowy terapeuta. Znika sam po dacie „do”.' })}
      ${P.pole({ etykieta: 'Treść', pf: pf('komunikat.tekst'), wartosc: k.tekst, wiersze: 2, licznik: 140 })}
      <div class="pola2">${P.pole({ etykieta: 'Od <em>(opcjonalnie)</em>', pf: pf('komunikat.od'), wartosc: k.od, typ: 'date' })}${P.pole({ etykieta: 'Do <em>(opcjonalnie)</em>', pf: pf('komunikat.do'), wartosc: k.do, typ: 'date' })}</div>
      ${P.wybor({ etykieta: 'Wygląd', pf: pf('komunikat.typ'), wartosc: k.typ, opcje: [['info', 'Informacja (kolor strony)'], ['uwaga', 'Ważne (żółty)']] })}
    </div>`);
  }
  function edWyglad(S) {
    const w = S.wyglad;
    return `${P.karta('Kolory', `<div class="p-filtry" role="radiogroup" aria-label="Styl strony">${Object.entries(STYLE).map(([k, [n, c]]) => `<button type="button" class="p-chip" role="radio" aria-checked="${w.styl === k}" aria-pressed="${w.styl === k}" data-pa="ps-styl" data-k="${k}"><i style="background:${c}"> </i>${n}</button>`).join('')}</div>`, { pod: 'Kolor przycisków, nagłówków i wyróżnień. Reszta strony zostaje spokojna i czytelna.' })}
      ${P.karta('Logo', `<div class="p-filtry"><span class="p-tag p-tag--${w.logo ? 'zielony' : 'zolty'}">${w.logo ? 'logo-linia-ruchu.svg' : 'brak logo: pokazujemy nazwę gabinetu'}</span><button type="button" class="p-btn p-btn--maly p-btn--cichy" data-pa="ps-logo">${w.logo ? 'Usuń logo' : 'Wgraj logo (symulacja)'}</button></div>`)}
      ${P.karta('Zdjęcia', `<div class="ed__lista">${w.zdjecia.map((z, j) => `<div class="ed__el"><div class="ed__el-g"><span class="p-osoba__av" style="background:repeating-linear-gradient(45deg,#cfd3cf 0 6px,#e2e5e1 6px 12px);color:var(--fg-2);border-radius:10px">${P.ikona('strona')}</span><b>${esc(z.nazwa)}</b><span class="p-tag">${esc(z.gdzie)}</span><button type="button" class="p-btn p-btn--ikona p-btn--cichy p-btn--maly" data-pa="ps-zd-usun" data-j="${j}" aria-label="Usuń zdjęcie">${P.ikona('kosz')}</button></div>
          ${P.pole({ etykieta: 'Opis zdjęcia (tekst alternatywny)', pf: pf(`wyglad.zdjecia.${j}.alt`), wartosc: z.alt, pod: z.alt ? 'Opis pomaga osobom niewidomym i Google.' : '<b style="color:var(--warn)">Brak opisu.</b> Napisz, co jest na zdjęciu, np. „Gabinet z kozetką przy oknie”.' })}</div>`).join('')}</div>
        <button type="button" class="p-btn p-btn--cichy" data-pa="ps-zd-dodaj">${P.ikona('plus')}<span>Dodaj zdjęcie (symulacja)</span></button>`, { pod: 'Zdjęcia zmniejszamy automatycznie, żeby strona ładowała się szybko na telefonie.' })}`;
  }
  function edSeo(S) {
    const C = P.C();
    return `${P.karta('Strona główna w Google', `<div class="p-formularz">
        ${P.pole({ etykieta: 'Tytuł', pf: pf('seo.tytul'), wartosc: S.seo.tytul, licznik: 60 })}
        ${P.pole({ etykieta: 'Opis', pf: pf('seo.opis'), wartosc: S.seo.opis, wiersze: 2, licznik: 155 })}
        <div id="ps-snippet">${snippet(S.seo.tytul, C.konto.domena, S.seo.opis)}</div>
        ${P.przelacznik({ etykieta: 'Strona jest widoczna w wyszukiwarkach', pf: pf('seo.indeksowanie'), wartosc: S.seo.indeksowanie, pod: 'Wyłącz tylko na czas przebudowy strony.' })}
      </div>`)}
      ${P.karta('Wizytówka Google', `<div class="p-filtry"><span class="p-tag p-tag--${C.konto.integracje.googleWizytowka ? 'zielony' : 'zolty'}">${C.konto.integracje.googleWizytowka ? 'połączona' : 'niepołączona'}</span><span class="p-podp">Godziny otwarcia i adresy wysyłamy do wizytówki z zakładki ${P.ent() ? 'Lokalizacje' : 'Miejsca przyjęć'}. Link do rezerwacji prowadzi na Twoją stronę.</span></div>`)}
      ${P.karta('Co widzi Google', `<ul class="p-lista">${[['Mapa strony (sitemap)', `${S.problemy.filter((p) => p.status !== 'szkic').length + 3} adresy`, true], ['Dane strukturalne gabinetu', 'nazwa, adres, godziny, telefon', true], ['Dane strukturalne pytań (FAQ)', `${S.faq.length + S.problemy.reduce((s, p) => s + (p.faq || []).length, 0)} pytań`, true], ['Podstrony w szkicu', `${S.problemy.filter((p) => p.status === 'szkic').length} niewidoczne w Google`, !S.problemy.some((p) => p.status === 'szkic')]].map(([a, b, ok]) => `<li class="p-wiersz"><span class="p-tag p-tag--${ok ? 'zielony' : 'zolty'}">${ok ? 'w porządku' : 'uwaga'}</span><div class="p-wiersz__glowny" style="cursor:default"><b>${a}</b><small>${b}</small></div></li>`).join('')}</ul>`)}`;
  }
  function edHistoria() {
    const C = P.C();
    const n = P.zmianyStrony();
    return P.karta('Historia publikacji', `${n ? `<div class="p-ostrz">${P.ikona('uwaga')}<span>Masz ${n} ${n === 1 ? 'zmianę' : 'zmian'} od ostatniej publikacji. <button type="button" class="p-btn p-btn--tekst" data-pa="ps-odrzuc">Odrzuć zmiany i wróć do opublikowanej wersji</button></span></div>` : ''}
      <ul class="p-lista">${C.historia.map((h) => `<li class="p-wiersz"><div class="p-wiersz__glowny" style="cursor:default"><b>${esc(h.opis)}</b><small>${new Date(h.kiedy).toLocaleString('pl-PL', { dateStyle: 'long', timeStyle: 'short' })} · ${P.kiedy(h.kiedy)}</small></div></li>`).join('')}</ul>`);
  }

  /* ── Widok ─────────────────────────────────────────────────────────── */
  P.widoki.strona = {
    tytul: 'Treści strony',
    podtytul: 'Edytujesz szkic. Pacjenci widzą stronę dopiero po publikacji.',
    render(arg) {
      if (arg) PS.strona = arg;
      const C = P.C();
      const S = C.strona;
      let i = -1;
      if (PS.strona.startsWith('podstrona-')) { i = S.problemy.findIndex((p) => `podstrona-${p.id}` === PS.strona); if (i < 0) PS.strona = 'podstrony'; }
      const n = P.zmianyStrony();
      const odz = (klucz) => { const a = P.czytaj(C.strona, klucz); const b = P.czytaj(C.opublikowana, klucz); return JSON.stringify(a) !== JSON.stringify(b) ? '<small>zmiany</small>' : ''; };
      const nav = `<nav class="ed__nawig" aria-label="Części strony">
        <p>Strona</p>
        <a href="#/strona/glowna" ${PS.strona === 'glowna' ? 'aria-current="page"' : ''}>Strona główna ${odz('glowna') || (C.strona.nazwa !== C.opublikowana.nazwa || C.strona.haslo !== C.opublikowana.haslo ? '<small>zmiany</small>' : '')}</a>
        <a href="#/strona/podstrony" ${PS.strona === 'podstrony' || i >= 0 ? 'aria-current="page"' : ''}>Podstrony problemów ${odz('problemy')}</a>
        <a href="#/strona/onas" ${PS.strona === 'onas' ? 'aria-current="page"' : ''}>${P.ent() ? 'O klinice' : 'O mnie'} ${odz('oNas')}</a>
        <a href="#/strona/kontakt" ${PS.strona === 'kontakt' ? 'aria-current="page"' : ''}>Kontakt ${odz('kontakt')}</a>
        <a href="#/strona/faq" ${PS.strona === 'faq' ? 'aria-current="page"' : ''}>Pytania (FAQ) ${odz('faq')}</a>
        <a href="#/strona/opinie" ${PS.strona === 'opinie' ? 'aria-current="page"' : ''}>Opinie ${odz('opinie')}</a>
        <a href="#/strona/komunikat" ${PS.strona === 'komunikat' ? 'aria-current="page"' : ''}>Komunikat ${odz('komunikat')}</a>
        <p>Wygląd i Google</p>
        <a href="#/strona/wyglad" ${PS.strona === 'wyglad' ? 'aria-current="page"' : ''}>Kolory i zdjęcia ${odz('wyglad')}</a>
        <a href="#/strona/seo" ${PS.strona === 'seo' ? 'aria-current="page"' : ''}>SEO i Google ${odz('seo')}</a>
        <a href="#/strona/historia" ${PS.strona === 'historia' ? 'aria-current="page"' : ''}>Historia publikacji</a>
      </nav>`;
      const czesci = { glowna: () => edGlowna(S), podstrony: () => edPodstrony(S), onas: () => edONas(S), kontakt: () => edKontakt(S), faq: () => edFaq(S), opinie: () => edOpinie(S), komunikat: () => edKomunikat(S), wyglad: () => edWyglad(S), seo: () => edSeo(S), historia: () => edHistoria() };
      const forma = i >= 0 ? edPodstrona(S, i) : (czesci[PS.strona] || czesci.glowna)();
      const status = n
        ? `<div class="ed__status ed__status--zmiany"><p><b>${n} ${n === 1 ? 'zmiana czeka' : n < 5 ? 'zmiany czekają' : 'zmian czeka'} na publikację.</b> Pacjenci widzą jeszcze poprzednią wersję.</p><button type="button" class="p-btn p-btn--maly p-btn--cichy" data-pa="ps-odrzuc">Odrzuć zmiany</button><button type="button" class="p-btn p-btn--maly p-btn--akcent" data-pa="ps-publikuj">Opublikuj</button></div>`
        : `<div class="ed__status"><p>Strona jest opublikowana · ${P.kiedy(C.historia[0].kiedy)}. Wszystkie zmiany są widoczne dla pacjentów.</p><a class="p-btn p-btn--maly p-btn--cichy" href="demo.html" target="_blank" rel="noopener">Zobacz stronę</a></div>`;
      return `<div class="p-stos">${status}<div class="ed">${nav}<div class="ed__forma">${forma}</div>
        <aside class="ed__podglad" aria-label="Podgląd strony"><div class="ed__podglad-g"><span>Podgląd szkicu</span><span class="p-filtry" role="group" aria-label="Urządzenie"><button type="button" class="p-chip p-chip--bez" data-pa="ps-urz" data-k="komputer" aria-pressed="${PS.urzadzenie === 'komputer'}" style="padding:4px 10px;font-size:0.8rem">Komputer</button><button type="button" class="p-chip p-chip--bez" data-pa="ps-urz" data-k="telefon" aria-pressed="${PS.urzadzenie === 'telefon'}" style="padding:4px 10px;font-size:0.8rem">Telefon</button></span></div><div id="ps-podglad">${P.podgladStrony(i >= 0 ? { problem: S.problemy[i] } : {})}</div></aside></div></div>`;
    },
    naZmiane(sciezka, t) {
      const C = P.C();
      const S = C.strona;
      const m = sciezka.match(/^strona\.problemy\.(\d+)\.(\w+)/);
      if (m && m[2] === 'tytul') {
        const p = S.problemy[Number(m[1])];
        const slugEl = document.getElementById('ps-slug');
        if (!p.slugReczny) { p.slug = K.slug(p.tytul); P.zapiszCms(); if (slugEl) slugEl.value = p.slug; }
      }
      if (m && m[2] === 'slug') { S.problemy[Number(m[1])].slugReczny = true; S.problemy[Number(m[1])].slug = K.slug(t.value); P.zapiszCms(); }
      const pod = document.getElementById('ps-podglad');
      const i = PS.strona.startsWith('podstrona-') ? S.problemy.findIndex((p) => `podstrona-${p.id}` === PS.strona) : -1;
      if (pod) pod.innerHTML = P.podgladStrony(i >= 0 ? { problem: S.problemy[i] } : {});
      const sn = document.getElementById('ps-snippet');
      if (sn) {
        if (i >= 0) { const p = S.problemy[i]; sn.innerHTML = snippet(p.seoTytul || p.tytul, `${C.konto.domena}/${p.slug}`, p.seoOpis || p.wstep || ''); }
        else sn.innerHTML = snippet(S.seo.tytul, C.konto.domena, S.seo.opis);
      }
      const l1 = document.getElementById('lint-glowna'); if (l1) l1.innerHTML = lint([S.glowna.h1, S.glowna.lead]);
      const l2 = document.getElementById('lint-podstrona'); if (l2 && i >= 0) { const p = S.problemy[i]; l2.innerHTML = lint([p.tytul, p.wstep || '', p.przebieg || '', ...(p.objawy || [])]); }
      const l3 = document.getElementById('lint-onas'); if (l3) l3.innerHTML = lint([S.oNas.tekst]);
      /* Licznik zmian w pasku i w menu odświeżamy bez przerysowania formularza. */
      const st = document.querySelector('.ed__status');
      const n = P.zmianyStrony();
      if (st && (n > 0) !== st.classList.contains('ed__status--zmiany')) P.odswiez();
      else if (st && n) st.querySelector('p').innerHTML = `<b>${n} ${n === 1 ? 'zmiana czeka' : n < 5 ? 'zmiany czekają' : 'zmian czeka'} na publikację.</b> Pacjenci widzą jeszcze poprzednią wersję.`;
    },
  };

  /* Status podstrony: przełącznik daje true/false, a w danych trzymamy słowo. */
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.matches && t.matches('[data-status-podstrony]')) {
      P.cichoCms((C) => { C.strona.problemy[Number(t.dataset.statusPodstrony)].status = t.checked ? 'opublikowana' : 'szkic'; });
      P.odswiez();
    }
  });

  /* ── Akcje ─────────────────────────────────────────────────────────── */
  const NAZWY_CZESCI = { nazwa: 'nazwa', haslo: 'hasło', glowna: 'strona główna', problemy: 'podstrony', oNas: 'o nas', faq: 'pytania', opinie: 'opinie', komunikat: 'komunikat', wyglad: 'wygląd', seo: 'SEO', kontakt: 'kontakt' };
  P.akcje['ps-publikuj'] = () => {
    const C = P.C();
    const zm = Object.keys(NAZWY_CZESCI).filter((k) => JSON.stringify(C.strona[k]) !== JSON.stringify(C.opublikowana[k])).map((k) => NAZWY_CZESCI[k]);
    P.zmienCms('Opublikowano stronę. Pacjenci widzą nową wersję.', (C_) => {
      C_.opublikowana = JSON.parse(JSON.stringify(C_.strona));
      C_.historia.unshift({ kiedy: new Date().toISOString(), opis: `Zmieniono: ${[...new Set(zm)].join(', ') || 'drobne poprawki'}` });
      C_.historia = C_.historia.slice(0, 20);
    });
  };
  P.akcje['ps-odrzuc'] = () => P.zmienCms('Odrzucono zmiany. Szkic jest taki jak opublikowana strona.', (C) => { C.strona = JSON.parse(JSON.stringify(C.opublikowana)); });
  P.akcje['ps-urz'] = (b) => { PS.urzadzenie = b.dataset.k; P.odswiez(); };
  P.akcje['ps-sekcja'] = (b) => P.zmienCms('Zmieniono kolejność sekcji', (C) => { const s = C.strona.glowna.sekcje; const i = Number(b.dataset.i); const j = i + Number(b.dataset.k); [s[i], s[j]] = [s[j], s[i]]; });
  P.akcje['ps-nowa'] = () => {
    const id = `pr${Date.now()}`;
    P.zmienCms('Dodano podstronę (szkic)', (C) => { C.strona.problemy.push({ id, tytul: 'Nowy problem', slug: 'nowy-problem', wstep: '', objawy: [], przebieg: '', uslugi: [P.D().uslugi[0].id], faq: [], seoTytul: '', seoOpis: '', status: 'szkic' }); });
    P.idz(`strona/podstrona-${id}`);
  };
  P.akcje['ps-usun'] = (b) => { const t = P.C().strona.problemy[Number(b.dataset.i)].tytul; PS.strona = 'podstrony'; P.zmienCms(`Usunięto podstronę: ${t}`, (C) => { C.strona.problemy.splice(Number(b.dataset.i), 1); }); history.replaceState(null, '', '#/strona/podstrony'); };
  P.akcje['ps-usluga'] = (t) => { P.cichoCms((C) => { const p = C.strona.problemy[Number(t.dataset.i)]; p.uslugi = t.checked ? [...new Set([...(p.uslugi || []), t.dataset.u])] : (p.uslugi || []).filter((x) => x !== t.dataset.u); }); P.widoki.strona.naZmiane('strona.problemy', t); P.odswiez(); };
  P.akcje['ps-faq-dodaj'] = (b) => P.zmienCms('Dodano pytanie', (C) => { const p = C.strona.problemy[Number(b.dataset.i)]; (p.faq || (p.faq = [])).push({ p: '', o: '' }); });
  P.akcje['ps-faq-usun'] = (b) => P.zmienCms('Usunięto pytanie', (C) => { C.strona.problemy[Number(b.dataset.i)].faq.splice(Number(b.dataset.j), 1); });
  P.akcje['ps-gfaq-dodaj'] = () => P.zmienCms('Dodano pytanie', (C) => { C.strona.faq.push({ p: '', o: '' }); });
  P.akcje['ps-gfaq-usun'] = (b) => P.zmienCms('Usunięto pytanie', (C) => { C.strona.faq.splice(Number(b.dataset.j), 1); });
  P.akcje['ps-gfaq-przesun'] = (b) => P.zmienCms('Zmieniono kolejność pytań', (C) => { const f = C.strona.faq; const i = Number(b.dataset.j); const j = i + Number(b.dataset.k); [f[i], f[j]] = [f[j], f[i]]; });
  P.akcje['ps-op-dodaj'] = () => P.zmienCms('Dodano opinię', (C) => { C.strona.opinie.wlasne.push({ autor: '', tekst: '', zgoda: false }); });
  P.akcje['ps-op-usun'] = (b) => P.zmienCms('Usunięto opinię', (C) => { C.strona.opinie.wlasne.splice(Number(b.dataset.j), 1); });
  P.akcje['ps-styl'] = (b) => P.zmienCms(`Kolor strony: ${STYLE[b.dataset.k][0]}`, (C) => { C.strona.wyglad.styl = b.dataset.k; });
  P.akcje['ps-logo'] = () => P.zmienCms(P.C().strona.wyglad.logo ? 'Usunięto logo' : 'Wgrano logo (symulacja)', (C) => { C.strona.wyglad.logo = !C.strona.wyglad.logo; });
  P.akcje['ps-zd-dodaj'] = () => P.zmienCms('Dodano zdjęcie (symulacja)', (C) => { C.strona.wyglad.zdjecia.push({ id: `z${Date.now()}`, nazwa: `zdjecie-${C.strona.wyglad.zdjecia.length + 1}.jpg`, alt: '', gdzie: 'Strona główna' }); });
  P.akcje['ps-zd-usun'] = (b) => P.zmienCms('Usunięto zdjęcie', (C) => { C.strona.wyglad.zdjecia.splice(Number(b.dataset.j), 1); });
})();
