/**
 * renders course exports with markdown-aware content, safe media handling, exporter identity, and stable pagination
 *
 * @file backend/services/coursepdfservice.js
 * @module backend/services/coursepdfservice
 * @exports generateCoursePDF creates the course pdf buffer used by admin and future student export routes
 * @param {object} course course document converted to a plain object
 * @param {object} options optional export controls passed by the controller
 * @param {object} options.exportedBy authenticated actor shown in the pdf audit details
 * @param {string} options.exportedBy.role actor type such as admin, teacher, or student
 * @param {string} options.exportedBy.name actor display name
 * @param {string} options.exportedBy.email actor email when it is safe to show
 * @param {boolean} options.exportedBy.includeEmail whether the email should appear beside the name
 * @remarks supports headings, lists, quotes, code, links, images, roots, fractions, greek letters, powers, and subscripts
 * @remarks guards empty courses, long rich text, unsafe links, private image urls, oversized media, missing actor data, and blank pages
 * @returns {Promise<Buffer>} generated pdf bytes
 */

import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PAGE = {
  size: "A4",
  margins: { top: 56, bottom: 72, left: 54, right: 54 },
};

const COLORS = {
  ink: "#111827",
  muted: "#6b7280",
  soft: "#f8fafc",
  border: "#e5e7eb",
  blue: "#2563eb",
  green: "#16a34a",
  amber: "#d97706",
  red: "#dc2626",
  codeBg: "#1e1e1e",
  codeFg: "#d4d4d4",
  codeBorder: "#2d2d30",
};

const DIFFICULTY_COLORS = {
  Easy: COLORS.green,
  Medium: COLORS.amber,
  Hard: COLORS.red,
};

const DEFAULT_IMAGE_HOSTS = new Set([
  "res.cloudinary.com",
  "vidhgrow.online",
  "www.vidhgrow.online",
  "api.vidhgrow.online",
]);

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TIMEOUT_MS = 8000;
const MAX_RICH_TEXT_CHARS = 12000;
const MAX_CODE_LINES_PER_CHUNK = 34;
const CODE_FONT_SIZE = 7.8;
const CODE_LINE_GAP = 5.8;
const CODE_PADDING_X = 14;
const CODE_PADDING_Y = 14;
const QUESTION_SECTION_GAP = 10;
const SIZE_MARKER_OPEN = "[[pdf-size:";
const SIZE_MARKER_CLOSE = "[[/pdf-size]]";

const LOGO_CANDIDATES = [
  path.resolve(__dirname, "../../Frontend/public/logo.png"),
  path.resolve(__dirname, "../../Admin/public/logo.png"),
  path.resolve(__dirname, "../../Blogs/public/logo.png"),
  path.resolve(__dirname, "../public/logo.png"),
];

const loadBrandLogo = () => {
  const logoPath = LOGO_CANDIDATES.find((candidate) => existsSync(candidate));
  if (!logoPath) return null;

  try {
    return readFileSync(logoPath);
  } catch {
    return null;
  }
};

const BRAND_LOGO = loadBrandLogo();

const escapePdfText = (value, limit = MAX_RICH_TEXT_CHARS) => {
  if (value === null || value === undefined) return "";

  return String(value)
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .slice(0, limit);
};

const stripMarkdownImageSyntax = (value) =>
  value.replace(/!\[[^\]]*]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, "");

const stripHtmlTags = (value) =>
  value.replace(/<[^>]*>/g, "");

const normalizeMarkdown = (value, limit) =>
  stripHtmlTags(stripMarkdownImageSyntax(escapePdfText(value, limit))).trim();

const decodeHtmlEntities = (value = "") => {
  const named = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  };

  return String(value)
    .replace(/&([a-z]+);/gi, (_match, name) => named[name.toLowerCase()] || `&${name};`)
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_match, code) =>
      String.fromCharCode(parseInt(code, 16)),
    );
};

/**
 * maps browser font sizes into readable pdf points
 *
 * @param {string|number} rawSize css font-size value from pasted html or editor output
 * @param {number} baseSize current pdf paragraph size in points
 * @returns {number|null} clamped pdf font size or null when the value is unsupported
 */
const cssFontSizeToPdfSize = (rawSize, baseSize = 11) => {
  const value = String(rawSize || "").trim().toLowerCase();
  if (!value) return null;

  const namedSizes = {
    small: 9,
    medium: 11,
    large: 13,
    "x-large": 16,
    "xx-large": 19,
  };

  if (namedSizes[value]) return namedSizes[value];

  const match = value.match(/^(-?\d+(?:\.\d+)?)(px|pt|rem|em|%)?$/);
  if (!match) return null;

  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const unit = match[2] || "px";
  let points = amount;

  if (unit === "px") points = amount * 0.75;
  if (unit === "rem" || unit === "em") points = amount * baseSize;
  if (unit === "%") points = (amount / 100) * baseSize;

  return Math.min(22, Math.max(8, Math.round(points * 10) / 10));
};

const extractFontSizeFromAttributes = (attributes = "") => {
  const styleMatch = attributes.match(/style\s*=\s*["'][^"']*font-size\s*:\s*([^;"']+)/i);
  if (styleMatch) return cssFontSizeToPdfSize(styleMatch[1]);

  const classMatch = attributes.match(/class\s*=\s*["']([^"']+)["']/i);
  const className = classMatch?.[1] || "";
  const textSize = className.match(/(?:text|font)-(xs|sm|base|lg|xl|2xl|3xl)/i);

  if (!textSize) return null;

  const sizeMap = {
    xs: 8,
    sm: 9.5,
    base: 11,
    lg: 12.5,
    xl: 14,
    "2xl": 16,
    "3xl": 19,
  };

  return sizeMap[textSize[1].toLowerCase()] || null;
};

const wrapPdfSize = (content, size) => {
  if (!size || !String(content || "").trim()) return content;
  return `${SIZE_MARKER_OPEN}${size}]]${content}${SIZE_MARKER_CLOSE}`;
};

const htmlBodyToPlain = (value = "") =>
  decodeHtmlEntities(stripHtmlTags(value).replace(/\s+/g, " ").trim());

/**
 * converts common editor html into markdown-like text before pdf layout begins
 *
 * @param {string} value raw saved rich text from course, question, option, or explanation fields
 * @returns {string} markdown-like text with safe pdf size markers preserved
 */
