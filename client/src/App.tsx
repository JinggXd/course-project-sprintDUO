import React, { useState, useEffect } from "react";

interface User {
  id: number;
  name: string;
  email: string;
  role: "STUDENT" | "SUPERVISOR";
}

interface TeamMember {
  id: number;
  name: string;
  email: string;
}

interface Team {
  id: number;
  code: string;
  name: string;
  projectTitle: string;
  supervisor: { id: number; name: string; email: string };
  members: TeamMember[];
}

interface Feedback {
  id: number;
  comment: string;
  status: "APPROVED" | "CHANGES_REQUESTED";
  createdAt: string;
  supervisor?: { id: number; name: string; email: string };
}

interface Submission {
  id: number;
  title: string;
  description: string;
  artifactUrl: string;
  status: "SUBMITTED" | "APPROVED" | "CHANGES_REQUESTED";
  submittedAt: string;
  submittedBy?: { id: number; name: string; email: string };
  feedbacks: Feedback[];
}

interface Milestone {
  id: number;
  title: string;
  description: string;
  dueDate: string;
  submissions: Submission[];
}

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

  // Create Milestone form (Supervisor)
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDueDate, setNewDueDate] = useState("");

  // Record Feedback form (Supervisor)
  const [feedbackComment, setFeedbackComment] = useState<{ [subId: number]: string }>({});
  const [feedbackStatus, setFeedbackStatus] = useState<{ [subId: number]: "APPROVED" | "CHANGES_REQUESTED" }>({});

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

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
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
      setCurrentUser(null);
      setTeams([]);
      setSelectedTeam(null);
      setMilestones([]);
    }
  }

  async function loadTeams() {
    try {
      const res = await fetch("/api/teams");
      if (res.ok) {
        const data = await res.json();
        setTeams(data.teams);
        if (data.teams.length > 0) {
          selectTeam(data.teams[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load teams", err);
    }
  }

  async function selectTeam(team: Team) {
    setSelectedTeam(team);
    try {
      const res = await fetch(`/api/teams/${team.id}/milestones`);
      if (res.ok) {
        const data = await res.json();
        setMilestones(data.milestones);
      }
    } catch (err) {
      console.error("Failed to load milestones", err);
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
                <h2 className="text-center fw-bold mb-4">SprintDUO Sign In</h2>
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
          <div className="alert alert-success alert-dismissible" role="alert">
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
            <div className="d-flex gap-2 mb-3">
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

        {/* Milestones and Submissions List */}
        <h4 className="fw-bold mb-3">Milestones</h4>
        {milestones.length === 0 ? (
          <div className="alert alert-secondary">No milestones scheduled for this team yet.</div>
        ) : (
          <div className="row g-4">
            {milestones.map((ms) => {
              const isPastDue = new Date() > new Date(ms.dueDate);
              return (
                <div key={ms.id} className="col-12">
                  <div className="card shadow-sm border-0">
                    <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
                      <div>
                        <h5 className="mb-1 fw-bold">{ms.title}</h5>
                        <small className="text-muted">
                          Due: {new Date(ms.dueDate).toLocaleString()}
                        </small>
                      </div>
                      <span className={`badge ${isPastDue ? "bg-danger" : "bg-success"}`}>
                        {isPastDue ? "PAST DUE" : "OPEN"}
                      </span>
                    </div>
                    <div className="card-body">
                      <p>{ms.description}</p>

                      {/* Submissions Section */}
                      <h6 className="fw-bold mt-4 mb-2">Submissions</h6>
                      {ms.submissions.length === 0 ? (
                        <p className="text-muted small">No submission recorded yet.</p>
                      ) : (
                        ms.submissions.map((sub) => (
                          <div key={sub.id} className="border rounded p-3 mb-3 bg-light">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <strong>{sub.title}</strong>
                              <span
                                className={`badge ${
                                  sub.status === "APPROVED"
                                    ? "bg-success"
                                    : sub.status === "CHANGES_REQUESTED"
                                    ? "bg-warning text-dark"
                                    : "bg-primary"
                                }`}
                              >
                                {sub.status}
                              </span>
                            </div>
                            <p className="small mb-2">{sub.description}</p>
                            <p className="small mb-2">
                              Artifact:{" "}
                              <a
                                href={sub.artifactUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="fw-bold"
                              >
                                {sub.artifactUrl}
                              </a>
                            </p>
                            <div className="text-muted small mb-3">
                              Submitted by {sub.submittedBy?.name || "Student"} on{" "}
                              {new Date(sub.submittedAt).toLocaleString()}
                            </div>

                            {/* Existing Feedback */}
                            {sub.feedbacks.length > 0 && (
                              <div className="mb-3">
                                <h6>Supervisor Feedback:</h6>
                                {sub.feedbacks.map((fb) => (
                                  <div
                                    key={fb.id}
                                    className="border-start border-3 border-info ps-3 py-1 my-2 bg-white"
                                  >
                                    <div className="small fw-bold">
                                      {fb.supervisor?.name || "Supervisor"} — {fb.status}
                                    </div>
                                    <div className="small">{fb.comment}</div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Supervisor Feedback Form */}
                            {currentUser.role === "SUPERVISOR" && (
                              <div className="card p-3 mt-3 border">
                                <h6 className="fw-bold small mb-2">Record Evaluation Feedback</h6>
                                <div className="row g-2">
                                  <div className="col-12 col-md-8">
                                    <input
                                      type="text"
                                      className="form-control form-control-sm"
                                      placeholder="Feedback evaluation notes..."
                                      value={feedbackComment[sub.id] || ""}
                                      onChange={(e) =>
                                        setFeedbackComment({
                                          ...feedbackComment,
                                          [sub.id]: e.target.value,
                                        })
                                      }
                                    />
                                  </div>
                                  <div className="col-6 col-md-2">
                                    <select
                                      className="form-select form-select-sm"
                                      value={feedbackStatus[sub.id] || "APPROVED"}
                                      onChange={(e) =>
                                        setFeedbackStatus({
                                          ...feedbackStatus,
                                          [sub.id]: e.target.value as any,
                                        })
                                      }
                                    >
                                      <option value="APPROVED">APPROVED</option>
                                      <option value="CHANGES_REQUESTED">CHANGES_REQUESTED</option>
                                    </select>
                                  </div>
                                  <div className="col-6 col-md-2">
                                    <button
                                      type="button"
                                      onClick={() => handleRecordFeedback(sub.id)}
                                      className="btn btn-primary btn-sm w-100"
                                    >
                                      Submit
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      )}
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
