# 07A.2-D.1-E.4 — uproszczenie inspektora falownika i magazynu

## Zakres

- Falownik pokazuje jedno pole **Rodzaj falownika**: `grid_tied` (sieciowy) albo `hybrid` (hybrydowy). Wybór użytkownika aktywuje odpowiedni istniejący model, nie przebudowuje żadnego przewodu.
- Dla hybrydowego falownika zamiast ręcznych przełączników i identyfikatorów portów inspektor pokazuje **tylko status** wykrytych połączeń AC i magazynu DC z jednego indeksu topologii E.2.
- Magazyn pokazuje odczytany status przyłącza `AC`, `DC`, `ambiguous` lub `unconnected`, bez edytowalnych wyborów `legacy/ac/dc` ani numeru portu.
- W inspektorach falownika i magazynu ukryto techniczne dodawanie, usuwanie i zmianę rodzaju portów, aby użytkownik nie mógł przypadkowo uszkodzić zwalidowanego grafu. Porty innych urządzeń pozostawiono w E.4 bez zmian.
- Zachowano encje HA, TEST (w tym zero i puste pola), jednostki, SOC, BMS, limit ładowania/rozładowania, znak mocy magazynu, wygląd i dodatkowy panel odczytów.
- Przy przełączeniu nowego falownika na `hybrid`, gdy nie ma istniejącego portu lub rzeczywistego połączenia DC z magazynem, dodawany jest wyłącznie **port** `battery` (DC). Nie powstaje fikcyjny przewód ani automatyczne trasowanie. Ponowne wybranie `hybrid` nie dodaje duplikatów.
- Port DC magazynu o historycznej nazwie `ac` nadal jest rozpoznawany zgodnie z rzeczywistym `medium`, a nie nazwą.
- Wybór `grid_tied` wyłącza logiczny model hybrydowy, ale zachowuje zapisane porty, odczyty i przewody na potrzeby bezstratnej migracji.
- Otwarcie panelu nie zmienia schematu. Rodzaj falownika jest zapisywany dopiero po świadomym wyborze użytkownika.

## Kompatybilność do E.5

- Pola `hybrid.enabled`, `hybrid.converter.enabled`, `hybrid.pv_ports`, `hybrid.converter.ac_port_id/battery_port_id`, `energy_storage.coupling/coupling_port_id` oraz historyczne współczynniki sprawności **nadal istnieją** i są odczytywane przez stary schemat.
- Nie dokonujemy masowej migracji już zapisanych konfiguracji. Nie usuwamy w E.4 handlerów służących do odczytu/edycji starszych pól. Te elementy zostaną przeanalizowane i wycofane dopiero w E.5.
- Inspektor informuje, jeśli zachowano historyczne ręczne przypisania albo założenia sprawności. Mogą one nadal wpływać na działanie istniejącej konfiguracji do czasu jej migracji; sam ukryty przełącznik nie może być uznany za usunięcie funkcji z silnika.
- Nie zmieniono solvera AC, konwersji DC, pochodzenia danych HA/TEST ani rozwiązywania strat. Nie należy interpretować statusu automatycznego powiązania jako polecenia fizycznego sterowania.

## Walidacja

- `dev/test-inverter-inspector.js`: aktywne renderowanie falownika (1, 2 i 12 wejść; HA/TEST, hybrydowy) i brak dawnych kontrolek.
- `dev/test-energy-e4-inverter-kind.js`: zmiana rodzaju falownika, brak modyfikacji źródeł HA/TEST i przewodów, niepowielanie portów, historia.
- `dev/test-energy-e4-storage-inspector.js`: prawdziwe renderowanie stanu przyłącza AC, DC i niejednoznaczności; dostępne SOC/BMS/limity, brak ręcznych przełączników i modyfikacji schematu.
- Testy E.1–E.3 zabezpieczają dotychczasowe obliczenia AC/DC i historyczne pliki.
- `scripts/build.py`, `scripts/check.py` i CI weryfikują zgodność `dist` ze źródłami.

## Następny etap E.5

Migracja starego systemu konfiguracji do modelu z jednym rodzajem falownika oraz wynikami zwalidowanego grafu; usunięcie martwych ustawień i handlerów dopiero po sprawdzeniu historycznych schematów oraz zgodności AC/DC. Nie wolno arbitralnie wymazywać starych identyfikatorów portów ani zastępować HA wartościami obliczonymi.
