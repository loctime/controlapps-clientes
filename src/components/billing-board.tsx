"use client";

import { useMemo, useState, useTransition } from "react";

type Currency = "ARS" | "USD";
type ServiceStatus = "PROPUESTA" | "ACTIVO" | "PAUSADO" | "FINALIZADO";
type BillingCycle = "MENSUAL" | "TRIMESTRAL" | "ANUAL" | "UNICO" | "POR_HITO";
type PaymentStatus = "PENDIENTE" | "PAGADO" | "ANULADO";

export type PaymentItem = {
  id: string;
  serviceId: string;
  serviceName: string;
  companyName: string;
  concept: string;
  amount: number;
  currency: Currency;
  dueDate: string;
  paidAt: string | null;
  status: PaymentStatus;
  method: string | null;
  invoiceNumber: string | null;
  notes: string | null;
};

export type ServiceItem = {
  id: string;
  companyId: string;
  companyName: string;
  name: string;
  scope: string | null;
  status: ServiceStatus;
  amount: number;
  currency: Currency;
  billingCycle: BillingCycle;
  startDate: string;
  endDate: string | null;
  nextDueDate: string | null;
  paymentMethod: string | null;
  needsInvoice: boolean;
  billingContact: string | null;
  billingEmail: string | null;
  billingPhone: string | null;
  infraCost: number;
  infraNotes: string | null;
  url: string | null;
  repoUrl: string | null;
  notes: string | null;
  payments: PaymentItem[];
};

type CompanyOption = { id: string; name: string };

type Stats = {
  mrr: Record<Currency, number>;
  collectedThisMonth: Record<Currency, number>;
  pending: Record<Currency, number>;
  overdue: Record<Currency, number>;
  infraMonthlyUsd: number;
  activeCount: number;
  overdueCount: number;
};

const STATUS_LABEL: Record<ServiceStatus, string> = {
  PROPUESTA: "Propuesta",
  ACTIVO: "Activo",
  PAUSADO: "Pausado",
  FINALIZADO: "Finalizado"
};

const STATUS_MODIFIER: Record<ServiceStatus, string> = {
  PROPUESTA: "propuesta",
  ACTIVO: "activo",
  PAUSADO: "pausado",
  FINALIZADO: "finalizado"
};

const CYCLE_LABEL: Record<BillingCycle, string> = {
  MENSUAL: "por mes",
  TRIMESTRAL: "por trimestre",
  ANUAL: "por año",
  UNICO: "pago único",
  POR_HITO: "por hito"
};

const SERVICE_TABS: Array<{ key: ServiceStatus | "TODOS"; label: string }> = [
  { key: "ACTIVO", label: "Activos" },
  { key: "PROPUESTA", label: "Propuestas" },
  { key: "PAUSADO", label: "Pausados" },
  { key: "FINALIZADO", label: "Finalizados" },
  { key: "TODOS", label: "Todos" }
];

function money(amount: number, currency: Currency) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(amount);
}

