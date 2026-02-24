import hljs from "highlight.js/lib/common";
import { extractCodeSnippetText, inferCodeLanguage, stripSnippetLeadingHeaderLines } from "../snippets/codeSnippets.js";

function ensureHighlightJsStyles() {
  if (document.getElementById("gpt-boost-hljs-style")) return;
  const style = document.createElement("style");
  style.id = "gpt-boost-hljs-style";
  style.textContent = `
    .hljs{color:#c9d1d9;background:transparent}
    .hljs-doctag,.hljs-keyword,.hljs-meta .hljs-keyword,.hljs-template-tag,.hljs-template-variable,.hljs-type,.hljs-variable.language_{color:#ff7b72}
    .hljs-title,.hljs-title.class_,.hljs-title.class_.inherited__,.hljs-title.function_{color:#d2a8ff}
    .hljs-attr,.hljs-attribute,.hljs-literal,.hljs-meta,.hljs-number,.hljs-operator,.hljs-variable,.hljs-selector-attr,.hljs-selector-class,.hljs-selector-id{color:#79c0ff}
    .hljs-regexp,.hljs-string,.hljs-meta .hljs-string{color:#a5d6ff}
    .hljs-built_in,.hljs-symbol{color:#ffa657}
    .hljs-comment,.hljs-code,.hljs-formula{color:#8b949e}
    .hljs-name,.hljs-quote,.hljs-selector-tag,.hljs-selector-pseudo{color:#7ee787}
    .hljs-subst{color:#c9d1d9}
    .hljs-section{color:#1f6feb;font-weight:700}
    .hljs-bullet{color:#f2cc60}
    .hljs-emphasis{color:#c9d1d9;font-style:italic}
    .hljs-strong{color:#c9d1d9;font-weight:700}
    .hljs-addition{color:#aff5b4;background-color:#033a16}
    .hljs-deletion{color:#ffd8d3;background-color:#67060c}
  `;
  document.head.appendChild(style);
}

