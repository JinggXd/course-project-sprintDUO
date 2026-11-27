import React, { useState, useEffect } from "react";
import {
  LATE_GRACE_WINDOW_MS,
  type Milestone,
  type MilestoneStatusFilter,
  type Team,
  type TeamProgressResponse,
  type User,
} from "./types";
import { MilestoneEditForm } from "./components/MilestoneEditForm";
import { SubmissionHistoryList } from "./components/SubmissionHistoryList";
import { TeamProgressBoard } from "./components/TeamProgressBoard";

const APP_VERSION = import.meta.env.VITE_APP_VERSION || "v2.1.0-rc1";
const COMMIT_SHA = import.meta.env.VITE_COMMIT_SHA || "local";

const FILTER_OPTIONS: { value: MilestoneStatusFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "NOT_STARTED", label: "Not Started" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "CHANGES_REQUESTED", label: "Changes Requested" },
  { value: "APPROVED", label: "Approved" },
  { value: "LOCKED", label: "Locked" },
];

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Teams & Milestones
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [teamProgress, setTeamProgress] = useState<TeamProgressResponse | null>(null);
  const [statusFilter, setStatusFilter] = useState<MilestoneStatusFilter>("ALL");

  // Create Milestone form (Supervisor)
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDueDate, setNewDueDate] = useState("");

  // Inline Edit Milestone (Supervisor — Sprint 2 F-03a)
  const [editingMilestoneId, setEditingMilestoneId] = useState<number | null>(null);

  // Submit Milestone Work / Revision form (Student — F-02 & Sprint 2 F-03b)
  const [subTitle, setSubTitle] = useState<{ [msId: number]: string }>({});
  const [subDesc, setSubDesc] = useState<{ [msId: number]: string }>({});
  const [subUrl, setSubUrl] = useState<{ [msId: number]: string }>({});

  // Record Feedback form (Supervisor)
  const [feedbackComment, setFeedbackComment] = useState<{ [subId: number]: string }>({});
  const [feedbackStatus, setFeedbackStatus] = useState<{
    [subId: number]: "APPROVED" | "CHANGES_REQUESTED";
  }>({});

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        loadTeams();
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  }

  function resetTransientFormAndAlertState() {
    setError(null);
    setSuccess(null);
    setNewTitle("");
    setNewDesc("");
    setNewDueDate("");
    setEditingMilestoneId(null);
    setStatusFilter("ALL");
    setSubTitle({});
    setSubDesc({});
    setSubUrl({});
    setFeedbackComment({});
    setFeedbackStatus({});
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Invalid email or password");
        return;
      }
      resetTransientFormAndAlertState();
      setCurrentUser(data.user);
      setEmail("");
      setPassword("");
      loadTeams();
    } catch {
      setError("Network error during login");
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      resetTransientFormAndAlertState();
      setCurrentUser(null);
      setEmail("");
      setPassword("");
      setTeams([]);
      setSelectedTeam(null);
      setMilestones([]);
      setTeamProgress(null);
    }
  }

  async function loadTeams() {
    try {
      const res = await fetch("/api/teams");
      if (res.ok) {
        const data = await res.json();
        setTeams(data.teams);
        if (data.teams.length > 0) {
          selectTeam(data.teams[0], "ALL");
        }
      }
    } catch (err) {
      console.error("Failed to load teams", err);
    }
  }

  async function selectTeam(team: Team, filterOverride?: MilestoneStatusFilter) {
    const activeFilter = filterOverride ?? statusFilter;
    setSelectedTeam(team);
    setEditingMilestoneId(null);
    try {
      const query = activeFilter !== "ALL" ? `?status=${activeFilter}` : "";
      const [msRes, progRes] = await Promise.all([
        fetch(`/api/teams/${team.id}/milestones${query}`),
        fetch(`/api/teams/${team.id}/progress`),
      ]);
      if (msRes.ok) {
        const data = await msRes.json();
        setMilestones(data.milestones);
      }
      if (progRes.ok) {
        const progData = await progRes.json();
        setTeamProgress(progData);
      } else {
        setTeamProgress(null);
      }
    } catch (err) {
      console.error("Failed to load team milestones or progress", err);
    }
  }

  async function handleFilterChange(nextFilter: MilestoneStatusFilter) {
    setStatusFilter(nextFilter);
    if (selectedTeam) {
      await selectTeam(selectedTeam, nextFilter);
    }
  }

  async function handleCreateMilestone(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTeam) return;
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/teams/${selectedTeam.id}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          description: newDesc,
          dueDate: new Date(newDueDate).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to create milestone");
        return;
      }
      setSuccess("Milestone created successfully!");
      setNewTitle("");
      setNewDesc("");
      setNewDueDate("");
      selectTeam(selectedTeam);
    } catch {
      setError("Error creating milestone");
    }
  }

  async function handleUpdateMilestone(
    milestoneId: number,
    payload: { title: string; description: string; dueDate: string; isLocked: boolean },
  ): Promise<boolean> {
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/milestones/${milestoneId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        const detailMsg = data.details ? Object.values(data.details).join(" ") : "";
        setError(detailMsg || data.message || "Failed to update milestone");
        return false;
      }
      setSuccess("Milestone updated successfully!");
      if (selectedTeam) await selectTeam(selectedTeam);
      return true;
    } catch {
      setError("Error updating milestone");
      return false;
    }
  }

  async function handleSubmitMilestoneWork(e: React.FormEvent, milestoneId: number) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const title = subTitle[milestoneId] || "";
    const description = subDesc[milestoneId] || "";
    const artifactUrl = subUrl[milestoneId] || "";

    try {
      const res = await fetch(`/api/milestones/${milestoneId}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, artifactUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        const detailMsg = data.details ? Object.values(data.details).join(" ") : "";
        setError(detailMsg || data.message || "Failed to submit milestone work");
        return;
      }
      const rev = data.submission?.revisionNumber ?? 1;
      setSuccess(
        rev > 1
          ? `Revision #${rev} submitted successfully (prior history preserved)!`
          : "Milestone work submitted successfully!",
      );
      setSubTitle({ ...subTitle, [milestoneId]: "" });
      setSubDesc({ ...subDesc, [milestoneId]: "" });
      setSubUrl({ ...subUrl, [milestoneId]: "" });
      if (selectedTeam) selectTeam(selectedTeam);
    } catch {
      setError("Error submitting milestone work");
    }
  }

  async function handleRecordFeedback(submissionId: number) {
    const comment = feedbackComment[submissionId];
    const status = feedbackStatus[submissionId] || "APPROVED";
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/submissions/${submissionId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment, status }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to record feedback");
        return;
      }
      setSuccess("Feedback recorded and submission status updated!");
      setFeedbackComment({ ...feedbackComment, [submissionId]: "" });
      if (selectedTeam) selectTeam(selectedTeam);
    } catch {
      setError("Error recording feedback");
    }
  }

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Unauthenticated: Login Screen
  // ---------------------------------------------------------------------------
  if (!currentUser) {
    return (
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-12 col-md-6 col-lg-5">
            <div className="card shadow-sm border-0">
              <div className="card-body p-4">
                <h2 className="text-center fw-bold mb-3">SprintDUO Sign In</h2>
                <p
                  className="text-center text-muted small mb-3"
                  data-testid="build-version-banner"
                >
                  SprintDUO {APP_VERSION} &middot; commit {COMMIT_SHA}
                </p>
                {error && (
                  <div className="alert alert-danger" role="alert">
                    {error}
                  </div>
                )}
                <form onSubmit={handleLogin} data-testid="login-form">
                  <div className="mb-3">
                    <label className="form-label" htmlFor="email-input">
                      Email Address
                    </label>
                    <input
                      id="email-input"
                      type="email"
                      className="form-control"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. sup.advisor1@sprintduo.edu"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label" htmlFor="password-input">
                      Password
                    </label>
                    <input
                      id="password-input"
                      type="password"
                      className="form-control"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary w-100 py-2">
                    Sign In
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Authenticated: Dashboard
  // ---------------------------------------------------------------------------
  return (
    <div>
      {/* Navigation Bar */}
      <nav className="navbar navbar-expand navbar-dark bg-dark px-4 py-3">
        <div className="container-fluid">
          <span className="navbar-brand fw-bold">SprintDUO</span>
          <div className="d-flex align-items-center gap-3">
            <span className="text-light">{currentUser.name}</span>
            <span
              className={`badge ${
                currentUser.role === "SUPERVISOR" ? "bg-info text-dark" : "bg-primary"
              }`}
            >
              {currentUser.role}
            </span>
            <button
              onClick={handleLogout}
              className="btn btn-outline-light btn-sm"
              data-testid="logout-btn"
            >
              Log Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <div className="container py-4">
        <p className="text-muted small mb-3" data-testid="build-version-banner">
          SprintDUO {APP_VERSION} &middot; commit {COMMIT_SHA}
        </p>
        {error && (
          <div className="alert alert-danger alert-dismissible" role="alert">
            {error}
            <button
              type="button"
              className="btn-close"
              onClick={() => setError(null)}
            ></button>
          </div>
        )}
        {success && (
          <div className="alert alert-success alert-dismissible" role="status">
            {success}
            <button
              type="button"
              className="btn-close"
              onClick={() => setSuccess(null)}
            ></button>
          </div>
        )}

        {/* Team Selector & Header */}
        <div className="card shadow-sm mb-4 border-0">
          <div className="card-body">
            <h4 className="card-title fw-bold">
              {currentUser.role === "SUPERVISOR" ? "Supervised Teams" : "My Project Team"}
            </h4>
            <div className="d-flex gap-2 mb-3 flex-wrap">
              {teams.map((t) => (
                <button
                  key={t.id}
                  onClick={() => selectTeam(t)}
                  className={`btn btn-sm ${
                    selectedTeam?.id === t.id ? "btn-primary" : "btn-outline-secondary"
                  }`}
                >
                  {t.code} — {t.name}
                </button>
              ))}
            </div>

            {selectedTeam && (
              <div className="bg-light p-3 rounded">
                <h5 className="mb-1 text-primary">{selectedTeam.name}</h5>
                <p className="text-muted mb-2">Project: {selectedTeam.projectTitle}</p>
                <div className="small">
                  <strong>Supervisor:</strong> {selectedTeam.supervisor.name} (
                  {selectedTeam.supervisor.email})
                </div>
                <div className="small">
                  <strong>Members:</strong>{" "}
                  {selectedTeam.members.map((m) => m.name).join(", ")}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sprint 3 F-04a: Team Milestone Progress Board */}
        {selectedTeam && <TeamProgressBoard progress={teamProgress} />}

        {/* Supervisor Actions: Create Milestone */}
        {currentUser.role === "SUPERVISOR" && selectedTeam && (
          <div className="card shadow-sm mb-4 border-0">
            <div className="card-body">
              <h5 className="fw-bold mb-3">+ Create Milestone for {selectedTeam.name}</h5>
              <form onSubmit={handleCreateMilestone}>
                <div className="row g-3">
                  <div className="col-12 col-md-5">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Milestone Title"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-12 col-md-3">
                    <button type="submit" className="btn btn-success w-100">
                      Create Milestone
                    </button>
                  </div>
                  <div className="col-12">
                    <textarea
                      className="form-control"
                      rows={2}
                      placeholder="Detailed milestone requirements and description..."
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      required
                    ></textarea>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Milestones Header + Sprint 2 Status Filter Bar */}
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <h4 className="fw-bold mb-0">Milestones</h4>
          <div className="btn-group btn-group-sm flex-wrap" role="group" aria-label="Filter milestones by status">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                data-testid={`milestone-filter-${opt.value}`}
                onClick={() => handleFilterChange(opt.value)}
                className={`btn ${
                  statusFilter === opt.value ? "btn-primary" : "btn-outline-secondary"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {milestones.length === 0 ? (
          <div className="alert alert-secondary">
            {statusFilter === "ALL"
              ? "No milestones scheduled for this team yet."
              : `No milestones match filter "${statusFilter}".`}
          </div>
        ) : (
          <div className="row g-4">
            {milestones.map((ms) => {
              const nowMs = Date.now();
              const dueMs = new Date(ms.dueDate).getTime();
              const isPastCutoff = nowMs > dueMs + LATE_GRACE_WINDOW_MS;
              const isInGraceWindow = nowMs > dueMs && !isPastCutoff;
              const isLocked = Boolean(ms.isLocked);
              const dueBadgeClass = isPastCutoff
                ? "bg-danger"
                : isInGraceWindow
                ? "bg-warning text-dark"
                : "bg-success";
              const dueBadgeLabel = isPastCutoff
                ? "PAST DUE"
                : isInGraceWindow
                ? "GRACE PERIOD (24H)"
                : "OPEN";

              const latestSubmission = ms.submissions[0] ?? null;
              const nextRevision = latestSubmission
                ? (latestSubmission.revisionNumber ?? 1) + 1
                : 1;
              const canStudentSubmit =
                !isLocked &&
                !isPastCutoff &&
                (!latestSubmission || latestSubmission.status === "CHANGES_REQUESTED");

              return (
                <div key={ms.id} className="col-12">
                  <div className="card shadow-sm border-0">
                    <div className="card-header bg-white d-flex justify-content-between align-items-center py-3 flex-wrap gap-2">
                      <div>
                        <h5 className="mb-1 fw-bold">{ms.title}</h5>
                        <small className="text-muted">
                          Due: {new Date(ms.dueDate).toLocaleString()}
                        </small>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        {isLocked && (
                          <span
                            className="badge bg-dark"
                            data-testid={`milestone-locked-badge-${ms.id}`}
                          >
                            LOCKED
                          </span>
                        )}
                        <span className={`badge ${dueBadgeClass}`}>{dueBadgeLabel}</span>
                        {currentUser.role === "SUPERVISOR" && (
                          <button
                            type="button"
                            className="btn btn-outline-primary btn-sm"
                            data-testid={`milestone-edit-toggle-${ms.id}`}
                            onClick={() =>
                              setEditingMilestoneId(editingMilestoneId === ms.id ? null : ms.id)
                            }
                          >
                            {editingMilestoneId === ms.id ? "Close Edit" : "Edit / Lock"}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="card-body">
                      <p>{ms.description}</p>

                      {/* Supervisor Inline Edit / Lock Form (Sprint 2 F-03a) */}
                      {currentUser.role === "SUPERVISOR" && editingMilestoneId === ms.id && (
                        <MilestoneEditForm
                          milestone={ms}
                          onSave={handleUpdateMilestone}
                          onCancel={() => setEditingMilestoneId(null)}
                        />
                      )}

                      {/* Student Action: Submit / Resubmit Form or Explicit Closed/Status Notice */}
                      {currentUser.role === "STUDENT" && (
                        <>
                          {isLocked ? (
                            <div
                              className="alert alert-dark py-2 my-3 small"
                              data-testid={`milestone-closed-notice-${ms.id}`}
                            >
                              Milestone is locked by supervisor — submissions closed.
                            </div>
                          ) : isPastCutoff ? (
                            <div
                              className="alert alert-danger py-2 my-3 small"
                              data-testid={`milestone-closed-notice-${ms.id}`}
                            >
                              Submissions closed (24-hour grace window expired).
                            </div>
                          ) : latestSubmission?.status === "APPROVED" ? (
                            <div
                              className="alert alert-success py-2 my-3 small"
                              data-testid={`milestone-approved-notice-${ms.id}`}
                            >
                              Milestone Approved (Rev #{latestSubmission.revisionNumber ?? 1}) — no
                              further revisions needed.
                            </div>
                          ) : latestSubmission?.status === "SUBMITTED" ? (
                            <div
                              className="alert alert-info py-2 my-3 small"
                              data-testid={`milestone-pending-notice-${ms.id}`}
                            >
                              Submission Rev #{latestSubmission.revisionNumber ?? 1} is awaiting
                              supervisor review.
                            </div>
                          ) : canStudentSubmit ? (
                            <div className="card p-3 my-3 border bg-white">
                              <h6 className="fw-bold mb-1">
                                {latestSubmission?.status === "CHANGES_REQUESTED"
                                  ? `Submit Revision (Rev #${nextRevision})`
                                  : "Submit Milestone Work"}
                              </h6>
                              {latestSubmission?.status === "CHANGES_REQUESTED" && (
                                <p className="text-muted small mb-2">
                                  Submitting a new revision preserves all previous submissions and
                                  supervisor feedback in history.
                                </p>
                              )}
                              <form onSubmit={(e) => handleSubmitMilestoneWork(e, ms.id)}>
                                <div className="row g-2">
                                  <div className="col-12 col-md-6">
                                    <input
                                      type="text"
                                      className="form-control form-control-sm"
                                      placeholder="Submission Title (3–150 chars)"
                                      data-testid={`submission-title-${ms.id}`}
                                      value={subTitle[ms.id] || ""}
                                      onChange={(e) =>
                                        setSubTitle({ ...subTitle, [ms.id]: e.target.value })
                                      }
                                      required
                                    />
                                  </div>
                                  <div className="col-12 col-md-6">
                                    <input
                                      type="text"
                                      className="form-control form-control-sm"
                                      placeholder="Artifact URL (https://...)"
                                      data-testid={`submission-url-${ms.id}`}
                                      value={subUrl[ms.id] || ""}
                                      onChange={(e) =>
                                        setSubUrl({ ...subUrl, [ms.id]: e.target.value })
                                      }
                                      required
                                    />
                                  </div>
                                  <div className="col-12 col-md-9">
                                    <input
                                      type="text"
                                      className="form-control form-control-sm"
                                      placeholder="Submission description and summary (5–2000 chars)..."
                                      data-testid={`submission-desc-${ms.id}`}
                                      value={subDesc[ms.id] || ""}
                                      onChange={(e) =>
                                        setSubDesc({ ...subDesc, [ms.id]: e.target.value })
                                      }
                                      required
                                    />
                                  </div>
                                  <div className="col-12 col-md-3">
                                    <button
                                      type="submit"
                                      className="btn btn-primary btn-sm w-100"
                                      data-testid={`submission-submit-${ms.id}`}
                                    >
                                      {latestSubmission?.status === "CHANGES_REQUESTED"
                                        ? `Submit Rev #${nextRevision}`
                                        : "Submit Work"}
                                    </button>
                                  </div>
                                </div>
                              </form>
                            </div>
                          ) : null}
                        </>
                      )}

                      {/* Submissions & Revision History Section */}
                      <h6 className="fw-bold mt-4 mb-2">
                        Submissions{" "}
                        {ms.submissions.length > 0 && (
                          <span className="text-muted fw-normal small">
                            ({ms.submissions.length} revision{ms.submissions.length > 1 ? "s" : ""})
                          </span>
                        )}
                      </h6>
                      <SubmissionHistoryList
                        submissions={ms.submissions}
                        isSupervisor={currentUser.role === "SUPERVISOR"}
                        feedbackComment={feedbackComment}
                        feedbackStatus={feedbackStatus}
                        onChangeFeedbackComment={(subId, value) =>
                          setFeedbackComment({ ...feedbackComment, [subId]: value })
                        }
                        onChangeFeedbackStatus={(subId, value) =>
                          setFeedbackStatus({ ...feedbackStatus, [subId]: value })
                        }
                        onRecordFeedback={handleRecordFeedback}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
