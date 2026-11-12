# Home Assistant Systems Studio

A custom Home Assistant dashboard card for designing and monitoring electrical, energy, and hydraulic systems. Create diagrams, connect equipment, display Home Assistant entities, and visualize live power or fluid flows.

## Install through HACS

1. Open **HACS** in Home Assistant.
2. Add this GitHub repository as a **custom repository**, category **Dashboard**.
3. Install **Home Assistant Systems Studio**.
4. Refresh the browser.
5. Add the card to a test dashboard. A starting configuration is:

```yaml
type: custom:ha-systems-studio
layout_mode: custom
studio_readonly: true
```

HACS normally registers the JavaScript resource automatically. If it does not, add a **JavaScript module** resource with the URL:

```text
/hacsfiles/ha-systems-studio/ha-systems-studio.js
```

Do not add a duplicate resource if HACS has already registered one.

## Usage

Open the card editor to create and arrange equipment, bind Home Assistant entities, and draw electrical or hydraulic connections. In the properties panel, configure data sources individually for each device. The current electrical model supports measured values from HA, explicitly enabled test values and calculated values where appropriate.

Power balance is an informational visualization, not a control system. Data marked unavailable is not treated as zero. Some hybrid/DC and editor features are still under development; verify measurements against actual devices.

**Safety:** The card defaults to read-only control behavior (`studio_readonly: true`). Enable original control actions only after separately verifying their behavior and permissions. Do not test service calls on operating equipment.

## Updates

For development builds, choose the repository's default `main` branch in HACS and use **Redownload / Pobierz ponownie**. Refresh the browser after updating. HACS may cache the JavaScript bundle.

Installed development build: **0.4.62-dev**.

## Historia aktualizacji

<!-- HASS-STUDIO-CHANGELOG-BEGIN -->
<!-- HASS-STUDIO-SOURCE: 021a2d48fb802ea67ed0418de03baa69ba5ac623 -->

### 0.4.62-dev — od 0.4.61-dev

**Refaktoryzacja**
- share SVG defaults, language and exact animation CSS across viewers

**Dokumentacja, testy i narzędzia**
- load SVG animation CSS before canvas in connection harnesses
- preserve exact SVG animation CSS, migration and deterministic build
- load shared SVG contract before legacy adapter in isolated VM tests
- load shared SVG defaults in standalone icon preview
- load extracted animation modules in standalone test harnesses

**Do przetestowania ręcznie w Home Assistant**
- Po ponownym pobraniu w HACS sprawdzić załadowanie karty i brak błędów konsoli.
- Sprawdzić edycję właściwości, zapis konfiguracji i ponowne otwarcie projektu.
- Sprawdzić wyświetlanie SVG, animacje i połączenia urządzeń.

---

### 0.4.61-dev — od 0.4.59-dev

**Poprawki**
- resolve HA locale before first editor render and refresh delayed locale

**Refaktoryzacja**
- extract shared designer controller without rewriting SVG or AC/DC

**Dokumentacja, testy i narzędzia**
- retain stage13/14 UI assertions after controller extraction
- align static and runtime contracts with extracted controller module
- load controller in runtime harness and classify injected dependencies
- preserve designer behavior and bump 0.4.61-dev
- cover first-render locale and preserve deterministic dev bundle

**Do przetestowania ręcznie w Home Assistant**
- Po ponownym pobraniu w HACS sprawdzić załadowanie karty i brak błędów konsoli.
- Sprawdzić edycję właściwości, zapis konfiguracji i ponowne otwarcie projektu.
- Sprawdzić falownik: encje HA, TEST 0/puste, MPPT oraz odczyty SVG.

---

### 0.4.59-dev — od 0.4.58-dev

**Refaktoryzacja**
- route editor by version under single card type

**Dokumentacja, testy i narzędzia**
- instantiate registered custom elements in DOM mock
- explicitly inventory stage14.1 legacy router boundary
- ensure version-routing and no forced fullscreen; bump dev build

**Do przetestowania ręcznie w Home Assistant**
- Po ponownym pobraniu w HACS sprawdzić załadowanie karty i brak błędów konsoli.
- Sprawdzić edycję właściwości, zapis konfiguracji i ponowne otwarcie projektu.

---

### 0.4.58-dev — od 0.4.57-dev

**Nowe funkcje**
- guarded migration action and automatic standalone designer launch

**Dokumentacja, testy i narzędzia**
- validate migration, version bundle and document HA acceptance

**Do przetestowania ręcznie w Home Assistant**
- Po ponownym pobraniu w HACS sprawdzić załadowanie karty i brak błędów konsoli.
- Sprawdzić edycję właściwości, zapis konfiguracji i ponowne otwarcie projektu.

---

### 0.4.57-dev — od 0.4.56-dev

**Nowe funkcje**
- introduce independent visual editor sharing existing designer

**Do przetestowania ręcznie w Home Assistant**
- Po ponownym pobraniu w HACS sprawdzić załadowanie karty i brak błędów konsoli.
- Sprawdzić edycję właściwości, zapis konfiguracji i ponowne otwarcie projektu.

---

### 0.4.56-dev — od 0.4.55-dev

**Nowe funkcje**
- render existing SVG and HA state in independent opt-in card

**Dokumentacja, testy i narzędzia**
- initialize HA context for second card in isolation scenario

**Do przetestowania ręcznie w Home Assistant**
- Po ponownym pobraniu w HACS sprawdzić załadowanie karty i brak błędów konsoli.
- Sprawdzić edycję właściwości, zapis konfiguracji i ponowne otwarcie projektu.

