import PDFDocument from "pdfkit";

/**
 * PDF Service for generating test result PDFs and course PDFs
 * @module services/pdfService
 *
 * Features:
 * - Rich text rendering (Markdown-like formatting)
 * - Image embedding (course logos, question images)
 * - Responsive layout with page break detection
 * - Professional typography with multiple font sizes
 * - Watermarks and footers
 * - Production-ready error handling
 */


class PDFService {
  /**
   * Rich Text Renderer for PDF
   * Converts markdown-like text to formatted PDF content
   * Similar to RichTextRenderer.jsx but for PDFKit
   *
   * Supported formats:
   * - **bold text** → Bold
   * - *italic text* → Italic
   * - `code` → Monospace code
   * - Line breaks preserved
   *
   * @param {PDFDocument} doc - PDFKit document instance
   * @param {string} text - Text to render with markdown
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {object} options - Rendering options (fontSize, color, width, etc.)
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

    // CRITICAL: Check for code blocks FIRST
    const codeBlockPattern = /\[CODE_BLOCK:(\w+)\]([\s\S]*?)\[\/CODE_BLOCK\]/g;
    let lastIndex = 0;
    let hasCodeBlocks = false;

    text.replace(codeBlockPattern, (match, lang, code, offset) => {
      hasCodeBlocks = true;

      // Render text before code block
      if (offset > lastIndex) {
        const beforeText = text.substring(lastIndex, offset);
        currentY = this.renderRichText(doc, beforeText, x, currentY, options);
      }

      // Render code block with styling
      currentY = this.renderCodeBlock(doc, code, lang, x, currentY, width);
      lastIndex = offset + match.length;

      return match;
    });

    // Render remaining text after last code block
    if (hasCodeBlocks && lastIndex < text.length) {
      const remainingText = text.substring(lastIndex);
      return this.renderRichText(doc, remainingText, x, currentY, options);
    }

    // If no code blocks, proceed with normal rendering
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
            // Inline code styling
            doc.font("Courier");
            doc.fontSize(fontSize);

            // Draw background rectangle BEFORE text
            const bgPadding = 2;
            const bgWidth = Math.ceil(
              doc.widthOfString(" " + segment.text + " ")
            );
            const lineHeight = fontSize * 1.8; // critical
            const bgHeight = lineHeight;
            const bgY = currentY - fontSize * 0.65;

            // Save current state
            doc.save();

            // Fill background (no stroke to avoid border overlap)
            doc.rect(currentX - 4, bgY, bgWidth + 8, bgHeight).fill("#f3f4f6");

            // Draw border
            doc
              .rect(
                currentX - bgPadding,
                currentY - bgPadding,
                bgWidth,
                bgHeight
              )
              .stroke("#e5e7eb");

            // Restore state to continue with text
            doc.restore();

            // Reset font and color for text rendering
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
   * Render text with proper superscript/subscript sizing
   * Uses PDFKit font size control for better readability than pure Unicode
   * @param {PDFDocument} doc - PDFKit document instance
   * @param {string} text - Text with Unicode super/subscripts
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {object} options - Rendering options
   * @returns {number} Final Y position after rendering
   */
  renderMathText(doc, text, x, y, options = {}) {
    doc.registerFont("MathFont", "fonts/DejaVuSans.ttf");
    const {
      fontSize = 12,
      color = "#1a1a1a",
      width = doc.page.width - 150,
      font = "MathFont",
    } = options;

    // Unicode character sets for detection
    const superscripts = "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖʳˢᵗᵘᵛʷˣʸᶻ";
    const subscripts = "₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓ";

    // Check if text contains super/subscripts
    const hasMath = text
      .split("")
      .some((char) => superscripts.includes(char) || subscripts.includes(char));

    // If no math, render normally
    if (!hasMath) {
      doc.fontSize(fontSize).font("MathFont").fillColor(color);
      doc.text(text, x, y, { width, lineBreak: false });
      return doc.y;
    }

    // Render character by character with proper sizing
    doc.fontSize(fontSize).font("MathFont").fillColor(color);

    let currentX = x;
    const baseY = y;
    const scriptSize = Math.round(fontSize * 0.64); // 64% of base size
    const superscriptOffset = -Math.round(fontSize * 0.4); // Raise by 40%
    const subscriptOffset = Math.round(fontSize * 0.25); // Lower by 25%

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

      // Calculate width for next character position
      currentX += doc.widthOfString(char);

      // Check for line wrap
      if (currentX > x + width) {
        currentX = x;
        baseY += fontSize + 3;
      }
    }

