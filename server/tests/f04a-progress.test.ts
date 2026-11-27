import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

const mockSupervisorAlpha = {
  id: 1,
  name: "Dr. Kittipong (Advisor 1)",
  email: "sup.advisor1@sprintduo.edu",
  role: "SUPERVISOR" as const,
  isActive: true,
};

const mockSupervisorBeta = {
  id: 2,
  name: "Dr. Nattaya (Advisor 2)",
  email: "sup.advisor2@sprintduo.edu",
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

const mockTeamBeta = {
  id: 2,
  code: "TEAM-BETA",
  name: "Team Beta",
  projectTitle: "Smart Campus IoT Monitoring",
  supervisorId: 2,
  supervisor: { id: 2, name: mockSupervisorBeta.name, email: mockSupervisorBeta.email },
  members: [{ userId: 5, user: { id: 5, name: mockStudentBeta.name, email: mockStudentBeta.email } }],
};

type AnyUser =
  | typeof mockSupervisorAlpha
  | typeof mockSupervisorBeta
  | typeof mockStudentAlpha
  | typeof mockStudentBeta;

let activeUser: AnyUser = mockStudentAlpha;
let teamMilestones: Record<number, any[]> = {};

function setupFixtures() {
  const futureDue = new Date("2026-12-10T12:00:00.000Z");
  teamMilestones = {
    1: [
      {
        id: 101,
        teamId: 1,
        title: "MS 1: Not Started & Locked",
        description: "No submissions yet",
        dueDate: futureDue,
        isLocked: true,
        submissions: [],
      },
      {
        id: 102,
        teamId: 1,
        title: "MS 2: Late Submitted",
        description: "Submitted during 24h grace window",
        dueDate: futureDue,
        isLocked: false,
        submissions: [
          {
            id: 501,
            milestoneId: 102,
            status: "SUBMITTED",
            isLate: true,
            revisionNumber: 1,
            submittedAt: new Date("2026-11-26T14:00:00.000Z"),
          },
        ],
      },
      {
        id: 103,
        teamId: 1,
        title: "MS 3: Changes Requested",
        description: "Awaiting revision",
        dueDate: futureDue,
        isLocked: false,
        submissions: [
          {
            id: 502,
            milestoneId: 103,
            status: "CHANGES_REQUESTED",
            isLate: false,
            revisionNumber: 1,
            submittedAt: new Date("2026-11-25T10:00:00.000Z"),
          },
        ],
      },
      {
        id: 104,
        teamId: 1,
        title: "MS 4: Approved on Rev #2",
        description: "Rev #1 was CHANGES_REQUESTED (late), Rev #2 APPROVED",
        dueDate: futureDue,
        isLocked: false,
        submissions: [
          // Ordered newest-first (revisionNumber DESC)
          {
            id: 504,
            milestoneId: 104,
            status: "APPROVED",
            isLate: false,
            revisionNumber: 2,
            submittedAt: new Date("2026-11-26T16:00:00.000Z"),
          },
          {
            id: 503,
            milestoneId: 104,
            status: "CHANGES_REQUESTED",
            isLate: true,
            revisionNumber: 1,
            submittedAt: new Date("2026-11-24T16:00:00.000Z"),
          },
        ],
      },
    ],
    // Empty team edge case (0 milestones -> completionPercent: 0)
    2: [],
  };
}

const mockPrisma: any = {
  $queryRaw: vi.fn(),
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
      if (where.id === 1) return mockTeamAlpha;
      if (where.id === 2) return mockTeamBeta;
      return null;
    }),
  },
  milestone: {
    findMany: vi.fn(async ({ where }: { where: { teamId: number } }) => {
      return teamMilestones[where.teamId] ?? [];
    }),
  },
};

vi.mock("../src/prisma.js", () => ({
  getPrisma: () => mockPrisma,
}));

import { createApp } from "../src/app.js";