const normalizeRichTextForPdf = (value = "") => {
  let text = escapePdfText(value, MAX_RICH_TEXT_CHARS);

  text = text.replace(/<pre[^>]*>\s*<code([^>]*)>([\s\S]*?)<\/code>\s*<\/pre>/gi, (_match, attrs, body) => {
    const language = attrs.match(/language-([\w-]+)/i)?.[1] || attrs.match(/class\s*=\s*["']([\w-]+)["']/i)?.[1] || "";
    return `\n\n\`\`\`${language}\n${decodeHtmlEntities(stripHtmlTags(body))}\n\`\`\`\n\n`;
  });

  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<hr\s*\/?>/gi, "\n---\n");

  text = text.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_match, depth, body) =>
    `\n${"#".repeat(Number(depth))} ${htmlBodyToPlain(body)}\n`,
  );

  text = text.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_match, body) =>
    htmlBodyToPlain(body)
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n"),
  );

  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_match, body) =>
    `\n- ${htmlBodyToPlain(body)}`,
  );

  text = text.replace(/<(strong|b)([^>]*)>([\s\S]*?)<\/\1>/gi, (_match, _tag, attrs, body) =>
    wrapPdfSize(`**${body}**`, extractFontSizeFromAttributes(attrs)),
  );
  text = text.replace(/<(em|i)([^>]*)>([\s\S]*?)<\/\1>/gi, (_match, _tag, attrs, body) =>
    wrapPdfSize(`*${body}*`, extractFontSizeFromAttributes(attrs)),
  );
  text = text.replace(/<code([^>]*)>([\s\S]*?)<\/code>/gi, (_match, attrs, body) =>
    wrapPdfSize(`\`${htmlBodyToPlain(body)}\``, extractFontSizeFromAttributes(attrs)),
  );

  text = text.replace(/<span([^>]*)>([\s\S]*?)<\/span>/gi, (_match, attrs, body) =>
    wrapPdfSize(body, extractFontSizeFromAttributes(attrs)),
  );

  text = text.replace(/<font([^>]*)>([\s\S]*?)<\/font>/gi, (_match, attrs, body) => {
    const explicitSize = attrs.match(/\ssize\s*=\s*["']?(\d+)["']?/i);
    const legacySizeMap = { 1: 8, 2: 9.5, 3: 11, 4: 12.5, 5: 14, 6: 16, 7: 18 };
    return wrapPdfSize(body, extractFontSizeFromAttributes(attrs) || legacySizeMap[explicitSize?.[1]]);
  });

  text = text.replace(/<(p|div)([^>]*)>([\s\S]*?)<\/\1>/gi, (_match, _tag, attrs, body) =>
    `${wrapPdfSize(body, extractFontSizeFromAttributes(attrs))}\n\n`,
  );

  text = text.replace(/<\/(p|div|section|article)>/gi, "\n\n");
  text = text.replace(/<(p|div|section|article)[^>]*>/gi, "");
  text = stripHtmlTags(text);

  return decodeHtmlEntities(text);
};

const compactText = (value, limit = 120) =>
  escapePdfText(value, limit).replace(/\s+/g, " ").trim();

/**
 * normalizes the authenticated actor shown inside exported pdf files
 *
 * @param {object} exportedBy actor details from the route middleware
 * @param {string} exportedBy.role actor role such as admin, teacher, or student
 * @param {string} exportedBy.name public display name for the actor
 * @param {string} exportedBy.email private email shown only when the route allows it
 * @param {boolean} exportedBy.includeEmail route-level choice for showing email beside name
 * @returns {object} safe identity strings for metadata, footer, and detail rows
 */
const normalizeExportContext = (exportedBy = {}) => {
  const role = compactText(exportedBy.role || "admin", 24).toLowerCase() || "admin";
  const name = compactText(exportedBy.name, 80);
  const email = compactText(exportedBy.email, 140);
  const includeEmail = exportedBy.includeEmail === true || role === "admin";
  const displayName = name || email || role;
  const visibleIdentity =
    includeEmail && name && email ? `${name} (${email})` : displayName;

  return {
    role,
    name,
    email,
    includeEmail,
    displayName,
    visibleIdentity,
  };
};

const isSafeLink = (url) => {
  try {
    const parsed = new URL(url);
    return ["http:", "https:", "mailto:"].includes(parsed.protocol);
  } catch {
    return false;
  }
};

const isSafeImageUrl = (url) => {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    return (
      DEFAULT_IMAGE_HOSTS.has(parsed.hostname) ||
      parsed.hostname.endsWith(".cloudinary.com")
    );
  } catch {
    return false;
  }
};

const safeDate = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "not available";

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const contentWidth = (doc) =>
  doc.page.width - doc.page.margins.left - doc.page.margins.right;

const bottomLimit = (doc) => doc.page.height - doc.page.margins.bottom - 36;

const topLimit = (doc) => doc.page.margins.top;

const addPage = (doc) => {
  doc.addPage({ size: PAGE.size, margins: PAGE.margins });
  doc.x = doc.page.margins.left;
  doc.y = topLimit(doc);
};

const ensureSpace = (doc, neededHeight, options = {}) => {
  const { allowAtTop = true } = options;
  const available = bottomLimit(doc) - doc.y;
  const atTop = doc.y <= topLimit(doc) + 4;

  if (available >= neededHeight) return;
  if (atTop && allowAtTop) return;

  addPage(doc);
};

const drawPageWatermark = (doc) => {
  const cursor = { x: doc.x, y: doc.y };

  doc.save();
  doc
    .fontSize(54)
    .font("Helvetica-Bold")
    .fillColor("#000000", 0.035)
    .rotate(-45, {
      origin: [doc.page.width / 2, doc.page.height / 2],
    })
    .text("Vidhgrow", 0, doc.page.height / 2, {
      align: "center",
      width: doc.page.width,
      lineBreak: false,
    });
  doc.restore();
  doc.x = cursor.x;
  doc.y = cursor.y;
};

/**
 * draws the document frame without changing the active content cursor
 *
 * @param {PDFDocument} doc active pdfkit document
 * @returns {void}
 */
const drawPageFrame = (doc) => {
  const cursor = { x: doc.x, y: doc.y };
  const left = doc.page.margins.left - 16;
  const right = doc.page.width - doc.page.margins.right + 16;
  const top = doc.page.margins.top - 18;
  const bottom = doc.page.height - doc.page.margins.bottom + 22;

  doc.save();
  doc
    .moveTo(left, top)
    .lineTo(left, bottom)
    .lineTo(right, bottom)
    .lineTo(right, top)
    .strokeColor("#dbe4f0")
    .lineWidth(0.8)
    .stroke();

  doc
    .moveTo(left + 8, bottom - 8)
    .lineTo(right - 8, bottom - 8)
    .strokeColor("#edf2f7")
    .lineWidth(0.6)
    .stroke();
  doc.restore();
  doc.x = cursor.x;
  doc.y = cursor.y;
};

/**
 * draws footer chrome after page content has been buffered
 *
 * @param {PDFDocument} doc active pdfkit document
 * @param {number} pageNumber one-based page number
 * @param {number} totalPages total buffered page count
 * @param {object} exportContext normalized actor context
 * @returns {void}
 */
const drawFooter = (doc, pageNumber, totalPages, exportContext) => {
  const cursor = { x: doc.x, y: doc.y };
  const footerY = doc.page.height - doc.page.margins.bottom - 18;

  drawPageFrame(doc);

  doc
    .moveTo(doc.page.margins.left, footerY - 10)
    .lineTo(doc.page.width - doc.page.margins.right, footerY - 10)
    .strokeColor(COLORS.border)
    .lineWidth(0.7)
    .stroke();

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(COLORS.muted)
    .text(`Page ${pageNumber} of ${totalPages}`, 0, footerY, {
      align: "center",
      width: doc.page.width,
      lineBreak: false,
    });

  if (BRAND_LOGO) {
    try {
      doc.image(BRAND_LOGO, doc.page.margins.left, footerY - 4, {
        fit: [72, 20],
        align: "left",
        valign: "center",
      });
    } catch {
      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor(COLORS.blue)
        .text("Vidhgrow", doc.page.margins.left, footerY, {
          width: 72,
          lineBreak: false,
        });
    }
  } else {
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor(COLORS.blue)
      .text("Vidhgrow", doc.page.margins.left, footerY, {
        width: 72,
        lineBreak: false,
      });
  }

  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#9ca3af")
    .text(
      `exported by ${escapePdfText(exportContext.displayName, 42)}`,
      doc.page.width - doc.page.margins.right - 130,
      footerY,
      {
        width: 130,
        align: "right",
        lineBreak: false,
      },
    );
  doc.x = cursor.x;
  doc.y = cursor.y;
};

const finalizeFooters = (doc, exportContext) => {
  const range = doc.bufferedPageRange();

  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    drawFooter(doc, i + 1, range.count, exportContext);
  }
};

