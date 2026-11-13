import crypto from "node:crypto";
import type { Request, Response } from "express";

export const SESSION_COOKIE_NAME = "sprintduo_session";
export const SESSION_MAX_AGE_SECONDS = 28800; // 8 hours

/**
 * Determine whether the incoming request arrived over HTTPS (directly or via reverse proxy).
 */
export function isSecureRequest(req: Request): boolean {
  if (req.secure) {
    return true;
  }
  const forwardedProto = req.get("x-forwarded-proto");
  return forwardedProto?.split(",")[0]?.trim().toLowerCase() === "https";
}

/**
 * Generate a cryptographically secure 32-byte base64url session token.
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * Hash raw token with SHA-256 (hex) for database primary key storage (NFR-03).
 * Raw cookie token is never stored in DB.
 */
export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Parse a named cookie value from the Cookie header.
 */
export function parseCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) {
      try {
        return decodeURIComponent(v.join("="));
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * Set the sprintduo_session HttpOnly cookie on the response.
 */
export function setSessionCookie(
  res: Response,
  token: string,
  secure = process.env.NODE_ENV === "production",
): void {
  const flags = [
    `${SESSION_COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
  ];
  if (secure) {
    flags.push("Secure");
  }
  res.setHeader("Set-Cookie", flags.join("; "));
}

/**
 * Clear the sprintduo_session cookie on the response.
 */
export function clearSessionCookie(res: Response, secure = false): void {
  const flags = [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (secure) {
    flags.push("Secure");
  }
  res.setHeader("Set-Cookie", flags.join("; "));
}

