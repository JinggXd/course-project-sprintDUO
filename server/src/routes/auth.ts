import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import { verifyPassword } from "../utils/password.js";
import {
  generateSessionToken,
  hashSessionToken,
  setSessionCookie,
  clearSessionCookie,
} from "../utils/session.js";
import { requireAuth } from "../middleware/sessionAuth.js";

export const authRouter = Router();

authRouter.post("/login", async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body || {};

  if (!email || !password || typeof email !== "string" || typeof password !== "string") {
    res.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Email and password are required",
    });
    return;
  }

  try {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user || !user.isActive) {
      res.status(401).json({
        error: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      });
      return;
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      res.status(401).json({
        error: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      });
      return;
    }

    const rawToken = generateSessionToken();
    const hashedId = hashSessionToken(rawToken);
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours

    await prisma.session.create({
      data: {
        id: hashedId,
        userId: user.id,
        expiresAt,
      },
    });

    setSessionCookie(res, rawToken);

    res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Login processing failed" });
  }
});

authRouter.get("/me", requireAuth, (req: Request, res: Response): void => {
  res.status(200).json({ user: req.user });
});

authRouter.post("/logout", async (req: Request, res: Response): Promise<void> => {
  if (req.session) {
    try {
      await getPrisma().session.delete({
        where: { id: req.session.id },
      });
    } catch {
      // Ignored if already deleted
    }
  }
  clearSessionCookie(res);
  res.status(204).end();
});
