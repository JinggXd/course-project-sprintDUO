import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { sessionMiddleware } from "./middleware/sessionAuth.js";
import { authRouter } from "./routes/auth.js";
import { supervisorRouter } from "./routes/supervisor.js";
import { studentRouter } from "./routes/student.js";

export const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, true);
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "16kb" }));

// Hydrate session and user
app.use(sessionMiddleware);

// Health check
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "SprintDUO API" });
});

// Feature F-01 & F-02 Routes
app.use("/api/auth", authRouter);
app.use("/api", supervisorRouter);
app.use("/api", studentRouter);

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({
    error: "INTERNAL_ERROR",
    message: err?.message || "An unexpected error occurred",
  });
});
