-- Sprint 2 (F-03a & F-03b, Issue #7): Additive non-breaking schema migration
-- Adds milestone locking (Milestone.isLocked) and submission revision history
-- (Submission.revisionNumber, Submission.parentSubmissionId) while preserving
-- all historical Sprint 1 / Lab 5 / Lab 6 / Lab 7 rows intact.

ALTER TABLE "Milestone" ADD COLUMN "isLocked" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Submission" ADD COLUMN "revisionNumber" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Submission" ADD COLUMN "parentSubmissionId" INTEGER;

-- Deterministically assign sequential revision numbers to any existing milestones
-- that already received multiple submissions during Labs 5–7 without altering data.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY "milestoneId" ORDER BY "submittedAt" ASC, id ASC) AS rn
  FROM "Submission"
)
UPDATE "Submission" AS s
SET "revisionNumber" = r.rn
FROM ranked AS r
WHERE s.id = r.id;

CREATE INDEX "Submission_milestoneId_revisionNumber_idx" ON "Submission"("milestoneId", "revisionNumber");

ALTER TABLE "Submission"
  ADD CONSTRAINT "Submission_parentSubmissionId_fkey"
  FOREIGN KEY ("parentSubmissionId") REFERENCES "Submission"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
