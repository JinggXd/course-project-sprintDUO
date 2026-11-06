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
});