/**
 * converts common editor math patterns into pdfkit-friendly text
 *
 * @param {string} value rich text that may include latex-style math markers
 * @returns {string} readable math text with roots, fractions, greek letters, powers, and symbols
 */
const convertMathToPlainText = (value) => {
  let text = escapePdfText(value);

  const superscriptMap = {
    0: "⁰",
    1: "¹",
    2: "²",
    3: "³",
    4: "⁴",
    5: "⁵",
    6: "⁶",
    7: "⁷",
    8: "⁸",
    9: "⁹",
    "+": "⁺",
    "-": "⁻",
    "=": "⁼",
    "(": "⁽",
    ")": "⁾",
    a: "ᵃ",
    b: "ᵇ",
    c: "ᶜ",
    d: "ᵈ",
    e: "ᵉ",
    f: "ᶠ",
    g: "ᵍ",
    h: "ʰ",
    i: "ⁱ",
    j: "ʲ",
    k: "ᵏ",
    l: "ˡ",
    m: "ᵐ",
    n: "ⁿ",
    o: "ᵒ",
    p: "ᵖ",
    r: "ʳ",
    s: "ˢ",
    t: "ᵗ",
    u: "ᵘ",
    v: "ᵛ",
    w: "ʷ",
    x: "ˣ",
    y: "ʸ",
    z: "ᶻ",
  };

  const subscriptMap = {
    0: "₀",
    1: "₁",
    2: "₂",
    3: "₃",
    4: "₄",
    5: "₅",
    6: "₆",
    7: "₇",
    8: "₈",
    9: "₉",
    "+": "₊",
    "-": "₋",
    "=": "₌",
    "(": "₍",
    ")": "₎",
    a: "ₐ",
    e: "ₑ",
    h: "ₕ",
    i: "ᵢ",
    j: "ⱼ",
    k: "ₖ",
    l: "ₗ",
    m: "ₘ",
    n: "ₙ",
    o: "ₒ",
    p: "ₚ",
    r: "ᵣ",
    s: "ₛ",
    t: "ₜ",
    u: "ᵤ",
    v: "ᵥ",
    x: "ₓ",
  };

  const mapChars = (content, map) =>
    content
      .split("")
      .map((char) => map[char] || char)
      .join("");

  const findMatchingBrace = (source, openIndex) => {
    let depth = 0;

    for (let index = openIndex; index < source.length; index += 1) {
      if (source[index] === "{") depth += 1;
      if (source[index] === "}") depth -= 1;
      if (depth === 0) return index;
    }

    return -1;
  };

  const formatRoot = (rootIndex, radicand) => {
    const normalizedIndex = compactText(rootIndex, 24);
    const body = replaceStructuredMath(radicand);

    if (!normalizedIndex || normalizedIndex === "2") return `sqrt(${body})`;
    if (normalizedIndex === "3") return `cuberoot(${body})`;
    if (normalizedIndex === "4") return `fourthroot(${body})`;

    return `root_${normalizedIndex}(${body})`;
  };

  const replaceSingleArgCommand = (source, command, formatter) => {
    let output = source;
    let cursor = 0;

    while ((cursor = output.indexOf(command, cursor)) !== -1) {
      const openIndex = cursor + command.length;
      if (output[openIndex] !== "{") {
        cursor += command.length;
        continue;
      }

      const closeIndex = findMatchingBrace(output, openIndex);
      if (closeIndex === -1) break;

      const content = output.slice(openIndex + 1, closeIndex);
      const replacement = formatter(content);
      output = `${output.slice(0, cursor)}${replacement}${output.slice(closeIndex + 1)}`;
      cursor += replacement.length;
    }

    return output;
  };

  const replaceTwoArgCommand = (source, command, formatter) => {
    let output = source;
    let cursor = 0;

    while ((cursor = output.indexOf(command, cursor)) !== -1) {
      const firstOpen = cursor + command.length;
      if (output[firstOpen] !== "{") {
        cursor += command.length;
        continue;
      }

      const firstClose = findMatchingBrace(output, firstOpen);
      const secondOpen = firstClose + 1;
      if (firstClose === -1 || output[secondOpen] !== "{") break;

      const secondClose = findMatchingBrace(output, secondOpen);
      if (secondClose === -1) break;

      const first = output.slice(firstOpen + 1, firstClose);
      const second = output.slice(secondOpen + 1, secondClose);
      const replacement = formatter(first, second);
      output = `${output.slice(0, cursor)}${replacement}${output.slice(secondClose + 1)}`;
      cursor += replacement.length;
    }

    return output;
  };

  const replaceIndexedSqrt = (source) => {
    let output = source;
    let cursor = 0;

    while ((cursor = output.indexOf("\\sqrt[", cursor)) !== -1) {
      const indexStart = cursor + "\\sqrt[".length;
      const indexEnd = output.indexOf("]", indexStart);
      const radicandOpen = indexEnd + 1;

      if (indexEnd === -1 || output[radicandOpen] !== "{") {
        cursor += "\\sqrt[".length;
        continue;
      }

      const radicandClose = findMatchingBrace(output, radicandOpen);
      if (radicandClose === -1) break;

      const rootIndex = output.slice(indexStart, indexEnd);
      const radicand = output.slice(radicandOpen + 1, radicandClose);
      const replacement = formatRoot(rootIndex, radicand);
      output = `${output.slice(0, cursor)}${replacement}${output.slice(radicandClose + 1)}`;
      cursor += replacement.length;
    }

    return output;
  };

  const replaceStructuredMath = (source) => {
    let output = source;

    output = replaceIndexedSqrt(output);
    output = replaceTwoArgCommand(output, "\\root", (rootIndex, radicand) =>
      formatRoot(rootIndex, radicand),
    );
    output = replaceTwoArgCommand(output, "\\frac", (top, bottom) =>
      `(${replaceStructuredMath(top)}/${replaceStructuredMath(bottom)})`,
    );
    output = replaceSingleArgCommand(output, "\\sqrt", (radicand) =>
      formatRoot("2", radicand),
    );
    output = output.replace(/([√∛∜])\{([^{}]+)\}/g, (_, symbol, content) => {
      const body = replaceStructuredMath(content);
      if (symbol === "∛") return `cuberoot(${body})`;
      if (symbol === "∜") return `fourthroot(${body})`;
      return `sqrt(${body})`;
    });

    return output;
  };

  text = replaceStructuredMath(text);

  const commands = [
    [/\\Rightarrow/g, "=>"],
    [/\\Leftarrow/g, "<="],
    [/\\Leftrightarrow/g, "<=>"],
    [/\\rightarrow/g, "->"],
    [/\\leftarrow/g, "<-"],
    [/\\to/g, "->"],
    [/\\alpha/g, "alpha"],
    [/\\beta/g, "beta"],
    [/\\gamma/g, "gamma"],
    [/\\delta/g, "delta"],
    [/\\epsilon/g, "epsilon"],
    [/\\eta/g, "eta"],
    [/\\theta/g, "theta"],
    [/\\kappa/g, "kappa"],
    [/\\lambda/g, "lambda"],
    [/\\mu/g, "mu"],
    [/\\nu/g, "nu"],
    [/\\xi/g, "xi"],
    [/\\pi/g, "pi"],
    [/\\rho/g, "rho"],
    [/\\sigma/g, "sigma"],
    [/\\tau/g, "tau"],
    [/\\upsilon/g, "upsilon"],
    [/\\phi/g, "phi"],
    [/\\chi/g, "chi"],
    [/\\psi/g, "psi"],
    [/\\omega/g, "omega"],
    [/\\Gamma/g, "Gamma"],
    [/\\Delta/g, "Delta"],
    [/\\Theta/g, "Theta"],
    [/\\Lambda/g, "Lambda"],
    [/\\Pi/g, "Pi"],
    [/\\Sigma/g, "Sigma"],
    [/\\Phi/g, "Phi"],
    [/\\Omega/g, "Omega"],
    [/\\times/g, "x"],
    [/\\cdot/g, "*"],
    [/\\div/g, "/"],
    [/\\pm/g, "+/-"],
    [/\\mp/g, "-/+"],
    [/\\leq/g, "<="],
    [/\\geq/g, ">="],
    [/\\neq/g, "!="],
    [/\\approx/g, "~="],
    [/\\equiv/g, "==="],
    [/\\propto/g, "proportional to"],
    [/\\infty/g, "infinity"],
    [/\\sum/g, "sum"],
    [/\\prod/g, "product"],
    [/\\int/g, "integral"],
    [/\\partial/g, "partial"],
    [/\\nabla/g, "nabla"],
    [/\\angle/g, "angle"],
    [/\\degree/g, "degrees"],
    [/\\circ/g, "degrees"],
    [/\\parallel/g, "parallel"],
    [/\\perp/g, "perpendicular"],
    [/\\notin/g, "not in"],
    [/\\in/g, "in"],
    [/\\subseteq/g, "subseteq"],
    [/\\supseteq/g, "supseteq"],
    [/\\cup/g, "union"],
    [/\\cap/g, "intersection"],
    [/\\therefore/g, "therefore"],
    [/\\because/g, "because"],
  ];

  commands.forEach(([pattern, replacement]) => {
    text = text.replace(pattern, replacement);
  });

  const unicodeFallbacks = [
    [/√/g, "sqrt"],
    [/∛/g, "cuberoot"],
    [/∜/g, "fourthroot"],
    [/θ/g, "theta"],
    [/π/g, "pi"],
    [/α/g, "alpha"],
    [/β/g, "beta"],
    [/γ/g, "gamma"],
    [/δ/g, "delta"],
    [/≤/g, "<="],
    [/≥/g, ">="],
    [/≠/g, "!="],
    [/≈/g, "~="],
    [/∑/g, "sum"],
    [/∫/g, "integral"],
    [/∞/g, "infinity"],
    [/→/g, "->"],
    [/←/g, "<-"],
    [/×/g, "x"],
    [/÷/g, "/"],
    [/±/g, "+/-"],
  ];

  unicodeFallbacks.forEach(([pattern, replacement]) => {
    text = text.replace(pattern, replacement);
  });

  text = text
    .replace(/\^\{([^{}]+)\}/g, "^($1)")
    .replace(/_\{([^{}]+)\}/g, "_($1)");

  return text;
};

