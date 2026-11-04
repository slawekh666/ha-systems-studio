# Refaktoryzacja 0.5.0 — Etap 01: punkt przywracania

Data audytu: 2026-11-04. Repozytorium źródłowe: GitLab `slawekh666/ha-systems-studio`, projekt `87493943`.

## Stan referencyjny (przed zmianami 0.5.0)

| Parametr | Wartość |
| --- | --- |
| Gałąź produkcyjna/deweloperska | `main` (protected) |
| Pełny SHA | `ddf15c7c12e9c3566b5f861a2266ca7a7a6a9c0f` |
| Wersja z `VERSION` | `0.4.22-dev` |
| GitLab CI | pipeline [2960932147](https://gitlab.com/slawekh666/ha-systems-studio/-/pipelines/2960932147), `success`, SHA zgodny z bazą |
| Walidacja | job `validate_card` (17269116377): build, check, testy Node i `git diff --exit-code -- dist/ha-systems-studio.js` — sukces |
| Wygenerowany bundle | `dist/ha-systems-studio.js` (635883 bajtów według logu CI) |
| Licencja / upstream | `LICENSE` MIT, `README_UPSTREAM.md`, `README_UPSTREAM_DE.md`; zachować atrybucję |
| Odrębny punkt przywracania | `backup/pre-050-refactor-20261104`, utworzony z powyższego SHA |
| Gałąź tego etapu | `chore/050-stage-01-restore-point-20261104` |

Punkt odtworzenia jest **dokładnym wskazaniem commita Git**, nie eksportem konfiguracji Home Assistant i nie niezależną kopią poza GitLabem. Gałąź backupu nie jest obecnie chroniona regułą GitLab; po audycie zaleca się włączyć ochronę przed usunięciem i wymuszoną aktualizacją w ustawieniach projektu. Nie przesuwać tej gałęzi wraz z kolejnymi etapami. Na dzień audytu w repozytorium nie było tagów.

## Zakres zamrożony

- Punkt odniesienia obejmuje źródła, zasoby `src/icons`, `dist`, przykłady, skrypty, licencję oraz historię Git osiągalną z commita.
- Nie zmieniamy w etapie 01 `VERSION`, kodu aplikacji, formatu konfiguracji, `dist`, istniejących grafik, `.gitlab-ci.yml` ani synchronizacji z GitHubem.
- Obecny `scripts/build.py` przekształca i łączy `warmwasser-schema-card.js` ze źródłami `src/`. Zmiana tego kontraktu należy do późniejszych etapów.
- Istniejące otwarte MR `!19`, `!20` i `!38` **nie** są częścią refaktoryzacji; nie scalać ich jako elementu tego etapu.
- Regresja wizualna i prawidłowość danych rzeczywistych HA nie są potwierdzane przez CI. Dla zmian zachowania po etapie 01 wymagany jest test akceptacyjny w HA.

## Odczyt i uruchomienie wersji bazowej (bez zmian w main)

W lokalnym repozytorium, po upewnieniu się, że nie ma niezapisanych zmian:

```bash
git fetch origin --prune
git rev-parse origin/backup/pre-050-refactor-20261104
# Oczekiwane: ddf15c7c12e9c3566b5f861a2266ca7a7a6a9c0f
git switch -c restore/050-baseline-test origin/backup/pre-050-refactor-20261104
python3 scripts/build.py
python3 scripts/check.py
node scripts/test_studio.js
git diff --exit-code -- dist/ha-systems-studio.js
```

Przełączenie do gałęzi bazowej służy testowi i przygotowaniu odtwarzalnego artefaktu. **Nie** wykonywać `git reset --hard` ani `git push --force` na `main`.

## Przywracanie po przyszłych zmianach

1. Zatrzymać wdrażanie kolejnych etapów. Ustalić wadliwy merge/commity, SHA wersji działającej i stan schematów HA.
2. Dla niezwłocznego testu starej karty zbudować ją z `backup/pre-050-refactor-20261104` i sprawdzić w testowym dashboardzie HA z `studio_readonly: true`.
3. Aby wycofać zmiany **w GitLab main**, przygotować osobną gałąź z aktualnego `main`; odwrócić odpowiednie commity/MR w kolejności odwrotnej do wdrożenia (`git revert`, dla merge commitów po analizie także `-m 1`), otworzyć nowy MR, przeprowadzić CI oraz wymagane testy HA. Samo scalenie starej gałęzi backupu do nowszego main **nie cofa zmian**.
4. Nie przepisywać historii chronionego `main`. Przed operacją na HACS utworzyć i zachować kopię oryginalnej konfiguracji dashboardu.

## Niezależna kopia awaryjna poza GitLab (czynność do wykonania lokalnie)

Odrębny nośnik lub bezpieczny backup jest konieczny na wypadek usunięcia projektu lub utraty GitLaba. Ta czynność nie została wykonana przez konektor i wymaga dostępu do lokalnego Git:

```bash
git fetch origin --prune --tags
git bundle create ../ha-systems-studio-pre-050-20261104.bundle --all
git bundle verify ../ha-systems-studio-pre-050-20261104.bundle
```

Plik `.bundle` przechowywać także poza bieżącym komputerem. Zawiera wszystkie **lokalne refy** dostępne w chwili utworzenia: przed wykonaniem polecenia upewnić się, że potrzebne gałęzie są pobrane; opcjonalnie użyć `git clone --mirror` do kompletnego backupu wszystkich refów. Kopia repozytorium nie zawiera konfiguracji Lovelace zapisanej w instancji HA, jeżeli nie została dodana do Git. Należy osobno wyeksportować YAML istniejących schematów i zrobić backup HA, zanim zacznie się migracja konfiguracji.

## Warunki odbioru etapu 01

- [x] Audyt commit SHA, wersji, licencji, struktury, CI, bundle i otwartych MR.
- [x] Wydzielona gałąź przywracania od dokładnego SHA bazowego.
- [x] Oddzielna gałąź robocza, bez modyfikacji kodu i formatu danych.
- [ ] MR z tą instrukcją i pozytywnym CI — potwierdzić przed scaleniem.
- [ ] Zewnętrzny `git bundle` oraz backup rzeczywistych konfiguracji HA — czynności lokalne, niewykonane w ramach dostępu do GitLaba.
- [ ] Ochrona gałęzi backupu przed nadpisaniem/usunięciem — czynność administracyjna.

Etap 02 (testy odniesienia) rozpoczyna się wyłącznie po osobnym poleceniu użytkownika.
