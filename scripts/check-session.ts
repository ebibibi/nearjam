import { prisma } from '../src/lib/prisma';
async function main() {
  const s = await prisma.jamSession.findUnique({
    where: { id: 'cmm8h1wti000qkrp2u9d68xu4' },
    include: {
      venue: { select: { name: true } },
      series: { select: { title: true } },
    }
  });
  console.log(JSON.stringify(s, null, 2));
  
  if (s?.venueId) {
    const tendencies = await prisma.sessionTendency.findMany({
      where: { venueId: s.venueId, isActive: true },
      select: { name: true, sourceType: true, sourceUrl: true, typicalDayOfWeek: true, entrySystem: true }
    });
    console.log('\n=== SessionTendency ===');
    console.log(JSON.stringify(tendencies, null, 2));
  }
}
main().finally(() => prisma.$disconnect());
