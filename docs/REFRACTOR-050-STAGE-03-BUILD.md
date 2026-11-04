# Refaktoryzacja 0.5.0 — etap 03: modułowy build

## Cel i zakres

Wyłącznie podział istniejącego skryptu Pythona na odpowiedzialności. Nie zmieniono działania karty, kolejności modułów JS, kontraktu HACS, transformacji upstream, osadzanych grafik, pliku VERSION ani numeru wersji 0.4.22-dev.

- scripts/build.py — dotychczasowy punkt wejścia: python3 scripts/build.py.
- scripts/build_support/manifest.py — jeden autorytatywny, uporządkowany spis modułów i zasobów SVG (bez automatycznego sortowania plików).
- scripts/build_support/upstream.py — znane znaczniki upstream, zastępowanie tagów, osadzenie wersji, domyślne zabezpieczenie studio_readonly.
- scripts/build_support/icons.py — parsowanie XML, weryfikacja znaczników, dokładnie takie samo osadzenie wewnętrznego SVG.
- scripts/build_support/bundle.py — łączenie tekstu z oryginalnym nagłówkiem MIT w historycznej kolejności i zapis do dist.
- scripts/tests/test_build.py — testy transformacji, błędnych wejść, kolejności, deterministyczności i braku nadpisania dist przy brakującym pliku.
- .gitlab-ci.yml — uruchamianie testów Pythona obok istniejących testów Node.

## Warunki zgodności

1. Obowiązuje ten sam oryginalny plik warmwasser-schema-card.js; nie usunięto zależności od Warmwassera (to planowane na etap 18).
2. Wynik budowania musi być **identyczny bajtowo** z kontrolowanym w Git dist/ha-systems-studio.js: sprawdza to końcowe git diff --exit-code -- dist/ha-systems-studio.js. Nie generujemy nowego dist z niezaakceptowaną zmianą semantyki.
3. Nagłówek MIT i cały plik LICENSE pozostają nienaruszone.
4. Nie wolno przestawiać kolejności modułów, mapowania kluczy SVG ani miejsca osadzenia HASSStudioIconTemplates przed solid-fuel-stove.js.
5. Brakujące znaczniki upstream, uszkodzony SVG, nierozwiązane placeholdery i brakujące źródła powodują niepowodzenie budowy.
6. Dodatkowe testy jednostkowe testują minimalne wejścia syntetyczne; pełny pipeline testuje rzeczywisty kod.
7. Testy odniesienia z etapu 02 nadal działają. Znana luka migracji pipes[] -> connections[] nie jest rozwiązana w tym etapie.

## Polecenia

    python3 scripts/build.py
    python3 scripts/check.py
    python3 -m unittest discover -s scripts/tests -p 'test_*.py' -v
    node scripts/test_studio.js
    node dev/test-refactor-baseline.js
    git diff --exit-code -- dist/ha-systems-studio.js

## Akceptacja

Brak zmian w src/, dist/, VERSION, zasobach SVG i oryginalnym Warmwasserze. Weryfikacja automatyczna wymagana zarówno dla MR, jak i merge do main. Ponieważ output JS jest identyczny bajtowo, etap nie wprowadza zmian w zachowaniu wymagających nowego testu wizualnego w HA. Nie rozpoczynać etapu 04 bez osobnego polecenia użytkownika.
