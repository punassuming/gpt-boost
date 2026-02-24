import {
  extractTextPreservingNewlines,
  toUnixNewlines,
  inferCodeLanguage
} from './codeSnippets.js';

export function createMarkdownExportFeature({ state }) {
  function convertDomToMarkdown(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return "";
    }

    const tagName = node.tagName.toLowerCase();

    if (tagName === "pre") {
      const codeEl = node.querySelector("code");
      const source = codeEl || node;
      const rawText = extractTextPreservingNewlines(source);
      const codeText = toUnixNewlines(rawText).trimEnd();
      const lang = inferCodeLanguage(source);
      return `\n\n\`\`\`${lang}\n${codeText}\n\`\`\`\n\n`;
    }

    if (["p", "div", "h1", "h2", "h3", "h4", "h5", "h6"].includes(tagName)) {
      let prefix = "";
      if (tagName === "h1") prefix = "# ";
      else if (tagName === "h2") prefix = "## ";
      else if (tagName === "h3") prefix = "### ";
      else if (tagName === "h4") prefix = "#### ";
      else if (tagName === "h5") prefix = "##### ";
      else if (tagName === "h6") prefix = "###### ";

      const content = Array.from(node.childNodes).map(convertDomToMarkdown).join("");
      if (!content.trim()) return "";
      return `\n\n${prefix}${content.trim()}\n\n`;
    }

    if (tagName === "ul" || tagName === "ol") {
      const content = Array.from(node.childNodes).map(convertDomToMarkdown).join("");
      return `\n${content}\n`;
    }
    if (tagName === "li") {
      const content = Array.from(node.childNodes).map(convertDomToMarkdown).join("");
      const parentTag = node.parentElement ? node.parentElement.tagName.toLowerCase() : "ul";
      const prefix = parentTag === "ol" ? "1. " : "- ";
      return `\n${prefix}${content.trim()}`;
    }

    if (tagName === "strong" || tagName === "b") {
      return `**${Array.from(node.childNodes).map(convertDomToMarkdown).join("")}**`;
    }
    if (tagName === "em" || tagName === "i") {
      return `*${Array.from(node.childNodes).map(convertDomToMarkdown).join("")}*`;
    }
    if (tagName === "code") {
      return `\`${Array.from(node.childNodes).map(convertDomToMarkdown).join("")}\``;
    }
    if (tagName === "a") {
      const href = node.getAttribute("href");
      const text = Array.from(node.childNodes).map(convertDomToMarkdown).join("");
      return `[${text}](${href})`;
    }
    if (tagName === "br") return "\n";
    if (tagName === "hr") return "\n---\n";

    return Array.from(node.childNodes).map(convertDomToMarkdown).join("");
  }

  function extractMarkdownPartsFromMessage(messageRoot) {
    const markdown = convertDomToMarkdown(messageRoot);
    const cleanMarkdown = markdown.replace(/\n{3,}/g, "\n\n").trim();
    return [cleanMarkdown];
  }

  function downloadMarkdown() {
    const sortedEntries = Array.from(state.articleMap.entries())
      .sort((a, b) => Number(a[0]) - Number(b[0]));

    if (!sortedEntries.length) return;

    const lines = [
      "# ChatGPT Conversation\n",
      `> Exported: ${new Date().toLocaleString()} \n`,
      "---"
    ];

    sortedEntries.forEach(([, node]) => {
      const roleEl = node.querySelector("[data-message-author-role]");
      const rawRole = roleEl ? (roleEl.getAttribute("data-message-author-role") || "unknown") : "unknown";
      const displayRole = rawRole.charAt(0).toUpperCase() + rawRole.slice(1);
      const messageRoot = roleEl || node;
      if (!(messageRoot instanceof HTMLElement)) return;

      const contentParts = extractMarkdownPartsFromMessage(messageRoot);
      if (!contentParts.length) return;

      lines.push(`\n## ${displayRole} \n`);
      lines.push(contentParts.join("\n\n"));
      lines.push("\n---");
    });

    const content = lines.join("\n");
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chatgpt - ${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  return {
    downloadMarkdown,
    convertDomToMarkdown,
    extractMarkdownPartsFromMessage
  };
}
