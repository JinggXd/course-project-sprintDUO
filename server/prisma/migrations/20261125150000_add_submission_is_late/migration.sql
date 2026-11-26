-- AlterTable (Lab 7 BR-03 v1.1.0, Issue #36: additive non-breaking column preserving historical Sprint 1 rows as isLate = false)
ALTER TABLE "Submission" ADD COLUMN "isLate" BOOLEAN NOT NULL DEFAULT false;
