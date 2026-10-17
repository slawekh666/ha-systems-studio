# Home Assistant Systems Studio — raport audytu ikon i UX (2026-10-17)

Baza: `main` na commit `9707fec30d273c6de9fdda3e7cbfbdca55fe84a7`.
Realizacja: osobna gałąź i MR dla każdego punktu; nie publikować Release/HACS przed testami w HA.

| Nr | Zadanie / zakres | Przewidywana gałąź |
|---|---|---|
| 0 | Audyt i lista regresji urządzeń | `feature/ux-00-device-audit-report-20261017` |
| 1 | Ładowarka EV: zmniejszenie pioruna, ochrona czytelności kW i energii sesji | `feature/ux-01-ev-bolt-20261017` |
| 2 | Biblioteka: właściwy podział źródeł ciepła, hydrauliki i budynków; nazwy wariantów; poprawne MDI; szersza lista | `feature/ux-02-library-structure-20261017` |
| 3 | Połączenia: oddzielna pozycja Rury i Przewody elektryczne; wspólne rysowanie, specyficzne właściwości; zachować kierunek przepływu także dla rur | `feature/ux-03-typed-connections-20261017` |
| 4 | Pulpit: Shift + kółko myszy przy kursorze nad schematem; zachować przewijanie HA, zoom +/- i dotyk | `feature/ux-04-shift-wheel-20261017` |
| 5 | Kocioł pelletowy: 5-segmentowy wskaźnik zasypnika, opcjonalna encja poziomu, domyślny alarm 20%, ustawialny próg, brak danych = brak fałszywego odczytu | `feature/ux-05-pellet-level-20261017` |
| 6 | Audyt właściwości wszystkich rodzin urządzeń: wyłączyć nieadekwatne opcje, zweryfikować ręczne podglądy; naprawić pompę ciepła | `feature/ux-06-device-properties-20261017` |

## Wstępne wyniki przeglądu źródeł

- `src/studio-inspector.js`: gałąź `obj.type==='boiler'` wyświetla `burner_mode`, `burner_entity`, temperatury progów palnika również dla `heatpump_modern`, `electric_modern` i innych urządzeń, których te opcje nie obsługują.
- `src/heat-pump-stove.js`: `HASSStudioHeatPump.render` odczytuje wyłącznie `hp_power_entity`, `hp_fan_entity`; brak niezależnego trybu testowego. Pola próbne bez zmiany renderera byłyby nieskuteczne.
- `src/device-registry.js`: kominek/gazowy/elektryczny/pompa ciepła występują w `other_heat`, budynki są częścią `electricity`, elementy są nazwane rodziną „Budynek” mimo wariantów.
- `src/studio-custom.js`: startowa lewa kolumna wynosi 180 px (`--ss-left`), splitter dopuszcza 110–500 px; długa nazwa podgrupy łamie się w wielu wierszach.
- `src/studio-viewer-gestures.js`: zoom kółkiem przejmuje zdarzenie tylko w fullscreen; brak desktopowej obsługi Shift+wheel w zwykłym widoku.
- `src/pellet-stove.js`: brak odczytu poziomu paliwa; kocioł używa aktualnie temperatury i stanu spalania.
- `src/studio-canvas.js`: dotychczasowe przewody mają wspólny typ `pipe`; osobne presety i specyficzne ustawienia są możliwe bez migracji identyfikatora.
- Część pozostałych ikon ma odrębne formularze ręcznej symulacji (radiator, manifold, falownik, magazyn, EV, sieć, budynki). Nie oznacza to jeszcze, że każdy formularz przechodzi test interakcyjny w przeglądarce.

## Wymagane testy akceptacyjne
1. Otwarcie każdej pozycji biblioteki i inspektora bez błędów JS; właściwa nazwa i ikona.
2. Zapis, odczyt i ponowne otwarcie istniejącego układu HA; nie zmieniać `node.type` i `node.variant`.
3. Ręczne wartości powodują natychmiastową zmianę wskazań; brak encji to „—”, bez losowych danych.
4. Działają przyciski +/−/fit, mobilny pinch, oddzielny Shift+wheel na desktopie.
5. Włączanie i wyłączanie animacji oraz alarmów nie wywołuje sterowania urządzeniem.
6. Pełne testy `scripts/check.py`, `scripts/test_studio.js` i `dev/test-*.js`, deterministyczny `dist`.

## Bezpieczeństwo i semantyka
- Wszystkie progi są wizualne, nie nadpisują sterowników urządzeń i BMS.
- Rury: zachowujemy kierunek przepływu; temperatura i kolor z HA będą dopiero osobnym uzgodnionym etapem.
- Kabel elektryczny: animacja w zależności od podpisanej mocy W/kW; dla rur można stosować odczyt przepływu w l/min, bez fałszywego wnioskowania z kW.
- Historia ładowania EV nie może powstawać z chwilowej mocy bez liczników lub danych HA.
