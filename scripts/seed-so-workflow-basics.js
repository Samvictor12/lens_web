/**
 * Seed virtual WIP location for SO workflow
 * Run: node scripts/seed-so-workflow-basics.js
 */
import prisma from '../src/backend/config/prisma.js';

async function main() {
  const user = await prisma.user.findFirst({ where: { delete_status: false } });
  if (!user) throw new Error('No user found — run complete-seed first');

  const existing = await prisma.locationMaster.findFirst({
    where: { name: 'Production WIP', deleteStatus: false },
  });
  const virtual = existing
    ? await prisma.locationMaster.update({
        where: { id: existing.id },
        data: { isVirtual: true, description: 'Virtual location for SO-linked stock in production / billing' },
      })
    : await prisma.locationMaster.create({
        data: {
          name: 'Production WIP',
          description: 'Virtual location for SO-linked stock in production / billing',
          isVirtual: true,
          activeStatus: true,
          deleteStatus: false,
          createdBy: user.id,
        },
      });

  console.log('Virtual location:', virtual.name, `(id=${virtual.id})`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
