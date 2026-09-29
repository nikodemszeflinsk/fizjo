# System pozyskiwania pacjentów dla fizjoterapeutów — Studio Widok

Gabinet dostaje własne miejsce w Google zamiast pozycji na cudzej liście: stronę
z rezerwacją online, widoczność w Mapach, podstrony pod konkretne dolegliwości
i panel, który pilnuje, żeby pacjent nie zniknął w połowie terapii.

**Na żywo:** [nikodemszeflinsk.github.io/fizjo](https://nikodemszeflinsk.github.io/fizjo/)

## Co jest w repozytorium

| Plik | Co pokazuje |
|---|---|
| `index.html` | Oferta: jak to działa, droga jednego pacjenta, funkcje, pakiety, kontakt |
| `demo.html` | Strona gabinetu „Linia Ruchu” z rezerwacją, kwalifikatorem i zespołem |
| `fizjoterapia-kregoslupa.html` i trzy pozostałe | Podstrony problemów — to one odpowiadają na pytania z wyszukiwarki |
| `crm.html` | Panel gabinetu: dzień, kalendarz, kartoteka, wiadomości, miesiąc |
| `pacjent.html?t=t1` | Karta pacjenta spod linku z SMS-a: ćwiczenia, terminy, ból |
| `karta-produktu.pdf` | Oferta do druku |

Wszystko działa bez serwera i bez budowania — statyczny HTML, CSS i JavaScript.
Panel trzyma dane w `localStorage` przeglądarki, więc każdy, kto otworzy demo,
dostaje własny komplet danych przykładowych i niczego nie psuje innym.

## Wdrożenie u klienta

Cała podmiana danych dzieje się w **`assets/js/konfiguracja.js`**: nazwa gabinetu,
kontakt, adres, problemy z cennikiem i zespół z grafikami. Czytają go i strona,
i panel, więc nic się nie rozjeżdża — pilnuje tego test. Ustawienie `tryb: 'praca'`
startuje panel pusty i prowadzi przez kreator zamiast pokazywać wymyślonych pacjentów.

Pełna procedura: `_wewnetrzne/WDROZENIE.md`.

## Testy

```bash
node scripts/ux-testy.mjs
```

Trzydzieści jeden przypadków przechodzi ścieżki, które naprawdę ktoś wykonuje:
pacjent umawia wizytę i wybiera terapeutę, odhacza ćwiczenia, przekłada termin;
gabinet prowadzi dzień, umawia serię wizyt, zamyka terapię z wynikiem. Do tego
podstawy dostępności na każdej stronie, obsługa klawiaturą i zgodność danych
między konfiguracją, stroną a panelem.

Wymaga uruchomionego serwera na porcie 5178:

```bash
python -m http.server 5178
```

---

Kontakt: [studio-widok.pl](https://studio-widok.pl) · kontakt@studio-widok.pl · +48 783 480 341

Zdjęcia w demo: [Unsplash](https://unsplash.com), autorzy w `assets/img/credits.json`.
Dane gabinetu, nazwiska, ceny i opinie w demo są przykładowe.
