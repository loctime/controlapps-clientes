"use server";

import {
  BillingCycle,
  CompanyStatus,
  Currency,
  PaymentStatus,
  ServiceStatus
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { addCycle, periodLabel } from "@/lib/billing";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getNullableString(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value ? value : null;
}

function getAmount(formData: FormData, key: string) {
  const value = Number(getString(formData, key).replace(",", "."));
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

// Las fechas de cobro son días de calendario, no instantes. Se guardan al
// mediodía UTC para que el día se lea igual desde Argentina y desde el server
// (que corre en Europe/Berlin): a medianoche local se corría un día.
function getDate(formData: FormData, key: string) {
  const value = getString(formData, key);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const [, year, month, day] = match;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12));

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function pickEnum<T extends Record<string, string>>(
  enumObject: T,
  raw: string,
  fallback: T[keyof T]
): T[keyof T] {
  return (Object.values(enumObject) as string[]).includes(raw) ? (raw as T[keyof T]) : fallback;
}

function refresh() {
  revalidatePath("/programas");
  revalidatePath("/historial");
  revalidatePath("/brief");
  revalidatePath("/empresas");
}

function serviceFields(formData: FormData) {
  return {
    name: getString(formData, "name"),
    scope: getNullableString(formData, "scope"),
    status: pickEnum(ServiceStatus, getString(formData, "status"), ServiceStatus.ACTIVO),
    amount: getAmount(formData, "amount"),
    currency: pickEnum(Currency, getString(formData, "currency"), Currency.ARS),
    billingCycle: pickEnum(BillingCycle, getString(formData, "billingCycle"), BillingCycle.MENSUAL),
    endDate: getDate(formData, "endDate"),
    nextDueDate: getDate(formData, "nextDueDate"),
    paymentMethod: getNullableString(formData, "paymentMethod"),
    needsInvoice: getString(formData, "needsInvoice") === "on",
    billingContact: getNullableString(formData, "billingContact"),
    billingEmail: getNullableString(formData, "billingEmail"),
    billingPhone: getNullableString(formData, "billingPhone"),
    infraCost: getAmount(formData, "infraCost"),
    infraNotes: getNullableString(formData, "infraNotes"),
    url: getNullableString(formData, "url"),
    repoUrl: getNullableString(formData, "repoUrl"),
    notes: getNullableString(formData, "notes")
  };
}

export async function createService(formData: FormData) {
  const db = getDb();
  const companyId = getString(formData, "companyId");
  const fields = serviceFields(formData);

  if (!companyId || !fields.name) {
    throw new Error("La empresa y el nombre del programa son obligatorios.");
  }

  const startDate = getDate(formData, "startDate") ?? new Date();

  await db.service.create({
    data: { ...fields, companyId, startDate }
  });

  // Un programa activo implica que la empresa ya es cliente, no un prospecto.
  if (fields.status === ServiceStatus.ACTIVO) {
    await db.company.update({
      where: { id: companyId },
      data: { status: CompanyStatus.CLIENT }
    });
  }

  refresh();
}

export async function updateService(formData: FormData) {
  const db = getDb();
  const serviceId = getString(formData, "serviceId");
  const fields = serviceFields(formData);

  if (!serviceId || !fields.name) {
    throw new Error("El programa es obligatorio.");
  }

  const startDate = getDate(formData, "startDate");

  await db.service.update({
    where: { id: serviceId },
    data: startDate ? { ...fields, startDate } : fields
  });

  refresh();
}

export async function deleteService(formData: FormData) {
  const db = getDb();
  const serviceId = getString(formData, "serviceId");
  if (!serviceId) return;

  await db.service.delete({ where: { id: serviceId } });

  refresh();
}

export async function generatePayment(formData: FormData) {
  const db = getDb();
  const serviceId = getString(formData, "serviceId");
  if (!serviceId) return;

  const service = await db.service.findUnique({ where: { id: serviceId } });
  if (!service) return;

  const dueDate = service.nextDueDate ?? new Date();

  await db.payment.create({
    data: {
      serviceId: service.id,
      concept: periodLabel(dueDate, service.billingCycle),
      amount: service.amount,
      currency: service.currency,
      dueDate,
      status: PaymentStatus.PENDIENTE,
      method: service.paymentMethod
    }
  });

  // Los ciclos no recurrentes no tienen "próximo" que calcular solo.
  const recurring = ["MENSUAL", "TRIMESTRAL", "ANUAL"].includes(service.billingCycle);

  await db.service.update({
    where: { id: service.id },
    data: { nextDueDate: recurring ? addCycle(dueDate, service.billingCycle) : null }
  });

  refresh();
}

export async function createPayment(formData: FormData) {
  const db = getDb();
  const serviceId = getString(formData, "serviceId");
  const concept = getString(formData, "concept");

  if (!serviceId || !concept) {
    throw new Error("El programa y el concepto son obligatorios.");
  }

  const service = await db.service.findUnique({ where: { id: serviceId } });
  if (!service) return;

  const isPaid = getString(formData, "markPaid") === "on";

  await db.payment.create({
    data: {
      serviceId,
      concept,
      amount: getAmount(formData, "amount") || service.amount,
      currency: pickEnum(Currency, getString(formData, "currency"), service.currency),
      dueDate: getDate(formData, "dueDate") ?? new Date(),
      status: isPaid ? PaymentStatus.PAGADO : PaymentStatus.PENDIENTE,
      paidAt: isPaid ? new Date() : null,
      method: getNullableString(formData, "method") ?? service.paymentMethod,
      invoiceNumber: getNullableString(formData, "invoiceNumber"),
      notes: getNullableString(formData, "notes")
    }
  });

  refresh();
}

export async function togglePaymentPaid(formData: FormData) {
  const db = getDb();
  const paymentId = getString(formData, "paymentId");
  if (!paymentId) return;

  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment) return;

  const nowPaid = payment.status !== PaymentStatus.PAGADO;

  await db.payment.update({
    where: { id: paymentId },
    data: {
      status: nowPaid ? PaymentStatus.PAGADO : PaymentStatus.PENDIENTE,
      paidAt: nowPaid ? new Date() : null
    }
  });

  refresh();
}

export async function updatePaymentInvoice(formData: FormData) {
  const db = getDb();
  const paymentId = getString(formData, "paymentId");
  if (!paymentId) return;

  await db.payment.update({
    where: { id: paymentId },
    data: {
      invoiceNumber: getNullableString(formData, "invoiceNumber"),
      method: getNullableString(formData, "method"),
      notes: getNullableString(formData, "notes")
    }
  });

  refresh();
}

export async function deletePayment(formData: FormData) {
  const db = getDb();
  const paymentId = getString(formData, "paymentId");
  if (!paymentId) return;

  await db.payment.delete({ where: { id: paymentId } });

  refresh();
}
