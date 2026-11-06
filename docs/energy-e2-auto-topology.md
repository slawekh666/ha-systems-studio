# 07A.2-D.1-E.2 — automatyczne rozpoznawanie przyłączy AC/DC

## Zakres wdrożenia

- Rozpoznawanie przez istniejący zwalidowany indeks `HASSStudioEnergyTopology.index`. Nie dodajemy drugiego grafu ani osobnego silnika bilansu.
- W indeksie pojawia się tylko tymczasowe `attachments`: mapy `inverters` i `storages`.
- `hybridAttachments(index, inverterId)` i `storageAttachment(index, storageId)` korzystają z tego samego wyniku — porty nie są zgadywane z nazwy ani z kolejności przewodów.
- Adapter bilansu magazynu ponownie wykorzystuje wynik indeksu wyłącznie w istniejącym trybie falownika hybrydowego. Nie przełącza automatycznie starszego falownika w tryb hybrydowy i nie zmienia bilansu AC.
- Zachowujemy `energy_ports`, identyfikatory, manualne punkty przewodów, `energy_start/end`, encje HA i wartości TEST. Nie ma zapisu wykrytych połączeń do schematu.

## Przypadki brzegowe

- Port o identyfikatorze `ac` i medium `dc` jest rozpoznawany jako DC.
- Starszy magazyn wyłącznie AC pozostaje AC.
- Mieszane przyłącze AC/DC magazynu, równoległe przewody DC, dwa falowniki na jednym magazynie lub niejednoznaczne porty — status `ambiguous`, bez zgadywania.
- Brak połączeń — `unconnected`, nie wartość mocy zero.
- Błędny typ medium i zduplikowane identyfikatory połączeń nie uprawniają do wykrywania.
- Pojedynczy port AC falownika może mieć wiele poprawnych przewodów AC (np. przez sieć/rozdzielnię), jeśli ich port jest jednoznaczny.
- Silnik nadal nie łączy magistral AC i DC krawędzią grafu.

## Kolejne etapy i ograniczenia

- E.3 naprawi bilans samej magistrali magazynu DC przy `unresolved` stratach, bez naruszania wiarygodnych odczytów AC.
- E.4 uprości konfigurację UI; E.5 usunie przestarzałą warstwę konfiguracji po migracji.
- W E.2 celowo nie zmieniamy modelu przekształtnika, priorytetów HA/TEST, obliczeń strat, klasyfikacji rodzaju falownika ani zapisanych ustawień legacy.
- Testy: `dev/test-energy-e2-auto-ports.js`, E.1 AC/DC baseline oraz pełne CI.
