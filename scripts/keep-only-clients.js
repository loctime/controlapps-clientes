// Deja en la base solo las empresas que tienen al menos un programa cargado y
// borra el resto (con sus contactos, interacciones y tareas por cascade).
//
// Por defecto hace dry-run: lista qué borraría y no toca nada.
// Para ejecutar de verdad: node scripts/keep-only-clients.js --si
//
// Antes de correrlo con --si, sacar backup del dev.db y correr
// scripts/export-companies.js.

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const CONFIRM = process.argv.includes("--si");

async function main() {
  const keep = await prisma.company.findMany({
    where: { services: { some: {} } },
    select: { id: true, name: true, _count: { select: { services: true } } },
    orderBy: { name: "asc" }
  });

  if (keep.length === 0) {
    console.error("Ninguna empresa tiene programa cargado. Abortado para no vaciar la base.");
    process.exitCode = 1;
    return;
  }

  const keepIds = keep.map((company) => company.id);
  const where = { id: { notIn: keepIds } };

  const [aBorrar, contactos, interacciones, tareas] = await Promise.all([
    prisma.company.count({ where }),
    prisma.contact.count({ where: { companyId: { notIn: keepIds } } }),
    prisma.interaction.count({ where: { companyId: { notIn: keepIds } } }),
    prisma.task.count({ where: { companyId: { notIn: keepIds } } })
  ]);

  console.log("Se conservan:");
  for (const company of keep) {
    console.log(`  ${company.name} (${company._count.services} programa/s)`);
  }
  console.log(
    `\nSe borran: ${aBorrar} empresas, ${contactos} contactos, ${interacciones} interacciones, ${tareas} tareas.`
  );

  if (!CONFIRM) {
    console.log("\nDry-run. Volvé a correrlo con --si para ejecutarlo.");
    return;
  }

  const result = await prisma.company.deleteMany({ where });
  const restantes = await prisma.company.count();

  console.log(`\nBorradas ${result.count} empresas. Quedan ${restantes}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
