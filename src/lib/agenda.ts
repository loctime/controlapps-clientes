import { TaskStatus } from "@prisma/client";
import { getDb } from "@/lib/db";

export async function getAgendaData() {
  const db = getDb();

  const [tasks, companies] = await Promise.all([
    db.task.findMany({
      include: {
        company: {
          select: { id: true, name: true }
        }
      },
      orderBy: [
        { status: "asc" },
        { dueDate: "asc" },
        { priority: "desc" },
        { createdAt: "desc" }
      ]
    }),
    db.company.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    })
  ]);

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  const startOfDayAfter = new Date(startOfTomorrow);
  startOfDayAfter.setDate(startOfDayAfter.getDate() + 1);
  const endOfWeek = new Date(startOfToday);
  const daysUntilSunday = (7 - startOfToday.getDay()) % 7 || 7;
  endOfWeek.setDate(endOfWeek.getDate() + daysUntilSunday + 1);

  const isOverdue = (date: Date | null) =>
    date !== null && date.getTime() < startOfToday.getTime();

  const isToday = (date: Date | null) =>
    date !== null &&
    date.getTime() >= startOfToday.getTime() &&
    date.getTime() < startOfTomorrow.getTime();

  const isTomorrow = (date: Date | null) =>
    date !== null &&
    date.getTime() >= startOfTomorrow.getTime() &&
    date.getTime() < startOfDayAfter.getTime();

  const isThisWeek = (date: Date | null) =>
    date !== null &&
    date.getTime() >= startOfToday.getTime() &&
    date.getTime() < endOfWeek.getTime();

  const counts = {
    today: 0,
    tomorrow: 0,
    thisWeek: 0,
    pending: 0,
    done: 0,
    overdue: 0
  };

  for (const task of tasks) {
    if (task.status === TaskStatus.DONE) {
      counts.done += 1;
      continue;
    }
    counts.pending += 1;
    if (isOverdue(task.dueDate)) counts.overdue += 1;
    if (isToday(task.dueDate)) counts.today += 1;
    if (isTomorrow(task.dueDate)) counts.tomorrow += 1;
    if (isThisWeek(task.dueDate)) counts.thisWeek += 1;
  }

  return { tasks, companies, counts };
}
