import hljs from "highlight.js/lib/common";

export function toUnixNewlines(text) {
  return String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function normalizeLanguageTag(value) {
  const raw = String(value || "")
    .toLowerCase()
    .trim()
    .replace(/^language[-:_\s]*/, "")
    .replace(/[`"'()[\]{}:;,.]/g, "")
    .replace(/\s+/g, "");

  if (!raw) return "";

  const aliasMap = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    sh: "bash",
    shell: "bash",
    zsh: "bash",
    csharp: "c#",
    cs: "c#",
    "c++": "cpp",
    yml: "yaml",
    md: "markdown",
    txt: "text",
    plaintext: "text",
    plain: "text"
  };

  return aliasMap[raw] || raw;
}

export function normalizeSnippetHeaderLine(value) {
  return String(value || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function isKnownSnippetLanguageTag(value) {
  const normalized = normalizeLanguageTag(value);
  if (!normalized) return false;

  const known = new Set([
    "bash",
    "shell",
    "yaml",
    "json",
    "ini",
    "toml",
    "xml",
    "html",
    "css",
    "javascript",
    "typescript",
    "python",
    "java",
    "c",
    "cpp",
    "c#",
    "go",
    "rust",
    "php",
    "ruby",
    "sql",
    "dockerfile",
    "makefile",
    "text",
    "markdown",
    "powershell"
  ]);

  if (known.has(normalized)) return true;
  if (normalized === "c#" && hljs.getLanguage("csharp")) return true;
  return !!hljs.getLanguage(normalized);
}

export function stripSnippetLeadingHeaderLines(text, inferredLang) {
  const lines = toUnixNewlines(text).split("\n");
  let normalizedLang = normalizeLanguageTag(inferredLang);
  let guard = 0;

  while (lines.length > 0 && guard < 10) {
    guard += 1;
    const normalizedLine = normalizeSnippetHeaderLine(lines[0]);
    const compactLine = normalizedLine.replace(/[\s`"'()[\]{}:;,.#+-]/g, "");

    if (!normalizedLine) {
      lines.shift();
      continue;
    }

    if (compactLine === "copycode" || compactLine === "copy") {
      lines.shift();
      continue;
    }

    const candidateFromLine = normalizeLanguageTag(normalizedLine);
    const candidateFromCompact = normalizeLanguageTag(compactLine);
    const candidateLang = normalizedLang || candidateFromLine || candidateFromCompact;
    const candidateCompact = candidateLang
      ? candidateLang.replace(/[^a-z0-9#]/g, "")
      : "";

    if (candidateLang && isKnownSnippetLanguageTag(candidateLang) && candidateCompact) {
      const isLanguageOnlyLine =
        compactLine === candidateCompact ||
        compactLine === `language${candidateCompact}` ||
        compactLine === `${candidateCompact}copycode` ||
        compactLine === `${candidateCompact}copy` ||
        compactLine === `${candidateCompact}code` ||
        compactLine === `copy${candidateCompact}`;

      if (isLanguageOnlyLine) {
        if (!normalizedLang) normalizedLang = candidateLang;
        lines.shift();
        continue;
      }
    }

    break;
  }

  return {
    text: lines.join("\n").trimEnd(),
    normalizedLang
  };
}

export function extractTextPreservingNewlines(element) {
  if (!element) return "";
  if (element.isConnected) {
    return element.innerText || element.textContent || "";
  }
  let text = "";
  try {
    const hiddenContainer = document.createElement("div");
    hiddenContainer.style.position = "absolute";
    hiddenContainer.style.left = "-9999px";
    hiddenContainer.style.top = "-9999px";
    hiddenContainer.style.width = "1000px";
    hiddenContainer.style.whiteSpace = "pre-wrap";
    document.body.appendChild(hiddenContainer);
    const clone = element.cloneNode(true);
    hiddenContainer.appendChild(clone);

    text = hiddenContainer.innerText || hiddenContainer.textContent || "";
    document.body.removeChild(hiddenContainer);
  } catch (_error) {
    text = element.textContent || "";
  }
  return text;
}

export function extractCodeSnippetText(pre) {
  if (!(pre instanceof HTMLElement)) return "";

  const codeViewerContent = pre.querySelector("#code-block-viewer .cm-content, .cm-editor .cm-content");
  const codeEl = pre.querySelector("code");
  let rawText = extractTextPreservingNewlines(codeViewerContent);
  if (!rawText || !rawText.trim()) {
    rawText = extractTextPreservingNewlines(codeEl);
  }
  if (!rawText || !rawText.trim()) {
    rawText = extractTextPreservingNewlines(pre);
  }

  let text = toUnixNewlines(rawText);

  text = text
    .replace(/^\n+/, "")
    .replace(/\n+$/, "")
    .replace(/\n{4,}/g, "\n\n\n");
  return text.trim() ? text : "";
}

export function inferCodeLanguage(el, preEl) {
  let lang = "";
  const classCandidates = [];
  if (el instanceof HTMLElement && el.className) classCandidates.push(el.className);
  const nestedCode = el instanceof HTMLElement ? el.querySelector("code") : null;
  if (nestedCode instanceof HTMLElement && nestedCode.className) {
    classCandidates.push(nestedCode.className);
  }
  const classBlob = classCandidates.join(" ");
  const match = classBlob.match(/\blanguage-([a-z0-9_+-]+)/i);
  if (match) {
    lang = match[1].toLowerCase();
  }

  if (!lang && preEl && preEl instanceof HTMLElement) {
    const header = preEl.firstElementChild;
    if (header && header.tagName === "DIV" && !header.querySelector("code")) {
      const span = header.querySelector("span");
      if (span && span.textContent) {
        lang = span.textContent.trim().toLowerCase();
      } else {
        const clone = header.cloneNode(true);
        const btns = clone.querySelectorAll("button");
        btns.forEach((b) => b.remove());
        lang = clone.textContent.trim().toLowerCase();
      }

      if (lang.length > 20 || lang.includes("\n")) {
        lang = "";
      }
    }
  }

  if (!lang && preEl && preEl instanceof HTMLElement) {
    const headerLabel = preEl.querySelector(
      '[id="code-block-viewer"] ~ div [class*="font-medium"], [class*="font-medium"][class*="text-sm"]'
    );
    if (headerLabel instanceof HTMLElement) {
      const labelText = normalizeSnippetHeaderLine(headerLabel.textContent || "");
      const compact = labelText.replace(/[\s`"'()[\]{}:;,.#+-]/g, "");
      const candidate = normalizeLanguageTag(compact || labelText);
      if (candidate && candidate.length <= 20 && isKnownSnippetLanguageTag(candidate)) {
        lang = candidate;
      }
    }
  }

  return lang;
}