const inlineMarkdownToReadableText = (value = "") =>
  convertMathToPlainText(normalizeMarkdown(value))
    .replace(/\$\$([\s\S]+?)\$\$/g, (_match, math) => convertMathToPlainText(math))
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/\[([^\]]*)]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_match, label, href) =>
      label || readablePdfUrlLabel(href),
    )
    .replace(/\$([^$]+)\$/g, (_match, math) => convertMathToPlainText(math))
    .replace(/\s+/g, " ")
    .trim();

const stripSizeMarkers = (value = "") =>
  String(value)
    .replace(/\[\[pdf-size:[\d.]+]]/g, "")
    .replace(/\[\[\/pdf-size]]/g, "");

const splitTextByPdfSize = (value = "", fallbackSize = 11) => {
  const text = String(value);
  const segments = [];
  const stack = [fallbackSize];
  let cursor = 0;
  const markerPattern = /\[\[pdf-size:([\d.]+)]]|\[\[\/pdf-size]]/g;
  let match;

  while ((match = markerPattern.exec(text)) !== null) {
    if (match.index > cursor) {
      segments.push({
        text: text.slice(cursor, match.index),
        fontSize: stack[stack.length - 1],
      });
    }

    if (match[1]) {
      stack.push(cssFontSizeToPdfSize(match[1], fallbackSize) || fallbackSize);
    } else if (stack.length > 1) {
      stack.pop();
    }

    cursor = markerPattern.lastIndex;
  }

  if (cursor < text.length) {
    segments.push({
      text: text.slice(cursor),
      fontSize: stack[stack.length - 1],
    });
  }

  return segments.filter((segment) => segment.text);
};

const maxSegmentFontSize = (segments, fallbackSize) =>
  segments.reduce((max, segment) => Math.max(max, segment.fontSize || fallbackSize), fallbackSize);

const readablePdfUrlLabel = (href = "") => {
  try {
    const parsed = new URL(String(href));
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "linked page";
  }
};

const pushPlain = (tokens, value, style = {}) => {
  if (!value) return;
  tokens.push({ type: "text", text: convertMathToPlainText(value), ...style });
};

const parseInline = (value) => {
  const text = escapePdfText(value);
  const tokens = [];
  let buffer = "";
  let i = 0;

  const flush = () => {
    pushPlain(tokens, buffer);
    buffer = "";
  };

  while (i < text.length) {
    if (text[i] === "`") {
      const end = text.indexOf("`", i + 1);
      if (end !== -1) {
        flush();
        tokens.push({
          type: "code",
          text: text.slice(i + 1, end),
        });
        i = end + 1;
        continue;
      }
    }

    if (text.startsWith("**", i) || text.startsWith("__", i)) {
      const marker = text.slice(i, i + 2);
      const end = text.indexOf(marker, i + 2);
      if (end !== -1) {
        flush();
        pushPlain(tokens, text.slice(i + 2, end), { bold: true });
        i = end + 2;
        continue;
      }
    }

    if (text[i] === "*" || text[i] === "_") {
      const marker = text[i];
      const end = text.indexOf(marker, i + 1);
      if (end !== -1 && text.slice(i + 1, end).trim()) {
        flush();
        pushPlain(tokens, text.slice(i + 1, end), { italic: true });
        i = end + 1;
        continue;
      }
    }

    if (text[i] === "[") {
      const labelEnd = text.indexOf("]", i + 1);
      const urlStart = labelEnd !== -1 ? text.indexOf("(", labelEnd) : -1;
      const urlEnd = urlStart !== -1 ? text.indexOf(")", urlStart) : -1;

      if (labelEnd !== -1 && urlStart === labelEnd + 1 && urlEnd !== -1) {
        const label = text.slice(i + 1, labelEnd);
        const rawUrl = text.slice(urlStart + 1, urlEnd).trim();
        flush();
        tokens.push({
          type: "link",
          text: convertMathToPlainText(label || rawUrl),
          url: isSafeLink(rawUrl) ? rawUrl : null,
        });
        i = urlEnd + 1;
        continue;
      }
    }

    if (text[i] === "$") {
      const end = text.indexOf("$", i + 1);
      if (end !== -1) {
        flush();
        pushPlain(tokens, text.slice(i + 1, end), { math: true });
        i = end + 1;
        continue;
      }
    }

    buffer += text[i];
    i += 1;
  }

  flush();
  return tokens.length ? tokens : [{ type: "text", text: "" }];
};

const applyTokenStyle = (doc, token, base) => {
  const color = token.type === "link" ? COLORS.blue : base.color;

  if (token.type === "code") {
    doc.font("Courier").fontSize(Math.max(base.fontSize - 1, 8)).fillColor("#be123c");
    return { underline: false, link: null };
  }

  if (token.bold && token.italic) {
    doc.font("Helvetica-BoldOblique");
  } else if (token.bold) {
    doc.font("Helvetica-Bold");
  } else if (token.italic) {
    doc.font("Helvetica-Oblique");
  } else {
    doc.font(base.font);
  }

  doc.fontSize(base.fontSize).fillColor(color);

  return {
    underline: token.type === "link",
    link: token.type === "link" && token.url ? token.url : null,
  };
};