    // Reset font size
    doc.fontSize(fontSize);

    return baseY + fontSize;
  }

  /**
   * Render code block with proper styling
   * Background: #f3f4f6 (light gray)
   * Text: #1f2937 (dark gray)
   * Font: Courier (monospace)
   * Border: #e5e7eb (gray border)
   *
   * @param {PDFDocument} doc - PDFKit document instance
   * @param {string} code - Code content
   * @param {string} language - Programming language
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} width - Block width
   * @returns {number} Final Y position after rendering
   */
  renderCodeBlock(doc, code, language, x, y, width) {
    const padding = 12;
    const fontSize = 18;
    const lineHeight = fontSize * 1.45;

    // Calculate block height
    const lines = code.split("\n");
    const labelHeight = language && language !== "text" ? 18 : 0;

    const blockHeight =
      padding * 6 + labelHeight + lines.length * lineHeight + padding;

    // Check if we need a new page
    if (y + blockHeight > doc.page.height - 100) {
      // Return early - let caller handle page break
      return y;
    }

    // Draw background rectangle
    doc.save();
    doc
      .rect(x, y, width, blockHeight)
      .fillAndStroke("#f3f4f6", "#e5e7eb")
      .lineWidth(1);
    doc.restore();

    // Draw language label
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

    // Render code lines
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

    // Reset font
    doc.font("Helvetica").fillColor("#1a1a1a");

    return y + blockHeight + 10; // +10 for spacing after block
  }

  /**
   * Parse markdown-like text into segments with formatting
   * @param {string} text - Text to parse
   * @returns {Array} Array of {type, text} objects
   */
  parseMarkdown(text) {
    const segments = [];
    let remaining = text;

    text = this.convertMathToPlainText(text);

    // Regex patterns for markdown
    const patterns = [
      { regex: /\*\*(.+?)\*\*/g, type: "bold" }, // **bold**
      { regex: /\*(.+?)\*/g, type: "italic" }, // *italic*
      { regex: /`(.+?)`/g, type: "code" }, // `code`
    ];

    let lastIndex = 0;

    // Find all markdown patterns
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

    // Sort matches by position
    matches.sort((a, b) => a.index - b.index);

    // Build segments
    if (matches.length === 0) {
      // No formatting, return as plain text
      return [{ type: "plain", text }];
    }

    matches.forEach((match) => {
      // Add plain text before this match
      if (match.index > lastIndex) {
        segments.push({
          type: "plain",
          text: text.substring(lastIndex, match.index),
        });
      }

      // Add formatted segment
      segments.push({
        type: match.type,
        text: match.text,
      });

      lastIndex = match.index + match.length;
    });

    // Add remaining plain text
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

    // Multi-line code blocks: ```language\ncode\n```
    // CRITICAL FIX: Must handle with or without newlines
    text = text.replace(
      /```(\w+)?\s*\n?([\s\S]*?)```/g,
      (match, lang, code) => {
        return `[CODE_BLOCK:${lang || "text"}]${code.trim()}[/CODE_BLOCK]`;
      }
    );

    // Inline code: `code`
    // Leave as-is, will be handled by parseMarkdown
    return text;
  };

  /**
   * Convert LaTeX math to Unicode plain text for PDF
   * Handles nested braces, multi-digit exponents, comprehensive math symbols
   * Uses single conversion function for both inline and block math
   * @param {string} text - Text with LaTeX math
   * @returns {string} Text with simplified math
   */
  convertMathToPlainText(text) {
    if (!text) return "";

    // CRITICAL: Process code blocks FIRST before math conversion
    // This prevents math symbols inside code from being converted
    text = this.processCodeBlocks(text);
    /**
     * Helper: Convert string to superscript Unicode
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
     * Helper: Convert string to subscript Unicode
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
     * Helper: Extract content from balanced braces
     * Handles nested braces properly by counting depth
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
     * CORE CONVERSION LOGIC
     * Single source of truth for ALL math conversion
     * Used by BOTH inline $...$ and block $$...$$ math
     * @param {string} math - LaTeX math expression
     * @returns {string} Unicode-converted math
     */
    const convertMath = (math) => {
      let converted = math;

      // EXPONENTS (braced, with nesting support)
      let expIndex = 0;
      while ((expIndex = converted.indexOf("^{", expIndex)) !== -1) {
        const braceStart = expIndex + 1;
        const exponent = extractBalancedBraces(converted, braceStart);

        // Recursively convert nested content FIRST, then apply superscript
        const expConverted = toSuperscript(convertMath(exponent.content));

        converted =
          converted.substring(0, expIndex) +
          expConverted +
          converted.substring(exponent.endIndex);

        expIndex += expConverted.length;
      }

      // EXPONENTS (non-braced, no nesting possible)
      // Only match if not already converted to Unicode superscript
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

      // SUBSCRIPTS (braced, with nesting support)
      let subIndex = 0;
      while ((subIndex = converted.indexOf("_{", subIndex)) !== -1) {
        const braceStart = subIndex + 1;
        const subscript = extractBalancedBraces(converted, braceStart);

        // Recursively convert nested content FIRST, then apply subscript
        const subConverted = toSubscript(convertMath(subscript.content));

        converted =
          converted.substring(0, subIndex) +
          subConverted +
          converted.substring(subscript.endIndex);

        subIndex += subConverted.length;
      }

      // SUBSCRIPTS (non-braced, no nesting possible)
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

      // FRACTIONS (with nesting support)
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

          // Recursively convert both numerator and denominator
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

      // LATEX SPACING COMMANDS - Remove before processing math
      // These are LaTeX formatting commands that don't have Unicode equivalents
      converted = converted
        .replace(/\\:/g, "") // Medium space
        .replace(/\\;/g, "") // Thick space
        .replace(/\\!/g, "") // Negative thin space
        .replace(/\\ /g, " ") // Normal space (backslash-space)
        .replace(/~/g, " ") // Non-breaking space
        .replace(/\\quad/g, "  ") // Quad space (approximate)
        .replace(/\\qquad/g, "    "); // Double quad space (approximate)

      // SQUARE ROOTS (with nesting support)
      let sqrtIndex = 0;
      while ((sqrtIndex = converted.indexOf("\\sqrt{", sqrtIndex)) !== -1) {
        const braceStart = sqrtIndex + 5;
        const content = extractBalancedBraces(converted, braceStart);

        // Recursively convert nested content
        let contentConverted = convertMath(content.content);

        // Handle empty sqrt or just whitespace (like \sqrt{\,})
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
      // NTH ROOTS (with nesting support)
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

        // Recursively convert nested content
        const contentConverted = convertMath(content.content);
        const replacement = `${order}√(${contentConverted})`;

        converted =
          converted.substring(0, nthRootIndex) +
          replacement +
          converted.substring(content.endIndex);

        nthRootIndex += replacement.length;
      }

      // GREEK LETTERS (lowercase)
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

      // GREEK LETTERS (uppercase)
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

      // OPERATORS
      converted = converted
        .replace(/\\times/g, "×")
        .replace(/\\cdot/g, "·")
        .replace(/\\div/g, "÷")
        .replace(/\\pm/g, "±")
        .replace(/\\mp/g, "∓");

      // RELATIONS (longer patterns first to avoid prefix conflicts)
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

      // CALCULUS (longer patterns first)
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

      // SET THEORY
      converted = converted
        .replace(/\\forall/g, "∀")
        .replace(/\\exists/g, "∃")
        .replace(/\\cup/g, "∪")
        .replace(/\\cap/g, "∩")
        .replace(/\\emptyset/g, "∅");

      // LOGIC
      converted = converted
        .replace(/\\implies/g, "⇒")
        .replace(/\\iff/g, "⇔")
        .replace(/\\land/g, "∧")
        .replace(/\\lor/g, "∨")
        .replace(/\\neg/g, "¬");

      // ARROWS (longer patterns first)
      converted = converted
        .replace(/\\leftrightarrow/g, "↔")
        .replace(/\\Leftrightarrow/g, "⇔")
        .replace(/\\rightarrow/g, "→")
        .replace(/\\leftarrow/g, "←")
        .replace(/\\Rightarrow/g, "⇒")
        .replace(/\\Leftarrow/g, "⇐");

      return converted;
    };

    // INLINE MATH: $...$
    // Uses convertMath helper
    text = text.replace(/\$([^$]+)\$/g, (match, math) => {
      return convertMath(math);
    });

    // BLOCK MATH: $$...$$
    // Uses SAME convertMath helper, just adds newlines
    text = text.replace(/\$\$([^$]+)\$\$/g, (match, math) => {
      return "\n" + convertMath(math) + "\n";
    });

    return text;
  }

  /**
   * Safely fetch and embed image from URL
   * @param {PDFDocument} doc - PDF document
   * @param {string} imageUrl - Image URL (Cloudinary, etc.)
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {object} options - Image options (width, height, fit)
   * @returns {Promise<boolean>} Success status
   */
  async embedImage(doc, imageUrl, x, y, options = {}) {
    try {
      const response = await fetch(imageUrl, {
        timeout: 10000, // 10 second timeout
        headers: {
          "User-Agent": "RankBaaz-PDF-Service/1.0",
        },
      });

      if (!response.ok) {
        console.warn(
          `Failed to fetch image: ${imageUrl} - Status: ${response.status}`
        );
        return false;
      }

      const imageBuffer = Buffer.from(await response.arrayBuffer());

      // Validate image size (max 5MB for safety)
      if (imageBuffer.length > 5 * 1024 * 1024) {
        console.warn(
          `Image too large: ${imageUrl} - ${imageBuffer.length} bytes`
        );
        return false;
      }

      // Embed image with error handling
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
   * Generate PDF for test result
   * @param {Object} testResult - Test result data from database
   * @param {Object} course - Course data from database
   * @param {Object} user - User data (name, email)
   * @param {Boolean} isAdmin - Whether requester is admin
   * @returns {Promise<Buffer>} PDF buffer
   */
  async generateTestResultPDF(testResult, course, user, isAdmin = false) {
    return new Promise((resolve, reject) => {
      (async () => {
        try {
          // Create PDF document with optimized settings
          const doc = new PDFDocument({
            size: "A4",
            margins: {
              top: 50,
              bottom: 70, // Increased for footer
              left: 50,
              right: 50,
            },
            bufferPages: true, // Enable page buffering for better performance
            info: {
              Title: `${course.name} - Test Result`,
              Author: "RankBaaz",
              Subject: "Test Result Report",
              Keywords: "test, result, report, education",
              Producer: "RankBaaz PDF Service v1.0",
              Creator: "RankBaaz Platform",
            },
          });

          const chunks = [];
          doc.on("data", (chunk) => chunks.push(chunk));
          doc.on("end", () => resolve(Buffer.concat(chunks)));
          doc.on("error", reject);

          // Page counter
          let pageNumber = 1;

          /**
           * Add watermark to current page
           * Semi-transparent "RankBaaz" text rotated 45 degrees
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
              .text("RankBaaz", 0, doc.page.height / 2, {
                align: "center",
                lineBreak: false,
              });
            doc.restore();
          };

          /**
           * Add footer with page number and user info
           * Only adds footer if page has content (prevents blank page footers)
           */
          const addFooter = () => {
            // Skip footer for empty or near-empty pages
            // A page is "empty" if current Y is less than 200px from the top
            // (accounting for margins and potential headers)
            const minimumContentThreshold = 500;

            if (doc.y < minimumContentThreshold) {
              console.log(`[PDF] Skipping footer - empty page at Y=${doc.y}`);
              return;
            }

            const footerY = doc.page.height - 40;

            // Separator line
            doc
              .moveTo(50, footerY - 10)
              .lineTo(doc.page.width - 50, footerY - 10)
              .strokeColor("#e5e7eb")
              .lineWidth(1)
              .stroke();

            // Page number (center)
            doc
              .fontSize(10)
              .font("Helvetica")
              .fillColor("#666666")
              .text(`Page ${pageNumber}`, 0, footerY, {
                align: "center",
                width: doc.page.width,
              });

            // User identifier (right)
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

          // ========== PAGE 1: TITLE PAGE ==========
          addWatermark();

          // Course Name (Large, Bold, Centered)
          doc
            .fontSize(36)
            .font("Helvetica-Bold")
            .fillColor("#1a1a1a")
            .text(course.name, 50, 80, {
              align: "center",
              width: doc.page.width - 100,
            });

          doc.moveDown(0.5);

          // Test Result Title
          doc
            .fontSize(24)
            .font("Helvetica")
            .fillColor("#4a5568")
            .text("Test Result Report", {
              align: "center",
            });

          doc.moveDown(4);

          // Candidate Information Box
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

          // ========== ADD COURSE LOGO ==========
          // Position logo to the right of the info box
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
              // Add placeholder if logo fails
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

          // Test Statistics Box
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

          // ========== QUESTIONS PAGES ==========
          // Group questions by difficulty
          const questionsByDifficulty = {};
          testResult.questions.forEach((q) => {
            const diff = q.difficulty || "Unknown";
            if (!questionsByDifficulty[diff]) {
              questionsByDifficulty[diff] = [];
            }
            questionsByDifficulty[diff].push(q);
          });

          // Sort difficulties: Easy -> Medium -> Hard
          const difficultyOrder = ["Easy", "Medium", "Hard"];
          const sortedDifficulties = Object.keys(questionsByDifficulty).sort(
            (a, b) => {
              return difficultyOrder.indexOf(a) - difficultyOrder.indexOf(b);
            }
          );

          // Iterate through each difficulty
          for (const difficulty of sortedDifficulties) {
            const questions = questionsByDifficulty[difficulty];

            // New page for each difficulty
            doc.addPage();
            addWatermark();

            // Difficulty Header
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

            // Iterate through questions in this difficulty
            for (let qIndex = 0; qIndex < questions.length; qIndex++) {
              const questionData = questions[qIndex];
              const questionNum = qIndex + 1;

              // Find full question details from course
              const fullQuestion = course.questions.find(
                (q) => q._id.toString() === questionData.question.toString()
              );

              if (!fullQuestion) continue;

              // ========== PAGE BREAK CHECK ==========
              // Check if we need a new page (leave 250px for question + options + image)
              if (doc.y > doc.page.height - 250) {
                addFooter();
                doc.addPage();
                addWatermark();

                // Re-add difficulty header on new page
                doc
                  .fontSize(18)
                  .font("Helvetica-Bold")
                  .fillColor(difficultyColor)
                  .text(`${difficulty} Difficulty (continued)`, {
                    align: "center",
                  });
                doc.moveDown(1);
              }

              // ========== QUESTION NUMBER ==========
              doc
                .fontSize(14)
                .font("Helvetica-Bold")
                .fillColor("#1a1a1a")
                .text(`${questionNum}. `, 60, doc.y, {
                  continued: true,
                  width: 40,
                });

              // ========== QUESTION TEXT (with rich text support) ==========
              const questionStartY = doc.y;
              doc.font("Helvetica"); // Reset to regular for question text

              // Use rich text renderer for question text
              this.renderRichText(
                doc,
                fullQuestion.question,
                100, // X position (indented)
                questionStartY,
                {
                  fontSize: 17,
                  color: "#1a1a1a",
                  width: doc.page.width - 150,
                  lineGap: 4,
                }
              );

              doc.moveDown(0.8);

              // ========== QUESTION TYPE INDICATOR ==========
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

              // Question Image
              if (fullQuestion.image && fullQuestion.image.url) {
                // Check if we need a new page for the image
                const estimatedImageHeight = 280; // Max fit height
                const imageBottomY = doc.y + estimatedImageHeight + 20; // Add padding

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
                  // CRITICAL FIX: Manually set doc.y AFTER image
                  // PDFKit doesn't automatically move Y after image()
                  doc.y = imageStartY + estimatedImageHeight + 10; // Image height + spacing
                  doc.moveDown(1);
                } else {
                  // Show placeholder if image fails
                  doc
                    .fontSize(12)
                    .font("Helvetica")
                    .fillColor("#9ca3af")
                    .text("[Image unavailable]", 100, doc.y);
                  doc.moveDown(0.5);
                }
              }

              // ========== OPTIONS ==========
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
                  const optionPrefix = isCorrect ? "✓ " : "  ";

                  // Use rich text renderer for option text
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
                // Single answer type
                doc
                  .fontSize(14)
                  .font("Helvetica-Bold")
                  .fillColor("#16a34a")
                  .text("✓ Answer: ", 100, doc.y, { continued: true });

                doc
                  .font("Helvetica")
                  .text(fullQuestion.correctAnswer, { continued: false });

                doc.moveDown(0.5);
              }

              // ========== EXPLANATION ==========
              if (fullQuestion.explanation) {
                doc.moveDown(0.5);

                doc
                  .fontSize(14)
                  .font("Helvetica-Bold")
                  .fillColor("#4b5563")
                  .text("Explanation:", 100, doc.y);

                doc.moveDown(0.3);

                // Use rich text renderer for explanation
                this.renderRichText(doc, fullQuestion.explanation, 100, doc.y, {
                  fontSize: 14,
                  color: "#6b7280",
                  width: doc.page.width - 150,
                  lineGap: 3,
                });
              }

              doc.moveDown(1);

              // Separator line between questions
              doc
                .moveTo(60, doc.y)
                .lineTo(doc.page.width - 60, doc.y)
                .strokeColor("#e5e7eb")
                .lineWidth(0.5)
                .stroke();

              doc.moveDown(1);
            }

            // Only add footer if we actually rendered questions
            if (questions.length > 0) {
              addFooter();
            }
          }

          // ========== THANK YOU PAGE ==========
          doc.addPage();
          addWatermark();

          // Center content vertically
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
            .text("Keep learning and improving with RankBaaz!", 0, doc.y, {
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

          // ADD FOOTER FOR THANK YOU PAGE
          // Only add footer if we actually rendered questions
          if (questions.length > 0) {
            addFooter();
          }

          // CRITICAL: Do NOT add any more pages after this
          // Finalize PDF immediately
          doc.end();
        } catch (error) {
          reject(error);
        }
      })();
    });
  }

  /**
   * Generate PDF for course data only (Admin download)
   * @param {Object} course - Course data from database
   * @returns {Promise<Buffer>} PDF buffer
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
              Author: "RankBaaz Admin",
              Subject: "Course Data Export",
              Keywords: "course, export, admin, education",
              Producer: "RankBaaz PDF Service v1.0",
            },
          });

          const chunks = [];
          doc.on("data", (chunk) => chunks.push(chunk));
          doc.on("end", () => resolve(Buffer.concat(chunks)));
          doc.on("error", reject);

          let pageNumber = 1;

          /**
           * Add watermark to page
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
              .text("RankBaaz Admin", 0, doc.page.height / 2, {
                align: "center",
                lineBreak: false,
              });
            doc.restore();
          };

          /**
           * Add footer with page number and admin indicator
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

          // ========== PAGE 1: COURSE OVERVIEW ==========
          addWatermark();

          // Course Name
          doc
            .fontSize(36)
            .font("Helvetica-Bold")
            .fillColor("#1a1a1a")
            .text(course.name, 50, 80, {
              align: "center",
              width: doc.page.width - 100,
            });

          doc.moveDown(0.8);

          // Description with rich text support - CENTERED
          if (course.description) {
            // Calculate centered X position
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

          // ========== COURSE LOGO ==========
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

          // Course Details Section
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

          // Difficulty Configuration Section
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
              // Difficulty name with bold font
              doc
                .fontSize(14)
                .font("Helvetica-Bold")
                .fillColor("#2d3748")
                .text(`${diff.name}:`, 75, doc.y, { continued: true });

              // Marks info with regular font
              doc
                .font("Helvetica")
                .fontSize(13)
                .fillColor("#4a5568")
                .text(
                  ` ${diff.marksPerQuestion} marks × ${diff.maxQuestions} questions = ${diff.totalMarks} total marks`,
                  { continued: false }
                );

              doc.moveDown(0.4);

              // Time limit -aligned with proper indentation (11 spaces)
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

          // ========== QUESTIONS PAGES ==========
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

              // New page for each difficulty
              doc.addPage();
              addWatermark();

              const diffColor =
                difficulty === "Easy"
                  ? "#16a34a"
                  : difficulty === "Medium"
                    ? "#eab308"
                    : "#dc2626";

              // Difficulty header
              doc
                .fontSize(24)
                .font("Helvetica-Bold")
                .fillColor(diffColor)
                .text(`${difficulty} Difficulty Questions`, 50, 80, {
                  align: "center",
                  underline: true,
                });

              doc.moveDown(2);

              // Iterate through questions
              for (let qIndex = 0; qIndex < questions.length; qIndex++) {
                const question = questions[qIndex];

                // Check if we need a new page (allow 200px buffer at bottom)
                if (doc.y > doc.page.height - 200) {
                  addFooter();
                  doc.addPage();
                  addWatermark();
                  doc.moveDown(2);
                }

                // Question number
                doc
                  .fontSize(13)
                  .font("Helvetica-Bold")
                  .fillColor("#1a1a1a")
                  .text(`Question ${qIndex + 1}`, 75, doc.y, {
                    underline: true,
                  });
                doc.moveDown(0.4);

                // Question type
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

                // Question text with rich text support
                this.renderRichText(doc, question.question, 75, doc.y, {
                  fontSize: 12,
                  color: "#1a1a1a",
                  width: doc.page.width - 150,
                  lineGap: 3,
                });

                doc.moveDown(0.7);

                // Question image (if exists)
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
                    // CRITICAL FIX: Manually set doc.y AFTER image
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

                // Options section
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

                // Correct Answer section
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

                // Explanation with rich text support
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

                // Separator line
                doc
                  .moveTo(75, doc.y)
                  .lineTo(doc.page.width - 75, doc.y)
                  .strokeColor("#e5e7eb")
                  .lineWidth(0.5)
                  .stroke();

                doc.moveDown(1);
              }

              // Only add footer if we actually rendered questions
              if (questions.length > 0) {
                addFooter();
              }
            }
          }

          // Only add thank-you page if last page had content
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
              "This course data was exported by RankBaaz Admin Panel",
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
