import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";

const FIXED_NOW = new Date("2026-11-26T12:00:00.000Z");

const mockSupervisorAlpha = {
  id: 1,
  name: "Dr. Kittipong (Advisor 1)",
  email: "sup.advisor1@sprintduo.edu",
  role: "SUPERVISOR" as const,
  isActive: true,
};

const mockStudentAlpha = {
  id: 3,
  name: "Phongsatorn (67070501084)",
  email: "stu.jing@sprintduo.edu",
  role: "STUDENT" as const,
  isActive: true,
};

const mockStudentBeta = {
  id: 5,
  name: "Somchai (Team Beta)",
  email: "stu.other@sprintduo.edu",
  role: "STUDENT" as const,
  isActive: true,
};

const mockTeamAlpha = {
  id: 1,
  code: "TEAM-ALPHA",
  name: "Team Alpha (SprintDUO)",
  projectTitle: "Course Project Milestone & Supervision Tracker",
  supervisorId: 1,
  supervisor: { id: 1, name: mockSupervisorAlpha.name, email: mockSupervisorAlpha.email },
  members: [{ userId: 3, user: { id: 3, name: mockStudentAlpha.name, email: mockStudentAlpha.email } }],
};

let activeUser: typeof mockSupervisorAlpha | typeof mockStudentAlpha | typeof mockStudentBeta =
  mockStudentAlpha;

const milestoneFixtures: Record<number, { id: number; teamId: number; title: string; description: string; dueDate: Date; team: typeof mockTeamAlpha }> = {
  10: {
    id: 10,
    teamId: 1,
    title: "MS Future (-1h before due)",
    description: "Due 1 hour after FIXED_NOW",
    dueDate: new Date("2026-11-26T13:00:00.000Z"),
    team: mockTeamAlpha,
  },
  11: {
    id: 11,
    teamId: 1,
    title: "MS Exact DueDate (T)",
    description: "Due at exact FIXED_NOW",
    dueDate: new Date("2026-11-26T12:00:00.000Z"),
    team: mockTeamAlpha,
  },
  12: {
    id: 12,
    teamId: 1,
    title: "MS Grace Start (T + 1ms)",
    description: "1 millisecond past dueDate",
    dueDate: new Date("2026-11-26T11:59:59.999Z"),
    team: mockTeamAlpha,
  },
  13: {
    id: 13,
    teamId: 1,
    title: "MS Grace Mid (T + 12h)",
    description: "12 hours past dueDate",
    dueDate: new Date("2026-11-26T00:00:00.000Z"),
    team: mockTeamAlpha,
  },
  14: {
    id: 14,
    teamId: 1,
    title: "MS Grace Exact Upper Boundary (T + 24h)",
    description: "Exactly 24 hours (86,400,000 ms) past dueDate",
    dueDate: new Date("2026-11-25T12:00:00.000Z"),
    team: mockTeamAlpha,
  },
  15: {
    id: 15,
    teamId: 1,
    title: "MS Cutoff Expired +1ms (T + 24h + 1ms)",
    description: "1 millisecond past 24-hour grace cutoff",
    dueDate: new Date("2026-11-25T11:59:59.999Z"),
    team: mockTeamAlpha,
  },
  16: {
    id: 16,
    teamId: 1,
    title: "MS Seeded Past Due (T + 48h)",
    description: "48 hours past dueDate",
    dueDate: new Date("2026-11-24T12:00:00.000Z"),
    team: mockTeamAlpha,
  },
};

let nextSubmissionId = 700;
const storedSubmissions: Record<number, any> = {
  500: {
    id: 500,
    milestoneId: 10,
    submittedById: 3,
    title: "Historical Sprint 1 Submission",
    description: "Submitted on-time in Sprint 1 before Lab 7 migration",
    artifactUrl: "https://github.com/JinggXd/course-project-sprintDUO",
    status: "APPROVED",
    isLate: false,
    submittedAt: new Date("2026-11-20T10:00:00.000Z"),
    updatedAt: new Date("2026-11-20T10:00:00.000Z"),
    submittedBy: { id: 3, name: mockStudentAlpha.name, email: mockStudentAlpha.email },
    milestone: milestoneFixtures[10],
    feedbacks: [],
  },
};

const mockPrisma = {
  $queryRaw: vi.fn(),
  session: {
    findUnique: vi.fn(async () => ({
      id: "hashed-session-id",
      userId: activeUser.id,
      expiresAt: new Date("2026-11-27T12:00:00.000Z"),
      user: activeUser,
    })),
    delete: vi.fn(),
  },
  milestone: {
    findUnique: vi.fn(async ({ where }: { where: { id: number } }) => {
      return milestoneFixtures[where.id] || null;
    }),
  },
  submission: {
    create: vi.fn(async ({ data }: { data: any }) => {
      const id = nextSubmissionId++;
      const ms = milestoneFixtures[data.milestoneId];
      const rec = {
        id,
        ...data,
        submittedAt: FIXED_NOW,
        updatedAt: FIXED_NOW,
        submittedBy: { id: activeUser.id, name: activeUser.name, email: activeUser.email },
        milestone: ms,
        feedbacks: [],
      };
      storedSubmissions[id] = rec;
      return rec;
    }),
    findUnique: vi.fn(async ({ where }: { where: { id: number } }) => {
      return storedSubmissions[where.id] || null;
    }),
  },
};

