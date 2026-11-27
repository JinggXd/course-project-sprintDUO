import React, { useState } from "react";
import type { Milestone } from "../types";

interface MilestoneEditFormProps {
  milestone: Milestone;
  onSave: (
    milestoneId: number,
    payload: { title: string; description: string; dueDate: string; isLocked: boolean },
  ) => Promise<boolean>;
  onCancel: () => void;
}

function toLocalDateTimeInput(isoDate: string): string {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function MilestoneEditForm({ milestone, onSave, onCancel }: MilestoneEditFormProps) {
  const [title, setTitle] = useState(milestone.title);
  const [description, setDescription] = useState(milestone.description);
  const [dueDate, setDueDate] = useState(toLocalDateTimeInput(milestone.dueDate));
  const [isLocked, setIsLocked] = useState(Boolean(milestone.isLocked));
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const ok = await onSave(milestone.id, {
        title,
        description,
        dueDate: new Date(dueDate).toISOString(),
        isLocked,
      });
      if (ok) {
        onCancel();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-3 mb-3 border-primary bg-light" data-testid={`milestone-edit-form-${milestone.id}`}>
      <h6 className="fw-bold mb-2">Edit Milestone &amp; Lock Settings</h6>
      <form onSubmit={handleSubmit}>
        <div className="row g-2">
          <div className="col-12 col-md-6">
            <label className="form-label small mb-1" htmlFor={`edit-title-${milestone.id}`}>
              Title
            </label>
            <input
              id={`edit-title-${milestone.id}`}
              type="text"
              className="form-control form-control-sm"
              data-testid={`milestone-edit-title-${milestone.id}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label small mb-1" htmlFor={`edit-due-${milestone.id}`}>
              Due Date
            </label>
            <input
              id={`edit-due-${milestone.id}`}
              type="datetime-local"
              className="form-control form-control-sm"
              data-testid={`milestone-edit-due-${milestone.id}`}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
          </div>
          <div className="col-12">
            <label className="form-label small mb-1" htmlFor={`edit-desc-${milestone.id}`}>
              Description
            </label>
            <textarea
              id={`edit-desc-${milestone.id}`}
              className="form-control form-control-sm"
              rows={2}
              data-testid={`milestone-edit-desc-${milestone.id}`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          <div className="col-12 d-flex justify-content-between align-items-center mt-2">
            <div className="form-check">
              <input
                id={`edit-lock-${milestone.id}`}
                type="checkbox"
                className="form-check-input"
                data-testid={`milestone-edit-lock-${milestone.id}`}
                checked={isLocked}
                onChange={(e) => setIsLocked(e.target.checked)}
              />
              <label className="form-check-label small fw-semibold" htmlFor={`edit-lock-${milestone.id}`}>
                Lock milestone (block new student submissions)
              </label>
            </div>
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={onCancel}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                data-testid={`milestone-edit-save-${milestone.id}`}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
