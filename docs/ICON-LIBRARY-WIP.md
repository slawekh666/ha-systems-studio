# Biblioteka ikon SVG+JS — gałąź robocza

Status: **projekt w uzgodnieniu**. Ten dokument opisuje kierunek prac, nie oznacza akceptacji wyglądu ani integracji z kartą HA.

## Zasady gałęzi

- Prace dotyczą kolejnych ikon. Wszystkie implementacje najpierw powstają tutaj, poza `main`.
- Nie publikować do GitHub / HACS, nie aktualizować `VERSION`, nie tagować ani nie tworzyć Release bez zgody użytkownika.
- Nie zmieniać istniejących rendererów, modeli zapisu `studio_layout` ani mechaniki edytora przy okazji pracy nad prototypem.
- Referencją rozdzielacza są przekazane przez użytkownika `rozdzielacz(1).svg` oraz `rozdzielacz_svg_js(1).html`; nie zostały jeszcze dodane do repozytorium.
- Po zatwierdzeniu projektu: integracja przez istniejące rejestr urządzeń, layout, inspector i canvas; dopiero wtedy aktualizacja podglądu rejestrowego, build/test i `dist`.
- Nie zakładać, że stan lokalnych plików użytkownika jest zgodny z GitLab. Poprawka skalowania kotła elektrycznego jest już w zdalnym `main`.

## Pierwsza ikona: rozdzielacz podłogówki / CO

### Wymagania potwierdzone

- Jedna ikona zawierająca belkę zasilającą i belkę powrotną.
- Możliwość konfiguracji liczby **par wyjście/powrót** (obiegów) jak w referencyjnym HTML.
- Każdy obieg ma własną geometrię i możliwość przypisania danych; zmiana liczby obiegów zmienia długość korpusu, a nie skalę detali.
- Rury łączone ręcznie przez użytkownika, bez automatycznego tworzenia połączeń.
- SVG+JS, bez rasteryzacji; brak obowiązku przypisywania encji HA.
- Na razie tylko prototyp i podgląd; nie dodawać do działającej karty przed zatwierdzeniem.

### Proponowana architektura (do akceptacji)

- Hybryda: parametryczne dwie belki oraz powielany moduł sekcji obejmujący parę przyłączy, przepływomierz, zawór i opcjonalny siłownik.
- Domyślnie 5 obiegów jak w HTML; proponowany limit konfiguracji 1–16 w celu kontroli rozmiaru i czytelności (do uzgodnienia).
- Przepływomierze na belce zasilania, zawory/siłowniki na powrocie — z możliwością skonfigurowania odwrotnego fizycznego położenia w przyszłości, jeśli okaże się potrzebna.
- Tryb danych demo z wartościami testowymi, a w HA brak danych wyświetlany jako `—`, nigdy jako rzeczywisty pomiar zastępczy.
- Dane sekcji trzymać pod stabilnym identyfikatorem obiegu (zmiana liczby obiegów nie powinna niepotrzebnie zmieniać konfiguracji pozostałych).
- Skalowanie całego urządzenia proporcjonalnie, a zwiększanie liczby sekcji parametrycznie bez rozciągania nakrętek, szkła i wyświetlaczy.
- Przy integracji rozważyć nowy typ logiczny `manifold` i wariant `floor_heating` w centralnym rejestrze, bez zmiany istniejących ID.

### Do ustalenia przed kodowaniem / integracją

1. Dopuszczalny zakres liczby obiegów i liczba domyślna.
2. Czy ma być przełącznik między samymi zaworami a siłownikami termoelektrycznymi (globalny / na każdy obieg).
3. Czy wyświetlacz danych ma być przy każdej sekcji przez cały czas, czy jako opcja podglądu — aby zachować czytelność mniejszych schematów.
4. Ostateczne rozmieszczenie przepływomierzy i elementów kolorystycznych.
5. Zakres sterowania rozmiarem: tylko skala całego urządzenia czy również zmiana odstępów sekcji przy zachowaniu rozmiaru detali.

## Przygotowanie do integracji po akceptacji

Sprawdzić i dopiero wtedy zmieniać: `src/device-registry.js`, `src/studio-layout.js`,
`src/studio-canvas.js`, `src/studio-inspector.js`, `src/studio-library.js`,
`src/studio-custom.js`, `dev/icon-preview.html`, `scripts/build.py`,
`scripts/check.py`, `scripts/test_studio.js`.

Przed ewentualnym merge: `python3 scripts/build.py`; `python3 scripts/check.py`;
`node scripts/test_studio.js`; `git diff --check`; test przeglądarkowy i HA.
