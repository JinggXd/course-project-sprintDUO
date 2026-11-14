import fs from "node:fs";
import path from "node:path";
import express, { Request, Response, NextFunction, Express } from "express";
import cors from "cors";
import { getPrisma } from "./prisma.js";
import { sessionMiddleware } from "./middleware/sessionAuth.js";
import { authRouter } from "./routes/auth.js";
import { supervisorRouter } from "./routes/supervisor.js";
import { studentRouter } from "./routes/student.js";

export interface CreateAppOptions {
  serveStatic?: boolean;
  clientDistDir?: string;
}

function isAllowedOrigin(req: Request, origin: string): boolean {
  const configuredOrigins = (process.env.CLIENT_ORIGIN || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (configuredOrigins.includes(origin)) {
    return true;
  }

  const host = req.get("host");
  if (host && origin === `${req.protocol}://${host}`) {
    return true;
  }

  if (process.env.NODE_ENV !== "production" && configuredOrigins.length === 0) {
    return true;
  }

  return false;
}

/**
 * Create and configure the SprintDUO Express application.
 */
export function createApp(options: CreateAppOptions = {}): Express {
  const instance = express();

  // Trust single reverse proxy hop (e.g., Cloud Run load balancer, nginx) for HTTPS detection.
  instance.set("trust proxy", 1);

  instance.use(
    cors((req: Request, callback) => {
      const origin = req.get("origin");
      const allowed = !origin || isAllowedOrigin(req, origin);
      callback(null, {
        origin: allowed,
        credentials: true,
      });
    }),
  );

  instance.use(express.json({ limit: "16kb" }));

  // Hydrate session and user
  instance.use(sessionMiddleware);

  // Health & DB readiness checks
  instance.get("/api/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok", service: "SprintDUO API" });
  });

  instance.get("/api/ready", async (_req: Request, res: Response) => {
    try {
      await getPrisma().$queryRaw`SELECT 1`;
      res.status(200).json({ db: "connected" });
    } catch {
      res.status(503).json({ db: "disconnected" });
    }
  });

  // Feature F-01 & F-02 Routes
  instance.use("/api/auth", authRouter);
  instance.use("/api", supervisorRouter);
  instance.use("/api", studentRouter);

  // Unknown API routes always return JSON 404 (never fall through to SPA HTML).
  instance.use("/api", (_req: Request, res: Response) => {
    res.status(404).json({
      error: "NOT_FOUND",
      message: "Route not found",
    });
  });

  // Serve built React SPA assets in unified production container when client/dist is present.
  const shouldServeStatic =
    options.serveStatic ??
    (process.env.SERVE_STATIC === "true" ||
      (process.env.NODE_ENV === "production" && process.env.SERVE_STATIC !== "false"));
  const clientDistDir =
    options.clientDistDir ||
    process.env.CLIENT_DIST_PATH ||
    path.resolve(process.cwd(), "../client/dist");
  const indexHtmlPath = path.join(clientDistDir, "index.html");

  if (shouldServeStatic && fs.existsSync(indexHtmlPath)) {
    instance.use(express.static(clientDistDir));
    instance.get("*", (_req: Request, res: Response) => {
      res.sendFile(indexHtmlPath);
    });
  }

  // Error handler
  instance.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({
      error: "INTERNAL_ERROR",
      message: err?.message || "An unexpected error occurred",
    });
  });

  return instance;
}

export const app = createApp();
