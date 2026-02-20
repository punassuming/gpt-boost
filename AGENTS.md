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
- No build step is configured. Load the repo as an unpacked extension.
  - Chrome/Edge/Brave: open `chrome://extensions`, enable Developer mode, “Load unpacked”, select the repo root (with `manifest.json`).
  - Firefox: open `about:debugging#/runtime/this-firefox`, “Load Temporary Add-on…”, pick `manifest.json`.
- `npm test` currently exits with an error placeholder; add a test runner before relying on it.

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

## Security & Privacy Notes
- The extension is privacy-first and should avoid remote data collection or external requests.
- If you change host permissions or data handling, update `privacy-policy.md` and the relevant manifest(s).
