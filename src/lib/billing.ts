import { BillingCycle, Currency, PaymentStatus, ServiceStatus } from "@prisma/client";
import { getDb } from "@/lib/db";

export type CurrencyTotals = Record<Currency, number>;

function emptyTotals(): CurrencyTotals {
  return { ARS: 0, USD: 0 };
}

// Cuánto representa por mes un servicio según su ciclo. Los cobros únicos y por
// hito no son recurrentes, así que no suman al MRR.
const MONTHLY_FACTOR: Record<BillingCycle, number> = {
  MENSUAL: 1,
  TRIMESTRAL: 1 / 3,
  ANUAL: 1 / 12,
  UNICO: 0,
  POR_HITO: 0
};

export function monthlyValue(amount: number, cycle: BillingCycle) {
  return amount * MONTHLY_FACTOR[cycle];
}

export function addCycle(date: Date, cycle: BillingCycle) {
  const next = new Date(date);

  if (cycle === "MENSUAL") next.setMonth(next.getMonth() + 1);
  if (cycle === "TRIMESTRAL") next.setMonth(next.getMonth() + 3);
  if (cycle === "ANUAL") next.setFullYear(next.getFullYear() + 1);

  return next;
}

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

export function periodLabel(date: Date, cycle: BillingCycle) {
  if (cycle === "UNICO") return "Pago único";
  if (cycle === "POR_HITO") return "Hito";
  if (cycle === "ANUAL") return `Año ${date.getFullYear()}`;
  if (cycle === "TRIMESTRAL") {
    return `Trimestre desde ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
  }

  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

export async function getBillingData() {
  const db = getDb();

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [services, payments, companies] = await Promise.all([
    db.service.findMany({
      include: {
        company: { select: { id: true, name: true } },
        payments: { orderBy: [{ dueDate: "desc" }], take: 12 }
      },
      orderBy: [{ status: "asc" }, { nextDueDate: "asc" }, { createdAt: "asc" }]
    }),
    db.payment.findMany({
      include: {
        service: {
          select: {
            id: true,
            name: true,
            company: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: [{ dueDate: "asc" }]
    }),
    db.company.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    })
  ]);

  const activeServices = services.filter((service) => service.status === ServiceStatus.ACTIVO);

  const mrr = emptyTotals();
  const infraMonthly = { USD: 0 };

  for (const service of activeServices) {
    mrr[service.currency] += monthlyValue(service.amount, service.billingCycle);
    infraMonthly.USD += service.infraCost;
  }

  const collectedThisMonth = emptyTotals();
  const pending = emptyTotals();
  const overdue = emptyTotals();

  const overduePayments: typeof payments = [];
  const upcomingPayments: typeof payments = [];

  for (const payment of payments) {
    if (payment.status === PaymentStatus.ANULADO) continue;

    if (payment.status === PaymentStatus.PAGADO) {
      if (payment.paidAt && payment.paidAt >= startOfMonth && payment.paidAt < startOfNextMonth) {
        collectedThisMonth[payment.currency] += payment.amount;
      }
      continue;
    }

    if (payment.dueDate < startOfToday) {
      overdue[payment.currency] += payment.amount;
      overduePayments.push(payment);
    } else {
      pending[payment.currency] += payment.amount;
      upcomingPayments.push(payment);
    }
  }

  return {
    services,
    companies,
    overduePayments,
    upcomingPayments: upcomingPayments.slice(0, 20),
    stats: {
      mrr,
      collectedThisMonth,
      pending,
      overdue,
      infraMonthlyUsd: infraMonthly.USD,
      activeCount: activeServices.length,
      overdueCount: overduePayments.length
    }
  };
}
