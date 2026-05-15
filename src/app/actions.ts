"use server";

import { CompanyCategory, CompanyStatus, InteractionType, TaskStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import {
  sanitizeFilters,
  sanitizeOfferings,
  serializeFilters,
  serializeOfferings
} from "@/lib/taxonomy";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getNullableString(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value ? value : null;
}

export async function createCompany(formData: FormData) {
  const name = getString(formData, "name");
  if (!name) {
    throw new Error("El nombre es obligatorio.");
  }

  const db = getDb();
  const company = await db.company.create({
    data: {
      name,
      status: (getString(formData, "status") || CompanyStatus.LEAD) as CompanyStatus,
      industry: getNullableString(formData, "industry"),
      website: getNullableString(formData, "website"),
      phone: getNullableString(formData, "phone"),
      email: getNullableString(formData, "email"),
      city: getNullableString(formData, "city"),
      country: getNullableString(formData, "country"),
      notes: getNullableString(formData, "notes"),
      potentialValue: Number(getString(formData, "potentialValue")) || null
    }
  });

  revalidatePath("/");
  revalidatePath("/companies");
  redirect(`/companies/${company.id}`);
}

export async function createContact(formData: FormData) {
  const db = getDb();
  const companyId = getString(formData, "companyId");
  const name = getString(formData, "name");

  if (!companyId || !name) {
    throw new Error("La empresa y el nombre del contacto son obligatorios.");
  }

  const isPrimary = getString(formData, "isPrimary") === "on";

  if (isPrimary) {
    await db.contact.updateMany({
      where: { companyId, isPrimary: true },
      data: { isPrimary: false }
    });
  }

  await db.contact.create({
    data: {
      companyId,
      name,
      role: getNullableString(formData, "role"),
      email: getNullableString(formData, "email"),
      phone: getNullableString(formData, "phone"),
      isPrimary
    }
  });

  revalidatePath(`/companies/${companyId}`);
}

export async function createInteraction(formData: FormData) {
  const db = getDb();
  const companyId = getString(formData, "companyId");
  const subject = getString(formData, "subject");

  if (!companyId || !subject) {
    throw new Error("La empresa y el asunto son obligatorios.");
  }

  await db.interaction.create({
    data: {
      companyId,
      subject,
      type: (getString(formData, "type") || InteractionType.NOTE) as InteractionType,
      detail: getNullableString(formData, "detail"),
      happenedAt: getString(formData, "happenedAt")
        ? new Date(getString(formData, "happenedAt"))
        : new Date()
    }
  });

  revalidatePath("/");
  revalidatePath("/companies");
  revalidatePath(`/companies/${companyId}`);
}

export async function createTask(formData: FormData) {
  const db = getDb();
  const companyId = getString(formData, "companyId");
  const title = getString(formData, "title");

  if (!companyId || !title) {
    throw new Error("La empresa y el título son obligatorios.");
  }

  await db.task.create({
    data: {
      companyId,
      title,
      detail: getNullableString(formData, "detail"),
      status: (getString(formData, "status") || TaskStatus.PENDING) as TaskStatus,
      dueDate: getString(formData, "dueDate") ? new Date(getString(formData, "dueDate")) : null
    }
  });

  revalidatePath("/");
  revalidatePath("/companies");
  revalidatePath(`/companies/${companyId}`);
}

export async function updateCompanyComment(formData: FormData) {
  const db = getDb();
  const companyId = getString(formData, "companyId");

  if (!companyId) {
    throw new Error("La empresa es obligatoria.");
  }

  const selectedFilters = sanitizeFilters(
    formData.getAll("keywords").filter((value): value is string => typeof value === "string")
  );
  const selectedOfferings = sanitizeOfferings(
    formData.getAll("offerings").filter((value): value is string => typeof value === "string")
  );

  await db.company.update({
    where: { id: companyId },
    data: {
      category: (getString(formData, "category") || "SIN_CATEGORIA") as CompanyCategory,
      keywords: selectedFilters.length > 0 ? serializeFilters(selectedFilters) : null,
      opportunitySummary: getNullableString(formData, "opportunitySummary"),
      proposedSolutions: selectedOfferings.length > 0 ? serializeOfferings(selectedOfferings) : null,
      notes: getNullableString(formData, "notes")
    }
  });

  revalidatePath("/");
  revalidatePath("/companies");
  revalidatePath(`/companies/${companyId}`);
}
