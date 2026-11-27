import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { getPrisma } from "../src/prisma.js";
import { seedDatabase } from "../prisma/seed.js";

process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST ||
  "postgresql://sprintduo:sprintduo@localhost:5434/sprintduo_test?schema=public";

const prisma = getPrisma();

describe("Sprint 3 F-04a PostgreSQL 16 Integration Tests (TEST-13 & TEST-14)", () => {
  let advisor1Cookie: string;
  let advisor2Cookie: string;
  let studentJingCookie: string;
  let studentBetaCookie: string;
  let alphaTeamId: number;

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
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("TEST-13 (PG 16): reflects live persisted milestone transitions across Rev #1 -> CHANGES_REQUESTED -> Rev #2 -> APPROVED and locked milestones", async () => {
    // Seeded Team Alpha starts with 2 milestones (both NOT_STARTED)
    const initial = await request(app)
      .get(`/api/teams/${alphaTeamId}/progress`)
      .set("Cookie", studentJingCookie);
    expect(initial.status).toBe(200);
    expect(initial.body.summary.totalMilestones).toBe(2);
    expect(initial.body.summary.counts.NOT_STARTED).toBe(2);
    expect(initial.body.summary.completionPercent).toBe(0);

    // Find open seeded milestone, submit Rev #1 -> CHANGES_REQUESTED -> Rev #2 -> APPROVED
    const msList = await prisma.milestone.findMany({ where: { teamId: alphaTeamId } });
    const openMs = msList.find((m) => m.dueDate.getTime() > Date.now())!;
    const pastMs = msList.find((m) => m.dueDate.getTime() < Date.now())!;

    // Lock the past-due milestone
    await request(app)
      .patch(`/api/milestones/${pastMs.id}`)
      .set("Cookie", advisor1Cookie)
      .send({ isLocked: true });

    const r1 = await request(app)
      .post(`/api/milestones/${openMs.id}/submissions`)
      .set("Cookie", studentJingCookie)
      .send({
        title: "Progress Board Rev 1",
        description: "Initial revision for progress tracking",
        artifactUrl: "https://github.com/JinggXd/course-project-sprintDUO/pull/41",
      });
    expect(r1.status).toBe(201);

    await request(app)
      .post(`/api/submissions/${r1.body.submission.id}/feedback`)
      .set("Cookie", advisor1Cookie)
      .send({ comment: "Needs progress update", status: "CHANGES_REQUESTED" });

    const mid = await request(app)
      .get(`/api/teams/${alphaTeamId}/progress`)
      .set("Cookie", advisor1Cookie);
    expect(mid.status).toBe(200);
    expect(mid.body.summary.counts.CHANGES_REQUESTED).toBe(1);
    expect(mid.body.summary.lockedCount).toBe(1);
    expect(mid.body.summary.completionPercent).toBe(0);

    const r2 = await request(app)
      .post(`/api/milestones/${openMs.id}/submissions`)
      .set("Cookie", studentJingCookie)
      .send({
        title: "Progress Board Rev 2",
        description: "Revised submission ready for approval",
        artifactUrl: "https://github.com/JinggXd/course-project-sprintDUO/releases/tag/v2.0.0",
      });
    expect(r2.status).toBe(201);

    await request(app)
      .post(`/api/submissions/${r2.body.submission.id}/feedback`)
      .set("Cookie", advisor1Cookie)
      .send({ comment: "Approved Rev 2!", status: "APPROVED" });

    const finalRes = await request(app)
      .get(`/api/teams/${alphaTeamId}/progress`)
      .set("Cookie", studentJingCookie);
    expect(finalRes.status).toBe(200);
    expect(finalRes.body.summary.counts).toEqual({
      NOT_STARTED: 1,
      SUBMITTED: 0,
      CHANGES_REQUESTED: 0,
      APPROVED: 1,
    });
    expect(finalRes.body.summary.totalSubmissions).toBe(2);
    expect(finalRes.body.summary.completionPercent).toBe(50);
    expect(finalRes.body.columns.APPROVED[0]).toMatchObject({
      id: openMs.id,
      latestRevisionNumber: 2,
      latestStatus: "APPROVED",
    });
  });

  it("TEST-14 (PG 16): enforces 401 unauthenticated, 403 cross-team BR-01, and 404 overflow ID on GET /api/teams/:teamId/progress", async () => {
    expect((await request(app).get(`/api/teams/${alphaTeamId}/progress`)).status).toBe(401);
    expect(
      (
        await request(app)
          .get(`/api/teams/${alphaTeamId}/progress`)
          .set("Cookie", studentBetaCookie)
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .get(`/api/teams/${alphaTeamId}/progress`)
          .set("Cookie", advisor2Cookie)
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .get("/api/teams/2147483648/progress")
          .set("Cookie", studentJingCookie)
      ).status,
    ).toBe(404);
  });
});
