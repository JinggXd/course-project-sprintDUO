import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import { requireAuth, requireRole } from "../middleware/sessionAuth.js";
import {
  parsePositiveIntId,
  evaluateSubmissionDeadline,
  validateSubmissionInput,
} from "../utils/validation.js";

export const studentRouter = Router();

// ---------------------------------------------------------------------------
// POST /api/milestones/:milestoneId/submissions (Student Only, BR-01, BR-02, BR-03)
// ---------------------------------------------------------------------------
studentRouter.post(
  "/milestones/:milestoneId/submissions",
  requireAuth,
  requireRole("STUDENT"),
  async (req: Request, res: Response): Promise<void> => {
    const milestoneId = parsePositiveIntId(req.params.milestoneId);
    if (milestoneId === null) {
      res.status(404).json({ error: "NOT_FOUND", message: "Milestone not found" });
      return;
    }

    const prisma = getPrisma();
    const userId = req.user!.id;

    try {
      const milestone = await prisma.milestone.findUnique({
        where: { id: milestoneId },
        include: {
          team: {
            include: { members: true },
          },
          submissions: {
            orderBy: [{ revisionNumber: "desc" }, { id: "desc" }],
            take: 1,
            select: { id: true, status: true, revisionNumber: true },
          },
        },
      });

      if (!milestone) {
        res.status(404).json({ error: "NOT_FOUND", message: "Milestone not found" });
        return;
      }

      // BR-01: Must be a registered member of the team owning this milestone
      const isMember = milestone.team.members.some((m) => m.userId === userId);
      if (!isMember) {
        res.status(403).json({
          error: "FORBIDDEN",
          message: "You are not a member of the team assigned to this milestone",
        });
        return;
      }

      // Sprint 2 F-03a: Locked milestone blocks student submissions
      if ((milestone as any).isLocked === true) {
        res.status(400).json({
          error: "MILESTONE_LOCKED",
          message: "Milestone is locked by supervisor and no longer accepts submissions",
        });
        return;
      }

      // BR-03 v1.1.0 (Lab 7 Issue #36): 24-hour late grace window evaluation
      const deadlineCheck = evaluateSubmissionDeadline(milestone.dueDate);
      if (!deadlineCheck.isAllowed) {
        res.status(400).json({
          error: "DEADLINE_PASSED",
          message: "Milestone deadline has passed (24-hour grace window expired)",
        });
        return;
      }

      // BR-03: Input & artifactUrl validation (before status conflict checks)
      const validation = validateSubmissionInput(req.body);
      if (!validation.isValid) {
        res.status(400).json({
          error: "VALIDATION_ERROR",
          message: "Validation failed",
          details: validation.errors,
        });
        return;
      }

      // Sprint 2 F-03b (BR-04): Revision lifecycle & history preservation
      const latestSubmission = Array.isArray((milestone as any).submissions)
        ? (milestone as any).submissions[0]
        : undefined;

      if (latestSubmission?.status === "APPROVED") {
        res.status(409).json({
          error: "MILESTONE_ALREADY_APPROVED",
          message: "Milestone already has an approved submission and cannot be resubmitted",
        });
        return;
      }

      if (latestSubmission?.status === "SUBMITTED") {
        res.status(409).json({
          error: "SUBMISSION_PENDING_REVIEW",
          message: "A submission is already awaiting supervisor review before a revision can be submitted",
        });
        return;
      }

      const nextRevisionNumber = latestSubmission
        ? (latestSubmission.revisionNumber ?? 1) + 1
        : 1;
      const parentSubmissionId = latestSubmission ? latestSubmission.id : null;

      const submission = await prisma.submission.create({
        data: {
          milestoneId,
          submittedById: userId,
          title: validation.data!.title,
          description: validation.data!.description,
          artifactUrl: validation.data!.artifactUrl,
          status: "SUBMITTED",
          isLate: deadlineCheck.isLate,
          revisionNumber: nextRevisionNumber,
          parentSubmissionId,
        },
        include: {
          submittedBy: { select: { id: true, name: true, email: true } },
          feedbacks: {
            include: { supervisor: { select: { id: true, name: true, email: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
      });

      res.status(201).json({ submission });
    } catch (err) {
      res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to submit milestone work" });
    }
  },
);

// ---------------------------------------------------------------------------
// GET /api/milestones/:milestoneId/submissions (Sprint 2 F-03b: Revision History)
// ---------------------------------------------------------------------------
studentRouter.get(
  "/milestones/:milestoneId/submissions",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const milestoneId = parsePositiveIntId(req.params.milestoneId);
    if (milestoneId === null) {
      res.status(404).json({ error: "NOT_FOUND", message: "Milestone not found" });
      return;
    }

    const prisma = getPrisma();
    const userId = req.user!.id;

    try {
      const milestone = await prisma.milestone.findUnique({
        where: { id: milestoneId },
        include: {
          team: { include: { members: true } },
          submissions: {
            include: {
              submittedBy: { select: { id: true, name: true, email: true } },
              feedbacks: {
                include: { supervisor: { select: { id: true, name: true, email: true } } },
                orderBy: { createdAt: "asc" },
              },
            },
            orderBy: [{ revisionNumber: "desc" }, { id: "desc" }],
          },
        },
      });

      if (!milestone) {
        res.status(404).json({ error: "NOT_FOUND", message: "Milestone not found" });
        return;
      }

      // BR-01: Must be team member or assigned supervisor
      const isSupervisor = milestone.team.supervisorId === userId;
      const isMember = milestone.team.members.some((m) => m.userId === userId);
      if (!isSupervisor && !isMember) {
        res.status(403).json({
          error: "FORBIDDEN",
          message: "You are not authorized to view this milestone's submission history",
        });
        return;
      }

      const submissions = milestone.submissions || [];
      res.status(200).json({
        milestoneId: milestone.id,
        isLocked: Boolean((milestone as any).isLocked),
        totalRevisions: submissions.length,
        submissions,
      });
    } catch (err) {
      res.status(500).json({
        error: "INTERNAL_ERROR",
        message: "Failed to load milestone submission history",
      });
    }
  },
);

// ---------------------------------------------------------------------------
// GET /api/submissions/:id (Persisted Submission & Feedback Retrieval, BR-01)
// ---------------------------------------------------------------------------
studentRouter.get(
  "/submissions/:id",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const submissionId = parsePositiveIntId(req.params.id);
    if (submissionId === null) {
      res.status(404).json({ error: "NOT_FOUND", message: "Submission not found" });
      return;
    }

    const prisma = getPrisma();
    const userId = req.user!.id;

    try {
      const submission = await prisma.submission.findUnique({
        where: { id: submissionId },
        include: {
          submittedBy: { select: { id: true, name: true, email: true } },
          milestone: {
            include: {
              team: {
                include: { members: true },
              },
            },
          },
          feedbacks: {
            include: { supervisor: { select: { id: true, name: true, email: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!submission) {
        res.status(404).json({ error: "NOT_FOUND", message: "Submission not found" });
        return;
      }

      // BR-01: Must be either a member of the team or the team's assigned supervisor
      const isSupervisor = submission.milestone.team.supervisorId === userId;
      const isMember = submission.milestone.team.members.some((m) => m.userId === userId);

      if (!isSupervisor && !isMember) {
        res.status(403).json({
          error: "FORBIDDEN",
          message: "You are not authorized to view this submission",
        });
        return;
      }

      res.status(200).json({
        submission: {
          id: submission.id,
          milestoneId: submission.milestoneId,
          submittedById: submission.submittedById,
          title: submission.title,
          description: submission.description,
          artifactUrl: submission.artifactUrl,
          status: submission.status,
          isLate: submission.isLate,
          revisionNumber: (submission as any).revisionNumber ?? 1,
          parentSubmissionId: (submission as any).parentSubmissionId ?? null,
          submittedAt: submission.submittedAt,
          updatedAt: submission.updatedAt,
          submittedBy: submission.submittedBy,
          milestone: {
            id: submission.milestone.id,
            teamId: submission.milestone.teamId,
            title: submission.milestone.title,
            description: submission.milestone.description,
            dueDate: submission.milestone.dueDate,
            isLocked: Boolean((submission.milestone as any).isLocked),
          },
          feedbacks: submission.feedbacks,
        },
      });
    } catch (err) {
      res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to load submission" });
    }
  },
);
