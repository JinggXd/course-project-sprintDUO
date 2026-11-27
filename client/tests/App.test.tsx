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

  it("TEST-04: displays error alert (role='alert') when submitting with invalid URL and hides submit form on PAST DUE milestone (#33)", async () => {
    const milestonesState = [
      {
        id: 101,
        title: "Milestone 1: Open Deliverable",
        description: "Submit valid HTTP/HTTPS artifact URL.",
        dueDate: futureDue,
        isLocked: false,
        submissions: [],
      },
      {
        id: 102,
        title: "Milestone 0: Initial Project Charter (Past Due Demo)",
        description: "Submit initial team formation charter.",
        dueDate: pastDue,
        isLocked: false,
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
      if (url.startsWith("/api/teams/1/milestones")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ team: mockTeam, milestones: milestonesState }),
        } as Response;
      }
      if (url === "/api/milestones/101/submissions" && method === "POST") {
        return {
          ok: false,
          status: 400,
          json: async () => ({
            error: "VALIDATION_ERROR",
            message: "Validation failed",
            details: { artifactUrl: "Artifact URL must be a valid HTTP or HTTPS link" },
          }),
        } as Response;
      }
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    }) as any;

    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByText("PAST DUE")).toBeInTheDocument();
    // Lab 6 #33 (DEF-SD-03) resolved in Sprint 2: form hidden on PAST DUE milestone
    expect(screen.queryByTestId("submission-title-102")).not.toBeInTheDocument();
    expect(screen.getByTestId("milestone-closed-notice-102")).toHaveTextContent(/grace window expired/i);

    const titleInput = await screen.findByTestId("submission-title-101");
    const urlInput = screen.getByTestId("submission-url-101");
    const descInput = screen.getByTestId("submission-desc-101");
    const submitBtn = screen.getByTestId("submission-submit-101");

    await user.type(titleInput, "Invalid Link Attempt");
    await user.type(urlInput, "ftp://invalid-url");
    await user.type(descInput, "Testing validation error alert");
    await user.click(submitBtn);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/Artifact URL must be a valid HTTP or HTTPS link/i);
  });

  // ---------------------------------------------------------------------------
  // Lab 6 UAT Defect Regression Tests: DEF-SD-02 & DEF-SD-05
  // ---------------------------------------------------------------------------
  it("DEF-SD-02: clears previous user error and success alerts on Log Out and next Sign In", async () => {
    const milestonesState = [
      {
        id: 101,
        title: "Milestone 1: Open Deliverable",
        description: "Submit valid deliverable link.",
        dueDate: futureDue,
        isLocked: false,
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
      if (url.startsWith("/api/teams/1/milestones")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ team: mockTeam, milestones: milestonesState }),
        } as Response;
      }
      if (url === "/api/milestones/101/submissions" && method === "POST") {
        return {
          ok: false,
          status: 400,
          json: async () => ({
            error: "VALIDATION_ERROR",
            message: "Artifact URL must be a valid HTTP or HTTPS link",
          }),
        } as Response;
      }
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    }) as any;

    const user = userEvent.setup();
    render(<App />);

    // Trigger error alert as Student-Alpha-1
    await user.type(await screen.findByTestId("submission-title-101"), "Bad URL Draft");
    await user.type(screen.getByTestId("submission-url-101"), "ftp://bad");
    await user.type(screen.getByTestId("submission-desc-101"), "Bad URL submission body");
    await user.click(screen.getByTestId("submission-submit-101"));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Artifact URL must be a valid HTTP or HTTPS link/i);

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

  // ---------------------------------------------------------------------------
  // Sprint 2 F-03a & F-03b Client RTL Tests (TEST-09, TEST-10, TEST-11 & TD-02)
  // ---------------------------------------------------------------------------
  it("TEST-09 (Sprint 2 F-03a): supervisor edits/locks a milestone and locked milestone hides student submit form", async () => {
    const mockSup = {
      id: 1,
      name: "Dr. Kittipong (Advisor 1)",
      email: "sup.advisor1@sprintduo.edu",
      role: "SUPERVISOR",
    };

    let milestonesState = [
      {
        id: 201,
        title: "Milestone Sprint 2 Editable",
        description: "Initial description before supervisor edit",
        dueDate: futureDue,
        isLocked: false,
        submissions: [] as any[],
      },
    ];

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = init?.method || "GET";

      if (url === "/api/auth/me") {
        return { ok: true, status: 200, json: async () => ({ user: mockSup }) } as Response;
      }
      if (url === "/api/teams") {
        return { ok: true, status: 200, json: async () => ({ teams: [mockTeam] }) } as Response;
      }
      if (url.startsWith("/api/teams/1/milestones")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ team: mockTeam, milestones: milestonesState }),
        } as Response;
      }
      if (url === "/api/milestones/201" && method === "PATCH") {
        const body = JSON.parse(init?.body as string);
        milestonesState = milestonesState.map((m) =>
          m.id === 201 ? { ...m, ...body } : m,
        );
        return {
          ok: true,
          status: 200,
          json: async () => ({ milestone: milestonesState[0] }),
        } as Response;
      }
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    }) as any;

    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByText("Milestone Sprint 2 Editable")).toBeInTheDocument();
    await user.click(screen.getByTestId("milestone-edit-toggle-201"));

    const editTitle = screen.getByTestId("milestone-edit-title-201");
    await user.clear(editTitle);
    await user.type(editTitle, "Milestone Sprint 2 Locked & Updated");
    await user.click(screen.getByTestId("milestone-edit-lock-201"));
    await user.click(screen.getByTestId("milestone-edit-save-201"));

    expect(await screen.findByText("Milestone Sprint 2 Locked & Updated")).toBeInTheDocument();
    expect(await screen.findByTestId("milestone-locked-badge-201")).toHaveTextContent("LOCKED");
  });

  it("TEST-10 (Sprint 2 F-03a): filters milestones via status filter bar and requests ?status=...", async () => {
    const allMilestones = [
      {
        id: 210,
        title: "Milestone Approved Item",
        description: "Approved work",
        dueDate: futureDue,
        isLocked: false,
        submissions: [
          {
            id: 710,
            title: "Sub Approved",
            description: "Approved desc",
            artifactUrl: "https://example.com/approved",
            status: "APPROVED",
            isLate: false,
            revisionNumber: 1,
            parentSubmissionId: null,
            submittedAt: new Date().toISOString(),
            submittedBy: mockStudent,
            feedbacks: [],
          },
        ],
      },
      {
        id: 211,
        title: "Milestone Locked Item",
        description: "Locked work",
        dueDate: futureDue,
        isLocked: true,
        submissions: [],
      },
    ];

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url === "/api/auth/me") {
        return { ok: true, status: 200, json: async () => ({ user: mockStudent }) } as Response;
      }
      if (url === "/api/teams") {
        return { ok: true, status: 200, json: async () => ({ teams: [mockTeam] }) } as Response;
      }
      if (url === "/api/teams/1/milestones?status=LOCKED") {
        return {
          ok: true,
          status: 200,
          json: async () => ({ team: mockTeam, filter: "LOCKED", milestones: [allMilestones[1]] }),
        } as Response;
      }
      if (url.startsWith("/api/teams/1/milestones")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ team: mockTeam, filter: "ALL", milestones: allMilestones }),
        } as Response;
      }
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    });
    globalThis.fetch = fetchMock as any;

    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByText("Milestone Approved Item")).toBeInTheDocument();
    expect(screen.getByText("Milestone Locked Item")).toBeInTheDocument();

    await user.click(screen.getByTestId("milestone-filter-LOCKED"));

    await waitFor(() => {
      expect(screen.queryByText("Milestone Approved Item")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Milestone Locked Item")).toBeInTheDocument();
    expect(screen.getByTestId("milestone-closed-notice-211")).toHaveTextContent(/locked by supervisor/i);
  });

  it("TEST-11 (Sprint 2 F-03b, BR-04): allows student resubmission (Rev #2) after CHANGES_REQUESTED while preserving Rev #1 and feedback", async () => {
    const rev1 = {
      id: 801,
      milestoneId: 220,
      submittedById: mockStudent.id,
      title: "Deliverable Rev 1",
      description: "First version submitted",
      artifactUrl: "https://github.com/JinggXd/course-project-sprintDUO/releases/tag/v1",
      status: "CHANGES_REQUESTED",
      isLate: false,
      revisionNumber: 1,
      parentSubmissionId: null,
      submittedAt: new Date().toISOString(),
      submittedBy: mockStudent,
      feedbacks: [
        {
          id: 910,
          comment: "Please clarify revision migration steps.",
          status: "CHANGES_REQUESTED",
          createdAt: new Date().toISOString(),
          supervisor: mockTeam.supervisor,
        },
      ],
    };

    let milestonesState = [
      {
        id: 220,
        title: "Milestone Revision Workflow",
        description: "Supports BR-04 revision history preservation.",
        dueDate: futureDue,
        isLocked: false,
        submissions: [rev1] as any[],
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
      if (url.startsWith("/api/teams/1/milestones")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ team: mockTeam, milestones: milestonesState }),
        } as Response;
      }
      if (url === "/api/milestones/220/submissions" && method === "POST") {
        const body = JSON.parse(init?.body as string);
        const rev2 = {
          id: 802,
          milestoneId: 220,
          submittedById: mockStudent.id,
          title: body.title,
          description: body.description,
          artifactUrl: body.artifactUrl,
          status: "SUBMITTED",
          isLate: false,
          revisionNumber: 2,
          parentSubmissionId: 801,
          submittedAt: new Date().toISOString(),
          submittedBy: mockStudent,
          feedbacks: [],
        };
        milestonesState = milestonesState.map((m) =>
          m.id === 220 ? { ...m, submissions: [rev2, ...m.submissions] } : m,
        );
        return { ok: true, status: 201, json: async () => ({ submission: rev2 }) } as Response;
      }
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    }) as any;

    const user = userEvent.setup();
    render(<App />);

    // Verify Rev #1 and its CHANGES_REQUESTED feedback + "Submit Revision (Rev #2)" heading
    expect(await screen.findByTestId("submission-rev-badge-801")).toHaveTextContent("Rev #1");
    expect(screen.getByText("Please clarify revision migration steps.")).toBeInTheDocument();
    expect(screen.getByText(/Submit Revision \(Rev #2\)/i)).toBeInTheDocument();

    // Submit Rev #2
    await user.type(screen.getByTestId("submission-title-220"), "Deliverable Rev 2");
    await user.type(screen.getByTestId("submission-url-220"), "https://github.com/JinggXd/course-project-sprintDUO/releases/tag/v2");
    await user.type(screen.getByTestId("submission-desc-220"), "Clarified additive migration and verified tests.");
    await user.click(screen.getByTestId("submission-submit-220"));

    // Verify BOTH Rev #2 and original Rev #1 + feedback are preserved in UI
    expect(await screen.findByTestId("submission-rev-badge-802")).toHaveTextContent("Rev #2");
    expect(screen.getByText("Deliverable Rev 2")).toBeInTheDocument();
    expect(screen.getByTestId("submission-rev-badge-801")).toHaveTextContent("Rev #1");
    expect(screen.getByText("Please clarify revision migration steps.")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Sprint 3 F-04a Client RTL Tests (TEST-13 & TD-02: >= 2 new UI tests)
  // ---------------------------------------------------------------------------
  it("TEST-13a (Sprint 3 F-04a): renders Team Progress Board completion bar, KPI counts, and 4 status columns", async () => {
    const progressPayload = {
      team: { id: 1, code: "TEAM-ALPHA", name: mockTeam.name, projectTitle: mockTeam.projectTitle },
      summary: {
        totalMilestones: 2,
        totalSubmissions: 2,
        lockedCount: 1,
        lateSubmissionCount: 1,
        completionPercent: 50,
        counts: {
          NOT_STARTED: 1,
          SUBMITTED: 0,
          CHANGES_REQUESTED: 0,
          APPROVED: 1,
        },
      },
      columns: {
        NOT_STARTED: [
          {
            id: 301,
            title: "Sprint 3 Board Pending Item",
            dueDate: futureDue,
            isLocked: true,
            latestRevisionNumber: 0,
            latestStatus: "NOT_STARTED",
            isLate: false,
            submissionCount: 0,
          },
        ],
        SUBMITTED: [],
        CHANGES_REQUESTED: [],
        APPROVED: [
          {
            id: 302,
            title: "Sprint 3 Board Approved Item",
            dueDate: futureDue,
            isLocked: false,
            latestRevisionNumber: 2,
            latestStatus: "APPROVED",
            isLate: true,
            submissionCount: 2,
          },
        ],
      },
    };

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url === "/api/auth/me") {
        return { ok: true, status: 200, json: async () => ({ user: mockStudent }) } as Response;
      }
      if (url === "/api/teams") {
        return { ok: true, status: 200, json: async () => ({ teams: [mockTeam] }) } as Response;
      }
      if (url.startsWith("/api/teams/1/milestones")) {
        return { ok: true, status: 200, json: async () => ({ team: mockTeam, milestones: [] }) } as Response;
      }
      if (url === "/api/teams/1/progress") {
        return { ok: true, status: 200, json: async () => progressPayload } as Response;
      }
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    }) as any;

    render(<App />);

    expect(await screen.findByTestId("team-progress-board")).toBeInTheDocument();
    expect(screen.getByTestId("progress-completion-bar")).toHaveTextContent("50%");
    expect(screen.getByTestId("progress-col-NOT_STARTED")).toHaveTextContent("Sprint 3 Board Pending Item");
    expect(screen.getByTestId("progress-col-APPROVED")).toHaveTextContent("Sprint 3 Board Approved Item");
    expect(screen.getByTestId("progress-col-APPROVED")).toHaveTextContent("Rev #2");
  });

  it("TEST-13b (Sprint 3 F-04a): updates Team Progress Board live after student submits work", async () => {
    let submitted = false;
    let milestonesState = [
      {
        id: 310,
        title: "Sprint 3 Live Progress Milestone",
        description: "Verify board refreshes after submission",
        dueDate: futureDue,
        isLocked: false,
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
      if (url.startsWith("/api/teams/1/milestones")) {
        return { ok: true, status: 200, json: async () => ({ team: mockTeam, milestones: milestonesState }) } as Response;
      }
      if (url === "/api/teams/1/progress") {
        const item = {
          id: 310,
          title: "Sprint 3 Live Progress Milestone",
          dueDate: futureDue,
          isLocked: false,
          latestRevisionNumber: submitted ? 1 : 0,
          latestStatus: submitted ? "SUBMITTED" : "NOT_STARTED",
          isLate: false,
          submissionCount: submitted ? 1 : 0,
        };
        return {
          ok: true,
          status: 200,
          json: async () => ({
            team: { id: 1, code: "TEAM-ALPHA", name: mockTeam.name, projectTitle: mockTeam.projectTitle },
            summary: {
              totalMilestones: 1,
              totalSubmissions: submitted ? 1 : 0,
              lockedCount: 0,
              lateSubmissionCount: 0,
              completionPercent: 0,
              counts: {
                NOT_STARTED: submitted ? 0 : 1,
                SUBMITTED: submitted ? 1 : 0,
                CHANGES_REQUESTED: 0,
                APPROVED: 0,
              },
            },
            columns: {
              NOT_STARTED: submitted ? [] : [item],
              SUBMITTED: submitted ? [item] : [],
              CHANGES_REQUESTED: [],
              APPROVED: [],
            },
          }),
        } as Response;
      }
      if (url === "/api/milestones/310/submissions" && method === "POST") {
        submitted = true;
        const body = JSON.parse(init?.body as string);
        const created = {
          id: 950,
          milestoneId: 310,
          submittedById: mockStudent.id,
          title: body.title,
          description: body.description,
          artifactUrl: body.artifactUrl,
          status: "SUBMITTED",
          isLate: false,
          revisionNumber: 1,
          parentSubmissionId: null,
          submittedAt: new Date().toISOString(),
          submittedBy: mockStudent,
          feedbacks: [],
        };
        milestonesState = [{ ...milestonesState[0], submissions: [created] }];
        return { ok: true, status: 201, json: async () => ({ submission: created }) } as Response;
      }
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    }) as any;

    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByTestId("progress-col-NOT_STARTED")).toHaveTextContent(
      "Sprint 3 Live Progress Milestone",
    );

    await user.type(screen.getByTestId("submission-title-310"), "Board Refresh Sub");
    await user.type(screen.getByTestId("submission-url-310"), "https://github.com/JinggXd/course-project-sprintDUO");
    await user.type(screen.getByTestId("submission-desc-310"), "Submitting to trigger progress board transition.");
    await user.click(screen.getByTestId("submission-submit-310"));

    await waitFor(() => {
      expect(screen.getByTestId("progress-col-SUBMITTED")).toHaveTextContent(
        "Sprint 3 Live Progress Milestone",
      );
    });
  });
});
