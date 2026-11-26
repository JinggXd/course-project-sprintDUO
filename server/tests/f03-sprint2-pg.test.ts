import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { getPrisma } from "../src/prisma.js";
import { seedDatabase } from "../prisma/seed.js";

process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST ||
  "postgresql://sprintduo:sprintduo@localhost:5434/sprintduo_test?schema=public";

const prisma = getPrisma();

describe("Sprint 2 F-03 PostgreSQL 16 Integration Tests (TEST-08..TEST-12)", () => {
  let advisor1Cookie: string;
  let advisor2Cookie: string;
  let studentJingCookie: string;
  let studentBetaCookie: string;
  let alphaTeamId: number;
  let sprint2MilestoneId: number;

  beforeAll(async () => {
    await prisma.feedback.deleteMany();
    await prisma.submission.deleteMany();
    await prisma.milestone.deleteMany();
    await prisma.teamMember.deleteMany();
    await prisma.team.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();

    await seedDatabase(prisma);

    const teamAlpha = await prisma.team.findUniqueOrThrow({ where: { code: "TEAM-ALPHA" } });
    alphaTeamId = teamAlpha.id;

    const login = async (email: string) => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email, password: "Password123!" });
      return Array.isArray(res.headers["set-cookie"])
        ? res.headers["set-cookie"].join("; ")
        : res.headers["set-cookie"];
    };

    advisor1Cookie = await login("sup.advisor1@sprintduo.edu");
    advisor2Cookie = await login("sup.advisor2@sprintduo.edu");
    studentJingCookie = await login("stu.jing@sprintduo.edu");
    studentBetaCookie = await login("stu.other@sprintduo.edu");

    const createMs = await request(app)
      .post(`/api/teams/${alphaTeamId}/milestones`)
      .set("Cookie", advisor1Cookie)
      .send({
        title: "Sprint 2 PG Integration Milestone",
        description: "Persisted PostgreSQL test for edit, lock, filter, and BR-04 revisions",
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    sprint2MilestoneId = createMs.body.milestone.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("TEST-08 & TEST-09 (PG 16): persists milestone edit, deadline extension, lock guard (400 MILESTONE_LOCKED), and unlock", async () => {
    const newDue = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    const editRes = await request(app)
      .patch(`/api/milestones/${sprint2MilestoneId}`)
      .set("Cookie", advisor1Cookie)
      .send({
        title: "Sprint 2 PG Edited Milestone",
        dueDate: newDue,
        isLocked: true,
      });
    expect(editRes.status).toBe(200);
    expect(editRes.body.milestone.title).toBe("Sprint 2 PG Edited Milestone");
    expect(editRes.body.milestone.isLocked).toBe(true);

    // Locked blocks student submission with 400 MILESTONE_LOCKED and zero rows persisted
    const lockedAttempt = await request(app)
      .post(`/api/milestones/${sprint2MilestoneId}/submissions`)
      .set("Cookie", studentJingCookie)
      .send({
        title: "Blocked While Locked",
        description: "Must not persist while milestone is locked",
        artifactUrl: "https://github.com/JinggXd/course-project-sprintDUO",
      });
    expect(lockedAttempt.status).toBe(400);
    expect(lockedAttempt.body.error).toBe("MILESTONE_LOCKED");

    const countWhileLocked = await prisma.submission.count({
      where: { milestoneId: sprint2MilestoneId },
    });
    expect(countWhileLocked).toBe(0);

    // Status filter LOCKED finds this milestone
    const lockedFilter = await request(app)
      .get(`/api/teams/${alphaTeamId}/milestones?status=LOCKED`)
      .set("Cookie", advisor1Cookie);
    expect(lockedFilter.status).toBe(200);
    expect(lockedFilter.body.milestones.some((m: any) => m.id === sprint2MilestoneId)).toBe(true);

    // Unlock milestone for subsequent revision test
    const unlockRes = await request(app)
      .patch(`/api/milestones/${sprint2MilestoneId}`)
      .set("Cookie", advisor1Cookie)
      .send({ isLocked: false });
    expect(unlockRes.status).toBe(200);
    expect(unlockRes.body.milestone.isLocked).toBe(false);
  });

  it("TEST-10 & TEST-11 (PG 16): persists Rev #1 -> CHANGES_REQUESTED -> Rev #2 -> APPROVED with self-FK parentSubmissionId and status filtering", async () => {
    // Rev #1
    const r1 = await request(app)
      .post(`/api/milestones/${sprint2MilestoneId}/submissions`)
      .set("Cookie", studentJingCookie)
      .send({
        title: "PG Revision 1",
        description: "First version submitted to PostgreSQL",
        artifactUrl: "https://github.com/JinggXd/course-project-sprintDUO/releases/tag/v1",
      });
    expect(r1.status).toBe(201);
    expect(r1.body.submission.revisionNumber).toBe(1);
    expect(r1.body.submission.parentSubmissionId).toBeNull();
    const rev1Id = r1.body.submission.id;

    // Duplicate while SUBMITTED -> 409
    const dup = await request(app)
      .post(`/api/milestones/${sprint2MilestoneId}/submissions`)
      .set("Cookie", studentJingCookie)
      .send({
        title: "Duplicate Pending",
        description: "Blocked while awaiting review",
        artifactUrl: "https://github.com/JinggXd/course-project-sprintDUO",
      });
    expect(dup.status).toBe(409);
    expect(dup.body.error).toBe("SUBMISSION_PENDING_REVIEW");

    // Supervisor requests changes on Rev #1
    const fb1 = await request(app)
      .post(`/api/submissions/${rev1Id}/feedback`)
      .set("Cookie", advisor1Cookie)
      .send({
        comment: "Need stronger revision notes in Rev #2.",
        status: "CHANGES_REQUESTED",
      });
    expect(fb1.status).toBe(201);

    // Filter CHANGES_REQUESTED returns sprint2MilestoneId
    const crFilter = await request(app)
      .get(`/api/teams/${alphaTeamId}/milestones?status=CHANGES_REQUESTED`)
      .set("Cookie", studentJingCookie);
    expect(crFilter.status).toBe(200);
    expect(crFilter.body.milestones.map((m: any) => m.id)).toContain(sprint2MilestoneId);

    // Rev #2 resubmission linked to Rev #1
    const r2 = await request(app)
      .post(`/api/milestones/${sprint2MilestoneId}/submissions`)
      .set("Cookie", studentJingCookie)
      .send({
        title: "PG Revision 2",
        description: "Updated deliverable addressing supervisor comments",
        artifactUrl: "https://github.com/JinggXd/course-project-sprintDUO/releases/tag/v2",
      });
    expect(r2.status).toBe(201);
    expect(r2.body.submission.revisionNumber).toBe(2);
    expect(r2.body.submission.parentSubmissionId).toBe(rev1Id);
    const rev2Id = r2.body.submission.id;

    // Supervisor approves Rev #2
    const fb2 = await request(app)
      .post(`/api/submissions/${rev2Id}/feedback`)
      .set("Cookie", advisor1Cookie)
      .send({
        comment: "Approved Rev #2 on PostgreSQL!",
        status: "APPROVED",
      });
    expect(fb2.status).toBe(201);

    // Further resubmission blocked with 409 MILESTONE_ALREADY_APPROVED
    const r3 = await request(app)
      .post(`/api/milestones/${sprint2MilestoneId}/submissions`)
      .set("Cookie", studentJingCookie)
      .send({
        title: "PG Revision 3 Blocked",
        description: "Must fail after approval",
        artifactUrl: "https://github.com/JinggXd/course-project-sprintDUO",
      });
    expect(r3.status).toBe(409);
    expect(r3.body.error).toBe("MILESTONE_ALREADY_APPROVED");

    // Verify full revision history preserved in DB via GET /api/milestones/:id/submissions
    const hist = await request(app)
      .get(`/api/milestones/${sprint2MilestoneId}/submissions`)
      .set("Cookie", studentJingCookie);
    expect(hist.status).toBe(200);
    expect(hist.body.totalRevisions).toBe(2);
    expect(hist.body.submissions[0].id).toBe(rev2Id);
    expect(hist.body.submissions[0].revisionNumber).toBe(2);
    expect(hist.body.submissions[0].parentSubmissionId).toBe(rev1Id);
    expect(hist.body.submissions[0].feedbacks[0].comment).toBe("Approved Rev #2 on PostgreSQL!");
    expect(hist.body.submissions[1].id).toBe(rev1Id);
    expect(hist.body.submissions[1].revisionNumber).toBe(1);
    expect(hist.body.submissions[1].status).toBe("CHANGES_REQUESTED");
    expect(hist.body.submissions[1].feedbacks[0].comment).toBe("Need stronger revision notes in Rev #2.");
  });

  it("TEST-12 (PG 16): enforces 401/403 access control on PATCH milestone and GET revision history", async () => {
    expect((await request(app).patch(`/api/milestones/${sprint2MilestoneId}`).send({ isLocked: true })).status).toBe(401);
    expect((await request(app).get(`/api/milestones/${sprint2MilestoneId}/submissions`)).status).toBe(401);

    expect(
      (
        await request(app)
          .patch(`/api/milestones/${sprint2MilestoneId}`)
          .set("Cookie", studentJingCookie)
          .send({ isLocked: true })
      ).status,
    ).toBe(403);

    expect(
      (
        await request(app)
          .patch(`/api/milestones/${sprint2MilestoneId}`)
          .set("Cookie", advisor2Cookie)
          .send({ isLocked: true })
      ).status,
    ).toBe(403);

    expect(
      (
        await request(app)
          .get(`/api/milestones/${sprint2MilestoneId}/submissions`)
          .set("Cookie", studentBetaCookie)
      ).status,
    ).toBe(403);
  });
});
