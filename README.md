# GPT Boost

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/finipiejpmpccemiedioehhpgcafnndo?label=Chrome%20Web%20Store&logo=googlechrome&logoColor=white&color=4285F4)](https://chromewebstore.google.com/detail/finipiejpmpccemiedioehhpgcafnndo)
[![Firefox Add-ons](https://img.shields.io/amo/v/chatgpt-speed-booster?label=Firefox%20Add-ons&logo=firefox&logoColor=white&color=FF7139)](https://addons.mozilla.org/en-GB/firefox/addon/chatgpt-speed-booster/)
[![Chrome Web Store Users](https://img.shields.io/chrome-web-store/users/finipiejpmpccemiedioehhpgcafnndo?label=Chrome%20Users&color=4285F4)](https://chromewebstore.google.com/detail/finipiejpmpccemiedioehhpgcafnndo)
[![Firefox Users](https://img.shields.io/amo/users/chatgpt-speed-booster?label=Firefox%20Users&color=FF7139)](https://addons.mozilla.org/en-GB/firefox/addon/chatgpt-speed-booster/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue?logo=googlechrome)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/punassuming/gpt-boost/pulls)

**A fully-featured productivity toolkit for long ChatGPT conversations**

GPT Boost is a **Chrome and Firefox** extension that transforms ChatGPT into a high-performance workspace. It combines intelligent virtual scrolling, a rich sidebar panel with navigation tools, full-text search, bookmarks, minimap, token tracking, per-message actions, and theme controls — all running fully locally in your browser.

## 📥 Download

| Browser | Store Link |
| :--- | :--- |
| **Google Chrome** | [**Download from Chrome Web Store**](https://chromewebstore.google.com/detail/finipiejpmpccemiedioehhpgcafnndo?utm_source=item-share-cb) |
| **Mozilla Firefox** | [**Download from Firefox Add-ons**](https://addons.mozilla.org/en-GB/firefox/addon/chatgpt-speed-booster/) |

---

## ✨ Features

### ⚡ Smart Virtual Scrolling
- **Viewport-aware rendering**: Only mounts messages visible in your viewport
- **Seamless restoration**: Scroll up to instantly restore older messages
- **Zero context loss**: Full conversation history always accessible
- **70–92% DOM reduction**: Keeps DOM node counts low even in very long threads
- **Smooth scrolling**: Scroll position is preserved perfectly during virtualization
- **MutationObserver integration**: Automatically adapts when new messages appear

### 🔍 Full-Text Search
- Search across every message in the conversation
- Live match count and highlighted matches inline
- Navigate results with keyboard shortcuts or arrow buttons
- Sidebar panel with result snippets and role indicators

### 🗺️ Minimap
- Fixed floating panel showing the entire conversation layout
- Color-coded message markers by speaker role (user vs. assistant)
- Draggable viewport indicator for quick navigation
- Auto-positions relative to the visible scroll area

### 🧭 Conversation Map (Sidebar)
- Horizontal track showing all messages proportionally
- Active-message indicator with role badge and text preview
- "Nearby messages" list for quick contextual jumps
- Click any message to scroll directly to it

### 🔖 Bookmarks
- Bookmark any message with a single click
- Dedicated "Bookmarks" section in the sidebar with snippets and metadata
- Pinned messages surfaced in a separate "Pinned" sidebar section
- Persisted across page reloads via extension storage

### 📋 Outline View
- Full list of all conversation messages in the sidebar
- Collapse / expand individual messages
- **Collapse All** / **Expand All** bulk-action buttons
- Pin, bookmark, and collapse controls directly from the outline

### 📌 Pinned Bar
- Sticky bar at the top of the page showing all pinned messages
- Quick unpin button per item; auto-hides when nothing is pinned
- Click any pinned snippet to jump to that message instantly

### 💬 Per-Message Actions
- Hover-revealed action rail on each message card
- Collapse/expand, pin, and bookmark buttons per message
- Collapsed state shows a compact snippet preview instead of full content

### 📦 Download / Export
- Floating download button to export the full conversation
- Exports to well-formatted Markdown with code blocks, headings, and roles preserved
- Handles complex message formats including nested lists and tables

### 🪙 Token Gauge
- Horizontal progress bar at the top of the conversation
- Estimates token usage (≈ 1 token / 4 chars) with color progression green → yellow → red
- Tooltip showing the estimated token count
- Transparent when usage is minimal so it never gets in the way

### 🎨 Themes & Role Styling
- Preset role-based color themes mapped to ChatGPT's light/dark mode
- Customizable user and assistant bubble colors (light and dark variants)
- One-click reset to theme defaults
- Theme tokens cascade through the sidebar and floating surfaces

### 📐 Layout Controls
- Adjustable sidebar width (default 320 px)
- Configurable conversation padding and composer content width
- Keyboard shortcut to toggle the sidebar (default `Alt+Shift+B`, fully customizable)

### 🔧 Virtualization Tuning
- **Buffer Size**: How many pixels above/below the viewport stay mounted (default 2000 px)
- **Scroll Throttle**: Minimum time between scroll-driven updates (default 50 ms)
- **Mutation Debounce**: Delay for batching DOM mutation bursts (default 50 ms)

### 🐛 Debug Mode
- Optional DevTools console logging for all internal extension events
- Logs scroll-container detection, virtualization passes, mutation triggers, URL changes, and node counts


## Installation

### **Option 1 — Install from Web Stores (Recommended)**
Use the links in the [Download](#-download) section above to install the extension automatically for your specific browser.

### **Option 2 — Install Manually (Unpacked)**

If you want to run the extension locally or modify the code, follow the instructions for your browser below.

#### 📦 For Google Chrome (and Edge/Brave)
1. Download or clone this repository:
   ```bash
   git clone https://github.com/punassuming/gpt-boost.git
   ```
2. Open Chrome and navigate to:
   ```
   chrome://extensions
   ```
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked**
5. Select the project folder (the one containing `manifest.json`)
6. Open ChatGPT — the extension will load automatically
7. Use the extension icon in Chrome to open the settings popup

#### 🦊 For Mozilla Firefox
1. Download or clone this repository:
   ```bash
   git clone https://github.com/punassuming/gpt-boost.git
   ```
2. Open Firefox and navigate to:
   ```
   about:debugging#/runtime/this-firefox
   ```
3. Click **Load Temporary Add-on...**
4. Navigate to your project folder and select the `manifest.json` file

You're now running GPT Boost locally, and you can make changes in the code!


## Usage

### Basic Usage
1. Install the extension
2. Open ChatGPT
3. Start a conversation
4. The extension works automatically! 🎉

### Accessing Settings
- Click the extension icon in your Chrome/Firefox toolbar to open the settings popup
- See live stats: total messages, rendered messages, memory saved, and status
- Configure layout, themes, virtualization tuning, and more

### Settings Reference

#### Performance
| Setting | Description | Default |
|---------|-------------|---------|
| **Enable Virtual Scrolling** | Toggle virtualization on/off | ON |
| **Debug Mode** | Log virtualization activity to DevTools console | OFF |

#### Layout
| Setting | Description | Default |
|---------|-------------|---------|
| **Sidebar Width** | Default tools sidebar width | 320 px |
| **Show Minimap** | Enable or hide the standalone minimap | ON |
| **Sidebar Hotkey** | Keyboard shortcut to toggle sidebar | `Alt+Shift+B` |
| **Conversation Padding** | Horizontal padding on conversation content | 16 px |
| **Composer Width** | Chat/composer content width target | 768 px |

#### Virtualization
| Setting | Description | Default |
|---------|-------------|---------|
| **Buffer Size** | Pixel range around viewport to keep messages mounted | 2000 px |
| **Scroll Throttle** | Minimum time between scroll-driven updates | 50 ms |
| **Mutation Debounce** | Delay for batching DOM mutation bursts | 50 ms |

#### Themes & Colors
| Setting | Description |
|---------|-------------|
| **Boost Theme** | Preset role-styling mapped to ChatGPT light/dark mode |
| **User Dark / Agent Dark** | Bubble colors in dark mode |
| **User Light / Agent Light** | Bubble colors in light mode |

### Performance Stats

The popup displays real-time statistics:
- **Total Messages**: Number of messages in the conversation
- **Rendered**: Currently mounted messages
- **Memory Saved**: Percentage of messages virtualized (off-screen)
- **Status**: Extension active / disabled state


## Performance Comparison

| Scenario | Without Extension | With Extension | Improvement |
|----------|------------------|----------------|-------------|
| 100 messages | ~800 DOM nodes | ~250 DOM nodes | **69% reduction** |
| 500 messages | ~4000 DOM nodes | ~300 DOM nodes | **92% reduction** |
| Scroll lag | Noticeable | Smooth | **Significantly better** |
| Memory usage | High | Low | **~60% less** |


## 🔐 Privacy

This extension:
- Collects **no data**
- Sends **nothing** to any server
- Reads/writes only its own local storage (settings)
- Runs **only** on ChatGPT domains (`chat.openai.com` / `chatgpt.com`)

All processing happens **fully locally** in your browser.


## Technical Architecture

### How It Works
ChatGPT normally renders **every message in the DOM at once**, even if they are not visible.  
GPT Boost fixes that by:

1. **Detection**: Scans ChatGPT's DOM structure to identify the message container
2. **Caching**: Stores message content, height, and metadata in memory
3. **Virtualization**: Replaces off-screen messages with height-matched invisible spacers
4. **Restoration**: Recreates messages from cache when scrolled into view
5. **Monitoring**: Watches for new messages via `MutationObserver`

This technique — **virtual scrolling** — is used in high-performance apps like Notion, Discord, Slack, VS Code, and React Virtualized. It makes massive message lists behave like small ones.

### Key Components

```
src/
├── boot.js                          # Entry point — initializes virtualizer and UI
├── background.js                    # Service worker for settings & lifecycle
├── constants.js                     # Shared config constants and runtime state
├── virtualization.js                # Core virtual scrolling logic
├── popup.html / popup.css / popup.js  # Extension popup / options UI
├── core/
│   ├── settings.js                  # Settings defaults, normalization, storage helpers
│   ├── storage.js                   # Extension storage wrappers
│   ├── runtime/                     # Feature registry, lifecycle, article registry
│   ├── services/                    # Typed service container
│   └── virtualizer/                 # Virtualizer store, observer, types
├── ui/
│   ├── features/
│   │   ├── search/                  # Full-text search (feature, index, highlighting, UI)
│   │   ├── minimap/                 # Minimap rendering and interaction
│   │   ├── map/                     # Sidebar conversation map tab (proportional message track)
│   │   ├── bookmarks/               # Bookmark management and sidebar tab
│   │   ├── outline/                 # Outline view with collapse controls
│   │   ├── download/                # Markdown download button
│   │   ├── tokenGauge/              # Token pressure gauge
│   │   ├── articleActions/          # Per-message collapse/pin/bookmark rail
│   │   ├── pinned/                  # Pinned-message top bar
│   │   ├── scroll/                  # Scroll navigation buttons + virtualization indicator
│   │   ├── sidebar/                 # Sidebar shell and settings tab
│   │   ├── snippets/                # Code snippet parsing (codeSnippets.js) and markdown export (markdownExport.js)
│   │   └── settings/                # Settings data helpers and popup telemetry
│   └── shell/
│       ├── theme.ts                 # Theme token logic
│       ├── themeApplier.js          # Runtime theme application
│       ├── layoutSettings.js        # Conversation/composer layout CSS
│       ├── layoutOffsets.js         # Floating-controls/side-layout offset coordination
│       └── floatingControls.js      # Shared floating circular control helpers
└── adapters/
    └── chromeApi.ts                 # Extension API wrappers with fallback behavior
```


## Development

### Building the Extension

```bash
# Install dependencies
npm install

# One-off production build
npm run build

# Watch mode (rebuilds on file changes)
npm run dev
```

### Running Tests

```bash
npm test
# or in restricted environments:
npx jest --runInBand
```

### Firefox Package

```bash
# Build unsigned XPI
npm run build:firefox

# Sign via AMO (requires AMO_JWT_ISSUER and AMO_JWT_SECRET env vars)
npm run sign:firefox
```

### Version Bumping

```bash
npm run version:patch   # x.y.Z
npm run version:minor   # x.Y.0
npm run version:major   # X.0.0
```

### Running the Extension During Development
- Load the extension locally in your browser using the unpacked method above
- Open the browser DevTools console on ChatGPT to see debug logs (if Debug Mode is on)
- Use the popup toggle to enable/disable virtualization at any time
- After code changes, click **Reload** on the Extensions page (Chrome) or re-load the temporary add-on (Firefox)


## Compatibility
- **Browsers**: Chrome, Edge, Brave, Firefox (Manifest V3)
- **OS**: Windows, macOS, Linux
- **ChatGPT**: Optimized for the current ChatGPT UI; resilient to minor DOM changes


## Manifest V3 Compliance

This extension is built with **Manifest V3**, ensuring:
- Service worker instead of persistent background pages
- Minimal permissions (`storage`, `activeTab`)
- No remotely hosted code
- Content Security Policy compliant
- Future-proof for Chrome and Firefox updates


## Migration from ChatGPT Lag Fixer

GPT Boost is the canonical successor to the "ChatGPT Lag Fixer" extension.

- **Branding**: All references to the legacy name are replaced with GPT Boost.
- **Codebase**: Refactored into modular `src/core`, `src/ui`, and `src/adapters` layers.
- **Scope**: Now covers virtualization, navigation, sidebar tools, snippets, minimap, bookmarks, and layout controls — not just lag reduction.
- **Compatibility**: Existing local settings continue to work; no data migration required.


## Troubleshooting

### Extension not working?
1. Check that you're on `chat.openai.com` or `chatgpt.com`
2. Refresh the page after installing or updating
3. Enable Debug Mode and check the DevTools console for errors
4. Try disabling and re-enabling the extension

### Messages not virtualizing?
1. Ensure **Enable Virtual Scrolling** is ON in settings
2. Check that you have more than ~10 messages in the conversation
3. Check the browser console for errors (Debug Mode helps here)

### Scroll position jumping?
1. Disable the extension temporarily to check if ChatGPT itself is the cause
2. Report the issue with reproduction steps

### Sidebar or minimap not appearing?
1. Check the **Show Minimap** toggle in the popup settings
2. Try the sidebar hotkey (`Alt+Shift+B` by default)
3. Refresh the page


## Contributing

Contributions are welcome! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/your-feature`)
3. **Commit your changes** (`git commit -m 'Add your feature'`)
4. **Push to the branch** (`git push origin feature/your-feature`)
5. **Open a Pull Request**

### Areas for Improvement
- [ ] Support for other AI chat interfaces (Claude, Gemini, etc.)


## License

MIT License — feel free to use, modify, and distribute!

---

**Made with ❤️ by [Bram van der Giessen](https://bramgiessen.com) & [Rich Alesi](https://github.com/punassuming)**

⭐ **If you find this useful, please star the repository!**
