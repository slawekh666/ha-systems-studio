# Versioning and distribution (HACS dashboard card)

The authoritative development version is `VERSION` (currently **0.4.5-dev**). `scripts/build.py` embeds it into the distributed `dist/ha-systems-studio.js`. `scripts/check.py` checks that the package and docs agree with `VERSION`; `node scripts/test_studio.js` covers selected rendering and state logic. The designer header shows the embedded code version.

The GitHub `main` mirror and GitHub Releases serve **different purposes**:

- **Testing the latest `main`:** a developer may select the `main` branch and redownload it in HACS. A Release is not required for this workflow.
- **Versioned updates through HACS:** tag the exact commit and publish a matching **GitHub Release**. A tag on its own is not a published release. The unsupported `version` field must not be added to `hacs.json`.
- **Update information / Uaktualnij dane** refreshes repository metadata. It is not proof that the installed `ha-systems-studio.js` has been replaced. Use **Redownload / Pobierz ponownie** if the card still uses an older bundle, followed by a browser refresh.

## Development workflow

1. Make the changes on a GitLab feature branch. Update `VERSION` when the release number changes, rebuild `dist`, and update the current version in README and this document.
2. Run `python3 scripts/build.py && python3 scripts/check.py && node scripts/test_studio.js`.
3. Inspect the changes and wait for successful GitLab CI; merge the tested branch into GitLab `main`.
4. In the WSL working copy, synchronize `main` with GitLab and push **the same commit** to the `github` remote:

   ```bash
   git switch main
   git pull --ff-only origin main
   git push github main
   git ls-remote github refs/heads/main
   ```

5. Test the actual card in Home Assistant, including SVG visuals, dragging, labels, animations, and read-only safety behavior.

## Publish a versioned GitHub Release

Do this **after successful browser testing**, not just after passing CI.

1. Choose the release number and commit. For an RC, for example, set `VERSION` to `0.4.4-rc.1`; for a stable release, use `0.4.4`. Ensure source, bundle, tests and both documentation version references are updated and CI passes before merging/pushing.
2. On the exact tested and synchronized commit, create and push the matching tag (example for an RC):

   ```bash
   git tag -a v0.4.4-rc.1 -m "Home Assistant Systems Studio v0.4.4-rc.1"
   git push github v0.4.4-rc.1
   ```

3. Publish a **GitHub Release** from that tag at https://github.com/slawekh666/ha-systems-studio/releases/new, include concise release notes, and mark an RC/development build **pre-release**.
4. In HACS refresh repository information, install/update or redownload the intended version, and refresh the browser. Pre-releases may require enabling selection of beta/pre-release versions in HACS.

**Never:** release an untested feature branch, force-push `main`, use `git push --mirror`, or assume GitLab's merge automatically syncs GitHub.

