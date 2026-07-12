import { PrismaClient, Role, EmployeeStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create Default Departments
  const executive = await prisma.department.upsert({
    where: { id: 'dept-exec' },
    update: {},
    create: {
      id: 'dept-exec',
      name: 'Executive',
      status: EmployeeStatus.ACTIVE,
    },
  });

  const engineering = await prisma.department.upsert({
    where: { id: 'dept-eng' },
    update: {},
    create: {
      id: 'dept-eng',
      name: 'Engineering',
      parentId: executive.id,
      status: EmployeeStatus.ACTIVE,
    },
  });

  const operations = await prisma.department.upsert({
    where: { id: 'dept-ops' },
    update: {},
    create: {
      id: 'dept-ops',
      name: 'Operations',
      parentId: executive.id,
      status: EmployeeStatus.ACTIVE,
    },
  });

  const finance = await prisma.department.upsert({
    where: { id: 'dept-fin' },
    update: {},
    create: {
      id: 'dept-fin',
      name: 'Finance',
      parentId: executive.id,
      status: EmployeeStatus.ACTIVE,
    },
  });

  console.log('Departments seeded successfully.');

  // 2. Create Default Categories
  const categories = [
    {
      name: 'Laptops',
      extraFields: { warrantyPeriodMonths: true, ramGb: true, storageGb: true },
    },
    {
      name: 'Monitors',
      extraFields: { warrantyPeriodMonths: true, resolution: true, screenSize: true },
    },
    {
      name: 'Office Furniture',
      extraFields: { material: true, dimensions: true },
    },
    {
      name: 'Network Devices',
      extraFields: { ipAddress: true, macAddress: true },
    },
    {
      name: 'Vehicles',
      extraFields: { licensePlate: true, mileage: true, insuranceExpiryDate: true },
    },
  ];

  for (const cat of categories) {
    await prisma.assetCategory.upsert({
      where: { name: cat.name },
      update: { extraFields: cat.extraFields },
      create: {
        name: cat.name,
        extraFields: cat.extraFields,
      },
    });
  }

  console.log('Categories seeded successfully.');

  // 3. Create Admin User
  const adminEmail = 'admin@assetflow.com';
  const hashedPassword = await bcrypt.hash('AdminPassword123', 10);

  const admin = await prisma.employee.upsert({
    where: { email: adminEmail },
    update: { passwordHash: hashedPassword },
    create: {
      name: 'System Administrator',
      email: adminEmail,
      passwordHash: hashedPassword,
      role: Role.ADMIN,
      departmentId: executive.id,
      status: EmployeeStatus.ACTIVE,
    },
  });

  // Set the admin as head of Executive department
  await prisma.department.update({
    where: { id: executive.id },
    data: { headId: admin.id },
  });

  console.log('Admin user seeded successfully:', adminEmail);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
