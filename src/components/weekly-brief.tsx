"use client";

import { useState, useTransition } from "react";

type Priority = "LOW" | "MEDIUM" | "HIGH";
type Bucket = "SIN_ASIGNAR" | "PROXIMOS" | "FUTUROS" | "MAGNATES" | null;

type TaskItem = {
  id: string;
  title: string;
  dueDate: string | null;
  priority: Priority;
  companyId: string | null;
  companyName: string | null;
  bucket: Bucket;
};

type CompanyItem = {
  id: string;
  name: string;
  industry: string | null;
  phone: string | null;
  email: string | null;
};

type NewCompanyItem = {
  id: string;
  name: string;
  bucket: Exclude<Bucket, null>;
  createdAt: string;
};

type Counts = {
  magnates: number;
  proximos: number;
  futuros: number;
  sinAsignar: number;
  overdueTasks: number;
  weekTasks: number;
  magnatesNoTask: number;
  proximosNoTask: number;
  newThisWeek: number;
  doneLastWeek: number;
  pendingTasks: number;
  totalTasks: number;
};

const PRIORITY_LABEL: Record<Priority, string> = {
  HIGH: "Alta",
  MEDIUM: "Media",
  LOW: "Baja"
};

const BUCKET_LABEL: Record<Exclude<Bucket, null>, string> = {
  SIN_ASIGNAR: "Sin asignar",
  PROXIMOS: "Próximos",
  FUTUROS: "Futuros",
  MAGNATES: "Magnates"
};

const BUCKET_MODIFIER: Record<Exclude<Bucket, null>, string> = {
  SIN_ASIGNAR: "unassigned",
  PROXIMOS: "proximos",
  FUTUROS: "futuros",
  MAGNATES: "magnates"
};

function todayDateStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

function tomorrowDateStr() {
  const now = new Date();
  now.setDate(now.getDate() + 1);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

function formatDateRangeLabel() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  return `${fmt(start)} – ${fmt(end)}`;
}

function dayLabel() {
  const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  return days[new Date().getDay()];
}

