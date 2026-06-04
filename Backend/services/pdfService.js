/**
 * keeps the pdf service service focused and readable.
 */
import PDFDocument from "pdfkit";

/**
 * pdf service for generating test result pdfs and course pdfs
 * @module services/pdfservice
 *
 * features:
 * - rich text rendering (markdown-like formatting)
 * - image embedding (course logos, question images)
 * - responsive layout with page break detection
 * - professional typography with multiple font sizes
 * - watermarks and footers
 * - production-ready error handling
 */


class PDFService {
  /**
   * rich text renderer for pdf
   * converts markdown-like text to formatted pdf content
   * similar to richtextrenderer.jsx but for pdfkit
   *
   * supported formats:
   * - **bold text** → bold
   * - *italic text* → italic
   * - `code` → monospace code
   * - line breaks preserved
   *
   * @param {pdfdocument} doc - pdfkit document instance
   * @param {string} text - text to render with markdown
   * @param {number} x - x position
   * @param {number} y - y position
   * @param {object} options - rendering options (fontsize, color, width, etc.)
   */
  renderRichText(doc, text, x, y, options = {}) {
    doc.registerFont("MathFont", "fonts/DejaVuSans.ttf");
    const {
      fontSize = 12,
      color = "#1a1a1a",
      width = doc.page.width - 150,
      lineGap = 3,
      indent = 0,
    } = options;

    if (!text || typeof text !== "string") {
      return doc.y;
    }

    let currentY = y;
    doc.fontSize(fontSize).fillColor(color);

    // check for code blocks first
    const codeBlockPattern = /\[CODE_BLOCK:(\w+)\]([\s\S]*?)\[\/CODE_BLOCK\]/g;
    let lastIndex = 0;
    let hasCodeBlocks = false;

    text.replace(codeBlockPattern, (match, lang, code, offset) => {
      hasCodeBlocks = true;

      // render text code block
      if (offset > lastIndex) {
        const beforeText = text.substring(lastIndex, offset);
        currentY = this.renderRichText(doc, beforeText, x, currentY, options);
      }

      // render code block with styling
      currentY = this.renderCodeBlock(doc, code, lang, x, currentY, width);
      lastIndex = offset + match.length;

      return match;
    });

    // render remaining text last code block
    if (hasCodeBlocks && lastIndex < text.length) {
      const remainingText = text.substring(lastIndex);
      return this.renderRichText(doc, remainingText, x, currentY, options);
    }

    // if no code blocks, proceed with normal rendering
    if (hasCodeBlocks) {
      return currentY;
    }

    // ... existing line-by-line rendering logic remains same ...
    const lines = text.split("\n");

    lines.forEach((line, lineIndex) => {
      if (currentY > doc.page.height - 150) {
        return;
      }

      if (line.trim() === "") {
        currentY += fontSize * 0.5;
        return;
      }

      const segments = this.parseMarkdown(line);
      let currentX = x + indent;

      segments.forEach((segment, segIndex) => {
        const segmentWidth = doc.widthOfString(segment.text);

        if (currentX + segmentWidth > x + width && segIndex > 0) {
          currentY += fontSize + lineGap;
          currentX = x + indent;

          if (currentY > doc.page.height - 150) {
            return;
          }
        }

        switch (segment.type) {
          case "bold":
            doc.font("Helvetica-Bold");
            break;
          case "italic":
            doc.font("Helvetica-Oblique");
            break;
          case "code":
            // inline code styling
            doc.font("Courier");
            doc.fontSize(fontSize);

            // draw background rectangle text
            const bgPadding = 2;
            const bgWidth = Math.ceil(
              doc.widthOfString(" " + segment.text + " ")
            );
            const lineHeight = fontSize * 1.8; //
            const bgHeight = lineHeight;
            const bgY = currentY - fontSize * 0.65;

            // save current state
            doc.save();

            // fill background (no stroke to avoid border overlap)
            doc.rect(currentX - 4, bgY, bgWidth + 8, bgHeight).fill("#f3f4f6");

            // draw border
            doc
              .rect(
                currentX - bgPadding,
                currentY - bgPadding,
                bgWidth,
                bgHeight
              )
              .stroke("#e5e7eb");

            // restore state to continue with text
            doc.restore();

            // reset font and color for text rendering
            doc.font("Courier");
            doc.fontSize(fontSize);
            doc.fillColor("#dc2626");
            break;
          default:
            doc.font("MathFont");
        }

        const hasMath =
          /[√⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖʳˢᵗᵘᵛʷˣʸᶻ₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓ]/.test(
            segment.text
          );

        if (hasMath) {
          const mathY = this.renderMathText(
            doc,
            segment.text,
            currentX,
            currentY,
            {
              fontSize,
              color,
              width: width - (currentX - x),
            }
          );
          currentX += doc.widthOfString(segment.text);
        } else {
          doc.text(segment.text, currentX, currentY, {
            continued: segIndex < segments.length - 1,
            lineBreak: false,
          });
          currentX += segmentWidth;
        }

        if (segment.type === "code") {
          doc.fontSize(fontSize);
          doc.font("Helvetica");
        }
      });

      currentY += fontSize + lineGap;
    });

    doc.y = currentY;
    return currentY;
  }

  /**
   * render text with proper superscript/subscript sizing
   * uses pdfkit font size control for better readability than pure unicode
   * @param {pdfdocument} doc - pdfkit document instance
   * @param {string} text - text with unicode super/subscripts
   * @param {number} x - x position
   * @param {number} y - y position
   * @param {object} options - rendering options
   * @returns {number} final y position rendering
   */
  renderMathText(doc, text, x, y, options = {}) {
    doc.registerFont("MathFont", "fonts/DejaVuSans.ttf");
    const {
      fontSize = 12,
      color = "#1a1a1a",
      width = doc.page.width - 150,
      font = "MathFont",
    } = options;

    // unicode character sets for detection
    const superscripts = "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖʳˢᵗᵘᵛʷˣʸᶻ";
    const subscripts = "₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓ";

    // check if text contains super/subscripts
    const hasMath = text
      .split("")
      .some((char) => superscripts.includes(char) || subscripts.includes(char));

    // if no math, render normally
    if (!hasMath) {
      doc.fontSize(fontSize).font("MathFont").fillColor(color);
      doc.text(text, x, y, { width, lineBreak: false });
      return doc.y;
    }

    // render character by character with proper sizing
    doc.fontSize(fontSize).font("MathFont").fillColor(color);

    let currentX = x;
    const baseY = y;
    const scriptSize = Math.round(fontSize * 0.64); // 64% of base size
    const superscriptOffset = -Math.round(fontSize * 0.4); // raise by 40%
    const subscriptOffset = Math.round(fontSize * 0.25); // lower by 25%

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      let charY = baseY;
      let charSize = fontSize;

      if (superscripts.includes(char)) {
        charSize = scriptSize;
        charY = baseY + superscriptOffset;
      } else if (subscripts.includes(char)) {
        charSize = scriptSize;
        charY = baseY + subscriptOffset;
      }

      doc.fontSize(charSize);
      doc.text(char, currentX, charY, {
        lineBreak: false,
        continued: false,
      });

      // calculate width for next character position
      currentX += doc.widthOfString(char);

      // check for line wrap
      if (currentX > x + width) {
        currentX = x;
        baseY += fontSize + 3;
      }
    }

