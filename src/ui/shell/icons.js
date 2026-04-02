const SVG_NS = "http://www.w3.org/2000/svg";

const ICON_PATHS = {
  search: [
    { tag: "circle", cx: "11", cy: "11", r: "7" },
    { tag: "path", d: "m20 20-3.5-3.5" }
  ],
  memory: [
    { tag: "path", d: "M5 7.5A2.5 2.5 0 0 1 7.5 5h9A2.5 2.5 0 0 1 19 7.5v9A2.5 2.5 0 0 1 16.5 19h-9A2.5 2.5 0 0 1 5 16.5z" },
    { tag: "path", d: "M8 9h8" },
    { tag: "path", d: "M8 12h8" },
    { tag: "path", d: "M8 15h5" }
  ],
  marks: [
    { tag: "path", d: "m7 4h10a1 1 0 0 1 1 1v15l-6-3-6 3V5a1 1 0 0 1 1-1z" },
    { tag: "path", d: "M9 8h6" }
  ],
  inspector: [
    { tag: "circle", cx: "12", cy: "8", r: "3" },
    { tag: "path", d: "M6 19a6 6 0 0 1 12 0" },
    { tag: "path", d: "M4 4h2" },
    { tag: "path", d: "M18 4h2" }
  ],
  code: [
    { tag: "path", d: "m9 8-4 4 4 4" },
    { tag: "path", d: "m15 8 4 4-4 4" },
    { tag: "path", d: "m13 5-2 14" }
  ],
  pin: [
    { tag: "path", d: "M12 16v4" },
    { tag: "path", d: "m8 4 8 8" },
    { tag: "path", d: "m6 6 4 4-5 3 3-5 4 4" }
  ],
  bookmark: [
    { tag: "path", d: "m7 4h10a1 1 0 0 1 1 1v15l-6-3-6 3V5a1 1 0 0 1 1-1z" }
  ],
  settings: [
    { tag: "path", d: "M12 3.5 14 4l1.2 2.2 2.4.7.4 2.5 1.8 1.6-1 2.4 1 2.4-1.8 1.6-.4 2.5-2.4.7L14 20l-2 .5-2-.5-1.2-2.2-2.4-.7L4 14.6 2.2 13l1-2.4-1-2.4L4 6.6l.4-2.5 2.4-.7L10 4z" },
    { tag: "circle", cx: "12", cy: "12", r: "2.5" }
  ],
  close: [
    { tag: "path", d: "M18 6 6 18" },
    { tag: "path", d: "m6 6 12 12" }
  ],
  panelRight: [
    { tag: "rect", x: "3", y: "3", width: "18", height: "18", rx: "2" },
    { tag: "path", d: "M15 3v18" }
  ],
  chevronUp: [{ tag: "path", d: "m6 14 6-6 6 6" }],
  chevronDown: [{ tag: "path", d: "m6 10 6 6 6-6" }],
  openSidebar: [
    { tag: "rect", x: "3", y: "4", width: "18", height: "16", rx: "2" },
    { tag: "path", d: "M10 4v16" },
    { tag: "path", d: "m15 12 3-3" },
    { tag: "path", d: "m15 12 3 3" }
  ],
  openConversation: [
    { tag: "path", d: "M14 5h5v5" },
    { tag: "path", d: "M10 14 19 5" },
    { tag: "path", d: "M19 14v5H5V5h5" }
  ],
  save: [
    { tag: "path", d: "M5 4h11l3 3v13H5z" },
    { tag: "path", d: "M8 4v5h7" },
    { tag: "path", d: "M8 18v-5h8v5" }
  ],
  spark: [
    { tag: "path", d: "M12 3v4" },
    { tag: "path", d: "M12 17v4" },
    { tag: "path", d: "M3 12h4" },
    { tag: "path", d: "M17 12h4" }
  ],
  text: [
    { tag: "path", d: "M5 7h14" },
    { tag: "path", d: "M5 11h14" },
    { tag: "path", d: "M5 15h10" }
  ]
};

export function createSvgIcon(name, size = 14) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.style.fill = "none";
  svg.style.stroke = "currentColor";
  svg.style.strokeWidth = "1.9";
  svg.style.strokeLinecap = "round";
  svg.style.strokeLinejoin = "round";
  svg.style.display = "block";
  svg.style.flexShrink = "0";

  const specs = ICON_PATHS[name] || ICON_PATHS.settings;
  specs.forEach((spec) => {
    const element = document.createElementNS(SVG_NS, spec.tag);
    Object.entries(spec).forEach(([key, value]) => {
      if (key !== "tag") element.setAttribute(key, value);
    });
    svg.appendChild(element);
  });

  return svg;
}
