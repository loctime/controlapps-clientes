import { CompanyBucket, TaskStatus } from "@prisma/client";
import { getDb } from "@/lib/db";

export async function getBriefData() {
  const db = getDb();

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  const endOfWeek = new Date(startOfToday);
  const daysUntilSunday = (7 - startOfToday.getDay()) % 7 || 7;
  endOfWeek.setDate(endOfWeek.getDate() + daysUntilSunday + 1);
  const sevenDaysAgo = new Date(startOfToday);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const noPendingTask = {
    tasks: { none: { status: { not: TaskStatus.DONE } } }
  };

  const [
    overdueTasks,
    weekTasks,
    magnatesNoTask,
    proximosNoTask,
    newCompanies,
    doneLastWeek,
    bucketCounts,
    pendingTasksCount,
    totalTasksCount
  ] = await Promise.all([
    db.task.findMany({
      where: {
        status: { not: TaskStatus.DONE },
        dueDate: { lt: startOfToday }
      },
      include: {
        company: { select: { id: true, name: true, bucket: true } }
      },
      orderBy: [{ dueDate: "asc" }, { priority: "desc" }]
    }),
    db.task.findMany({
      where: {
        status: { not: TaskStatus.DONE },
        dueDate: { gte: startOfToday, lt: endOfWeek }
      },
      include: {
        company: { select: { id: true, name: true, bucket: true } }
      },
      orderBy: [{ dueDate: "asc" }, { priority: "desc" }]
    }),
    db.company.findMany({
      where: { bucket: CompanyBucket.MAGNATES, ...noPendingTask },
      select: { id: true, name: true, industry: true, phone: true, email: true },
      orderBy: { name: "asc" }
    }),
    db.company.findMany({
      where: { bucket: CompanyBucket.PROXIMOS, ...noPendingTask },
      select: { id: true, name: true, industry: true, phone: true, email: true },
      orderBy: { name: "asc" }
    }),
    db.company.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { id: true, name: true, bucket: true, createdAt: true },
      orderBy: { createdAt: "desc" }
    }),
    db.task.count({
      where: { status: TaskStatus.DONE, updatedAt: { gte: sevenDaysAgo } }
    }),
    db.company.groupBy({
      by: ["bucket"],
      _count: { _all: true }
    }),
    db.task.count({ where: { status: { not: TaskStatus.DONE } } }),
    db.task.count()
  ]);

  const bucketCount = (bucket: CompanyBucket) =>
    bucketCounts.find((row) => row.bucket === bucket)?._count._all ?? 0;

  const counts = {
    magnates: bucketCount(CompanyBucket.MAGNATES),
    proximos: bucketCount(CompanyBucket.PROXIMOS),
    futuros: bucketCount(CompanyBucket.FUTUROS),
    sinAsignar: bucketCount(CompanyBucket.SIN_ASIGNAR),
    overdueTasks: overdueTasks.length,
    weekTasks: weekTasks.length,
    magnatesNoTask: magnatesNoTask.length,
    proximosNoTask: proximosNoTask.length,
    newThisWeek: newCompanies.length,
    doneLastWeek,
    pendingTasks: pendingTasksCount,
    totalTasks: totalTasksCount
  };

  return {
    counts,
    overdueTasks,
    weekTasks,
    magnatesNoTask,
    proximosNoTask,
    newCompanies
  };
}