    // reset font size
    doc.fontSize(fontSize);

    return baseY + fontSize;
  }

  /**
   * render code block with proper styling
   * background: #f3f4f6 (light gray)
   * text: #1f2937 (dark gray)
   * font: courier (monospace)
   * border: #e5e7eb (gray border)
   *
   * @param {pdfdocument} doc - pdfkit document instance
   * @param {string} code - code content
   * @param {string} language - programming language
   * @param {number} x - x position
   * @param {number} y - y position
   * @param {number} width - block width
   * @returns {number} final y position rendering
   */
  renderCodeBlock(doc, code, language, x, y, width) {
    const padding = 12;
    const fontSize = 18;
    const lineHeight = fontSize * 1.45;

    // calculate block height
    const lines = code.split("\n");
    const labelHeight = language && language !== "text" ? 18 : 0;

    const blockHeight =
      padding * 6 + labelHeight + lines.length * lineHeight + padding;

    // check if we need a page
    if (y + blockHeight > doc.page.height - 100) {
      // return early - let caller handle page break
      return y;
    }

    // draw background rectangle
    doc.save();
    doc
      .rect(x, y, width, blockHeight)
      .fillAndStroke("#f3f4f6", "#e5e7eb")
      .lineWidth(1);
    doc.restore();

    // draw language label
    if (language && language !== "text") {
      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .fillColor("#6b7280")
        .text(language, x + padding, y + padding + 8, {
          width: width - padding * 10,
          align: "left",
        });
    }

    // render code lines
    let currentY = y + padding + (language !== "text" ? 20 : 0);

    doc.fontSize(fontSize).font("Courier").fillColor("#1f2937");

    lines.forEach((line) => {
      if (line.trim()) {
        doc.text(line, x + padding, currentY, {
          width: width - padding * 10,
          lineBreak: false,
          continued: false,
        });
      }
      currentY += lineHeight;
    });

    // reset font
    doc.font("Helvetica").fillColor("#1a1a1a");

    return y + blockHeight + 10; // +10 for spacing block
  }

  /**
   * parse markdown-like text into segments with formatting
   * @param {string} text - text to parse
   * @returns {array} array of {type, text} objects
   */
  parseMarkdown(text) {
    const segments = [];
    let remaining = text;

    text = this.convertMathToPlainText(text);

    // regex patterns for markdown
    const patterns = [
      { regex: /\*\*(.+?)\*\*/g, type: "bold" }, // **bold**
      { regex: /\*(.+?)\*/g, type: "italic" }, // *italic*
      { regex: /`(.+?)`/g, type: "code" }, // `code`
    ];

    let lastIndex = 0;

    // find all markdown patterns
    const matches = [];
    patterns.forEach((pattern) => {
      let match;
      const regex = new RegExp(pattern.regex.source, "g");
      while ((match = regex.exec(text)) !== null) {
        matches.push({
          index: match.index,
          length: match[0].length,
          text: match[1],
          type: pattern.type,
        });
      }
    });

    // sort matches by position
    matches.sort((a, b) => a.index - b.index);

    // build segments
    if (matches.length === 0) {
      // no formatting, return as plain text
      return [{ type: "plain", text }];
    }

    matches.forEach((match) => {
      // plain text this match
      if (match.index > lastIndex) {
        segments.push({
          type: "plain",
          text: text.substring(lastIndex, match.index),
        });
      }

      // formatted segment
      segments.push({
        type: match.type,
        text: match.text,
      });

      lastIndex = match.index + match.length;
    });

    // remaining plain text
    if (lastIndex < text.length) {
      segments.push({
        type: "plain",
        text: text.substring(lastIndex),
      });
    }

    return segments;
  }

  processCodeBlocks = (text) => {
    if (!text) return "";

    // multi-line code blocks: ```language\ncode\n```
    // handle with or without lines
    text = text.replace(
      /```(\w+)?\s*\n?([\s\S]*?)```/g,
      (match, lang, code) => {
        return `[CODE_BLOCK:${lang || "text"}]${code.trim()}[/CODE_BLOCK]`;
      }
    );

    // inline code: `code`
    // leave as-is, will be handled by parsemarkdown
    return text;
  };

  /**
   * convert latex math to unicode plain text for pdf
   * handles nested braces, multi-digit exponents, comprehensive math symbols
   * uses single conversion function for both inline and block math
   * @param {string} text - text with latex math
   * @returns {string} text with math
   */
  convertMathToPlainText(text) {
    if (!text) return "";

    // process code blocks first math conversion
    // this prevents math symbols inside code from being converted
    text = this.processCodeBlocks(text);
    /**
     * helper: convert string to superscript unicode
     */
    const toSuperscript = (str) => {
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

      return str
        .split("")
        .map((char) => superscriptMap[char] || char)
        .join("");
    };

    /**
     * helper: convert string to subscript unicode
     */
    const toSubscript = (str) => {
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

      return str
        .split("")
        .map((char) => subscriptMap[char] || char)
        .join("");
    };

    /**
     * helper: extract content from balanced braces
     * handles nested braces properly by counting depth
     */
    const extractBalancedBraces = (str, startIndex) => {
      let depth = 1;
      let content = "";
      let i = startIndex + 1;

      while (i < str.length && depth > 0) {
        if (str[i] === "{" && str[i - 1] !== "\\") {
          depth++;
          content += str[i];
        } else if (str[i] === "}" && str[i - 1] !== "\\") {
          depth--;
          if (depth > 0) content += str[i];
        } else {
          content += str[i];
        }
        i++;
      }

      return { content, endIndex: i };
    };

    /**
     * core conversion logic
     * single source of truth for all math conversion
     * used by both inline $...$ and block $$...$$ math
     * @param {string} math - latex math expression
     * @returns {string} unicode-converted math
     */
    const convertMath = (math) => {
      let converted = math;

      // exponents (braced, with nesting support)
      let expIndex = 0;
      while ((expIndex = converted.indexOf("^{", expIndex)) !== -1) {
        const braceStart = expIndex + 1;
        const exponent = extractBalancedBraces(converted, braceStart);

        // recursively convert nested content first, then apply superscript
        const expConverted = toSuperscript(convertMath(exponent.content));

        converted =
          converted.substring(0, expIndex) +
          expConverted +
          converted.substring(exponent.endIndex);

        expIndex += expConverted.length;
      }

      // exponents (non-braced, no nesting possible)
      // only match if not already converted to unicode superscript
      converted = converted.replace(
        /\^([0-9]+)(?![⁰¹²³⁴⁵⁶⁷⁸⁹])/g,
        (match, digits) => {
          return toSuperscript(digits);
        }
      );

      converted = converted.replace(
        /\^([a-zA-Z])(?![ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖʳˢᵗᵘᵛʷˣʸᶻ])/g,
        (match, char) => {
          return toSuperscript(char);
        }
      );

      // subscripts (braced, with nesting support)
      let subIndex = 0;
      while ((subIndex = converted.indexOf("_{", subIndex)) !== -1) {
        const braceStart = subIndex + 1;
        const subscript = extractBalancedBraces(converted, braceStart);

        // recursively convert nested content first, then apply subscript
        const subConverted = toSubscript(convertMath(subscript.content));

        converted =
          converted.substring(0, subIndex) +
          subConverted +
          converted.substring(subscript.endIndex);

        subIndex += subConverted.length;
      }

      // subscripts (non-braced, no nesting possible)
      converted = converted.replace(
        /\_([0-9]+)(?![₀₁₂₃₄₅₆₇₈₉])/g,
        (match, digits) => {
          return toSubscript(digits);
        }
      );

      converted = converted.replace(
        /\_([a-zA-Z])(?![ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓ])/g,
        (match, char) => {
          return toSubscript(char);
        }
      );

      // fractions (with nesting support)
      let fracIndex = 0;
      while ((fracIndex = converted.indexOf("\\frac{", fracIndex)) !== -1) {
        const numeratorStart = fracIndex + 6;
        const numerator = extractBalancedBraces(converted, numeratorStart - 1);
        const denominatorStart = numerator.endIndex + 1;

        if (converted[numerator.endIndex] === "{") {
          const denominator = extractBalancedBraces(
            converted,
            denominatorStart - 1
          );

          // recursively convert both numerator and denominator
          const numConverted = convertMath(numerator.content);
          const denomConverted = convertMath(denominator.content);

          const replacement = `(${numConverted}/${denomConverted})`;
          converted =
            converted.substring(0, fracIndex) +
            replacement +
            converted.substring(denominator.endIndex);

          fracIndex += replacement.length;
        } else {
          fracIndex += 6;
        }
      }

      // latex spacing commands - remove processing math
      // these are latex formatting commands that don't have unicode equivalents
      converted = converted
        .replace(/\\:/g, "") // medium space
        .replace(/\\;/g, "") // thick space
        .replace(/\\!/g, "") // negative thin space
        .replace(/\\ /g, " ") // normal space (backslash-space)
        .replace(/~/g, " ") // non-breaking space
        .replace(/\\quad/g, "  ") // quad space (approximate)
        .replace(/\\qquad/g, "    "); // double quad space (approximate)

      // square roots (with nesting support)
      let sqrtIndex = 0;
      while ((sqrtIndex = converted.indexOf("\\sqrt{", sqrtIndex)) !== -1) {
        const braceStart = sqrtIndex + 5;
        const content = extractBalancedBraces(converted, braceStart);

        // recursively convert nested content
        let contentConverted = convertMath(content.content);

        // handle empty sqrt or just whitespace (like \sqrt{\,})
        if (
          !contentConverted ||
          contentConverted.trim() === "" ||
          contentConverted.trim() === ","
        ) {
          const replacement = "√";

          converted =
            converted.substring(0, sqrtIndex) +
            replacement +
            converted.substring(content.endIndex);

          sqrtIndex += replacement.length;
          continue;
        }

        const replacement = `√(${contentConverted})`;

        converted =
          converted.substring(0, sqrtIndex) +
          replacement +
          converted.substring(content.endIndex);

        sqrtIndex += replacement.length;
      }
      // nth roots (with nesting support)
      let nthRootIndex = 0;
      while (
        (nthRootIndex = converted.indexOf("\\sqrt[", nthRootIndex)) !== -1
      ) {
        const orderStart = nthRootIndex + 6;
        const orderEnd = converted.indexOf("]", orderStart);

        if (orderEnd === -1 || converted[orderEnd + 1] !== "{") {
          nthRootIndex += 6;
          continue;
        }

        const order = converted.substring(orderStart, orderEnd);
        const braceStart = orderEnd + 1;
        const content = extractBalancedBraces(converted, braceStart);

        // recursively convert nested content
        const contentConverted = convertMath(content.content);
        const replacement = `${order}√(${contentConverted})`;

        converted =
          converted.substring(0, nthRootIndex) +
          replacement +
          converted.substring(content.endIndex);

        nthRootIndex += replacement.length;
      }

      // greek letters (lowercase)
      converted = converted
        .replace(/\\alpha/g, "α")
        .replace(/\\beta/g, "β")
        .replace(/\\gamma/g, "γ")
        .replace(/\\delta/g, "δ")
        .replace(/\\epsilon/g, "ε")
        .replace(/\\zeta/g, "ζ")
        .replace(/\\eta/g, "η")
        .replace(/\\theta/g, "θ")
        .replace(/\\iota/g, "ι")
        .replace(/\\kappa/g, "κ")
        .replace(/\\lambda/g, "λ")
        .replace(/\\mu/g, "μ")
        .replace(/\\nu/g, "ν")
        .replace(/\\xi/g, "ξ")
        .replace(/\\pi/g, "π")
        .replace(/\\rho/g, "ρ")
        .replace(/\\sigma/g, "σ")
        .replace(/\\tau/g, "τ")
        .replace(/\\upsilon/g, "υ")
        .replace(/\\phi/g, "φ")
        .replace(/\\chi/g, "χ")
        .replace(/\\psi/g, "ψ")
        .replace(/\\omega/g, "ω");

      // greek letters (uppercase)
      converted = converted
        .replace(/\\Gamma/g, "Γ")
        .replace(/\\Delta/g, "Δ")
        .replace(/\\Theta/g, "Θ")
        .replace(/\\Lambda/g, "Λ")
        .replace(/\\Xi/g, "Ξ")
        .replace(/\\Pi/g, "Π")
        .replace(/\\Sigma/g, "Σ")
        .replace(/\\Phi/g, "Φ")
        .replace(/\\Psi/g, "Ψ")
        .replace(/\\Omega/g, "Ω");

      // operators
      converted = converted
        .replace(/\\times/g, "×")
        .replace(/\\cdot/g, "·")
        .replace(/\\div/g, "÷")
        .replace(/\\pm/g, "±")
        .replace(/\\mp/g, "∓");

      // relations (longer patterns first to avoid prefix conflicts)
      converted = converted
        .replace(/\\notin/g, "∉")
        .replace(/\\subseteq/g, "⊆")
        .replace(/\\supseteq/g, "⊇")
        .replace(/\\in/g, "∈")
        .replace(/\\subset/g, "⊂")
        .replace(/\\supset/g, "⊃")
        .replace(/\\leq/g, "≤")
        .replace(/\\geq/g, "≥")
        .replace(/\\neq/g, "≠")
        .replace(/\\approx/g, "≈")
        .replace(/\\equiv/g, "≡")
        .replace(/\\sim/g, "∼")
        .replace(/\\propto/g, "∝");

      // calculus (longer patterns first)
      converted = converted
        .replace(/\\arcsin/g, "arcsin")
        .replace(/\\arccos/g, "arccos")
        .replace(/\\arctan/g, "arctan")
        .replace(/\\sin/g, "sin")
        .replace(/\\cos/g, "cos")
        .replace(/\\tan/g, "tan")
        .replace(/\\sum/g, "∑")
        .replace(/\\prod/g, "∏")
        .replace(/\\int/g, "∫")
        .replace(/\\partial/g, "∂")
        .replace(/\\nabla/g, "∇")
        .replace(/\\infty/g, "∞")
        .replace(/\\lim/g, "lim")
        .replace(/\\log/g, "log")
        .replace(/\\ln/g, "ln");

      // set theory
      converted = converted
        .replace(/\\forall/g, "∀")
        .replace(/\\exists/g, "∃")
        .replace(/\\cup/g, "∪")
        .replace(/\\cap/g, "∩")
        .replace(/\\emptyset/g, "∅");

      // logic
      converted = converted
        .replace(/\\implies/g, "⇒")
        .replace(/\\iff/g, "⇔")
        .replace(/\\land/g, "∧")
        .replace(/\\lor/g, "∨")
        .replace(/\\neg/g, "¬");

      // arrows (longer patterns first)
      converted = converted
        .replace(/\\leftrightarrow/g, "↔")
        .replace(/\\Leftrightarrow/g, "⇔")
        .replace(/\\rightarrow/g, "→")
        .replace(/\\leftarrow/g, "←")
        .replace(/\\Rightarrow/g, "⇒")
        .replace(/\\Leftarrow/g, "⇐");

      return converted;
    };

    // inline math: $...$
    // uses convertmath helper
    text = text.replace(/\$([^$]+)\$/g, (match, math) => {
      return convertMath(math);
    });

    // block math: $$...$$
    // uses same convertmath helper, just s lines
    text = text.replace(/\$\$([^$]+)\$\$/g, (match, math) => {
      return "\n" + convertMath(math) + "\n";
    });

    return text;
  }

  /**
   * safely fetch and embed image from url
   * @param {pdfdocument} doc - pdf document
   * @param {string} imageurl - image url (cloudinary, etc.)
   * @param {number} x - x position
   * @param {number} y - y position
   * @param {object} options - image options (width, height, fit)
   * @returns {promise<boolean>} success status
   */
  async embedImage(doc, imageUrl, x, y, options = {}) {
    try {
      const response = await fetch(imageUrl, {
        timeout: 10000, // 10 second timeout
        headers: {
          "User-Agent": "Vidhgrow-PDF-Service/1.0",
        },
      });

      if (!response.ok) {
        console.warn(
          `Failed to fetch image: ${imageUrl} - Status: ${response.status}`
        );
        return false;
      }

      const imageBuffer = Buffer.from(await response.arrayBuffer());

      // validate image size (max 5mb for safety)
      if (imageBuffer.length > 5 * 1024 * 1024) {
        console.warn(
          `Image too large: ${imageUrl} - ${imageBuffer.length} bytes`
        );
        return false;
      }

      // embed image with error handling
      doc.image(imageBuffer, x, y, {
        width: options.width || 400,
        fit: options.fit || [400, 300],
        align: options.align || "left",
        ...options,
      });

      return true;
    } catch (error) {
      console.error(`Error embedding image ${imageUrl}:`, error.message);
      return false;
    }
  }

  /**
   * generate pdf for test result
   * @param {object} testresult - test result data from database
   * @param {object} course - course data from database
   * @param {object} user - user data (name, email)
   * @param {boolean} isadmin - whether requester is admin
   * @returns {promise<buffer>} pdf buffer
   */
  async generateTestResultPDF(testResult, course, user, isAdmin = false) {
    return new Promise((resolve, reject) => {
      (async () => {
        try {
          // create pdf document with optimized settings
          const doc = new PDFDocument({
            size: "A4",
            margins: {
              top: 50,
              bottom: 70, // increased for footer
              left: 50,
              right: 50,
            },
            bufferPages: true, // enable page buffering for better performance
            info: {
              Title: `${course.name} - Test Result`,
              Author: "Vidhgrow",
              Subject: "Test Result Report",
              Keywords: "test, result, report, education",
              Producer: "Vidhgrow PDF Service v1.0",
              Creator: "Vidhgrow Platform",
            },
          });

          const chunks = [];
          doc.on("data", (chunk) => chunks.push(chunk));
          doc.on("end", () => resolve(Buffer.concat(chunks)));
          doc.on("error", reject);

          // page counter
          let pageNumber = 1;

          /**
           * watermark to current page
           * semi-transparent "vidhgrow" text rotated 45 degrees
           */
          const addWatermark = () => {
            doc.save();
            doc
              .fontSize(60)
              .font("Helvetica-Bold")
              .fillColor("#000000", 0.05)
              .rotate(-45, {
                origin: [doc.page.width / 2, doc.page.height / 2],
              })
              .text("Vidhgrow", 0, doc.page.height / 2, {
                align: "center",
                lineBreak: false,
              });
            doc.restore();
          };

          /**
           * footer with page number and user info
           * only s footer if page has content (prevents blank page footers)
           */
          const addFooter = () => {
            // skip footer for empty or near-empty pages
            // a page is "empty" if current y is less than 200px from the top
            // (accounting for margins and potential headers)
            const minimumContentThreshold = 500;

            if (doc.y < minimumContentThreshold) {
              console.log(`Skipping footer - empty page at Y=${doc.y}`);
              return;
            }

            const footerY = doc.page.height - 40;

            // separator line
            doc
              .moveTo(50, footerY - 10)
              .lineTo(doc.page.width - 50, footerY - 10)
              .strokeColor("#e5e7eb")
              .lineWidth(1)
              .stroke();

            // page number (center)
            doc
              .fontSize(10)
              .font("Helvetica")
              .fillColor("#666666")
              .text(`Page ${pageNumber}`, 0, footerY, {
                align: "center",
                width: doc.page.width,
              });

            // user identifier (right)
            const displayName = isAdmin ? "Admin" : user.name || user.email;
            doc
              .fontSize(9)
              .font("Helvetica")
              .fillColor("#999999")
              .text(displayName, doc.page.width - 130, footerY, {
                width: 80,
                align: "right",
              });

            pageNumber++;
          };

          // title page
          addWatermark();

          // course name (large, bold, centered)
          doc
            .fontSize(36)
            .font("Helvetica-Bold")
            .fillColor("#1a1a1a")
            .text(course.name, 50, 80, {
              align: "center",
              width: doc.page.width - 100,
            });

          doc.moveDown(0.5);

          // test result title
          doc
            .fontSize(24)
            .font("Helvetica")
            .fillColor("#4a5568")
            .text("Test Result Report", {
              align: "center",
            });

          doc.moveDown(4);

          // candidate information box
          const infoBoxY = doc.y;
          doc
            .roundedRect(75, infoBoxY, doc.page.width - 150, 140, 5)
            .fillAndStroke("#f7fafc", "#e2e8f0");

          doc
            .fillColor("#2d3748")
            .fontSize(16)
            .font("Helvetica-Bold")
            .text("Candidate Information", 90, infoBoxY + 20, {
              underline: true,
            });

          doc.moveDown(1);
          doc
            .fontSize(13)
            .font("Helvetica")
            .fillColor("#4a5568")
            .text(`Name: ${user.name}`, 90, doc.y);

          doc.moveDown(0.5);
          doc.text(`Email: ${user.email}`, 90, doc.y);

          doc.moveDown(0.5);
          doc.text(
            `Date: ${new Date(testResult.completedAt).toLocaleDateString(
              "en-US",
              {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }
            )}`,
            90,
            doc.y
          );

          // course logo
          // position logo to the right of the info box
          if (course.image && course.image.url) {
            const logoSuccess = await this.embedImage(
              doc,
              course.image.url,
              doc.page.width - 175,
              infoBoxY + 20,
              {
                width: 90,
                height: 90,
                fit: [90, 90],
              }
            );

            if (!logoSuccess) {
              // placeholder if logo fails
              doc
                .fontSize(9)
                .font("Helvetica")
                .fillColor("#9ca3af")
                .text(
                  "[Logo unavailable]",
                  doc.page.width - 175,
                  infoBoxY + 50,
                  {
                    width: 90,
                    align: "center",
                  }
                );
            }
          }

          // test statistics box
          doc.moveDown(3);
          const statsBoxY = doc.y;
          doc
            .roundedRect(75, statsBoxY, doc.page.width - 150, 200, 5)
            .fillAndStroke("#f0fdf4", "#86efac");

          doc
            .fillColor("#166534")
            .fontSize(16)
            .font("Helvetica-Bold")
            .text("Test Statistics", 90, statsBoxY + 20, {
              underline: true,
            });

          doc.moveDown(1);
          doc.fontSize(13).font("Helvetica").fillColor("#15803d");

          const stats = [
            `Score: ${testResult.totalScore}/${testResult.maxPossibleScore}`,
            `Percentage: ${testResult.percentage.toFixed(2)}%`,
            `Correct Answers: ${testResult.correctAnswers}`,
            `Wrong Answers: ${testResult.wrongAnswers}`,
            `Unanswered: ${testResult.unanswered}`,
            `Time Taken: ${Math.floor(testResult.timeTaken / 60)} min ${
              testResult.timeTaken % 60
            } sec`,
          ];

          stats.forEach((stat, index) => {
            doc.text(stat, 90, statsBoxY + 60 + index * 22);
          });

          addFooter();

          // question pages
          // group questions by difficulty
          const questionsByDifficulty = {};
          testResult.questions.forEach((q) => {
            const diff = q.difficulty || "Unknown";
            if (!questionsByDifficulty[diff]) {
              questionsByDifficulty[diff] = [];
            }
            questionsByDifficulty[diff].push(q);
          });

          // sort difficulties: easy -> medium -> hard
          const difficultyOrder = ["Easy", "Medium", "Hard"];
          const sortedDifficulties = Object.keys(questionsByDifficulty).sort(
            (a, b) => {
              return difficultyOrder.indexOf(a) - difficultyOrder.indexOf(b);
            }
          );

          // iterate through each difficulty
          for (const difficulty of sortedDifficulties) {
            const questions = questionsByDifficulty[difficulty];

            // page for each difficulty
            doc.addPage();
            addWatermark();

            // difficulty header
            const difficultyColor =
              difficulty === "Easy"
                ? "#16a34a"
                : difficulty === "Medium"
                  ? "#eab308"
                  : "#dc2626";

            doc
              .fontSize(24)
              .font("Helvetica-Bold")
              .fillColor(difficultyColor)
              .text(`${difficulty} Difficulty`, {
                align: "center",
                underline: true,
              });

            doc.moveDown(1.5);

            // iterate through questions in this difficulty
            for (let qIndex = 0; qIndex < questions.length; qIndex++) {
              const questionData = questions[qIndex];
              const questionNum = qIndex + 1;

              // find full question details from course
              const fullQuestion = course.questions.find(
                (q) => q._id.toString() === questionData.question.toString()
              );

              if (!fullQuestion) continue;

              // page break check
              // check if we need a page (leave 250px for question + options + image)
              if (doc.y > doc.page.height - 250) {
                addFooter();
                doc.addPage();
                addWatermark();

                // re-difficulty header on page
                doc
                  .fontSize(18)
                  .font("Helvetica-Bold")
                  .fillColor(difficultyColor)
                  .text(`${difficulty} Difficulty (continued)`, {
                    align: "center",
                  });
                doc.moveDown(1);
              }

              // question number
              doc
                .fontSize(14)
                .font("Helvetica-Bold")
                .fillColor("#1a1a1a")
                .text(`${questionNum}. `, 60, doc.y, {
                  continued: true,
                  width: 40,
                });

              // question text with rich text support
              const questionStartY = doc.y;
              doc.font("Helvetica"); // reset to regular for question text

              // use rich text renderer for question text
              this.renderRichText(
                doc,
                fullQuestion.question,
                100, // x position (indented)
                questionStartY,
                {
                  fontSize: 17,
                  color: "#1a1a1a",
                  width: doc.page.width - 150,
                  lineGap: 4,
                }
              );

              doc.moveDown(0.8);

              // question type indicator
              const typeText =
                fullQuestion.questionType === "multiple"
                  ? "Multiple Choice"
                  : fullQuestion.questionType === "truefalse"
                    ? "True/False"
                    : "Single Answer";

              doc
                .fontSize(12)
                .font("Helvetica-Oblique")
                .fillColor("#6b7280")
                .text(`Type: ${typeText}`, 100, doc.y);

              doc.moveDown(0.5);

              // question image
              if (fullQuestion.image && fullQuestion.image.url) {
                // check if we need a page for the image
                const estimatedImageHeight = 280; // max fit height
                const imageBottomY = doc.y + estimatedImageHeight + 20; // padding

                if (imageBottomY > doc.page.height - 100) {
                  addFooter();
                  doc.addPage();
                  addWatermark();
                  doc.moveDown(2);
                }

                const imageStartY = doc.y;

                const imageSuccess = await this.embedImage(
                  doc,
                  fullQuestion.image.url,
                  100,
                  imageStartY,
                  {
                    width: 420,
                    fit: [420, 280],
                    align: "left",
                  }
                );

                if (imageSuccess) {
                  // manually set doc.y image
                  // pdfkit doesn't automatically move y image()
                  doc.y = imageStartY + estimatedImageHeight + 10; // image height + spacing
                  doc.moveDown(1);
                } else {
                  // show placeholder if image fails
                  doc
                    .fontSize(12)
                    .font("Helvetica")
                    .fillColor("#9ca3af")
                    .text("[Image unavailable]", 100, doc.y);
                  doc.moveDown(0.5);
                }
              }

              // options
              if (
                fullQuestion.questionType === "multiple" ||
                fullQuestion.questionType === "truefalse"
              ) {
                doc.moveDown(0.3);
                doc
                  .fontSize(15)
                  .font("Helvetica-Bold")
                  .fillColor("#374151")
                  .text("Options:", 100, doc.y);

                doc.moveDown(0.4);

                fullQuestion.options.forEach((option, optIndex) => {
                  const isCorrect =
                    optIndex === parseInt(fullQuestion.correctAnswer);
                  const optionLetter = String.fromCharCode(65 + optIndex);

                  const optionColor = isCorrect ? "#16a34a" : "#4b5563";
                  const optionPrefix = isCorrect ? "correct " : "  ";

                  // use rich text renderer for option text
                  doc
                    .fontSize(14)
                    .font("Helvetica")
                    .fillColor(optionColor)
                    .text(`${optionPrefix}${optionLetter}. `, 115, doc.y, {
                      continued: true,
                    });

                  this.renderRichText(doc, option, doc.x, doc.y, {
                    fontSize: 14,
                    color: optionColor,
                    width: doc.page.width - 180,
                    lineGap: 2,
                  });

                  doc.moveDown(0.5);
                });
              } else if (fullQuestion.questionType === "single") {
                // single answer type
                doc
                  .fontSize(14)
                  .font("Helvetica-Bold")
                  .fillColor("#16a34a")
                  .text("Answer: ", 100, doc.y, { continued: true });

                doc
                  .font("Helvetica")
                  .text(fullQuestion.correctAnswer, { continued: false });

                doc.moveDown(0.5);
              }

              // explanation
              if (fullQuestion.explanation) {
                doc.moveDown(0.5);

                doc
                  .fontSize(14)
                  .font("Helvetica-Bold")
                  .fillColor("#4b5563")
                  .text("Explanation:", 100, doc.y);

                doc.moveDown(0.3);

                // use rich text renderer for explanation
                this.renderRichText(doc, fullQuestion.explanation, 100, doc.y, {
                  fontSize: 14,
                  color: "#6b7280",
                  width: doc.page.width - 150,
                  lineGap: 3,
                });
              }

              doc.moveDown(1);

              // separator line between questions
              doc
                .moveTo(60, doc.y)
                .lineTo(doc.page.width - 60, doc.y)
                .strokeColor("#e5e7eb")
                .lineWidth(0.5)
                .stroke();

              doc.moveDown(1);
            }

            // only footer if we actually rendered questions
            if (questions.length > 0) {
              addFooter();
            }
          }

          // closing page
          doc.addPage();
          addWatermark();

          // center content vertically
          const thankYouStartY = (doc.page.height - 200) / 2;
          doc.y = thankYouStartY;

          doc
            .fontSize(40)
            .font("Helvetica-Bold")
            .fillColor("#1a1a1a")
            .text("Thank You!", 0, doc.y, {
              align: "center",
              width: doc.page.width,
            });

          doc.moveDown(2);

          doc
            .fontSize(14)
            .font("Helvetica")
            .fillColor("#6b7280")
            .text(
              "Your performance report has been generated successfully.",
              0,
              doc.y,
              {
                align: "center",
                width: doc.page.width,
              }
            );

          doc.moveDown(1);

          doc
            .fontSize(12)
            .font("Helvetica-Oblique")
            .fillColor("#9ca3af")
            .text("Keep learning and improving with Vidhgrow!", 0, doc.y, {
              align: "center",
              width: doc.page.width,
            });

          doc.moveDown(2);

          doc
            .fontSize(10)
            .font("Helvetica")
            .fillColor("#d1d5db")
            .text(
              `Generated on ${new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}`,
              0,
              doc.y,
              {
                align: "center",
                width: doc.page.width,
              }
            );

          // footer for thank you page
          // only footer if we actually rendered questions
          if (questions.length > 0) {
            addFooter();
          }

          // do not any more pages this
          // finalize pdf immediately
          doc.end();
        } catch (error) {
          reject(error);
        }
      })();
    });
  }

  /**
   * generate pdf for course data only (admin download)
   * @param {object} course - course data from database
   * @returns {promise<buffer>} pdf buffer
   */
  async generateCoursePDF(course) {
    return new Promise((resolve, reject) => {
      (async () => {
        try {
          const doc = new PDFDocument({
            size: "A4",
            margins: { top: 50, bottom: 70, left: 50, right: 50 },
            bufferPages: true,
            info: {
              Title: `${course.name} - Course Information`,
              Author: "Vidhgrow Admin",
              Subject: "Course Data Export",
              Keywords: "course, export, admin, education",
              Producer: "Vidhgrow PDF Service v1.0",
            },
          });

          const chunks = [];
          doc.on("data", (chunk) => chunks.push(chunk));
          doc.on("end", () => resolve(Buffer.concat(chunks)));
          doc.on("error", reject);

          let pageNumber = 1;

          /**
           * watermark to page
           */
          const addWatermark = () => {
            doc.save();
            doc
              .fontSize(60)
              .font("Helvetica-Bold")
              .fillColor("#000000", 0.05)
              .rotate(-45, {
                origin: [doc.page.width / 2, doc.page.height / 2],
              })
              .text("Vidhgrow Admin", 0, doc.page.height / 2, {
                align: "center",
                lineBreak: false,
              });
            doc.restore();
          };

          /**
           * footer with page number and admin indicator
           */
          const addFooter = () => {
            const footerY = doc.page.height - 40;

            doc
              .moveTo(50, footerY - 10)
              .lineTo(doc.page.width - 50, footerY - 10)
              .strokeColor("#e5e7eb")
              .lineWidth(1)
              .stroke();

            doc
              .fontSize(10)
              .font("Helvetica")
              .fillColor("#666666")
              .text(`Page ${pageNumber}`, 0, footerY, {
                align: "center",
                width: doc.page.width,
              });

            doc
              .fontSize(9)
              .font("Helvetica")
              .fillColor("#999999")
              .text("Admin Export", doc.page.width - 130, footerY, {
                width: 80,
                align: "right",
              });

            pageNumber++;
          };

          // course overview page
          addWatermark();

          // course name
          doc
            .fontSize(36)
            .font("Helvetica-Bold")
            .fillColor("#1a1a1a")
            .text(course.name, 50, 80, {
              align: "center",
              width: doc.page.width - 100,
            });

          doc.moveDown(0.8);

          // description with rich text support - centered
          if (course.description) {
            // calculate centered x position
            const descWidth = doc.page.width - 150;
            const centeredX = (doc.page.width - descWidth) / 2;

            doc
              .fontSize(13)
              .font("Helvetica")
              .fillColor("#6b7280")
              .text(course.description, centeredX, doc.y, {
                width: descWidth,
                align: "center",
                lineGap: 4,
              });

            doc.moveDown(1);
          }

          doc.moveDown(3);

          // course logo
          if (course.image && course.image.url) {
            const logoSuccess = await this.embedImage(
              doc,
              course.image.url,
              doc.page.width / 2 - 60,
              doc.y,
              {
                width: 120,
                height: 120,
                fit: [120, 120],
              }
            );

            if (logoSuccess) {
              doc.moveDown(10);
            }
          }

          doc.moveDown(2);

          // course details section
          doc
            .fontSize(16)
            .font("Helvetica-Bold")
            .fillColor("#2d3748")
            .text("Course Details", 75, doc.y, {
              underline: true,
            });

          doc.moveDown(1);

          const detailsY = doc.y;
          doc.fontSize(13).font("Helvetica").fillColor("#4a5568");

          const details = [
            `Category: ${course.category?.name || "Uncategorized"}`,
            `Type: ${course.isPaid ? `Paid (₹${course.price})` : "Free"}`,
            `Status: ${course.isActive ? "Active" : "Inactive"}`,
            `Total Questions: ${course.totalQuestions || 0}`,
            `Created: ${new Date(course.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}`,
          ];

          details.forEach((detail) => {
            doc.text(detail, 75, doc.y);
            doc.moveDown(0.5);
          });

          doc.moveDown(2);

          // difficulty configuration section
          doc
            .fontSize(16)
            .font("Helvetica-Bold")
            .fillColor("#2d3748")
            .text("Difficulty Configuration", 75, doc.y, {
              underline: true,
            });

          doc.moveDown(1);

          if (course.difficulties && course.difficulties.length > 0) {
            course.difficulties.forEach((diff) => {
              // difficulty name with bold font
              doc
                .fontSize(14)
                .font("Helvetica-Bold")
                .fillColor("#2d3748")
                .text(`${diff.name}:`, 75, doc.y, { continued: true });

              // marks info with regular font
              doc
                .font("Helvetica")
                .fontSize(13)
                .fillColor("#4a5568")
                .text(
                  ` ${diff.marksPerQuestion} marks × ${diff.maxQuestions} questions = ${diff.totalMarks} total marks`,
                  { continued: false }
                );

              doc.moveDown(0.4);

              // time limit -aligned with proper indentation (11 spaces)
              doc
                .fontSize(12)
                .font("Helvetica")
                .fillColor("#6b7280")
                .text(
                  `Time Limit: ${diff.timerSettings?.minTime}-${diff.timerSettings?.maxTime} minutes`,
                  75,
                  doc.y
                );
              doc.moveDown(1);
            });
          }

          addFooter();

          // question pages
          if (course.questions && course.questions.length > 0) {
            const questionsByDifficulty = {};

            course.questions.forEach((q) => {
              const diff = q.difficulty || "Unknown";
              if (!questionsByDifficulty[diff])
                questionsByDifficulty[diff] = [];
              questionsByDifficulty[diff].push(q);
            });

            const difficultyOrder = ["Easy", "Medium", "Hard"];
            const sortedDifficulties = Object.keys(questionsByDifficulty).sort(
              (a, b) => difficultyOrder.indexOf(a) - difficultyOrder.indexOf(b)
            );

            for (const difficulty of sortedDifficulties) {
              const questions = questionsByDifficulty[difficulty];

              // page for each difficulty
              doc.addPage();
              addWatermark();

              const diffColor =
                difficulty === "Easy"
                  ? "#16a34a"
                  : difficulty === "Medium"
                    ? "#eab308"
                    : "#dc2626";

              // difficulty header
              doc
                .fontSize(24)
                .font("Helvetica-Bold")
                .fillColor(diffColor)
                .text(`${difficulty} Difficulty Questions`, 50, 80, {
                  align: "center",
                  underline: true,
                });

              doc.moveDown(2);

              // iterate through questions
              for (let qIndex = 0; qIndex < questions.length; qIndex++) {
                const question = questions[qIndex];

                // check if we need a page (allow 200px buffer at bottom)
                if (doc.y > doc.page.height - 200) {
                  addFooter();
                  doc.addPage();
                  addWatermark();
                  doc.moveDown(2);
                }

                // question number
                doc
                  .fontSize(13)
                  .font("Helvetica-Bold")
                  .fillColor("#1a1a1a")
                  .text(`Question ${qIndex + 1}`, 75, doc.y, {
                    underline: true,
                  });
                doc.moveDown(0.4);

                // question type
                const typeLabel =
                  question.questionType === "multiple"
                    ? "Multiple Choice"
                    : question.questionType === "truefalse"
                      ? "True/False"
                      : "Single Answer";

                doc
                  .fontSize(10)
                  .font("Helvetica-Oblique")
                  .fillColor("#6b7280")
                  .text(`Type: ${typeLabel}`, 75, doc.y);
                doc.moveDown(0.6);

                // question text with rich text support
                this.renderRichText(doc, question.question, 75, doc.y, {
                  fontSize: 12,
                  color: "#1a1a1a",
                  width: doc.page.width - 150,
                  lineGap: 3,
                });

                doc.moveDown(0.7);

                // question image (if exists)
                if (question.image && question.image.url) {
                  const estimatedImageHeight = 260;
                  const imageBottomY = doc.y + estimatedImageHeight + 20;

                  if (imageBottomY > doc.page.height - 100) {
                    addFooter();
                    doc.addPage();
                    addWatermark();
                    doc.moveDown(2);
                  }

                  const imageStartY = doc.y;

                  const imageSuccess = await this.embedImage(
                    doc,
                    question.image.url,
                    90,
                    imageStartY,
                    {
                      width: 400,
                      fit: [400, 260],
                    }
                  );

                  if (imageSuccess) {
                    // manually set doc.y image
                    doc.y = imageStartY + estimatedImageHeight + 10;
                    doc.moveDown(1);
                  } else {
                    doc
                      .fontSize(10)
                      .font("Helvetica")
                      .fillColor("#9ca3af")
                      .text("[Image unavailable]", 90, doc.y);
                    doc.moveDown(0.5);
                  }
                }

                // options section
                if (
                  question.questionType === "multiple" ||
                  question.questionType === "truefalse"
                ) {
                  doc
                    .fontSize(11)
                    .font("Helvetica-Bold")
                    .fillColor("#374151")
                    .text("Options:", 75, doc.y);
                  doc.moveDown(0.5);

                  question.options.forEach((option, optIndex) => {
                    const isCorrect =
                      optIndex === parseInt(question.correctAnswer);
                    const letter = String.fromCharCode(65 + optIndex);

                    doc
                      .fontSize(11)
                      .font("Helvetica")
                      .fillColor(isCorrect ? "#16a34a" : "#4b5563")
                      .text(`  ${letter}. `, 90, doc.y, { continued: true });

                    this.renderRichText(doc, option, doc.x, doc.y, {
                      fontSize: 11,
                      color: isCorrect ? "#16a34a" : "#4b5563",
                      width: doc.page.width - 180,
                      lineGap: 2,
                    });

                    doc.moveDown(0.4);
                  });
                  doc.moveDown(0.3);
                }

                // correct answer section
                doc
                  .fontSize(11)
                  .font("Helvetica-Bold")
                  .fillColor("#16a34a")
                  .text("Correct Answer:", 75, doc.y, { continued: true });

                doc.font("Helvetica").fillColor("#374151");

                if (
                  question.questionType === "multiple" ||
                  question.questionType === "truefalse"
                ) {
                  const correctLetter = String.fromCharCode(
                    65 + parseInt(question.correctAnswer)
                  );
                  doc.text(
                    ` ${correctLetter}. ${
                      question.options[parseInt(question.correctAnswer)]
                    }`,
                    { continued: false }
                  );
                } else {
                  doc.text(` ${question.correctAnswer}`, { continued: false });
                }

                doc.moveDown(0.6);

                // explanation with rich text support
                if (question.explanation) {
                  doc
                    .fontSize(11)
                    .font("Helvetica-Bold")
                    .fillColor("#6b7280")
                    .text("Explanation:", 75, doc.y);

                  doc.moveDown(0.3);

                  this.renderRichText(doc, question.explanation, 75, doc.y, {
                    fontSize: 11,
                    color: "#4b5563",
                    width: doc.page.width - 150,
                    lineGap: 3,
                  });
                }

                doc.moveDown(1);

                // separator line
                doc
                  .moveTo(75, doc.y)
                  .lineTo(doc.page.width - 75, doc.y)
                  .strokeColor("#e5e7eb")
                  .lineWidth(0.5)
                  .stroke();

                doc.moveDown(1);
              }

              // only footer if we actually rendered questions
              if (questions.length > 0) {
                addFooter();
              }
            }
          }

          // only thank-you page if last page had content
          if (doc.y > 200) {
            addFooter();
          }

          doc.addPage();
          addWatermark();

          doc.moveDown(10);

          doc
            .fontSize(40)
            .font("Helvetica-Bold")
            .fillColor("#1a1a1a")
            .text("Thank You!", 0, doc.y, {
              align: "center",
              width: doc.page.width,
            });

          doc.moveDown(2);

          doc
            .fontSize(14)
            .font("Helvetica")
            .fillColor("#6b7280")
            .text(
              "This course data was exported by Vidhgrow Admin Panel",
              0,
              doc.y,
              {
                align: "center",
                width: doc.page.width,
              }
            );

          doc.moveDown(1);

          doc
            .fontSize(12)
            .font("Helvetica-Oblique")
            .fillColor("#9ca3af")
            .text(
              `Export Date: ${new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}`,
              0,
              doc.y,
              {
                align: "center",
                width: doc.page.width,
              }
            );

          addFooter();

          doc.end();
        } catch (error) {
          reject(error);
        }
      })();
    });
  }
}
export default new PDFService();
