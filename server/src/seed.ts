import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const jsonPath = path.resolve(__dirname, '../src/seedData.json');

const prisma = new PrismaClient();

async function main() {
  console.log('Reading seed data...');
  const recipes = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  console.log('Cleaning database for fresh seed...');
  // Clear tables in reverse order of foreign key relationships
  await prisma.recipeIngredient.deleteMany();
  await prisma.recipeTechnique.deleteMany();
  await prisma.recipeTag.deleteMany();
  await prisma.recipeStep.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.technique.deleteMany();

  console.log('Database cleaned. Inserting relational seed data...');

  for (const r of recipes) {
    // 1. Create the recipe
    await prisma.recipe.create({
      data: {
        id: r.id,
        title: r.title,
        description: r.description || '',
        imageUrl: r.imageUrl || '',
        time: typeof r.time === 'number' ? r.time : (typeof r.totalTime === 'number' ? r.totalTime : 0),
        difficulty: r.difficulty || 'easy',
      }
    });

    // 2. Ingredients
    if (r.ingredients && Array.isArray(r.ingredients)) {
      for (const ing of r.ingredients) {
        // Find or create ingredient globally
        const dbIng = await prisma.ingredient.upsert({
          where: { name: ing.name },
          update: {},
          create: { name: ing.name }
        });

        // Link ingredient to recipe
        await prisma.recipeIngredient.create({
          data: {
            recipeId: r.id,
            ingredientId: dbIng.id,
            quantity: ing.quantity,
            isOptional: ing.isOptional || false
          }
        });
      }
    }

    // 3. Techniques
    if (r.techniqueRequired && Array.isArray(r.techniqueRequired)) {
      for (const techName of r.techniqueRequired) {
        // Find or create technique globally
        const dbTech = await prisma.technique.upsert({
          where: { name: techName },
          update: {},
          create: { name: techName }
        });

        // Link technique to recipe
        await prisma.recipeTechnique.create({
          data: {
            recipeId: r.id,
            techniqueId: dbTech.id
          }
        });
      }
    }

    // 4. Tags
    if (r.tags && Array.isArray(r.tags)) {
      for (const tagName of r.tags) {
        // Find or create tag globally
        const dbTag = await prisma.tag.upsert({
          where: { name: tagName },
          update: {},
          create: { name: tagName }
        });

        // Link tag to recipe
        await prisma.recipeTag.create({
          data: {
            recipeId: r.id,
            tagId: dbTag.id
          }
        });
      }
    }

    // 5. Steps
    if (r.steps && Array.isArray(r.steps)) {
      for (let i = 0; i < r.steps.length; i++) {
        const step = r.steps[i];
        let text = '';
        let duration: number | null = null;
        if (Array.isArray(step)) {
          text = step[0];
          duration = typeof step[1] === 'number' ? step[1] : null;
        } else {
          text = step;
        }
        await prisma.recipeStep.create({
          data: {
            recipeId: r.id,
            text,
            duration,
            stepNum: i
          }
        });
      }
    }
  }

  console.log('Relational seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
