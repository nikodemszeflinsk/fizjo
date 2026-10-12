/*
 * Droga jednego pacjenta — od wpisania objawu w wyszukiwarkę do wizyty w kalendarzu gabinetu.
 *
 * Każdy krok pokazuje realny fragment systemu, raz oczami pacjenta, raz oczami
 * gabinetu. Miniatury są rysowane w HTML, nie wklejone jako zrzuty — dzięki temu
 * nie zdezaktualizują się w tygodniu, w którym zmienimy kalendarz.
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
      tytul: 'Umawia się w minutę. Wizyta od razu jest u Ciebie w kalendarzu.',
      opis:
        'Trzy kroki, bez telefonu i bez czekania do rana. Ta sama wizyta w tej samej sekundzie pojawia się w Twoim kalendarzu, a godzina znika z wolnych terminów na stronie. Nie ma przepisywania z e-maila do kalendarza.',
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
            <p class="mini__nad">Twój kalendarz</p>
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
      tytul: 'Dzień przed wizytą wychodzi przypomnienie.',
      opis:
        'E-mailem, bez Twojego udziału — nie musisz o tym pamiętać ani nikogo o to prosić, a pacjent rzadziej zapomina i rzadziej odwołuje w ostatniej chwili. Jeśli wybierzesz dodatek, to samo wyjdzie też SMS-em.',
      scena: `
        <div class="mini mini--sms">
          <div class="mini__dymek">
            Katarzyno, przypominamy o wizycie jutro o 9:30. Linia Ruchu, ul. Przykładowa 1.
            <span class="mini__link">Potwierdzenie i dojazd w e-mailu</span>
          </div>
          <p class="mini__pod">Wysłane automatycznie · e-mailem, opcjonalnie SMS-em</p>
        </div>`,
    },
    {
      kiedy: 'Czwartek, 7:50',
      kto: 'gabinet',
      tytul: 'Rano otwierasz kalendarz i wiesz, kto dziś przychodzi.',
      opis:
        'Rezerwacje ze strony i te wpisane po telefonie są w jednym miejscu, oznaczone osobno. Przy każdej widzisz usługę i wiadomość od pacjenta, a wolne terminy są tam, gdzie je zostawiłeś.',
      scena: `
        <div class="mini mini--panel">
          <p class="mini__nad">Kalendarz · czwartek</p>
          <p class="mini__naglowek">Dziś 7 wizyt, 3 wolne godziny <span class="mini__badge">ze strony: 6</span></p>
          <div class="mini__osoba">
            <span class="mini__awatar">KW</span>
            <div>
              <b>Katarzyna Woźniak</b>
              <em>Terapia manualna · 9:30</em>
              <p class="mini__powody">
                <span class="mini__powod mini__powod--termin">rezerwacja ze strony</span>
                <span class="mini__powod mini__powod--cw">„Pierwsza wizyta u Was.”</span>
              </p>
            </div>
            <span class="mini__akcja">Otwórz</span>
          </div>
        </div>`,
    },
    {
      kiedy: 'W każdej chwili',
      kto: 'gabinet',
      tytul: 'Wyjeżdżasz? Jedna blokada i termin znika ze strony.',
      opis:
        'Urlop, szkolenie, zwolnienie. Dodajesz blokadę na wybrane dni i pacjent od razu przestaje widzieć te godziny. Działa też w drugą stronę: jedno kliknięcie otwiera dodatkowy termin w sobotę, bez zmiany stałych godzin przyjęć.',
      scena: `
        <div class="mini mini--panel">
          <p class="mini__nad">Kalendarz · blokada</p>
          <p class="mini__naglowek">Urlop 20–24 października <span class="mini__badge">terminy ukryte</span></p>
          <div class="mini__osoba">
            <span class="mini__awatar">UR</span>
            <div>
              <b>Strona dla pacjentów</b>
              <em>Najbliższy wolny termin: poniedziałek 27.10, 9:00</em>
              <p class="mini__powody">
                <span class="mini__powod mini__powod--termin">20–24.10 niedostępne</span>
              </p>
            </div>
            <span class="mini__akcja">Usuń blokadę</span>
          </div>
        </div>`,
    },
  ];

  const ETYKIETY = {
    pacjent: 'Widzi pacjent',
    gabinet: 'Widzisz Ty',
    oboje: 'Obie strony naraz',
    system: 'Robi system',
  };

  const CO_ILE = 7000; // ile jeden ekran zostaje na wierzchu
  let aktywny = 0;
  let sam = true; // dopóki nikt nie kliknął, kroki przesuwają się same
  let zegar = null;
  let wstrzymane = false; // kursor albo fokus stoi na sekcji
  let widoczne = false; // sekcja jest w kadrze

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

    const licznik = box.querySelector('#droga-licznik');
    if (licznik) licznik.textContent = `Ekran ${aktywny + 1} z ${KROKI.length}`;
    zaplanuj();
  }

  /**
   * Pokaz przesuwa się sam, ale tylko dopóki nikt go nie dotknął i dopóki
   * kursor nie stoi na sekcji — inaczej slajd uciekałby w połowie czytania.
   * Pasek nad przyciskami pokazuje, ile zostało do przeskoku.
   */
  function zaplanuj() {
    clearTimeout(zegar);
    zegar = null;
    const pasek = box.querySelector('#droga-pasek');
    if (pasek) {
      pasek.style.transition = 'none';
      pasek.style.width = '0%';
    }
    if (!sam || wstrzymane || !widoczne || wolniej) return;
    if (pasek) {
      void pasek.offsetWidth;
      pasek.style.transition = `width ${CO_ILE}ms linear`;
      pasek.style.width = '100%';
    }
    zegar = setTimeout(() => {
      /* Po pełnym obrocie zatrzymujemy się — nikt nie chce oglądać karuzeli
         w kółko, a kto chce dalej, ma przyciski. */
      if (aktywny + 1 >= KROKI.length) return zatrzymaj();
      idzDo(aktywny + 1);
    }, CO_ILE);
  }

  function zatrzymaj() {
    sam = false;
    clearTimeout(zegar);
    zegar = null;
    const pasek = box.querySelector('#droga-pasek');
    if (pasek) {
      pasek.style.transition = 'none';
      pasek.style.width = '0%';
    }
    box.classList.add('is-reczny');
  }

  function idzDo(i, reczne = false) {
    aktywny = (i + KROKI.length) % KROKI.length;
    if (reczne) zatrzymaj();
    render();
  }

  /* Kursor albo fokus na sekcji = pauza. Slajd nie ucieka w połowie zdania. */
  ['mouseenter', 'focusin'].forEach((z) =>
    box.addEventListener(z, () => {
      wstrzymane = true;
      zaplanuj();
    })
  );
  ['mouseleave', 'focusout'].forEach((z) =>
    box.addEventListener(z, () => {
      if (box.contains(document.activeElement) || box.matches(':hover')) return;
      wstrzymane = false;
      zaplanuj();
    })
  );

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
          widoczne = w.isIntersecting;
          zaplanuj();
        });
      },
      { threshold: 0.35 }
    ).observe(box);
  } else {
    widoczne = false;
  }
})();