describe("Sprint 3 F-04a — Team Milestone Progress Board (TEST-13 & TEST-14)", () => {
  const testApp = createApp({ serveStatic: false });
  const authCookie = "sprintduo_session=valid-sprint3-token";

  beforeEach(() => {
    vi.clearAllMocks();
    setupFixtures();
    activeUser = mockStudentAlpha;
  });

  // ---------------------------------------------------------------------------
  // TEST-13 (AC-12): Progress Board Aggregation & Latest-Revision Precedence
  // ---------------------------------------------------------------------------
  it("TEST-13 (AC-12): computes exact counts, completionPercent, locked/late totals, and 4 grouped columns using latest revision", async () => {
    // Student on Team Alpha -> 200
    const stuRes = await request(testApp)
      .get("/api/teams/1/progress")
      .set("Cookie", authCookie);

    expect(stuRes.status).toBe(200);
    expect(stuRes.body.team).toMatchObject({ id: 1, code: "TEAM-ALPHA" });
    expect(stuRes.body.summary).toEqual({
      totalMilestones: 4,
      totalSubmissions: 4,
      lockedCount: 1,
      lateSubmissionCount: 2, // sub 501 (late) + sub 503 (historical Rev #1 late)
      completionPercent: 25, // 1 APPROVED / 4 milestones = 25%
      counts: {
        NOT_STARTED: 1,
        SUBMITTED: 1,
        CHANGES_REQUESTED: 1,
        APPROVED: 1,
      },
    });
    expect(stuRes.body.columns.NOT_STARTED).toHaveLength(1);
    expect(stuRes.body.columns.SUBMITTED).toHaveLength(1);
    expect(stuRes.body.columns.CHANGES_REQUESTED).toHaveLength(1);
    expect(stuRes.body.columns.APPROVED).toHaveLength(1);
    expect(stuRes.body.columns.APPROVED[0]).toMatchObject({
      id: 104,
      latestRevisionNumber: 2,
      latestStatus: "APPROVED",
      submissionCount: 2,
    });

    // Assigned Supervisor Alpha -> 200 with identical counts
    activeUser = mockSupervisorAlpha;
    const supRes = await request(testApp)
      .get("/api/teams/1/progress")
      .set("Cookie", authCookie);
    expect(supRes.status).toBe(200);
    expect(supRes.body.summary.completionPercent).toBe(25);
  });

  it("TEST-13 (AC-12 edge case): returns completionPercent: 0 and empty columns when team has 0 milestones", async () => {
    activeUser = mockStudentBeta;
    const res = await request(testApp)
      .get("/api/teams/2/progress")
      .set("Cookie", authCookie);

    expect(res.status).toBe(200);
    expect(res.body.summary).toEqual({
      totalMilestones: 0,
      totalSubmissions: 0,
      lockedCount: 0,
      lateSubmissionCount: 0,
      completionPercent: 0,
      counts: {
        NOT_STARTED: 0,
        SUBMITTED: 0,
        CHANGES_REQUESTED: 0,
        APPROVED: 0,
      },
    });
    expect(res.body.columns.NOT_STARTED).toEqual([]);
    expect(res.body.columns.APPROVED).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // TEST-14 (AC-13): Progress Board Access Control (401/403) & Overflow Guard (404)
  // ---------------------------------------------------------------------------
  it("TEST-14 (AC-13): rejects unauthenticated (401), foreign-team student/supervisor (403 BR-01), and overflow/non-canonical IDs (404)", async () => {
    const unauth = await request(testApp).get("/api/teams/1/progress");
    expect(unauth.status).toBe(401);

    activeUser = mockStudentBeta;
    const foreignStu = await request(testApp)
      .get("/api/teams/1/progress")
      .set("Cookie", authCookie);
    expect(foreignStu.status).toBe(403);

    activeUser = mockSupervisorBeta;
    const foreignSup = await request(testApp)
      .get("/api/teams/1/progress")
      .set("Cookie", authCookie);
    expect(foreignSup.status).toBe(403);

    activeUser = mockStudentAlpha;
    const overflow = await request(testApp)
      .get("/api/teams/2147483648/progress")
      .set("Cookie", authCookie);
    expect(overflow.status).toBe(404);
    expect(overflow.body.error).toBe("NOT_FOUND");

    const nonCanon = await request(testApp)
      .get("/api/teams/1e0/progress")
      .set("Cookie", authCookie);
    expect(nonCanon.status).toBe(404);
  });
});
