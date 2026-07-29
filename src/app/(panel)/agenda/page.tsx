import {
  createAgendaTask,
  deleteAgendaTask,
  toggleTaskStatus,
  updateAgendaTask
} from "@/app/actions";
import { AgendaBoard } from "@/components/agenda-board";
import { getAgendaData } from "@/lib/agenda";

export const dynamic = "force-dynamic";

export default async function AgendaPage() {
  const { tasks, companies, counts } = await getAgendaData();

  const plainTasks = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    detail: task.detail,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    priority: task.priority,
    status: task.status,
    companyId: task.companyId,
    companyName: task.company?.name ?? null,
    createdAt: task.createdAt.toISOString()
  }));

  return (
    <div className="simple-page">
      <AgendaBoard
        tasks={plainTasks}
        companies={companies}
        counts={counts}
        createAction={createAgendaTask}
        toggleAction={toggleTaskStatus}
        deleteAction={deleteAgendaTask}
        updateAction={updateAgendaTask}
      />
    </div>
  );
}
