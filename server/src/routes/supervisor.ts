import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import { requireAuth, requireRole } from "../middleware/sessionAuth.js";
import {
  parsePositiveIntId,
  parseMilestoneStatusFilter,
  validateMilestoneInput,
  validateMilestoneUpdateInput,
  validateFeedbackInput,
} from "../utils/validation.js";

export const supervisorRouter = Router();

// ---------------------------------------------------------------------------
// GET /api/teams (accessible to both STUDENT and SUPERVISOR according to BR-01)
// ---------------------------------------------------------------------------
supervisorRouter.get("/teams", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const prisma = getPrisma();
  const userId = req.user!.id;
  const role = req.user!.role;

  try {
    let teams;
    if (role === "SUPERVISOR") {
      teams = await prisma.team.findMany({
        where: { supervisorId: userId },
        include: {
          supervisor: { select: { id: true, name: true, email: true } },
          members: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
        },
        orderBy: { id: "asc" },
      });
    } else {
      teams = await prisma.team.findMany({
        where: { members: { some: { userId } } },
        include: {
          supervisor: { select: { id: true, name: true, email: true } },
          members: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
        },
        orderBy: { id: "asc" },
      });
    }

    res.status(200).json({
      teams: teams.map((t) => ({
        id: t.id,
        code: t.code,
        name: t.name,
        projectTitle: t.projectTitle,
        supervisor: t.supervisor,
        members: t.members.map((m) => m.user),
      })),
    });
  } catch (err) {
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to load teams" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/teams/:teamId/milestones (BR-01 Scope Check)
// ---------------------------------------------------------------------------
supervisorRouter.get("/teams/:teamId/milestones", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const teamId = parsePositiveIntId(req.params.teamId);
  if (teamId === null) {
    res.status(404).json({ error: "NOT_FOUND", message: "Team not found" });
    return;
  }

  const prisma = getPrisma();
  const userId = req.user!.id;

  try {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        supervisor: { select: { id: true, name: true, email: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });

    if (!team) {
      res.status(404).json({ error: "NOT_FOUND", message: "Team not found" });
      return;
    }

    // BR-01: Check caller is either the assigned supervisor or a team member
    const isSupervisor = team.supervisorId === userId;
    const isMember = team.members.some((m) => m.userId === userId);

    if (!isSupervisor && !isMember) {
      res.status(403).json({
        error: "FORBIDDEN",
        message: "You are not authorized to view this team's milestones",
      });
      return;
    }

    const statusFilterCheck = parseMilestoneStatusFilter(req.query?.status);
    if (!statusFilterCheck.isValid) {
      res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Invalid milestone status filter",
        details: { status: statusFilterCheck.error },
      });
      return;
    }

    const milestones = await prisma.milestone.findMany({
      where: { teamId },
      orderBy: [{ dueDate: "asc" }, { id: "asc" }],
      include: {
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

    const filteredMilestones = milestones.filter((ms: any) => {
      if (statusFilterCheck.filter === "ALL") return true;
      if (statusFilterCheck.filter === "LOCKED") return Boolean(ms.isLocked);
      const latestStatus = ms.submissions?.[0]?.status ?? "NOT_STARTED";
      return latestStatus === statusFilterCheck.filter;
    });

    res.status(200).json({
      team: {
        id: team.id,
        code: team.code,
        name: team.name,
        projectTitle: team.projectTitle,
        supervisor: team.supervisor,
        members: team.members.map((m) => m.user),
      },
      filter: statusFilterCheck.filter,
      milestones: filteredMilestones,
    });
  } catch (err) {
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to load milestones" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/teams/:teamId/milestones (Supervisor Only, BR-01 & BR-02)
// ---------------------------------------------------------------------------
supervisorRouter.post(
  "/teams/:teamId/milestones",
  requireAuth,
  requireRole("SUPERVISOR"),
  async (req: Request, res: Response): Promise<void> => {
    const teamId = parsePositiveIntId(req.params.teamId);
    if (teamId === null) {
      res.status(404).json({ error: "NOT_FOUND", message: "Team not found" });
      return;
    }

    const validation = validateMilestoneInput(req.body);
    if (!validation.isValid) {
      res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Validation failed",
        details: validation.errors,
      });
      return;
    }

    const prisma = getPrisma();
    const userId = req.user!.id;

    try {
      const team = await prisma.team.findUnique({
        where: { id: teamId },
      });

      if (!team) {
        res.status(404).json({ error: "NOT_FOUND", message: "Team not found" });
        return;
      }

      // BR-01: Must be assigned supervisor
      if (team.supervisorId !== userId) {
        res.status(403).json({
          error: "FORBIDDEN",
          message: "You do not supervise this team",
        });
        return;
      }

      const milestone = await prisma.milestone.create({
        data: {
          teamId,
          createdById: userId,
          title: validation.data!.title,
          description: validation.data!.description,
          dueDate: validation.data!.dueDate,
        },
      });

      res.status(201).json({ milestone });
    } catch (err) {
      res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to create milestone" });
    }
  },
);

// ---------------------------------------------------------------------------
// PATCH /api/milestones/:milestoneId (Sprint 2 F-03a: Supervisor Edit / Lock)
// ---------------------------------------------------------------------------
supervisorRouter.patch(
  "/milestones/:milestoneId",
  requireAuth,
  requireRole("SUPERVISOR"),
  async (req: Request, res: Response): Promise<void> => {
    const milestoneId = parsePositiveIntId(req.params.milestoneId);
    if (milestoneId === null) {
      res.status(404).json({ error: "NOT_FOUND", message: "Milestone not found" });
      return;
    }

    const prisma = getPrisma();
    const userId = req.user!.id;

    try {
      const existing = await prisma.milestone.findUnique({
        where: { id: milestoneId },
        include: { team: true },
      });

      if (!existing) {
        res.status(404).json({ error: "NOT_FOUND", message: "Milestone not found" });
        return;
      }

      // BR-01: Must be assigned supervisor
      if (existing.team.supervisorId !== userId) {
        res.status(403).json({
          error: "FORBIDDEN",
          message: "You do not supervise the team that owns this milestone",
        });
        return;
      }

      const validation = validateMilestoneUpdateInput(req.body);
      if (!validation.isValid) {
        res.status(400).json({
          error: "VALIDATION_ERROR",
          message: "Validation failed",
          details: validation.errors,
        });
        return;
      }

      const updatedMilestone = await prisma.milestone.update({
        where: { id: milestoneId },
        data: validation.data!,
      });

      res.status(200).json({ milestone: updatedMilestone });
    } catch (err) {
      res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to update milestone" });
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/submissions/:id/feedback (Supervisor Only, BR-01 & BR-02)
// ---------------------------------------------------------------------------
supervisorRouter.post(
  "/submissions/:id/feedback",
  requireAuth,
  requireRole("SUPERVISOR"),
  async (req: Request, res: Response): Promise<void> => {
    const submissionId = parsePositiveIntId(req.params.id);
    if (submissionId === null) {
      res.status(404).json({ error: "NOT_FOUND", message: "Submission not found" });
      return;
    }

    const validation = validateFeedbackInput(req.body);
    if (!validation.isValid) {
      res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Validation failed",
        details: validation.errors,
      });
      return;
    }

    const prisma = getPrisma();
    const userId = req.user!.id;

    try {
      const submission = await prisma.submission.findUnique({
        where: { id: submissionId },
        include: {
          milestone: {
            include: { team: true },
          },
        },
      });

      if (!submission) {
        res.status(404).json({ error: "NOT_FOUND", message: "Submission not found" });
        return;
      }

      // BR-01: Must supervise the team owning this submission's milestone
      if (submission.milestone.team.supervisorId !== userId) {
        res.status(403).json({
          error: "FORBIDDEN",
          message: "You do not supervise the team that submitted this milestone",
        });
        return;
      }

      // Atomic feedback recording and status transition
      const result = await prisma.$transaction(async (tx) => {
        const feedback = await tx.feedback.create({
          data: {
            submissionId,
            supervisorId: userId,
            comment: validation.data!.comment,
            status: validation.data!.status,
          },
          include: {
            supervisor: { select: { id: true, name: true, email: true } },
          },
        });

        const updatedSubmission = await tx.submission.update({
          where: { id: submissionId },
          data: { status: validation.data!.status },
        });

        return { feedback, submission: updatedSubmission };
      });

      res.status(201).json(result);
    } catch (err) {
      res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to record feedback" });
    }
  },
);
