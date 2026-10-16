# Prototyp rozdzielacza CO / podłogówki

**Status:** samodzielny prototyp SVG+JS, poza kartą Home Assistant; nie scalać bez akceptacji wyglądu.

## Pliki i przegląd

- `dev/manifold-prototype.js` — parametryczny generator SVG i normalizacja konfiguracji.
- `dev/manifold-preview.html` — strona do oceny wyglądu; do otwarcia poprzez serwer HTTP lub podgląd repozytorium po pobraniu plików.
- Dotychczasowe `dev/icon-preview.html`, `src/`, `VERSION`, `dist/` są nienaruszone.
- Przykładowe API: `HASSStudioManifoldPrototype.render({count:20,pitch:190,actuatorMode:'individual'})`.
- Konsola podglądu: `manifoldPreviewAPI.setCircuitCount(20)` oraz `manifoldPreviewAPI.setCircuitData(0,{display:false,actuator:false,flow:2.3})`.

## Ustalenia użytkownika

- Domyślnie 5 obiegów; regulowana liczba, w tym 1 i 20. Prototyp obsługuje 1–40.
- Dwie belki, parametrycznie wydłużane wraz z liczbą obiegów.
- Zachowane proporcje elementów SVG oraz niezależna regulacja rozstawu obiegów (165–300 jednostek).
- W trybie indywidualnym każdy obieg ma osobne ustawienie widoczności siłownika; w trybie wspólnym jeden siłownik przy głównym zaworze powrotnym.
- Każdy obieg ma niezależne ustawienie widoczności wyświetlacza pomiarów. Można pokazać dowolny podzbiór.
- Wartości są danymi demo, NIE odczytami HA.
- Obiegi mają stabilny klucz `circuit-N`. Podgląd przechowuje ustawienia tymczasowo ukrytych obiegów, gdy liczba zostaje zmniejszona i potem zwiększona.
- Nie powstają rury, złącza do innych urządzeń ani logika sterowania HA.

## Uwagi techniczne do akceptacji

- Wspólny siłownik jest wizualnym siłownikiem jednego zaworu głównego, a nie magiczną regulacją wszystkich przepływów pętli. Nie wyświetlamy w tym trybie indywidualnych siłowników.
- W prototypie przepływomierze umieszczone są na zasilaniu, elementy zaworowe na powrocie.
- Wersja docelowa powinna oddzielić stan rzeczywistych pomiarów od danych demonstracyjnych; brak encji oznaczać ma brak danych (`—`), nie symulowany odczyt.
- Dla 20–40 obiegów podgląd przewija się poziomo; w karcie HA trzeba przemyśleć ergonomię skali, zachowanie obrysów i zaznaczania.
- Po zatwierdzeniu wyglądu przeprowadzić integrację ze standardowym rejestrem, layoutem i podglądem; teraz brak jakichkolwiek zmian w `src/` i `dist/`.
