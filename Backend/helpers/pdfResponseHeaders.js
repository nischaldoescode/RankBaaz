/**
 * applies strict response headers for generated pdf downloads
 *
 * @file backend/helpers/pdfresponseheaders.js
 * @module backend/helpers/pdfresponseheaders
 * @exports setNoStoreHeaders attaches shared no-store headers for pdf related responses
 * @exports setPdfDownloadHeaders attaches pdf headers that avoid stale browser, proxy, and cdn cache reuse
 * @param {object} res express response object that will send the generated pdf buffer
 * @param {object} options header options for the generated file
 * @param {string} options.filename visible filename used by the browser download prompt
 * @param {number} options.length generated pdf buffer length in bytes
 * @returns {void}
 */

const safeAsciiFilename = (filename = "vidhgrow.pdf") =>
  String(filename || "vidhgrow.pdf")
    .replace(/[\r\n"]/g, "")
    .replace(/[^\w .()-]+/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || "vidhgrow.pdf";

const encodeDownloadFilename = (filename = "vidhgrow.pdf") =>
  encodeURIComponent(String(filename || "vidhgrow.pdf"))
    .replace(/['()*]/g, (char) =>
      `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
    );

const PDF_RENDERER_VERSION = "rich-pdf-2026-06-19";

export const setPdfDownloadHeaders = (res, options = {}) => {
  const filename = safeAsciiFilename(options.filename);
  const encodedFilename = encodeDownloadFilename(filename);
  const length = Number(options.length);
  const generatedAt = new Date();

  setNoStoreHeaders(res);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}"; filename*=UTF-8''${encodedFilename}`,
  );
  res.setHeader("Accept-Ranges", "none");
  res.setHeader("X-PDF-Cache-Status", "bypass");
  res.setHeader("X-PDF-Renderer-Version", PDF_RENDERER_VERSION);
  res.setHeader("X-PDF-Generated-At", generatedAt.toISOString());
  res.setHeader("Last-Modified", generatedAt.toUTCString());
  res.setHeader("ETag", `"pdf-${generatedAt.getTime()}-${Number.isFinite(length) ? length : 0}"`);
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");

  if (Number.isFinite(length) && length > 0) {
    res.setHeader("Content-Length", String(length));
  }
};

export const setNoStoreHeaders = (res) => {
  res.setHeader(
    "Cache-Control",
    "private, no-store, no-cache, must-revalidate, max-age=0, s-maxage=0, proxy-revalidate",
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  res.setHeader("CDN-Cache-Control", "no-store");
  res.setHeader("X-Accel-Expires", "0");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Vary", "Authorization, Cookie, X-Request-Signature, X-Request-Timestamp");
};
