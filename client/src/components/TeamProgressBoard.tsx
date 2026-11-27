import React from "react";
import type { ProgressColumnStatus, TeamProgressResponse } from "../types";

interface TeamProgressBoardProps {
  progress: TeamProgressResponse | null;
}

const COLUMNS: { key: ProgressColumnStatus; label: string; headerClass: string; badgeClass: string }[] = [
  { key: "NOT_STARTED", label: "Not Started", headerClass: "bg-secondary text-white", badgeClass: "bg-secondary" },
  { key: "SUBMITTED", label: "Submitted", headerClass: "bg-primary text-white", badgeClass: "bg-primary" },
  { key: "CHANGES_REQUESTED", label: "Changes Requested", headerClass: "bg-warning text-dark", badgeClass: "bg-warning text-dark" },
  { key: "APPROVED", label: "Approved", headerClass: "bg-success text-white", badgeClass: "bg-success" },
];

export function TeamProgressBoard({ progress }: TeamProgressBoardProps) {
  if (!progress) {
    return null;
  }

  const { summary, columns } = progress;

  return (
    <div className="card shadow-sm mb-4 border-0" data-testid="team-progress-board">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
          <h5 className="fw-bold mb-0">Team Progress Board</h5>
          <div className="d-flex gap-2 flex-wrap small">
            <span className="badge bg-light text-dark border">
              Milestones: {summary.totalMilestones}
            </span>
            <span className="badge bg-light text-dark border">
              Revisions: {summary.totalSubmissions}
            </span>
            <span className="badge bg-dark">Locked: {summary.lockedCount}</span>
            <span className="badge bg-warning text-dark">
              Late Submissions: {summary.lateSubmissionCount}
            </span>
          </div>
        </div>

        {/* Completion Progress Bar */}
        <div className="mb-3">
          <div className="d-flex justify-content-between small mb-1">
            <span>Overall Approval Progress</span>
            <strong data-testid="progress-completion-bar">
              {summary.completionPercent}% ({summary.counts.APPROVED} / {summary.totalMilestones} Approved)
            </strong>
          </div>
          <div className="progress" style={{ height: "12px" }}>
            <div
              className="progress-bar bg-success"
              role="progressbar"
              style={{ width: `${summary.completionPercent}%` }}
              aria-valuenow={summary.completionPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>

        {/* 4-Column Status Board */}
        <div className="row g-2">
          {COLUMNS.map((col) => {
            const items = columns[col.key] || [];
            return (
              <div key={col.key} className="col-12 col-md-6 col-lg-3">
                <div
                  className="border rounded h-100 bg-light"
                  data-testid={`progress-col-${col.key}`}
                >
                  <div className={`px-2 py-1 rounded-top d-flex justify-content-between align-items-center small fw-bold ${col.headerClass}`}>
                    <span>{col.label}</span>
                    <span className="badge bg-white text-dark">{items.length}</span>
                  </div>
                  <div className="p-2">
                    {items.length === 0 ? (
                      <div className="text-muted small fst-italic">No milestones</div>
                    ) : (
                      items.map((item) => (
                        <div key={item.id} className="bg-white border rounded p-2 mb-2 shadow-xs">
                          <div className="fw-semibold small mb-1">{item.title}</div>
                          <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                            Due: {new Date(item.dueDate).toLocaleDateString()}
                          </div>
                          <div className="d-flex gap-1 mt-1 flex-wrap">
                            {item.latestRevisionNumber > 0 && (
                              <span className="badge bg-secondary" style={{ fontSize: "0.7rem" }}>
                                Rev #{item.latestRevisionNumber}
                              </span>
                            )}
                            {item.isLate && (
                              <span className="badge bg-warning text-dark" style={{ fontSize: "0.7rem" }}>
                                LATE
                              </span>
                            )}
                            {item.isLocked && (
                              <span className="badge bg-dark" style={{ fontSize: "0.7rem" }}>
                                LOCKED
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
