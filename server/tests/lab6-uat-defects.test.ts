import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

const PG_INT4_MAX = 2147483647;

function assertPgInt4(id: unknown): void {
  if (typeof id === "number" && (id > PG_INT4_MAX || id < -2147483648 || !Number.isInteger(id))) {
    throw new Error(`Unable to fit integer value '${id}' into an INT4 (32-bit signed integer).`);
  }
}

const mockSupervisor = {
  id: 1,
  name: "Dr. Kittipong (Advisor 1)",
  email: "sup.advisor1@sprintduo.edu",
  role: "SUPERVISOR" as const,
  isActive: true,
};

const mockStudent = {
  id: 3,
  name: "Phongsatorn (67070501084)",
  email: "stu.jing@sprintduo.edu",
  role: "STUDENT" as const,
  isActive: true,
};

const mockTeamAlpha = {
  id: 1,
  code: "TEAM-ALPHA",
  name: "Team Alpha (SprintDUO)",
  projectTitle: "Course Project Milestone & Supervision Tracker",
  supervisorId: 1,
  supervisor: { id: 1, name: mockSupervisor.name, email: mockSupervisor.email },
  members: [{ userId: 3, user: { id: 3, name: mockStudent.name, email: mockStudent.email } }],
};

let activeUser: typeof mockSupervisor | typeof mockStudent = mockStudent;

const mockPrisma = {
  $queryRaw: vi.fn(),
  user: {
    findUnique: vi.fn(async ({ where }: { where: { email?: string } }) => {
      if (where?.email && where.email.includes("\u0000")) {
        throw new Error('invalid byte sequence for encoding "UTF8": 0x00');
      }
      return null;
    }),
  },
  session: {
    findUnique: vi.fn(async () => ({
      id: "hashed-session-id",
      userId: activeUser.id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      user: activeUser,
    })),
    delete: vi.fn(),
  },
  team: {
    findUnique: vi.fn(async ({ where }: { where: { id: number } }) => {
      assertPgInt4(where.id);
      if (where.id === 1) {
        return mockTeamAlpha;
      }
      return null;
    }),
  },
  milestone: {
    findMany: vi.fn(async () => []),
    findUnique: vi.fn(async ({ where }: { where: { id: number } }) => {
      assertPgInt4(where.id);
      return null;
    }),
    create: vi.fn(),
  },
  submission: {
    findUnique: vi.fn(async ({ where }: { where: { id: number } }) => {
      assertPgInt4(where.id);
      return null;
    }),
    create: vi.fn(),
  },
};

vi.mock("../src/prisma.js", () => ({
  getPrisma: () => mockPrisma,
}));

import { createApp } from "../src/app.js";

