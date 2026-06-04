/**
 * keeps the blog crypto utility focused and readable.
 */
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

const deriveKey = () => {
  const configuredKey =
    process.env.BLOG_ENCRYPTION_KEY ||
    process.env.CONTENT_ENCRYPTION_KEY ||
    process.env.JWT_SECRET;

  if (!configuredKey) {
    throw new Error("BLOG_ENCRYPTION_KEY is required for blog encryption");
  }

  if (/^[a-f0-9]{64}$/i.test(configuredKey)) {
    return Buffer.from(configuredKey, "hex");
  }

  return crypto.createHash("sha256").update(configuredKey).digest();
};

export const encryptBlogPayload = (payload) => {
  const key = deriveKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const plainText = JSON.stringify(payload ?? {});
  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return {
    algorithm: ALGORITHM,
    keyVersion: process.env.BLOG_ENCRYPTION_KEY_VERSION || "v1",
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: encrypted.toString("base64"),
  };
};

export const decryptBlogPayload = (encryptedPayload) => {
  if (!encryptedPayload?.data || !encryptedPayload?.iv || !encryptedPayload?.tag) {
    return {};
  }

  const key = deriveKey();
  const decipher = crypto.createDecipheriv(
    encryptedPayload.algorithm || ALGORITHM,
    key,
    Buffer.from(encryptedPayload.iv, "base64"),
  );

  decipher.setAuthTag(Buffer.from(encryptedPayload.tag, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedPayload.data, "base64")),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString("utf8"));
};

export const hashBlogPayload = (payload) =>
  crypto
    .createHash("sha256")
    .update(JSON.stringify(payload ?? {}))
    .digest("hex");
