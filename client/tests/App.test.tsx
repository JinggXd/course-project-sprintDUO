import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../src/App";

describe("SprintDUO Client UI — TEST-03 & TEST-04 Student Submission & Persisted View", () => {
  const futureDue = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const pastDue = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

  const mockStudent = {
    id: 3,
    name: "Phongsatorn (67070501084)",
    email: "stu.jing@sprintduo.edu",
    role: "STUDENT",
  };

  const mockTeam = {
    id: 1,
    code: "TEAM-ALPHA",
    name: "Team Alpha (SprintDUO)",
    projectTitle: "Course Project Milestone & Supervision Tracker",
    supervisor: {
      id: 1,
      name: "Dr. Kittipong (Advisor 1)",
      email: "sup.advisor1@sprintduo.edu",
    },
    members: [
      { id: 3, name: "Phongsatorn (67070501084)", email: "stu.jing@sprintduo.edu" },
      { id: 4, name: "Yuminnini (67070501036)", email: "stu.yumi@sprintduo.edu" },
    ],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("TEST-03: renders Student dashboard, submits milestone work, and displays persisted submission & feedback", async () => {
    let milestonesState = [
      {
        id: 101,
        title: "Milestone 1: SRS & System-Level SDS Baseline",
        description: "Submit complete SRS, Feature Traceability, System-Level SDS, and Sprint 1 contracts.",
        dueDate: futureDue,
        submissions: [] as any[],
      },
      {
        id: 102,
        title: "Milestone 0: Initial Project Charter (Past Due Demo)",
        description: "Submit initial team formation charter.",
        dueDate: pastDue,
        submissions: [] as any[],
      },
    ];

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = init?.method || "GET";

      if (url === "/api/auth/me" && method === "GET") {
        return {
          ok: true,
          status: 200,
          json: async () => ({ user: mockStudent }),
        } as Response;
      }

      if (url === "/api/teams" && method === "GET") {
        return {
          ok: true,
          status: 200,
          json: async () => ({ teams: [mockTeam] }),
        } as Response;
      }

      if (url === "/api/teams/1/milestones" && method === "GET") {
        return {
          ok: true,
          status: 200,
          json: async () => ({ team: mockTeam, milestones: milestonesState }),
        } as Response;
      }

      if (url === "/api/milestones/101/submissions" && method === "POST") {
        const body = JSON.parse(init?.body as string);
        const createdSub = {
          id: 501,
          milestoneId: 101,
          submittedById: mockStudent.id,
          title: body.title,
          description: body.description,
          artifactUrl: body.artifactUrl,
          status: "APPROVED",
          submittedAt: new Date().toISOString(),
          submittedBy: mockStudent,
          feedbacks: [
            {
              id: 901,
              comment: "Approved by supervisor with complete traceability.",
              status: "APPROVED",
              createdAt: new Date().toISOString(),
              supervisor: mockTeam.supervisor,
            },
          ],
        };
        milestonesState = milestonesState.map((m) =>
          m.id === 101 ? { ...m, submissions: [createdSub] } : m,
        );
        return {
          ok: true,
          status: 201,
          json: async () => ({ submission: createdSub }),
        } as Response;
      }

      return {
        ok: false,
        status: 404,
        json: async () => ({ error: "NOT_FOUND", message: "Not found" }),
      } as Response;
    }) as any;

    const user = userEvent.setup();
    render(<App />);

    // Verify team and milestones render
    expect(await screen.findByText("My Project Team")).toBeInTheDocument();
    expect(await screen.findByText("Milestone 1: SRS & System-Level SDS Baseline")).toBeInTheDocument();

    // Fill out Student "Submit Milestone Work" form for Milestone 101
    const titleInput = await screen.findByTestId("submission-title-101");
    const urlInput = screen.getByTestId("submission-url-101");
    const descInput = screen.getByTestId("submission-desc-101");
    const submitBtn = screen.getByTestId("submission-submit-101");

    await user.type(titleInput, "Sprint 1 Deliverable Package");
    await user.type(urlInput, "https://github.com/JinggXd/course-project-sprintDUO");
    await user.type(descInput, "Submitted SRS, SDS, and Sprint 1 contracts.");
    await user.click(submitBtn);

    // Verify persisted submission & supervisor feedback render in the UI
    await waitFor(() => {
      expect(screen.getByText("Sprint 1 Deliverable Package")).toBeInTheDocument();
    });
    expect(
      screen.getByText("Approved by supervisor with complete traceability."),
    ).toBeInTheDocument();
  });

  it("TEST-04: displays error alert (role='alert') when submitting to a past-due milestone or with invalid URL", async () => {
    const milestonesState = [
      {
        id: 102,
        title: "Milestone 0: Initial Project Charter (Past Due Demo)",
        description: "Submit initial team formation charter.",
        dueDate: pastDue,
        submissions: [],
      },
    ];

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = init?.method || "GET";

      if (url === "/api/auth/me") {
        return { ok: true, status: 200, json: async () => ({ user: mockStudent }) } as Response;
      }
      if (url === "/api/teams") {
        return { ok: true, status: 200, json: async () => ({ teams: [mockTeam] }) } as Response;
      }
      if (url === "/api/teams/1/milestones") {
        return {
          ok: true,
          status: 200,
          json: async () => ({ team: mockTeam, milestones: milestonesState }),
        } as Response;
      }
      if (url === "/api/milestones/102/submissions" && method === "POST") {
        return {
          ok: false,
          status: 400,
          json: async () => ({
            error: "DEADLINE_PASSED",
            message: "Milestone deadline has passed",
          }),
        } as Response;
      }
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    }) as any;

    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByText("PAST DUE")).toBeInTheDocument();

    const titleInput = await screen.findByTestId("submission-title-102");
    const urlInput = screen.getByTestId("submission-url-102");
    const descInput = screen.getByTestId("submission-desc-102");
    const submitBtn = screen.getByTestId("submission-submit-102");

    await user.type(titleInput, "Late Submission Attempt");
    await user.type(urlInput, "https://github.com/JinggXd/course-project-sprintDUO");
    await user.type(descInput, "Attempting late submission");
    await user.click(submitBtn);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/Milestone deadline has passed/i);
  });

  // ---------------------------------------------------------------------------
  // Lab 6 UAT Defect Regression Tests: DEF-SD-02 & DEF-SD-05
  // ---------------------------------------------------------------------------
  it("DEF-SD-02: clears previous user error and success alerts on Log Out and next Sign In", async () => {
    const milestonesState = [
      {
        id: 102,
        title: "Milestone 0: Initial Project Charter (Past Due Demo)",
        description: "Submit initial team formation charter.",
        dueDate: pastDue,
        submissions: [],
      },
    ];

    const mockSupervisorAlpha = {
      id: 1,
      name: "Dr. Kittipong (Advisor 1)",
      email: "sup.advisor1@sprintduo.edu",
      role: "SUPERVISOR",
    };

    let loggedInUser: any = mockStudent;

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = init?.method || "GET";

      if (url === "/api/auth/me") {
        if (!loggedInUser) return { ok: false, status: 401, json: async () => ({}) } as Response;
        return { ok: true, status: 200, json: async () => ({ user: loggedInUser }) } as Response;
      }
      if (url === "/api/auth/logout" && method === "POST") {
        loggedInUser = null;
        return { ok: true, status: 204, json: async () => ({}) } as Response;
      }
      if (url === "/api/auth/login" && method === "POST") {
        loggedInUser = mockSupervisorAlpha;
        return { ok: true, status: 200, json: async () => ({ user: mockSupervisorAlpha }) } as Response;
      }
      if (url === "/api/teams") {
        return { ok: true, status: 200, json: async () => ({ teams: [mockTeam] }) } as Response;
      }
      if (url === "/api/teams/1/milestones") {
        return {
          ok: true,
          status: 200,
          json: async () => ({ team: mockTeam, milestones: milestonesState }),
        } as Response;
      }
      if (url === "/api/milestones/102/submissions" && method === "POST") {
        return {
          ok: false,
          status: 400,
          json: async () => ({
            error: "DEADLINE_PASSED",
            message: "Milestone deadline has passed",
          }),
        } as Response;
      }
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    }) as any;

    const user = userEvent.setup();
    render(<App />);

    // Trigger error alert as Student-Alpha-1
    await user.type(await screen.findByTestId("submission-title-102"), "Late Draft");
    await user.type(screen.getByTestId("submission-url-102"), "https://example.com/late");
    await user.type(screen.getByTestId("submission-desc-102"), "Late submission body");
    await user.click(screen.getByTestId("submission-submit-102"));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Milestone deadline has passed/i);

    // Log Out -> Sign In screen MUST NOT retain previous user's error alert
    await user.click(screen.getByTestId("logout-btn"));
    expect(await screen.findByText("SprintDUO Sign In")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("DEF-SD-05: clears unsent Create Milestone and Submit Work drafts across Log Out and cross-team Sign In", async () => {
    const mockSupAlpha = {
      id: 1,
      name: "Dr. Kittipong (Advisor 1)",
      email: "sup.advisor1@sprintduo.edu",
      role: "SUPERVISOR",
    };
    const mockSupBeta = {
      id: 2,
      name: "Dr. Nattaya (Advisor 2)",
      email: "sup.advisor2@sprintduo.edu",
      role: "SUPERVISOR",
    };
    const mockTeamBeta = {
      id: 2,
      code: "TEAM-BETA",
      name: "Team Beta",
      projectTitle: "Smart Campus IoT Monitoring",
      supervisor: { id: 2, name: mockSupBeta.name, email: mockSupBeta.email },
      members: [{ id: 5, name: "Somchai", email: "stu.other@sprintduo.edu" }],
    };

    let currentSessionUser: any = mockSupAlpha;

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = init?.method || "GET";

      if (url === "/api/auth/me") {
        if (!currentSessionUser) return { ok: false, status: 401, json: async () => ({}) } as Response;
        return { ok: true, status: 200, json: async () => ({ user: currentSessionUser }) } as Response;
      }
      if (url === "/api/auth/logout" && method === "POST") {
        currentSessionUser = null;
        return { ok: true, status: 204, json: async () => ({}) } as Response;
      }
      if (url === "/api/auth/login" && method === "POST") {
        currentSessionUser = mockSupBeta;
        return { ok: true, status: 200, json: async () => ({ user: mockSupBeta }) } as Response;
      }
      if (url === "/api/teams") {
        const list = currentSessionUser?.id === 1 ? [mockTeam] : [mockTeamBeta];
        return { ok: true, status: 200, json: async () => ({ teams: list }) } as Response;
      }
      if (url === "/api/teams/1/milestones") {
        return { ok: true, status: 200, json: async () => ({ team: mockTeam, milestones: [] }) } as Response;
      }
      if (url === "/api/teams/2/milestones") {
        return { ok: true, status: 200, json: async () => ({ team: mockTeamBeta, milestones: [] }) } as Response;
      }
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    }) as any;

    const user = userEvent.setup();
    render(<App />);

    // 1. Supervisor-Alpha types unsent Team Alpha draft
    const msTitle = await screen.findByPlaceholderText("Milestone Title");
    const msDesc = screen.getByPlaceholderText("Detailed milestone requirements and description...");
    await user.type(msTitle, "DRAFT from sup1 — Team Alpha private");
    await user.type(msDesc, "Unsent Team Alpha requirements draft");
    expect(msTitle).toHaveValue("DRAFT from sup1 — Team Alpha private");

    // 2. Log Out and sign in as Supervisor-Beta in the same tab
    await user.click(screen.getByTestId("logout-btn"));
    await user.type(await screen.findByLabelText("Email Address"), "sup.advisor2@sprintduo.edu");
    await user.type(screen.getByLabelText("Password"), "synthetic-test-pass");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    // 3. Supervisor-Beta's Create Milestone form MUST start completely empty
    expect(await screen.findByText("+ Create Milestone for Team Beta")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Milestone Title")).toHaveValue("");
    expect(screen.getByPlaceholderText("Detailed milestone requirements and description...")).toHaveValue("");
  });

  // ---------------------------------------------------------------------------
  // Lab 7 BR-03 v1.1.0 — 24-Hour Late Grace Period & LATE Badge (TEST-07 UI)
  // ---------------------------------------------------------------------------
  it("TEST-07 (Lab 7 BR-03 v1.1.0): displays GRACE PERIOD (24H) milestone badge and LATE badge on late submission", async () => {
    const graceDue = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    let milestonesState = [
      {
        id: 103,
        title: "Milestone Grace Window (12h Past Due)",
        description: "Submit within 24-hour late grace window.",
        dueDate: graceDue,
        submissions: [] as any[],
      },
    ];

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = init?.method || "GET";

      if (url === "/api/auth/me") {
        return { ok: true, status: 200, json: async () => ({ user: mockStudent }) } as Response;
      }
      if (url === "/api/teams") {
        return { ok: true, status: 200, json: async () => ({ teams: [mockTeam] }) } as Response;
      }
      if (url === "/api/teams/1/milestones") {
        return {
          ok: true,
          status: 200,
          json: async () => ({ team: mockTeam, milestones: milestonesState }),
        } as Response;
      }
      if (url === "/api/milestones/103/submissions" && method === "POST") {
        const body = JSON.parse(init?.body as string);
        const createdSub = {
          id: 601,
          milestoneId: 103,
          submittedById: mockStudent.id,
          title: body.title,
          description: body.description,
          artifactUrl: body.artifactUrl,
          status: "SUBMITTED",
          isLate: true,
          submittedAt: new Date().toISOString(),
          submittedBy: mockStudent,
          feedbacks: [],
        };
        milestonesState = milestonesState.map((m) =>
          m.id === 103 ? { ...m, submissions: [createdSub] } : m,
        );
        return {
          ok: true,
          status: 201,
          json: async () => ({ submission: createdSub }),
        } as Response;
      }
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    }) as any;

    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByText("GRACE PERIOD (24H)")).toBeInTheDocument();

    await user.type(await screen.findByTestId("submission-title-103"), "Late Grace Submission");
    await user.type(screen.getByTestId("submission-url-103"), "https://github.com/JinggXd/course-project-sprintDUO");
    await user.type(screen.getByTestId("submission-desc-103"), "Submitted 12 hours into the 24-hour grace period.");
    await user.click(screen.getByTestId("submission-submit-103"));

    expect(await screen.findByText("Late Grace Submission")).toBeInTheDocument();
    expect(await screen.findByTestId("submission-late-badge-601")).toHaveTextContent("LATE");
  });
});
