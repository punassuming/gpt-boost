# GPT Boost (Message Virtualization)

**Productivity-first speed for long ChatGPT conversations**

GPT Boost is a **Chrome and Firefox** extension that uses intelligent message virtualization to keep your ChatGPT tabs fast and responsive, even during long conversations. Unlike simple DOM trimming solutions, this extension dynamically virtualizes messages outside your viewport while seamlessly restoring them as you scroll.

**🔐 Remain fully private**: All processing happens **fully locally** in your browser. **Nothing** is sent to any server.

## 📥 Download

| Browser | Store Link |
| :--- | :--- |
| **Google Chrome** | [**Download from Chrome Web Store**](https://chromewebstore.google.com/detail/finipiejpmpccemiedioehhpgcafnndo?utm_source=item-share-cb) |
| **Mozilla Firefox** | [**Download from Firefox Add-ons**](https://addons.mozilla.org/en-GB/firefox/addon/chatgpt-speed-booster/) |

---

## Features

### Virtualization Core
- **Viewport-aware rendering**: Keeps only nearby messages mounted.
- **Seamless restoration**: Restores unmounted messages as you scroll.
- **Low-overhead scheduling**: Throttled scroll handling + debounced mutation handling.

### Conversation Tools
- **Search**: Floating search and sidebar search views with navigation/highlighting.
- **Marks**: Unified pinned + bookmarked thread management.
- **Outline**: Fast navigation and collapse controls.
- **Map + Minimap**: Position-aware conversation navigation with viewport indicator.
- **Snippets**: Extract and copy code snippets from the conversation.

### Layout & Styling Controls
- **Sidebar width and hotkey** configuration.
- **Conversation padding and composer width** controls.
- **Role color customization** (User/Agent for dark and light themes, with defaults reset).
- **Minimap visibility** toggle.

### Observability & Privacy
- **Live stats** in popup/settings surfaces.
- **Cached conversation diagnostics** (counts and approximate storage size).
- **Fully local processing**: no remote data collection or external API calls.


## Installation

### **Option 1 — Install from Web Stores (Recommended)**
Use the links in the [Download](#-download) section above to install the extension automatically for your specific browser.

### **Option 2 — Install Manually (Unpacked)**

If you want to run the extension locally or modify the code, follow the instructions for your browser below.

#### 📦 For Google Chrome (and Edge/Brave)
1. Download or clone this repository:
   ```bash
   git clone https://github.com/yourusername/gpt-boost.git
   ```
2. Open Chrome and navigate to:
    ```bash
   chrome://extensions
   ```
3. Enable Developer mode (toggle in the top-right corner)
4. Click Load unpacked
5. Select the project folder (the one containing manifest.json)
6. Open ChatGPT — the extension will load automatically
7. Use the extension icon in Chrome to open the settings popup

#### 🦊 For Mozilla Firefox
1. Download or clone this repository:
   ```bash
   git clone https://github.com/yourusername/gpt-boost.git
   ```
2. Open Firefox and navigate to:
    ```bash
   about:debugging#/runtime/this-firefox
   ```
3. Click Load Temporary Add-on...
4. Navigate to your project folder and select the manifest.json file

You're now running GPT Boost locally, and you can make changes in the code!


## Technical Architecture

### How It Works
ChatGPT normally renders **every message in the DOM at once**, even if they are not visible.  
This extension fixes that by:

1. **Detection**: Scans ChatGPT's DOM structure to identify the message container
2. **Caching**: Stores message content, height, and metadata in memory
3. **Virtualization**: Replaces off-screen messages with height-matched placeholders
4. **Restoration**: Recreates messages from cache when scrolled into view
5. **Monitoring**: Watches for new messages via MutationObserver

This technique — **virtual scrolling** — is commonly used in high-performance apps like:

- Notion  
- Discord  
- Slack  
- VS Code  
- React Virtualized  

It makes massive message lists behave like small ones.

### Key Components

```
├── manifest*.json                    # Browser manifests (Chromium + Firefox)
├── src/boot.js                       # Content-script bootstrap + storage listeners
├── src/virtualization.js             # Main orchestrator (still being modularized)
├── src/constants.js                  # Global runtime config + state bootstrap
├── src/core/settings.js              # Settings defaults/normalizers/storage helpers
├── src/core/storage.js               # Conversation cache + pin/bookmark persistence
├── src/core/virtualizer/             # Core store/observer/types
├── src/ui/shell/theme.ts             # Theme mode/tokens
├── src/ui/features/roleStyles.ts     # Role chip/surface styling rules
├── src/ui/features/search/           # Search feature + highlighting helpers
├── src/ui/features/minimap/          # Minimap UI + geometry helpers
├── src/ui/features/map/              # Sidebar map tab feature
├── src/ui/features/bookmarks/        # Sidebar-only marks/bookmarks feature
├── src/ui/features/outline/          # Outline tab render + collapse controls
├── src/ui/features/download/         # Markdown download button lifecycle
├── src/ui/features/sidebar/          # Sidebar shell + settings/snippets tab renderers
├── src/ui/features/snippets/         # Snippet extraction + markdown export
├── src/popup.html/css/js             # Popup + options UI (shared page)
├── src/background.js                 # Service worker
└── src/adapters/chromeApi.ts         # Extension API wrappers/fallbacks
```


## Development Notes

### Running the extension during development:
- Install dependencies: `npm install`
- Build once: `npm run build`
- Build in watch mode: `npm run dev`
- Build Firefox package: `npm run build:firefox`
- Regenerate extension icons from `icons/gpt-boost.png`: `npm run icons:generate`
- Load unpacked extension and reload after changes.

### Testing
- Run test suite: `npm test`
- In restricted/sandboxed environments where process spawning is blocked, run:
  - `npx jest --runInBand`

### Settings Architecture (Developer Notes)
- Shared settings defaults and normalization live in `src/core/settings.js`.
- `boot.js` is responsible for loading persisted settings from extension storage and applying runtime updates on storage changes.
- In-chat sidebar settings and toolbar popup/options settings should remain parity UI: when adding a new setting, update both surfaces in the same change.
- Persisted message-level state (pins/bookmarks by conversation) is separate from global UI settings and lives in `src/core/storage.js`.
- If you add a new persisted setting:
  - Add default + normalization in `src/core/settings.js`
  - Apply runtime behavior in `src/boot.js` and `src/virtualization.js`
  - Expose controls in both sidebar settings and popup/options UI
  - Validate with `npm run build` and `npm run build:firefox`

### Modularization Status and Next Targets
- Recent extractions moved search, minimap, and map behavior into `src/ui/features/*`.
- `src/virtualization.js` remains the primary orchestration layer and largest file.
- Next high-value extraction targets:
  - Per-message action rail and collapse/pin/bookmark injection lifecycle
  - Remaining sidebar tab renderers (`outline`/`settings`) into dedicated feature modules
  - Bookmarks/marks controls integration cleanup with sidebar-only architecture

### Firefox signing (unlisted/private)
- Run `npm run amo:login` to open the AMO API keys page (use your Developer Hub login).
- The script will save credentials to `.env` (gitignored), or you can set `AMO_JWT_ISSUER` / `AMO_JWT_SECRET` manually.
- Ensure dependencies are installed with `npm install` (this provides the local `web-ext` binary).

### Automated Firefox release signing (GitHub Actions)
- Workflow: `.github/workflows/release-firefox.yml`
- Trigger: push a tag like `v1.0.4` (also supports manual `workflow_dispatch`).
- Required repository secrets:
  - `AMO_JWT_ISSUER`
  - `AMO_JWT_SECRET`
- Output: signs via AMO and uploads the signed `.xpi` from `web-ext-artifacts/` to the GitHub Release for that tag.

### Merge-to-main automated release pipeline
- Workflow: `.github/workflows/bump-manifest-version.yml`
- Trigger: when a PR targeting `main` is closed and merged.
- Version bump behavior on merge:
  - default: patch bump (e.g. `1.2.3` -> `1.2.4`)
  - optional label `semver:minor`: minor bump (e.g. `1.2.3` -> `1.3.0`)
  - optional label `semver:major`: major bump (e.g. `1.2.3` -> `2.0.0`)
- It performs this chain automatically after merge:
  - bumps `package.json`, `manifest.json`, and `manifest_firefox.json`
  - commits the bump to `main`
  - creates and pushes tag `v<new-version>`
  - builds/signs the Firefox extension
  - creates/updates the GitHub Release and uploads the signed `.xpi`

### PR CI checks on `main`
- Workflow: `.github/workflows/pr-ci.yml` (`PR Build Checks`)
- Trigger: PR opened/updated/reopened against `main`.
- Checks:
  - validates version lock-step across `package.json`, `manifest.json`, and `manifest_firefox.json`
  - installs dependencies
  - runs `npm run build:firefox`

### Debug mode
The popup includes an optional "Debug mode" that logs internal states such as:
- Scroll container detection
- Virtualization passes
- Nodes rendered / unrendered
- URL changes
- Mutation observer triggers


## 🔐 Privacy

This extension:
- Collects **no data**
- Sends **nothing** to any server
- Reads/writes only its own local storage (settings)
- Runs **only** on ChatGPT domains (`chat.openai.com` / `chatgpt.com`)

All processing happens **fully locally** in your browser.

## Usage

### Basic Usage
1. Install the extension
2. Open ChatGPT
3. Start a conversation
4. The extension works automatically! 🎉

### Accessing Settings
- Toolbar popup/options page: global controls, stats, cached conversation diagnostics.
- In-chat sidebar `Settings` tab: same core controls without leaving the chat context.

### Settings Explained

| Setting | Description | Default |
|---------|-------------|---------|
| **Enable Virtual Scrolling** | Toggle virtualization on/off | ON |
| **Debug Mode** | Show console logs for debugging | OFF |
| **Buffer Size (marginPx)** | Virtualization buffer around viewport | 2000 |
| **Scroll Throttle** | Min ms between scroll virtualization updates | 50 |
| **Mutation Debounce** | Debounce for mutation-driven refreshes | 50 |
| **Sidebar Width** | Default tools sidebar width (px) | 320 |
| **Show Minimap** | Show/hide standalone minimap | ON |
| **Sidebar Hotkey** | Keyboard shortcut to toggle sidebar | `Alt+Shift+B` |
| **Conversation Padding** | Horizontal thread content padding (px) | 16 |
| **Composer Width** | Target composer/content width (px) | 768 |
| **Role Colors** | User/Agent colors for dark/light themes | Theme defaults |

### Performance Stats

The popup and sidebar settings display real-time statistics:
- **Total Messages**: Number of messages in conversation
- **Rendered**: Currently rendered messages
- **Memory Saved**: Percentage of messages virtualized
- **Status**: Extension active/disabled state

## Performance Comparison

| Scenario | Without Extension | With Extension | Improvement |
|----------|------------------|----------------|-------------|
| 100 messages | ~800 DOM nodes | ~250 DOM nodes | **69% reduction** |
| 500 messages | ~4000 DOM nodes | ~300 DOM nodes | **92% reduction** |
| Scroll lag | Noticeable | Smooth | **Significantly better** |
| Memory usage | High | Low | **~60% less** |


## Compatibility
- Browser: Chrome, Firefox (Manifest V3 with background scripts)
- OS: Windows, macOS, Linux
- ChatGPT: Optimized for current UI (as of 2026), resilient to minor changes


## Contributing

Contributions are welcome! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/your-feature`)
3. **Commit your changes** (`git commit -m 'Add your feature'`)
4. **Push to the branch** (`git push origin feature/your-feature`)
5. **Open a Pull Request**

### Areas for Improvement
- [ ] Support for other AI chat interfaces (Claude, Gemini, etc.)


## Manifest V3 Compliance

This extension is built with **Manifest V3**, ensuring:
- Service worker instead of background pages
- Minimal permissions
- No remotely hosted code
- Content Security Policy compliant
- Future-proof for Chrome/Firefox updates

## Troubleshooting

### Extension not working?
1. Check that you're on `chat.openai.com` or `chatgpt.com`
2. Refresh the page after installing/updating
3. Enable debug mode and check console for errors
4. Try disabling and re-enabling the extension

### Messages not virtualizing?
1. Ensure "Enable Virtual Scrolling" is ON in settings
2. Check that you have enough messages (>10) in conversation
3. Check browser console for errors

### Scroll position jumping?
1. Disable extension temporarily to see if ChatGPT is the issue
2. Report the issue with reproduction steps

## License

MIT License - feel free to use, modify, and distribute!

---

**Made with ❤️ by [Bram van der Giessen](https://bramgiessen.com) and [Rich Alesi](https://github.com/punassuming)**

⭐ **If you find this useful, please star the repository!**
