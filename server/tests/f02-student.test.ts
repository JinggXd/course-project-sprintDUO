import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { getPrisma } from "../src/prisma.js";
import { seedDatabase } from "../prisma/seed.js";
import { isDeadlinePassed, validateSubmissionInput } from "../src/utils/validation.js";

// Ensure tests use the isolated test database
process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST ||
  "postgresql://sprintduo:sprintduo@localhost:5434/sprintduo_test?schema=public";

const prisma = getPrisma();

describe("F-02 Student Team View, Submission & Deadline Rule (TEST-03, TEST-04, TEST-05, TEST-06)", () => {
  let advisor1Cookie: string;
  let studentJingCookie: string;
  let studentBetaCookie: string;
  let alphaTeamId: number;
  let openMilestoneId: number;
  let pastDueMilestoneId: number;
  let createdSubmissionId: number;

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

    const milestones = await prisma.milestone.findMany({
      where: { teamId: alphaTeamId },
      orderBy: { dueDate: "desc" },
    });

    const futureMilestone = milestones.find((m) => m.dueDate.getTime() > Date.now());
    const pastMilestone = milestones.find((m) => m.dueDate.getTime() < Date.now());
    if (!futureMilestone || !pastMilestone) {
      throw new Error("Expected seeded open and past-due milestones for Team Alpha");
    }
    openMilestoneId = futureMilestone.id;
    pastDueMilestoneId = pastMilestone.id;

    // Login Supervisor Advisor 1
    const advLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "sup.advisor1@sprintduo.edu", password: "Password123!" });
    advisor1Cookie = Array.isArray(advLogin.headers["set-cookie"])
      ? advLogin.headers["set-cookie"].join("; ")
      : advLogin.headers["set-cookie"];

    // Login Student Jing (Team Alpha)
    const jingLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "stu.jing@sprintduo.edu", password: "Password123!" });
    studentJingCookie = Array.isArray(jingLogin.headers["set-cookie"])
      ? jingLogin.headers["set-cookie"].join("; ")
      : jingLogin.headers["set-cookie"];

    // Login Student Other (Team Beta)
    const betaLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "stu.other@sprintduo.edu", password: "Password123!" });
    studentBetaCookie = Array.isArray(betaLogin.headers["set-cookie"])
      ? betaLogin.headers["set-cookie"].join("; ")
      : betaLogin.headers["set-cookie"];
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ---------------------------------------------------------------------------
  // TEST-03 (AC-03): Student Submission & Persisted Retrieval
  // ---------------------------------------------------------------------------
  describe("TEST-03: Student Submission & Persisted Retrieval (AC-03)", () => {
    it("allows Team Alpha student to view only their own team and milestones", async () => {
      const teamsRes = await request(app)
        .get("/api/teams")
        .set("Cookie", studentJingCookie);

      expect(teamsRes.status).toBe(200);
      expect(teamsRes.body.teams).toHaveLength(1);
      expect(teamsRes.body.teams[0].code).toBe("TEAM-ALPHA");

      const msRes = await request(app)
        .get(`/api/teams/${alphaTeamId}/milestones`)
        .set("Cookie", studentJingCookie);

      expect(msRes.status).toBe(200);
      expect(msRes.body.team.code).toBe("TEAM-ALPHA");
      expect(msRes.body.milestones.length).toBeGreaterThanOrEqual(2);
    });

    it("allows Team Alpha student to submit work before dueDate (201) and retrieve persisted submission & feedback (200)", async () => {
      const submitRes = await request(app)
        .post(`/api/milestones/${openMilestoneId}/submissions`)
        .set("Cookie", studentJingCookie)
        .send({
          title: "Sprint 1 Deliverable Package",
          description: "Complete SRS, SDS, contracts, and working vertical slice",
          artifactUrl: "https://github.com/JinggXd/course-project-sprintDUO/pull/3",
        });

      expect(submitRes.status).toBe(201);
      expect(submitRes.body.submission).toBeDefined();
      expect(submitRes.body.submission.milestoneId).toBe(openMilestoneId);
      expect(submitRes.body.submission.title).toBe("Sprint 1 Deliverable Package");
      expect(submitRes.body.submission.status).toBe("SUBMITTED");
      createdSubmissionId = submitRes.body.submission.id;

      // Supervisor records feedback on this submission
      const fbRes = await request(app)
        .post(`/api/submissions/${createdSubmissionId}/feedback`)
        .set("Cookie", advisor1Cookie)
        .send({
          comment: "Great submission, all requirements met.",
          status: "APPROVED",
        });
      expect(fbRes.status).toBe(201);

      // Student retrieves persisted submission details via GET /api/submissions/:id
      const getSubRes = await request(app)
        .get(`/api/submissions/${createdSubmissionId}`)
        .set("Cookie", studentJingCookie);

      expect(getSubRes.status).toBe(200);
      expect(getSubRes.body.submission).toBeDefined();
      expect(getSubRes.body.submission.id).toBe(createdSubmissionId);
      expect(getSubRes.body.submission.title).toBe("Sprint 1 Deliverable Package");
      expect(getSubRes.body.submission.status).toBe("APPROVED");
      expect(getSubRes.body.submission.submittedBy.email).toBe("stu.jing@sprintduo.edu");
      expect(getSubRes.body.submission.milestone.id).toBe(openMilestoneId);
      expect(getSubRes.body.submission.feedbacks).toHaveLength(1);
      expect(getSubRes.body.submission.feedbacks[0].comment).toBe(
        "Great submission, all requirements met.",
      );
    });
  });

  // ---------------------------------------------------------------------------
  // TEST-04 (AC-04): Deadline & Validation Rejection (BR-03)
  // ---------------------------------------------------------------------------
  describe("TEST-04: Deadline & URL Validation Rejection (AC-04 / BR-03)", () => {
    it("unit-tests isDeadlinePassed and validateSubmissionInput helpers", () => {
      const now = new Date("2026-11-06T12:00:00Z");
      expect(isDeadlinePassed("2026-11-05T12:00:00Z", now)).toBe(true);
      expect(isDeadlinePassed("2026-11-07T12:00:00Z", now)).toBe(false);

      const badUrl = validateSubmissionInput({
        title: "Valid Title",
        description: "Valid description text",
        artifactUrl: "ftp://invalid-link.com",
      });
      expect(badUrl.isValid).toBe(false);
      expect(badUrl.errors.artifactUrl).toBeDefined();

      const validInput = validateSubmissionInput({
        title: "Valid Title",
        description: "Valid description text",
        artifactUrl: "https://github.com/JinggXd/course-project-sprintDUO",
      });
      expect(validInput.isValid).toBe(true);
    });

    it("rejects submission to a past-due milestone with HTTP 400 DEADLINE_PASSED and stores nothing", async () => {
      const countBefore = await prisma.submission.count({
        where: { milestoneId: pastDueMilestoneId },
      });

      const res = await request(app)
        .post(`/api/milestones/${pastDueMilestoneId}/submissions`)
        .set("Cookie", studentJingCookie)
        .send({
          title: "Late Charter Submission",
          description: "Attempting to submit after the milestone deadline has passed",
          artifactUrl: "https://github.com/JinggXd/course-project-sprintDUO",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("DEADLINE_PASSED");
      expect(res.body.message).toBe("Milestone deadline has passed");

      const countAfter = await prisma.submission.count({
        where: { milestoneId: pastDueMilestoneId },
      });
      expect(countAfter).toBe(countBefore);
    });

    it("rejects submission with an invalid artifactUrl with HTTP 400 VALIDATION_ERROR", async () => {
      const res = await request(app)
        .post(`/api/milestones/${openMilestoneId}/submissions`)
        .set("Cookie", studentJingCookie)
        .send({
          title: "Invalid URL Submission",
          description: "Artifact URL does not start with http:// or https://",
          artifactUrl: "not-a-valid-url",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("VALIDATION_ERROR");
      expect(res.body.details?.artifactUrl).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // TEST-05 & TEST-06 (AC-05 & AC-06): Unauthenticated (401) & Cross-Team / Role (403)
  // ---------------------------------------------------------------------------
  describe("TEST-05 & TEST-06: Student Endpoint Auth (401) and Cross-Team / Role Restrictions (403)", () => {
    it("rejects unauthenticated requests to submission endpoints with HTTP 401", async () => {
      const postRes = await request(app)
        .post(`/api/milestones/${openMilestoneId}/submissions`)
        .send({
          title: "Unauthenticated Attempt",
          description: "Should fail with 401",
          artifactUrl: "https://example.com",
        });
      expect(postRes.status).toBe(401);

      const getRes = await request(app).get(`/api/submissions/${createdSubmissionId}`);
      expect(getRes.status).toBe(401);
    });

    it("rejects Team Beta student attempting to view Team Alpha milestones, submit work, or view Team Alpha submission with HTTP 403", async () => {
      // Cross-team milestone listing
      const msRes = await request(app)
        .get(`/api/teams/${alphaTeamId}/milestones`)
        .set("Cookie", studentBetaCookie);
      expect(msRes.status).toBe(403);

      // Cross-team submission attempt
      const subRes = await request(app)
        .post(`/api/milestones/${openMilestoneId}/submissions`)
        .set("Cookie", studentBetaCookie)
        .send({
          title: "Cross-Team Intrusion Attempt",
          description: "Team Beta student trying to submit to Team Alpha milestone",
          artifactUrl: "https://example.com/intrusion",
        });
      expect(subRes.status).toBe(403);

      // Cross-team submission retrieval attempt
      const viewSubRes = await request(app)
        .get(`/api/submissions/${createdSubmissionId}`)
        .set("Cookie", studentBetaCookie);
      expect(viewSubRes.status).toBe(403);
    });

    it("rejects supervisor attempting to submit student milestone work with HTTP 403 (BR-02)", async () => {
      const res = await request(app)
        .post(`/api/milestones/${openMilestoneId}/submissions`)
        .set("Cookie", advisor1Cookie)
        .send({
          title: "Supervisor Submission Attempt",
          description: "Supervisors are not allowed to submit student milestone deliverables",
          artifactUrl: "https://example.com/supervisor",
        });
      expect(res.status).toBe(403);
    });
  });
});