export function renderSidebarSnippetsTab({
  container,
  theme,
  articleMap,
  snippetMaxHeightPx,
  onJumpToMessage
}) {
  ensureHighlightJsStyles();

  const searchRow = document.createElement("div");
  searchRow.style.display = "flex";
  searchRow.style.marginBottom = "8px";

  const snippetSearchInput = document.createElement("input");
  snippetSearchInput.type = "text";
  snippetSearchInput.placeholder = "Filter code snippets...";
  snippetSearchInput.style.flex = "1";
  snippetSearchInput.style.height = "28px";
  snippetSearchInput.style.borderRadius = "6px";
  snippetSearchInput.style.border = `1px solid ${theme.inputBorder}`;
  snippetSearchInput.style.background = theme.inputBg;
  snippetSearchInput.style.color = theme.text;
  snippetSearchInput.style.padding = "0 8px";
  snippetSearchInput.style.fontSize = "11px";
  snippetSearchInput.style.fontFamily = "inherit";

  searchRow.appendChild(snippetSearchInput);
  container.appendChild(searchRow);

  const listContainer = document.createElement("div");
  listContainer.style.display = "flex";
  listContainer.style.flexDirection = "column";
  listContainer.style.gap = "12px";
  listContainer.style.overflowY = "auto";
  listContainer.style.flex = "1";
  listContainer.style.minHeight = "0";
  listContainer.style.paddingRight = "4px";

  const snippets = [];
  const sortedEntries = Array.from(articleMap.entries())
    .sort((a, b) => Number(a[0]) - Number(b[0]));

  sortedEntries.forEach(([id, node]) => {
    const pres = node.querySelectorAll("pre");
    pres.forEach((pre, i) => {
      const codeEl = pre.querySelector("code");
      const source = codeEl || pre;
      let text = extractCodeSnippetText(pre);
      if (!text) return;

      let lang = inferCodeLanguage(source, pre);
      const cleaned = stripSnippetLeadingHeaderLines(text, lang);
      text = cleaned.text;
      if (!lang && cleaned.normalizedLang) {
        lang = cleaned.normalizedLang;
      }
      if (!text) return;

      const lines = text.split("\n");
      let titleLine = lines.find((line) => line.trim().length > 0) || "";
      titleLine = titleLine.trim();
      if (titleLine.length > 45) {
        titleLine = titleLine.substring(0, 42) + "...";
      }

      let rawLang = lang;
      lang = lang ? (lang.charAt(0).toUpperCase() + lang.slice(1)) : "Code";

      snippets.push({ text, messageId: id, lang, rawLang, titleLine, index: i });
    });
  });

  if (!snippets.length) {
    const empty = document.createElement("div");
    empty.style.fontSize = "13px";
    empty.style.opacity = "0.6";
    empty.style.textAlign = "center";
    empty.style.padding = "20px";
    empty.textContent = "No code snippets found.";
    listContainer.appendChild(empty);
    container.appendChild(listContainer);
    return;
  }

  const snippetElements = [];

  snippets.forEach(({ text, messageId, lang, rawLang, titleLine }) => {
    const wrapper = document.createElement("div");
    wrapper.style.borderRadius = "8px";
    wrapper.style.border = `1px solid ${theme.panelBorder}`;
    wrapper.style.overflow = "hidden";
    wrapper.style.background = theme.inputBg;
    wrapper.style.display = "flex";
    wrapper.style.flexDirection = "column";
    wrapper.style.minWidth = "0";
    wrapper.style.flexShrink = "0";

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.justifyContent = "space-between";
    header.style.padding = "6px 10px";
    header.style.background = theme.buttonMutedBg;
    header.style.borderBottom = `1px solid ${theme.panelBorder}`;

    const info = document.createElement("span");
    info.style.fontSize = "11px";
    info.style.fontWeight = "600";
    info.style.color = theme.mutedText;
    info.style.whiteSpace = "nowrap";
    info.style.overflow = "hidden";
    info.style.textOverflow = "ellipsis";

    const langSpan = document.createElement("span");
    langSpan.style.color = theme.text;
    langSpan.textContent = lang;
    info.appendChild(langSpan);

    if (titleLine) {
      const titleSpan = document.createElement("span");
      titleSpan.style.opacity = "0.6";
      titleSpan.style.marginLeft = "6px";
      titleSpan.textContent = titleLine;
      info.appendChild(titleSpan);
    }

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.gap = "6px";

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.textContent = "Copy";
    copyBtn.style.fontSize = "10px";
    copyBtn.style.padding = "2px 8px";
    copyBtn.style.borderRadius = "4px";
    copyBtn.style.border = "none";
    copyBtn.style.cursor = "pointer";
    copyBtn.style.background = theme.buttonBg;
    copyBtn.style.color = theme.buttonText;
    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.textContent = "Copied!";
        setTimeout(() => { copyBtn.textContent = "Copy"; }, 2000);
      });
    });

    const jumpBtn = document.createElement("button");
    jumpBtn.type = "button";
    jumpBtn.textContent = "Jump";
    jumpBtn.style.fontSize = "10px";
    jumpBtn.style.padding = "2px 8px";
    jumpBtn.style.borderRadius = "4px";
    jumpBtn.style.border = "none";
    jumpBtn.style.cursor = "pointer";
    jumpBtn.style.background = theme.buttonMutedBg;
    jumpBtn.style.color = theme.text;
    jumpBtn.addEventListener("click", () => onJumpToMessage(messageId));

    actions.appendChild(copyBtn);
    actions.appendChild(jumpBtn);
    header.appendChild(info);
    header.appendChild(actions);

    const pre = document.createElement("pre");
    pre.style.display = "block";
    pre.style.margin = "0";
    pre.style.padding = "10px";
    pre.style.fontSize = "11px";
    pre.style.lineHeight = "1.45";
    pre.style.fontFamily = "Consolas, Monaco, 'Andale Mono', monospace";
    pre.style.overflowX = "auto";
    pre.style.maxHeight = `${snippetMaxHeightPx}px`;
    pre.style.whiteSpace = "pre";
    pre.style.color = theme.text;
    pre.style.background = "transparent";
    pre.style.flexShrink = "0";

    const code = document.createElement("code");
    code.style.display = "block";
    code.style.whiteSpace = "pre";
    code.style.color = "inherit";
    code.style.fontFamily = "inherit";
    if (typeof rawLang === "string" && rawLang && hljs.getLanguage(rawLang)) {
      try {
        code.innerHTML = hljs.highlight(text, { language: rawLang, ignoreIllegals: true }).value;
        code.classList.add("hljs");
      } catch (_error) {
        code.textContent = text;
      }
    } else {
      try {
        code.innerHTML = hljs.highlightAuto(text).value;
        code.classList.add("hljs");
      } catch (_error) {
        code.textContent = text;
      }
    }
    pre.appendChild(code);

    wrapper.appendChild(header);
    wrapper.appendChild(pre);
    listContainer.appendChild(wrapper);

    snippetElements.push({ el: wrapper, text: text.toLowerCase() });
  });

  container.appendChild(listContainer);

  snippetSearchInput.addEventListener("input", (event) => {
    const query = event.target.value.toLowerCase().trim();
    snippetElements.forEach((item) => {
      if (!query || item.text.includes(query)) {
        item.el.style.display = "flex";
      } else {
        item.el.style.display = "none";
      }
    });
  });
}
