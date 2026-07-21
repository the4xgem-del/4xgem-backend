import { prisma } from "@/lib/prisma";
import { ApiError } from "@/utils/ApiError";
import type { UpdateProgressInput } from "./education.schema";

export const educationService = {
  async listWithProgress(userId?: string) {
    const topics = await prisma.educationTopic.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: { progress: { where: { userId: userId ?? "__no-user__" } } },
    });

    return topics.map((t: (typeof topics)[number]) => ({
      id: t.id,
      title: t.title,
      icon: t.icon,
      level: t.level,
      lessons: t.lessonsCount,
      color: t.color,
      progress: t.progress[0]?.progressPercent ?? 0,
    }));
  },

  async updateProgress(userId: string, topicId: string, input: UpdateProgressInput) {
    const topic = await prisma.educationTopic.findUnique({ where: { id: topicId } });
    if (!topic) throw ApiError.notFound("Education topic not found.");

    return prisma.userEducationProgress.upsert({
      where: { userId_topicId: { userId, topicId } },
      update: { progressPercent: input.progressPercent, completedAt: input.progressPercent >= 100 ? new Date() : null },
      create: { userId, topicId, progressPercent: input.progressPercent },
    });
  },
};
