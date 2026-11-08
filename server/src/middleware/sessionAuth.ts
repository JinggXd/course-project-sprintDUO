import { Request, Response, NextFunction } from "express";
import { getPrisma } from "../prisma.js";
import { parseCookie, hashSessionToken, SESSION_COOKIE_NAME } from "../utils/session.js";
import type { Role } from "@prisma/client";

export interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
}

export interface AuthenticatedSession {
  id: string;
  userId: number;
  expiresAt: Date;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      session?: AuthenticatedSession;
      sessionToken?: string;
    }
  }
}

/**
 * Parses sprintduo_session cookie and hydrates req.user and req.session if valid.
 */
export async function sessionMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = parseCookie(req.headers.cookie, SESSION_COOKIE_NAME);
  if (!token) {
    next();
    return;
  }

  const hashedId = hashSessionToken(token);
  try {
    const session = await getPrisma().session.findUnique({
      where: { id: hashedId },
      include: { user: true },
    });

    if (!session) {
      next();
      return;
    }

    if (new Date() >= session.expiresAt || !session.user.isActive) {
      try {
        await getPrisma().session.delete({ where: { id: hashedId } });
      } catch {}
      next();
      return;
    }

    req.user = {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
      isActive: session.user.isActive,
    };
    req.session = {
      id: session.id,
      userId: session.userId,
      expiresAt: session.expiresAt,
    };
    req.sessionToken = token;
  } catch {
    // If DB is temporarily unreachable, proceed unauthenticated
  }

  next();
}

/**
 * Requires an authenticated active session (HTTP 401).
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || !req.session) {
    res.status(401).json({ error: "UNAUTHENTICATED", message: "Authentication required" });
    return;
  }
  next();
}

/**
 * Requires one of the specified roles (HTTP 403).
 */
export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: "FORBIDDEN",
        message: "Insufficient role permissions",
      });
      return;
    }
    next();
  };
}
