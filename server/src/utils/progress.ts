export type ProgressColumnStatus =
  | "NOT_STARTED"
  | "SUBMITTED"
  | "CHANGES_REQUESTED"
  | "APPROVED";

export interface ProgressBoardItem {
  id: number;
  title: string;
  dueDate: Date | string;
  isLocked: boolean;
  latestRevisionNumber: number;
  latestStatus: ProgressColumnStatus;
  isLate: boolean;
  submissionCount: number;
}

export interface TeamProgressSummary {
  totalMilestones: number;
  totalSubmissions: number;
  lockedCount: number;
  lateSubmissionCount: number;
  completionPercent: number;
  counts: Record<ProgressColumnStatus, number>;
}

export interface TeamProgressBoardData {
  summary: TeamProgressSummary;
  columns: Record<ProgressColumnStatus, ProgressBoardItem[]>;
}

export interface ProgressMilestoneInput {
  id: number;
  title: string;
  dueDate: Date | string;
  isLocked?: boolean;
  submissions?: Array<{
    id: number;
    status: "SUBMITTED" | "CHANGES_REQUESTED" | "APPROVED";
    isLate?: boolean;
    revisionNumber?: number;
  }>;
}

/**
 * Sprint 3 F-04a (FR-06): Deterministically compute Team Milestone Progress Board
 * summary counts, completionPercent (0 when empty), locked/late totals, and
 * 4 status columns based on each milestone's latest submission revision (BR-04).
 */
export function computeTeamProgress(
  milestones: ProgressMilestoneInput[],
): TeamProgressBoardData {
  const counts: Record<ProgressColumnStatus, number> = {
    NOT_STARTED: 0,
    SUBMITTED: 0,
    CHANGES_REQUESTED: 0,
    APPROVED: 0,
  };

  const columns: Record<ProgressColumnStatus, ProgressBoardItem[]> = {
    NOT_STARTED: [],
    SUBMITTED: [],
    CHANGES_REQUESTED: [],
    APPROVED: [],
  };

  let totalSubmissions = 0;
  let lockedCount = 0;
  let lateSubmissionCount = 0;

  for (const ms of milestones) {
    const subs = Array.isArray(ms.submissions) ? ms.submissions : [];
    const sortedSubs = [...subs].sort(
      (a, b) => (b.revisionNumber ?? 1) - (a.revisionNumber ?? 1) || b.id - a.id,
    );
    const latest = sortedSubs[0] ?? null;
    const isLocked = Boolean(ms.isLocked);

    if (isLocked) lockedCount += 1;
    totalSubmissions += subs.length;
    for (const s of subs) {
      if (s.isLate) lateSubmissionCount += 1;
    }

    const latestStatus: ProgressColumnStatus = latest ? latest.status : "NOT_STARTED";
    counts[latestStatus] += 1;

    columns[latestStatus].push({
      id: ms.id,
      title: ms.title,
      dueDate: ms.dueDate,
      isLocked,
      latestRevisionNumber: latest ? (latest.revisionNumber ?? 1) : 0,
      latestStatus,
      isLate: latest ? Boolean(latest.isLate) : false,
      submissionCount: subs.length,
    });
  }

  const totalMilestones = milestones.length;
  const completionPercent =
    totalMilestones === 0 ? 0 : Math.round((counts.APPROVED / totalMilestones) * 100);

  return {
    summary: {
      totalMilestones,
      totalSubmissions,
      lockedCount,
      lateSubmissionCount,
      completionPercent,
      counts,
    },
    columns,
  };
}
