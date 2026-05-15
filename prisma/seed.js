const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  await prisma.task.deleteMany();
  await prisma.interaction.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.company.deleteMany();

  await prisma.company.create({
    data: {
      name: "Estudio Rivera",
      status: "PROSPECT",
      industry: "Servicios profesionales",
      website: "https://estudiorivera.com",
      phone: "+54 11 5555 0101",
      email: "contacto@estudiorivera.com",
      city: "Buenos Aires",
      country: "Argentina",
      notes: "Interés en centralizar seguimiento comercial y renovar CRM interno.",
      potentialValue: 1800,
      contacts: {
        create: [
          {
            name: "Laura Rivera",
            role: "Directora",
            email: "laura@estudiorivera.com",
            phone: "+54 11 5555 0102",
            isPrimary: true
          }
        ]
      },
      interactions: {
        create: [
          {
            type: "MEETING",
            subject: "Reunión inicial",
            detail: "Se relevó el proceso actual y los puntos de fuga en seguimiento.",
            happenedAt: new Date("2026-05-09T15:00:00.000Z")
          }
        ]
      },
      tasks: {
        create: [
          {
            title: "Enviar propuesta comercial",
            detail: "Propuesta con onboarding y tablero de seguimiento.",
            dueDate: new Date("2026-05-18T15:00:00.000Z"),
            status: "PENDING"
          }
        ]
      }
    }
  });

  await prisma.company.create({
    data: {
      name: "Logistica Sur",
      status: "CLIENT",
      industry: "Logística",
      website: "https://logisticasur.com",
      phone: "+54 341 555 7788",
      email: "operaciones@logisticasur.com",
      city: "Rosario",
      country: "Argentina",
      notes: "Cliente activo. Piden seguimiento de renovaciones y oportunidades cruzadas.",
      potentialValue: 4200,
      contacts: {
        create: [
          {
            name: "Marcos Benitez",
            role: "Operaciones",
            email: "mbenitez@logisticasur.com",
            isPrimary: true
          }
        ]
      },
      interactions: {
        create: [
          {
            type: "CALL",
            subject: "Seguimiento mensual",
            detail: "Solicitaron módulo para control de vencimientos.",
            happenedAt: new Date("2026-05-12T14:30:00.000Z")
          }
        ]
      },
      tasks: {
        create: [
          {
            title: "Preparar upsell de vencimientos",
            dueDate: new Date("2026-05-20T16:00:00.000Z"),
            status: "IN_PROGRESS"
          }
        ]
      }
    }
  });

  await prisma.company.create({
    data: {
      name: "Clinica Delta",
      status: "LEAD",
      industry: "Salud",
      email: "direccion@clinicadelta.com",
      city: "Cordoba",
      country: "Argentina",
      notes: "Ingresó por recomendación. Falta primer contacto.",
      potentialValue: 2500,
      tasks: {
        create: [
          {
            title: "Agendar primer llamado",
            dueDate: new Date("2026-05-16T13:00:00.000Z"),
            status: "PENDING"
          }
        ]
      }
    }
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
