"use client";

import { useMemo, useState, useTransition } from "react";

type Currency = "ARS" | "USD";
type PaymentStatus = "PENDIENTE" | "PAGADO" | "ANULADO";

export type HistoryPayment = {
  id: string;
  companyName: string;
  serviceName: string;
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

type CompanyOption = { id: string; name: string };

const STATUS_TABS: Array<{ key: PaymentStatus | "VENCIDO" | "TODOS"; label: string }> = [
  { key: "TODOS", label: "Todos" },
  { key: "PAGADO", label: "Pagados" },
  { key: "PENDIENTE", label: "Pendientes" },
  { key: "VENCIDO", label: "Vencidos" },
  { key: "ANULADO", label: "Anulados" }
];

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre"
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

  return `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(
    2,
    "0"
  )}/${date.getUTCFullYear()}`;
}

function monthKey(iso: string) {
  const date = new Date(iso);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

function isOverdue(payment: HistoryPayment) {
  if (payment.status !== "PENDIENTE") return false;
  const today = new Date();
  const startOfToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return new Date(payment.dueDate).getTime() < startOfToday;
}

const STATUS_LABEL: Record<PaymentStatus, string> = {
  PAGADO: "Cobrado",
  PENDIENTE: "Pendiente",
  ANULADO: "Anulado"
};

export function HistoryBoard({
  payments,
  companies,
  totalCollected,
  togglePaymentAction,
  updatePaymentAction,
  deletePaymentAction
}: {
  payments: HistoryPayment[];
  companies: CompanyOption[];
  totalCollected: Record<Currency, number>;
  togglePaymentAction: (formData: FormData) => void;
  updatePaymentAction: (formData: FormData) => void;
  deletePaymentAction: (formData: FormData) => void;
}) {
  const [, startTransition] = useTransition();
  const [companyId, setCompanyId] = useState("TODAS");
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "VENCIDO" | "TODOS">("TODOS");
  const [editingId, setEditingId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const base: Record<string, number> = { TODOS: payments.length };
    for (const tab of STATUS_TABS) {
      if (tab.key === "TODOS") continue;
      base[tab.key] =
        tab.key === "VENCIDO"
          ? payments.filter(isOverdue).length
          : payments.filter((payment) => payment.status === tab.key).length;
    }
    return base;
  }, [payments]);

  const filtered = useMemo(() => {
    return payments.filter((payment) => {
      if (companyId !== "TODAS" && payment.companyName !== companyId) return false;
      if (statusFilter === "TODOS") return true;
      if (statusFilter === "VENCIDO") return isOverdue(payment);
      return payment.status === statusFilter;
    });
  }, [payments, companyId, statusFilter]);

  const groups = useMemo(() => {
    const map = new Map<string, HistoryPayment[]>();
    for (const payment of filtered) {
      const key = monthKey(payment.dueDate);
      const list = map.get(key) ?? [];
      list.push(payment);
      map.set(key, list);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtered]);

  const submit = (action: (formData: FormData) => void, formData: FormData) => {
    startTransition(() => action(formData));
  };

  const collectedParts = (["ARS", "USD"] as Currency[]).filter(
    (currency) => totalCollected[currency] > 0
  );

  return (
    <>
      <section className="agenda-hero">
        <div className="agenda-hero__top">
          <div>
            <p className="agenda-hero__greeting">Historial</p>
            <h1>{payments.length} cobros registrados</h1>
          </div>
        </div>

        <p className="agenda-hero__summary">
          {collectedParts.length === 0
            ? "Todavía no cobraste nada."
            : `Cobrado histórico: ${collectedParts
                .map((currency) => money(totalCollected[currency], currency))
                .join("  ·  ")}`}
        </p>
      </section>

      <div className="history-filters">
        <select
          className="quick-add__company"
          value={companyId}
          onChange={(event) => setCompanyId(event.target.value)}
        >
          <option value="TODAS">Todas las empresas</option>
          {companies.map((company) => (
            <option key={company.id} value={company.name}>
              {company.name}
            </option>
          ))}
        </select>

        <div className="bucket-tabs history-filters__tabs">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`bucket-tab${statusFilter === tab.key ? " active" : ""}`}
              onClick={() => setStatusFilter(tab.key)}
            >
              {tab.label}
              <span className="bucket-count">{counts[tab.key] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <strong>No hay cobros para este filtro.</strong>
          <span>Probá con otra empresa o estado.</span>
        </div>
      ) : (
        groups.map(([key, groupPayments]) => (
          <section key={key} className="history-month">
            <h2 className="history-month__title">{monthLabel(key)}</h2>
            <ul className="payment-list">
              {groupPayments.map((payment) => {
                const overdue = isOverdue(payment);

                return (
                  <li key={payment.id} className="history-entry">
                    <div
                      className={`payment-row${overdue ? " payment-row--overdue" : ""}`}
                    >
                      <form action={(formData) => submit(togglePaymentAction, formData)}>
                        <input type="hidden" name="paymentId" value={payment.id} />
                        <button
                          type="submit"
                          className="task-check"
                          aria-pressed={payment.status === "PAGADO"}
                          title={payment.status === "PAGADO" ? "Marcar pendiente" : "Marcar cobrado"}
                        >
                          {payment.status === "PAGADO" ? "✓" : ""}
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
                          <span
                            className={`history-status history-status--${payment.status.toLowerCase()}`}
                          >
                            {STATUS_LABEL[payment.status]}
                          </span>
                          <span className={overdue ? "task-due task-due--overdue" : "task-due"}>
                            {payment.status === "PAGADO"
                              ? `Cobrado ${dateLabel(payment.paidAt)}`
                              : `Vence ${dateLabel(payment.dueDate)}`}
                          </span>
                          {payment.method ? <span>· {payment.method}</span> : null}
                          {payment.invoiceNumber ? <span>· Fact. {payment.invoiceNumber}</span> : null}
                        </div>
                        {payment.notes ? <p className="service-card__notes">{payment.notes}</p> : null}
                      </div>

                      <button
                        type="button"
                        className={`bucket-action${editingId === payment.id ? " active" : ""}`}
                        onClick={() =>
                          setEditingId((value) => (value === payment.id ? null : payment.id))
                        }
                      >
                        Editar
                      </button>

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
                    </div>

                    {editingId === payment.id ? (
                      <form
                        className="payment-form history-edit"
                        action={(formData) => {
                          submit(updatePaymentAction, formData);
                          setEditingId(null);
                        }}
                      >
                        <input type="hidden" name="paymentId" value={payment.id} />
                        <div className="payment-form__row">
                          <input
                            className="quick-add__date"
                            name="method"
                            placeholder="Método de cobro"
                            defaultValue={payment.method ?? ""}
                          />
                          <input
                            className="quick-add__date"
                            name="invoiceNumber"
                            placeholder="N° factura"
                            defaultValue={payment.invoiceNumber ?? ""}
                          />
                          <input
                            className="quick-add__date"
                            name="notes"
                            placeholder="Notas"
                            defaultValue={payment.notes ?? ""}
                          />
                          <button type="submit" className="quick-add__submit">
                            Guardar
                          </button>
                        </div>
                      </form>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </>
  );
}
