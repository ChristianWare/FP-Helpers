// lib/tokens.ts
import { randomBytes } from "crypto";

/**
 * Generates a URL-safe token for invitation/join links.
 * Default length produces a 32-character string.
 */
export function generateToken(bytes = 24): string {
  return randomBytes(bytes)
    .toString("base64url")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 32);
}
