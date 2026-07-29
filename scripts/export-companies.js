// Exporta todas las empresas con sus contactos, interacciones y tareas a JSON.
// Red de seguridad antes de cualquier limpieza: el CSV original de la Ronda de
// Negocios ya no existe, así que este archivo es la única copia portable.
// Uso: node scripts/export-companies.js [destino.json]

const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany({
    include: { contacts: true, interactions: true, tasks: true, services: true },
    orderBy: { name: "asc" }
  });

  const target =
    process.argv[2] || path.join(__dirname, "..", `export-empresas-${companies.length}.json`);

  fs.writeFileSync(target, JSON.stringify(companies, null, 2), "utf8");

  const totals = companies.reduce(
    (acc, company) => ({
      contactos: acc.contactos + company.contacts.length,
      interacciones: acc.interacciones + company.interactions.length,
      tareas: acc.tareas + company.tasks.length,
      programas: acc.programas + company.services.length
    }),
    { contactos: 0, interacciones: 0, tareas: 0, programas: 0 }
  );

  console.log(`exportadas ${companies.length} empresas a ${target}`);
  console.log(
    `  contactos:${totals.contactos} interacciones:${totals.interacciones} tareas:${totals.tareas} programas:${totals.programas}`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
