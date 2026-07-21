import { PrismaClient, RoleName, PlanTier } from "@prisma/client";
import argon2 from "argon2";
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
  const roles = await Promise.all(
    Object.values(RoleName).map((name) =>
      prisma.role.upsert({ where: { name }, update: {}, create: { name } }),
    ),
  );
  const roleByName = Object.fromEntries(roles.map((r) => [r.name, r]));

  await prisma.plan.upsert({
    where: { tier: PlanTier.FREE },
    update: {},
    create: {
      tier: PlanTier.FREE,
      name: "Free",
      priceCents: 0,
      features: ["5 signals / month", "Basic market news"],
    },
  });
  await prisma.plan.upsert({
    where: { tier: PlanTier.BASIC },
    update: {},
    create: {
      tier: PlanTier.BASIC,
      name: "Basic",
      priceCents: 2900,
      features: ["20 signals / month", "All market news"],
    },
  });
  await prisma.plan.upsert({
    where: { tier: PlanTier.PREMIUM },
    update: {},
    create: {
      tier: PlanTier.PREMIUM,
      name: "Premium",
      priceCents: 7900,
      features: ["Unlimited signals", "Full analytics"],
    },
  });
  await prisma.plan.upsert({
    where: { tier: PlanTier.VIP },
    update: {},
    create: {
      tier: PlanTier.VIP,
      name: "VIP",
      priceCents: 14900,
      features: ["1-on-1 mentoring", "Personal signal advisor"],
    },
  });

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@4xgem.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: await argon2.hash(adminPassword, { type: argon2.argon2id }),
      firstName: "Admin",
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
      roleId: roleByName[RoleName.ADMIN].id,
      preferences: { create: {} },
    },
  });

  const educationTopics: Array<{
    title: string;
    icon: string;
    level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "ALL_LEVELS";
    lessonsCount: number;
    color: string;
    sortOrder: number;
  }> = [
    {
      title: "Forex Basics",
      icon: "📘",
      level: "BEGINNER",
      lessonsCount: 12,
      color: "#2563EB",
      sortOrder: 1,
    },
    {
      title: "Candlestick Patterns",
      icon: "🕯️",
      level: "BEGINNER",
      lessonsCount: 8,
      color: "#F5B301",
      sortOrder: 2,
    },
    {
      title: "Price Action",
      icon: "📊",
      level: "INTERMEDIATE",
      lessonsCount: 15,
      color: "#10B981",
      sortOrder: 3,
    },
    {
      title: "SMC Concepts",
      icon: "🏛️",
      level: "ADVANCED",
      lessonsCount: 20,
      color: "#6D28D9",
      sortOrder: 4,
    },
    {
      title: "ICT Concepts",
      icon: "🎯",
      level: "ADVANCED",
      lessonsCount: 18,
      color: "#6D28D9",
      sortOrder: 5,
    },
    {
      title: "Risk Management",
      icon: "🛡️",
      level: "INTERMEDIATE",
      lessonsCount: 10,
      color: "#10B981",
      sortOrder: 6,
    },
    {
      title: "Trading Psychology",
      icon: "🧠",
      level: "ALL_LEVELS",
      lessonsCount: 6,
      color: "#F5B301",
      sortOrder: 7,
    },
    {
      title: "Gold Trading",
      icon: "🥇",
      level: "INTERMEDIATE",
      lessonsCount: 9,
      color: "#D97706",
      sortOrder: 8,
    },
    {
      title: "Crypto Trading",
      icon: "₿",
      level: "INTERMEDIATE",
      lessonsCount: 11,
      color: "#6D28D9",
      sortOrder: 9,
    },
  ];
  for (const topic of educationTopics) {
    const existing = await prisma.educationTopic.findFirst({ where: { title: topic.title } });
    if (!existing) await prisma.educationTopic.create({ data: topic });
  }

  // eslint-disable-next-line no-console
  console.log(
    `Seed complete. Admin login: ${adminEmail} / ${adminPassword} (change immediately in production)`,
  );
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
