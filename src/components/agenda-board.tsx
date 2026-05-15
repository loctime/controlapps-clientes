"use client";

import { useMemo, useState, useTransition } from "react";

type Priority = "LOW" | "MEDIUM" | "HIGH";
type Status = "PENDING" | "IN_PROGRESS" | "DONE";

type AgendaTask = {
  id: string;
  title: string;
  detail: string | null;
  dueDate: string | null;
  priority: Priority;
  status: Status;
  companyId: string | null;
  companyName: string | null;
  createdAt: string;
};

type CompanyOption = {
  id: string;
  name: string;
};

type Counts = {
  today: number;
  tomorrow: number;
  thisWeek: number;
  pending: number;
  done: number;
  overdue: number;
};

type FilterKey = "TODAY" | "TOMORROW" | "WEEK" | "PENDING" | "DONE";

const FILTERS: { key: FilterKey; label: string; modifier: string }[] = [
  { key: "TODAY", label: "Hoy", modifier: "today" },
  { key: "TOMORROW", label: "Mañana", modifier: "tomorrow" },
  { key: "WEEK", label: "Esta semana", modifier: "week" },
  { key: "PENDING", label: "Pendientes", modifier: "pending" },
  { key: "DONE", label: "Hechas", modifier: "done" }
];

const PRIORITY_LABEL: Record<Priority, string> = {
  HIGH: "Alta",
  MEDIUM: "Media",
  LOW: "Baja"
};

const PRIORITY_RANK: Record<Priority, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1
};

function todayDateStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function tomorrowDateStr() {
  const now = new Date();
  now.setDate(now.getDate() + 1);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function splitDateTime(iso: string | null) {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const hasTime = !(d.getHours() === 0 && d.getMinutes() === 0);
  return { date: `${y}-${m}-${day}`, time: hasTime ? `${hh}:${mm}` : "" };
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isOverdue(iso: string | null) {
  if (!iso) return false;
  const due = new Date(iso);
  if (Number.isNaN(due.getTime())) return false;
  return startOfDay(due).getTime() < startOfDay(new Date()).getTime();
}

function isToday(iso: string | null) {
  if (!iso) return false;
  const due = new Date(iso);
  if (Number.isNaN(due.getTime())) return false;
  return startOfDay(due).getTime() === startOfDay(new Date()).getTime();
}

function isTomorrow(iso: string | null) {
  if (!iso) return false;
  const due = new Date(iso);
  if (Number.isNaN(due.getTime())) return false;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return startOfDay(due).getTime() === startOfDay(tomorrow).getTime();
}

function isThisWeek(iso: string | null) {
  if (!iso) return false;
  const due = new Date(iso);
  if (Number.isNaN(due.getTime())) return false;
  const now = new Date();
  const start = startOfDay(now);
  const end = new Date(start);
  const daysUntilSunday = (7 - start.getDay()) % 7 || 7;
  end.setDate(end.getDate() + daysUntilSunday + 1);
  return startOfDay(due).getTime() >= start.getTime() && due.getTime() < end.getTime();
}

function formatDueLabel(iso: string | null) {
  if (!iso) return "Sin fecha";
  const due = new Date(iso);
  if (Number.isNaN(due.getTime())) return "Sin fecha";

  const hasTime = !(due.getHours() === 0 && due.getMinutes() === 0);
  const timeStr = hasTime
    ? `${String(due.getHours()).padStart(2, "0")}:${String(due.getMinutes()).padStart(2, "0")}`
    : "";

  if (isToday(iso)) return hasTime ? `Hoy · ${timeStr}` : "Hoy";
  if (isTomorrow(iso)) return hasTime ? `Mañana · ${timeStr}` : "Mañana";

  const day = String(due.getDate()).padStart(2, "0");
  const month = String(due.getMonth() + 1).padStart(2, "0");
  const datePart = `${day}/${month}`;
  return hasTime ? `${datePart} · ${timeStr}` : datePart;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 6) return "Madrugada";
  if (h < 13) return "Buen día";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

export function AgendaBoard({
  tasks,
  companies,
  counts,
  createAction,
  toggleAction,
  deleteAction,
  updateAction
}: {
  tasks: AgendaTask[];
  companies: CompanyOption[];
  counts: Counts;
  createAction: (formData: FormData) => void;
  toggleAction: (formData: FormData) => void;
  deleteAction: (formData: FormData) => void;
  updateAction: (formData: FormData) => void;
}) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("TODAY");
  const [quickTitle, setQuickTitle] = useState("");
  const [quickWhen, setQuickWhen] = useState<"today" | "tomorrow" | "custom">("today");
  const [quickDate, setQuickDate] = useState<string>(todayDateStr());
  const [quickTime, setQuickTime] = useState<string>("");
  const [quickPriority, setQuickPriority] = useState<Priority>("MEDIUM");
  const [quickCompany, setQuickCompany] = useState<string>("");
  const [, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const filteredTasks = useMemo(() => {
    const arr = tasks.filter((task) => {
      if (activeFilter === "DONE") return task.status === "DONE";
      if (task.status === "DONE") return false;
      if (activeFilter === "TODAY") return isToday(task.dueDate) || isOverdue(task.dueDate);
      if (activeFilter === "TOMORROW") return isTomorrow(task.dueDate);
      if (activeFilter === "WEEK") return isThisWeek(task.dueDate);
      return true;
    });

    return arr.sort((a, b) => {
      const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
      const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
      if (aDue !== bDue) return aDue - bDue;
      return PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
    });
  }, [tasks, activeFilter]);

  const countsByFilter: Record<FilterKey, number> = {
    TODAY: counts.today + counts.overdue,
    TOMORROW: counts.tomorrow,
    WEEK: counts.thisWeek,
    PENDING: counts.pending,
    DONE: counts.done
  };

  const handleQuickWhen = (value: "today" | "tomorrow" | "custom") => {
    setQuickWhen(value);
    if (value === "today") setQuickDate(todayDateStr());
    if (value === "tomorrow") setQuickDate(tomorrowDateStr());
  };

  const handleCreate = (formData: FormData) => {
    if (!quickTitle.trim()) return;
    formData.set("title", quickTitle.trim());
    formData.set("dueDate", quickDate);
    formData.set("dueTime", quickTime);
    formData.set("priority", quickPriority);
    formData.set("companyId", quickCompany);
    startTransition(() => {
      createAction(formData);
      setQuickTitle("");
      setQuickTime("");
      setQuickPriority("MEDIUM");
      setQuickCompany("");
    });
  };

  const handleToggle = (taskId: string) => {
    const fd = new FormData();
    fd.set("taskId", taskId);
    setPendingId(taskId);
    startTransition(() => {
      toggleAction(fd);
      setPendingId(null);
    });
  };

  const handleDelete = (taskId: string) => {
    const fd = new FormData();
    fd.set("taskId", taskId);
    setPendingId(taskId);
    startTransition(() => {
      deleteAction(fd);
      setPendingId(null);
    });
  };

  const summary = useMemo(() => {
    const parts: string[] = [];
    if (counts.overdue > 0)
      parts.push(`${counts.overdue} vencida${counts.overdue !== 1 ? "s" : ""}`);
    if (counts.today > 0) parts.push(`${counts.today} para hoy`);
    if (counts.tomorrow > 0) parts.push(`${counts.tomorrow} mañana`);
    if (parts.length === 0) return "Hoy estás libre. Tirá una tarea cuando quieras.";
    return parts.join(" · ");
  }, [counts]);

  return (
    <>
      <section className="agenda-hero">
        <div className="agenda-hero__top">
          <span className="agenda-hero__greeting">{getGreeting()}</span>
          <h1>Tu agenda</h1>
        </div>
        <p className="agenda-hero__summary">{summary}</p>
        <div className="agenda-hero__stats">
          <div className="stat-pill stat-pill--blue">
            <span className="stat-value">{counts.today}</span>
            <span className="stat-label">Hoy</span>
          </div>
          <div className="stat-pill stat-pill--red">
            <span className="stat-value">{counts.overdue}</span>
            <span className="stat-label">Vencidas</span>
          </div>
          <div className="stat-pill stat-pill--violet">
            <span className="stat-value">{counts.thisWeek}</span>
            <span className="stat-label">Semana</span>
          </div>
          <div className="stat-pill stat-pill--green">
            <span className="stat-value">{counts.done}</span>
            <span className="stat-label">Hechas</span>
          </div>
        </div>
      </section>

      <form
        className="quick-add"
        action={handleCreate}
        onSubmit={(event) => {
          if (!quickTitle.trim()) event.preventDefault();
        }}
      >
        <input
          type="text"
          className="quick-add__title"
          placeholder="¿Qué hay que hacer? (ej: Llamar a Juan)"
          value={quickTitle}
          onChange={(event) => setQuickTitle(event.target.value)}
          aria-label="Título de la tarea"
        />

        <div className="quick-add__row">
          <div className="quick-add__when" role="group" aria-label="Cuándo">
            <button
              type="button"
              className={quickWhen === "today" ? "chip chip--blue active" : "chip"}
              onClick={() => handleQuickWhen("today")}
            >
              Hoy
            </button>
            <button
              type="button"
              className={quickWhen === "tomorrow" ? "chip chip--violet active" : "chip"}
              onClick={() => handleQuickWhen("tomorrow")}
            >
              Mañana
            </button>
            <button
              type="button"
              className={quickWhen === "custom" ? "chip active" : "chip"}
              onClick={() => handleQuickWhen("custom")}
            >
              Otra
            </button>
          </div>

          {quickWhen === "custom" ? (
            <input
              type="date"
              className="quick-add__date"
              value={quickDate}
              onChange={(event) => setQuickDate(event.target.value)}
              aria-label="Fecha"
            />
          ) : null}

          <input
            type="time"
            className="quick-add__time"
            value={quickTime}
            onChange={(event) => setQuickTime(event.target.value)}
            aria-label="Hora (opcional)"
          />

          <select
            className="quick-add__priority"
            value={quickPriority}
            onChange={(event) => setQuickPriority(event.target.value as Priority)}
            aria-label="Prioridad"
          >
            <option value="HIGH">Alta</option>
            <option value="MEDIUM">Media</option>
            <option value="LOW">Baja</option>
          </select>

          <select
            className="quick-add__company"
            value={quickCompany}
            onChange={(event) => setQuickCompany(event.target.value)}
            aria-label="Empresa (opcional)"
          >
            <option value="">Sin empresa</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>

          <button type="submit" className="quick-add__submit" disabled={!quickTitle.trim()}>
            + Agregar
          </button>
        </div>
      </form>

      <nav className="bucket-tabs agenda-tabs" aria-label="Vistas">
        {FILTERS.map((filter) => (
          <button
            key={filter.key}
            type="button"
            className={`bucket-tab bucket-tab--${filter.modifier}${
              activeFilter === filter.key ? " active" : ""
            }`}
            onClick={() => setActiveFilter(filter.key)}
          >
            <span className="bucket-tab__label">{filter.label}</span>
            <span className="bucket-count">{countsByFilter[filter.key]}</span>
          </button>
        ))}
      </nav>

      {filteredTasks.length === 0 ? (
        <p className="empty-state">
          {activeFilter === "DONE"
            ? "Todavía no completaste ninguna tarea."
            : "Sin tareas en esta vista. Cargá una arriba."}
        </p>
      ) : null}

      <section className="task-list">
        {filteredTasks.map((task) => {
          const overdue = isOverdue(task.dueDate) && task.status !== "DONE";
          const isEditing = editingId === task.id;
          const busy = pendingId === task.id;
          const { date: editDate, time: editTime } = splitDateTime(task.dueDate);

          return (
            <article
              key={task.id}
              className={`task-row task-row--${task.priority.toLowerCase()}${
                task.status === "DONE" ? " task-row--done" : ""
              }${overdue ? " task-row--overdue" : ""}`}
            >
              <button
                type="button"
                className="task-check"
                aria-pressed={task.status === "DONE"}
                onClick={() => handleToggle(task.id)}
                disabled={busy}
                title={task.status === "DONE" ? "Marcar como pendiente" : "Marcar como hecha"}
              >
                {task.status === "DONE" ? "✓" : ""}
              </button>

              <div className="task-body">
                <div className="task-head">
                  <h3 className="task-title">{task.title}</h3>
                  <div className="task-meta">
                    <span className={`task-priority task-priority--${task.priority.toLowerCase()}`}>
                      {PRIORITY_LABEL[task.priority]}
                    </span>
                    <span className={`task-due${overdue ? " task-due--overdue" : ""}`}>
                      {formatDueLabel(task.dueDate)}
                    </span>
                    {task.companyName ? (
                      <span className="task-company">@ {task.companyName}</span>
                    ) : null}
                  </div>
                </div>

                {task.detail && !isEditing ? (
                  <p className="task-detail">{task.detail}</p>
                ) : null}

                {isEditing ? (
                  <form
                    className="task-edit"
                    action={(formData) => {
                      formData.set("taskId", task.id);
                      startTransition(() => {
                        updateAction(formData);
                        setEditingId(null);
                      });
                    }}
                  >
                    <label className="task-edit__field">
                      <span>Título</span>
                      <input type="text" name="title" defaultValue={task.title} required />
                    </label>

                    <div className="task-edit__row">
                      <label className="task-edit__field">
                        <span>Fecha</span>
                        <input type="date" name="dueDate" defaultValue={editDate} />
                      </label>
                      <label className="task-edit__field">
                        <span>Hora</span>
                        <input type="time" name="dueTime" defaultValue={editTime} />
                      </label>
                    </div>

                    <div className="task-edit__row">
                      <label className="task-edit__field">
                        <span>Prioridad</span>
                        <select name="priority" defaultValue={task.priority}>
                          <option value="HIGH">Alta</option>
                          <option value="MEDIUM">Media</option>
                          <option value="LOW">Baja</option>
                        </select>
                      </label>
                      <label className="task-edit__field">
                        <span>Estado</span>
                        <select name="status" defaultValue={task.status}>
                          <option value="PENDING">Pendiente</option>
                          <option value="IN_PROGRESS">En curso</option>
                          <option value="DONE">Hecha</option>
                        </select>
                      </label>
                    </div>

                    <label className="task-edit__field">
                      <span>Empresa</span>
                      <select name="companyId" defaultValue={task.companyId ?? ""}>
                        <option value="">Sin empresa</option>
                        {companies.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="task-edit__field">
                      <span>Detalle</span>
                      <textarea name="detail" rows={2} defaultValue={task.detail ?? ""} />
                    </label>

                    <div className="task-edit__actions">
                      <button type="submit" className="save-button save-button--sm">
                        Guardar
                      </button>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => setEditingId(null)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : null}
              </div>

              <div className="task-actions">
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setEditingId(isEditing ? null : task.id)}
                  aria-label="Editar tarea"
                  disabled={busy}
                >
                  ✎
                </button>
                <button
                  type="button"
                  className="icon-button icon-button--danger"
                  onClick={() => handleDelete(task.id)}
                  aria-label="Eliminar tarea"
                  disabled={busy}
                >
                  ✕
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </>
  );
}
