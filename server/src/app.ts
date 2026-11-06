import express, { Request, Response } from "express";
import cors from "cors";

export const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, true);
    },
    credentials: true,
  }),
);

app.use(express.json());

app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "SprintDUO API" });
});