const renderInlineText = (doc, value, options = {}) => {
  const {
    x = doc.page.margins.left,
    width = contentWidth(doc),
    fontSize = 11,
    font = "Helvetica",
    color = COLORS.ink,
    align = "left",
    paragraphGap = 5,
    lineGap = 3,
  } = options;

  const text = inlineMarkdownToReadableText(value);
  if (!text) return;
  const segments = splitTextByPdfSize(text, fontSize);
  const plainText = stripSizeMarkers(text);
  const largestFontSize = maxSegmentFontSize(segments, fontSize);
  const resolvedLineGap = Math.max(lineGap, lineGap + Math.max(0, largestFontSize - fontSize) * 0.2);

  doc.font(font).fontSize(largestFontSize);
  const predictedHeight = doc.heightOfString(plainText, {
    width,
    lineGap: resolvedLineGap,
    align,
  });

  ensureSpace(doc, Math.min(predictedHeight + paragraphGap + 4, 150));

  if (segments.length <= 1) {
    doc.font(font).fontSize(fontSize).fillColor(color);
    doc.text(plainText, x, doc.y, {
      width,
      align,
      lineGap: resolvedLineGap,
    });
  } else {
    segments.forEach((segment, index) => {
      const textOptions = {
        width,
        align,
        lineGap: resolvedLineGap,
        continued: index < segments.length - 1,
      };

      doc.font(font).fontSize(segment.fontSize || fontSize).fillColor(color);

      if (index === 0) {
        doc.text(segment.text, x, doc.y, textOptions);
      } else {
        doc.text(segment.text, textOptions);
      }
    });
  }

  doc.moveDown(paragraphGap / largestFontSize);
};

const parseBlocks = (value) => {
  const source = normalizeRichTextForPdf(value);
  const lines = source.split("\n");
  const blocks = [];
  let paragraph = [];
  let list = null;
  let quote = [];
  let code = null;
  let math = null;

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: "paragraph", text: paragraph.join(" ").trim() });
      paragraph = [];
    }
  };

  const flushList = () => {
    if (list?.items?.length) blocks.push(list);
    list = null;
  };

  const flushQuote = () => {
    if (quote.length) {
      blocks.push({ type: "blockquote", text: quote.join("\n") });
      quote = [];
    }
  };

  lines.forEach((rawLine) => {
    const line = rawLine.replace(/\s+$/g, "");

    if (math) {
      const endMatch = line.match(/^(.*?)\s*\$\$\s*$/);
      if (endMatch) {
        math.lines.push(endMatch[1]);
        blocks.push({ type: "math", text: math.lines.join("\n").trim() });
        math = null;
      } else {
        math.lines.push(rawLine);
      }
      return;
    }

    if (code) {
      const fenceEnd = line.match(/^```+\s*$/);
      if (fenceEnd) {
        blocks.push(code);
        code = null;
      } else {
        code.lines.push(rawLine);
      }
      return;
    }

    const fenceStart = line.match(/^```+\s*([\w-]+)?\s*$/);
    if (fenceStart) {
      flushParagraph();
      flushList();
      flushQuote();
      code = { type: "code", language: fenceStart[1] || "text", lines: [] };
      return;
    }

    const oneLineMath = line.match(/^\s*\$\$\s*(.*?)\s*\$\$\s*$/);
    if (oneLineMath) {
      flushParagraph();
      flushList();
      flushQuote();
      blocks.push({ type: "math", text: oneLineMath[1] });
      return;
    }

    const mathStart = line.match(/^\s*\$\$\s*(.*)$/);
    if (mathStart) {
      flushParagraph();
      flushList();
      flushQuote();
      math = { type: "math", lines: [mathStart[1]] };
      return;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      flushQuote();
      return;
    }

    const image = line.match(/^!\[([^\]]*)]\(([^)\s]+)(?:\s+"[^"]*")?\)$/);
    if (image) {
      flushParagraph();
      flushList();
      flushQuote();
      blocks.push({
        type: "image",
        alt: image[1],
        url: image[2],
      });
      return;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      flushQuote();
      blocks.push({
        type: "heading",
        depth: heading[1].length,
        text: heading[2],
      });
      return;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      flushParagraph();
      flushList();
      flushQuote();
      blocks.push({ type: "rule" });
      return;
    }

    const quoteMatch = line.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      flushParagraph();
      flushList();
      quote.push(quoteMatch[1]);
      return;
    }

    const unordered = line.match(/^\s*[-*+]\s+(.+)$/);
    const ordered = line.match(/^\s*(\d+)[.)]\s+(.+)$/);
    if (unordered || ordered) {
      flushParagraph();
      flushQuote();
      const nextType = ordered ? "ordered" : "unordered";
      if (!list || list.kind !== nextType) {
        flushList();
        list = { type: "list", kind: nextType, items: [] };
      }
      list.items.push(ordered ? ordered[2] : unordered[1]);
      return;
    }

    paragraph.push(line.trim());
  });

  if (code) blocks.push(code);
  if (math) blocks.push({ type: "math", text: math.lines.join("\n").trim() });
  flushParagraph();
  flushList();
  flushQuote();

  return blocks;
};

const renderHeading = (doc, block, options = {}) => {
  const depth = Math.min(block.depth || 2, 4);
  const sizes = { 1: 20, 2: 17, 3: 14, 4: 12 };
  const fontSize = sizes[depth] || 12;
  const x = options.x || doc.page.margins.left;
  const width = options.width || contentWidth(doc);

  ensureSpace(doc, fontSize + 18);
  doc.moveDown(depth === 1 ? 0.3 : 0.1);
  doc.font("Helvetica-Bold").fontSize(fontSize).fillColor(COLORS.ink);
  doc.text(convertMathToPlainText(normalizeMarkdown(block.text)), x, doc.y, {
    width,
    lineGap: 2,
  });
  doc.moveDown(depth === 1 ? 0.5 : 0.35);
};

const renderRule = (doc) => {
  ensureSpace(doc, 16);
  doc
    .moveTo(doc.page.margins.left, doc.y + 4)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y + 4)
    .strokeColor(COLORS.border)
    .lineWidth(0.7)
    .stroke();
  doc.moveDown(0.8);
};

const renderList = (doc, block, options = {}) => {
  const x = options.x || doc.page.margins.left;
  const width = options.width || contentWidth(doc);
  const bulletX = x + 2;
  const textX = x + 20;

  block.items.forEach((item, index) => {
    ensureSpace(doc, 28);
    const y = doc.y;
    doc.font("Helvetica").fontSize(10).fillColor(COLORS.muted);

    if (block.kind === "ordered") {
      doc.text(`${index + 1}.`, bulletX, y, { width: 16, align: "right" });
    } else {
      doc.circle(bulletX + 6, y + 6, 2).fill(COLORS.muted);
    }

    doc.y = y;
    renderInlineText(doc, item, {
      x: textX,
      width: width - 20,
      fontSize: 11,
      color: COLORS.ink,
      paragraphGap: 1,
    });
    doc.moveDown(0.15);
  });

  doc.moveDown(0.25);
};

