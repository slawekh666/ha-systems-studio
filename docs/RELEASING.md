# Versioning for HACS Dashboard card

The code version is set in root `VERSION` (currently `0.4.0-dev`) and embedded into the bundled `dist/ha-systems-studio.js` by `scripts/build.py`.
`scripts/check.py` verifies that the generated bundle agrees with the version source.
The visual designer displays the same version in its heading.

**For HACS:** publish a GitHub Release with a tag `v0.4.0`; the tag alone or a change to `hacs.json` is not enough. The `version` property is not supported in `hacs.json` for Dashboard plugins.

## Release process (only after successful HA browser testing)

1. Merge the tested feature branch into GitLab `main`.
2. Edit `VERSION` to the final version, e.g. `0.4.0`.
3. Run `python3 scripts/build.py && python3 scripts/check.py` and commit both `VERSION` and `dist/ha-systems-studio.js`.
4. Push GitLab `main`; wait for passing CI; push the *same commit* to GitHub `main`.
5. Tag the exact release commit and push it to GitHub:

   ```bash
   git tag -a v0.4.0 -m "Home Assistant Systems Studio v0.4.0"
   git push github v0.4.0
   ```

6. Publish a GitHub **Release** on https://github.com/slawekh666/ha-systems-studio/releases/new using the existing `v0.4.0` tag. Include a changelog.
7. In HA/HACS, choose **Update information**, then download the release; force-refresh the browser if it cached the old JS.

For pre-release distribution, use a matching tag and VERSION (such as `0.4.0-rc.1` and `v0.4.0-rc.1`) and mark the GitHub Release as a pre-release. HACS may need pre-release support enabled.

Initial installs made from `main` before publishing GitHub releases can show a branch/commit label as the old version. Once subsequent releases are published, HACS can compare readable versions e.g. `v0.4.0` → `v0.4.1`.

Never release an untested feature branch. Never use `git push --mirror`.