describe("Lab 6 UAT Defect Regression Tests (DEF-SD-01 & DEF-SD-04)", () => {
  const testApp = createApp({ serveStatic: false });
  const authCookie = "sprintduo_session=valid-test-token";

  beforeEach(() => {
    vi.clearAllMocks();
    activeUser = mockStudent;
  });

  // ---------------------------------------------------------------------------
  // DEF-SD-01: Out-of-range numeric IDs (>= 2147483648) & non-canonical IDs
  // ---------------------------------------------------------------------------
  describe("DEF-SD-01: Numeric ID bounds and canonical integer validation", () => {
    it("returns 404 NOT_FOUND (never 500) for INT4-overflow IDs on all 5 numeric-ID routes", async () => {
      const overflowIds = ["2147483648", "9999999999999"];

      for (const badId of overflowIds) {
        activeUser = mockStudent;

        const r1 = await request(testApp)
          .get(`/api/teams/${badId}/milestones`)
          .set("Cookie", authCookie);
        expect(r1.status).toBe(404);
        expect(r1.body.error).toBe("NOT_FOUND");

        const r2 = await request(testApp)
          .get(`/api/submissions/${badId}`)
          .set("Cookie", authCookie);
        expect(r2.status).toBe(404);
        expect(r2.body.error).toBe("NOT_FOUND");

        const r3 = await request(testApp)
          .post(`/api/milestones/${badId}/submissions`)
          .set("Cookie", authCookie)
          .send({
            title: "Overflow Probe",
            description: "Synthetic overflow probe body",
            artifactUrl: "https://example.com/probe",
          });
        expect(r3.status).toBe(404);
        expect(r3.body.error).toBe("NOT_FOUND");

        activeUser = mockSupervisor;

        const r4 = await request(testApp)
          .post(`/api/teams/${badId}/milestones`)
          .set("Cookie", authCookie)
          .send({
            title: "Overflow Milestone",
            description: "Synthetic overflow milestone body",
            dueDate: "2026-12-20T12:00:00.000Z",
          });
        expect(r4.status).toBe(404);
        expect(r4.body.error).toBe("NOT_FOUND");

        const r5 = await request(testApp)
          .post(`/api/submissions/${badId}/feedback`)
          .set("Cookie", authCookie)
          .send({
            comment: "Overflow feedback probe",
            status: "APPROVED",
          });
        expect(r5.status).toBe(404);
        expect(r5.body.error).toBe("NOT_FOUND");
      }
    });

    it("rejects non-canonical numeric ID spellings (1e0, +1, 0x1, 1abc, 0, -1) with 404 NOT_FOUND", async () => {
      activeUser = mockStudent;
      for (const weirdId of ["1e0", "+1", "0x1", "1abc", "0", "-1"]) {
        const res = await request(testApp)
          .get(`/api/teams/${weirdId}/milestones`)
          .set("Cookie", authCookie);
        expect(res.status).toBe(404);
        expect(res.body.error).toBe("NOT_FOUND");
      }
    });

    it("still handles in-range non-existent INT4_MAX (2147483647) with 404 NOT_FOUND", async () => {
      activeUser = mockStudent;
      const res = await request(testApp)
        .get("/api/teams/2147483647/milestones")
        .set("Cookie", authCookie);
      expect(res.status).toBe(404);
      expect(res.body.error).toBe("NOT_FOUND");
    });
  });

  // ---------------------------------------------------------------------------
  // DEF-SD-04: Oversized request payloads (80,000 chars) & malformed JSON
  // ---------------------------------------------------------------------------
  describe("DEF-SD-04: Oversized payloads return 413 PAYLOAD_TOO_LARGE (never 500)", () => {
    const hugeText = "x".repeat(80000);

    it("returns 413 PAYLOAD_TOO_LARGE on unauthenticated POST /api/auth/login with 80,000-char password", async () => {
      const res = await request(testApp)
        .post("/api/auth/login")
        .send({ email: "sup.advisor1@sprintduo.edu", password: hugeText });

      expect(res.status).toBe(413);
      expect(res.body.error).toBe("PAYLOAD_TOO_LARGE");
      expect(res.body.message).not.toMatch(/request entity too large/i);
    });

    it("returns 413 PAYLOAD_TOO_LARGE on write endpoints with 80,000-char text fields", async () => {
      activeUser = mockStudent;
      const rSub = await request(testApp)
        .post("/api/milestones/1/submissions")
        .set("Cookie", authCookie)
        .send({
          title: "Huge payload submission",
          description: hugeText,
          artifactUrl: "https://example.com/huge",
        });
      expect(rSub.status).toBe(413);
      expect(rSub.body.error).toBe("PAYLOAD_TOO_LARGE");

      activeUser = mockSupervisor;
      const rMs = await request(testApp)
        .post("/api/teams/1/milestones")
        .set("Cookie", authCookie)
        .send({
          title: "Huge payload milestone",
          description: hugeText,
          dueDate: "2026-12-20T12:00:00.000Z",
        });
      expect(rMs.status).toBe(413);
      expect(rMs.body.error).toBe("PAYLOAD_TOO_LARGE");

      const rFb = await request(testApp)
        .post("/api/submissions/1/feedback")
        .set("Cookie", authCookie)
        .send({
          comment: hugeText,
          status: "APPROVED",
        });
      expect(rFb.status).toBe(413);
      expect(rFb.body.error).toBe("PAYLOAD_TOO_LARGE");
    });

    it("returns 400 VALIDATION_ERROR (not 500) on malformed JSON body and 401 on NUL-byte login email", async () => {
      const badJson = await request(testApp)
        .post("/api/auth/login")
        .set("Content-Type", "application/json")
        .send("{malformed json");
      expect(badJson.status).toBe(400);
      expect(badJson.body.error).toBe("VALIDATION_ERROR");

      const nulEmail = await request(testApp)
        .post("/api/auth/login")
        .send({ email: "sup.advisor1\u0000@sprintduo.edu", password: "wrong" });
      expect(nulEmail.status).toBe(401);
      expect(nulEmail.body.error).toBe("INVALID_CREDENTIALS");
    });
  });
});
