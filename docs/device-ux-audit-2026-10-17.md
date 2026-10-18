# Home Assistant Systems Studio — raport audytu ikon i UX (2026-10-17)

Baza audytu (stan historyczny z 2026-10-17): `main` na commit `9707fec30d273c6de9fdda3e7cbfbdca55fe84a7`.
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

## Status wykonania (raport aktualizowany)

| Nr | MR | CI | Rezultat | Ograniczenia |
|---|---|---|---|---|
| 0 | !34 | Dokumentacja | Lista punktów, audyt kodu i kryteria akceptacyjne | Audyt interakcji wszystkich ikon w HA jeszcze nieukończony |
| 1 | !36 | #2958938483 SUCCESS | Mniejszy piorun EV, niezmieniony odczyt kW/sesja | Potrzebny podgląd w HA |
| 2 | !37 | #2958938595 SUCCESS | Biblioteka: kategorie źródeł, Dom/Garaż/Budynek gospodarczy, +22% domyślnej szerokości | Zweryfikować ikony MDI na rzeczywistym motywie HA |
| 3 | !38 | #2958938794 SUCCESS | Osobne wejścia Rura / Przewód elektryczny, parametr connection_type z zachowaniem starego type=pipe | Dodatki elektryczne zostają do kolejnej iteracji; konieczny test w UI |
| 4 | !39 | #2958938668 SUCCESS | Shift+wheel nad kartą na desktopie, bez przejęcia zwykłego scrolla HA | Test zachowania przeglądarek w HA |
| 5 | !40 | #2958941398 SUCCESS | 5 segmentów pelletu, encja %, próg alarmu 20%, ręczny poziom testowy; osobne testy progów 0–100% | Obowiązkowa próba na bieżących encjach HA |
| 6 | !35 | #2959168610 SUCCESS (ostatni test przed merge) | Oddzielne parametry pompy ciepła i działający test mocy + obrotów; ukryte palnikowe opcje w nowych pompach i kotłach elektrycznych | Pozostałe rodziny wymagają manualnej akceptacji w GUI |

**Stan scalenia na 2026-10-17 (historyczny):** MR-y otwarte, `main` niezmieniony. Zmiany w różnych MR mają wspólny `dist/ha-systems-studio.js`; scalać kolejno, po każdym rebase/regeneracja deterministycznego bundla i test CI.

**Aktualizacja 2026-10-18:** MR !35 (pompa ciepła) został scalony z GitLab `main`: commit `eb9ec650f4a9140374d0de95af08a619cf9b9878`; pipeline `main` #2959171941 SUCCESS. Przed scaleniem zapisano gałąź `backup/main-before-ux-06` na commit `9707fec30d273c6de9fdda3e7cbfbdca55fe84a7`. MR !34 i MR !36–!40 pozostają otwarte na chwilę aktualizacji; wyniki ich starszego CI nie potwierdzają jeszcze zgodności z nowym `main`. Interakcyjny test pompy ciepła w prawdziwym HA nie został potwierdzony; nie publikowano wydania GitHub/HACS.

**Zakres audytu:** wykryto i poprawiono konkretną niezgodność nowoczesnej pompy ciepła. Systematyczne przejście formularzy wszystkich wariantów, w tym test przez interakcję w HA, pozostaje osobnym wymaganym krokiem akceptacyjnym. Nie deklarować kompletnej naprawy wszystkich urządzeń tylko na podstawie zielonego CI.