function formatDueLabel(iso: string | null) {
  if (!iso) return "Sin fecha";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Sin fecha";
  const today = new Date();
  const isToday =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  const hasTime = !(d.getHours() === 0 && d.getMinutes() === 0);
  const timeStr = hasTime
    ? `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
    : "";
  if (isToday) return hasTime ? `Hoy · ${timeStr}` : "Hoy";
  const datePart = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
  return hasTime ? `${datePart} · ${timeStr}` : datePart;
}

export function WeeklyBrief({
  counts,
  overdueTasks,
  weekTasks,
  magnatesNoTask,
  proximosNoTask,
  newCompanies,
  agendaAction
}: {
  counts: Counts;
  overdueTasks: TaskItem[];
  weekTasks: TaskItem[];
  magnatesNoTask: CompanyItem[];
  proximosNoTask: CompanyItem[];
  newCompanies: NewCompanyItem[];
  agendaAction: (formData: FormData) => void;
}) {
  const [, startTransition] = useTransition();
  const [agendaForId, setAgendaForId] = useState<string | null>(null);
  const [miniTitle, setMiniTitle] = useState("");
  const [miniWhen, setMiniWhen] = useState<"today" | "tomorrow" | "custom">("today");
  const [miniDate, setMiniDate] = useState<string>(todayDateStr());
  const [miniPriority, setMiniPriority] = useState<Priority>("MEDIUM");
  const [flashId, setFlashId] = useState<string | null>(null);

  const openAgendaFor = (companyId: string, suggestedTitle: string) => {
    setAgendaForId(companyId);
    setMiniTitle(suggestedTitle);
    setMiniWhen("today");
    setMiniDate(todayDateStr());
    setMiniPriority("MEDIUM");
  };

  const handleMiniWhen = (value: "today" | "tomorrow" | "custom") => {
    setMiniWhen(value);
    if (value === "today") setMiniDate(todayDateStr());
    if (value === "tomorrow") setMiniDate(tomorrowDateStr());
  };

  const handleSubmit = (companyId: string) => {
    if (!miniTitle.trim()) return;
    const fd = new FormData();
    fd.set("title", miniTitle.trim());
    fd.set("companyId", companyId);
    fd.set("dueDate", miniDate);
    fd.set("priority", miniPriority);
    startTransition(() => {
      agendaAction(fd);
      setAgendaForId(null);
      setFlashId(companyId);
      setTimeout(() => setFlashId(null), 2200);
    });
  };

  const dueSoonCount = counts.overdueTasks + counts.weekTasks;

  const summary = (() => {
    const parts: string[] = [];
    if (counts.overdueTasks > 0)
      parts.push(`${counts.overdueTasks} tarea${counts.overdueTasks !== 1 ? "s" : ""} vencida${counts.overdueTasks !== 1 ? "s" : ""}`);
    if (counts.magnatesNoTask > 0)
      parts.push(`${counts.magnatesNoTask} magnates sin contactar`);
    if (counts.proximosNoTask > 0)
      parts.push(`${counts.proximosNoTask} próximos esperando`);
    if (parts.length === 0)
      return "Todo bajo control. Es buen momento para sumar nuevas oportunidades.";
    return parts.join(" · ");
  })();

  return (
    <>
      <section className="brief-hero">
        <div className="brief-hero__top">
          <span className="brief-hero__chip">{dayLabel()}</span>
          <h1>Brief semanal</h1>
          <p className="brief-hero__range">{formatDateRangeLabel()}</p>
        </div>
        <p className="brief-hero__summary">{summary}</p>
        <div className="brief-hero__stats">
          <div className="stat-pill stat-pill--red">
            <span className="stat-value">{counts.overdueTasks}</span>
            <span className="stat-label">Vencidas</span>
          </div>
          <div className="stat-pill stat-pill--blue">
            <span className="stat-value">{counts.magnatesNoTask}</span>
            <span className="stat-label">Magnates s/tarea</span>
          </div>
          <div className="stat-pill stat-pill--violet">
            <span className="stat-value">{counts.proximosNoTask}</span>
            <span className="stat-label">Próximos s/tarea</span>
          </div>
          <div className="stat-pill stat-pill--green">
            <span className="stat-value">{counts.doneLastWeek}</span>
            <span className="stat-label">Hechas 7d</span>
          </div>
        </div>
      </section>

      <section className="brief-overview">
        <div className="brief-overview__item">
          <span className="brief-overview__num">{counts.magnates}</span>
          <span className="brief-overview__lbl">Magnates</span>
        </div>
        <div className="brief-overview__item">
          <span className="brief-overview__num">{counts.proximos}</span>
          <span className="brief-overview__lbl">Próximos</span>
        </div>
        <div className="brief-overview__item">
          <span className="brief-overview__num">{counts.futuros}</span>
          <span className="brief-overview__lbl">Futuros</span>
        </div>
        <div className="brief-overview__item">
          <span className="brief-overview__num">{counts.sinAsignar}</span>
          <span className="brief-overview__lbl">Sin asignar</span>
        </div>
        <div className="brief-overview__item">
          <span className="brief-overview__num">{counts.pendingTasks}</span>
          <span className="brief-overview__lbl">Tareas pend.</span>
        </div>
        <div className="brief-overview__item">
          <span className="brief-overview__num">{counts.newThisWeek}</span>
          <span className="brief-overview__lbl">Nuevas 7d</span>
        </div>
      </section>

      {counts.overdueTasks > 0 ? (
        <BriefSection
          title="🔥 Tareas vencidas"
          count={counts.overdueTasks}
          tone="red"
          description="Estas se pasaron de fecha. Resolvé o reagendá."
        >
          <ul className="brief-list">
            {overdueTasks.slice(0, 10).map((task) => (
              <li key={task.id} className="brief-list__row">
                <span className={`task-priority task-priority--${task.priority.toLowerCase()}`}>
                  {PRIORITY_LABEL[task.priority]}
                </span>
                <div className="brief-list__body">
                  <strong className="brief-list__title">{task.title}</strong>
                  <div className="brief-list__meta">
                    <span className="task-due task-due--overdue">
                      {formatDueLabel(task.dueDate)}
                    </span>
                    {task.companyName ? (
                      <span className="task-company">@ {task.companyName}</span>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
            {overdueTasks.length > 10 ? (
              <li className="brief-list__more">
                +{overdueTasks.length - 10} más en /agenda
              </li>
            ) : null}
          </ul>
        </BriefSection>
      ) : null}

      {weekTasks.length > 0 ? (
        <BriefSection
          title="📅 Esta semana"
          count={weekTasks.length}
          tone="blue"
          description="Tareas con fecha esta semana. Mantené el ritmo."
        >
          <ul className="brief-list">
            {weekTasks.slice(0, 10).map((task) => (
              <li key={task.id} className="brief-list__row">
                <span className={`task-priority task-priority--${task.priority.toLowerCase()}`}>
                  {PRIORITY_LABEL[task.priority]}
                </span>
                <div className="brief-list__body">
                  <strong className="brief-list__title">{task.title}</strong>
                  <div className="brief-list__meta">
                    <span className="task-due">{formatDueLabel(task.dueDate)}</span>
                    {task.companyName ? (
                      <span className="task-company">@ {task.companyName}</span>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
            {weekTasks.length > 10 ? (
              <li className="brief-list__more">+{weekTasks.length - 10} más en /agenda</li>
            ) : null}
          </ul>
        </BriefSection>
      ) : null}

      {magnatesNoTask.length > 0 ? (
        <BriefSection
          title="👑 Magnates sin tarea agendada"
          count={magnatesNoTask.length}
          tone="green"
          description="Empresas de máxima prioridad sin próximo paso. Hoy es el día."
        >
          <ul className="brief-list">
            {magnatesNoTask.slice(0, 10).map((company) => (
              <BriefCompanyRow
                key={company.id}
                company={company}
                bucketLabel={BUCKET_LABEL.MAGNATES}
                bucketMod="magnates"
                isOpen={agendaForId === company.id}
                flashed={flashId === company.id}
                onOpen={() => openAgendaFor(company.id, `Contactar a ${company.name}`)}
                onClose={() => setAgendaForId(null)}
                miniTitle={miniTitle}
                setMiniTitle={setMiniTitle}
                miniWhen={miniWhen}
                setMiniWhen={handleMiniWhen}
                miniDate={miniDate}
                setMiniDate={setMiniDate}
                miniPriority={miniPriority}
                setMiniPriority={setMiniPriority}
                onSubmit={() => handleSubmit(company.id)}
              />
            ))}
            {magnatesNoTask.length > 10 ? (
              <li className="brief-list__more">
                +{magnatesNoTask.length - 10} más. Filtrá por Magnates en{" "}
                <a href="/" className="brief-link">
                  Clientes
                </a>
                .
              </li>
            ) : null}
          </ul>
        </BriefSection>
      ) : null}

      {proximosNoTask.length > 0 ? (
        <BriefSection
          title="🎯 Próximos sin tarea agendada"
          count={proximosNoTask.length}
          tone="violet"
          description="Listas para primer contacto. Agendá uno por uno."
        >
          <ul className="brief-list">
            {proximosNoTask.slice(0, 10).map((company) => (
              <BriefCompanyRow
                key={company.id}
                company={company}
                bucketLabel={BUCKET_LABEL.PROXIMOS}
                bucketMod="proximos"
                isOpen={agendaForId === company.id}
                flashed={flashId === company.id}
                onOpen={() => openAgendaFor(company.id, `Llamar a ${company.name}`)}
                onClose={() => setAgendaForId(null)}
                miniTitle={miniTitle}
                setMiniTitle={setMiniTitle}
                miniWhen={miniWhen}
                setMiniWhen={handleMiniWhen}
                miniDate={miniDate}
                setMiniDate={setMiniDate}
                miniPriority={miniPriority}
                setMiniPriority={setMiniPriority}
                onSubmit={() => handleSubmit(company.id)}
              />
            ))}
            {proximosNoTask.length > 10 ? (
              <li className="brief-list__more">
                +{proximosNoTask.length - 10} más. Filtrá por Próximos en{" "}
                <a href="/" className="brief-link">
                  Clientes
                </a>
                .
              </li>
            ) : null}
          </ul>
        </BriefSection>
      ) : null}

      {newCompanies.length > 0 ? (
        <BriefSection
          title="🆕 Nuevas esta semana"
          count={newCompanies.length}
          tone="neutral"
          description="Cargadas en los últimos 7 días."
        >
          <ul className="brief-list">
            {newCompanies.slice(0, 8).map((company) => (
              <li key={company.id} className="brief-list__row">
                <span
                  className={`bucket-badge bucket-badge--${BUCKET_MODIFIER[company.bucket]}`}
                >
                  {BUCKET_LABEL[company.bucket]}
                </span>
                <strong className="brief-list__title">{company.name}</strong>
              </li>
            ))}
          </ul>
        </BriefSection>
      ) : null}

      {dueSoonCount === 0 &&
      magnatesNoTask.length === 0 &&
      proximosNoTask.length === 0 ? (
        <p className="empty-state">
          🎉 No hay nada pendiente. Tomate un café y cargá una nueva empresa o tarea cuando quieras.
        </p>
      ) : null}
    </>
  );
}

function BriefSection({
  title,
  count,
  tone,
  description,
  children
}: {
  title: string;
  count: number;
  tone: "red" | "blue" | "violet" | "green" | "neutral";
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`brief-section brief-section--${tone}`}>
      <header className="brief-section__head">
        <h2>
          {title}
          <span className="brief-section__count">{count}</span>
        </h2>
        <p>{description}</p>
      </header>
      {children}
    </section>
  );
}

function BriefCompanyRow({
  company,
  bucketLabel,
  bucketMod,
  isOpen,
  flashed,
  onOpen,
  onClose,
  miniTitle,
  setMiniTitle,
  miniWhen,
  setMiniWhen,
  miniDate,
  setMiniDate,
  miniPriority,
  setMiniPriority,
  onSubmit
}: {
  company: CompanyItem;
  bucketLabel: string;
  bucketMod: string;
  isOpen: boolean;
  flashed: boolean;
  onOpen: () => void;
  onClose: () => void;
  miniTitle: string;
  setMiniTitle: (value: string) => void;
  miniWhen: "today" | "tomorrow" | "custom";
  setMiniWhen: (value: "today" | "tomorrow" | "custom") => void;
  miniDate: string;
  setMiniDate: (value: string) => void;
  miniPriority: Priority;
  setMiniPriority: (value: Priority) => void;
  onSubmit: () => void;
}) {
  return (
    <li className="brief-list__row">
      <span className={`bucket-badge bucket-badge--${bucketMod}`}>{bucketLabel}</span>
      <div className="brief-list__body">
        <strong className="brief-list__title">{company.name}</strong>
        <div className="brief-list__meta">
          {company.industry ? <span>{company.industry}</span> : null}
          {company.phone ? <span>📞 {company.phone}</span> : null}
          {company.email ? <span>✉ {company.email}</span> : null}
        </div>
        {isOpen ? (
          <form
            className="brief-mini__form"
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit();
            }}
          >
            <input
              type="text"
              className="brief-mini__title"
              value={miniTitle}
              onChange={(event) => setMiniTitle(event.target.value)}
              autoFocus
              placeholder="¿Qué hay que hacer?"
            />
            <div className="brief-mini__row">
              <div className="quick-add__when" role="group">
                <button
                  type="button"
                  className={miniWhen === "today" ? "chip chip--blue active" : "chip"}
                  onClick={() => setMiniWhen("today")}
                >
                  Hoy
                </button>
                <button
                  type="button"
                  className={miniWhen === "tomorrow" ? "chip chip--violet active" : "chip"}
                  onClick={() => setMiniWhen("tomorrow")}
                >
                  Mañana
                </button>
                <button
                  type="button"
                  className={miniWhen === "custom" ? "chip active" : "chip"}
                  onClick={() => setMiniWhen("custom")}
                >
                  Otra
                </button>
              </div>
              {miniWhen === "custom" ? (
                <input
                  type="date"
                  className="quick-add__date"
                  value={miniDate}
                  onChange={(event) => setMiniDate(event.target.value)}
                />
              ) : null}
              <select
                className="quick-add__priority"
                value={miniPriority}
                onChange={(event) => setMiniPriority(event.target.value as Priority)}
              >
                <option value="HIGH">Alta</option>
                <option value="MEDIUM">Media</option>
                <option value="LOW">Baja</option>
              </select>
            </div>
            <div className="brief-mini__actions">
              <button
                type="submit"
                className="save-button save-button--sm"
                disabled={!miniTitle.trim()}
              >
                Agendar
              </button>
              <button type="button" className="ghost-button" onClick={onClose}>
                Cancelar
              </button>
            </div>
          </form>
        ) : null}
      </div>
      <div className="brief-list__actions">
        {flashed ? (
          <span className="agenda-flash">✓ Agendada</span>
        ) : (
          <button
            type="button"
            className="bucket-action bucket-action--agendar"
            onClick={isOpen ? onClose : onOpen}
          >
            {isOpen ? "Cerrar" : "📅 Agendar"}
          </button>
        )}
      </div>
    </li>
  );
}
