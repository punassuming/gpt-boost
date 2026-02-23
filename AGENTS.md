# Repository Guidelines

## Project Structure & Module Organization
- `src/` holds the extension logic.
  - `src/boot.js` initializes the content script and wiring.
  - `src/virtualization.js` contains the core virtual scrolling logic.
  - `src/constants.js` defines shared config/state on `window.ChatGPTVirtualScroller`.
  - `src/background.js` is the service worker.
  - `src/popup.html`, `src/popup.css`, `src/popup.js` implement the popup UI.
- `manifest.json` is the Chromium manifest; `manifest_firefox.json` targets Firefox.
- `icons/` contains extension assets.
- `README.md` and `privacy-policy.md` document usage and privacy.

## Build, Test, and Development Commands
- Install dependencies: `npm install` (or `npm ci` when lockfile is present and authoritative).
- Build Firefox package locally: `npm run build:firefox`.
  - Produces a build directory and unsigned XPI under `dist/` using timestamped names.
  - Stable overwrite mode (no new timestamped artifact names): `npm run build:firefox -- --stable`
    or set `FIREFOX_BUILD_STABLE=1` for `npm run build:firefox`.
  - Stable mode outputs `dist/firefox-build/` and `dist/gpt-boost-firefox-build.xpi`.
- Sign Firefox package locally (AMO unlisted flow): `npm run sign:firefox`.
  - Requires `AMO_JWT_ISSUER` and `AMO_JWT_SECRET` in environment or `.env`.
  - Signed artifacts are downloaded under `web-ext-artifacts/`.
- Version bump helpers (lock-step across `package.json`, `manifest.json`, `manifest_firefox.json`):
  - `npm run version:patch`
  - `npm run version:minor`
  - `npm run version:major`
- Chrome/Edge/Brave local dev: open `chrome://extensions`, enable Developer mode, “Load unpacked”, select repo root (with `manifest.json`).
- Firefox local dev: open `about:debugging#/runtime/this-firefox`, “Load Temporary Add-on…”, pick `manifest.json`.
- `npm test` currently exits with an error placeholder; add a test runner before relying on it.

## CI/CD Automation
- PR CI workflow: `.github/workflows/pr-ci.yml`
  - Runs on PRs targeting `main`.
  - Workflow name in GitHub Actions UI: `PR Build Checks`.
  - Enforces version lock-step across `package.json`, `manifest.json`, and `manifest_firefox.json`.
  - Runs Firefox build validation with `npm run build:firefox`.
- Merge-to-main release pipeline: `.github/workflows/bump-manifest-version.yml`
  - Runs when PRs to `main` are merged.
  - Auto-bumps on merge: default is patch; optional labels at merge-time can set `semver:minor` or `semver:major`.
  - Bumps `package.json`, `manifest.json`, and `manifest_firefox.json` in lock-step, commits to `main`, creates tag `v<version>`, builds/signs Firefox extension, and publishes a GitHub Release with signed XPI.
- Tag/manual release workflow: `.github/workflows/release-firefox.yml`
  - Runs on tag push `v*` or manual dispatch.
  - Builds/signs and publishes signed XPI on the corresponding GitHub Release.
- Beta PR build workflow: `.github/workflows/beta-pr-build.yml`
  - Workflow name in GitHub Actions UI: `Beta PR Build`.
  - Triggered by a PR review **approval** targeting `main` — does NOT fire on every push, preventing unnecessary AMO signing calls.
  - Can be re-triggered after new commits by adding the `beta-build` label to the PR (remove and re-add to fire again).
  - On approval or label: patches manifests with a beta version (`{base}.{run_number}`), signs the Firefox extension via AMO, and publishes/updates a GitHub pre-release tagged `beta-pr-{number}`.
  - On PR close/merge: automatically deletes the pre-release and its tag.
  - Concurrency group `beta-pr-{number}` cancels stale in-progress runs if multiple triggers arrive rapidly.
  - Requires the same `AMO_JWT_ISSUER` and `AMO_JWT_SECRET` secrets as the release pipelines.
  - Note: fork PRs will not have access to AMO secrets; the signing step will fail for untrusted forks.
- Required GitHub secrets for signing workflows:
  - `AMO_JWT_ISSUER`
  - `AMO_JWT_SECRET`

## Coding Style & Naming Conventions
- JavaScript uses 2-space indentation and semicolons; follow the surrounding file’s string quote style.
- Keep the module pattern: IIFEs plus the `window.ChatGPTVirtualScroller` namespace.
- Prefer descriptive, action-oriented names; config constants live in `src/constants.js` and use `UPPER_SNAKE_CASE` (for example, `DEFAULT_MARGIN_PX`).
- If you add new DOM selectors or tuning knobs, define them in `src/constants.js` and reuse them.

## Testing Guidelines
- There is no automated test suite yet. Validate changes manually:
  - Load the unpacked extension, open ChatGPT, and scroll through a long thread.
  - Use the popup stats (rendered vs total messages) to confirm virtualization.
  - Toggle debug mode to inspect logs when troubleshooting.
- If you touch UI, verify in both Chrome and Firefox.

## Commit & Pull Request Guidelines
- Commit history favors short, imperative summaries; occasional conventional prefixes like `fix:` appear. Keep messages concise and scoped.
- Branch naming in the README uses `feature/your-feature`; follow that pattern for new work.
- PRs should include a clear description, manual test notes, and screenshots/GIFs for popup/UI changes.
- When the user explicitly says code is ready to check in, stage intended tracked changes and create a commit in the current branch.
- Do not commit generated artifacts or local caches unless the user explicitly requests them.

## Security & Privacy Notes
- The extension is privacy-first and should avoid remote data collection or external requests.
- If you change host permissions or data handling, update `privacy-policy.md` and the relevant manifest(s).

## Agent Maintenance Rule
- Keep `AGENTS.md` up to date whenever agentic workflows, scripts, release automation, CI behavior, or required secrets/labels change.
- In any PR that changes automation behavior (`scripts/` or `.github/workflows/`), update `AGENTS.md` in the same PR.
