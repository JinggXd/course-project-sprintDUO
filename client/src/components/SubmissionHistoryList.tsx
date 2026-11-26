import React from "react";
import type { Submission } from "../types";

interface SubmissionHistoryListProps {
  submissions: Submission[];
  isSupervisor: boolean;
  feedbackComment: { [subId: number]: string };
  feedbackStatus: { [subId: number]: "APPROVED" | "CHANGES_REQUESTED" };
  onChangeFeedbackComment: (subId: number, value: string) => void;
  onChangeFeedbackStatus: (subId: number, value: "APPROVED" | "CHANGES_REQUESTED") => void;
  onRecordFeedback: (subId: number) => void;
}

export function SubmissionHistoryList({
  submissions,
  isSupervisor,
  feedbackComment,
  feedbackStatus,
  onChangeFeedbackComment,
  onChangeFeedbackStatus,
  onRecordFeedback,
}: SubmissionHistoryListProps) {
  if (submissions.length === 0) {
    return <p className="text-muted small">No submission recorded yet.</p>;
  }

  const revById = new Map<number, number>();
  for (const s of submissions) {
    revById.set(s.id, s.revisionNumber ?? 1);
  }

  return (
    <div>
      {submissions.map((sub) => {
        const revNum = sub.revisionNumber ?? 1;
        const parentRevNum = sub.parentSubmissionId
          ? revById.get(sub.parentSubmissionId) ?? revNum - 1
          : null;

        return (
          <div key={sub.id} className="border rounded p-3 mb-3 bg-light">
            <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
              <div className="d-flex align-items-center gap-2">
                <span
                  className="badge bg-secondary"
                  data-testid={`submission-rev-badge-${sub.id}`}
                >
                  Rev #{revNum}
                </span>
                <strong>{sub.title}</strong>
                {parentRevNum !== null && (
                  <span className="text-muted small">(Resubmitted from Rev #{parentRevNum})</span>
                )}
              </div>
              <div className="d-flex align-items-center gap-2">
                {sub.isLate && (
                  <span
                    className="badge bg-warning text-dark"
                    data-testid={`submission-late-badge-${sub.id}`}
                  >
                    LATE
                  </span>
                )}
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

            {isSupervisor && (
              <div className="card p-3 mt-3 border">
                <h6 className="fw-bold small mb-2">Record Evaluation Feedback</h6>
                <div className="row g-2">
                  <div className="col-12 col-md-8">
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Feedback evaluation notes..."
                      data-testid={`feedback-comment-${sub.id}`}
                      value={feedbackComment[sub.id] || ""}
                      onChange={(e) => onChangeFeedbackComment(sub.id, e.target.value)}
                    />
                  </div>
                  <div className="col-6 col-md-2">
                    <select
                      className="form-select form-select-sm"
                      data-testid={`feedback-status-${sub.id}`}
                      value={feedbackStatus[sub.id] || "APPROVED"}
                      onChange={(e) =>
                        onChangeFeedbackStatus(
                          sub.id,
                          e.target.value as "APPROVED" | "CHANGES_REQUESTED",
                        )
                      }
                    >
                      <option value="APPROVED">APPROVED</option>
                      <option value="CHANGES_REQUESTED">CHANGES_REQUESTED</option>
                    </select>
                  </div>
                  <div className="col-6 col-md-2">
                    <button
                      type="button"
                      onClick={() => onRecordFeedback(sub.id)}
                      className="btn btn-primary btn-sm w-100"
                      data-testid={`feedback-submit-${sub.id}`}
                    >
                      Submit
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
