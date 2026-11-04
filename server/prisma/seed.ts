import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/utils/password.js";

const prisma = new PrismaClient();

export async function seedDatabase(client: PrismaClient = prisma): Promise<void> {
  const defaultPasswordHash = await hashPassword("Password123!");

  // 1. Seed Supervisors (Role: SUPERVISOR)
  const advisor1 = await client.user.upsert({
    where: { email: "sup.advisor1@sprintduo.edu" },
    update: {
      name: "Dr. Kittipong (Advisor 1)",
      passwordHash: defaultPasswordHash,
      role: "SUPERVISOR",
      isActive: true,
    },
    create: {
      email: "sup.advisor1@sprintduo.edu",
      name: "Dr. Kittipong (Advisor 1)",
      passwordHash: defaultPasswordHash,
      role: "SUPERVISOR",
      isActive: true,
    },
  });

  const advisor2 = await client.user.upsert({
    where: { email: "sup.advisor2@sprintduo.edu" },
    update: {
      name: "Dr. Nattaya (Advisor 2)",
      passwordHash: defaultPasswordHash,
      role: "SUPERVISOR",
      isActive: true,
    },
    create: {
      email: "sup.advisor2@sprintduo.edu",
      name: "Dr. Nattaya (Advisor 2)",
      passwordHash: defaultPasswordHash,
      role: "SUPERVISOR",
      isActive: true,
    },
  });

  // 2. Seed Students (Role: STUDENT)
  const studentJing = await client.user.upsert({
    where: { email: "stu.jing@sprintduo.edu" },
    update: {
      name: "Phongsatorn (67070501084)",
      passwordHash: defaultPasswordHash,
      role: "STUDENT",
      isActive: true,
    },
    create: {
      email: "stu.jing@sprintduo.edu",
      name: "Phongsatorn (67070501084)",
      passwordHash: defaultPasswordHash,
      role: "STUDENT",
      isActive: true,
    },
  });

  const studentYumi = await client.user.upsert({
    where: { email: "stu.yumi@sprintduo.edu" },
    update: {
      name: "Yuminnini (67070501036)",
      passwordHash: defaultPasswordHash,
      role: "STUDENT",
      isActive: true,
    },
    create: {
      email: "stu.yumi@sprintduo.edu",
      name: "Yuminnini (67070501036)",
      passwordHash: defaultPasswordHash,
      role: "STUDENT",
      isActive: true,
    },
  });

  const studentOther = await client.user.upsert({
    where: { email: "stu.other@sprintduo.edu" },
    update: {
      name: "Somchai (67070501099 - Team Beta)",
      passwordHash: defaultPasswordHash,
      role: "STUDENT",
      isActive: true,
    },
    create: {
      email: "stu.other@sprintduo.edu",
      name: "Somchai (67070501099 - Team Beta)",
      passwordHash: defaultPasswordHash,
      role: "STUDENT",
      isActive: true,
    },
  });

  const studentOther2 = await client.user.upsert({
    where: { email: "stu.other2@sprintduo.edu" },
    update: {
      name: "Suda (67070501098 - Team Beta)",
      passwordHash: defaultPasswordHash,
      role: "STUDENT",
      isActive: true,
    },
    create: {
      email: "stu.other2@sprintduo.edu",
      name: "Suda (67070501098 - Team Beta)",
      passwordHash: defaultPasswordHash,
      role: "STUDENT",
      isActive: true,
    },
  });

  // 3. Seed Teams
  const teamAlpha = await client.team.upsert({
    where: { code: "TEAM-ALPHA" },
    update: {
      name: "Team Alpha (SprintDUO)",
      projectTitle: "Course Project Milestone & Supervision Tracker",
      supervisorId: advisor1.id,
    },
    create: {
      code: "TEAM-ALPHA",
      name: "Team Alpha (SprintDUO)",
      projectTitle: "Course Project Milestone & Supervision Tracker",
      supervisorId: advisor1.id,
    },
  });

  const teamBeta = await client.team.upsert({
    where: { code: "TEAM-BETA" },
    update: {
      name: "Team Beta",
      projectTitle: "Smart Campus IoT Monitoring",
      supervisorId: advisor2.id,
    },
    create: {
      code: "TEAM-BETA",
      name: "Team Beta",
      projectTitle: "Smart Campus IoT Monitoring",
      supervisorId: advisor2.id,
    },
  });

  // 4. Seed Team Memberships
  for (const [teamId, userId] of [
    [teamAlpha.id, studentJing.id],
    [teamAlpha.id, studentYumi.id],
    [teamBeta.id, studentOther.id],
    [teamBeta.id, studentOther2.id],
  ] as const) {
    await client.teamMember.upsert({
      where: {
        teamId_userId: { teamId, userId },
      },
      update: {},
      create: { teamId, userId },
    });
  }

  // 5. Seed Initial Milestones if Team Alpha has none yet
  const existingAlphaMilestones = await client.milestone.count({
    where: { teamId: teamAlpha.id },
  });

  if (existingAlphaMilestones === 0) {
    const futureDue = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // +7 days
    const pastDue = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // -2 days (for late rule testing)

    await client.milestone.createMany({
      data: [
        {
          teamId: teamAlpha.id,
          createdById: advisor1.id,
          title: "Milestone 1: SRS & System-Level SDS Baseline",
          description: "Submit complete SRS, Feature Traceability, System-Level SDS, and Sprint 1 contracts.",
          dueDate: futureDue,
        },
        {
          teamId: teamAlpha.id,
          createdById: advisor1.id,
          title: "Milestone 0: Initial Project Charter (Past Due Demo)",
          description: "Submit initial team formation charter and domain selection brief.",
          dueDate: pastDue,
        },
      ],
    });
  }
}

const isDirectRun = process.argv[1]?.replace(/\\/g, "/").endsWith("prisma/seed.ts");
if (isDirectRun) {
  seedDatabase()
    .then(async () => {
      console.log("SprintDUO seed completed successfully.");
      await prisma.$disconnect();
    })
    .catch(async (err) => {
      console.error("SprintDUO seed failed:", err);
      await prisma.$disconnect();
      process.exit(1);
    });
}

