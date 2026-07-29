// Carga los clientes con programa vigente y su servicio asociado.
// Idempotente: si la empresa o el programa ya existen, no duplica.
// Los montos quedan en 0 a propósito — se completan desde /programas.

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const PROGRAMS = [
  {
    company: "VENTAMAT",
    match: "ventamat",
    service: {
      name: "Ventamat — extensión remitos + panel",
      scope: "Extensión Chrome para remitos Coopermat, panel Next y control de duplicados.",
      status: "ACTIVO",
      currency: "ARS",
      billingCycle: "MENSUAL",
      url: "https://ventamat.controlapps.ar"
    }
  },
  {
    company: "HABANEROS PRIVATE CHEF",
    match: "habaneros",
    service: {
      name: "Habaneros — landing chef privado",
      scope: "Landing del servicio de chef privado en Tulum, deploy en Vercel.",
      status: "ACTIVO",
      currency: "USD",
      billingCycle: "MENSUAL"
    }
  },
  {
    company: "MAXIMIA",
    match: "maximia",
    service: {
      name: "ControlDoc Holding — gestión documental",
      scope: "Requeridos por operación, biblioteca, dashboards y login OAuth.",
      status: "PROPUESTA",
      currency: "ARS",
      billingCycle: "MENSUAL"
    }
  },
  {
    company: "COOPERATIVA 16 DE OCTUBRE",
    match: "16 de octubre",
    service: {
      name: "ControlRedes — contenido para redes",
      scope: "Producción de reels y posts para las redes de la cooperativa.",
      status: "PROPUESTA",
      currency: "ARS",
      billingCycle: "MENSUAL"
    }
  }
];

async function findCompany(entry) {
  const companies = await prisma.company.findMany({ select: { id: true, name: true } });
  const needle = entry.match.toLowerCase();

  return companies.find((company) => company.name.toLowerCase().includes(needle)) ?? null;
}

async function main() {
  for (const entry of PROGRAMS) {
    let company = await findCompany(entry);

    if (!company) {
      company = await prisma.company.create({
        data: {
          name: entry.company,
          status: "CLIENT",
          bucket: "MAGNATES",
          sourceEvent: "Cliente propio"
        },
        select: { id: true, name: true }
      });
      console.log(`+ empresa creada: ${company.name}`);
    }

    if (entry.service.status === "ACTIVO") {
      await prisma.company.update({
        where: { id: company.id },
        data: { status: "CLIENT" }
      });
    }

    const existing = await prisma.service.findFirst({
      where: { companyId: company.id, name: entry.service.name }
    });

    if (existing) {
      console.log(`= programa ya existe: ${entry.service.name}`);
      continue;
    }

    await prisma.service.create({
      data: { ...entry.service, companyId: company.id }
    });

    console.log(`+ programa creado: ${company.name} → ${entry.service.name}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
