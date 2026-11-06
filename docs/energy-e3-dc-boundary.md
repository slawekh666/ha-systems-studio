# 07A.2-D.1-E.3 — niezależny bilans przyłącza magazynu DC

## Problem odtworzony na E.1

- PV (HA): 3,820 kW; AC falownika (HA): 3,680 kW; ładowanie magazynu (TEST): 1,500 kW.
- Wewnętrzna różnica `PV - AC - ładowanie = -1,360 kW` nie pozwala wyznaczyć fizycznych strat.
- Wcześniej `converter_unresolved_losses` uniemożliwiał dodanie **znanej granicy przyłącza DC**; magistrala wykazywała `-1,500 kW` i błędny komunikat „Brak modelu konwersji DC”.

## Nowy kontrakt

- Zachowujemy jeden wspólny graf AC/DC oraz dotychczasowe bezpieczniki topologii: jeden falownik, jednoznaczny port magazynu DC, tylko magazyn(y) z kompletnym odczytem na magistrali, oddzielne szyny PV i baterii, brak odczytu nie jest zerem.
- Po poprawnej walidacji topologii i obserwacji magazynu, gdy stan przekształtnika to `valid`, `estimated` lub `unresolved`, do **magistrali magazynu DC** wprowadzamy jedno obliczone przyłącze o mocy równej przeciwieństwu sumy odczytów magazynów. Źródło: `calculated`, podstawa: `independent_storage_meter`. Nie jest to drugi pomiar mocy.
- Moc AC z HA/TEST pozostaje bez zmian. Nie dopisujemy wirtualnego przewodu AC↔DC ani nie wprowadzamy mocy PV do magistrali baterii.
- Gdy nie można pogodzić sum PV/AC/magazynu, `status='unresolved'`, `loss_kw=null`, `efficiency_observed=null` oraz ostrzeżenie `converter_unresolved_losses` **pozostają**. Niezależny bilans DC może jednocześnie wynosić zero.
- Prawidłowa moc graniczna `0 kW` pozostaje liczbą `0`, a nie `null` w wyniku bilansu i diagnostyce.
- Przy niekompletnej obserwacji, błędnym/niejednoznacznym połączeniu, wspólnej szynie PV/baterii, błędnym pomiarze lub statusie `missing/invalid` nie wprowadzamy obliczonej granicy. Nie wolno dopasowywać bilansu DC na siłę.
- Wartość `battery_boundary_kw` w rekordzie przekształtnika oznacza jedynie **wyliczoną moc na granicy obwodu DC**. Nie jest oszacowaniem strat i nie modyfikuje surowych odczytów.

## Testy

- `dev/test-energy-e1-baseline.js`: dokładny przypadek użytkownika, porównanie AC 3,680 kW, PV 3,820 kW, magazyn 1,500 kW; DC zbilansowane `0 kW`, straty nadal `null`, przewód DC ma obliczony przepływ, diagnostyka nie zgłasza brakującego modelu.
- `dev/test-hybrid-converter.js`: poprawny dodatni i ujemny przepływ magazynu, `0 kW`, brak podwójnego liczenia, niezmienność AC, zachowanie ochrony w przypadku braków danych/konfliktu PV/wspólnej szyny.
- Wcześniejsze testy E.2 oraz pozostałe scenariusze AC bez zmian.

## Granice etapu

- D.1-E.3 dotyczy **nierozstrzygniętej sprawności/strat przy dostępnych wymaganych obserwacjach**. Nie wymusza oszacowania brakującego odczytu AC lub PV i nie wprowadza fikcyjnej mocy w scenariuszach `missing/invalid`.
- D.1-E.4 uprości interfejs, E.5 przeprowadzi migrację i usunie nieużywaną konfigurację historyczną.
