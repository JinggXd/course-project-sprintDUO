import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/utils/password.js";

const prisma = new PrismaClient();

function resolveSeedConfig(): {
  seedDemoData: boolean;
  adminPassword: string;
  demoPassword: string;
} {
  const isProduction = process.env.NODE_ENV === "production";
  const rawDemoFlag = process.env.SEED_DEMO_DATA;
  const seedDemoData = isProduction
    ? rawDemoFlag === "true"
    : rawDemoFlag !== "false";

  const envAdminPassword = process.env.ADMIN_PASSWORD?.trim();
  const envDemoPassword = process.env.DEMO_USER_PASSWORD?.trim();

  if (isProduction) {
    if (!envAdminPassword) {
      throw new Error(
        "ADMIN_PASSWORD environment variable is required when NODE_ENV=production",
      );
    }
    if (seedDemoData && !envDemoPassword) {
      throw new Error(
        "DEMO_USER_PASSWORD environment variable is required when SEED_DEMO_DATA=true in production",
      );
    }
    return {
      seedDemoData,
      adminPassword: envAdminPassword,
      demoPassword: envDemoPassword || "",
    };
  }

  return {
    seedDemoData,
    adminPassword: envAdminPassword || envDemoPassword || "Password123!",
    demoPassword: envDemoPassword || "Password123!",
  };
}

/**
 * Idempotently seed initial supervisor and optional demo dataset without overwriting existing users.
 */
export async function seedDatabase(client: PrismaClient = prisma): Promise<void> {
  const { seedDemoData, adminPassword, demoPassword } = resolveSeedConfig();
  const adminPasswordHash = await hashPassword(adminPassword);

  // 1. Ensure initial supervisor account exists (never overwrites existing credentials).
  const advisor1 = await client.user.upsert({
    where: { email: "sup.advisor1@sprintduo.edu" },
    update: {},
    create: {
      email: "sup.advisor1@sprintduo.edu",
      name: "Dr. Kittipong (Advisor 1)",
      passwordHash: adminPasswordHash,
      role: "SUPERVISOR",
      isActive: true,
    },
  });

  if (!seedDemoData) {
    return;
  }

  const demoPasswordHash = await hashPassword(demoPassword);

  // 2. Seed additional demo supervisor & student accounts.
  const advisor2 = await client.user.upsert({
    where: { email: "sup.advisor2@sprintduo.edu" },
    update: {},
    create: {
      email: "sup.advisor2@sprintduo.edu",
      name: "Dr. Nattaya (Advisor 2)",
      passwordHash: demoPasswordHash,
      role: "SUPERVISOR",
      isActive: true,
    },
  });

  const studentJing = await client.user.upsert({
    where: { email: "stu.jing@sprintduo.edu" },
    update: {},
    create: {
      email: "stu.jing@sprintduo.edu",
      name: "Phongsatorn (67070501084)",
      passwordHash: demoPasswordHash,
      role: "STUDENT",
      isActive: true,
    },
  });

  const studentYumi = await client.user.upsert({
    where: { email: "stu.yumi@sprintduo.edu" },
    update: {},
    create: {
      email: "stu.yumi@sprintduo.edu",
      name: "Yuminnini (67070501036)",
      passwordHash: demoPasswordHash,
      role: "STUDENT",
      isActive: true,
    },
  });

  const studentOther = await client.user.upsert({
    where: { email: "stu.other@sprintduo.edu" },
    update: {},
    create: {
      email: "stu.other@sprintduo.edu",
      name: "Somchai (67070501099 - Team Beta)",
      passwordHash: demoPasswordHash,
      role: "STUDENT",
      isActive: true,
    },
  });

  const studentOther2 = await client.user.upsert({
    where: { email: "stu.other2@sprintduo.edu" },
    update: {},
    create: {
      email: "stu.other2@sprintduo.edu",
      name: "Suda (67070501098 - Team Beta)",
      passwordHash: demoPasswordHash,
      role: "STUDENT",
      isActive: true,
    },
  });

  // 3. Seed demo Teams (non-destructive)
  const teamAlpha = await client.team.upsert({
    where: { code: "TEAM-ALPHA" },
    update: {},
    create: {
      code: "TEAM-ALPHA",
      name: "Team Alpha (SprintDUO)",
      projectTitle: "Course Project Milestone & Supervision Tracker",
      supervisorId: advisor1.id,
    },
  });

  const teamBeta = await client.team.upsert({
    where: { code: "TEAM-BETA" },
    update: {},
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
