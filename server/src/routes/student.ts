import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import { requireAuth, requireRole } from "../middleware/sessionAuth.js";
import { isDeadlinePassed, validateSubmissionInput } from "../utils/validation.js";

export const studentRouter = Router();

// ---------------------------------------------------------------------------
// POST /api/milestones/:milestoneId/submissions (Student Only, BR-01, BR-02, BR-03)
// ---------------------------------------------------------------------------
studentRouter.post(
  "/milestones/:milestoneId/submissions",
  requireAuth,
  requireRole("STUDENT"),
  async (req: Request, res: Response): Promise<void> => {
    const milestoneId = parseInt(req.params.milestoneId, 10);
    if (isNaN(milestoneId)) {
      res.status(400).json({ error: "VALIDATION_ERROR", message: "Invalid milestone ID" });
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

      // BR-03: Deadline enforcement rule (serverNow > milestone.dueDate -> 400 DEADLINE_PASSED)
      if (isDeadlinePassed(milestone.dueDate)) {
        res.status(400).json({
          error: "DEADLINE_PASSED",
          message: "Milestone deadline has passed",
        });
        return;
      }

      // BR-03: Input & artifactUrl validation
      const validation = validateSubmissionInput(req.body);
      if (!validation.isValid) {
        res.status(400).json({
          error: "VALIDATION_ERROR",
          message: "Validation failed",
          details: validation.errors,
        });
        return;
      }

      const submission = await prisma.submission.create({
        data: {
          milestoneId,
          submittedById: userId,
          title: validation.data!.title,
          description: validation.data!.description,
          artifactUrl: validation.data!.artifactUrl,
          status: "SUBMITTED",
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
// GET /api/submissions/:id (Persisted Submission & Feedback Retrieval, BR-01)
// ---------------------------------------------------------------------------
studentRouter.get(
  "/submissions/:id",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const submissionId = parseInt(req.params.id, 10);
    if (isNaN(submissionId)) {
      res.status(400).json({ error: "VALIDATION_ERROR", message: "Invalid submission ID" });
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
          submittedAt: submission.submittedAt,
          updatedAt: submission.updatedAt,
          submittedBy: submission.submittedBy,
          milestone: {
            id: submission.milestone.id,
            teamId: submission.milestone.teamId,
            title: submission.milestone.title,
            description: submission.milestone.description,
            dueDate: submission.milestone.dueDate,
          },
          feedbacks: submission.feedbacks,
        },
      });
    } catch (err) {
      res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to load submission" });
    }
  },
);