---

### 0.4.55-dev — od 0.4.54-dev

**Nowe funkcje**
- introduce independent opt-in test card and dev compatibility notice

**Dokumentacja, testy i narzędzia**
- derive future version fixture from current dev version

**Do przetestowania ręcznie w Home Assistant**
- Po ponownym pobraniu w HACS sprawdzić załadowanie karty i brak błędów konsoli.
- Sprawdzić edycję właściwości, zapis konfiguracji i ponowne otwarcie projektu.

---

### 0.4.54-dev — od 0.4.53-dev

**Poprawki**
- restore physical AC/DC port editor to inverters and storage

**Dokumentacja, testy i narzędzia**
- use complete generic device fixtures for port inspector
- cover restored AC/DC ports and release version 0.4.54-dev

**Do przetestowania ręcznie w Home Assistant**
- Po ponownym pobraniu w HACS sprawdzić załadowanie karty i brak błędów konsoli.
- Sprawdzić edycję właściwości, zapis konfiguracji i ponowne otwarcie projektu.
- Sprawdzić falownik: encje HA, TEST 0/puste, MPPT oraz odczyty SVG.

---

### 0.4.53-dev — od 0.4.48-dev

**Poprawki**
- preserve legacy manual AC on save and respect explicit disabled TEST
- unify inverter AC HA/TEST priority and migrate legacy manual intent
- rerender card when watched HA units or state change
- isolate Warmwasser hysteresis per card and editor instance
- dispose card and editor resources on detach, rebuild, reconnect
- permit bounded SVG x/y geometry used by manifold flowmeters
- avoid newline after return in SVG paint validation
- keep SVG transform validator return expression on one line
- allowlist safe bindings for owned SVG templates

**Dokumentacja, testy i narzędzia**
- require all six architecture and HA quality gates in main CI
- supply HA state watcher in isolated-card harness
- supply state watch dependency in lifecycle harness
- correct unavailable collector state regex assertion
- verify viewer toolbar before state-aware canvas invocation
- accept explicit graphics state in canvas renderer contract

**Do przetestowania ręcznie w Home Assistant**
- Po ponownym pobraniu w HACS sprawdzić załadowanie karty i brak błędów konsoli.
- Sprawdzić edycję właściwości, zapis konfiguracji i ponowne otwarcie projektu.
- Sprawdzić falownik: encje HA, TEST 0/puste, MPPT oraz odczyty SVG.
- Sprawdzić wyświetlanie SVG, animacje i połączenia urządzeń.

---

### 0.4.48-dev — od 0.4.47-dev

**Refaktoryzacja**
- isolate legacy inverter config adapter and freeze roundtrip contract

**Do przetestowania ręcznie w Home Assistant**
- Po ponownym pobraniu w HACS sprawdzić załadowanie karty i brak błędów konsoli.
- Sprawdzić falownik: encje HA, TEST 0/puste, MPPT oraz odczyty SVG.

---

### 0.4.47-dev — od 0.4.46-dev

**Refaktoryzacja**
- remove dead built-in inverter diagnostic row editors

**Dokumentacja, testy i narzędzia**
- scope removed-field assertions to inverter handler

**Do przetestowania ręcznie w Home Assistant**
- Po ponownym pobraniu w HACS sprawdzić załadowanie karty i brak błędów konsoli.
- Sprawdzić edycję właściwości, zapis konfiguracji i ponowne otwarcie projektu.
- Sprawdzić falownik: encje HA, TEST 0/puste, MPPT oraz odczyty SVG.

---

### 0.4.46-dev — od 0.4.45-dev

**Poprawki**
- interpret inverter operating status without altering AC power

**Do przetestowania ręcznie w Home Assistant**
- Po ponownym pobraniu w HACS sprawdzić załadowanie karty i brak błędów konsoli.
- Sprawdzić falownik: encje HA, TEST 0/puste, MPPT oraz odczyty SVG.

---

### 0.4.45-dev — od 0.4.43-dev

**Poprawki**
- require explicit TEST activation for new inverter telemetry

**Refaktoryzacja**
- validate inverter telemetry TEST values from field metadata

**Do przetestowania ręcznie w Home Assistant**
- Po ponownym pobraniu w HACS sprawdzić załadowanie karty i brak błędów konsoli.
- Sprawdzić edycję właściwości, zapis konfiguracji i ponowne otwarcie projektu.
- Sprawdzić falownik: encje HA, TEST 0/puste, MPPT oraz odczyty SVG.

---

### 0.4.43-dev — od 0.4.43-dev

**Nowe funkcje**
- generate traceable changelog from last GitHub publication

**Dokumentacja, testy i narzędzia**
- verify history-based changelog and safe publisher import

**Do przetestowania ręcznie w Home Assistant**
- Brak zmian w kodzie karty; nie jest wymagany nowy odbiór funkcjonalny HA.
<!-- HASS-STUDIO-CHANGELOG-END -->

## Package layout

- `dist/ha-systems-studio.js` — complete browser-ready card, including bundled SVG illustrations
- `hacs.json` — HACS metadata
- `LICENSE` — applicable MIT license and attribution
- `VERSION` — distribution build version

All files needed by Home Assistant are included in this repository. No source checkout, Python, Node.js or build step is required to install the card.

## License

Distributed under the MIT license (see [LICENSE](LICENSE)). The bundle incorporates licensed material originally from Warmwasser Schema Card; the original license notices are retained.
