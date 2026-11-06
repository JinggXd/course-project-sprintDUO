import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { getPrisma } from "../src/prisma.js";
import { hashPassword, verifyPassword } from "../src/utils/password.js";
import { seedDatabase } from "../prisma/seed.js";

// Ensure tests use the test database
process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST ||
  "postgresql://sprintduo:sprintduo@localhost:5434/sprintduo_test?schema=public";

const prisma = getPrisma();

describe("F-01 Auth and Supervisor Workflow (TEST-01, TEST-02, TEST-05, TEST-06)", () => {
  let advisor1Cookie: string;
  let advisor2Cookie: string;
  let studentCookie: string;
  let alphaTeamId: number;
  let betaTeamId: number;
  let testSubmissionId: number;

  beforeAll(async () => {
    // Clean up test database & run seed
    await prisma.feedback.deleteMany();
    await prisma.submission.deleteMany();
    await prisma.milestone.deleteMany();
    await prisma.teamMember.deleteMany();
    await prisma.team.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();

    await seedDatabase(prisma);

    const teamAlpha = await prisma.team.findUniqueOrThrow({ where: { code: "TEAM-ALPHA" } });
    const teamBeta = await prisma.team.findUniqueOrThrow({ where: { code: "TEAM-BETA" } });
    alphaTeamId = teamAlpha.id;
    betaTeamId = teamBeta.id;

    // Create a dummy submission on Team Alpha's existing milestone for feedback testing
    const alphaMilestone = await prisma.milestone.findFirstOrThrow({ where: { teamId: alphaTeamId } });
    const studentJing = await prisma.user.findUniqueOrThrow({ where: { email: "stu.jing@sprintduo.edu" } });

    const submission = await prisma.submission.create({
      data: {
        milestoneId: alphaMilestone.id,
        submittedById: studentJing.id,
        title: "Initial Sprint 1 Draft",
        description: "Draft architectural documents and diagrams",
        artifactUrl: "https://github.com/JinggXd/course-project-sprintDUO",
        status: "SUBMITTED",
      },
    });
    testSubmissionId = submission.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ---------------------------------------------------------------------------
  // TEST-01 (AC-01): Authentication Lifecycle & Argon2id verification
  // ---------------------------------------------------------------------------
  describe("TEST-01: Authentication Lifecycle (AC-01)", () => {
    it("verifies Argon2id password hashing and comparison", async () => {
      const plain = "Password123!";
      const hash = await hashPassword(plain);
      expect(hash).toContain("$argon2id$");
      expect(await verifyPassword(plain, hash)).toBe(true);
      expect(await verifyPassword("WrongPassword!", hash)).toBe(false);
    });

    it("rejects login with invalid credentials with HTTP 401", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "sup.advisor1@sprintduo.edu", password: "WrongPassword!" });

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });

    it("successfully logs in valid supervisor, sets HttpOnly session cookie, and allows /me and /logout", async () => {
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: "sup.advisor1@sprintduo.edu", password: "Password123!" });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.user).toMatchObject({
        email: "sup.advisor1@sprintduo.edu",
        role: "SUPERVISOR",
      });

      const cookies = loginRes.headers["set-cookie"];
      expect(cookies).toBeDefined();
      const cookieHeader = Array.isArray(cookies) ? cookies.join("; ") : cookies;
      expect(cookieHeader).toContain("sprintduo_session");
      advisor1Cookie = cookieHeader;

      // GET /api/auth/me
      const meRes = await request(app)
        .get("/api/auth/me")
        .set("Cookie", advisor1Cookie);

      expect(meRes.status).toBe(200);
      expect(meRes.body.user.email).toBe("sup.advisor1@sprintduo.edu");
      expect(meRes.body.user.role).toBe("SUPERVISOR");

      // Log in advisor2 & student for subsequent tests
      const adv2Login = await request(app)
        .post("/api/auth/login")
        .send({ email: "sup.advisor2@sprintduo.edu", password: "Password123!" });
      advisor2Cookie = Array.isArray(adv2Login.headers["set-cookie"])
        ? adv2Login.headers["set-cookie"].join("; ")
        : adv2Login.headers["set-cookie"];

      const stuLogin = await request(app)
        .post("/api/auth/login")
        .send({ email: "stu.jing@sprintduo.edu", password: "Password123!" });
      studentCookie = Array.isArray(stuLogin.headers["set-cookie"])
        ? stuLogin.headers["set-cookie"].join("; ")
        : stuLogin.headers["set-cookie"];

      // Test logout revocation
      const tempLogin = await request(app)
        .post("/api/auth/login")
        .send({ email: "stu.other@sprintduo.edu", password: "Password123!" });
      const tempCookie = Array.isArray(tempLogin.headers["set-cookie"])
        ? tempLogin.headers["set-cookie"].join("; ")
        : tempLogin.headers["set-cookie"];

      const logoutRes = await request(app)
        .post("/api/auth/logout")
        .set("Cookie", tempCookie);
      expect(logoutRes.status).toBe(204);

      const postLogoutMe = await request(app)
        .get("/api/auth/me")
        .set("Cookie", tempCookie);
      expect(postLogoutMe.status).toBe(401);
    });
  });

  // ---------------------------------------------------------------------------
  // TEST-02 (AC-02): Supervisor Milestone Creation & Feedback Recording
  // ---------------------------------------------------------------------------
  describe("TEST-02: Supervisor Milestone Creation & Feedback (AC-02)", () => {
    it("allows assigned supervisor to create a milestone with HTTP 201", async () => {
      const futureDueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const res = await request(app)
        .post(`/api/teams/${alphaTeamId}/milestones`)
        .set("Cookie", advisor1Cookie)
        .send({
          title: "Sprint 2 Architecture Review",
          description: "Detailed system architecture and container design",
          dueDate: futureDueDate,
        });

      expect(res.status).toBe(201);
      expect(res.body.milestone).toBeDefined();
      expect(res.body.milestone.title).toBe("Sprint 2 Architecture Review");
      expect(res.body.milestone.teamId).toBe(alphaTeamId);
    });

    it("allows assigned supervisor to record feedback and update submission status with HTTP 201", async () => {
      const res = await request(app)
        .post(`/api/submissions/${testSubmissionId}/feedback`)
        .set("Cookie", advisor1Cookie)
        .send({
          comment: "Architecture baseline approved with strong traceability",
          status: "APPROVED",
        });

      expect(res.status).toBe(201);
      expect(res.body.feedback).toBeDefined();
      expect(res.body.feedback.comment).toBe("Architecture baseline approved with strong traceability");
      expect(res.body.feedback.status).toBe("APPROVED");
      expect(res.body.submission.status).toBe("APPROVED");

      // Verify in DB that status was atomically updated
      const updatedSubmission = await prisma.submission.findUniqueOrThrow({
        where: { id: testSubmissionId },
      });
      expect(updatedSubmission.status).toBe("APPROVED");
    });
  });

  // ---------------------------------------------------------------------------
  // TEST-05 (AC-05): Unauthenticated Access Protection
  // ---------------------------------------------------------------------------
  describe("TEST-05: Unauthenticated Access Protection (AC-05)", () => {
    it("rejects unauthenticated requests to protected endpoints with HTTP 401", async () => {
      const endpoints = [
        { method: "get", url: "/api/teams" },
        { method: "get", url: `/api/teams/${alphaTeamId}/milestones` },
        { method: "post", url: `/api/teams/${alphaTeamId}/milestones`, body: { title: "x" } },
        { method: "post", url: `/api/submissions/${testSubmissionId}/feedback`, body: { comment: "x" } },
      ];

      for (const ep of endpoints) {
        const req = (request(app) as any)[ep.method](ep.url);
        if (ep.body) req.send(ep.body);
        const res = await req;
        expect(res.status).toBe(401);
        expect(res.body.error).toBeDefined();
      }
    });
  });

  // ---------------------------------------------------------------------------
  // TEST-06 (AC-06): Role & Cross-Team Access Restrictions
  // ---------------------------------------------------------------------------
  describe("TEST-06: Role & Cross-Team Restrictions for Supervisor Actions (AC-06)", () => {
    it("rejects student attempting to create a milestone with HTTP 403", async () => {
      const res = await request(app)
        .post(`/api/teams/${alphaTeamId}/milestones`)
        .set("Cookie", studentCookie)
        .send({
          title: "Illegal Student Milestone",
          description: "Student should not be able to create this",
          dueDate: new Date().toISOString(),
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
    });

    it("rejects student attempting to record supervisor feedback with HTTP 403", async () => {
      const res = await request(app)
        .post(`/api/submissions/${testSubmissionId}/feedback`)
        .set("Cookie", studentCookie)
        .send({
          comment: "Student attempting to self-approve",
          status: "APPROVED",
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
    });

    it("rejects supervisor attempting to create milestone on an unassigned team with HTTP 403", async () => {
      // advisor2 supervises Beta, attempting to create on Alpha
      const res = await request(app)
        .post(`/api/teams/${alphaTeamId}/milestones`)
        .set("Cookie", advisor2Cookie)
        .send({
          title: "Cross-team Milestone Attempt",
          description: "Advisor 2 does not supervise Team Alpha",
          dueDate: new Date().toISOString(),
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
    });

    it("rejects supervisor attempting to record feedback on an unassigned team's submission with HTTP 403", async () => {
      // advisor2 attempting to review Team Alpha's submission
      const res = await request(app)
        .post(`/api/submissions/${testSubmissionId}/feedback`)
        .set("Cookie", advisor2Cookie)
        .send({
          comment: "Unassigned supervisor attempting review",
          status: "CHANGES_REQUESTED",
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
    });
  });
});
