/*
 * Droga jednego pacjenta — od wpisania objawu w wyszukiwarkę do opinii,
 * która przyprowadzi następnego.
 *
 * Każdy krok pokazuje realny fragment systemu, raz oczami pacjenta, raz oczami
 * gabinetu. Miniatury są rysowane w HTML, nie wklejone jako zrzuty — dzięki temu
 * nie zdezaktualizują się w tygodniu, w którym zmienimy panel.
 */
(() => {
  'use strict';

  const box = document.getElementById('droga');
  if (!box) return;

  const wolniej = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const KROKI = [
    {
      kiedy: 'Wtorek, 21:47',
      kto: 'pacjent',
      tytul: 'Boli go krzyż. Sięga po telefon.',
      opis:
        'Nie szuka fizjoterapeuty. Szuka tego, co mu dolega. Dlatego każdy problem ma u Ciebie własną stronę, napisaną jego językiem — i to ona pojawia się w wynikach.',
      scena: `
        <div class="mini mini--google">
          <div class="mini__pasek"><span class="mini__lupa"></span>ból krzyża fizjoterapeuta [Twoje Miasto]</div>
          <div class="mini__wynik mini__wynik--nasz">
            <p class="mini__url">linia-ruchu.pl › fizjoterapia-kregoslupa</p>
            <p class="mini__tytul">Fizjoterapia kręgosłupa — [Twoje Miasto]</p>
            <p class="mini__opis">Ból pleców, rwa kulszowa, dyskopatia. Pierwsza wizyta z badaniem ruchu i planem na kolejne tygodnie.</p>
            <p class="mini__znacznik">Twoja strona</p>
          </div>
          <div class="mini__wynik mini__wynik--obcy">
            <p class="mini__url">znanylekarz.pl › fizjoterapeuci</p>
            <p class="mini__tytul">Fizjoterapeuci — 148 specjalistów</p>
            <p class="mini__opis">Porównaj opinie i ceny…</p>
          </div>
        </div>`,
    },
    {
      kiedy: 'Wtorek, 21:48',
      kto: 'pacjent',
      tytul: 'Trafia do Ciebie, nie na listę stu nazwisk.',
      opis:
        'Na stronie problemu widzi objawy, które zna, przebieg terapii i najbliższy wolny termin. Nie musi niczego porównywać — jest już na miejscu.',
      scena: `
        <div class="mini mini--strona">
          <p class="mini__etykieta">Terapia kręgosłupa w [Twoje Miasto]</p>
          <p class="mini__h1">Boli kręgosłup?<span>Zacznijmy od znalezienia przyczyny.</span></p>
          <ul class="mini__objawy">
            <li>Ból promieniuje do nogi</li>
            <li>Rano jest sztywno</li>
            <li>Wraca falami od miesięcy</li>
          </ul>
          <p class="mini__termin">Najbliższy wolny termin: <strong>jutro, 8:00</strong></p>
          <span class="mini__btn">Umów wizytę</span>
        </div>`,
    },
    {
      kiedy: 'Wtorek, 21:49',
      kto: 'oboje',
      tytul: 'Umawia się w minutę. Wizyta od razu jest u Ciebie w grafiku.',
      opis:
        'Trzy kroki, bez telefonu i bez czekania do rana. Ta sama wizyta w tej samej sekundzie pojawia się w panelu — nie ma przepisywania z e-maila do kalendarza.',
      scena: `
        <div class="mini mini--para">
          <div class="mini__polowa">
            <p class="mini__nad">Ekran pacjenta</p>
            <div class="mini__sloty">
              <span>8:00</span><span class="is-on">9:30</span><span>11:00</span><span>13:00</span>
            </div>
            <p class="mini__potwierdzenie">Do zobaczenia jutro.<em>Numer rezerwacji: 4821</em></p>
          </div>
          <div class="mini__polowa mini__polowa--ciemna">
            <p class="mini__nad">Twój panel</p>
            <div class="mini__wizyta mini__wizyta--nowa">
              <span class="mini__czas">9:30</span>
              <span><b>Katarzyna Woźniak</b><em>Terapia manualna · 50 min</em></span>
            </div>
            <p class="mini__ile">Wizyty jutro: <strong>7</strong></p>
          </div>
        </div>`,
    },
    {
      kiedy: 'Środa, 18:00',
      kto: 'system',
      tytul: 'Dzień przed wizytą SMS wychodzi sam.',
      opis:
        'Nie musisz o tym pamiętać ani nikogo o to prosić. W SMS-ie jest link do karty pacjenta — jeśli coś mu wypadnie, przełoży termin sam, a Ty zobaczysz to w grafiku.',
      scena: `
        <div class="mini mini--sms">
          <div class="mini__dymek">
            Katarzyno, przypominamy o wizycie jutro o 9:30. Linia Ruchu
            <span class="mini__link">linia-ruchu.pl/k/4821</span>
          </div>
          <p class="mini__pod">Wysłane automatycznie · wliczone w abonament</p>
        </div>`,
    },
    {
      kiedy: 'Czwartek, po wizycie',
      kto: 'pacjent',
      tytul: 'Dostaje ćwiczenia, których nie zgubi.',
      opis:
        'Zamiast kartki, która ginie w kieszeni — karta pod linkiem, bez logowania. Odhacza, co zrobił, i raz dziennie odpowiada na jedno pytanie o ból.',
      scena: `
        <div class="mini mini--karta">
          <p class="mini__nad">Karta pacjenta</p>
          <p class="mini__cel">Cel: przespać noc bez bólu</p>
          <ul class="mini__cw">
            <li class="is-done"><span></span>Koci grzbiet<em>10 powtórzeń</em></li>
            <li class="is-done"><span></span>Mostek biodrowy<em>3 serie po 10</em></li>
            <li><span></span>Ptak-pies<em>8 na stronę</em></li>
          </ul>
          <p class="mini__pytanie">Jak dziś z bólem?</p>
          <div class="mini__skala"><span>0</span><span>2</span><span class="is-on">4</span><span>6</span><span>8</span><span>10</span></div>
        </div>`,
    },
    {
      kiedy: 'Czwartek za tydzień',
      kto: 'gabinet',
      tytul: 'Nie umówił kolejnej wizyty. Dowiadujesz się rano, nie za miesiąc.',
      opis:
        'Przy nazwisku stoi powód: dziewięć dni bez wizyty, a plan był co siedem, i ćwiczenia odhaczone w połowie. Obok telefon i najbliższy wolny termin — jeden klik i jest umówiony.',
      scena: `
        <div class="mini mini--panel">
          <p class="mini__nad">Panel · Dziś</p>
          <p class="mini__naglowek">Nie umówili kolejnej wizyty <span class="mini__badge">2 pilne</span></p>
          <div class="mini__osoba">
            <span class="mini__awatar">KW</span>
            <div>
              <b>Katarzyna Woźniak</b>
              <em>Rwa kulszowa · 3 z 8 wizyt</em>
              <p class="mini__powody">
                <span class="mini__powod mini__powod--termin">brak kolejnego terminu</span>
                <span class="mini__powod mini__powod--termin">9 dni bez wizyty (plan: co 7)</span>
                <span class="mini__powod mini__powod--cw">ćwiczenia 48% wg odhaczeń</span>
              </p>
            </div>
            <span class="mini__akcja">Umów termin</span>
          </div>
        </div>`,
    },
    {
      kiedy: 'Po ośmiu wizytach',
      kto: 'oboje',
      tytul: 'Terapia dokończona. Opinia wraca do Google.',
      opis:
        'Zamykasz cykl i panel podsuwa gotową prośbę o opinię — z liczbami, które właśnie osiągnęliście. Ta opinia podnosi Twoją wizytówkę i przyprowadza następnego pacjenta. Koło się domyka.',
      scena: `
        <div class="mini mini--wynik">
          <p class="mini__nad">Zamknięcie terapii</p>
          <div class="mini__liczby">
            <div><span>Wizyty</span><b>8 z 8</b></div>
            <div><span>Ból</span><b>7 → 2</b></div>
            <div><span>Ćwiczenia</span><b>71%</b></div>
          </div>
          <div class="mini__gwiazdki" aria-hidden="true">★★★★★</div>
          <p class="mini__opinia">„Po trzech wizytach pierwszy raz od miesięcy przespałam noc bez bólu. Dostałam ćwiczenia, które faktycznie robię, bo zajmują 10 minut.”</p>
          <p class="mini__pod">Opinia w Mapach Google · wraca do kroku pierwszego</p>
        </div>`,
    },
  ];

  const ETYKIETY = {
    pacjent: 'Widzi pacjent',
    gabinet: 'Widzisz Ty',
    oboje: 'Obie strony naraz',
    system: 'Robi system',
  };

  let aktywny = 0;
  let sam = true; // dopóki nikt nie kliknął, kroki przesuwają się same
  let zegar;

  function render() {
    const lista = box.querySelector('#droga-kroki');
    box.querySelectorAll('.droga__krok').forEach((el, i) => {
      el.setAttribute('aria-selected', String(i === aktywny));
      el.classList.toggle('is-on', i === aktywny);
      /* Na wąskim ekranie kroki leżą poziomo — aktywny musi wjechać w kadr. */
      if (i === aktywny && lista.scrollWidth > lista.clientWidth) {
        lista.scrollTo({ left: el.offsetLeft - 16, behavior: wolniej ? 'auto' : 'smooth' });
      }
    });
    const k = KROKI[aktywny];
    const scena = box.querySelector('#droga-scena');
    scena.innerHTML = `
      <p class="droga__kto droga__kto--${k.kto}">${ETYKIETY[k.kto]}</p>
      <h3 class="droga__tytul">${k.tytul}</h3>
      <p class="droga__opis">${k.opis}</p>
      <div class="droga__mini">${k.scena}</div>`;
    scena.classList.remove('is-wchodzi');
    void scena.offsetWidth; // wymuszenie powtórki animacji
    if (!wolniej) scena.classList.add('is-wchodzi');
  }

  function idzDo(i, reczne = false) {
    aktywny = (i + KROKI.length) % KROKI.length;
    if (reczne) {
      sam = false;
      clearInterval(zegar);
    }
    render();
  }

  box.querySelector('#droga-kroki').innerHTML = KROKI.map(
    (k, i) => `<li>
      <button class="droga__krok" type="button" role="tab" aria-selected="${i === 0}" data-krok="${i}">
        <span class="droga__kiedy">${k.kiedy}</span>
        <span class="droga__label">${k.tytul.replace(/\.$/, '')}</span>
      </button>
    </li>`
  ).join('');

  box.addEventListener('click', (e) => {
    const krok = e.target.closest('[data-krok]');
    if (krok) return idzDo(Number(krok.dataset.krok), true);
    if (e.target.closest('[data-droga-dalej]')) return idzDo(aktywny + 1, true);
    if (e.target.closest('[data-droga-wstecz]')) return idzDo(aktywny - 1, true);
  });

  box.addEventListener('keydown', (e) => {
    if (!e.target.closest('.droga__krok')) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      idzDo(aktywny + 1, true);
      box.querySelectorAll('.droga__krok')[aktywny].focus();
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      idzDo(aktywny - 1, true);
      box.querySelectorAll('.droga__krok')[aktywny].focus();
    }
  });

  render();

  /* Sama się przesuwa dopiero, gdy sekcja jest na ekranie — i tylko do
     pierwszego kliknięcia. Przy włączonym ograniczeniu ruchu nie rusza wcale. */
  if (!wolniej && 'IntersectionObserver' in window) {
    new IntersectionObserver(
      (wpisy) => {
        wpisy.forEach((w) => {
          if (w.isIntersecting && sam && !zegar) {
            zegar = setInterval(() => (sam ? idzDo(aktywny + 1) : clearInterval(zegar)), 7000);
          }
          if (!w.isIntersecting && zegar) {
            clearInterval(zegar);
            zegar = null;
          }
        });
      },
      { threshold: 0.35 }
    ).observe(box);
  }
})();
