"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Seeding database...');
    // 1. Create Default Departments
    const executive = await prisma.department.upsert({
        where: { id: 'dept-exec' },
        update: {},
        create: {
            id: 'dept-exec',
            name: 'Executive',
            status: client_1.EmployeeStatus.ACTIVE,
        },
    });
    const engineering = await prisma.department.upsert({
        where: { id: 'dept-eng' },
        update: {},
        create: {
            id: 'dept-eng',
            name: 'Engineering',
            parentId: executive.id,
            status: client_1.EmployeeStatus.ACTIVE,
        },
    });
    const operations = await prisma.department.upsert({
        where: { id: 'dept-ops' },
        update: {},
        create: {
            id: 'dept-ops',
            name: 'Operations',
            parentId: executive.id,
            status: client_1.EmployeeStatus.ACTIVE,
        },
    });
    const finance = await prisma.department.upsert({
        where: { id: 'dept-fin' },
        update: {},
        create: {
            id: 'dept-fin',
            name: 'Finance',
            parentId: executive.id,
            status: client_1.EmployeeStatus.ACTIVE,
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
            role: client_1.Role.ADMIN,
            departmentId: executive.id,
            status: client_1.EmployeeStatus.ACTIVE,
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