vi.mock("../src/prisma.js", () => ({
  getPrisma: () => mockPrisma,
}));

import { createApp } from "../src/app.js";

describe("Lab 7 BR-03 v1.1.0 — 24-Hour Late Grace Window & isLate Marking (TEST-07)", () => {
  const testApp = createApp({ serveStatic: false });
  const authCookie = "sprintduo_session=valid-test-token";

  const validPayload = {
    title: "Lab 7 Boundary Submission",
    description: "Testing exact 24-hour grace window boundary semantics",
    artifactUrl: "https://github.com/JinggXd/course-project-sprintDUO",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(FIXED_NOW);
    activeUser = mockStudentAlpha;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("accepts on-time submission before dueDate (T - 1h) and at exact dueDate (T) with 201 and isLate: false", async () => {
    for (const msId of [10, 11]) {
      const res = await request(testApp)
        .post(`/api/milestones/${msId}/submissions`)
        .set("Cookie", authCookie)
        .send(validPayload);

      expect(res.status).toBe(201);
      expect(res.body.submission.status).toBe("SUBMITTED");
      expect(res.body.submission.isLate).toBe(false);
    }
  });

  it("accepts late submission inside 24-hour grace window (T + 1ms, T + 12h, and exact T + 24h) with 201 and isLate: true", async () => {
    for (const msId of [12, 13, 14]) {
      const res = await request(testApp)
        .post(`/api/milestones/${msId}/submissions`)
        .set("Cookie", authCookie)
        .send(validPayload);

      expect(res.status).toBe(201);
      expect(res.body.submission.status).toBe("SUBMITTED");
      expect(res.body.submission.isLate).toBe(true);
    }
    expect(mockPrisma.submission.create).toHaveBeenCalledTimes(3);
  });

  it("rejects submission strictly after 24-hour grace cutoff (T + 24h + 1ms and T + 48h) with 400 DEADLINE_PASSED and stores nothing", async () => {
    for (const msId of [15, 16]) {
      const res = await request(testApp)
        .post(`/api/milestones/${msId}/submissions`)
        .set("Cookie", authCookie)
        .send(validPayload);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("DEADLINE_PASSED");
      expect(res.body.message).toBe(
        "Milestone deadline has passed (24-hour grace window expired)",
      );
    }
    expect(mockPrisma.submission.create).not.toHaveBeenCalled();
  });

  it("still enforces input & artifactUrl validation (400 VALIDATION_ERROR) during the 24-hour grace window without storing", async () => {
    const res = await request(testApp)
      .post("/api/milestones/13/submissions")
      .set("Cookie", authCookie)
      .send({
        title: "Grace Invalid URL",
        description: "Attempting ftp link inside grace window",
        artifactUrl: "ftp://invalid.example.com/file",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("VALIDATION_ERROR");
    expect(res.body.details?.artifactUrl).toBeDefined();
    expect(mockPrisma.submission.create).not.toHaveBeenCalled();
  });

  it("returns persisted isLate flag on GET /api/submissions/:id for both late (true) and historical Sprint 1 (false) records", async () => {
    // Historical Sprint 1 record preserves isLate: false
    const histRes = await request(testApp)
      .get("/api/submissions/500")
      .set("Cookie", authCookie);
    expect(histRes.status).toBe(200);
    expect(histRes.body.submission.isLate).toBe(false);

    // Newly created grace-window submission returns isLate: true on GET
    const postRes = await request(testApp)
      .post("/api/milestones/13/submissions")
      .set("Cookie", authCookie)
      .send(validPayload);
    expect(postRes.status).toBe(201);
    const createdId = postRes.body.submission.id;

    const getRes = await request(testApp)
      .get(`/api/submissions/${createdId}`)
      .set("Cookie", authCookie);
    expect(getRes.status).toBe(200);
    expect(getRes.body.submission.isLate).toBe(true);
  });

  it("preserves NFR-01 (401) and BR-01/BR-02 (403) access restrictions during the 24-hour grace window", async () => {
    // Unauthenticated caller -> 401
    const unauthRes = await request(testApp)
      .post("/api/milestones/13/submissions")
      .send(validPayload);
    expect(unauthRes.status).toBe(401);

    // Supervisor role -> 403 (BR-02)
    activeUser = mockSupervisorAlpha;
    const supRes = await request(testApp)
      .post("/api/milestones/13/submissions")
      .set("Cookie", authCookie)
      .send(validPayload);
    expect(supRes.status).toBe(403);

    // Foreign-team student (Team Beta) -> 403 (BR-01)
    activeUser = mockStudentBeta;
    const betaRes = await request(testApp)
      .post("/api/milestones/13/submissions")
      .set("Cookie", authCookie)
      .send(validPayload);
    expect(betaRes.status).toBe(403);

    expect(mockPrisma.submission.create).not.toHaveBeenCalled();
  });
});
