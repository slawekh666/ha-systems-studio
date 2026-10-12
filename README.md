# Home Assistant Systems Studio

Custom Home Assistant dashboard card, **derived from [Warmwasser Schema Card](https://github.com/mariofritzer/warmwasser-schema-card)** (MIT license). This repository preserves its code and history; our distribution file is generated from the original JS. Upstream README: `README_UPSTREAM.md`.

## Current status

**0.4.13-dev (development, unreleased):** custom three-pane hydraulic diagram editor, with editable tanks, boilers, solar thermal collectors, pumps, valves, sensors and pipe routes. Includes Warmwasser-style equipment graphics, proportional device scaling, independent sensor-reading size, editable descriptions for sensors and pipe-mounted pumps/valves, and HA native entity history via `hass-more-info`. Boiler animation can use a burner entity or temperature threshold; collector sunlight is based on collector-to-tank temperature difference.

**Important:** the card is still under Home Assistant browser acceptance testing. CI checks packaging, JavaScript syntax and selected logic, but cannot verify final SVG appearance and pointer behavior in HA.

The source of truth for the code version is [`VERSION`](VERSION). A GitHub Release with a matching version tag enables clear HACS release versioning; during development, the current `main` branch can also be selected/redownloaded in HACS. Changing this README **does not update the installed JavaScript**.
See [Release process](docs/RELEASING.md).

The Custom designer now offers a **Modular tank** built from one SVG shell. It supports multiple HA temperature sensors, heaters with decorative halos, perforated horizontal and vertical baffles, gradient-only hygiene coils with optional flow, and an inner tank. Temperature readouts are not calculated from heater visuals. The accessory buttons wrap in the properties panel, and modular tanks support proportional or independent width/height scaling without deforming badges. The hygiene coil is a single connected path (straight inlet plus elliptical spiral). The width and height sliders are always visible and unlock independent scaling when edited. The coil now includes the upper return bend; its blue-to-hot colour follows tube travel distance, with end colour derived from the highest valid tank sensor. Accessory layers follow creation order, with up/down reorder controls. Browser acceptance testing in Home Assistant remains required before a numbered release.

**New:** Custom Studio includes a *Modern wood / coal boiler* preset based on the attached clean stove SVG v3. Its empty furnace can contain wood logs or coal pieces with Warmwasser-style flame/ember animation. Three visual states (burning, embers, extinguished) are selectable manually or automatically from a combustion entity or temperature thresholds. The visualisation never controls heating hardware; the original Warmwasser wood boiler remains unchanged. Home Assistant browser visual testing is still required.

The modern solid-fuel boiler has independent **Width** and **Height** multipliers (50–240%) alongside the unchanged proportional **Scale** slider. These resize the SVG body, display and furnace; the selection outline, preview and caption follow the dimensions. This is limited to the modern wood/coal variant and does not modify other graphics.

**Modern pellet boiler:** based on the supplied clean pellet stove SVG v1 with attached right-hand hopper and feed drive. It is a distinct `pellet_modern` variant and library preset, retaining the existing Warmwasser `pellet` variant. It shares the modern solid-fuel boiler's state logic and Warmwasser flickering flame/ember SVG classes, with pellet bed (instead of logs/coal), temperature display from HA, and the same Scale / Width / Height controls. States may be previewed manually or driven by a combustion entity or temperature thresholds. This renderer never issues HA service calls. Browser-based visual acceptance still required.

**Modern heat pump:** new SVG from the uploaded heat-pump HTML, HA power entity (W/kW), fan speed entity (%/RPM), configurable maximum RPM, and Scale/Width/Height. Missing data is shown as unavailable; an unknown or stopped fan does not rotate. Browser validation required.

**Modern gas boiler:** SVG imported from piec_gazowy_svg_js(1).html, live HA boiler temperature and 0–100% gas burner modulation. Four display bars and scaled blue flame follow modulation; missing modulation or disabled burner switches the decorative flame off. Scale/Width/Height are supported. Read-only display; actual gas consumption is not inferred.

**Modern electric boiler:** imported from `piec_elektryczny_svg_js.html`. HA electrical power (W/kW), water temperature and optional load (%) are shown on the device. Without a load entity, percentage derives from real power divided by configurable rated kW. The 260° yellow-to-red gauge follows the ring independently from the knob. Proportional scale and independent width/height remain. No HA controls or synthetic readings.

## Local build in VS Code + WSL

```bash
python3 scripts/build.py
python3 scripts/check.py
node scripts/test_studio.js
```

The output is `dist/ha-systems-studio.js`, the file HACS installs. The original `warmwasser-schema-card.js` is not overwritten. With Node.js installed, validation also performs `node --check`.

## Repository remotes and update workflow

This project already uses three configured remotes:

- `origin` — GitLab (`slawekh666/ha-systems-studio`), the development source of truth.
- `github` — GitHub (`slawekh666/ha-systems-studio`), used for HACS distribution.
- `upstream` — original Warmwasser repository (fetch only; do not push upstream).

After changes pass CI and are merged into GitLab `main`, sync the exact tested commit from your WSL project directory:

```bash
git switch main
git pull --ff-only origin main
git log -1 --oneline
git push github main
git ls-remote github refs/heads/main
```

Never use `git push --force` or `git push --mirror` for this process. When the GitHub SHA matches the GitLab commit, the source mirror is synchronized, **but HACS may still have an older installed file**. To test the latest development branch, choose `main` in HACS if version selection is available and use **Redownload** / **Pobierz ponownie** (not only **Update information** / **Uaktualnij dane**). Refresh the browser cache afterward.

For a numbered installation update, create a matching Git tag **and publish a GitHub Release** (mark development/RC versions as pre-release). Follow [RELEASING.md](docs/RELEASING.md). Only release versions actually tested in Home Assistant.

## Install with HACS

1. Open **HACS → ⋮ → Custom repositories**.
2. Enter your **public GitHub mirror URL** and choose **Dashboard**.
3. Install **Home Assistant Systems Studio**.
4. If HA doesn't add the resource automatically, add JavaScript module:
   `/hacsfiles/ha-systems-studio/ha-systems-studio.js`
5. Refresh the browser; create a dedicated test dashboard and paste the YAML in `examples/demo.yaml`.
6. To update an existing installation, use **Redownload** / **Pobierz ponownie** in HACS and then reload the dashboard (a hard browser refresh may be needed).

**Do not add an extra resource if HACS has already registered it.** Avoid testing control actions on a working heating system. Default `studio_readonly: true`; only explicit `studio_readonly: false` enables the original click-to-toggle service actions.

## License

Keep the original `LICENSE` file; copyright attribution remains with the original author for upstream code. Future original contributions can be added under MIT unless changed deliberately.
