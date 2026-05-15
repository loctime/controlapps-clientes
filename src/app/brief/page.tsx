import { createAgendaTask } from "@/app/actions";
import { WeeklyBrief } from "@/components/weekly-brief";
import { getBriefData } from "@/lib/brief";

export const dynamic = "force-dynamic";

export default async function BriefPage() {
  const data = await getBriefData();

  const overdueTasks = data.overdueTasks.map((task) => ({
    id: task.id,
    title: task.title,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    priority: task.priority,
    companyId: task.companyId,
    companyName: task.company?.name ?? null,
    bucket: task.company?.bucket ?? null
  }));

  const weekTasks = data.weekTasks.map((task) => ({
    id: task.id,
    title: task.title,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    priority: task.priority,
    companyId: task.companyId,
    companyName: task.company?.name ?? null,
    bucket: task.company?.bucket ?? null
  }));

  const newCompanies = data.newCompanies.map((company) => ({
    id: company.id,
    name: company.name,
    bucket: company.bucket,
    createdAt: company.createdAt.toISOString()
  }));

  return (
    <div className="simple-page">
      <WeeklyBrief
        counts={data.counts}
        overdueTasks={overdueTasks}
        weekTasks={weekTasks}
        magnatesNoTask={data.magnatesNoTask}
        proximosNoTask={data.proximosNoTask}
        newCompanies={newCompanies}
        agendaAction={createAgendaTask}
      />
    </div>
  );
}
