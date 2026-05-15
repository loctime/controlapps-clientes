import { CompanyStatus, TaskStatus } from "@prisma/client";
import { getDb } from "@/lib/db";

const LEGACY_COMPANY_CATEGORIES = ["PRIORITARIA", "POTENCIAL_CLIENTE", "ALIADO"] as const;

let categoryNormalizationPromise: Promise<void> | null = null;

async function ensureCompanyCategoryCompatibility() {
  if (!categoryNormalizationPromise) {
    const db = getDb();

    categoryNormalizationPromise = db
      .$executeRawUnsafe(
        `UPDATE Company
         SET category = 'SIN_CATEGORIA'
         WHERE category IN (${LEGACY_COMPANY_CATEGORIES.map((value) => `'${value}'`).join(", ")})`
      )
      .then(() => undefined)
      .catch((error) => {
        categoryNormalizationPromise = null;
        throw error;
      });
  }

  await categoryNormalizationPromise;
}

export async function getDashboardData() {
  await ensureCompanyCategoryCompatibility();

  const db = getDb();

  const [companies, recentInteractions, upcomingTasks] = await Promise.all([
    db.company.findMany({
      include: {
        contacts: true,
        tasks: true,
        interactions: {
          orderBy: { happenedAt: "desc" },
          take: 1
        }
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }]
    }),
    db.interaction.findMany({
      include: { company: true },
      orderBy: { happenedAt: "desc" },
      take: 6
    }),
    db.task.findMany({
      where: {
        status: {
          not: TaskStatus.DONE
        }
      },
      include: { company: true },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      take: 6
    })
  ]);

  const stats = {
    totalCompanies: companies.length,
    leads: companies.filter((company) => company.status === CompanyStatus.LEAD).length,
    prospects: companies.filter((company) => company.status === CompanyStatus.PROSPECT).length,
    activeClients: companies.filter((company) => company.status === CompanyStatus.CLIENT).length,
    pipelineValue: companies.reduce(
      (sum, company) => sum + (company.status !== CompanyStatus.INACTIVE ? company.potentialValue ?? 0 : 0),
      0
    )
  };

  return {
    companies,
    recentInteractions,
    upcomingTasks,
    stats
  };
}

export async function getCompanies(status?: CompanyStatus) {
  await ensureCompanyCategoryCompatibility();

  const db = getDb();

  return db.company.findMany({
    where: status ? { status } : undefined,
    include: {
      contacts: true,
      interactions: {
        orderBy: { happenedAt: "desc" },
        take: 3
      },
      tasks: {
        orderBy: [{ status: "asc" }, { dueDate: "asc" }],
        take: 3
      }
    },
    orderBy: [{ status: "asc" }, { name: "asc" }]
  });
}

export async function getCompanyById(id: string) {
  await ensureCompanyCategoryCompatibility();

  const db = getDb();

  return db.company.findUnique({
    where: { id },
    include: {
      contacts: { orderBy: [{ isPrimary: "desc" }, { name: "asc" }] },
      interactions: { orderBy: { happenedAt: "desc" } },
      tasks: { orderBy: [{ status: "asc" }, { dueDate: "asc" }] }
    }
  });
}
