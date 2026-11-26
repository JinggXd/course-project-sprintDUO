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

let activeUser: AnyUser = mockSupervisorAlpha;
let milestonesStore: Record<number, any> = {};
let submissionsStore: Record<number, any> = {};
let nextSubmissionId = 900;
let nextFeedbackId = 300;

function resetStore() {
  const futureDue = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const pastDue = new Date(Date.now() - 48 * 60 * 60 * 1000);
  nextSubmissionId = 900;
  nextFeedbackId = 300;

  milestonesStore = {
    10: {
      id: 10,
      teamId: 1,
      createdById: 1,
      title: "Milestone 1: Open Revision Demo",
      description: "Initial open milestone for Sprint 2 revision workflow",
      dueDate: futureDue,
      isLocked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    11: {
      id: 11,
      teamId: 1,
      createdById: 1,
      title: "Milestone 2: Past Due Extendable",
      description: "Past-due milestone that supervisor can extend",
      dueDate: pastDue,
      isLocked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    12: {
      id: 12,
      teamId: 1,
      createdById: 1,
      title: "Milestone 3: Locked Milestone",
      description: "Locked milestone for filter and guard checks",
      dueDate: futureDue,
      isLocked: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    13: {
      id: 13,
      teamId: 1,
      createdById: 1,
      title: "Milestone 4: Already Approved",
      description: "Milestone whose latest submission is approved",
      dueDate: futureDue,
      isLocked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  submissionsStore = {
    801: {
      id: 801,
      milestoneId: 13,
      submittedById: 3,
      title: "Approved Deliverable Rev 1",
      description: "Already approved baseline deliverable",
      artifactUrl: "https://github.com/JinggXd/course-project-sprintDUO",
      status: "APPROVED",
      isLate: false,
      revisionNumber: 1,
      parentSubmissionId: null,
      submittedAt: new Date(),
      updatedAt: new Date(),
      submittedBy: { id: 3, name: mockStudentAlpha.name, email: mockStudentAlpha.email },
      feedbacks: [
        {
          id: 201,
          submissionId: 801,
          supervisorId: 1,
          comment: "Approved completely.",
          status: "APPROVED",
          createdAt: new Date(),
          supervisor: { id: 1, name: mockSupervisorAlpha.name, email: mockSupervisorAlpha.email },
        },
      ],
    },
  };
}

function getMilestoneSubmissions(milestoneId: number) {
  return Object.values(submissionsStore)
    .filter((s) => s.milestoneId === milestoneId)
    .sort((a, b) => (b.revisionNumber ?? 1) - (a.revisionNumber ?? 1) || b.id - a.id);
}

const mockPrisma: any = {
  $queryRaw: vi.fn(),
  $transaction: vi.fn(async (fn: any) => fn(mockPrisma)),
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
      return Object.values(milestonesStore)
        .filter((m) => m.teamId === where.teamId)
        .map((m) => ({
          ...m,
          submissions: getMilestoneSubmissions(m.id),
        }));
    }),
    findUnique: vi.fn(async ({ where, include }: any) => {
      const ms = milestonesStore[where.id];
      if (!ms) return null;
      const team = ms.teamId === 1 ? mockTeamAlpha : mockTeamBeta;
      const subs = getMilestoneSubmissions(ms.id);
      const take = include?.submissions?.take;
      return {
        ...ms,
        team,
        submissions: typeof take === "number" ? subs.slice(0, take) : subs,
      };
    }),
    update: vi.fn(async ({ where, data }: any) => {
      const ms = milestonesStore[where.id];
      if (!ms) throw new Error("Milestone not found");
      const updated = { ...ms, ...data, updatedAt: new Date() };
      milestonesStore[where.id] = updated;
      return updated;
    }),
  },
  submission: {
    findUnique: vi.fn(async ({ where }: { where: { id: number } }) => {
      const sub = submissionsStore[where.id];
      if (!sub) return null;
      const ms = milestonesStore[sub.milestoneId];
      const team = ms.teamId === 1 ? mockTeamAlpha : mockTeamBeta;
      return {
        ...sub,
        milestone: { ...ms, team },
      };
    }),
    create: vi.fn(async ({ data }: any) => {
      const id = nextSubmissionId++;
      const rec = {
        id,
        milestoneId: data.milestoneId,
        submittedById: data.submittedById,
        title: data.title,
        description: data.description,
        artifactUrl: data.artifactUrl,
        status: data.status ?? "SUBMITTED",
        isLate: data.isLate ?? false,
        revisionNumber: data.revisionNumber ?? 1,
        parentSubmissionId: data.parentSubmissionId ?? null,
        submittedAt: new Date(),
        updatedAt: new Date(),
        submittedBy: { id: activeUser.id, name: activeUser.name, email: activeUser.email },
        feedbacks: [],
      };
      submissionsStore[id] = rec;
      return rec;
    }),
    update: vi.fn(async ({ where, data }: any) => {
      const sub = submissionsStore[where.id];
      const updated = { ...sub, ...data, updatedAt: new Date() };
      submissionsStore[where.id] = updated;
      return updated;
    }),
  },
  feedback: {
    create: vi.fn(async ({ data }: any) => {
      const fb = {
        id: nextFeedbackId++,
        ...data,
        createdAt: new Date(),
        supervisor: { id: activeUser.id, name: activeUser.name, email: activeUser.email },
      };
      submissionsStore[data.submissionId].feedbacks.push(fb);
      return fb;
    }),
  },
};

vi.mock("../src/prisma.js", () => ({
  getPrisma: () => mockPrisma,
}));

import { createApp } from "../src/app.js";

describe("Sprint 2 F-03a & F-03b — Milestone Management, Locking, Filtering & Revision History (TEST-08..TEST-12)", () => {
  const testApp = createApp({ serveStatic: false });
  const authCookie = "sprintduo_session=valid-sprint2-token";

  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();
    activeUser = mockSupervisorAlpha;
  });

  // ---------------------------------------------------------------------------
  // TEST-08 (AC-07): Supervisor Milestone Editing & Deadline Extension
  // ---------------------------------------------------------------------------
  it("TEST-08 (AC-07): allows assigned supervisor to edit title/description/dueDate, rejects invalid partial updates, and re-opens extended past-due milestone", async () => {
    // Reject empty update body
    const emptyRes = await request(testApp)
      .patch("/api/milestones/11")
      .set("Cookie", authCookie)
      .send({});
    expect(emptyRes.status).toBe(400);
    expect(emptyRes.body.error).toBe("VALIDATION_ERROR");

    // Reject invalid dueDate & non-boolean isLocked
    const badRes = await request(testApp)
      .patch("/api/milestones/11")
      .set("Cookie", authCookie)
      .send({ title: "Hi", dueDate: "not-a-date", isLocked: "yes" });
    expect(badRes.status).toBe(400);
    expect(badRes.body.error).toBe("VALIDATION_ERROR");

    // Valid edit extending past-due Milestone 11 into the future
    const extendedDue = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const editRes = await request(testApp)
      .patch("/api/milestones/11")
      .set("Cookie", authCookie)
      .send({
        title: "Milestone 2: Extended Sprint 2 Due Date",
        description: "Updated requirements with 5-day deadline extension",
        dueDate: extendedDue,
      });

    expect(editRes.status).toBe(200);
    expect(editRes.body.milestone.title).toBe("Milestone 2: Extended Sprint 2 Due Date");
    expect(new Date(editRes.body.milestone.dueDate).toISOString()).toBe(extendedDue);

    // Student can now submit on-time to the extended milestone
    activeUser = mockStudentAlpha;
    const subRes = await request(testApp)
      .post("/api/milestones/11/submissions")
      .set("Cookie", authCookie)
      .send({
        title: "Extended Milestone Deliverable",
        description: "Submitted after supervisor extended due date",
        artifactUrl: "https://github.com/JinggXd/course-project-sprintDUO",
      });
    expect(subRes.status).toBe(201);
    expect(subRes.body.submission.isLate).toBe(false);
    expect(subRes.body.submission.revisionNumber).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // TEST-09 (AC-08): Supervisor Milestone Locking & Student Submission Guard
  // ---------------------------------------------------------------------------
  it("TEST-09 (AC-08): locking a milestone rejects student submission with 400 MILESTONE_LOCKED and unlocking restores submission", async () => {
    const lockRes = await request(testApp)
      .patch("/api/milestones/10")
      .set("Cookie", authCookie)
      .send({ isLocked: true });
    expect(lockRes.status).toBe(200);
    expect(lockRes.body.milestone.isLocked).toBe(true);

    // Student blocked when locked
    activeUser = mockStudentAlpha;
    const blockedRes = await request(testApp)
      .post("/api/milestones/10/submissions")
      .set("Cookie", authCookie)
      .send({
        title: "Blocked Locked Submission",
        description: "Should fail because milestone is locked",
        artifactUrl: "https://github.com/JinggXd/course-project-sprintDUO",
      });
    expect(blockedRes.status).toBe(400);
    expect(blockedRes.body.error).toBe("MILESTONE_LOCKED");
    expect(mockPrisma.submission.create).not.toHaveBeenCalled();

    // Supervisor unlocks milestone
    activeUser = mockSupervisorAlpha;
    const unlockRes = await request(testApp)
      .patch("/api/milestones/10")
      .set("Cookie", authCookie)
      .send({ isLocked: false });
    expect(unlockRes.status).toBe(200);
    expect(unlockRes.body.milestone.isLocked).toBe(false);

    // Student can submit again
    activeUser = mockStudentAlpha;
    const okRes = await request(testApp)
      .post("/api/milestones/10/submissions")
      .set("Cookie", authCookie)
      .send({
        title: "Unlocked Deliverable",
        description: "Submitted after supervisor unlocked milestone",
        artifactUrl: "https://github.com/JinggXd/course-project-sprintDUO",
      });
    expect(okRes.status).toBe(201);
  });

  // ---------------------------------------------------------------------------
  // TEST-10 (AC-09): Milestone Status Filtering
  // ---------------------------------------------------------------------------
  it("TEST-10 (AC-09): filters GET /api/teams/:teamId/milestones by status and rejects invalid status with 400", async () => {
    const approvedRes = await request(testApp)
      .get("/api/teams/1/milestones?status=APPROVED")
      .set("Cookie", authCookie);
    expect(approvedRes.status).toBe(200);
    expect(approvedRes.body.filter).toBe("APPROVED");
    expect(approvedRes.body.milestones.map((m: any) => m.id)).toEqual([13]);

    const lockedRes = await request(testApp)
      .get("/api/teams/1/milestones?status=LOCKED")
      .set("Cookie", authCookie);
    expect(lockedRes.status).toBe(200);
    expect(lockedRes.body.milestones.map((m: any) => m.id)).toEqual([12]);

    const notStartedRes = await request(testApp)
      .get("/api/teams/1/milestones?status=NOT_STARTED")
      .set("Cookie", authCookie);
    expect(notStartedRes.status).toBe(200);
    expect(notStartedRes.body.milestones.map((m: any) => m.id)).toEqual([10, 11, 12]);

    const invalidRes = await request(testApp)
      .get("/api/teams/1/milestones?status=UNKNOWN_STATE")
      .set("Cookie", authCookie);
    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.error).toBe("VALIDATION_ERROR");
  });

  // ---------------------------------------------------------------------------
  // TEST-11 (AC-10, BR-04): Multi-Revision Submission History Preservation
  // ---------------------------------------------------------------------------
  it("TEST-11 (AC-10, BR-04): enforces CHANGES_REQUESTED resubmission lifecycle, preserves Rev #1 & feedback, and blocks duplicate/post-approval posts with 409", async () => {
    // 1. Student submits Rev #1
    activeUser = mockStudentAlpha;
    const rev1Res = await request(testApp)
      .post("/api/milestones/10/submissions")
      .set("Cookie", authCookie)
      .send({
        title: "Sprint 2 Deliverable v1",
        description: "Initial revision awaiting supervisor evaluation",
        artifactUrl: "https://github.com/JinggXd/course-project-sprintDUO/releases/tag/v1",
      });
    expect(rev1Res.status).toBe(201);
    expect(rev1Res.body.submission.revisionNumber).toBe(1);
    expect(rev1Res.body.submission.parentSubmissionId).toBeNull();
    const rev1Id = rev1Res.body.submission.id;

    // 2. Duplicate while SUBMITTED -> 409 SUBMISSION_PENDING_REVIEW
    const dupRes = await request(testApp)
      .post("/api/milestones/10/submissions")
      .set("Cookie", authCookie)
      .send({
        title: "Premature Duplicate",
        description: "Attempting second submission before review",
        artifactUrl: "https://github.com/JinggXd/course-project-sprintDUO",
      });
    expect(dupRes.status).toBe(409);
    expect(dupRes.body.error).toBe("SUBMISSION_PENDING_REVIEW");

    // 3. Supervisor requests changes on Rev #1
    activeUser = mockSupervisorAlpha;
    const crRes = await request(testApp)
      .post(`/api/submissions/${rev1Id}/feedback`)
      .set("Cookie", authCookie)
      .send({
        comment: "Please add ERD revision diagram and re-verify migration.",
        status: "CHANGES_REQUESTED",
      });
    expect(crRes.status).toBe(201);

    // 4. Student resubmits Rev #2
    activeUser = mockStudentAlpha;
    const rev2Res = await request(testApp)
      .post("/api/milestones/10/submissions")
      .set("Cookie", authCookie)
      .send({
        title: "Sprint 2 Deliverable v2 (Revised)",
        description: "Added ERD revision diagram and verified additive migration",
        artifactUrl: "https://github.com/JinggXd/course-project-sprintDUO/releases/tag/v2",
      });
    expect(rev2Res.status).toBe(201);
    expect(rev2Res.body.submission.revisionNumber).toBe(2);
    expect(rev2Res.body.submission.parentSubmissionId).toBe(rev1Id);
    expect(rev2Res.body.submission.status).toBe("SUBMITTED");
    const rev2Id = rev2Res.body.submission.id;

    // 5. Supervisor approves Rev #2
    activeUser = mockSupervisorAlpha;
    const appRes = await request(testApp)
      .post(`/api/submissions/${rev2Id}/feedback`)
      .set("Cookie", authCookie)
      .send({
        comment: "Revision #2 addresses all points — approved!",
        status: "APPROVED",
      });
    expect(appRes.status).toBe(201);

    // 6. Student attempts Rev #3 after APPROVED -> 409 MILESTONE_ALREADY_APPROVED
    activeUser = mockStudentAlpha;
    const postApproveRes = await request(testApp)
      .post("/api/milestones/10/submissions")
      .set("Cookie", authCookie)
      .send({
        title: "Unnecessary Rev 3",
        description: "Should fail because Rev #2 is already approved",
        artifactUrl: "https://github.com/JinggXd/course-project-sprintDUO",
      });
    expect(postApproveRes.status).toBe(409);
    expect(postApproveRes.body.error).toBe("MILESTONE_ALREADY_APPROVED");

    // 7. History endpoint preserves BOTH Rev #2 (newest) and Rev #1 with original feedbacks intact
    const histRes = await request(testApp)
      .get("/api/milestones/10/submissions")
      .set("Cookie", authCookie);
    expect(histRes.status).toBe(200);
    expect(histRes.body.milestoneId).toBe(10);
    expect(histRes.body.totalRevisions).toBe(2);
    expect(histRes.body.submissions).toHaveLength(2);
    expect(histRes.body.submissions[0]).toMatchObject({
      id: rev2Id,
      revisionNumber: 2,
      parentSubmissionId: rev1Id,
      status: "APPROVED",
    });
    expect(histRes.body.submissions[0].feedbacks[0].comment).toContain("Revision #2 addresses all points");
    expect(histRes.body.submissions[1]).toMatchObject({
      id: rev1Id,
      revisionNumber: 1,
      parentSubmissionId: null,
      status: "CHANGES_REQUESTED",
    });
    expect(histRes.body.submissions[1].feedbacks[0].comment).toContain("Please add ERD revision diagram");
  });

  // ---------------------------------------------------------------------------
  // TEST-12 (AC-11): Sprint 2 Access Control (401/403) & Overflow ID Guard (404)
  // ---------------------------------------------------------------------------
  it("TEST-12 (AC-11): enforces 401 unauth, 403 role/cross-team BR-01/BR-02, and 404 overflow IDs on Sprint 2 routes", async () => {
    // 401 unauthenticated
    const unauthPatch = await request(testApp)
      .patch("/api/milestones/10")
      .send({ isLocked: true });
    expect(unauthPatch.status).toBe(401);

    const unauthHist = await request(testApp).get("/api/milestones/10/submissions");
    expect(unauthHist.status).toBe(401);

    // 403 student attempting PATCH milestone (BR-02)
    activeUser = mockStudentAlpha;
    const stuPatch = await request(testApp)
      .patch("/api/milestones/10")
      .set("Cookie", authCookie)
      .send({ isLocked: true });
    expect(stuPatch.status).toBe(403);

    // 403 foreign supervisor attempting PATCH and GET history (BR-01)
    activeUser = mockSupervisorBeta;
    const foreignSupPatch = await request(testApp)
      .patch("/api/milestones/10")
      .set("Cookie", authCookie)
      .send({ title: "Unauthorized Edit" });
    expect(foreignSupPatch.status).toBe(403);

    const foreignSupHist = await request(testApp)
      .get("/api/milestones/10/submissions")
      .set("Cookie", authCookie);
    expect(foreignSupHist.status).toBe(403);

    // 403 foreign student attempting GET history (BR-01)
    activeUser = mockStudentBeta;
    const foreignStuHist = await request(testApp)
      .get("/api/milestones/10/submissions")
      .set("Cookie", authCookie);
    expect(foreignStuHist.status).toBe(403);

    // 404 INT4 overflow IDs (DEF-SD-01 preserved on new Sprint 2 routes)
    activeUser = mockSupervisorAlpha;
    const overflowPatch = await request(testApp)
      .patch("/api/milestones/2147483648")
      .set("Cookie", authCookie)
      .send({ isLocked: true });
    expect(overflowPatch.status).toBe(404);

    const overflowHist = await request(testApp)
      .get("/api/milestones/2147483648/submissions")
      .set("Cookie", authCookie);
    expect(overflowHist.status).toBe(404);
  });
});
