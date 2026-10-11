# Home Assistant Systems Studio

Custom Home Assistant dashboard card, **derived from [Warmwasser Schema Card](https://github.com/mariofritzer/warmwasser-schema-card)** (MIT license). This repository preserves its code and history; our distribution file is generated from the original JS. Upstream README: `README_UPSTREAM.md`.

## Current status

`0.1.0-dev`: working upstream card rebranded to `custom:ha-systems-studio`, separate visual editor; default **read-only** for service actions. The drag-and-drop hydraulic editor is **not implemented yet**.

## Local build in VS Code + WSL

```bash
python3 scripts/build.py
python3 scripts/check.py
```

The output is `dist/ha-systems-studio.js`, the file HACS installs. The original `warmwasser-schema-card.js` is not overwritten. With Node.js installed, validation also performs `node --check`.

## Git remotes / development

```bash
git remote -v # upstream -> author's GitHub
# First create an EMPTY project on your GitLab account; do not initialize README.
git remote add origin https://gitlab.com/slawekh666/ha-systems-studio.git
git add .
git commit -m "chore: bootstrap Home Assistant Systems Studio from Warmwasser"
git push -u origin main
```

A **public GitHub mirror is necessary for HACS** (HACS does not support GitLab URLs). After creating a free GitHub account and an **empty public** GitHub repo `ha-systems-studio`:

```bash
git remote add github https://github.com/YOUR_GITHUB_LOGIN/ha-systems-studio.git
git push -u github main
```

After you update code, build and test first, commit `dist/ha-systems-studio.js`, then push to `origin` (GitLab) and `github` (HACS distribution). For initial testing, HACS uses the default branch, so a GitHub release is not mandatory.

## Install with HACS

1. Open **HACS → ⋮ → Custom repositories**.
2. Enter your **public GitHub mirror URL** and choose **Dashboard**.
3. Install **Home Assistant Systems Studio**.
4. If HA doesn't add the resource automatically, add JavaScript module:
   `/hacsfiles/ha-systems-studio/ha-systems-studio.js`
5. Refresh browser; create a dedicated test dashboard and paste the YAML in `examples/demo.yaml`.

**Do not add an extra resource if HACS has already registered it.** Avoid testing control actions on a working heating system. Default `studio_readonly: true`; only explicit `studio_readonly: false` enables the original click-to-toggle service actions.

## License

Keep the original `LICENSE` file; copyright attribution remains with the original author for upstream code. Future original contributions can be added under MIT unless changed deliberately.
