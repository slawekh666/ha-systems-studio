# 07A.2-D.1-E.1 — kontrakt przebudowy falownika i magazynu (bez zmian runtime)

## Punkt przywracania i zakres

- Źródło: GitLab \`main\`, commit \`9b397181d86b0dbf0e07e53b63d5d96217c83387\`.
- Kopia referencyjna: \`backup/before-07a2-d1-e-20261106\`.
- Ten podetap **nie zmienia** algorytmów, ustawień interfejsu, modelu zapisu ani \`dist\`.
- Zatwierdzony plan: E.2 — automatyczne rozpoznanie topologii; E.3 — bilans magistrali DC niezależny od strat falownika; E.4 — uproszczenie inspektora; E.5 — migracja i usunięcie nieużywanego legacy.
- Ustalenie nadrzędne: nie zmieniać obserwowanego zachowania bilansu AC. Nie łączyć fizycznie szyn AC i DC.

## Kontrakt docelowy modelu urządzeń

1. **Falownik:** rodzaj \`grid_tied\` lub \`hybrid\`; wybór rodzaju jest cechą urządzenia, a nie przełącznikiem obliczeń. \`grid_tied\` zachowuje dotychczasowy model AC. \`hybrid\` udostępnia logiczny przekształtnik i odczyty MPPT bez wymagania osobnych fizycznych przewodów do paneli.
2. **Magazyn:** sposób przyłączenia wynika z **zweryfikowanego medium przewodu** i portu. Nie wymaga ręcznego wyboru \`legacy/ac/dc\` ani identyfikatora portu. Przyłącze AC pozostaje AC, przyłącze DC pozostaje DC.
3. **Porty:** zachować stabilne identyfikatory zapisanych portów i końcówek \`connections[].energy_start/end\`. Identyfikator \`ac\` nie jest dowodem medium; źródłem prawdy jest pole \`medium\`. Nowy kod nie może przepisywać poprawnych przewodów na podstawie nazwy portu.
4. **Rozpoznanie:** automatyczne tylko gdy istnieje jedno jednoznaczne, poprawne połączenie o zgodnym medium. Dwa konkurencyjne przyłącza, źle oznaczone medium, zduplikowane identyfikatory przewodów albo cykle o nieustalonym kierunku → czytelny status niejednoznaczności, żadnego zgadywania.
5. **Odczyty:** HA i świadomie wpisany TEST są nadrzędne; prawdziwe \`0\` jest poprawne, brak to \`null\`. Szacowanie może uzupełnić tylko brakującą wielkość; zachować źródło pochodzenia.
6. **Bilans:** jeden walidowany indeks grafu AC/DC; oddzielne równania dla węzłów AC, magistrali baterii DC i *wewnętrznego bilansu* falownika. Nie tworzyć sztucznych przewodów między AC/DC i nie zaliczać PV/MPPT bezpośrednio na magistralę magazynu.
7. **Granica magazynu DC:** przy jednym jednoznacznym falowniku i w pełni obserwowanym magazynie moc na granicy obwodu DC wynika z pomiaru magazynu. Nie blokować jej dlatego, że fizycznych strat wewnętrznych falownika nie można uzgodnić.
8. **Sprawność i straty:** nie wymuszać zgodności \`PV - AC - magazyn\` z arbitralnym współczynnikiem. Przy niezgodnych czasowo lub różnie mierzonych odczytach zachować obserwacje, \`loss_kw=null\`, status \`unresolved\`. Osobno oznaczać obliczoną moc graniczną DC.
9. **Znak mocy magazynu:** \`charge_positive\` to interpretacja odczytu czujnika, *nie* konfiguracja połączenia. W dalszym UI zachować możliwość zmiany konwencji znaku, ponieważ standardy urządzeń są różne.
10. **Wsteczna kompatybilność:** migrować połączenia bezstratnie; nie domyślać się nowego rodzaju falownika tylko na podstawie obecności starego pola \`hybrid\`. Zachować możliwość odczytu starszych zapisów podczas migracji, ale nie utrzymywać równoległego silnika obliczeń.

## Gwarancje regresyjne

- \`dev/test-energy-e1-baseline.js\`: AC HA 3,680 kW + budynek HA 3,680 kW + grid 0 kW; brak zmian źródła/znaku, przepływy przewodów AC, zapis-odczyt, magazyn AC ze starszej konfiguracji.
- Osobno: odtworzenie scenariusza użytkownika PV 3,820 kW (HA), falownik AC 3,680 kW (HA), magazyn DC +1,500 kW ładowania (TEST). Na etapie **E.1** odnotowujemy istniejący błąd: \`converter_unresolved_losses\`, różnica DC \`-1.500 kW\`; docelowa asercja E.3: różnica DC \`0\` bez zmiany odczytu AC, strat pozostających \`null\`.
- Konflikt AC/DC jest odrzucany. Nie ma automatycznej migracji podłączonego magazynu AC na DC.
- Wszystkie wcześniej istniejące testy i kontrola \`git diff --exit-code -- dist/ha-systems-studio.js\` pozostają aktywne.

## Etapy wdrażania i zasada stop

- **E.2**: implementacja automatycznych powiązań portów na istniejącym indeksie topologii, bez zmian liczbowego solvera AC. Wymaga osobnego MR oraz testów połączeń niejednoznacznych i historycznych.
- **E.3**: zmiana modelu granicy magazynu DC. Wtedy celowo aktualizujemy jedynie asercje opisujące znany błąd DC; porównanie AC ze stanem E.1 musi dać identyczne wartości.
- **E.4**: usunięcie zbędnych kontrolek dopiero po działającym automatycznym rozpoznaniu. Zachować ustawienia HA/TEST, PV, SOC, ochrony i wyglądu.
- **E.5**: migracja starego schematu i usunięcie martwych gałęzi kodu, po zatwierdzonym zestawie regresji.
- W przypadku nierozstrzygniętego scenariusza (np. kilka magazynów, falowników, magazyn AC + DC, mieszany znak) zatrzymać implementację danego scenariusza i uzgodnić rozszerzenie kontraktu; nie zmieniać samowolnie bilansu AC.
