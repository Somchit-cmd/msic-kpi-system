import { PrismaClient } from '@prisma/client';
import { mockUsers, mockEvaluations } from '../src/data/mockData';
import { generateBehaviorScores, defaultScoreCriteria } from '../src/types/evaluation';

const prisma = new PrismaClient();

async function main() {
  // Clear all existing data (order matters for referential integrity)
  await prisma.evaluation.deleteMany();
  await prisma.kpiPlan.deleteMany();
  await prisma.user.deleteMany();

  console.log('Cleared existing data.');

  // Seed Users (insert in dependency order — top of hierarchy first)
  // Iteratively insert users whose managerId is already in the DB
  const inserted = new Set<string>();
  let remaining = [...mockUsers];
  let maxIterations = remaining.length + 1;
  while (remaining.length > 0 && maxIterations-- > 0) {
    const canInsert = remaining.filter(u => u.managerId === null || inserted.has(u.managerId));
    if (canInsert.length === 0) {
      console.error('Circular manager reference detected');
      break;
    }
    for (const user of canInsert) {
      await prisma.user.create({
        data: {
          id: user.id,
          name: user.name,
          title: user.title,
          department: user.department,
          role: user.role,
          managerId: user.managerId,
          username: user.username,
          password: user.password,
          email: user.email,
          telephone: user.telephone,
        },
      });
      inserted.add(user.id);
    }
    remaining = remaining.filter(u => !inserted.has(u.id));
  }
  console.log(`Seeded ${mockUsers.length} users.`);

  // Seed Settings
  const defaultDepartments = ['Engineering', 'Human Resources', 'IT', 'Design', 'Finance', 'Marketing', 'Operations'];
  const defaultJobTitles: Record<string, string[]> = {
    'Engineering': ['Software Engineer', 'Senior Developer', 'Engineering Manager'],
    'Human Resources': ['HR Director', 'HR Specialist'],
    'IT': ['System Administrator', 'IT Support'],
    'Design': ['Product Designer', 'UX Researcher'],
    'Finance': ['Financial Analyst', 'Accountant'],
    'Marketing': ['Marketing Manager', 'Content Strategist'],
    'Operations': ['Operations Manager', 'Project Manager'],
  };

  await prisma.setting.upsert({
    where: { key: 'departments' },
    update: { value: JSON.stringify(defaultDepartments) },
    create: { id: 'setting-departments', key: 'departments', value: JSON.stringify(defaultDepartments) },
  });
  await prisma.setting.upsert({
    where: { key: 'jobTitles' },
    update: { value: JSON.stringify(defaultJobTitles) },
    create: { id: 'setting-jobTitles', key: 'jobTitles', value: JSON.stringify(defaultJobTitles) },
  });
  console.log('Seeded settings (departments, jobTitles).');

  // Seed Evaluations (converting array/object fields to JSON strings)
  for (const eval_ of mockEvaluations) {
    await prisma.evaluation.create({
      data: {
        id: eval_.id,
        employeeId: eval_.employeeId,
        employeeName: eval_.employeeName,
        employeeTitle: eval_.employeeTitle,
        department: eval_.department,
        managerId: eval_.managerId,
        managerName: eval_.managerName,
        period: eval_.period,
        reviewType: eval_.reviewType,
        planId: eval_.planId ?? null,
        status: eval_.status,
        objectives: JSON.stringify(eval_.objectives),
        behaviors: JSON.stringify(eval_.behaviors),
        adjustingFactor: JSON.stringify(eval_.adjustingFactor),
        hrNotes: eval_.hrNotes,
        isLeadership: eval_.isLeadership,
        auditLog: JSON.stringify(eval_.auditLog ?? []),
        createdAt: eval_.createdAt,
        updatedAt: eval_.updatedAt,
      },
    });
  }
  console.log(`Seeded ${mockEvaluations.length} evaluations.`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
