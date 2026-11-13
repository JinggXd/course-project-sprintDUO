import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";

const mockPrisma = {
  $queryRaw: vi.fn(),
  user: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    count: vi.fn(),
  },
  session: {
    create: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
  team: {
    upsert: vi.fn(),
  },
  teamMember: {
    upsert: vi.fn(),
  },
  milestone: {
    count: vi.fn(),
    createMany: vi.fn(),
  },
};

vi.mock("../src/prisma.js", () => ({
  getPrisma: () => mockPrisma,
}));

import { createApp } from "../src/app.js";
import { hashPassword } from "../src/utils/password.js";
import { seedDatabase } from "../prisma/seed.js";

describe("Lab 5 Container Readiness, Proxy Cookie, Static SPA & Non-Destructive Seed", () => {
  const originalEnv = { ...process.env };
  let tempDistDir: string | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    if (tempDistDir && fs.existsSync(tempDistDir)) {
      fs.rmSync(tempDistDir, { recursive: true, force: true });
      tempDistDir = null;
    }
  });

  describe("Readiness check (/api/ready)", () => {
    it("returns HTTP 200 with { db: 'connected' } when PostgreSQL responds", async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ "?column?": 1 }]);
      const testApp = createApp({ serveStatic: false });

      const res = await request(testApp).get("/api/ready");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ db: "connected" });
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it("returns HTTP 503 with { db: 'disconnected' } when PostgreSQL is unreachable", async () => {
      mockPrisma.$queryRaw.mockRejectedValueOnce(new Error("connect ECONNREFUSED"));
      const testApp = createApp({ serveStatic: false });

      const res = await request(testApp).get("/api/ready");

      expect(res.status).toBe(503);
      expect(res.body).toEqual({ db: "disconnected" });
    });
  });

  describe("Unified container static SPA serving & /api 404 isolation", () => {
    it("serves index.html for /, SPA routes, and returns JSON 404 for unknown /api/* routes", async () => {
      tempDistDir = fs.mkdtempSync(path.join(os.tmpdir(), "sprintduo-dist-"));
      fs.writeFileSync(
        path.join(tempDistDir, "index.html"),
        "<!doctype html><html><body><div id='root'>SprintDUO</div></body></html>",
        "utf8",
      );

      const testApp = createApp({
        serveStatic: true,
        clientDistDir: tempDistDir,
      });

      const rootRes = await request(testApp).get("/");
      expect(rootRes.status).toBe(200);
      expect(rootRes.headers["content-type"]).toContain("text/html");
      expect(rootRes.text).toContain("SprintDUO");

      const spaRes = await request(testApp).get("/teams/42/milestones");
      expect(spaRes.status).toBe(200);
      expect(spaRes.text).toContain("SprintDUO");

      const missingApiRes = await request(testApp).get("/api/nonexistent-endpoint");
      expect(missingApiRes.status).toBe(404);
      expect(missingApiRes.body).toMatchObject({
        error: "NOT_FOUND",
      });
    });
  });

  describe("Reverse proxy & session cookie Secure handling in production", () => {
    it("sets Secure flag when X-Forwarded-Proto is https and omits it on plain HTTP localhost", async () => {
      process.env.NODE_ENV = "production";
      const passwordHash = await hashPassword("SecretPass123!");
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1,
        name: "Dr. Kittipong",
        email: "sup.advisor1@sprintduo.edu",
        passwordHash,
        role: "SUPERVISOR",
        isActive: true,
      });
      mockPrisma.session.create.mockResolvedValue({ id: "hashed-id" });
      mockPrisma.session.delete.mockResolvedValue({ id: "hashed-id" });

      const testApp = createApp({ serveStatic: false });

      const httpLogin = await request(testApp)
        .post("/api/auth/login")
        .send({ email: "sup.advisor1@sprintduo.edu", password: "SecretPass123!" });

      expect(httpLogin.status).toBe(200);
      const httpSetCookie = Array.isArray(httpLogin.headers["set-cookie"])
        ? httpLogin.headers["set-cookie"].join("; ")
        : httpLogin.headers["set-cookie"];
      expect(httpSetCookie).toContain("sprintduo_session=");
      expect(httpSetCookie).toContain("HttpOnly");
      expect(httpSetCookie).not.toContain("Secure");

      const httpsLogin = await request(testApp)
        .post("/api/auth/login")
        .set("X-Forwarded-Proto", "https")
        .send({ email: "sup.advisor1@sprintduo.edu", password: "SecretPass123!" });

      expect(httpsLogin.status).toBe(200);
      const httpsSetCookie = Array.isArray(httpsLogin.headers["set-cookie"])
        ? httpsLogin.headers["set-cookie"].join("; ")
        : httpsLogin.headers["set-cookie"];
      expect(httpsSetCookie).toContain("sprintduo_session=");
      expect(httpsSetCookie).toContain("Secure");

      const httpsLogout = await request(testApp)
        .post("/api/auth/logout")
        .set("X-Forwarded-Proto", "https");
      expect(httpsLogout.status).toBe(204);
      const httpsClearCookie = Array.isArray(httpsLogout.headers["set-cookie"])
        ? httpsLogout.headers["set-cookie"].join("; ")
        : httpsLogout.headers["set-cookie"];
      expect(httpsClearCookie).toContain("Secure");
    });

    it("does not throw 500 for unrecognized CORS origins in production", async () => {
      process.env.NODE_ENV = "production";
      process.env.CLIENT_ORIGIN = "https://sprintduo.example.com";
      const testApp = createApp({ serveStatic: false });

      const res = await request(testApp)
        .get("/api/health")
        .set("Origin", "https://untrusted.example.com");

      expect(res.status).toBe(200);
      expect(res.headers["access-control-allow-origin"]).toBeUndefined();
    });
  });

  describe("Production seed behavior (no hardcoded passwords & non-destructive)", () => {
    it("throws when NODE_ENV=production without ADMIN_PASSWORD", async () => {
      process.env.NODE_ENV = "production";
      delete process.env.ADMIN_PASSWORD;
      delete process.env.DEMO_USER_PASSWORD;

      await expect(seedDatabase(mockPrisma as any)).rejects.toThrow(/ADMIN_PASSWORD/);
    });

    it("throws when NODE_ENV=production with SEED_DEMO_DATA=true without DEMO_USER_PASSWORD", async () => {
      process.env.NODE_ENV = "production";
      process.env.ADMIN_PASSWORD = "AdminSecretValue123!";
      process.env.SEED_DEMO_DATA = "true";
      delete process.env.DEMO_USER_PASSWORD;

      await expect(seedDatabase(mockPrisma as any)).rejects.toThrow(/DEMO_USER_PASSWORD/);
    });

    it("seeds only initial supervisor using non-destructive upsert when SEED_DEMO_DATA=false", async () => {
      process.env.NODE_ENV = "production";
      process.env.ADMIN_PASSWORD = "AdminSecretValue123!";
      process.env.SEED_DEMO_DATA = "false";
      mockPrisma.user.upsert.mockResolvedValue({ id: 1, email: "sup.advisor1@sprintduo.edu" });

      await seedDatabase(mockPrisma as any);

      expect(mockPrisma.user.upsert).toHaveBeenCalledTimes(1);
      const upsertArg = mockPrisma.user.upsert.mock.calls[0][0];
      expect(upsertArg.where).toEqual({ email: "sup.advisor1@sprintduo.edu" });
      // Non-destructive: existing user passwordHash/profile must not be overwritten on re-run
      expect(upsertArg.update).toEqual({});
      expect(mockPrisma.team.upsert).not.toHaveBeenCalled();
      expect(mockPrisma.milestone.createMany).not.toHaveBeenCalled();
    });
  });
});
