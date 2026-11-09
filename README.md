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

Installed development build: **0.4.43-dev**.

## Historia aktualizacji

<!-- HASS-STUDIO-CHANGELOG-BEGIN -->
<!-- HASS-STUDIO-SOURCE: 6425ddb1c5a13a8c0b6b16efd60a5d138ac84387 -->

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
