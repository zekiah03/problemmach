import { PrismaClient } from "@prisma/client";
import { templates } from "../src/data/templates";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding SolutionTemplate...");

  for (const t of templates) {
    await prisma.solutionTemplate.upsert({
      where: { id: t.id },
      create: {
        id: t.id,
        type: t.type,
        sub: t.sub,
        title: t.title,
        question: t.question,
        whyItFits: t.whyItFits,
        appliesToCategory: t.appliesToCategory,
      },
      update: {
        title: t.title,
        question: t.question,
        whyItFits: t.whyItFits,
        appliesToCategory: t.appliesToCategory,
        sub: t.sub ?? null,
      },
    });
  }

  console.log(`Seeded ${templates.length} templates`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