function dateLabel(iso: string | null) {
  if (!iso) return "Sin fecha";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Sin fecha";

  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}/${date.getFullYear()}`;
}

function inputDate(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function daysFromToday(iso: string) {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const target = new Date(iso);
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}

function dueLabel(iso: string) {
  const days = daysFromToday(iso);
  if (days < 0) return `Vencido hace ${Math.abs(days)} d`;
  if (days === 0) return "Vence hoy";
  if (days === 1) return "Vence mañana";
  return `En ${days} días`;
}

function TotalsPill({
  label,
  totals,
  modifier
}: {
  label: string;
  totals: Record<Currency, number>;
  modifier: string;
}) {
  const parts = (["ARS", "USD"] as Currency[]).filter((currency) => totals[currency] > 0);

  return (
    <div className={`stat-pill stat-pill--${modifier}`}>
      <span className="stat-value">
        {parts.length === 0 ? money(0, "ARS") : parts.map((c) => money(totals[c], c)).join("  ·  ")}
      </span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

export function BillingBoard({
  services,
  companies,
  overduePayments,
  upcomingPayments,
  stats,
  createServiceAction,
  updateServiceAction,
  deleteServiceAction,
  generatePaymentAction,
  createPaymentAction,
  togglePaymentAction,
  deletePaymentAction
}: {
  services: ServiceItem[];
  companies: CompanyOption[];
  overduePayments: PaymentItem[];
  upcomingPayments: PaymentItem[];
  stats: Stats;
  createServiceAction: (formData: FormData) => void;
  updateServiceAction: (formData: FormData) => void;
  deleteServiceAction: (formData: FormData) => void;
  generatePaymentAction: (formData: FormData) => void;
  createPaymentAction: (formData: FormData) => void;
  togglePaymentAction: (formData: FormData) => void;
  deletePaymentAction: (formData: FormData) => void;
}) {
  const [, startTransition] = useTransition();
  const [tab, setTab] = useState<ServiceStatus | "TODOS">("ACTIVO");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [chargeForId, setChargeForId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const base: Record<string, number> = { TODOS: services.length };
    for (const tabDef of SERVICE_TABS) {
      if (tabDef.key === "TODOS") continue;
      base[tabDef.key] = services.filter((service) => service.status === tabDef.key).length;
    }
    return base;
  }, [services]);

  const visibleServices = useMemo(
    () => (tab === "TODOS" ? services : services.filter((service) => service.status === tab)),
    [services, tab]
  );

  const cobros = [...overduePayments, ...upcomingPayments];

  const submit = (action: (formData: FormData) => void, formData: FormData) => {
    startTransition(() => action(formData));
  };

  return (
    <>
      <section className="agenda-hero">
        <div className="agenda-hero__top">
          <div>
            <p className="agenda-hero__greeting">Programas y cobros</p>
            <h1>
              {stats.activeCount} {stats.activeCount === 1 ? "programa activo" : "programas activos"}
            </h1>
          </div>
        </div>

        <p className="agenda-hero__summary">
          {stats.overdueCount > 0
            ? `${stats.overdueCount} ${
                stats.overdueCount === 1 ? "cobro vencido" : "cobros vencidos"
              } esperando.`
            : "Ningún cobro vencido. Todo al día."}
        </p>

        <div className="agenda-hero__stats">
          <TotalsPill label="Ingreso mensual" totals={stats.mrr} modifier="violet" />
          <TotalsPill label="Cobrado este mes" totals={stats.collectedThisMonth} modifier="green" />
          <TotalsPill label="Por cobrar" totals={stats.pending} modifier="blue" />
          <TotalsPill label="Vencido" totals={stats.overdue} modifier="red" />
          <div className="stat-pill">
            <span className="stat-value">{money(stats.infraMonthlyUsd, "USD")}</span>
            <span className="stat-label">Infra por mes</span>
          </div>
        </div>
      </section>

      <section className="billing-section">
        <div className="billing-section__head">
          <h2>Quién me debe</h2>
          <span className="billing-section__meta">
            {cobros.length} {cobros.length === 1 ? "cobro abierto" : "cobros abiertos"}
          </span>
        </div>

        {cobros.length === 0 ? (
          <div className="empty-state">
            <strong>Sin cobros pendientes.</strong>
            <span>Generá el próximo desde cada programa.</span>
          </div>
        ) : (
          <ul className="payment-list">
            {cobros.map((payment) => {
              const overdue = daysFromToday(payment.dueDate) < 0;

              return (
                <li
                  key={payment.id}
                  className={`payment-row${overdue ? " payment-row--overdue" : ""}`}
                >
                  <form
                    action={(formData) => submit(togglePaymentAction, formData)}
                    className="payment-row__check"
                  >
                    <input type="hidden" name="paymentId" value={payment.id} />
                    <button type="submit" className="task-check" title="Marcar como cobrado">
                      ✓
                    </button>
                  </form>

                  <div className="payment-row__body">
                    <div className="payment-row__head">
                      <strong>{payment.companyName}</strong>
                      <span className="payment-row__amount">
                        {money(payment.amount, payment.currency)}
                      </span>
                    </div>
                    <div className="payment-row__meta">
                      <span>{payment.serviceName}</span>
                      <span>· {payment.concept}</span>
                      <span className={overdue ? "task-due task-due--overdue" : "task-due"}>
                        {dateLabel(payment.dueDate)} · {dueLabel(payment.dueDate)}
                      </span>
                      {payment.invoiceNumber ? <span>· Fact. {payment.invoiceNumber}</span> : null}
                    </div>
                  </div>

                  <form action={(formData) => submit(deletePaymentAction, formData)}>
                    <input type="hidden" name="paymentId" value={payment.id} />
                    <button
                      type="submit"
                      className="icon-button icon-button--danger"
                      title="Eliminar cobro"
                    >
                      ✕
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="bucket-tabs">
        {SERVICE_TABS.map((tabDef) => (
          <button
            key={tabDef.key}
            type="button"
            className={`bucket-tab${tab === tabDef.key ? " active" : ""}`}
            onClick={() => setTab(tabDef.key)}
          >
            {tabDef.label}
            <span className="bucket-count">{counts[tabDef.key] ?? 0}</span>
          </button>
        ))}

        <button
          type="button"
          className={`bucket-tab bucket-tab--new${creating ? " active" : ""}`}
          onClick={() => setCreating((value) => !value)}
        >
          {creating ? "Cancelar" : "+ Programa"}
        </button>
      </div>

      {creating ? (
        <form
          className="service-form"
          action={(formData) => {
            submit(createServiceAction, formData);
            setCreating(false);
          }}
        >
          <h3>Nuevo programa</h3>
          <ServiceFields companies={companies} />
          <button type="submit" className="save-button">
            Crear programa
          </button>
        </form>
      ) : null}

      {visibleServices.length === 0 ? (
        <div className="empty-state">
          <strong>No hay programas acá.</strong>
          <span>Creá uno con el botón + Programa.</span>
        </div>
      ) : (
        <ul className="service-list">
          {visibleServices.map((service) => {
            const margin = service.currency === "USD" ? service.amount - service.infraCost : null;

            return (
              <li key={service.id} className="service-card">
                <div className="service-card__head">
                  <div>
                    <span
                      className={`bucket-badge bucket-badge--${STATUS_MODIFIER[service.status]}`}
                    >
                      {STATUS_LABEL[service.status]}
                    </span>
                    <h3>{service.companyName}</h3>
                    <p className="service-card__name">{service.name}</p>
                  </div>
                  <div className="service-card__price">
                    <strong>{money(service.amount, service.currency)}</strong>
                    <span>{CYCLE_LABEL[service.billingCycle]}</span>
                  </div>
                </div>

                {service.scope ? <p className="service-card__scope">{service.scope}</p> : null}

                <dl className="service-card__grid">
                  <div>
                    <dt>Próximo cobro</dt>
                    <dd>{dateLabel(service.nextDueDate)}</dd>
                  </div>
                  <div>
                    <dt>Desde</dt>
                    <dd>{dateLabel(service.startDate)}</dd>
                  </div>
                  <div>
                    <dt>Cobro por</dt>
                    <dd>{service.paymentMethod ?? "Sin definir"}</dd>
                  </div>
                  <div>
                    <dt>Factura</dt>
                    <dd>{service.needsInvoice ? "Sí, emite factura" : "No hace falta"}</dd>
                  </div>
                  <div>
                    <dt>Contacto de pagos</dt>
                    <dd>{service.billingContact ?? "Sin definir"}</dd>
                  </div>
                  <div>
                    <dt>Infra</dt>
                    <dd>
                      {money(service.infraCost, "USD")} / mes
                      {margin !== null ? ` · margen ${money(margin, "USD")}` : ""}
                    </dd>
                  </div>
                </dl>

                {service.billingEmail || service.billingPhone ? (
                  <p className="service-card__contact">
                    {service.billingEmail ? <span>{service.billingEmail}</span> : null}
                    {service.billingPhone ? <span>{service.billingPhone}</span> : null}
                  </p>
                ) : null}

                {service.url || service.repoUrl ? (
                  <p className="service-card__links">
                    {service.url ? (
                      <a href={service.url} target="_blank" rel="noreferrer">
                        {service.url}
                      </a>
                    ) : null}
                    {service.repoUrl ? (
                      <a href={service.repoUrl} target="_blank" rel="noreferrer">
                        repo
                      </a>
                    ) : null}
                  </p>
                ) : null}

                {service.notes ? <p className="service-card__notes">{service.notes}</p> : null}

                <div className="service-card__actions">
                  <form action={(formData) => submit(generatePaymentAction, formData)}>
                    <input type="hidden" name="serviceId" value={service.id} />
                    <button type="submit" className="bucket-action bucket-action--proximos">
                      Generar cobro
                    </button>
                  </form>

                  <button
                    type="button"
                    className={`bucket-action bucket-action--agendar${
                      chargeForId === service.id ? " active" : ""
                    }`}
                    onClick={() =>
                      setChargeForId((value) => (value === service.id ? null : service.id))
                    }
                  >
                    Cargar pago
                  </button>

                  <button
                    type="button"
                    className={`bucket-action${editingId === service.id ? " active" : ""}`}
                    onClick={() =>
                      setEditingId((value) => (value === service.id ? null : service.id))
                    }
                  >
                    {editingId === service.id ? "Cerrar" : "Editar"}
                  </button>

                  <form action={(formData) => submit(deleteServiceAction, formData)}>
                    <input type="hidden" name="serviceId" value={service.id} />
                    <button
                      type="submit"
                      className="bucket-action bucket-action--unassign"
                      title="Elimina el programa y sus cobros"
                    >
                      Eliminar
                    </button>
                  </form>
                </div>

                {chargeForId === service.id ? (
                  <form
                    className="payment-form"
                    action={(formData) => {
                      submit(createPaymentAction, formData);
                      setChargeForId(null);
                    }}
                  >
                    <input type="hidden" name="serviceId" value={service.id} />
                    <input
                      className="quick-add__title"
                      name="concept"
                      placeholder="Concepto (ej. Julio 2026)"
                      required
                    />
                    <div className="payment-form__row">
                      <input
                        className="quick-add__date"
                        name="amount"
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={service.amount}
                      />
                      <select
                        className="quick-add__priority"
                        name="currency"
                        defaultValue={service.currency}
                      >
                        <option value="ARS">ARS</option>
                        <option value="USD">USD</option>
                      </select>
                      <input className="quick-add__date" name="dueDate" type="date" />
                      <input
                        className="quick-add__date"
                        name="invoiceNumber"
                        placeholder="N° factura"
                      />
                      <label className="option-pill">
                        <input type="checkbox" name="markPaid" />
                        <span>Ya cobrado</span>
                      </label>
                      <button type="submit" className="quick-add__submit">
                        Guardar
                      </button>
                    </div>
                  </form>
                ) : null}

                {editingId === service.id ? (
                  <form
                    className="service-form"
                    action={(formData) => {
                      submit(updateServiceAction, formData);
                      setEditingId(null);
                    }}
                  >
                    <input type="hidden" name="serviceId" value={service.id} />
                    <ServiceFields companies={companies} service={service} />
                    <button type="submit" className="save-button">
                      Guardar cambios
                    </button>
                  </form>
                ) : null}

                {service.payments.length > 0 ? (
                  <details className="service-history">
                    <summary>Historial ({service.payments.length})</summary>
                    <ul>
                      {service.payments.map((payment) => (
                        <li key={payment.id}>
                          <form action={(formData) => submit(togglePaymentAction, formData)}>
                            <input type="hidden" name="paymentId" value={payment.id} />
                            <button
                              type="submit"
                              className={`history-status history-status--${payment.status.toLowerCase()}`}
                            >
                              {payment.status === "PAGADO" ? "Cobrado" : "Pendiente"}
                            </button>
                          </form>
                          <span>{payment.concept}</span>
                          <span>{money(payment.amount, payment.currency)}</span>
                          <span>
                            {payment.status === "PAGADO"
                              ? `Cobrado ${dateLabel(payment.paidAt)}`
                              : `Vence ${dateLabel(payment.dueDate)}`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function ServiceFields({
  companies,
  service
}: {
  companies: CompanyOption[];
  service?: ServiceItem;
}) {
  return (
    <div className="service-form__grid">
      <label>
        Empresa
        {service ? (
          <input value={service.companyName} disabled />
        ) : (
          <select name="companyId" required defaultValue="">
            <option value="" disabled>
              Elegí una empresa
            </option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        )}
      </label>

      <label>
        Programa
        <input name="name" defaultValue={service?.name ?? ""} required />
      </label>

      <label>
        Estado
        <select name="status" defaultValue={service?.status ?? "ACTIVO"}>
          <option value="PROPUESTA">Propuesta</option>
          <option value="ACTIVO">Activo</option>
          <option value="PAUSADO">Pausado</option>
          <option value="FINALIZADO">Finalizado</option>
        </select>
      </label>

      <label>
        Monto
        <input
          name="amount"
          type="number"
          step="0.01"
          min="0"
          defaultValue={service?.amount ?? 0}
        />
      </label>

      <label>
        Moneda
        <select name="currency" defaultValue={service?.currency ?? "ARS"}>
          <option value="ARS">ARS</option>
          <option value="USD">USD</option>
        </select>
      </label>

      <label>
        Ciclo
        <select name="billingCycle" defaultValue={service?.billingCycle ?? "MENSUAL"}>
          <option value="MENSUAL">Mensual</option>
          <option value="TRIMESTRAL">Trimestral</option>
          <option value="ANUAL">Anual</option>
          <option value="UNICO">Pago único</option>
          <option value="POR_HITO">Por hito</option>
        </select>
      </label>

      <label>
        Inicio
        <input name="startDate" type="date" defaultValue={inputDate(service?.startDate ?? null)} />
      </label>

      <label>
        Próximo cobro
        <input
          name="nextDueDate"
          type="date"
          defaultValue={inputDate(service?.nextDueDate ?? null)}
        />
      </label>

      <label>
        Fin (opcional)
        <input name="endDate" type="date" defaultValue={inputDate(service?.endDate ?? null)} />
      </label>

      <label>
        Cobro por
        <input
          name="paymentMethod"
          placeholder="Transferencia, MP, USD efectivo…"
          defaultValue={service?.paymentMethod ?? ""}
        />
      </label>

      <label>
        Contacto de pagos
        <input name="billingContact" defaultValue={service?.billingContact ?? ""} />
      </label>

      <label>
        Email de pagos
        <input name="billingEmail" type="email" defaultValue={service?.billingEmail ?? ""} />
      </label>

      <label>
        Teléfono de pagos
        <input name="billingPhone" defaultValue={service?.billingPhone ?? ""} />
      </label>

      <label>
        Costo infra (USD/mes)
        <input
          name="infraCost"
          type="number"
          step="0.01"
          min="0"
          defaultValue={service?.infraCost ?? 0}
        />
      </label>

      <label>
        Detalle infra
        <input
          name="infraNotes"
          placeholder="VPS, Vercel, B2…"
          defaultValue={service?.infraNotes ?? ""}
        />
      </label>

      <label>
        URL
        <input name="url" defaultValue={service?.url ?? ""} />
      </label>

      <label>
        Repo
        <input name="repoUrl" defaultValue={service?.repoUrl ?? ""} />
      </label>

      <label className="option-pill option-pill--inline">
        <input type="checkbox" name="needsInvoice" defaultChecked={service?.needsInvoice ?? false} />
        <span>Requiere factura</span>
      </label>

      <label className="service-form__wide">
        Alcance acordado
        <textarea name="scope" rows={2} defaultValue={service?.scope ?? ""} />
      </label>

      <label className="service-form__wide">
        Notas
        <textarea name="notes" rows={2} defaultValue={service?.notes ?? ""} />
      </label>
    </div>
  );
}
