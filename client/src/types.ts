export interface User {
  id: number;
  name: string;
  email: string;
  role: "STUDENT" | "SUPERVISOR";
}

export interface TeamMember {
  id: number;
  name: string;
  email: string;
}

export interface Team {
  id: number;
  code: string;
  name: string;
  projectTitle: string;
  supervisor: { id: number; name: string; email: string };
  members: TeamMember[];
}

export interface Feedback {
  id: number;
  comment: string;
  status: "APPROVED" | "CHANGES_REQUESTED";
  createdAt: string;
  supervisor?: { id: number; name: string; email: string };
}

export interface Submission {
  id: number;
  title: string;
  description: string;
  artifactUrl: string;
  status: "SUBMITTED" | "APPROVED" | "CHANGES_REQUESTED";
  isLate?: boolean;
  revisionNumber?: number;
  parentSubmissionId?: number | null;
  submittedAt: string;
  submittedBy?: { id: number; name: string; email: string };
  feedbacks: Feedback[];
}

export interface Milestone {
  id: number;
  title: string;
  description: string;
  dueDate: string;
  isLocked?: boolean;
  submissions: Submission[];
}

export type MilestoneStatusFilter =
  | "ALL"
  | "NOT_STARTED"
  | "SUBMITTED"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "LOCKED";

export const LATE_GRACE_WINDOW_MS = 24 * 60 * 60 * 1000;