const renderBlockquote = (doc, block, options = {}) => {
  const x = options.x || doc.page.margins.left;
  const width = options.width || contentWidth(doc);
  const text = normalizeMarkdown(block.text);
  if (!text) return;

  const predictedHeight = doc.heightOfString(convertMathToPlainText(text), {
    width: width - 18,
    lineGap: 3,
  });

  ensureSpace(doc, Math.min(predictedHeight + 12, 150));
  const startY = doc.y;
  doc
    .roundedRect(x, startY, 4, Math.max(predictedHeight + 8, 18), 2)
    .fill(COLORS.blue);

  doc.y = startY + 2;
  renderInlineText(doc, text, {
    x: x + 16,
    width: width - 18,
    fontSize: 11,
    font: "Helvetica-Oblique",
    color: COLORS.muted,
    paragraphGap: 2,
  });
};

/**
 * wraps code rows using the actual pdf font metrics
 *
 * @param {PDFDocument} doc active pdfkit document
 * @param {string[]} lines raw code rows from markdown fences
 * @param {number} width available block width
 * @param {number} fontSize courier size used for code rows
 * @returns {string[]} rows that fit inside the code box without clipping
 */
const wrapCodeRows = (doc, lines, width, fontSize) => {
  const maxRowWidth = Math.max(80, width - CODE_PADDING_X * 2 - 8);
  const rows = [];
  const originalFont = doc._font;
  const originalSize = doc._fontSize;

  doc.font("Courier").fontSize(fontSize);

  lines.forEach((line) => {
    const safeLine = escapePdfText(line, 2000).replace(/\t/g, "    ") || " ";

    if (doc.widthOfString(safeLine) <= maxRowWidth) {
      rows.push(safeLine);
      return;
    }

    let cursor = 0;
    const indent = safeLine.match(/^\s*/)?.[0] || "";
    const continuationPrefix = `${indent}    `;

    while (cursor < safeLine.length) {
      const prefix = cursor === 0 ? "" : continuationPrefix;
      let end = cursor + 1;
      let candidate = "";
      let lastReadableBreak = -1;

      while (end <= safeLine.length) {
        const next = `${prefix}${safeLine.slice(cursor, end)}`;
        if (doc.widthOfString(next) > maxRowWidth) break;
        candidate = next;
        if (/[\s,.;:+\-/*=()[\]{}<>]/.test(safeLine[end - 1] || "")) {
          lastReadableBreak = end;
        }
        end += 1;
      }

      if (!candidate) {
        candidate = `${prefix}${safeLine[cursor]}`;
        end = cursor + 1;
      } else if (lastReadableBreak > cursor + 8 && lastReadableBreak < end - 1) {
        candidate = `${prefix}${safeLine.slice(cursor, lastReadableBreak).replace(/\s+$/g, "")}`;
        end = lastReadableBreak + 1;
      }

      rows.push(candidate);
      cursor = end - 1;
    }
  });

  if (originalFont) doc.font(originalFont.name || "Helvetica");
  doc.fontSize(originalSize || 11);

  return rows;
};

const renderCodeBlock = (doc, block, options = {}) => {
  const x = options.x || doc.page.margins.left;
  const width = options.width || contentWidth(doc);
  const language = escapePdfText(block.language || "text", 32).toLowerCase();
  const lines = wrapCodeRows(doc, block.lines.length ? block.lines : [""], width, CODE_FONT_SIZE);
  let index = 0;

  while (index < lines.length) {
    const lineHeight = CODE_FONT_SIZE + CODE_LINE_GAP;
    const headerHeight = language && language !== "text" ? 18 : 0;
    const minimumBlockHeight = CODE_PADDING_Y * 2 + headerHeight + lineHeight;

    if (bottomLimit(doc) - doc.y < minimumBlockHeight + 10 && doc.y > topLimit(doc) + 4) {
      addPage(doc);
    }

    const availableHeight = Math.max(minimumBlockHeight, bottomLimit(doc) - doc.y - 10);
    let maxRowsOnPage = Math.max(
      1,
      Math.min(
        MAX_CODE_LINES_PER_CHUNK,
        Math.floor((availableHeight - CODE_PADDING_Y * 2 - headerHeight) / lineHeight),
      ),
    );

    if (lines.length - index > maxRowsOnPage) {
      maxRowsOnPage = Math.max(
        1,
        Math.min(
          MAX_CODE_LINES_PER_CHUNK,
          Math.floor((availableHeight - CODE_PADDING_Y * 2 - headerHeight - 14) / lineHeight),
        ),
      );
    }

    if (
      index === 0 &&
      lines.length > maxRowsOnPage &&
      maxRowsOnPage < 6 &&
      doc.y > topLimit(doc) + 4
    ) {
      addPage(doc);
      continue;
    }

    const slice = lines.slice(index, index + maxRowsOnPage);
    const hasMoreRows = index + slice.length < lines.length;
    const continuationHeight = hasMoreRows ? 14 : 0;
    const blockHeight = CODE_PADDING_Y * 2 + headerHeight + continuationHeight + slice.length * lineHeight;

    ensureSpace(doc, Math.min(blockHeight + 10, bottomLimit(doc) - topLimit(doc)));

    const startY = doc.y;
    doc
      .roundedRect(x, startY, width, blockHeight, 7)
      .fillAndStroke(COLORS.codeBg, "#1f2937");

    if (language && language !== "text") {
      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor("#93c5fd")
        .text(index > 0 ? `${language} continued` : language, x + CODE_PADDING_X, startY + 8, {
          width: width - CODE_PADDING_X * 2,
        });
    }

    doc.font("Courier").fontSize(CODE_FONT_SIZE).fillColor(COLORS.codeFg);
    let y = startY + CODE_PADDING_Y + headerHeight;

    slice.forEach((line) => {
      doc.text(escapePdfText(line, 1200), x + CODE_PADDING_X, y, {
        width: width - CODE_PADDING_X * 2,
        lineBreak: false,
      });
      y += lineHeight;
    });

    if (hasMoreRows) {
      doc
        .font("Helvetica-Oblique")
        .fontSize(7)
        .fillColor("#93c5fd")
        .text("continues on next page", x + CODE_PADDING_X, startY + blockHeight - CODE_PADDING_Y + 1, {
          width: width - CODE_PADDING_X * 2,
          align: "right",
        });
    }

    doc.y = startY + blockHeight + 8;
    index += slice.length;
  }
};

const renderMathBlock = (doc, block, options = {}) => {
  const x = options.x || doc.page.margins.left;
  const width = options.width || contentWidth(doc);
  const text = convertMathToPlainText(block.text || "");
  if (!text) return;

  doc.font("Courier").fontSize(Math.max((options.fontSize || 11) + 1, 11));
  const predictedHeight = doc.heightOfString(text, {
    width: width - 24,
    lineGap: 3,
  });

  ensureSpace(doc, Math.min(predictedHeight + 24, 180));
  const startY = doc.y;
  const blockHeight = predictedHeight + 18;

  doc
    .roundedRect(x, startY, width, blockHeight, 7)
    .fillAndStroke("#eff6ff", "#bfdbfe");

  doc
    .font("Courier")
    .fontSize(Math.max((options.fontSize || 11) + 1, 11))
    .fillColor(COLORS.ink)
    .text(text, x + 12, startY + 9, {
      width: width - 24,
      lineGap: 3,
    });

  doc.y = startY + blockHeight + 8;
};

const renderMarkdownImage = async (doc, block, options = {}) => {
  const x = options.x || doc.page.margins.left;
  const width = Math.min(options.width || contentWidth(doc), 420);
  const ok = await embedImage(doc, block.url, {
    x,
    width,
    height: 220,
    align: "center",
  });

  if (!ok && block.alt) {
    renderInlineText(doc, `[image skipped: ${block.alt}]`, {
      x,
      width: options.width || contentWidth(doc),
      fontSize: 9,
      color: COLORS.muted,
    });
  }
};

const renderMarkdown = async (doc, value, options = {}) => {
  const blocks = parseBlocks(value);

  if (!blocks.length) {
    renderInlineText(doc, value, options);
    return;
  }

  for (const block of blocks) {
    switch (block.type) {
      case "heading":
        renderHeading(doc, block, options);
        break;
      case "list":
        renderList(doc, block, options);
        break;
      case "blockquote":
        renderBlockquote(doc, block, options);
        break;
      case "code":
        renderCodeBlock(doc, block, options);
        break;
      case "math":
        renderMathBlock(doc, block, options);
        break;
      case "image":
        await renderMarkdownImage(doc, block, options);
        break;
      case "rule":
        renderRule(doc);
        break;
      default:
        renderInlineText(doc, block.text, options);
    }
  }
};

/**
 * fetches only trusted public images for embedding in a pdf
 *
 * @param {string} imageUrl remote image url from course or question content
 * @returns {Promise<Buffer|null>} image bytes or null when the url is unsafe or unavailable
 */
const fetchImageBuffer = async (imageUrl) => {
  if (!isSafeImageUrl(imageUrl)) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);

  try {
    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "Vidhgrow-PDF-Service/1.0" },
    });

    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") || "";
    if (!/^image\/(png|jpe?g)$/i.test(contentType)) return null;

    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength && contentLength > MAX_IMAGE_BYTES) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) return null;

    return buffer;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

/**
 * embeds an image without letting failed media break the full export
 *
 * @param {PDFDocument} doc active pdfkit document
 * @param {string} imageUrl trusted image url candidate
 * @param {object} options layout constraints for the image slot
 * @returns {Promise<boolean>} whether the image was embedded
 */
const embedImage = async (doc, imageUrl, options = {}) => {
  const buffer = await fetchImageBuffer(imageUrl);
  if (!buffer) return false;

  const {
    x = doc.page.margins.left,
    width = 360,
    height = 220,
    align = "center",
  } = options;

  ensureSpace(doc, height + 16);
  const imageX = align === "center" ? x + (contentWidth(doc) - width) / 2 : x;
  const y = doc.y;

  try {
    doc.image(buffer, imageX, y, {
      fit: [width, height],
      align: "center",
      valign: "center",
    });
    doc.y = y + height + 12;
    return true;
  } catch {
    return false;
  }
};

const sectionTitle = (doc, title, color = COLORS.ink) => {
  ensureSpace(doc, 42);
  doc.moveDown(0.3);
  doc.font("Helvetica-Bold").fontSize(16).fillColor(color);
  doc.text(title, doc.page.margins.left, doc.y, { width: contentWidth(doc) });
  doc
    .moveTo(doc.page.margins.left, doc.y + 4)
    .lineTo(doc.page.margins.left + 90, doc.y + 4)
    .strokeColor(color)
    .lineWidth(1.2)
    .stroke();
  doc.moveDown(0.9);
};

const keyValueRows = (doc, rows) => {
  const x = doc.page.margins.left;
  const width = contentWidth(doc);

  rows.forEach(([label, value]) => {
    ensureSpace(doc, 22);
    const y = doc.y;

    doc.font("Helvetica-Bold").fontSize(10).fillColor(COLORS.muted);
    doc.text(label, x, y, { width: 150 });

    doc.font("Helvetica").fontSize(10).fillColor(COLORS.ink);
    doc.text(escapePdfText(value || "not available", 280), x + 160, y, {
      width: width - 160,
    });
    doc.moveDown(0.5);
  });
};

const typeLabel = (questionType) => {
  if (questionType === "multiple") return "multiple choice";
  if (questionType === "truefalse") return "true or false";
  return "single answer";
};

const answerLabel = (question) => {
  if (question.questionType === "multiple" || question.questionType === "truefalse") {
    const answerIndex = Number(question.correctAnswer);
    const option = question.options?.[answerIndex];
    if (!Number.isInteger(answerIndex) || !option) {
      return escapePdfText(question.correctAnswer || "not available", 300);
    }

    return `${String.fromCharCode(65 + answerIndex)}. ${escapePdfText(option, 300)}`;
  }

  return escapePdfText(question.correctAnswer || "not available", 300);
};

/**
 * keeps the first visible part of a question with its question header
 *
 * @param {PDFDocument} doc active pdfkit document
 * @returns {void}
 */
const ensureQuestionStart = (doc) => {
  const available = bottomLimit(doc) - doc.y;
  const minimumQuestionStart = 174;

  if (available < minimumQuestionStart && doc.y > topLimit(doc) + 4) {
    addPage(doc);
  }
};

const ensureSectionStart = (doc) => {
  const available = bottomLimit(doc) - doc.y;
  const minimumSectionStart = 230;

  if (available < minimumSectionStart && doc.y > topLimit(doc) + 4) {
    addPage(doc);
  }
};

const renderQuestion = async (doc, question, index) => {
  ensureQuestionStart(doc);

  const startY = doc.y;
  const x = doc.page.margins.left;
  const width = contentWidth(doc);

  doc
    .roundedRect(x, startY, width, 28, 7)
    .fillAndStroke(COLORS.soft, COLORS.border);

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(COLORS.ink)
    .text(`Question ${index + 1}`, x + 12, startY + 8, { continued: true });

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(COLORS.muted)
    .text(`   ${typeLabel(question.questionType)}${question.isActive === false ? "   inactive" : ""}`);

  doc.y = startY + 40;
  await renderMarkdown(doc, question.question, { x, width, fontSize: 11 });
  doc.moveDown(0.55);

  if (question.image?.url) {
    const ok = await embedImage(doc, question.image.url, {
      x,
      width: 360,
      height: 220,
    });

    if (!ok) {
      renderInlineText(doc, "[image skipped because it is unavailable or not a supported secure image]", {
        x,
        width,
        fontSize: 9,
        color: COLORS.muted,
      });
    }
  }

  if (question.questionType === "multiple" || question.questionType === "truefalse") {
    ensureSpace(doc, 92);
    doc.moveDown(QUESTION_SECTION_GAP / 11);
    doc.font("Helvetica-Bold").fontSize(10).fillColor(COLORS.muted);
    doc.text("Options", x, doc.y);
    doc.moveDown(0.6);

    const options = question.options || [];
    for (let optionIndex = 0; optionIndex < options.length; optionIndex += 1) {
      ensureSpace(doc, 42);
      const option = options[optionIndex];
      const isCorrect = Number(question.correctAnswer) === optionIndex;
      const y = doc.y;
      const label = `${String.fromCharCode(65 + optionIndex)}.`;

      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor(isCorrect ? COLORS.green : COLORS.muted)
        .text(label, x + 8, y, { width: 24 });

      doc.y = y;
      await renderMarkdown(doc, option, {
        x: x + 38,
        width: width - 38,
        fontSize: 10,
        color: isCorrect ? COLORS.green : COLORS.ink,
      });
      doc.moveDown(0.18);
    }
  }

  ensureSpace(doc, 58);
  doc.moveDown(0.75);
  doc.font("Helvetica-Bold").fontSize(10).fillColor(COLORS.green);
  doc.text("Correct answer", x, doc.y);
  doc.moveDown(0.45);
  renderInlineText(doc, answerLabel(question), {
    x,
    width,
    fontSize: 10,
    color: COLORS.ink,
    paragraphGap: 6,
  });

  if (question.explanation) {
    ensureSpace(doc, 70);
    doc.moveDown(0.65);
    doc
      .moveTo(x, doc.y)
      .lineTo(x + width, doc.y)
      .strokeColor(COLORS.border)
      .lineWidth(0.45)
      .stroke();
    doc.moveDown(0.65);
    doc.font("Helvetica-Bold").fontSize(10).fillColor(COLORS.muted);
    doc.text("Explanation", x, doc.y);
    doc.moveDown(0.6);
    await renderMarkdown(doc, question.explanation, {
      x,
      width,
      fontSize: 10,
      paragraphGap: 7,
      lineGap: 4,
    });
  }

  ensureSpace(doc, 14);
  doc
    .moveTo(x, doc.y + 4)
    .lineTo(x + width, doc.y + 4)
    .strokeColor(COLORS.border)
    .lineWidth(0.5)
    .stroke();
  doc.moveDown(0.9);
};

const difficultyOrder = (name) => {
  const order = { Easy: 1, Medium: 2, Hard: 3 };
  return order[name] || 99;
};

const courseTitle = (course) =>
  compactText(course?.name || course?.title || course?.courseTitle || "Untitled course", 140);

const categoryLabel = (course) => {
  if (typeof course?.category === "string") return compactText(course.category, 120) || "uncategorized";
  return compactText(course?.category?.name || course?.categoryName || "uncategorized", 120);
};

const courseDifficulties = (course) => {
  if (Array.isArray(course?.difficulties)) return course.difficulties;
  if (Array.isArray(course?.difficultySettings)) return course.difficultySettings;
  return [];
};

const difficultyName = (difficulty = {}) =>
  compactText(difficulty.name || difficulty.level || difficulty.difficulty || "difficulty", 50);

/**
 * creates a course export pdf that mirrors frontend markdown features where pdfkit can represent them
 *
 * @param {object} course course data including questions, difficulty settings, and media references
 * @param {object} options export controls supplied by the authenticated controller
 * @param {object} options.exportedBy actor details used for visible audit context
 * @param {string} options.exportedBy.role actor role shown beside the exported by row
 * @param {string} options.exportedBy.name actor name shown for admin, teacher, or student exports
 * @param {string} options.exportedBy.email actor email shown only when includeemail is true or role is admin
 * @param {boolean} options.exportedBy.includeEmail allows a trusted route to show email in the pdf
 * @returns {Promise<Buffer>} generated pdf bytes ready to send as application/pdf
 */
export const generateCoursePDF = async (course, options = {}) =>
  new Promise((resolve, reject) => {
    (async () => {
      try {
        const exportContext = normalizeExportContext(options.exportedBy);
        const title = courseTitle(course);
        const difficulties = courseDifficulties(course);

        const doc = new PDFDocument({
          size: PAGE.size,
          margins: PAGE.margins,
          autoFirstPage: false,
          bufferPages: true,
          info: {
            Title: `${title} - Course Information`,
            Author: exportContext.visibleIdentity || "Vidhgrow",
            Subject: "Course Data Export",
            Keywords: "course, export, admin, education",
            Producer: "Vidhgrow PDF Service",
            Creator: "Vidhgrow Platform",
          },
        });

        const chunks = [];
        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);
        doc.on("pageAdded", () => drawPageWatermark(doc));

        addPage(doc);

        doc
          .font("Helvetica-Bold")
          .fontSize(28)
          .fillColor(COLORS.ink)
          .text(title, {
            width: contentWidth(doc),
            align: "center",
          });

        doc.moveDown(0.35);
        doc
          .font("Helvetica")
          .fontSize(10)
          .fillColor(COLORS.muted)
          .text(`Course export for ${exportContext.visibleIdentity}`, {
            width: contentWidth(doc),
            align: "center",
          });

        doc.moveDown(1.2);

        if (course.image?.url) {
          await embedImage(doc, course.image.url, {
            x: doc.page.margins.left,
            width: 180,
            height: 130,
          });
        }

        if (course.description) {
          sectionTitle(doc, "Description", COLORS.blue);
          await renderMarkdown(doc, course.description, {
            x: doc.page.margins.left,
            width: contentWidth(doc),
            fontSize: 11,
            color: COLORS.ink,
          });
        }

        sectionTitle(doc, "Course details", COLORS.blue);
        keyValueRows(doc, [
          ["Category", categoryLabel(course)],
          ["Type", course.isPaid ? `paid (${course.currency || "INR"} ${course.price || 0})` : "free"],
          ["Status", course.isActive ? "active" : "inactive"],
          ["Approval", course.approvalStatus || "approved"],
          ["Questions", String(course.questions?.length || course.totalQuestions || 0)],
          ["Created", safeDate(course.createdAt)],
          ["Exported by", `${exportContext.visibleIdentity} (${exportContext.role})`],
        ]);

        if (difficulties.length) {
          sectionTitle(doc, "Difficulty setup", COLORS.blue);

          [...difficulties]
            .sort((a, b) => difficultyOrder(difficultyName(a)) - difficultyOrder(difficultyName(b)))
            .forEach((difficulty) => {
              ensureSpace(doc, 54);
              const label = difficultyName(difficulty);
              const color = DIFFICULTY_COLORS[label] || COLORS.blue;
              const y = doc.y;
              const x = doc.page.margins.left;

              doc.roundedRect(x, y, contentWidth(doc), 48, 8).fillAndStroke(COLORS.soft, COLORS.border);
              doc.font("Helvetica-Bold").fontSize(12).fillColor(color);
              doc.text(label, x + 12, y + 10, { width: 120 });

              doc.font("Helvetica").fontSize(9).fillColor(COLORS.muted);
              doc.text(
                `${difficulty.marksPerQuestion || 0} marks x ${difficulty.maxQuestions || 0} questions = ${difficulty.totalMarks || 0} marks`,
                x + 132,
                y + 10,
                { width: contentWidth(doc) - 146 },
              );
              doc.text(
                `time limit: ${difficulty.timerSettings?.minTime || "-"}-${difficulty.timerSettings?.maxTime || "-"} minutes`,
                x + 132,
                y + 26,
                { width: contentWidth(doc) - 146 },
              );
              doc.y = y + 58;
            });
        }

        const questions = Array.isArray(course.questions) ? course.questions : [];

        if (!questions.length) {
          sectionTitle(doc, "Questions", COLORS.blue);
          renderInlineText(doc, "No questions have been added to this course yet.", {
            fontSize: 11,
            color: COLORS.muted,
          });
        } else {
          const grouped = questions.reduce((acc, question) => {
            const key = question.difficulty || "Unknown";
            if (!acc[key]) acc[key] = [];
            acc[key].push(question);
            return acc;
          }, {});

          const difficulties = Object.keys(grouped).sort(
            (a, b) => difficultyOrder(a) - difficultyOrder(b),
          );

          let questionNumber = 0;
          for (const difficulty of difficulties) {
            const color = DIFFICULTY_COLORS[difficulty] || COLORS.blue;
            ensureSectionStart(doc);
            sectionTitle(doc, `${difficulty} questions`, color);

            for (let index = 0; index < grouped[difficulty].length; index += 1) {
              await renderQuestion(doc, grouped[difficulty][index], questionNumber);
              questionNumber += 1;
            }
          }
        }

        ensureSpace(doc, 58);
        sectionTitle(doc, "Export note", COLORS.blue);
        renderInlineText(
          doc,
          `Generated on ${new Date().toLocaleString("en-US")} for ${exportContext.visibleIdentity}. This file reflects the course data available to the authenticated ${exportContext.role} at export time.`,
          { fontSize: 10, color: COLORS.muted },
        );

        finalizeFooters(doc, exportContext);
        doc.end();
      } catch (error) {
        reject(error);
      }
    })();
  });
