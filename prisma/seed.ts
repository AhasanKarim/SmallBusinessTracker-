import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Settings — only seed if missing
  await prisma.businessSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      businessName: "Halifax Photography Studio",
      country: "Canada",
      province: "Nova Scotia",
      currency: "CAD",
      taxRegistered: false,
      taxType: "HST",
      defaultTaxRate: 0.15,
    },
  });

  const existingCardCount = await prisma.creditCard.count();
  if (existingCardCount === 0) {
    const amex = await prisma.creditCard.create({
      data: { name: "Amex Cobalt", last4: "1001", active: true, notes: "Daily spend, 5x dining/groceries" },
    });
    const rogers = await prisma.creditCard.create({
      data: { name: "Rogers World Elite", last4: "2002", active: true, notes: "USD purchases" },
    });
    const tdVisa = await prisma.creditCard.create({
      data: { name: "TD Visa Infinite", last4: "3003", active: true },
    });

    const event = await prisma.event.create({
      data: {
        name: "Smith Wedding",
        clientName: "Alex & Jamie Smith",
        eventDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        location: "Peggy's Cove, NS",
        notes: "Full-day coverage + engagement session",
        invoiceTotal: 4500,
        amountPaid: 1500,
        paymentStatus: "PARTIAL",
      },
    });

    await prisma.income.create({
      data: {
        date: new Date(),
        clientName: "Alex & Jamie Smith",
        total: 1500,
        paymentMethod: "ETRANSFER",
        invoiceNumber: "INV-2025-001",
        invoiceSent: true,
        notes: "Deposit",
        eventId: event.id,
      },
    });

    await prisma.expense.create({
      data: {
        date: new Date(),
        vendor: "Henry's Camera",
        category: "GEAR",
        expenseType: "GEAR",
        total: 1899.99,
        paymentMethod: "CREDIT_CARD",
        creditCardId: amex.id,
        notes: "Sigma 35mm f/1.4 Art",
      },
    });

    await prisma.expense.create({
      data: {
        date: new Date(),
        vendor: "Tim Hortons",
        category: "COFFEE_TEAM_FOOD",
        expenseType: "NON_GEAR",
        total: 24.5,
        paymentMethod: "CREDIT_CARD",
        creditCardId: rogers.id,
        notes: "Second-shooter coffee run",
        eventId: event.id,
      },
    });

    await prisma.expense.create({
      data: {
        date: new Date(),
        vendor: "Adobe",
        category: "SOFTWARE",
        expenseType: "NON_GEAR",
        total: 25.42,
        paymentMethod: "CREDIT_CARD",
        creditCardId: tdVisa.id,
        notes: "Creative Cloud — monthly",
      },
    });

    console.log("Seed: created sample event, income, expenses, and 3 cards");
  } else {
    console.log("Seed: data already present, skipping");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
